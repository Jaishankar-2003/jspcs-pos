from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.routes.auth import get_current_user
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import os
import shutil

router = APIRouter()

UPLOAD_DIR = "uploads/purchases"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def format_purchase_response(p: models.Purchase) -> dict:
    items = []
    for item in p.items:
        items.append({
            "id": item.id,
            "productId": item.product_id,
            "productName": item.product.name if item.product else "Unknown Product",
            "productSku": item.product.sku if item.product else None,
            "purchaseUnit": item.purchase_unit or "Unit",
            "conversionFactor": item.conversion_factor or Decimal("1.0"),
            "baseUnit": item.base_unit or getattr(item.product, 'unit_of_measure', None) or "Unit",
            "purchaseQuantity": item.purchase_quantity if item.purchase_quantity is not None else (Decimal(str(item.ordered_quantity)) / (item.conversion_factor or Decimal("1.0")) if (item.conversion_factor and item.conversion_factor > 1) else Decimal(str(item.ordered_quantity))),
            "purchaseUnitPrice": item.purchase_unit_price if item.purchase_unit_price is not None else ((item.unit_cost or Decimal("0.00")) * (item.conversion_factor or Decimal("1.0"))),
            "convertedQuantity": item.converted_quantity,
            "orderedQuantity": item.ordered_quantity,
            "receivedQuantity": item.received_quantity or 0,
            "damagedQuantity": item.damaged_quantity or 0,
            "unitCost": item.unit_cost,
            "taxRate": item.tax_rate or Decimal("0.00"),
            "taxType": item.tax_type or "TAXABLE",
            "isInclusive": item.is_inclusive if item.is_inclusive is not None else False,
            "taxableAmount": item.taxable_amount or Decimal("0.00"),
            "cgstAmount": item.cgst_amount or Decimal("0.00"),
            "sgstAmount": item.sgst_amount or Decimal("0.00"),
            "igstAmount": item.igst_amount or Decimal("0.00"),
            "discountPercent": item.discount_percent or Decimal("0.00"),
            "discountAmount": item.discount_amount or Decimal("0.00"),
            "additionalCharges": item.additional_charges or Decimal("0.00"),
            "lineTotal": item.line_total,
            "batchNumber": item.batch_number,
            "expiryDate": item.expiry_date
        })

    attachments_count = len(p.attachments) if p.attachments else 0

    return {
        "id": p.id,
        "purchaseNumber": p.purchase_number,
        "supplierId": p.supplier_id,
        "supplierName": p.supplier.name if p.supplier else "Unknown Supplier",
        "status": p.status,
        "subtotal": p.subtotal or Decimal("0.00"),
        "totalAmount": p.total_amount,
        "taxAmount": p.tax_amount or Decimal("0.00"),
        "cgstAmount": p.cgst_amount or Decimal("0.00"),
        "sgstAmount": p.sgst_amount or Decimal("0.00"),
        "igstAmount": p.igst_amount or Decimal("0.00"),
        "discountAmount": p.discount_amount or Decimal("0.00"),
        "additionalCharges": p.additional_charges or Decimal("0.00"),
        "isInterstate": p.is_interstate or False,
        "supplierInvoiceNumber": p.supplier_invoice_number,
        "supplierInvoiceDate": p.supplier_invoice_date,
        "paymentTerms": p.payment_terms,
        "dueDate": p.due_date,
        "notes": p.notes,
        "createdAt": p.created_at,
        "receivedAt": p.received_at,
        "attachmentsCount": attachments_count,
        "items": items
    }

