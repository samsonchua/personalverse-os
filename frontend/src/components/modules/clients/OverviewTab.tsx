import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Pencil, Save, X } from 'lucide-react';
import { clientsApi } from '../../../api/clientsClient';
import { ClientDetail } from '../../../types';

const STATUS_OPTIONS = ['prospect', 'active', 'paused', 'churned'];

interface OverviewTabProps {
  client: ClientDetail;
  onChange: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ client, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    business_nature: client.business_nature || '',
    status: client.status,
    contact_person: client.contact_person || '',
    contact_email: client.contact_email || '',
    contact_phone: client.contact_phone || '',
    address: client.address || '',
    notes: client.notes || '',
  });

  const startEdit = () => {
    setForm({
      name: client.name, business_nature: client.business_nature || '', status: client.status,
      contact_person: client.contact_person || '', contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '', address: client.address || '', notes: client.notes || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await clientsApi.update(client.id, form);
      setEditing(false);
      onChange();
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <GlassCard hoverEffect={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base">{client.name}</h3>
          <button onClick={startEdit} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div><p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Business Nature</p><p className="text-slate-200">{client.business_nature || '—'}</p></div>
          <div><p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Status</p><p className="text-slate-200 capitalize">{client.status}</p></div>
          <div><p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Contact Person</p><p className="text-slate-200">{client.contact_person || '—'}</p></div>
          <div><p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Email</p><p className="text-slate-200">{client.contact_email || '—'}</p></div>
          <div><p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Phone</p><p className="text-slate-200">{client.contact_phone || '—'}</p></div>
          <div><p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Address</p><p className="text-slate-200">{client.address || '—'}</p></div>
        </div>
        {client.notes && (
          <div>
            <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Notes</p>
            <p className="text-xs text-slate-300 whitespace-pre-line">{client.notes}</p>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-sm">Edit Client</h3>
        <button onClick={() => setEditing(false)}><X className="w-4 h-4 text-slate-400" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
        <input placeholder="Business nature" value={form.business_nature} onChange={(e) => setForm({ ...form, business_nature: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
        <input type="email" placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
        <input placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
        <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
      </div>
      <button onClick={handleSave} disabled={saving} className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </GlassCard>
  );
};
