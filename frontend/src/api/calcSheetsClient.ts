import { apiClient } from './client';
import { CalcSheet } from '../types';

export const calcSheetsApi = {
  list: async (): Promise<CalcSheet[]> => {
    try {
      const res = await apiClient.get('/calc-sheets');
      return res.data;
    } catch {
      return [];
    }
  },
  create: async (title: string, grid_json: string[][]) => {
    const res = await apiClient.post('/calc-sheets', { title, grid_json });
    return res.data;
  },
  update: async (id: string, sheet: Partial<CalcSheet>) => {
    const res = await apiClient.put(`/calc-sheets/${id}`, sheet);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete(`/calc-sheets/${id}`);
    return res.data;
  },
};
