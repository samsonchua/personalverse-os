import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../../api/client';
import { FinanceAccount } from '../../../types';
import { formatCurrency } from '../../../lib/currency';
import { ACCOUNT_ICONS, accountIconFor, groupAccountsByType } from '../../../lib/accountIcons';

const STALE_AFTER_DAYS = 30;

/** "Today" / "3 days ago" / "2 months ago", plus whether it's stale enough to flag — an account
 * that hasn't moved in a while, so the user can spot outdated balances at a glance. */
const relativeUpdate = (isoDate?: string): { label: string; stale: boolean } | null => {
  if (!isoDate) return null;
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return null;
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  const stale = days >= STALE_AFTER_DAYS;
  if (days <= 0) return { label: 'Updated today', stale };
  if (days === 1) return { label: 'Updated yesterday', stale };
  if (days < 30) return { label: `Updated ${days} days ago`, stale };
  if (days < 365) return { label: `Updated ${Math.floor(days / 30)} mo ago`, stale };
  return { label: `Updated ${Math.floor(days / 365)} yr ago`, stale };
};

interface WalletsTabProps {
  accounts: FinanceAccount[];
  onChange: () => Promise<void>;
}

export const WalletsTab: React.FC<WalletsTabProps> = ({ accounts, onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [icon, setIcon] = useState('');
  const [balance, setBalance] = useState('');
  const [tracksPortfolio, setTracksPortfolio] = useState(false);
  const [countsTowardEpf, setCountsTowardEpf] = useState(false);
  const [isStandbyCash, setIsStandbyCash] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setName(''); setBalance(''); setType('bank'); setIcon(''); setTracksPortfolio(false); setCountsTowardEpf(false); setIsStandbyCash(false); setEditingId(null); setShowForm(false); };

  const startEdit = (acc: FinanceAccount) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.account_type);
    setIcon(acc.icon || '');
    setTracksPortfolio(!!acc.tracks_investment_portfolio);
    setCountsTowardEpf(!!acc.counts_toward_epf);
    setIsStandbyCash(!!acc.is_standby_cash);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateFinanceAccount(editingId, {
          name, account_type: type, icon: icon || undefined,
          tracks_investment_portfolio: tracksPortfolio, counts_toward_epf: countsTowardEpf, is_standby_cash: isStandbyCash,
        });
      } else {
        await api.createFinanceAccount({ name, account_type: type, icon: icon || undefined, balance: parseFloat(balance) || 0 });
      }
      resetForm();
      await onChange();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteFinanceAccount(id);
    await onChange();
  };

  const grouped = groupAccountsByType(accounts);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Account' : 'New Account'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input required placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
              <select value={type} onChange={(e) => setType(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="investment">Investment</option>
                <option value="loan">Loan</option>
                <option value="asset">Asset</option>
              </select>
              {!editingId && (
                <input type="number" step="0.01" placeholder="Starting balance (RM)" value={balance} onChange={(e) => setBalance(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
              )}
            </div>
            {type === 'investment' && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[11px] text-slate-400">
                  <input type="checkbox" checked={tracksPortfolio} onChange={(e) => setTracksPortfolio(e.target.checked)} className="accent-cyan-500" />
                  Sync balance automatically from the Investments portfolio's total current value
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-400">
                  <input type="checkbox" checked={countsTowardEpf} onChange={(e) => setCountsTowardEpf(e.target.checked)} className="accent-cyan-500" />
                  Count this account's balance toward the EPF/Retirement module's total balance
                </label>
              </div>
            )}
            {type === 'asset' && (
              <label className="flex items-center gap-2 text-[11px] text-slate-400">
                <input type="checkbox" checked={isStandbyCash} onChange={(e) => setIsStandbyCash(e.target.checked)} className="accent-cyan-500" />
                Standby cash — could be liquidated/transferred to cash; include as an option in the Cashflow Forecast's starting balance
              </label>
            )}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Icon</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACCOUNT_ICONS).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`p-2.5 rounded-xl border ${icon === key ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Account'}
            </button>
          </form>
        </GlassCard>
      )}

      {grouped.map((group) => (
        <div key={group.type} className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{group.label}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.accounts.map((acc) => {
              const Icon = accountIconFor(acc.account_type, acc.icon);
              return (
                <GlassCard key={acc.id} hoverEffect={false} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-cyanAccent" />
                      <div>
                        <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                        <p className="text-[11px] text-slate-400 capitalize">{acc.institution || acc.account_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(acc)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(acc.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <span className={`text-xl font-extrabold block ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(acc.balance)}
                  </span>
                  {acc.tracks_investment_portfolio && (
                    <p className="text-[10px] text-cyan-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" /> Synced from Investments portfolio
                    </p>
                  )}
                  {acc.counts_toward_epf && (
                    <p className="text-[10px] text-violet-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" /> Counted in EPF total
                    </p>
                  )}
                  {acc.is_standby_cash && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Standby cash
                    </p>
                  )}
                  {(() => {
                    const upd = relativeUpdate(acc.updated_at);
                    if (!upd) return null;
                    return <p className={`text-[10px] ${upd.stale ? 'text-amber-400' : 'text-slate-500'}`}>{upd.stale ? '⚠ ' : ''}{upd.label}</p>;
                  })()}
                </GlassCard>
              );
            })}
          </div>
        </div>
      ))}
      {!accounts.length && <p className="text-xs text-slate-500 text-center py-8">No wallets yet — add one above.</p>}
    </div>
  );
};
