import unittest
import asyncio
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from app.database import SessionLocal, init_db
from app import models, schemas
from app.routes import auth, products, suppliers, purchases, sales, returns, shifts, reports, dashboard, inventory
from app.services.gst_service import calculate_item_gst, calculate_return_proportional_tax

class TestJSPCSPOS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def _ensure_active_shift(self, user: models.User, float_amount: Decimal = Decimal("1000.00")) -> models.CashierShift:
        """Helper to ensure a user has an active open shift."""
        shift = self.db.query(models.CashierShift).filter(
            models.CashierShift.cashier_id == user.id,
            models.CashierShift.status == "OPEN"
        ).first()
        if not shift:
            open_req = schemas.ShiftOpenRequest(openingCash=float_amount, notes="Test Suite Shift")
            res = shifts.open_shift(open_req, self.db, user)
            shift = self.db.query(models.CashierShift).filter(models.CashierShift.id == res["id"]).first()
        return shift

    def _close_active_shift(self, user: models.User):
        """Helper to cleanly close any open shift for a user."""
        open_shifts = self.db.query(models.CashierShift).filter(
            models.CashierShift.cashier_id == user.id,
            models.CashierShift.status == "OPEN"
        ).all()
        for s in open_shifts:
            s.status = "CLOSED"
            s.closing_cash_actual = s.opening_cash
            s.closed_at = datetime.now(timezone.utc)
        self.db.commit()

    def test_01_auth_login(self):
        # Admin login
        req = schemas.LoginRequest(username="admin", password="admin123")
        res = asyncio.run(auth.login(req, self.db))
        self.assertIn("token", res)
        self.assertEqual(res["role"], "ADMIN")
        self.assertEqual(res["username"], "admin")

        # Cashier login
        req2 = schemas.LoginRequest(username="cashier", password="cashier123")
        res2 = asyncio.run(auth.login(req2, self.db))
        self.assertIn("token", res2)
        self.assertEqual(res2["role"], "CASHIER")

    def test_02_product_pricing_and_validation(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        # Rejection of negative selling price
        with self.assertRaises(HTTPException) as ctx:
            products.create_product(
                schemas.ProductCreate(
                    sku=f"NEG-{models.generate_uuid()[:4]}",
                    name="Negative Item",
                    sellingPrice=Decimal("-10.00"),
                    costPrice=Decimal("5.00")
                ),
                self.db,
                admin_user
            )
        self.assertEqual(ctx.exception.status_code, 400)

        # Rejection of negative cost price
        with self.assertRaises(HTTPException) as ctx2:
            products.create_product(
                schemas.ProductCreate(
                    sku=f"NEGCOST-{models.generate_uuid()[:4]}",
                    name="Negative Cost Item",
                    sellingPrice=Decimal("20.00"),
                    costPrice=Decimal("-5.00")
                ),
                self.db,
                admin_user
            )
        self.assertEqual(ctx2.exception.status_code, 400)

        # Valid product with low stock threshold
        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"RICE-{models.generate_uuid()[:4]}",
                name="Basmati Rice 1kg",
                category="Groceries",
                sellingPrice=Decimal("120.00"),
                costPrice=Decimal("90.00"),
                gstRate=Decimal("5.00"),
                low_stock_threshold=15,
                currentStock=50
            ),
            self.db,
            admin_user
        )
        self.assertEqual(prod.price, Decimal("120.00"))
        self.assertEqual(prod.cost_price, Decimal("90.00"))
        self.assertEqual(prod.gst_rate, Decimal("5.00"))
        self.assertEqual(prod.low_stock_threshold, 15)
        self.assertEqual(prod.stock.quantity, 50)

    def test_03_scenario1_shift_opening_and_duplicate_prevention(self):
        cashier = self.db.query(models.User).filter(models.User.username == "cashier").first()
        self._close_active_shift(cashier)

        # Shift Opening
        open_req = schemas.ShiftOpenRequest(openingCash=Decimal("1500.00"), notes="Morning Shift")
        shift = shifts.open_shift(open_req, self.db, cashier)
        self.assertEqual(shift["status"], "OPEN")
        self.assertEqual(shift["openingCash"], Decimal("1500.00"))

        # Duplicate Shift Opening Prevention
        with self.assertRaises(HTTPException) as ctx:
            shifts.open_shift(open_req, self.db, cashier)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already have an active open shift", ctx.exception.detail)

        self._close_active_shift(cashier)

    def test_04_scenario2_block_billing_without_active_shift(self):
        cashier = self.db.query(models.User).filter(models.User.username == "cashier").first()
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        # Ensure no active shift
        self._close_active_shift(cashier)

        # Create a product to attempt checkout
        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"BLOCK-{models.generate_uuid()[:4]}",
                name="Test Block Product",
                sellingPrice=Decimal("50.00"),
                costPrice=Decimal("30.00"),
                currentStock=10
            ),
            self.db,
            admin_user
        )

        checkout_req = schemas.CheckoutRequest(
            items=[schemas.CartItem(productId=prod.id, quantity=1)],
            customerName="Walk-in",
            paymentMode="CASH"
        )

        # Must raise 400 when attempting checkout without active cashier shift
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(sales.checkout(checkout_req, self.db, cashier))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Cannot complete sale without an active cashier shift", ctx.exception.detail)

    def test_05_scenario3_normal_checkout_with_active_shift_and_stock(self):
        cashier = self.db.query(models.User).filter(models.User.username == "cashier").first()
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        self._ensure_active_shift(cashier, Decimal("1000.00"))

        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"SOAP-{models.generate_uuid()[:4]}",
                name="Herbal Soap 100g",
                sellingPrice=Decimal("40.00"),
                costPrice=Decimal("25.00"),
                gstRate=Decimal("0.00"),
                currentStock=20
            ),
            self.db,
            admin_user
        )

        checkout_req = schemas.CheckoutRequest(
            items=[schemas.CartItem(productId=prod.id, quantity=4)],
            customerName="Customer A",
            paymentMode="CASH"
        )
        res = asyncio.run(sales.checkout(checkout_req, self.db, cashier))
        self.assertIn("invoice_number", res)
        self.assertEqual(res["total_amount"], Decimal("160.00"))

        # Verify stock deduction
        self.db.refresh(prod.stock)
        self.assertEqual(prod.stock.quantity, 16)

        # Verify ledger movement recorded
        movement = self.db.query(models.StockMovement).filter(
            models.StockMovement.product_id == prod.id,
            models.StockMovement.movement_type == "SALE"
        ).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity_changed, -4)
        self.assertEqual(movement.new_quantity, 16)

    def test_06_scenario4_sellable_product_return(self):
        cashier = self.db.query(models.User).filter(models.User.username == "cashier").first()
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        self._ensure_active_shift(cashier, Decimal("1000.00"))

        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"SHAMPOO-{models.generate_uuid()[:4]}",
                name="Silk Shampoo 200ml",
                sellingPrice=Decimal("100.00"),
                costPrice=Decimal("70.00"),
                gstRate=Decimal("18.00"),
                currentStock=10
            ),
            self.db,
            admin_user
        )

        # Sale: 2 units (Subtotal = 200, Tax 18% = 36, Total = 236)
        checkout_req = schemas.CheckoutRequest(
            items=[schemas.CartItem(productId=prod.id, quantity=2)],
            customerName="Customer B",
            paymentMode="CASH"
        )
        sale_res = asyncio.run(sales.checkout(checkout_req, self.db, cashier))
        self.assertEqual(sale_res["total_amount"], Decimal("236.00"))

        self.db.refresh(prod.stock)
        self.assertEqual(prod.stock.quantity, 8)

        # Sellable Return: 1 unit returned in sellable condition
        ret_req = schemas.SalesReturnCreate(
            saleId=sale_res["sale_id"],
            refundMode="CASH",
            reason="Unopened, customer surplus",
            items=[schemas.SalesReturnItemCreate(
                productId=prod.id,
                quantity=1,
                condition="SELLABLE"
            )]
        )
        ret_res = asyncio.run(returns.create_sales_return(ret_req, self.db, cashier))
        self.assertEqual(ret_res["totalRefundAmount"], Decimal("100.00"))

        # Verify sellable inventory restocked
        self.db.refresh(prod.stock)
        self.assertEqual(prod.stock.quantity, 9)

        # Verify return item stored historical cost snapshot and proportional tax
        ret_item = self.db.query(models.SalesReturnItem).filter(models.SalesReturnItem.return_id == ret_res["id"]).first()
        self.assertEqual(ret_item.unit_cost, Decimal("70.00"))
        self.assertEqual(ret_item.tax_amount, Decimal("18.00")) # 36 total / 2 items = 18

    def test_07_scenario5_damaged_product_return(self):
        cashier = self.db.query(models.User).filter(models.User.username == "cashier").first()
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        self._ensure_active_shift(cashier, Decimal("1000.00"))

        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"GLASS-{models.generate_uuid()[:4]}",
                name="Glass Jar 500ml",
                sellingPrice=Decimal("80.00"),
                costPrice=Decimal("50.00"),
                gstRate=Decimal("0.00"),
                currentStock=10
            ),
            self.db,
            admin_user
        )

        checkout_req = schemas.CheckoutRequest(
            items=[schemas.CartItem(productId=prod.id, quantity=2)],
            customerName="Customer C",
            paymentMode="CASH"
        )
        sale_res = asyncio.run(sales.checkout(checkout_req, self.db, cashier))

        self.db.refresh(prod.stock)
        self.assertEqual(prod.stock.quantity, 8)

        # Damaged Return: 1 unit returned damaged/broken
        ret_req = schemas.SalesReturnCreate(
            saleId=sale_res["sale_id"],
            refundMode="CASH",
            reason="Jar cracked",
            items=[schemas.SalesReturnItemCreate(
                productId=prod.id,
                quantity=1,
                condition="DAMAGED"
            )]
        )
        ret_res = asyncio.run(returns.create_sales_return(ret_req, self.db, cashier))

        # Verify sellable inventory NOT restocked (must remain 8)
        self.db.refresh(prod.stock)
        self.assertEqual(prod.stock.quantity, 8)

        # Verify ledger movement recorded as DAMAGE quarantine
        movement = self.db.query(models.StockMovement).filter(
            models.StockMovement.reference_id == ret_res["id"],
            models.StockMovement.movement_type == "DAMAGE"
        ).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity_changed, 0) # Sellable stock unaffected

    def test_08_scenario6_partial_returns_and_limits(self):
        cashier = self.db.query(models.User).filter(models.User.username == "cashier").first()
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        self._ensure_active_shift(cashier, Decimal("1000.00"))

        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"PEN-{models.generate_uuid()[:4]}",
                name="Gel Pen Pack",
                sellingPrice=Decimal("50.00"),
                costPrice=Decimal("30.00"),
                currentStock=20
            ),
            self.db,
            admin_user
        )

        # Sale: 5 units
        sale_res = asyncio.run(sales.checkout(
            schemas.CheckoutRequest(
                items=[schemas.CartItem(productId=prod.id, quantity=5)],
                customerName="Customer D",
                paymentMode="CASH"
            ),
            self.db,
            cashier
        ))

        # First Partial Return: 2 units
        asyncio.run(returns.create_sales_return(
            schemas.SalesReturnCreate(
                saleId=sale_res["sale_id"],
                items=[schemas.SalesReturnItemCreate(productId=prod.id, quantity=2, condition="SELLABLE")]
            ),
            self.db,
            cashier
        ))

        # Second Partial Return: 2 units (Total returned so far = 4)
        asyncio.run(returns.create_sales_return(
            schemas.SalesReturnCreate(
                saleId=sale_res["sale_id"],
                items=[schemas.SalesReturnItemCreate(productId=prod.id, quantity=2, condition="SELLABLE")]
            ),
            self.db,
            cashier
        ))

        # Attempting to return 2 more units (only 1 remaining) must fail with 400
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(returns.create_sales_return(
                schemas.SalesReturnCreate(
                    saleId=sale_res["sale_id"],
                    items=[schemas.SalesReturnItemCreate(productId=prod.id, quantity=2, condition="SELLABLE")]
                ),
                self.db,
                cashier
            ))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Max returnable is 1", ctx.exception.detail)

    def test_09_scenario7_gst_exclusive_calculation(self):
        # 18% GST Exclusive on ₹100
        breakdown = calculate_item_gst(
            unit_price=Decimal("100.00"),
            quantity=1,
            gst_rate=Decimal("18.00"),
            discount_amount=Decimal("0.00"),
            is_inclusive=False,
            is_interstate=False
        )
        self.assertEqual(breakdown.taxable_amount, Decimal("100.00"))
        self.assertEqual(breakdown.tax_amount, Decimal("18.00"))
        self.assertEqual(breakdown.cgst_amount, Decimal("9.00"))
        self.assertEqual(breakdown.sgst_amount, Decimal("9.00"))
        self.assertEqual(breakdown.igst_amount, Decimal("0.00"))
        self.assertEqual(breakdown.line_total, Decimal("118.00"))

    def test_10_scenario8_gst_inclusive_calculation(self):
        # 18% GST Inclusive on ₹118 (Taxable ₹100, Tax ₹18, CGST ₹9, SGST ₹9)
        breakdown = calculate_item_gst(
            unit_price=Decimal("118.00"),
            quantity=1,
            gst_rate=Decimal("18.00"),
            discount_amount=Decimal("0.00"),
            is_inclusive=True,
            is_interstate=False
        )
        self.assertEqual(breakdown.taxable_amount, Decimal("100.00"))
        self.assertEqual(breakdown.tax_amount, Decimal("18.00"))
        self.assertEqual(breakdown.cgst_amount, Decimal("9.00"))
        self.assertEqual(breakdown.sgst_amount, Decimal("9.00"))
        self.assertEqual(breakdown.line_total, Decimal("118.00"))

    def test_11_scenario9_purchase_order_receiving_with_optional_selling_price(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        supplier = suppliers.create_supplier(
            schemas.SupplierCreate(name=f"Supplier-{models.generate_uuid()[:4]}", phone="9988776655"),
            self.db,
            admin_user
        )

        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"PO-TEST-{models.generate_uuid()[:4]}",
                name="PO Test Item",
                sellingPrice=Decimal("200.00"),
                costPrice=Decimal("150.00"),
                gstRate=Decimal("12.00"),
                currentStock=0
            ),
            self.db,
            admin_user
        )

        # Create PO for 10 units at unitCost 140
        po = purchases.create_purchase(
            schemas.PurchaseCreate(
                supplierId=supplier.id,
                items=[schemas.PurchaseItemCreate(
                    productId=prod.id,
                    orderedQuantity=10,
                    unitCost=Decimal("140.00"),
                    taxRate=Decimal("12.00")
                )]
            ),
            self.db,
            admin_user
        )

        po_item_id = po["items"][0]["id"]

        # Case A: Receive 5 units with updated sellingPrice = 220 and sellingGstRate = 18
        purchases.receive_purchase_goods(
            po["id"],
            schemas.PurchaseReceiveRequest(
                items=[schemas.PurchaseReceiveItem(
                    itemId=po_item_id,
                    receivedQuantity=5,
                    sellingPrice=Decimal("220.00"),
                    sellingGstRate=Decimal("18.00")
                )]
            ),
            self.db,
            admin_user
        )
        self.db.refresh(prod)
        self.assertEqual(prod.price, Decimal("220.00"))
        self.assertEqual(prod.gst_rate, Decimal("18.00"))
        self.assertEqual(prod.cost_price, Decimal("140.00"))

        # Case B: Receive remaining 5 units without specifying sellingPrice or sellingGstRate
        purchases.receive_purchase_goods(
            po["id"],
            schemas.PurchaseReceiveRequest(
                items=[schemas.PurchaseReceiveItem(
                    itemId=po_item_id,
                    receivedQuantity=5
                )]
            ),
            self.db,
            admin_user
        )
        self.db.refresh(prod)
        # Verify preserved without overwriting
        self.assertEqual(prod.price, Decimal("220.00"))
        self.assertEqual(prod.gst_rate, Decimal("18.00"))

    def test_12_scenario10_financial_and_dashboard_metric_alignment(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()
        self._ensure_active_shift(admin_user, Decimal("1000.00"))

        # Create product: sellingPrice = 100, costPrice = 60, 0% tax for straightforward math
        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"RECON-{models.generate_uuid()[:4]}",
                name="Reconciliation Item",
                sellingPrice=Decimal("100.00"),
                costPrice=Decimal("60.00"),
                gstRate=Decimal("0.00"),
                currentStock=20
            ),
            self.db,
            admin_user
        )

        # Baseline reports summary
        base_summary = reports.get_reports_summary("all", None, None, self.db, admin_user)
        base_rev = base_summary["totalRevenue"]
        base_profit = base_summary["grossProfit"]

        # Sale: 2 units (₹200)
        sale_res = asyncio.run(sales.checkout(
            schemas.CheckoutRequest(
                items=[schemas.CartItem(productId=prod.id, quantity=2)],
                customerName="Recon Cust",
                paymentMode="CASH"
            ),
            self.db,
            admin_user
        ))
        self.assertEqual(sale_res["total_amount"], Decimal("200.00"))

        # Return 1 unit sellable (₹100 refund)
        ret_res = asyncio.run(returns.create_sales_return(
            schemas.SalesReturnCreate(
                saleId=sale_res["sale_id"],
                refundMode="CASH",
                items=[schemas.SalesReturnItemCreate(productId=prod.id, quantity=1, condition="SELLABLE")]
            ),
            self.db,
            admin_user
        ))
        self.assertEqual(ret_res["totalRefundAmount"], Decimal("100.00"))

        # Re-check Reports Summary
        new_summary = reports.get_reports_summary("all", None, None, self.db, admin_user)

        # Net Revenue increase should be exactly 200 - 100 = 100
        self.assertEqual(new_summary["totalRevenue"] - base_rev, Decimal("100.00"))

        # Verify Dashboard Today Revenue returns the exact net revenue
        dash_res = dashboard.get_revenue_today(self.db)
        self.assertIn("totalRevenue", dash_res)
        self.assertIn("grossRevenue", dash_res)
        self.assertIn("totalRefunds", dash_res)
        # Dashboard Net Revenue must match gross - refunds
        self.assertAlmostEqual(dash_res["totalRevenue"], dash_res["grossRevenue"] - dash_res["totalRefunds"], places=2)

    def test_13_scenario11_supplier_bulk_upload_and_sample_csv(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()
        cashier_user = self.db.query(models.User).filter(models.User.username == "cashier").first()

        # 1. Test sample CSV download
        sample_resp = suppliers.download_sample_csv()
        self.assertEqual(sample_resp.media_type, "text/csv")
        content_str = sample_resp.body.decode("utf-8")
        self.assertIn("supplierName,contactPerson,phoneNumber,email,gstin,address,notes", content_str)
        self.assertIn("Sri Lakshmi Traders,Ramesh Kumar,9000000001,ramesh@lakshmitraders.example,33AAAAA0000A1Z5", content_str)

        # 2. Test non-admin cannot bulk upload
        from fastapi import UploadFile
        import io
        vendor_name = f"Test Vendor Alpha {models.generate_uuid()[:6]}"
        csv_data = (
            'supplierName,contactPerson,phoneNumber,email,gstin,address,notes\n'
            f'{vendor_name},Ramesh Kumar,9000000001,ramesh@testvendor.com,33AAAAA0000A1Z5,"Coimbatore, TN","Wholesale"\n'
        )
        fake_file_cashier = UploadFile(filename="suppliers.csv", file=io.BytesIO(csv_data.encode("utf-8")))
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(suppliers.bulk_upload_suppliers(fake_file_cashier, self.db, cashier_user))
        self.assertEqual(ctx.exception.status_code, 403)

        # 3. Test admin bulk upload
        fake_file_admin = UploadFile(filename="suppliers.csv", file=io.BytesIO(csv_data.encode("utf-8")))
        res = asyncio.run(suppliers.bulk_upload_suppliers(fake_file_admin, self.db, admin_user))
        self.assertEqual(res["count"], 1)
        self.assertEqual(len(res["errors"]), 0)

        # Verify supplier saved in DB
        sup = self.db.query(models.Supplier).filter(models.Supplier.name == vendor_name).first()
        self.assertIsNotNone(sup)
        self.assertEqual(sup.contact_person, "Ramesh Kumar")
        self.assertEqual(sup.phone, "9000000001")
        self.assertEqual(sup.email, "ramesh@testvendor.com")
        self.assertEqual(sup.gstin, "33AAAAA0000A1Z5")
        self.assertEqual(sup.address, "Coimbatore, TN")
        self.assertEqual(sup.notes, "Wholesale")

        # 4. Test duplicate prevention without crash
        dup_file = UploadFile(filename="suppliers.csv", file=io.BytesIO(csv_data.encode("utf-8")))
        dup_res = asyncio.run(suppliers.bulk_upload_suppliers(dup_file, self.db, admin_user))
        self.assertEqual(dup_res["count"], 0)
        self.assertEqual(len(dup_res["errors"]), 1)
        self.assertIn("already exists", dup_res["errors"][0])

    def test_14_mrp_gst_valuation_suite(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()
        self._ensure_active_shift(admin_user)

        # 1. Validation: Selling price cannot exceed MRP
        invalid_p = schemas.ProductCreate(
            sku=f"MRP-ERR-{models.generate_uuid()[:6]}",
            name="Overpriced Item",
            sellingPrice=Decimal("150.00"),
            mrp=Decimal("100.00"),
            costPrice=Decimal("80.00"),
            taxRate=Decimal("18.00"),
            isInclusive=False
        )
        with self.assertRaises(HTTPException) as ctx:
            products.create_product(invalid_p, self.db, admin_user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("cannot exceed", ctx.exception.detail)

        # 2. Validation: Negative MRP rejected
        neg_mrp = schemas.ProductCreate(
            sku=f"NEG-MRP-{models.generate_uuid()[:6]}",
            name="Negative MRP Item",
            sellingPrice=Decimal("50.00"),
            mrp=Decimal("-10.00"),
            costPrice=Decimal("30.00"),
            taxRate=Decimal("5.00"),
            isInclusive=False
        )
        with self.assertRaises(HTTPException) as ctx:
            products.create_product(neg_mrp, self.db, admin_user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("cannot be negative", ctx.exception.detail)

        # 3. Validation: Custom GST split mismatch rejected
        bad_split = schemas.ProductCreate(
            sku=f"GST-BAD-{models.generate_uuid()[:6]}",
            name="Bad Split Item",
            sellingPrice=Decimal("100.00"),
            mrp=Decimal("120.00"),
            costPrice=Decimal("70.00"),
            taxRate=Decimal("18.00"),
            customCgstRate=Decimal("10.00"),
            customSgstRate=Decimal("10.00"), # 10 + 10 = 20 != 18
            isInclusive=False
        )
        with self.assertRaises(HTTPException) as ctx:
            products.create_product(bad_split, self.db, admin_user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("must equal total GST", ctx.exception.detail)

        # 4. Successful creation of GST Exclusive product with MRP
        excl_sku = f"EXCL-{models.generate_uuid()[:6]}"
        excl_prod = schemas.ProductCreate(
            sku=excl_sku,
            name="Basmati Rice 1kg",
            sellingPrice=Decimal("100.00"),
            mrp=Decimal("120.00"),
            costPrice=Decimal("70.00"),
            taxRate=Decimal("5.00"),
            isInclusive=False,
            taxType="TAXABLE",
            unitOfMeasure="KGS",
            currentStock=50
        )
        created_excl = products.create_product(excl_prod, self.db, admin_user)
        self.assertEqual(created_excl.mrp, Decimal("120.00"))
        self.assertEqual(created_excl.price, Decimal("100.00"))
        self.assertFalse(created_excl.is_inclusive)

        # 5. Successful creation of GST Inclusive product with MRP and custom split
        incl_sku = f"INCL-{models.generate_uuid()[:6]}"
        incl_prod = schemas.ProductCreate(
            sku=incl_sku,
            name="Organic Ghee 500ml",
            sellingPrice=Decimal("590.00"), # Taxable = 500, GST 18% = 90
            mrp=Decimal("650.00"),
            costPrice=Decimal("400.00"),
            gstRate=Decimal("18.00"),
            customCgstRate=Decimal("9.00"),
            customSgstRate=Decimal("9.00"),
            isInclusive=True,
            taxType="TAXABLE",
            unitOfMeasure="LTR",
            currentStock=20
        )
        created_incl = products.create_product(incl_prod, self.db, admin_user)
        self.assertEqual(created_incl.mrp, Decimal("650.00"))
        self.assertTrue(created_incl.is_inclusive)

        # 6. Test GST calculation engine (gst_service)
        # GST Exclusive Item: 2 units @ ₹100, 5% GST
        calc_excl = calculate_item_gst(
            unit_price=Decimal("100.00"),
            quantity=2,
            gst_rate=Decimal("5.00"),
            is_inclusive=False,
            discount_amount=Decimal("0.00")
        )
        self.assertEqual(calc_excl.taxable_amount, Decimal("200.00"))
        self.assertEqual(calc_excl.tax_amount, Decimal("10.00"))
        self.assertEqual(calc_excl.cgst_amount, Decimal("5.00"))
        self.assertEqual(calc_excl.sgst_amount, Decimal("5.00"))
        self.assertEqual(calc_excl.igst_amount, Decimal("0.00"))
        self.assertEqual(calc_excl.line_total, Decimal("210.00"))

        # GST Inclusive Item: 1 unit @ ₹590, 18% GST
        calc_incl = calculate_item_gst(
            unit_price=Decimal("590.00"),
            quantity=1,
            gst_rate=Decimal("18.00"),
            is_inclusive=True,
            discount_amount=Decimal("0.00"),
            custom_cgst_rate=Decimal("9.00"),
            custom_sgst_rate=Decimal("9.00")
        )
        self.assertEqual(calc_incl.taxable_amount, Decimal("500.00"))
        self.assertEqual(calc_incl.tax_amount, Decimal("90.00"))
        self.assertEqual(calc_incl.cgst_amount, Decimal("45.00"))
        self.assertEqual(calc_incl.sgst_amount, Decimal("45.00"))
        self.assertEqual(calc_incl.line_total, Decimal("590.00"))

        # Inter-state GST Inclusive Item
        calc_interstate = calculate_item_gst(
            unit_price=Decimal("590.00"),
            quantity=1,
            gst_rate=Decimal("18.00"),
            is_inclusive=True,
            is_interstate=True
        )
        self.assertEqual(calc_interstate.cgst_amount, Decimal("0.00"))
        self.assertEqual(calc_interstate.sgst_amount, Decimal("0.00"))
        self.assertEqual(calc_interstate.igst_amount, Decimal("90.00"))

        # 7. POS Checkout with both Inclusive and Exclusive items
        checkout_req = schemas.CheckoutRequest(
            customerName="Gopal Sharma",
            customerPhone="9876543210",
            paymentMode="CASH",
            isInterstate=False,
            items=[
                schemas.CartItem(productId=created_excl.id, quantity=2),
                schemas.CartItem(productId=created_incl.id, quantity=1)
            ]
        )
        checkout_res = asyncio.run(sales.checkout(checkout_req, self.db, admin_user))
        self.assertIn("invoice_number", checkout_res)
        # Expected total: 210 (excl) + 590 (incl) = 800.00
        self.assertEqual(checkout_res["total_amount"], Decimal("800.00"))

        # Verify sale in database
        sale = self.db.query(models.Sale).filter(models.Sale.id == checkout_res["sale_id"]).first()
        self.assertIsNotNone(sale)
        self.assertEqual(sale.cgst_amount, Decimal("50.00")) # 5 + 45
        self.assertEqual(sale.sgst_amount, Decimal("50.00")) # 5 + 45
        self.assertEqual(sale.tax_amount, Decimal("100.00"))
        self.assertEqual(sale.subtotal, Decimal("700.00")) # 200 + 500
        self.assertEqual(sale.total_amount, Decimal("800.00"))

        # 8. Test Inventory Valuation API
        val = inventory.get_inventory_valuation(self.db, admin_user)
        self.assertIn("totalProducts", val)
        self.assertIn("totalStockUnits", val)
        self.assertIn("costValuation", val)
        self.assertIn("retailValuation", val)
        self.assertIn("potentialGrossProfit", val)
        self.assertIn("unitsBreakdown", val)
        self.assertIn("productValuations", val)
        self.assertGreater(val["totalProducts"], 0)
        self.assertGreater(val["totalStockUnits"], 0)

        # 9. Test PDF Download endpoint
        pdf_res = sales.download_invoice_pdf(sale.id, self.db, admin_user)
        self.assertEqual(pdf_res.media_type, "application/pdf")
        self.assertIn(f"{sale.invoice_number}.pdf", pdf_res.headers["content-disposition"])

    def test_15_advanced_purchase_order_unit_conversion_grn_multibatch(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()
        self.assertIsNotNone(admin_user)

        # 1. Create a supplier
        sup = suppliers.create_supplier(schemas.SupplierCreate(
            name=f"Apex Sweet Wholesale {models.generate_uuid()[:4]}",
            contactPerson="Narayanan",
            phone="9844433322",
            email="narayanan@apexwholesale.example",
            address="Gandhipuram, Coimbatore",
            gstin="33AAAAA0000A1Z5"
        ), self.db, admin_user)

        # 2. Create product with unit Pieces
        prod = products.create_product(schemas.ProductCreate(
            name="Special Badusha",
            sku=f"BADUSHA-{models.generate_uuid()[:4].upper()}",
            category="Sweets",
            unit="Pieces",
            costPrice=Decimal("8.00"),
            sellingPrice=Decimal("15.00"),
            mrp=Decimal("18.00"),
            pricingTaxMode="EXCLUSIVE",
            taxPreference="TAXABLE",
            gstRate=Decimal("5.00")
        ), self.db, admin_user)

        init_stock = self.db.query(models.Stock).filter(models.Stock.product_id == prod.id).first()
        initial_qty = init_stock.quantity if init_stock else 0

        # 3. Create Draft PO with Unit Conversion:
        # 10 Boxes @ ₹500/Box, 50 Pieces per Box -> 500 Pieces total, Base Unit Cost = ₹10.00/Piece
        po_create = schemas.PurchaseCreate(
            supplierId=sup.id,
            status="DRAFT",
            notes="10 Boxes of Badusha, 50 pcs per box",
            items=[
                schemas.PurchaseItemCreate(
                    productId=prod.id,
                    purchaseUnit="Box",
                    conversionFactor=Decimal("50.0"),
                    baseUnit="Pieces",
                    purchaseQuantity=Decimal("10"),
                    purchaseUnitPrice=Decimal("500.00"),
                    taxRate=Decimal("5.00"),
                    isInclusive=False
                )
            ]
        )
        po = purchases.create_purchase(po_create, self.db, admin_user)
        self.assertEqual(po["status"], "DRAFT")
        self.assertEqual(po["items"][0]["orderedQuantity"], 500)
        self.assertEqual(po["items"][0]["purchaseQuantity"], Decimal("10"))
        self.assertEqual(po["items"][0]["conversionFactor"], Decimal("50.0"))
        self.assertEqual(po["items"][0]["unitCost"], Decimal("10.00")) # 500 / 50 = 10.00
        # Taxable amount = 10 * 500 = 5000, 5% tax = 250, total = 5250
        self.assertEqual(po["subtotal"], Decimal("5000.00"))
        self.assertEqual(po["taxAmount"], Decimal("250.00"))
        self.assertEqual(po["totalAmount"], Decimal("5250.00"))

        # Invariant check: Stock must NOT change upon PO creation
        stock_after_po = self.db.query(models.Stock).filter(models.Stock.product_id == prod.id).first()
        self.assertEqual(stock_after_po.quantity if stock_after_po else 0, initial_qty)

        # 4. Confirm PO (DRAFT -> ORDERED)
        confirmed_po = purchases.confirm_purchase_order(str(po["id"]), self.db, admin_user)
        self.assertEqual(confirmed_po["status"], "ORDERED")

        # Invariant check: Stock must STILL NOT change upon PO confirmation
        stock_after_conf = self.db.query(models.Stock).filter(models.Stock.product_id == prod.id).first()
        self.assertEqual(stock_after_conf.quantity if stock_after_conf else 0, initial_qty)

        # 5. Goods Receiving Note (GRN) with Multi-Batch:
        # Total 10 boxes received in 2 batches:
        # Batch BAD-B1: 6 boxes (300 pcs), accepted 6, damaged 0, MRP 18.00
        # Batch BAD-B2: 4 boxes (200 pcs), accepted 3, damaged 1 (50 pcs damaged), MRP 18.00
        po_item_id = confirmed_po["items"][0]["id"]
        grn_req = schemas.PurchaseReceiveRequest(
            supplierInvoiceNumber="INV-APEX-9988",
            supplierInvoiceDate=datetime.now(timezone.utc),
            invoiceTotal=Decimal("5250.00"),
            notes="Received at main warehouse in good condition except 1 box damaged",
            items=[
                schemas.PurchaseReceiveItem(
                    itemId=po_item_id,
                    receivedQuantity=Decimal("10"),
                    batches=[
                        schemas.GrnBatchItem(
                            batchNumber="BAD-B1",
                            receivedQuantity=Decimal("6"),
                            acceptedQuantity=Decimal("6"),
                            damagedQuantity=Decimal("0"),
                            purchaseCost=Decimal("500.00"),
                            mrp=Decimal("18.00"),
                            expiryDate=datetime.now(timezone.utc) + timedelta(days=60)
                        ),
                        schemas.GrnBatchItem(
                            batchNumber="BAD-B2",
                            receivedQuantity=Decimal("4"),
                            acceptedQuantity=Decimal("3"),
                            damagedQuantity=Decimal("1"),
                            purchaseCost=Decimal("500.00"),
                            mrp=Decimal("18.00"),
                            expiryDate=datetime.now(timezone.utc) + timedelta(days=90)
                        )
                    ]
                )
            ]
        )
        received_po = purchases.receive_purchase_goods(str(po["id"]), grn_req, self.db, admin_user)
        self.assertEqual(received_po["status"], "RECEIVED") # 9 accepted (450 pcs) + 1 damaged (50 pcs) = 500 pcs (100% accounted for)
        self.assertEqual(received_po["items"][0]["receivedQuantity"], 450)
        self.assertEqual(received_po["items"][0]["damagedQuantity"], 50)

        # 6. Verify Sellable Stock increases ONLY by accepted base units:
        # 6 accepted boxes * 50 = 300 + 3 accepted boxes * 50 = 150 -> 450 total added!
        stock_after_grn = self.db.query(models.Stock).filter(models.Stock.product_id == prod.id).first()
        self.assertEqual(stock_after_grn.quantity, initial_qty + 450)

        # 7. Verify ProductBatches created in DB
        batch_1 = self.db.query(models.ProductBatch).filter(
            models.ProductBatch.product_id == prod.id,
            models.ProductBatch.batch_number == "BAD-B1"
        ).first()
        self.assertIsNotNone(batch_1)
        self.assertEqual(batch_1.current_quantity, 300)
        self.assertEqual(batch_1.cost_price, Decimal("10.00"))
        self.assertEqual(batch_1.mrp, Decimal("18.00"))

        batch_2 = self.db.query(models.ProductBatch).filter(
            models.ProductBatch.product_id == prod.id,
            models.ProductBatch.batch_number == "BAD-B2"
        ).first()
        self.assertIsNotNone(batch_2)
        self.assertEqual(batch_2.current_quantity, 150)
        self.assertEqual(batch_2.cost_price, Decimal("10.00"))

        # 8. Verify GoodsReceipt and GrnItemBatches records
        grns = purchases.get_purchase_grns(str(po["id"]), self.db, admin_user)
        self.assertEqual(len(grns), 1)
        self.assertEqual(grns[0]["supplierInvoiceNumber"], "INV-APEX-9988")
        self.assertEqual(len(grns[0]["items"][0]["batches"]), 2)
        self.assertEqual(grns[0]["items"][0]["batches"][0]["batchNumber"], "BAD-B1")
        self.assertEqual(grns[0]["items"][0]["batches"][0]["convertedAcceptedQuantity"], 300)
        self.assertEqual(grns[0]["items"][0]["batches"][1]["batchNumber"], "BAD-B2")
        self.assertEqual(grns[0]["items"][0]["batches"][1]["convertedAcceptedQuantity"], 150)
        self.assertEqual(grns[0]["items"][0]["batches"][1]["convertedDamagedQuantity"], 50)

        # 9. Verify Stock Movements recorded: PURCHASE_RECEIVED for 300, 150; and DAMAGE for 50
        movements = self.db.query(models.StockMovement).filter(
            models.StockMovement.product_id == prod.id,
            models.StockMovement.reference_id == str(po["id"])
        ).all()
        m_types = [m.movement_type for m in movements]
        self.assertIn("PURCHASE_RECEIVED", m_types)
        self.assertIn("DAMAGE", m_types)

        # 10. Test PO Attachment upload, list, download, and delete
        from io import BytesIO
        from starlette.datastructures import UploadFile as StarletteUploadFile
        file_bytes = b"%PDF-1.4 sample supplier bill attachment content"
        up_file = StarletteUploadFile(
            filename="supplier_bill.pdf",
            file=BytesIO(file_bytes),
            size=len(file_bytes),
            headers={"content-type": "application/pdf"}
        )
        att = purchases.upload_purchase_attachment(str(po["id"]), up_file, "PURCHASE_INVOICE", None, self.db, admin_user)
        self.assertEqual(att["filename"], "supplier_bill.pdf")
        self.assertEqual(att["documentCategory"], "PURCHASE_INVOICE")

        att_list = purchases.get_purchase_attachments(str(po["id"]), self.db, admin_user)
        self.assertEqual(len(att_list), 1)
        self.assertEqual(att_list[0]["filename"], "supplier_bill.pdf")

        del_res = purchases.delete_attachment(str(att["id"]), self.db, admin_user)
        self.assertEqual(del_res["message"], "Attachment deleted successfully")
        self.assertEqual(len(purchases.get_purchase_attachments(str(po["id"]), self.db, admin_user)), 0)


if __name__ == "__main__":
    unittest.main()
