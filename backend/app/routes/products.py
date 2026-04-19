from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user

router = APIRouter()

def map_product_response(p: models.Product, stock_qty: int):
    return schemas.ProductResponse(
        id=p.id,
        sku=p.sku,
        name=p.name,
        price=p.price,
        low_stock_threshold=p.low_stock_threshold,
        is_active=p.is_active,
        stock_quantity=stock_qty,
        sellingPrice=p.price,
        currentStock=stock_qty,
        availableStock=stock_qty
    )

@router.post("/products", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_product = models.Product(
        sku=product.sku,
        name=product.name,
        price=product.price,
        low_stock_threshold=product.low_stock_threshold
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Initialize stock
    db_stock = models.Stock(product_id=db_product.id, quantity=product.initial_stock)
    db.add(db_stock)
    db.commit()
    
    return map_product_response(db_product, product.initial_stock)

@router.get("/products", response_model=List[schemas.ProductResponse])
def list_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    results = []
    for p in products:
        qty = p.stock.quantity if p.stock else 0
        results.append(map_product_response(p, qty))
    return results

@router.put("/products/{id}", response_model=schemas.ProductResponse)
def update_product(id: str, product_update: schemas.ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for var, value in vars(product_update).items():
        if value is not None:
            setattr(db_product, var, value)
    
    db.commit()
    db.refresh(db_product)
    
    qty = db_product.stock.quantity if db_product.stock else 0
    return map_product_response(db_product, qty)

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
    return map_product_response(db_product, db_stock.quantity)
