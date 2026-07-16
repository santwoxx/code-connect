import { Truck, X, AlertCircle, Check } from 'lucide-react';
import { Delivery, Deliverer } from '../../types';

interface AssignDelivererModalProps {
  delivery: Delivery;
  entregadores: Deliverer[];
  selectedDelivererId: string;
  assignDelivererError: string;
  onSelectDeliverer: (id: string) => void;
  onCancel: () => void;
  onSave: (sentToDeliverer: boolean) => void;
}

export function AssignDelivererModal({
  delivery,
  entregadores,
  selectedDelivererId,
  assignDelivererError,
  onSelectDeliverer,
  onCancel,
  onSave
}: AssignDelivererModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold font-display text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Designar Entregador
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100 text-slate-700">
            <div><span className="font-semibold text-slate-400 uppercase text-[10px] block">Cliente</span> {delivery.customerName}</div>
            <div><span className="font-semibold text-slate-400 uppercase text-[10px] block">Endereço</span> <strong className="text-slate-800">{delivery.address}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Selecionar Entregador <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDelivererId}
              onChange={(e) => onSelectDeliverer(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold cursor-pointer"
            >
              <option value="">Selecione o Entregador</option>
              {entregadores.filter(e => e.active).map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {assignDelivererError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{assignDelivererError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave(false)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Salvar Sem Enviar
            </button>
            <button
              type="button"
              onClick={() => onSave(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Confirmar e Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
