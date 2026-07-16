import { ShieldAlert, Search } from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditLogTabProps {
  filteredAuditLogs: AuditLog[];
  auditFilterUser: string;
  auditFilterAction: string;
  onChangeAuditFilterUser: (value: string) => void;
  onChangeAuditFilterAction: (value: string) => void;
}

export function AuditLogTab({
  filteredAuditLogs,
  auditFilterUser,
  auditFilterAction,
  onChangeAuditFilterUser,
  onChangeAuditFilterAction
}: AuditLogTabProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
            Registros de Auditoria e Conformidade
          </h3>
          <p className="text-xs text-slate-400">Histórico de operações críticas realizadas no sistema com rastreabilidade de usuário.</p>
        </div>

        {/* Quick Filter */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Operador (E-mail)..."
              value={auditFilterUser}
              onChange={(e) => onChangeAuditFilterUser(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ação ou Detalhe..."
              value={auditFilterAction}
              onChange={(e) => onChangeAuditFilterAction(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        {filteredAuditLogs.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Operador</th>
                <th className="p-3">Operação</th>
                <th className="p-3">Detalhamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAuditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-slate-500 font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleDateString('pt-BR')} <br />
                    <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{log.userEmail || 'system'}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-bold select-all">ID: {log.userId}</div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold font-mono text-[9px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 font-medium leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-slate-400">
            <p className="text-slate-800 font-semibold text-sm">Nenhum evento registrado com os critérios indicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
