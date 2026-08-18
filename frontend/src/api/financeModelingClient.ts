import { apiClient } from './client';
import { FinanceScenario, FinanceProjection } from '../types';

export const financeModelingApi = {
  listScenarios: async (): Promise<FinanceScenario[]> => {
    try {
      const res = await apiClient.get('/finance-modeling/scenarios');
      return res.data;
    } catch {
      return [];
    }
  },
  createScenario: async (scenario: Partial<FinanceScenario>) => {
    const res = await apiClient.post('/finance-modeling/scenarios', scenario);
    return res.data;
  },
  updateScenario: async (id: string, scenario: Partial<FinanceScenario>) => {
    const res = await apiClient.put(`/finance-modeling/scenarios/${id}`, scenario);
    return res.data;
  },
  deleteScenario: async (id: string) => {
    const res = await apiClient.delete(`/finance-modeling/scenarios/${id}`);
    return res.data;
  },
  project: async (id: string): Promise<FinanceProjection> => {
    const res = await apiClient.get(`/finance-modeling/scenarios/${id}/project`);
    return res.data;
  },
};
