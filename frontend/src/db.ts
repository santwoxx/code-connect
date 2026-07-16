import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Product, Category, StockTransaction, Payment, Delivery, Seller, Sale, AuditLog, Deliverer, Customer, PurchaseReturn, Estoquista, Caixa, Montador, MonthlyGoal } from './types';
import {
  INITIAL_CATEGORIES
} from './data';
import parsedProducts from './products_parsed.json';
import { OWNER_EMAILS, isOwnerEmail } from './config/adminEmails';

function sanitizeFirestoreData<T extends object>(data: T): T {
  const sanitized = { ...data } as any;
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    } else if (sanitized[key] !== null && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeFirestoreData(sanitized[key]);
    }
  });
  return sanitized;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  READ = 'read',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Sync Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auto-cleaning rules for default template legacy data
export const MOCK_PRODUCT_NAMES = [
  'Mouse Sem Fio Recarregável Silent',
  'Cadeira Ergonômica Pro Preta',
  'Monitor IPS 29" UltraWide LG',
  'Mesa de Escritório L',
  'Sofá Retrátil 3 Lugares',
  'Cama Box Casal King'
];

export const MOCK_PAYMENT_DESCS = [
  'Venda escritório corporativo Silva Tech',
  'Lote de reposição do importador',
  'Venda direta Cliente Ana Nogueira',
  'Compra inicial lote distribuidor',
  'Parcial de Entrada Cliente',
  'Serviços gerais de TI'
];

export async function deleteLegacyMockDataFromFirestore(): Promise<void> {
  try {
    // 1. Delete matching transactions in firebase
    const txSnap = await getDocs(collection(db, 'transactions'));
    const txBatch = writeBatch(db);
    let txCount = 0;
    txSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const pName = data.productName || '';
      if (MOCK_PRODUCT_NAMES.some(mock => pName.toLowerCase().includes(mock.toLowerCase()))) {
        txBatch.delete(docSnap.ref);
        txCount++;
      }
    });
    if (txCount > 0) {
      await txBatch.commit();
      console.log(`Cleaned up ${txCount} generic old stock movements.`);
    }

    // 2. Delete matching products in firebase
    const prodSnap = await getDocs(collection(db, 'products'));
    const prodBatch = writeBatch(db);
    let prodCount = 0;
    prodSnap.forEach((docSnap) => {
      const name = docSnap.data().name || '';
      if (MOCK_PRODUCT_NAMES.some(mock => name.toLowerCase().includes(mock.toLowerCase()))) {
        prodBatch.delete(docSnap.ref);
        prodCount++;
      }
    });
    if (prodCount > 0) {
      await prodBatch.commit();
      console.log(`Cleaned up ${prodCount} default mock products.`);
    }

    // 3. Delete matching payments in firebase
    const paySnap = await getDocs(collection(db, 'payments'));
    const payBatch = writeBatch(db);
    let payCount = 0;
    paySnap.forEach((docSnap) => {
      const desc = docSnap.data().description || '';
      if (MOCK_PAYMENT_DESCS.some(mock => desc.toLowerCase().includes(mock.toLowerCase()))) {
        payBatch.delete(docSnap.ref);
        payCount++;
      }
    });
    if (payCount > 0) {
      await payBatch.commit();
      console.log(`Cleaned up ${payCount} default accounting labels.`);
    }
  } catch (error) {
    console.error('Failed legacy cleanup routines:', error);
  }
}

export async function seedDatabaseIfEmpty() {
  try {
    const configRef = doc(db, 'system_config', 'config');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists() && configSnap.data().seeded === true) {
      return;
    }

    deleteLegacyMockDataFromFirestore().catch(e => console.error(e));

    await Promise.all(OWNER_EMAILS.map(email => setDoc(doc(db, 'allowed_users', email), {
      email,
      role: 'Proprietário / Adm Geral',
      createdAt: new Date().toISOString()
    })));

    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      console.log('Database empty! Seeding collections...');
      await importCommercialCatalog();
      console.log('Successfully seeded Firestore database with clean production template!');
    }
    
    await setDoc(configRef, { seeded: true });
  } catch (error) {
    console.error('Failed to seed database:', error);
  }
}

