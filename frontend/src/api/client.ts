import axios from 'axios';
import {
  DashboardSummary, FinanceAccount, FinanceTransaction, FinancialGoal,
  WorkProject, WorkTask, WorkMeeting, KnowledgeItem, Habit, TimeBlock,
  HealthMetric, WorkoutLog, CareerSkill, CareerMilestone, JournalEntry,
  SearchResult, User, Document, Budget, FinanceReports,
  BalanceSheet, BalanceSheetItem, BalanceSheetCategory, TransactionCategory, InsurancePolicy,
  NcdForecastPoint, Loan, LoanScheduleRow, Investment, InvestmentSummary, InvestmentRefreshResult,
  EPFProfile, EPFForecast, TaxReliefItem, TaxCalculation, FormBEstimate, CashflowForecast,
  IncomeStatement, ForecastedIncomeStatement, IncomeStatementGrid, StatementGranularity,
  MandalaBoard, MandalaCell,
} from '../types';

const API_BASE = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the bearer token to every request once a session exists.
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// A 401 means the session is invalid/expired anywhere in the app — force a
// logout so the user is returned to the login screen instead of silently
// falling back to mock data.
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      window.dispatchEvent(new Event('personalverse:unauthorized'));
    }
    return Promise.reject(err);
  }
);

// AUTH — no mock fallback: auth failures must surface to the caller so the
// login screen can show a real error instead of pretending to succeed.
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data as { access_token: string; token_type: string; user: User };
  },
  register: async (email: string, password: string, full_name: string) => {
    const res = await apiClient.post('/auth/register', { email, password, full_name });
    return res.data as { access_token: string; token_type: string; user: User };
  },
  me: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};

