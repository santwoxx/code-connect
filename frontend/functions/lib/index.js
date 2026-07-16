"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");
admin.initializeApp();
const db = admin.firestore();
function hashPassword(plainText) {
    const hash = crypto.createHash('sha256');
    hash.update(plainText);
    return hash.digest('hex');
}
exports.authenticateRole = (0, https_1.onCall)({ cors: true }, async (request) => {
    // Obter dados da requisição
    const data = request.data;
    const { role, username, password } = data;
    if (!role || !username || !password) {
        throw new https_1.HttpsError('invalid-argument', 'Faltam argumentos (role, username, password).');
    }
    const collectionsMap = {
        'vendedor': 'sellers',
        'entregador': 'deliverers',
        'montador': 'montadores',
        'caixa': 'caixas',
        'estoquista': 'estoquistas'
    };
    const collectionName = collectionsMap[role];
    if (!collectionName) {
        throw new https_1.HttpsError('invalid-argument', 'Cargo inválido.');
    }
    const ip = request.rawRequest.ip || 'unknown-ip';
    const attemptRef = db.collection('login_attempts').doc(ip.replace(/[/.]/g, '_')); // sanitize for doc ID
    try {
        const attemptDoc = await attemptRef.get();
        let attempts = 0;
        if (attemptDoc.exists) {
            const data = attemptDoc.data();
            if (data) {
                const timeDiff = Date.now() - data.timestamp;
                if (timeDiff < 15 * 60 * 1000) { // 15 minutes
                    attempts = data.count || 0;
                    if (attempts >= 5) {
                        return { success: false, error: 'Muitas tentativas falhas detectadas. O acesso para este endereço IP foi temporariamente bloqueado por 15 minutos por segurança.' };
                    }
                }
            }
        }
        const snapshot = await db.collection(collectionName).get();
        const docs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const cleanUser = username.trim().toLowerCase();
        const inputHash = hashPassword(password);
        const target = docs.find((u) => u.username && u.username.toLowerCase() === cleanUser &&
            (u.password === password || u.password === inputHash));
        if (!target) {
            await attemptRef.set({ count: attempts + 1, timestamp: Date.now() });
            return { success: false, error: 'Credenciais inválidas: Usuário ou Senha incorretos.' };
        }
        if (target.active === false) {
            return { success: false, error: 'Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.' };
        }
        // Lazy hashing implementation (upgrade plain text to hash silently)
        if (target.password === password) {
            await db.collection(collectionName).doc(target.id).update({
                password: inputHash
            });
        }
        // Remove a senha antes de enviar para o cliente
        const safeData = Object.assign({}, target);
        delete safeData.password;
        if (attempts > 0) {
            await attemptRef.delete().catch(() => { });
        }
        return { success: true, user: safeData };
    }
    catch (e) {
        console.error("Error in authenticateRole:", e);
        throw new https_1.HttpsError('internal', 'Erro interno ao autenticar usuário.');
    }
});
//# sourceMappingURL=index.js.map