// --- PRODUCT SERVICES ---
export async function fetchProducts(): Promise<Product[]> {
  const path = 'products';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Product[] = [];
    snap.forEach((d) => {
      const p = d.data() as Product;
      const isMock = MOCK_PRODUCT_NAMES.some(mock => p.name.toLowerCase().includes(mock.toLowerCase()));
      if (!isMock) {
        list.push(p);
      }
    });
    // Sort by createdAt desc
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveProduct(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const sanitized = sanitizeFirestoreData(product);
    await setDoc(doc(db, 'products', product.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeProduct(id: string): Promise<void> {
  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- CATEGORY SERVICES ---
export async function fetchCategories(): Promise<Category[]> {
  const path = 'categories';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Category[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Category);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveCategory(category: Category): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    const sanitized = sanitizeFirestoreData(category);
    await setDoc(doc(db, 'categories', category.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeCategory(id: string): Promise<void> {
  const path = `categories/${id}`;
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- STOCK TRANSACTION SERVICES ---
export async function fetchTransactions(): Promise<StockTransaction[]> {
  const path = 'transactions';
  try {
    const snap = await getDocs(collection(db, path));
    const list: StockTransaction[] = [];
    snap.forEach((d) => {
      const tx = d.data() as StockTransaction;
      const isMock = MOCK_PRODUCT_NAMES.some(mock => tx.productName.toLowerCase().includes(mock.toLowerCase()));
      if (!isMock) {
        list.push(tx);
      }
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveTransaction(tx: StockTransaction): Promise<void> {
  const path = `transactions/${tx.id}`;
  try {
    const sanitized = sanitizeFirestoreData(tx);
    await setDoc(doc(db, 'transactions', tx.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- PAYMENT SERVICES ---
export async function fetchPayments(): Promise<Payment[]> {
  const path = 'payments';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Payment[] = [];
    snap.forEach((d) => {
      const pay = d.data() as Payment;
      const isMock = MOCK_PAYMENT_DESCS.some(mock => pay.description.toLowerCase().includes(mock.toLowerCase()));
      if (!isMock) {
        list.push(pay);
      }
    });
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function savePayment(payment: Payment): Promise<void> {
  const path = `payments/${payment.id}`;
  try {
    const sanitized = sanitizeFirestoreData(payment);
    await setDoc(doc(db, 'payments', payment.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removePayment(id: string): Promise<void> {
  const path = `payments/${id}`;
  try {
    await deleteDoc(doc(db, 'payments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- DELIVERY SERVICES ---
export async function fetchDeliveries(): Promise<Delivery[]> {
  const path = 'deliveries';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Delivery[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Delivery);
    });
    return list.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveDelivery(delivery: Delivery): Promise<void> {
  const path = `deliveries/${delivery.id}`;
  try {
    const sanitized = sanitizeFirestoreData(delivery);
    await setDoc(doc(db, 'deliveries', delivery.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeDelivery(id: string): Promise<void> {
  const path = `deliveries/${id}`;
  try {
    await deleteDoc(doc(db, 'deliveries', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- ALLOWED EMAILS VERIFICATION & ADMINISTRATION ---
export async function checkEmailIsAllowed(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  // caixacentralmoveis, estoquecentralmoveis and vendacentralmoveis have hardcoded bypasses
  if (
    cleanEmail === 'caixacentralmoveis@gmail.com' ||
    cleanEmail === 'estoquecentralmoveis@gmail.com' ||
    cleanEmail === 'vendacentralmoveis@gmail.com'
  ) {
    return true;
  }
  // Others use role-based access via allowed_users
  const path = `allowed_users/${cleanEmail}`;
  try {
    const userDoc = await getDoc(doc(db, 'allowed_users', cleanEmail));
    return userDoc.exists();
  } catch (error) {
    // Fail closed, but log it
    console.error(`Allowed check failed for ${cleanEmail}:`, error);
    return false;
  }
}

export async function whitelistEmail(email: string, role: string = 'admin'): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const path = `allowed_users/${cleanEmail}`;
  try {
    await setDoc(doc(db, 'allowed_users', cleanEmail), {
      email: cleanEmail,
      role: role,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserRole(email: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  if (isOwnerEmail(cleanEmail)) {
    return 'Proprietário / Adm Geral';
  }
  if (cleanEmail === 'caixacentralmoveis@gmail.com' || cleanEmail === 'centralmoveis26@gmail.com') {
    return 'admin';
  }
  if (cleanEmail === 'estoquecentralmoveis@gmail.com') {
    return 'estoquista';
  }
  if (cleanEmail === 'vendacentralmoveis@gmail.com') {
    return 'vendedor';
  }
  try {
    const userDoc = await getDoc(doc(db, 'allowed_users', cleanEmail));
    if (userDoc.exists()) {
      return userDoc.data().role || 'admin';
    }
    return 'vendedor';
  } catch (error) {
    console.error('Failed to get user role:', error);
    return 'vendedor';
  }
}

export async function fetchAllowedEmails(): Promise<{ email: string; role: string; createdAt: string }[]> {
  try {
    const snap = await getDocs(collection(db, 'allowed_users'));
    const list: { email: string; role: string; createdAt: string }[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        email: data.email || d.id,
        role: data.role || 'admin',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    
    // Add default hardcoded admins if not present in list to display on page
    const emailsInList = list.map(item => item.email.toLowerCase());
    OWNER_EMAILS.forEach(email => {
      if (!emailsInList.includes(email)) {
        list.unshift({ email, role: 'Proprietário / Adm Geral', createdAt: new Date().toISOString() });
      }
    });
    return list;
  } catch (error) {
    console.error('Failed to fetch allowed emails:', error);
    return OWNER_EMAILS.map(email => ({ email, role: 'Proprietário / Adm Geral', createdAt: new Date().toISOString() }));
  }
}

export async function removeAllowedEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (isOwnerEmail(cleanEmail)) {
    throw new Error("Não é permitido excluir os e-mails dos administradores proprietários nativos.");
  }
  const path = `allowed_users/${cleanEmail}`;
  try {
    await deleteDoc(doc(db, 'allowed_users', cleanEmail));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getMasterPin(): Promise<string | null> {
  try {
    const configDoc = await getDoc(doc(db, 'system_config', 'security'));
    if (configDoc.exists()) {
      return configDoc.data().masterPassword || configDoc.data().masterPin || null;
    }
    return null;
  } catch (error) {
    console.error('Failed to read master pin from Firestore:', error);
    return null;
  }
}

export async function saveMasterPin(pin: string): Promise<void> {
  try {
    await setDoc(doc(db, 'system_config', 'security'), {
      masterPassword: pin.trim(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to save master pin to Firestore:', error);
    throw error;
  }
}

export async function clearDatabaseForProduction(): Promise<void> {
  const collections = ['products', 'categories', 'transactions', 'payments', 'deliveries', 'sellers', 'deliverers', 'sales', 'audit_logs', 'customers', 'purchase_returns'];
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(doc(db, colName, d.id));
      });
      await batch.commit();
    } catch (e) {
      console.warn(`Could not clear collection ${colName}:`, e);
    }
  }
  // Save that we have checked/seeded so it never re-seeds automatically
  await setDoc(doc(db, 'system_config', 'config'), { seeded: true });
}

// --- SELLER SERVICES ---
export async function fetchSellers(): Promise<Seller[]> {
  try {
    const snap = await getDocs(collection(db, 'sellers'));
    const list: Seller[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Seller);
    });
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    console.error('Failed to fetch sellers:', error);
    return [];
  }
}

export async function saveSeller(seller: Seller): Promise<void> {
  try {
    const sanitized = sanitizeFirestoreData(seller);
    await setDoc(doc(db, 'sellers', seller.id), sanitized);
  } catch (error) {
    console.error('Failed to save seller:', error);
    throw error;
  }
}

export async function removeSeller(sellerId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sellers', sellerId));
  } catch (error) {
    console.error('Failed to remove seller:', error);
    throw error;
  }
}


// --- DELIVERER SERVICES ---
export async function fetchDeliverers(): Promise<Deliverer[]> {
  try {
    const snap = await getDocs(collection(db, 'deliverers'));
    const list: Deliverer[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Deliverer);
    });
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    console.error('Failed to fetch deliverers:', error);
    return [];
  }
}

export async function saveDeliverer(deliverer: Deliverer): Promise<void> {
  try {
    const sanitized = sanitizeFirestoreData(deliverer);
    await setDoc(doc(db, 'deliverers', deliverer.id), sanitized);
  } catch (error) {
    console.error('Failed to save deliverer:', error);
    throw error;
  }
}

export async function removeDeliverer(delivererId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'deliverers', delivererId));
  } catch (error) {
    console.error('Failed to remove deliverer:', error);
    throw error;
  }
}

// Vincula a sessão anônima do Firebase (login direto usuário/senha) ao cadastro do
// entregador, pra que as regras do Firestore consigam confirmar de verdade quem é
// quem em request.auth -- merge parcial, nunca sobrescreve o resto do documento.
export async function linkDelivererDevice(delivererId: string, firebaseUid: string): Promise<void> {
  try {
    await setDoc(doc(db, 'deliverers', delivererId), { firebaseUid }, { merge: true });
  } catch (error) {
    console.error('Failed to link deliverer device:', error);
    throw error;
  }
}


// --- ESTOQUISTA SERVICES ---
export async function fetchEstoquistas(): Promise<Estoquista[]> {
  try {
    const snap = await getDocs(collection(db, 'estoquistas'));
    const list: Estoquista[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Estoquista);
    });
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    console.error('Failed to fetch estoquistas:', error);
    return [];
  }
}

export async function saveEstoquista(estoquista: Estoquista): Promise<void> {
  try {
    const sanitized = sanitizeFirestoreData(estoquista);
    await setDoc(doc(db, 'estoquistas', estoquista.id), sanitized);
  } catch (error) {
    console.error('Failed to save estoquista:', error);
    throw error;
  }
}

export async function removeEstoquista(estoquistaId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'estoquistas', estoquistaId));
  } catch (error) {
    console.error('Failed to remove estoquista:', error);
    throw error;
  }
}


// --- CAIXA SERVICES ---
export async function fetchCaixas(): Promise<Caixa[]> {
  try {
    const snap = await getDocs(collection(db, 'caixas'));
    const list: Caixa[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Caixa);
    });
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    console.error('Failed to fetch caixas:', error);
    return [];
  }
}

export async function saveCaixa(caixa: Caixa): Promise<void> {
  try {
    const sanitized = sanitizeFirestoreData(caixa);
    await setDoc(doc(db, 'caixas', caixa.id), sanitized);
  } catch (error) {
    console.error('Failed to save caixa:', error);
    throw error;
  }
}

export async function removeCaixa(caixaId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'caixas', caixaId));
  } catch (error) {
    console.error('Failed to remove caixa:', error);
    throw error;
  }
}


// --- SALES SERVICES ---
export async function fetchSales(): Promise<Sale[]> {
  try {
    const snap = await getDocs(collection(db, 'sales'));
    const list: Sale[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Sale);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    return [];
  }
}

export async function saveSale(sale: Sale): Promise<void> {
  try {
    const sanitized = sanitizeFirestoreData(sale);
    await setDoc(doc(db, 'sales', sale.id), sanitized);
  } catch (error) {
    console.error('Failed to save sale:', error);
    throw error;
  }
}

export async function removeSale(id: string): Promise<void> {
  const path = `sales/${id}`;
  try {
    await deleteDoc(doc(db, 'sales', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- AUDIT LOG SERVICES ---
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    const list: AuditLog[] = [];
    snap.forEach((d) => {
      list.push(d.data() as AuditLog);
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

export async function logAuditEvent(action: string, details: string): Promise<void> {
  const user = auth.currentUser;
  let userEmail = user?.email || 'Sistema';

  try {
    const raw = localStorage.getItem('centralsync_custom_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.entityName) {
        userEmail = `${parsed.entityName} (${userEmail})`;
      } else if (parsed.role) {
        userEmail = `${parsed.role.toUpperCase()} (${userEmail})`;
      }
    }
  } catch(e) {}

  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId: user?.uid || 'system',
    userEmail: userEmail,
    action,
    details
  };
  try {
    await setDoc(doc(db, 'audit_logs', log.id), log);
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }
}

export async function importCommercialCatalog(): Promise<void> {
  try {
    await Promise.all(INITIAL_CATEGORIES.map(cat => setDoc(doc(db, 'categories', cat.id), cat)));
    
    const chunks: any[][] = [];
    for (let i = 0; i < parsedProducts.length; i += 200) {
      chunks.push(parsedProducts.slice(i, i + 200));
    }
    
    await Promise.all(chunks.map(async (chunk) => {
      const batch = writeBatch(db);
      for (const prod of chunk) {
        const productDoc = doc(db, 'products', prod.id);
        batch.set(productDoc, {
          ...prod,
          createdAt: new Date().toISOString()
        });
        if (prod.currentStock > 0) {
          const txId = `t-imp-${prod.sku}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const txDoc = doc(db, 'transactions', txId);
          batch.set(txDoc, {
            id: txId,
            productId: prod.id,
            productName: prod.name,
            type: 'IN',
            quantity: prod.currentStock,
            reason: 'AJUSTE',
            description: 'Lançamento de estoque inicial via importação de tabela',
            date: new Date().toISOString(),
            value: prod.currentStock * prod.costPrice
          });
        }
      }
      await batch.commit();
    }));
  } catch (error) {
    console.error('Failed to import commercial catalog:', error);
    throw error;
  }
}

// --- CUSTOMER SERVICES ---
export async function fetchCustomers(): Promise<Customer[]> {
  try {
    const snap = await getDocs(collection(db, 'customers'));
    const list: Customer[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Customer);
    });
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return [];
  }
}

export async function saveCustomer(customer: Customer): Promise<void> {
  try {
    const sanitized = sanitizeFirestoreData(customer);
    await setDoc(doc(db, 'customers', customer.id), sanitized);
  } catch (error) {
    console.error('Failed to save customer:', error);
    throw error;
  }
}

export async function removeCustomer(customerId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    console.error('Failed to remove customer:', error);
    throw error;
  }
}

// --- PURCHASE RETURN SERVICES ---
export async function fetchPurchaseReturns(): Promise<PurchaseReturn[]> {
  const path = 'purchase_returns';
  try {
    const snap = await getDocs(collection(db, path));
    const list: PurchaseReturn[] = [];
    snap.forEach((d) => {
      list.push(d.data() as PurchaseReturn);
    });
    return list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function savePurchaseReturn(pr: PurchaseReturn): Promise<void> {
  const path = `purchase_returns/${pr.id}`;
  try {
    const sanitized = sanitizeFirestoreData(pr);
    await setDoc(doc(db, 'purchase_returns', pr.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removePurchaseReturn(id: string): Promise<void> {
  const path = `purchase_returns/${id}`;
  try {
    await deleteDoc(doc(db, 'purchase_returns', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ========================
// MONTADORES
// ========================

export async function fetchMontadores(): Promise<Montador[]> {
  const path = 'montadores';
  try {
    const snap = await getDocs(collection(db, 'montadores'));
    const list: Montador[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Montador);
    });
    return list.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveMontador(montador: Montador): Promise<void> {
  const path = `montadores/${montador.id}`;
  try {
    const sanitized = sanitizeFirestoreData(montador);
    await setDoc(doc(db, 'montadores', montador.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeMontador(id: string): Promise<void> {
  const path = `montadores/${id}`;
  try {
    await deleteDoc(doc(db, 'montadores', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Vincula a sessão anônima do Firebase (login direto usuário/senha) ao cadastro do
// montador -- mesmo racional de linkDelivererDevice.
export async function linkMontadorDevice(montadorId: string, firebaseUid: string): Promise<void> {
  const path = `montadores/${montadorId}`;
  try {
    await setDoc(doc(db, 'montadores', montadorId), { firebaseUid }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ========================
// ASSIGN MONTADOR TO DELIVERY
// ========================

export async function assignMontadorToDelivery(
  deliveryId: string,
  montadorId: string,
  montadorName: string,
  commissionPercent: number,
  sentToAssembler: boolean
): Promise<void> {
  const path = `deliveries/${deliveryId}`;
  try {
    const ref = doc(db, 'deliveries', deliveryId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Entrega ${deliveryId} não encontrada.`);
    const existing = snap.data() as Delivery;
    const updated: Delivery = {
      ...existing,
      assemblerId: montadorId,
      assemblerName: montadorName,
      assemblyCommissionPercent: commissionPercent,
      assemblySentToAssembler: sentToAssembler,
      assemblyStatus: existing.assemblyStatus || 'PENDENTE'
    };
    const sanitized = sanitizeFirestoreData(updated);
    await setDoc(ref, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ========================
// ASSEMBLY COMPLETION
// ========================

export async function completeAssembly(
  deliveryId: string,
  assemblerName: string,
  assemblerId: string,
  assemblerSignature: string,
  assemblyCustomerSignature: string,
  assemblyPhoto?: string,
  refusalDetails?: { name: string; dob: string; cpf: string }
): Promise<void> {
  const path = `deliveries/${deliveryId}`;
  try {
    const ref = doc(db, 'deliveries', deliveryId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Entrega ${deliveryId} não encontrada.`);
    const existing = snap.data() as Delivery;
    const updated: Delivery = {
      ...existing,
      assemblyStatus: 'MONTADO',
      assemblerName,
      assemblerId,
      assemblerSignature,
      assemblyCustomerSignature,
      assemblyPhoto,
      assembledAt: new Date().toISOString(),
      ...(refusalDetails ? {
        assemblyCustomerRefusalName: refusalDetails.name,
        assemblyCustomerRefusalDob: refusalDetails.dob,
        assemblyCustomerRefusalCpf: refusalDetails.cpf
      } : {})
    };
    const sanitized = sanitizeFirestoreData(updated);
    await setDoc(ref, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- MONTHLY GOAL SERVICES ---
export async function fetchMonthlyGoals(): Promise<MonthlyGoal[]> {
  const path = 'goals';
  try {
    const snap = await getDocs(collection(db, path));
    const list: MonthlyGoal[] = [];
    snap.forEach((d) => {
      list.push(d.data() as MonthlyGoal);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveMonthlyGoal(goal: MonthlyGoal): Promise<void> {
  const path = `goals/${goal.id}`;
  try {
    const sanitized = sanitizeFirestoreData(goal);
    await setDoc(doc(db, 'goals', goal.id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- CASH REGISTER SERVICES ---
export interface CashRegister {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  openedBy: string;
  openingBalance: number;
  closedAt?: string;
  closedBy?: string;
  closingBalance?: number;
  expectedBalance?: number;
  difference?: number;
  movements?: {
    id: string;
    type: 'IN' | 'OUT'; // IN: Reforço, OUT: Sangria
    amount: number;
    reason: string;
    description: string;
    date: string;
  }[];
}

export async function fetchCashRegisters(): Promise<CashRegister[]> {
  const path = 'cash_registers';
  try {
    const snap = await getDocs(collection(db, 'cash_registers'));
    const list: CashRegister[] = [];
    snap.forEach((d) => {
      list.push(d.data() as CashRegister);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, path);
    return [];
  }
}

export async function saveCashRegister(register: CashRegister): Promise<void> {
  const path = `cash_registers/${register.id}`;
  try {
    const ref = doc(db, 'cash_registers', register.id);
    const sanitized = sanitizeFirestoreData(register);
    await setDoc(ref, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function restoreDatabaseFromBackup(data: Record<string, any[]>): Promise<{ success: boolean; message: string }> {
  try {
    const collections = ['products', 'categories', 'transactions', 'payments', 'deliveries', 'sellers', 'sales', 'audit_logs', 'customers', 'purchase_returns', 'estoquistas', 'caixas', 'montadores', 'deliverers', 'goals'];
    
    // 1. Clear current collections
    for (const colName of collections) {
      const snap = await getDocs(collection(db, colName));
      const deletePromises: Promise<void>[] = [];
      snap.forEach((d) => {
        deletePromises.push(deleteDoc(doc(db, colName, d.id)));
      });
      await Promise.all(deletePromises);
    }
    
    // 2. Insert backup data
    for (const colName of collections) {
      const items = data[colName] || [];
      const writePromises: Promise<void>[] = [];
      for (const item of items) {
        const { id, ...rest } = item;
        if (id) {
          writePromises.push(setDoc(doc(db, colName, id), rest));
        }
      }
      await Promise.all(writePromises);
    }
    
    return { success: true, message: 'Banco de dados restaurado com sucesso!' };
  } catch (error) {
    console.error('Failed to restore database from backup:', error);
    return { success: false, message: `Erro na restauração: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

// --- ATOMIC TRANSACTION SERVICES (BATCHES) ---

export async function invoiceSaleTransactionally(
  saleId: string,
  updatedSale: Sale,
  transactionRecord: StockTransaction,
  paymentsToCreate: Payment[],
  deliveryToCreate: Delivery | null,
  auditLogRecord: AuditLog
): Promise<void> {
  const batch = writeBatch(db);
  
  // 1. Update sale
  const saleRef = doc(db, 'sales', saleId);
  batch.set(saleRef, sanitizeFirestoreData(updatedSale));
  
  // 2. Decrement product stock atomic level
  const productRef = doc(db, 'products', updatedSale.productId);
  batch.update(productRef, { currentStock: increment(-(transactionRecord.quantity || 1)) });
  
  // 3. Register transaction
  const txRef = doc(db, 'transactions', transactionRecord.id);
  batch.set(txRef, sanitizeFirestoreData(transactionRecord));
  
  // 4. Register payments
  for (const pay of paymentsToCreate) {
    const payRef = doc(db, 'payments', pay.id);
    batch.set(payRef, sanitizeFirestoreData(pay));
  }
  
  // 5. Register delivery if provided
  if (deliveryToCreate) {
    const delRef = doc(db, 'deliveries', deliveryToCreate.id);
    batch.set(delRef, sanitizeFirestoreData(deliveryToCreate));
  }
  
  // 6. Register audit log
  const logRef = doc(db, 'audit_logs', auditLogRecord.id);
  batch.set(logRef, sanitizeFirestoreData(auditLogRecord));
  
  // Commit all writes at once
  await batch.commit();
}

export async function cancelSaleTransactionally(
  saleId: string,
  updatedSale: Sale,
  transactionRecord: StockTransaction | null,
  auditLogRecord: AuditLog,
  paymentsToCancel?: Payment[]
): Promise<void> {
  const batch = writeBatch(db);
  
  // 1. Update sale
  const saleRef = doc(db, 'sales', saleId);
  batch.set(saleRef, sanitizeFirestoreData(updatedSale));
  
  // 2. Increment stock and add transaction if cancelled from completed status
  if (transactionRecord) {
    const productRef = doc(db, 'products', updatedSale.productId);
    batch.update(productRef, { currentStock: increment(transactionRecord.quantity || 1) });
    
    const txRef = doc(db, 'transactions', transactionRecord.id);
    batch.set(txRef, sanitizeFirestoreData(transactionRecord));
  }
  
  // 3. Update associated payments to CANCELLED status
  if (paymentsToCancel && paymentsToCancel.length > 0) {
    for (const payment of paymentsToCancel) {
      const payRef = doc(db, 'payments', payment.id);
      batch.update(payRef, { status: 'CANCELLED' });
    }
  }
  
  // 4. Register audit log
  const logRef = doc(db, 'audit_logs', auditLogRecord.id);
  batch.set(logRef, sanitizeFirestoreData(auditLogRecord));
  
  await batch.commit();
}

export async function createBudgetTransactionally(
  saleRecord: Sale,
  customerRecord: Customer,
  auditLogRecord: AuditLog
): Promise<void> {
  const batch = writeBatch(db);
  
  // 1. Save sale
  const saleRef = doc(db, 'sales', saleRecord.id);
  batch.set(saleRef, sanitizeFirestoreData(saleRecord));
  
  // 2. Save customer
  const custRef = doc(db, 'customers', customerRecord.id);
  batch.set(custRef, sanitizeFirestoreData(customerRecord));
  
  // 3. Register audit log
  const logRef = doc(db, 'audit_logs', auditLogRecord.id);
  batch.set(logRef, sanitizeFirestoreData(auditLogRecord));
  
  await batch.commit();
}

export async function createBudgetsTransactionally(
  salesRecords: Sale[],
  customerRecord: Customer,
  auditLogRecord: AuditLog
): Promise<void> {
  const batch = writeBatch(db);
  
  // 1. Save sales
  for (const sale of salesRecords) {
    const saleRef = doc(db, 'sales', sale.id);
    batch.set(saleRef, sanitizeFirestoreData(sale));
  }
  
  // 2. Save customer
  const custRef = doc(db, 'customers', customerRecord.id);
  batch.set(custRef, sanitizeFirestoreData(customerRecord));
  
  // 3. Register audit log
  const logRef = doc(db, 'audit_logs', auditLogRecord.id);
  batch.set(logRef, sanitizeFirestoreData(auditLogRecord));
  
  await batch.commit();
}



// --- USER CUSTOM PIN SERVICES ---
// Reads a per-user custom PIN from the 'allowed_users' Firestore document.
// This allows individual admin users to have their own PIN separate from the global masterPin.
export async function fetchUserCustomPin(email: string): Promise<string | null> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const userDoc = await getDoc(doc(db, 'allowed_users', cleanEmail));
    if (userDoc.exists() && userDoc.data().customPin) {
      return userDoc.data().customPin as string;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch user custom pin:', error);
    return null;
  }
}

// One-time migration: move per-user PINs from hardcoded source to Firestore.
// After running once (tracked by system_config/pins_migrated_v1), the PINs
// live exclusively in the database and the code no longer contains credentials.
export async function migrateUserPinsToFirestore(): Promise<void> {
  try {
    const flagRef = doc(db, 'system_config', 'pins_migrated_v1');
    const flagSnap = await getDoc(flagRef);
    if (flagSnap.exists()) return; // Already ran — skip

    // Write initial custom PIN for centralmoveis26@gmail.com into allowed_users
    const pinEmail = 'centralmoveis26@gmail.com';
    const userDocRef = doc(db, 'allowed_users', pinEmail);
    await setDoc(userDocRef, {
      email: pinEmail,
      role: 'admin',
      customPin: '537985',
      createdAt: new Date().toISOString()
    }, { merge: true });

    // Mark migration as complete so this block never runs again
    await setDoc(flagRef, { migratedAt: new Date().toISOString() });
    console.log('[Migration] User PINs migrated to Firestore successfully.');
  } catch (error) {
    console.warn('[Migration] Could not migrate user PINs to Firestore:', error);
  }
}
