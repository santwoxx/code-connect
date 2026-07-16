import { Sale, Seller } from '../../types';
import { formatCurrency } from '../../utils/format';

interface SellerPerformanceRow {
  id: string;
  name: string;
  username: string;
  qty: number;
  value: number;
  commissions: number;
  active: boolean;
}

interface SellerPerformanceTabProps {
  sellerPerformance: SellerPerformanceRow[];
  sellers: Seller[];
  selectedSellerHistoryId: string;
  onChangeSelectedSellerHistoryId: (id: string) => void;
  selectedSellerHistory: Sale[];
}

export function SellerPerformanceTab({
  sellerPerformance,
  sellers,
  selectedSellerHistoryId,
  onChangeSelectedSellerHistoryId,
  selectedSellerHistory
}: SellerPerformanceTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Seller performance summary table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">Painel Comparativo de Vendedores</h3>
        <p className="text-xs text-slate-400 mb-4">Volume bruto, média, comissão devida e situação cadastral dos operadores.</p>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                <th className="p-3">Rank / Nome</th>
                <th className="p-3">Identificador</th>
                <th className="p-3 text-center">Vendas</th>
                <th className="p-3 text-right">Faturamento Total</th>
                <th className="p-3 text-right">Ticket Médio</th>
                <th className="p-3 text-right">Comissões Acumuladas</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sellerPerformance.map((seller, index) => {
                const avg = seller.qty > 0 ? seller.value / seller.qty : 0;
                return (
                  <tr key={seller.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${
                        index === 0 ? 'bg-amber-100 text-amber-800' : index === 1 ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">{seller.name}</div>
                        <div className="text-[10px] text-slate-400">Vendedor cadastrado</div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-500">
                      @{seller.username}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {seller.qty}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 font-mono">
                      {formatCurrency(seller.value)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      {formatCurrency(avg)}
                    </td>
                    <td className="p-3 text-right font-bold text-purple-700 font-mono">
                      {formatCurrency(seller.commissions)}
                    </td>
                    <td className="p-3 text-center">
                      {seller.active ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Ativo</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Desativado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Sales history of single selected seller */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Ficha Individual do Vendedor</h3>
            <p className="text-xs text-slate-400">Consulte o extrato completo de vendas de um operador específico.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0 font-medium">Filtrar Vendedor:</span>
            <select
              value={selectedSellerHistoryId}
              onChange={(e) => onChangeSelectedSellerHistoryId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-bold"
            >
              <option value="all">Ver Todos Consolidated</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (@{s.username})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sales Table drilldown */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          {selectedSellerHistory.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                  <th className="p-3">Data</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Valor Venda</th>
                  <th className="p-3 text-center">Comissão</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSellerHistory.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-slate-500 font-mono">
                      {new Date(sale.createdAt).toLocaleDateString('pt-BR')} <br />
                      <span className="text-[10px] text-slate-400">{new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800">{sale.sellerName}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 block">{sale.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{sale.productSku}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{sale.clientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{sale.clientPhone}</div>
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 font-mono">
                      {formatCurrency(sale.value)}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {sale.status === 'COMPLETED' ? (
                        <>
                          <div className="font-bold text-purple-700">{formatCurrency(sale.commissionValue || 0)}</div>
                          <span className="text-[9px] text-slate-400">({sale.commissionPercent}%)</span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-semibold">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {sale.status === 'COMPLETED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Concluída</span>
                      ) : sale.status === 'PENDING' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Pendente</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Cancelada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p className="text-slate-800 font-semibold text-sm">Nenhuma venda encontrada para o filtro selecionado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
