/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  CornerUpLeft, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  X,
  Package,
  Layers,
  Info
} from 'lucide-react';
import { Product, PurchaseReturn } from '../types';
import { formatCurrency } from '../utils/format';

interface PurchaseReturnsViewProps {
  products: Product[];
  purchaseReturns: PurchaseReturn[];
  onAddPurchaseReturn: (purchaseReturn: Omit<PurchaseReturn, 'id' | 'createdAt'>) => Promise<void> | void;
  onUpdatePurchaseReturnStatus: (id: string, status: 'PENDING' | 'RESOLVED' | 'CANCELLED') => Promise<void> | void;
  onDeletePurchaseReturn: (id: string) => Promise<void> | void;
}

export const PurchaseReturnsView: React.FC<PurchaseReturnsViewProps> = ({
  products,
  purchaseReturns,
  onAddPurchaseReturn,
  onUpdatePurchaseReturnStatus,
  onDeletePurchaseReturn
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'CANCELLED'>('ALL');

  // Form Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [reason, setReason] = useState('');
  const [generateReceivable, setGenerateReceivable] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitValue, setUnitValue] = useState('');

  const [selectedItems, setSelectedItems] = useState<Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitValue: number;
    currentStock: number;
  }>>([]);

  // Selected Product details for real-time validation and preview
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Auto-fill price of cost when product changes
  React.useEffect(() => {
    if (selectedProduct) {
      setUnitValue(selectedProduct.costPrice.toString());
      setFormError(null);
    } else {
      setUnitValue('');
    }
  }, [selectedProduct]);

  // Calculate values
  const computedTotal = useMemo(() => {
    const qty = parseInt(quantity) || 0;
    const unit = parseFloat(unitValue) || 0;
    return qty * unit;
  }, [quantity, unitValue]);

  // Filters logic
  const filteredReturns = useMemo(() => {
    return purchaseReturns.filter(pr => {
      const matchesStatus = statusFilter === 'ALL' || pr.status === statusFilter;
      const term = searchQuery.toLowerCase();
      const matchesSearch = 
        pr.productName.toLowerCase().includes(term) ||
        pr.productSku.toLowerCase().includes(term) ||
        pr.supplierName.toLowerCase().includes(term) ||
        (pr.reason && pr.reason.toLowerCase().includes(term));
      
      return matchesStatus && matchesSearch;
    });
  }, [purchaseReturns, statusFilter, searchQuery]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalValueReturned = 0;
    let totalItemsReturned = 0;
    let pendingReturnsCount = 0;

    purchaseReturns.forEach(pr => {
      if (pr.status !== 'CANCELLED') {
        totalValueReturned += pr.totalValue;
        totalItemsReturned += pr.quantity;
      }
      if (pr.status === 'PENDING') {
        pendingReturnsCount++;
      }
    });

    return {
      totalValueReturned,
      totalItemsReturned,
      pendingReturnsCount
    };
  }, [purchaseReturns]);

  // Actions
  const handleAddItem = () => {
    setFormError(null);
    if (!selectedProduct || !quantity || !unitValue) {
      setFormError('Selecione o produto, a quantidade e o valor unitário.');
      return;
    }
    const qtyNum = parseInt(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFormError('A quantidade deve ser maior que zero.');
      return;
    }
    if (qtyNum > selectedProduct.currentStock) {
      setFormError(`Quantidade indisponível. O estoque atual é de ${selectedProduct.currentStock} unidades.`);
      return;
    }
    const valueNum = parseFloat(unitValue);
    if (isNaN(valueNum) || valueNum < 0) {
      setFormError('O valor unitário deve ser maior ou igual a zero.');
      return;
    }

    if (selectedItems.find(i => i.productId === selectedProduct.id)) {
      setFormError('Este produto já foi adicionado à lista.');
      return;
    }

    setSelectedItems([...selectedItems, {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSku: selectedProduct.sku,
      quantity: qtyNum,
      unitValue: valueNum,
      currentStock: selectedProduct.currentStock
    }]);

    setSelectedProductId('');
    setQuantity('');
    setUnitValue('');
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(i => i.productId !== productId));
  };

  const handleCreateReturn = async () => {
    setFormError(null);

    if (selectedItems.length === 0) {
      setFormError('Adicione pelo menos um produto para devolução.');
      return;
    }

    if (!supplierName || !reason) {
      setFormError('Preencha o nome do fornecedor e o motivo da devolução.');
      return;
    }

    try {
      for (const item of selectedItems) {
        await onAddPurchaseReturn({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          supplierName: supplierName.trim(),
          quantity: item.quantity,
          unitValue: item.unitValue,
          totalValue: item.quantity * item.unitValue,
          reason: reason.trim(),
          generateReceivable,
          status: 'PENDING'
        });
      }

      setSelectedItems([]);
      setSelectedProductId('');
      setSupplierName('');
      setQuantity('');
      setUnitValue('');
      setReason('');
      setGenerateReceivable(true);
      setFormError(null);
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao registrar devolução.');
    }
  };

  const getStatusBadge = (status: 'PENDING' | 'RESOLVED' | 'CANCELLED') => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pendente
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <CornerUpLeft className="w-7 h-7 text-indigo-600" />
            <span>Devolução de Compras</span>
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie o retorno de mercadorias para fornecedores com ajuste automático de estoque físico e geração opcional de Contas a Receber.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:translate-y-[-1px] cursor-pointer"
          id="btn-add-return"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Registrar Devolução</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="returns-metric-grid">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-650 border border-indigo-100">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Total Devolvido</span>
            <span className="text-xl font-bold font-display text-slate-900">{formatCurrency(metrics.totalValueReturned)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-650 border border-blue-100">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Itens Retornados</span>
            <span className="text-xl font-bold font-display text-slate-900">{metrics.totalItemsReturned} unidades</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Devoluções Pendentes</span>
            <span className="text-xl font-bold font-display text-slate-900">{metrics.pendingReturnsCount} processos</span>
          </div>
        </div>
      </div>

      {/* Filters and List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="returns-list-card">
        {/* Search Inputs and filters */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Searching */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por produto, SKU, fornecedor ou motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800"
              id="return-search"
            />
          </div>

          {/* Status filtering */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700 cursor-pointer font-medium"
            >
              <option value="ALL">Qualquer Status</option>
              <option value="PENDING">Apenas Pendentes</option>
              <option value="RESOLVED">Apenas Resolvidos</option>
              <option value="CANCELLED">Apenas Cancelados</option>
            </select>
          </div>
        </div>

        {/* Returns Table */}
        {filteredReturns.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Data</th>
                    <th className="p-4">Produto</th>
                    <th className="p-4">Fornecedor</th>
                    <th className="p-4 text-center">Qtd</th>
                    <th className="p-4 text-right">Unitário</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4">Motivo</th>
                    <th className="p-4 text-center">Financeiro</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-750">
                  {filteredReturns.map(pr => (
                    <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {new Date(pr.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 leading-snug">{pr.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {pr.productSku}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-750">{pr.supplierName}</td>
                      <td className="p-4 text-center font-bold text-slate-800">{pr.quantity}</td>
                      <td className="p-4 text-right font-medium text-slate-600">{formatCurrency(pr.unitValue)}</td>
                      <td className="p-4 text-right font-bold text-indigo-750">{formatCurrency(pr.totalValue)}</td>
                      <td className="p-4 max-w-[200px] truncate" title={pr.reason}>
                        <span className="text-slate-600 text-xs">{pr.reason}</span>
                      </td>
                      <td className="p-4 text-center">
                        {pr.generateReceivable ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150">
                            Sim
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(pr.status)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {pr.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => {
                                  if (confirm('Marcar este processo de devolução como RESOLVIDO?')) {
                                    onUpdatePurchaseReturnStatus(pr.id, 'RESOLVED');
                                  }
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer transition-colors"
                                title="Marcar como Resolvido"
                              >
                                Resolver
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Deseja CANCELAR este processo de devolução? O estoque correspondente NÃO será restaurado automaticamente por segurança.')) {
                                    onUpdatePurchaseReturnStatus(pr.id, 'CANCELLED');
                                  }
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer transition-colors"
                                title="Cancelar Devolução"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Deseja realmente EXCLUIR este registro de devolução? Apenas o registro será removido; ajustes de estoque e financeiros criados anteriormente permanecerão intactos.')) {
                                onDeletePurchaseReturn(pr.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded transition-all cursor-pointer"
                            title="Remover Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredReturns.map(pr => (
                <div key={pr.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm leading-snug">{pr.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {pr.productSku}</div>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-slate-500 text-xs font-semibold">Fornecedor: {pr.supplierName}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(pr.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Qtd Devolvida</span>
                      <span className="font-bold text-slate-800 text-sm">{pr.quantity} un</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Unitário</span>
                      <span className="font-semibold text-slate-600">{formatCurrency(pr.unitValue)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Total</span>
                      <span className="font-bold text-indigo-755 text-sm">{formatCurrency(pr.totalValue)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-xs text-slate-600 space-y-1">
                    <div><strong>Motivo: </strong>{pr.reason}</div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Registrado em {new Date(pr.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>Contas a Receber: {pr.generateReceivable ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                    {pr.status === 'PENDING' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            if (confirm('Marcar este processo de devolução como RESOLVIDO?')) {
                              onUpdatePurchaseReturnStatus(pr.id, 'RESOLVED');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Deseja CANCELAR este processo?')) {
                              onUpdatePurchaseReturnStatus(pr.id, 'CANCELLED');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Deseja realmente EXCLUIR este registro?')) {
                          onDeletePurchaseReturn(pr.id);
                        }
                      }}
                      className="p-1 px-2 text-rose-55 hover:bg-rose-50 rounded border border-slate-200 text-rose-600 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Nenhum registro de devolução</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Nenhum resultado corresponde aos filtros atuais.'
                : 'Pressione "Registrar Devolução" no topo para criar o primeiro registro.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Form: NEW PURCHASE RETURN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-indigo-100 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <CornerUpLeft className="w-5 h-5 text-white" /> Registrar Devolução ao Fornecedor
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateReturn(); }} className="flex flex-col flex-1 overflow-hidden text-left">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LADO ESQUERDO: Produtos */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">1. Produtos a Devolver</h4>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Produto para Devolução
                      </label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white font-medium text-slate-800"
                      >
                        <option value="">Selecione um produto comercial...</option>
                        {products
                          .filter(p => p.active !== false)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku}) — Estoque: {p.currentStock} {p.unit || 'UN'}
                            </option>
                          ))}
                      </select>
                    </div>

                    {selectedProduct && (
                      <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-900 flex items-start gap-2">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p><strong>Estoque Atual:</strong> {selectedProduct.currentStock} {selectedProduct.unit || 'UN'}</p>
                          <p><strong>Preço de Custo Padrão:</strong> {formatCurrency(selectedProduct.costPrice)}</p>
                          {selectedProduct.currentStock === 0 && (
                            <p className="text-rose-600 font-semibold mt-1">Este produto não possui unidades em estoque para devolução.</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedProduct ? selectedProduct.currentStock : undefined}
                          placeholder="Ex: 5"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white font-bold text-slate-800"
                          disabled={!selectedProductId || (selectedProduct && selectedProduct.currentStock === 0)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Preço Unitário (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={unitValue}
                          onChange={(e) => setUnitValue(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white font-semibold text-slate-800"
                          disabled={!selectedProductId}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductId || (selectedProduct && selectedProduct.currentStock === 0)}
                      className="w-full py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar à Lista
                    </button>

                    <div className="mt-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col h-[250px]">
                      <div className="p-3 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center shrink-0">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens Selecionados ({selectedItems.length})</span>
                        {selectedItems.length > 0 && (
                          <span className="text-xs font-bold text-indigo-700">
                            Total: {formatCurrency(selectedItems.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0))}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {selectedItems.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                            <Layers className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-xs">Nenhum produto selecionado para devolução.</p>
                          </div>
                        ) : (
                          selectedItems.map((item) => (
                            <div key={item.productId} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                              <div className="min-w-0 pr-2">
                                <div className="text-sm font-bold text-slate-800 truncate" title={item.productName}>{item.productName}</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {item.quantity} un × {formatCurrency(item.unitValue)} = <strong className="text-indigo-700">{formatCurrency(item.quantity * item.unitValue)}</strong>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.productId)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer shrink-0"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LADO DIREITO: Dados do Processo */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">2. Dados da Devolução</h4>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Nome do Fornecedor <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Fornecedor de Móveis Silva SA"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Motivo da Devolução <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        placeholder="Ex: Produto com defeito de fabricação na estrutura ou vício oculto..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generateReceivable}
                          onChange={(e) => setGenerateReceivable(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Gerar Contas a Receber (Financeiro)</span>
                          <span className="text-[10px] text-slate-400">
                            Cria automaticamente um lançamento do tipo Receita (Pendente) na categoria FORNECEDORES.
                          </span>
                        </div>
                      </label>
                    </div>

                    {formError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg">
                        {formError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {/* Actions */}
              <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
                  disabled={selectedItems.length === 0}
                >
                  Confirmar Devolução
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
