import { Palette, Search, ShoppingCart, Heart, User, Phone } from 'lucide-react';
import { EditableText } from './EditableText';
import { EditableImageWrapper } from './EditableImageWrapper';
import { DEFAULT_CUSTOMIZATION } from '../../config/showroomData';

interface ShowroomHeaderProps {
  customization: typeof DEFAULT_CUSTOMIZATION;
  visualEditMode: boolean;
  onTriggerImageEdit: (key: string, title: string) => void;
  onUpdateCustomization: (key: string, value: any) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  cartItemCount: number;
  favoritesCount: number;
  onOpenCart: () => void;
}

export function ShowroomHeader({
  customization,
  visualEditMode,
  onTriggerImageEdit,
  onUpdateCustomization,
  searchQuery,
  onSearchQueryChange,
  cartItemCount,
  favoritesCount,
  onOpenCart
}: ShowroomHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 md:relative z-40 px-4 py-4 font-sans shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <EditableImageWrapper
            visualEditMode={visualEditMode}
            onEditClick={() => onTriggerImageEdit('brandLogo', 'Trocar Logotipo da Loja')}
          >
            {customization.brandLogo ? (
              <img src={customization.brandLogo} className="w-10 h-10 object-contain rounded-lg" alt="Logo" referrerPolicy="no-referrer" />
            ) : (
              <div className="p-2 bg-blue-600 rounded-xl text-white flex items-center justify-center shadow-md shadow-blue-500/10">
                <Palette className="w-6 h-6 shrink-0 animate-spin-slow text-white" />
              </div>
            )}
          </EditableImageWrapper>
          <div>
            <div className="font-black text-lg md:text-xl text-slate-900 leading-none tracking-tight">
              <EditableText
                text={customization.brandName}
                onChange={(val) => onUpdateCustomization('brandName', val)}
                visualEditMode={visualEditMode}
              />
            </div>
            <span className="text-[10px] text-blue-600 font-extrabold tracking-wider uppercase block mt-1">
              <EditableText
                text={customization.brandSlogan}
                onChange={(val) => onUpdateCustomization('brandSlogan', val)}
                visualEditMode={visualEditMode}
              />
            </span>
          </div>
        </div>

        {/* Centered Search Bar */}
        <div className="relative w-full md:max-w-xl">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Busque por modelos de buffet, painel, cabeceiras, sapateiras..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-4 pr-12 py-2.5 text-xs border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl bg-slate-50 focus:bg-white text-slate-800 transition-all shadow-inner font-medium placeholder-slate-400"
            />
            <button
              type="button"
              className="absolute right-1 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Right Header Controls / Status widgets */}
        <div className="hidden lg:flex items-center gap-5">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500">
              <Phone className="w-4 h-4 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight block">Compre no WhatsApp</span>
              <span className="text-xs font-extrabold text-emerald-600 hover:underline">
                <EditableText
                  text={customization.whatsappNumber}
                  onChange={(val) => {
                    onUpdateCustomization('whatsappNumber', val);
                    // Update link by cleaning formatting (only numbers)
                    const cleaned = val.replace(/\D/g, "");
                    onUpdateCustomization('whatsappLink', cleaned.startsWith("55") ? cleaned : "55" + cleaned);
                  }}
                  visualEditMode={visualEditMode}
                />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-left relative cursor-pointer group" onClick={onOpenCart}>
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 hover:text-emerald-500 transition-colors">
              <ShoppingCart className={`w-4 h-4 font-bold ${cartItemCount > 0 ? 'text-emerald-600' : ''}`} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-emerald-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white scale-95">
                  {cartItemCount}
                </span>
              )}
            </div>
            <div className="hidden xl:block">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Meu Carrinho</span>
              <span className="text-xs font-bold text-slate-700 block text-nowrap">{cartItemCount > 0 ? `${cartItemCount} item(ns)` : 'Vazio'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-left relative cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors">
              <Heart className="w-4 h-4 font-bold text-red-500 fill-red-500" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white scale-95">
                  {favoritesCount}
                </span>
              )}
            </div>
            <div className="hidden xl:block">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ver Favoritos</span>
              <span className="text-xs font-bold text-slate-700 block text-nowrap">Showroom Selecionado</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-left font-sans">
            <div className="w-9 h-9 bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 rounded-full">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">
                <EditableText
                  text={customization.profileGreeting}
                  onChange={(val) => onUpdateCustomization('profileGreeting', val)}
                  visualEditMode={visualEditMode}
                />
              </span>
              <span className="text-xs font-bold text-slate-850 block">
                <EditableText
                  text={customization.profileName}
                  onChange={(val) => onUpdateCustomization('profileName', val)}
                  visualEditMode={visualEditMode}
                />
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
