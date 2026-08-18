from typing import Optional, List, Any, Dict
from pydantic import BaseModel

# AUTH
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str = "Samson"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str

    model_config = {"from_attributes": True}

# FINANCE
class FinanceAccountCreate(BaseModel):
    name: str
    account_type: str
    icon: Optional[str] = None
    balance: float = 0.0
    currency: str = "MYR"
    institution: Optional[str] = None

class FinanceTransactionCreate(BaseModel):
    account_id: str
    to_account_id: Optional[str] = None  # required when transaction_type == "transfer"
    client_id: Optional[str] = None
    transaction_type: str  # income, expense, transfer
    amount: float
    category: str
    merchant: Optional[str] = None
    description: Optional[str] = None
    date: str
    is_recurring: bool = False

class FinanceTransactionUpdate(BaseModel):
    account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    client_id: Optional[str] = None
    transaction_type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    merchant: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    is_recurring: Optional[bool] = None

class FinanceAccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    icon: Optional[str] = None
    institution: Optional[str] = None
    is_active: Optional[bool] = None
    tracks_investment_portfolio: Optional[bool] = None
    counts_toward_epf: Optional[bool] = None
    is_standby_cash: Optional[bool] = None

class TransactionCategoryCreate(BaseModel):
    name: str
    category_type: str  # income, expense
    sort_order: int = 0
    classification: Optional[str] = None  # income: fixed/variable; expense: fixed/variable/yearly/disbursement
    parent_category_id: Optional[str] = None
    is_deduction: bool = False
    is_credit_card: bool = False

class TransactionCategoryUpdate(BaseModel):
    name: Optional[str] = None
    category_type: Optional[str] = None
    sort_order: Optional[int] = None
    classification: Optional[str] = None
    parent_category_id: Optional[str] = None
    is_deduction: Optional[bool] = None
    is_credit_card: Optional[bool] = None

class FinancialGoalCreate(BaseModel):
    title: str
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[str] = None
    category: str = "Investment"
    goal_type: str = "savings"  # savings, net_worth, passive_income

class FinancialGoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[str] = None
    category: Optional[str] = None

class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float
    period: str  # YYYY-MM

class BalanceSheetItemCreate(BaseModel):
    category: str  # fixed_asset, current_asset, fixed_liability, current_liability
    parent_id: Optional[str] = None
    subcategory: Optional[str] = None
    name: str
    value: float
    instalment_amount: Optional[float] = None
    min_payment: Optional[float] = None
    nominee: Optional[str] = None
    notes: Optional[str] = None

class BalanceSheetItemUpdate(BaseModel):
    category: Optional[str] = None
    parent_id: Optional[str] = None
    subcategory: Optional[str] = None
    name: Optional[str] = None
    value: Optional[float] = None
    instalment_amount: Optional[float] = None
    min_payment: Optional[float] = None
    nominee: Optional[str] = None
    notes: Optional[str] = None

class BalanceSheetLinkAccountCreate(BaseModel):
    name: str
    account_type: str
    icon: Optional[str] = None

class BalanceSheetItemLinkAccount(BaseModel):
    account_id: Optional[str] = None
    create_account: Optional[BalanceSheetLinkAccountCreate] = None

class ForecastedIncomeStatementCellUpsert(BaseModel):
    year: int
    month: int  # 1-12
    line_type: str  # income, expense
    category: str
    amount: float

class InsurancePolicyCreate(BaseModel):
    policy_type: str
    provider: str
    policy_number: Optional[str] = None
    coverage_amount: float
    premium_amount: float
    premium_frequency: str = "yearly"
    nominee: Optional[str] = None
    start_date: Optional[str] = None
    renewal_date: Optional[str] = None
    ncd_percent: Optional[float] = None
    notes: Optional[str] = None

class InsurancePolicyUpdate(BaseModel):
    policy_type: Optional[str] = None
    provider: Optional[str] = None
    policy_number: Optional[str] = None
    coverage_amount: Optional[float] = None
    premium_amount: Optional[float] = None
    premium_frequency: Optional[str] = None
    nominee: Optional[str] = None
    start_date: Optional[str] = None
    renewal_date: Optional[str] = None
    ncd_percent: Optional[float] = None
    notes: Optional[str] = None

