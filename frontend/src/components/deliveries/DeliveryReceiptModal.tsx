import { Check, X, Lock, Printer } from 'lucide-react';
import { Delivery } from '../../types';

interface DeliveryReceiptModalProps {
  delivery: Delivery;
  isAdmin: boolean;
  onClose: () => void;
  onPrint?: (delivery: Delivery) => void;
}

export function DeliveryReceiptModal({ delivery, isAdmin, onClose, onPrint }: DeliveryReceiptModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-600 font-bold" />
            </div>
            <div>
              <h3 className="font-bold font-display text-slate-900">Recibo e Comprovante de Entrega</h3>
              <p className="text-[11px] text-slate-400">ID do Lote: {delivery.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Receipt logistics list */}
          <div className="grid grid-cols-2 gap-4 text-xs border bg-slate-50/50 p-4 rounded-xl border-dashed">
            <div>
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Destinatária</span>
              <span className="text-slate-900 font-bold">{delivery.customerName}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Responsável Entrega</span>
              <span className="text-slate-900 font-bold">{delivery.delivererName}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Endereço de Entrega</span>
              <span className="text-slate-800 font-medium leading-relaxed">{delivery.address}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Móveis e Volume</span>
              <span className="text-slate-900 font-extrabold">{delivery.itemsDescription}</span>
            </div>
            {delivery.assemblerId && (
              <div className="col-span-2 mt-1 pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-0.5">Montador Atribuído</span>
                <span className="text-slate-900 font-bold">{delivery.assemblerName} (Comissão: {delivery.assemblyCommissionPercent || 0}% {delivery.assemblySentToAssembler ? '' : ' - Rascunho'})</span>
              </div>
            )}
          </div>

          {/* Status and timestamp */}
          <div className="flex justify-between items-center bg-emerald-50 text-emerald-900 px-4 py-3 rounded-xl text-xs border border-emerald-100">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Status: Entregue</span>
            {delivery.deliveredAt && (
              <span className="font-semibold">
                Em {new Date(delivery.deliveredAt).toLocaleDateString('pt-BR')} às {new Date(delivery.deliveredAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
          </div>

          {isAdmin ? (
            <>
              {/* Dual signature visualization */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-3 bg-white text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Assinatura da Cliente</span>
                  {delivery.customerSignature ? (
                    <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1 flex-col">
                      <img
                        src={delivery.customerSignature}
                        alt="Assinatura da Cliente"
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : delivery.customerRefusalName ? (
                    <div className="h-[90px] w-full flex flex-col items-center justify-center border-b border-slate-100 pb-1 bg-slate-50 text-[9px] text-slate-600">
                      <span className="font-bold text-rose-600 mb-1 block">Assinatura Recusada</span>
                      <span><b className="text-slate-500">Nome:</b> {delivery.customerRefusalName}</span>
                      <span><b className="text-slate-500">Nasc:</b> {new Date(delivery.customerRefusalDob as string).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                      <span><b className="text-slate-500">CPF:</b> {delivery.customerRefusalCpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>
                    </div>
                  ) : (
                    <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic">Não coletada</div>
                  )}
                  <span className="text-[10px] text-slate-500 font-medium mt-1.5 block">{delivery.customerName}</span>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white text-center2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider text-center mb-2">Assinatura do Entregador</span>
                  {delivery.delivererSignature ? (
                    <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1 flex-col">
                      <img
                        src={delivery.delivererSignature}
                        alt="Assinatura do Entregador"
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic text-center">Não coletada</div>
                  )}
                  <span className="text-[10px] text-slate-550 font-medium text-center mt-1.5 block">{delivery.delivererName}</span>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white text-center col-span-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider text-center mb-2">Foto da Entrega</span>
                  {delivery.deliveryPhoto ? (
                    <div className="h-[120px] w-full flex items-center justify-center border-b border-slate-100 pb-1 flex-col">
                      <img
                        src={delivery.deliveryPhoto}
                        alt="Foto da Entrega"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic text-center">Nenhuma foto registrada</div>
                  )}
                </div>
              </div>

              {delivery.assemblyStatus === 'MONTADO' && (
                <>
                  <div className="flex justify-between items-center bg-blue-50 text-blue-900 px-4 py-3 rounded-xl text-xs border border-blue-100 mt-4">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Status Montagem: Montado</span>
                    {delivery.assembledAt && (
                      <span className="font-semibold">
                        Em {new Date(delivery.assembledAt).toLocaleDateString('pt-BR')} às {new Date(delivery.assembledAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="border border-slate-200 rounded-xl p-3 bg-white text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Assinatura do Montador</span>
                      {delivery.assemblerSignature ? (
                        <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1 flex-col">
                          <img
                            src={delivery.assemblerSignature}
                            alt="Assinatura do Montador"
                            className="max-h-full max-w-full object-contain mix-blend-multiply"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic">Não disponível</div>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-xl p-3 bg-white text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Assinatura do Cliente (Montagem)</span>
                      {delivery.assemblyCustomerSignature ? (
                        <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1 flex-col">
                          <img
                            src={delivery.assemblyCustomerSignature}
                            alt="Assinatura do Cliente para Montagem"
                            className="max-h-full max-w-full object-contain mix-blend-multiply"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : delivery.assemblyCustomerRefusalName ? (
                        <div className="h-[90px] w-full flex flex-col items-center justify-center border-b border-slate-100 pb-1 bg-slate-50 text-[9px] text-slate-600">
                          <span className="font-bold text-rose-600 mb-1 block">Assinatura Recusada</span>
                          <span><b className="text-slate-500">Nome:</b> {delivery.assemblyCustomerRefusalName}</span>
                          <span><b className="text-slate-500">Nasc:</b> {new Date(delivery.assemblyCustomerRefusalDob as string).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                          <span><b className="text-slate-500">CPF:</b> {delivery.assemblyCustomerRefusalCpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>
                        </div>
                      ) : (
                        <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic">Não disponível</div>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-white text-center col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Foto do Produto Montado</span>
                      {delivery.assemblyPhoto ? (
                        <div className="h-[120px] w-full flex items-center justify-center border-b border-slate-100 pb-1 flex-col">
                          <img
                            src={delivery.assemblyPhoto}
                            alt="Foto da Montagem"
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic text-center">Nenhuma foto registrada</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="p-5 bg-slate-50 border border-slate-250/60 rounded-xl text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-slate-450 animate-pulse" />
              <span className="text-xs text-slate-600 font-semibold">Assinaturas e fotos de comprovação restritas a usuários administrativos.</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
            {isAdmin && onPrint && delivery.status === 'ENTREGUE' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrint(delivery);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Baixar Recibo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
