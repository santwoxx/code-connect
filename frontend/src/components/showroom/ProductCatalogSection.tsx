import { Palette } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductCatalogSectionProps {
  selectedCategory: string;
  filteredProducts: Product[];
  favorites: string[];
  salesMode: boolean;
  userRole?: string;
  onToggleFavorite: (productId: string, e: React.MouseEvent) => void;
  onSelectForPresentation: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onSelectForSale: (product: Product) => void;
}

export function ProductCatalogSection({
  selectedCategory,
  filteredProducts,
  favorites,
  salesMode,
  userRole,
  onToggleFavorite,
  onSelectForPresentation,
  onAddToCart,
  onSelectForSale
}: ProductCatalogSectionProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 mt-6 space-y-10 font-sans" id="showroom-ecommerce-layout">

      {/* Catálogo de Showroom */}
      <section className="space-y-6">
        <div className="flex justify-between items-end border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-600 rounded-sm inline-block" /> Catálogo de Showroom
            </h3>
            <p className="text-xs text-slate-400 mt-1">Nossos móveis disponíveis para visualização e venda</p>
          </div>
        </div>

        {selectedCategory !== 'ALL' && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-lg shadow-blue-500/10 flex items-center justify-between animate-fade-in mb-4 text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 block">Ambiente em Foco</span>
              <h4 className="text-sm md:text-base font-extrabold tracking-tight flex items-center gap-1.5">
                ✨ Móveis em Destaque para {selectedCategory}
              </h4>
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-white">
              {filteredProducts.length} itens encontrados
            </span>
          </div>
        )}

        {/* Grid Layout of Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed border-slate-200 text-center py-12 rounded-2xl">
              <Palette className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-bold text-sm">Nenhum produto localizado com os filtros ativos.</p>
              <p className="text-slate-400 text-xs mt-0.5">Ajuste o termo de pesquisa ou a categoria para visualizar mais peças.</p>
            </div>
          ) : (
            filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                idx={idx}
                isLoved={favorites.includes(product.id)}
                isHighlighted={selectedCategory !== 'ALL'}
                salesMode={salesMode}
                userRole={userRole}
                onToggleFavorite={onToggleFavorite}
                onSelectForPresentation={onSelectForPresentation}
                onAddToCart={onAddToCart}
                onSelectForSale={onSelectForSale}
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}
