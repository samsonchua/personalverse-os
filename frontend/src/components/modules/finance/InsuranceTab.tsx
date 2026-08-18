import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Pencil, ShieldCheck, TrendingUp } from 'lucide-react';
import { api } from '../../../api/client';
import { InsurancePolicy, NcdForecastPoint } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

const POLICY_LABELS: Record<string, string> = {
  life: 'Life', health: 'Health', car: 'Car', home: 'Home', other: 'Other',
};

export const InsuranceTab: React.FC = () => {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [policyType, setPolicyType] = useState('life');
  const [provider, setProvider] = useState('');
  const [coverage, setCoverage] = useState('');
  const [premium, setPremium] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('yearly');
  const [nominee, setNominee] = useState('');
  const [ncdPercent, setNcdPercent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [ncdPolicyId, setNcdPolicyId] = useState<string | null>(null);
  const [ncdData, setNcdData] = useState<{ current_ncd_percent: number; forecast: NcdForecastPoint[] } | null>(null);

  const [monthlyExpense, setMonthlyExpense] = useState(0);

  const load = () => api.getInsurancePolicies().then(setPolicies);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    // Trailing-average projected monthly expense (same methodology as Cashflow Forecast /
    // Forecasted Income Statement) — far more stable than the current calendar month, which can
    // be sparsely logged early on and skew the coverage ratio wildly.
    api.getForecastedIncomeStatement('monthly').then((stmt) => setMonthlyExpense(stmt.total_expense || 0)).catch(() => {});
  }, []);

  const totalCoverage = policies.reduce((sum, p) => sum + p.coverage_amount, 0);
  const monthsCovered = (amount: number) => (monthlyExpense > 0 ? amount / monthlyExpense : null);

  const resetForm = () => {
    setEditingId(null); setProvider(''); setCoverage(''); setPremium(''); setNominee(''); setNcdPercent('');
    setPolicyType('life'); setFrequency('yearly'); setShowForm(false); setFormError(null);
  };

  const startEdit = (p: InsurancePolicy) => {
    setEditingId(p.id);
    setPolicyType(p.policy_type);
    setProvider(p.provider);
    setCoverage(String(p.coverage_amount));
    setPremium(String(p.premium_amount));
    setFrequency(p.premium_frequency as 'monthly' | 'yearly');
    setNominee(p.nominee || '');
    setNcdPercent(p.ncd_percent != null ? String(p.ncd_percent) : '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !coverage || !premium) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        policy_type: policyType as InsurancePolicy['policy_type'],
        provider,
        coverage_amount: parseFloat(coverage),
        premium_amount: parseFloat(premium),
        premium_frequency: frequency,
        nominee: nominee || undefined,
        ncd_percent: policyType === 'car' && ncdPercent ? parseFloat(ncdPercent) : undefined,
      };
      if (editingId) {
        await api.updateInsurancePolicy(editingId, payload);
      } else {
        await api.createInsurancePolicy(payload);
      }
      resetForm();
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Could not save this policy. Please check the fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteInsurancePolicy(id);
    if (ncdPolicyId === id) { setNcdPolicyId(null); setNcdData(null); }
    await load();
  };

  const toggleNcd = async (policy: InsurancePolicy) => {
    if (ncdPolicyId === policy.id) {
      setNcdPolicyId(null);
      setNcdData(null);
      return;
    }
    const data = await api.getNcdForecast(policy.id, 5);
    setNcdPolicyId(policy.id);
    setNcdData(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4">
          <GlassCard hoverEffect={false} className="text-center px-4 py-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Coverage</p>
            <p className="text-base font-extrabold text-cyan-400">{formatCurrency(totalCoverage)}</p>
          </GlassCard>
          <GlassCard hoverEffect={false} className="text-center px-4 py-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Months of Expenses Covered</p>
            <p className="text-base font-extrabold text-emerald-400">
              {monthsCovered(totalCoverage) !== null ? `${monthsCovered(totalCoverage)!.toFixed(1)}x` : '—'}
            </p>
          </GlassCard>
        </div>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Policy
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Insurance Policy' : 'New Insurance Policy'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={policyType} onChange={(e) => setPolicyType(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {Object.entries(POLICY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input required placeholder="Provider (e.g. AIA, Allianz)" value={provider} onChange={(e) => setProvider(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Nominee (optional)" value={nominee} onChange={(e) => setNominee(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input required type="number" step="0.01" placeholder="Coverage amount (RM)" value={coverage} onChange={(e) => setCoverage(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input required type="number" step="0.01" placeholder="Premium (RM)" value={premium} onChange={(e) => setPremium(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly')} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="yearly">Yearly premium</option>
              <option value="monthly">Monthly premium</option>
            </select>
            {policyType === 'car' && (
              <input type="number" step="0.01" placeholder="Current NCD % (optional)" value={ncdPercent} onChange={(e) => setNcdPercent(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs md:col-span-3" />
            )}
            {formError && <p className="md:col-span-3 text-[11px] text-rose-400">{formError}</p>}
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Policy'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((p) => (
          <GlassCard key={p.id} hoverEffect={false} className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyanAccent" />
                <div>
                  <h4 className="font-bold text-white text-sm">{p.provider}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10">
                    {POLICY_LABELS[p.policy_type] || p.policy_type}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <p className="text-[10px] text-slate-500">Coverage</p>
                <p className="font-bold text-white">{formatCurrency(p.coverage_amount)}</p>
                <p className="text-[10px] text-emerald-400 font-semibold">
                  {monthsCovered(p.coverage_amount) !== null ? `${monthsCovered(p.coverage_amount)!.toFixed(1)}mo of expenses` : '—'}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <p className="text-[10px] text-slate-500">Premium</p>
                <p className="font-bold text-white">{formatCurrency(p.premium_amount)}/{p.premium_frequency === 'monthly' ? 'mo' : 'yr'}</p>
              </div>
            </div>
            {p.nominee && <p className="text-[11px] text-slate-400">Nominee: <span className="text-slate-200 font-semibold">{p.nominee}</span></p>}

            {p.policy_type === 'car' && (
              <button onClick={() => toggleNcd(p)} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-[11px] font-bold border border-violet-500/20">
                <TrendingUp className="w-3.5 h-3.5" /> {ncdPolicyId === p.id ? 'Hide' : 'View'} NCD Forecast
              </button>
            )}

            {ncdPolicyId === p.id && ncdData && (
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <p className="text-[11px] text-slate-400">Current NCD: <span className="text-white font-bold">{ncdData.current_ncd_percent}%</span></p>
                {ncdData.forecast.map((f) => (
                  <div key={f.year_offset} className="flex justify-between text-[11px] px-2 py-1 rounded bg-slate-900/60">
                    <span className="text-slate-400">{f.year_offset === 0 ? 'Now' : `+${f.year_offset}yr`}</span>
                    <span className="text-cyan-300 font-semibold">{f.ncd_percent}% NCD</span>
                    <span className="text-emerald-400 font-semibold">{formatCurrency(f.projected_premium)}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
        {!policies.length && <p className="text-xs text-slate-500 text-center py-8 md:col-span-2">No insurance policies yet — add one above.</p>}
      </div>
    </div>
  );
};
