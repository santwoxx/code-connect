/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import {
  Product,
  Category,
  StockTransaction,
  Payment,
  Delivery,
  Seller,
  Sale,
  AuditLog,
  Customer,
  PurchaseReturn,
  Montador,
  Deliverer
} from '../types';

// Dono dos 11 listeners em tempo real do Firestore. Expõe tanto os valores quanto os
// setters -- os handlers de CRUD em App.tsx continuam fazendo updates otimistas neles
// diretamente (ex.: handleAddProduct chama setProducts antes de saveProduct terminar),
// então os setters precisam continuar acessíveis fora do próprio listener.
export function useFirestoreSync(
  user: User | null,
  userRole: string,
  currentSeller: Seller | null,
  currentDeliverer: Deliverer | null,
  currentMontador: Montador | null
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [entregadores, setEntregadores] = useState<Deliverer[]>([]);

  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach((doc) => list.push(doc.data() as Product));
      setProducts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (err) => console.warn("Products sync failed:", err));

    // 2. Subscribe to categories
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const list: Category[] = [];
      snap.forEach((doc) => list.push(doc.data() as Category));
      setCategories(list.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => console.warn("Categories sync failed:", err));

    // 3. Subscribe to transactions
    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(250)), (snap) => {
      const list: StockTransaction[] = [];
      snap.forEach((doc) => list.push(doc.data() as StockTransaction));
      setTransactions(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (err) => console.warn("Transactions sync failed:", err));

    // 4. Subscribe to payments (Only if admin or caixa)
    let unsubPayments: () => void = () => {};
    if (userRole === 'admin' || userRole === 'Proprietário / Adm Geral' || userRole === 'caixa') {
      unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(250)), (snap) => {
        const list: Payment[] = [];
        snap.forEach((doc) => list.push(doc.data() as Payment));
        setPayments(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (err) => console.warn("Payments sync failed:", err));
    }

    // 5. Subscribe to deliveries
    let deliveriesQuery;
    if (userRole === 'admin' || userRole === 'Proprietário / Adm Geral' || userRole === 'caixa' || userRole === 'estoquista') {
      deliveriesQuery = query(collection(db, 'deliveries'), orderBy('scheduledDate', 'desc'), limit(250));
    } else if (userRole === 'entregador' && currentDeliverer) {
      deliveriesQuery = query(collection(db, 'deliveries'), where('delivererId', '==', currentDeliverer.id));
    } else if (userRole === 'montador' && currentMontador) {
      deliveriesQuery = query(collection(db, 'deliveries'), where('assemblerId', '==', currentMontador.id));
    }

    let unsubDeliveries = () => {};
    if (deliveriesQuery) {
      unsubDeliveries = onSnapshot(deliveriesQuery, (snap) => {
        const list: Delivery[] = [];
        snap.forEach((doc) => list.push(doc.data() as Delivery));
        setDeliveries(list.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()));
      }, (err) => console.warn("Deliveries sync failed:", err));
    }

    // 6. Subscribe to sellers
    const unsubSellers = onSnapshot(collection(db, 'sellers'), (snap) => {
      const list: Seller[] = [];
      snap.forEach((doc) => list.push(doc.data() as Seller));
      setSellers(list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()));
    }, (err) => console.warn("Sellers sync failed:", err));

    // 7. Subscribe to sales
    let salesQuery;
    if (userRole === 'admin' || userRole === 'Proprietário / Adm Geral' || userRole === 'caixa') {
      salesQuery = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(250));
    } else if (userRole === 'vendedor' && currentSeller) {
      salesQuery = query(collection(db, 'sales'), where('sellerId', '==', currentSeller.id));
    }

    let unsubSales = () => {};
    if (salesQuery) {
      unsubSales = onSnapshot(salesQuery, (snap) => {
        const list: Sale[] = [];
        snap.forEach((doc) => list.push(doc.data() as Sale));
        setSales(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (err) => console.warn("Sales sync failed:", err));
    }

    // 8. Subscribe to audit logs (Only if admin)
    let unsubAuditLogs: () => void = () => {};
    if (userRole === 'admin' || userRole === 'Proprietário / Adm Geral') {
      unsubAuditLogs = onSnapshot(collection(db, 'audit_logs'), (snap) => {
        const list: AuditLog[] = [];
        snap.forEach((doc) => list.push(doc.data() as AuditLog));
        setAuditLogs(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }, (err) => console.warn("Audit logs sync failed:", err));
    }

    // 9. Subscribe to customers (Only if not estoquista)
    let unsubCustomers: () => void = () => {};
    if (userRole !== 'estoquista') {
      unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
        const list: Customer[] = [];
        snap.forEach((doc) => list.push(doc.data() as Customer));
        setCustomers(list.sort((a, b) => a.name.localeCompare(b.name)));
      }, (err) => console.warn("Customers sync failed:", err));
    }

    // 10. Subscribe to purchase returns (Only if admin or estoquista)
    let unsubPurchaseReturns: () => void = () => {};
    if (userRole === 'admin' || userRole === 'Proprietário / Adm Geral' || userRole === 'estoquista') {
      unsubPurchaseReturns = onSnapshot(collection(db, 'purchase_returns'), (snap) => {
        const list: PurchaseReturn[] = [];
        snap.forEach((doc) => list.push(doc.data() as PurchaseReturn));
        setPurchaseReturns(list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()));
      }, (err) => console.warn("Purchase returns sync failed:", err));
    }

    // 11. Subscribe to deliverers
    const unsubDeliverers = onSnapshot(collection(db, 'deliverers'), (snap) => {
      const list: Deliverer[] = [];
      snap.forEach((doc) => list.push(doc.data() as Deliverer));
      setEntregadores(list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()));
    }, (err) => console.warn("Deliverers sync failed:", err));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubTransactions();
      unsubPayments();
      unsubDeliveries();
      unsubSellers();
      unsubSales();
      unsubAuditLogs();
      unsubCustomers();
      unsubPurchaseReturns();
      unsubDeliverers();
    };
  }, [user, userRole, currentSeller, currentDeliverer, currentMontador]);

  return {
    products, setProducts,
    categories, setCategories,
    transactions, setTransactions,
    payments, setPayments,
    deliveries, setDeliveries,
    sellers, setSellers,
    sales, setSales,
    auditLogs, setAuditLogs,
    customers, setCustomers,
    purchaseReturns, setPurchaseReturns,
    entregadores, setEntregadores
  };
}
