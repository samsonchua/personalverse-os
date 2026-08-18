export type NavigationTab =
  | 'dashboard'
  | 'finance'
  | 'work'
  | 'clients'
  | 'department'
  | 'knowledge'
  | 'documents'
  | 'productivity'
  | 'self-analysis'
  | 'skills'
  | 'health'
  | 'career'
  | 'second-brain'
  | 'ai-agents'
  | 'workflows'
  | 'web-reader'
  | 'courses'
  | 'startup-playbook'
  | 'life-planning'
  | 'search'
  | 'analytics'
  | 'settings';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface DashboardSummary {
  net_worth: number;
  account_count: number;
  pending_task_count: number;
  active_project_count: number;
  habit_count: number;
  health_today: {
    weight_kg: number;
    sleep_hours: number;
    calories_consumed: number;
    mood: string;
  };
  recent_tasks: Array<{
    id: string;
    title: string;
    priority: string;
    due_date?: string;
    status: string;
  }>;
  active_projects: Array<{
    id: string;
    title: string;
    progress_pct: number;
    priority: string;
  }>;
  recent_journals: Array<{
    id: string;
    title: string;
    entry_type: string;
    created_at: string;
  }>;
}

export interface FinanceAccount {
  id: string;
  name: string;
  account_type: string;
  icon?: string;
  balance: number;
  opening_balance?: number;
  currency: string;
  institution?: string;
  updated_at?: string;
  tracks_investment_portfolio?: boolean;
  counts_toward_epf?: boolean;
  is_standby_cash?: boolean;
}

export type IncomeClassification = 'fixed' | 'variable';
export type ExpenseClassification = 'fixed' | 'variable' | 'yearly' | 'disbursement';

export interface TransactionCategory {
  id: string;
  name: string;
  category_type: 'income' | 'expense';
  sort_order: number;
  classification?: IncomeClassification | ExpenseClassification | null;
  parent_category_id?: string | null;
  is_deduction?: boolean;
  is_credit_card?: boolean;
}

export interface FinanceTransaction {
  id: string;
  account_id: string;
  to_account_id?: string;
  client_id?: string;
  transaction_type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  merchant?: string;
  description?: string;
  date: string;
  is_recurring: boolean;
}

export type GoalType = 'savings' | 'net_worth' | 'passive_income';

export interface FinancialGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  category: string;
  goal_type: GoalType;
  is_synced: boolean;
}

export interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  period: string;
  spent: number;
}

export interface FinanceReports {
  monthly_trend: Array<{ month: string; income: number; expense: number }>;
  current_month_expense_by_category: Record<string, number>;
}

export interface IncomeStatement {
  period: string;
  prior_period: string;
  income_by_category: Record<string, number>;
  expense_by_category: Record<string, number>;
  total_income: number;
  total_expense: number;
  net_income: number;
  prior_total_income: number;
  prior_total_expense: number;
  prior_net_income: number;
  income_change_pct: number | null;
  expense_change_pct: number | null;
  net_income_change_pct: number | null;
  savings_rate_pct: number;
  hours_worked: number | null;
  hourly_gross_income: number | null;
  hourly_net_income: number | null;
}

export interface ForecastedIncomeStatement {
  granularity: string;
  period_days: number;
  lookback_days: number;
  income_by_category: Record<string, number>;
  expense_by_category: Record<string, number>;
  total_income: number;
  total_expense: number;
  net_income: number;
  savings_rate_pct: number;
}

export type StatementGranularity = 'monthly' | 'quarterly' | 'semi_yearly' | 'yearly';

export interface IncomeStatementLine {
  category: string;
  is_deduction: boolean;
  is_credit_card: boolean;
  parent_category: string | null;
  periods: number[];
  average: number;
  total: number;
}

export interface IncomeStatementBucket {
  classification: string;
  lines: IncomeStatementLine[];
  periods: number[];
  average: number;
  total: number;
}

export interface IncomeStatementSeries {
  periods: number[];
  average: number;
  total: number;
}

