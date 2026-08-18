import sys
import os

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base
from app.models.models import (
    User, FinanceAccount, FinanceTransaction, FinancialGoal,
    WorkProject, WorkTask, WorkMeeting, KnowledgeItem, Habit, HabitLog,
    HealthMetric, WorkoutLog, CareerSkill, CareerMilestone, JournalEntry,
)
from app.core.security import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "demo@personalverse.ai").first():
            print("Database already contains seed data.")
            return

        print("Seeding PersonalVerse rich demonstration data...")

        # 1. User — flushed immediately so `user.id` is populated (SQLAlchemy applies
        # `default=generate_uuid` at flush time) before it's used as user_id below.
        user = User(
            email="demo@personalverse.ai",
            hashed_password=get_password_hash("demo123"),
            full_name="Samson (Lead Architect)"
        )
        db.add(user)
        db.flush()
        uid = user.id

        # 2. Finance Accounts
        acc1 = FinanceAccount(user_id=uid, name="Main Checking Account", account_type="bank", balance=14850.00, institution="Chase")
        acc2 = FinanceAccount(user_id=uid, name="High Yield Savings (4.5% APY)", account_type="bank", balance=45200.00, institution="Wealthfront")
        acc3 = FinanceAccount(user_id=uid, name="Vanguard Index ETF Portfolio", account_type="investment", balance=128500.00, institution="Vanguard")
        acc4 = FinanceAccount(user_id=uid, name="Executive Credit Card", account_type="credit_card", balance=-1250.00, institution="Amex Platinum")
        db.add_all([acc1, acc2, acc3, acc4])
        db.flush()

        # Transactions
        tx1 = FinanceTransaction(user_id=uid, account_id=acc1.id, transaction_type="income", amount=9500.0, category="Salary", merchant="Tech Corp", description="Monthly Executive Salary", date="2026-08-01")
        tx2 = FinanceTransaction(user_id=uid, account_id=acc1.id, transaction_type="expense", amount=1850.0, category="Housing", merchant="Luxury Apartments", description="Monthly Rent", date="2026-08-02")
        tx3 = FinanceTransaction(user_id=uid, account_id=acc2.id, transaction_type="income", amount=1500.0, category="Investment Return", merchant="Vanguard", description="Dividend Distribution", date="2026-08-03")
        tx4 = FinanceTransaction(user_id=uid, account_id=acc4.id, transaction_type="expense", amount=120.0, category="Dining", merchant="Omakase Sushi", description="Team Celebration", date="2026-08-04")
        db.add_all([tx1, tx2, tx3, tx4])

        # Financial Goals
        fg1 = FinancialGoal(user_id=uid, title="AI Ventures Startup Reserve", target_amount=100000.0, current_amount=45000.0, target_date="2027-01-01", category="Startup")
        fg2 = FinancialGoal(user_id=uid, title="Real Estate Investment Capital", target_amount=200000.0, current_amount=128500.0, target_date="2027-06-01", category="Real Estate")
        db.add_all([fg1, fg2])

        # 3. WorkBuddy Projects & Tasks
        p1 = WorkProject(user_id=uid, title="PersonalVerse OS V1", description="Building the world's most advanced AI Personal Operating System", status="In Progress", priority="Critical", progress_pct=75, client_or_company="Internal")
        p2 = WorkProject(user_id=uid, title="Autonomous Multi-Agent Swarm", description="Agentic AI framework orchestrating specialized domain coaches", status="Planning", priority="High", progress_pct=30, client_or_company="Deepmind Research")
        db.add_all([p1, p2])
        db.flush()

        t1 = WorkTask(user_id=uid, project_id=p1.id, title="Implement Glassmorphism React Theme", status="Completed", priority="High", due_date="2026-08-04", estimated_hours=4.0, logged_hours=4.0, tags="Frontend, UI")
        t2 = WorkTask(user_id=uid, project_id=p1.id, title="Build Universal Life Graph Backend", status="In Progress", priority="Critical", due_date="2026-08-05", estimated_hours=6.0, logged_hours=3.5, tags="Backend, Graph")
        t3 = WorkTask(user_id=uid, project_id=p2.id, title="Synthesize NotebookLM Vector Embeddings", status="Todo", priority="Medium", due_date="2026-08-10", estimated_hours=5.0, logged_hours=0.0, tags="AI, VectorDB")
        db.add_all([t1, t2, t3])

        m1 = WorkMeeting(user_id=uid, project_id=p1.id, title="Architecture Sync & UI Review", meeting_date="2026-08-04", duration_min=45, attendees="Samson, Lead Designer, AI Architect", summary="Approved Glassmorphic dark aesthetic and single-graph unified schema design.", action_items_json=["Deploy backend API", "Connect universal search"])
        db.add(m1)

        # 4. Knowledge Management
        k1 = KnowledgeItem(user_id=uid, title="Designing Data-Intensive Applications", item_type="book", author="Martin Kleppmann", summary="Essential blueprint for scalable distributed systems and database storage engines.", rating=5, tags="System Architecture, Databases")
        k2 = KnowledgeItem(user_id=uid, title="NotebookLM: AI Agent Memory Synthesis", item_type="notebooklm", author="AI Research Lab", summary="Framework for synthesizing unstructured documents into structured graph nodes.", rating=5, tags="NotebookLM, AI, Second Brain")
        db.add_all([k1, k2])
        db.flush()

        # 5. Productivity & Habits
        h1 = Habit(user_id=uid, title="90-Minute Morning Deep Work Block", category="Work", frequency="Daily", target_streak=30, current_streak=14)
        h2 = Habit(user_id=uid, title="500ml Hydration & Supplement Protocol", category="Health", frequency="Daily", target_streak=30, current_streak=21)
        h3 = Habit(user_id=uid, title="Evening Second Brain Reflection", category="Mindset", frequency="Daily", target_streak=30, current_streak=9)
        db.add_all([h1, h2, h3])

        # 6. Health Metrics & Workouts
        hm1 = HealthMetric(user_id=uid, log_date="2026-08-04", weight_kg=72.5, body_fat_pct=13.5, calories_consumed=2450, protein_g=160, water_ml=3200, sleep_hours=7.8, workout_mins=60, mood="Energized")
        w1 = WorkoutLog(user_id=uid, log_date="2026-08-04", exercise_name="Barbell Deadlifts & Core", category="Strength", sets=4, reps=8, weight_kg=140.0, duration_min=45, calories_burned=380)
        db.add_all([hm1, w1])

        # 7. Career Matrix
        cs1 = CareerSkill(user_id=uid, name="AI Autonomous Systems Architecture", category="AI Engineering", current_level=9, target_level=10, notes="Mastering multi-agent tool orchestration")
        cs2 = CareerSkill(user_id=uid, name="FastAPI & Scalable Backend Systems", category="Software Engineering", current_level=9, target_level=10)
        cm1 = CareerMilestone(user_id=uid, title="Promoted to Lead AI Software Architect", milestone_date="2026-01-15", impact_summary="Architected enterprise AI platform scaling to 1M+ active requests", salary_delta=35000.0, promotion_stage="Principal Architect")
        db.add_all([cs1, cs2, cm1])

        # 8. Second Brain & Journal
        j1 = JournalEntry(user_id=uid, title="Operating System for Life Principles", entry_type="decision_log", content="Decided to build PersonalVerse as a single unified Life Graph rather than disconnected apps. Everything must connect.", mood="Inspired", tags="Architecture, Second Brain")
        j2 = JournalEntry(user_id=uid, title="Daily Evening Reflection", entry_type="journal", content="High productivity today. Spent 4 hours building PersonalVerse core components. Mind feels clear and focused.", mood="Calm", tags="Reflection")
        db.add_all([j1, j2])
        db.flush()

        db.commit()
        print("PersonalVerse rich seed data successfully inserted!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
