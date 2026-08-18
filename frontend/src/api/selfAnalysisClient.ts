import { apiClient } from './client';
import { SelfAnalysisCategory, SelfAnalysisCriterion } from '../types';

export const selfAnalysisApi = {
  getSummary: async (): Promise<SelfAnalysisCategory[]> => {
    try {
      const res = await apiClient.get('/self-analysis/summary');
      return res.data;
    } catch {
      return [];
    }
  },
  createCategory: async (cat: { name: string; description?: string; color?: string; sort_order?: number }) => {
    const res = await apiClient.post('/self-analysis/categories', cat);
    return res.data;
  },
  updateCategory: async (id: string, cat: Partial<SelfAnalysisCategory>) => {
    const res = await apiClient.put(`/self-analysis/categories/${id}`, cat);
    return res.data;
  },
  deleteCategory: async (id: string) => {
    const res = await apiClient.delete(`/self-analysis/categories/${id}`);
    return res.data;
  },
  createCriterion: async (crit: { category_id: string; name: string; rating?: number; max_rating?: number; notes?: string }) => {
    const res = await apiClient.post('/self-analysis/criteria', crit);
    return res.data;
  },
  updateCriterion: async (id: string, crit: Partial<SelfAnalysisCriterion>) => {
    const res = await apiClient.put(`/self-analysis/criteria/${id}`, crit);
    return res.data;
  },
  deleteCriterion: async (id: string) => {
    const res = await apiClient.delete(`/self-analysis/criteria/${id}`);
    return res.data;
  },
};
