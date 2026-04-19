from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.session_store import sessions
from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = secrets.token_hex(32)
    sessions[token] = user.id
    
    return {
        "token": token,
        "type": "bearer",
        "username": user.username,
        "role": user.role,
        "permissions": ["ADMIN"] if user.role == "ADMIN" else ["CASHIER"],
        "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat()
    }

@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):
    if token in sessions:
        del sessions[token]
    return {"message": "Logged out successfully"}

# Dependency to get current user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = sessions.get(token)
    if not user_id:
        print(f"DEBUG: Session check failed for token: {token[:8]}...")
        print(f"DEBUG: Current active sessions: {list(sessions.keys())}")
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
