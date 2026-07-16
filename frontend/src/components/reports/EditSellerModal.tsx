interface EditSellerModalProps {
  name: string;
  username: string;
  password: string;
  googleEmail: string;
  onChangeName: (value: string) => void;
  onChangeUsername: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeGoogleEmail: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditSellerModal({
  name,
  username,
  password,
  googleEmail,
  onChangeName,
  onChangeUsername,
  onChangePassword,
  onChangeGoogleEmail,
  onCancel,
  onSubmit
}: EditSellerModalProps) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="edit-seller-dialog">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base font-bold font-display text-slate-900">Editar Cadastro do Vendedor</h3>
          <button onClick={onCancel} className="text-slate-405 hover:text-slate-650 text-sm">✕</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1">Nome de Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => onChangeUsername(e.target.value.replace(/\s/g, ""))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-850 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1">Senha de Acesso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-850 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1">E-mail do Google (Gmail)</label>
            <input
              type="email"
              value={googleEmail}
              onChange={(e) => onChangeGoogleEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
