import React from 'react';

interface AuditMetricsCardsProps {
  auditMetrics: {
    totalCostValuation: number;
    totalRetailValuation: number;
    totalItemsStocked: number;
    totalItemsWithProfitSum: number;
    averageMarginPercent: number;
  };
}

export const AuditMetricsCards: React.FC<AuditMetricsCardsProps> = ({ auditMetrics }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Custo Logístico de Aquisição</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-1 font-display">{formatCurrency(auditMetrics.totalCostValuation)}</span>
          <p className="text-[10.5px] text-slate-400 mt-2">Capital de investimento líquido preso em estoque físico.</p>
        </div>

        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Valor de Revenda Estimado</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-1 font-display">{formatCurrency(auditMetrics.totalRetailValuation)}</span>
          <p className="text-[10.5px] text-slate-400 mt-2">Faturamento operacional esperado de caixa após liquidações.</p>
        </div>
      </div>

      <div className="mt-5 p-4 border border-slate-100 rounded-xl bg-slate-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Unidades Estocadas</span>
          <span className="text-base font-bold text-slate-800">{auditMetrics.totalItemsStocked} un</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Lucro Potencial Total</span>
          <span className="text-base font-bold text-emerald-700">+{formatCurrency(auditMetrics.totalItemsWithProfitSum)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Margem Geral Média</span>
          <span className="text-base font-bold text-slate-800">{auditMetrics.averageMarginPercent.toFixed(1)}%</span>
        </div>
      </div>
    </>
  );
};
