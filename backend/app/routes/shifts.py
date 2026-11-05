from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from decimal import Decimal
from datetime import datetime, timezone

router = APIRouter()

def format_shift_response(s: models.CashierShift) -> dict:
    expected_cash = (s.opening_cash or Decimal("0.00")) + (s.cash_sales or Decimal("0.00")) - (s.refund_total or Decimal("0.00"))
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
        "closingCashExpected": s.closing_cash_expected if s.closing_cash_expected is not None else expected_cash,
        "cashDifference": s.cash_difference if s.cash_difference is not None else diff,
        "cashSales": s.cash_sales or Decimal("0.00"),
        "cardSales": s.card_sales or Decimal("0.00"),
        "upiSales": s.upi_sales or Decimal("0.00"),
        "refundTotal": s.refund_total or Decimal("0.00"),
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
    db.commit()
    db.refresh(new_shift)
    return format_shift_response(new_shift)

@router.get("/current", response_model=schemas.ShiftResponse)
def get_current_shift(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    shift = db.query(models.CashierShift).filter(
        models.CashierShift.cashier_id == current_user.id,
        models.CashierShift.status == "OPEN"
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="No active open shift found for current user")
    return format_shift_response(shift)

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
        raise HTTPException(status_code=404, detail="No active open shift to close")

    expected_cash = (shift.opening_cash or Decimal("0.00")) + (shift.cash_sales or Decimal("0.00")) - (shift.refund_total or Decimal("0.00"))
    diff = req.actualCash - expected_cash

    shift.status = "CLOSED"
    shift.closed_at = datetime.now(timezone.utc)
    shift.closing_cash_actual = req.actualCash
    shift.closing_cash_expected = expected_cash
    shift.cash_difference = diff
    if req.notes:
        shift.notes = f"{shift.notes}; Close note: {req.notes}" if shift.notes else req.notes

    db.commit()
    db.refresh(shift)
    return format_shift_response(shift)

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
    return [format_shift_response(s) for s in shifts]