@router.post("", response_model=schemas.PurchaseResponse)
def create_purchase(
    purchase: schemas.PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can create purchases")

    supplier = db.query(models.Supplier).filter(models.Supplier.id == str(purchase.supplierId)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if not purchase.items:
        raise HTTPException(status_code=400, detail="Purchase order must contain at least one product")

    total_amount = Decimal("0.00")
    total_tax = Decimal("0.00")
    total_cgst = Decimal("0.00")
    total_sgst = Decimal("0.00")
    total_igst = Decimal("0.00")
    total_discount = Decimal("0.00")
    total_subtotal = Decimal("0.00")
    total_additional = Decimal("0.00")

    today_str = datetime.now().strftime("%Y%m%d")
    purchase_num = f"PO-{today_str}-{models.generate_uuid()[:6].upper()}"

    initial_status = purchase.status if purchase.status in ["DRAFT", "ORDERED"] else "ORDERED"

    new_purchase = models.Purchase(
        purchase_number=purchase_num,
        supplier_id=str(purchase.supplierId),
        status=initial_status,
        is_interstate=bool(purchase.isInterstate),
        supplier_invoice_number=purchase.supplierInvoiceNumber,
        supplier_invoice_date=purchase.supplierInvoiceDate,
        payment_terms=purchase.paymentTerms,
        due_date=purchase.dueDate,
        notes=purchase.notes,
        created_by=current_user.id
    )
    db.add(new_purchase)
    db.flush()

    for item in purchase.items:
        db_product = db.query(models.Product).filter(models.Product.id == str(item.productId)).first()
        if not db_product:
            raise HTTPException(status_code=404, detail=f"Product {item.productId} not found")

        conv_factor = Decimal(str(item.conversionFactor or 1.0))
        if conv_factor <= 0:
            conv_factor = Decimal("1.0")

        purchase_unit = item.purchaseUnit or "Unit"
        base_unit = item.baseUnit or getattr(db_product, 'unit_of_measure', None) or "Unit"

        # Calculate quantities:
        if item.purchaseQuantity is not None and item.purchaseQuantity > 0:
            purchase_qty = Decimal(str(item.purchaseQuantity))
            converted_qty = (purchase_qty * conv_factor).quantize(Decimal("0.01"))
            ordered_qty = int(converted_qty)
        elif item.orderedQuantity is not None and item.orderedQuantity > 0:
            ordered_qty = item.orderedQuantity
            converted_qty = Decimal(str(ordered_qty))
            purchase_qty = (converted_qty / conv_factor).quantize(Decimal("0.01"))
        else:
            ordered_qty = 1
            converted_qty = Decimal("1.0")
            purchase_qty = Decimal("1.0")

        # Calculate unit prices:
        if item.purchaseUnitPrice is not None and item.purchaseUnitPrice > 0:
            purchase_unit_price = Decimal(str(item.purchaseUnitPrice))
            unit_cost = (purchase_unit_price / conv_factor).quantize(Decimal("0.01"))
        elif item.unitCost is not None:
            unit_cost = Decimal(str(item.unitCost))
            purchase_unit_price = (unit_cost * conv_factor).quantize(Decimal("0.01"))
        else:
            unit_cost = db_product.cost_price or Decimal("0.00")
            purchase_unit_price = (unit_cost * conv_factor).quantize(Decimal("0.01"))

        # Line financial calculation:
        raw_total = (purchase_qty * purchase_unit_price).quantize(Decimal("0.01"))

        # Discount:
        disc_percent = Decimal(str(item.discountPercent or 0.00))
        if disc_percent > 0:
            disc_amount = (raw_total * disc_percent / Decimal("100.00")).quantize(Decimal("0.01"))
        else:
            disc_amount = Decimal(str(item.discountAmount or 0.00)).quantize(Decimal("0.01"))

        after_discount = raw_total - disc_amount
        if after_discount < 0:
            after_discount = Decimal("0.00")

        tax_rate = Decimal(str(item.taxRate or 0.00))
        is_inclusive = bool(item.isInclusive)
        tax_type = item.taxType or "TAXABLE"
        add_charges = Decimal(str(item.additionalCharges or 0.00)).quantize(Decimal("0.01"))

        if tax_type == "EXEMPT" or tax_rate <= 0:
            taxable_amount = after_discount
            tax_amount = Decimal("0.00")
            line_total = taxable_amount + add_charges
        elif is_inclusive:
            # Inclusive: taxable = after_discount / (1 + tax_rate/100)
            taxable_amount = (after_discount / (Decimal("1.00") + (tax_rate / Decimal("100.00")))).quantize(Decimal("0.01"))
            tax_amount = after_discount - taxable_amount
            line_total = after_discount + add_charges
        else:
            # Exclusive: tax = taxable * tax_rate / 100
            taxable_amount = after_discount
            tax_amount = (taxable_amount * (tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
            line_total = taxable_amount + tax_amount + add_charges

        if new_purchase.is_interstate:
            igst = tax_amount
            cgst = Decimal("0.00")
            sgst = Decimal("0.00")
        else:
            igst = Decimal("0.00")
            cgst = (tax_amount / Decimal("2.00")).quantize(Decimal("0.01"))
            sgst = tax_amount - cgst

        total_subtotal += taxable_amount
        total_tax += tax_amount
        total_cgst += cgst
        total_sgst += sgst
        total_igst += igst
        total_discount += disc_amount
        total_additional += add_charges
        total_amount += line_total

        purchase_item = models.PurchaseItem(
            purchase_id=new_purchase.id,
            product_id=db_product.id,
            purchase_unit=purchase_unit,
            conversion_factor=conv_factor,
            base_unit=base_unit,
            purchase_quantity=purchase_qty,
            purchase_unit_price=purchase_unit_price,
            converted_quantity=converted_qty,
            ordered_quantity=ordered_qty,
            received_quantity=0,
            damaged_quantity=0,
            unit_cost=unit_cost,
            tax_rate=tax_rate,
            tax_type=tax_type,
            is_inclusive=is_inclusive,
            taxable_amount=taxable_amount,
            cgst_amount=cgst,
            sgst_amount=sgst,
            igst_amount=igst,
            discount_percent=disc_percent,
            discount_amount=disc_amount,
            additional_charges=add_charges,
            line_total=line_total,
            batch_number=item.batchNumber,
            expiry_date=item.expiryDate
        )
        db.add(purchase_item)

    new_purchase.subtotal = total_subtotal
    new_purchase.total_amount = total_amount
    new_purchase.tax_amount = total_tax
    new_purchase.cgst_amount = total_cgst
    new_purchase.sgst_amount = total_sgst
    new_purchase.igst_amount = total_igst
    new_purchase.discount_amount = total_discount
    new_purchase.additional_charges = total_additional

    # Strict rule: Creating a PO NEVER increases stock or creates product batches
    db.commit()
    db.refresh(new_purchase)
    return format_purchase_response(new_purchase)

@router.put("/{id}/confirm", response_model=schemas.PurchaseResponse)
def confirm_purchase_order(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can confirm purchase orders")

    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if purchase.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Cannot confirm order in {purchase.status} status")

    purchase.status = "ORDERED"
    db.commit()
    db.refresh(purchase)
    return format_purchase_response(purchase)

@router.get("", response_model=List[schemas.PurchaseResponse])
def list_purchases(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Purchase)
    if status and status != "ALL":
        query = query.filter(models.Purchase.status == status)
    purchases = query.order_by(models.Purchase.created_at.desc()).all()
    return [format_purchase_response(p) for p in purchases]

@router.get("/{id}", response_model=schemas.PurchaseResponse)
def get_purchase(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return format_purchase_response(purchase)

@router.post("/{id}/receive", response_model=schemas.PurchaseResponse)
def receive_purchase_goods(
    id: str,
    receive_request: schemas.PurchaseReceiveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can confirm goods receipt")

    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if purchase.status in ["DRAFT", "RECEIVED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot receive goods for purchase in {purchase.status} status")

    items_dict = {str(item.id): item for item in purchase.items}

    today_str = datetime.now().strftime("%Y%m%d")
    grn_number = f"GRN-{today_str}-{models.generate_uuid()[:6].upper()}"

    grn = models.GoodsReceipt(
        grn_number=grn_number,
        purchase_id=purchase.id,
        supplier_invoice_number=receive_request.supplierInvoiceNumber or purchase.supplier_invoice_number,
        supplier_invoice_date=receive_request.supplierInvoiceDate or purchase.supplier_invoice_date,
        invoice_taxable_amount=receive_request.invoiceTaxableAmount or Decimal("0.00"),
        gst_amount=receive_request.gstAmount or Decimal("0.00"),
        cgst_amount=receive_request.cgstAmount or Decimal("0.00"),
        sgst_amount=receive_request.sgstAmount or Decimal("0.00"),
        igst_amount=receive_request.igstAmount or Decimal("0.00"),
        invoice_total=receive_request.invoiceTotal or Decimal("0.00"),
        notes=receive_request.notes,
        status="CONFIRMED",
        created_by=current_user.id
    )
    db.add(grn)
    db.flush()

    for r_item in receive_request.items:
        p_item = items_dict.get(str(r_item.itemId))
        if not p_item:
            raise HTTPException(status_code=400, detail=f"Item {r_item.itemId} not in this purchase order")

        conv_factor = Decimal(str(p_item.conversion_factor or 1.0))
        if conv_factor <= 0:
            conv_factor = Decimal("1.0")

        remaining_base = p_item.ordered_quantity - (p_item.received_quantity or 0) - (p_item.damaged_quantity or 0)

        # Check if multiple batches are provided
        if r_item.batches and len(r_item.batches) > 0:
            batches_to_process = r_item.batches
            total_rcv_purchase = sum(Decimal(str(b.receivedQuantity)) for b in batches_to_process)
            total_acc_purchase = sum(Decimal(str(b.acceptedQuantity)) for b in batches_to_process)
            total_dmg_purchase = sum(Decimal(str(b.damagedQuantity or 0.00)) for b in batches_to_process)
            total_rej_purchase = sum(Decimal(str(b.rejectedQuantity or 0.00)) for b in batches_to_process)

            total_acc_base = int((total_acc_purchase * conv_factor).quantize(Decimal("1")))
            total_dmg_base = int((total_dmg_purchase * conv_factor).quantize(Decimal("1")))

            if (total_acc_base + total_dmg_base) > remaining_base:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot receive {total_acc_base + total_dmg_base} base units for {p_item.product.name}. Max remaining is {remaining_base}."
                )

            # Create GRN Item record
            grn_item = models.GoodsReceiptItem(
                grn_id=grn.id,
                purchase_item_id=p_item.id,
                product_id=p_item.product_id,
                purchase_unit=p_item.purchase_unit or "Unit",
                conversion_factor=conv_factor,
                ordered_quantity=p_item.purchase_quantity or p_item.ordered_quantity,
                received_quantity=total_rcv_purchase,
                accepted_quantity=total_acc_purchase,
                damaged_quantity=total_dmg_purchase,
                rejected_quantity=total_rej_purchase,
                accepted_stock_quantity=Decimal(str(total_acc_base)),
                damaged_stock_quantity=Decimal(str(total_dmg_base)),
                purchase_unit_cost=p_item.purchase_unit_price or p_item.unit_cost,
                base_unit_cost=p_item.unit_cost,
                tax_rate=p_item.tax_rate or Decimal("0.00"),
                tax_amount=(p_item.taxable_amount * (p_item.tax_rate or Decimal("0.00")) / Decimal("100.00")).quantize(Decimal("0.01")),
                line_total=(total_acc_purchase * (p_item.purchase_unit_price or p_item.unit_cost)).quantize(Decimal("0.01"))
            )
            db.add(grn_item)
            db.flush()

            # Process individual batches
            for b in batches_to_process:
                b_rcv = Decimal(str(b.receivedQuantity))
                b_acc = Decimal(str(b.acceptedQuantity))
                b_dmg = Decimal(str(b.damagedQuantity or 0.00))
                b_rej = Decimal(str(b.rejectedQuantity or 0.00))

                b_acc_base = int((b_acc * conv_factor).quantize(Decimal("1")))
                b_dmg_base = int((b_dmg * conv_factor).quantize(Decimal("1")))

                b_cost = Decimal(str(b.purchaseCost)) if b.purchaseCost is not None else (p_item.purchase_unit_price or p_item.unit_cost)
                b_base_cost = (b_cost / conv_factor).quantize(Decimal("0.01")) if b.purchaseCost is not None else p_item.unit_cost

                batch_id = None
                if b_acc_base > 0:
                    exp_date = b.expiryDate or (datetime.now(timezone.utc) + timedelta(days=365))
                    new_batch = models.ProductBatch(
                        product_id=p_item.product_id,
                        batch_number=b.batchNumber,
                        purchase_item_id=p_item.id,
                        grn_id=grn.id,
                        supplier_id=purchase.supplier_id,
                        mfg_date=b.mfgDate,
                        expiry_date=exp_date,
                        cost_price=b_base_cost,
                        selling_price=p_item.product.price,
                        mrp=b.mrp or p_item.product.mrp,
                        initial_quantity=b_acc_base,
                        current_quantity=b_acc_base,
                        is_active=True
                    )
                    db.add(new_batch)
                    db.flush()
                    batch_id = new_batch.id

                    # Update stock and ledger
                    stock_record = db.query(models.Stock).filter(models.Stock.product_id == p_item.product_id).first()
                    if not stock_record:
                        stock_record = models.Stock(product_id=p_item.product_id, quantity=0)
                        db.add(stock_record)

                    prev_stock = stock_record.quantity
                    stock_record.quantity += b_acc_base
                    new_stock = stock_record.quantity

                    movement = models.StockMovement(
                        product_id=p_item.product_id,
                        movement_type="PURCHASE_RECEIVED",
                        previous_quantity=prev_stock,
                        quantity_changed=b_acc_base,
                        new_quantity=new_stock,
                        reference_type="PURCHASE",
                        reference_id=str(purchase.id),
                        reason=f"GRN {grn.grn_number} - Batch {b.batchNumber}",
                        created_by=current_user.id
                    )
                    db.add(movement)

                grn_batch = models.GrnItemBatch(
                    grn_item_id=grn_item.id,
                    batch_id=batch_id,
                    batch_number=b.batchNumber,
                    received_quantity=b_rcv,
                    accepted_quantity=b_acc,
                    damaged_quantity=b_dmg,
                    rejected_quantity=b_rej,
                    converted_accepted_quantity=Decimal(str(b_acc_base)),
                    converted_damaged_quantity=Decimal(str(b_dmg_base)),
                    mfg_date=b.mfgDate,
                    expiry_date=b.expiryDate,
                    purchase_cost=b_cost,
                    base_unit_cost=b_base_cost,
                    mrp=b.mrp,
                    notes=b.notes
                )
                db.add(grn_batch)

                if b_dmg_base > 0:
                    curr_qty = p_item.product.stock.quantity if p_item.product.stock else 0
                    damage_movement = models.StockMovement(
                        product_id=p_item.product_id,
                        movement_type="DAMAGE",
                        previous_quantity=curr_qty,
                        quantity_changed=0,
                        new_quantity=curr_qty,
                        reference_type="PURCHASE",
                        reference_id=str(purchase.id),
                        reason=f"Rejected {b_dmg_base} damaged units in GRN {grn.grn_number} (Batch {b.batchNumber})",
                        created_by=current_user.id
                    )
                    db.add(damage_movement)

        else:
            # Simple receipt without multiple batches
            rcv_qty = Decimal(str(r_item.receivedQuantity))
            dmg_qty = Decimal(str(r_item.damagedQuantity or 0.00))

            if rcv_qty < 0 or dmg_qty < 0:
                raise HTTPException(status_code=400, detail="Received or damaged quantity cannot be negative")

            total_acc_base = int((rcv_qty * conv_factor).quantize(Decimal("1")))
            total_dmg_base = int((dmg_qty * conv_factor).quantize(Decimal("1")))

            if (total_acc_base + total_dmg_base) > remaining_base:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot receive {total_acc_base + total_dmg_base} base units. Max remaining for this item is {remaining_base}."
                )

            total_rcv_purchase = rcv_qty + dmg_qty
            total_acc_purchase = rcv_qty
            total_dmg_purchase = dmg_qty

            grn_item = models.GoodsReceiptItem(
                grn_id=grn.id,
                purchase_item_id=p_item.id,
                product_id=p_item.product_id,
                purchase_unit=p_item.purchase_unit or "Unit",
                conversion_factor=conv_factor,
                ordered_quantity=p_item.purchase_quantity or p_item.ordered_quantity,
                received_quantity=total_rcv_purchase,
                accepted_quantity=total_acc_purchase,
                damaged_quantity=total_dmg_purchase,
                rejected_quantity=0,
                accepted_stock_quantity=Decimal(str(total_acc_base)),
                damaged_stock_quantity=Decimal(str(total_dmg_base)),
                purchase_unit_cost=p_item.purchase_unit_price or p_item.unit_cost,
                base_unit_cost=p_item.unit_cost,
                tax_rate=p_item.tax_rate or Decimal("0.00"),
                tax_amount=(p_item.taxable_amount * (p_item.tax_rate or Decimal("0.00")) / Decimal("100.00")).quantize(Decimal("0.01")),
                line_total=(total_acc_purchase * (p_item.purchase_unit_price or p_item.unit_cost)).quantize(Decimal("0.01"))
            )
            db.add(grn_item)
            db.flush()

            if total_acc_base > 0:
                stock_record = db.query(models.Stock).filter(models.Stock.product_id == p_item.product_id).first()
                if not stock_record:
                    stock_record = models.Stock(product_id=p_item.product_id, quantity=0)
                    db.add(stock_record)

                prev_stock = stock_record.quantity
                stock_record.quantity += total_acc_base
                new_stock = stock_record.quantity

                movement = models.StockMovement(
                    product_id=p_item.product_id,
                    movement_type="PURCHASE_RECEIVED",
                    previous_quantity=prev_stock,
                    quantity_changed=total_acc_base,
                    new_quantity=new_stock,
                    reference_type="PURCHASE",
                    reference_id=str(purchase.id),
                    reason=f"Received PO {purchase.purchase_number}",
                    created_by=current_user.id
                )
                db.add(movement)

                batch_num = r_item.batchNumber or p_item.batch_number
                exp_date = r_item.expiryDate or p_item.expiry_date
                if batch_num and exp_date:
                    effective_selling_price = r_item.sellingPrice if (r_item.sellingPrice is not None and r_item.sellingPrice > 0) else p_item.product.price
                    new_batch = models.ProductBatch(
                        product_id=p_item.product_id,
                        batch_number=batch_num,
                        purchase_item_id=p_item.id,
                        grn_id=grn.id,
                        supplier_id=purchase.supplier_id,
                        expiry_date=exp_date,
                        cost_price=p_item.unit_cost,
                        selling_price=effective_selling_price,
                        mrp=p_item.product.mrp,
                        initial_quantity=total_acc_base,
                        current_quantity=total_acc_base,
                        is_active=True
                    )
                    db.add(new_batch)

            if total_dmg_base > 0:
                curr_qty = p_item.product.stock.quantity if p_item.product.stock else 0
                damage_movement = models.StockMovement(
                    product_id=p_item.product_id,
                    movement_type="DAMAGE",
                    previous_quantity=curr_qty,
                    quantity_changed=0,
                    new_quantity=curr_qty,
                    reference_type="PURCHASE",
                    reference_id=str(purchase.id),
                    reason=f"Rejected {total_dmg_base} damaged units in PO {purchase.purchase_number}",
                    created_by=current_user.id
                )
                db.add(damage_movement)

        # Update optional product catalog pricing if passed
        if r_item.sellingPrice is not None and r_item.sellingPrice > 0:
            p_item.product.price = r_item.sellingPrice
        if r_item.sellingGstRate is not None:
            p_item.product.gst_rate = r_item.sellingGstRate
        if p_item.unit_cost is not None and p_item.unit_cost > 0:
            p_item.product.cost_price = p_item.unit_cost

        # Update purchase item quantities (must be int)
        p_item.received_quantity = int((p_item.received_quantity or 0) + total_acc_base)
        p_item.damaged_quantity = int((p_item.damaged_quantity or 0) + total_dmg_base)

    # Determine final purchase status
    all_fully_received = True
    for item in purchase.items:
        if ((item.received_quantity or 0) + (item.damaged_quantity or 0)) < item.ordered_quantity:
            all_fully_received = False
            break

    purchase.status = "RECEIVED" if all_fully_received else "PARTIALLY_RECEIVED"
    purchase.received_at = datetime.now(timezone.utc)
    if receive_request.supplierInvoiceNumber:
        purchase.supplier_invoice_number = receive_request.supplierInvoiceNumber
    if receive_request.supplierInvoiceDate:
        purchase.supplier_invoice_date = receive_request.supplierInvoiceDate

    db.commit()
    db.refresh(purchase)
    return format_purchase_response(purchase)

@router.put("/{id}/cancel", response_model=schemas.PurchaseResponse)
def cancel_purchase(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can cancel purchases")

    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    if purchase.status in ["PARTIALLY_RECEIVED", "RECEIVED"]:
        raise HTTPException(status_code=400, detail="Cannot cancel purchase with received goods")

    purchase.status = "CANCELLED"
    db.commit()
    db.refresh(purchase)
    return format_purchase_response(purchase)

# --- Attachments Management ---

@router.post("/{id}/attachments", response_model=schemas.PurchaseAttachmentResponse)
def upload_purchase_attachment(
    id: str,
    file: UploadFile = File(...),
    documentCategory: str = Form("OTHER"),
    grnId: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can upload purchase attachments")

    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not permitted. Allowed: {', '.join(allowed_exts)}")

    po_dir = os.path.join(UPLOAD_DIR, str(purchase.id))
    os.makedirs(po_dir, exist_ok=True)

    safe_filename = f"{models.generate_uuid()[:8]}_{file.filename}"
    file_dest = os.path.join(po_dir, safe_filename)

    with open(file_dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_dest)

    attachment = models.PurchaseAttachment(
        purchase_id=purchase.id,
        grn_id=grnId if grnId else None,
        filename=file.filename,
        file_path=file_dest,
        file_type=file.content_type or ext.replace(".", ""),
        file_size=file_size,
        document_category=documentCategory,
        uploaded_by=current_user.id
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "purchaseId": attachment.purchase_id,
        "grnId": attachment.grn_id,
        "filename": attachment.filename,
        "fileType": attachment.file_type,
        "fileSize": attachment.file_size,
        "documentCategory": attachment.document_category,
        "createdAt": attachment.created_at,
        "downloadUrl": f"/api/purchases/attachments/{attachment.id}/download"
    }

@router.get("/{id}/attachments", response_model=List[schemas.PurchaseAttachmentResponse])
def get_purchase_attachments(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    attachments = db.query(models.PurchaseAttachment).filter(models.PurchaseAttachment.purchase_id == purchase.id).order_by(models.PurchaseAttachment.created_at.desc()).all()
    return [{
        "id": a.id,
        "purchaseId": a.purchase_id,
        "grnId": a.grn_id,
        "filename": a.filename,
        "fileType": a.file_type,
        "fileSize": a.file_size,
        "documentCategory": a.document_category,
        "createdAt": a.created_at,
        "downloadUrl": f"/api/purchases/attachments/{a.id}/download"
    } for a in attachments]

@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    attachment = db.query(models.PurchaseAttachment).filter(models.PurchaseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="Attachment file not found on disk")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.filename,
        media_type=attachment.file_type or "application/octet-stream"
    )

@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can delete attachments")

    attachment = db.query(models.PurchaseAttachment).filter(models.PurchaseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if os.path.exists(attachment.file_path):
        try:
            os.remove(attachment.file_path)
        except Exception:
            pass

    db.delete(attachment)
    db.commit()
    return {"message": "Attachment deleted successfully"}

# --- Goods Receipts (GRN) Details Retrieval ---

@router.get("/{id}/grns")
def get_purchase_grns(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    grns = db.query(models.GoodsReceipt).filter(models.GoodsReceipt.purchase_id == purchase.id).order_by(models.GoodsReceipt.created_at.desc()).all()
    results = []
    for g in grns:
        items = []
        for it in g.items:
            batches = []
            for b in it.batches:
                batches.append({
                    "id": b.id,
                    "batchNumber": b.batch_number,
                    "receivedQuantity": b.received_quantity,
                    "acceptedQuantity": b.accepted_quantity,
                    "damagedQuantity": b.damaged_quantity,
                    "convertedAcceptedQuantity": b.converted_accepted_quantity,
                    "convertedDamagedQuantity": b.converted_damaged_quantity,
                    "mfgDate": b.mfg_date,
                    "expiryDate": b.expiry_date,
                    "purchaseCost": b.purchase_cost,
                    "baseUnitCost": b.base_unit_cost,
                    "mrp": b.mrp,
                    "notes": b.notes
                })
            items.append({
                "id": it.id,
                "productId": it.product_id,
                "productName": it.product.name if it.product else "Unknown",
                "purchaseUnit": it.purchase_unit,
                "conversionFactor": it.conversion_factor,
                "orderedQuantity": it.ordered_quantity,
                "receivedQuantity": it.received_quantity,
                "acceptedQuantity": it.accepted_quantity,
                "damagedQuantity": it.damaged_quantity,
                "acceptedStockQuantity": it.accepted_stock_quantity,
                "damagedStockQuantity": it.damaged_stock_quantity,
                "purchaseUnitCost": it.purchase_unit_cost,
                "baseUnitCost": it.base_unit_cost,
                "taxRate": it.tax_rate,
                "lineTotal": it.line_total,
                "batches": batches
            })
        results.append({
            "id": g.id,
            "grnNumber": g.grn_number,
            "receivedDate": g.received_date,
            "supplierInvoiceNumber": g.supplier_invoice_number,
            "supplierInvoiceDate": g.supplier_invoice_date,
            "invoiceTaxableAmount": g.invoice_taxable_amount,
            "gstAmount": g.gst_amount,
            "cgstAmount": g.cgst_amount,
            "sgstAmount": g.sgst_amount,
            "igstAmount": g.igst_amount,
            "invoiceTotal": g.invoice_total,
            "notes": g.notes,
            "status": g.status,
            "createdAt": g.created_at,
            "items": items
        })
    return results