export interface IncomeStatementGrid {
  granularity: StatementGranularity;
  year: number;
  years: number[];
  period_labels: string[];
  editable: boolean;
  period_year_month: [number, number][] | null;
  beginning_balance: IncomeStatementSeries;
  income: {
    fixed: IncomeStatementBucket;
    variable: IncomeStatementBucket;
    disbursement: IncomeStatementBucket;
    total_income: IncomeStatementSeries;
    total_income_excl_credit_card: IncomeStatementSeries;
    gross_disposable_income: IncomeStatementSeries;
  };
  expense: {
    fixed: IncomeStatementBucket;
    variable: IncomeStatementBucket;
    yearly: IncomeStatementBucket;
    disbursement: IncomeStatementBucket;
    total_expense: IncomeStatementSeries;
  };
  net_income: IncomeStatementSeries;
  emergency_fund_3mo: number;
  cash_surplus: IncomeStatementSeries;
  analysis: {
    fixed: { income: number; expense: number; diff: number };
    variable: { income: number; expense: number; diff: number };
  };
}

export type BalanceSheetCategory = 'fixed_asset' | 'current_asset' | 'fixed_liability' | 'current_liability';

export interface BalanceSheetItem {
  id: string;
  category: BalanceSheetCategory;
  parent_id?: string;
  subcategory?: string;
  name: string;
  value: number;
  total_value: number;
  instalment_amount?: number;
  min_payment?: number;
  nominee?: string;
  notes?: string;
  linked_account_id?: string | null;
  is_live?: boolean;
  opening_value: number | null;
  since_beginning: number | null;
  compare_value: number | null;
  compare_variance: number | null;
  sub_items: BalanceSheetItem[];
}

export interface BalanceSheet {
  fixed_assets: BalanceSheetItem[];
  current_assets: BalanceSheetItem[];
  fixed_liabilities: BalanceSheetItem[];
  current_liabilities: BalanceSheetItem[];
  totals: {
    fixed_assets: number; current_assets: number; fixed_liabilities: number; current_liabilities: number;
    total_assets: number; total_liabilities: number; net_worth: number;
    total_cash_balance: number; total_credit_balance: number;
    compare_to?: string;
    total_assets_change?: number;
    total_liabilities_change?: number;
    net_worth_change?: number;
  };
}

export interface InsurancePolicy {
  id: string;
  policy_type: 'life' | 'health' | 'car' | 'home' | 'other';
  provider: string;
  policy_number?: string;
  coverage_amount: number;
  premium_amount: number;
  premium_frequency: 'monthly' | 'yearly';
  nominee?: string;
  start_date?: string;
  renewal_date?: string;
  ncd_percent?: number;
  notes?: string;
}

export interface NcdForecastPoint {
  year_offset: number;
  ncd_percent: number;
  projected_premium: number;
  savings_vs_current: number;
}

export interface Loan {
  id: string;
  name: string;
  loan_type: 'credit_card' | 'car_loan' | 'mortgage' | 'other';
  principal_amount: number;
  annual_interest_rate: number;
  tenure_months: number;
  start_date: string;
  linked_asset_id?: string;
  notes?: string;
  monthly_payment: number;
  total_interest: number;
  total_paid: number;
  payoff_date: string | null;
}

