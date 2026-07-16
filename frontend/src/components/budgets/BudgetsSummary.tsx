import React from 'react';
import { formatCurrency } from '../../utils/format';

interface BudgetsSummaryProps {
  summary: {
    orcamentoCount: number;
    orcamentoTotal: number;
    fechamentoCount: number;
    fechamentoTotal: number;
  };
}

export const BudgetsSummary: React.FC<BudgetsSummaryProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Orçamento</p>
        <p className="text-lg font-black text-amber-900">{formatCurrency(summary.orcamentoTotal)}</p>
        <p className="text-[10px] text-amber-600 font-semibold">{summary.orcamentoCount} pedido(s)</p>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Fechamento</p>
        <p className="text-lg font-black text-emerald-900">{formatCurrency(summary.fechamentoTotal)}</p>
        <p className="text-[10px] text-emerald-600 font-semibold">{summary.fechamentoCount} pedido(s)</p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Geral (Orçamento + Fechamento)</p>
        <p className="text-lg font-black text-slate-900">{formatCurrency(summary.orcamentoTotal + summary.fechamentoTotal)}</p>
        <p className="text-[10px] text-slate-500 font-semibold">{summary.orcamentoCount + summary.fechamentoCount} pedido(s)</p>
      </div>
    </div>
  );
};
