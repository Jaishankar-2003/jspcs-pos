from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from app.services.invoice_service import generate_invoice_pdf
from app.services.gst_service import calculate_item_gst
from decimal import Decimal
from datetime import datetime, timezone, timedelta, date
from sqlalchemy import func
from app.websocket_manager import manager
import os

router = APIRouter()

def format_sale_response(s: models.Sale) -> dict:
    # Convert UTC to IST for display
    created_at = s.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    ist_time = created_at.astimezone(timezone(timedelta(hours=5, minutes=30)))

    invoice_num = s.invoice_number or f"INV-{s.created_at.strftime('%Y%m%d')}-{s.id[:6].upper()}"
    cashier_username = s.cashier.username if s.cashier else "admin"

    items = []
    for item in s.items:
        product_name = item.product.name if item.product else "Item"
        category = item.product.category if item.product and item.product.category else "General"
        hsn_code = getattr(item.product, "hsn_code", None) if item.product else None
        unit = getattr(item.product, "unit_of_measure", "unit") if item.product else "unit"
        gst_rate = getattr(item.product, "gst_rate", Decimal("0.00")) if item.product else Decimal("0.00")
        mrp = getattr(item.product, "mrp", None) if item.product else None
        items.append({
            "product_id": str(item.product_id),
            "productId": str(item.product_id),
            "product_name": product_name,
            "productName": product_name,
            "category": category,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "unitPrice": item.unit_price,
            "mrp": mrp,
            "hsn_code": hsn_code,
            "hsnCode": hsn_code,
            "unit": unit,
            "unitOfMeasure": unit,
            "gst_rate": gst_rate,
            "gstRate": gst_rate,
            "discount": item.discount_amount or Decimal("0.00"),
            "discountAmount": item.discount_amount or Decimal("0.00"),
            "tax": item.tax_amount or Decimal("0.00"),
            "taxAmount": item.tax_amount or Decimal("0.00"),
            "cgst_amount": item.cgst_amount or Decimal("0.00"),
            "cgstAmount": item.cgst_amount or Decimal("0.00"),
            "sgst_amount": item.sgst_amount or Decimal("0.00"),
            "sgstAmount": item.sgst_amount or Decimal("0.00"),
            "igst_amount": item.igst_amount or Decimal("0.00"),
            "igstAmount": item.igst_amount or Decimal("0.00"),
            "subtotal": item.subtotal,
            "taxableAmount": item.subtotal,
            "finalAmount": item.subtotal + (item.tax_amount or Decimal("0.00")),
            "total": item.subtotal + (item.tax_amount or Decimal("0.00")),
            "batch_number": item.batch.batch_number if item.batch else None
        })

    return {
        "id": s.id,
        "invoiceNumber": invoice_num,
        "cashier_id": s.cashier_id,
        "cashierName": cashier_username,
        "total_amount": s.total_amount,
        "grandTotal": s.total_amount,
        "subtotal": s.subtotal or s.total_amount,
        "totalTaxAmount": s.tax_amount or Decimal("0.00"),
        "cgstAmount": s.cgst_amount or Decimal("0.00"),
        "sgstAmount": s.sgst_amount or Decimal("0.00"),
        "igstAmount": s.igst_amount or Decimal("0.00"),
        "discountAmount": s.discount_amount or Decimal("0.00"),
        "paymentMode": s.payment_mode or "CASH",
        "customerName": s.customer_name or "Walk-in",
        "customerPhone": s.customer_phone,
        "status": "PAID",
        "created_at": s.created_at,
        "invoiceDate": ist_time.strftime("%Y-%m-%d"),
        "invoiceTime": ist_time.strftime("%H:%M:%S"),
        "items": items
    }

