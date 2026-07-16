import { ReactNode } from 'react';

interface DeleteConfirmationDialogProps {
  domId?: string;
  icon: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationDialog({
  domId,
  icon,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm
}: DeleteConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id={domId}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 transform scale-100 transition-all duration-300">
        <div className="p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">{title}</h3>
          <p className="text-sm text-slate-500 mb-6">
            {message}
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
