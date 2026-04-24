from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, products, sales, users, admin, masters, dashboard
import os

# Create tables (we are using schema.sql in docker, but this ensures they exist if run locally with sqlite)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="JSPCS POS API", description="Simplified POS Backend", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure invoices directory exists
os.makedirs("invoices", exist_ok=True)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(products.router, prefix="/api/products", tags=["Products & Stock"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales & Billing"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(masters.router, prefix="/api/masters", tags=["Master Data"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {"message": "Welcome to the simplified JSPCS POS API"}
