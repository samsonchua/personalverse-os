import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { ProjectionChart } from '../../ui/ProjectionChart';
import { LineChart, Plus, Trash2, Save, Building2 } from 'lucide-react';
import { financeModelingApi } from '../../../api/financeModelingClient';
import { departmentApi } from '../../../api/departmentClient';
import { FinanceScenario, FinanceProjection, Department } from '../../../types';
import { formatCurrency, formatCurrencySigned } from '../../../lib/currency';

const emptyForm = (): Partial<FinanceScenario> => ({
  name: 'New Scenario',
  scope: 'personal',
  starting_balance: 0,
  monthly_income: 0,
  monthly_expense: 0,
  income_growth_rate_pct: 5,
  expense_growth_rate_pct: 3,
  projection_years: 5,
});

export const FinanceModelingTab: React.FC = () => {
  const [scenarios, setScenarios] = useState<FinanceScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<FinanceScenario>>(emptyForm());
  const [projection, setProjection] = useState<FinanceProjection | null>(null);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pickerDeptId, setPickerDeptId] = useState('');
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const loadScenarios = () => financeModelingApi.listScenarios().then(setScenarios);

  useEffect(() => {
    loadScenarios();
  }, []);

  useEffect(() => {
    if (form.scope === 'business' && !departments.length) {
      departmentApi.listDepartments().then(setDepartments);
    }
  }, [form.scope]);

  const selectScenario = async (s: FinanceScenario | null) => {
    setSelectedId(s?.id ?? null);
    setForm(s ?? emptyForm());
    setShowDeptPicker(false);
    if (s) {
      const proj = await financeModelingApi.project(s.id);
      setProjection(proj);
    } else {
      setProjection(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const id: string = selectedId ?? (await financeModelingApi.createScenario(form)).id;
      if (selectedId) {
        await financeModelingApi.updateScenario(id, form);
      } else {
        setSelectedId(id);
      }
      await loadScenarios();
      setProjection(await financeModelingApi.project(id));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await financeModelingApi.deleteScenario(id);
    if (selectedId === id) selectScenario(null);
    await loadScenarios();
  };

  const handlePullCosting = async () => {
    if (!pickerDeptId) return;
    const costing = await departmentApi.getCosting(pickerDeptId);
    setForm((prev) => ({ ...prev, monthly_expense: costing.total_monthly_cost }));
    setShowDeptPicker(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-2">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <LineChart className="w-4 h-4 text-cyanAccent" /> Scenarios
        </h3>
        <button onClick={() => selectScenario(null)} className="w-full px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> New Scenario
        </button>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {scenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => selectScenario(s)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer ${
                selectedId === s.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">{s.scope}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="text-slate-500 hover:text-rose-400 shrink-0 ml-2">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!scenarios.length && <p className="text-xs text-slate-500 py-4 text-center">No scenarios yet.</p>}
        </div>
      </GlassCard>

      <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-3">
        <h3 className="font-bold text-white text-sm">Assumptions</h3>
        <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Scenario name" className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
        <div className="flex gap-2">
          <button onClick={() => setForm({ ...form, scope: 'personal' })} className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.scope === 'personal' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-300'}`}>Personal</button>
          <button onClick={() => setForm({ ...form, scope: 'business' })} className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.scope === 'business' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-300'}`}>SamGY Business</button>
        </div>

        {form.scope === 'business' && (
          <div className="space-y-2 p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
            <button onClick={() => setShowDeptPicker(!showDeptPicker)} className="text-[11px] text-cyan-400 flex items-center gap-1.5 font-semibold">
              <Building2 className="w-3.5 h-3.5" /> Pull monthly expense from Department Costing
            </button>
            {showDeptPicker && (
              <div className="flex gap-2">
                <select value={pickerDeptId} onChange={(e) => setPickerDeptId(e.target.value)} className="flex-1 glass-input px-2 py-1.5 rounded-lg text-[11px] bg-slate-900">
                  <option value="">Select department...</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={handlePullCosting} className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-[11px] font-bold">Pull</button>
              </div>
            )}
          </div>
        )}

        <label className="block text-[10px] text-slate-400 uppercase tracking-wider">Starting Balance (RM)</label>
        <input type="number" value={form.starting_balance ?? 0} onChange={(e) => setForm({ ...form, starting_balance: parseFloat(e.target.value) || 0 })} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider">Monthly Income (RM)</label>
            <input type="number" value={form.monthly_income ?? 0} onChange={(e) => setForm({ ...form, monthly_income: parseFloat(e.target.value) || 0 })} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider">Monthly Expense (RM)</label>
            <input type="number" value={form.monthly_expense ?? 0} onChange={(e) => setForm({ ...form, monthly_expense: parseFloat(e.target.value) || 0 })} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider">Income Growth %/yr</label>
            <input type="number" step="0.1" value={form.income_growth_rate_pct ?? 0} onChange={(e) => setForm({ ...form, income_growth_rate_pct: parseFloat(e.target.value) || 0 })} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider">Expense Growth %/yr</label>
            <input type="number" step="0.1" value={form.expense_growth_rate_pct ?? 0} onChange={(e) => setForm({ ...form, expense_growth_rate_pct: parseFloat(e.target.value) || 0 })} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
          </div>
        </div>

        <label className="block text-[10px] text-slate-400 uppercase tracking-wider">Projection Years</label>
        <input type="number" min="1" max="30" value={form.projection_years ?? 5} onChange={(e) => setForm({ ...form, projection_years: parseInt(e.target.value) || 5 })} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />

        <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : selectedId ? 'Update & Recalculate' : 'Save & Project'}
        </button>
      </GlassCard>

      <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-3">
        <h3 className="font-bold text-white text-sm">Projection</h3>
        {projection ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Ending Balance</p>
                <p className={`text-base font-extrabold ${projection.ending_balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(projection.ending_balance)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Net Change</p>
                <p className="text-base font-extrabold text-white">{formatCurrencySigned(projection.ending_balance - projection.starting_balance)}</p>
              </div>
            </div>
            <ProjectionChart data={projection.years} />
            <div className="max-h-56 overflow-y-auto space-y-1">
              {projection.years.map((y) => (
                <div key={y.year} className="flex justify-between text-[11px] px-2 py-1.5 rounded-lg bg-slate-900/60">
                  <span className="text-slate-400">Year {y.year}</span>
                  <span className={y.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrencySigned(y.net)}</span>
                  <span className="text-slate-300 font-semibold">{formatCurrency(y.cumulative_balance)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500 text-center py-10">Save a scenario to see its projection.</p>
        )}
      </GlassCard>
    </div>
  );
};
