from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from decimal import Decimal
from datetime import datetime, timezone

router = APIRouter()

def format_purchase_response(p: models.Purchase) -> dict:
    items = []
    for item in p.items:
        items.append({
            "id": item.id,
            "productId": item.product_id,
            "productName": item.product.name if item.product else "Unknown Product",
            "orderedQuantity": item.ordered_quantity,
            "receivedQuantity": item.received_quantity or 0,
            "damagedQuantity": item.damaged_quantity or 0,
            "unitCost": item.unit_cost,
            "taxRate": item.tax_rate or Decimal("0.00"),
            "discountPercent": item.discount_percent or Decimal("0.00"),
            "lineTotal": item.line_total,
            "batchNumber": item.batch_number,
            "expiryDate": item.expiry_date
        })

    return {
        "id": p.id,
        "purchaseNumber": p.purchase_number,
        "supplierId": p.supplier_id,
        "supplierName": p.supplier.name if p.supplier else "Unknown Supplier",
        "status": p.status,
        "totalAmount": p.total_amount,
        "taxAmount": p.tax_amount or Decimal("0.00"),
        "discountAmount": p.discount_amount or Decimal("0.00"),
        "notes": p.notes,
        "createdAt": p.created_at,
        "receivedAt": p.received_at,
        "items": items
    }

