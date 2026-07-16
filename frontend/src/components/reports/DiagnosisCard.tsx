import React from 'react';
import { FileCheck, CheckCircle, AlertTriangle } from 'lucide-react';

interface DiagnosisCardProps {
  averageMarginPercent: number;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ averageMarginPercent }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-2">
        <FileCheck className="w-4 h-4 text-slate-655" /> Diagnóstico de Saudabilidade
      </h3>
      <p className="text-xs text-slate-400 mb-4 font-normal">Leitura de conformidade de canais entre o saldo físico e o giro financeiro.</p>
      
      <div className="space-y-3 text-xs text-slate-600">
        <div className="p-3.5 bg-slate-50/75 rounded-xl border border-slate-150 flex gap-3">
          <CheckCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 font-bold block mb-0.5">Giro de Ativos Físicos</strong>
            Sua margem de revenda está regulada em <strong className="text-slate-900 font-bold">{averageMarginPercent.toFixed(1)}%</strong>. 
            Mantenha custos operacionais controlados para garantir rentabilidade final superior a 15% ao mês.
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-800 font-bold block mb-0.5">Atenção ao Caixa Líquido</strong>
            Evite compras exageradas de novos lotes de fornecedores se o saldo de contas a receber estiver com taxas elevadas de pendência ou inadimplência.
          </div>
        </div>
      </div>
    </div>
  );
};
