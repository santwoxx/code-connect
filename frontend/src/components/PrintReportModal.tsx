import React from 'react';
import { Printer, X, Calendar, DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency } from '../utils/format';

interface PrintReportModalProps {
  report: {
    title: string;
    subtitle: string;
    sales: Sale[];
  } | null;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  const { title, subtitle, sales } = report;

  const handlePrint = () => {
    window.print();
  };

  // 1. Calculate KPI Metrics
  const completedSales = sales.filter(s => s.status !== 'CANCELLED');
  const invoicedSales = sales.filter(s => s.status === 'COMPLETED');
  const totalRevenue = completedSales.reduce((acc, curr) => acc + curr.value, 0);
  const totalSalesCount = completedSales.length;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const totalCommissions = invoicedSales.reduce((acc, curr) => acc + (curr.commissionValue || 0), 0);

  // 2. Calculate Payment Method Breakdown
  const methods = [
    { key: 'DINHEIRO', label: 'Dinheiro' },
    { key: 'CREDIARIO', label: 'Crediário' },
    { key: 'CARTAO', label: 'Cartão' },
    { key: 'CARTAO_X', label: 'Cartão X' },
    { key: 'ALTERDATA', label: 'Fechamento' },
    { key: 'CENTRAL', label: 'Orçamento' },
    { key: 'PIX', label: 'PIX' }
  ];

  const breakdown = methods.map(m => {
    const methodSales = completedSales.filter(s => s.paymentMethod === m.key);
    const totalVal = methodSales.reduce((acc, curr) => acc + curr.value, 0);
    const count = methodSales.length;
    return {
      ...m,
      totalVal,
      count
    };
  });

  const getSistemaLabel = (sale: Sale) => {
    if (sale.status === 'PENDING') return 'Orçamento (Pendente)';
    if (sale.paymentMethod === 'CENTRAL') return 'Orçamento (Faturado)';
    if (sale.paymentMethod === 'ALTERDATA') return 'Fechamento';
    return sale.origin || 'Mostruário';
  };

  const getFormaPgto = (sale: Sale) => {
    if (sale.paymentMethod === 'ALTERDATA' || sale.paymentMethod === 'CENTRAL') {
      if (sale.notes && sale.notes.includes('Pagamento:')) {
        const match = sale.notes.match(/Pagamento:\s*(.*)/);
        return match ? match[1] : 'Não Inf.';
      }
      return 'Não Inf.';
    }
    const labels: Record<string, string> = {
      DINHEIRO: 'Dinheiro',
      CREDIARIO: 'Crediário',
      CARTAO: 'Cartão',
      CARTAO_X: 'Cartão X',
      PIX: 'PIX'
    };
    return sale.paymentMethod ? labels[sale.paymentMethod] || sale.paymentMethod : 'Não Informado';
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0">
      {/* Container Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-250 transform scale-100 transition-all duration-300 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Modal Header (hidden in print) */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">Visualização de Impressão de Relatório</span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Content Body */}
        <div className="p-8 overflow-y-auto flex-1 font-sans space-y-6 text-slate-800 print:overflow-visible print:p-0 print:text-black" id="print-section">
          
          {/* Brand Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1 text-slate-900 print:text-black">
            <h2 className="text-2xl font-black tracking-tight uppercase">CentralSync ERP</h2>
            <p className="text-xs font-semibold text-slate-500 print:text-slate-800">Showroom e Estoque Central de Móveis</p>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-wide pt-1 print:text-black">{title}</p>
            <p className="text-[10px] font-medium text-slate-400 font-mono print:text-slate-700">{subtitle}</p>
          </div>

          {/* Key Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-white print:border-slate-300 print:border text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Bruto</span>
              <span className="text-base font-black text-slate-900 font-mono print:text-black">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-white print:border-slate-300 print:border text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Qtd. Vendas</span>
              <span className="text-base font-black text-slate-900 font-mono print:text-black">{totalSalesCount} un</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-white print:border-slate-300 print:border text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ticket Médio</span>
              <span className="text-base font-black text-slate-900 font-mono print:text-black">{formatCurrency(avgTicket)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-white print:border-slate-300 print:border text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Comissão Geral</span>
              <span className="text-base font-black text-purple-700 font-mono print:text-black">{formatCurrency(totalCommissions)}</span>
            </div>
          </div>

          {/* Breakdown: Payment Methods */}
          <div className="space-y-3 text-left">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Resumo por Sistemas e Formas</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {breakdown.filter(b => b.count > 0).map(b => (
                <div key={b.key} className="bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-white print:border-slate-300 print:border">
                  <span className="text-[10px] text-slate-500 font-bold block">{b.label}</span>
                  <span className="text-sm font-black text-slate-900 font-mono block mt-1 print:text-black">{formatCurrency(b.totalVal)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{b.count} {b.count === 1 ? 'venda' : 'vendas'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Sales List Table */}
          <div className="space-y-3 text-left">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Detalhamento das Vendas</h4>
            <div className="overflow-x-auto border border-slate-150 rounded-xl print:border-slate-300 print:border">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 print:bg-white print:border-slate-300 print:border">
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">ID Venda</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5">Vendedor</th>
                    <th className="p-2.5">Sistema</th>
                    <th className="p-2.5">Forma Pgto</th>
                    <th className="p-2.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {completedSales.length > 0 ? (
                    completedSales.map(sale => {
                      const saleDate = new Date(sale.createdAt);
                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/50 print:bg-white">
                          <td className="p-2.5 whitespace-nowrap text-slate-500 print:text-black font-mono">
                            {saleDate.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-600 uppercase print:text-black text-[11px]">
                            {sale.id.replace('sale-', '').split('-')[0].slice(-6)}
                          </td>
                          <td className="p-2.5 font-medium text-slate-800 print:text-black">
                            {sale.clientName}
                          </td>
                          <td className="p-2.5 font-medium text-slate-800 print:text-black max-w-[150px] truncate">
                            {sale.productName}
                          </td>
                          <td className="p-2.5 text-slate-700 print:text-black">
                            {sale.sellerName}
                          </td>
                          <td className="p-2.5 text-slate-700 print:text-black font-bold text-[9px] text-indigo-700">
                            {getSistemaLabel(sale)}
                          </td>
                          <td className="p-2.5 font-bold text-slate-700 print:text-black max-w-[120px] truncate">
                            {getFormaPgto(sale)}
                          </td>
                          <td className="p-2.5 text-right font-bold font-mono text-slate-900 print:text-black">
                            {formatCurrency(sale.value)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        Nenhuma venda concluída no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-4 text-center border-t border-dashed border-slate-200 text-[9px] text-slate-400 font-mono print:text-slate-600">
            Relatório gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} • Operador logado
          </div>

        </div>

        {/* Modal Actions Footer (hidden in print) */}
        <div className="p-4 bg-slate-50 border-t flex gap-3 justify-end shrink-0 print:hidden">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Voltar
          </button>
          
          <button 
            type="button" 
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>

      </div>
    </div>
  );
};
