/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Calendar, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  X,
  CreditCard,
  Briefcase,
  Layers,
  RefreshCw,
  Lock,
  Download
} from 'lucide-react';
import { Payment, PaymentType, PaymentStatus, PaymentCategory, PaymentMethod, Sale, Product } from '../types';
import { fetchCashRegisters, saveCashRegister, CashRegister } from '../db';
import { auth } from '../firebase';
import { DeleteConfirmationDialog } from './shared/DeleteConfirmationDialog';
import { formatCurrency } from '../utils/format';
import { SummaryTab } from './payments/SummaryTab';
import { MethodsTab } from './payments/MethodsTab';
import { CentralTab } from './payments/CentralTab';
import { AlterdataTab } from './payments/AlterdataTab';

interface PaymentsViewProps {
  payments: Payment[];
  sales: Sale[];
  products: Product[];
  onAddPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  onUpdatePayment: (payment: Payment) => void;
  onDeletePayment: (id: string) => void;
  onConfirmPayment: (id: string, paymentDate: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  sales,
  products,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onConfirmPayment
}) => {
  // Tabs for Types
  const [activeTab, setActiveTab] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  
  // Custom Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PaymentCategory>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Selected item state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Date input for quick confirmation
  const [quickPaymentDate, setQuickPaymentDate] = useState('2026-06-10'); // matching local metadata date

  // New Payment Form state
  const [newPayment, setNewPayment] = useState({
    description: '',
    amount: '',
    type: 'INCOME' as PaymentType,
    category: 'VENDAS' as PaymentCategory,
    dueDate: '2026-06-10',
    entityName: '',
    notes: '',
    markAsPaid: false,
    paymentDate: '2026-06-10',
    isFixed: false
  });

  // Edit Payment Form state
  const [editPaymentState, setEditPaymentState] = useState<Payment | null>(null);

  // Delete Payment Confirmation state
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Dashboard toggle and tabs states
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<'SUMMARY' | 'CENTRAL' | 'ALTERDATA' | 'METHODS' | 'CASH_REGISTER'>('SUMMARY');

  // Cash Register States
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loadingCash, setLoadingCash] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('IN'); // IN: Reforço, OUT: Sangria
  const [movementDesc, setMovementDesc] = useState('');
  const [closingBalanceInput, setClosingBalanceInput] = useState('');
  
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const loadCashRegisters = async () => {
    try {
      setLoadingCash(true);
      const list = await fetchCashRegisters();
      list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      setCashRegisters(list);
    } catch (err) {
      console.error("Erro ao carregar caixas:", err);
    } finally {
      setLoadingCash(false);
    }
  };

  useEffect(() => {
    if (dashboardTab === 'CASH_REGISTER') {
      loadCashRegisters();
    }
  }, [dashboardTab]);

  const activeRegister = useMemo(() => {
    return cashRegisters.find(r => r.status === 'OPEN');
  }, [cashRegisters]);

  const activeRegisterExpected = useMemo(() => {
    if (!activeRegister) return 0;
    let balance = activeRegister.openingBalance;
    
    if (activeRegister.movements) {
      activeRegister.movements.forEach(m => {
        if (m.type === 'IN') balance += m.amount;
        else balance -= m.amount;
      });
    }
    
    const cashPaymentsSinceOpening = payments.filter(p => {
      return p.type === 'INCOME' && 
             p.status === 'PAID' && 
             p.paymentMethod === 'DINHEIRO' && 
             p.paymentDate && 
             new Date(p.paymentDate).getTime() >= new Date(activeRegister.openedAt).getTime();
    });
    
    cashPaymentsSinceOpening.forEach(p => {
      balance += p.amount;
    });

    return balance;
  }, [activeRegister, payments]);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(openingBalanceInput);
    if (isNaN(balanceNum) || balanceNum < 0) {
      alert("Por favor, insira um valor inicial válido.");
      return;
    }

    const email = auth.currentUser?.email || 'operador@centralsync.com';
    const newReg: CashRegister = {
      id: `cash-${Date.now()}`,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      openedBy: email,
      openingBalance: balanceNum,
      movements: []
    };

    try {
      setLoadingCash(true);
      await saveCashRegister(newReg);
      setOpeningBalanceInput('');
      await loadCashRegisters();
    } catch (err) {
      alert("Erro ao abrir caixa: " + err);
    } finally {
      setLoadingCash(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;

    const amountNum = parseFloat(movementAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Insira um valor válido.");
      return;
    }

    const newMov = {
      id: `mov-${Date.now()}`,
      type: movementReason as 'IN' | 'OUT',
      amount: amountNum,
      reason: movementReason === 'IN' ? 'REFORÇO' : 'SANGRIA',
      description: movementDesc,
      date: new Date().toISOString()
    };

    const updatedReg: CashRegister = {
      ...activeRegister,
      movements: [...(activeRegister.movements || []), newMov]
    };

    try {
      setLoadingCash(true);
      await saveCashRegister(updatedReg);
      setMovementAmount('');
      setMovementDesc('');
      setIsMovementModalOpen(false);
      await loadCashRegisters();
    } catch (err) {
      alert("Erro ao registrar movimentação: " + err);
    } finally {
      setLoadingCash(false);
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;

    const countedNum = parseFloat(closingBalanceInput);
    if (isNaN(countedNum) || countedNum < 0) {
      alert("Por favor, insira o valor contado fisicamente.");
      return;
    }

    const email = auth.currentUser?.email || 'operador@centralsync.com';
    const difference = countedNum - activeRegisterExpected;

    const closedReg: CashRegister = {
      ...activeRegister,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closedBy: email,
      closingBalance: countedNum,
      expectedBalance: activeRegisterExpected,
      difference: parseFloat(difference.toFixed(2))
    };

    try {
      setLoadingCash(true);
      await saveCashRegister(closedReg);
      setClosingBalanceInput('');
      setIsCloseModalOpen(false);
      await loadCashRegisters();
    } catch (err) {
      alert("Erro ao fechar caixa: " + err);
    } finally {
      setLoadingCash(false);
    }
  };

  // 1. Memoized and Filtered results
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesTab = activeTab === 'ALL' || p.type === activeTab;
      
      const matchesSearch = p.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.entityName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

      return matchesTab && matchesSearch && matchesStatus && matchesCategory;
    });
  }, [payments, activeTab, searchQuery, statusFilter, categoryFilter]);

  // Summaries of filtered results
  const metrics = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    let paidIncome = 0;
    let paidExpense = 0;

    filteredPayments.forEach(p => {
      if (p.type === 'INCOME') {
        incomeTotal += p.amount;
        if (p.status === 'PAID') paidIncome += p.amount;
      } else {
        expenseTotal += p.amount;
        if (p.status === 'PAID') paidExpense += p.amount;
      }
    });

    return {
      incomeTotal,
      expenseTotal,
      balance: incomeTotal - expenseTotal,
      paidBalance: paidIncome - paidExpense
    };
  }, [filteredPayments]);

  // 2. Dashboard calculations
  const dashboardStats = useMemo(() => {
    const completedSales = sales.filter(s => s.status === 'COMPLETED');
    
    // Billing & Cost calculations
    let totalSalesCount = completedSales.length;
    let totalBilling = 0;
    let totalCost = 0;
    
    completedSales.forEach(sale => {
      totalBilling += sale.value;
      const prod = products.find(p => p.id === sale.productId);
      if (prod) {
        totalCost += (prod.costPrice || 0);
      }
    });
    
    const profit = totalBilling - totalCost;
    const marginPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const profitMarginPercent = totalBilling > 0 ? (profit / totalBilling) * 100 : 0;

    // Split payment methods calculations from PAID incomes
    const methodTotals: Record<PaymentMethod, number> = {
      DINHEIRO: 0,
      CREDIARIO: 0,
      CARTAO: 0,
      CARTAO_X: 0,
      CENTRAL: 0,
      ALTERDATA: 0,
      PIX: 0
    };
    
    payments.forEach(p => {
      if (p.type === 'INCOME' && p.status === 'PAID' && p.paymentMethod) {
        methodTotals[p.paymentMethod] = (methodTotals[p.paymentMethod] || 0) + p.amount;
      }
    });

    // Helper function to resolve Caixa
    const getCaixa = (payment: Payment): 'CENTRAL' | 'ALTERDATA' | 'OUTROS' => {
      const method = payment.paymentMethod;
      if (method === 'CENTRAL') return 'CENTRAL';
      if (method === 'ALTERDATA') return 'ALTERDATA';
      
      const desc = (payment.description || '').toLowerCase();
      const notes = (payment.notes || '').toLowerCase();
      
      if (desc.includes('central') || notes.includes('central') || desc.includes('orçamento') || notes.includes('orçamento') || desc.includes('orcamento') || notes.includes('orcamento')) return 'CENTRAL';
      if (desc.includes('alterdata') || notes.includes('alterdata') || desc.includes('fechamento') || notes.includes('fechamento')) return 'ALTERDATA';
      
      return 'OUTROS';
    };

    // Caixa reports
    const centralReport = {
      incomes: 0,
      expenses: 0,
      balance: 0,
      transactions: [] as Payment[]
    };

    const alterdataReport = {
      incomes: 0,
      expenses: 0,
      balance: 0,
      transactions: [] as Payment[]
    };

    payments.forEach(p => {
      const caixa = getCaixa(p);
      if (caixa === 'CENTRAL') {
        if (p.status === 'PAID') {
          if (p.type === 'INCOME') {
            centralReport.incomes += p.amount;
          } else {
            centralReport.expenses += p.amount;
          }
        }
        centralReport.transactions.push(p);
      } else if (caixa === 'ALTERDATA') {
        if (p.status === 'PAID') {
          if (p.type === 'INCOME') {
            alterdataReport.incomes += p.amount;
          } else {
            alterdataReport.expenses += p.amount;
          }
        }
        alterdataReport.transactions.push(p);
      }
    });

    centralReport.balance = centralReport.incomes - centralReport.expenses;
    alterdataReport.balance = alterdataReport.incomes - alterdataReport.expenses;

    // Sort transactions by date desc
    centralReport.transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    alterdataReport.transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    return {
      totalSalesCount,
      totalBilling,
      totalCost,
      profit,
      marginPercent,
      profitMarginPercent,
      methodTotals,
      centralReport,
      alterdataReport
    };
  }, [sales, products, payments]);

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.description || !newPayment.amount || !newPayment.entityName || !newPayment.dueDate) {
      alert('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    const amountNum = parseFloat(newPayment.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('O valor monetário deve ser um número maior que zero.');
      return;
    }

    onAddPayment({
      description: newPayment.description.trim(),
      amount: amountNum,
      type: newPayment.type,
      category: newPayment.category,
      dueDate: newPayment.dueDate,
      entityName: newPayment.entityName.trim(),
      notes: newPayment.notes.trim() || undefined,
      status: newPayment.markAsPaid ? 'PAID' : 'PENDING',
      paymentDate: newPayment.markAsPaid ? newPayment.paymentDate : undefined,
      isFixed: newPayment.isFixed || undefined
    });

    // Reset Form state
    setNewPayment({
      description: '',
      amount: '',
      type: 'INCOME',
      category: 'VENDAS',
      dueDate: '2026-06-10',
      entityName: '',
      notes: '',
      markAsPaid: false,
      paymentDate: '2026-06-10',
      isFixed: false
    });
    setIsAddModalOpen(false);
  };

  const handleUpdatePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPaymentState || !editPaymentState.description || !editPaymentState.amount || !editPaymentState.entityName) {
      alert('Preencha os campos obrigatórios corretamente.');
      return;
    }

    onUpdatePayment(editPaymentState);
    setIsEditModalOpen(false);
    setEditPaymentState(null);
  };

  const triggerQuickConfirm = (payment: Payment) => {
    setSelectedPayment(payment);
    setQuickPaymentDate('2026-06-10'); // Default to current time
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    onConfirmPayment(selectedPayment.id, quickPaymentDate);
    setIsConfirmModalOpen(false);
    setSelectedPayment(null);
  };


  // Helper translations and colors
  const getCategoryLabel = (cat: PaymentCategory) => {
    const map: Record<PaymentCategory, string> = {
      VENDAS: 'Vendas de Produtos',
      FORNECEDORES: 'Fornecedores de Serviços',
      PRODUTOS: 'Reposição de Estoque',
      SALARIOS: 'Folha salarial',
      SERVICOS: 'Serviços Terceirizados',
      ESTRUTURA: 'Custo Estrutural/Aluguel',
      OUTROS: 'Outras despesas/Receitas'
    };
    return map[cat] || cat;
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pago
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-3.5 h-3.5" /> Pendente
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> em Atraso
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Cancelado
          </span>
        );
    }
  };

  const handleExportPaymentsCsv = () => {
    const headers = ['ID', 'Descrição', 'Valor (R$)', 'Tipo', 'Categoria', 'Método', 'Vencimento', 'Compensação', 'Status', 'Entidade/Cliente', 'Notas'];
    const rows = filteredPayments.map(p => [
      p.id,
      p.description,
      p.amount.toFixed(2),
      p.type === 'INCOME' ? 'Receita' : 'Despesa',
      p.category,
      p.paymentMethod || '',
      p.dueDate,
      p.paymentDate || '',
      p.status === 'PAID' ? 'Pago' : p.status === 'PENDING' ? 'Pendente' : p.status === 'OVERDUE' ? 'Atrasado' : 'Cancelado',
      p.entityName,
      p.notes || ''
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financeiro_centralsync_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Fluxo Financeiro & Lançamentos</h1>
          <p className="text-sm text-slate-500">Contas a pagar despesas e contas a receber de clientes comerciais. Sem complexidades tributárias de notas fiscais.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPaymentsCsv}
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-sm transition-all hover:translate-y-[-1px] cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:translate-y-[-1px]"
            id="btn-add-payment"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Lançar Título</span>
          </button>
        </div>
      </div>

      {/* 📈 Painel e Relatório Completo de Gestão */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
        {/* Dashboard Header */}
        <div 
          onClick={() => setIsDashboardOpen(!isDashboardOpen)}
          className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/10 rounded-lg">
              <RefreshCw className={`w-5 h-5 text-indigo-300 transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`} />
            </span>
            <div>
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider font-display text-left">📈 Relatórios e Analítico de Gestão</h2>
              <p className="text-[10px] md:text-xs text-slate-300 font-medium mt-0.5 text-left">Cruzamento de faturamento, custo, margem e caixas Orçamento & Fechamento.</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/15 px-3 py-1 rounded-full uppercase tracking-wider">
            {isDashboardOpen ? 'Ocultar' : 'Visualizar'}
          </span>
        </div>

        {isDashboardOpen && (
          <div className="p-5 space-y-5 animate-fade-in text-left">
            {/* Dashboard Sub-tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
              {[
                { id: 'SUMMARY' as const, label: 'Resumo Geral & Margens' },
                { id: 'CENTRAL' as const, label: 'Caixa Orçamento' },
                { id: 'ALTERDATA' as const, label: 'Caixa Fechamento' },
                { id: 'METHODS' as const, label: 'Meios de Recebimento' },
                { id: 'CASH_REGISTER' as const, label: 'Fluxo de Caixa Diário' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDashboardTab(tab.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer whitespace-nowrap ${
                    dashboardTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: SUMMARY */}
            {dashboardTab === 'SUMMARY' && (
              <SummaryTab dashboardStats={dashboardStats} />
            )}

            {/* TAB CONTENT: CENTRAL */}
            {dashboardTab === 'CENTRAL' && (
              <CentralTab centralReport={dashboardStats.centralReport} getStatusBadge={getStatusBadge} />
            )}

            {/* TAB CONTENT: ALTERDATA */}
            {dashboardTab === 'ALTERDATA' && (
              <AlterdataTab alterdataReport={dashboardStats.alterdataReport} getStatusBadge={getStatusBadge} />
            )}

            {/* TAB CONTENT: METHODS */}
            {dashboardTab === 'METHODS' && (
              <MethodsTab methodTotals={dashboardStats.methodTotals as Record<string, number>} />
            )}

            {/* TAB CONTENT: CASH_REGISTER */}
            {dashboardTab === 'CASH_REGISTER' && (
              <div className="space-y-6">
                {loadingCash && cashRegisters.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Carregando fluxo de caixa...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left/Middle Column: Active Session or Opening Form */}
                    <div className="lg:col-span-2 space-y-6">
                      {!activeRegister ? (
                        /* Opening Form */
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                          <div className="flex items-center gap-2 text-slate-750">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-sm">O Caixa está Fechado</h3>
                          </div>
                          <p className="text-xs text-slate-450">Abra uma nova sessão de caixa diário para começar a registrar sangrias, reforços e conferências físicas de valores na gaveta de dinheiro.</p>
                          
                          <form onSubmit={handleOpenRegister} className="space-y-4 max-w-sm">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Troco Inicial (Dinheiro em Caixa) *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0,00"
                                  value={openingBalanceInput}
                                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                                  className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-slate-800 font-bold"
                                  required
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={loadingCash}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Abrir Caixa Diário
                            </button>
                          </form>
                        </div>
                      ) : (
                        /* Active Session Panel */
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              <div>
                                <h3 className="font-bold text-sm text-slate-800">Caixa Aberto</h3>
                                <span className="text-[10px] text-slate-400 font-mono">Iniciado em {new Date(activeRegister.openedAt).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setIsMovementModalOpen(true)}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                Sangria / Reforço
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsCloseModalOpen(true)}
                                className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                              >
                                Fechar Caixa
                              </button>
                            </div>
                          </div>

                          {/* Cash KPIs */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Saldo Inicial (Troco)</span>
                              <span className="text-sm font-black text-slate-700 font-mono block mt-1">{formatCurrency(activeRegister.openingBalance)}</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Movimentações Avulsas</span>
                              {(() => {
                                let sum = 0;
                                activeRegister.movements?.forEach(m => {
                                  if (m.type === 'IN') sum += m.amount;
                                  else sum -= m.amount;
                                });
                                return (
                                  <span className={`text-sm font-black font-mono block mt-1 ${sum >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {sum >= 0 ? '+' : ''}{formatCurrency(sum)}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-150">
                              <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold block">Saldo em Dinheiro Esperado</span>
                              <span className="text-sm font-black text-blue-900 font-mono block mt-1">{formatCurrency(activeRegisterExpected)}</span>
                            </div>
                          </div>

                          {/* Movements List */}
                          <div className="space-y-3">
                            <h4 className="font-bold text-xs text-slate-700">Histórico de Movimentações da Sessão</h4>
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                              {((activeRegister.movements || []).length === 0) ? (
                                <div className="p-6 text-center text-slate-400 text-xs">
                                  Nenhuma sangria ou reforço registrado nesta sessão.
                                </div>
                              ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                                      <th className="p-2.5">Hora</th>
                                      <th className="p-2.5">Tipo</th>
                                      <th className="p-2.5">Motivo</th>
                                      <th className="p-2.5 text-right">Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {activeRegister.movements?.map((m, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/30">
                                        <td className="p-2.5 text-slate-450 font-mono">
                                          {new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-2.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${m.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                            {m.type === 'IN' ? 'Reforço' : 'Sangria'}
                                          </span>
                                        </td>
                                        <td className="p-2.5 truncate max-w-[150px]" title={m.description}>
                                          <span className="font-bold text-slate-800 block">{m.reason}</span>
                                          {m.description && <span className="text-[10px] text-slate-400 italic block">{m.description}</span>}
                                        </td>
                                        <td className={`p-2.5 text-right font-mono font-bold ${m.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                          {m.type === 'IN' ? '+' : '-'}{formatCurrency(m.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: History of closed sessions */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Histórico de Fechamentos</h3>
                      <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1">
                        {cashRegisters.filter(r => r.status === 'CLOSED').length === 0 ? (
                          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                            Nenhum caixa fechado no histórico.
                          </div>
                        ) : (
                          cashRegisters.filter(r => r.status === 'CLOSED').map(reg => {
                            const hasDiff = (reg.difference || 0) !== 0;
                            return (
                              <div key={reg.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{reg.id}</span>
                                    <span className="text-xs text-slate-550 block">Fechado em {new Date(reg.closedAt || '').toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wider">
                                    Fechado
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Abertura (Troco):</span>
                                    <span className="text-slate-800 font-bold">{formatCurrency(reg.openingBalance)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Esperado:</span>
                                    <span className="text-slate-800 font-bold">{formatCurrency(reg.expectedBalance || 0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Contado Físico:</span>
                                    <span className="text-slate-800 font-bold">{formatCurrency(reg.closingBalance || 0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Diferença:</span>
                                    <span className={`font-bold ${hasDiff ? ((reg.difference || 0) > 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-705'}`}>
                                      {reg.difference === 0 ? 'Sem diferença' : `${(reg.difference || 0) > 0 ? '+' : ''}${formatCurrency(reg.difference || 0)}`}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                                  <span>Operador: {reg.closedBy}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick metrics summary of filtered query */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="payments-metric-grid">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Filtrado: Receitas</span>
            <span className="text-xl font-bold font-display text-slate-900">{formatCurrency(metrics.incomeTotal)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-700 border border-rose-100">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Filtrado: Despesas</span>
            <span className="text-xl font-bold font-display text-slate-900">{formatCurrency(metrics.expenseTotal)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-lg border ${metrics.balance >= 0 ? 'bg-blue-50 text-blue-600 border-blue-150' : 'bg-red-50 text-red-600 border-red-150'}`}>
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Saldo Filtrado</span>
            <span className={`text-xl font-bold font-display ${metrics.balance >= 0 ? 'text-slate-900' : 'text-red-650'}`}>
              {formatCurrency(metrics.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs and Custom Search Filters Row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="tab-filters-row">
        {/* Navigation Tabs (All, Receivables, Payables) */}
        <div className="flex border-b border-slate-100" id="payment-nav-tabs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${activeTab === 'ALL' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
          >
            Todos os Títulos ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('INCOME')}
            className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${activeTab === 'INCOME' ? 'border-emerald-600 text-emerald-650 bg-emerald-50/10' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
          >
            A Receber / Entradas
          </button>
          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${activeTab === 'EXPENSE' ? 'border-rose-600 text-rose-650 bg-rose-50/10' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
          >
            A Pagar / Saídas
          </button>
        </div>

        {/* Search Inputs and filters */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Searching */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar título, cliente, observação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
              id="payment-search"
            />
          </div>

          {/* Status filtering */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 cursor-pointer"
            >
              <option value="ALL">Qualquer Status</option>
              <option value="PENDING">Apenas Pendentes</option>
              <option value="PAID">Apenas Pagos</option>
              <option value="OVERDUE">Apenas Atrasados</option>
              <option value="CANCELLED">Apenas Cancelados</option>
            </select>
          </div>

          {/* Category filtering */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 cursor-pointer"
            >
              <option value="ALL">Qualquer Categoria</option>
              <option value="VENDAS">Vendas de Prod.</option>
              <option value="FORNECEDORES">Fornecedores</option>
              <option value="PRODUTOS">Compra de Estoque</option>
              <option value="SALARIOS">Salários / Pessoas</option>
              <option value="SERVICOS">Serviços Terceiros</option>
              <option value="ESTRUTURA">Estrutura (Aluguel, Luz)</option>
              <option value="OUTROS">Outros lançamentos</option>
            </select>
          </div>
        </div>

        {/* Master Payments Lists Table */}
        {filteredPayments.length > 0 ? (
          <>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Descrição do Título</th>
                    <th className="p-4">Cliente / Fornecedor</th>
                    <th className="p-4 text-center">Tipo</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4">Vencimento / Liquidação</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Ação Rápida</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map(payment => {
                    const isOverdue = payment.status === 'OVERDUE';
                    const isIncome = payment.type === 'INCOME';

                    return (
                      <tr 
                        key={payment.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-rose-50/10' : ''}`}
                        id={`pay-row-${payment.id}`}
                      >
                        {/* Description */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900 leading-snug">{payment.description}</div>
                          {payment.notes && (
                            <div className="text-slate-400 text-xs italic mt-0.5 max-w-[200px] truncate" title={payment.notes}>
                              "{payment.notes}"
                            </div>
                          )}
                          {payment.isFixed && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.3 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                              <RefreshCw className="w-3 h-3" /> Fixa Recorrente
                            </span>
                          )}
                        </td>

                        {/* Entity Customer name */}
                        <td className="p-4">
                          <div className="font-semibold text-slate-700 font-sans">{payment.entityName}</div>
                        </td>

                        {/* Type icon (Income or Expense) */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] uppercase ${isIncome ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-55 text-rose-700 bg-rose-50 border border-rose-100'}`}>
                            {isIncome ? 'Entrada' : 'Saída'}
                          </span>
                        </td>

                        {/* Category tag */}
                        <td className="p-4">
                          <span className="text-slate-500 text-xs">
                            {getCategoryLabel(payment.category)}
                          </span>
                        </td>

                        {/* Cash Amount */}
                        <td className="p-4 text-right">
                          <span className={`font-bold text-sm ${isIncome ? 'text-emerald-700' : 'text-slate-950'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(payment.amount)}
                          </span>
                        </td>

                        {/* Dates: Due Date & Liquidation Date */}
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Venc: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                            {payment.status === 'PAID' && payment.paymentDate && (
                              <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-55/20 px-1 py-0.2 rounded w-max">
                                Pago em: {new Date(payment.paymentDate).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="p-4 text-center">
                          {getStatusBadge(payment.status)}
                        </td>

                        {/* Fast mark as Paid */}
                        <td className="p-4 text-center">
                          {payment.status === 'PENDING' || payment.status === 'OVERDUE' ? (
                            <button
                              onClick={() => triggerQuickConfirm(payment)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs cursor-pointer transition-colors"
                              title="Lançar liquidação financeira imediata"
                              id={`btn-pay-${payment.id}`}
                            >
                              Baixar / Receber
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Liquido</span>
                          )}
                        </td>

                        {/* Edit Delete Action items */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditPaymentState({ ...payment });
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded transition-all cursor-pointer"
                              title="Editar Título"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPaymentToDelete(payment);
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded transition-all cursor-pointer"
                              title="Remover Título"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredPayments.map(payment => {
                const isOverdue = payment.status === 'OVERDUE';
                const isIncome = payment.type === 'INCOME';
                return (
                  <div key={payment.id} className={`p-4 space-y-3 ${isOverdue ? 'bg-rose-50/10' : ''}`} id={`pay-card-${payment.id}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm leading-snug">{payment.description}</div>
                        {payment.isFixed && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.3 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                            <RefreshCw className="w-3 h-3" /> Fixa Recorrente
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[9px] uppercase ${isIncome ? 'bg-emerald-55/20 text-emerald-700 border border-emerald-200' : 'bg-rose-55/20 text-rose-700 border border-rose-200'}`}>
                            {isIncome ? 'Entrada' : 'Saída'}
                          </span>
                          <span className="text-slate-500 text-[10px] font-medium">
                            {getCategoryLabel(payment.category)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Cliente/Fornecedor</span>
                        <span className="font-semibold text-slate-700">{payment.entityName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Valor</span>
                        <span className={`font-bold text-sm ${isIncome ? 'text-emerald-700' : 'text-slate-950'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(payment.amount)}
                        </span>
                      </div>
                      <div className="col-span-2 space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Vencimento: <strong className="text-slate-700">{new Date(payment.dueDate).toLocaleDateString('pt-BR')}</strong></span>
                        </div>
                        {payment.status === 'PAID' && payment.paymentDate && (
                          <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded w-max">
                            Liquidado em: {new Date(payment.paymentDate).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                      <div>
                        {payment.status === 'PENDING' || payment.status === 'OVERDUE' ? (
                          <button
                            onClick={() => triggerQuickConfirm(payment)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs cursor-pointer transition-colors"
                            id={`btn-pay-card-${payment.id}`}
                          >
                            Baixar / Receber
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">Título Liquidado</span>
                        )}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditPaymentState({ ...payment });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => {
                            setPaymentToDelete(payment);
                          }}
                          className="p-1 px-2 text-rose-55 hover:bg-rose-50 rounded border border-slate-200 text-rose-600 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Nenhum título encontrado</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'Tente suavizar os filtros ou a busca para localizar seus títulos.'
                : 'Pressione "Lançar Título" no menu superior para criar um novo registro.'}
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE PAYMENT LAUNCH */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-blue-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-inDuration-150">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-white" /> Lançar Nova Movimentação Financeira
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Type selector (Receita / Despesa) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Tipo de Lançamento <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3" id="type-selector">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPayment(prev => ({ ...prev, type: 'INCOME', category: 'VENDAS' }));
                    }}
                    className={`p-3 rounded-lg border-2 text-center text-sm font-bold flex flex-col items-center justify-center gap-1 bg-white cursor-pointer transition-all ${newPayment.type === 'INCOME' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:border-slate-350'}`}
                  >
                    <ArrowUpRight className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Contas a Receber (Receita)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPayment(prev => ({ ...prev, type: 'EXPENSE', category: 'PRODUTOS' }));
                    }}
                    className={`p-3 rounded-lg border-2 text-center text-sm font-bold flex flex-col items-center justify-center gap-1 bg-white cursor-pointer transition-all ${newPayment.type === 'EXPENSE' ? 'border-rose-600 bg-rose-50/70 text-rose-850' : 'border-slate-200 text-slate-500 hover:border-slate-350'}`}
                  >
                    <ArrowDownLeft className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Contas a Pagar (Despesa)</span>
                  </button>
                </div>
              </div>

              {/* Title description and amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Descrição do Título <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Faturamento Contrato de Suporte"
                    value={newPayment.description}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Valor Monetário (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold bg-slate-50 focus:bg-white text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Entity customer or Supplier, category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {newPayment.type === 'INCOME' ? 'Nome do Cliente / Origem' : 'Nome do Fornecedor / Destino'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={newPayment.type === 'INCOME' ? 'Ex: Ana Mendes ou Silva Co' : 'Ex: COPEL, Prefeitura SA'}
                    value={newPayment.entityName}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, entityName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Categoria Financeira <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newPayment.category}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                    required
                  >
                    {newPayment.type === 'INCOME' ? (
                      <>
                        <option value="VENDAS">VENDAS (Pedidos, saídas e comércio de produtos)</option>
                        <option value="OUTROS">OUTROS (Royalties, incentivos, devoluções internas)</option>
                      </>
                    ) : (
                      <>
                        <option value="FORNECEDORES">FORNECEDORES (Empates logísticos externos)</option>
                        <option value="PRODUTOS">PRODUTOS (Reposição física da prateleira de vendas)</option>
                        <option value="SALARIOS">SALÁRIOS (Encargos trabalhistas e gratificações)</option>
                        <option value="SERVICOS">SERVIÇOS (Contador externo, hospedagem site)</option>
                        <option value="ESTRUTURA">ESTRUTURA (Aluguel, água, energia, link de rede)</option>
                        <option value="OUTROS">OUTROS (Reparos de escritório e perdas)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Due date, notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Data de Vencimento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newPayment.dueDate}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              {/* Fixed recurring toggle */}
              {newPayment.type === 'EXPENSE' && (
                <div className="bg-amber-50/60 p-4 rounded-lg border border-amber-200/60">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPayment.isFixed}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, isFixed: e.target.checked }))}
                      className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-800 block">Despesa Fixa Recorrente</span>
                      <span className="text-[10px] text-amber-600">Ao confirmar pagamento, gera automaticamente o próximo lançamento com mesmo valor e vencimento no mês seguinte. (Ex: aluguel, internet, assinaturas)</span>
                    </div>
                  </label>
                </div>
              )}

              {/* Instant marking as paid box */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-205">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPayment.markAsPaid}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, markAsPaid: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Este título já foi quitado (Recebido/Pago)?</span>
                    <span className="text-[10px] text-slate-400">Marque para já registrar seu faturamento real no caixa consolidado.</span>
                  </div>
                </label>

                {newPayment.markAsPaid && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Data da Liquidação Bancária
                    </label>
                    <input
                      type="date"
                      value={newPayment.paymentDate}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, paymentDate: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Supplemental notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Anotações observaveis / Notas bancárias
                </label>
                <textarea
                  placeholder="Código de rastreamento do PIX, instituição bacária liquidadora ou detalhes de parcelas."
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Save actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PAYMENT STATUS / DATA */}
      {isEditModalOpen && editPaymentState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-blue-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-blue-700 p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-white" /> Editar Detalhes do Lançamento
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditPaymentState(null);
                }}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePaymentSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tipo do título
                  </label>
                  <select
                    value={editPaymentState.type}
                    onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, type: e.target.value as any }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-100 font-bold"
                    disabled
                  >
                    <option value="INCOME">Receita / A Receber</option>
                    <option value="EXPENSE">Despesa / A Pagar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Categoria Financeira
                  </label>
                  <select
                    value={editPaymentState.category}
                    onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, category: e.target.value as any }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  >
                    <option value="VENDAS">VENDAS</option>
                    <option value="FORNECEDORES">FORNECEDORES</option>
                    <option value="PRODUTOS">PRODUTOS (Reposição)</option>
                    <option value="SALARIOS">SALÁRIOS</option>
                    <option value="SERVICOS">SERVIÇOS</option>
                    <option value="ESTRUTURA">ESTRUTURA</option>
                    <option value="OUTROS">OUTROS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Descrição do Título
                  </label>
                  <input
                    type="text"
                    value={editPaymentState.description}
                    onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Valor Monetário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editPaymentState.amount}
                    onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, amount: parseFloat(e.target.value) || 0 }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {editPaymentState.type === 'INCOME' ? 'Nome do Cliente / Origem' : 'Fornecedor / Destino'}
                </label>
                <input
                  type="text"
                  value={editPaymentState.entityName}
                  onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, entityName: e.target.value }) : null)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={editPaymentState.dueDate}
                    onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, dueDate: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Status de Quitação
                  </label>
                  <select
                    value={editPaymentState.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as PaymentStatus;
                      setEditPaymentState(prev => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          status: newStatus,
                          // Set payment date if paid and not present, clear if not paid
                          paymentDate: newStatus === 'PAID' ? (prev.paymentDate || '2026-06-10') : undefined
                        };
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="PENDING">PENDENTE</option>
                    <option value="PAID">PAGO / LIQUIDADO</option>
                    <option value="OVERDUE">EM ATRASO</option>
                    <option value="CANCELLED">CANCELADO</option>
                  </select>
                </div>
              </div>

              {editPaymentState.status === 'PAID' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Data da Quitação Bancária
                  </label>
                  <input
                    type="date"
                    value={editPaymentState.paymentDate || '2026-06-10'}
                    onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, paymentDate: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Anotações complementares
                </label>
                <textarea
                  value={editPaymentState.notes || ''}
                  onChange={(e) => setEditPaymentState(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditPaymentState(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Salvar Mudanças
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK CONFIRM DRAW DIALOG */}
      {isConfirmModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-blue-150 max-w-md w-full overflow-hidden">
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-white" /> Baixar Título Financeiro
              </h3>
              <button 
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setSelectedPayment(null);
                }}
                className="p-1 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Confirmando Liquidação do Título</span>
                <span className="text-base font-extrabold text-slate-900 block mt-1">{selectedPayment.description}</span>
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                  <span>Valor Líquido:</span>
                  <span className={`font-extrabold text-sm ${selectedPayment.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                  <span>Devedor / Credor:</span>
                  <span className="font-medium text-slate-700">{selectedPayment.entityName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Data Efetiva de Compensação / Recebimento: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={quickPaymentDate}
                  onChange={(e) => setQuickPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white font-bold text-slate-800"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Insira a data em que o dinheiro entrou/saiu do caixa bancário correspondente.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setSelectedPayment(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Registrar Quitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {paymentToDelete && (
        <DeleteConfirmationDialog
          domId="delete-payment-dialog"
          icon={<Trash2 className="w-6 h-6 animate-pulse" />}
          title="Excluir Lançamento"
          message={<>Tem certeza que gostaria de excluir o lançamento financeiro <strong className="text-slate-800 font-semibold">"{paymentToDelete.description}"</strong>? Esta ação removerá o registro definitivo do fluxo financeiro e não poderá ser desfeita.</>}
          confirmLabel="Confirmar Exclusão"
          onCancel={() => setPaymentToDelete(null)}
          onConfirm={() => {
            onDeletePayment(paymentToDelete.id);
            setPaymentToDelete(null);
          }}
        />
      )}
      {/* CASH MOVEMENT MODAL (SANGRIA / REFORÇO) */}
      {isMovementModalOpen && activeRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-blue-150 max-w-md w-full overflow-hidden">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-white" /> Lançar Movimentação de Caixa
              </h3>
              <button 
                onClick={() => { setIsMovementModalOpen(false); setMovementAmount(''); setMovementDesc(''); }} 
                className="p-1 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Movimentação *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMovementReason('IN')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-all text-center cursor-pointer ${movementReason === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Reforço (+ Entrada)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementReason('OUT')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-all text-center cursor-pointer ${movementReason === 'OUT' ? 'bg-rose-50 text-rose-750 border-rose-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Sangria (- Saída)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição / Observação</label>
                <input
                  type="text"
                  placeholder="Ex: Retirada para pagamento de lanche, Troco extra..."
                  value={movementDesc}
                  onChange={(e) => setMovementDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsMovementModalOpen(false); setMovementAmount(''); setMovementDesc(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-655 hover:bg-slate-50 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE CASH REGISTER MODAL */}
      {isCloseModalOpen && activeRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-blue-150 max-w-md w-full overflow-hidden">
            <div className="bg-rose-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-white" /> Fechar Caixa Diário
              </h3>
              <button 
                onClick={() => { setIsCloseModalOpen(false); setClosingBalanceInput(''); }} 
                className="p-1 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseRegister} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Saldo em Dinheiro Esperado:</span>
                  <span className="font-extrabold text-blue-900 font-mono">{formatCurrency(activeRegisterExpected)}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">Este valor é calculado somando o troco inicial de abertura com reforços, subtraindo sangrias e somando todas as vendas recebidas em **Dinheiro** nesta sessão.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Contado Fisicamente (na gaveta) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={closingBalanceInput}
                    onChange={(e) => setClosingBalanceInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white font-bold text-slate-800"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Conte com atenção todo o dinheiro em espécie presente no caixa físico da loja.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCloseModalOpen(false); setClosingBalanceInput(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-655 hover:bg-slate-50 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Confirmar e Fechar Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
