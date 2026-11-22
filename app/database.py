import logging
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = "sqlite:///./gios.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=NullPool
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_default_users():
    """Create or reset the admin account from GIOS_ADMIN_PASSWORD. There is no default."""
    from app.models.user import User
    from app.api.routes.auth import (
        MIN_PASSWORD_LENGTH, get_password_hash, is_published_password, verify_password
    )
    password = os.getenv("GIOS_ADMIN_PASSWORD", "")
    if password and (len(password) < MIN_PASSWORD_LENGTH or is_published_password(password)):
        raise RuntimeError("GIOS_ADMIN_PASSWORD must be at least 12 characters and not the old default")
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not password:
            if not admin:
                logger.warning("No admin account exists. Set GIOS_ADMIN_PASSWORD and restart to create one.")
        elif not admin:
            db.add(User(username="admin", hashed_password=get_password_hash(password), role="admin"))
            db.commit()
        elif admin.role != "admin" or not verify_password(password, admin.hashed_password):
            admin.hashed_password = get_password_hash(password)
            admin.role = "admin"
            db.commit()
        others = db.query(User).filter(User.role == "admin", User.username != "admin").count()
        if others:
            logger.warning("%d other admin account(s) exist. Older versions let anyone self-register as admin; review them.", others)
    finally:
        db.close()
