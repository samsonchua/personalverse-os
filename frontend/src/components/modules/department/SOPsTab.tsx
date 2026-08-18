import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Workflow, GripVertical } from 'lucide-react';
import { departmentApi } from '../../../api/departmentClient';
import { SOPWorkflow, SOPStep } from '../../../types';

export const SOPsTab: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const [sops, setSops] = useState<SOPWorkflow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [steps, setSteps] = useState<Array<{ instruction: string; responsible_role: string }>>([{ instruction: '', responsible_role: '' }]);
  const [saving, setSaving] = useState(false);

  const load = () => departmentApi.listSops(departmentId).then(setSops);
  useEffect(() => { load(); }, [departmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setTitle(''); setCategory(''); setSteps([{ instruction: '', responsible_role: '' }]); setShowForm(false);
  };

  const updateStep = (idx: number, field: 'instruction' | 'responsible_role', value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, { instruction: '', responsible_role: '' }]);
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSteps: SOPStep[] = steps
      .filter((s) => s.instruction.trim())
      .map((s, i) => ({ step_number: i + 1, instruction: s.instruction, responsible_role: s.responsible_role || undefined }));
    if (!title || !validSteps.length) return;
    setSaving(true);
    try {
      await departmentApi.createSop({ department_id: departmentId, title, category: category || undefined, steps: validSteps, version: '1.0' });
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await departmentApi.deleteSop(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add SOP
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New SOP Workflow</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required placeholder="SOP title (e.g. New Hire Onboarding)" value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
              <input placeholder="Category (e.g. HR, Operations)" value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400">Steps</p>
              {steps.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-[11px] text-slate-500 w-5 shrink-0">{idx + 1}.</span>
                  <input placeholder="Instruction" value={s.instruction} onChange={(e) => updateStep(idx, 'instruction', e.target.value)} className="flex-1 glass-input px-3 py-1.5 rounded-lg text-xs" />
                  <input placeholder="Responsible role (optional)" value={s.responsible_role} onChange={(e) => updateStep(idx, 'responsible_role', e.target.value)} className="w-40 glass-input px-3 py-1.5 rounded-lg text-xs" />
                  <button type="button" onClick={() => removeStep(idx)} className="p-1.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={addStep} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Step</button>
            </div>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Save SOP'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sops.map((sop) => (
          <GlassCard key={sop.id} hoverEffect={false} className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-cyanAccent" />
                <div>
                  <h4 className="font-bold text-white text-sm">{sop.title}</h4>
                  <span className="text-[10px] text-slate-500">{sop.category || 'General'} • v{sop.version}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(sop.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <ol className="space-y-1.5">
              {sop.steps.sort((a, b) => a.step_number - b.step_number).map((step) => (
                <li key={step.step_number} className="flex items-start gap-2 text-xs bg-slate-900/60 rounded-lg p-2 border border-white/5">
                  <GripVertical className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-200">{step.step_number}. {step.instruction}</span>
                    {step.responsible_role && <span className="block text-[10px] text-cyan-400 mt-0.5">→ {step.responsible_role}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </GlassCard>
        ))}
        {!sops.length && <p className="text-xs text-slate-500 text-center py-8 md:col-span-2">No SOPs defined yet — add one above.</p>}
      </div>
    </div>
  );
};
