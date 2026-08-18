import { apiClient } from './client';
import {
  Department, JobRole, Staff, StaffAnalysis, SOPWorkflow, DepartmentPolicy,
  DepartmentCostItem, DepartmentCosting,
} from '../types';

export const departmentApi = {
  // DEPARTMENTS
  listDepartments: async (): Promise<Department[]> => {
    try {
      const res = await apiClient.get('/department/departments');
      return res.data;
    } catch {
      return [];
    }
  },
  createDepartment: async (dept: { name: string; description?: string; head_name?: string }) => {
    const res = await apiClient.post('/department/departments', dept);
    return res.data;
  },
  updateDepartment: async (id: string, dept: Partial<Department>) => {
    const res = await apiClient.put(`/department/departments/${id}`, dept);
    return res.data;
  },
  deleteDepartment: async (id: string) => {
    const res = await apiClient.delete(`/department/departments/${id}`);
    return res.data;
  },

  // JOB ROLES
  listJobRoles: async (departmentId: string): Promise<JobRole[]> => {
    try {
      const res = await apiClient.get('/department/job-roles', { params: { department_id: departmentId } });
      return res.data;
    } catch {
      return [];
    }
  },
  createJobRole: async (role: Partial<JobRole>) => {
    const res = await apiClient.post('/department/job-roles', role);
    return res.data;
  },
  updateJobRole: async (id: string, role: Partial<JobRole>) => {
    const res = await apiClient.put(`/department/job-roles/${id}`, role);
    return res.data;
  },
  deleteJobRole: async (id: string) => {
    const res = await apiClient.delete(`/department/job-roles/${id}`);
    return res.data;
  },

  // STAFF
  listStaff: async (departmentId: string): Promise<Staff[]> => {
    try {
      const res = await apiClient.get('/department/staff', { params: { department_id: departmentId } });
      return res.data;
    } catch {
      return [];
    }
  },
  createStaff: async (staff: Partial<Staff>) => {
    const res = await apiClient.post('/department/staff', staff);
    return res.data;
  },
  updateStaff: async (id: string, staff: Partial<Staff>) => {
    const res = await apiClient.put(`/department/staff/${id}`, staff);
    return res.data;
  },
  deleteStaff: async (id: string) => {
    const res = await apiClient.delete(`/department/staff/${id}`);
    return res.data;
  },
  getStaffAnalysis: async (departmentId: string): Promise<StaffAnalysis> => {
    const res = await apiClient.get('/department/staff/analysis', { params: { department_id: departmentId } });
    return res.data;
  },

  // SOPS
  listSops: async (departmentId: string): Promise<SOPWorkflow[]> => {
    try {
      const res = await apiClient.get('/department/sops', { params: { department_id: departmentId } });
      return res.data;
    } catch {
      return [];
    }
  },
  createSop: async (sop: Partial<SOPWorkflow>) => {
    const res = await apiClient.post('/department/sops', sop);
    return res.data;
  },
  updateSop: async (id: string, sop: Partial<SOPWorkflow>) => {
    const res = await apiClient.put(`/department/sops/${id}`, sop);
    return res.data;
  },
  deleteSop: async (id: string) => {
    const res = await apiClient.delete(`/department/sops/${id}`);
    return res.data;
  },

  // POLICIES
  listPolicies: async (departmentId: string): Promise<DepartmentPolicy[]> => {
    try {
      const res = await apiClient.get('/department/policies', { params: { department_id: departmentId } });
      return res.data;
    } catch {
      return [];
    }
  },
  createPolicy: async (policy: Partial<DepartmentPolicy>) => {
    const res = await apiClient.post('/department/policies', policy);
    return res.data;
  },
  updatePolicy: async (id: string, policy: Partial<DepartmentPolicy>) => {
    const res = await apiClient.put(`/department/policies/${id}`, policy);
    return res.data;
  },
  deletePolicy: async (id: string) => {
    const res = await apiClient.delete(`/department/policies/${id}`);
    return res.data;
  },

  // COSTING
  listCostItems: async (departmentId: string): Promise<DepartmentCostItem[]> => {
    try {
      const res = await apiClient.get('/department/costs', { params: { department_id: departmentId } });
      return res.data;
    } catch {
      return [];
    }
  },
  createCostItem: async (cost: Partial<DepartmentCostItem>) => {
    const res = await apiClient.post('/department/costs', cost);
    return res.data;
  },
  deleteCostItem: async (id: string) => {
    const res = await apiClient.delete(`/department/costs/${id}`);
    return res.data;
  },
  getCosting: async (departmentId: string): Promise<DepartmentCosting> => {
    const res = await apiClient.get('/department/costing', { params: { department_id: departmentId } });
    return res.data;
  },
};
