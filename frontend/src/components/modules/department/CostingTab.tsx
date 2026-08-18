import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { DonutChart } from '../../ui/DonutChart';
import { Plus, X, Trash2, Calculator } from 'lucide-react';
import { departmentApi } from '../../../api/departmentClient';
import { DepartmentCostItem, DepartmentCosting } from '../../../types';
import { formatCurrency } from '../../../lib/currency';
import { colorForCategory } from '../../../lib/financeCategories';

const CATEGORIES = ['Overhead', 'Software', 'Equipment', 'Rent', 'Training', 'Other'];

export const CostingTab: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const [costs, setCosts] = useState<DepartmentCostItem[]>([]);
  const [costing, setCosting] = useState<DepartmentCosting | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Overhead');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'one_time'>('monthly');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [c, s] = await Promise.all([departmentApi.listCostItems(departmentId), departmentApi.getCosting(departmentId)]);
    setCosts(c); setCosting(s);
  };
  useEffect(() => { load(); }, [departmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => { setName(''); setCategory('Overhead'); setAmount(''); setFrequency('monthly'); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setSaving(true);
    try {
      await departmentApi.createCostItem({ department_id: departmentId, name, category, amount: parseFloat(amount), frequency });
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await departmentApi.deleteCostItem(id);
    await load();
  };

  const overheadEntries = Object.entries(costing?.overhead_by_category || {});
  const order = overheadEntries.map(([c]) => c);
  const donutData = [
    ...overheadEntries.map(([c, v]) => ({ label: c, value: v, color: colorForCategory(c, order) })),
    ...(costing && costing.monthly_staff_cost > 0 ? [{ label: 'Staff Salaries', value: costing.monthly_staff_cost, color: '#6b7280' }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Cost Item
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Cost Item</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input required placeholder="Name (e.g. Office rent)" value={name} onChange={(e) => setName(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input required type="number" step="0.01" placeholder="Amount (RM)" value={amount} onChange={(e) => setAmount(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time</option>
            </select>
            <button type="submit" disabled={saving} className="md:col-span-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Cost Item'}
            </button>
          </form>
        </GlassCard>
      )}

      {costing && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard hoverEffect={false} className="text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Staff Cost (Monthly)</p>
            <p className="text-lg font-extrabold text-cyan-400">{formatCurrency(costing.monthly_staff_cost)}</p>
          </GlassCard>
          <GlassCard hoverEffect={false} className="text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Overhead (Monthly)</p>
            <p className="text-lg font-extrabold text-amber-400">{formatCurrency(costing.monthly_overhead_cost)}</p>
          </GlassCard>
          <GlassCard hoverEffect={false} className="text-center border-emerald-500/30">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Monthly Cost</p>
            <p className="text-lg font-extrabold text-emerald-400">{formatCurrency(costing.total_monthly_cost)}</p>
          </GlassCard>
          <GlassCard hoverEffect={false} className="text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Annualized</p>
            <p className="text-lg font-extrabold text-white">{formatCurrency(costing.annualized_cost)}</p>
          </GlassCard>
        </div>
      )}

      {donutData.length > 0 && (
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2"><Calculator className="w-5 h-5 text-cyanAccent" /> Cost Breakdown</h3>
          <DonutChart data={donutData} />
        </GlassCard>
      )}

      <GlassCard className="space-y-3">
        <h3 className="font-bold text-white text-sm">Overhead Cost Items</h3>
        <div className="space-y-1.5">
          {costs.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5 text-xs">
              <div>
                <span className="font-semibold text-white">{c.name}</span>
                <span className="text-slate-500 ml-2">{c.category} • {c.frequency.replace('_', '-')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">{formatCurrency(c.amount)}</span>
                <button onClick={() => handleDelete(c.id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {!costs.length && <p className="text-[11px] text-slate-600 text-center py-3">No overhead cost items yet.</p>}
        </div>
      </GlassCard>
    </div>
  );
};
