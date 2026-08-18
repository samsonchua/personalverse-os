import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { ChevronLeft, ChevronRight, Plus, X, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../../../api/client';
import { IncomeStatementGrid as GridData, IncomeStatementBucket, IncomeStatementLine, StatementGranularity, TransactionCategory } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

const GRANULARITIES: { id: StatementGranularity; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'semi_yearly', label: 'Semi-Yearly' },
  { id: 'yearly', label: 'Yearly' },
];

const INCOME_BUCKETS: { key: 'fixed' | 'variable' | 'disbursement'; label: string }[] = [
  { key: 'fixed', label: 'Fixed Income' },
  { key: 'variable', label: 'Variable Income' },
  { key: 'disbursement', label: 'Disbursement Income' },
];
const EXPENSE_BUCKETS: { key: 'fixed' | 'variable' | 'yearly' | 'disbursement'; label: string }[] = [
  { key: 'fixed', label: 'Fixed Expenses' },
  { key: 'variable', label: 'Variable Expenses' },
  { key: 'yearly', label: 'Yearly Expenses' },
  { key: 'disbursement', label: 'Disbursement Expenses' },
];

interface AddLineItemFormProps {
  categoryType: 'income' | 'expense';
  classification: string;
  categories: TransactionCategory[];
  onDone: () => void;
}

