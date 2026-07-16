import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, Loader2, X, FileCheck2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export interface TaxInputItem {
  id: string;
  produto: string;
  atividade: 'Comercio' | 'Servico';
  custoCompra: string;
  ipi: string;
  frete: string;
  desconto: string;
  creditoIcms: string;
  antecipacaoParcial: string;
}

export interface TaxResultItem {
  id: string; // Refers back to the original item ID (SKU or internal ID)
  produto: string;
  custoLiquido: number;
  denominador: number;
  cargaTributaria: number;
  precoVenda: number;
  markup: number;
  impostos: number;
  lucroLiquido: number;
}

interface TaxCalculatorModalProps {
  initialItems: {
    id: string;
    name: string;
    costPrice: number;
  }[];
  onClose: () => void;
  onConfirm: (results: TaxResultItem[]) => void;
  title?: string;
  description?: string;
}

export const TaxCalculatorModal: React.FC<TaxCalculatorModalProps> = ({
  initialItems,
  onClose,
  onConfirm,
  title = "Calculadora de Preço de Venda",
  description = "Preencha os valores adicionais da nota para calcular o custo líquido e o preço final sugerido."
}) => {
  const [step, setStep] = useState<'INPUT' | 'CALCULATING' | 'RESULT'>('INPUT');
  const [error, setError] = useState<string | null>(null);
  
  const [rows, setRows] = useState<TaxInputItem[]>([]);
  const [results, setResults] = useState<TaxResultItem[]>([]);

  useEffect(() => {
    // Initialize rows from props
    setRows(initialItems.map(item => ({
      id: item.id,
      produto: item.name || 'Produto sem nome',
      atividade: 'Comercio',
      custoCompra: item.costPrice > 0 ? item.costPrice.toString() : '',
      ipi: '',
      frete: '',
      desconto: '',
      creditoIcms: '',
      antecipacaoParcial: ''
    })));
  }, [initialItems]);

  const updateRow = (id: string, field: keyof TaxInputItem, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const applyToAll = (field: keyof TaxInputItem, value: string) => {
    if (!value) return;
    setRows(rows.map(r => ({ ...r, [field]: value })));
  };

  const handleCalculate = async () => {
    setStep('CALCULATING');
    setError(null);
    try {
      const payload = rows.map(r => ({
        produto: r.produto || 'Item sem nome',
        atividade: r.atividade,
        custoCompra: Number(r.custoCompra) || 0,
        ipi: Number(r.ipi) || 0,
        frete: Number(r.frete) || 0,
        desconto: Number(r.desconto) || 0,
        creditoIcms: Number(r.creditoIcms) || 0,
        antecipacaoParcial: Number(r.antecipacaoParcial) || 0,
        creditoPisCofins: 0
      }));

      const response = await fetch('https://backend-centrasync.onrender.com/api/tax/calculate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'dev-secret-key'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao calcular tributos.');
      }

      // Map back the results to their IDs
      const mappedResults: TaxResultItem[] = data.data.map((res: any, index: number) => ({
        id: rows[index].id,
        ...res
      }));

      setResults(mappedResults);
      setStep('RESULT');
    } catch (err: any) {
      setError(err.message || 'Falha de conexão com a API de Cálculos Fiscais.');
      setStep('INPUT');
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b p-5 shrink-0 bg-slate-50">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-600" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-bold mb-4 shrink-0 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* INPUT STEP */}
          {step === 'INPUT' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl shadow-inner">
                <table className="w-full text-left text-xs whitespace-nowrap min-w-[1200px]">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 w-8 text-center">#</th>
                      <th className="p-3 w-48">Produto</th>
                      <th className="p-3 w-28">Atividade</th>
                      <th className="p-3 w-24 text-right">Custo Base (R$)</th>
                      <th className="p-3 w-24 text-right">
                        <div>IPI (R$)</div>
                        {rows.length > 1 && <button onClick={() => { const val = prompt("Valor IPI padrão (R$):"); if(val) applyToAll('ipi', val.replace(',', '.')); }} className="text-[9px] text-blue-600 font-normal hover:underline cursor-pointer">Aplicar todos</button>}
                      </th>
                      <th className="p-3 w-24 text-right">
                        <div>Frete (R$)</div>
                        {rows.length > 1 && <button onClick={() => { const val = prompt("Valor Frete padrão (R$):"); if(val) applyToAll('frete', val.replace(',', '.')); }} className="text-[9px] text-blue-600 font-normal hover:underline cursor-pointer">Aplicar todos</button>}
                      </th>
                      <th className="p-3 w-24 text-right">Desconto (R$)</th>
                      <th className="p-3 w-24 text-right">Créd. ICMS (R$)</th>
                      <th className="p-3 w-24 text-right">Antecip. ICMS (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={row.produto} 
                            onChange={(e) => updateRow(row.id, 'produto', e.target.value)}
                            className="w-full border-slate-200 rounded text-xs px-2 py-1.5 focus:ring-1 focus:ring-indigo-500"
                            placeholder="Nome do produto..."
                            readOnly
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            value={row.atividade} 
                            onChange={(e) => updateRow(row.id, 'atividade', e.target.value)}
                            className="w-full border-slate-200 rounded text-xs px-2 py-1.5 bg-slate-50 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Comercio">Comércio</option>
                            <option value="Servico">Serviço</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="number" value={row.custoCompra} onChange={(e) => updateRow(row.id, 'custoCompra', e.target.value)} className="w-full border-slate-200 rounded text-xs px-2 py-1.5 text-right font-mono text-blue-800 font-bold bg-blue-50/50" placeholder="0.00" />
                        </td>
                        <td className="p-2">
                          <input type="number" value={row.ipi} onChange={(e) => updateRow(row.id, 'ipi', e.target.value)} className="w-full border-slate-200 rounded text-xs px-2 py-1.5 text-right font-mono" placeholder="0.00" />
                        </td>
                        <td className="p-2">
                          <input type="number" value={row.frete} onChange={(e) => updateRow(row.id, 'frete', e.target.value)} className="w-full border-slate-200 rounded text-xs px-2 py-1.5 text-right font-mono" placeholder="0.00" />
                        </td>
                        <td className="p-2">
                          <input type="number" value={row.desconto} onChange={(e) => updateRow(row.id, 'desconto', e.target.value)} className="w-full border-slate-200 rounded text-xs px-2 py-1.5 text-right font-mono" placeholder="0.00" />
                        </td>
                        <td className="p-2">
                          <input type="number" value={row.creditoIcms} onChange={(e) => updateRow(row.id, 'creditoIcms', e.target.value)} className="w-full border-slate-200 rounded text-xs px-2 py-1.5 text-right font-mono text-emerald-600" placeholder="0.00" />
                        </td>
                        <td className="p-2">
                          <input type="number" value={row.antecipacaoParcial} onChange={(e) => updateRow(row.id, 'antecipacaoParcial', e.target.value)} className="w-full border-slate-200 rounded text-xs px-2 py-1.5 text-right font-mono text-rose-600" placeholder="0.00" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CALCULATING STEP */}
          {step === 'CALCULATING' && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <h4 className="font-bold text-sm text-slate-900">Aplicando motor tributário em lote...</h4>
              <p className="text-xs text-slate-500">Calculando Margem, Custo Líquido e Denominador.</p>
            </div>
          )}

          {/* RESULT STEP */}
          {step === 'RESULT' && results.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl shadow-inner">
                <table className="w-full text-left text-xs whitespace-nowrap min-w-[1200px]">
                  <thead className="bg-slate-800 text-slate-200 font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 w-48">Produto</th>
                      <th className="p-3 text-right">Custo Líquido</th>
                      <th className="p-3 text-center">T Aplicado</th>
                      <th className="p-3 text-center">Denominador</th>
                      <th className="p-3 text-right bg-indigo-900/50">Preço de Venda</th>
                      <th className="p-3 text-center">Markup</th>
                      <th className="p-3 text-right text-rose-200">Impostos (R$)</th>
                      <th className="p-3 text-right text-emerald-200">Lucro Líq. (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((res, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors bg-white">
                        <td className="p-3 font-semibold text-slate-700 truncate max-w-[200px]" title={res.produto}>{res.produto}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(res.custoLiquido)}</td>
                        <td className="p-3 text-center font-mono">{(res.cargaTributaria * 100).toFixed(2)}%</td>
                        <td className="p-3 text-center font-mono">{(res.denominador * 100).toFixed(2)}%</td>
                        <td className="p-3 text-right font-mono font-black text-indigo-700 bg-indigo-50/30 text-sm">{formatCurrency(res.precoVenda)}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{res.markup.toFixed(2)}x</td>
                        <td className="p-3 text-right font-mono text-rose-600">{formatCurrency(res.impostos)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(res.lucroLiquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <tr>
                      <td className="p-3 text-right" colSpan={4}>TOTAL:</td>
                      <td className="p-3 text-right font-black text-indigo-800 text-sm">{formatCurrency(results.reduce((acc, curr) => acc + curr.precoVenda, 0))}</td>
                      <td></td>
                      <td className="p-3 text-right text-rose-700">{formatCurrency(results.reduce((acc, curr) => acc + curr.impostos, 0))}</td>
                      <td className="p-3 text-right text-emerald-700">{formatCurrency(results.reduce((acc, curr) => acc + curr.lucroLiquido, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-slate-50 shrink-0 flex justify-end gap-3">
          {step === 'RESULT' ? (
            <>
              <button onClick={() => setStep('INPUT')} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold bg-white hover:bg-slate-50 cursor-pointer">
                Voltar e Editar Custos
              </button>
              <button onClick={() => onConfirm(results)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer">
                <FileCheck2 className="w-4 h-4" /> Aplicar Preços aos Produtos
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 border border-transparent text-slate-500 hover:text-slate-700 rounded-lg text-sm font-bold cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleCalculate} disabled={rows.length === 0} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer">
                <Calculator className="w-4 h-4" /> Calcular Preços Finais
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
