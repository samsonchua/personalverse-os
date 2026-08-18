import { apiClient } from './client';
import { ClientSummary, ClientDetail, ClientService, ClientMeeting } from '../types';

export const clientsApi = {
  listSummary: async (): Promise<ClientSummary[]> => {
    try {
      const res = await apiClient.get('/clients/summary');
      return res.data;
    } catch {
      return [];
    }
  },
  getDetail: async (id: string): Promise<ClientDetail> => {
    const res = await apiClient.get(`/clients/${id}`);
    return res.data;
  },
  create: async (client: { name: string; business_nature?: string; status?: string; contact_person?: string; contact_email?: string; contact_phone?: string; address?: string; notes?: string }) => {
    const res = await apiClient.post('/clients', client);
    return res.data;
  },
  update: async (id: string, client: Partial<ClientDetail>) => {
    const res = await apiClient.put(`/clients/${id}`, client);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete(`/clients/${id}`);
    return res.data;
  },

  createService: async (service: { client_id: string; service_name: string; scope_details?: string; fee_amount?: number; fee_frequency?: string; status?: string; start_date?: string; end_date?: string }) => {
    const res = await apiClient.post('/clients/services', service);
    return res.data;
  },
  updateService: async (id: string, service: Partial<ClientService>) => {
    const res = await apiClient.put(`/clients/services/${id}`, service);
    return res.data;
  },
  removeService: async (id: string) => {
    const res = await apiClient.delete(`/clients/services/${id}`);
    return res.data;
  },

  createMeeting: async (meeting: { client_id: string; title: string; meeting_date: string; duration_min?: number; attendees?: string; summary?: string; action_items_json?: string[] }) => {
    const res = await apiClient.post('/clients/meetings', meeting);
    return res.data;
  },
  updateMeeting: async (id: string, meeting: Partial<ClientMeeting>) => {
    const res = await apiClient.put(`/clients/meetings/${id}`, meeting);
    return res.data;
  },
  removeMeeting: async (id: string) => {
    const res = await apiClient.delete(`/clients/meetings/${id}`);
    return res.data;
  },
};
