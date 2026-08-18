import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, DollarSign, TrendingDown } from 'lucide-react';
import { api } from '../../../api/client';
import { FinanceAccount, FinanceTransaction } from '../../../types';
import { formatCurrency, formatCurrencySigned } from '../../../lib/currency';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../../lib/financeCategories';

const todayStr = () => new Date().toISOString().slice(0, 10);

interface IncomeTabProps {
  clientId: string;
  transactions: FinanceTransaction[];
  totalIncome: number;
  onChange: () => void;
}

export const IncomeTab: React.FC<IncomeTabProps> = ({ clientId, transactions, totalIncome, onChange }) => {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getFinanceSummary().then((s) => {
      setAccounts(s.accounts || []);
      if (s.accounts?.length) setAccountId(s.accounts[0].id);
    });
  }, []);

  const categories = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount || !category) return;
    setSaving(true);
    try {
      await api.createFinanceTransaction({
        account_id: accountId, client_id: clientId, transaction_type: txType,
        amount: parseFloat(amount), category, description: description || undefined, date,
      });
      setAmount(''); setDescription('');
      setShowForm(false);
      onChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Income from Client</p>
          <p className="text-xl font-extrabold text-emerald-400">{formatCurrency(totalIncome)}</p>
        </GlassCard>
        <div className="flex items-center justify-center">
          <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Log Transaction
          </button>
        </div>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Transaction</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex gap-2 md:col-span-3">
              <button type="button" onClick={() => { setTxType('income'); setCategory(''); }} className={`flex-1 py-2 rounded-xl text-xs font-bold ${txType === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>Income</button>
              <button type="button" onClick={() => { setTxType('expense'); setCategory(''); }} className={`flex-1 py-2 rounded-xl text-xs font-bold ${txType === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'}`}>Expense (on behalf of client)</button>
            </div>
            <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select required value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="">Category...</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input required type="number" step="0.01" placeholder="Amount (RM)" value={amount} onChange={(e) => setAmount(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Log Transaction'}
            </button>
          </form>
        </GlassCard>
      )}

      <GlassCard hoverEffect={false} className="space-y-2">
        <h3 className="font-bold text-white text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-cyanAccent" /> Transaction History</h3>
        <div className="space-y-1.5">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {t.transaction_type === 'expense' && <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-slate-200 truncate">{t.category}{t.description ? ` — ${t.description}` : ''}</p>
                  <p className="text-[10px] text-slate-500">{t.date}</p>
                </div>
              </div>
              <span className={`font-bold shrink-0 ml-2 ${t.transaction_type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrencySigned(t.transaction_type === 'income' ? t.amount : -t.amount)}
              </span>
            </div>
          ))}
          {!transactions.length && <p className="text-xs text-slate-500 text-center py-6">No transactions logged for this client yet.</p>}
        </div>
      </GlassCard>
    </div>
  );
};
