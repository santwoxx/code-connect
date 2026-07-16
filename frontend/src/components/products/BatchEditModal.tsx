import React from 'react';
import { Edit, X, AlertCircle, RefreshCw } from 'lucide-react';
import { Category } from '../../types';

interface BatchEditState {
  category: string;
  taxPercent: string;
  markupPercent: string;
  freightPercent: string;
}

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  batchEditState: BatchEditState;
  setBatchEditState: React.Dispatch<React.SetStateAction<BatchEditState>>;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  categories: Category[];
  onAddCategory?: () => void;
}

export function BatchEditModal({
  isOpen,
  onClose,
  selectedCount,
  batchEditState,
  setBatchEditState,
  onSubmit,
  isProcessing,
  categories,
  onAddCategory
}: BatchEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto" id="batch-edit-dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full flex flex-col overflow-hidden">
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Edit className="w-5 h-5 text-white" />
            Edição em Lote ({selectedCount} itens)
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Apenas os campos preenchidos abaixo serão alterados nos {selectedCount} produtos selecionados. Campos em branco não modificarão o valor atual dos produtos.</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Nova Categoria
              </label>
              {onAddCategory && (
                <button
                  type="button"
                  onClick={onAddCategory}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                >
                  + Criar Nova
                </button>
              )}
            </div>
            <select
              value={batchEditState.category}
              onChange={(e) => setBatchEditState(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">(Não alterar)</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Impostos (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={batchEditState.taxPercent}
              onChange={(e) => setBatchEditState(prev => ({ ...prev, taxPercent: e.target.value }))}
              placeholder="(Não alterar)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Markup (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={batchEditState.markupPercent}
              onChange={(e) => setBatchEditState(prev => ({ ...prev, markupPercent: e.target.value }))}
              placeholder="(Não alterar)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Frete (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={batchEditState.freightPercent}
              onChange={(e) => setBatchEditState(prev => ({ ...prev, freightPercent: e.target.value }))}
              placeholder="(Não alterar)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Lote'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
