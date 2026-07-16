import { Award, Users, TrendingUp } from 'lucide-react';
import { Seller, MonthlyGoal } from '../../types';
import { formatCurrency } from '../../utils/format';

interface GoalsTabProps {
  currentMonth: string;
  currentMonthName: string;
  goalsLoading: boolean;
  teamGoal: MonthlyGoal | undefined;
  teamMonthlyRevenue: number;
  sellers: Seller[];
  sellerMonthlyRevenue: Record<string, number>;
  getGoalDraft: (id: string, existingValue?: number) => string;
  getSellerGoal: (sellerId: string) => MonthlyGoal | undefined;
  onChangeGoalDraft: (id: string, value: string) => void;
  onSaveGoal: (id: string, sellerId: string | undefined, type: 'TEAM' | 'INDIVIDUAL', sellerName?: string) => void;
}

export function GoalsTab({
  currentMonth,
  currentMonthName,
  goalsLoading,
  teamGoal,
  teamMonthlyRevenue,
  sellers,
  sellerMonthlyRevenue,
  getGoalDraft,
  getSellerGoal,
  onChangeGoalDraft,
  onSaveGoal
}: GoalsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Team Goal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Meta do Time — {currentMonthName}
            </h3>
            <p className="text-xs text-slate-400">Defina a meta de faturamento coletiva e acompanhe o progresso do time.</p>
          </div>
        </div>

        {goalsLoading ? (
          <div className="text-xs text-slate-400 py-4 text-center">Carregando metas...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meta do Time (R$)</span>
                <input
                  type="number"
                  placeholder="Valor da meta..."
                  value={getGoalDraft('goal_team_' + currentMonth, teamGoal?.value)}
                  onChange={(e) => onChangeGoalDraft('goal_team_' + currentMonth, e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-mono w-48"
                />
              </div>
              <button
                onClick={() => onSaveGoal('goal_team_' + currentMonth, undefined, 'TEAM')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Salvar Meta do Time
              </button>
            </div>

            {teamGoal && teamGoal.value > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">Progresso do Time</span>
                  <span className={teamMonthlyRevenue >= teamGoal.value ? 'text-emerald-600' : 'text-blue-600'}>
                    {formatCurrency(teamMonthlyRevenue)} / {formatCurrency(teamGoal.value)}
                    {' '}({Math.min(100, ((teamMonthlyRevenue / teamGoal.value) * 100)).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      teamMonthlyRevenue >= teamGoal.value ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (teamMonthlyRevenue / teamGoal.value) * 100)}%` }}
                  />
                </div>
                {teamMonthlyRevenue >= teamGoal.value && (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Meta do time atingida! Bônus coletivo garantido!
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Individual Seller Goals */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Metas Individuais — {currentMonthName}
          </h3>
          <p className="text-xs text-slate-400">Defina a meta mensal de faturamento para cada vendedor.</p>
        </div>

        {goalsLoading ? (
          <div className="text-xs text-slate-400 py-4 text-center">Carregando metas...</div>
        ) : sellers.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Nenhum vendedor cadastrado.</p>
        ) : (
          <div className="space-y-4">
            {sellers.map(seller => {
              const sellerGoal = getSellerGoal(seller.id);
              const goalId = 'goal_ind_' + seller.id + '_' + currentMonth;
              const revenue = sellerMonthlyRevenue[seller.id] || 0;
              const goalValue = sellerGoal?.value || 0;

              return (
                <div key={seller.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{seller.name}</span>
                      {!seller.active && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">Inativo</span>
                      )}
                      <p className="text-[10px] text-slate-400">@{seller.username}</p>
                    </div>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="space-y-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Meta (R$)</span>
                        <input
                          type="number"
                          placeholder="Meta..."
                          value={getGoalDraft(goalId, sellerGoal?.value)}
                          onChange={(e) => onChangeGoalDraft(goalId, e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-mono w-32"
                        />
                      </div>
                      <button
                        onClick={() => onSaveGoal(goalId, seller.id, 'INDIVIDUAL', seller.name)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>

                  {goalValue > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Faturamento Atual</span>
                        <span className={revenue >= goalValue ? 'text-emerald-600' : 'text-blue-600'}>
                          {formatCurrency(revenue)} / {formatCurrency(goalValue)}
                          {' '}({Math.min(100, (revenue / goalValue) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            revenue >= goalValue ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, (revenue / goalValue) * 100)}%` }}
                        />
                      </div>
                      {revenue >= goalValue && (
                        <p className="text-[10px] font-bold text-emerald-600">Meta atingida!</p>
                      )}
                    </div>
                  )}

                  {goalValue === 0 && (
                    <p className="text-[10px] text-slate-400 italic">Nenhuma meta definida para este vendedor.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
