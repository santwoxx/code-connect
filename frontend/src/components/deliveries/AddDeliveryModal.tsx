import { Truck, X } from 'lucide-react';

interface AddDeliveryModalProps {
  newCustomerName: string;
  newCustomerPhone: string;
  newAddress: string;
  newDelivererName: string;
  newDate: string;
  newItems: string;
  newNotes: string;
  onChangeCustomerName: (value: string) => void;
  onChangeCustomerPhone: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onChangeDelivererName: (value: string) => void;
  onChangeDate: (value: string) => void;
  onChangeItems: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddDeliveryModal({
  newCustomerName,
  newCustomerPhone,
  newAddress,
  newDelivererName,
  newDate,
  newItems,
  newNotes,
  onChangeCustomerName,
  onChangeCustomerPhone,
  onChangeAddress,
  onChangeDelivererName,
  onChangeDate,
  onChangeItems,
  onChangeNotes,
  onCancel,
  onSubmit
}: AddDeliveryModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold font-display text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Agendar Entrega de Móveis
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Nome da Cliente <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Rosângela Silva"
              value={newCustomerName}
              onChange={(e) => onChangeCustomerName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-850"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Telefone da Cliente
            </label>
            <input
              type="text"
              placeholder="Ex: (73) 99999-9999"
              value={newCustomerPhone}
              onChange={(e) => onChangeCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-850"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Endereço de Entrega <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Av. Paulista, 1000 - Apto 82, São Paulo - SP"
              value={newAddress}
              onChange={(e) => onChangeAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-850"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Entregador / Resp. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Souza"
                value={newDelivererName}
                onChange={(e) => onChangeDelivererName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-850"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Data Agendada <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => onChangeDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-850 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Móveis a Entregar (SKUs ou descrição) <span className="text-rose-500">*</span>
            </label>
            <textarea
              placeholder="Ex: 1x Cadeira Ergonômica Pro, 1x Mesa Office"
              value={newItems}
              onChange={(e) => onChangeItems(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-850"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Observações complementares
            </label>
            <input
              type="text"
              placeholder="Ex: Ligar para confirmar antes"
              value={newNotes}
              onChange={(e) => onChangeNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-850"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Agendar Entrega
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
