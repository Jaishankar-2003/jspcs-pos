from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from decimal import Decimal
from datetime import datetime, timezone

router = APIRouter()

def compute_shift_totals(db: Session, s: models.CashierShift) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal]:
    """
    Dynamically and reliably compute (cash_sales, card_sales, upi_sales, refund_total, expected_cash)
    by aggregating all actual Sale and SalesReturn records associated with this shift or cashier within shift timeframe.
    """
    end_time = s.closed_at if s.closed_at else datetime.now(timezone.utc)
    
    # Query all sales linked directly by shift_id OR created by this cashier in this shift timeframe
    sales = db.query(models.Sale).filter(
        (models.Sale.shift_id == s.id) |
        (
            (models.Sale.cashier_id == s.cashier_id) &
            (models.Sale.created_at >= s.opened_at) &
            (models.Sale.created_at <= end_time)
        )
    ).all()

    calc_cash = Decimal("0.00")
    calc_card = Decimal("0.00")
    calc_upi = Decimal("0.00")

    for sale in sales:
        # If sale was unlinked, link it to this shift
        if not sale.shift_id:
            sale.shift_id = s.id
        
        pm = (sale.payment_mode or "CASH").upper()
        amt = Decimal(str(sale.total_amount or 0.00))
        if pm == "CASH":
            calc_cash += amt
        elif pm == "CARD":
            calc_card += amt
        elif pm == "UPI":
            calc_upi += amt

    # Query all returns linked to this shift
    returns = db.query(models.SalesReturn).filter(
        (models.SalesReturn.shift_id == s.id) |
        (
            (models.SalesReturn.cashier_id == s.cashier_id) &
            (models.SalesReturn.created_at >= s.opened_at) &
            (models.SalesReturn.created_at <= end_time)
        )
    ).all()

    calc_refund = Decimal("0.00")
    for r in returns:
        if not r.shift_id:
            r.shift_id = s.id
        if (r.refund_mode or "CASH").upper() == "CASH":
            calc_refund += Decimal(str(r.total_refund_amount or 0.00))

    final_cash_sales = max(s.cash_sales or Decimal("0.00"), calc_cash)
    final_card_sales = max(s.card_sales or Decimal("0.00"), calc_card)
    final_upi_sales = max(s.upi_sales or Decimal("0.00"), calc_upi)
    final_refund_total = max(s.refund_total or Decimal("0.00"), calc_refund)

    s.cash_sales = final_cash_sales
    s.card_sales = final_card_sales
    s.upi_sales = final_upi_sales
    s.refund_total = final_refund_total

    expected_cash = (s.opening_cash or Decimal("0.00")) + final_cash_sales - final_refund_total
    return final_cash_sales, final_card_sales, final_upi_sales, final_refund_total, expected_cash

def format_shift_response(s: models.CashierShift, db: Session = None) -> dict:
    if db:
        cash_sales, card_sales, upi_sales, refund_total, expected_cash = compute_shift_totals(db, s)
    else:
        cash_sales = s.cash_sales or Decimal("0.00")
        card_sales = s.card_sales or Decimal("0.00")
        upi_sales = s.upi_sales or Decimal("0.00")
        refund_total = s.refund_total or Decimal("0.00")
        expected_cash = (s.opening_cash or Decimal("0.00")) + cash_sales - refund_total

    diff = None
    if s.closing_cash_actual is not None:
        diff = s.closing_cash_actual - expected_cash

    return {
        "id": s.id,
        "cashierId": s.cashier_id,
        "cashierUsername": s.cashier.username if s.cashier else "Cashier",
        "status": s.status,
        "openedAt": s.opened_at,
        "closedAt": s.closed_at,
        "openingCash": s.opening_cash or Decimal("0.00"),
        "closingCashActual": s.closing_cash_actual,
        "closingCashExpected": expected_cash,
        "cashDifference": diff if diff is not None else s.cash_difference,
        "cashSales": cash_sales,
        "cardSales": card_sales,
        "upiSales": upi_sales,
        "refundTotal": refund_total,
        "notes": s.notes
    }

