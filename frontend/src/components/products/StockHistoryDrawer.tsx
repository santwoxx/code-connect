import { X, Search, MoveUp, MoveDown, RefreshCw } from 'lucide-react';
import { StockTransaction } from '../../types';
import { formatCurrency } from '../../utils/format';

interface StockHistoryDrawerProps {
  isOpen: boolean;
  transactions: StockTransaction[];
  searchQuery: string;
  typeFilter: 'ALL' | 'IN' | 'OUT';
  onChangeSearchQuery: (value: string) => void;
  onChangeTypeFilter: (value: 'ALL' | 'IN' | 'OUT') => void;
  onClose: () => void;
}

export function StockHistoryDrawer({
  isOpen,
  transactions,
  searchQuery,
  typeFilter,
  onChangeSearchQuery,
  onChangeTypeFilter,
  onClose
}: StockHistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop Click */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div>
            <h3 className="font-bold text-base font-display">Histórico de Movimentações</h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">Registro detalhado de todas as entradas e saídas físicas do estoque</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por produto..."
                value={searchQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => onChangeTypeFilter(e.target.value as 'ALL' | 'IN' | 'OUT')}
                className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer font-sans"
              >
                <option value="ALL">Todas as Direções</option>
                <option value="IN">📈 Entrada (IN)</option>
                <option value="OUT">📉 Saída (OUT)</option>
              </select>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium px-1">
            Encontrados {transactions.length} lançamentos de movimentação
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {transactions.length > 0 ? (
            transactions.map(tx => {
              const isInput = tx.type === 'IN';
              return (
                <div key={tx.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-colors text-left flex gap-3 items-start">
                  {/* Direction Icon */}
                  <span className={`p-2 rounded-xl shrink-0 ${isInput ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {isInput ? <MoveUp className="w-4 h-4" /> : <MoveDown className="w-4 h-4" />}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0 font-sans">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-xs text-slate-800 block leading-snug break-words">
                        {tx.productName}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${isInput ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {isInput ? '+' : '-'}{tx.quantity}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 mt-1">
                      <span className="font-mono text-blue-600 font-bold px-1 rounded bg-blue-50">
                        ID: {tx.productId.slice(0, 8)}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-500 uppercase text-[9px]">
                        Motivo: {tx.reason}
                      </span>
                      {tx.value !== undefined && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {formatCurrency(tx.value)}
                          </span>
                        </>
                      )}
                    </div>

                    {tx.description && (
                      <p className="text-[11px] text-slate-500 italic mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100/60 leading-snug">
                        {tx.description}
                      </p>
                    )}

                    <div className="text-[9px] text-slate-450 mt-2 font-mono text-slate-400">
                      {new Date(tx.date).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-400 font-sans">
              <RefreshCw className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-650">Nenhuma movimentação registrada</p>
              <p className="text-xs text-slate-400 mt-1">Lançamentos de compra, venda ou contagem física aparecerão aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
