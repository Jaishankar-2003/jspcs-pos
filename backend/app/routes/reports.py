from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app import models
from app.routes.auth import get_current_user
from decimal import Decimal
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/summary")
def get_reports_summary(
    range_type: str = "all", # "today", "week", "month", "custom"
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can view analytics reports")

    now = datetime.now(timezone.utc)
    query = db.query(models.Sale)
    returns_query = db.query(models.SalesReturn)

    if range_type == "today":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(models.Sale.created_at >= today_start)
        returns_query = returns_query.filter(models.SalesReturn.created_at >= today_start)
    elif range_type == "week":
        week_start = now - timedelta(days=7)
        query = query.filter(models.Sale.created_at >= week_start)
        returns_query = returns_query.filter(models.SalesReturn.created_at >= week_start)
    elif range_type == "month":
        month_start = now - timedelta(days=30)
        query = query.filter(models.Sale.created_at >= month_start)
        returns_query = returns_query.filter(models.SalesReturn.created_at >= month_start)
    elif range_type == "custom" and start_date and end_date:
        query = query.filter(
            models.Sale.created_at >= start_date,
            models.Sale.created_at <= end_date
        )
        returns_query = returns_query.filter(
            models.SalesReturn.created_at >= start_date,
            models.SalesReturn.created_at <= end_date
        )

    sales = query.all()
    returns = returns_query.all()

    gross_revenue = Decimal("0.00")
    total_cogs = Decimal("0.00")
    gross_tax = Decimal("0.00")
    total_discount = Decimal("0.00")
    total_transactions = len(sales)

    category_sales_map = {}
    product_sales_map = {}

    for s in sales:
        gross_revenue += s.total_amount
        gross_tax += s.tax_amount or Decimal("0.00")
        total_discount += s.discount_amount or Decimal("0.00")

        for item in s.items:
            unit_cost = item.unit_cost if item.unit_cost and item.unit_cost > 0 else (item.product.cost_price if item.product and item.product.cost_price else Decimal("0.00"))
            line_cogs = unit_cost * item.quantity
            total_cogs += line_cogs

            # Category aggregation
            cat = item.product.category if item.product and item.product.category else "General"
            category_sales_map[cat] = category_sales_map.get(cat, Decimal("0.00")) + item.subtotal

            # Product aggregation
            p_name = item.product.name if item.product else "Item"
            if p_name not in product_sales_map:
                product_sales_map[p_name] = {"quantity": 0, "revenue": Decimal("0.00")}
            product_sales_map[p_name]["quantity"] += item.quantity
            product_sales_map[p_name]["revenue"] += item.subtotal

    # Reconcile Sales Returns, Reversals, and Damaged Losses
    total_refunds = Decimal("0.00")
    tax_reversed = Decimal("0.00")
    cogs_reversed = Decimal("0.00")
    damaged_goods_loss = Decimal("0.00")

    for r in returns:
        total_refunds += r.total_refund_amount or Decimal("0.00")
        for r_item in r.items:
            item_tax_rev = r_item.tax_amount or Decimal("0.00")
            tax_reversed += item_tax_rev
            u_cost = r_item.unit_cost if r_item.unit_cost and r_item.unit_cost > 0 else (
                r_item.product.cost_price if r_item.product and r_item.product.cost_price else Decimal("0.00")
            )
            line_cost = u_cost * r_item.quantity
            if (r_item.condition or "SELLABLE").upper() == "SELLABLE":
                cogs_reversed += line_cost
            else:
                damaged_goods_loss += line_cost

            # Net impact on top categories and products
            cat = r_item.product.category if r_item.product and r_item.product.category else "General"
            if cat in category_sales_map:
                category_sales_map[cat] = max(Decimal("0.00"), category_sales_map[cat] - (r_item.refund_subtotal or Decimal("0.00")))

            p_name = r_item.product.name if r_item.product else "Item"
            if p_name in product_sales_map:
                product_sales_map[p_name]["quantity"] = max(0, product_sales_map[p_name]["quantity"] - r_item.quantity)
                product_sales_map[p_name]["revenue"] = max(Decimal("0.00"), product_sales_map[p_name]["revenue"] - (r_item.refund_subtotal or Decimal("0.00")))

    net_revenue = max(Decimal("0.00"), gross_revenue - total_refunds)
    net_tax = max(Decimal("0.00"), gross_tax - tax_reversed)
    net_cogs = max(Decimal("0.00"), total_cogs - cogs_reversed)
    gross_profit = net_revenue - net_tax - net_cogs - damaged_goods_loss
    avg_ticket = (net_revenue / total_transactions).quantize(Decimal("0.01")) if total_transactions > 0 else Decimal("0.00")
    profit_margin = ((gross_profit / net_revenue) * 100).quantize(Decimal("0.1")) if net_revenue > 0 else Decimal("0.0")

    # Format top categories
    sorted_categories = sorted(category_sales_map.items(), key=lambda x: x[1], reverse=True)[:5]
    total_cat_sales = sum(c[1] for c in sorted_categories) or Decimal("1.00")
    top_categories = [
        {
            "name": name,
            "revenue": float(val),
            "percentage": float(((val / total_cat_sales) * 100).quantize(Decimal("0.1")))
        }
        for name, val in sorted_categories
    ]

    # Format top products
    sorted_products = sorted(product_sales_map.items(), key=lambda x: x[1]["revenue"], reverse=True)[:5]
    top_products = [
        {
            "name": name,
            "unitsSold": data["quantity"],
            "revenue": float(data["revenue"])
        }
        for name, data in sorted_products
    ]

    # Identify slow-moving products
    active_products = db.query(models.Product).filter(models.Product.is_active == True).all()
    slow_moving = []
    for p in active_products:
        sold_info = product_sales_map.get(p.name)
        if not sold_info or sold_info["quantity"] <= 2:
            slow_moving.append({
                "productId": p.id,
                "name": p.name,
                "currentStock": p.stock.quantity if p.stock else 0,
                "unitsSold": sold_info["quantity"] if sold_info else 0
            })

    return {
        "rangeType": range_type,
        "totalRevenue": net_revenue,
        "grossRevenue": gross_revenue,
        "salesReturns": total_refunds,
        "netRevenue": net_revenue,
        "totalTransactions": total_transactions,
        "averageTicket": avg_ticket,
        "totalCOGS": net_cogs,
        "grossCOGS": total_cogs,
        "cogsReversed": cogs_reversed,
        "netCOGS": net_cogs,
        "damagedGoodsLoss": damaged_goods_loss,
        "grossProfit": gross_profit,
        "profitMarginPercent": profit_margin,
        "totalTax": net_tax,
        "grossTax": gross_tax,
        "taxReversed": tax_reversed,
        "netTax": net_tax,
        "totalDiscount": total_discount,
        "topCategories": top_categories,
        "topProducts": top_products,
        "slowMovingCount": len(slow_moving),
        "slowMovingSample": slow_moving[:10]
    }

