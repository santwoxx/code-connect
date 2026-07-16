import { AlertTriangle, Send } from 'lucide-react';
import { Delivery } from '../../types';

interface ReportProblemModalProps {
  delivery: Delivery;
  problemType: string;
  problemDescription: string;
  onChangeProblemType: (value: string) => void;
  onChangeProblemDescription: (value: string) => void;
  onCancel: () => void;
  onSend: () => void;
}

export function ReportProblemModal({
  delivery,
  problemType,
  problemDescription,
  onChangeProblemType,
  onChangeProblemDescription,
  onCancel,
  onSend
}: ReportProblemModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-rose-50 shrink-0 text-left">
          <h3 className="font-bold font-display text-rose-900 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-700" />
            <span className="font-sans font-extrabold">Reportar Problema / Ocorrência</span>
          </h3>
          <p className="text-[11px] text-rose-850 leading-relaxed mt-1">
            Relate problemas ocorridos durante a entrega ou montagem. Isso enviará um alerta aos administradores.
          </p>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-left">
          <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 border border-slate-100 text-slate-700">
            <div><span className="font-semibold text-slate-400 uppercase text-[9px] block font-sans">Cliente</span> {delivery.customerName}</div>
            <div><span className="font-semibold text-slate-400 uppercase text-[9px] block font-sans">Itens</span> {delivery.itemsDescription}</div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Tipo de Problema <span className="text-rose-500">*</span></label>
            <select
              value={problemType}
              onChange={(e) => onChangeProblemType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800"
            >
              <option value="Falta de Parafuso/Ferragens">🔧 Falta de Parafuso/Ferragens</option>
              <option value="Produto com Avaria/Riscado">🤕 Produto com Avaria/Riscado</option>
              <option value="Produto Incorreto/Tamanho Diferente">📦 Produto Incorreto/Tamanho Diferente</option>
              <option value="Cliente Ausente / Endereço Incorreto">📍 Cliente Ausente / Endereço Incorreto</option>
              <option value="Outro Problema (descrever abaixo)">❓ Outro Problema</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Detalhes da Ocorrência</label>
            <textarea
              value={problemDescription}
              onChange={(e) => onChangeProblemDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800"
              placeholder="Descreva detalhadamente o que aconteceu (ex: faltou o puxador da gaveta, tampo veio trincado, etc.)..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onSend}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar Reporte (WhatsApp & E-mail)
          </button>
        </div>
      </div>
    </div>
  );
}
