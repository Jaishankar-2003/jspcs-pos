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

@router.post("/products", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_product = models.Product(
        sku=product.sku,
        barcode=product.barcode,
        name=product.name,
        category=product.category,
        brand=product.brand,
        unit_of_measure=product.unitOfMeasure,
        price=product.sellingPrice,
        gst_rate=product.gstRate,
        hsn_code=product.hsnCode,
        is_taxable=product.isTaxable,
        low_stock_threshold=product.low_stock_threshold
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Initialize stock
    db_stock = models.Stock(product_id=db_product.id, quantity=product.currentStock)
    db.add(db_stock)
    db.commit()
    
    db_product.stock_quantity = product.currentStock
    return db_product

@router.post("/products/bulk")
async def bulk_upload_products(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    count = 0
    errors = []
    
    for row in reader:
        try:
            # Check if SKU already exists
            sku = row.get('sku')
            if not sku:
                continue
                
            existing = db.query(models.Product).filter(models.Product.sku == sku).first()
            if existing:
                errors.append(f"SKU {sku} already exists")
                continue
                
            db_product = models.Product(
                sku=sku,
                name=row.get('name', 'Unknown'),
                category=row.get('category', ''),
                brand=row.get('brand', ''),
                unit_of_measure=row.get('unitOfMeasure', 'unit'),
                price=Decimal(row.get('sellingPrice', '0')),
                gst_rate=Decimal(row.get('gstRate', '0')),
                hsn_code=row.get('hsnCode', ''),
                is_taxable=row.get('isTaxable', 'true').lower() == 'true',
                low_stock_threshold=int(row.get('lowStockThreshold', '10'))
            )
            db.add(db_product)
            db.flush()
            
            db_stock = models.Stock(product_id=db_product.id, quantity=int(row.get('currentStock', '0')))
            db.add(db_stock)
            count += 1
        except Exception as e:
            errors.append(f"Error processing {row.get('sku')}: {str(e)}")
            
    db.commit()
    return {"message": f"Successfully imported {count} products", "errors": errors}

@router.get("/products", response_model=List[schemas.ProductResponse])
def list_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    results = []
    for p in products:
        p.stock_quantity = p.stock.quantity if p.stock else 0
        results.append(p)
    return results

@router.get("/products/{id}", response_model=schemas.ProductResponse)
def get_product(id: str, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db_product.stock_quantity = db_product.stock.quantity if db_product.stock else 0
    return db_product

@router.put("/products/{id}", response_model=schemas.ProductResponse)
def update_product(id: str, product_update: schemas.ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product_update.name is not None:
        db_product.name = product_update.name
    if product_update.sellingPrice is not None:
        db_product.price = product_update.sellingPrice
    if product_update.low_stock_threshold is not None:
        db_product.low_stock_threshold = product_update.low_stock_threshold
    if product_update.is_active is not None:
        db_product.is_active = product_update.is_active
    
    db.commit()
    db.refresh(db_product)
    
    db_product.stock_quantity = db_product.stock.quantity if db_product.stock else 0
    return db_product

@router.delete("/products/{id}")
def delete_product(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}

@router.put("/products/{id}/stock", response_model=schemas.ProductResponse)
def update_stock(id: str, stock_update: schemas.StockUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_stock = db.query(models.Stock).filter(models.Stock.product_id == id).first()
    if not db_stock:
        raise HTTPException(status_code=404, detail="Stock record not found")
    
    db_stock.quantity = stock_update.quantity
    db.commit()
    
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    db_product.stock_quantity = db_stock.quantity
    return db_product
