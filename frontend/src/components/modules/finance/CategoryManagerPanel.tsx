import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, Pencil, Trash2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../../api/client';
import { TransactionCategory } from '../../../types';
import { orderCategoriesByParent } from '../../../lib/financeCategories';

interface CategoryManagerPanelProps {
  categories: TransactionCategory[];
  onChange: () => Promise<void>;
}

const INCOME_CLASSIFICATIONS = ['variable', 'fixed'];
const EXPENSE_CLASSIFICATIONS = ['variable', 'fixed', 'yearly', 'disbursement'];

export const CategoryManagerPanel: React.FC<CategoryManagerPanelProps> = ({ categories, onChange }) => {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingClassification, setEditingClassification] = useState('variable');
  const [editingParentId, setEditingParentId] = useState('');
  const [editingIsDeduction, setEditingIsDeduction] = useState(false);
  const [editingIsCreditCard, setEditingIsCreditCard] = useState(false);
  const [expandedType, setExpandedType] = useState<'income' | 'expense' | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.createTransactionCategory({ name: newName.trim(), category_type: newType });
    setNewName('');
    await onChange();
  };

  const startEdit = (c: TransactionCategory) => {
    setEditingId(c.id);
    setEditingName(c.name);
    setEditingClassification(c.classification || 'variable');
    setEditingParentId(c.parent_category_id || '');
    setEditingIsDeduction(!!c.is_deduction);
    setEditingIsCreditCard(!!c.is_credit_card);
  };

  const saveEdit = async (c: TransactionCategory) => {
    if (editingName.trim()) {
      await api.updateTransactionCategory(c.id, {
        name: editingName.trim(),
        classification: editingClassification,
        parent_category_id: editingParentId || undefined,
        is_deduction: c.category_type === 'income' ? editingIsDeduction : undefined,
        is_credit_card: c.category_type === 'income' ? editingIsCreditCard : undefined,
      });
    }
    setEditingId(null);
    await onChange();
  };

  const handleDelete = async (id: string) => {
    await api.deleteTransactionCategory(id);
    await onChange();
  };

  const renderList = (type: 'income' | 'expense') => {
    const rawItems = categories.filter((c) => c.category_type === type);
    const items = orderCategoriesByParent(rawItems);
    const isExpanded = expandedType === type;
    const classifications = type === 'income' ? INCOME_CLASSIFICATIONS : EXPENSE_CLASSIFICATIONS;
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setExpandedType(isExpanded ? null : type)}
          className="w-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {type} <span className="text-slate-600 normal-case">({items.length})</span>
        </button>
        {isExpanded && (
          <>
            {items.map((c) => (
              <div key={c.id} className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/5 text-xs space-y-1.5" style={{ marginLeft: c.depth * 14 }}>
                <div className="flex items-center justify-between">
                  {editingId === c.id ? (
                    <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} className="flex-1 glass-input px-2 py-1 rounded-lg text-xs mr-2" />
                  ) : (
                    <span className="text-slate-200">
                      {c.is_deduction && <span className="text-rose-400 mr-1">(-)</span>}
                      {c.depth ? '— ' : ''}{c.name}
                      <span className="ml-1.5 text-[9px] text-slate-500 uppercase">{c.classification || 'variable'}</span>
                      {c.is_credit_card && <span className="ml-1 text-[9px] text-amber-400 uppercase">CC</span>}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    {editingId === c.id ? (
                      <button onClick={() => saveEdit(c)} className="p-1 rounded text-emerald-400 hover:bg-white/5"><Check className="w-3.5 h-3.5" /></button>
                    ) : (
                      <button onClick={() => startEdit(c)} className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={() => handleDelete(c.id)} className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {editingId === c.id && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                    <select value={editingClassification} onChange={(e) => setEditingClassification(e.target.value)} className="glass-input px-2 py-1 rounded-lg text-[11px] bg-slate-900">
                      {classifications.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
                    </select>
                    <select
                      value={editingParentId}
                      onChange={(e) => {
                        setEditingParentId(e.target.value);
                        // Grouping under a parent only controls display/indentation — it does NOT
                        // move this category into the parent's bucket on the Income Statement,
                        // since bucket placement is driven solely by `classification`. Auto-syncing
                        // here avoids the confusing "I nested it but it's not showing up" trap.
                        const parent = items.find((p) => p.id === e.target.value);
                        if (parent?.classification) setEditingClassification(parent.classification);
                      }}
                      className="glass-input px-2 py-1 rounded-lg text-[11px] bg-slate-900"
                    >
                      <option value="">No parent</option>
                      {items.filter((p) => p.id !== c.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {type === 'income' && (
                      <>
                        <label className="flex items-center gap-1 text-[10px] text-slate-400">
                          <input type="checkbox" checked={editingIsDeduction} onChange={(e) => setEditingIsDeduction(e.target.checked)} className="accent-cyan-500" /> Deduction
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-slate-400">
                          <input type="checkbox" checked={editingIsCreditCard} onChange={(e) => setEditingIsCreditCard(e.target.checked)} className="accent-cyan-500" /> Credit Card
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!items.length && <p className="text-[11px] text-slate-500">No categories.</p>}
          </>
        )}
      </div>
    );
  };

  return (
    <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
      <h3 className="font-bold text-white text-sm">Manage Transaction Categories</h3>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input placeholder="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs" />
        <select value={newType} onChange={(e) => setNewType(e.target.value as 'income' | 'expense')} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button type="submit" className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
      <p className="text-[10px] text-slate-500">Click the pencil icon to set fixed/variable classification, group under a parent, or flag EPF/SOCSO-style deductions and credit-card income — these drive the Income Statement's standard format.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderList('expense')}
        {renderList('income')}
      </div>
    </GlassCard>
  );
};
