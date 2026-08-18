import { apiClient } from './client';
import { StartupPlaybook } from '../types';

export const startupPlaybooksApi = {
  list: async (): Promise<StartupPlaybook[]> => {
    try {
      const res = await apiClient.get('/startup-playbooks');
      return res.data;
    } catch {
      return [];
    }
  },
  generate: async (name: string): Promise<StartupPlaybook> => {
    const res = await apiClient.post('/startup-playbooks/generate', { name });
    return res.data;
  },
  create: async (playbook: Partial<StartupPlaybook>) => {
    const res = await apiClient.post('/startup-playbooks', playbook);
    return res.data;
  },
  update: async (id: string, playbook: Partial<StartupPlaybook>) => {
    const res = await apiClient.put(`/startup-playbooks/${id}`, playbook);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete(`/startup-playbooks/${id}`);
    return res.data;
  },
};
