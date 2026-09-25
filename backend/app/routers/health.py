from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Quick check that the API and the database are both working."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
