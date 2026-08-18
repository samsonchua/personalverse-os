import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Receipt } from 'lucide-react';
import { api } from '../../../api/client';
import { TaxCalculation, TaxReliefItem, FormBEstimate } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const TaxPlanningTab: React.FC = () => {
  const [mode, setMode] = useState<'simple' | 'form-b'>('form-b');
  const [income, setIncome] = useState('');
  const [reliefs, setReliefs] = useState<TaxReliefItem[]>([]);
  const [suggested, setSuggested] = useState<Array<{ name: string; typical_amount: number }>>([]);
  const [reliefName, setReliefName] = useState('');
  const [reliefAmount, setReliefAmount] = useState('');
  const [result, setResult] = useState<TaxCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [formBYear, setFormBYear] = useState(new Date().getFullYear());
  const [formB, setFormB] = useState<FormBEstimate | null>(null);
  const [formBLoading, setFormBLoading] = useState(false);

  useEffect(() => {
    api.getSuggestedReliefs().then(setSuggested);
  }, []);

  const loadFormB = async (year: number, currentReliefs: TaxReliefItem[]) => {
    setFormBLoading(true);
    try {
      setFormB(await api.getFormBEstimate(year, currentReliefs));
    } finally {
      setFormBLoading(false);
    }
  };

  useEffect(() => { if (mode === 'form-b') loadFormB(formBYear, reliefs); }, [mode, formBYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRelief = (name: string, amount: number) => {
    if (reliefs.some((r) => r.name === name)) return;
    setReliefs([...reliefs, { name, amount }]);
  };

  const addCustomRelief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reliefName || !reliefAmount) return;
    addRelief(reliefName, parseFloat(reliefAmount));
    setReliefName('');
    setReliefAmount('');
  };

  const removeRelief = (name: string) => setReliefs(reliefs.filter((r) => r.name !== name));

  const handleCalculate = async () => {
    if (!income) return;
    setCalculating(true);
    try {
      setResult(await api.calculateTax(parseFloat(income), reliefs));
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard hoverEffect={false} className="space-y-3">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Receipt className="w-5 h-5 text-cyanAccent" />
          <span>Malaysia Income Tax Planning</span>
        </h3>
        <p className="text-[11px] text-slate-500">
          Based on LHDN resident-individual progressive tax brackets. Verify current-year brackets and relief caps against LHDN before filing — rates are revised periodically.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setMode('form-b')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${mode === 'form-b' ? 'bg-cyan-500 text-white' : 'bg-slate-900/60 text-slate-400 border border-white/10'}`}>
            Form B (Business Income)
          </button>
          <button onClick={() => setMode('simple')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${mode === 'simple' ? 'bg-cyan-500 text-white' : 'bg-slate-900/60 text-slate-400 border border-white/10'}`}>
            Simple Calculator
          </button>
        </div>
      </GlassCard>

      {mode === 'simple' && (
        <GlassCard hoverEffect={false} className="space-y-3">
          <input
            type="number" step="0.01" placeholder="Annual income (RM)" value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
          />
        </GlassCard>
      )}

      {mode === 'form-b' && (
        <GlassCard hoverEffect={false} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Form B Estimate</h3>
            <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-2 py-1.5">
              <button onClick={() => setFormBYear((y) => y - 1)} className="px-1.5 text-slate-400 hover:text-white">‹</button>
              <span className="text-sm font-bold text-white px-1">{formBYear}</span>
              <button onClick={() => setFormBYear((y) => y + 1)} className="px-1.5 text-slate-400 hover:text-white">›</button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Statutory income by source, pulled automatically from your Income Statement — actual figures for months already past, the Forecasted Income Statement's budget for months still ahead.
            A category (or its parent) named "Business" counts as business income, "Salary" as employment income, everything else as other income.
          </p>
          {formB && !formBLoading && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                      <th className="pb-1.5 font-semibold">Month</th>
                      <th className="pb-1.5 font-semibold text-right">Business</th>
                      <th className="pb-1.5 font-semibold text-right">Employment</th>
                      <th className="pb-1.5 font-semibold text-right">Other</th>
                      <th className="pb-1.5 font-semibold text-right">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {formB.monthly_breakdown.map((m) => (
                      <tr key={m.month}>
                        <td className="py-1 text-slate-300">{MONTH_SHORT[m.month - 1]}</td>
                        <td className="py-1 text-right text-emerald-300">{formatCurrency(m.business)}</td>
                        <td className="py-1 text-right text-cyan-300">{formatCurrency(m.employment)}</td>
                        <td className="py-1 text-right text-slate-300">{formatCurrency(m.other)}</td>
                        <td className={`py-1 text-right text-[9px] uppercase ${m.source === 'actual' ? 'text-slate-500' : 'text-amber-400'}`}>{m.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] text-slate-400 uppercase">Statutory Business</p>
                  <p className="text-sm font-bold text-emerald-300">{formatCurrency(formB.statutory_business_income)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] text-slate-400 uppercase">Statutory Employment</p>
                  <p className="text-sm font-bold text-cyan-300">{formatCurrency(formB.statutory_employment_income)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] text-slate-400 uppercase">Other Income</p>
                  <p className="text-sm font-bold text-slate-300">{formatCurrency(formB.other_income)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/30">
                  <p className="text-[10px] text-slate-400 uppercase">Aggregate Income</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(formB.aggregate_income)}</p>
                </div>
              </div>
            </>
          )}
          <button onClick={() => loadFormB(formBYear, reliefs)} disabled={formBLoading} className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs disabled:opacity-50">
            {formBLoading ? 'Loading...' : 'Recalculate with current reliefs'}
          </button>
        </GlassCard>
      )}

      <GlassCard hoverEffect={false} className="space-y-3">
        <h3 className="font-bold text-white text-sm">Tax Reliefs</h3>
        <div className="flex flex-wrap gap-2">
          {suggested.map((s) => (
            <button
              key={s.name}
              onClick={() => addRelief(s.name, s.typical_amount)}
              disabled={reliefs.some((r) => r.name === s.name)}
              className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/10 text-[11px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-30 transition-all"
            >
              + {s.name} ({formatCurrency(s.typical_amount)})
            </button>
          ))}
        </div>
        <form onSubmit={addCustomRelief} className="flex gap-2">
          <input placeholder="Custom relief name" value={reliefName} onChange={(e) => setReliefName(e.target.value)} className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs" />
          <input type="number" step="0.01" placeholder="Amount (RM)" value={reliefAmount} onChange={(e) => setReliefAmount(e.target.value)} className="w-36 glass-input px-3.5 py-2 rounded-xl text-xs" />
          <button type="submit" className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"><Plus className="w-4 h-4" /></button>
        </form>
        <div className="space-y-1.5">
          {reliefs.map((r) => (
            <div key={r.name} className="flex justify-between items-center text-xs px-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/5">
              <span className="text-slate-300">{r.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{formatCurrency(r.amount)}</span>
                <button onClick={() => removeRelief(r.name)} className="text-slate-500 hover:text-rose-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {!reliefs.length && <p className="text-[11px] text-slate-600">No reliefs added — click a suggestion above or add a custom one.</p>}
        </div>
        {mode === 'simple' && (
          <button
            onClick={handleCalculate}
            disabled={!income || calculating}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50"
          >
            {calculating ? 'Calculating...' : 'Calculate Tax'}
          </button>
        )}
      </GlassCard>

      {(() => {
        const displayedTax = mode === 'simple' ? result : formB?.tax ?? null;
        if (!displayedTax) return null;
        return (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Chargeable Income</p>
              <p className="text-lg font-extrabold text-white">{formatCurrency(displayedTax.chargeable_income)}</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Tax</p>
              <p className="text-lg font-extrabold text-rose-400">{formatCurrency(displayedTax.total_tax)}</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Effective Rate</p>
              <p className="text-lg font-extrabold text-amber-400">{displayedTax.effective_rate_percent}%</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Net Monthly Income</p>
              <p className="text-lg font-extrabold text-emerald-400">{formatCurrency(displayedTax.monthly_net_income)}</p>
            </GlassCard>
          </div>

          <GlassCard className="space-y-3">
            <h3 className="font-bold text-white text-sm">Tax by Bracket</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Bracket</th>
                    <th className="pb-2 font-semibold text-right">Rate</th>
                    <th className="pb-2 font-semibold text-right">Taxable Amount</th>
                    <th className="pb-2 font-semibold text-right">Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedTax.tax_by_bracket.map((b, i) => (
                    <tr key={i}>
                      <td className="py-2 text-slate-300">{b.range}</td>
                      <td className="py-2 text-right text-cyan-300">{b.rate_percent}%</td>
                      <td className="py-2 text-right text-slate-300">{formatCurrency(b.taxable_amount)}</td>
                      <td className="py-2 text-right font-bold text-white">{formatCurrency(b.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
        );
      })()}
    </div>
  );
};