class LoanCreate(BaseModel):
    name: str
    loan_type: str  # credit_card, car_loan, mortgage, other
    principal_amount: float
    annual_interest_rate: float
    tenure_months: int
    start_date: str
    linked_asset_id: Optional[str] = None
    notes: Optional[str] = None

class LoanPaymentLog(BaseModel):
    account_id: str
    amount: Optional[float] = None  # defaults to the computed monthly instalment
    date: str
    notes: Optional[str] = None

class InvestmentCreate(BaseModel):
    name: str
    investment_type: str
    units: float
    avg_cost_per_unit: float
    current_price_per_unit: float
    notes: Optional[str] = None
    symbol: Optional[str] = None

class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    investment_type: Optional[str] = None
    units: Optional[float] = None
    avg_cost_per_unit: Optional[float] = None
    current_price_per_unit: Optional[float] = None
    notes: Optional[str] = None
    symbol: Optional[str] = None

class EPFProfileUpsert(BaseModel):
    current_balance: float = 0.0
    monthly_salary: float = 0.0
    employee_contribution_rate: float = 11.0
    employer_contribution_rate: float = 12.0
    annual_dividend_rate: float = 5.5
    current_age: int = 30
    retirement_age: int = 60
    safe_withdrawal_rate: float = 4.0

class TaxReliefItem(BaseModel):
    name: str
    amount: float

class TaxCalculateRequest(BaseModel):
    annual_income: float
    reliefs: List[TaxReliefItem] = []

class FormBEstimateRequest(BaseModel):
    year: int
    reliefs: List[TaxReliefItem] = []

# DEPARTMENT / HR
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    head_name: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_name: Optional[str] = None

class JobRoleCreate(BaseModel):
    department_id: str
    title: str
    level: str = "Mid"
    job_scope: Optional[str] = None
    requirements: Optional[str] = None

class JobRoleUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    job_scope: Optional[str] = None
    requirements: Optional[str] = None

class StaffCreate(BaseModel):
    department_id: str
    job_role_id: Optional[str] = None
    name: str
    employment_type: str = "full_time"
    monthly_salary: float = 0.0
    start_date: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None

class StaffUpdate(BaseModel):
    job_role_id: Optional[str] = None
    name: Optional[str] = None
    employment_type: Optional[str] = None
    monthly_salary: Optional[float] = None
    start_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class SOPStep(BaseModel):
    step_number: int
    instruction: str
    responsible_role: Optional[str] = None

class SOPWorkflowCreate(BaseModel):
    department_id: str
    title: str
    category: Optional[str] = None
    steps: List[SOPStep] = []
    version: str = "1.0"
    effective_date: Optional[str] = None

class SOPWorkflowUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    steps: Optional[List[SOPStep]] = None
    version: Optional[str] = None
    effective_date: Optional[str] = None

class DepartmentPolicyCreate(BaseModel):
    department_id: str
    title: str
    category: Optional[str] = None
    content: str
    effective_date: Optional[str] = None

class DepartmentPolicyUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    effective_date: Optional[str] = None

class DepartmentCostItemCreate(BaseModel):
    department_id: str
    name: str
    category: str = "Overhead"
    amount: float
    frequency: str = "monthly"

# CLIENT MANAGEMENT
class ClientCreate(BaseModel):
    name: str
    business_nature: Optional[str] = None
    status: str = "active"
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    business_nature: Optional[str] = None
    status: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ClientServiceCreate(BaseModel):
    client_id: str
    service_name: str
    scope_details: Optional[str] = None
    fee_amount: float = 0.0
    fee_frequency: str = "monthly"
    status: str = "active"
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ClientServiceUpdate(BaseModel):
    service_name: Optional[str] = None
    scope_details: Optional[str] = None
    fee_amount: Optional[float] = None
    fee_frequency: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ClientMeetingCreate(BaseModel):
    client_id: str
    title: str
    meeting_date: str
    duration_min: int = 30
    attendees: Optional[str] = None
    summary: Optional[str] = None
    action_items_json: Optional[List[str]] = None

class ClientMeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_date: Optional[str] = None
    duration_min: Optional[int] = None
    attendees: Optional[str] = None
    summary: Optional[str] = None
    action_items_json: Optional[List[str]] = None

# WORKBUDDY
class WorkProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "In Progress"
    priority: str = "High"
    progress_pct: int = 0
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    client_or_company: Optional[str] = None

class WorkMeetingCreate(BaseModel):
    project_id: Optional[str] = None
    title: str
    meeting_date: str
    duration_min: int = 30
    attendees: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None

class WorkTaskCreate(BaseModel):
    project_id: Optional[str] = None
    title: str
    status: str = "Todo"
    priority: str = "Medium"
    due_date: Optional[str] = None
    estimated_hours: float = 1.0
    tags: Optional[str] = None

# KNOWLEDGE
class KnowledgeItemCreate(BaseModel):
    title: str
    item_type: str
    source_url: Optional[str] = None
    author: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None
    key_takeaways_json: Optional[List[str]] = None
    rating: int = 5

class NotebookLMImportRequest(BaseModel):
    title: str
    raw_markdown: str
    tags: str = "NotebookLM, AI"

# PRODUCTIVITY
class HabitCreate(BaseModel):
    title: str
    category: str = "Daily"
    frequency: str = "Daily"
    target_streak: int = 30

class HabitLogCreate(BaseModel):
    habit_id: str
    log_date: str
    status: bool = True
    notes: Optional[str] = None

class TimeBlockCreate(BaseModel):
    task_id: Optional[str] = None
    title: str
    block_date: str
    start_time: str
    end_time: str

class TimeBlockUpdate(BaseModel):
    title: Optional[str] = None
    block_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_completed: Optional[bool] = None

# HEALTH
class HealthMetricCreate(BaseModel):
    log_date: str
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    calories_consumed: Optional[int] = None
    protein_g: Optional[int] = None
    water_ml: Optional[int] = None
    sleep_hours: Optional[float] = None
    workout_mins: Optional[int] = None
    steps: Optional[int] = None
    resting_heart_rate: Optional[int] = None
    mood: Optional[str] = "Energized"
    source: Optional[str] = "manual"

class HealthMetricUpdate(BaseModel):
    log_date: Optional[str] = None
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    calories_consumed: Optional[int] = None
    protein_g: Optional[int] = None
    water_ml: Optional[int] = None
    sleep_hours: Optional[float] = None
    workout_mins: Optional[int] = None
    steps: Optional[int] = None
    resting_heart_rate: Optional[int] = None
    mood: Optional[str] = None
    source: Optional[str] = None

class HealthMetricBulkImport(BaseModel):
    rows: List[HealthMetricCreate]

class WorkoutLogCreate(BaseModel):
    log_date: str
    exercise_name: str
    category: str = "Strength"
    sets: int = 3
    reps: int = 10
    weight_kg: float = 0.0
    duration_min: int = 30

class WorkoutLogUpdate(BaseModel):
    log_date: Optional[str] = None
    exercise_name: Optional[str] = None
    category: Optional[str] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_min: Optional[int] = None

# CAREER
class CareerSkillCreate(BaseModel):
    name: str
    category: str = "AI & Engineering"
    current_level: int = 8
    target_level: int = 10
    notes: Optional[str] = None

class CareerMilestoneCreate(BaseModel):
    title: str
    milestone_date: str
    impact_summary: Optional[str] = None
    salary_delta: float = 0.0
    promotion_stage: Optional[str] = None

# SELF-ANALYSIS
class SelfAnalysisCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3987e5"
    sort_order: int = 0

class SelfAnalysisCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None

class SelfAnalysisCriterionCreate(BaseModel):
    category_id: str
    name: str
    rating: float = 0.0
    max_rating: float = 5.0
    notes: Optional[str] = None
    sort_order: int = 0

class SelfAnalysisCriterionUpdate(BaseModel):
    name: Optional[str] = None
    rating: Optional[float] = None
    max_rating: Optional[float] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None

