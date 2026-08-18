import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Brain, Plus, Sparkles, Tag, Clock, Smile } from 'lucide-react';
import { api } from '../../api/client';
import { JournalEntry } from '../../types';

export const SecondBrainView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryType, setEntryType] = useState('journal');

  const loadData = async () => {
    const res = await api.getJournalEntries();
    setEntries(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    await api.createJournalEntry({ title, content, entry_type: entryType, mood: 'Focused' });
    setTitle('');
    setContent('');
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Second Brain & Journal Engine</h2>
        <p className="text-xs text-slate-400">Daily reflections, decision logs, lessons learned, and random creative thoughts</p>
      </div>

      {/* Write New Note / Entry */}
      <GlassCard className="space-y-4 border-violet-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-violet-400 font-bold text-sm">
            <Brain className="w-5 h-5" />
            <span>Capture Second Brain Entry</span>
          </div>
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            <option value="journal" className="bg-slate-900">Journal Reflection</option>
            <option value="decision_log" className="bg-slate-900">Decision Log (ADR)</option>
            <option value="random_thought" className="bg-slate-900">Random Thought</option>
            <option value="lesson_learned" className="bg-slate-900">Lesson Learned</option>
          </select>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry Title..."
            className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
          />
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your entry thoughts, arguments, or lessons..."
            className="w-full glass-input p-3.5 rounded-xl text-xs"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Feed of Entries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entries.map((entry) => (
          <GlassCard key={entry.id} className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 px-2 py-0.5 rounded bg-violet-500/10">
                  {entry.entry_type}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{entry.title}</h3>
              </div>
              {entry.mood && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-cyan-400" /> {entry.mood}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-3.5 rounded-xl border border-white/5 leading-relaxed">
              {entry.content}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/5">
              <span>{new Date(entry.created_at).toLocaleString()}</span>
              {entry.tags && <span>Tags: {entry.tags}</span>}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