export interface LoanScheduleRow {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface Investment {
  id: string;
  name: string;
  investment_type: 'stock' | 'etf' | 'unit_trust' | 'crypto' | 'bond' | 'reit' | 'other';
  units: number;
  avg_cost_per_unit: number;
  current_price_per_unit: number;
  notes?: string;
  cost_basis: number;
  current_value: number;
  gain_loss: number;
  gain_loss_pct: number;
  symbol?: string | null;
  dividend_yield_pct?: number | null;
  last_dividend_amount?: number | null;
  last_dividend_date?: string | null;
  next_dividend_amount?: number | null;
  next_dividend_date?: string | null;
  price_updated_at?: string | null;
}

export interface InvestmentRefreshResult {
  id: string;
  name: string;
  symbol: string | null;
  error: string | null;
}

export interface InvestmentSummary {
  total_cost_basis: number;
  total_current_value: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  allocation_by_type: Record<string, number>;
}

export interface EPFProfile {
  id: string;
  current_balance: number;
  monthly_salary: number;
  employee_contribution_rate: number;
  employer_contribution_rate: number;
  annual_dividend_rate: number;
  current_age: number;
  retirement_age: number;
  safe_withdrawal_rate: number;
  is_balance_synced?: boolean;
}

export interface EPFForecast {
  years: Array<{ age: number; balance: number }>;
  annual_contribution: number;
  projected_retirement_balance: number;
  safe_withdrawal_rate: number;
  projected_monthly_retirement_income: number;
  current_avg_monthly_expense: number;
  retirement_income_gap: number;
  is_on_track: boolean;
}

export interface TaxReliefItem {
  name: string;
  amount: number;
}

export interface TaxCalculation {
  annual_income: number;
  total_reliefs: number;
  chargeable_income: number;
  tax_by_bracket: Array<{ range: string; rate_percent: number; taxable_amount: number; tax: number }>;
  total_tax: number;
  effective_rate_percent: number;
  marginal_rate_percent: number;
  net_income: number;
  monthly_net_income: number;
}

export interface FormBEstimate {
  year: number;
  monthly_breakdown: Array<{ month: number; source: 'actual' | 'forecast'; business: number; employment: number; other: number }>;
  statutory_business_income: number;
  statutory_employment_income: number;
  other_income: number;
  aggregate_income: number;
  tax: TaxCalculation;
}

export interface CashflowForecastPoint {
  period_index: number;
  period_end_date: string;
  projected_income: number;
  projected_expense: number;
  projected_net: number;
  projected_balance: number;
}

export interface CashflowForecast {
  granularity: string;
  current_balance: number;
  forecast: CashflowForecastPoint[];
}

export interface WorkProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress_pct: number;
  start_date?: string;
  target_date?: string;
  client_or_company?: string;
}

export interface WorkTask {
  id: string;
  project_id?: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  estimated_hours: number;
  logged_hours: number;
  tags?: string;
}

export interface WorkMeeting {
  id: string;
  project_id?: string;
  title: string;
  meeting_date: string;
  duration_min: number;
  attendees?: string;
  summary?: string;
  action_items_json?: string[];
}

export interface KnowledgeItem {
  id: string;
  title: string;
  item_type: string;
  source_url?: string;
  author?: string;
  summary?: string;
  content?: string;
  tags?: string;
  key_takeaways_json?: string[];
  rating: number;
}

export interface Habit {
  id: string;
  title: string;
  category: string;
  frequency: string;
  target_streak: number;
  current_streak: number;
}

