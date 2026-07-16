import { AlertCircle, Trash2 } from 'lucide-react';
import { Product } from '../../types';

interface DeleteConfirmationModalProps {
  product: Product;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({ product, onCancel, onConfirm }: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto font-sans" id="showroom-delete-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-4">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="p-3 bg-rose-50 rounded-full">
            <AlertCircle className="w-6 h-6 text-rose-600 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Confirmar Exclusão do Showroom?</h3>
            <p className="text-xs text-slate-400">Esta ação excluirá permanentemente o produto do catálogo.</p>
          </div>
        </div>

        <p className="text-xs text-slate-650 leading-relaxed bg-slate-50 p-3 rounded-lg border font-medium">
          Você está prestes a excluir o móvel <strong className="font-extrabold text-slate-800">“{product.name}”</strong> (SKU: {product.sku}) do banco de dados do showroom. Esta ação é definitiva e não pode ser desfeita.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer transition-colors flex items-center gap-1 active:scale-95 shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sim, Confirmar Exclusão</span>
          </button>
        </div>
      </div>
    </div>
  );
}