@router.post("/open", response_model=schemas.ShiftResponse)
def open_shift(
    req: schemas.ShiftOpenRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if cashier already has an active open shift
    existing = db.query(models.CashierShift).filter(
        models.CashierShift.cashier_id == current_user.id,
        models.CashierShift.status == "OPEN"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active open shift. Please close it before opening a new one.")

    new_shift = models.CashierShift(
        cashier_id=current_user.id,
        status="OPEN",
        opening_cash=req.openingCash or Decimal("0.00"),
        cash_sales=Decimal("0.00"),
        card_sales=Decimal("0.00"),
        upi_sales=Decimal("0.00"),
        refund_total=Decimal("0.00"),
        notes=req.notes
    )
    db.add(new_shift)
    db.flush()

    # Automatically associate any unassigned sales from today made by this cashier
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    unassigned_sales = db.query(models.Sale).filter(
        models.Sale.cashier_id == current_user.id,
        models.Sale.shift_id.is_(None),
        models.Sale.created_at >= today_start
    ).all()
    for sale in unassigned_sales:
        sale.shift_id = new_shift.id
        pm = (sale.payment_mode or "CASH").upper()
        amt = Decimal(str(sale.total_amount or 0.00))
        if pm == "CASH":
            new_shift.cash_sales = (new_shift.cash_sales or Decimal("0.00")) + amt
        elif pm == "CARD":
            new_shift.card_sales = (new_shift.card_sales or Decimal("0.00")) + amt
        elif pm == "UPI":
            new_shift.upi_sales = (new_shift.upi_sales or Decimal("0.00")) + amt

    db.commit()
    db.refresh(new_shift)
    return format_shift_response(new_shift, db)

@router.get("/current", response_model=schemas.ShiftResponse)
def get_current_shift(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    shift = db.query(models.CashierShift).filter(
        models.CashierShift.cashier_id == current_user.id,
        models.CashierShift.status == "OPEN"
    ).first()
    if not shift:
        # Fallback: check if ANY shift is open on the store register
        shift = db.query(models.CashierShift).filter(
            models.CashierShift.status == "OPEN"
        ).order_by(models.CashierShift.opened_at.desc()).first()

    if not shift:
        raise HTTPException(status_code=404, detail="No active open shift found for current user")
    
    return format_shift_response(shift, db)

@router.post("/close", response_model=schemas.ShiftResponse)
def close_shift(
    req: schemas.ShiftCloseRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    shift = db.query(models.CashierShift).filter(
        models.CashierShift.cashier_id == current_user.id,
        models.CashierShift.status == "OPEN"
    ).first()
    if not shift:
        # Fallback if admin is closing or general active shift
        shift = db.query(models.CashierShift).filter(
            models.CashierShift.status == "OPEN"
        ).order_by(models.CashierShift.opened_at.desc()).first()

    if not shift:
        raise HTTPException(status_code=404, detail="No active open shift to close")

    # Compute live financials accurately from all sales in this shift
    cash_sales, card_sales, upi_sales, refund_total, expected_cash = compute_shift_totals(db, shift)
    diff = req.actualCash - expected_cash

    shift.status = "CLOSED"
    shift.closed_at = datetime.now(timezone.utc)
    shift.closing_cash_actual = req.actualCash
    shift.closing_cash_expected = expected_cash
    shift.cash_difference = diff
    shift.cash_sales = cash_sales
    shift.card_sales = card_sales
    shift.upi_sales = upi_sales
    shift.refund_total = refund_total
    if req.notes:
        shift.notes = f"{shift.notes}; Close note: {req.notes}" if shift.notes else req.notes

    db.commit()
    db.refresh(shift)
    return format_shift_response(shift, db)

@router.get("", response_model=List[schemas.ShiftResponse])
def list_shifts(
    cashier_id: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        # Non-admins can only see their own shifts
        cashier_id = current_user.id

    query = db.query(models.CashierShift)
    if cashier_id:
        query = query.filter(models.CashierShift.cashier_id == cashier_id)
    if status:
        query = query.filter(models.CashierShift.status == status)

    shifts = query.order_by(models.CashierShift.opened_at.desc()).all()
    res = [format_shift_response(s, db) for s in shifts]
    db.commit() # Persist any updated linkings
    return res
