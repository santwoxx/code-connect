import { Clock, Download } from 'lucide-react';
import { BackupFile } from '../../firebase';

interface BackupsTabProps {
  loadingBackups: boolean;
  backups: BackupFile[];
  restoring: boolean;
  restoreMessage: string;
  onRestoreBackup: (backup: BackupFile) => void;
}

export function BackupsTab({ loadingBackups, backups, restoring, restoreMessage, onRestoreBackup }: BackupsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              Histórico de Backups Diários
            </h3>
            <p className="text-xs text-slate-400">Aqui você pode visualizar, fazer o download ou restaurar o sistema para uma versão anterior.</p>
          </div>
        </div>

        {loadingBackups ? (
          <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Carregando histórico de backups...</div>
        ) : backups.length === 0 ? (
          <div className="text-xs text-slate-400 py-8 text-center">Nenhum backup encontrado no armazenamento.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                  <th className="p-3">Nome do Arquivo</th>
                  <th className="p-3">Data de Criação</th>
                  <th className="p-3">Tamanho</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((backup) => (
                  <tr key={backup.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-mono text-slate-800 font-semibold">{backup.name}</td>
                    <td className="p-3 text-slate-650">
                      {new Date(backup.timeCreated).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-slate-500">
                      {(backup.size / 1024).toFixed(2)} KB
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <a
                        href={backup.url}
                        download={backup.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-250/50 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => onRestoreBackup(backup)}
                        disabled={restoring}
                        className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Clock className="w-3.5 h-3.5 text-rose-500" />
                        <span>Restaurar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {restoring && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h4 className="font-bold text-slate-900 text-sm">Restaurando Sistema...</h4>
            <p className="text-xs text-slate-500">{restoreMessage}</p>
            <p className="text-[10px] text-rose-500 font-semibold">Por favor, não feche esta janela ou recarregue a página.</p>
          </div>
        </div>
      )}
    </div>
  );
}
