/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Users, 
  Calendar, 
  Search, 
  Clock, 
  MessageSquare,
  Sparkles,
  Award,
  Printer
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Sale, Seller, Product, MonthlyGoal } from '../types';
import { fetchMonthlyGoals } from '../db';
import { formatCurrency } from '../utils/format';

interface SellerDashboardViewProps {
  currentSeller: Seller;
  sales: Sale[];
  products: Product[];
  onPrintSale?: (sale: Sale) => void;
}

export const SellerDashboardView: React.FC<SellerDashboardViewProps> = ({
  currentSeller,
  sales,
  products,
  onPrintSale
}) => {
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes' | 'personalizado'>('mes');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- INDIVIDUAL GOAL ---
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    fetchMonthlyGoals().then(setGoals);
  }, []);

  const myGoal = useMemo(() => {
    return goals.find(g => g.type === 'INDIVIDUAL' && g.sellerId === currentSeller.id && g.month === currentMonth);
  }, [goals, currentSeller.id, currentMonth]);

  // 1. Filter sales of the current logged-in seller
  const sellerSales = useMemo(() => {
    return sales.filter(s => s.sellerId === currentSeller.id);
  }, [sales, currentSeller.id]);

  const myMonthlyRevenue = useMemo(() => {
    return sellerSales
      .filter(s => s.status !== 'CANCELLED' && s.createdAt.slice(0, 7) === currentMonth)
      .reduce((acc, s) => acc + s.value, 0);
  }, [sellerSales, currentMonth]);

  // 2. Filter seller sales based on selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    let startLimit = new Date();

    if (period === 'hoje') {
      startLimit.setHours(0, 0, 0, 0);
    } else if (period === 'semana') {
      // Last 7 days
      startLimit.setDate(now.getDate() - 7);
    } else if (period === 'mes') {
      // First day of current month
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'personalizado') {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      // Set hours for inclusive comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      return sellerSales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= start && saleDate <= end;
      });
    }

    return sellerSales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= startLimit;
    });
  }, [sellerSales, period, startDate, endDate]);

  // 3. Search filter inside selected sales list
  const searchedSales = useMemo(() => {
    if (!searchTerm.trim()) return filteredSales;
    const term = searchTerm.toLowerCase();
    return filteredSales.filter(s => 
      s.clientName.toLowerCase().includes(term) ||
      s.productName.toLowerCase().includes(term) ||
      (s.clientPhone && s.clientPhone.includes(term))
    );
  }, [filteredSales, searchTerm]);

  // 4. Calculate key performance indicators
  const stats = useMemo(() => {
    const completedSales = filteredSales.filter(s => s.status !== 'CANCELLED');
    const invoicedSales = filteredSales.filter(s => s.status === 'COMPLETED');
    const totalRevenue = completedSales.reduce((acc, curr) => acc + curr.value, 0);
    const totalSales = completedSales.length;
    const totalProducts = totalSales; // 1 sale = 1 product SKU sold
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Future commission totals
    const totalCommission = invoicedSales.reduce((acc, curr) => acc + (curr.commissionValue || 0), 0);

    return {
      totalRevenue,
      totalSales,
      totalProducts,
      avgTicket,
      totalCommission
    };
  }, [filteredSales]);

  // 5. Build personal product ranking list
  const productRanking = useMemo(() => {
    const rankMap: Record<string, { name: string; qty: number; value: number; img?: string }> = {};
    
    filteredSales.forEach(s => {
      if (s.status === 'CANCELLED') return;
      if (!rankMap[s.productId]) {
        rankMap[s.productId] = { name: s.productName, qty: 0, value: 0, img: s.productImageUrl };
      }
      rankMap[s.productId].qty += 1;
      rankMap[s.productId].value += s.value;
    });

    return Object.values(rankMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // top 5
  }, [filteredSales]);

  // 6. Generate Chart Data (Evolution of Revenue per day)
  const chartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    
    // Fill last 10 dates or sorted list of dates with sales
    filteredSales.forEach(s => {
      if (s.status === 'CANCELLED') return;
      const dateStr = new Date(s.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + s.value;
    });

    const entries = Object.entries(dailyMap).map(([date, val]) => ({
      data: date,
      Faturamento: parseFloat(val.toFixed(2))
    }));

    if (entries.length === 0) {
      return [{ data: 'Sem Vendas', Faturamento: 0 }];
    }

    // Sort by date key (simulate chronologic sorting)
    return entries.slice(-10); // last 10 days
  }, [filteredSales]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Concluída</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Pendente</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Cancelada</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  const getCommissionBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/40">Paga</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/40">A Receber</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-150 text-slate-500 border border-slate-350">Sem Comiss.</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-950 p-6 rounded-2xl border border-blue-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[30%] h-full bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Award className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Painel Exclusivo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">
              Boas-vindas, {currentSeller.name}!
            </h1>
            <p className="text-xs text-slate-400">
              Acompanhe suas vendas, comissões acumuladas e metas individuais.
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          {['hoje', 'semana', 'mes', 'personalizado'].map((opt) => (
            <button
              key={opt}
              onClick={() => setPeriod(opt as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide cursor-pointer ${
                period === opt
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {opt === 'mes' ? 'Este Mês' : opt === 'semana' ? 'Esta Semana' : opt === 'hoje' ? 'Hoje' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      {/* Date picker inputs if Period is Custom */}
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
            * Período selecionado afeta todas as estatísticas abaixo.
          </span>
        </div>
      )}

      {/* Stats Indicator Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturamento */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meu Faturamento</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.totalRevenue)}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Volume financeiro de vendas convertidas no período.
            </p>
          </div>
        </div>

        {/* KPI 2: Total de Vendas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantidade de Vendas</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalSales}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Total de produtos vendidos: <span className="font-semibold text-slate-700">{stats.totalProducts} itens</span>.
            </p>
          </div>
        </div>

        {/* KPI 3: Ticket Médio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.avgTicket)}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Valor médio de vendas por pedido faturado.
            </p>
          </div>
        </div>

        {/* KPI 4: Comissões Acumuladas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comissão Acumulada</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-purple-700 tracking-tight">{formatCurrency(stats.totalCommission)}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Estrutura de comissão prevista para liquidação futura.
            </p>
          </div>
        </div>
      </div>

      {/* Goal Progress Card */}
      {myGoal && myGoal.value > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">Minha Meta Individual</span>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(myMonthlyRevenue)}</h3>
                <span className="text-sm font-bold text-blue-600">de {formatCurrency(myGoal.value)}</span>
              </div>
              <div className="w-full bg-white/80 rounded-full h-4 overflow-hidden border border-blue-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    myMonthlyRevenue >= myGoal.value ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (myMonthlyRevenue / myGoal.value) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold mt-1.5">
                <span className="text-slate-500">Progresso</span>
                <span className={myMonthlyRevenue >= myGoal.value ? 'text-emerald-600' : 'text-blue-600'}>
                  {Math.min(100, ((myMonthlyRevenue / myGoal.value) * 100)).toFixed(1)}%
                </span>
              </div>
              {myMonthlyRevenue >= myGoal.value && (
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Parabéns! Você atingiu sua meta mensal!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Product Rankings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart (Col span 2) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Evolução do Faturamento</h3>
            <p className="text-xs text-slate-400 mb-4">Gráfico contendo evolução de vendas concluídas por data no período.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}
                />
                <Bar dataKey="Faturamento" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Ranking (Col span 1) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Meus Produtos Mais Vendidos</h3>
            <p className="text-xs text-slate-400 mb-4">Ranking pessoal de vendas convertidas no mostruário.</p>
          </div>
          
          <div className="flex-1 space-y-4">
            {productRanking.length > 0 ? (
              productRanking.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:scale-[1.01] transition-transform">
                  <span className="w-6 h-6 shrink-0 bg-blue-600/10 text-blue-700 border border-blue-500/10 rounded-full flex items-center justify-center font-bold text-xs font-mono">
                    {idx + 1}
                  </span>
                  {item.img ? (
                    <img src={item.img} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-200 border border-slate-350 flex items-center justify-center text-[10px] text-slate-400 font-bold">Móvel</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.qty} vendas • Total {formatCurrency(item.value)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-6">
                <ShoppingBag className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                <p className="text-xs">Nenhum produto vendido no período.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History table for Seller sales */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Meu Histórico de Vendas</h3>
            <p className="text-xs text-slate-400">Relação completa de pedidos do mostruário registrados sob o seu usuário.</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          {searchedSales.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                  <th className="p-3">Data</th>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Valor Venda</th>
                  <th className="p-3 text-center">Comissão</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {searchedSales.map((sale) => {
                  const saleDate = new Date(sale.createdAt);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-slate-500 font-mono">
                        {saleDate.toLocaleDateString('pt-BR')} <br />
                        <span className="text-[10px] text-slate-400">{saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{sale.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{sale.productSku}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{sale.clientName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{sale.clientPhone}</div>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(sale.value)}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {sale.status === 'COMPLETED' ? (
                          <>
                            <div className="font-bold text-purple-700">{formatCurrency(sale.commissionValue || 0)}</div>
                            <div className="mt-0.5">{getCommissionBadge(sale.commissionStatus)}</div>
                          </>
                        ) : (
                          <span className="text-slate-400 font-semibold">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(sale.status)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <a
                            href={`https://wa.me/${sale.clientPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>

                          {onPrintSale && (
                            <button
                              type="button"
                              onClick={() => onPrintSale(sale)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/50 text-[10px] font-bold transition-all cursor-pointer"
                              title="Imprimir Recibo"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-600" />
                              <span>Recibo</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-slate-800 font-medium text-sm">Nenhuma venda encontrada</p>
              <p className="text-xs text-slate-400 mt-0.5">Seus registros de venda do mostruário serão listados nesta tabela.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
