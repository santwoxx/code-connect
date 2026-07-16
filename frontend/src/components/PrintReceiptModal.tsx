import React from 'react';
import { Printer, X, Calendar, User, Phone } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency } from '../utils/format';

interface PrintReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const saleDate = new Date(sale.createdAt);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0">
      {/* Container Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-250 transform scale-100 transition-all duration-300 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Modal Header (hidden in print) */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">Visualização do Recibo</span>
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
        <div className="p-6 overflow-y-auto flex-1 font-sans space-y-6 text-slate-800 print:overflow-visible print:p-0 print:text-black" id="print-section">
          
          {/* Company Brand Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1 text-slate-900 print:text-black">
            <h2 className="text-xl font-black tracking-tight uppercase">CentralSync ERP</h2>
            <p className="text-xs font-semibold text-slate-500 print:text-slate-800">Showroom e Estoque Central de Móveis</p>
            <p className="text-[10px] text-slate-455 font-mono print:text-slate-700">{sale.status === 'PENDING' ? 'PROPOSTA DE ORÇAMENTO COMERCIAL' : 'COMPROVANTE DE VENDA / PEDIDO'}</p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-150 print:bg-white print:border-slate-300 print:border">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ID do Pedido</span>
              <span className="font-mono font-bold text-slate-800 break-all print:text-black">{sale.id.replace('sale-', '').split('-')[0].slice(-6)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Data e Hora</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 print:text-black">
                <Calendar className="w-3.5 h-3.5 text-slate-400 print:hidden" />
                {saleDate.toLocaleDateString('pt-BR')} às {saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Canal de Origem</span>
              <span className="font-semibold text-slate-700 print:text-black">{sale.origin || 'Mostruário'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Vendedor</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 print:text-black">
                <User className="w-3.5 h-3.5 text-slate-400 print:hidden" />
                {sale.sellerName}
              </span>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Identificação do Cliente</h4>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nome do Cliente:</span>
                <span className="font-bold text-slate-900 print:text-black">{sale.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">CPF do Comprador:</span>
                <span className="font-bold text-slate-900 font-mono print:text-black">{sale.clientCpf ? formatCPF(sale.clientCpf) : 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">WhatsApp / Tel:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 print:text-black">
                  <Phone className="w-3.5 h-3.5 text-slate-400 print:hidden" />
                  {sale.clientPhone}
                </span>
              </div>
              {(sale.clientStreet || sale.clientCity) && (
                <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Endereço de Emissão / Entrega</span>
                  <span className="text-slate-700 font-medium leading-relaxed print:text-black">
                    {sale.clientStreet}, {sale.clientNumber}
                    {sale.clientComplement ? ` - ${sale.clientComplement}` : ''}
                    {sale.clientNeighborhood ? <br /> : ''}{sale.clientNeighborhood}{sale.clientNeighborhood && sale.clientCity ? ' - ' : ''}{sale.clientCity}{sale.clientCity && sale.clientState ? ' / ' : ''}{sale.clientState}
                    {sale.clientCep ? ` - CEP: ${formatCEP(sale.clientCep)}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product Items Details Section */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Itens do Pedido</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3 print:bg-white print:border-slate-300 print:border">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-0.5">
                  <span className="font-black text-slate-950 text-sm print:text-black">{sale.productName}</span>
                  <div className="flex gap-2 text-[10px] text-slate-500 font-mono print:text-slate-800">
                    <span>SKU: {sale.productSku}</span>
                    <span>•</span>
                    <span>Categoria: {sale.productCategory}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-900 font-mono print:text-black">{formatCurrency(sale.value)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center shadow-xs print:bg-white print:text-black print:border-slate-300 print:border">
            <span className="text-xs font-bold uppercase tracking-wider print:text-slate-700">{sale.status === 'PENDING' ? 'Valor Total' : 'Valor Total Pago'}</span>
            <span className="text-lg font-black font-mono print:text-black">{formatCurrency(sale.value)}</span>
          </div>

          {/* Delivery & Fiscal Info */}
          {sale.status === 'COMPLETED' && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Informações da Entrega</h4>
              <p className="text-xs text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-100 leading-relaxed print:bg-white print:border-slate-300 print:text-black">
                Nota fiscal enviada via e-mail.<br />
                Prazo de entrega: 7 dias úteis + 4 dias úteis para montagem, podendo haver atraso.
              </p>
            </div>
          )}

          {/* Sale Notes */}
          {sale.notes && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Observações do Pedido</h4>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-150 leading-relaxed italic print:bg-white print:border-slate-300 print:border print:text-black">
                "{sale.notes}"
              </p>
            </div>
          )}

          {/* Signature Area (thermal receipt style) */}
          <div className="pt-8 text-center border-t border-dashed border-slate-200">
            <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto print:text-slate-800">
              Ao assinar este documento, o cliente declara que recebeu as mercadorias descritas em perfeito estado e conformidade.
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
            <span>Imprimir Pedido</span>
          </button>
        </div>

      </div>
    </div>
  );
};
