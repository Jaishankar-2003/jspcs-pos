from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os
from datetime import datetime, timedelta

def generate_invoice_pdf(sale, items, cashier_name=None):
    date_str = datetime.now().strftime("%Y-%m-%d")
    folder_path = os.path.join("invoices", date_str)
    os.makedirs(folder_path, exist_ok=True)
    
    filename = os.path.join(folder_path, f"invoice_{sale.id}.pdf")
    
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "JSPCS POS - INVOICE")
    
    # IST conversion (UTC + 5:30)
    ist_time = sale.created_at + timedelta(hours=5, minutes=30)
    
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, f"Invoice ID: {sale.id}")
    c.drawString(50, height - 85, f"Date/Time (IST): {ist_time.strftime('%Y-%m-%d %H:%M:%S')}")
    c.drawString(50, height - 100, f"Cashier: {cashier_name or sale.cashier_id}")
    c.drawString(50, height - 115, f"Customer: {sale.customer_name or 'Walk-in'}")
    c.drawString(50, height - 130, f"Payment Mode: {sale.payment_mode or 'CASH'}")
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, height - 155, "Product")
    c.drawString(300, height - 155, "Qty")
    c.drawString(350, height - 155, "Price")
    c.drawString(450, height - 155, "Subtotal")
    
    c.line(50, height - 160, 550, height - 160)
    
    # Items
    y = height - 175
    c.setFont("Helvetica", 10)
    for item in items:
        product_name = getattr(item, 'product_name', 'Product')
        c.drawString(50, y, product_name[:40])
        c.drawString(300, y, str(item.quantity))
        c.drawString(350, y, f"{item.unit_price:.2f}")
        c.drawString(450, y, f"{item.subtotal:.2f}")
        y -= 15
        if y < 50:
            c.showPage()
            y = height - 50
            
    # Footer
    c.line(50, y, 550, y)
    y -= 20
    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, y, "Total Amount:")
    c.drawString(450, y, f"{sale.total_amount:.2f}")
    
    c.save()
    return filename
