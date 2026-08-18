import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { DonutChart } from '../../ui/DonutChart';
import { Plus, X, Trash2, Pencil, LineChart, RefreshCw } from 'lucide-react';
import { api } from '../../../api/client';
import { Investment, InvestmentSummary } from '../../../types';
import { formatCurrency, formatCurrencySigned } from '../../../lib/currency';
import { colorForCategory } from '../../../lib/financeCategories';

const relativeUpdate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const TYPE_LABELS: Record<string, string> = {
  stock: 'Stock', etf: 'ETF', unit_trust: 'Unit Trust', crypto: 'Crypto', bond: 'Bond', reit: 'REIT', other: 'Other',
};

export const InvestmentsTab: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('stock');
  const [units, setUnits] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [symbol, setSymbol] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshErrors, setRefreshErrors] = useState<string[]>([]);

  const load = async () => {
    const [invs, sum] = await Promise.all([api.getInvestments(), api.getInvestmentSummary()]);
    setInvestments(invs);
    setSummary(sum);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName(''); setUnits(''); setAvgCost(''); setCurrentPrice(''); setSymbol(''); setType('stock'); setEditingId(null); setShowForm(false);
  };

  const startEdit = (inv: Investment) => {
    setEditingId(inv.id);
    setName(inv.name);
    setType(inv.investment_type);
    setUnits(String(inv.units));
    setAvgCost(String(inv.avg_cost_per_unit));
    setCurrentPrice(String(inv.current_price_per_unit));
    setSymbol(inv.symbol || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !units || !avgCost || !currentPrice) return;
    setSaving(true);
    try {
      const payload = {
        name, investment_type: type as Investment['investment_type'],
        units: parseFloat(units), avg_cost_per_unit: parseFloat(avgCost), current_price_per_unit: parseFloat(currentPrice),
        symbol: symbol.trim() || undefined,
      };
      if (editingId) {
        await api.updateInvestment(editingId, payload);
      } else {
        await api.createInvestment(payload);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteInvestment(id);
    await load();
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const { results } = await api.refreshAllInvestments();
      setRefreshErrors(results.filter((r) => r.error).map((r) => `${r.name}: ${r.error}`));
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const allocationEntries = Object.entries(summary?.allocation_by_type || {});
  const allocationOrder = allocationEntries.map(([t]) => t);
  const donutData = allocationEntries.map(([t, v]) => ({ label: TYPE_LABELS[t] || t, value: v, color: colorForCategory(t, allocationOrder) }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh Prices'}
        </button>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Holding
        </button>
      </div>

      {refreshErrors.length > 0 && (
        <GlassCard hoverEffect={false} className="border-amber-500/30 space-y-1">
          <p className="text-xs font-bold text-amber-400">Some holdings couldn't be refreshed:</p>
          {refreshErrors.map((e) => <p key={e} className="text-[11px] text-slate-400">{e}</p>)}
        </GlassCard>
      )}

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Holding' : 'New Holding'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input required placeholder="Name (e.g. VWRA, Bitcoin)" value={name} onChange={(e) => setName(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input required type="number" step="0.0001" placeholder="Units" value={units} onChange={(e) => setUnits(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input required type="number" step="0.01" placeholder="Avg cost / unit (RM)" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input required type="number" step="0.01" placeholder="Current price / unit (RM)" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Symbol for live price (e.g. 1155.KLSE) — optional" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Holding'}
            </button>
          </form>
          <p className="text-[10px] text-slate-500">
            Symbol format is EODHD's ticker.exchange (e.g. Bursa Malaysia stocks use ".KLSE" — Maybank is "1155.KLSE"). Leave blank to manage the price by hand.
          </p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Portfolio Value</p>
          <p className="text-xl font-extrabold text-white">{formatCurrency(summary?.total_current_value ?? 0)}</p>
        </GlassCard>
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Cost Basis</p>
          <p className="text-xl font-extrabold text-slate-300">{formatCurrency(summary?.total_cost_basis ?? 0)}</p>
        </GlassCard>
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Gain/Loss</p>
          <p className={`text-xl font-extrabold ${(summary?.total_gain_loss ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrencySigned(summary?.total_gain_loss ?? 0)} ({summary?.total_gain_loss_pct ?? 0}%)
          </p>
        </GlassCard>
      </div>

      {donutData.length > 0 && (
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <LineChart className="w-5 h-5 text-cyanAccent" />
            <span>Allocation by Type</span>
          </h3>
          <DonutChart data={donutData} />
        </GlassCard>
      )}

      {investments.length > 0 && <PerformanceAnalysis investments={investments} totalValue={summary?.total_current_value ?? 0} />}

      <GlassCard className="space-y-3">
        <h3 className="font-bold text-white text-sm">Holdings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th className="pb-2 font-semibold">Name</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold text-right">Units</th>
                <th className="pb-2 font-semibold text-right">Avg Cost</th>
                <th className="pb-2 font-semibold text-right">Value</th>
                <th className="pb-2 font-semibold text-right">Gain/Loss</th>
                <th className="pb-2 font-semibold text-right">Dividend Yield</th>
                <th className="pb-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {investments.map((inv) => {
                const updated = relativeUpdate(inv.price_updated_at);
                return (
                <tr key={inv.id} className="hover:bg-slate-800/40 group">
                  <td className="py-2">
                    <p className="font-bold text-white">{inv.name}</p>
                    {inv.symbol && (
                      <p className="text-[10px] text-slate-500">
                        {inv.symbol}{updated ? ` · synced ${updated}` : ' · not synced yet'}
                      </p>
                    )}
                  </td>
                  <td className="py-2 text-slate-400">{TYPE_LABELS[inv.investment_type] || inv.investment_type}</td>
                  <td className="py-2 text-right text-slate-300">{inv.units}</td>
                  <td className="py-2 text-right text-slate-300">{formatCurrency(inv.avg_cost_per_unit)}</td>
                  <td className="py-2 text-right font-bold text-white">{formatCurrency(inv.current_value)}</td>
                  <td className={`py-2 text-right font-semibold ${inv.gain_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrencySigned(inv.gain_loss)} ({inv.gain_loss_pct}%)
                  </td>
                  <td className="py-2 text-right">
                    {inv.dividend_yield_pct != null ? (
                      <>
                        <p className="font-semibold text-violet-300">{inv.dividend_yield_pct}%</p>
                        {inv.last_dividend_amount != null && (
                          <p className="text-[10px] text-slate-500">last {formatCurrency(inv.last_dividend_amount)} ({inv.last_dividend_date})</p>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {!investments.length && (
                <tr><td colSpan={8} className="py-6 text-center text-slate-500">No holdings yet — add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

const concentrationLabel = (hhi: number): { label: string; color: string } => {
  if (hhi < 1500) return { label: 'Well diversified', color: 'text-emerald-400' };
  if (hhi < 2500) return { label: 'Moderate concentration', color: 'text-amber-400' };
  return { label: 'High concentration', color: 'text-rose-400' };
};

const PerformanceAnalysis: React.FC<{ investments: Investment[]; totalValue: number }> = ({ investments, totalValue }) => {
  const ranked = [...investments].sort((a, b) => b.gain_loss_pct - a.gain_loss_pct);
  const maxAbsPct = Math.max(...ranked.map((r) => Math.abs(r.gain_loss_pct)), 1);

  const weights = investments.map((inv) => (totalValue ? inv.current_value / totalValue : 0));
  const hhi = Math.round(weights.reduce((sum, w) => sum + w * w, 0) * 10000);
  const largest = investments.reduce((max, inv) => (inv.current_value > (max?.current_value ?? -1) ? inv : max), investments[0]);
  const largestPct = totalValue ? Math.round((largest.current_value / totalValue) * 1000) / 10 : 0;
  const concentration = concentrationLabel(hhi);

  return (
    <GlassCard className="space-y-4">
      <h3 className="font-bold text-white text-base flex items-center gap-2">
        <LineChart className="w-5 h-5 text-violetAccent" />
        <span>Performance Analysis</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Largest Holding</p>
          <p className="text-sm font-bold text-white">{largest.name} <span className="text-slate-400 font-normal">({largestPct}% of portfolio)</span></p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Concentration Risk</p>
          <p className={`text-sm font-bold ${concentration.color}`}>{concentration.label} <span className="text-slate-400 font-normal">(HHI {hhi})</span></p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Return by Holding</p>
        {ranked.map((inv) => {
          const isPositive = inv.gain_loss_pct >= 0;
          const widthPct = (Math.abs(inv.gain_loss_pct) / maxAbsPct) * 100;
          return (
            <div key={inv.id} className="flex items-center gap-3">
              <span className="text-xs text-slate-300 w-28 truncate shrink-0">{inv.name}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className={`text-xs font-bold w-16 text-right shrink-0 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {inv.gain_loss_pct >= 0 ? '+' : ''}{inv.gain_loss_pct}%
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};
