import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { PiggyBank, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../../api/client';
import { EPFProfile, EPFForecast } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

export const EPFTab: React.FC = () => {
  const [profile, setProfile] = useState<EPFProfile | null>(null);
  const [forecast, setForecast] = useState<EPFForecast | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentBalance, setCurrentBalance] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [employeeRate, setEmployeeRate] = useState('11');
  const [employerRate, setEmployerRate] = useState('12');
  const [dividendRate, setDividendRate] = useState('5.5');
  const [currentAge, setCurrentAge] = useState('30');
  const [retirementAge, setRetirementAge] = useState('60');
  const [withdrawalRate, setWithdrawalRate] = useState('4');

  const load = async () => {
    const p = await api.getEpfProfile();
    if (p) {
      setProfile(p);
      setCurrentBalance(String(p.current_balance));
      setMonthlySalary(String(p.monthly_salary));
      setEmployeeRate(String(p.employee_contribution_rate));
      setEmployerRate(String(p.employer_contribution_rate));
      setDividendRate(String(p.annual_dividend_rate));
      setCurrentAge(String(p.current_age));
      setRetirementAge(String(p.retirement_age));
      setWithdrawalRate(String(p.safe_withdrawal_rate ?? 4));
      setForecast(await api.getEpfForecast());
    }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.upsertEpfProfile({
        current_balance: parseFloat(currentBalance) || 0,
        monthly_salary: parseFloat(monthlySalary) || 0,
        employee_contribution_rate: parseFloat(employeeRate) || 11,
        employer_contribution_rate: parseFloat(employerRate) || 12,
        annual_dividend_rate: parseFloat(dividendRate) || 5.5,
        current_age: parseInt(currentAge) || 30,
        retirement_age: parseInt(retirementAge) || 60,
        safe_withdrawal_rate: parseFloat(withdrawalRate) || 4,
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const maxBalance = Math.max(1, ...(forecast?.years.map((y) => y.balance) || [1]));

  return (
    <div className="space-y-4">
      <GlassCard hoverEffect={false} className="space-y-3">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-cyanAccent" />
          <span>EPF & Retirement Profile</span>
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <input
              type="number" step="0.01" placeholder="Current EPF balance (RM)" value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)} disabled={!!profile?.is_balance_synced}
              className="glass-input px-3.5 py-2 rounded-xl text-xs w-full disabled:opacity-60"
            />
            {profile?.is_balance_synced && (
              <p className="text-[9px] text-violet-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" /> Synced from Accounts tagged "EPF"
              </p>
            )}
          </div>
          <input type="number" step="0.01" placeholder="Monthly salary (RM)" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <input type="number" placeholder="Current age" value={currentAge} onChange={(e) => setCurrentAge(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <input type="number" placeholder="Retirement age" value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <input type="number" step="0.1" placeholder="Employee contribution %" value={employeeRate} onChange={(e) => setEmployeeRate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <input type="number" step="0.1" placeholder="Employer contribution %" value={employerRate} onChange={(e) => setEmployerRate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <input type="number" step="0.1" placeholder="Annual dividend rate %" value={dividendRate} onChange={(e) => setDividendRate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <input type="number" step="0.1" placeholder="Safe withdrawal rate % (retirement)" value={withdrawalRate} onChange={(e) => setWithdrawalRate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <button type="submit" disabled={saving} className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Forecast'}
          </button>
        </form>
        <p className="text-[11px] text-slate-500">Malaysia EPF defaults: employee 11%, employer 12-13%, historical dividend averages ~5-6%/yr — adjust to your own statement. Safe withdrawal rate (default 4%) is how much of your balance you'd draw per year in retirement.</p>
      </GlassCard>

      {profile && forecast && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Current Balance</p>
              <p className="text-xl font-extrabold text-white">{formatCurrency(profile.current_balance)}</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Annual Contribution</p>
              <p className="text-xl font-extrabold text-cyan-400">{formatCurrency(forecast.annual_contribution)}</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center border-emerald-500/30">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Projected at Retirement</p>
              <p className="text-xl font-extrabold text-emerald-400">{formatCurrency(forecast.projected_retirement_balance)}</p>
            </GlassCard>
          </div>

          <GlassCard hoverEffect={false} className={`space-y-3 ${forecast.is_on_track ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyanAccent" />
              <span>Retirement Readiness</span>
              {forecast.is_on_track ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> On Track</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold uppercase"><AlertTriangle className="w-3.5 h-3.5" /> Shortfall</span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              At a {forecast.safe_withdrawal_rate}% safe withdrawal rate, your projected balance funds {formatCurrency(forecast.projected_monthly_retirement_income)}/month in retirement,
              compared to your current average monthly expense of {formatCurrency(forecast.current_avg_monthly_expense)} (in today's money — this doesn't account for inflation).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Projected Monthly Income</p>
                <p className="text-sm font-bold text-emerald-300">{formatCurrency(forecast.projected_monthly_retirement_income)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Current Avg Monthly Expense</p>
                <p className="text-sm font-bold text-rose-300">{formatCurrency(forecast.current_avg_monthly_expense)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase">{forecast.retirement_income_gap >= 0 ? 'Surplus' : 'Shortfall'}</p>
                <p className={`text-sm font-bold ${forecast.retirement_income_gap >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCurrency(Math.abs(forecast.retirement_income_gap))}/mo</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="space-y-3">
            <h3 className="font-bold text-white text-sm">Projected Balance Growth</h3>
            <div className="space-y-1.5">
              {forecast.years.map((y) => (
                <div key={y.age} className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 w-14 shrink-0">Age {y.age}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-4 relative overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-4 rounded-full transition-all" style={{ width: `${(y.balance / maxBalance) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-white w-28 text-right shrink-0">{formatCurrency(y.balance)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
};
