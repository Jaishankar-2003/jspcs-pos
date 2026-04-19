from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user

router = APIRouter()

# Categories
@router.post("/categories", response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(models.Category).filter(models.Category.name == category.name).first()
    if existing:
        return existing
        
    db_category = models.Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/categories", response_model=List[schemas.CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@router.delete("/categories/{id}")
def delete_category(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_category = db.query(models.Category).filter(models.Category.id == id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}

# Units
@router.post("/units", response_model=schemas.UnitResponse)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(models.Unit).filter(models.Unit.name == unit.name).first()
    if existing:
        return existing
        
    db_unit = models.Unit(name=unit.name)
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.get("/units", response_model=List[schemas.UnitResponse])
def list_units(db: Session = Depends(get_db)):
    return db.query(models.Unit).all()

@router.delete("/units/{id}")
def delete_unit(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_unit = db.query(models.Unit).filter(models.Unit.id == id).first()
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
        
    db.delete(db_unit)
    db.commit()
    return {"message": "Unit deleted successfully"}

# Sub-Categories
@router.post("/subcategories", response_model=schemas.SubCategoryResponse)
def create_subcategory(subcat: schemas.SubCategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_subcat = models.SubCategory(name=subcat.name, category_id=subcat.categoryId)
    db.add(db_subcat)
    db.commit()
    db.refresh(db_subcat)
    return db_subcat

@router.get("/subcategories", response_model=List[schemas.SubCategoryResponse])
def list_subcategories(category_id: str = None, db: Session = Depends(get_db)):
    query = db.query(models.SubCategory)
    if category_id:
        query = query.filter(models.SubCategory.category_id == category_id)
    return query.all()

@router.delete("/subcategories/{id}")
def delete_subcategory(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_subcat = db.query(models.SubCategory).filter(models.SubCategory.id == id).first()
    if not db_subcat:
        raise HTTPException(status_code=404, detail="Sub-category not found")
        
    db.delete(db_subcat)
    db.commit()
    return {"message": "Sub-category deleted successfully"}
