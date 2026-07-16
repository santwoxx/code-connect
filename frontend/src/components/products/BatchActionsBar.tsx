import { Edit, Calculator } from 'lucide-react';

interface BatchActionsBarProps {
  selectedCount: number;
  onCancel: () => void;
  onEditBatch: () => void;
  onCalculateTaxes: () => void;
}

export function BatchActionsBar({ selectedCount, onCancel, onEditBatch, onCalculateTaxes }: BatchActionsBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full">
            {selectedCount}
          </span>
          <span className="font-semibold text-sm">produtos selecionados</span>
        </div>

        <div className="h-6 w-px bg-slate-700"></div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onCalculateTaxes}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calcular Preços
          </button>
          <button
            onClick={onEditBatch}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar Lote
          </button>
        </div>
      </div>
    </div>
  );
}
