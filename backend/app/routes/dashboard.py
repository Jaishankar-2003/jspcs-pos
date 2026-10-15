from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List, Dict

from app.database import get_db
from app.models import Product, Sale, User
from app.websocket_manager import manager

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    from app.session_store import sessions
    from app.database import SessionLocal
    
    user_id = sessions.get(token) if token else None
    
    if user_id:
        db = SessionLocal()
        try:
            # Check if user is already in active_users, if not, add them
            if user_id not in manager.active_users:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    await manager.user_login(user.id, user.username, user.role)
        finally:
            db.close()
    
    await manager.connect(websocket, user_id=user_id)
    
    try:
        while True:
            # We don't expect messages from client, but keep the connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

@router.get("/products/count")
def get_products_count(db: Session = Depends(get_db)):
    count = db.query(Product).filter(Product.is_active == True).count()
    return {"totalProducts": count}

@router.post("/clear")
async def clear_dashboard_revenue():
    print("DEBUG: Clear revenue endpoint called")
    await manager.clear_revenue()
    return {"message": "Revenue cleared"}

@router.get("/revenue/today")
def get_revenue_today(db: Session = Depends(get_db)):
    today = date.today()
    query = db.query(func.sum(Sale.total_amount)).filter(
        func.date(Sale.created_at) == today
    )
    if manager.last_cleared_timestamp:
        query = query.filter(Sale.created_at >= manager.last_cleared_timestamp)
        
    total_revenue = query.scalar() or 0.0
    return {"totalRevenue": total_revenue}

@router.get("/revenue/cashier")
def get_revenue_cashier(db: Session = Depends(get_db)):
    today = date.today()
    query = db.query(
        User.id,
        User.username,
        func.sum(Sale.total_amount).label('total_revenue')
    ).join(User, Sale.cashier_id == User.id)\
     .filter(func.date(Sale.created_at) == today)
     
    if manager.last_cleared_timestamp:
        query = query.filter(Sale.created_at >= manager.last_cleared_timestamp)
        
    results = query.group_by(User.id, User.username).all()

    cashier_revenue = []
    active_usernames = set(u['username'].lower() for u in manager.active_users.values())
    
    for row in results:
        is_online = row.username.lower() in active_usernames
        
        cashier_revenue.append({
            "cashierName": row.username,
            "status": "ONLINE" if is_online else "OFFLINE",
            "revenue": row.total_revenue
        })
        
    return cashier_revenue

@router.get("/active-users")
def get_active_users():
    return manager.get_active_users()
