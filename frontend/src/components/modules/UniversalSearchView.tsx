import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Search, Filter, ArrowUpRight } from 'lucide-react';
import { api } from '../../api/client';
import { SearchResult } from '../../types';

const DOMAIN_TO_TAB: Record<string, string> = {
  WorkBuddy: 'work',
  Finance: 'finance',
  Knowledge: 'knowledge',
  'Second Brain': 'second-brain',
};

export const UniversalSearchView: React.FC<{ onNavigate: (tab: any) => void; initialQuery?: string }> = ({ onNavigate, initialQuery }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [domain, setDomain] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async (q: string, d: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.universalSearch(q, d);
      setResults(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // A search triggered from the header's global search bar arrives here as a
  // prop change, not a form submission — run it automatically.
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      runSearch(initialQuery, domain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(query, domain);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Universal Life Search Engine</h2>
        <p className="text-xs text-slate-400">Search across notes, tasks, finance, health, career, NotebookLM imports, and journals</p>
      </div>

      {/* Main Search Input */}
      <GlassCard className="p-4 border-cyan-500/30">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything (e.g. Architecture, Salary, Deadlifts, NotebookLM)..."
                className="w-full glass-input pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/25"
            >
              {loading ? 'Searching Graph...' : 'Search'}
            </button>
          </div>

          {/* Domain Filter Pills */}
          <div className="flex items-center space-x-2 pt-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Domain:</span>
            {['all', 'work', 'finance', 'knowledge', 'journal'].map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDomain(d)}
                className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all ${
                  domain === d ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </form>
      </GlassCard>

      {/* Search Results Feed */}
      <div className="space-y-3">
        {results.map((res) => (
          <GlassCard key={res.id} className="p-4 flex items-center justify-between hover:border-cyan-500/30">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10">
                  {res.domain}
                </span>
                <span className="text-xs text-slate-400">({res.type})</span>
              </div>
              <h3 className="font-bold text-white text-base">{res.title}</h3>
              <p className="text-xs text-slate-300">{res.snippet}</p>
            </div>
            <button
              onClick={() => onNavigate(DOMAIN_TO_TAB[res.domain] || 'search')}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1"
            >
              <span>View Entity</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
