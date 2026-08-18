import { apiClient } from './client';
import { SkillWithTasks, SkillMicroTask } from '../types';

export const skillsApi = {
  getSummary: async (): Promise<SkillWithTasks[]> => {
    try {
      const res = await apiClient.get('/skills/summary');
      return res.data;
    } catch {
      return [];
    }
  },
  createSkill: async (skill: { name: string; category?: string; current_level?: number; target_level?: number; target_date?: string }) => {
    const res = await apiClient.post('/skills', skill);
    return res.data;
  },
  updateSkill: async (id: string, skill: Partial<SkillWithTasks>) => {
    const res = await apiClient.put(`/skills/${id}`, skill);
    return res.data;
  },
  deleteSkill: async (id: string) => {
    const res = await apiClient.delete(`/skills/${id}`);
    return res.data;
  },
  createTask: async (skillId: string, title: string) => {
    const res = await apiClient.post('/skills/tasks', { skill_id: skillId, title });
    return res.data;
  },
  updateTask: async (id: string, task: Partial<SkillMicroTask>) => {
    const res = await apiClient.put(`/skills/tasks/${id}`, task);
    return res.data;
  },
  deleteTask: async (id: string) => {
    const res = await apiClient.delete(`/skills/tasks/${id}`);
    return res.data;
  },
  scheduleTask: async (id: string, block_date: string, start_time: string, end_time: string) => {
    const res = await apiClient.post(`/skills/tasks/${id}/schedule`, { block_date, start_time, end_time });
    return res.data;
  },
};
