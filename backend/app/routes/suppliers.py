from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user

router = APIRouter()

@router.post("", response_model=schemas.SupplierResponse)
def create_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can manage suppliers")
    
    # Check if duplicate supplier name
    existing = db.query(models.Supplier).filter(models.Supplier.name == supplier.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Supplier '{supplier.name}' already exists")

    db_supplier = models.Supplier(
        name=supplier.name,
        contact_person=supplier.contactPerson,
        phone=supplier.phone,
        email=supplier.email,
        address=supplier.address,
        gstin=supplier.gstin,
        notes=supplier.notes,
        is_active=True
    )
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.get("", response_model=List[schemas.SupplierResponse])
def list_suppliers(include_inactive: bool = False, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.Supplier)
    if not include_inactive:
        query = query.filter(models.Supplier.is_active == True)
    return query.order_by(models.Supplier.name.asc()).all()

@router.get("/{id}", response_model=schemas.SupplierResponse)
def get_supplier(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/{id}", response_model=schemas.SupplierResponse)
def update_supplier(id: str, supplier_update: schemas.SupplierUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can update suppliers")
    
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if supplier_update.name is not None:
        db_supplier.name = supplier_update.name
    if supplier_update.contactPerson is not None:
        db_supplier.contact_person = supplier_update.contactPerson
    if supplier_update.phone is not None:
        db_supplier.phone = supplier_update.phone
    if supplier_update.email is not None:
        db_supplier.email = supplier_update.email
    if supplier_update.address is not None:
        db_supplier.address = supplier_update.address
    if supplier_update.gstin is not None:
        db_supplier.gstin = supplier_update.gstin
    if supplier_update.notes is not None:
        db_supplier.notes = supplier_update.notes
    if supplier_update.isActive is not None:
        db_supplier.is_active = supplier_update.isActive

    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.delete("/{id}")
def delete_supplier(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can delete suppliers")

    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Prevent accidental destructive deletion if supplier is linked to purchases
    purchase_count = db.query(models.Purchase).filter(models.Purchase.supplier_id == id).count()
    if purchase_count > 0:
        # Soft delete / deactivate instead of hard delete
        db_supplier.is_active = False
        db.commit()
        return {"message": "Supplier has linked purchases; archived instead of deleted"}

    db.delete(db_supplier)
    db.commit()
    return {"message": "Supplier deleted successfully"}

