interface CategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const MAIN_CATEGORIES = ["Sala de estar", "Sala de jantar", "Quarto", "Cozinha", "Banheiro"];
const EXTRA_CATEGORIES = ["Eletrodomesticos", "Escritório", "Lavanderia"];

export function CategoryNav({ selectedCategory, onSelectCategory }: CategoryNavProps) {
  return (
    <nav className="bg-slate-900 border-y border-slate-800 text-white px-4 font-sans shadow-sm overflow-x-auto scrollbar-none whitespace-nowrap">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 md:gap-3 py-1">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${selectedCategory === 'ALL' ? 'border-blue-500 text-blue-400 font-extrabold bg-slate-800/20' : 'border-transparent text-slate-300 hover:text-white hover:border-slate-700'}`}
        >
          Todos os Ambientes
        </button>

        {MAIN_CATEGORIES.map((catName) => {
          const isSelected = selectedCategory.toLowerCase() === catName.toLowerCase();
          return (
            <button
              key={catName}
              onClick={() => onSelectCategory(catName)}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${isSelected ? 'border-blue-500 text-blue-400 font-extrabold bg-slate-800/20' : 'border-transparent text-slate-300 hover:text-white hover:border-slate-700'}`}
            >
              {catName}
            </button>
          );
        })}

        <span className="text-slate-700 px-1 hidden md:inline">|</span>

        {EXTRA_CATEGORIES.map((tab) => (
          <button
            key={tab}
            onClick={() => onSelectCategory(tab)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${selectedCategory === tab ? 'border-blue-500 text-blue-400 font-extrabold bg-slate-800/20' : 'border-transparent text-slate-300 hover:text-white hover:border-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}
