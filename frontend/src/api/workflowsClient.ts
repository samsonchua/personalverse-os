import { apiClient } from './client';
import { WorkflowDiagram } from '../types';

export const workflowsApi = {
  list: async (entityType?: string, entityId?: string): Promise<WorkflowDiagram[]> => {
    try {
      const res = await apiClient.get('/workflows', { params: { entity_type: entityType, entity_id: entityId } });
      return res.data;
    } catch {
      return [];
    }
  },
  create: async (wf: { title: string; description?: string; diagram_type?: string; mermaid_source: string; entity_type?: string; entity_id?: string }) => {
    const res = await apiClient.post('/workflows', wf);
    return res.data;
  },
  update: async (id: string, wf: Partial<WorkflowDiagram>) => {
    const res = await apiClient.put(`/workflows/${id}`, wf);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete(`/workflows/${id}`);
    return res.data;
  },
};
