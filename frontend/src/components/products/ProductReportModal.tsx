import { X, FileText } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/format';

interface ProductReportModalProps {
  products: Product[];
  onClose: () => void;
}

export function ProductReportModal({ products, onClose }: ProductReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl shrink-0">
          <div>
            <h3 className="font-bold text-base font-display">Relatório de Produtos</h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">Listagem geral do catálogo e controle de estoque</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6" id="product-report-content">
          {/* KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">Total de Produtos</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{products.length}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Categorias</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{new Set(products.map(p => p.category)).size}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">Estoque Crítico</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{products.filter(p => p.currentStock <= p.minStock).length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-[10px] uppercase tracking-wider text-purple-600 font-bold">Valor Total em Estoque</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {formatCurrency(products.reduce((sum, p) => sum + (p.costPrice || 0) * p.currentStock, 0))}
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3">SKU</th>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Preço Venda</th>
                  <th className="p-3 text-right">Preço Custo</th>
                  <th className="p-3 text-center">Estoque</th>
                  <th className="p-3 text-center">Est. Mínimo</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => {
                  const isCritical = p.currentStock <= p.minStock;
                  return (
                    <tr key={p.id} className={`${isCritical ? 'bg-amber-50/40' : ''} hover:bg-slate-50/50`}>
                      <td className="p-3 font-mono text-blue-600 font-semibold text-[11px]">{p.sku}</td>
                      <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="p-3 text-slate-500">{p.category}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(p.price)}</td>
                      <td className="p-3 text-right text-slate-500">{formatCurrency(p.costPrice)}</td>
                      <td className={`p-3 text-center font-bold ${isCritical ? 'text-red-600' : 'text-emerald-700'}`}>{p.currentStock}</td>
                      <td className="p-3 text-center text-slate-400">{p.minStock}</td>
                      <td className="p-3 text-center">
                        {p.active ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Ativo</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Inativo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer with Print Button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={() => window.print()}
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Imprimir Relatório
          </button>
        </div>
      </div>
    </div>
  );
}
