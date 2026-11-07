from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os
from datetime import datetime, timedelta
from decimal import Decimal

def generate_invoice_pdf(sale, items, cashier_name=None):
    date_str = datetime.now().strftime("%Y-%m-%d")
    folder_path = os.path.join("invoices", date_str)
    os.makedirs(folder_path, exist_ok=True)
    
    filename = os.path.join(folder_path, f"invoice_{sale.id}.pdf")
    
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 40, "JSPCS POS - TAX INVOICE")
    
    # IST conversion (UTC + 5:30)
    created_at = sale.created_at
    if created_at is None:
        created_at = datetime.utcnow()
    ist_time = created_at + timedelta(hours=5, minutes=30)
    
    inv_number = getattr(sale, 'invoice_number', None) or f"INV-{str(sale.id)[:8].upper()}"
    
    c.setFont("Helvetica", 9)
    c.drawString(40, height - 60, f"Invoice #: {inv_number}")
    c.drawString(40, height - 73, f"Date/Time (IST): {ist_time.strftime('%Y-%m-%d %H:%M:%S')}")
    c.drawString(40, height - 86, f"Cashier: @{cashier_name or sale.cashier_id or 'admin'}")
    c.drawString(320, height - 60, f"Customer: {sale.customer_name or 'Walk-in'}")
    c.drawString(320, height - 73, f"Payment Mode: {sale.payment_mode or 'CASH'}")
    
    # Table Header
    y = height - 110
    c.setFont("Helvetica-Bold", 8)
    c.drawString(40, y, "Item / Product")
    c.drawString(180, y, "HSN")
    c.drawString(230, y, "Qty")
    c.drawString(265, y, "Rate")
    c.drawString(315, y, "Taxable")
    c.drawString(370, y, "GST %")
    c.drawString(420, y, "CGST+SGST")
    c.drawString(500, y, "Total")
    
    c.setLineWidth(0.5)
    c.line(40, y - 4, 570, y - 4)
    
    # Items
    y -= 18
    c.setFont("Helvetica", 8)
    for item in items:
        if isinstance(item, dict):
            product_name = item.get("product_name") or "Product"
            hsn = item.get("hsn_code") or "-"
            qty = item.get("quantity", 0)
            rate = float(item.get("unit_price", 0))
            taxable = float(item.get("subtotal", 0))
            tax = float(item.get("tax_amount", 0) or item.get("tax", 0))
            line_total = float(item.get("final_amount", 0) or (taxable + tax))
            gst_pct = float(item.get("gst_rate", 0))
        else:
            product_name = getattr(item, 'product_name', None) or (item.product.name if hasattr(item, 'product') and item.product else 'Product')
            hsn = getattr(item, 'hsn_code', None) or (item.product.hsn_code if hasattr(item, 'product') and item.product else '-') or '-'
            qty = item.quantity
            rate = float(item.unit_price)
            taxable = float(item.subtotal)
            tax = float(getattr(item, 'tax_amount', 0) or 0)
            line_total = taxable + tax
            
            # Determine GST %
            gst_pct = 0.0
            if hasattr(item, 'product') and item.product and item.product.gst_rate:
                gst_pct = float(item.product.gst_rate)
            elif taxable > 0:
                gst_pct = round((tax / taxable) * 100, 1)

        c.drawString(40, y, str(product_name)[:25])
        c.drawString(180, y, str(hsn)[:10])
        c.drawString(230, y, str(qty))
        c.drawString(265, y, f"{rate:.2f}")
        c.drawString(315, y, f"{taxable:.2f}")
        c.drawString(370, y, f"{gst_pct:.1f}%")
        c.drawString(420, y, f"{tax:.2f}")
        c.drawString(500, y, f"{line_total:.2f}")
        
        y -= 14
        if y < 80:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 8)
            
    # Footer Summary
    c.line(40, y, 570, y)
    y -= 16
    
    subtotal_val = float(sale.subtotal or sale.total_amount)
    disc_val = float(getattr(sale, 'discount_amount', 0) or 0)
    cgst_val = float(getattr(sale, 'cgst_amount', 0) or 0)
    sgst_val = float(getattr(sale, 'sgst_amount', 0) or 0)
    igst_val = float(getattr(sale, 'igst_amount', 0) or 0)
    total_val = float(sale.total_amount)
    
    c.setFont("Helvetica", 8)
    c.drawString(340, y, "Taxable Subtotal:")
    c.drawRightString(550, y, f"{subtotal_val:.2f}")
    y -= 12
    
    if disc_val > 0:
        c.drawString(340, y, "Total Discount:")
        c.drawRightString(550, y, f"-{disc_val:.2f}")
        y -= 12
        
    if cgst_val > 0 or sgst_val > 0:
        c.drawString(340, y, "Total CGST:")
        c.drawRightString(550, y, f"{cgst_val:.2f}")
        y -= 12
        c.drawString(340, y, "Total SGST:")
        c.drawRightString(550, y, f"{sgst_val:.2f}")
        y -= 12
        
    if igst_val > 0:
        c.drawString(340, y, "Total IGST:")
        c.drawRightString(550, y, f"{igst_val:.2f}")
        y -= 12
        
    c.line(340, y, 570, y)
    y -= 14
    c.setFont("Helvetica-Bold", 10)
    c.drawString(340, y, "Grand Total (INR):")
    c.drawRightString(550, y, f"Rs. {total_val:.2f}")
    
    c.save()
    return filename
