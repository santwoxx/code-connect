/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  FileText, 
  Search, 
  Filter, 
  Award, 
  User, 
  Clock, 
  Calendar,
  ShieldAlert,
  ArrowRight,
  Printer,
  Download
} from 'lucide-react';
import { Sale, Seller, Product, AuditLog, MonthlyGoal } from '../types';
import { fetchMonthlyGoals, saveMonthlyGoal, restoreDatabaseFromBackup } from '../db';
import { listAllBackups, BackupFile, MASTER_PASSWORD } from '../firebase';
import { formatCurrency } from '../utils/format';
import { OverviewTab } from './adminReports/OverviewTab';
import { SellerPerformanceTab } from './adminReports/SellerPerformanceTab';
import { GoalsTab } from './adminReports/GoalsTab';
import { AuditLogTab } from './adminReports/AuditLogTab';
import { BackupsTab } from './adminReports/BackupsTab';
import { SalesHistoryTab } from './adminReports/SalesHistoryTab';

interface AdminReportsViewProps {
  sales: Sale[];
  sellers: Seller[];
  products: Product[];
  auditLogs: AuditLog[];
  onPrintSale?: (sale: Sale) => void;
  onPrintReport?: (title: string, subtitle: string, sales: Sale[]) => void;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  sales,
  sellers,
  products,
  auditLogs,
  onPrintSale,
  onPrintReport
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'visao-geral' | 'vendedores' | 'vendas' | 'auditoria' | 'metas' | 'backups'>('visao-geral');
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes' | 'tudo' | 'personalizado'>('mes');
  const [startDate, setStartDate] = useState('');

  // Backup-related state
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');
  const [endDate, setEndDate] = useState('');

  // Individual Seller history filter in "Vendedores" tab
  const [selectedSellerHistoryId, setSelectedSellerHistoryId] = useState<string>('all');

  // Consolidated Sales filters
  const [salesFilterProduct, setSalesFilterProduct] = useState('');
  const [salesFilterCustomer, setSalesFilterCustomer] = useState('');
  const [salesFilterSeller, setSalesFilterSeller] = useState('all');
  const [salesFilterStatus, setSalesFilterStatus] = useState('all');
  const [salesFilterPaymentMethod, setSalesFilterPaymentMethod] = useState('all');

  // Audit Logs filters
  const [auditFilterUser, setAuditFilterUser] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');

