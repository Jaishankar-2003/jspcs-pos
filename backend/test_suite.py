import unittest
import asyncio
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, init_db
from app import models, schemas
from app.routes import auth, products, suppliers, purchases, sales, returns, shifts, reports

class TestJSPCSPOS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_auth_login(self):
        # Test admin login
        req = schemas.LoginRequest(username="admin", password="admin123")
        res = asyncio.run(auth.login(req, self.db))
        self.assertIn("token", res)
        self.assertEqual(res["role"], "ADMIN")
        self.assertEqual(res["username"], "admin")

        # Test cashier login
        req2 = schemas.LoginRequest(username="cashier", password="cashier123")
        res2 = asyncio.run(auth.login(req2, self.db))
        self.assertEqual(res2["role"], "CASHIER")

    def test_02_product_and_stock_ledger(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()
        sku = f"TEST-PROD-{models.generate_uuid()[:5].upper()}"
        p_create = schemas.ProductCreate(
            sku=sku,
            name="Basmati Rice 5kg",
            category="Grocery",
            sellingPrice=Decimal("450.00"),
            costPrice=Decimal("380.00"),
            currentStock=20
        )
        prod = products.create_product(p_create, self.db, admin_user)
        self.assertEqual(prod.sku, sku)
        self.assertEqual(prod.stock.quantity, 20)

        # Verify Opening Stock movement was logged
        movement = self.db.query(models.StockMovement).filter(
            models.StockMovement.product_id == prod.id,
            models.StockMovement.movement_type == "OPENING_STOCK"
        ).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.new_quantity, 20)

    def test_03_supplier_and_purchase_workflow(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()
        
        # 1. Create Supplier
        sup_name = f"Apex Foods {models.generate_uuid()[:4]}"
        sup_create = schemas.SupplierCreate(name=sup_name, phone="9876543210", email="sales@apex.com")
        supplier = suppliers.create_supplier(sup_create, self.db, admin_user)
        self.assertEqual(supplier.name, sup_name)

        # 2. Create Product
        p_create = schemas.ProductCreate(
            sku=f"SUGAR-{models.generate_uuid()[:4]}",
            name="White Sugar 1kg",
            category="Grocery",
            sellingPrice=Decimal("50.00"),
            costPrice=Decimal("40.00"),
            currentStock=0
        )
        sugar = products.create_product(p_create, self.db, admin_user)
        self.assertEqual(sugar.stock.quantity, 0)

        # 3. Create Purchase Order (Draft/Ordered)
        p_order = schemas.PurchaseCreate(
            supplierId=supplier.id,
            items=[
                schemas.PurchaseItemCreate(
                    productId=sugar.id,
                    orderedQuantity=50,
                    unitCost=Decimal("40.00"),
                    batchNumber="BATCH-001",
                    expiryDate=datetime.now(timezone.utc) + timedelta(days=180)
                )
            ]
        )
        purchase = purchases.create_purchase(p_order, self.db, admin_user)
        self.assertEqual(purchase["status"], "ORDERED")

        # Crucial check: Stock must NOT increase upon order creation!
        self.db.refresh(sugar.stock)
        self.assertEqual(sugar.stock.quantity, 0)

        # 4. Receive Goods (Partial + Damaged)
        receive_req = schemas.PurchaseReceiveRequest(
            items=[
                schemas.PurchaseReceiveItem(
                    itemId=purchase["items"][0]["id"],
                    receivedQuantity=30,
                    damagedQuantity=2,
                    batchNumber="BATCH-001",
                    expiryDate=datetime.now(timezone.utc) + timedelta(days=180)
                )
            ]
        )
        received_purchase = purchases.receive_purchase_goods(str(purchase["id"]), receive_req, self.db, admin_user)
        self.assertEqual(received_purchase["status"], "PARTIALLY_RECEIVED")

        # Crucial check: Stock increases ONLY by confirmed received quantity (30), NOT damaged!
        self.db.refresh(sugar.stock)
        self.assertEqual(sugar.stock.quantity, 30)

        # Verify ledger
        rcvd_movement = self.db.query(models.StockMovement).filter(
            models.StockMovement.product_id == sugar.id,
            models.StockMovement.movement_type == "PURCHASE_RECEIVED"
        ).first()
        self.assertIsNotNone(rcvd_movement)
        self.assertEqual(rcvd_movement.quantity_changed, 30)

    def test_04_cashier_shift_workflow(self):
        cashier = self.db.query(models.User).filter(models.User.username == "cashier").first()

        # Open shift
        open_req = schemas.ShiftOpenRequest(openingCash=Decimal("1000.00"), notes="Morning Shift")
        shift = shifts.open_shift(open_req, self.db, cashier)
        self.assertEqual(shift["status"], "OPEN")
        self.assertEqual(shift["openingCash"], Decimal("1000.00"))

        # Close shift with actual cash
        close_req = schemas.ShiftCloseRequest(actualCash=Decimal("1000.00"), notes="Closed cleanly")
        closed_shift = shifts.close_shift(close_req, self.db, cashier)
        self.assertEqual(closed_shift["status"], "CLOSED")
        self.assertEqual(closed_shift["cashDifference"], Decimal("0.00"))

    def test_05_checkout_and_sales_returns(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()

        # Create product with 10 units
        prod = products.create_product(
            schemas.ProductCreate(
                sku=f"OIL-{models.generate_uuid()[:4]}",
                name="Sunflower Oil 1L",
                sellingPrice=Decimal("150.00"),
                costPrice=Decimal("120.00"),
                currentStock=10
            ),
            self.db,
            admin_user
        )

        # Checkout 3 units
        checkout_req = schemas.CheckoutRequest(
            items=[schemas.CartItem(productId=prod.id, quantity=3)],
            customerName="John Doe",
            paymentMode="CASH"
        )
        res = asyncio.run(sales.checkout(checkout_req, self.db, admin_user))
        self.assertIn("invoice_number", res)
        self.assertEqual(res["total_amount"], Decimal("450.00"))

        # Check stock deduction
        self.db.refresh(prod.stock)
        self.assertEqual(prod.stock.quantity, 7)

        # Test Sales Return (Return 1 unit sellable)
        return_req = schemas.SalesReturnCreate(
            saleId=res["sale_id"],
            refundMode="CASH",
            reason="Customer changed mind",
            items=[
                schemas.SalesReturnItemCreate(
                    productId=prod.id,
                    quantity=1,
                    condition="SELLABLE"
                )
            ]
        )
        ret = returns.create_sales_return(return_req, self.db, admin_user)
        self.assertEqual(ret["totalRefundAmount"], Decimal("150.00"))

        # Verify stock incremented back to 8
        self.db.refresh(prod.stock)
        self.assertEqual(prod.stock.quantity, 8)

        # Test invalid return (cannot return more than remaining 2 purchased units)
        bad_return = schemas.SalesReturnCreate(
            saleId=res["sale_id"],
            items=[schemas.SalesReturnItemCreate(productId=prod.id, quantity=5)]
        )
        with self.assertRaises(Exception):
            returns.create_sales_return(bad_return, self.db, admin_user)

    def test_06_reports_cogs_and_profit(self):
        admin_user = self.db.query(models.User).filter(models.User.username == "admin").first()
        summary = reports.get_reports_summary("all", None, None, self.db, admin_user)
        self.assertIn("totalRevenue", summary)
        self.assertIn("totalCOGS", summary)
        self.assertIn("grossProfit", summary)
        self.assertGreaterEqual(summary["totalTransactions"], 1)

if __name__ == "__main__":
    unittest.main()

