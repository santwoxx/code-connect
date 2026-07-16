import React from 'react';
import { Heart, Palette, ShoppingCart, Star } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  idx: number;
  isLoved: boolean;
  isHighlighted: boolean;
  salesMode: boolean;
  userRole?: string;
  onToggleFavorite: (productId: string, e: React.MouseEvent) => void;
  onSelectForPresentation: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onSelectForSale: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  idx,
  isLoved,
  isHighlighted,
  salesMode,
  userRole,
  onToggleFavorite,
  onSelectForPresentation,
  onAddToCart,
  onSelectForSale
}) => {
  const isReady = product.currentStock > 0;
  
  // Simulated metrics derived from pricing
  const originalPrice = product.price * 1.25;
  const diffPrice = originalPrice - product.price;
  const discountPct = 20 + (idx * 3); // 20%, 23%, 26%, 29% OFF based on index matching original image beautifully

  return (
    <div 
      onClick={() => onSelectForPresentation(product)}
      className={`group bg-white rounded-2xl border transition-all duration-300 shadow-xs hover:shadow-lg flex flex-col justify-between overflow-hidden relative cursor-pointer ${isHighlighted ? 'border-blue-500 ring-2 ring-blue-500/30 scale-[1.01] shadow-md shadow-blue-500/10' : 'border-slate-200 hover:border-blue-500/80'}`}
    >
      
      {/* Badge Container Header */}
      <div className="p-3 flex justify-between items-start absolute w-full top-0 left-0 z-10 pointer-events-none">
        <div className="flex flex-col gap-1.5 pointer-events-auto items-start">
          <div className="bg-[#1A1A1A] text-white text-[10px] font-black rounded-full w-12 h-12 flex flex-col justify-center items-center font-sans tracking-tighter leading-none shadow-sm">
            <span>{discountPct}%</span>
            <span className="text-[7px] font-bold mt-0.5 uppercase tracking-wide">OFF</span>
          </div>
          {isHighlighted && (
            <span className="bg-blue-650 text-white text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md shadow-blue-500/30">
              ✨ Destaque
            </span>
          )}
        </div>
        
        <button 
          type="button"
          onClick={(e) => onToggleFavorite(product.id, e)}
          className={`p-2 rounded-full border shadow-sm transition-all bg-white/90 backdrop-blur-xs pointer-events-auto cursor-pointer ${isLoved ? 'border-red-100 text-red-500 bg-red-50 hover:bg-red-100 scale-105' : 'border-slate-100 text-slate-350 hover:text-red-500 hover:bg-red-50'}`}
        >
          <Heart className={`w-3.5 h-3.5 shrink-0 ${isLoved ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>

      {/* Target Product Photo with centered mockup background */}
      <div className="h-44 bg-slate-50/70 p-6 flex items-center justify-center border-b border-slate-100/50 relative overflow-hidden shrink-0 mt-2">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain group-hover:scale-106 duration-500 transition-all mix-blend-multiply"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-blue-300">
            <Palette className="w-12 h-12" />
            <span className="text-[10px] mt-1 uppercase font-black font-sans tracking-widest text-slate-400">Ver foto sob consulta</span>
          </div>
        )}

        {/* Immediate delivery status */}
        <span className={`absolute bottom-2 left-3 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide ${isReady ? 'bg-emerald-50 text-emerald-600 border border-emerald-250/50' : 'bg-amber-50 text-amber-600 border border-amber-250/50'}`}>
          {isReady ? 'Pronta Entrega' : 'Sob Encomenda'}
        </span>
      </div>

      {/* Metadata specs Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          
          {/* Rating stars */}
          <div className="flex items-center gap-0.5 text-yellow-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          {/* Title & SKU code */}
          <div className="space-y-0.5">
            <span className="text-[9px] font-extrabold uppercase text-blue-600 font-sans tracking-wide">{product.category}</span>
            <h4 className="font-extrabold text-xs md:text-sm text-slate-800 line-clamp-2 h-9 leading-relaxed tracking-tight group-hover:text-blue-600 transition-colors">
              {product.name}
            </h4>
          </div>
        </div>

        {/* Pricing Block */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="leading-tight">
            <span className="text-[10px] text-slate-400 line-through font-semibold block">
              {originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-black text-slate-400">R$</span>
              <span className="text-lg font-black text-slate-900 tracking-tight leading-none">
                {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Economize Badge styled exactly like the provided image */}
          <div className="bg-[#1A1A1A] text-white text-[11px] font-extrabold py-2 px-3 rounded-lg text-center font-sans tracking-tight leading-none select-none">
            Economize {diffPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>

        </div>

        {/* Call to Action - always show Add to Cart */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Adicionar ao Carrinho</span>
          </button>
          {salesMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectForSale(product);
              }}
              className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {userRole === 'vendedor' ? '📋 Proposta' : '🛒 Comprar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
