import React, { useMemo } from 'react';
import { FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle2, Info, PlusCircle, Database } from 'lucide-react';
import { Category, Product } from '../../types';
import { TaxCalculatorModal, TaxResultItem } from '../shared/TaxCalculatorModal';

export type SyncStatus = 'new' | 'update' | 'no_change' | 'error' | 'not_found';

export interface ParsedProductRow {
  sku: string;
  name: string;
  costPrice: number;
  price: number;
  minPrice: number;
  currentStock: number;
  unit: string;
  barcode?: string;
  ncm?: string;
  category?: string;
  selected?: boolean;
  errors?: string[];
}

interface ImportTabProps {
  isActive: boolean;
  importProducts: ParsedProductRow[];
  setImportProducts: React.Dispatch<React.SetStateAction<ParsedProductRow[]>>;
  importText: string;
  setImportText: React.Dispatch<React.SetStateAction<string>>;
  duplicateAction: 'update' | 'skip';
  setDuplicateAction: React.Dispatch<React.SetStateAction<'update' | 'skip'>>;
  isImporting: boolean;
  importProgress?: { current: number; total: number };
  categories: Category[];
  products: Product[];
  onCancel: () => void;
  onAnalyze: (parsed: ParsedProductRow[]) => void;
  onConfirmImport: () => void;
  parseImportText: (text: string) => ParsedProductRow[];
}