@router.post("/invoices", response_model=schemas.CheckoutResponse)
async def checkout(
    request: schemas.CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart cannot be empty")

    now_utc = datetime.now(timezone.utc)
    gross_subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    total_cgst = Decimal("0.00")
    total_sgst = Decimal("0.00")
    total_igst = Decimal("0.00")
    sale_items_data = []

    # Mandatory Check: Cashier must have an active shift to complete billing (Phase 2)
    active_shift = db.query(models.CashierShift).filter(
        models.CashierShift.cashier_id == current_user.id,
        models.CashierShift.status == "OPEN"
    ).first()
    if not active_shift:
        raise HTTPException(
            status_code=400,
            detail="Cannot complete sale without an active cashier shift. Please open your shift first."
        )

    # Process items and lock stock records with_for_update()
    for item in request.items:
        # Lock product & stock row
        db_product = db.query(models.Product).filter(models.Product.id == str(item.product_id)).first()
        if not db_product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # Row-level lock on stock to prevent concurrent checkout overselling
        stock_query = db.query(models.Stock).filter(models.Stock.product_id == db_product.id)
        if db.bind.dialect.name != "sqlite":
            stock_query = stock_query.with_for_update()
        db_stock = stock_query.first()

        current_qty = db_stock.quantity if db_stock else 0
        if current_qty < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{db_product.name}'. Available: {current_qty}, Requested: {item.quantity}"
            )

        unit_price = item.unit_price if item.unit_price is not None else db_product.price
        
        # Item discount validation
        item_discount_percent = item.discount_percent or Decimal("0.00")
        if item_discount_percent > 15 and current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Cashier cannot give more than 15% discount without Admin authorization")
        
        raw_line_total = unit_price * item.quantity
        line_discount = (raw_line_total * item_discount_percent / Decimal("100.00")).quantize(Decimal("0.01"))
        
        # Centralized GST Engine calculation (Phase 6)
        is_incl = getattr(db_product, "is_inclusive", False) or False
        is_inter = bool(request.isInterstate) if hasattr(request, "isInterstate") and request.isInterstate else False
        tax_t = getattr(db_product, "tax_type", "TAXABLE") or "TAXABLE"
        c_cgst = getattr(db_product, "custom_cgst_rate", None)
        c_sgst = getattr(db_product, "custom_sgst_rate", None)

        gst_breakdown = calculate_item_gst(
            unit_price=unit_price,
            quantity=item.quantity,
            gst_rate=db_product.gst_rate or Decimal("0.00"),
            discount_amount=line_discount,
            is_inclusive=is_incl,
            is_interstate=is_inter,
            is_taxable=bool(db_product.is_taxable),
            tax_type=tax_t,
            custom_cgst_rate=c_cgst,
            custom_sgst_rate=c_sgst
        )
        line_tax = gst_breakdown.tax_amount
        line_cgst = gst_breakdown.cgst_amount
        line_sgst = gst_breakdown.sgst_amount
        line_igst = gst_breakdown.igst_amount
        line_subtotal = gst_breakdown.taxable_amount

        total_tax += line_tax
        total_cgst += line_cgst
        total_sgst += line_sgst
        total_igst += line_igst
        gross_subtotal += line_subtotal

        # FEFO Batch Allocation (Feature F)
        allocated_batch = None
        batches = db.query(models.ProductBatch).filter(
            models.ProductBatch.product_id == db_product.id,
            models.ProductBatch.is_active == True,
            models.ProductBatch.current_quantity > 0
        ).order_by(models.ProductBatch.expiry_date.asc()).all()

        for b in batches:
            # Prevent sale of expired batches
            b_exp = b.expiry_date
            if b_exp.tzinfo is None:
                b_exp = b_exp.replace(tzinfo=timezone.utc)
            if b_exp < now_utc:
                continue
            if b.current_quantity >= item.quantity:
                b.current_quantity -= item.quantity
                allocated_batch = b
                break

        sale_items_data.append({
            "product": db_product,
            "stock": db_stock,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "unit_cost": db_product.cost_price or Decimal("0.00"),
            "discount_amount": line_discount,
            "tax_amount": line_tax,
            "cgst_amount": line_cgst,
            "sgst_amount": line_sgst,
            "igst_amount": line_igst,
            "subtotal": line_subtotal,
            "batch": allocated_batch,
            "previous_qty": current_qty
        })

    # Bill-level discount calculation
    bill_discount = request.discountAmount or Decimal("0.00")
    if request.discountPercent and request.discountPercent > 0:
        if request.discountPercent > 15 and current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Cashier cannot give more than 15% overall discount without Admin authorization")
        bill_discount += (gross_subtotal * request.discountPercent / Decimal("100.00")).quantize(Decimal("0.01"))

    total_amount = max(Decimal("0.00"), gross_subtotal - bill_discount + total_tax)

    # Generate sequential-like invoice number
    today_str = datetime.now().strftime("%Y%m%d")
    invoice_num = f"INV-{today_str}-{models.generate_uuid()[:6].upper()}"

    # Create the sale header
    new_sale = models.Sale(
        invoice_number=invoice_num,
        cashier_id=current_user.id,
        shift_id=active_shift.id if active_shift else None,
        total_amount=total_amount,
        subtotal=gross_subtotal,
        tax_amount=total_tax,
        cgst_amount=total_cgst,
        sgst_amount=total_sgst,
        igst_amount=total_igst,
        discount_amount=bill_discount,
        discount_percent=request.discountPercent or Decimal("0.00"),
        discount_reason=request.discountReason,
        payment_mode=request.paymentMode or "CASH",
        customer_name=request.customerName or "Walk-in",
        customer_phone=request.customerPhone,
        notes=request.notes
    )
    db.add(new_sale)
    db.flush()

    final_items_for_pdf = []

    # Process items, deduct inventory stock, and log Stock Movements (Feature C)
    for data in sale_items_data:
        sale_item = models.SaleItem(
            sale_id=new_sale.id,
            product_id=data["product"].id,
            batch_id=data["batch"].id if data["batch"] else None,
            quantity=data["quantity"],
            unit_price=data["unit_price"],
            unit_cost=data["unit_cost"],
            discount_amount=data["discount_amount"],
            tax_amount=data["tax_amount"],
            cgst_amount=data.get("cgst_amount", Decimal("0.00")),
            sgst_amount=data.get("sgst_amount", Decimal("0.00")),
            igst_amount=data.get("igst_amount", Decimal("0.00")),
            subtotal=data["subtotal"]
        )
        db.add(sale_item)

        # Deduct stock
        prev_qty = data["previous_qty"]
        new_qty = prev_qty - data["quantity"]
        data["stock"].quantity = new_qty

        # Ledger Movement record (Feature C)
        movement = models.StockMovement(
            product_id=data["product"].id,
            movement_type="SALE",
            previous_quantity=prev_qty,
            quantity_changed=-data["quantity"],
            new_quantity=new_qty,
            reference_type="SALE",
            reference_id=new_sale.id,
            reason=f"Sale Invoice {invoice_num}",
            created_by=current_user.id
        )
        db.add(movement)

        # Attach product_name for PDF generator
        sale_item.product_name = data["product"].name
        final_items_for_pdf.append(sale_item)

    # Update active shift financials (Feature E)
    if active_shift:
        mode = (request.paymentMode or "CASH").upper()
        if mode == "CASH":
            active_shift.cash_sales = (active_shift.cash_sales or Decimal("0.00")) + total_amount
        elif mode == "CARD":
            active_shift.card_sales = (active_shift.card_sales or Decimal("0.00")) + total_amount
        elif mode == "UPI":
            active_shift.upi_sales = (active_shift.upi_sales or Decimal("0.00")) + total_amount

    db.commit()
    db.refresh(new_sale)

    # Generate PDF Invoice via ReportLab
    invoice_path = generate_invoice_pdf(new_sale, final_items_for_pdf, current_user.full_name or current_user.username)

    # Calculate today's net revenue for WebSocket broadcast
    today = date.today()
    q_s = db.query(func.sum(models.Sale.total_amount)).filter(func.date(models.Sale.created_at) == today)
    q_r = db.query(func.sum(models.SalesReturn.total_refund_amount)).filter(func.date(models.SalesReturn.created_at) == today)
    if manager.last_cleared_timestamp:
        q_s = q_s.filter(models.Sale.created_at >= manager.last_cleared_timestamp)
        q_r = q_r.filter(models.SalesReturn.created_at >= manager.last_cleared_timestamp)
        
    today_net = float(q_s.scalar() or 0) - float(q_r.scalar() or 0)

    await manager.broadcast({
        "type": "INVOICE_CREATED",
        "cashierName": current_user.username,
        "amount": float(total_amount),
        "totalRevenue": max(0.0, float(today_net))
    })

    return {
        "sale_id": new_sale.id,
        "invoice_number": invoice_num,
        "total_amount": total_amount,
        "invoice_path": invoice_path
    }

@router.get("/invoices", response_model=list[schemas.SaleResponse])
def list_sales(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sales = db.query(models.Sale).order_by(models.Sale.created_at.desc()).all()
    return [format_sale_response(s) for s in sales]

@router.get("/invoices/{id}", response_model=schemas.SaleResponse)
def get_sale(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sale = db.query(models.Sale).filter(models.Sale.id == id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return format_sale_response(sale)

@router.get("/invoices/{id}/pdf")
def download_invoice_pdf(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sale = db.query(models.Sale).filter(models.Sale.id == id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    cashier_name = sale.cashier.full_name or sale.cashier.username if sale.cashier else "admin"
    pdf_path = generate_invoice_pdf(sale, sale.items, cashier_name)
    invoice_num = sale.invoice_number or sale.id
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{invoice_num}.pdf")
