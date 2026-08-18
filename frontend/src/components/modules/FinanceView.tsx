import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { StatWidget } from '../ui/StatWidget';
import { DonutChart } from '../ui/DonutChart';
import { TrendBarChart } from '../ui/TrendBarChart';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, PieChart, Plus, CreditCard,
  X, Pencil, Trash2, ArrowLeftRight, Target, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '../../api/client';
import { FinanceAccount, FinanceTransaction, FinancialGoal, Budget, TransactionCategory } from '../../types';
import { colorForCategory, orderCategoriesByParent } from '../../lib/financeCategories';
import { groupAccountsByType } from '../../lib/accountIcons';
import { CategoryManagerPanel } from './finance/CategoryManagerPanel';
import { formatCurrency, formatCurrencySigned, evaluateAmountExpression } from '../../lib/currency';
import { WalletsTab } from './finance/WalletsTab';
import { BalanceSheetTab } from './finance/BalanceSheetTab';
import { InsuranceTab } from './finance/InsuranceTab';
import { CashflowForecastTab } from './finance/CashflowForecastTab';
import { InstalmentsTab } from './finance/InstalmentsTab';
import { TaxPlanningTab } from './finance/TaxPlanningTab';
import { InvestmentsTab } from './finance/InvestmentsTab';
import { StockAnalysisTab } from './finance/StockAnalysisTab';
import { EPFTab } from './finance/EPFTab';
import { IncomeStatementTab } from './finance/IncomeStatementTab';
import { ForecastedIncomeStatementTab } from './finance/ForecastedIncomeStatementTab';
import { CalcSheetTab } from './finance/CalcSheetTab';
import { FinanceModelingTab } from './finance/FinanceModelingTab';
import { useI18n } from '../../i18n/I18nContext';
import { TranslationKey } from '../../i18n/en';

const todayStr = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

type SubTab =
  | 'wallets' | 'transactions' | 'budgets' | 'balance-sheet' | 'insurance'
  | 'cashflow' | 'instalments' | 'tax' | 'investments' | 'stock-analysis' | 'epf' | 'income-statement'
  | 'forecasted-income' | 'calc-sheet' | 'modeling' | 'reports' | 'goals';

const SUBTAB_ORDER: SubTab[] = [
  'wallets', 'transactions', 'budgets', 'balance-sheet', 'insurance',
  'cashflow', 'instalments', 'tax', 'investments', 'stock-analysis', 'epf', 'income-statement',
  'forecasted-income', 'calc-sheet', 'modeling', 'reports', 'goals',
];

