import { Printer, Filter, Search } from 'lucide-react';
import { Sale, Seller } from '../../types';
import { formatCurrency } from '../../utils/format';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  CREDIARIO: 'Crediário',
  CARTAO: 'Cartão',
  CARTAO_X: 'Cartão X'
};

interface SalesHistoryTabProps {
  sellers: Seller[];
  searchedSales: Sale[];
  period: 'hoje' | 'semana' | 'mes' | 'tudo' | 'personalizado';
  startDate: string;
  endDate: string;
  salesFilterProduct: string;
  salesFilterCustomer: string;
  salesFilterSeller: string;
  salesFilterStatus: string;
  salesFilterPaymentMethod: string;
  onChangeSalesFilterProduct: (value: string) => void;
  onChangeSalesFilterCustomer: (value: string) => void;
  onChangeSalesFilterSeller: (value: string) => void;
  onChangeSalesFilterStatus: (value: string) => void;
  onChangeSalesFilterPaymentMethod: (value: string) => void;
  onPrintReport?: (title: string, subtitle: string, sales: Sale[]) => void;
  onPrintSale?: (sale: Sale) => void;
}

export function SalesHistoryTab({
  sellers,
  searchedSales,
  period,
  startDate,
  endDate,
  salesFilterProduct,
  salesFilterCustomer,
  salesFilterSeller,
  salesFilterStatus,
  salesFilterPaymentMethod,
  onChangeSalesFilterProduct,
  onChangeSalesFilterCustomer,
  onChangeSalesFilterSeller,
  onChangeSalesFilterStatus,
  onChangeSalesFilterPaymentMethod,
  onPrintReport,
  onPrintSale
}: SalesHistoryTabProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-fade-in space-y-6">

      {/* Header block with Generate Report actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-100">
        <div className="text-left">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Filtros e Relatórios de Vendas</h3>
          <p className="text-xs text-slate-400">Consulte o histórico global de vendas do mostruário e gere relatórios impressos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (onPrintReport) {
                const subtitle = `Período: ${period === 'personalizado' ? `${startDate || 'Início'} a ${endDate || 'Hoje'}` : period.toUpperCase()} | Filtro Vendedor: ${salesFilterSeller === 'all' ? 'Todos' : sellers.find(s => s.id === salesFilterSeller)?.name} | Filtro Status: ${salesFilterStatus === 'all' ? 'Todos' : salesFilterStatus}`;
                onPrintReport("Relatório Geral de Vendas", subtitle, searchedSales);
              }
            }}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer animate-fade-in"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Relatório de Vendas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onPrintReport) {
                const subtitle = `Período: ${period === 'personalizado' ? `${startDate || 'Início'} a ${endDate || 'Hoje'}` : period.toUpperCase()} | Filtro Forma Pgto: ${salesFilterPaymentMethod === 'all' ? 'Todas' : salesFilterPaymentMethod}`;
                onPrintReport("Relatório por Formas de Pagamento", subtitle, searchedSales);
              }
            }}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer animate-fade-in"
          >
            <Printer className="w-4 h-4" />
            <span>Relatório Formas de Pagamento</span>
          </button>
        </div>
      </div>

      {/* Advanced Search Filter Panel */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-left">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-500" />
          Filtros Avançados de Busca
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Product search */}
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Móvel / Produto</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nome ou SKU..."
                value={salesFilterProduct}
                onChange={(e) => onChangeSalesFilterProduct(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Customer search */}
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nome ou Telefone..."
                value={salesFilterCustomer}
                onChange={(e) => onChangeSalesFilterCustomer(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Seller filter */}
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor Responsável</span>
            <select
              value={salesFilterSeller}
              onChange={(e) => onChangeSalesFilterSeller(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="all">Ver Todos</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Situação da Venda</span>
            <select
              value={salesFilterStatus}
              onChange={(e) => onChangeSalesFilterStatus(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="all">Ver Todos</option>
              <option value="COMPLETED">Concluída</option>
              <option value="PENDING">Pendente</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          {/* Payment Method filter */}
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento</span>
            <select
              value={salesFilterPaymentMethod}
              onChange={(e) => onChangeSalesFilterPaymentMethod(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="all">Ver Todas</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CREDIARIO">Crediário</option>
              <option value="CARTAO">Cartão</option>
              <option value="CARTAO_X">Cartão X</option>
            </select>
          </div>
        </div>
      </div>

      {/* Consolidated Sales List */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        {searchedSales.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                <th className="p-3">Data / Canal</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Vendedor</th>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-right">Valor Venda</th>
                <th className="p-3 text-center">Imposto</th>
                <th className="p-3 text-center">Forma Pgto</th>
                <th className="p-3 text-center">Comissão</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {searchedSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-slate-500 font-mono">
                    {new Date(sale.createdAt).toLocaleDateString('pt-BR')} <br />
                    <span className="text-[10px] text-indigo-600 font-sans font-bold">
                      {sale.status === 'PENDING' ? 'Orçamento (Pendente)' :
                       sale.paymentMethod === 'CENTRAL' ? 'Orçamento (Faturado)' :
                       sale.paymentMethod === 'ALTERDATA' ? 'Fechamento' :
                       (sale.origin || 'Mostruário')}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-800 block">{sale.productName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{sale.productSku}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-700">{sale.sellerName}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">ID: {sale.sellerId}</span>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{sale.clientName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{sale.clientPhone}</div>
                  </td>
                  <td className="p-3 text-right font-black text-slate-900 font-mono">
                    {formatCurrency(sale.value)}
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span className="font-bold text-slate-700">{formatCurrency(sale.taxValue || 0)}</span>
                    <span className="text-[9px] text-slate-450 block font-sans">({sale.taxPercent || 0}%)</span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700 font-mono text-[10px] max-w-[120px] truncate" title={
                    (sale.paymentMethod === 'ALTERDATA' || sale.paymentMethod === 'CENTRAL')
                      ? (sale.notes?.match(/Pagamento:\s*(.*)/)?.[1] || 'Não Inf.')
                      : (PAYMENT_METHOD_LABELS[sale.paymentMethod || ''] || sale.paymentMethod || 'Não Inf.')
                  }>
                    {(sale.paymentMethod === 'ALTERDATA' || sale.paymentMethod === 'CENTRAL')
                      ? (sale.notes?.match(/Pagamento:\s*(.*)/)?.[1] || 'Não Inf.')
                      : (PAYMENT_METHOD_LABELS[sale.paymentMethod || ''] || sale.paymentMethod || 'Não Inf.')}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {sale.status === 'COMPLETED' ? (
                      <>
                        <div className="font-bold text-purple-700">{formatCurrency(sale.commissionValue || 0)}</div>
                        <div className="text-[9px] text-slate-400">({sale.commissionPercent}%)</div>
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
                  <td className="p-3 text-right">
                    {onPrintSale && (
                      <button
                        type="button"
                        onClick={() => onPrintSale(sale)}
                        className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/50 text-[10px] font-bold transition-all cursor-pointer"
                        title="Imprimir Comprovante"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span>Recibo</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-slate-400">
            <p className="text-slate-800 font-semibold text-sm">Nenhum registro de venda encontrado com os filtros indicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
