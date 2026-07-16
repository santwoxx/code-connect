import React, { useState, useRef, useEffect } from 'react';
import { Sale, PaymentMethod } from '../types';
import {
  enviarClienteParaAlterdata,
  enviarPedidoParaAlterdata,
  fixarPainelSempreVisivel,
  openFloatingReferencePanel
} from '../services/automation';
import { formatCurrency } from '../utils/format';

interface AlterdataModalProps {
  alterdataSale: Sale;
  onClose: () => void;
  onInvoiceSale: (
    saleId: string,
    caixa: PaymentMethod,
    splits: { method: PaymentMethod; amount: number; installments?: number }[]
  ) => Promise<void> | void;
}

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

export const AlterdataModal: React.FC<AlterdataModalProps> = ({
  alterdataSale,
  onClose,
  onInvoiceSale
}) => {
  const [step1Status, setStep1Status] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [step2Status, setStep2Status] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [layoutStatus, setLayoutStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const painelReferenciaRef = useRef<Window | null>(null);

  const [fieldByFieldOpen, setFieldByFieldOpen] = useState(false);
  const [stepNomeStatus, setStepNomeStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [stepNumeroStatus, setStepNumeroStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [stepCpfStatus, setStepCpfStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [stepCepStatus, setStepCepStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');

  useEffect(() => {
    return () => {
      if (painelReferenciaRef.current && !painelReferenciaRef.current.closed) {
        painelReferenciaRef.current.close();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-150 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        <div className="flex justify-between items-center border-b pb-3 shrink-0">
          <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span>Integração Alterdata - Pedido #{alterdataSale.id.replace('sale-', '').split('-')[0].slice(-6).toUpperCase()}</span>
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-650 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="text-left flex flex-col gap-5 overflow-y-auto pr-2 min-h-0">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-blue-50/50 border border-blue-100 p-4 rounded-xl shrink-0">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-blue-900 mb-1">Painel Flutuante</h4>
              <p className="text-[11px] text-blue-700/80 leading-relaxed">
                Integração de automação com o <strong>Alterdata local</strong>. Abra o painel de referência para manter os dados do pedido sempre visíveis.
              </p>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <button
                type="button"
                disabled={layoutStatus === 'loading'}
                onClick={async () => {
                  setLayoutStatus('loading');
                  painelReferenciaRef.current = openFloatingReferencePanel(
                    {
                      nome: alterdataSale.clientName,
                      cpf: alterdataSale.clientCpf ? formatCPF(alterdataSale.clientCpf) : '',
                      celular: alterdataSale.clientPhone || '',
                      cep: alterdataSale.clientCep || '',
                      endereco: alterdataSale.clientStreet || '',
                      numero: alterdataSale.clientNumber || '',
                      complemento: alterdataSale.clientComplement || '',
                      bairro: alterdataSale.clientNeighborhood || '',
                      cidade: alterdataSale.clientCity || '',
                      uf: alterdataSale.clientState || '',
                      produto: alterdataSale.productName,
                      sku: alterdataSale.productSku,
                      qtd: String(alterdataSale.quantity || 1),
                      valor: formatCurrency(alterdataSale.value / (alterdataSale.quantity || 1))
                    },
                    painelReferenciaRef.current
                  );
                  const res = await fixarPainelSempreVisivel();
                  setLayoutStatus(res.sucesso ? 'success' : 'error');
                }}
                className="w-full md:w-auto py-2.5 px-6 font-bold text-xs rounded-lg transition-colors cursor-pointer text-center bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2"
              >
                🖥️ Abrir Painel de Referência (sempre visível)
                {layoutStatus === 'success' && <span>✔</span>}
                {layoutStatus === 'error' && <span>❌</span>}
                {layoutStatus === 'loading' && <span className="animate-pulse">...</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 overflow-y-auto">
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold text-slate-800">1. Cadastro do Cliente</h4>
                <p className="text-[10px] text-slate-400">Mantenha a janela de Clientes do Alterdata aberta.</p>
              </div>
            </div>

            <div className="text-[10px] bg-white p-2.5 rounded-lg border border-slate-100 font-mono text-slate-600 space-y-1">
              <div><strong>Nome:</strong> {alterdataSale.clientName}</div>
              <div><strong>CPF/CNPJ:</strong> {alterdataSale.clientCpf ? formatCPF(alterdataSale.clientCpf) : 'Não informado'}</div>
              <div><strong>CEP:</strong> {alterdataSale.clientCep || 'Não informado'}</div>
            </div>

            {alterdataSale.status !== 'COMPLETED' && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Fature o pedido como Fechamento antes de integrar com o Alterdata.
              </p>
            )}

            <div className="pt-2 border-t border-slate-200/70 flex flex-col gap-2.5">
              <div className="flex justify-between items-start">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Preenchimento automático</p>
                {step1Status === 'success' && <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">✔ Enviado</span>}
                {step1Status === 'error' && <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 shrink-0">❌ Erro</span>}
                {step1Status === 'loading' && <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200 animate-pulse shrink-0">Enviando...</span>}
              </div>

              <button
                type="button"
                disabled={step1Status === 'loading' || alterdataSale.status !== 'COMPLETED'}
                onClick={async () => {
                  setStep1Status('loading');
                  const cleanCPF = (alterdataSale.clientCpf || '').replace(/\D/g, '');
                  const tipo_pessoa = cleanCPF.length === 14 ? 'Jurídica' : 'Física';
                  const res = await enviarClienteParaAlterdata({
                    nome: alterdataSale.clientName,
                    cpf: cleanCPF,
                    cep: (alterdataSale.clientCep || '').replace(/\D/g, ''),
                    endereco: alterdataSale.clientStreet || '',
                    numero: alterdataSale.clientNumber || '',
                    bairro: alterdataSale.clientNeighborhood || '',
                    cidade: alterdataSale.clientCity || '',
                    uf: alterdataSale.clientState || '',
                    celular: (alterdataSale.clientPhone || '').replace(/\D/g, ''),
                    tipo_pessoa
                  });
                  setStep1Status(res.sucesso ? 'success' : 'error');
                }}
                className={`w-full py-2 font-bold text-xs rounded-lg transition-colors cursor-pointer text-center border ${
                  step1Status === 'success'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/50'
                    : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {step1Status === 'success' ? 'Reenviar Cadastro' : 'Enviar Cadastro (automático)'}
              </button>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setFieldByFieldOpen(o => !o)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  {fieldByFieldOpen ? 'Ocultar envio campo a campo' : 'Enviar campo a campo (supervisionado)'}
                </button>

                {fieldByFieldOpen && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <div className="min-w-0 truncate">
                        <span className="text-[10px] font-bold text-slate-700">Nome: </span>
                        <span className="text-[10px] text-slate-500">{alterdataSale.clientName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {stepNomeStatus === 'success' && <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">✔</span>}
                        {stepNomeStatus === 'error' && <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded-full border border-rose-200">❌</span>}
                        {stepNomeStatus === 'loading' && <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-full border border-blue-200 animate-pulse">...</span>}
                        <button
                          type="button"
                          disabled={stepNomeStatus === 'loading' || alterdataSale.status !== 'COMPLETED'}
                          onClick={async () => {
                            setStepNomeStatus('loading');
                            const res = await enviarClienteParaAlterdata({ nome: alterdataSale.clientName });
                            setStepNomeStatus(res.sucesso ? 'success' : 'error');
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                        >Enviar</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <div className="min-w-0 truncate">
                        <span className="text-[10px] font-bold text-slate-700">Número: </span>
                        <span className="text-[10px] text-slate-500">{alterdataSale.clientNumber || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {stepNumeroStatus === 'success' && <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">✔</span>}
                        {stepNumeroStatus === 'error' && <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded-full border border-rose-200">❌</span>}
                        {stepNumeroStatus === 'loading' && <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-full border border-blue-200 animate-pulse">...</span>}
                        <button
                          type="button"
                          disabled={stepNumeroStatus === 'loading' || alterdataSale.status !== 'COMPLETED'}
                          onClick={async () => {
                            setStepNumeroStatus('loading');
                            const res = await enviarClienteParaAlterdata({ numero: alterdataSale.clientNumber || '' });
                            setStepNumeroStatus(res.sucesso ? 'success' : 'error');
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                        >Enviar</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <div className="min-w-0 truncate">
                        <span className="text-[10px] font-bold text-slate-700">CPF/CNPJ: </span>
                        <span className="text-[10px] text-slate-500">{alterdataSale.clientCpf ? formatCPF(alterdataSale.clientCpf) : 'Não informado'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {stepCpfStatus === 'success' && <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">✔</span>}
                        {stepCpfStatus === 'error' && <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded-full border border-rose-200">❌</span>}
                        {stepCpfStatus === 'loading' && <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-full border border-blue-200 animate-pulse">...</span>}
                        <button
                          type="button"
                          disabled={stepCpfStatus === 'loading' || alterdataSale.status !== 'COMPLETED'}
                          onClick={async () => {
                            setStepCpfStatus('loading');
                            const cleanCPF = (alterdataSale.clientCpf || '').replace(/\D/g, '');
                            const tipo_pessoa = cleanCPF.length === 14 ? 'Jurídica' : 'Física';
                            const res = await enviarClienteParaAlterdata({ cpf: cleanCPF, tipo_pessoa });
                            setStepCpfStatus(res.sucesso ? 'success' : 'error');
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                        >Enviar</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <div className="min-w-0 truncate">
                        <span className="text-[10px] font-bold text-slate-700">CEP: </span>
                        <span className="text-[10px] text-slate-500">{alterdataSale.clientCep || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {stepCepStatus === 'success' && <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">✔</span>}
                        {stepCepStatus === 'error' && <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded-full border border-rose-200">❌</span>}
                        {stepCepStatus === 'loading' && <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-full border border-blue-200 animate-pulse">...</span>}
                        <button
                          type="button"
                          disabled={stepCepStatus === 'loading' || alterdataSale.status !== 'COMPLETED'}
                          onClick={async () => {
                            setStepCepStatus('loading');
                            const res = await enviarClienteParaAlterdata({ cep: (alterdataSale.clientCep || '').replace(/\D/g, '') });
                            setStepCepStatus(res.sucesso ? 'success' : 'error');
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                        >Enviar</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>


            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-4 h-fit">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold text-slate-800">2. Itens do Pedido</h4>
                <p className="text-[10px] text-slate-400">Mantenha a janela de Lançamento de Itens no Alterdata aberta.</p>
              </div>
              {step2Status === 'success' && <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">✔ Enviado</span>}
              {step2Status === 'error' && <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">❌ Erro</span>}
              {step2Status === 'loading' && <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">Enviando...</span>}
            </div>

            <div className="text-[10px] bg-white p-2.5 rounded-lg border border-slate-100 font-mono text-slate-600 space-y-1">
              <div><strong>Produto:</strong> {alterdataSale.productName}</div>
              <div><strong>SKU:</strong> {alterdataSale.productSku}</div>
              <div><strong>Qtd:</strong> {alterdataSale.quantity || 1} • <strong>Valor Unitário:</strong> {formatCurrency(alterdataSale.value / (alterdataSale.quantity || 1))}</div>
            </div>

            {alterdataSale.status !== 'COMPLETED' && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Fature o pedido como Fechamento antes de integrar com o Alterdata.
              </p>
            )}

            <button
              type="button"
              disabled={step2Status === 'loading' || alterdataSale.status !== 'COMPLETED'}
              onClick={async () => {
                setStep2Status('loading');
                const unitPrice = alterdataSale.value / (alterdataSale.quantity || 1);
                const formattedPrice = unitPrice.toFixed(2).replace('.', ',');
                
                const res = await enviarPedidoParaAlterdata({
                  cliente: alterdataSale.clientName,
                  produtos: [
                    {
                      codigo: alterdataSale.productSku,
                      quantidade: alterdataSale.quantity || 1,
                      desconto: 0,
                      valor: formattedPrice
                    }
                  ]
                });
                setStep2Status(res.sucesso ? 'success' : 'error');
              }}
              className={`w-full py-2 font-bold text-xs rounded-lg transition-colors cursor-pointer text-center ${
                step2Status === 'success' 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/50' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
            >
              {step2Status === 'success' ? 'Reenviar Itens do Pedido' : 'Enviar Itens do Pedido'}
            </button>
          </div>
            </div>
          </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            {alterdataSale.status === 'COMPLETED' ? 'Fechar' : 'Cancelar'}
          </button>
          
          {alterdataSale.status === 'PENDING' ? (
            <button
              type="button"
              onClick={async () => {
                const saleId = alterdataSale.id;
                const saleVal = alterdataSale.value;
                onClose();
                await onInvoiceSale(saleId, 'CENTRAL', [{ method: 'DINHEIRO', amount: saleVal }]);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              Concluir Faturamento no Sistema
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed"
            >
              ✔ Já Faturado no Sistema
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