  // --- GOALS STATE ---
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalDrafts, setGoalDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMonthlyGoals().then(data => {
      setGoals(data);
      setGoalsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeSubTab === 'backups') {
      setLoadingBackups(true);
      listAllBackups().then(res => {
        setBackups(res);
        setLoadingBackups(false);
      });
    }
  }, [activeSubTab]);

  const handleRestoreBackup = async (backup: BackupFile) => {
    const confirmRestore = window.confirm(`ATENÇÃO: Você tem certeza que deseja restaurar o banco de dados para a versão de ${new Date(backup.timeCreated).toLocaleDateString('pt-BR')}? Todos os dados atuais do sistema serão substituídos!`);
    if (!confirmRestore) return;

    const pin = window.prompt("Digite a Senha Master do sistema para confirmar a restauração:");
    if (!pin) return;
    if (pin !== MASTER_PASSWORD) {
      alert("Senha Master incorreta! Operação cancelada.");
      return;
    }

    setRestoring(true);
    setRestoreMessage("Baixando arquivo de backup...");
    try {
      const response = await fetch(backup.url);
      const backupJson = await response.json();
      
      setRestoreMessage("Limpando banco de dados e aplicando restauração...");
      const result = await restoreDatabaseFromBackup(backupJson.data);
      
      if (result.success) {
        alert("Restauração concluída com sucesso! Recarregando a página...");
        window.location.reload();
      } else {
        alert(`Erro na restauração: ${result.message}`);
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao baixar ou processar o arquivo de backup.");
    } finally {
      setRestoring(false);
      setRestoreMessage("");
    }
  };

  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, []);

  const currentMonthSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status === 'CANCELLED') return false;
      const saleMonth = s.createdAt.slice(0, 7);
      return saleMonth === currentMonth;
    });
  }, [sales, currentMonth]);

  const teamMonthlyRevenue = useMemo(() => {
    return currentMonthSales.reduce((acc, s) => acc + s.value, 0);
  }, [currentMonthSales]);

  const sellerMonthlyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthSales.forEach(s => {
      map[s.sellerId] = (map[s.sellerId] || 0) + s.value;
    });
    return map;
  }, [currentMonthSales]);

  const teamGoal = useMemo(() => {
    return goals.find(g => g.type === 'TEAM' && g.month === currentMonth);
  }, [goals, currentMonth]);

  const getSellerGoal = useCallback((sellerId: string) => {
    return goals.find(g => g.type === 'INDIVIDUAL' && g.sellerId === sellerId && g.month === currentMonth);
  }, [goals, currentMonth]);

  const handleSaveGoal = async (id: string, sellerId: string | undefined, type: 'TEAM' | 'INDIVIDUAL', sellerName?: string) => {
    const raw = goalDrafts[id];
    const value = parseFloat(raw);
    if (isNaN(value) || value < 0) return;

    const existing = goals.find(g => g.id === id);
    const now = new Date().toISOString();
    const goal: MonthlyGoal = {
      id,
      sellerId,
      sellerName,
      type,
      month: currentMonth,
      value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveMonthlyGoal(goal);
    setGoals(prev => {
      const filtered = prev.filter(g => g.id !== id);
      return [...filtered, goal];
    });
  };

  const getGoalDraft = (id: string, existingValue?: number) => {
    if (goalDrafts[id] !== undefined) return goalDrafts[id];
    return existingValue !== undefined ? String(existingValue) : '';
  };

  // 1. Filter sales based on selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    let startLimit = new Date();

    if (period === 'hoje') {
      startLimit.setHours(0, 0, 0, 0);
    } else if (period === 'semana') {
      startLimit.setDate(now.getDate() - 7);
    } else if (period === 'mes') {
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'tudo') {
      return sales;
    } else if (period === 'personalizado') {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      return sales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= start && saleDate <= end;
      });
    }

    return sales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= startLimit;
    });
  }, [sales, period, startDate, endDate]);

  // 2. Growth calculation comparing current period vs previous period of same duration
  const growthStats = useMemo(() => {
    const completedCurrent = filteredSales.filter(s => s.status !== 'CANCELLED');
    const revenueCurrent = completedCurrent.reduce((acc, curr) => acc + curr.value, 0);

    // Get duration of current period in ms
    const now = new Date();
    let durationMs = 0;
    let startLimit = new Date();

    if (period === 'hoje') {
      startLimit.setHours(0, 0, 0, 0);
      durationMs = now.getTime() - startLimit.getTime();
    } else if (period === 'semana') {
      startLimit.setDate(now.getDate() - 7);
      durationMs = 7 * 24 * 60 * 60 * 1000;
    } else if (period === 'mes') {
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1);
      durationMs = now.getTime() - startLimit.getTime();
    } else if (period === 'personalizado') {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      durationMs = end.getTime() - start.getTime();
      startLimit = start;
    } else {
      // 'tudo' - no sensible previous period
      return { growthPercent: null, previousRevenue: 0 };
    }

    const prevStart = new Date(startLimit.getTime() - durationMs);
    const prevEnd = new Date(startLimit.getTime());

    const prevSales = sales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return s.status !== 'CANCELLED' && saleDate >= prevStart && saleDate < prevEnd;
    });

    const revenuePrev = prevSales.reduce((acc, curr) => acc + curr.value, 0);

    if (revenuePrev === 0) {
      return { growthPercent: revenueCurrent > 0 ? 100 : 0, previousRevenue: 0 };
    }

    const growthPercent = ((revenueCurrent - revenuePrev) / revenuePrev) * 100;
    return { growthPercent, previousRevenue: revenuePrev };
  }, [sales, filteredSales, period, startDate, endDate]);

  // 3. Consolidated KPI metrics calculations
  const summaryMetrics = useMemo(() => {
    const completed = filteredSales.filter(s => s.status !== 'CANCELLED');
    const faturados = filteredSales.filter(s => s.status === 'COMPLETED');
    const totalRevenue = completed.reduce((acc, curr) => acc + curr.value, 0);
    const totalSalesCount = completed.length;
    const uniqueClients = new Set(completed.map(s => s.clientPhone || s.clientName)).size;
    const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
    const totalCommissions = faturados.reduce((acc, curr) => acc + (curr.commissionValue || 0), 0);

    return {
      totalRevenue,
      totalSalesCount,
      uniqueClients,
      avgTicket,
      totalCommissions
    };
  }, [filteredSales]);

  // 4. Products Analysis Metrics
  const productAnalysis = useMemo(() => {
    const prodMap: Record<string, { sku: string; name: string; category: string; qty: number; value: number }> = {};
    
    filteredSales.forEach(s => {
      if (s.status === 'CANCELLED') return;
      if (!prodMap[s.productId]) {
        prodMap[s.productId] = {
          sku: s.productSku,
          name: s.productName,
          category: s.productCategory,
          qty: 0,
          value: 0
        };
      }
      prodMap[s.productId].qty += 1;
      prodMap[s.productId].value += s.value;
    });

    const rankList = Object.values(prodMap).sort((a, b) => b.qty - a.qty);
    const topProducts = rankList.slice(0, 5);
    const leastProducts = [...rankList].reverse().slice(0, 5);

    return {
      allRanked: rankList,
      topProducts,
      leastProducts
    };
  }, [filteredSales]);

  // 5. Seller Performance Rankings
  const sellerPerformance = useMemo(() => {
    const perfMap: Record<string, { id: string; name: string; username: string; active: boolean; qty: number; value: number; commissions: number }> = {};
    
    // Initialize list with all known sellers to show 0 activity ones
    sellers.forEach(s => {
      perfMap[s.id] = {
        id: s.id,
        name: s.name,
        username: s.username,
        active: s.active,
        qty: 0,
        value: 0,
        commissions: 0
      };
    });

    filteredSales.forEach(s => {
      if (s.status === 'CANCELLED') return;
      
      // If seller is not inwhitelisted list (e.g. deleted seller or legacy data), create temp block
      if (!perfMap[s.sellerId]) {
        perfMap[s.sellerId] = {
          id: s.sellerId,
          name: s.sellerName,
          username: 'Desativado',
          active: false,
          qty: 0,
          value: 0,
          commissions: 0
        };
      }
      perfMap[s.sellerId].qty += 1;
      perfMap[s.sellerId].value += s.value;
      if (s.status === 'COMPLETED') {
        perfMap[s.sellerId].commissions += s.commissionValue || 0;
      }
    });

    return Object.values(perfMap).sort((a, b) => b.value - a.value);
  }, [filteredSales, sellers]);

  // 6. Selected Seller History list in Vendedores sub-tab
  const selectedSellerHistory = useMemo(() => {
    if (selectedSellerHistoryId === 'all') return filteredSales;
    return filteredSales.filter(s => s.sellerId === selectedSellerHistoryId);
  }, [filteredSales, selectedSellerHistoryId]);

  // 7. General Consolidated Sales filter
  const searchedSales = useMemo(() => {
    return filteredSales.filter(s => {
      const matchProduct = !salesFilterProduct.trim() || s.productName.toLowerCase().includes(salesFilterProduct.toLowerCase()) || s.productSku.toLowerCase().includes(salesFilterProduct.toLowerCase());
      const matchCustomer = !salesFilterCustomer.trim() || s.clientName.toLowerCase().includes(salesFilterCustomer.toLowerCase()) || s.clientPhone.includes(salesFilterCustomer);
      const matchSeller = salesFilterSeller === 'all' || s.sellerId === salesFilterSeller;
      const matchStatus = salesFilterStatus === 'all' || s.status === salesFilterStatus;
      const matchPaymentMethod = salesFilterPaymentMethod === 'all' || s.paymentMethod === salesFilterPaymentMethod;

      return matchProduct && matchCustomer && matchSeller && matchStatus && matchPaymentMethod;
    });
  }, [filteredSales, salesFilterProduct, salesFilterCustomer, salesFilterSeller, salesFilterStatus, salesFilterPaymentMethod]);

  // 8. System Audit logs filter
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchUser = !auditFilterUser.trim() || log.userEmail.toLowerCase().includes(auditFilterUser.toLowerCase()) || log.userId.includes(auditFilterUser);
      const matchAction = !auditFilterAction.trim() || log.action.toLowerCase().includes(auditFilterAction.toLowerCase()) || log.details.toLowerCase().includes(auditFilterAction.toLowerCase());
      return matchUser && matchAction;
    });
  }, [auditLogs, auditFilterUser, auditFilterAction]);

  // 9. Recharts formatted trend chart data
  const revenueChartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    filteredSales.forEach(s => {
      if (s.status === 'CANCELLED') return;
      const key = new Date(s.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dailyMap[key] = (dailyMap[key] || 0) + s.value;
    });

    const entries = Object.entries(dailyMap).map(([date, val]) => ({
      data: date,
      Faturamento: parseFloat(val.toFixed(2))
    }));

    if (entries.length === 0) return [{ data: 'Sem dados', Faturamento: 0 }];
    return entries.slice(-12);
  }, [filteredSales]);

  // Seller marketshare pie chart
  const sellerPieChartData = useMemo(() => {
    const activeData = sellerPerformance.filter(s => s.value > 0);
    return activeData.map(s => ({
      name: s.name,
      value: parseFloat(s.value.toFixed(2))
    }));
  }, [sellerPerformance]);

  const COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

  const handleExportSalesCsv = () => {
    const headers = ['ID Pedido', 'Data', 'Cliente', 'CPF', 'Telefone', 'Vendedor', 'Produto', 'Quantidade', 'Valor Unitário (R$)', 'Valor Total (R$)', 'Sistema/Destino', 'Forma Pagamento (Detalhes)', 'Necessita Montagem', 'Status'];
    const rows = filteredSales.map(s => {
      let sistema = '';
      if (s.status === 'PENDING') sistema = 'Orçamento (Pendente)';
      else if (s.paymentMethod === 'CENTRAL') sistema = 'Orçamento (Faturado)';
      else if (s.paymentMethod === 'ALTERDATA') sistema = 'Fechamento';
      else sistema = 'Não Especificado';

      let formaPgto = '';
      if (s.paymentMethod === 'ALTERDATA' || s.paymentMethod === 'CENTRAL') {
        if (s.notes && s.notes.includes('Pagamento:')) {
          const match = s.notes.match(/Pagamento:\s*(.*)/);
          formaPgto = match ? match[1] : 'Não Informada';
        } else {
          formaPgto = 'Não Informada';
        }
      } else {
        formaPgto = s.paymentMethod || 'Não Informada';
      }

      return [
        s.id,
        new Date(s.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        s.clientName,
        s.clientCpf || '',
        s.clientPhone || '',
        s.sellerName || '',
        s.productName,
        '1',
        s.value.toFixed(2),
        s.value.toFixed(2),
        sistema,
        formaPgto,
        s.needsAssembly ? 'Sim' : 'Não',
        s.status === 'COMPLETED' ? 'Faturado' : s.status === 'PENDING' ? 'Pendente' : 'Cancelado'
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_centralsync_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      
      {/* Header and Period Panel */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Central de Relatórios Administrativos
          </h1>
          <p className="text-xs text-slate-500">
            Análises gerenciais de faturamento, desempenho de vendedores, ranking de produtos e auditoria geral.
          </p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button
            onClick={handleExportSalesCsv}
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          {['hoje', 'semana', 'mes', 'tudo', 'personalizado'].map((opt) => (
            <button
              key={opt}
              onClick={() => setPeriod(opt as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide cursor-pointer ${
                period === opt
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {opt === 'mes' ? 'Este Mês' : opt === 'semana' ? 'Esta Semana' : opt === 'hoje' ? 'Hoje' : opt === 'tudo' ? 'Todo o Histórico' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      {/* Date Pickers for Custom Period */}
      {period === 'personalizado' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-end gap-4 animate-fade-in shadow-xs">
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Data Inicial</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Data Final</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <span className="text-xs text-slate-400 pb-2">
            * Filtros de data serão aplicados nas abas Visão Geral, Vendedores e Vendas.
          </span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 font-sans gap-2 flex-wrap">
        {[
          { id: 'visao-geral', name: 'Visão Geral & Produtos' },
          { id: 'vendedores', name: 'Desempenho de Vendedores' },
          { id: 'metas', name: 'Quadro de Metas' },
          { id: 'vendas', name: 'Histórico Global de Vendas' },
          { id: 'auditoria', name: 'Registros de Auditoria' },
          { id: 'backups', name: 'Backups & Restauração' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`pb-3 pt-1 px-4 text-xs font-bold transition-all border-b-2 uppercase tracking-wider cursor-pointer ${
              activeSubTab === tab.id
                ? 'border-blue-600 text-blue-600 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* TAB 1: VISÃO GERAL & PRODUTOS */}
      {activeSubTab === 'visao-geral' && (
        <OverviewTab
          summaryMetrics={summaryMetrics}
          growthStats={growthStats}
          revenueChartData={revenueChartData}
          sellerPieChartData={sellerPieChartData}
          productAnalysis={productAnalysis}
        />
      )}

      {/* TAB 2: PERFORMANCE DE VENDEDORES */}
      {activeSubTab === 'vendedores' && (
        <SellerPerformanceTab
          sellerPerformance={sellerPerformance}
          sellers={sellers}
          selectedSellerHistoryId={selectedSellerHistoryId}
          onChangeSelectedSellerHistoryId={setSelectedSellerHistoryId}
          selectedSellerHistory={selectedSellerHistory}
        />
      )}

      {/* TAB 3: QUADRO DE METAS */}
      {activeSubTab === 'metas' && (
        <GoalsTab
          currentMonth={currentMonth}
          currentMonthName={currentMonthName}
          goalsLoading={goalsLoading}
          teamGoal={teamGoal}
          teamMonthlyRevenue={teamMonthlyRevenue}
          sellers={sellers}
          sellerMonthlyRevenue={sellerMonthlyRevenue}
          getGoalDraft={getGoalDraft}
          getSellerGoal={getSellerGoal}
          onChangeGoalDraft={(id, value) => setGoalDrafts(prev => ({ ...prev, [id]: value }))}
          onSaveGoal={handleSaveGoal}
        />
      )}

      {/* TAB 4: HISTÓRICO GLOBAL DE VENDAS */}
      {activeSubTab === 'vendas' && (
        <SalesHistoryTab
          sellers={sellers}
          searchedSales={searchedSales}
          period={period}
          startDate={startDate}
          endDate={endDate}
          salesFilterProduct={salesFilterProduct}
          salesFilterCustomer={salesFilterCustomer}
          salesFilterSeller={salesFilterSeller}
          salesFilterStatus={salesFilterStatus}
          salesFilterPaymentMethod={salesFilterPaymentMethod}
          onChangeSalesFilterProduct={setSalesFilterProduct}
          onChangeSalesFilterCustomer={setSalesFilterCustomer}
          onChangeSalesFilterSeller={setSalesFilterSeller}
          onChangeSalesFilterStatus={setSalesFilterStatus}
          onChangeSalesFilterPaymentMethod={setSalesFilterPaymentMethod}
          onPrintReport={onPrintReport}
          onPrintSale={onPrintSale}
        />
      )}

      {/* TAB 4: AUDITORIA DO SISTEMA */}
      {activeSubTab === 'auditoria' && (
        <AuditLogTab
          filteredAuditLogs={filteredAuditLogs}
          auditFilterUser={auditFilterUser}
          auditFilterAction={auditFilterAction}
          onChangeAuditFilterUser={setAuditFilterUser}
          onChangeAuditFilterAction={setAuditFilterAction}
        />
      )}

      {/* TAB 5: BACKUPS & RESTAURAÇÃO */}
      {activeSubTab === 'backups' && (
        <BackupsTab
          loadingBackups={loadingBackups}
          backups={backups}
          restoring={restoring}
          restoreMessage={restoreMessage}
          onRestoreBackup={handleRestoreBackup}
        />
      )}
      
    </div>
  );
};
