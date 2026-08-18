import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { BookOpen, Sparkles, Plus, Star, UploadCloud, Tag, X } from 'lucide-react';
import { api } from '../../api/client';
import { KnowledgeItem } from '../../types';

export const KnowledgeView: React.FC = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [showImporter, setShowImporter] = useState(false);
  const [notebookTitle, setNotebookTitle] = useState('');
  const [notebookContent, setNotebookContent] = useState('');
  const [importing, setImporting] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemType, setItemType] = useState('book');
  const [itemAuthor, setItemAuthor] = useState('');
  const [itemSummary, setItemSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const res = await api.getKnowledgeItems();
    setItems(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNotebookLMImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notebookTitle || !notebookContent) return;
    setImporting(true);
    try {
      await api.importNotebookLM({
        title: notebookTitle,
        raw_markdown: notebookContent,
        tags: 'NotebookLM, AI, Research',
      });
      setNotebookTitle('');
      setNotebookContent('');
      setShowImporter(false);
      await loadData();
    } catch {
      // ignore
    } finally {
      setImporting(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle) return;
    setSaving(true);
    try {
      await api.createKnowledgeItem({ title: itemTitle, item_type: itemType, author: itemAuthor || undefined, summary: itemSummary || undefined });
      setItemTitle('');
      setItemAuthor('');
      setItemSummary('');
      setShowAddForm(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Knowledge Base & NotebookLM Importer</h2>
          <p className="text-xs text-slate-400">Books, Papers, Courses, Articles, Flashcards & AI Synthesis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddForm(!showAddForm); setShowImporter(false); }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
          <button
            onClick={() => { setShowImporter(!showImporter); setShowAddForm(false); }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-violet-500/20"
          >
            <UploadCloud className="w-4 h-4" />
            <span>NotebookLM Import Simulator</span>
          </button>
        </div>
      </div>

      {/* Manual Add Item Panel */}
      {showAddForm && (
        <GlassCard className="border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Add Knowledge Item</h3>
            <button onClick={() => setShowAddForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Title" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="book">Book</option>
              <option value="paper">Paper</option>
              <option value="course">Course</option>
              <option value="article">Article</option>
              <option value="podcast">Podcast</option>
              <option value="code">Code</option>
            </select>
            <input placeholder="Author (optional)" value={itemAuthor} onChange={(e) => setItemAuthor(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Summary (optional)" value={itemSummary} onChange={(e) => setItemSummary(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Item'}
            </button>
          </form>
        </GlassCard>
      )}

      {/* NotebookLM Importer Modal/Panel */}
      {showImporter && (
        <GlassCard className="border-violet-500/30 bg-slate-900/90 space-y-4">
          <div className="flex items-center space-x-2 text-violet-400 font-bold text-sm">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>Import NotebookLM Synthesis Document</span>
          </div>
          <form onSubmit={handleNotebookLMImport} className="space-y-3">
            <input
              type="text"
              value={notebookTitle}
              onChange={(e) => setNotebookTitle(e.target.value)}
              placeholder="Source Title (e.g., Autonomous Agent Memory Architecture)..."
              className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
            />
            <textarea
              rows={4}
              value={notebookContent}
              onChange={(e) => setNotebookContent(e.target.value)}
              placeholder="Paste raw Markdown from NotebookLM output..."
              className="w-full glass-input p-3.5 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImporter(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importing}
                className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-md shadow-violet-600/30"
              >
                {importing ? 'Processing AI Vectors...' : 'Import & Synthesize'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Grid of Knowledge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <GlassCard key={item.id} className="space-y-3 relative group">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 px-2 py-0.5 rounded bg-violet-500/10">
                  {item.item_type}
                </span>
                <h3 className="text-base font-bold text-white mt-1 group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                {item.author && <p className="text-xs text-slate-400">By {item.author}</p>}
              </div>
              <div className="flex items-center space-x-0.5 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-xs font-bold">{item.rating}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-white/5">
              {item.summary}
            </p>

            {item.key_takeaways_json && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-cyan-400">AI Key Takeaways:</span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                  {item.key_takeaways_json.map((tk, idx) => (
                    <li key={idx}>{tk}</li>
                  ))}
                </ul>
              </div>
            )}

            {item.tags && (
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                <Tag className="w-3 h-3 text-cyan-400" />
                <span>{item.tags}</span>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
