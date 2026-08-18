import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, ScrollText } from 'lucide-react';
import { departmentApi } from '../../../api/departmentClient';
import { DepartmentPolicy } from '../../../types';

const CATEGORIES = ['Attendance', 'Conduct', 'Safety', 'Compliance', 'Compensation', 'Other'];

export const PoliciesTab: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const [policies, setPolicies] = useState<DepartmentPolicy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Conduct');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => departmentApi.listPolicies(departmentId).then(setPolicies);
  useEffect(() => { load(); }, [departmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => { setTitle(''); setCategory('Conduct'); setContent(''); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setSaving(true);
    try {
      await departmentApi.createPolicy({ department_id: departmentId, title, category, content });
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await departmentApi.deletePolicy(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Policy
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Policy / Rule</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Policy title" value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea required placeholder="Policy content / rule details" value={content} onChange={(e) => setContent(e.target.value)} className="md:col-span-3 glass-input px-3.5 py-2 rounded-xl text-xs" rows={4} />
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Policy'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="space-y-3">
        {policies.map((p) => (
          <GlassCard key={p.id} hoverEffect={false} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-cyanAccent" />
                <div>
                  <h4 className="font-bold text-white text-sm">{p.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10">{p.category}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-white/5">{p.content}</p>
          </GlassCard>
        ))}
        {!policies.length && <p className="text-xs text-slate-500 text-center py-8">No policies recorded yet — add one above.</p>}
      </div>
    </div>
  );
};
