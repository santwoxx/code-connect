import React from 'react';
import { formatCurrency } from '../../utils/format';
import { Payment, PaymentStatus } from '../../types';

interface AlterdataTabProps {
  alterdataReport: {
    incomes: number;
    expenses: number;
    balance: number;
    transactions: Payment[];
  };
  getStatusBadge: (status: PaymentStatus) => React.ReactNode;
}

export const AlterdataTab: React.FC<AlterdataTabProps> = ({ alterdataReport, getStatusBadge }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold block">Total Entradas (Fechamento)</span>
          <span className="text-lg font-black text-emerald-900 font-mono block mt-1">{formatCurrency(alterdataReport.incomes)}</span>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
          <span className="text-[10px] uppercase tracking-wider text-rose-600 font-bold block">Total Saídas (Fechamento)</span>
          <span className="text-lg font-black text-rose-900 font-mono block mt-1">{formatCurrency(alterdataReport.expenses)}</span>
        </div>
        <div className={`p-4 rounded-xl border ${alterdataReport.balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <span className={`text-[10px] uppercase tracking-wider font-bold block ${alterdataReport.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Saldo do Caixa Fechamento</span>
          <span className={`text-lg font-black font-mono block mt-1 ${alterdataReport.balance >= 0 ? 'text-blue-900' : 'text-red-900'}`}>{formatCurrency(alterdataReport.balance)}</span>
        </div>
      </div>

      <div className="border border-slate-150 rounded-xl overflow-hidden bg-white">
        <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 px-4 py-3 bg-slate-50 border-b">Últimos Lançamentos do Caixa Fechamento</span>
        <div className="overflow-x-auto">
          {alterdataReport.transactions.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/55 text-slate-500 font-semibold border-b">
                  <th className="p-2.5">Vencimento</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5">Cliente/Fornecedor</th>
                  <th className="p-2.5 text-center">Tipo</th>
                  <th className="p-2.5 text-right">Valor</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alterdataReport.transactions.slice(0, 8).map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/30">
                    <td className="p-2.5 font-mono text-slate-500">{tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="p-2.5 font-medium text-slate-800 line-clamp-1">{tx.description}</td>
                    <td className="p-2.5 text-slate-600">{tx.entityName}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {tx.type === 'INCOME' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900 font-mono">{formatCurrency(tx.amount)}</td>
                    <td className="p-2.5 text-center">{getStatusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-400 italic text-center py-6">Nenhum lançamento registrado no Caixa Fechamento.</p>
          )}
        </div>
      </div>
    </div>
  );
};
