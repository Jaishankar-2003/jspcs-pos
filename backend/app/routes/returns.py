from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import func
from app.websocket_manager import manager
from app.services.gst_service import calculate_return_proportional_tax

router = APIRouter()

def format_return_response(r: models.SalesReturn) -> dict:
    items = []
    for item in r.items:
        items.append({
            "id": item.id,
            "productId": item.product_id,
            "productName": item.product.name if item.product else "Item",
            "quantity": item.quantity,
            "unitPrice": item.unit_price,
            "refundSubtotal": item.refund_subtotal,
            "condition": item.condition
        })

    return {
        "id": r.id,
        "returnNumber": r.return_number,
        "saleId": r.sale_id,
        "saleInvoiceNumber": r.sale.invoice_number if r.sale else "Invoice",
        "cashierName": r.cashier.username if r.cashier else "Cashier",
        "refundMode": r.refund_mode,
        "totalRefundAmount": r.total_refund_amount,
        "returnReason": r.return_reason,
        "createdAt": r.created_at,
        "items": items
    }

@router.post("", response_model=schemas.SalesReturnResponse)
async def create_sales_return(
    return_req: schemas.SalesReturnCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sale = db.query(models.Sale).filter(models.Sale.id == str(return_req.saleId)).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Original sale invoice not found")

    if not return_req.items:
        raise HTTPException(status_code=400, detail="Return request must contain at least one product")

    # Map original sale items by product_id
    sale_items_map = {}
    for s_item in sale.items:
        sale_items_map[str(s_item.product_id)] = s_item

    # Check previously returned quantities for this sale
    prev_returns = db.query(models.SalesReturn).filter(models.SalesReturn.sale_id == sale.id).all()
    already_returned_quantities = {}
    for pr in prev_returns:
        for pr_item in pr.items:
            pid = str(pr_item.product_id)
            already_returned_quantities[pid] = already_returned_quantities.get(pid, 0) + pr_item.quantity

    # Check for active cashier shift (first by current user, then fallback to any open shift on register)
    active_shift = db.query(models.CashierShift).filter(
        models.CashierShift.cashier_id == current_user.id,
        models.CashierShift.status == "OPEN"
    ).first()
    if not active_shift:
        active_shift = db.query(models.CashierShift).filter(
            models.CashierShift.status == "OPEN"
        ).order_by(models.CashierShift.opened_at.desc()).first()

    total_refund = Decimal("0.00")
    return_num = f"RET-{datetime.now().strftime('%Y%m%d')}-{models.generate_uuid()[:6].upper()}"

    new_return = models.SalesReturn(
        return_number=return_num,
        sale_id=sale.id,
        cashier_id=current_user.id,
        shift_id=active_shift.id if active_shift else None,
        refund_mode=return_req.refundMode or "CASH",
        total_refund_amount=Decimal("0.00"),
        return_reason=return_req.reason
    )
    db.add(new_return)
    db.flush()

    for item in return_req.items:
        pid = str(item.productId)
        orig_item = sale_items_map.get(pid)
        if not orig_item:
            raise HTTPException(status_code=400, detail=f"Product {pid} was not part of original invoice")

        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Return quantity must be greater than zero")

        already_ret = already_returned_quantities.get(pid, 0)
        max_returnable = orig_item.quantity - already_ret
        if item.quantity > max_returnable:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot return {item.quantity} units of '{orig_item.product.name if orig_item.product else pid}'. Max returnable is {max_returnable}."
            )

        # Historical price and proportional tax from original sale item
        unit_price = orig_item.unit_price
        line_refund = unit_price * item.quantity
        total_refund += line_refund

        prop_tax = calculate_return_proportional_tax(
            sale_item_tax_amount=orig_item.tax_amount or Decimal("0.00"),
            sale_item_quantity=orig_item.quantity,
            return_quantity=item.quantity
        )
        hist_unit_cost = orig_item.unit_cost if orig_item.unit_cost is not None else Decimal("0.00")

        return_item = models.SalesReturnItem(
            return_id=new_return.id,
            sale_item_id=orig_item.id,
            product_id=orig_item.product_id,
            batch_id=orig_item.batch_id,
            quantity=item.quantity,
            unit_price=unit_price,
            refund_subtotal=line_refund,
            tax_amount=prop_tax,
            unit_cost=hist_unit_cost,
            condition=(item.condition or "SELLABLE").upper()
        )
        db.add(return_item)

        # Update sellable stock ONLY if condition is SELLABLE!
        product = orig_item.product
        stock_record = db.query(models.Stock).filter(models.Stock.product_id == orig_item.product_id).first()
        prev_qty = stock_record.quantity if stock_record else 0

        if return_item.condition == "SELLABLE":
            if not stock_record:
                stock_record = models.Stock(product_id=orig_item.product_id, quantity=0)
                db.add(stock_record)
            stock_record.quantity += item.quantity
            new_qty = stock_record.quantity

            # Log SALES_RETURN in ledger
            movement = models.StockMovement(
                product_id=orig_item.product_id,
                movement_type="SALES_RETURN",
                previous_quantity=prev_qty,
                quantity_changed=item.quantity,
                new_quantity=new_qty,
                reference_type="RETURN",
                reference_id=new_return.id,
                reason=f"Returned in {return_num}",
                created_by=current_user.id
            )
            db.add(movement)
        else:
            # Damaged items do NOT become sellable stock!
            movement = models.StockMovement(
                product_id=orig_item.product_id,
                movement_type="DAMAGE",
                previous_quantity=prev_qty,
                quantity_changed=0,
                new_quantity=prev_qty,
                reference_type="RETURN",
                reference_id=new_return.id,
                reason=f"Damaged return in {return_num} (quarantined loss)",
                created_by=current_user.id
            )
            db.add(movement)

    new_return.total_refund_amount = total_refund

    # Update active shift refund total
    if active_shift:
        active_shift.refund_total = (active_shift.refund_total or Decimal("0.00")) + total_refund

    db.commit()
    db.refresh(new_return)

    # Calculate today's net revenue for WebSocket broadcast
    today = date.today()
    q_s = db.query(func.sum(models.Sale.total_amount)).filter(func.date(models.Sale.created_at) == today)
    q_r = db.query(func.sum(models.SalesReturn.total_refund_amount)).filter(func.date(models.SalesReturn.created_at) == today)
    if manager.last_cleared_timestamp:
        q_s = q_s.filter(models.Sale.created_at >= manager.last_cleared_timestamp)
        q_r = q_r.filter(models.SalesReturn.created_at >= manager.last_cleared_timestamp)
        
    today_net = float(q_s.scalar() or 0) - float(q_r.scalar() or 0)

    await manager.broadcast({
        "type": "SALES_RETURN_CREATED",
        "cashierName": current_user.username,
        "refundAmount": float(total_refund),
        "totalRevenue": max(0.0, float(today_net))
    })

    return format_return_response(new_return)

@router.get("", response_model=List[schemas.SalesReturnResponse])
def list_sales_returns(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    returns = db.query(models.SalesReturn).order_by(models.SalesReturn.created_at.desc()).all()
    return [format_return_response(r) for r in returns]

@router.get("/{id}", response_model=schemas.SalesReturnResponse)
def get_sales_return(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ret = db.query(models.SalesReturn).filter(models.SalesReturn.id == id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return record not found")
    return format_return_response(ret)

