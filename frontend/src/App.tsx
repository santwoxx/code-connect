/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  BarChart3, 
  Package, 
  DollarSign, 
  Settings, 
  TrendingUp, 
  CircleAlert, 
  Menu, 
  X,
  Layers,
  Database,
  Briefcase,
  ExternalLink,
  ShieldAlert,
  Truck,
  Palette,
  LogOut,
  Users,
  ClipboardList,
  CornerUpLeft,
  LifeBuoy,
  Clock,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, uploadBase64Image } from './firebase';

// Shared types
import { Product, Payment, StockTransaction, Category, PaymentStatus, Delivery, Seller, Sale, AuditLog, Customer, PurchaseReturn, PaymentMethod, Montador, Deliverer } from './types';

// Components
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const ProductsView = lazy(() => import('./components/ProductsView').then(m => ({ default: m.ProductsView })));
const PaymentsView = lazy(() => import('./components/PaymentsView').then(m => ({ default: m.PaymentsView })));
const ReportsView = lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const DeliveriesView = lazy(() => import('./components/DeliveriesView').then(m => ({ default: m.DeliveriesView })));
const ShowroomView = lazy(() => import('./components/ShowroomView').then(m => ({ default: m.ShowroomView })));
const SellerDashboardView = lazy(() => import('./components/SellerDashboardView').then(m => ({ default: m.SellerDashboardView })));
const AdminReportsView = lazy(() => import('./components/AdminReportsView').then(m => ({ default: m.AdminReportsView })));
const CustomersView = lazy(() => import('./components/CustomersView').then(m => ({ default: m.CustomersView })));
const BudgetsView = lazy(() => import('./components/BudgetsView').then(m => ({ default: m.BudgetsView })));
const PurchaseReturnsView = lazy(() => import('./components/PurchaseReturnsView').then(m => ({ default: m.PurchaseReturnsView })));

// Hooks
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useAuthSession } from './hooks/useAuthSession';

// Modals / Sync components
import { LoginView } from './components/LoginView';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { PrintReportModal } from './components/PrintReportModal';
import { PrintDeliveryModal } from './components/PrintDeliveryModal';

// Database Services
import {
  saveProduct,
  removeProduct,
  saveCategory,
  removeCategory,
  saveTransaction,
  savePayment,
  removePayment,
  saveDelivery,
  removeDelivery,
  clearDatabaseForProduction,
  saveCustomer,
  removeCustomer,
  saveSale,
  removeSale,
  logAuditEvent,
  savePurchaseReturn,
  removePurchaseReturn,
  completeAssembly,
  assignMontadorToDelivery,
  saveMontador,
  removeMontador,
  invoiceSaleTransactionally,
  cancelSaleTransactionally
} from './db';


// Keep track of the last 20 console logs globally
const consoleLogs: string[] = [];
const maxLogs = 20;

const captureLog = (type: string, args: any[]) => {
  try {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    consoleLogs.push(`[${timestamp}] [${type}] ${message}`);
    if (consoleLogs.length > maxLogs) {
      consoleLogs.shift();
    }
  } catch (e) {
    // Ignore logging errors
  }
};

// Override console methods to capture runtime errors/logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args: any[]) => {
  captureLog('LOG', args);
  originalLog.apply(console, args);
};
console.warn = (...args: any[]) => {
  captureLog('WARN', args);
  originalWarn.apply(console, args);
};
console.error = (...args: any[]) => {
  captureLog('ERROR', args);
  originalError.apply(console, args);
};

// Capture global unhandled promise rejections or error events
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    captureLog('UNHANDLED_ERROR', [event.message, event.filename, `L${event.lineno}:C${event.colno}`]);
  });
  window.addEventListener('unhandledrejection', (event) => {
    captureLog('UNHANDLED_REJECTION', [event.reason]);
  });
}

