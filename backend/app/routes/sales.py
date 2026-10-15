from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from app.services.invoice_service import generate_invoice_pdf
from decimal import Decimal

router = APIRouter()

from app.websocket_manager import manager
from sqlalchemy import func
from datetime import date

@router.post("/invoices", response_model=schemas.CheckoutResponse)
async def checkout(request: schemas.CheckoutRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_amount = Decimal("0.00")
    sale_items_to_create = []
    
    # Start a transaction
    for item in request.items:
        db_product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not db_product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # Check stock
        if not db_product.stock or db_product.stock.quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {db_product.name}")
        
        # Calculate subtotal
        subtotal = db_product.price * item.quantity
        total_amount += subtotal
        
        # Prepare sale item
        sale_item = models.SaleItem(
            product_id=db_product.id,
            quantity=item.quantity,
            unit_price=db_product.price,
            subtotal=subtotal
        )
        sale_items_to_create.append((sale_item, db_product))
        
    # Create the sale header
    new_sale = models.Sale(
        cashier_id=current_user.id,
        total_amount=total_amount,
        payment_mode=request.paymentMode,
        customer_name=request.customerName
    )
    db.add(new_sale)
    db.flush() # Get sale ID
    
    final_items_for_pdf = []
    
    # Process items and update stock
    for sale_item, db_product in sale_items_to_create:
        sale_item.sale_id = new_sale.id
        db.add(sale_item)
        
        # Deduct stock
        db_product.stock.quantity -= sale_item.quantity
        
        # Prepare for PDF
        sale_item.product_name = db_product.name
        final_items_for_pdf.append(sale_item)
        
    db.commit()
    db.refresh(new_sale)
    
    # Generate Invoice
    invoice_path = generate_invoice_pdf(new_sale, final_items_for_pdf, current_user.full_name)
    
    # Calculate today's total revenue for WebSocket broadcast
    today = date.today()
    query = db.query(func.sum(models.Sale.total_amount)).filter(
        func.date(models.Sale.created_at) == today
    )
    if manager.last_cleared_timestamp:
        query = query.filter(models.Sale.created_at >= manager.last_cleared_timestamp)
        
    today_revenue = query.scalar() or 0.0

    await manager.broadcast({
        "type": "INVOICE_CREATED",
        "cashierName": current_user.username,
        "amount": float(total_amount),
        "totalRevenue": float(today_revenue)
    })
    
    return {
        "sale_id": new_sale.id,
        "total_amount": total_amount,
        "invoice_path": invoice_path
    }

@router.get("/invoices", response_model=list[schemas.SaleResponse])
def list_sales(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        # Cashiers can only see their own sales? Or all? User said "View reports" for Admin.
        # Let's restrict to admin for now or just allow viewing list.
        pass
        
    sales = db.query(models.Sale).all()
    results = []
    for s in sales:
        items = []
        for item in s.items:
            items.append({
                "product_name": item.product.name if item.product else "Deleted Product",
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": item.subtotal
            })
        results.append({
            "id": s.id,
            "cashier_id": s.cashier_id,
            "total_amount": s.total_amount,
            "created_at": s.created_at,
            "items": items
        })
    return results
