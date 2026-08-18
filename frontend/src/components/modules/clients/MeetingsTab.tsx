import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, Video } from 'lucide-react';
import { clientsApi } from '../../../api/clientsClient';
import { ClientMeeting } from '../../../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

interface MeetingsTabProps {
  clientId: string;
  meetings: ClientMeeting[];
  onChange: () => void;
}

export const MeetingsTab: React.FC<MeetingsTabProps> = ({ clientId, meetings, onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(todayStr());
  const [attendees, setAttendees] = useState('');
  const [summary, setSummary] = useState('');
  const [actionItemsText, setActionItemsText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const action_items_json = actionItemsText.split('\n').map((s) => s.trim()).filter(Boolean);
      await clientsApi.createMeeting({
        client_id: clientId, title, meeting_date: meetingDate, attendees: attendees || undefined,
        summary: summary || undefined, action_items_json: action_items_json.length ? action_items_json : undefined,
      });
      setTitle(''); setAttendees(''); setSummary(''); setActionItemsText('');
      setShowForm(false);
      onChange();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await clientsApi.removeMeeting(id);
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Log Meeting
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Meeting Minutes</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Attendees (comma separated)" value={attendees} onChange={(e) => setAttendees(e.target.value)} className="md:col-span-3 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <textarea placeholder="Summary / minutes" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="md:col-span-3 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <textarea placeholder={'Action items (one per line)'} value={actionItemsText} onChange={(e) => setActionItemsText(e.target.value)} rows={3} className="md:col-span-3 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Meeting'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="space-y-3">
        {meetings.map((m) => (
          <GlassCard key={m.id} hoverEffect={false} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-cyanAccent" />
                <div>
                  <h4 className="font-bold text-white text-sm">{m.title}</h4>
                  <p className="text-[10px] text-slate-500">{m.meeting_date}{m.attendees ? ` · ${m.attendees}` : ''}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(m.id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {m.summary && <p className="text-xs text-slate-300">{m.summary}</p>}
            {!!m.action_items_json?.length && (
              <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                {m.action_items_json.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </GlassCard>
        ))}
        {!meetings.length && (
          <GlassCard hoverEffect={false} className="text-center py-8">
            <p className="text-xs text-slate-500">No meeting minutes logged yet.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
