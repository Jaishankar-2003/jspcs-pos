from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import (
    auth, products, sales, users, admin, masters, dashboard,
    suppliers, purchases, inventory, returns, shifts, settings, reports
)
import os

# Safe schema initialization and column auto-migrations
init_db()

app = FastAPI(title="JSPCS POS API", description="Comprehensive POS Backend System", version="2.0.0")

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
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(purchases.router, prefix="/api/purchases", tags=["Purchases & Goods Receiving"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory & Ledger"])
app.include_router(returns.router, prefix="/api/returns", tags=["Sales Returns & Refunds"])
app.include_router(shifts.router, prefix="/api/shifts", tags=["Cashier Shifts"])
app.include_router(settings.router, prefix="/api/settings", tags=["Store Settings"])
app.include_router(reports.router, prefix="/api/reports", tags=["Analytics & Reports"])

@app.get("/")
def root():
    return {"message": "Welcome to the JSPCS POS API", "version": "2.0.0"}
