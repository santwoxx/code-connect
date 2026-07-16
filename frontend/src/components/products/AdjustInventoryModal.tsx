import { TrendingUp, X } from 'lucide-react';
import { Product } from '../../types';

interface AdjustInventoryModalProps {
  product: Product;
  adjustType: 'IN' | 'OUT';
  adjustQty: string;
  adjustReason: string;
  adjustDesc: string;
  onChangeQty: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeDesc: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AdjustInventoryModal({
  product,
  adjustType,
  adjustQty,
  adjustReason,
  adjustDesc,
  onChangeQty,
  onChangeReason,
  onChangeDesc,
  onCancel,
  onSubmit
}: AdjustInventoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto" id="adjust-dialog">
      <div className="bg-white rounded-xl shadow-xl border border-blue-100 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className={`p-4 text-white flex justify-between items-center shrink-0 ${adjustType === 'IN' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
          <h3 className="font-bold text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white" />
            Regulagem Física: {adjustType === 'IN' ? 'Entrada no Estoque' : 'Dar Baixa / Saída de Material'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target info */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-250">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Item Selecionado</span>
            <span className="text-sm font-extrabold text-slate-900 block mt-0.5">{product.name}</span>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500">Saldo Fisicamente Presente:</span>
              <span className="font-bold text-blue-700">{product.currentStock} un</span>
            </div>
          </div>

          {/* Adjust Units count */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Quantidade de Unidades <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={adjustQty}
              onChange={(e) => onChangeQty(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900 font-bold"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              {adjustType === 'IN'
                ? `Novo saldo calculado: ${product.currentStock + (parseInt(adjustQty, 10) || 0)} un.`
                : `Novo saldo calculado: ${product.currentStock - (parseInt(adjustQty, 10) || 0)} un.`}
            </span>
          </div>

          {/* Transaction Reason dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Motivo da Movimentação <span className="text-rose-500">*</span>
            </label>
            <select
              value={adjustReason}
              onChange={(e) => onChangeReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
              required
            >
              {adjustType === 'IN' ? (
                <>
                  <option value="COMPRA">COMPRA (Novas unidades lote fornecedor)</option>
                  <option value="RETORNO">RETORNO (Devolução de venda por cliente)</option>
                  <option value="AJUSTE">AJUSTE (Ajuste ou contagem física de estoque)</option>
                  <option value="OUTROS">OUTROS (Corte de sobras / Diversos)</option>
                </>
              ) : (
                <>
                  <option value="VENDA">VENDA (Consumo de estoque por pedido / Saída direta)</option>
                  <option value="PERDA">PERDA (Item avariado, roubado, expirado ou quebrado)</option>
                  <option value="AJUSTE">AJUSTE (Ajuste ou contagem de auditoria)</option>
                  <option value="OUTROS">OUTROS (Brinde / Teste / Uso Interno)</option>
                </>
              )}
            </select>
          </div>

          {/* Extra annotation description text */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Descrição complementar / Observação
            </label>
            <input
              type="text"
              placeholder="Ex: Nota de compra #340 ou Devolução conforme ticket #11"
              value={adjustDesc}
              onChange={(e) => onChangeDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer ${adjustType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              Confirmar {adjustType === 'IN' ? 'Entrada' : 'Saída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
