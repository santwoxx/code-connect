interface FreightModalProps {
  isOpen: boolean;
  freightInput: string;
  onChangeFreightInput: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const SUGGESTED_VALUES = [
  { label: 'Grátis', value: 0 },
  { label: 'R$ 30', value: 30 },
  { label: 'R$ 50', value: 50 },
  { label: 'R$ 80', value: 80 },
  { label: 'R$ 100', value: 100 }
];

export function FreightModal({ isOpen, freightInput, onChangeFreightInput, onCancel, onConfirm }: FreightModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-150 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b pb-3 shrink-0">
          <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider flex items-center gap-1.5">
            <span>Valor do Frete</span>
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Informe o Valor do Frete (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={freightInput}
              onChange={(e) => onChangeFreightInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-850 font-bold focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Valores Frequentes
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_VALUES.map((sug) => (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => onChangeFreightInput(String(sug.value))}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors border border-slate-200/60 cursor-pointer"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer"
          >
            Confirmar Frete
          </button>
        </div>
      </div>
    </div>
  );
}
