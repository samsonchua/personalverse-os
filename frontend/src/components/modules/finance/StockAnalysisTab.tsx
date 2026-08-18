import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { PriceChart } from '../../ui/PriceChart';
import {
  Search, Star, Trash2, TrendingUp, TrendingDown, Activity, Newspaper,
  BarChart3, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { stockAnalysisApi } from '../../../api/stockAnalysisClient';
import { StockAnalysis, StockSearchResult, StockWatchlistItem } from '../../../types';

const RANGES = ['1mo', '3mo', '6mo', '1y', '2y', '5y'];

const labelColor = (label: string): string => {
  if (label.includes('Strong Buy')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (label.includes('Buy')) return 'text-emerald-300 bg-emerald-500/5 border-emerald-500/20';
  if (label.includes('Strong Sell')) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  if (label.includes('Sell')) return 'text-rose-300 bg-rose-500/5 border-rose-500/20';
  return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
};

const fmtNum = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? '—' : v.toFixed(digits));
const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`);
const fmtCap = (v: number | null | undefined) => {
  if (!v) return '—';
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  return v.toFixed(0);
};

export const StockAnalysisTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [range, setRange] = useState('6mo');
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<StockWatchlistItem[]>([]);

  const loadWatchlist = () => stockAnalysisApi.listWatchlist().then(setWatchlist);
  useEffect(() => { loadWatchlist(); }, []);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await stockAnalysisApi.search(query));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const runAnalysis = async (symbol: string, r: string = range) => {
    setLoading(true);
    setError(null);
    setSearchResults([]);
    try {
      const result = await stockAnalysisApi.analyze(symbol, r);
      setAnalysis(result);
      setQuery('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Could not analyze '${symbol}'.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (r: string) => {
    setRange(r);
    if (analysis) runAnalysis(analysis.symbol, r);
  };

  const handleAddToWatchlist = async () => {
    if (!analysis) return;
    await stockAnalysisApi.addWatchlistItem(analysis.symbol, analysis.fundamentals?.company_name);
    await loadWatchlist();
  };

  const handleRemoveWatchlistItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await stockAnalysisApi.removeWatchlistItem(id);
    await loadWatchlist();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search + Watchlist */}
        <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && query.trim() && runAnalysis(query.trim().toUpperCase())}
              placeholder="Search name or ticker (e.g. Apple, AAPL)"
              className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-xs"
            />
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">...</span>}
            {!!searchResults.length && (
              <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-white/10 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => runAnalysis(r.symbol)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span className="text-white font-semibold">{r.symbol}</span>
                    <span className="text-slate-400 truncate ml-2">{r.name} · {r.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <h3 className="font-bold text-white text-sm flex items-center gap-2 pt-2">
            <Star className="w-4 h-4 text-amber-400" /> Watchlist
          </h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {watchlist.map((w) => (
              <div
                key={w.id}
                onClick={() => runAnalysis(w.symbol)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer ${
                  analysis?.symbol === w.symbol ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">{w.symbol}</p>
                  {w.label && <p className="text-[10px] text-slate-500 truncate">{w.label}</p>}
                </div>
                <button onClick={(e) => handleRemoveWatchlistItem(w.id, e)} className="text-slate-500 hover:text-rose-400 shrink-0 ml-2">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {!watchlist.length && <p className="text-xs text-slate-500 py-4 text-center">No saved tickers yet.</p>}
          </div>
        </GlassCard>

        {/* Analysis panel */}
        <div className="lg:col-span-3 space-y-4">
          {loading && (
            <GlassCard hoverEffect={false} className="text-center py-16">
              <p className="text-xs text-slate-500">Fetching live market data...</p>
            </GlassCard>
          )}
          {error && !loading && (
            <GlassCard hoverEffect={false} className="border-rose-500/30 bg-rose-500/5">
              <p className="text-xs text-rose-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>
            </GlassCard>
          )}
          {!loading && !analysis && !error && (
            <GlassCard hoverEffect={false} className="text-center py-16">
              <p className="text-xs text-slate-500">Search a stock by name or ticker to run fundamental, technical & sentiment analysis.</p>
            </GlassCard>
          )}

          {!loading && analysis && (
            <>
              {/* Header */}
              <GlassCard hoverEffect={false} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white">{analysis.symbol}</h3>
                    <span className="text-xs text-slate-400">{analysis.fundamentals?.company_name || ''}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{analysis.exchange} · {analysis.fundamentals?.sector || ''}{analysis.fundamentals?.industry ? ` — ${analysis.fundamentals.industry}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-white">{analysis.currency} {fmtNum(analysis.current_price)}</p>
                    <p className="text-[10px] text-slate-500">52w: {fmtNum(analysis.fifty_two_week_low)} – {fmtNum(analysis.fifty_two_week_high)}</p>
                  </div>
                  <button onClick={handleAddToWatchlist} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5">
                    <Star className="w-4 h-4" /> Watch
                  </button>
                </div>
              </GlassCard>

              {/* Recommendation */}
              <GlassCard hoverEffect={false} className={`space-y-3 border ${labelColor(analysis.recommendation.label)}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-xl text-sm font-extrabold border ${labelColor(analysis.recommendation.label)}`}>
                      {analysis.recommendation.label}
                    </span>
                    <span className="text-xs text-slate-400">Composite score: <span className="font-bold text-white">{analysis.recommendation.composite_score}</span> / 100</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Suggested Buy Zone</p>
                    <p className="text-emerald-400 font-bold">{analysis.recommendation.suggested_buy_zone[0]} – {analysis.recommendation.suggested_buy_zone[1]}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Suggested Sell Zone</p>
                    <p className="text-rose-400 font-bold">{analysis.recommendation.suggested_sell_zone[0]} – {analysis.recommendation.suggested_sell_zone[1]}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Suggested Stop-Loss</p>
                    <p className="text-amber-400 font-bold">{analysis.recommendation.suggested_stop_loss}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic">{analysis.recommendation.disclaimer}</p>
              </GlassCard>

              {/* Price chart */}
              <GlassCard hoverEffect={false} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Price Chart</h3>
                  <div className="flex gap-1">
                    {RANGES.map((r) => (
                      <button key={r} onClick={() => handleRangeChange(r)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${range === r ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <PriceChart candles={analysis.candles} support={analysis.technical.support} resistance={analysis.technical.resistance} />
              </GlassCard>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Technical */}
                <GlassCard hoverEffect={false} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5"><Activity className="w-4 h-4 text-cyanAccent" /> Technical</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${labelColor(analysis.technical.label)}`}>{analysis.technical.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="text-slate-400">SMA20</div><div className="text-slate-200 text-right">{fmtNum(analysis.technical.sma20)}</div>
                    <div className="text-slate-400">SMA50</div><div className="text-slate-200 text-right">{fmtNum(analysis.technical.sma50)}</div>
                    <div className="text-slate-400">SMA200</div><div className="text-slate-200 text-right">{fmtNum(analysis.technical.sma200)}</div>
                    <div className="text-slate-400">RSI(14)</div><div className="text-slate-200 text-right">{fmtNum(analysis.technical.rsi14, 0)}</div>
                    <div className="text-slate-400">MACD</div><div className="text-slate-200 text-right">{fmtNum(analysis.technical.macd?.macd)}</div>
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1 border-t border-white/5 pt-2">
                    {analysis.technical.signals.map((s, i) => <li key={i} className="flex gap-1.5">{s.includes('above') || s.includes('bullish') || s.includes('oversold') ? <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" /> : <TrendingDown className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />}{s}</li>)}
                  </ul>
                </GlassCard>

                {/* Fundamental */}
                <GlassCard hoverEffect={false} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-violetAccent" /> Fundamental</h3>
                    {analysis.fundamental_score && <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${labelColor(analysis.fundamental_score.label)}`}>{analysis.fundamental_score.label}</span>}
                  </div>
                  {analysis.fundamentals ? (
                    <>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="text-slate-400">Market Cap</div><div className="text-slate-200 text-right">{fmtCap(analysis.fundamentals.market_cap)}</div>
                        <div className="text-slate-400">P/E (TTM)</div><div className="text-slate-200 text-right">{fmtNum(analysis.fundamentals.trailing_pe)}</div>
                        <div className="text-slate-400">EPS (TTM)</div><div className="text-slate-200 text-right">{fmtNum(analysis.fundamentals.eps_trailing)}</div>
                        <div className="text-slate-400">Profit Margin</div><div className="text-slate-200 text-right">{fmtPct(analysis.fundamentals.profit_margin)}</div>
                        <div className="text-slate-400">Revenue Growth</div><div className="text-slate-200 text-right">{fmtPct(analysis.fundamentals.revenue_growth)}</div>
                        <div className="text-slate-400">Debt/Equity</div><div className="text-slate-200 text-right">{fmtNum(analysis.fundamentals.debt_to_equity, 0)}</div>
                        <div className="text-slate-400">ROE</div><div className="text-slate-200 text-right">{fmtPct(analysis.fundamentals.return_on_equity)}</div>
                      </div>
                      {analysis.fundamental_score && (
                        <ul className="text-[11px] text-slate-300 space-y-1 border-t border-white/5 pt-2">
                          {analysis.fundamental_score.signals.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500">Fundamentals unavailable for this ticker right now.</p>
                  )}
                </GlassCard>

                {/* Sentiment */}
                <GlassCard hoverEffect={false} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5"><Newspaper className="w-4 h-4 text-amberAccent" /> Sentiment</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${labelColor(analysis.sentiment.label)}`}>{analysis.sentiment.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{analysis.sentiment.signals.join(' ')} {analysis.sentiment.source === 'ai' ? '(AI analysis)' : '(keyword heuristic)'}</p>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto border-t border-white/5 pt-2">
                    {analysis.headlines.map((h, i) => (
                      <a key={i} href={h.link} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-slate-300 hover:text-cyan-300 leading-snug">
                        {h.title} <ExternalLink className="w-2.5 h-2.5 inline opacity-50" />
                      </a>
                    ))}
                    {!analysis.headlines.length && <p className="text-[11px] text-slate-500">No recent headlines found.</p>}
                  </div>
                </GlassCard>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