export const FinanceView: React.FC = () => {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<SubTab>('wallets');
  const [summary, setSummary] = useState<{
    total_cash_balance: number; total_credit_balance: number; monthly_income: number; monthly_expense: number; cash_flow: number;
    accounts: FinanceAccount[]; recent_transactions: FinanceTransaction[]; goals: FinancialGoal[];
  } | null>(null);

  const loadSummary = async () => setSummary(await api.getFinanceSummary());
  useEffect(() => { loadSummary(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">{t('finance.title')}</h2>
          <p className="text-xs text-slate-400">{t('finance.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10 text-xs">
          {SUBTAB_ORDER.map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                subTab === tab ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t(`finance.tab.${tab}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatWidget title={t('finance.stat.totalCashBalance')} value={formatCurrency(summary?.total_cash_balance ?? 0)} icon={DollarSign} iconColor="text-emerald-400" />
        <StatWidget title={t('finance.stat.totalCreditBalance')} value={formatCurrency(summary?.total_credit_balance ?? 0)} icon={CreditCard} iconColor="text-roseAccent" />
        <StatWidget title={t('finance.stat.totalIncome')} value={formatCurrency(summary?.monthly_income ?? 0)} icon={TrendingUp} iconColor="text-cyanAccent" />
        <StatWidget title={t('finance.stat.totalExpense')} value={formatCurrency(summary?.monthly_expense ?? 0)} icon={TrendingDown} iconColor="text-roseAccent" />
        <StatWidget title={t('finance.stat.netCashflow')} value={formatCurrencySigned(summary?.cash_flow ?? 0)} icon={Wallet} iconColor="text-violetAccent" />
      </div>

      {subTab === 'wallets' && <WalletsTab accounts={summary?.accounts || []} onChange={loadSummary} />}
      {subTab === 'transactions' && <TransactionsTab accounts={summary?.accounts || []} onChange={loadSummary} />}
      {subTab === 'budgets' && <BudgetsTab />}
      {subTab === 'balance-sheet' && <BalanceSheetTab />}
      {subTab === 'insurance' && <InsuranceTab />}
      {subTab === 'cashflow' && <CashflowForecastTab />}
      {subTab === 'instalments' && <InstalmentsTab />}
      {subTab === 'tax' && <TaxPlanningTab />}
      {subTab === 'investments' && <InvestmentsTab />}
      {subTab === 'stock-analysis' && <StockAnalysisTab />}
      {subTab === 'epf' && <EPFTab />}
      {subTab === 'income-statement' && <IncomeStatementTab />}
      {subTab === 'forecasted-income' && <ForecastedIncomeStatementTab />}
      {subTab === 'calc-sheet' && <CalcSheetTab />}
      {subTab === 'modeling' && <FinanceModelingTab />}
      {subTab === 'reports' && <ReportsTab />}
      {subTab === 'goals' && <GoalsTab goals={summary?.goals || []} onChange={loadSummary} />}
    </div>
  );
};


// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------

const TransactionsTab: React.FC<{ accounts: FinanceAccount[]; onChange: () => Promise<void> }> = ({ accounts, onChange }) => {
  const [items, setItems] = useState<FinanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterType, setFilterType] = useState('');
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await api.getFinanceTransactions({
      account_id: filterAccount || undefined,
      transaction_type: filterType || undefined,
      limit: 50,
    });
    setItems(res.items);
    setTotal(res.total);
  };

  useEffect(() => { load(); }, [filterAccount, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (accounts.length && !accountId) setAccountId(accounts[0].id);
  }, [accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategories = () => api.getTransactionCategories().then(setCategories);
  useEffect(() => { loadCategories(); }, []);

  const categoryOptions = orderCategoriesByParent(categories.filter((c) => c.category_type === txType));

  const resetForm = () => {
    setEditingId(null); setTxType('expense'); setAmount(''); setCategory(''); setMerchant(''); setDescription('');
    setToAccountId(''); setDate(todayStr()); setShowForm(false);
  };

  const startEdit = (tx: FinanceTransaction) => {
    setEditingId(tx.id);
    setTxType(tx.transaction_type);
    setAccountId(tx.account_id);
    setToAccountId(tx.to_account_id || '');
    setAmount(String(tx.amount));
    setCategory(tx.category);
    setMerchant(tx.merchant || '');
    setDescription(tx.description || '');
    setDate(tx.date);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const summedAmount = evaluateAmountExpression(amount);
    if (!accountId || summedAmount === null) return;
    if (txType === 'transfer' ? !toAccountId : !category) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateFinanceTransaction(editingId, {
          account_id: accountId,
          to_account_id: txType === 'transfer' ? toAccountId : undefined,
          transaction_type: txType,
          amount: summedAmount,
          category: txType === 'transfer' ? 'Transfer' : category,
          merchant: merchant || undefined, description: description || undefined, date,
        });
      } else {
        await api.createFinanceTransaction({
          account_id: accountId,
          to_account_id: txType === 'transfer' ? toAccountId : undefined,
          transaction_type: txType,
          amount: summedAmount,
          category: txType === 'transfer' ? 'Transfer' : category,
          merchant: merchant || undefined,
          description: description || undefined,
          date,
        });
      }
      resetForm();
      await Promise.all([load(), onChange()]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteFinanceTransaction(id);
    await Promise.all([load(), onChange()]);
  };

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name || '—';
  const groupedAccounts = groupAccountsByType(accounts);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="glass-input px-3 py-1.5 rounded-lg bg-slate-900">
            <option value="">All wallets</option>
            {groupedAccounts.map((g) => (
              <optgroup key={g.type} label={g.label}>
                {g.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </optgroup>
            ))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="glass-input px-3 py-1.5 rounded-lg bg-slate-900">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCategoryManager(!showCategoryManager)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">
            Manage Categories
          </button>
          <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {showCategoryManager && (
        <CategoryManagerPanel categories={categories} onChange={loadCategories} />
      )}

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Transaction' : 'New Transaction'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10 text-xs w-fit">
              {(['expense', 'income', 'transfer'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  disabled={!!editingId && t === 'transfer' && txType !== 'transfer'}
                  onClick={() => setTxType(t)}
                  className={`px-3.5 py-1.5 rounded-lg font-bold capitalize transition-all disabled:opacity-30 ${txType === t ? 'bg-cyan-500 text-white' : 'text-slate-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                <option value="" disabled>{txType === 'transfer' ? 'From account' : 'Account'}</option>
                {groupedAccounts.map((g) => (
                  <optgroup key={g.type} label={g.label}>
                    {g.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                  </optgroup>
                ))}
              </select>
              {txType === 'transfer' ? (
                <select required value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                  <option value="" disabled>To wallet</option>
                  {groupAccountsByType(accounts.filter((a) => a.id !== accountId)).map((g) => (
                    <optgroup key={g.type} label={g.label}>
                      {g.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <select required value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                  <option value="" disabled>Category</option>
                  {categoryOptions.map((c) => <option key={c.id} value={c.name}>{c.depth ? `— ${c.name}` : c.name}</option>)}
                </select>
              )}
              <div>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount (RM) — e.g. 10+20-5*2"
                  title="You can key in a math expression (+, -, *, /, parentheses) and it'll be evaluated, e.g. 10+20-5*2"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => { const s = evaluateAmountExpression(amount); if (s !== null) setAmount(String(s)); }}
                  className="glass-input px-3.5 py-2 rounded-xl text-xs w-full"
                />
                {/[+\-*/]/.test(amount.trim().replace(/^-/, '')) && evaluateAmountExpression(amount) !== null && (
                  <p className="text-[9px] text-cyan-400 mt-1">= {formatCurrency(evaluateAmountExpression(amount) as number)}</p>
                )}
              </div>
              {txType === 'transfer' ? (
                <input placeholder="Remark (optional, e.g. why this transfer)" value={description} onChange={(e) => setDescription(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
              ) : (
                <input placeholder="Merchant (optional)" value={merchant} onChange={(e) => setMerchant(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
              )}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            </div>
            <button type="submit" disabled={saving || !accounts.length} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Transaction'}
            </button>
            {!accounts.length && <p className="text-[11px] text-amber-400">Create a wallet first.</p>}
          </form>
        </GlassCard>
      )}

      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Transaction Ledger</h3>
          <span className="text-[11px] text-slate-500">{total} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Account</th>
                <th className="pb-2 font-semibold">Category</th>
                <th className="pb-2 font-semibold">Merchant / Remark</th>
                <th className="pb-2 font-semibold text-right">Amount</th>
                <th className="pb-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/40 group">
                  <td className="py-2.5 text-slate-300">{tx.date}</td>
                  <td className="py-2.5 text-slate-300">{accountName(tx.account_id)}</td>
                  <td className="py-2.5 font-bold text-white pt-3">
                    <div className="flex items-center gap-1.5">
                      {tx.transaction_type === 'transfer' && <ArrowLeftRight className="w-3 h-3 text-violet-400" />}
                      {tx.category}
                    </div>
                    {tx.transaction_type === 'transfer' && tx.to_account_id && (
                      <div className="text-[10px] font-normal text-slate-400">to {accountName(tx.to_account_id)}</div>
                    )}
                  </td>
                  <td className="py-2.5 text-slate-400">{tx.merchant || tx.description || '—'}</td>
                  <td className={`py-2.5 text-right font-bold ${tx.transaction_type === 'income' ? 'text-emerald-400' : tx.transaction_type === 'transfer' ? 'text-violet-300' : 'text-slate-200'}`}>
                    {tx.transaction_type === 'income' ? '+' : tx.transaction_type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                  </td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(tx)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-500">No transactions match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

// ---------------------------------------------------------------------------
// BUDGETS
// ---------------------------------------------------------------------------

const BudgetsTab: React.FC = () => {
  const [period, setPeriod] = useState(thisMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<TransactionCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.getBudgets(period).then(setBudgets);
  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.getTransactionCategories('expense').then((cats) => {
      setExpenseCategories(cats);
      if (cats.length && !category) setCategory(cats[0].name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shiftMonth = (delta: number) => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limit) return;
    setSaving(true);
    try {
      await api.upsertBudget({ category, monthly_limit: parseFloat(limit), period });
      setLimit('');
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteBudget(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-2 py-1.5">
          <button onClick={() => shiftMonth(-1)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold text-white px-2 min-w-[90px] text-center">{period}</span>
          <button onClick={() => shiftMonth(1)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Set Budget
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Set Monthly Budget — {period}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {expenseCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input required type="number" step="0.01" placeholder="Monthly limit (RM)" value={limit} onChange={(e) => setLimit(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Budget'}
            </button>
          </form>
          <p className="text-[11px] text-slate-500">Setting a budget for a category that already has one this month updates it.</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((b) => {
          const pct = Math.min(100, (b.spent / b.monthly_limit) * 100);
          const over = b.spent > b.monthly_limit;
          const barColor = over ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
          return (
            <GlassCard key={b.id} hoverEffect={false} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{b.category}</span>
                <button onClick={() => handleDelete(b.id)} className="p-1 rounded-lg text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex justify-between text-xs">
                <span className={over ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {formatCurrency(b.spent)} spent
                </span>
                <span className="text-slate-400">of {formatCurrency(b.monthly_limit)}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              {over && <p className="text-[11px] text-rose-400 font-semibold">Over budget by {formatCurrency(b.spent - b.monthly_limit)}</p>}
            </GlassCard>
          );
        })}
        {!budgets.length && <p className="text-xs text-slate-500 text-center py-8 md:col-span-2">No budgets set for {period} — add one above.</p>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------

const ReportsTab: React.FC = () => {
  const [reports, setReports] = useState<{ monthly_trend: Array<{ month: string; income: number; expense: number }>; current_month_expense_by_category: Record<string, number> } | null>(null);

  useEffect(() => {
    api.getFinanceReports(6).then(setReports);
  }, []);

  const categoryEntries = useMemo(() => Object.entries(reports?.current_month_expense_by_category || {}), [reports]);
  const knownOrder = useMemo(() => categoryEntries.map(([c]) => c), [categoryEntries]);
  const donutData = categoryEntries.map(([label, value]) => ({ label, value, color: colorForCategory(label, knownOrder) }));

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <PieChart className="w-5 h-5 text-cyanAccent" />
          <span>This Month's Spending by Category</span>
        </h3>
        <DonutChart data={donutData} />
      </GlassCard>

      <GlassCard className="space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violetAccent" />
          <span>Income vs Expense — Last 6 Months</span>
        </h3>
        <TrendBarChart data={reports?.monthly_trend || []} />
      </GlassCard>
    </div>
  );
};

// ---------------------------------------------------------------------------
// GOALS
// ---------------------------------------------------------------------------

const GOAL_TYPE_LABELS: Record<string, string> = {
  savings: 'Savings', net_worth: 'Net Worth', passive_income: 'Monthly Passive Income',
};

const GoalsTab: React.FC<{ goals: FinancialGoal[]; onChange: () => Promise<void> }> = ({ goals, onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<'savings' | 'net_worth' | 'passive_income'>('savings');
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null); setGoalType('savings'); setTitle(''); setTargetAmount(''); setCurrentAmount(''); setShowForm(false);
  };

  const startEdit = (g: FinancialGoal) => {
    setEditingId(g.id);
    setGoalType(g.goal_type);
    setTitle(g.title);
    setTargetAmount(String(g.target_amount));
    setCurrentAmount(String(g.current_amount));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateFinancialGoal(editingId, {
          title, target_amount: parseFloat(targetAmount),
          current_amount: goalType === 'net_worth' ? undefined : parseFloat(currentAmount) || 0,
        });
      } else {
        await api.createFinancialGoal({
          title, target_amount: parseFloat(targetAmount), goal_type: goalType,
          current_amount: goalType === 'net_worth' ? 0 : parseFloat(currentAmount) || 0,
        });
      }
      resetForm();
      await onChange();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteFinancialGoal(id);
    await onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Goal' : 'New Goal'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={goalType} onChange={(e) => setGoalType(e.target.value as any)} disabled={!!editingId} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900 disabled:opacity-50">
              <option value="savings">Savings (manual)</option>
              <option value="net_worth">Net Worth (synced from Balance Sheet)</option>
              <option value="passive_income">Monthly Passive Income (manual)</option>
            </select>
            <input required type="number" step="0.01" placeholder={goalType === 'passive_income' ? 'Target monthly income (RM)' : 'Target amount (RM)'} value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            {goalType !== 'net_worth' ? (
              <input type="number" step="0.01" placeholder={goalType === 'passive_income' ? 'Current monthly passive income (RM)' : 'Already saved (RM, optional)'} value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            ) : (
              <p className="md:col-span-2 text-[10px] text-slate-500 self-center">Progress will sync automatically from your Balance Sheet's live Net Worth.</p>
            )}
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Goal'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.map((g) => (
          <GlassCard key={g.id} hoverEffect={false} className="space-y-2 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-violetAccent" />
                <span className="font-bold text-white text-sm">{g.title}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">{GOAL_TYPE_LABELS[g.goal_type] || g.goal_type}</span>
                {g.is_synced && (
                  <span className="flex items-center gap-1 text-[9px] text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" /> Live
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(g)} className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(g.id)} className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-cyan-400 font-bold">{formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}{g.goal_type === 'passive_income' ? '/mo' : ''}</span>
              <span className="text-slate-400">{Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(100, (g.current_amount / g.target_amount) * 100)}%` }} />
            </div>
          </GlassCard>
        ))}
        {!goals.length && <p className="text-xs text-slate-500 text-center py-8 lg:col-span-2">No goals yet — add one above.</p>}
      </div>
    </div>
  );
};
