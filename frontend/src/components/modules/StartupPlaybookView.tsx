import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Rocket, Plus, X, Trash2, Pencil, ChevronLeft, DollarSign, TrendingUp, Lightbulb } from 'lucide-react';
import { startupPlaybooksApi } from '../../api/startupPlaybooksClient';
import { StartupPlaybook } from '../../types';
import { formatCurrency } from '../../lib/currency';

export const StartupPlaybookView: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<StartupPlaybook[]>([]);
  const [selected, setSelected] = useState<StartupPlaybook | null>(null);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState<Partial<StartupPlaybook>>({});

  const load = () => startupPlaybooksApi.list().then(setPlaybooks);
  useEffect(() => { load(); }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setGenerating(true);
    try {
      const created = await startupPlaybooksApi.generate(name.trim());
      setName('');
      setShowForm(false);
      await load();
      setSelected(created);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await startupPlaybooksApi.remove(id);
    if (selected?.id === id) setSelected(null);
    await load();
  };

  const startEdit = () => {
    if (!selected) return;
    setForm(selected);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    const updated = await startupPlaybooksApi.update(selected.id, form);
    setSelected(updated);
    setEditing(false);
    await load();
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { setSelected(null); setEditing(false); }} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold">
            <ChevronLeft className="w-4 h-4" /> Back to Playbook
          </button>
          {!editing && (
            <button onClick={startEdit} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
            <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full glass-input px-3.5 py-2 rounded-xl text-sm font-bold" />
            <input value={form.industry || ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Industry" className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
            <textarea value={form.founding_story || ''} onChange={(e) => setForm({ ...form, founding_story: e.target.value })} placeholder="Founding story" rows={4} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={form.initial_cost_estimate ?? ''} onChange={(e) => setForm({ ...form, initial_cost_estimate: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="Initial cost estimate" className="glass-input px-3.5 py-2 rounded-xl text-xs" />
              <input value={form.tags || ''} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma separated)" className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            </div>
            <textarea value={form.initial_cost_notes || ''} onChange={(e) => setForm({ ...form, initial_cost_notes: e.target.value })} placeholder="Initial cost notes" rows={2} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
            <textarea value={form.business_plan_summary || ''} onChange={(e) => setForm({ ...form, business_plan_summary: e.target.value })} placeholder="Business plan summary" rows={3} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
            <textarea value={form.key_details || ''} onChange={(e) => setForm({ ...form, key_details: e.target.value })} placeholder="Key details" rows={3} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
            <textarea value={form.roi_notes || ''} onChange={(e) => setForm({ ...form, roi_notes: e.target.value })} placeholder="ROI notes" rows={3} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input value={form.source_url || ''} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="Source URL (optional)" className="w-full glass-input px-3.5 py-2 rounded-xl text-xs" />
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs">Save</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">Cancel</button>
            </div>
          </GlassCard>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-white">{selected.name}</h2>
                {selected.source === 'ai_generated' && <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold">AI</span>}
              </div>
              {selected.industry && <p className="text-xs text-slate-400">{selected.industry}</p>}
              {selected.tags && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selected.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassCard hoverEffect={false} className="text-center">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Initial Cost Estimate</p>
                <p className="text-xl font-extrabold text-emerald-400">{selected.initial_cost_estimate != null ? formatCurrency(selected.initial_cost_estimate) : '—'}</p>
                {selected.initial_cost_notes && <p className="text-[11px] text-slate-500 mt-1">{selected.initial_cost_notes}</p>}
              </GlassCard>
              <GlassCard hoverEffect={false} className="text-center">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> ROI</p>
                <p className="text-xs text-slate-300 mt-2">{selected.roi_notes || '—'}</p>
              </GlassCard>
            </div>

            {selected.founding_story && (
              <GlassCard hoverEffect={false} className="space-y-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5"><Rocket className="w-4 h-4 text-cyanAccent" /> Founding Story</h3>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{selected.founding_story}</p>
              </GlassCard>
            )}
            {selected.business_plan_summary && (
              <GlassCard hoverEffect={false} className="space-y-2">
                <h3 className="font-bold text-white text-sm">Business Plan</h3>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{selected.business_plan_summary}</p>
              </GlassCard>
            )}
            {selected.key_details && (
              <GlassCard hoverEffect={false} className="space-y-2">
                <h3 className="font-bold text-white text-sm">Key Details</h3>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{selected.key_details}</p>
              </GlassCard>
            )}
            {selected.source_url && (
              <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline">{selected.source_url}</a>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Startup Playbook</h2>
          <p className="text-xs text-slate-400">Founding stories, initial cost, plan, and ROI — compiled for research and inspiration</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Compile a Playbook Entry</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleGenerate} className="flex gap-2">
            <input required placeholder="Company or business idea (e.g. Airbnb, a subscription meal-kit service)" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={generating} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50 whitespace-nowrap">
              {generating ? 'Compiling...' : 'Compile Entry'}
            </button>
          </form>
          <p className="text-[10px] text-slate-500">Uses the configured AI provider to research founding story, cost, plan, and ROI; without one, creates a blank editable template.</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playbooks.map((p) => (
          <GlassCard key={p.id} onClick={() => setSelected(p)} className="space-y-2">
            <div className="flex items-start justify-between">
              <Lightbulb className="w-5 h-5 text-amberAccent" />
              <button onClick={(e) => handleDelete(p.id, e)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <h4 className="font-bold text-white text-sm">{p.name}</h4>
            {p.industry && <p className="text-[11px] text-slate-400">{p.industry}</p>}
            {p.initial_cost_estimate != null && (
              <p className="text-xs text-emerald-400 font-bold">{formatCurrency(p.initial_cost_estimate)} to start</p>
            )}
          </GlassCard>
        ))}
        {!playbooks.length && (
          <GlassCard hoverEffect={false} className="md:col-span-2 lg:col-span-3 text-center py-10">
            <p className="text-xs text-slate-500">No entries yet — compile one above.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
