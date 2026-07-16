/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Briefcase
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Product, Payment, StockTransaction } from '../types';
import { formatCurrency } from '../utils/format';

interface DashboardViewProps {
  products: Product[];
  payments: Payment[];
  transactions: StockTransaction[];
  onNavigate: (tab: string) => void;
  onQuickStockUpdate: (productId: string, delta: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  payments,
  transactions,
  onNavigate,
  onQuickStockUpdate
}) => {
  // 1. Calculate values
  const totalProducts = products.length;
  
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.currentStock <= p.minStock);
  }, [products]);

  const inventoryFinances = useMemo(() => {
    let cost = 0;
    let value = 0;
    products.forEach(p => {
      cost += p.costPrice * p.currentStock;
      value += p.price * p.currentStock;
    });
    return { cost, value, potentialProfit: value - cost };
  }, [products]);

  const financials = useMemo(() => {
    let toReceive = 0;
    let received = 0;
    let toPay = 0;
    let paid = 0;
    let overduePay = 0;
    let overdueRec = 0;

    payments.forEach(p => {
      const amount = p.amount;
      if (p.type === 'INCOME') {
        if (p.status === 'PAID') {
          received += amount;
        } else if (p.status === 'PENDING') {
          toReceive += amount;
        } else if (p.status === 'OVERDUE') {
          toReceive += amount;
          overdueRec += amount;
        }
      } else {
        if (p.status === 'PAID') {
          paid += amount;
        } else if (p.status === 'PENDING') {
          toPay += amount;
        } else if (p.status === 'OVERDUE') {
          toPay += amount;
          overduePay += amount;
        }
      }
    });

    return { 
      toReceive, 
      received, 
      toPay, 
      paid, 
      overduePay,
      overdueRec,
      projectedBalance: (received + toReceive) - (paid + toPay),
      realBalance: received - paid
    };
  }, [payments]);

  // 2. Format chart data (Financial Flow)
  const cashFlowChartData = useMemo(() => {
    // We group payments by status (Paid vs Pending) for both Income and Expenses
    return [
      {
        name: 'Receitas (Entradas)',
        Pago: parseFloat(financials.received.toFixed(2)),
        Pendente: parseFloat(financials.toReceive.toFixed(2)),
      },
      {
        name: 'Despesas (Saídas)',
        Pago: parseFloat(financials.paid.toFixed(2)),
        Pendente: parseFloat(financials.toPay.toFixed(2)),
      }
    ];
  }, [financials]);

  // Stock values by category data
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category || 'Outros';
      const val = p.currentStock * p.price;
      map[cat] = (map[cat] || 0) + val;
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  }, [products]);

  const COLORS = ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

  // Latest transactions limit to 5
  const latestTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight" id="dashboard-title">Visão Geral do Negócio</h1>
          <p className="text-sm text-slate-500">Controle integrado de estoque físico e pagamentos pendentes/liquidados.</p>
        </div>
        <div className="text-xs bg-slate-100 text-slate-700 font-mono px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Última atualização: Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
        {/* Card 1: Valor em Estoque */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ativo em Estoque</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-display text-slate-900">{formatCurrency(inventoryFinances.value)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Custo de aquisição:</span>
              <strong className="text-slate-700 font-medium">{formatCurrency(inventoryFinances.cost)}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Lucro potencial bruto</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/50">
              +{formatCurrency(inventoryFinances.potentialProfit)}
            </span>
          </div>
        </div>

        {/* Card 2: Contas a Receber */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">A Receber (Clientes)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-display text-slate-900">{formatCurrency(financials.toReceive)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Já recebido:</span>
              <strong className="text-emerald-700 font-medium">{formatCurrency(financials.received)}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Pendentes e vencendo</span>
            {financials.overdueRec > 0 ? (
              <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100/50">
                Atrasados: {formatCurrency(financials.overdueRec)}
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/50">Faturamento OK</span>
            )}
          </div>
        </div>

        {/* Card 3: Contas a Pagar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">A Pagar (Previsão)</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-display text-slate-900">{formatCurrency(financials.toPay)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Já liquidado:</span>
              <strong className="text-slate-600 font-medium">{formatCurrency(financials.paid)}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Status de débitos</span>
            {financials.overduePay > 0 ? (
              <span className="text-rose-700 font-semibold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100/50 animate-pulse">
                Atrasado: {formatCurrency(financials.overduePay)}
              </span>
            ) : (
              <span className="text-slate-700 font-semibold bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200/50">Nenhum atraso</span>
            )}
          </div>
        </div>

        {/* Card 4: Alertas de Estoque Mínimo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Atenção ao Estoque</span>
            <div className={`p-2 rounded-lg border ${lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-display text-slate-900">{lowStockProducts.length}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {lowStockProducts.length > 0 
                ? `${lowStockProducts.length} itens abaixo ou iguais ao limite mínimo.`
                : 'Todos os produtos estão regulados.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Total de SKU distintos</span>
            <span className="font-semibold text-slate-700">
              {totalProducts} itens
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
        {/* Cash Flow Main Chart (Col-span 2) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">Fluxo de Caixa Operacional</h3>
              <p className="text-xs text-slate-400">Distribuição financeira entre valores recebidos, a receber, despesas pagas e pendentes.</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Saldo Projetado</span>
              <span className={`text-sm font-bold ${financials.projectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(financials.projectedBalance)}
              </span>
            </div>
          </div>
          <div className="h-72 w-full" id="cash-flow-chart-container">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={cashFlowChartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Pago" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Pago / Liquidado" />
                <Bar dataKey="Pendente" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Pendente / Vencendo" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-slate-900">Estoque por Categoria (Venda)</h3>
            <p className="text-xs text-slate-400 mb-4">Proporção do valor financeiro de estoque ativo calculado por categoria.</p>
          </div>
          
          {categoryChartData.length > 0 ? (
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), '']} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Balance */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</span>
                  <span className="text-sm font-extrabold text-slate-900 text-center leading-tight font-display">
                    {formatCurrency(inventoryFinances.value)}
                  </span>
                </div>
              </div>
              
              {/* Custom Legend */}
              <div className="grid grid-cols-2 gap-2 w-full mt-2 text-xs">
                {categoryChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 min-w-0" title={`${entry.name}: ${formatCurrency(entry.value)}`}>
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="truncate text-slate-600 block">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
              <Package className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs">Nenhum produto cadastrado para gerar estatísticas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Critical Stock & Recent History Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="critical-panels">
        {/* Critical Low Stock Alerter */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Estoque Crítico (Abaixo do Mínimo)
              </h3>
              <p className="text-xs text-slate-400">Produtos necessitando de reabastecimento urgente para evitar quebra de estoque.</p>
            </div>
            <button
              onClick={() => onNavigate('estoque')}
              className="text-xs font-semibold text-slate-650 hover:text-slate-800 transition-colors shrink-0"
              id="btn-goto-stock"
            >
              Ver todos ({products.length})
            </button>
          </div>

          <div className="flex-1 overflow-auto max-h-[300px] border border-slate-100 rounded-xl">
            {lowStockProducts.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200/60">
                    <th className="p-3">Item / SKU</th>
                    <th className="p-3 text-center">Atual</th>
                    <th className="p-3 text-center">Mínimo</th>
                    <th className="p-3 text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 break-words max-w-[200px]">{product.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{product.sku}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-100 font-mono">
                          {product.currentStock} un
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono font-medium">
                        {product.minStock} un
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => onQuickStockUpdate(product.id, 1)}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-bold transition-all text-xs"
                            title="Entrada rápida de +1 unidade"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => onQuickStockUpdate(product.id, 5)}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-bold transition-all text-xs"
                            title="Entrada rápida de +5 unidades (Lote)"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-slate-800 font-medium text-sm">Tudo em conformidade!</p>
                <p className="text-xs text-slate-400 mt-0.5">Nenhum produto está abaixo do estoque mínimo estabelecido.</p>
              </div>
            )}
          </div>
        </div>

        {/* Latest Stock Transactions Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                Últimas Movimentações de Estoque
              </h3>
              <p className="text-xs text-slate-400">Últimos registros de entradas, vendas e baixas efetuados no almoxarifado.</p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Lançamentos</span>
          </div>

          <div className="flex-1 space-y-3 overflow-auto max-h-[300px] pr-1">
            {latestTransactions.length > 0 ? (
              latestTransactions.map((tx) => {
                const isIncoming = tx.type === 'IN';
                return (
                  <div key={tx.id} className="flex gap-3 p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-all border border-slate-150/50 items-start">
                    <div className={`p-2 rounded-full mt-0.5 ${isIncoming ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-amber-50 text-amber-600 border border-amber-100/50'}`}>
                      {isIncoming ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-bold text-slate-800 truncate" title={tx.productName}>
                          {tx.productName}
                        </p>
                        <span className={`text-[11px] font-extrabold whitespace-nowrap font-mono ${isIncoming ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isIncoming ? '+' : '-'}{tx.quantity} un
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="font-semibold bg-white border border-slate-200 rounded px-1 text-slate-500 font-mono">
                          {tx.reason}
                        </span>
                        <span>•</span>
                        <span>{new Date(tx.date).toLocaleDateString('pt-BR')} às {new Date(tx.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                      {tx.description && (
                        <p className="text-[11px] text-slate-500 italic mt-1 leading-normal border-l-2 border-slate-200 pl-1.5">
                          "{tx.description}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 h-full">
                <p className="text-slate-800 font-medium text-sm">Sem movimentações</p>
                <p className="text-xs text-slate-400 mt-0.5">As alterações automáticas ou de inventário aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
