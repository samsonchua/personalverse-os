import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Pencil, Landmark, ChevronRight, ChevronDown, Link2, Unlink2 } from 'lucide-react';
import { api } from '../../../api/client';
import { BalanceSheet, BalanceSheetCategory, BalanceSheetItem, FinanceAccount } from '../../../types';
import { formatCurrency, formatCurrencySigned } from '../../../lib/currency';

const CATEGORY_LABELS: Record<BalanceSheetCategory, string> = {
  fixed_asset: 'Fixed Assets',
  current_asset: 'Current Assets',
  fixed_liability: 'Fixed Liabilities',
  current_liability: 'Current Liabilities',
};

const ASSET_SUBCATEGORIES = ['cash', 'bank', 'vehicle', 'property', 'investment', 'other'];
const LIABILITY_SUBCATEGORIES = ['credit_card', 'loan', 'mortgage', 'other'];
const SUBCATEGORY_TO_ACCOUNT_TYPE: Record<string, string> = {
  cash: 'cash', bank: 'bank', investment: 'investment', credit_card: 'credit_card',
  loan: 'loan', mortgage: 'loan', vehicle: 'asset', property: 'asset', other: 'asset',
};
const ACCOUNT_TYPE_OPTIONS = ['cash', 'bank', 'investment', 'credit_card', 'loan', 'asset'];

type LinkAccountBody = { account_id: string } | { create_account: { name: string; account_type: string } };

