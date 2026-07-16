import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, getMetadata } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDtt1CqbV1pdo6tjbm36hxQMpQTdnuAyZk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "centralsync-c5b50.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "centralsync-c5b50",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "centralsync-c5b50.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1070779879652",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1070779879652:web:da0d17e83b7dee069c9cf1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Q7QCX2C3ED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check (reCAPTCHA v3) - Anti-Bot Protection
if (typeof window !== 'undefined') {
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (recaptchaKey && recaptchaKey !== '6Ldummy-key-to-avoid-crashes-before-setup') {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    console.warn("App Check not initialized: VITE_RECAPTCHA_SITE_KEY is missing or invalid.");
  }
}
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

if (!import.meta.env.VITE_MASTER_PASSWORD) {
  throw new Error("CRITICAL SECURITY ERROR: VITE_MASTER_PASSWORD environment variable is not defined. Application cannot start securely.");
}
export const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD;


export function isBusinessHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
}

export function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'Proprietário / Adm Geral';
}

export async function runDailyBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const backupRef = ref(storage, `backups/backup_${today}.json`);

    try {
      await getMetadata(backupRef);
      return { success: true, message: `Backup de ${today} já existe.` };
    } catch {
      // No backup today, proceed
    }

    const collections = ['products', 'categories', 'transactions', 'payments', 'deliveries', 'sellers', 'sales', 'audit_logs', 'customers', 'purchase_returns', 'estoquistas', 'caixas', 'montadores', 'deliverers', 'goals'];
    const data: Record<string, any[]> = {};

    for (const colName of collections) {
      try {
        const snap = await getDocs(collection(db, colName));
        const items: any[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        data[colName] = items;
      } catch {
        data[colName] = [];
      }
    }

    const jsonString = JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data
    }, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const snapshot = await uploadBytes(backupRef, blob);
    const url = await getDownloadURL(snapshot.ref);

    return { success: true, message: `Backup diário criado com sucesso. ${url}` };
  } catch (error) {
    console.error('Daily backup failed:', error);
    return { success: false, message: `Erro ao criar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

export async function getBackupInfo(): Promise<{ lastBackup: string | null; todayBackupExists: boolean }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const backupRef = ref(storage, `backups/backup_${today}.json`);
    try {
      await getMetadata(backupRef);
      return { lastBackup: today, todayBackupExists: true };
    } catch {
      // Check for any backup
      const backupsRef = ref(storage, 'backups');
      const result = await listAll(backupsRef);
      const items = result.items.map(item => item.name);
      const dates = items
        .filter(name => name.startsWith('backup_') && name.endsWith('.json'))
        .map(name => name.replace('backup_', '').replace('.json', ''))
        .sort()
        .reverse();
      return { lastBackup: dates.length > 0 ? dates[0] : null, todayBackupExists: false };
    }
  } catch {
    return { lastBackup: null, todayBackupExists: false };
  }
}

/**
 * Uploads an image file to Firebase Storage under products/ path.
 * Returns the public download URL.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const fileRef = ref(storage, `products/${Date.now()}_${sanitizedName}`);
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
}

/**
 * Uploads a base64 data URL image to Firebase Storage at the given path.
 * Returns the public download URL.
 */
export async function uploadBase64Image(base64Data: string, path: string): Promise<string> {
  if (!base64Data) return '';
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }
  try {
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, blob);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Error uploading base64 image to storage:", error);
    throw error;
  }
}

export interface BackupFile {
  name: string;
  url: string;
  size: number;
  timeCreated: string;
}

export async function listAllBackups(): Promise<BackupFile[]> {
  try {
    const listRef = ref(storage, 'backups/');
    const res = await listAll(listRef);
    const backups: BackupFile[] = [];
    
    for (const itemRef of res.items) {
      try {
        const metadata = await getMetadata(itemRef);
        const url = await getDownloadURL(itemRef);
        backups.push({
          name: itemRef.name,
          url: url,
          size: metadata.size,
          timeCreated: metadata.timeCreated
        });
      } catch (e) {
        console.error('Failed to get metadata for backup item:', itemRef.name, e);
      }
    }
    
    return backups.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

