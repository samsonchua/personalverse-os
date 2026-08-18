import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Plus, X, Trash2, Pencil, Building2, Users } from 'lucide-react';
import { departmentApi } from '../../api/departmentClient';
import { Department } from '../../types';
import { StaffTab } from './department/StaffTab';
import { JobRolesTab } from './department/JobRolesTab';
import { SOPsTab } from './department/SOPsTab';
import { PoliciesTab } from './department/PoliciesTab';
import { CostingTab } from './department/CostingTab';

type SubTab = 'staff' | 'roles' | 'sops' | 'policies' | 'costing';

const SUBTAB_LABELS: Record<SubTab, string> = {
  staff: 'Staff & Analysis',
  roles: 'Job Roles',
  sops: 'SOP Workflows',
  policies: 'Rules & Regulations',
  costing: 'Costing',
};

export const DepartmentView: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('staff');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [headName, setHeadName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const depts = await departmentApi.listDepartments();
    setDepartments(depts);
    if (!activeDeptId && depts.length) setActiveDeptId(depts[0].id);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => { setName(''); setDescription(''); setHeadName(''); setEditingId(null); setShowForm(false); };

  const startEdit = (d: Department) => {
    setEditingId(d.id);
    setName(d.name);
    setDescription(d.description || '');
    setHeadName(d.head_name || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      if (editingId) {
        await departmentApi.updateDepartment(editingId, { name, description: description || undefined, head_name: headName || undefined });
      } else {
        await departmentApi.createDepartment({ name, description: description || undefined, head_name: headName || undefined });
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await departmentApi.deleteDepartment(id);
    if (activeDeptId === id) setActiveDeptId(null);
    await load();
  };

  const activeDept = departments.find((d) => d.id === activeDeptId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Department Management</h2>
          <p className="text-xs text-slate-400">SOP workflows, staff analysis, costing, job roles & scope, rules & regulations</p>
        </div>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Department' : 'New Department'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Head of department (optional)" value={headName} onChange={(e) => setHeadName(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Department'}
            </button>
          </form>
        </GlassCard>
      )}

      {/* Department selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => (
          <GlassCard
            key={d.id}
            onClick={() => setActiveDeptId(d.id)}
            className={`space-y-2 border ${activeDeptId === d.id ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-white/5'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyanAccent" />
                <h4 className="font-bold text-white text-sm">{d.name}</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); startEdit(d); }} className="p-1 rounded text-slate-500 hover:text-cyan-300"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="p-1 rounded text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {d.head_name && <p className="text-[11px] text-slate-400">Head: <span className="text-slate-200 font-semibold">{d.head_name}</span></p>}
            {d.description && <p className="text-xs text-slate-400 line-clamp-2">{d.description}</p>}
            <p className="text-[11px] text-cyan-400 flex items-center gap-1"><Users className="w-3 h-3" /> {d.staff_count} staff</p>
          </GlassCard>
        ))}
        {!departments.length && <p className="text-xs text-slate-500 text-center py-8 lg:col-span-3">No departments yet — add one above.</p>}
      </div>

      {activeDept && (
        <>
          <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10 text-xs w-fit">
            {(Object.keys(SUBTAB_LABELS) as SubTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  subTab === tab ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                {SUBTAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {subTab === 'staff' && <StaffTab departmentId={activeDept.id} />}
          {subTab === 'roles' && <JobRolesTab departmentId={activeDept.id} />}
          {subTab === 'sops' && <SOPsTab departmentId={activeDept.id} />}
          {subTab === 'policies' && <PoliciesTab departmentId={activeDept.id} />}
          {subTab === 'costing' && <CostingTab departmentId={activeDept.id} />}
        </>
      )}
    </div>
  );
};
