import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { TrendingUp } from 'lucide-react';
import { api } from '../../../api/client';
import { CashflowForecast } from '../../../types';
import { formatCurrency, formatCurrencySigned } from '../../../lib/currency';

const GRANULARITIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_yearly', label: 'Semi-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

export const CashflowForecastTab: React.FC = () => {
  const [granularity, setGranularity] = useState('monthly');
  const [includeStandbyCash, setIncludeStandbyCash] = useState(false);
  const [data, setData] = useState<CashflowForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data) setLoading(true);
    api.getCashflowForecast(granularity, undefined, includeStandbyCash).then((res) => { setData(res); setLoading(false); });
  }, [granularity, includeStandbyCash]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <GlassCard hoverEffect={false} className="space-y-3">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyanAccent" />
          <span>Cashflow Forecast</span>
        </h3>
        <p className="text-xs text-slate-400">
          Driven by your Forecasted Income Statement's budget, not an average — each month's budgeted
          income/expense is assumed to land on that month's last day. Whatever's already actually happened
          this month is deducted from the budget first, so the projection tightens as the month goes on.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGranularity(g.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  granularity === g.value ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            <input type="checkbox" checked={includeStandbyCash} onChange={(e) => setIncludeStandbyCash(e.target.checked)} className="accent-cyan-500" />
            Include standby cash accounts in starting balance
          </label>
        </div>
      </GlassCard>

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                Starting Cash Balance{includeStandbyCash ? ' (incl. standby cash)' : ''}
              </p>
              <p className="text-xl font-extrabold text-white">{formatCurrency(data.current_balance)}</p>
            </GlassCard>
          </div>

          <GlassCard className="space-y-3">
            <h3 className="font-bold text-white text-sm">Projected Balance — {GRANULARITIES.find((g) => g.value === granularity)?.label}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Period Ending</th>
                    <th className="pb-2 font-semibold text-right">Remaining Budgeted Income</th>
                    <th className="pb-2 font-semibold text-right">Remaining Budgeted Expense</th>
                    <th className="pb-2 font-semibold text-right">Net</th>
                    <th className="pb-2 font-semibold text-right">Projected Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.forecast.map((f) => (
                    <tr key={f.period_index} className="hover:bg-slate-800/40">
                      <td className="py-2 text-slate-300">{f.period_end_date}</td>
                      <td className="py-2 text-right text-emerald-400">{formatCurrency(f.projected_income)}</td>
                      <td className="py-2 text-right text-rose-400">{formatCurrency(f.projected_expense)}</td>
                      <td className={`py-2 text-right font-semibold ${f.projected_net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCurrencySigned(f.projected_net)}</td>
                      <td className="py-2 text-right font-bold text-white">{formatCurrency(f.projected_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
};
