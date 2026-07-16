import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, AlertTriangle, CheckCircle, Send, Loader2 } from 'lucide-react';
import { Sale } from '../../types';
import { formatCurrency } from '../../utils/format';

interface SimulatedNfeModalProps {
  sale: Sale;
  onClose: () => void;
  formatCPF: (cpf: string) => string;
}

export const SimulatedNfeModal: React.FC<SimulatedNfeModalProps> = ({
  sale,
  onClose,
  formatCPF
}) => {
  const [nfeStep, setNfeStep] = useState<'VALIDATE' | 'PREVIEW' | 'TRANSMITTING' | 'SUCCESS'>('VALIDATE');
  const [nfeErrors, setNfeErrors] = useState<string[]>([]);
  const [nfeXmlMock, setNfeXmlMock] = useState('');

  useEffect(() => {
    setNfeStep('VALIDATE');
    setNfeErrors([]);

    const errors: string[] = [];
    if (!sale.clientCpf) errors.push("CPF do cliente ausente.");
    if (!sale.clientCep) errors.push("CEP do endereço ausente.");
    if (!sale.clientStreet) errors.push("Logradouro/Rua do endereço ausente.");
    if (!sale.clientNumber) errors.push("Número da residência ausente.");
    if (!sale.clientNeighborhood) errors.push("Bairro do endereço ausente.");
    if (!sale.clientCity) errors.push("Cidade do endereço ausente.");
    if (!sale.clientState) errors.push("Estado/UF do endereço ausente.");

    if (errors.length > 0) {
      setNfeErrors(errors);
    } else {
      const taxPercent = 18; // 18% ICMS
      const taxValue = (sale.value * taxPercent) / 100;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe312606${sale.id.replace(/\D/g, '').slice(0, 38)}" versao="4.00">
      <ide>
        <cUF>31</cUF>
        <cNF>${Math.floor(Math.random() * 90000000 + 10000000)}</cNF>
        <natOp>VENDA MERC. ADQ. TERC</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${Math.floor(Math.random() * 10000 + 100)}</nNF>
        <dhEmi>${new Date(sale.createdAt).toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>14313394000142</CNPJ>
        <xNome>EAX MOVEIS LTDA</xNome>
        <xFant>CENTRAL SYNC ERP</xFant>
      </emit>
      <dest>
        <CPF>${sale.clientCpf}</CPF>
        <xNome>${sale.clientName.toUpperCase()}</xNome>
        <enderDest>
          <xLgr>${sale.clientStreet.toUpperCase()}</xLgr>
          <nro>${sale.clientNumber}</nro>
          <xBairro>${sale.clientNeighborhood.toUpperCase()}</xBairro>
          <cMun>${sale.clientCity.toUpperCase()}</cMun>
          <xMun>${sale.clientCity.toUpperCase()}</xMun>
          <UF>${sale.clientState}</UF>
          <CEP>${sale.clientCep}</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>${sale.productSku}</cProd>
          <xProd>${sale.productName.toUpperCase()}</xProd>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>${sale.value.toFixed(4)}</vUnCom>
          <vProd>${sale.value.toFixed(2)}</vProd>
        </prod>
        <imposto>
          <vTotTrib>${taxValue.toFixed(2)}</vTotTrib>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>${sale.value.toFixed(2)}</vBC>
              <pICMS>${taxPercent}.00</pICMS>
              <vICMS>${taxValue.toFixed(2)}</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>${sale.value.toFixed(2)}</vBC>
          <vICMS>${taxValue.toFixed(2)}</vICMS>
          <vProd>${sale.value.toFixed(2)}</vProd>
          <vNF>${sale.value.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
      setNfeXmlMock(xml);
      setNfeStep('PREVIEW');
    }
  }, [sale]);

  const handleTransmitNfe = () => {
    setNfeStep('TRANSMITTING');
    setTimeout(() => {
      setNfeStep('SUCCESS');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 shrink-0">
          <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Simulador de Emissão de Nota Fiscal (NF-e)</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        {/* Step 1: Validate Fields */}
        {nfeStep === 'VALIDATE' && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-rose-50 border border-rose-250 text-rose-800 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs">Dados Fiscais Faltantes</h4>
                <p className="text-[11px] text-rose-600">A Nota Fiscal Eletrônica (NF-e Modelo 55) exige o CPF e o endereço completo para autorização da Sefaz. Resolva as seguintes pendências:</p>
                <ul className="list-disc pl-4 text-[10px] space-y-0.5 mt-2 font-semibold">
                  {nfeErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border">
              👉 <strong>Como resolver?</strong> Feche este painel, clique em "Editar" (ícone do lápis) na linha do pedido e preencha todos os campos do endereço (Rua, Número, CEP, Bairro, Cidade, Estado) e o CPF correto do comprador.
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview XML & Danfe */}
        {nfeStep === 'PREVIEW' && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-left">
            <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-850 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Todos os dados fiscais estão validados com sucesso! Pronto para transmissão.</span>
            </div>

            {/* DANFE Preview Mock */}
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white text-[9px] font-mono leading-normal">
              <div className="bg-slate-100 p-2.5 border-b border-slate-300 flex justify-between font-bold text-[10px]">
                <span>RECEBEMOS DE EAX MÓVEIS LTDA OS PRODUTOS DA NF-E INDICADA AO LADO</span>
                <span>NF-e Nº 000.045.922</span>
              </div>
              <div className="p-3 grid grid-cols-3 gap-3 border-b border-slate-300">
                <div className="col-span-2 space-y-1">
                  <strong className="text-xs block">EAX MÓVEIS LTDA</strong>
                  <p>AV. CINQUENTENÁRIO - CENTRO - ITABUNA - BA - CEP: 45600-006</p>
                  <p>TEL: (73) 99939-2585</p>
                </div>
                <div className="border border-slate-350 p-2 rounded text-center bg-slate-50 font-bold space-y-1">
                  <span className="block text-[8px] text-slate-500">DANFE</span>
                  <span className="text-[10px] block">DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA</span>
                  <span className="text-[8px] font-normal block">0 - ENTRADA / 1 - SAÍDA</span>
                  <span className="text-[11px] block">1</span>
                </div>
              </div>
              <div className="p-3 border-b border-slate-300 space-y-1">
                <div className="font-bold uppercase text-slate-400 text-[8px] tracking-wider mb-1">Destinatário / Remetente</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><strong>NOME / RAZÃO SOCIAL:</strong> <br /> {sale.clientName.toUpperCase()}</div>
                  <div><strong>CPF:</strong> <br /> {formatCPF(sale.clientCpf || '')}</div>
                  <div><strong>DATA DE EMISSÃO:</strong> <br /> {new Date(sale.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1.5">
                  <div className="col-span-2"><strong>ENDEREÇO:</strong> <br /> {(sale.clientStreet || '').toUpperCase()}, {sale.clientNumber} - {(sale.clientNeighborhood || '').toUpperCase()}</div>
                  <div><strong>CIDADE / UF:</strong> <br /> {(sale.clientCity || '').toUpperCase()} / {sale.clientState}</div>
                </div>
              </div>
              <div className="p-3 border-b border-slate-300">
                <div className="font-bold uppercase text-slate-400 text-[8px] tracking-wider mb-1">Cálculo do Imposto</div>
                <div className="grid grid-cols-4 gap-2 text-right">
                  <div className="text-left"><strong>BASE DE CÁLC. ICMS</strong> <br /> {formatCurrency(sale.value)}</div>
                  <div><strong>VALOR DO ICMS (18%)</strong> <br /> {formatCurrency((sale.value * 18) / 100)}</div>
                  <div><strong>VALOR DO IPI</strong> <br /> R$ 0,00</div>
                  <div className="font-bold text-slate-900"><strong>VALOR TOTAL DA NOTA</strong> <br /> {formatCurrency(sale.value)}</div>
                </div>
              </div>
            </div>

            {/* XML Payload Preview collapsible */}
            <details className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <summary className="p-2.5 text-[11px] font-bold text-slate-600 bg-slate-100 cursor-pointer select-none">
                Visualizar XML da NF-e (Metadados de Transmissão)
              </summary>
              <pre className="p-3 text-[9px] font-mono overflow-x-auto bg-slate-900 text-slate-200 max-h-40">
                {nfeXmlMock}
              </pre>
            </details>

            <div className="flex justify-end gap-3 pt-3 border-t shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-655 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransmitNfe}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Transmitir para SEFAZ</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Transmitting */}
        {nfeStep === 'TRANSMITTING' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <Loader2 className="w-12 h-12 text-indigo-650 animate-spin" />
            <div>
              <h4 className="font-bold text-sm text-slate-900">Transmitindo NF-e para o WebService Sefaz...</h4>
              <p className="text-xs text-slate-450 mt-1 max-w-xs mx-auto">Assinando digitalmente o XML, validando lote de notas e verificando status da receita.</p>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {nfeStep === 'SUCCESS' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-black text-lg text-slate-900">NF-e Emitida com Sucesso!</h4>
              <p className="text-xs text-slate-500 mt-1">A nota fiscal foi processada, autorizada e já está disponível para impressão e envio ao cliente.</p>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl text-xs space-y-2 text-left font-mono w-full">
              <div className="flex justify-between">
                <span>Chave de Acesso:</span>
                <span className="font-bold text-slate-800 break-all select-all">3126 0614 3133 9400 0142 5500 1000 0459 2210 2489 1234</span>
              </div>
              <div className="flex justify-between">
                <span>Protocolo de Autorização:</span>
                <span className="font-bold text-slate-800">13126049382218 [Sefaz BA]</span>
              </div>
            </div>

            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Imprimir DANFE
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-slate-200 text-slate-655 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
