import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Category } from '../../types';

interface CategoryFormProps {
  onAddCategory: (category: Omit<Category, 'id'>) => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ onAddCategory }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('Insira um nome válido para o cadastro de categorias.');
      return;
    }

    onAddCategory({
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim() || undefined
    });

    setNewCategoryName('');
    setNewCategoryDesc('');
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
      <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-1.5">
        <Plus className="w-4.5 h-4.5 text-slate-605 font-bold" /> Nova Categoria
      </h3>
      
      <form onSubmit={handleCreateCategory} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Nome da Categoria <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Hardware"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Breve descrição da categoria
          </label>
          <textarea
            placeholder="Ex: Peças, processadores, placas e memórias físicas."
            value={newCategoryDesc}
            onChange={(e) => setNewCategoryDesc(e.target.value)}
            rows={2.5}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          Cadastrar Categoria
        </button>
      </form>
    </div>
  );
};
