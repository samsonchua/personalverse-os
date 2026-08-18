import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { Plus, Check, Sparkles } from 'lucide-react';
import { api } from '../../api/client';

export const QuickCapture: React.FC<{ onCaptured?: () => void }> = ({ onCaptured }) => {
  const [type, setType] = useState<'task' | 'journal' | 'finance'>('task');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      if (type === 'task') {
        await api.createWorkTask({ title, priority: 'High', status: 'Todo' });
      } else if (type === 'journal') {
        await api.createJournalEntry({ title, content: title, entry_type: 'random_thought' });
      } else if (type === 'finance') {
        const accs = (await api.getFinanceSummary()).accounts;
        if (accs.length > 0) {
          await api.createFinanceTransaction({
            account_id: accs[0].id,
            transaction_type: 'expense',
            amount: parseFloat(amount) || 25.0,
            category: 'Quick Capture',
            merchant: title,
            date: new Date().toISOString().slice(0, 10),
          });
        }
      }
      setSuccess(true);
      setTitle('');
      setAmount('');
      setTimeout(() => setSuccess(false), 2000);
      if (onCaptured) onCaptured();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hoverEffect={false} className="border-cyan-500/20 bg-gradient-to-r from-slate-900/90 to-cyan-950/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-cyanAccent animate-pulse" />
          <span className="text-sm font-bold text-white tracking-wide">Quick Capture Dock</span>
        </div>
        <div className="flex bg-slate-800/80 rounded-lg p-1 text-xs border border-white/10">
          {(['task', 'journal', 'finance'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                type === t ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === 'task'
              ? 'Add task or quick goal...'
              : type === 'journal'
              ? 'Capture a quick thought or decision...'
              : 'Expense merchant or description...'
          }
          className="flex-1 glass-input px-3.5 py-2 rounded-xl text-sm"
        />
        {type === 'finance' && (
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$"
            className="w-20 glass-input px-3 py-2 rounded-xl text-sm"
          />
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
        >
          {success ? <Check className="w-4 h-4 text-emerald-300" /> : <Plus className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Add'}</span>
        </button>
      </form>
    </GlassCard>
  );
};