const AddLineItemForm: React.FC<AddLineItemFormProps> = ({ categoryType, classification, categories, onDone }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isDeduction, setIsDeduction] = useState(false);
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const potentialParents = categories.filter((c) => c.category_type === categoryType && (c.classification || 'variable') === classification);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createTransactionCategory({
        name: name.trim(), category_type: categoryType, classification,
        parent_category_id: parentId || undefined,
        is_deduction: categoryType === 'income' ? isDeduction : undefined,
        is_credit_card: categoryType === 'income' ? isCreditCard : undefined,
      });
      setName(''); setParentId(''); setIsDeduction(false); setIsCreditCard(false);
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not add this line item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1.5 py-1.5 pl-2">
      <input
        placeholder="New line item name"
        value={name} onChange={(e) => setName(e.target.value)}
        className="glass-input px-2.5 py-1 rounded-lg text-[11px] w-48"
      />
      {!!potentialParents.length && (
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="glass-input px-2 py-1 rounded-lg text-[11px] bg-slate-900">
          <option value="">No parent</option>
          {potentialParents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {categoryType === 'income' && (
        <>
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            <input type="checkbox" checked={isDeduction} onChange={(e) => setIsDeduction(e.target.checked)} className="accent-cyan-500" /> Deduction
          </label>
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            <input type="checkbox" checked={isCreditCard} onChange={(e) => setIsCreditCard(e.target.checked)} className="accent-cyan-500" /> Credit Card
          </label>
        </>
      )}
      <button type="submit" disabled={saving} className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-[11px] font-bold disabled:opacity-50">
        {saving ? '...' : 'Add'}
      </button>
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
    </form>
  );
};

const LineItemRow: React.FC<{
  line: IncomeStatementLine;
  lineType: 'income' | 'expense';
  editable: boolean;
  colSpan: number;
  categoryId?: string;
  onEdit: (category: string, periodIdx: number, amount: number) => void;
  onReset: (category: string, periodIdx: number) => void;
  onDelete?: (categoryId: string) => Promise<void>;
}> = ({ line, lineType, editable, colSpan, categoryId, onEdit, onReset, onDelete }) => {
  const [draft, setDraft] = useState<string[]>(line.periods.map((v) => String(v)));
  const [confirming, setConfirming] = useState(false);
  const [usage, setUsage] = useState<{ transaction_count: number; total_amount: number } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setDraft(line.periods.map((v) => String(v)));
  }, [line.periods]);

  const commit = (idx: number) => {
    if (!editable) return;
    const parsed = parseFloat(draft[idx]);
    if (Number.isNaN(parsed)) {
      setDraft((d) => d.map((v, i) => (i === idx ? String(line.periods[idx]) : v)));
      return;
    }
    if (parsed !== line.periods[idx]) onEdit(line.category, idx, parsed);
  };

  const indented = !!line.parent_category;
  const canDelete = editable && !!categoryId && !!onDelete && line.total === 0;

  const startDelete = async () => {
    if (!categoryId) return;
    setConfirming(true);
    setLoadingUsage(true);
    try {
      setUsage(await api.getCategoryUsage(categoryId));
    } finally {
      setLoadingUsage(false);
    }
  };

  const confirmDelete = async () => {
    if (!categoryId || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(categoryId);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-slate-800/40 group">
        <td className={`py-1 pr-3 text-slate-300 sticky left-0 bg-slate-950/80 backdrop-blur-sm whitespace-nowrap ${indented ? 'pl-6' : 'pl-2'}`}>
          <span className="flex items-center gap-1.5">
            {line.is_deduction && <span className="text-rose-400 mr-1">(-)</span>}
            {line.category}
            {line.is_credit_card && <span className="ml-1 text-[9px] text-amber-400 uppercase">CC</span>}
            {canDelete && (
              <button onClick={startDelete} title="Delete this line item" className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </span>
        </td>
        {draft.map((val, i) => (
          <td key={i} className="py-0.5 px-0.5">
            {editable ? (
              <input
                type="number" step="0.01" value={val}
                onChange={(e) => setDraft((d) => d.map((v, idx) => (idx === i ? e.target.value : v)))}
                onBlur={() => commit(i)}
                onDoubleClick={() => onReset(line.category, i)}
                title="Double-click to reset to the default"
                className={`w-16 bg-transparent text-right text-[11px] px-1 py-0.5 rounded border border-transparent hover:border-white/10 focus:border-cyan-500/50 focus:bg-slate-900 outline-none ${lineType === 'income' ? (line.is_deduction ? 'text-rose-300' : 'text-emerald-300') : 'text-rose-300'}`}
              />
            ) : (
              <span className={`block w-16 text-right text-[11px] px-1 ${lineType === 'income' ? (line.is_deduction ? 'text-rose-300' : 'text-emerald-300') : 'text-rose-300'}`}>
                {formatCurrency(line.periods[i])}
              </span>
            )}
          </td>
        ))}
        <td className="py-1 px-2 text-right font-semibold text-white whitespace-nowrap">{formatCurrency(line.average)}</td>
        <td className="py-1 px-2 text-right font-bold text-slate-200 whitespace-nowrap">{formatCurrency(line.total)}</td>
      </tr>
      {confirming && (
        <tr>
          <td colSpan={colSpan} className="pb-1.5 pl-2">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-rose-500/30 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-slate-300">
                {loadingUsage ? 'Checking for existing transactions…' : usage && usage.transaction_count > 0 ? (
                  <>Delete <strong>{line.category}</strong>? It has <strong className="text-amber-400">{usage.transaction_count} existing transaction{usage.transaction_count === 1 ? '' : 's'}</strong> totaling {formatCurrency(usage.total_amount)} — they'll stay in your ledger, just uncategorized.</>
                ) : (
                  <>Delete <strong>{line.category}</strong>? No existing transactions use it.</>
                )}
              </p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirming(false)} className="px-2.5 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white">Cancel</button>
                <button onClick={confirmDelete} disabled={deleting || loadingUsage} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500 hover:bg-rose-400 text-white disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const BucketSection: React.FC<{
  bucket: IncomeStatementBucket;
  label: string;
  lineType: 'income' | 'expense';
  colSpan: number;
  editable: boolean;
  categories: TransactionCategory[];
  onEdit: (category: string, periodIdx: number, amount: number) => void;
  onReset: (category: string, periodIdx: number) => void;
  onAdded: () => void;
  onDeleted: () => Promise<void>;
}> = ({ bucket, label, lineType, colSpan, editable, categories, onEdit, onReset, onAdded, onDeleted }) => {
  const [showAdd, setShowAdd] = useState(false);
  const accent = lineType === 'income' ? 'text-emerald-400' : 'text-rose-400';
  return (
    <>
      <tr>
        <td colSpan={colSpan} className="pt-3 pb-1 pl-2">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] uppercase tracking-widest font-bold ${accent}`}>{label}</span>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300">
              <Plus className="w-3 h-3" /> Add Line Item
            </button>
          </div>
        </td>
      </tr>
      {showAdd && (
        <tr>
          <td colSpan={colSpan}>
            <AddLineItemForm categoryType={lineType} classification={bucket.classification} categories={categories} onDone={() => { setShowAdd(false); onAdded(); }} />
          </td>
        </tr>
      )}
      {bucket.lines.map((line) => {
        const cat = categories.find((c) => c.category_type === lineType && c.name === line.category);
        return (
          <LineItemRow
            key={line.category} line={line} lineType={lineType} editable={editable} colSpan={colSpan}
            categoryId={cat?.id} onEdit={onEdit} onReset={onReset}
            onDelete={cat ? async (categoryId) => { await api.deleteTransactionCategory(categoryId); await onDeleted(); } : undefined}
          />
        );
      })}
      {!bucket.lines.length && (
        <tr><td colSpan={colSpan} className="py-1 pl-2 text-slate-500 text-[11px]">No line items yet</td></tr>
      )}
      <tr className="font-bold border-t border-white/10">
        <td className="py-1.5 pl-2 text-white sticky left-0 bg-slate-950/80 backdrop-blur-sm">Total {label}</td>
        {bucket.periods.map((v, i) => <td key={i} className={`py-1.5 text-right px-0.5 ${accent}`}>{formatCurrency(v)}</td>)}
        <td className={`py-1.5 text-right px-2 ${accent}`}>{formatCurrency(bucket.average)}</td>
        <td className={`py-1.5 text-right px-2 ${accent}`}>{formatCurrency(bucket.total)}</td>
      </tr>
    </>
  );
};

export const IncomeStatementGrid: React.FC<{ source: 'actual' | 'forecast' }> = ({ source }) => {
  const [granularity, setGranularity] = useState<StatementGranularity>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [grid, setGrid] = useState<GridData | null>(null);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGrid = (g: StatementGranularity, y: number) =>
    source === 'actual' ? api.getIncomeStatementGrid(y, g) : api.getAnnualForecastedIncomeStatement(y, g);

  const load = () => {
    // Only show the full loading state on first mount — a background refresh (e.g. after
    // committing a cell edit) keeps the current grid on screen instead of unmounting the whole
    // table, which was resetting scroll position to the top on every single edit.
    if (!grid) setLoading(true);
    return fetchGrid(granularity, year).then(setGrid).finally(() => setLoading(false));
  };
  const loadCategories = () => api.getTransactionCategories().then(setCategories);

  useEffect(() => { load(); }, [granularity, year]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCategories(); }, []);

  const colSpan = useMemo(() => (grid ? grid.period_labels.length + 3 : 3), [grid]);

  const handleEdit = async (lineType: 'income' | 'expense', category: string, periodIdx: number, amount: number) => {
    if (!grid || !grid.period_year_month) return;
    const [y, m] = grid.period_year_month[periodIdx];
    await api.upsertAnnualForecastCell({ year: y, month: m, line_type: lineType, category, amount });
    await load();
  };
  const handleReset = async (lineType: 'income' | 'expense', category: string, periodIdx: number) => {
    if (!grid || !grid.period_year_month) return;
    const [y, m] = grid.period_year_month[periodIdx];
    await api.resetAnnualForecastCell({ year: y, month: m, line_type: lineType, category });
    await load();
  };
  const handleAdded = async () => { await Promise.all([load(), loadCategories()]); };

  return (
    <div className="space-y-4">
      <GlassCard hoverEffect={false} className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {GRANULARITIES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGranularity(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${granularity === g.id ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-2 py-1.5">
          <button onClick={() => setYear((y) => y - 1)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold text-white px-2 min-w-[60px] text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </GlassCard>

      {!loading && grid && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Gross Disposable Income</p>
              <p className="text-lg font-extrabold text-emerald-400">{formatCurrency(grid.income.gross_disposable_income.total)}</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Net Income</p>
              <p className={`text-lg font-extrabold ${grid.net_income.total >= 0 ? 'text-white' : 'text-rose-400'}`}>{formatCurrency(grid.net_income.total)}</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">3-Month Emergency Fund</p>
              <p className="text-lg font-extrabold text-amber-400">{formatCurrency(grid.emergency_fund_3mo)}</p>
            </GlassCard>
            <GlassCard hoverEffect={false} className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Cash Surplus</p>
              <p className={`text-lg font-extrabold ${grid.cash_surplus.total >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>{formatCurrency(grid.cash_surplus.total)}</p>
            </GlassCard>
          </div>

          <GlassCard hoverEffect={false} className="space-y-1">
            {!grid.editable && (
              <p className="text-[10px] text-slate-500 pb-1">Read-only rollup of monthly data. Switch to Monthly to edit line items or add new ones.</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-white/10">
                    <th className="pb-2 font-semibold pl-2 sticky left-0 bg-slate-950/80 backdrop-blur-sm">Line Item</th>
                    {grid.period_labels.map((l) => (
                      <th key={l} className="pb-2 font-semibold text-right px-0.5">
                        <span className="inline-block w-16 px-1">{l}</span>
                      </th>
                    ))}
                    <th className="pb-2 font-semibold text-right px-2">Average</th>
                    <th className="pb-2 font-semibold text-right px-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="font-bold border-b-2 border-white/20">
                    <td className="py-2 pl-2 text-violet-300 sticky left-0 bg-slate-950/80 backdrop-blur-sm">Beginning Balance</td>
                    {grid.beginning_balance.periods.map((v, i) => <td key={i} className="py-2 text-right text-violet-300 px-0.5">{formatCurrency(v)}</td>)}
                    <td className="py-2 text-right text-violet-300 px-2">{formatCurrency(grid.beginning_balance.average)}</td>
                    <td className="py-2 text-right text-violet-300 px-2" title="Today's actual cash balance, not a sum of each month's starting balance">{formatCurrency(grid.beginning_balance.total)}</td>
                  </tr>
                  <tr><td colSpan={colSpan} className="pt-1 pb-1 pl-2 text-[11px] font-bold text-white uppercase tracking-wider">Income</td></tr>
                  {INCOME_BUCKETS.map((b) => (
                    <BucketSection
                      key={b.key} bucket={grid.income[b.key]} label={b.label} lineType="income" colSpan={colSpan}
                      editable={grid.editable} categories={categories}
                      onEdit={(cat, idx, amt) => handleEdit('income', cat, idx, amt)}
                      onReset={(cat, idx) => handleReset('income', cat, idx)}
                      onAdded={handleAdded}
                      onDeleted={handleAdded}
                    />
                  ))}
                  <tr className="font-extrabold border-t-2 border-white/20">
                    <td className="py-2 pl-2 text-white sticky left-0 bg-slate-950/80 backdrop-blur-sm">Total Income</td>
                    {grid.income.total_income.periods.map((v, i) => <td key={i} className="py-2 text-right text-emerald-400 px-0.5">{formatCurrency(v)}</td>)}
                    <td className="py-2 text-right text-emerald-400 px-2">{formatCurrency(grid.income.total_income.average)}</td>
                    <td className="py-2 text-right text-emerald-400 px-2">{formatCurrency(grid.income.total_income.total)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pl-2 text-slate-400 sticky left-0 bg-slate-950/80 backdrop-blur-sm">Total Income (excl. Credit Card)</td>
                    {grid.income.total_income_excl_credit_card.periods.map((v, i) => <td key={i} className="py-1 text-right text-slate-300 px-0.5">{formatCurrency(v)}</td>)}
                    <td className="py-1 text-right text-slate-300 px-2">{formatCurrency(grid.income.total_income_excl_credit_card.average)}</td>
                    <td className="py-1 text-right text-slate-300 px-2">{formatCurrency(grid.income.total_income_excl_credit_card.total)}</td>
                  </tr>
                  <tr className="font-extrabold border-t border-white/10">
                    <td className="py-2 pl-2 text-cyan-300 sticky left-0 bg-slate-950/80 backdrop-blur-sm">Gross Disposable Income</td>
                    {grid.income.gross_disposable_income.periods.map((v, i) => <td key={i} className="py-2 text-right text-cyan-300 px-0.5">{formatCurrency(v)}</td>)}
                    <td className="py-2 text-right text-cyan-300 px-2">{formatCurrency(grid.income.gross_disposable_income.average)}</td>
                    <td className="py-2 text-right text-cyan-300 px-2">{formatCurrency(grid.income.gross_disposable_income.total)}</td>
                  </tr>

                  <tr><td colSpan={colSpan} className="pt-4 pb-1 pl-2 text-[11px] font-bold text-white uppercase tracking-wider">Expenses</td></tr>
                  {EXPENSE_BUCKETS.map((b) => (
                    <BucketSection
                      key={b.key} bucket={grid.expense[b.key]} label={b.label} lineType="expense" colSpan={colSpan}
                      editable={grid.editable} categories={categories}
                      onEdit={(cat, idx, amt) => handleEdit('expense', cat, idx, amt)}
                      onReset={(cat, idx) => handleReset('expense', cat, idx)}
                      onAdded={handleAdded}
                      onDeleted={handleAdded}
                    />
                  ))}
                  <tr className="font-extrabold border-t-2 border-white/20">
                    <td className="py-2 pl-2 text-white sticky left-0 bg-slate-950/80 backdrop-blur-sm">Total Expenses</td>
                    {grid.expense.total_expense.periods.map((v, i) => <td key={i} className="py-2 text-right text-rose-400 px-0.5">{formatCurrency(v)}</td>)}
                    <td className="py-2 text-right text-rose-400 px-2">{formatCurrency(grid.expense.total_expense.average)}</td>
                    <td className="py-2 text-right text-rose-400 px-2">{formatCurrency(grid.expense.total_expense.total)}</td>
                  </tr>

                  <tr className="font-extrabold border-t-2 border-white/20">
                    <td className="py-3 pl-2 text-white text-sm sticky left-0 bg-slate-950/80 backdrop-blur-sm">Net Income</td>
                    {grid.net_income.periods.map((v, i) => (
                      <td key={i} className={`py-3 text-right px-0.5 ${v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(v)}</td>
                    ))}
                    <td className={`py-3 text-right px-2 ${grid.net_income.average >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(grid.net_income.average)}</td>
                    <td className={`py-3 text-right px-2 ${grid.net_income.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(grid.net_income.total)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pl-2 text-amber-400 sticky left-0 bg-slate-950/80 backdrop-blur-sm">(-) 3-Month Emergency Fund</td>
                    {grid.net_income.periods.map((_, i) => <td key={i} className="py-1 text-right text-amber-400 px-0.5">{formatCurrency(grid.emergency_fund_3mo)}</td>)}
                    <td className="py-1 text-right text-amber-400 px-2">{formatCurrency(grid.emergency_fund_3mo)}</td>
                    <td className="py-1 text-right text-amber-400 px-2">—</td>
                  </tr>
                  <tr className="font-extrabold border-t-2 border-white/20">
                    <td className="py-3 pl-2 text-cyan-300 text-sm sticky left-0 bg-slate-950/80 backdrop-blur-sm">Cash Surplus</td>
                    {grid.cash_surplus.periods.map((v, i) => (
                      <td key={i} className={`py-3 text-right px-0.5 ${v >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>{formatCurrency(v)}</td>
                    ))}
                    <td className={`py-3 text-right px-2 ${grid.cash_surplus.average >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>{formatCurrency(grid.cash_surplus.average)}</td>
                    <td className={`py-3 text-right px-2 ${grid.cash_surplus.total >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>{formatCurrency(grid.cash_surplus.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-1"><RotateCcw className="w-3 h-3" /> Double-click any editable month cell to reset it back to the default.</p>
          </GlassCard>

          <GlassCard hoverEffect={false} className="space-y-3">
            <h3 className="font-bold text-white text-sm">Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['fixed', 'variable'] as const).map((k) => (
                <div key={k} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 capitalize">{k} Income vs {k} Expenses</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400">Income: {formatCurrency(grid.analysis[k].income)}</span>
                    <span className="text-rose-400">Expenses: {formatCurrency(grid.analysis[k].expense)}</span>
                  </div>
                  <p className={`text-sm font-extrabold ${grid.analysis[k].diff >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                    {grid.analysis[k].diff >= 0 ? 'Surplus' : 'Deficit'}: {formatCurrency(Math.abs(grid.analysis[k].diff))}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
};
