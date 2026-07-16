import { ShoppingBag, ShoppingCart, Edit2, RotateCcw, Clock, Plus, ArrowLeft } from 'lucide-react';

interface ErpPreviewBannerProps {
  userRole?: string;
  visualEditMode: boolean;
  cartMode: boolean;
  salesMode: boolean;
  cartItemCount: number;
  orderExpirationMinutes: number;
  onToggleSalesMode: () => void;
  onToggleCartMode: () => void;
  onToggleVisualEditMode: () => void;
  onResetLayout: () => void;
  onChangeOrderExpirationMinutes: (minutes: number) => void;
  onClickCadastrarNovoMovel: () => void;
  onBackToErp: () => void;
}

export function ErpPreviewBanner({
  userRole,
  visualEditMode,
  cartMode,
  salesMode,
  cartItemCount,
  orderExpirationMinutes,
  onToggleSalesMode,
  onToggleCartMode,
  onToggleVisualEditMode,
  onResetLayout,
  onChangeOrderExpirationMinutes,
  onClickCadastrarNovoMovel,
  onBackToErp
}: ErpPreviewBannerProps) {
  return (
    <div className="bg-blue-900 border-b border-blue-850 text-white py-2.5 px-4 shadow-sm" id="showroom-admin-banner">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2.5 flex-1">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-blue-100 font-sans">
            {visualEditMode ? (
              <span className="text-amber-400 font-black animate-pulse flex items-center gap-1.5">
                ✨ MODO DE EDIÇÃO VISUAL ATIVO (Clique em qualquer texto para editar ou nas imagens para alterar)
              </span>
            ) : cartMode ? (
              <span className="text-emerald-300 font-black animate-pulse flex items-center gap-1.5">
                🛒 MODO CARRINHO ATIVO (Clique em "Adicionar ao Carrinho" nos produtos, depois clique no ícone do carrinho para finalizar)
              </span>
            ) : salesMode ? (
              <span className="text-indigo-300 font-black animate-pulse flex items-center gap-1.5">
                {userRole === 'vendedor' ? (
                  "📋 ÁREA DE PROPOSTAS ATIVA (Selecione um produto e clique em 'Enviar Proposta' para preencher os dados e enviar ao WhatsApp do cliente)"
                ) : (
                  "🛍️ ÁREA DE VENDAS ATIVA (Selecione um produto e clique em 'Comprar Produto' para iniciar o fluxo de venda direta ao cliente)"
                )}
              </span>
            ) : (
              <span>
                Modo de Apresentação: <strong className="text-white font-extrabold text-[12px] uppercase tracking-wide">Showroom Monstruário</strong> (Ideal para mostrar ao cliente)
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-center">
          {userRole !== 'estoquista' && userRole !== 'entregador' && (
            <>
              <button
                onClick={onToggleSalesMode}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all hover:scale-103 active:scale-97 cursor-pointer shadow-sm font-sans uppercase tracking-wider ${salesMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                title="Acessar Área de Vendas"
              >
                <ShoppingBag className="w-4 h-4 shrink-0 text-white" />
                <span>VENDAS</span>
              </button>
              <button
                onClick={onToggleCartMode}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all hover:scale-103 active:scale-97 cursor-pointer shadow-sm font-sans uppercase tracking-wider ${cartMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                title="Ativar Modo Carrinho"
              >
                <ShoppingCart className="w-4 h-4 shrink-0 text-white" />
                <span>CARRINHO</span>
                {cartItemCount > 0 && (
                  <span className="ml-1 bg-white text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">{cartItemCount}</span>
                )}
              </button>
              <button
                onClick={onToggleVisualEditMode}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all hover:scale-103 active:scale-97 cursor-pointer shadow-sm font-sans uppercase tracking-wider ${visualEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                title="Ativar/Desativar edição visual estilo Canva"
              >
                <Edit2 className="w-4 h-4 shrink-0 text-white" />
                <span>{visualEditMode ? "Fechar Edição Canva" : "Modo Edição Canva"}</span>
              </button>
              {visualEditMode && (
                <>
                  <button
                    onClick={onResetLayout}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-all hover:scale-103 active:scale-97 cursor-pointer shadow-sm font-sans uppercase tracking-wider"
                    title="Redefinir edições visuais"
                  >
                    <RotateCcw className="w-4 h-4 shrink-0 text-white" />
                    <span>Redefinir Layout</span>
                  </button>
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-300">
                    <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">Expirar pedidos em:</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={orderExpirationMinutes || 60}
                      onChange={(e) => onChangeOrderExpirationMinutes(parseInt(e.target.value) || 60)}
                      className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 text-center"
                    />
                    <span className="text-[10px] font-bold text-slate-500">minutos</span>
                  </div>
                </>
              )}
              <button
                onClick={onClickCadastrarNovoMovel}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-all hover:scale-103 active:scale-97 cursor-pointer shadow-sm font-sans uppercase tracking-wider"
                title="Cadastrar novo móvel para exibição no showroom"
              >
                <Plus className="w-4 h-4 shrink-0 text-white font-bold" />
                <span>Cadastrar Novo Móvel</span>
              </button>
            </>
          )}
          <button
            onClick={onBackToErp}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-blue-900 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-103 active:scale-97 cursor-pointer shadow-sm font-sans uppercase tracking-wider"
            title="Voltar para o Painel de Controle ERP"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-blue-900 font-bold" />
            <span>Voltar ao Gerenciador ERP</span>
          </button>
        </div>
      </div>
    </div>
  );
}
