from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
import csv
import io
from decimal import Decimal

router = APIRouter()

def _log_stock_movement(
    db: Session,
    product_id: str,
    movement_type: str,
    prev_qty: int,
    qty_changed: int,
    new_qty: int,
    reference_type: str = None,
    reference_id: str = None,
    reason: str = None,
    user_id: str = None
):
    movement = models.StockMovement(
        product_id=product_id,
        movement_type=movement_type,
        previous_quantity=prev_qty,
        quantity_changed=qty_changed,
        new_quantity=new_qty,
        reference_type=reference_type,
        reference_id=reference_id,
        reason=reason,
        created_by=user_id
    )
    db.add(movement)

@router.post("", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["ADMIN", "CASHIER"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check duplicate SKU
    existing = db.query(models.Product).filter(models.Product.sku == product.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with SKU '{product.sku}' already exists")

    db_product = models.Product(
        sku=product.sku,
        barcode=product.barcode,
        name=product.name,
        category=product.category,
        sub_category=product.subCategory,
        brand=product.brand,
        unit_of_measure=product.unitOfMeasure,
        cost_price=product.costPrice or Decimal("0.00"),
        price=product.sellingPrice,
        gst_rate=product.gstRate,
        hsn_code=product.hsnCode,
        is_taxable=product.isTaxable,
        low_stock_threshold=product.low_stock_threshold
    )
    db.add(db_product)
    db.flush()
    
    # Initialize stock
    init_qty = product.currentStock or 0
    db_stock = models.Stock(product_id=db_product.id, quantity=init_qty)
    db.add(db_stock)
    
    if init_qty > 0:
        _log_stock_movement(
            db=db,
            product_id=db_product.id,
            movement_type="OPENING_STOCK",
            prev_qty=0,
            qty_changed=init_qty,
            new_qty=init_qty,
            reference_type="MANUAL",
            reason="Initial product creation",
            user_id=current_user.id
        )

    db.commit()
    db.refresh(db_product)
    
    db_product.stock_quantity = init_qty
    return db_product

@router.post("/bulk")
async def bulk_upload_products(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    count = 0
    errors = []
    
    for row_idx, row in enumerate(reader, start=1):
        # Use nested transaction savepoint so one row failure doesn't invalidate subsequent rows
        savepoint = db.begin_nested()
        try:
            sku = (row.get('sku') or '').strip()
            if not sku:
                savepoint.rollback()
                continue
                
            existing = db.query(models.Product).filter(models.Product.sku == sku).first()
            if existing:
                errors.append(f"Row {row_idx}: SKU '{sku}' already exists")
                savepoint.rollback()
                continue
            
            init_stock = int(row.get('currentStock') or row.get('stock') or '0')
            selling_price = Decimal(row.get('sellingPrice') or row.get('price') or '0')
            cost_price = Decimal(row.get('costPrice') or '0')
            gst_rate = Decimal(row.get('gstRate') or '0')
            low_stock = int(row.get('lowStockThreshold') or '10')

            db_product = models.Product(
                sku=sku,
                name=row.get('name', 'Unknown'),
                category=row.get('category', ''),
                sub_category=row.get('subCategory', ''),
                brand=row.get('brand', ''),
                unit_of_measure=row.get('unitOfMeasure', 'unit'),
                cost_price=cost_price,
                price=selling_price,
                gst_rate=gst_rate,
                hsn_code=row.get('hsnCode', ''),
                is_taxable=str(row.get('isTaxable', 'true')).lower() == 'true',
                low_stock_threshold=low_stock
            )
            db.add(db_product)
            db.flush()
            
            db_stock = models.Stock(product_id=db_product.id, quantity=init_stock)
            db.add(db_stock)

            if init_stock > 0:
                _log_stock_movement(
                    db=db,
                    product_id=db_product.id,
                    movement_type="OPENING_STOCK",
                    prev_qty=0,
                    qty_changed=init_stock,
                    new_qty=init_stock,
                    reference_type="CSV_IMPORT",
                    reason="Bulk CSV upload",
                    user_id=current_user.id
                )

            savepoint.commit()
            count += 1
        except Exception as e:
            savepoint.rollback()
            errors.append(f"Row {row_idx} ({row.get('sku', 'unknown')}): {str(e)}")
            
    db.commit()
    return {"message": f"Successfully imported {count} products", "errors": errors}

@router.get("", response_model=List[schemas.ProductResponse])
def list_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(models.Product.is_active == True).all()
    results = []
    for p in products:
        p.stock_quantity = p.stock.quantity if p.stock else 0
        results.append(p)
    return results

@router.get("/{id}", response_model=schemas.ProductResponse)
def get_product(id: str, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == id, models.Product.is_active == True).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db_product.stock_quantity = db_product.stock.quantity if db_product.stock else 0
    return db_product

@router.put("/{id}", response_model=schemas.ProductResponse)
def update_product(id: str, product_update: schemas.ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product_update.name is not None:
        db_product.name = product_update.name
    if product_update.barcode is not None:
        db_product.barcode = product_update.barcode
    if product_update.category is not None:
        db_product.category = product_update.category
    if product_update.subCategory is not None:
        db_product.sub_category = product_update.subCategory
    if product_update.brand is not None:
        db_product.brand = product_update.brand
    if product_update.unitOfMeasure is not None:
        db_product.unit_of_measure = product_update.unitOfMeasure
    if product_update.costPrice is not None:
        db_product.cost_price = product_update.costPrice
    if product_update.sellingPrice is not None:
        db_product.price = product_update.sellingPrice
    if product_update.gstRate is not None:
        db_product.gst_rate = product_update.gstRate
    if product_update.hsnCode is not None:
        db_product.hsn_code = product_update.hsnCode
    if product_update.isTaxable is not None:
        db_product.is_taxable = product_update.isTaxable
    if product_update.low_stock_threshold is not None:
        db_product.low_stock_threshold = product_update.low_stock_threshold
    if product_update.is_active is not None:
        db_product.is_active = product_update.is_active
    if product_update.currentStock is not None:
        prev_qty = db_product.stock.quantity if db_product.stock else 0
        new_qty = product_update.currentStock
        _set_product_stock(db, db_product, new_qty)
        if prev_qty != new_qty:
            _log_stock_movement(
                db=db,
                product_id=db_product.id,
                movement_type="MANUAL_ADJUSTMENT",
                prev_qty=prev_qty,
                qty_changed=new_qty - prev_qty,
                new_qty=new_qty,
                reference_type="MANUAL",
                reason="Admin updated product stock",
                user_id=current_user.id
            )
    
    db.commit()
    db.refresh(db_product)
    
    db_product.stock_quantity = db_product.stock.quantity if db_product.stock else 0
    return db_product

@router.delete("/{id}")
def delete_product(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Safe soft delete to preserve invoice history!
    db_product.is_active = False
    db.commit()
    return {"message": "Product archived successfully"}

@router.post("/bulk-delete")
def bulk_delete_products(request: schemas.BulkDeleteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    deleted_count = 0
    for product_id in request.ids:
        db_product = db.query(models.Product).filter(models.Product.id == str(product_id)).first()
        if db_product:
            db_product.is_active = False
            deleted_count += 1
            
    db.commit()
    return {"message": f"Successfully archived {deleted_count} products"}

def _set_product_stock(db: Session, db_product: models.Product, quantity: int):
    if quantity < 0:
        raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")

    db_stock = db_product.stock
    if not db_stock:
        db_stock = db.query(models.Stock).filter(models.Stock.product_id == db_product.id).first()
    if not db_stock:
        db_stock = models.Stock(product_id=db_product.id, quantity=quantity)
        db.add(db_stock)
        db_product.stock = db_stock
    else:
        db_stock.quantity = quantity
    return db_stock

@router.put("/{id}/stock", response_model=schemas.ProductResponse)
def update_stock(id: str, stock_update: schemas.StockUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    prev_qty = db_product.stock.quantity if db_product.stock else 0
    new_qty = stock_update.quantity
    db_stock = _set_product_stock(db, db_product, new_qty)

    if prev_qty != new_qty:
        _log_stock_movement(
            db=db,
            product_id=db_product.id,
            movement_type="MANUAL_ADJUSTMENT",
            prev_qty=prev_qty,
            qty_changed=new_qty - prev_qty,
            new_qty=new_qty,
            reference_type="MANUAL",
            reason=stock_update.reason or "Manual stock adjustment",
            user_id=current_user.id
        )

    db.commit()
    db.refresh(db_product)
    
    db_product.stock_quantity = db_stock.quantity
    return db_product
