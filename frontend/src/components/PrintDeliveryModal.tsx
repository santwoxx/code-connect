import React from 'react';
import { Printer, X, Calendar, User, MapPin, Lock } from 'lucide-react';
import { Delivery } from '../types';
import { OWNER_EMAILS } from '../config/adminEmails';

interface PrintDeliveryModalProps {
  delivery: Delivery | null;
  onClose: () => void;
  userRole?: string;
  currentUserEmail?: string;
}

export const PrintDeliveryModal: React.FC<PrintDeliveryModalProps> = ({ 
  delivery, 
  onClose,
  userRole,
  currentUserEmail
}) => {
  const isAdmin =
    userRole === 'admin' ||
    userRole === 'Proprietário / Adm Geral' ||
    (currentUserEmail !== undefined && OWNER_EMAILS.includes(currentUserEmail.trim().toLowerCase()));
  if (!delivery) return null;

  const handlePrint = () => {
    window.print();
  };

  const deliveryDate = new Date(delivery.scheduledDate + 'T12:00:00'); // avoiding timezone shift
  const deliveredDate = delivery.deliveredAt ? new Date(delivery.deliveredAt) : null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0">
      {/* Container Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 transform scale-100 transition-all duration-300 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Modal Header (hidden in print) */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">Imprimir Recibo de Entrega</span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-sans space-y-6 text-slate-800 print:overflow-visible print:p-0 print:text-black" id="print-section-delivery">
          
          {/* Company Brand Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1 text-slate-900 print:text-black">
            <h2 className="text-xl font-black tracking-tight uppercase">CentralSync Logística</h2>
            <p className="text-xs font-semibold text-slate-500 print:text-slate-800">Comprovante de Expedição e Assinatura Digital</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50 uppercase tracking-wider mt-1 print:border-black">
              ✔ Lote Entregue e Assinado
            </span>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 print:bg-white print:border-slate-300 print:border">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">ID do Lote</span>
              <span className="font-mono font-bold text-slate-850 break-all print:text-black">{delivery.id}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Data Programada</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 print:text-black">
                <Calendar className="w-3.5 h-3.5 text-slate-400 print:hidden" />
                {deliveryDate.toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Responsável (Entregador)</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 print:text-black">
                <User className="w-3.5 h-3.5 text-slate-400 print:hidden" />
                {delivery.delivererName}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Data de Baixa / Entrega</span>
              <span className="font-semibold text-emerald-700 print:text-black">
                {deliveredDate 
                  ? `${deliveredDate.toLocaleDateString('pt-BR')} às ${deliveredDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Destinatário & Local</h4>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium font-sans">Nome do Cliente:</span>
                <span className="font-bold text-slate-900 print:text-black">{delivery.customerName}</span>
              </div>
              <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" /> Endereço de Entrega
                </span>
                <span className="text-slate-700 font-medium leading-relaxed print:text-black mt-0.5">
                  {delivery.address}
                </span>
              </div>
            </div>
          </div>

          {/* Product Items Details Section */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Móveis e Volume</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300 print:border">
              <span className="font-bold text-slate-900 text-sm print:text-black whitespace-pre-wrap leading-relaxed block">
                {delivery.itemsDescription}
              </span>
            </div>
          </div>

          {/* Delivery Notes */}
          {delivery.notes && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Observações / Referências</h4>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed italic print:bg-white print:border-slate-300 print:border print:text-black">
                "{delivery.notes}"
              </p>
            </div>
          )}

          {/* Dual Signatures Section */}
          {isAdmin ? (
            <div className="pt-6 border-t border-dashed border-slate-200 space-y-4">
              <h4 className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider">Assinaturas de Comprovação Digital</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-3 bg-white text-center print:border-slate-300">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Assinatura da Cliente</span>
                  {delivery.customerSignature ? (
                    <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1">
                      <img 
                        src={delivery.customerSignature} 
                        alt="Assinatura da Cliente" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
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
                  <span className="text-[10px] text-slate-600 font-bold mt-1.5 block leading-tight">{delivery.customerName}</span>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white text-center print:border-slate-300">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Assinatura do Entregador</span>
                  {delivery.delivererSignature ? (
                    <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1">
                      <img 
                        src={delivery.delivererSignature} 
                        alt="Assinatura do Entregador" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>
                  ) : (
                    <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic">Não coletada</div>
                  )}
                  <span className="text-[10px] text-slate-600 font-bold mt-1.5 block leading-tight">{delivery.delivererName}</span>
                </div>
              </div>

              {/* Assembly Signatures */}
              {delivery.assemblyStatus === 'MONTADO' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="border border-slate-200 rounded-xl p-3 bg-white text-center print:border-slate-300">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Assinatura do Cliente (Montagem)</span>
                    {delivery.assemblyCustomerSignature ? (
                      <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1">
                        <img 
                          src={delivery.assemblyCustomerSignature} 
                          alt="Assinatura da Cliente na Montagem" 
                          className="max-h-full max-w-full object-contain mix-blend-multiply"
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
                      <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic">Não coletada</div>
                    )}
                    <span className="text-[10px] text-slate-600 font-bold mt-1.5 block leading-tight">{delivery.customerName}</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-white text-center print:border-slate-300">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Assinatura do Montador</span>
                    {delivery.assemblerSignature ? (
                      <div className="h-[90px] w-full flex items-center justify-center border-b border-slate-100 pb-1">
                        <img 
                          src={delivery.assemblerSignature} 
                          alt="Assinatura do Montador" 
                          className="max-h-full max-w-full object-contain mix-blend-multiply"
                        />
                      </div>
                    ) : (
                      <div className="h-[90px] w-full bg-slate-50 text-slate-450 text-[10px] flex items-center justify-center italic">Não coletada</div>
                    )}
                    <span className="text-[10px] text-slate-600 font-bold mt-1.5 block leading-tight">{delivery.assemblerName}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-6 border-t border-dashed border-slate-200 space-y-4 text-center text-slate-500 text-xs">
              <Lock className="w-5 h-5 mx-auto text-slate-400" />
              <span className="font-semibold block">Assinaturas restritas a usuários administrativos.</span>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-center pt-4">
            <p className="text-[9px] text-slate-400 leading-normal max-w-xs mx-auto print:text-slate-600">
              Este recibo certifica que a entrega foi realizada e as assinaturas foram registradas digitalmente no sistema CentralSync ERP em conformidade com as regras operacionais da empresa.
            </p>
          </div>

        </div>

        {/* Modal Actions Footer (hidden in print) */}
        <div className="p-4 bg-slate-50 border-t flex gap-3 justify-end shrink-0 print:hidden">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Voltar
          </button>
          
          <button 
            type="button" 
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Recibo</span>
          </button>
        </div>

      </div>
    </div>
  );
};
