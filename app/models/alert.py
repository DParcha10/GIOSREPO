"""SQLAlchemy Alert model for persistent anomaly alerting in SQLite (gios.db)."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(String, unique=True, index=True)
    event_id = Column(String, index=True)
    site_name = Column(String)
    hazard_type = Column(String)
    metric = Column(String)
    z_score = Column(Float)
    severity = Column(String, default="critical")
    message = Column(String)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    webhook_dispatched = Column(String, default="SUCCESS")
