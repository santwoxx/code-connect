import React from 'react';
import { formatCurrency } from '../../utils/format';
import { PaymentMethod } from '../../types';

interface MethodsTabProps {
  methodTotals: Record<string, number>;
}

export const MethodsTab: React.FC<MethodsTabProps> = ({ methodTotals }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { method: 'DINHEIRO', label: 'Dinheiro', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          { method: 'PIX', label: 'PIX', color: 'bg-teal-50 border-teal-100 text-teal-700' },
          { method: 'CARTAO', label: 'Cartão', color: 'bg-blue-50 border-blue-100 text-blue-700' },
          { method: 'CARTAO_X', label: 'Cartão X', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
          { method: 'CREDIARIO', label: 'Crediário', color: 'bg-purple-50 border-purple-100 text-purple-700' }
        ].map(opt => {
          const total = methodTotals[opt.method] || 0;
          return (
            <div key={opt.method} className={`p-4 rounded-xl border ${opt.color}`}>
              <span className="text-[10px] uppercase tracking-wider font-bold block opacity-80">{opt.label}</span>
              <span className="text-lg font-black font-mono block mt-1">{formatCurrency(total)}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-700 block mb-3">Distribuição Comparativa de Recebimentos</span>
        <div className="space-y-3">
          {(() => {
            const totalAllocated = Object.values(methodTotals).reduce((a, b) => a + b, 0);
            return [
              { method: 'DINHEIRO', label: 'Dinheiro', color: 'bg-emerald-600' },
              { method: 'PIX', label: 'PIX', color: 'bg-teal-500' },
              { method: 'CARTAO', label: 'Cartão', color: 'bg-blue-600' },
              { method: 'CARTAO_X', label: 'Cartão X', color: 'bg-indigo-500' },
              { method: 'CREDIARIO', label: 'Crediário', color: 'bg-purple-600' }
            ].map(opt => {
              const amt = methodTotals[opt.method] || 0;
              const pct = totalAllocated > 0 ? (amt / totalAllocated) * 100 : 0;
              return (
                <div key={opt.method} className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700 text-[10px]">
                    <span>{opt.label}</span>
                    <span>{formatCurrency(amt)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-250 h-2 rounded-full overflow-hidden">
                    <div className={`${opt.color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};