export function ImportTab({
  isActive,
  importProducts,
  setImportProducts,
  importText,
  setImportText,
  duplicateAction,
  setDuplicateAction,
  isImporting,
  importProgress,
  categories,
  products,
  onCancel,
  onAnalyze,
  onConfirmImport,
  parseImportText
}: ImportTabProps) {
  const [showTaxCalculator, setShowTaxCalculator] = React.useState(false);

  // Compute stats and sync statuses
  const { augmentedProducts, stats } = useMemo(() => {
    let newCount = 0;
    let updateCount = 0;
    let noChangeCount = 0;
    let errorCount = 0;

    const augmented = importProducts.map(item => {
      const existing = products.find(p => p.sku === item.sku);
      let status: SyncStatus = 'new';
      
      if (item.errors && item.errors.length > 0) {
        status = 'error';
        errorCount++;
      } else if (!existing) {
        status = 'new';
        newCount++;
      } else {
        const hasChanges = 
          existing.currentStock !== item.currentStock ||
          existing.costPrice !== item.costPrice ||
          existing.price !== item.price ||
          (existing.name && item.name && existing.name.toUpperCase() !== item.name.toUpperCase()) ||
          (item.barcode && existing.barcode !== item.barcode) ||
          (item.ncm && existing.ncm !== item.ncm) ||
          (existing.unit || 'UN') !== (item.unit || 'UN');

        if (hasChanges) {
          status = 'update';
          updateCount++;
        } else {
          status = 'no_change';
          noChangeCount++;
        }
      }

      return {
        ...item,
        syncStatus: status,
        existing
      };
    });

    const notFoundCount = products.filter(p => !importProducts.some(i => i.sku === p.sku)).length;

    return {
      augmentedProducts: augmented,
      stats: {
        total: importProducts.length,
        new: newCount,
        update: updateCount,
        no_change: noChangeCount,
        error: errorCount,
        not_found: notFoundCount
      }
    };
  }, [importProducts, products]);

  if (!isActive) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col font-sans text-left space-y-4">
      <div className="border-b border-slate-200 pb-4 mb-2 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-violet-600" /> Sincronização Inteligente de Estoque
          </h3>
          <p className="text-xs text-slate-400 mt-1">Cole os dados de estoque do Alterdata. O sistema manterá seus dados enriquecidos (imagens, descrições) e atualizará apenas as informações operacionais.</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col space-y-4">
        {importProducts.length === 0 ? (
          // Textarea Phase
          <div className="flex-1 flex flex-col space-y-4 min-h-[300px]">
            <p className="text-sm text-slate-500 text-left">
              Cole as colunas do relatório do Alterdata abaixo. O sistema tentará reconhecer automaticamente os dados, ou você pode manter a ordem padrão (Código, Produto, Custo, Preço, Mínimo, Estoque, Unidade). NCM e Código de Barras também são identificados.
            </p>
            
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Cole aqui as linhas do Alterdata (Ctrl+C / Ctrl+V)..."
              className="flex-1 w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 font-mono text-xs bg-slate-50 focus:bg-white resize-none min-h-[250px]"
            />
            
            <div className="flex justify-end gap-2 shrink-0">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const parsed = parseImportText(importText);
                  if (parsed.length === 0) {
                    alert("Nenhum produto válido foi identificado no texto colado. Verifique o formato.");
                    return;
                  }
                  onAnalyze(parsed);
                }}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Analisar Lista
              </button>
            </div>
          </div>
        ) : (
          // Preview Phase
          <div className="flex-grow flex flex-col overflow-hidden min-h-[400px]">
            
            {/* Resumo da Sincronização */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 shrink-0">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Database className="w-3 h-3"/> Encontrados</div>
                <div className="text-xl font-bold text-slate-800">{stats.total}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <div className="text-emerald-600 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><PlusCircle className="w-3 h-3"/> Novos</div>
                <div className="text-xl font-bold text-emerald-700">{stats.new}</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                <div className="text-amber-600 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Atualizar</div>
                <div className="text-xl font-bold text-amber-700">{stats.update}</div>
              </div>
              <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Sem Alt.</div>
                <div className="text-xl font-bold text-slate-600">{stats.no_change}</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                <div className="text-red-600 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Erros</div>
                <div className="text-xl font-bold text-red-700">{stats.error}</div>
              </div>
              <div className="bg-violet-50 border border-violet-100 p-3 rounded-xl">
                <div className="text-violet-600 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Info className="w-3 h-3"/> Não Encont.</div>
                <div className="text-xl font-bold text-violet-700">{stats.not_found}</div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2 shrink-0">
              <h4 className="text-sm font-bold text-slate-800">Visualização dos Dados</h4>
              <button
                onClick={() => setImportProducts([])}
                disabled={isImporting}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                Editar Texto
              </button>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl max-h-[40vh] text-left">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={importProducts.every(item => item.selected)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setImportProducts(prev => prev.map(item => ({ ...item, selected: checked })));
                        }}
                        disabled={isImporting}
                        className="accent-violet-600"
                      />
                    </th>
                    <th className="p-3 font-semibold text-slate-700">SKU</th>
                    <th className="p-3 font-semibold text-slate-700">Produto</th>
                    <th className="p-3 font-semibold text-slate-700">NCM / Barras</th>
                    <th className="p-3 font-semibold text-slate-700 text-right">Custo</th>
                    <th className="p-3 font-semibold text-slate-700 text-right">Venda</th>
                    <th className="p-3 font-semibold text-slate-700 text-center">Estoque</th>
                    <th className="p-3 font-semibold text-slate-700 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {augmentedProducts.map((item, idx) => {
                    let statusBadge;
                    switch (item.syncStatus) {
                      case 'new':
                        statusBadge = <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">Novo</span>;
                        break;
                      case 'update':
                        statusBadge = <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-100">Atualizar</span>;
                        break;
                      case 'no_change':
                        statusBadge = <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-bold border border-slate-100">Sincronizado</span>;
                        break;
                      case 'error':
                        statusBadge = <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-100" title={item.errors?.join(', ')}>Erro</span>;
                        break;
                      default:
                        statusBadge = <span>-</span>;
                    }

                    return (
                      <tr key={idx} className={item.selected ? 'bg-slate-50/40 hover:bg-slate-50' : 'opacity-60 hover:bg-slate-50'}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => {
                              const updated = [...importProducts];
                              updated[idx].selected = e.target.checked;
                              setImportProducts(updated);
                            }}
                            disabled={isImporting}
                            className="accent-violet-600"
                          />
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-700">{item.sku}</td>
                        <td className="p-3 font-semibold text-slate-900 leading-snug">
                          {item.name}
                          {item.category && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.category}</div>}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">
                          <div>{item.ncm || '-'}</div>
                          <div>{item.barcode || '-'}</div>
                        </td>
                        <td className="p-3 text-right font-medium text-slate-600">
                          {item.costPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="p-3 text-center text-[10px] uppercase font-bold">{statusBadge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 shrink-0">
              <button
                onClick={onCancel}
                disabled={isImporting}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowTaxCalculator(true)}
                disabled={isImporting || importProducts.filter(i => i.selected).length === 0}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-indigo-200"
              >
                Calcular Preços (Impostos)
              </button>
              <button
                onClick={onConfirmImport}
                disabled={isImporting || stats.total === 0}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Sincronizando {importProgress ? `(${importProgress.current}/${importProgress.total})` : '...'}</span>
                  </>
                ) : (
                  <span>Iniciar Sincronização ({importProducts.filter(i => i.selected).length})</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showTaxCalculator && (
        <TaxCalculatorModal
          initialItems={importProducts.filter(i => i.selected).map(item => ({
            id: item.sku,
            name: item.name,
            costPrice: item.costPrice
          }))}
          onClose={() => setShowTaxCalculator(false)}
          onConfirm={(results: TaxResultItem[]) => {
            const updated = importProducts.map(item => {
              const res = results.find(r => r.id === item.sku);
              if (res) {
                return {
                  ...item,
                  costPrice: res.custoLiquido,
                  price: res.precoVenda
                };
              }
              return item;
            });
            setImportProducts(updated);
            setShowTaxCalculator(false);
          }}
          title="Calculadora de Impostos - Importação"
          description="Preencha informações faltantes (ex: IPI) para calcular os custos líquidos e preços finais sugeridos para os itens selecionados."
        />
      )}
    </div>
  );
}

