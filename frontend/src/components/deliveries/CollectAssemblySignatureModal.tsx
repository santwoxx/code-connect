import { Check, X, AlertCircle, PenTool } from 'lucide-react';
import { Delivery } from '../../types';
import { compressImageBase64 } from '../../utils/image';
import { SignaturePad } from './SignaturePad';

interface CollectAssemblySignatureModalProps {
  delivery: Delivery;
  isSaving: boolean;
  signError: string;
  refuseSignature: boolean;
  refusalName: string;
  refusalDob: string;
  refusalCpf: string;
  assemblyPhotoImg: string;
  onToggleRefuseSignature: (checked: boolean) => void;
  onChangeAssemblerSignature: (dataUrl: string) => void;
  onChangeCustomerSignature: (dataUrl: string) => void;
  onChangeRefusalName: (value: string) => void;
  onChangeRefusalDob: (value: string) => void;
  onChangeRefusalCpf: (value: string) => void;
  onChangeAssemblyPhoto: (dataUrl: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function CollectAssemblySignatureModal({
  delivery,
  isSaving,
  signError,
  refuseSignature,
  refusalName,
  refusalDob,
  refusalCpf,
  assemblyPhotoImg,
  onToggleRefuseSignature,
  onChangeAssemblerSignature,
  onChangeCustomerSignature,
  onChangeRefusalName,
  onChangeRefusalDob,
  onChangeRefusalCpf,
  onChangeAssemblyPhoto,
  onCancel,
  onSubmit
}: CollectAssemblySignatureModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <Check className="w-4 h-4 text-blue-600 font-bold" />
            </div>
            <div>
              <h3 className="font-bold font-display text-slate-900">Registrar Montagem</h3>
              <p className="text-[11px] text-slate-400">
                {delivery.customerName} — {delivery.id}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4 text-xs border bg-slate-50/50 p-4 rounded-xl border-dashed">
            <div>
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Cliente</span>
              <span className="text-slate-900 font-bold">{delivery.customerName}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Endereço</span>
              <span className="text-slate-800 font-medium">{delivery.address}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Móveis</span>
              <span className="text-slate-900 font-extrabold">{delivery.itemsDescription}</span>
            </div>
          </div>

          {/* Assembler Signature Pad */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold block mb-2">
              Assinatura do Montador <span className="text-rose-500">*</span>
            </label>
            <SignaturePad
              placeholder={`Montador: ${delivery.assemblerName || ''}`}
              onStrokeChange={onChangeAssemblerSignature}
              strokeColor="#0f172a"
            />
          </div>

          {/* Customer Signature Pad */}
          <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-150">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="refuseSignatureAssembly"
                checked={refuseSignature}
                onChange={(e) => onToggleRefuseSignature(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="refuseSignatureAssembly" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                Cliente recusa-se a assinar (Preencher dados)
              </label>
            </div>

            {!refuseSignature ? (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-left">
                  Assinatura do Cliente <span className="text-rose-500">*</span>
                </label>
                <SignaturePad
                  placeholder={`Cliente: ${delivery.customerName}`}
                  onStrokeChange={onChangeCustomerSignature}
                  strokeColor="#1d4ed8"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 pt-1.5 border-t border-slate-200/60 animate-fade-in text-left">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo do Recebedor *</label>
                  <input
                    type="text"
                    value={refusalName}
                    onChange={(e) => onChangeRefusalName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-slate-800"
                    placeholder="Nome completo..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data de Nascimento *</label>
                    <input
                      type="date"
                      value={refusalDob}
                      onChange={(e) => onChangeRefusalDob(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-slate-850"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">CPF *</label>
                    <input
                      type="text"
                      value={refusalCpf}
                      onChange={(e) => onChangeRefusalCpf(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-slate-850"
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Assembly Photo */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold block mb-2">
              Foto do Móvel Montado <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-white">
              {assemblyPhotoImg ? (
                <div className="relative">
                  <img
                    src={assemblyPhotoImg}
                    alt="Foto da Montagem"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onChangeAssemblyPhoto('')}
                    className="absolute top-1 right-1 p-1 bg-white/90 text-rose-500 hover:text-rose-700 rounded-full shadow-xs border border-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-28 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            if (typeof ev.target?.result === 'string') {
                              const compressed = await compressImageBase64(ev.target.result as string);
                              onChangeAssemblyPhoto(compressed);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" />
                    Tirar Foto
                  </button>
                </div>
              )}
            </div>
          </div>

          {signError && (
            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2.5 rounded-lg text-xs font-medium border border-rose-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{signError}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              disabled={isSaving}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <span>Enviando comprovantes...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Confirmar Montagem
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
