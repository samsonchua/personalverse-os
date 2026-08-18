import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Pencil, Briefcase } from 'lucide-react';
import { departmentApi } from '../../../api/departmentClient';
import { JobRole } from '../../../types';

const LEVELS = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager'];

export const JobRolesTab: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('Mid');
  const [jobScope, setJobScope] = useState('');
  const [requirements, setRequirements] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => departmentApi.listJobRoles(departmentId).then(setRoles);
  useEffect(() => { load(); }, [departmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setTitle(''); setLevel('Mid'); setJobScope(''); setRequirements(''); setEditingId(null); setShowForm(false);
  };

  const startEdit = (r: JobRole) => {
    setEditingId(r.id);
    setTitle(r.title);
    setLevel(r.level);
    setJobScope(r.job_scope || '');
    setRequirements(r.requirements || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    try {
      const payload = { department_id: departmentId, title, level, job_scope: jobScope || undefined, requirements: requirements || undefined };
      if (editingId) {
        await departmentApi.updateJobRole(editingId, payload);
      } else {
        await departmentApi.createJobRole(payload);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await departmentApi.deleteJobRole(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Job Role
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Job Role' : 'New Job Role'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required placeholder="Job title (e.g. Backend Engineer)" value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <textarea placeholder="Job scope / responsibilities" value={jobScope} onChange={(e) => setJobScope(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" rows={3} />
            <textarea placeholder="Requirements / qualifications" value={requirements} onChange={(e) => setRequirements(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" rows={2} />
            <button type="submit" disabled={saving} className="md:col-span-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Job Role'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((r) => (
          <GlassCard key={r.id} hoverEffect={false} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyanAccent" />
                <div>
                  <h4 className="font-bold text-white text-sm">{r.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10">{r.level}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {r.job_scope && <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-white/5"><span className="text-slate-500">Scope: </span>{r.job_scope}</p>}
            {r.requirements && <p className="text-xs text-slate-400"><span className="text-slate-500">Requirements: </span>{r.requirements}</p>}
          </GlassCard>
        ))}
        {!roles.length && <p className="text-xs text-slate-500 text-center py-8 md:col-span-2">No job roles defined yet — add one above.</p>}
      </div>
    </div>
  );
};
