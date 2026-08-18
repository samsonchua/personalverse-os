import { apiClient } from './client';
import { CourseSummary, CourseDetail, QuizAttemptResult } from '../types';

export const coursesApi = {
  list: async (): Promise<CourseSummary[]> => {
    try {
      const res = await apiClient.get('/courses');
      return res.data;
    } catch {
      return [];
    }
  },
  generate: async (industry: string): Promise<CourseDetail> => {
    const res = await apiClient.post('/courses/generate', { industry });
    return res.data;
  },
  getDetail: async (id: string): Promise<CourseDetail> => {
    const res = await apiClient.get(`/courses/${id}`);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete(`/courses/${id}`);
    return res.data;
  },
  completeLesson: async (lessonId: string) => {
    const res = await apiClient.post(`/courses/lessons/${lessonId}/complete`);
    return res.data;
  },
  attemptQuiz: async (lessonId: string, answers: number[]): Promise<QuizAttemptResult> => {
    const res = await apiClient.post(`/courses/lessons/${lessonId}/quiz-attempt`, { answers });
    return res.data;
  },
};