export interface TimeBlock {
  id: string;
  title: string;
  block_date: string;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

export interface HealthMetric {
  id: string;
  log_date: string;
  weight_kg?: number;
  body_fat_pct?: number;
  calories_consumed?: number;
  protein_g?: number;
  water_ml?: number;
  sleep_hours?: number;
  workout_mins?: number;
  steps?: number;
  resting_heart_rate?: number;
  mood?: string;
  source?: string;
}

export interface WorkoutLog {
  id: string;
  log_date: string;
  exercise_name: string;
  category: string;
  sets: number;
  reps: number;
  weight_kg: number;
  duration_min: number;
  calories_burned: number;
}

export interface CareerSkill {
  id: string;
  name: string;
  category: string;
  current_level: number;
  target_level: number;
  notes?: string;
}

export interface CareerMilestone {
  id: string;
  title: string;
  milestone_date: string;
  impact_summary?: string;
  salary_delta: number;
  promotion_stage?: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  entry_type: string;
  content: string;
  mood?: string;
  tags?: string;
  created_at: string;
}

export interface AIAgent {
  agent_id: string;
  name: string;
  role: string;
  avatar: string;
  system_prompt: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agent_id?: string;
  text: string;
  timestamp: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  domain: string;
  snippet: string;
  url: string;
}

export interface Document {
  id: string;
  filename: string;
  content_type?: string;
  size_bytes: number;
  description?: string;
  tags?: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  head_name?: string;
  staff_count: number;
}

export interface JobRole {
  id: string;
  department_id: string;
  title: string;
  level: string;
  job_scope?: string;
  requirements?: string;
}

export interface Staff {
  id: string;
  department_id: string;
  job_role_id?: string;
  name: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  monthly_salary: number;
  start_date?: string;
  status: 'active' | 'inactive' | 'on_leave';
  notes?: string;
}

export interface StaffAnalysis {
  headcount: number;
  total_monthly_salary: number;
  average_monthly_salary: number;
  by_employment_type: Record<string, number>;
  by_status: Record<string, number>;
  by_role: Record<string, number>;
}

export interface SOPStep {
  step_number: number;
  instruction: string;
  responsible_role?: string;
}

export interface SOPWorkflow {
  id: string;
  department_id: string;
  title: string;
  category?: string;
  steps: SOPStep[];
  version: string;
  effective_date?: string;
}

export interface DepartmentPolicy {
  id: string;
  department_id: string;
  title: string;
  category?: string;
  content: string;
  effective_date?: string;
}

export interface DepartmentCostItem {
  id: string;
  department_id: string;
  name: string;
  category: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'one_time';
}

export interface DepartmentCosting {
  department_id: string;
  monthly_staff_cost: number;
  monthly_overhead_cost: number;
  overhead_by_category: Record<string, number>;
  total_monthly_cost: number;
  annualized_cost: number;
  headcount: number;
}

// SELF-ANALYSIS
export interface SelfAnalysisCriterion {
  id: string;
  category_id: string;
  name: string;
  rating: number;
  max_rating: number;
  notes?: string;
  sort_order: number;
}

export interface SelfAnalysisCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  average_rating: number;
  criteria: SelfAnalysisCriterion[];
}

// SKILL DEVELOPMENT
export interface SkillMicroTask {
  id: string;
  skill_id: string;
  title: string;
  is_completed: boolean;
  scheduled_date?: string;
}

export interface SkillWithTasks {
  id: string;
  name: string;
  category: string;
  current_level: number;
  target_level: number;
  target_date?: string;
  notes?: string;
  tasks: SkillMicroTask[];
  task_progress_pct: number;
}

// WEB READER
export interface WebArticle {
  id: string;
  url: string;
  title: string;
  summary: string;
  content_text?: string;
  word_count: number;
  reading_time_min: number;
  created_at: string;
}

// FINANCE MODELING
export interface FinanceScenario {
  id: string;
  name: string;
  scope: 'personal' | 'business';
  starting_balance: number;
  monthly_income: number;
  monthly_expense: number;
  income_growth_rate_pct: number;
  expense_growth_rate_pct: number;
  projection_years: number;
  notes?: string;
}

export interface FinanceProjection {
  scenario_id: string;
  starting_balance: number;
  years: Array<{ year: number; income: number; expense: number; net: number; cumulative_balance: number }>;
  ending_balance: number;
}

// CALC SHEET
export interface CalcSheet {
  id: string;
  title: string;
  grid_json: string[][];
  created_at: string;
  updated_at: string;
}

// WORKFLOW DESIGNER
export interface WorkflowDiagram {
  id: string;
  title: string;
  description?: string;
  diagram_type: string;
  mermaid_source: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
  updated_at: string;
}

