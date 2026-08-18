import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Pencil, Users } from 'lucide-react';
import { departmentApi } from '../../../api/departmentClient';
import { Staff, JobRole, StaffAnalysis } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract', intern: 'Intern',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-slate-700 text-slate-400',
  on_leave: 'bg-amber-500/20 text-amber-400',
};

export const StaffTab: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [analysis, setAnalysis] = useState<StaffAnalysis | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [jobRoleId, setJobRoleId] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, r, a] = await Promise.all([
      departmentApi.listStaff(departmentId),
      departmentApi.listJobRoles(departmentId),
      departmentApi.getStaffAnalysis(departmentId),
    ]);
    setStaff(s); setRoles(r); setAnalysis(a);
  };
  useEffect(() => { load(); }, [departmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setName(''); setJobRoleId(''); setEmploymentType('full_time'); setSalary(''); setStatus('active');
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setName(s.name);
    setJobRoleId(s.job_role_id || '');
    setEmploymentType(s.employment_type);
    setSalary(String(s.monthly_salary));
    setStatus(s.status);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const payload = {
        department_id: departmentId, job_role_id: jobRoleId || undefined, name,
        employment_type: employmentType as Staff['employment_type'], monthly_salary: parseFloat(salary) || 0,
        status: status as Staff['status'],
      };
      if (editingId) {
        await departmentApi.updateStaff(editingId, payload);
      } else {
        await departmentApi.createStaff(payload);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await departmentApi.deleteStaff(id);
    await load();
  };

  const roleTitle = (id?: string) => roles.find((r) => r.id === id)?.title || 'Unassigned';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingId ? 'Edit Staff Member' : 'New Staff Member'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={jobRoleId} onChange={(e) => setJobRoleId(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="">No role assigned</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Monthly salary (RM)" value={salary} onChange={(e) => setSalary(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="submit" disabled={saving} className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Staff'}
            </button>
          </form>
        </GlassCard>
      )}

      {analysis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard hoverEffect={false} className="text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Headcount</p>
            <p className="text-xl font-extrabold text-white">{analysis.headcount}</p>
          </GlassCard>
          <GlassCard hoverEffect={false} className="text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Monthly Salary</p>
            <p className="text-xl font-extrabold text-cyan-400">{formatCurrency(analysis.total_monthly_salary)}</p>
          </GlassCard>
          <GlassCard hoverEffect={false} className="text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Avg Salary</p>
            <p className="text-xl font-extrabold text-emerald-400">{formatCurrency(analysis.average_monthly_salary)}</p>
          </GlassCard>
          <GlassCard hoverEffect={false} className="text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Roles Represented</p>
            <p className="text-xl font-extrabold text-violet-400">{Object.keys(analysis.by_role).length}</p>
          </GlassCard>
        </div>
      )}

      <GlassCard className="space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2"><Users className="w-4 h-4 text-cyanAccent" /> Staff Roster</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th className="pb-2 font-semibold">Name</th>
                <th className="pb-2 font-semibold">Role</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold text-right">Salary</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 group">
                  <td className="py-2 font-bold text-white">{s.name}</td>
                  <td className="py-2 text-slate-300">{roleTitle(s.job_role_id)}</td>
                  <td className="py-2 text-slate-400">{EMPLOYMENT_LABELS[s.employment_type]}</td>
                  <td className="py-2 text-right text-white font-semibold">{formatCurrency(s.monthly_salary)}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[s.status]}`}>{s.status.replace('_', ' ')}</span></td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!staff.length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No staff yet — add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
