import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Globe, Link2, Trash2, Clock, X, ExternalLink } from 'lucide-react';
import { webReaderApi } from '../../api/webReaderClient';
import { WebArticle } from '../../types';

export const WebReaderView: React.FC = () => {
  const [articles, setArticles] = useState<WebArticle[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WebArticle | null>(null);

  const load = () => webReaderApi.list().then(setArticles);

  useEffect(() => {
    load();
  }, []);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const article = await webReaderApi.fetchUrl(url.trim());
      setUrl('');
      setSelected(article);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not fetch that URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await webReaderApi.remove(id);
    if (selected?.id === id) setSelected(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Web Reader</h2>
        <p className="text-xs text-slate-400">Paste a URL to fetch, extract, and summarize an article</p>
      </div>

      <GlassCard hoverEffect={false} className="space-y-3">
        <form onSubmit={handleFetch} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full glass-input pl-9 pr-3.5 py-2.5 rounded-xl text-xs"
            />
          </div>
          <button type="submit" disabled={loading} className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50 whitespace-nowrap">
            {loading ? 'Fetching...' : 'Fetch & Summarize'}
          </button>
        </form>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </GlassCard>

      {selected && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-white text-base">{selected.title}</h3>
              <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-1">
                {selected.url} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <button onClick={() => setSelected(null)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {selected.reading_time_min} min read &middot; {selected.word_count.toLocaleString()} words
          </p>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{selected.summary}</p>
        </GlassCard>
      )}

      <GlassCard hoverEffect={false} className="space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyanAccent" /> Saved Articles
        </h3>
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/5">
              <button onClick={() => setSelected(a)} className="text-left flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{a.title}</p>
                <p className="text-[10px] text-slate-500 truncate">{a.url}</p>
              </button>
              <span className="text-[10px] text-slate-500 mx-3 whitespace-nowrap">{a.reading_time_min}m read</span>
              <button onClick={() => handleDelete(a.id)} className="text-slate-500 hover:text-rose-400 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!articles.length && <p className="text-xs text-slate-500 text-center py-6">No articles saved yet.</p>}
        </div>
      </GlassCard>
    </div>
  );
};