@router.post("", response_model=schemas.PurchaseResponse)
def create_purchase(
    purchase: schemas.PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can create purchases")

    supplier = db.query(models.Supplier).filter(models.Supplier.id == str(purchase.supplierId)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if not purchase.items:
        raise HTTPException(status_code=400, detail="Purchase order must contain at least one product")

    total_amount = Decimal("0.00")
    total_tax = Decimal("0.00")
    total_discount = Decimal("0.00")

    today_str = datetime.now().strftime("%Y%m%d")
    purchase_num = f"PO-{today_str}-{models.generate_uuid()[:6].upper()}"

    new_purchase = models.Purchase(
        purchase_number=purchase_num,
        supplier_id=str(purchase.supplierId),
        status="ORDERED", # Can be DRAFT or ORDERED
        notes=purchase.notes,
        created_by=current_user.id
    )
    db.add(new_purchase)
    db.flush()

    for item in purchase.items:
        db_product = db.query(models.Product).filter(models.Product.id == str(item.productId)).first()
        if not db_product:
            raise HTTPException(status_code=404, detail=f"Product {item.productId} not found")

        raw_total = item.unitCost * item.orderedQuantity
        discount = (raw_total * (item.discountPercent or Decimal("0.00")) / Decimal("100.00")).quantize(Decimal("0.01"))
        tax = ((raw_total - discount) * (item.taxRate or Decimal("0.00")) / Decimal("100.00")).quantize(Decimal("0.01"))
        line_total = raw_total - discount + tax

        total_amount += line_total
        total_tax += tax
        total_discount += discount

        purchase_item = models.PurchaseItem(
            purchase_id=new_purchase.id,
            product_id=db_product.id,
            ordered_quantity=item.orderedQuantity,
            received_quantity=0,
            damaged_quantity=0,
            unit_cost=item.unitCost,
            tax_rate=item.taxRate or Decimal("0.00"),
            discount_percent=item.discountPercent or Decimal("0.00"),
            line_total=line_total,
            batch_number=item.batchNumber,
            expiry_date=item.expiryDate
        )
        db.add(purchase_item)

    new_purchase.total_amount = total_amount
    new_purchase.tax_amount = total_tax
    new_purchase.discount_amount = total_discount

    db.commit()
    db.refresh(new_purchase)
    return format_purchase_response(new_purchase)

@router.get("", response_model=List[schemas.PurchaseResponse])
def list_purchases(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Purchase)
    if status:
        query = query.filter(models.Purchase.status == status)
    purchases = query.order_by(models.Purchase.created_at.desc()).all()
    return [format_purchase_response(p) for p in purchases]

@router.get("/{id}", response_model=schemas.PurchaseResponse)
def get_purchase(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return format_purchase_response(purchase)

@router.post("/{id}/receive", response_model=schemas.PurchaseResponse)
def receive_purchase_goods(
    id: str,
    receive_request: schemas.PurchaseReceiveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can confirm goods receipt")

    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if purchase.status in ["RECEIVED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot receive goods for purchase in {purchase.status} status")

    items_dict = {str(item.id): item for item in purchase.items}
    total_received_across_items = 0
    all_fully_received = True

    for r_item in receive_request.items:
        p_item = items_dict.get(str(r_item.itemId))
        if not p_item:
            raise HTTPException(status_code=400, detail=f"Item {r_item.itemId} not in this purchase order")

        newly_received = r_item.receivedQuantity
        newly_damaged = r_item.damagedQuantity or 0

        if newly_received < 0 or newly_damaged < 0:
            raise HTTPException(status_code=400, detail="Received or damaged quantity cannot be negative")

        remaining_to_receive = p_item.ordered_quantity - (p_item.received_quantity or 0) - (p_item.damaged_quantity or 0)
        if (newly_received + newly_damaged) > remaining_to_receive:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot receive {newly_received + newly_damaged} units. Max remaining for this item is {remaining_to_receive}."
            )

        if newly_received + newly_damaged == 0:
            continue

        p_item.received_quantity = (p_item.received_quantity or 0) + newly_received
        p_item.damaged_quantity = (p_item.damaged_quantity or 0) + newly_damaged

        # Stock increases ONLY when goods are received & confirmed!
        if newly_received > 0:
            product = p_item.product
            # Update product's cost_price to latest purchase unit_cost
            product.cost_price = p_item.unit_cost

            # Lock and update stock
            stock_record = db.query(models.Stock).filter(models.Stock.product_id == product.id).first()
            if not stock_record:
                stock_record = models.Stock(product_id=product.id, quantity=0)
                db.add(stock_record)
            
            prev_stock = stock_record.quantity
            stock_record.quantity += newly_received
            new_stock = stock_record.quantity

            # Log movement in StockMovement ledger (Feature C)
            movement = models.StockMovement(
                product_id=product.id,
                movement_type="PURCHASE_RECEIVED",
                previous_quantity=prev_stock,
                quantity_changed=newly_received,
                new_quantity=new_stock,
                reference_type="PURCHASE",
                reference_id=purchase.id,
                reason=f"Received PO {purchase.purchase_number}",
                created_by=current_user.id
            )
            db.add(movement)

            # Create or update ProductBatch if batch information was given (Feature F)
            batch_num = r_item.batchNumber or p_item.batch_number
            exp_date = r_item.expiryDate or p_item.expiry_date
            if batch_num and exp_date:
                new_batch = models.ProductBatch(
                    product_id=product.id,
                    batch_number=batch_num,
                    purchase_item_id=p_item.id,
                    expiry_date=exp_date,
                    cost_price=p_item.unit_cost,
                    selling_price=product.price,
                    initial_quantity=newly_received,
                    current_quantity=newly_received,
                    is_active=True
                )
                db.add(new_batch)

        # Record damaged quantities in ledger as DAMAGE (without increasing sellable stock)
        if newly_damaged > 0:
            damage_movement = models.StockMovement(
                product_id=p_item.product_id,
                movement_type="DAMAGE",
                previous_quantity=stock_record.quantity if newly_received > 0 else (p_item.product.stock.quantity if p_item.product.stock else 0),
                quantity_changed=0, # Sellable stock didn't change
                new_quantity=stock_record.quantity if newly_received > 0 else (p_item.product.stock.quantity if p_item.product.stock else 0),
                reference_type="PURCHASE",
                reference_id=purchase.id,
                reason=f"Rejected {newly_damaged} damaged units in PO {purchase.purchase_number}",
                created_by=current_user.id
            )
            db.add(damage_movement)

    # Determine final purchase status
    for item in purchase.items:
        if (item.received_quantity + item.damaged_quantity) < item.ordered_quantity:
            all_fully_received = False
            break

    purchase.status = "RECEIVED" if all_fully_received else "PARTIALLY_RECEIVED"
    purchase.received_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(purchase)
    return format_purchase_response(purchase)

@router.put("/{id}/cancel", response_model=schemas.PurchaseResponse)
def cancel_purchase(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can cancel purchases")

    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    if purchase.status in ["PARTIALLY_RECEIVED", "RECEIVED"]:
        raise HTTPException(status_code=400, detail="Cannot cancel purchase with received goods")

    purchase.status = "CANCELLED"
    db.commit()
    db.refresh(purchase)
    return format_purchase_response(purchase)

