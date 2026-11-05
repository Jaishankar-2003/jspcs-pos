from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from datetime import datetime, timezone, timedelta
from decimal import Decimal

router = APIRouter()

@router.get("/movements", response_model=List[schemas.StockMovementResponse])
def list_stock_movements(
    product_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.StockMovement)
    if product_id:
        query = query.filter(models.StockMovement.product_id == product_id)
    if movement_type:
        query = query.filter(models.StockMovement.movement_type == movement_type)
    if start_date:
        query = query.filter(models.StockMovement.created_at >= start_date)
    if end_date:
        query = query.filter(models.StockMovement.created_at <= end_date)

    movements = query.order_by(models.StockMovement.created_at.desc()).offset(offset).limit(limit).all()
    
    results = []
    for m in movements:
        results.append({
            "id": m.id,
            "productId": m.product_id,
            "productName": m.product.name if m.product else "Deleted Product",
            "productSku": m.product.sku if m.product else "N/A",
            "movementType": m.movement_type,
            "previousQuantity": m.previous_quantity,
            "quantityChanged": m.quantity_changed,
            "newQuantity": m.new_quantity,
            "referenceType": m.reference_type,
            "referenceId": m.reference_id,
            "reason": m.reason,
            "createdBy": m.created_by,
            "creatorUsername": m.user.username if m.user else "System",
            "createdAt": m.created_at
        })
    return results

@router.get("/products/{product_id}/movements", response_model=List[schemas.StockMovementResponse])
def get_product_movements(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    movements = db.query(models.StockMovement).filter(
        models.StockMovement.product_id == product_id
    ).order_by(models.StockMovement.created_at.desc()).limit(100).all()

    results = []
    for m in movements:
        results.append({
            "id": m.id,
            "productId": m.product_id,
            "productName": m.product.name if m.product else "Product",
            "productSku": m.product.sku if m.product else "N/A",
            "movementType": m.movement_type,
            "previousQuantity": m.previous_quantity,
            "quantityChanged": m.quantity_changed,
            "newQuantity": m.new_quantity,
            "referenceType": m.reference_type,
            "referenceId": m.reference_id,
            "reason": m.reason,
            "createdBy": m.created_by,
            "creatorUsername": m.user.username if m.user else "System",
            "createdAt": m.created_at
        })
    return results

@router.get("/batches", response_model=List[schemas.ProductBatchResponse])
def list_batches(
    product_id: Optional[str] = None,
    filter_type: Optional[str] = None, # "all", "near_expiry", "expired"
    threshold_days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.ProductBatch).filter(models.ProductBatch.is_active == True)
    if product_id:
        query = query.filter(models.ProductBatch.product_id == product_id)

    batches = query.order_by(models.ProductBatch.expiry_date.asc()).all()
    now = datetime.now(timezone.utc)
    threshold_dt = now + timedelta(days=threshold_days)

    results = []
    for b in batches:
        exp = b.expiry_date
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        
        days_left = (exp - now).days
        is_expired = exp < now
        is_near_expiry = not is_expired and (exp <= threshold_dt)

        if filter_type == "expired" and not is_expired:
            continue
        if filter_type == "near_expiry" and not is_near_expiry:
            continue

        results.append({
            "id": b.id,
            "productId": b.product_id,
            "productName": b.product.name if b.product else "Unknown Product",
            "productSku": b.product.sku if b.product else "N/A",
            "batchNumber": b.batch_number,
            "mfgDate": b.mfg_date,
            "expiryDate": b.expiry_date,
            "costPrice": b.cost_price,
            "sellingPrice": b.selling_price,
            "initialQuantity": b.initial_quantity,
            "currentQuantity": b.current_quantity,
            "isActive": b.is_active,
            "isExpired": is_expired,
            "daysUntilExpiry": days_left,
            "createdAt": b.created_at
        })

    return results

@router.post("/batches", response_model=schemas.ProductBatchResponse)
def create_batch(
    batch: schemas.ProductBatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can register batches")

    product = db.query(models.Product).filter(models.Product.id == str(batch.productId)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_batch = models.ProductBatch(
        product_id=product.id,
        batch_number=batch.batchNumber,
        mfg_date=batch.mfgDate,
        expiry_date=batch.expiryDate,
        cost_price=batch.costPrice,
        selling_price=batch.sellingPrice,
        initial_quantity=batch.initialQuantity,
        current_quantity=batch.initialQuantity,
        is_active=True
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    now = datetime.now(timezone.utc)
    exp = new_batch.expiry_date
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    days_left = (exp - now).days

    return {
        "id": new_batch.id,
        "productId": new_batch.product_id,
        "productName": product.name,
        "productSku": product.sku,
        "batchNumber": new_batch.batch_number,
        "mfgDate": new_batch.mfg_date,
        "expiryDate": new_batch.expiry_date,
        "costPrice": new_batch.cost_price,
        "sellingPrice": new_batch.selling_price,
        "initialQuantity": new_batch.initial_quantity,
        "currentQuantity": new_batch.current_quantity,
        "isActive": new_batch.is_active,
        "isExpired": exp < now,
        "daysUntilExpiry": days_left,
        "createdAt": new_batch.created_at
    }

@router.get("/valuation")
def get_inventory_valuation(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    products = db.query(models.Product).filter(models.Product.is_active == True).all()
    
    total_items = 0
    total_cost_valuation = Decimal("0.00")
    total_retail_valuation = Decimal("0.00")

    for p in products:
        qty = p.stock.quantity if p.stock else 0
        cost = p.cost_price or Decimal("0.00")
        price = p.price or Decimal("0.00")
        
        total_items += qty
        total_cost_valuation += cost * qty
        total_retail_valuation += price * qty

    potential_margin = total_retail_valuation - total_cost_valuation

    return {
        "totalProducts": len(products),
        "totalStockUnits": total_items,
        "costValuation": total_cost_valuation,
        "retailValuation": total_retail_valuation,
        "potentialMargin": potential_margin
    }