export const api = {
  // DASHBOARD
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    try {
      const res = await apiClient.get('/dashboard/summary');
      return res.data;
    } catch {
      return {
        net_worth: 187250,
        account_count: 4,
        pending_task_count: 3,
        active_project_count: 2,
        habit_count: 3,
        health_today: { weight_kg: 72.5, sleep_hours: 7.8, calories_consumed: 2450, mood: 'Energized' },
        recent_tasks: [
          { id: 't1', title: 'Implement Glassmorphism React Theme', priority: 'High', due_date: '2026-08-04', status: 'Completed' },
          { id: 't2', title: 'Build Universal Life Graph Backend', priority: 'Critical', due_date: '2026-08-05', status: 'In Progress' }
        ],
        active_projects: [
          { id: 'p1', title: 'PersonalVerse OS V1', progress_pct: 75, priority: 'Critical' },
          { id: 'p2', title: 'Autonomous Multi-Agent Swarm', progress_pct: 30, priority: 'High' }
        ],
        recent_journals: [
          { id: 'j1', title: 'Operating System for Life Principles', entry_type: 'decision_log', created_at: '2026-08-04T12:00:00Z' }
        ]
      };
    }
  },

  // FINANCE
  createFinanceAccount: async (account: Partial<FinanceAccount>) => {
    const res = await apiClient.post('/finance/accounts', account);
    return res.data;
  },

  createFinanceTransaction: async (tx: Partial<FinanceTransaction>) => {
    const res = await apiClient.post('/finance/transactions', tx);
    return res.data;
  },

  createFinancialGoal: async (goal: Partial<FinancialGoal>) => {
    const res = await apiClient.post('/finance/goals', goal);
    return res.data;
  },
  updateFinancialGoal: async (id: string, goal: Partial<FinancialGoal>) => {
    const res = await apiClient.put(`/finance/goals/${id}`, goal);
    return res.data;
  },
  deleteFinancialGoal: async (id: string) => {
    const res = await apiClient.delete(`/finance/goals/${id}`);
    return res.data;
  },

  updateFinanceAccount: async (id: string, account: Partial<FinanceAccount>) => {
    const res = await apiClient.put(`/finance/accounts/${id}`, account);
    return res.data;
  },

  deleteFinanceAccount: async (id: string) => {
    const res = await apiClient.delete(`/finance/accounts/${id}`);
    return res.data;
  },

  updateFinanceTransaction: async (id: string, tx: Partial<FinanceTransaction>) => {
    const res = await apiClient.put(`/finance/transactions/${id}`, tx);
    return res.data;
  },

  deleteFinanceTransaction: async (id: string) => {
    const res = await apiClient.delete(`/finance/transactions/${id}`);
    return res.data;
  },

  getFinanceTransactions: async (filters: {
    account_id?: string; client_id?: string; category?: string; transaction_type?: string;
    start_date?: string; end_date?: string; limit?: number; offset?: number;
  } = {}): Promise<{ items: FinanceTransaction[]; total: number }> => {
    try {
      const res = await apiClient.get('/finance/transactions', { params: filters });
      return res.data;
    } catch {
      return { items: [], total: 0 };
    }
  },

  getBudgets: async (period: string): Promise<Budget[]> => {
    try {
      const res = await apiClient.get('/finance/budgets', { params: { period } });
      return res.data;
    } catch {
      return [];
    }
  },

  upsertBudget: async (budget: { category: string; monthly_limit: number; period: string }) => {
    const res = await apiClient.post('/finance/budgets', budget);
    return res.data;
  },

  deleteBudget: async (id: string) => {
    const res = await apiClient.delete(`/finance/budgets/${id}`);
    return res.data;
  },

  getFinanceReports: async (months: number = 6): Promise<FinanceReports> => {
    try {
      const res = await apiClient.get('/finance/reports', { params: { months } });
      return res.data;
    } catch {
      return { monthly_trend: [], current_month_expense_by_category: {} };
    }
  },

  getIncomeStatement: async (period: string, hoursWorked?: number): Promise<IncomeStatement> => {
    const res = await apiClient.get('/finance/income-statement', { params: { period, hours_worked: hoursWorked } });
    return res.data;
  },

  getCashflowForecast: async (granularity: string, periods?: number, includeStandbyCash?: boolean): Promise<CashflowForecast> => {
    const res = await apiClient.get('/finance/cashflow-forecast', { params: { granularity, periods, include_standby_cash: includeStandbyCash } });
    return res.data;
  },

  getForecastedIncomeStatement: async (granularity: string = 'monthly', lookbackDays: number = 90): Promise<ForecastedIncomeStatement> => {
    const res = await apiClient.get('/finance/forecasted-income-statement', { params: { granularity, lookback_days: lookbackDays } });
    return res.data;
  },

  getAnnualForecastedIncomeStatement: async (year: number, granularity: StatementGranularity = 'monthly'): Promise<IncomeStatementGrid> => {
    const res = await apiClient.get('/finance/forecasted-income-statement/annual', { params: { year, granularity } });
    return res.data;
  },
  getIncomeStatementGrid: async (year: number, granularity: StatementGranularity = 'monthly'): Promise<IncomeStatementGrid> => {
    const res = await apiClient.get('/finance/income-statement/grid', { params: { year, granularity } });
    return res.data;
  },
  upsertAnnualForecastCell: async (cell: { year: number; month: number; line_type: 'income' | 'expense'; category: string; amount: number }) => {
    const res = await apiClient.put('/finance/forecasted-income-statement/annual/cell', cell);
    return res.data;
  },
  resetAnnualForecastCell: async (params: { year: number; month: number; line_type: 'income' | 'expense'; category: string }) => {
    const res = await apiClient.delete('/finance/forecasted-income-statement/annual/cell', { params });
    return res.data;
  },

  // BALANCE SHEET
  getBalanceSheet: async (compareTo?: string): Promise<BalanceSheet> => {
    const res = await apiClient.get('/finance/balance-sheet', { params: { compare_to: compareTo } });
    return res.data;
  },
  createBalanceSheetItem: async (item: {
    category: BalanceSheetCategory; name: string; value: number; parent_id?: string; subcategory?: string;
    instalment_amount?: number; min_payment?: number; nominee?: string; notes?: string;
  }) => {
    const res = await apiClient.post('/finance/balance-sheet/items', item);
    return res.data;
  },
  updateBalanceSheetItem: async (id: string, item: Partial<BalanceSheetItem>) => {
    const res = await apiClient.put(`/finance/balance-sheet/items/${id}`, item);
    return res.data;
  },
  deleteBalanceSheetItem: async (id: string) => {
    const res = await apiClient.delete(`/finance/balance-sheet/items/${id}`);
    return res.data;
  },
  linkBalanceSheetItemAccount: async (
    id: string,
    body: { account_id: string } | { create_account: { name: string; account_type: string; icon?: string } }
  ) => {
    const res = await apiClient.post(`/finance/balance-sheet/items/${id}/link-account`, body);
    return res.data;
  },
  unlinkBalanceSheetItemAccount: async (id: string) => {
    const res = await apiClient.post(`/finance/balance-sheet/items/${id}/unlink-account`);
    return res.data;
  },
  // TRANSACTION CATEGORIES
  getTransactionCategories: async (categoryType?: 'income' | 'expense'): Promise<TransactionCategory[]> => {
    try {
      const res = await apiClient.get('/finance/categories', { params: { category_type: categoryType } });
      return res.data;
    } catch {
      return [];
    }
  },
  createTransactionCategory: async (category: {
    name: string; category_type: 'income' | 'expense'; sort_order?: number;
    classification?: string; parent_category_id?: string; is_deduction?: boolean; is_credit_card?: boolean;
  }) => {
    const res = await apiClient.post('/finance/categories', category);
    return res.data;
  },
  updateTransactionCategory: async (id: string, category: Partial<Omit<TransactionCategory, 'classification'>> & { classification?: string }) => {
    const res = await apiClient.put(`/finance/categories/${id}`, category);
    return res.data;
  },
  deleteTransactionCategory: async (id: string) => {
    const res = await apiClient.delete(`/finance/categories/${id}`);
    return res.data;
  },
  getCategoryUsage: async (id: string): Promise<{ transaction_count: number; total_amount: number }> => {
    const res = await apiClient.get(`/finance/categories/${id}/usage`);
    return res.data;
  },

  // INSURANCE
  getInsurancePolicies: async (): Promise<InsurancePolicy[]> => {
    try {
      const res = await apiClient.get('/finance/insurance');
      return res.data;
    } catch {
      return [];
    }
  },
  createInsurancePolicy: async (policy: Partial<InsurancePolicy>) => {
    const res = await apiClient.post('/finance/insurance', policy);
    return res.data;
  },
  updateInsurancePolicy: async (id: string, policy: Partial<InsurancePolicy>) => {
    const res = await apiClient.put(`/finance/insurance/${id}`, policy);
    return res.data;
  },
  deleteInsurancePolicy: async (id: string) => {
    const res = await apiClient.delete(`/finance/insurance/${id}`);
    return res.data;
  },
  getNcdForecast: async (policyId: string, years: number = 5): Promise<{ policy_id: string; current_ncd_percent: number; forecast: NcdForecastPoint[] }> => {
    const res = await apiClient.get(`/finance/insurance/${policyId}/ncd-forecast`, { params: { years } });
    return res.data;
  },

  // LOANS / INSTALMENTS
  getLoans: async (): Promise<Loan[]> => {
    try {
      const res = await apiClient.get('/finance/loans');
      return res.data;
    } catch {
      return [];
    }
  },
  createLoan: async (loan: Partial<Loan>) => {
    const res = await apiClient.post('/finance/loans', loan);
    return res.data;
  },
  deleteLoan: async (id: string) => {
    const res = await apiClient.delete(`/finance/loans/${id}`);
    return res.data;
  },
  getLoanSchedule: async (id: string): Promise<{ monthly_payment: number; total_interest: number; total_paid: number; payoff_date: string; schedule: LoanScheduleRow[] }> => {
    const res = await apiClient.get(`/finance/loans/${id}/schedule`);
    return res.data;
  },
  logLoanPayment: async (id: string, payment: { account_id: string; amount?: number; date: string; notes?: string }) => {
    const res = await apiClient.post(`/finance/loans/${id}/log-payment`, payment);
    return res.data;
  },

  // INVESTMENTS
  getInvestments: async (): Promise<Investment[]> => {
    try {
      const res = await apiClient.get('/finance/investments');
      return res.data;
    } catch {
      return [];
    }
  },
  getInvestmentSummary: async (): Promise<InvestmentSummary> => {
    const res = await apiClient.get('/finance/investments/summary');
    return res.data;
  },
  createInvestment: async (inv: Partial<Investment>) => {
    const res = await apiClient.post('/finance/investments', inv);
    return res.data;
  },
  updateInvestment: async (id: string, inv: Partial<Investment>) => {
    const res = await apiClient.put(`/finance/investments/${id}`, inv);
    return res.data;
  },
  deleteInvestment: async (id: string) => {
    const res = await apiClient.delete(`/finance/investments/${id}`);
    return res.data;
  },
  refreshInvestment: async (id: string): Promise<Investment> => {
    const res = await apiClient.post(`/finance/investments/${id}/refresh`);
    return res.data;
  },
  refreshAllInvestments: async (): Promise<{ results: InvestmentRefreshResult[]; refreshed: number }> => {
    const res = await apiClient.post('/finance/investments/refresh-all');
    return res.data;
  },

  // EPF / RETIREMENT
  getEpfProfile: async (): Promise<EPFProfile | null> => {
    try {
      const res = await apiClient.get('/finance/epf');
      return res.data;
    } catch {
      return null;
    }
  },
  upsertEpfProfile: async (profile: Partial<EPFProfile>) => {
    const res = await apiClient.post('/finance/epf', profile);
    return res.data;
  },
  getEpfForecast: async (): Promise<EPFForecast> => {
    const res = await apiClient.get('/finance/epf/forecast');
    return res.data;
  },

  // INCOME TAX PLANNING
  getSuggestedReliefs: async (): Promise<Array<{ name: string; typical_amount: number }>> => {
    try {
      const res = await apiClient.get('/finance/tax/suggested-reliefs');
      return res.data;
    } catch {
      return [];
    }
  },
  calculateTax: async (annualIncome: number, reliefs: TaxReliefItem[]): Promise<TaxCalculation> => {
    const res = await apiClient.post('/finance/tax/calculate', { annual_income: annualIncome, reliefs });
    return res.data;
  },
  getFormBEstimate: async (year: number, reliefs: TaxReliefItem[]): Promise<FormBEstimate> => {
    const res = await apiClient.post('/finance/tax/form-b-estimate', { year, reliefs });
    return res.data;
  },

  getFinanceSummary: async () => {
    try {
      const res = await apiClient.get('/finance/summary');
      return res.data;
    } catch {
      return {
        total_cash_balance: 60050,
        total_credit_balance: 0,
        monthly_income: 11000,
        monthly_expense: 1970,
        cash_flow: 9030,
        accounts: [
          { id: 'a1', name: 'Main Checking Account', account_type: 'bank', balance: 14850, currency: 'USD', institution: 'Chase' },
          { id: 'a2', name: 'High Yield Savings (4.5% APY)', account_type: 'bank', balance: 45200, currency: 'USD', institution: 'Wealthfront' },
          { id: 'a3', name: 'Vanguard Index ETF Portfolio', account_type: 'investment', balance: 128500, currency: 'USD', institution: 'Vanguard' }
        ],
        recent_transactions: [
          { id: 'tx1', account_id: 'a1', transaction_type: 'income', amount: 9500, category: 'Salary', merchant: 'Tech Corp', date: '2026-08-01', is_recurring: true },
          { id: 'tx2', account_id: 'a1', transaction_type: 'expense', amount: 1850, category: 'Housing', merchant: 'Luxury Apartments', date: '2026-08-02', is_recurring: true }
        ],
        goals: [
          { id: 'fg1', title: 'AI Ventures Startup Reserve', target_amount: 100000, current_amount: 45000, category: 'Startup' }
        ]
      };
    }
  },

  // WORKBUDDY
  getWorkSummary: async () => {
    try {
      const res = await apiClient.get('/work/summary');
      return res.data;
    } catch {
      return {
        projects: [
          { id: 'p1', title: 'PersonalVerse OS V1', description: 'Building AI Personal Operating System', status: 'In Progress', priority: 'Critical', progress_pct: 75 },
          { id: 'p2', title: 'Autonomous Multi-Agent Swarm', description: 'Agentic AI framework', status: 'Planning', priority: 'High', progress_pct: 30 }
        ],
        tasks: [
          { id: 't1', project_id: 'p1', title: 'Implement Glassmorphism React Theme', status: 'Completed', priority: 'High', estimated_hours: 4, logged_hours: 4 },
          { id: 't2', project_id: 'p1', title: 'Build Universal Life Graph Backend', status: 'In Progress', priority: 'Critical', estimated_hours: 6, logged_hours: 3.5 }
        ],
        meetings: [
          { id: 'm1', title: 'Architecture Sync & UI Review', meeting_date: '2026-08-04', duration_min: 45, summary: 'Approved Glassmorphic dark aesthetic and single-graph unified schema design.', action_items_json: ['Deploy backend API', 'Connect universal search'] }
        ]
      };
    }
  },

  createWorkTask: async (taskData: Partial<WorkTask>) => {
    const res = await apiClient.post('/work/tasks', taskData);
    return res.data;
  },

  createWorkProject: async (projectData: Partial<WorkProject>) => {
    const res = await apiClient.post('/work/projects', projectData);
    return res.data;
  },

  createWorkMeeting: async (meetingData: Partial<WorkMeeting>) => {
    const res = await apiClient.post('/work/meetings', meetingData);
    return res.data;
  },

  // KNOWLEDGE
  getKnowledgeItems: async (): Promise<KnowledgeItem[]> => {
    try {
      const res = await apiClient.get('/knowledge/items');
      return res.data;
    } catch {
      return [
        { id: 'k1', title: 'Designing Data-Intensive Applications', item_type: 'book', author: 'Martin Kleppmann', summary: 'Essential blueprint for scalable distributed systems.', rating: 5, tags: 'System Architecture, Databases' },
        { id: 'k2', title: 'NotebookLM: AI Agent Memory Synthesis', item_type: 'notebooklm', author: 'AI Research Lab', summary: 'Framework for synthesizing unstructured documents into structured graph nodes.', rating: 5, tags: 'NotebookLM, AI, Second Brain' }
      ];
    }
  },

  importNotebookLM: async (req: { title: string; raw_markdown: string; tags: string }) => {
    const res = await apiClient.post('/knowledge/notebooklm/import', req);
    return res.data;
  },

  createKnowledgeItem: async (item: Partial<KnowledgeItem>) => {
    const res = await apiClient.post('/knowledge/items', item);
    return res.data;
  },

  // PRODUCTIVITY
  createHabit: async (habit: Partial<Habit>) => {
    const res = await apiClient.post('/productivity/habits', habit);
    return res.data;
  },

  logHabit: async (habit_id: string, log_date: string) => {
    const res = await apiClient.post('/productivity/habits/log', { habit_id, log_date, status: true });
    return res.data;
  },

  getProductivitySummary: async (): Promise<{ habits: Habit[]; time_blocks: TimeBlock[] }> => {
    try {
      const res = await apiClient.get('/productivity/summary');
      return res.data;
    } catch {
      return {
        habits: [
          { id: 'h1', title: '90-Minute Morning Deep Work Block', category: 'Work', frequency: 'Daily', target_streak: 30, current_streak: 14 },
          { id: 'h2', title: '500ml Hydration & Supplement Protocol', category: 'Health', frequency: 'Daily', target_streak: 30, current_streak: 21 },
          { id: 'h3', title: 'Evening Second Brain Reflection', category: 'Mindset', frequency: 'Daily', target_streak: 30, current_streak: 9 }
        ],
        time_blocks: []
      };
    }
  },

  createTimeBlock: async (block: { title: string; block_date: string; start_time: string; end_time: string; task_id?: string }) => {
    const res = await apiClient.post('/productivity/time-blocks', block);
    return res.data;
  },

  updateTimeBlock: async (id: string, block: Partial<TimeBlock>) => {
    const res = await apiClient.put(`/productivity/time-blocks/${id}`, block);
    return res.data;
  },

  deleteTimeBlock: async (id: string) => {
    const res = await apiClient.delete(`/productivity/time-blocks/${id}`);
    return res.data;
  },

  autoGeneratePlan: async (blockDate: string): Promise<TimeBlock[]> => {
    const res = await apiClient.post('/productivity/auto-generate', null, { params: { block_date: blockDate } });
    return res.data;
  },

  // HEALTH
  logHealthMetric: async (metric: Partial<HealthMetric>) => {
    const res = await apiClient.post('/health/metrics', metric);
    return res.data;
  },

  updateHealthMetric: async (id: string, metric: Partial<HealthMetric>) => {
    const res = await apiClient.put(`/health/metrics/${id}`, metric);
    return res.data;
  },

  deleteHealthMetric: async (id: string) => {
    const res = await apiClient.delete(`/health/metrics/${id}`);
    return res.data;
  },

  bulkImportHealthMetrics: async (rows: Partial<HealthMetric>[]): Promise<{ created: number; updated: number; total: number }> => {
    const res = await apiClient.post('/health/metrics/bulk-import', { rows });
    return res.data;
  },

  logWorkout: async (workout: Partial<WorkoutLog>) => {
    const res = await apiClient.post('/health/workouts', workout);
    return res.data;
  },

  updateWorkout: async (id: string, workout: Partial<WorkoutLog>) => {
    const res = await apiClient.put(`/health/workouts/${id}`, workout);
    return res.data;
  },

  deleteWorkout: async (id: string) => {
    const res = await apiClient.delete(`/health/workouts/${id}`);
    return res.data;
  },

  getHealthSummary: async () => {
    try {
      const res = await apiClient.get('/health/summary');
      return res.data;
    } catch {
      return {
        metrics_history: [
          { id: 'hm1', log_date: '2026-08-04', weight_kg: 72.5, body_fat_pct: 13.5, calories_consumed: 2450, sleep_hours: 7.8, mood: 'Energized' }
        ],
        workouts_history: [
          { id: 'w1', log_date: '2026-08-04', exercise_name: 'Barbell Deadlifts & Core', category: 'Strength', sets: 4, reps: 8, weight_kg: 140, duration_min: 45, calories_burned: 380 }
        ],
        latest_metric: { id: 'hm1', log_date: '2026-08-04', weight_kg: 72.5, body_fat_pct: 13.5, calories_consumed: 2450, sleep_hours: 7.8, mood: 'Energized' }
      };
    }
  },

  // CAREER
  createCareerSkill: async (skill: Partial<CareerSkill>) => {
    const res = await apiClient.post('/career/skills', skill);
    return res.data;
  },

  createCareerMilestone: async (milestone: Partial<CareerMilestone>) => {
    const res = await apiClient.post('/career/milestones', milestone);
    return res.data;
  },

  getCareerSummary: async () => {
    try {
      const res = await apiClient.get('/career/summary');
      return res.data;
    } catch {
      return {
        skills: [
          { id: 'cs1', name: 'AI Autonomous Systems Architecture', category: 'AI Engineering', current_level: 9, target_level: 10 },
          { id: 'cs2', name: 'FastAPI & Scalable Backend Systems', category: 'Software Engineering', current_level: 9, target_level: 10 }
        ],
        milestones: [
          { id: 'cm1', title: 'Promoted to Lead AI Software Architect', milestone_date: '2026-01-15', salary_delta: 35000, promotion_stage: 'Principal Architect' }
        ]
      };
    }
  },

  // SECOND BRAIN
  getJournalEntries: async (): Promise<JournalEntry[]> => {
    try {
      const res = await apiClient.get('/second-brain/entries');
      return res.data;
    } catch {
      return [
        { id: 'j1', title: 'Operating System for Life Principles', entry_type: 'decision_log', content: 'Decided to build PersonalVerse as a single unified Life Graph rather than disconnected apps.', mood: 'Inspired', tags: 'Architecture, Second Brain', created_at: '2026-08-04T12:00:00Z' },
        { id: 'j2', title: 'Daily Evening Reflection', entry_type: 'journal', content: 'High productivity today. Spent 4 hours building PersonalVerse core components.', mood: 'Calm', tags: 'Reflection', created_at: '2026-08-04T20:00:00Z' }
      ];
    }
  },

  createJournalEntry: async (entry: Partial<JournalEntry>) => {
    const res = await apiClient.post('/second-brain/entries', entry);
    return res.data;
  },

  // AI & CHAT
  getAIProviderStatus: async (): Promise<{ provider: string; configured: boolean }> => {
    try {
      const res = await apiClient.get('/ai/provider-status');
      return res.data;
    } catch {
      return { provider: 'synthetic', configured: false };
    }
  },

  sendAIChat: async (agent_id: string, prompt: string) => {
    try {
      const res = await apiClient.post('/ai/chat', { agent_id, prompt });
      return res.data;
    } catch {
      return {
        agent_id,
        agent_name: agent_id.replace('_', ' ').toUpperCase(),
        avatar: '🤖',
        response: `AI Agent (${agent_id}) Response: Analyzed your request "${prompt}". Everything across your Life Graph is aligned for optimal execution.`,
        status: 'success'
      };
    }
  },

  // UNIVERSAL SEARCH
  universalSearch: async (q: string, domain: string = 'all'): Promise<SearchResult[]> => {
    try {
      const res = await apiClient.get(`/search/universal?q=${encodeURIComponent(q)}&domain=${domain}`);
      return res.data;
    } catch {
      return [
        { id: 's1', title: `Task: Build ${q}`, type: 'Task', domain: 'WorkBuddy', snippet: 'Priority: High', url: '/work' },
        { id: 's2', title: `Journal Note on ${q}`, type: 'Journal', domain: 'Second Brain', snippet: 'Connected entity concept...', url: '/second-brain' }
      ];
    }
  },

  // DOCUMENTS
  listDocuments: async (entityType?: string, entityId?: string): Promise<Document[]> => {
    try {
      const res = await apiClient.get('/documents', { params: { entity_type: entityType, entity_id: entityId } });
      return res.data;
    } catch {
      return [];
    }
  },

  uploadDocument: async (
    file: File,
    meta: { description?: string; tags?: string; entityType?: string; entityId?: string }
  ): Promise<Document> => {
    const form = new FormData();
    form.append('file', file);
    if (meta.description) form.append('description', meta.description);
    if (meta.tags) form.append('tags', meta.tags);
    if (meta.entityType) form.append('entity_type', meta.entityType);
    if (meta.entityId) form.append('entity_id', meta.entityId);
    const res = await apiClient.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Downloads require the Authorization header, so a plain <a href> won't work —
  // fetch as a blob (auth header attached by the interceptor) and trigger the
  // browser's save dialog via a temporary object URL.
  downloadDocument: async (id: string, filename: string) => {
    const res = await apiClient.get(`/documents/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Same auth-header constraint as download — fetch as a blob, then open it in a new tab so
  // browser-renderable types (PDF, images, text) preview instead of forcing a download.
  viewDocument: async (id: string, contentType?: string) => {
    const res = await apiClient.get(`/documents/${id}/view`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }));
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  },

  deleteDocument: async (id: string) => {
    const res = await apiClient.delete(`/documents/${id}`);
    return res.data;
  },

  // ANALYTICS
  getLifeMetrics: async (): Promise<{
    task_completion_rate: number;
    total_tasks: number;
    completed_tasks: number;
    total_knowledge_items: number;
    expense_by_category: Record<string, number>;
    health_trend: Array<{ date: string; weight?: number; sleep?: number; calories?: number }>;
  }> => {
    try {
      const res = await apiClient.get('/analytics/life-metrics');
      return res.data;
    } catch {
      return {
        task_completion_rate: 0,
        total_tasks: 0,
        completed_tasks: 0,
        total_knowledge_items: 0,
        expense_by_category: {},
        health_trend: [],
      };
    }
  },

  // LIFE PLANNING (Mandala Chart)
  getMandalaRoot: async (): Promise<MandalaBoard> => {
    const res = await apiClient.get('/life-planning/root');
    return res.data;
  },
  getMandalaBoard: async (boardId: string): Promise<MandalaBoard> => {
    const res = await apiClient.get(`/life-planning/boards/${boardId}`);
    return res.data;
  },
  updateMandalaCell: async (cellId: string, cell: Partial<Pick<MandalaCell, 'title' | 'notes' | 'is_completed'>>): Promise<MandalaCell> => {
    const res = await apiClient.put(`/life-planning/cells/${cellId}`, cell);
    return res.data;
  },
  expandMandalaCell: async (cellId: string): Promise<MandalaBoard> => {
    const res = await apiClient.post(`/life-planning/cells/${cellId}/expand`);
    return res.data;
  },
};
