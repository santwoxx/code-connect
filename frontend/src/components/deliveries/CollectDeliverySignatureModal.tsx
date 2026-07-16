import { Smartphone, X, AlertCircle, Check, PenTool } from 'lucide-react';
import { Delivery } from '../../types';
import { compressImageBase64 } from '../../utils/image';
import { SignaturePad } from './SignaturePad';

interface CollectDeliverySignatureModalProps {
  delivery: Delivery;
  isAdmin: boolean;
  isSaving: boolean;
  signError: string;
  refuseSignature: boolean;
  refusalName: string;
  refusalDob: string;
  refusalCpf: string;
  deliveryPhotoImg: string;
  onToggleRefuseSignature: (checked: boolean) => void;
  onChangeCustomerSignature: (dataUrl: string) => void;
  onChangeDelivererSignature: (dataUrl: string) => void;
  onChangeRefusalName: (value: string) => void;
  onChangeRefusalDob: (value: string) => void;
  onChangeRefusalCpf: (value: string) => void;
  onChangeDeliveryPhoto: (dataUrl: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function CollectDeliverySignatureModal({
  delivery,
  isAdmin,
  isSaving,
  signError,
  refuseSignature,
  refusalName,
  refusalDob,
  refusalCpf,
  deliveryPhotoImg,
  onToggleRefuseSignature,
  onChangeCustomerSignature,
  onChangeDelivererSignature,
  onChangeRefusalName,
  onChangeRefusalDob,
  onChangeRefusalCpf,
  onChangeDeliveryPhoto,
  onCancel,
  onSubmit
}: CollectDeliverySignatureModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full max-h-[95vh] flex flex-col overflow-hidden">
        <div className={`p-4 border-b border-slate-100 shrink-0 ${isAdmin && !delivery.delivererSignature === false ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <h3 className={`font-bold font-display flex items-center gap-2 text-sm ${isAdmin ? 'text-emerald-900' : 'text-amber-900'}`}>
            <Smartphone className={`w-5 h-5 ${isAdmin ? 'text-emerald-700' : 'text-amber-700'}`} />
            <span className="font-sans font-extrabold">
              {isAdmin ? 'Confirmar Recebimento — Ciência Administrativa' : 'Autenticação Dual de Entrega'}
            </span>
          </h3>
          <p className="text-[11px] leading-relaxed mt-1 text-slate-600">
            {isAdmin
              ? 'O entregador já realizou a coleta de assinaturas em campo. Confirme o recebimento como administrador para concluir oficialmente a entrega.'
              : 'Colha a assinatura digital da cliente e do responsável para marcar oficialmente como entregue.'}
          </p>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Delivery info summary */}
          <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100 text-slate-700">
            <div><span className="font-semibold text-slate-400 uppercase text-[10px] block">Cliente</span> {delivery.customerName}</div>
            <div><span className="font-semibold text-slate-400 uppercase text-[10px] block">Endereço</span> {delivery.address}</div>
            <div><span className="font-semibold text-slate-400 uppercase text-[10px] block">Itens do Lote</span> <strong className="text-slate-800">{delivery.itemsDescription}</strong></div>
          </div>

          {/* Signature 1: Client */}
          <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-150">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="refuseSignatureDelivery"
                checked={refuseSignature}
                onChange={(e) => onToggleRefuseSignature(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="refuseSignatureDelivery" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                Cliente recusa-se a assinar (Preencher dados)
              </label>
            </div>

            {!refuseSignature ? (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Assinatura Digital da Cliente <span className="text-rose-500">*</span>
                </label>
                <SignaturePad
                  placeholder={`Responsável: ${delivery.customerName}`}
                  onStrokeChange={onChangeCustomerSignature}
                  strokeColor="#0f172a"
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

          {/* Signature 2: Deliverer */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              2. Assinatura do Entregador (CentralSync Resp.) <span className="text-rose-500">*</span>
            </label>
            <SignaturePad
              placeholder={`Entregador: ${delivery.delivererName}`}
              onStrokeChange={onChangeDelivererSignature}
              strokeColor="#1d4ed8"
            />
          </div>

          {/* Delivery Photo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              3. Foto da Entrega <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-white">
              {deliveryPhotoImg ? (
                <div className="relative">
                  <img
                    src={deliveryPhotoImg}
                    alt="Foto da Entrega"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onChangeDeliveryPhoto('')}
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
                              onChangeDeliveryPhoto(compressed);
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

          {/* Warning error logs */}
          {signError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <span>Enviando comprovantes...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Confirmar e Registrar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
