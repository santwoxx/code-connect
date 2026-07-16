import React from 'react';
import { ClipboardList, Download, Plus } from 'lucide-react';

interface BudgetsHeaderProps {
  handleExportCsv: () => void;
  onOpenAddModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BudgetsHeader: React.FC<BudgetsHeaderProps> = ({
  handleExportCsv,
  onOpenAddModal,
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl border border-blue-800/40 shadow-lg text-white">
      <div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-blue-400" />
          <span>Módulo de Pedidos e Orçamentos</span>
        </h1>
        <p className="text-xs text-blue-200 mt-1">Gerencie os orçamentos emitidos, edite propostas de clientes, fature pedidos para baixar estoque e emita simulações de Nota Fiscal (NF-e).</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {/* Exportar Relatório Button */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 border border-slate-700/50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Exportar Relatório</span>
        </button>

        {/* Gerar Pedido Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Gerar Pedido/Orçamento</span>
        </button>

        {/* Status Tab selectors */}
        <div className="flex bg-slate-900/45 p-1 rounded-xl border border-slate-700/30 gap-1 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Orçamentos' },
            { id: 'COMPLETED', label: 'Faturados' },
            { id: 'CANCELLED', label: 'Cancelados' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