# WORKFLOW DESIGNER
class WorkflowDiagramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    diagram_type: str = "flowchart"
    mermaid_source: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None

class WorkflowDiagramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    diagram_type: Optional[str] = None
    mermaid_source: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None

# WEB READER
class WebArticleFetchRequest(BaseModel):
    url: str

# SKILL DEVELOPMENT
class SkillCreate(BaseModel):
    name: str
    category: str = "General"
    current_level: int = 1
    target_level: int = 10
    target_date: Optional[str] = None
    notes: Optional[str] = None

class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    current_level: Optional[int] = None
    target_level: Optional[int] = None
    target_date: Optional[str] = None
    notes: Optional[str] = None

class SkillMicroTaskCreate(BaseModel):
    skill_id: str
    title: str

class SkillMicroTaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None

class SkillMicroTaskSchedule(BaseModel):
    block_date: str
    start_time: str
    end_time: str

# CALC SHEET
class CalcSheetCreate(BaseModel):
    title: str
    grid_json: List[List[str]]

class CalcSheetUpdate(BaseModel):
    title: Optional[str] = None
    grid_json: Optional[List[List[str]]] = None

# FINANCE MODELING
class FinanceScenarioCreate(BaseModel):
    name: str
    scope: str = "personal"
    starting_balance: float = 0.0
    monthly_income: float = 0.0
    monthly_expense: float = 0.0
    income_growth_rate_pct: float = 0.0
    expense_growth_rate_pct: float = 0.0
    projection_years: int = 5
    notes: Optional[str] = None

class FinanceScenarioUpdate(BaseModel):
    name: Optional[str] = None
    scope: Optional[str] = None
    starting_balance: Optional[float] = None
    monthly_income: Optional[float] = None
    monthly_expense: Optional[float] = None
    income_growth_rate_pct: Optional[float] = None
    expense_growth_rate_pct: Optional[float] = None
    projection_years: Optional[int] = None
    notes: Optional[str] = None

# STOCK ANALYSIS
class StockWatchlistItemCreate(BaseModel):
    symbol: str
    label: Optional[str] = None
    notes: Optional[str] = None

# INTERACTIVE COURSES
class CourseGenerateRequest(BaseModel):
    industry: str

class QuizAttemptRequest(BaseModel):
    answers: List[int]  # one selected option index per quiz question, in order

# STARTUP PLAYBOOK
class StartupPlaybookGenerateRequest(BaseModel):
    name: str

class StartupPlaybookCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    founding_story: Optional[str] = None
    initial_cost_estimate: Optional[float] = None
    initial_cost_notes: Optional[str] = None
    business_plan_summary: Optional[str] = None
    key_details: Optional[str] = None
    roi_notes: Optional[str] = None
    tags: Optional[str] = None
    source_url: Optional[str] = None

class StartupPlaybookUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    founding_story: Optional[str] = None
    initial_cost_estimate: Optional[float] = None
    initial_cost_notes: Optional[str] = None
    business_plan_summary: Optional[str] = None
    key_details: Optional[str] = None
    roi_notes: Optional[str] = None
    tags: Optional[str] = None
    source_url: Optional[str] = None

# SECOND BRAIN
class JournalEntryCreate(BaseModel):
    title: str
    entry_type: str = "journal"
    content: str
    mood: Optional[str] = None
    tags: Optional[str] = None

# AI & SEARCH
class AIChatRequest(BaseModel):
    agent_id: str = "ceo_agent" # ceo_agent, finance_agent, health_coach, dev_agent, meeting_assistant
    prompt: str
    context_domain: Optional[str] = None

class UniversalSearchQuery(BaseModel):
    query: str
    domain: Optional[str] = None # finance, work, knowledge, health, career, journal, all

# DOCUMENTS
class DocumentOut(BaseModel):
    id: str
    filename: str
    content_type: Optional[str] = None
    size_bytes: int
    description: Optional[str] = None
    tags: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    created_at: Any

    model_config = {"from_attributes": True}

# MANDALA CHART (life planning)
class MandalaCellUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = None
