import { apiClient } from './client';
import { StockAnalysis, StockSearchResult, StockWatchlistItem } from '../types';

export const stockAnalysisApi = {
  search: async (q: string): Promise<StockSearchResult[]> => {
    if (!q.trim()) return [];
    const res = await apiClient.get('/stock-analysis/search', { params: { q } });
    return res.data;
  },
  analyze: async (symbol: string, range: string = '6mo'): Promise<StockAnalysis> => {
    const res = await apiClient.get(`/stock-analysis/${encodeURIComponent(symbol)}`, { params: { range } });
    return res.data;
  },
  listWatchlist: async (): Promise<StockWatchlistItem[]> => {
    try {
      const res = await apiClient.get('/stock-analysis/watchlist');
      return res.data;
    } catch {
      return [];
    }
  },
  addWatchlistItem: async (symbol: string, label?: string) => {
    const res = await apiClient.post('/stock-analysis/watchlist', { symbol, label });
    return res.data;
  },
  removeWatchlistItem: async (id: string) => {
    const res = await apiClient.delete(`/stock-analysis/watchlist/${id}`);
    return res.data;
  },
};
