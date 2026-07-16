import { ShoppingCart, ShoppingBag, X, Trash2, Minus, Plus, Send, Palette } from 'lucide-react';
import { Product } from '../../types';

export interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  deliveryType: 'RETIRADA' | 'ENVIAR';
  needsAssembly: boolean;
  shippingValue: number;
  paymentMethod: string;
  installments?: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  cartTotal: number;
  cartAssemblyTotal: number;
  cartTotalWithShipping: number;
  onClose: () => void;
  onRemoveItem: (cartId: string) => void;
  onUpdateQuantity: (cartId: string, quantity: number) => void;
  onUpdateDelivery: (cartId: string, deliveryType: 'RETIRADA' | 'ENVIAR') => void;
  onUpdateAssembly: (cartId: string, needsAssembly: boolean) => void;
  onUpdateShipping: (cartId: string, shippingValue: number) => void;
  onApplyPaymentMethodToAll: (paymentMethod: string) => void;
  onUpdatePaymentMethod: (cartId: string, paymentMethod: string) => void;
  onUpdateInstallments: (cartId: string, installments: number) => void;
  getCartItemPrice: (item: CartItem) => number;
  onShareWhatsApp: () => void;
  onStartCheckout: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  cartTotal,
  cartAssemblyTotal,
  cartTotalWithShipping,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateDelivery,
  onUpdateAssembly,
  onUpdateShipping,
  onApplyPaymentMethodToAll,
  onUpdatePaymentMethod,
  onUpdateInstallments,
  getCartItemPrice,
  onShareWhatsApp,
  onStartCheckout
}: CartDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[180] flex justify-end font-sans">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in fade-in duration-200">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center shrink-0 bg-slate-900 text-white">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
          </h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white text-sm font-bold p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-sm">Seu carrinho está vazio</p>
              <p className="text-xs mt-1">Adicione produtos no modo carrinho</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.cartId} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex gap-3">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} className="w-16 h-16 object-contain bg-slate-50 rounded-lg border p-1 shrink-0" alt={item.product.name} />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg border flex items-center justify-center text-slate-300 shrink-0">
                      <Palette className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <span className="text-[9px] font-extrabold text-blue-600 uppercase block leading-tight">{item.product.category}</span>
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-2">{item.product.name}</h4>
                      </div>
                      <button onClick={() => onRemoveItem(item.cartId)} className="text-rose-400 hover:text-rose-600 p-0.5 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-black text-sm text-slate-900">{item.product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        <button onClick={() => onUpdateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-600 font-bold text-xs cursor-pointer">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-600 font-bold text-xs cursor-pointer">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per-item Delivery and Assembly controls */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                  <div className="flex bg-slate-100 rounded-lg p-0.5 flex-1 min-w-[140px]">
                    <button
                      type="button"
                      onClick={() => onUpdateDelivery(item.cartId, 'RETIRADA')}
                      className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${item.deliveryType === 'RETIRADA' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Retirada
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateDelivery(item.cartId, 'ENVIAR')}
                      className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${item.deliveryType === 'ENVIAR' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Entrega
                    </button>
                  </div>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 flex-1 min-w-[120px]">
                    <button
                      type="button"
                      onClick={() => onUpdateAssembly(item.cartId, true)}
                      className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${item.needsAssembly ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Montar
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateAssembly(item.cartId, false)}
                      className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${!item.needsAssembly ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      S/ Montar
                    </button>
                  </div>
                </div>

                {item.deliveryType === 'ENVIAR' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">Frete:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={item.shippingValue || ''}
                      onChange={(e) => onUpdateShipping(item.cartId, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-[10px] border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400">R$</span>
                  </div>
                )}

                {/* Per-item Payment Method */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pagamento</span>
                    <button
                      type="button"
                      onClick={() => onApplyPaymentMethodToAll(item.paymentMethod)}
                      className="text-[8px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider cursor-pointer"
                      title="Aplicar esta forma de pagamento a todos os itens"
                    >
                      Aplicar a Todos
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
                      { value: 'PIX', label: 'PIX', icon: '💠' },
                      { value: 'CARTAO', label: 'Cartão', icon: '💳' },
                      { value: 'CARTAO_X', label: 'Parcelado', icon: '🧾' },
                      { value: 'CREDIARIO', label: 'Crediário', icon: '📆' },
                    ].map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => onUpdatePaymentMethod(item.cartId, method.value)}
                        className={`py-1 rounded text-[9px] font-bold transition-all border cursor-pointer text-center ${item.paymentMethod === method.value ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                      >
                        <span className="block text-xs">{method.icon}</span>
                        <span className="leading-tight block">{method.label}</span>
                      </button>
                    ))}
                  </div>
                  {(item.paymentMethod === 'CARTAO' || item.paymentMethod === 'CARTAO_X') && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Parcelas:</span>
                      <select
                        value={item.installments || 1}
                        onChange={(e) => onUpdateInstallments(item.cartId, Number(e.target.value))}
                        className="text-xs p-1 border border-slate-200 rounded text-slate-700 bg-white"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <option key={n} value={n}>
                            {n}x {n <= 10 ? 'sem juros' : '(com juros)'}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs font-black text-blue-600">
                        {(getCartItemPrice(item) * item.quantity / (item.installments || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / mês
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-200 p-4 space-y-3 shrink-0 bg-slate-50">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subtotal Produtos:</span>
                <span className="font-bold text-slate-800">{cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              {cartAssemblyTotal > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Montagem:</span>
                  <span className="font-bold text-slate-800">
                    {cartAssemblyTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
              {items.some(i => i.deliveryType === 'ENVIAR' && i.shippingValue > 0) && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Fretes:</span>
                  <span className="font-bold text-slate-800">
                    {items.reduce((sum, i) => sum + (i.deliveryType === 'ENVIAR' ? i.shippingValue : 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-slate-200 pt-1">
                <span className="font-bold text-slate-700">Total Geral:</span>
                <span className="font-black text-lg text-slate-900">{cartTotalWithShipping.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onShareWhatsApp();
                }}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={onStartCheckout}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Finalizar Pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
