import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Briefcase } from 'lucide-react';
import { clientsApi } from '../../../api/clientsClient';
import { ClientService } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  completed: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  paused: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

interface ServicesTabProps {
  clientId: string;
  services: ClientService[];
  onChange: () => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ clientId, services, onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [scopeDetails, setScopeDetails] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeFrequency, setFeeFrequency] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    setSaving(true);
    try {
      await clientsApi.createService({
        client_id: clientId, service_name: serviceName, scope_details: scopeDetails || undefined,
        fee_amount: feeAmount ? parseFloat(feeAmount) : 0, fee_frequency: feeFrequency,
      });
      setServiceName(''); setScopeDetails(''); setFeeAmount('');
      setShowForm(false);
      onChange();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await clientsApi.removeService(id);
    onChange();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await clientsApi.updateService(id, { status: status as ClientService['status'] });
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Service Scope</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input required placeholder="Service name (e.g. Monthly bookkeeping)" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" step="0.01" placeholder="Fee amount (RM)" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={feeFrequency} onChange={(e) => setFeeFrequency(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time</option>
              <option value="project">Per project</option>
            </select>
            <textarea placeholder="Scope details — what's included" value={scopeDetails} onChange={(e) => setScopeDetails(e.target.value)} rows={2} className="md:col-span-4 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Service'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="space-y-3">
        {services.map((s) => (
          <GlassCard key={s.id} hoverEffect={false} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyanAccent" />
                <h4 className="font-bold text-white text-sm">{s.service_name}</h4>
              </div>
              <div className="flex items-center gap-2">
                <select value={s.status} onChange={(e) => handleStatusChange(s.id, e.target.value)} className={`text-[10px] px-2 py-1 rounded-md border font-bold uppercase bg-transparent ${STATUS_COLORS[s.status]}`}>
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                  <option value="paused">paused</option>
                </select>
                <button onClick={() => handleDelete(s.id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {s.scope_details && <p className="text-xs text-slate-300">{s.scope_details}</p>}
            <p className="text-xs text-emerald-400 font-semibold">
              {formatCurrency(s.fee_amount)} <span className="text-slate-400 font-normal">/ {s.fee_frequency.replace('_', ' ')}</span>
            </p>
          </GlassCard>
        ))}
        {!services.length && (
          <GlassCard hoverEffect={false} className="text-center py-8">
            <p className="text-xs text-slate-500">No services scoped yet. Add one above.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