// CLIENT MANAGEMENT
export interface Client {
  id: string;
  name: string;
  business_nature?: string;
  status: 'prospect' | 'active' | 'paused' | 'churned';
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface ClientSummary extends Client {
  service_count: number;
  meeting_count: number;
  total_income: number;
}

export interface ClientService {
  id: string;
  client_id: string;
  service_name: string;
  scope_details?: string;
  fee_amount: number;
  fee_frequency: 'monthly' | 'yearly' | 'one_time' | 'project';
  status: 'active' | 'completed' | 'paused';
  start_date?: string;
  end_date?: string;
}

export interface ClientMeeting {
  id: string;
  client_id: string;
  title: string;
  meeting_date: string;
  duration_min: number;
  attendees?: string;
  summary?: string;
  action_items_json?: string[];
}

export interface ClientDetail extends Client {
  services: ClientService[];
  meetings: ClientMeeting[];
  transactions: FinanceTransaction[];
  total_income: number;
}

// STOCK ANALYSIS
export interface StockCandle {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface StockTechnical {
  score: number;
  label: string;
  signals: string[];
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number; prev_histogram: number | null } | null;
  bollinger: { middle: number; upper: number; lower: number } | null;
  support: number;
  resistance: number;
}

export interface StockFundamentals {
  company_name?: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  trailing_pe?: number;
  forward_pe?: number;
  eps_trailing?: number;
  eps_forward?: number;
  dividend_yield?: number;
  profit_margin?: number;
  revenue_growth?: number;
  earnings_growth?: number;
  debt_to_equity?: number;
  return_on_equity?: number;
  beta?: number;
  target_mean_price?: number;
  recommendation_key?: string;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
}

export interface StockScore {
  score: number;
  label: string;
  signals: string[];
  source?: string;
}

export interface StockHeadline {
  title: string;
  link: string;
  pub_date: string;
  source?: string;
}

export interface StockRecommendation {
  composite_score: number;
  label: string;
  suggested_buy_zone: [number, number];
  suggested_sell_zone: [number, number];
  suggested_stop_loss: number;
  disclaimer: string;
}

export interface StockAnalysis {
  symbol: string;
  currency?: string;
  exchange?: string;
  current_price?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  candles: StockCandle[];
  technical: StockTechnical;
  fundamentals: StockFundamentals | null;
  fundamental_score: StockScore | null;
  sentiment: StockScore;
  headlines: StockHeadline[];
  recommendation: StockRecommendation;
}

export interface StockSearchResult {
  symbol: string;
  name?: string;
  exchange?: string;
  type?: string;
}

export interface StockWatchlistItem {
  id: string;
  symbol: string;
  label?: string;
  notes?: string;
  created_at: string;
}

// INTERACTIVE COURSES
export interface CourseSummary {
  id: string;
  title: string;
  industry: string;
  description?: string;
  difficulty: string;
  estimated_hours: number;
  source: string;
  created_at: string;
  progress_pct: number;
}

export interface CourseQuizQuestion {
  id: string;
  question: string;
  options: string[];
  explanation?: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  content: string;
  quiz: CourseQuizQuestion[];
  is_completed: boolean;
  quiz_score_pct: number | null;
}

export interface CourseModuleDetail {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseDetail extends CourseSummary {
  modules: CourseModuleDetail[];
}

export interface QuizAttemptResult {
  score_pct: number;
  correct: number;
  total: number;
  results: Array<{ question_id: string; given_index: number | null; correct_index: number; is_correct: boolean; explanation?: string }>;
  lesson_completed: boolean;
}

// STARTUP PLAYBOOK
export interface StartupPlaybook {
  id: string;
  name: string;
  industry?: string;
  founding_story?: string;
  initial_cost_estimate?: number;
  initial_cost_notes?: string;
  business_plan_summary?: string;
  key_details?: string;
  roi_notes?: string;
  tags?: string;
  source_url?: string;
  source: string;
  created_at: string;
}

export type MandalaBoardType = 'life' | 'decade' | 'action';

export interface MandalaCell {
  id: string;
  position: number; // 0 = center, 1-8 = surrounding
  title: string | null;
  notes: string | null;
  is_completed: boolean;
  child_board_id: string | null;
}

export interface MandalaBoard {
  id: string;
  board_type: MandalaBoardType;
  title: string | null;
  parent_cell_id: string | null;
  cells: MandalaCell[];
}
