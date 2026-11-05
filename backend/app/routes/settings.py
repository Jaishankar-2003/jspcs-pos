from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user

router = APIRouter()

DEFAULT_SETTINGS = {
    "businessName": "JSPCS POS",
    "currency": "₹",
    "taxRate": "18",
    "language": "English (India)",
    "timezone": "Asia/Kolkata",
    "receiptFooter": "Thank you for shopping with us! Visit again."
}

@router.get("")
def get_all_settings(db: Session = Depends(get_db)):
    settings_records = db.query(models.SystemSetting).all()
    result = dict(DEFAULT_SETTINGS)
    for record in settings_records:
        result[record.key] = record.value
    return result

@router.put("")
def update_settings(
    settings_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can modify store settings")

    for key, value in settings_data.items():
        record = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if record:
            record.value = str(value)
        else:
            record = models.SystemSetting(key=key, value=str(value))
            db.add(record)

    db.commit()
    return get_all_settings(db)

