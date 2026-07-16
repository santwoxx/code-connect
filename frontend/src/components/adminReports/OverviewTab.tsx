import { DollarSign, TrendingUp, TrendingDown, ShoppingBag, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils/format';

const COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

interface OverviewTabProps {
  summaryMetrics: {
    totalRevenue: number;
    totalSalesCount: number;
    uniqueClients: number;
    totalCommissions: number;
    avgTicket: number;
  };
  growthStats: {
    growthPercent: number | null;
  };
  revenueChartData: Array<{ data: string; Faturamento: number }>;
  sellerPieChartData: Array<{ name: string; value: number }>;
  productAnalysis: {
    topProducts: Array<{ name: string; sku: string; category: string; qty: number; value: number }>;
    leastProducts: Array<{ name: string; sku: string; category: string; qty: number; value: number }>;
  };
}

export function OverviewTab({ summaryMetrics, growthStats, revenueChartData, sellerPieChartData, productAnalysis }: OverviewTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Geral */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faturamento Geral</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(summaryMetrics.totalRevenue)}</h3>
            {growthStats.growthPercent !== null && (
              <p className="text-[11px] mt-1.5 flex items-center gap-1">
                {growthStats.growthPercent >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    <TrendingUp className="w-3 h-3" />
                    +{growthStats.growthPercent.toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold">
                    <TrendingDown className="w-3 h-3" />
                    {growthStats.growthPercent.toFixed(1)}%
                  </span>
                )}
                <span className="text-slate-400">vs período anterior</span>
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Total Vendas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume de Vendas</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{summaryMetrics.totalSalesCount}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Total de transações concluídas no showroom.
            </p>
          </div>
        </div>

        {/* Card 3: Clientes Atendidos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Atendidos</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{summaryMetrics.uniqueClients}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Número de contatos/clientes únicos identificados.
            </p>
          </div>
        </div>

        {/* Card 4: Comissões Providas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comissão Devida</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-purple-700 tracking-tight">{formatCurrency(summaryMetrics.totalCommissions)}</h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Média por venda: {formatCurrency(summaryMetrics.avgTicket)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Desempenho Comercial Temporário</h3>
            <p className="text-xs text-slate-400 mb-4">Evolução do faturamento diário faturado no mostruário.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']} />
                <Bar dataKey="Faturamento" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Participação de Vendas</h3>
            <p className="text-xs text-slate-400 mb-4">Divisão de faturamento total bruto por vendedor ativo.</p>
          </div>

          {sellerPieChartData.length > 0 ? (
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="h-40 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={sellerPieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sellerPieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                  <span className="text-xs font-bold text-slate-950">{formatCurrency(summaryMetrics.totalRevenue)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full mt-2 text-[10px]">
                {sellerPieChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1 min-w-0" title={entry.name}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate text-slate-600 block">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
              <Users className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-[11px]">Nenhuma venda registrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Rankings (Top vs Least sold) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">Móveis Mais Vendidos</h3>
          <p className="text-xs text-slate-400 mb-4">Artigos com maior número de saídas convertidas no mostruário.</p>

          <div className="space-y-3">
            {productAnalysis.topProducts.length > 0 ? (
              productAnalysis.topProducts.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku} • {item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{item.qty} un</p>
                    <p className="text-[10px] text-slate-400">{formatCurrency(item.value)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum dado disponível.</p>
            )}
          </div>
        </div>

        {/* Least Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">Móveis com Menor Giro</h3>
          <p className="text-xs text-slate-400 mb-4">Artigos com menor quantidade de vendas faturadas no período.</p>

          <div className="space-y-3">
            {productAnalysis.leastProducts.length > 0 ? (
              productAnalysis.leastProducts.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku} • {item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{item.qty} un</p>
                    <p className="text-[10px] text-slate-400">{formatCurrency(item.value)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum dado disponível.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
