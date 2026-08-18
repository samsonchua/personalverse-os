import { apiClient } from './client';
import { WebArticle } from '../types';

export const webReaderApi = {
  list: async (): Promise<WebArticle[]> => {
    try {
      const res = await apiClient.get('/web-reader/articles');
      return res.data;
    } catch {
      return [];
    }
  },
  fetchUrl: async (url: string): Promise<WebArticle> => {
    const res = await apiClient.post('/web-reader/fetch', { url });
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete(`/web-reader/articles/${id}`);
    return res.data;
  },
};
