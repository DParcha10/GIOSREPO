import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import bcrypt
import jwt
from pydantic import BaseModel, Field

from app.database import SessionLocal, get_db
from app.models.user import User
from app.security import SESSION_COOKIE
from app.models.schemas import TokenResponse, UserResponse, UserRegisterResponse

logger = logging.getLogger(__name__)

MIN_SECRET_LENGTH = 32
MIN_PASSWORD_LENGTH = 12
# SHA-256 of the signing key and admin password that were published in this repo's history.
_PUBLISHED_SECRET = "5a317c40c7b2bea536c82f7b9b77e466ccf0d13a5d88136c3b908cd1023bc898"
_PUBLISHED_PASSWORD = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def is_published_password(password: str) -> bool:
    return _sha256(password) == _PUBLISHED_PASSWORD


def _load_secret_key() -> str:
    value = os.getenv("JWT_SECRET", "")
    if not value:
        logger.warning("JWT_SECRET is not set; using a random key. Logins end on restart and will not work across workers.")
        return secrets.token_urlsafe(48)
    if len(value) < MIN_SECRET_LENGTH or _sha256(value) == _PUBLISHED_SECRET:
        raise RuntimeError("JWT_SECRET must be at least 32 characters and must not be the old published key")
    return value


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

router = APIRouter(prefix="/auth", tags=["auth"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]})
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def is_valid_session(token: str) -> bool:
    """Used by RequireLoginMiddleware on every non-public request."""
    db = SessionLocal()
    try:
        get_current_user(token, db)
        return True
    except HTTPException:
        return False
    finally:
        db.close()

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_SECONDS = 15 * 60
_login_failures: dict = {}


def _login_key(request: Request, username: str) -> str:
    ip = request.client.host if request.client else "unknown"
    return f"{ip}|{(username or '').lower()}"


def _recent_failures(key: str) -> list:
    import time as _time
    cutoff = _time.time() - LOGIN_WINDOW_SECONDS
    kept = [t for t in _login_failures.get(key, []) if t > cutoff]
    if kept:
        _login_failures[key] = kept
    else:
        _login_failures.pop(key, None)
    return kept


@router.post("/token", response_model=TokenResponse)
def login_for_access_token(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    import time as _time
    key = _login_key(request, form_data.username)
    if len(_recent_failures(key)) >= LOGIN_MAX_FAILURES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed sign-in attempts. Try again in 15 minutes.",
        )
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or is_published_password(form_data.password) or not verify_password(form_data.password, user.hashed_password):
        _login_failures.setdefault(key, []).append(_time.time())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    _login_failures.pop(key, None)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    response.set_cookie(
        SESSION_COOKIE,
        access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        httponly=True,
        samesite="strict",
        secure=request.url.scheme == "https" or os.getenv("GIOS_COOKIE_SECURE", "").lower() == "true",
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")

class RegisterRequest(BaseModel):
    # Deliberately has no role field: the server decides the role.
    username: str = Field(..., max_length=64)
    password: str = Field(..., min_length=MIN_PASSWORD_LENGTH, max_length=128)

@router.post("/register", response_model=UserRegisterResponse)
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    if os.getenv("GIOS_ALLOW_REGISTRATION", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Registration is disabled on this server")
    username, password = req.username.strip(), req.password
    if not username or username.lower() == "admin":
        raise HTTPException(status_code=400, detail="That username is not available")
    if is_published_password(password):
        raise HTTPException(status_code=400, detail="That password is not allowed")
    db_user = db.query(User).filter(User.username == username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(password)
    new_user = User(username=username, hashed_password=hashed_password, role="viewer")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "User created successfully", "username": new_user.username}

@router.get("/me", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "status": "authenticated"
    }