export default function App() {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Bug/Support Report States
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugComment, setBugComment] = useState('');
  const [bugSeverity, setBugSeverity] = useState('BAIXA');
  const [includeLogs, setIncludeLogs] = useState(true);

  const handleSendBugReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugComment.trim()) return;

    const email = user?.email || 'N/A';
    const currentView = activeTab.toUpperCase();
    const severityLabel = bugSeverity === 'BAIXA' ? '🟢 Leve' : bugSeverity === 'MEDIA' ? '🟡 Média' : '🔴 Grave';
    
    let message = `*🚨 REPORTE DE ERRO - CentralSync*\n\n`;
    message += `*Operador:* ${email}\n`;
    message += `*Página:* ${currentView}\n`;
    message += `*Gravidade:* ${severityLabel}\n`;
    message += `*Dispositivo:* ${navigator.userAgent.slice(0, 100)}\n\n`;
    message += `*Descrição do Problema:*\n${bugComment.trim()}\n\n`;

    if (includeLogs && consoleLogs.length > 0) {
      message += `*📋 Logs Técnicos (Últimos ${consoleLogs.length}):*\n`;
      message += `\`\`\`\n`;
      const logText = consoleLogs.slice(-12).join('\n');
      message += `${logText}\n`;
      message += `\`\`\``;
    }

    const phone = '5573991422872';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    setBugComment('');
    setIsBugModalOpen(false);
  };

  // PWA Install Prompt (extraído para hooks/useInstallPrompt.ts)
  const { showInstallBtn, showPwaInstallModal, setShowPwaInstallModal, handleInstallApp } = useInstallPrompt();

  // Automatic CentralSync Bridge initialization on app load
  useEffect(() => {
    const checkAndStartBridge = async () => {
      try {
        // Envia uma requisição OPTIONS rápida (CORS-friendly) para verificar se a ponte está ativa
        await fetch('http://localhost:7878/', {
          method: 'OPTIONS',
          mode: 'cors'
        });
        console.log("CentralSync Bridge local está ativo.");
      } catch (err) {
        console.warn("CentralSync Bridge está fechado. Iniciando executável local...");
        // Tenta disparar o protocolo registrado no Windows para iniciar a ponte
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'centralsync-bridge://start';
        document.body.appendChild(iframe);
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      }
    };

    // Atraso de 2 segundos para inicialização inicial da UI
    const timer = setTimeout(checkAndStartBridge, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Authentication & session (extraído para hooks/useAuthSession.ts)
  const {
    user,
    userRole,
    authLoading,
    sessionUnlocked,
    blockedByTime,
    currentSeller,
    currentMontador,
    currentDeliverer,
    handleLoginSuccess,
    handleLogout
  } = useAuthSession(setActiveTab);

  // Core business states
  const [montadores, setMontadores] = useState<Montador[]>([]);
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);
  const [printingReport, setPrintingReport] = useState<{ title: string; subtitle: string; sales: Sale[] } | null>(null);
  const [printingDelivery, setPrintingDelivery] = useState<Delivery | null>(null);

  const {
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
  } = useFirestoreSync(user, userRole, currentSeller, currentDeliverer, currentMontador);

  // 2. PRODUCT ACTIONS
  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'createdAt'>) => {
    const timestamp = new Date().toISOString();
    const productId = `prod-${Date.now()}`;
    const productRecord: Product = {
      ...newProd,
      id: productId,
      createdAt: timestamp
    };

    const nextProductsList = [productRecord, ...products];
    setProducts(nextProductsList);
    await saveProduct(productRecord);

    // If starting stock is greater than 0, write automatic IN stock transaction
    if (newProd.currentStock > 0) {
      const txRecord: StockTransaction = {
        id: `t-${Date.now()}`,
        productId,
        productName: newProd.name,
        type: 'IN',
        quantity: newProd.currentStock,
        reason: 'AJUSTE',
        description: 'Lançamento de estoque inicial de cadastro',
        date: timestamp,
        value: newProd.costPrice * newProd.currentStock
      };
      
      const nextTxList = [txRecord, ...transactions];
      setTransactions(nextTxList);
      await saveTransaction(txRecord);
    }
  };

  const handleUpdateProduct = async (updatedProd: Product) => {
    const original = products.find(p => p.id === updatedProd.id);
    const nextProductsList = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    setProducts(nextProductsList);
    await saveProduct(updatedProd);

    // Log physical stock differences if updated directly inside details
    if (original && original.currentStock !== updatedProd.currentStock) {
      const diff = updatedProd.currentStock - original.currentStock;
      const absoluteDiff = Math.abs(diff);
      const isAddition = diff > 0;

      const txRecord: StockTransaction = {
        id: `t-${Date.now()}`,
        productId: updatedProd.id,
        productName: updatedProd.name,
        type: isAddition ? 'IN' : 'OUT',
        quantity: absoluteDiff,
        reason: 'AJUSTE',
        description: 'Ajuste direto de ficha cadastral',
        date: new Date().toISOString(),
        value: absoluteDiff * (isAddition ? updatedProd.costPrice : updatedProd.price)
      };

      const nextTxList = [txRecord, ...transactions];
      setTransactions(nextTxList);
      await saveTransaction(txRecord);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const updated = { ...target, active: false };
    const nextProductsList = products.map(p => p.id === productId ? updated : p);
    setProducts(nextProductsList);
    await saveProduct(updated);
  };

  const handleRegisterTransaction = async (tx: Omit<StockTransaction, 'id' | 'date'>) => {
    const timestamp = new Date().toISOString();
    const finalTx: StockTransaction = {
      ...tx,
      id: `t-${Date.now()}`,
      date: timestamp
    };

    // Update product quantity level inside active catalog
    const nextProductsList = products.map(p => {
      if (p.id === tx.productId) {
        let newStock = p.currentStock;
        if (tx.type === 'IN') {
          newStock += tx.quantity;
        } else {
          newStock = Math.max(0, p.currentStock - tx.quantity);
        }
        return {
          ...p,
          currentStock: newStock
        };
      }
      return p;
    });

    setProducts(nextProductsList);
    const nextTxList = [finalTx, ...transactions];
    setTransactions(nextTxList);

    await saveTransaction(finalTx);
    const targetProduct = nextProductsList.find(p => p.id === tx.productId);
    if (targetProduct) {
      await saveProduct(targetProduct);
    }
  };

  // 3. PAYMENT ACTIONS
  const handleAddPayment = async (newPay: Omit<Payment, 'id' | 'createdAt'>) => {
    const timestamp = new Date().toISOString();
    const payRecord: Payment = {
      ...newPay,
      id: `pay-${Date.now()}`,
      createdAt: timestamp
    };

    const nextPaymentsList = [payRecord, ...payments];
    setPayments(nextPaymentsList);
    await savePayment(payRecord);
  };

  const handleUpdatePayment = async (updatedPay: Payment) => {
    const nextPaymentsList = payments.map(p => p.id === updatedPay.id ? updatedPay : p);
    setPayments(nextPaymentsList);
    await savePayment(updatedPay);
  };

  const handleDeletePayment = async (paymentId: string) => {
    const nextPaymentsList = payments.filter(p => p.id !== paymentId);
    setPayments(nextPaymentsList);
    await removePayment(paymentId);
  };

  const handleConfirmPayment = async (id: string, paymentDate: string) => {
    let nextPaymentsList = payments.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: 'PAID' as PaymentStatus,
          paymentDate
        };
      }
      return p;
    });
    setPayments(nextPaymentsList);
    const target = nextPaymentsList.find(p => p.id === id);
    if (target) {
      await savePayment(target);
      // Auto-generate next month for fixed recurring expenses
      if (target.isFixed) {
        const dueDate = new Date(target.dueDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        const nextDueDate = dueDate.toISOString().split('T')[0];
        const nextPay: Payment = {
          id: `pay-${Date.now()}`,
          description: target.description,
          amount: target.amount,
          type: target.type,
          category: target.category,
          dueDate: nextDueDate,
          entityName: target.entityName,
          status: 'PENDING',
          isFixed: true,
          notes: target.notes ? `Gerado automaticamente do lançamento fixo` : undefined,
          createdAt: new Date().toISOString()
        };
        nextPaymentsList = [nextPay, ...nextPaymentsList];
        setPayments(nextPaymentsList);
        await savePayment(nextPay);
      }
    }
  };

  // 4. CATEGORY ACTIONS
  const handleAddCategory = async (newCat: Omit<Category, 'id'>) => {
    const catRecord: Category = {
      ...newCat,
      id: `cat-${Date.now()}`
    };
    const nextCategoriesList = [...categories, catRecord];
    setCategories(nextCategoriesList);
    await saveCategory(catRecord);
  };

  const handleDeleteCategory = async (catId: string) => {
    const nextCategoriesList = categories.filter(c => c.id !== catId);
    setCategories(nextCategoriesList);
    await removeCategory(catId);
  };

  // 4.5. DELIVERY ACTIONS
  const handleAddDelivery = async (newDel: Omit<Delivery, 'id' | 'status'>) => {
    const delRecord: Delivery = {
      ...newDel,
      id: `del-${Date.now()}`,
      status: 'A_ENTREGAR'
    };
    const nextList = [delRecord, ...deliveries];
    setDeliveries(nextList);
    await saveDelivery(delRecord);
  };

  const handleAssignDeliverer = async (
    deliveryId: string,
    delivererId: string,
    delivererName: string,
    sentToDeliverer: boolean
  ) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const updated: Delivery = {
      ...delivery,
      delivererId,
      delivererName,
      deliverySentToDeliverer: sentToDeliverer,
    };
    
    const nextDeliveries = deliveries.map(d => d.id === deliveryId ? updated : d);
    setDeliveries(nextDeliveries);
    await saveDelivery(updated);
    
    await logAuditEvent("Entregador Designado", `A entrega ${deliveryId} foi atribuída ao entregador ${delivererName}.`);
  };

  const handleCompleteDelivery = async (
    id: string, 
    customerSig: string, 
    delivererSig: string, 
    deliveryPhoto?: string,
    refusalDetails?: { name: string; dob: string; cpf: string }
  ) => {
    try {
      let customerSigUrl = '';
      let delivererSigUrl = '';
      let deliveryPhotoUrl = '';
      let isOffline = !navigator.onLine;

      try {
        if (!isOffline) {
          customerSigUrl = customerSig ? await uploadBase64Image(customerSig, `deliveries/${id}_customer_signature.png`) : '';
          delivererSigUrl = delivererSig ? await uploadBase64Image(delivererSig, `deliveries/${id}_deliverer_signature.png`) : '';
          deliveryPhotoUrl = deliveryPhoto ? await uploadBase64Image(deliveryPhoto, `deliveries/${id}_delivery_photo.jpg`) : '';
        }
      } catch (uploadErr) {
        console.warn("Upload falhou, caindo para modo offline", uploadErr);
        isOffline = true;
      }

      if (isOffline) {
        customerSigUrl = customerSig;
        delivererSigUrl = delivererSig;
        deliveryPhotoUrl = deliveryPhoto || '';
        
        const queue = JSON.parse(localStorage.getItem('offline_signatures_queue') || '[]');
        queue.push({
          id,
          type: 'delivery',
          customerSig,
          delivererSig,
          deliveryPhoto,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('offline_signatures_queue', JSON.stringify(queue));
      }

      const nextList = deliveries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            status: 'ENTREGUE' as const,
            customerSignature: customerSigUrl,
            delivererSignature: delivererSigUrl,
            deliveryPhoto: deliveryPhotoUrl,
            deliveredAt: new Date().toISOString(),
            ...(refusalDetails ? {
              customerRefusalName: refusalDetails.name,
              customerRefusalDob: refusalDetails.dob,
              customerRefusalCpf: refusalDetails.cpf
            } : {})
          };
        }
        return d;
      });
      setDeliveries(nextList);
      const target = nextList.find(d => d.id === id);
      if (target) {
        await saveDelivery(target);

        // Find the associated sale and update its status to COMPLETED if it's PENDING
        const saleIdMatch = target.notes?.match(/Pedido #([\w-]+)/);
        if (saleIdMatch && saleIdMatch[1]) {
          const saleId = saleIdMatch[1];
          const sale = sales.find(s => s.id === saleId);
          if (sale && sale.status !== 'COMPLETED') {
            await handleInvoiceSale(saleId, 'DINHEIRO');
          }
        }
      }
    } catch (err) {
      console.error("Failed to complete delivery:", err);
      alert("Erro ao enviar assinaturas/foto de entrega para o servidor.");
      throw err;
    }
  };

  const handleStartDeliveryRoute = async (id: string) => {
    try {
      const target = deliveries.find(d => d.id === id);
      if (!target) return;
      
      const updated = {
        ...target,
        outForDelivery: true
      };
      
      setDeliveries(prev => prev.map(d => d.id === id ? updated : d));
      await saveDelivery(updated);
      await logAuditEvent("Saída para Rota", `Entrega #${id} para ${target.customerName} marcada como saindo para rota.`);
      
      alert("Rota iniciada com sucesso! O administrador agora pode notificar o cliente via WhatsApp.");
    } catch (err) {
      console.error("Erro ao iniciar rota:", err);
      alert("Erro ao iniciar rota.");
    }
  };

  const handleCompleteAssembly = async (
    id: string, 
    assemblerSig: string, 
    customerSig: string, 
    assemblyPhoto?: string,
    refusalDetails?: { name: string; dob: string; cpf: string }
  ) => {
    const target = deliveries.find(d => d.id === id);
    if (!target || !currentMontador) return;

    try {
      let assemblerSigUrl = '';
      let customerSigUrl = '';
      let assemblyPhotoUrl = '';
      let isOffline = !navigator.onLine;

      try {
        if (!isOffline) {
          assemblerSigUrl = assemblerSig ? await uploadBase64Image(assemblerSig, `assemblies/${id}_assembler_signature.png`) : '';
          customerSigUrl = customerSig ? await uploadBase64Image(customerSig, `assemblies/${id}_customer_signature.png`) : '';
          assemblyPhotoUrl = assemblyPhoto ? await uploadBase64Image(assemblyPhoto, `assemblies/${id}_assembly_photo.jpg`) : '';
        }
      } catch (uploadErr) {
        console.warn("Upload de montagem falhou, caindo para modo offline", uploadErr);
        isOffline = true;
      }

      if (isOffline) {
        assemblerSigUrl = assemblerSig;
        customerSigUrl = customerSig;
        assemblyPhotoUrl = assemblyPhoto || '';
        
        const queue = JSON.parse(localStorage.getItem('offline_signatures_queue') || '[]');
        queue.push({
          id,
          type: 'assembly',
          assemblerSig,
          customerSig,
          assemblyPhoto,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('offline_signatures_queue', JSON.stringify(queue));
      }

      await completeAssembly(id, currentMontador.name, currentMontador.id, assemblerSigUrl, customerSigUrl, assemblyPhotoUrl, refusalDetails);

      const nextList = deliveries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            assemblyStatus: 'MONTADO' as const,
            assemblerName: currentMontador.name,
            assemblerId: currentMontador.id,
            assemblerSignature: assemblerSigUrl,
            assemblyCustomerSignature: customerSigUrl,
            assemblyPhoto: assemblyPhotoUrl,
            assembledAt: new Date().toISOString(),
            ...(refusalDetails ? {
              assemblyCustomerRefusalName: refusalDetails.name,
              assemblyCustomerRefusalDob: refusalDetails.dob,
              assemblyCustomerRefusalCpf: refusalDetails.cpf
            } : {})
          };
        }
        return d;
      });
      setDeliveries(nextList);
    } catch (err) {
      console.error("Failed to complete assembly:", err);
      alert("Erro ao enviar assinaturas/foto de montagem para o servidor.");
      throw err;
    }
  };

  const handleAssignMontador = async (
    deliveryId: string,
    montadorId: string,
    montadorName: string,
    commissionPercent: number,
    sentToAssembler: boolean
  ) => {
    const target = deliveries.find(d => d.id === deliveryId);
    if (!target) return;
    await assignMontadorToDelivery(deliveryId, montadorId, montadorName, commissionPercent, sentToAssembler);
    const nextList = deliveries.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          assemblerId: montadorId,
          assemblerName: montadorName,
          assemblyCommissionPercent: commissionPercent,
          assemblySentToAssembler: sentToAssembler,
          assemblyStatus: (d.assemblyStatus || 'PENDENTE') as Delivery['assemblyStatus']
        };
      }
      return d;
    });
    setDeliveries(nextList);
  };

  const handleDeleteDelivery = async (id: string) => {
    const nextList = deliveries.filter(d => d.id !== id);
    setDeliveries(nextList);
    await removeDelivery(id);
  };

  // 4.7. CUSTOMER ACTIONS
  const handleAddCustomer = async (newCust: Omit<Customer, 'id' | 'createdAt'>) => {
    const custRecord: Customer = {
      ...newCust,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const nextList = [...customers, custRecord];
    setCustomers(nextList);
    await saveCustomer(custRecord);
  };

  const handleUpdateCustomer = async (updatedCust: Customer) => {
    const nextList = customers.map(c => c.id === updatedCust.id ? updatedCust : c);
    setCustomers(nextList);
    await saveCustomer(updatedCust);
  };

  const handleDeleteCustomer = async (id: string) => {
    const nextList = customers.filter(c => c.id !== id);
    setCustomers(nextList);
    await removeCustomer(id);
  };

  // 5. BULK BACKUP OVERWRITE IMPORT
  const handleImportData = async (data: { products: Product[]; categories: Category[]; payments: any[] }) => {
    setProducts(data.products);
    setCategories(data.categories);
    setPayments(data.payments);

    // Save imported data elements to Firestore database
    for (const cat of data.categories) {
      await saveCategory(cat);
    }
    for (const prod of data.products) {
      await saveProduct(prod);
    }
    for (const pay of data.payments) {
      await savePayment(pay);
    }
    
    // Clear transactions and create initial entries based on current stock
    const freshTxs: StockTransaction[] = data.products.map((p, idx) => ({
      id: `t-imp-${idx}-${Date.now()}`,
      productId: p.id,
      productName: p.name,
      type: 'IN',
      quantity: p.currentStock,
      reason: 'AJUSTE',
      description: 'Carga de estoque consolidado via importação',
      date: new Date().toISOString(),
      value: p.currentStock * p.costPrice
    }));
    setTransactions(freshTxs);
    for (const tx of freshTxs) {
      await saveTransaction(tx);
    }
  };

  const handleClearDatabase = async () => {
    try {
      await clearDatabaseForProduction();
      setProducts([]);
      setCategories([]);
      setTransactions([]);
      setPayments([]);
      setDeliveries([]);
      setSellers([]);
      setSales([]);
      setCustomers([]);
      setAuditLogs([]);
      setPurchaseReturns([]);
    } catch (e) {
      console.error("Erro ao limpar banco de dados:", e);
      alert("Erro ao limpar banco de dados para produção.");
    }
  };

  const handleInvoiceSale = async (
    saleId: string,
    caixa: PaymentMethod,
    splits?: { method: PaymentMethod; amount: number; installments?: number }[]
  ) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const methodLabels: Record<string, string> = {
      DINHEIRO: 'Dinheiro',
      CREDIARIO: 'Crediário',
      CARTAO: 'Cartão',
      CARTAO_X: 'Cartão X',
      CENTRAL: 'Orçamento',
      ALTERDATA: 'Fechamento',
      PIX: 'PIX'
    };
    const caixaLabel = methodLabels[caixa] || caixa;

    // Formatter local para logs e descrição
    const localFormatCurrency = (val: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(val);
    };

    const activeSplits = splits && splits.length > 0
      ? splits
      : [{ method: 'DINHEIRO' as PaymentMethod, amount: sale.value }];

    const splitsText = "Pagamento: " + activeSplits.map(s => `${methodLabels[s.method] || s.method}${s.installments && s.installments > 1 ? ` (${s.installments}x)` : ''}: ${localFormatCurrency(s.amount)}`).join(" | ");

    const timestamp = new Date().toISOString();

    // 1. Atualiza status para COMPLETED (Faturado)
    const updatedSale: Sale = {
      ...sale,
      status: 'COMPLETED',
      paymentMethod: caixa,
      notes: sale.notes ? `${sale.notes}\n${splitsText}` : splitsText
    };

    // 2. Registro de transação de saída de estoque
    const transactionRecord: StockTransaction = {
      id: `t-${Date.now()}`,
      productId: sale.productId,
      productName: sale.productName,
      type: 'OUT',
      quantity: sale.quantity || 1,
      reason: 'VENDA',
      description: `Faturamento de pedido ID ${sale.id} para ${sale.clientName} (${caixaLabel})`,
      date: timestamp,
      value: sale.value
    };

    // 3. Lotes de parcelas financeiras para cada split
    const paymentsToCreate: Payment[] = [];
    for (const split of activeSplits) {
      const splitLabel = methodLabels[split.method] || split.method;
      const isCrediario = split.method === 'CREDIARIO';
      
      let dueDateVal = timestamp.split('T')[0];
      let paymentDateVal: string | undefined = timestamp.split('T')[0];
      let statusVal: Payment['status'] = 'PAID';
      let notesVal = `Lançamento automático via faturamento dividido no Caixa ${caixaLabel}`;

      if (isCrediario) {
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 30);
        dueDateVal = defaultDueDate.toISOString().split('T')[0];
        paymentDateVal = undefined;
        statusVal = 'PENDING';
        notesVal = `Lançamento automático de Crediário via faturamento no Caixa ${caixaLabel} (Aguardando recebimento)`;
      }

      paymentsToCreate.push({
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: `Faturamento Pedido ${sale.id} - ${sale.clientName} (${splitLabel} - ${caixaLabel})`,
        amount: split.amount,
        type: 'INCOME',
        category: 'VENDAS',
        dueDate: dueDateVal,
        paymentDate: paymentDateVal,
        status: statusVal,
        entityName: sale.clientName,
        paymentMethod: split.method,
        notes: notesVal,
        associatedSaleId: sale.id,
        createdAt: timestamp
      });
    }

    // 4. Cria entrega no módulo de Entregas & Assinaturas (apenas se já não existir)
    const deliveryExists = deliveries.some(d => d.notes?.includes(sale.id));
    let deliveryToCreate: Delivery | null = null;
    if (!deliveryExists) {
      const deliveryAddress = sale.clientStreet?.trim()
        ? `${sale.clientStreet.trim()}, ${sale.clientNumber?.trim() || ''}${sale.clientComplement?.trim() ? ` - ${sale.clientComplement.trim()}` : ''} - ${sale.clientNeighborhood?.trim() || ''}, ${sale.clientCity?.trim() || ''} - ${sale.clientState?.trim() || ''}${sale.clientCep?.trim() ? ` (CEP: ${sale.clientCep.trim()})` : ''}`
        : 'Retirada na Loja';
      deliveryToCreate = {
        id: `del-${Date.now()}`,
        customerName: sale.clientName,
        customerPhone: sale.clientPhone,
        delivererName: 'Central Entregas',
        address: deliveryAddress,
        itemsDescription: `${sale.quantity || 1}x ${sale.productName} (SKU: ${sale.productSku})`,
        status: 'A_ENTREGAR',
        scheduledDate: timestamp.split('T')[0],
        notes: `Gerado automaticamente a partir do Pedido #${sale.id}`,
        needsAssembly: sale.needsAssembly ?? true
      };
    }

    // 5. Registra log de auditoria
    const auditLogRecord: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: timestamp,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      action: "Pedido Faturado",
      details: `Pedido/Orçamento ${sale.id} no valor de R$ ${sale.value.toFixed(2)} foi faturado (Caixa: ${caixaLabel} | ${splitsText}) e integrado ao estoque e financeiro.`
    };

    try {
      await invoiceSaleTransactionally(
        saleId,
        updatedSale,
        transactionRecord,
        paymentsToCreate,
        deliveryToCreate,
        auditLogRecord
      );
    } catch (err) {
      console.error("Erro no faturamento transacional:", err);
      alert("Erro ao faturar o pedido. Tente novamente.");
    }
  };

  const handleCancelSale = async (saleId: string, adminSignature?: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const originalStatus = sale.status;

    // 1. Atualiza status para CANCELLED
    const updatedSale: Sale = {
      ...sale,
      status: 'CANCELLED',
      adminSignature: adminSignature || undefined
    };

    // 2. Se estava faturado (COMPLETED), estorna o item devolvendo ao estoque
    let transactionRecord: StockTransaction | null = null;
    let paymentsToCancel: Payment[] = [];
    
    if (originalStatus === 'COMPLETED') {
      transactionRecord = {
        id: `t-${Date.now()}`,
        productId: sale.productId,
        productName: sale.productName,
        type: 'IN',
        quantity: sale.quantity || 1,
        reason: 'RETORNO',
        description: `Estorno de estoque por cancelamento do pedido faturado ${sale.id}`,
        date: new Date().toISOString(),
        value: sale.value
      };

      // Busca pagamentos associados a esta venda para cancelar
      paymentsToCancel = payments.filter(p => 
        p.associatedSaleId === saleId || 
        p.description.includes(`Faturamento Pedido ${saleId}`)
      );
    }

    // 3. Registra log de auditoria
    const auditLogRecord: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      action: "Pedido Cancelado",
      details: `Pedido/Orçamento ${sale.id} de ${sale.clientName} foi cancelado com sucesso.`
    };

    try {
      await cancelSaleTransactionally(saleId, updatedSale, transactionRecord, auditLogRecord, paymentsToCancel);
    } catch (err) {
      console.error("Erro no cancelamento transacional:", err);
      alert("Erro ao cancelar o pedido.");
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    const nextSalesList = sales.filter(s => s.id !== saleId);
    setSales(nextSalesList as Sale[]);
    await removeSale(saleId);
  };

  const handleUpdateSale = async (updatedSale: any) => {
    await saveSale(updatedSale);
  };

  // --- PURCHASE RETURN ACTIONS ---
  const handleRegisterPurchaseReturn = async (newReturn: Omit<PurchaseReturn, 'id' | 'createdAt'>) => {
    const timestamp = new Date().toISOString();
    const returnId = `pr-${Date.now()}`;
    
    let receivableId = undefined;
    if (newReturn.generateReceivable) {
      receivableId = `pay-pr-${Date.now()}`;
      await savePayment({
        id: receivableId,
        description: `Reembolso de Devolução - ${newReturn.productName} (${newReturn.quantity} un)`,
        amount: newReturn.totalValue,
        type: 'INCOME',
        category: 'FORNECEDORES',
        dueDate: timestamp.split('T')[0],
        status: 'PENDING',
        entityName: newReturn.supplierName,
        notes: `Gerado automaticamente no registro de devolução ${returnId}`,
        createdAt: timestamp
      });
    }

    const purchaseReturnRecord = {
      ...newReturn,
      id: returnId,
      receivableId,
      createdAt: timestamp
    };

    const nextPurchaseReturns = [purchaseReturnRecord, ...purchaseReturns];
    setPurchaseReturns(nextPurchaseReturns);
    await savePurchaseReturn(purchaseReturnRecord);

    await handleRegisterTransaction({
      productId: newReturn.productId,
      productName: newReturn.productName,
      type: 'OUT',
      quantity: newReturn.quantity,
      reason: 'AJUSTE',
      description: `Devolução de compra para o fornecedor: ${newReturn.supplierName}`,
      value: newReturn.totalValue
    });

    await logAuditEvent(
      "Devolução Registrada", 
      `Registrada a devolução de ${newReturn.quantity} unidades do produto ${newReturn.productName} para ${newReturn.supplierName}.`
    );
  };

  const handleUpdatePurchaseReturnStatus = async (id, status) => {
    const nextPurchaseReturns = purchaseReturns.map(pr => {
      if (pr.id === id) {
        return { ...pr, status };
      }
      return pr;
    });
    setPurchaseReturns(nextPurchaseReturns);
    
    const target = nextPurchaseReturns.find(pr => pr.id === id);
    if (target) {
      await savePurchaseReturn(target);
      await logAuditEvent(
        "Status de Devolução Alterado", 
        `A devolução ${id} para ${target.supplierName} foi alterada para o status ${status}.`
      );
    }
  };

  const handleDeletePurchaseReturn = async (id) => {
    const target = purchaseReturns.find(pr => pr.id === id);
    const nextPurchaseReturns = purchaseReturns.filter(pr => pr.id !== id);
    setPurchaseReturns(nextPurchaseReturns);
    await removePurchaseReturn(id);
    if (target) {
      await logAuditEvent(
        "Registro de Devolução Excluído", 
        `O registro de devolução ${id} para ${target.supplierName} foi excluído.`
      );
    }
  };

  // Helper calculation for stock warnings bubble alerts count
  const warningCount = useMemo(() => products.filter(p => p.currentStock <= p.minStock).length, [products]);
  const pendingDeliveriesCount = useMemo(() => deliveries.filter(d => d.status === 'A_ENTREGAR').length, [deliveries]);

  // Render sub-view matching selected tab
  const renderSubView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            products={products}
            payments={payments}
            transactions={transactions}
            onNavigate={(tab) => {
              setActiveTab(tab);
              setIsMobileMenuOpen(false);
            }}
            onQuickStockUpdate={(productId, delta) => {
              const target = products.find(p => p.id === productId);
              if (target) {
                handleRegisterTransaction({
                  productId: target.id,
                  productName: target.name,
                  type: 'IN', // Always replenishment addition from quick click
                  quantity: delta,
                  reason: 'COMPRA',
                  description: 'Entrada rápida efetuada via painel geral'
                });
              }
            }}
          />
        );
      case 'vendedor-dashboard':
        return currentSeller ? (
          <SellerDashboardView 
            currentSeller={currentSeller}
            sales={sales}
            products={products}
            onPrintSale={(sale) => setPrintingSale(sale)}
          />
        ) : (
          <div className="text-slate-500 font-medium font-sans">Carregando painel do vendedor...</div>
        );
      case 'caixa-dashboard':
        return (
          <div className="max-w-4xl mx-auto mt-8 space-y-6 font-sans">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 p-8 rounded-2xl shadow-lg text-white">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <DollarSign className="w-8 h-8 text-emerald-300" />
                <span>Painel do Caixa</span>
              </h1>
              <p className="text-sm text-emerald-200 mt-2">Selecione um dos módulos abaixo para iniciar</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setActiveTab('orçamentos')}
                className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left cursor-pointer"
              >
                <ClipboardList className="w-10 h-10 text-emerald-600 mb-4" />
                <h2 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Pedidos & Orçamentos</h2>
                <p className="text-sm text-slate-500 mt-2">Gerencie pedidos, emita orçamentos e fature vendas</p>
              </button>
              <button
                onClick={() => setActiveTab('clientes')}
                className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left cursor-pointer"
              >
                <Users className="w-10 h-10 text-emerald-600 mb-4" />
                <h2 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Cadastro de Clientes</h2>
                <p className="text-sm text-slate-500 mt-2">Consulte e cadastre novos clientes</p>
              </button>
            </div>
          </div>
        );
      case 'relatorios-adm':
        return (
          <AdminReportsView 
            sales={sales}
            sellers={sellers}
            products={products}
            auditLogs={auditLogs}
            onPrintSale={(sale) => setPrintingSale(sale)}
            onPrintReport={(title, subtitle, filteredSalesList) => setPrintingReport({ title, subtitle, sales: filteredSalesList })}
          />
        );
      case 'estoque':
        // Entregador does not have access to the stock module
        if (userRole === 'entregador' || userRole === 'montador') {
          return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
              <Package className="w-12 h-12 text-slate-300" />
              <p className="font-semibold text-slate-700">Acesso Restrito</p>
              <p className="text-sm text-slate-400">Entregadores e Montadores não têm acesso ao módulo de estoque.</p>
            </div>
          );
        }
        return (
          <ProductsView 
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onRegisterTransaction={handleRegisterTransaction}
            userRole={userRole}
            transactions={transactions}
            onAddCategory={handleAddCategory}
          />
        );
      case 'financeiro':
        return (
          <PaymentsView 
            payments={payments}
            sales={sales}
            products={products}
            onAddPayment={handleAddPayment}
            onUpdatePayment={handleUpdatePayment}
            onDeletePayment={handleDeletePayment}
            onConfirmPayment={handleConfirmPayment}
          />
        );
      case 'config':
        return (
          <ReportsView 
            categories={categories}
            products={products}
            payments={payments}
            sales={sales}
            deliveries={deliveries}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onImportData={handleImportData}
            onClearDatabase={handleClearDatabase}
            onPrintSale={(sale) => setPrintingSale(sale)}
          />
        );
      case 'clientes':
        return (
          <CustomersView 
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        );
      case 'devolucoes':
        return (
          <PurchaseReturnsView 
            products={products}
            purchaseReturns={purchaseReturns}
            onAddPurchaseReturn={handleRegisterPurchaseReturn}
            onUpdatePurchaseReturnStatus={handleUpdatePurchaseReturnStatus}
            onDeletePurchaseReturn={handleDeletePurchaseReturn}
          />
        );
      case 'orçamentos':
        return (
          <BudgetsView 
            sales={sales}
            products={products}
            sellers={sellers}
            customers={customers}
            onUpdateSale={handleUpdateSale}
            onInvoiceSale={handleInvoiceSale}
            onCancelSale={handleCancelSale}
            onDeleteSale={handleDeleteSale}
            onPrintSale={(sale) => setPrintingSale(sale)}
            userRole={userRole}
            currentSeller={currentSeller}
            deliveries={deliveries}
          />
        );
      case 'entregas':
        return (
          <DeliveriesView 
            deliveries={deliveries}
            onAddDelivery={handleAddDelivery}
            onCompleteDelivery={handleCompleteDelivery}
            onDeleteDelivery={handleDeleteDelivery}
            userRole={userRole}
            currentUserEmail={user?.email || undefined}
            currentMontador={currentMontador}
            currentDeliverer={currentDeliverer}
            onCompleteAssembly={handleCompleteAssembly}
            onPrintDelivery={(del) => setPrintingDelivery(del)}
            montadores={montadores}
            entregadores={entregadores}
            onAssignMontador={handleAssignMontador}
            onAssignDeliverer={handleAssignDeliverer}
            onStartDeliveryRoute={handleStartDeliveryRoute}
          />
        );
      case 'monstruarios':
        return (
          <ShowroomView 
            products={products}
            categories={categories}
            userRole={userRole}
            onUpdateProduct={handleUpdateProduct}
            onAddProduct={handleAddProduct}
            onDeleteProduct={handleDeleteProduct}
            sellers={sellers}
            currentSeller={currentSeller}
            onRegisterTransaction={handleRegisterTransaction}
            onPrintSale={(sale) => setPrintingSale(sale)}
            onBackToErp={() => {
              if (userRole === 'vendedor') {
                setActiveTab('vendedor-dashboard');
              } else {
                setActiveTab('dashboard');
              }
            }}
          />
        );
      default:
        return <div className="text-slate-500 font-medium font-sans">Carregando módulo...</div>;
    }
  };

  // Safety Checks & Gatekeeper rendering
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="inline-flex p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-4 animate-pulse">
          <Palette className="w-10 h-10 text-blue-500 animate-spin-slow" />
        </div>
        <p className="text-sm font-semibold text-slate-200 tracking-wide">CentralSync ERP</p>
        <p className="text-xs text-slate-500 mt-1 font-mono">Conectando ao banco de dados...</p>
      </div>
    );
  }

  if (blockedByTime) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="inline-flex p-4 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-400 mb-4">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-lg font-black text-white tracking-tight mb-2">Acesso Bloqueado</h1>
        <p className="text-sm text-slate-400 text-center max-w-md">
          O sistema está disponível apenas em horário comercial (06:00 às 18:00) para usuários comuns.
          Procure um administrador para liberar seu acesso fora do expediente.
        </p>
      </div>
    );
  }

  if (!user || !sessionUnlocked) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Full-screen customer-facing Showroom Mode (bypasses sidebar/headers for an immersive, ultra-responsive store portal)
  if (activeTab === 'monstruarios') {
    return (
      <>
        <AnimatePresence mode="wait">
          <motion.div
            key="showroom-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen bg-slate-50"
          >
            <ShowroomView 
              products={products}
              categories={categories}
              userRole={userRole}
              onUpdateProduct={handleUpdateProduct}
              onAddProduct={handleAddProduct}
              onDeleteProduct={handleDeleteProduct}
              sellers={sellers}
              currentSeller={currentSeller}
              onRegisterTransaction={handleRegisterTransaction}
              onPrintSale={(sale) => setPrintingSale(sale)}
              onBackToErp={() => {
                if (userRole === 'vendedor') {
                  setActiveTab('vendedor-dashboard');
                } else {
                  setActiveTab('dashboard');
                }
              }}
            />
          </motion.div>
        </AnimatePresence>
        {printingSale && (
          <PrintReceiptModal 
            sale={printingSale} 
            onClose={() => setPrintingSale(null)} 
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800" id="main-app-shell">
      {/* 1. SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-64 bg-blue-900 text-white border-r border-slate-200/20 shadow-md shrink-0">
        {/* Brand Banner */}
        <div className="p-6 border-b border-blue-850/60 flex items-center gap-3">
          <img src="/logo.png" alt="CentralSync Logo" className="w-8 h-8 rounded-lg bg-white/10 p-0.5 object-contain shadow-sm" />
          <div>
            <h2 className="text-base font-bold tracking-tight text-white font-display">CentralSync</h2>
            <p className="text-[10px] text-blue-200">Giro & Entregas</p>
          </div>
        </div>

        {/* Primary Navigation Menus */}
        <nav className="flex-grow mt-4" id="desktop-sidebar-nav">
          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'dashboard' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 opacity-80 shrink-0" />
                <span>Painel Geral</span>
              </div>
            </button>
          )}

          {userRole === 'vendedor' && (
            <button
              onClick={() => setActiveTab('vendedor-dashboard')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'vendedor-dashboard' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 opacity-80 shrink-0" />
                <span>Painel do Vendedor</span>
              </div>
            </button>
          )}

          {userRole === 'caixa' && (
            <button
              onClick={() => setActiveTab('caixa-dashboard')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'caixa-dashboard' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 opacity-80 shrink-0" />
                <span>Painel do Caixa</span>
              </div>
            </button>
          )}

          {userRole !== 'vendedor' && userRole !== 'caixa' && userRole !== 'entregador' && userRole !== 'montador' && (
            <button
              onClick={() => setActiveTab('estoque')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'estoque' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 opacity-80 shrink-0" />
                <span>Estoque de Itens</span>
              </div>
              {warningCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'estoque' ? 'bg-blue-200 text-blue-900' : 'bg-amber-50 text-white'}`}>
                  {warningCount}
                </span>
              )}
            </button>
          )}

          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'caixa' && (
            <button
              onClick={() => setActiveTab('monstruarios')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'monstruarios' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3 font-sans">
                <Palette className="w-5 h-5 opacity-80 shrink-0 text-blue-300" />
                <span>Monstruários (Showroom)</span>
              </div>
              <span className="bg-blue-400 text-blue-900 border border-blue-350 rounded px-1.5 py-0.2 text-[9px] uppercase font-bold tracking-tight">Novo</span>
            </button>
          )}

          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && (
            <button
              onClick={() => setActiveTab('clientes')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'clientes' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3 font-sans">
                <Users className="w-5 h-5 opacity-80 shrink-0 text-blue-300" />
                <span>Cadastro de Clientes</span>
              </div>
            </button>
          )}

          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && (
            <button
              onClick={() => setActiveTab('orçamentos')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'orçamentos' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 opacity-80 shrink-0" />
                <span>Pedidos & Orçamentos</span>
              </div>
            </button>
          )}

          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setActiveTab('devolucoes')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'devolucoes' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <CornerUpLeft className="w-5 h-5 opacity-80 shrink-0" />
                <span>Devolução de Compras</span>
              </div>
            </button>
          )}

          {userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setActiveTab('entregas')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'entregas' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 opacity-80 shrink-0" />
                <span>Entregas & Assinaturas</span>
              </div>
              {pendingDeliveriesCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'entregas' ? 'bg-blue-200 text-blue-900' : 'bg-amber-50 text-white'}`}>
                  {pendingDeliveriesCount}
                </span>
              )}
            </button>
          )}

          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setActiveTab('financeiro')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'financeiro' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 opacity-80 shrink-0" />
                <span>Fluxo Financeiro</span>
              </div>
            </button>
          )}

          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setActiveTab('relatorios-adm')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'relatorios-adm' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 opacity-80 shrink-0" />
                <span>Relatórios Adm</span>
              </div>
            </button>
          )}

          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs md:text-sm transition-all duration-150 cursor-pointer text-left ${activeTab === 'config' ? 'bg-blue-800 text-white border-l-4 border-blue-400 font-semibold' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white font-medium border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 opacity-80 shrink-0" />
                <span>Configurações</span>
              </div>
            </button>
          )}
        </nav>

        {/* Corporate Status Footer block */}
        <div className="p-4 mt-auto space-y-3">
          <div className="bg-blue-850/50 rounded-xl p-3 border border-blue-700/30">
            <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Operador</p>
            <p className="text-xs text-white font-medium mt-0.5 truncate" title={user?.email || ''}>
              {user?.displayName || user?.email?.split('@')[0]}
            </p>
            <p className="text-[9px] text-blue-300/80 truncate font-mono mt-0.5">
              {user?.email}
            </p>
            <p className="text-[9px] text-blue-400 mt-2 leading-tight">
              Módulo fiscal: Inativo <br />
              Sem emissão de NF-e
            </p>
          </div>

          {showInstallBtn && (
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer shadow-sm animate-pulse"
            >
              <Download className="w-3.5 h-3.5 shrink-0 animate-bounce" />
              <span>Instalar Aplicativo</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-650/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-bold text-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sair / Bloquear</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION */}
      <header className="md:hidden bg-blue-900 border-b border-blue-800 text-white px-4 py-3 flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="CentralSync Logo" className="w-7 h-7 rounded-md bg-white/10 p-0.5 object-contain" />
          <span className="font-extrabold text-sm tracking-wide font-display">CentralSync</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingDeliveriesCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingDeliveriesCount} entregas
            </span>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all cursor-pointer"
            title="Abrir menu de navegação"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Slide Down Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-blue-950 border-b border-blue-900 text-white py-4 px-4 space-y-1.5 font-sans"
            id="mobile-navigation-drawer"
          >
            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'dashboard' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <BarChart3 className="w-5 h-5 shrink-0" />
                <span>Painel de Visão Geral</span>
              </button>
            )}

            {userRole === 'vendedor' && (
              <button
                onClick={() => {
                  setActiveTab('vendedor-dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'vendedor-dashboard' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <BarChart3 className="w-5 h-5 shrink-0" />
                <span>Painel do Vendedor</span>
              </button>
            )}

            {userRole === 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('caixa-dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'caixa-dashboard' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <DollarSign className="w-5 h-5 shrink-0" />
                <span>Painel do Caixa</span>
              </button>
            )}

            {userRole !== 'vendedor' && userRole !== 'caixa' && userRole !== 'entregador' && userRole !== 'montador' && (
              <button
                onClick={() => {
                  setActiveTab('estoque');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'estoque' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <Package className="w-5 h-5 shrink-0" />
                <span>Catálogo de Estoque</span>
                {warningCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.2 bg-amber-500 font-bold rounded-full text-[10px] text-white">
                    {warningCount}
                  </span>
                )}
              </button>
            )}

            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('monstruarios');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'monstruarios' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <Palette className="w-5 h-5 shrink-0 text-blue-300" />
                <span>Monstruários (Showroom)</span>
              </button>
            )}

            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && (
              <button
                onClick={() => {
                  setActiveTab('clientes');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'clientes' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <Users className="w-5 h-5 shrink-0 text-blue-300" />
                <span>Cadastro de Clientes</span>
              </button>
            )}

            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && (
              <button
                onClick={() => {
                  setActiveTab('orçamentos');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'orçamentos' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <ClipboardList className="w-5 h-5 shrink-0" />
                <span>Pedidos & Orçamentos</span>
              </button>
            )}

            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('devolucoes');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'devolucoes' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <CornerUpLeft className="w-5 h-5 shrink-0" />
                <span>Devolução de Compras</span>
              </button>
            )}

            {userRole !== 'vendedor' && userRole !== 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('entregas');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'entregas' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <Truck className="w-5 h-5 shrink-0" />
                <span>Entregas de Móveis</span>
                {pendingDeliveriesCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.2 bg-blue-500 font-bold rounded-full text-[10px] text-white">
                    {pendingDeliveriesCount}
                  </span>
                )}
              </button>
            )}

            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('financeiro');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'financeiro' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <DollarSign className="w-5 h-5 shrink-0" />
                <span>Contas a Pagar & Receber</span>
              </button>
            )}

            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('relatorios-adm');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'relatorios-adm' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <TrendingUp className="w-5 h-5 shrink-0" />
                <span>Relatórios Adm</span>
              </button>
            )}

            {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
              <button
                onClick={() => {
                  setActiveTab('config');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold ${activeTab === 'config' ? 'bg-white text-blue-955 font-bold' : 'text-blue-100 hover:bg-blue-900/50'}`}
              >
                <Settings className="w-5 h-5 shrink-0" />
                <span>Categorias & Backup Local</span>
              </button>
            )}

            {showInstallBtn && (
              <button
                onClick={handleInstallApp}
                className="w-full mb-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Instalar Aplicativo</span>
              </button>
            )}

            <div className="pt-3 border-t border-blue-900 text-xs flex flex-col gap-2 px-3.5 italic text-blue-300">
              <div className="truncate">
                Operando como: <span className="font-bold text-white font-mono text-[11px]">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full mt-1.5 py-2 bg-red-600/25 hover:bg-red-600/35 border border-red-500/30 text-red-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Bloquear & Log out</span>
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* 3. MAIN CONTENTS WRAPPER */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8" id="primary-content-wrapper">
        {warningCount > 0 && userRole !== 'vendedor' && userRole !== 'caixa' && userRole !== 'entregador' && userRole !== 'montador' && (
          <div className="mb-6 max-w-7xl mx-auto bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-pulse text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <CircleAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-900 uppercase tracking-wider">Aviso de Estoque Baixo</h4>
                <p className="text-xs text-amber-700 mt-0.5">Você possui <span className="font-bold">{warningCount}</span> {warningCount === 1 ? 'produto' : 'produtos'} com estoque abaixo do mínimo de segurança!</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('estoque')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Visualizar Estoque
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-7xl mx-auto"
          >
            <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>}>
              {renderSubView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {printingSale && (
        <PrintReceiptModal 
          sale={printingSale} 
          onClose={() => setPrintingSale(null)} 
        />
      )}
      
      {printingReport && (
        <PrintReportModal 
          report={printingReport} 
          onClose={() => setPrintingReport(null)} 
        />
      )}

      {printingDelivery && (
        <PrintDeliveryModal 
          delivery={printingDelivery} 
          onClose={() => setPrintingDelivery(null)} 
          userRole={userRole}
          currentUserEmail={user?.email || undefined}
        />
      )}

      {/* Floating Support / Bug Report Button */}
      {user && (
        <button
          onClick={() => setIsBugModalOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-lg transition-all hover:scale-105 hover:translate-y-[-2px] active:translate-y-[0] cursor-pointer"
          title="Reportar problema ou solicitar suporte"
        >
          <LifeBuoy className="w-4 h-4 text-white animate-pulse" />
          <span className="hidden md:inline">Reportar Problema</span>
        </button>
      )}

      {/* BUG REPORT MODAL */}
      {isBugModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="bg-rose-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-base font-display">Reportar Problema / Suporte</h3>
                  <p className="text-[11px] text-rose-100">Envie detalhes do erro diretamente para o suporte no WhatsApp.</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsBugModalOpen(false); setBugComment(''); setIncludeLogs(true); }} 
                className="p-1 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBugReport} className="p-6 space-y-4 text-left text-xs">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Descreva o que aconteceu *</label>
                <textarea
                  rows={4}
                  placeholder="Por favor, descreva o erro com o máximo de detalhes possível (ex: 'Estava tentando faturar uma venda com método PIX e o botão ficou cinza e não respondeu...')"
                  value={bugComment}
                  onChange={(e) => setBugComment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 bg-slate-50 text-slate-800 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Gravidade do Problema</label>
                <select
                  value={bugSeverity}
                  onChange={(e) => setBugSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 bg-white text-slate-800 text-xs cursor-pointer"
                >
                  <option value="BAIXA">Leve (Dúvida, sugestão ou ajuste estético)</option>
                  <option value="MEDIA">Média (Funcionalidade com comportamento estranho, mas dá para usar)</option>
                  <option value="ALTA">Grave (Botão não funciona, erro na tela ou impede de trabalhar)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 py-2 border-y border-slate-100">
                <input
                  type="checkbox"
                  id="include-logs"
                  checked={includeLogs}
                  onChange={(e) => setIncludeLogs(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="include-logs" className="font-bold text-slate-705 cursor-pointer select-none">
                  Anexar logs técnicos e erros recentes do console ({consoleLogs.length} logs capturados)
                </label>
              </div>

              {includeLogs && consoleLogs.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 block">Pré-visualização dos logs que serão enviados:</span>
                  <pre className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-[9px] rounded-lg overflow-x-auto max-h-32 overflow-y-auto leading-relaxed">
                    {consoleLogs.join('\n')}
                  </pre>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsBugModalOpen(false); setBugComment(''); setIncludeLogs(true); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Enviar via WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPwaInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-md w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Download className="w-5 h-5" /> Como Instalar o CentralSync
              </h3>
              <button 
                onClick={() => setShowPwaInstallModal(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4 text-slate-700 text-sm text-left">
              <p>O CentralSync pode ser instalado como um aplicativo nativo leve em seu dispositivo.</p>
              
              <div className="space-y-3.5">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Computador (Chrome / Edge / Opera)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Clique no ícone de instalação <span className="font-semibold text-slate-700">(computador com seta para baixo ou o botão "+")</span> na barra de endereços do navegador (ao lado do link do site) e confirme.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Celular Android (Chrome)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Toque no menu de três pontos no canto superior direito do navegador e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">iPhone / iPad (Safari)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Toque no botão de compartilhamento (ícone de quadrado com seta para cima) na barra inferior e selecione <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowPwaInstallModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
