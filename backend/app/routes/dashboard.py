from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List, Dict

from app.database import get_db
from app.models import Product, Sale, User, SalesReturn
from app.websocket_manager import manager

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    from app.session_store import sessions
    from app.database import SessionLocal
    
    user_id = sessions.get(token) if token else None
    user_id_str = str(user_id) if user_id else None
    
    if user_id_str:
        db = SessionLocal()
        try:
            # Check if user is already in active_users, if not, add them
            if user_id_str not in manager.active_users:
                user = db.query(User).filter(User.id == user_id_str).first()
                if user:
                    await manager.user_login(user.id, user.username, user.role)
        finally:
            db.close()
    
    await manager.connect(websocket, user_id=user_id_str)
    
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
    query_sales = db.query(func.sum(Sale.total_amount)).filter(
        func.date(Sale.created_at) == today
    )
    query_returns = db.query(func.sum(SalesReturn.total_refund_amount)).filter(
        func.date(SalesReturn.created_at) == today
    )
    if manager.last_cleared_timestamp:
        query_sales = query_sales.filter(Sale.created_at >= manager.last_cleared_timestamp)
        query_returns = query_returns.filter(SalesReturn.created_at >= manager.last_cleared_timestamp)
        
    gross_sales = float(query_sales.scalar() or 0.0)
    total_returns = float(query_returns.scalar() or 0.0)
    net_revenue = max(0.0, gross_sales - total_returns)
    return {
        "totalRevenue": net_revenue,
        "grossRevenue": gross_sales,
        "totalRefunds": total_returns
    }

@router.get("/revenue/cashier")
def get_revenue_cashier(db: Session = Depends(get_db)):
    today = date.today()
    sales_query = db.query(
        User.id,
        User.username,
        func.sum(Sale.total_amount).label('total_sales')
    ).join(User, Sale.cashier_id == User.id)\
     .filter(func.date(Sale.created_at) == today)
     
    returns_query = db.query(
        User.id,
        func.sum(SalesReturn.total_refund_amount).label('total_returns')
    ).join(User, SalesReturn.cashier_id == User.id)\
     .filter(func.date(SalesReturn.created_at) == today)

    if manager.last_cleared_timestamp:
        sales_query = sales_query.filter(Sale.created_at >= manager.last_cleared_timestamp)
        returns_query = returns_query.filter(SalesReturn.created_at >= manager.last_cleared_timestamp)
        
    sales_results = {row.id: (row.username, float(row.total_sales or 0.0)) for row in sales_query.group_by(User.id, User.username).all()}
    returns_results = {row.id: float(row.total_returns or 0.0) for row in returns_query.group_by(User.id).all()}

    cashier_revenue = []
    active_usernames = set(u['username'].lower() for u in manager.get_active_users())
    
    all_user_ids = set(sales_results.keys()).union(set(returns_results.keys()))
    for u_id in all_user_ids:
        username = sales_results[u_id][0] if u_id in sales_results else "Cashier"
        gross = sales_results.get(u_id, ("", 0.0))[1]
        refunds = returns_results.get(u_id, 0.0)
        net = max(0.0, gross - refunds)
        is_online = username.lower() in active_usernames
        
        cashier_revenue.append({
            "cashierName": username,
            "status": "ONLINE" if is_online else "OFFLINE",
            "revenue": net,
            "grossRevenue": gross,
            "refunds": refunds
        })
        
    return cashier_revenue

@router.get("/active-users")
def get_active_users():
    return manager.get_active_users()
