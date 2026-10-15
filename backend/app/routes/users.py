from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user, get_password_hash
from app.session_store import sessions

router = APIRouter()

@router.get("", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = db.query(models.User).all()
    # Get set of user IDs that have active sessions
    online_user_ids = set(str(v) for v in sessions.values())
    
    print(f"DEBUG: Active online user IDs: {online_user_ids}")
    
    results = []
    for user in users:
        user_id_str = str(user.id)
        is_online = user_id_str in online_user_ids
        print(f"DEBUG: Checking user {user.username} ({user_id_str}): Online={is_online}")
        
        user_res = schemas.UserResponse.model_validate(user)
        user_res.isOnline = is_online
        results.append(user_res)
        
    return results

@router.post("", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    role = user.roleId if user.roleId else user.role
    
    new_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role=role,
        full_name=user.fullName,
        email=user.email
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{id}", response_model=schemas.UserResponse)
def update_user(id: str, user_update: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_user = db.query(models.User).filter(models.User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.username = user_update.username
    if user_update.password:
        db_user.password_hash = get_password_hash(user_update.password)
    
    db_user.role = user_update.roleId if user_update.roleId else user_update.role
    db_user.full_name = user_update.fullName
    db_user.email = user_update.email
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{id}")
def delete_user(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.id == id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    db_user = db.query(models.User).filter(models.User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/roles")
def get_roles():
    return [
        {"id": "ADMIN", "name": "ADMIN"},
        {"id": "CASHIER", "name": "CASHIER"}
    ]

@router.get("/counters")
def get_counters():
    return [{"id": "C1", "counter_number": "Counter 1", "name": "Main Counter"}]

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    user_res = schemas.UserResponse.model_validate(current_user)
    user_res.isOnline = True
    return user_res
