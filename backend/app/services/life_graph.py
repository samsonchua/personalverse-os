from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import FinanceTransaction, WorkProject, WorkTask, KnowledgeItem, JournalEntry

class LifeGraphService:
    def universal_search(self, db: Session, user_id: str, query: str, domain: str = None) -> List[Dict[str, Any]]:
        results = []
        q = f"%{query}%"

        # Search Tasks
        if not domain or domain in ["work", "all"]:
            tasks = db.query(WorkTask).filter(WorkTask.title.ilike(q), WorkTask.is_deleted == False, WorkTask.user_id == user_id).all()
            for t in tasks:
                results.append({
                    "id": t.id, "title": t.title, "type": "Task", "domain": "WorkBuddy",
                    "snippet": f"Status: {t.status} | Priority: {t.priority}", "url": "/work"
                })

        # Search Projects
        if not domain or domain in ["work", "all"]:
            projects = db.query(WorkProject).filter(WorkProject.title.ilike(q), WorkProject.is_deleted == False, WorkProject.user_id == user_id).all()
            for p in projects:
                results.append({
                    "id": p.id, "title": p.title, "type": "Project", "domain": "WorkBuddy",
                    "snippet": p.description or "Work project", "url": "/work"
                })

        # Search Knowledge Base
        if not domain or domain in ["knowledge", "all"]:
            items = db.query(KnowledgeItem).filter(KnowledgeItem.title.ilike(q), KnowledgeItem.is_deleted == False, KnowledgeItem.user_id == user_id).all()
            for k in items:
                results.append({
                    "id": k.id, "title": k.title, "type": f"Knowledge ({k.item_type})", "domain": "Knowledge",
                    "snippet": k.summary or "Knowledge base item", "url": "/knowledge"
                })

        # Search Journal / Second Brain
        if not domain or domain in ["journal", "all"]:
            journals = db.query(JournalEntry).filter(JournalEntry.title.ilike(q), JournalEntry.is_deleted == False, JournalEntry.user_id == user_id).all()
            for j in journals:
                results.append({
                    "id": j.id, "title": j.title, "type": f"Second Brain ({j.entry_type})", "domain": "Second Brain",
                    "snippet": j.content[:100] + "...", "url": "/second-brain"
                })

        # Search Finance
        if not domain or domain in ["finance", "all"]:
            txs = db.query(FinanceTransaction).filter(FinanceTransaction.category.ilike(q), FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == user_id).all()
            for tx in txs:
                results.append({
                    "id": tx.id, "title": f"{tx.category} Transaction (${tx.amount})", "type": "Finance Transaction", "domain": "Finance",
                    "snippet": f"Merchant: {tx.merchant} | Date: {tx.date}", "url": "/finance"
                })

        return results

life_graph_service = LifeGraphService()
