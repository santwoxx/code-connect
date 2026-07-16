import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface SummaryTabProps {
  dashboardStats: {
    totalSalesCount: number;
    totalBilling: number;
    totalCost: number;
    profit: number;
    marginPercent: number;
    profitMarginPercent: number;
  };
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ dashboardStats }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Vendas Faturadas</span>
          <span className="text-lg font-black text-slate-800 font-mono block mt-1">{dashboardStats.totalSalesCount}</span>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Total de pedidos faturados</span>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold block">Faturamento Total</span>
          <span className="text-lg font-black text-blue-900 font-mono block mt-1">{formatCurrency(dashboardStats.totalBilling)}</span>
          <span className="text-[10px] text-blue-500 font-medium block mt-0.5">Soma dos valores faturados</span>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
          <span className="text-[10px] uppercase tracking-wider text-rose-600 font-bold block">Custo de Produtos</span>
          <span className="text-lg font-black text-rose-900 font-mono block mt-1">{formatCurrency(dashboardStats.totalCost)}</span>
          <span className="text-[10px] text-rose-500 font-medium block mt-0.5">Custo estimado do estoque</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold block">Previsão de Lucro</span>
          <span className="text-lg font-black text-emerald-900 font-mono block mt-1">{formatCurrency(dashboardStats.profit)}</span>
          <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">Faturamento menos custo</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <span className="text-[10px] uppercase tracking-wider text-purple-600 font-bold block">Markup Aplicado</span>
          <span className="text-lg font-black text-purple-900 font-mono block mt-1">{dashboardStats.marginPercent.toFixed(1)}%</span>
          <span className="text-[10px] text-purple-500 font-medium block mt-0.5">Percentual sobre o custo</span>
        </div>
      </div>

      <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-indigo-950">Previsão de Margem e Rentabilidade Comercial</h4>
          <p className="text-indigo-900/80 leading-relaxed">
            A margem de lucro operacional sobre o faturamento é de <strong>{dashboardStats.profitMarginPercent.toFixed(1)}%</strong>. 
            Isso significa que a cada R$ 100,00 faturados, R$ {dashboardStats.profitMarginPercent.toFixed(2)} representam lucro bruto após a baixa do estoque a preço de custo.
          </p>
        </div>
      </div>
    </div>
  );
};
