import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Plus, X, Trash2, Users, Briefcase, FileText, Workflow, DollarSign, Video } from 'lucide-react';
import { clientsApi } from '../../api/clientsClient';
import { ClientSummary, ClientDetail } from '../../types';
import { formatCurrency } from '../../lib/currency';
import { OverviewTab } from './clients/OverviewTab';
import { ServicesTab } from './clients/ServicesTab';
import { ContractsTab } from './clients/ContractsTab';
import { PlanningTab } from './clients/PlanningTab';
import { IncomeTab } from './clients/IncomeTab';
import { MeetingsTab } from './clients/MeetingsTab';

type SubTab = 'overview' | 'services' | 'contracts' | 'planning' | 'income' | 'meetings';

const SUBTABS: Array<{ id: SubTab; label: string; icon: any }> = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'planning', label: 'Planning', icon: Workflow },
  { id: 'income', label: 'Income', icon: DollarSign },
  { id: 'meetings', label: 'Meetings', icon: Video },
];

const STATUS_COLORS: Record<string, string> = {
  prospect: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  paused: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  churned: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

export const ClientsView: React.FC = () => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('overview');

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [businessNature, setBusinessNature] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const loadList = () => clientsApi.listSummary().then(setClients);

  useEffect(() => {
    loadList();
  }, []);

  const loadDetail = async (id: string) => {
    setDetail(await clientsApi.getDetail(id));
  };

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId]);

  const selectClient = (id: string) => {
    setSelectedId(id);
    setSubTab('overview');
  };

  const refresh = async () => {
    await loadList();
    if (selectedId) await loadDetail(selectedId);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await clientsApi.create({
        name, business_nature: businessNature || undefined,
        contact_person: contactPerson || undefined, contact_email: contactEmail || undefined, contact_phone: contactPhone || undefined,
      });
      setName(''); setBusinessNature(''); setContactPerson(''); setContactEmail(''); setContactPhone('');
      setShowForm(false);
      await loadList();
      selectClient(created.id);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    await clientsApi.remove(id);
    if (selectedId === id) setSelectedId(null);
    await loadList();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Clients</h2>
          <p className="text-xs text-slate-400">Client directory, service scope, contracts, planning, income & meeting minutes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Client</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Client / company name" value={name} onChange={(e) => setName(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Business nature (e.g. F&B retailer)" value={businessNature} onChange={(e) => setBusinessNature(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Contact person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="email" placeholder="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Client'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Client directory */}
        <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-cyanAccent" /> Directory
          </h3>
          <div className="space-y-1.5 max-h-[36rem] overflow-y-auto">
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => selectClient(c.id)}
                className={`px-3 py-2.5 rounded-xl cursor-pointer border ${
                  selectedId === c.id ? 'bg-cyan-500/20 border-cyan-500/30' : 'border-transparent hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold truncate ${selectedId === c.id ? 'text-cyan-300' : 'text-white'}`}>{c.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(c.id); }} className="text-slate-500 hover:text-rose-400 shrink-0 ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold uppercase ${STATUS_COLORS[c.status] || STATUS_COLORS.active}`}>{c.status}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{formatCurrency(c.total_income)}</span>
                </div>
              </div>
            ))}
            {!clients.length && <p className="text-xs text-slate-500 py-6 text-center">No clients yet. Add one above.</p>}
          </div>
        </GlassCard>

        {/* Detail panel */}
        <div className="lg:col-span-3 space-y-4">
          {!detail ? (
            <GlassCard hoverEffect={false} className="text-center py-16">
              <p className="text-xs text-slate-500">Select a client from the directory to view details.</p>
            </GlassCard>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10 text-xs">
                {SUBTABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSubTab(t.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        subTab === t.id ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>

              {subTab === 'overview' && <OverviewTab client={detail} onChange={refresh} />}
              {subTab === 'services' && <ServicesTab clientId={detail.id} services={detail.services} onChange={refresh} />}
              {subTab === 'contracts' && <ContractsTab clientId={detail.id} />}
              {subTab === 'planning' && <PlanningTab clientId={detail.id} />}
              {subTab === 'income' && <IncomeTab clientId={detail.id} transactions={detail.transactions} totalIncome={detail.total_income} onChange={refresh} />}
              {subTab === 'meetings' && <MeetingsTab clientId={detail.id} meetings={detail.meetings} onChange={refresh} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