const LinkAccountPanel: React.FC<{
  item: BalanceSheetItem;
  availableAccounts: FinanceAccount[];
  onLink: (body: LinkAccountBody) => Promise<void>;
  onClose: () => void;
}> = ({ item, availableAccounts, onLink, onClose }) => {
  const [mode, setMode] = useState<'existing' | 'new'>(availableAccounts.length ? 'existing' : 'new');
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState(item.name);
  const [accountType, setAccountType] = useState(SUBCATEGORY_TO_ACCOUNT_TYPE[item.subcategory || ''] || 'asset');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === 'existing') {
        if (!accountId) return;
        await onLink({ account_id: accountId });
      } else {
        if (!name) return;
        await onLink({ create_account: { name, account_type: accountType } });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1.5 p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 space-y-2" style={{ marginLeft: 20 }}>
      <div className="flex items-center gap-2 text-[10px]">
        <button onClick={() => setMode('existing')} disabled={!availableAccounts.length} className={`px-2 py-1 rounded ${mode === 'existing' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500'} disabled:opacity-30`}>Link existing</button>
        <button onClick={() => setMode('new')} className={`px-2 py-1 rounded ${mode === 'new' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500'}`}>Create new</button>
      </div>
      {mode === 'existing' ? (
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="glass-input px-2.5 py-1.5 rounded-lg text-[11px] w-full bg-slate-900">
          <option value="">Select an account…</option>
          {availableAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
        </select>
      ) : (
        <div className="flex gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="glass-input px-2.5 py-1.5 rounded-lg text-[11px] flex-1" />
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="glass-input px-2.5 py-1.5 rounded-lg text-[11px] bg-slate-900">
            {ACCOUNT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-2.5 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white">Cancel</button>
        <button onClick={submit} disabled={saving} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500 hover:bg-cyan-400 text-white disabled:opacity-50">
          {saving ? 'Linking…' : 'Link'}
        </button>
      </div>
    </div>
  );
};

const ItemRow: React.FC<{
  item: BalanceSheetItem;
  accent: 'emerald' | 'rose';
  isLiability: boolean;
  depth: number;
  accounts: FinanceAccount[];
  linkedAccountIds: Set<string>;
  onEdit: (item: BalanceSheetItem) => void;
  onDelete: (id: string) => void;
  onLink: (itemId: string, body: LinkAccountBody) => Promise<void>;
  onUnlink: (itemId: string) => Promise<void>;
}> = ({ item, accent, isLiability, depth, accounts, linkedAccountIds, onEdit, onDelete, onLink, onUnlink }) => {
  const [expanded, setExpanded] = useState(true);
  const [linking, setLinking] = useState(false);
  const accentClass = accent === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
  const hasChildren = item.sub_items.length > 0;
  const linkedAccount = item.is_live ? accounts.find((a) => a.id === item.linked_account_id) : undefined;
  const availableAccounts = accounts.filter((a) => !linkedAccountIds.has(a.id));

  return (
    <div>
      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between group" style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="text-slate-500 shrink-0">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : <span className="w-3.5 shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{item.name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {item.subcategory && <span className="text-[9px] text-slate-500 uppercase">{item.subcategory.replace('_', ' ')}</span>}
              {item.nominee && <span className="text-[10px] text-slate-500">Nominee: {item.nominee}</span>}
              {isLiability && item.instalment_amount ? <span className="text-[10px] text-amber-400">Instalment: {formatCurrency(item.instalment_amount)}</span> : null}
              {isLiability && item.min_payment ? <span className="text-[10px] text-amber-400">Min: {formatCurrency(item.min_payment)}</span> : null}
              {item.is_live && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-400" title={`Live — synced from ${linkedAccount?.name || 'linked account'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Live
                </span>
              )}
              {item.compare_variance !== null ? (
                item.compare_variance !== 0 && (
                  <span
                    className={`text-[9px] font-bold ${item.compare_variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    title={`Value on that date: ${formatCurrency(item.compare_value ?? 0)}`}
                  >
                    {item.compare_variance >= 0 ? '▲' : '▼'} {formatCurrencySigned(item.compare_variance)} vs. compare date
                  </span>
                )
              ) : (
                item.since_beginning !== null && item.since_beginning !== 0 && (
                  <span
                    className={`text-[9px] font-bold ${item.since_beginning >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    title={`Beginning balance: ${formatCurrency(item.opening_value ?? 0)}`}
                  >
                    {item.since_beginning >= 0 ? '▲' : '▼'} {formatCurrencySigned(item.since_beginning)} since start
                  </span>
                )
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className={`text-xs font-bold ${accentClass}`}>{formatCurrency(hasChildren ? item.total_value : item.value)}</span>
          {item.is_live ? (
            <button onClick={() => onUnlink(item.id)} title="Unlink account" className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-amber-300 transition-opacity"><Unlink2 className="w-3 h-3" /></button>
          ) : (
            <button onClick={() => setLinking(!linking)} title="Link to an account" className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-cyan-300 transition-opacity"><Link2 className="w-3 h-3" /></button>
          )}
          <button onClick={() => onEdit(item)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-cyan-300 transition-opacity"><Pencil className="w-3 h-3" /></button>
          <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-rose-400 transition-opacity"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      {linking && (
        <LinkAccountPanel item={item} availableAccounts={availableAccounts} onLink={(body) => onLink(item.id, body)} onClose={() => setLinking(false)} />
      )}
      {expanded && hasChildren && (
        <div className="mt-1.5 space-y-1.5">
          {item.sub_items.map((sub) => (
            <ItemRow key={sub.id} item={sub} accent={accent} isLiability={isLiability} depth={depth + 1} accounts={accounts} linkedAccountIds={linkedAccountIds} onEdit={onEdit} onDelete={onDelete} onLink={onLink} onUnlink={onUnlink} />
          ))}
        </div>
      )}
    </div>
  );
};

const ColumnList: React.FC<{
  title: string;
  items: BalanceSheetItem[];
  total: number;
  accent: 'emerald' | 'rose';
  isLiability: boolean;
  accounts: FinanceAccount[];
  linkedAccountIds: Set<string>;
  onEdit: (item: BalanceSheetItem) => void;
  onDelete: (id: string) => void;
  onLink: (itemId: string, body: LinkAccountBody) => Promise<void>;
  onUnlink: (itemId: string) => Promise<void>;
}> = ({ title, items, total, accent, isLiability, accounts, linkedAccountIds, onEdit, onDelete, onLink, onUnlink }) => {
  const accentClass = accent === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
        <span className={`text-sm font-extrabold ${accentClass}`}>{formatCurrency(total)}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} accent={accent} isLiability={isLiability} depth={0} accounts={accounts} linkedAccountIds={linkedAccountIds} onEdit={onEdit} onDelete={onDelete} onLink={onLink} onUnlink={onUnlink} />
        ))}
        {!items.length && <p className="text-[11px] text-slate-600 text-center py-3">None recorded</p>}
      </div>
    </div>
  );
};

const flattenItems = (items: BalanceSheetItem[]): BalanceSheetItem[] =>
  items.flatMap((i) => [i, ...flattenItems(i.sub_items)]);

export const BalanceSheetTab: React.FC = () => {
  const [sheet, setSheet] = useState<BalanceSheet | null>(null);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIsLive, setEditingIsLive] = useState(false);
  const [category, setCategory] = useState<BalanceSheetCategory>('current_asset');
  const [parentId, setParentId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [instalmentAmount, setInstalmentAmount] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [nominee, setNominee] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [compareTo, setCompareTo] = useState('');

  const load = () => api.getBalanceSheet(compareTo || undefined).then(setSheet);
  useEffect(() => {
    load();
    api.getFinanceSummary().then((s: any) => setAccounts(s.accounts || []));
  }, [compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLiability = category === 'fixed_liability' || category === 'current_liability';
  const subcategoryOptions = isLiability ? LIABILITY_SUBCATEGORIES : ASSET_SUBCATEGORIES;

  const allItemsFlat = sheet
    ? flattenItems([...sheet.fixed_assets, ...sheet.current_assets, ...sheet.fixed_liabilities, ...sheet.current_liabilities])
    : [];
  const potentialParents = allItemsFlat.filter((i) => i.category === category && i.id !== editingId);
  const linkedAccountIds = new Set(allItemsFlat.filter((i) => i.linked_account_id).map((i) => i.linked_account_id as string));

  const handleLink = async (itemId: string, body: LinkAccountBody) => {
    await api.linkBalanceSheetItemAccount(itemId, body);
    await load();
    api.getFinanceSummary().then((s: any) => setAccounts(s.accounts || []));
  };

  const handleUnlink = async (itemId: string) => {
    await api.unlinkBalanceSheetItemAccount(itemId);
    await load();
  };

  const resetForm = () => {
    setEditingId(null); setEditingIsLive(false); setCategory('current_asset'); setParentId(''); setSubcategory('');
    setName(''); setValue(''); setInstalmentAmount(''); setMinPayment(''); setNominee(''); setShowForm(false);
    setFormError(null);
  };

  const startEdit = (item: BalanceSheetItem) => {
    setEditingId(item.id);
    setEditingIsLive(!!item.is_live);
    setCategory(item.category);
    setParentId(item.parent_id || '');
    setSubcategory(item.subcategory || '');
    setName(item.name);
    setValue(String(item.value));
    setInstalmentAmount(item.instalment_amount ? String(item.instalment_amount) : '');
    setMinPayment(item.min_payment ? String(item.min_payment) : '');
    setNominee(item.nominee || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        category, name, value: parseFloat(value),
        parent_id: parentId || undefined,
        subcategory: subcategory || undefined,
        instalment_amount: isLiability && instalmentAmount ? parseFloat(instalmentAmount) : undefined,
        min_payment: isLiability && minPayment ? parseFloat(minPayment) : undefined,
        nominee: nominee || undefined,
      };
      if (editingId) {
        await api.updateBalanceSheetItem(editingId, payload);
      } else {
        await api.createBalanceSheetItem(payload);
      }
      resetForm();
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Could not save this item. Please check the fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteBalanceSheetItem(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-1.5">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Compare to</label>
          <input type="date" value={compareTo} onChange={(e) => setCompareTo(e.target.value)} className="bg-transparent text-xs text-white outline-none" />
          {compareTo && <button onClick={() => setCompareTo('')} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Line Item
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Balance Sheet Item' : 'New Balance Sheet Item'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={category} onChange={(e) => { setCategory(e.target.value as BalanceSheetCategory); setSubcategory(''); setParentId(''); }} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {(Object.keys(CATEGORY_LABELS) as BalanceSheetCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <input required placeholder="Item name (e.g. Cash in Hand, House)" value={name} onChange={(e) => setName(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <div>
              <input required type="number" step="0.01" placeholder="Value (RM)" value={value} onChange={(e) => setValue(e.target.value)} disabled={editingIsLive} className="glass-input px-3.5 py-2 rounded-xl text-xs w-full disabled:opacity-50" />
              {editingIsLive && <p className="text-[9px] text-slate-500 mt-1">Synced from linked account — unlink to edit manually</p>}
            </div>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="">Subcategory (optional)</option>
              {subcategoryOptions.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="">No parent (top-level item)</option>
              {potentialParents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Nominee (optional)" value={nominee} onChange={(e) => setNominee(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            {isLiability && (
              <>
                <input type="number" step="0.01" placeholder="Instalment amount (optional)" value={instalmentAmount} onChange={(e) => setInstalmentAmount(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
                <input type="number" step="0.01" placeholder="Min payment (optional)" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
              </>
            )}
            {formError && <p className="md:col-span-4 text-[11px] text-rose-400">{formError}</p>}
            <button type="submit" disabled={saving} className="md:col-span-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
            </button>
          </form>
        </GlassCard>
      )}

      {/* Net worth summary */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Assets</p>
          <p className="text-xl font-extrabold text-emerald-400">{formatCurrency(sheet?.totals.total_assets ?? 0)}</p>
          {sheet?.totals.total_assets_change !== undefined && (
            <p className={`text-[10px] font-bold ${sheet.totals.total_assets_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrencySigned(sheet.totals.total_assets_change)} vs {compareTo}
            </p>
          )}
        </GlassCard>
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Liabilities</p>
          <p className="text-xl font-extrabold text-rose-400">{formatCurrency(sheet?.totals.total_liabilities ?? 0)}</p>
          {sheet?.totals.total_liabilities_change !== undefined && (
            <p className={`text-[10px] font-bold ${sheet.totals.total_liabilities_change <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrencySigned(sheet.totals.total_liabilities_change)} vs {compareTo}
            </p>
          )}
        </GlassCard>
        <GlassCard hoverEffect={false} className="text-center border-cyan-500/30">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Net Worth</p>
          <p className="text-xl font-extrabold text-cyan-400">{formatCurrency(sheet?.totals.net_worth ?? 0)}</p>
          {sheet?.totals.net_worth_change !== undefined && (
            <p className={`text-[10px] font-bold ${sheet.totals.net_worth_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrencySigned(sheet.totals.net_worth_change)} vs {compareTo}
            </p>
          )}
        </GlassCard>
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Cash Tagged</p>
          <p className="text-lg font-extrabold text-emerald-300">{formatCurrency(sheet?.totals.total_cash_balance ?? 0)}</p>
        </GlassCard>
        <GlassCard hoverEffect={false} className="text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Credit Tagged</p>
          <p className="text-lg font-extrabold text-rose-300">{formatCurrency(sheet?.totals.total_credit_balance ?? 0)}</p>
        </GlassCard>
      </div>

      {/* T-account layout */}
      <GlassCard hoverEffect={false} className="space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Landmark className="w-5 h-5 text-cyanAccent" />
          <span>Balance Sheet</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {/* Left: Assets */}
          <div className="space-y-5 md:pr-6 pb-5 md:pb-0">
            <p className="text-center text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-white/10 pb-2">Assets</p>
            <ColumnList title={CATEGORY_LABELS.fixed_asset} items={sheet?.fixed_assets || []} total={sheet?.totals.fixed_assets ?? 0} accent="emerald" isLiability={false} accounts={accounts} linkedAccountIds={linkedAccountIds} onEdit={startEdit} onDelete={handleDelete} onLink={handleLink} onUnlink={handleUnlink} />
            <ColumnList title={CATEGORY_LABELS.current_asset} items={sheet?.current_assets || []} total={sheet?.totals.current_assets ?? 0} accent="emerald" isLiability={false} accounts={accounts} linkedAccountIds={linkedAccountIds} onEdit={startEdit} onDelete={handleDelete} onLink={handleLink} onUnlink={handleUnlink} />
          </div>
          {/* Right: Liabilities */}
          <div className="space-y-5 md:pl-6 pt-5 md:pt-0">
            <p className="text-center text-xs font-bold text-rose-400 uppercase tracking-widest border-b border-white/10 pb-2">Liabilities</p>
            <ColumnList title={CATEGORY_LABELS.fixed_liability} items={sheet?.fixed_liabilities || []} total={sheet?.totals.fixed_liabilities ?? 0} accent="rose" isLiability accounts={accounts} linkedAccountIds={linkedAccountIds} onEdit={startEdit} onDelete={handleDelete} onLink={handleLink} onUnlink={handleUnlink} />
            <ColumnList title={CATEGORY_LABELS.current_liability} items={sheet?.current_liabilities || []} total={sheet?.totals.current_liabilities ?? 0} accent="rose" isLiability accounts={accounts} linkedAccountIds={linkedAccountIds} onEdit={startEdit} onDelete={handleDelete} onLink={handleLink} onUnlink={handleUnlink} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
