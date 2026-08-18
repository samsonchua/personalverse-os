import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False, default="Samson")
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

# FINANCE
class FinanceAccount(Base):
    __tablename__ = "finance_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False) # cash, bank, credit_card, loan, asset, investment
    icon = Column(String(50), nullable=True)  # lucide-react icon name; falls back to a per-type default
    balance = Column(Float, default=0.0)
    # Set once at creation, never touched again by transactions — the fixed reference point that
    # `since_beginning` comparisons (see balance_sheet.py) are measured against.
    opening_balance = Column(Float, nullable=True)
    currency = Column(String(10), default="MYR")
    institution = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    # When true, this account's balance is overwritten with the Investment Portfolio's total
    # current value every time a holding is added/edited/deleted (see investments.py) — lets a
    # Balance Sheet item linked to this account track live portfolio value automatically.
    tracks_investment_portfolio = Column(Boolean, default=False)
    # When true, this account's balance counts toward the EPF/Retirement module's "current EPF
    # balance" figure (see epf.py) — lets multiple EPF accounts (Account 1/2/3) sum into one total.
    counts_toward_epf = Column(Boolean, default=False)
    # An asset (or other) account you could liquidate/transfer into cash if needed — excluded from
    # the Cashflow Forecast's starting balance by default, included when the user opts in (see
    # get_cashflow_forecast's include_standby_cash param).
    is_standby_cash = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Bumped by SQLAlchemy's onupdate whenever this row is written — including balance changes from
    # a transaction posting against it — so the UI can show which accounts haven't moved in a while.
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TransactionCategory(Base):
    __tablename__ = "finance_transaction_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    category_type = Column(String(20), nullable=False)  # income, expense
    sort_order = Column(Integer, default=0)
    # Standard Income Statement format: classification buckets, deduction nesting, credit-card flag.
    classification = Column(String(20), nullable=True)  # income: fixed/variable; expense: fixed/variable/yearly/disbursement
    parent_category_id = Column(String(36), ForeignKey("finance_transaction_categories.id"), nullable=True)  # display grouping only, not summed
    is_deduction = Column(Boolean, default=False)  # income line that subtracts from its bucket (EPF, SOCSO, EIS, PCB...)
    is_credit_card = Column(Boolean, default=False)  # income line representing credit-card draw money
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class FinanceTransaction(Base):
    __tablename__ = "finance_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    account_id = Column(String(36), ForeignKey("finance_accounts.id"), nullable=False)
    to_account_id = Column(String(36), ForeignKey("finance_accounts.id"), nullable=True)  # transfers only
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=True)  # income/expense attributable to a client
    transaction_type = Column(String(20), nullable=False) # income, expense, transfer
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False)
    merchant = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    date = Column(String(20), nullable=False) # YYYY-MM-DD
    is_recurring = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(String(20), nullable=True)
    category = Column(String(100), default="Investment")
    # "savings" (default, current_amount tracked by hand), "net_worth" (current_amount synced live
    # from the Balance Sheet's Net Worth — see finance.py's _serialize_goal), or "passive_income"
    # (current_amount is a monthly figure the user updates by hand — no reliable auto signal for it).
    goal_type = Column(String(30), default="savings")
    is_completed = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Budget(Base):
    __tablename__ = "finance_budgets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    category = Column(String(100), nullable=False)
    monthly_limit = Column(Float, nullable=False)
    period = Column(String(7), nullable=False, index=True)  # YYYY-MM
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class BalanceSheetItem(Base):
    __tablename__ = "finance_balance_sheet_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    category = Column(String(30), nullable=False)  # fixed_asset, current_asset, fixed_liability, current_liability
    parent_id = Column(String(36), ForeignKey("finance_balance_sheet_items.id"), nullable=True)  # sub-item of another item
    subcategory = Column(String(30), nullable=True)  # cash, bank, vehicle, property, credit_card, loan, other...
    name = Column(String(255), nullable=False)
    value = Column(Float, nullable=False)
    instalment_amount = Column(Float, nullable=True)  # liabilities: recurring instalment
    min_payment = Column(Float, nullable=True)  # liabilities: minimum required payment
    nominee = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    # When set, this item's displayed value tracks the linked account's live balance instead of the
    # stored `value` above (which becomes a frozen "beginning balance" / manual fallback).
    linked_account_id = Column(String(36), ForeignKey("finance_accounts.id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ForecastedIncomeStatementEntry(Base):
    """A single editable cell of the annual (Jan-Dec) Forecasted Income Statement grid: one
    category's projected amount for one month of one year. Absent cells fall back to the
    trailing-average projection computed at read time (see _default_monthly_projection)."""
    __tablename__ = "forecasted_income_statement_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False)  # 1-12
    line_type = Column(String(10), nullable=False)  # income, expense
    category = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class InsurancePolicy(Base):
    __tablename__ = "finance_insurance_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    policy_type = Column(String(30), nullable=False)  # life, health, car, home, other
    provider = Column(String(255), nullable=False)
    policy_number = Column(String(100), nullable=True)
    coverage_amount = Column(Float, nullable=False)
    premium_amount = Column(Float, nullable=False)
    premium_frequency = Column(String(20), default="yearly")  # monthly, yearly
    nominee = Column(String(255), nullable=True)
    start_date = Column(String(20), nullable=True)
    renewal_date = Column(String(20), nullable=True)
    ncd_percent = Column(Float, nullable=True)  # car insurance only
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Loan(Base):
    __tablename__ = "finance_loans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    loan_type = Column(String(30), nullable=False)  # credit_card, car_loan, mortgage, other
    principal_amount = Column(Float, nullable=False)
    annual_interest_rate = Column(Float, nullable=False)  # percent, e.g. 4.5
    tenure_months = Column(Integer, nullable=False)
    start_date = Column(String(20), nullable=False)
    linked_asset_id = Column(String(36), ForeignKey("finance_balance_sheet_items.id"), nullable=True)  # e.g. the car this loan financed
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Investment(Base):
    __tablename__ = "finance_investments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    investment_type = Column(String(30), nullable=False)  # stock, etf, unit_trust, crypto, bond, reit, other
    units = Column(Float, nullable=False)
    avg_cost_per_unit = Column(Float, nullable=False)
    current_price_per_unit = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    # EODHD ticker, e.g. "1155.KLSE" — None means this holding has no live price source and stays
    # on manually-entered current_price_per_unit (niche instruments EODHD doesn't cover, etc.).
    symbol = Column(String(30), nullable=True)
    dividend_yield_pct = Column(Float, nullable=True)  # trailing-12-month dividends / current price
    last_dividend_amount = Column(Float, nullable=True)
    last_dividend_date = Column(String(20), nullable=True)
    # EODHD's free/basic dividend data has no forward-looking declaration dates for KLSE-listed
    # stocks (confirmed empirically) — these stay None until/unless a data source actually provides
    # them, rather than being backed by a fake "next dividend" guess.
    next_dividend_amount = Column(Float, nullable=True)
    next_dividend_date = Column(String(20), nullable=True)
    price_updated_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EPFProfile(Base):
    __tablename__ = "finance_epf_profile"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    current_balance = Column(Float, nullable=False, default=0.0)
    monthly_salary = Column(Float, nullable=False, default=0.0)
    employee_contribution_rate = Column(Float, default=11.0)  # percent
    employer_contribution_rate = Column(Float, default=12.0)  # percent
    annual_dividend_rate = Column(Float, default=5.5)  # percent
    current_age = Column(Integer, nullable=False, default=30)
    retirement_age = Column(Integer, default=60)
    # % of the projected retirement balance drawn per year, in retirement — used for the "is this
    # enough" readiness analysis (see epf.py get_forecast). 4% is the common "safe withdrawal rate"
    # rule of thumb; adjustable since it's a real assumption, not a fact.
    safe_withdrawal_rate = Column(Float, default=4.0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# DEPARTMENT / HR MANAGEMENT
class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    head_name = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class JobRole(Base):
    __tablename__ = "department_job_roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    title = Column(String(255), nullable=False)
    level = Column(String(50), default="Mid")  # Junior, Mid, Senior, Lead, Manager
    job_scope = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Staff(Base):
    __tablename__ = "department_staff"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    job_role_id = Column(String(36), ForeignKey("department_job_roles.id"), nullable=True)
    name = Column(String(255), nullable=False)
    employment_type = Column(String(30), default="full_time")  # full_time, part_time, contract, intern
    monthly_salary = Column(Float, default=0.0)
    start_date = Column(String(20), nullable=True)
    status = Column(String(20), default="active")  # active, inactive, on_leave
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SOPWorkflow(Base):
    __tablename__ = "department_sops"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    steps_json = Column(JSON, nullable=True)  # ordered list of {step_number, instruction, responsible_role}
    version = Column(String(20), default="1.0")
    effective_date = Column(String(20), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DepartmentPolicy(Base):
    __tablename__ = "department_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)  # Attendance, Conduct, Safety, Compliance, etc.
    content = Column(Text, nullable=False)
    effective_date = Column(String(20), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DepartmentCostItem(Base):
    __tablename__ = "department_cost_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="Overhead")  # Overhead, Software, Equipment, Rent, Other
    amount = Column(Float, nullable=False)
    frequency = Column(String(20), default="monthly")  # monthly, yearly, one_time
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# CLIENT MANAGEMENT (SamGY)
class Client(Base):
    __tablename__ = "clients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    business_nature = Column(String(255), nullable=True)  # industry / what the client's business does
    status = Column(String(20), default="active")  # prospect, active, paused, churned
    contact_person = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ClientService(Base):
    """A scoped service/engagement this client is being provided — 'what service I scope provided'."""
    __tablename__ = "client_services"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    service_name = Column(String(255), nullable=False)
    scope_details = Column(Text, nullable=True)
    fee_amount = Column(Float, default=0.0)
    fee_frequency = Column(String(20), default="monthly")  # monthly, yearly, one_time, project
    status = Column(String(20), default="active")  # active, completed, paused
    start_date = Column(String(20), nullable=True)
    end_date = Column(String(20), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ClientMeeting(Base):
    __tablename__ = "client_meetings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    title = Column(String(255), nullable=False)
    meeting_date = Column(String(20), nullable=False)
    duration_min = Column(Integer, default=30)
    attendees = Column(String(500), nullable=True)
    summary = Column(Text, nullable=True)
    action_items_json = Column(JSON, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# WORKBUDDY
class WorkProject(Base):
    __tablename__ = "work_projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="In Progress") # Planning, In Progress, Completed, On Hold
    priority = Column(String(20), default="High") # Low, Medium, High, Critical
    progress_pct = Column(Integer, default=0)
    start_date = Column(String(20), nullable=True)
    target_date = Column(String(20), nullable=True)
    client_or_company = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class WorkMeeting(Base):
    __tablename__ = "work_meetings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("work_projects.id"), nullable=True)
    title = Column(String(255), nullable=False)
    meeting_date = Column(String(20), nullable=False)
    duration_min = Column(Integer, default=30)
    attendees = Column(String(500), nullable=True)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    action_items_json = Column(JSON, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class WorkTask(Base):
    __tablename__ = "work_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("work_projects.id"), nullable=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="Todo") # Todo, In Progress, Review, Completed
    priority = Column(String(20), default="Medium")
    due_date = Column(String(20), nullable=True)
    estimated_hours = Column(Float, default=1.0)
    logged_hours = Column(Float, default=0.0)
    tags = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# KNOWLEDGE MANAGEMENT
class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    item_type = Column(String(50), nullable=False) # book, paper, course, article, notebooklm, code, pdf, podcast
    source_url = Column(String(500), nullable=True)
    author = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    tags = Column(String(255), nullable=True)
    key_takeaways_json = Column(JSON, nullable=True)
    rating = Column(Integer, default=5)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# DAILY PRODUCTIVITY
class Habit(Base):
    __tablename__ = "productivity_habits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), default="Daily") # Health, Mindset, Work, Fitness
    frequency = Column(String(50), default="Daily")
    target_streak = Column(Integer, default=30)
    current_streak = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class HabitLog(Base):
    __tablename__ = "productivity_habit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    habit_id = Column(String(36), ForeignKey("productivity_habits.id"), nullable=False)
    log_date = Column(String(20), nullable=False) # YYYY-MM-DD
    status = Column(Boolean, default=True)
    notes = Column(String(255), nullable=True)

class TimeBlock(Base):
    __tablename__ = "productivity_time_blocks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    task_id = Column(String(36), ForeignKey("work_tasks.id"), nullable=True)
    title = Column(String(255), nullable=False)
    block_date = Column(String(20), nullable=False)
    start_time = Column(String(10), nullable=False) # HH:MM
    end_time = Column(String(10), nullable=False)   # HH:MM
    is_completed = Column(Boolean, default=False)

# HEALTH TRACKING
class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    log_date = Column(String(20), nullable=False, unique=True)
    weight_kg = Column(Float, nullable=True)
    body_fat_pct = Column(Float, nullable=True)
    calories_consumed = Column(Integer, nullable=True)
    protein_g = Column(Integer, nullable=True)
    water_ml = Column(Integer, nullable=True)
    sleep_hours = Column(Float, nullable=True)
    workout_mins = Column(Integer, nullable=True)
    steps = Column(Integer, nullable=True)  # from a wearable import (e.g. Mi Health/Zepp CSV export)
    resting_heart_rate = Column(Integer, nullable=True)
    mood = Column(String(50), default="Energized") # Energized, Calm, Focused, Tired
    source = Column(String(30), default="manual")  # manual, mi_health_import
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class WorkoutLog(Base):
    __tablename__ = "health_workouts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    log_date = Column(String(20), nullable=False)
    exercise_name = Column(String(255), nullable=False)
    category = Column(String(100), default="Strength") # Strength, Cardio, Running, Mobility
    sets = Column(Integer, default=3)
    reps = Column(Integer, default=10)
    weight_kg = Column(Float, default=0.0)
    duration_min = Column(Integer, default=30)
    calories_burned = Column(Integer, default=150)
    is_deleted = Column(Boolean, default=False)

# CAREER
class CareerSkill(Base):
    __tablename__ = "career_skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="AI & Engineering")
    current_level = Column(Integer, default=8) # 1-10 scale
    target_level = Column(Integer, default=10)
    notes = Column(Text, nullable=True)

class CareerMilestone(Base):
    __tablename__ = "career_milestones"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    milestone_date = Column(String(20), nullable=False)
    impact_summary = Column(Text, nullable=True)
    salary_delta = Column(Float, default=0.0)
    promotion_stage = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# SECOND BRAIN
class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    entry_type = Column(String(50), default="journal") # journal, random_thought, decision_log, lesson_learned, quote
    content = Column(Text, nullable=False)
    mood = Column(String(50), nullable=True)
    tags = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# DOCUMENT MANAGEMENT
class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)  # original filename shown to the user
    storage_name = Column(String(255), nullable=False)  # UUID-prefixed name on disk
    content_type = Column(String(255), nullable=True)
    size_bytes = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    tags = Column(String(255), nullable=True)
    entity_type = Column(String(50), nullable=True)  # e.g. "project", "task", "journal" — optional attachment
    entity_id = Column(String(36), nullable=True, index=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# SELF-ANALYSIS (radar chart categories + rated criteria)
class SelfAnalysisCategory(Base):
    __tablename__ = "self_analysis_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#3987e5")
    sort_order = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SelfAnalysisCriterion(Base):
    __tablename__ = "self_analysis_criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    category_id = Column(String(36), ForeignKey("self_analysis_categories.id"), nullable=False)
    name = Column(String(150), nullable=False)
    rating = Column(Float, default=0.0)  # 0..max_rating
    max_rating = Column(Float, default=5.0)
    notes = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# WORKFLOW DESIGNER (mermaid diagrams, optionally imported from draw.io)
class WorkflowDiagram(Base):
    __tablename__ = "workflow_diagrams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    diagram_type = Column(String(30), default="flowchart")  # flowchart, sequence, mindmap, gantt...
    mermaid_source = Column(Text, nullable=False)
    entity_type = Column(String(50), nullable=True)  # e.g. "client" — optional owner tag, same pattern as Document
    entity_id = Column(String(36), nullable=True, index=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# WEB READER (fetched & summarized articles)
class WebArticle(Base):
    __tablename__ = "web_articles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    url = Column(String(2048), nullable=False)
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=False)
    content_text = Column(Text, nullable=True)
    word_count = Column(Integer, default=0)
    reading_time_min = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# SKILL DEVELOPMENT (broken into micro-tasks schedulable in the Daily Planner)
class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), default="General")
    current_level = Column(Integer, default=1)  # 1-10
    target_level = Column(Integer, default=10)
    target_date = Column(String(20), nullable=True)  # YYYY-MM-DD
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SkillMicroTask(Base):
    __tablename__ = "skill_micro_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    skill_id = Column(String(36), ForeignKey("skills.id"), nullable=False)
    title = Column(String(255), nullable=False)
    is_completed = Column(Boolean, default=False)
    scheduled_date = Column(String(20), nullable=True)  # set once pushed to Daily Planner
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# CALC SHEET (lightweight spreadsheet with formula support)
class CalcSheet(Base):
    __tablename__ = "calc_sheets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    grid_json = Column(JSON, nullable=False)  # string[][] of raw cell contents
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# FINANCE MODELING (personal or SamGY business scenario projections)
class FinanceScenario(Base):
    __tablename__ = "finance_scenarios"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    scope = Column(String(20), default="personal")  # personal, business
    starting_balance = Column(Float, default=0.0)
    monthly_income = Column(Float, default=0.0)
    monthly_expense = Column(Float, default=0.0)
    income_growth_rate_pct = Column(Float, default=0.0)  # annual
    expense_growth_rate_pct = Column(Float, default=0.0)  # annual
    projection_years = Column(Integer, default=5)
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# STOCK ANALYSIS (watchlist; the analysis itself is computed live, not persisted)
class StockWatchlistItem(Base):
    __tablename__ = "stock_watchlist_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    symbol = Column(String(30), nullable=False)  # Yahoo Finance ticker, e.g. AAPL, 1155.KL, BTC-USD
    label = Column(String(255), nullable=True)  # friendly display name
    notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# INTERACTIVE COURSES (AI-generated modules -> lessons -> quizzes, with progress tracking)
class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    industry = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), default="Beginner")
    estimated_hours = Column(Integer, default=4)
    source = Column(String(20), default="synthetic")  # ai_generated, synthetic
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CourseModule(Base):
    __tablename__ = "course_modules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0)


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    module_id = Column(String(36), ForeignKey("course_modules.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)


class QuizQuestion(Base):
    __tablename__ = "course_quiz_questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    lesson_id = Column(String(36), ForeignKey("course_lessons.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    options_json = Column(JSON, nullable=False)  # list[str]
    correct_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=True)


class LessonProgress(Base):
    __tablename__ = "course_lesson_progress"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    lesson_id = Column(String(36), ForeignKey("course_lessons.id"), nullable=False, unique=True)
    is_completed = Column(Boolean, default=False)
    quiz_score_pct = Column(Float, nullable=True)
    quiz_attempts = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)


# STARTUP PLAYBOOK (compiled founding stories: cost, plan, ROI, ideas — AI-assisted or manual)
class StartupPlaybook(Base):
    __tablename__ = "startup_playbooks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(255), nullable=True)
    founding_story = Column(Text, nullable=True)
    initial_cost_estimate = Column(Float, nullable=True)
    initial_cost_notes = Column(Text, nullable=True)
    business_plan_summary = Column(Text, nullable=True)
    key_details = Column(Text, nullable=True)
    roi_notes = Column(Text, nullable=True)
    tags = Column(String(500), nullable=True)  # comma-separated
    source_url = Column(String(1000), nullable=True)
    source = Column(String(20), default="manual")  # ai_generated, manual
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# MANDALA CHART (life planning) — a 3-level "Open Window 64" structure:
#   1 root "life" board (center = life vision, positions 1-8 = the 8 fixed decades 0-80)
#   -> each decade cell expands into its own "decade" board (center = that decade's core goal,
#      positions 1-8 = sub-goals)
#   -> each sub-goal cell expands into its own "action" board (center mirrors the sub-goal,
#      positions 1-8 = concrete action steps)
# Cells always number 9 per board (position 0 = center, 1-8 = surrounding, standard mandala
# reading order: top-left, top, top-right, left, right, bottom-left, bottom, bottom-right).
class MandalaBoard(Base):
    __tablename__ = "mandala_boards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    board_type = Column(String(20), nullable=False)  # life, decade, action
    title = Column(String(255), nullable=True)
    # Which cell (in the parent board) this board expands from — None only for the root life board.
    # use_alter=True + a name breaks the mandala_boards <-> mandala_cells circular FK dependency
    # (each table references the other) by adding this constraint via a separate ALTER TABLE after
    # both tables exist, instead of requiring one to exist before the other.
    parent_cell_id = Column(String(36), ForeignKey("mandala_cells.id", use_alter=True, name="fk_mandala_boards_parent_cell"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class MandalaCell(Base):
    __tablename__ = "mandala_cells"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    board_id = Column(String(36), ForeignKey("mandala_boards.id"), nullable=False, index=True)
    position = Column(Integer, nullable=False)  # 0 = center, 1-8 = surrounding
    title = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    # Set once this cell has been "expanded" into its own board — None means not yet expanded.
    child_board_id = Column(String(36), ForeignKey("mandala_boards.id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# AUDIT LOG
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    action = Column(String(50), nullable=False) # CREATE, UPDATE, DELETE
    changes_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
