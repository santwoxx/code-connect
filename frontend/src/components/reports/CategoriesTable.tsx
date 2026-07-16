import React from 'react';
import { Trash2 } from 'lucide-react';
import { Category } from '../../types';

interface CategoriesTableProps {
  categories: Category[];
  onDeleteRequest: (category: { id: string; name: string }) => void;
}

export const CategoriesTable: React.FC<CategoriesTableProps> = ({ categories, onDeleteRequest }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 overflow-hidden">
      <h3 className="text-base font-bold font-display text-slate-900 mb-3">Categorias Ativas</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[450px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/65 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3">Nome da Categoria</th>
              <th className="p-3">Descrição complementar</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((cat) => {
              return (
                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-bold text-slate-900 text-sm">
                     {cat.name}
                  </td>
                  <td className="p-3 text-slate-500 italic max-w-[200px] truncate" title={cat.description || ''}>
                    {cat.description || <span className="text-slate-350">Sem descrição cadastrada</span>}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        onDeleteRequest({ id: cat.id, name: cat.name });
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      title="Excluir Categoria"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
