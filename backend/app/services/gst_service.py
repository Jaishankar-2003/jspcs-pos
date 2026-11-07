from decimal import Decimal, ROUND_HALF_UP
from typing import NamedTuple, Optional

class GSTBreakdown(NamedTuple):
    taxable_amount: Decimal
    tax_amount: Decimal
    cgst_rate: Decimal
    cgst_amount: Decimal
    sgst_rate: Decimal
    sgst_amount: Decimal
    igst_rate: Decimal
    igst_amount: Decimal
    line_total: Decimal

TWO_PLACES = Decimal("0.01")

def quantize_money(value: Decimal) -> Decimal:
    """Rounds a decimal value to standard 2 decimal places using ROUND_HALF_UP."""
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

def calculate_item_gst(
    unit_price: Decimal,
    quantity: int,
    gst_rate: Decimal,
    discount_amount: Decimal = Decimal("0.00"),
    is_inclusive: bool = False,
    is_interstate: bool = False,
    is_taxable: bool = True,
    tax_type: str = "TAXABLE",
    custom_cgst_rate: Optional[Decimal] = None,
    custom_sgst_rate: Optional[Decimal] = None
) -> GSTBreakdown:
    """
    Centralized Indian GST engine for POS billing.
    Supports:
    - GST Exclusive and GST Inclusive modes
    - Intra-state (CGST + SGST) vs Inter-state (IGST 100%)
    - Standard predefined rates (0%, 5%, 12%, 18%, 28%) and custom GST rates
    - Tax classifications: TAXABLE, NIL_RATED, EXEMPT, NON_GST
    - Strict Decimal arithmetic with half-up rounding
    - Exact reconciliation (cgst + sgst == total_tax)
    """
    unit_price = Decimal(str(unit_price))
    discount_amount = Decimal(str(discount_amount))
    
    # Check tax classification
    normalized_tax_type = (tax_type or "TAXABLE").upper()
    if normalized_tax_type in ["NIL_RATED", "EXEMPT", "NON_GST"]:
        is_taxable = False

    gst_rate = Decimal(str(gst_rate)) if is_taxable else Decimal("0.00")
    qty = Decimal(quantity)

    gross_amount = unit_price * qty
    net_after_discount = max(Decimal("0.00"), gross_amount - discount_amount)

    if not is_taxable or gst_rate <= Decimal("0.00"):
        taxable_amount = quantize_money(net_after_discount)
        tax_amount = Decimal("0.00")
        line_total = taxable_amount
    elif is_inclusive:
        # Inclusive: net_after_discount includes tax
        # Taxable = net_after_discount / (1 + gst_rate / 100)
        rate_factor = Decimal("1.00") + (gst_rate / Decimal("100.00"))
        taxable_amount = quantize_money(net_after_discount / rate_factor)
        tax_amount = quantize_money(net_after_discount - taxable_amount)
        line_total = quantize_money(net_after_discount)
    else:
        # Exclusive: net_after_discount is taxable amount
        taxable_amount = quantize_money(net_after_discount)
        tax_amount = quantize_money(taxable_amount * (gst_rate / Decimal("100.00")))
        line_total = quantize_money(taxable_amount + tax_amount)

    # Tax Split
    if is_interstate:
        igst_rate = gst_rate
        igst_amount = tax_amount
        cgst_rate = Decimal("0.00")
        cgst_amount = Decimal("0.00")
        sgst_rate = Decimal("0.00")
        sgst_amount = Decimal("0.00")
    else:
        if custom_cgst_rate is not None and custom_sgst_rate is not None and gst_rate > Decimal("0.00"):
            cgst_rate = Decimal(str(custom_cgst_rate))
            sgst_rate = Decimal(str(custom_sgst_rate))
            cgst_amount = quantize_money(tax_amount * (cgst_rate / gst_rate))
            sgst_amount = tax_amount - cgst_amount
        else:
            half_rate = quantize_money(gst_rate / Decimal("2.00"))
            cgst_rate = half_rate
            sgst_rate = half_rate
            cgst_amount = quantize_money(tax_amount / Decimal("2.00"))
            sgst_amount = tax_amount - cgst_amount
        igst_rate = Decimal("0.00")
        igst_amount = Decimal("0.00")

    return GSTBreakdown(
        taxable_amount=taxable_amount,
        tax_amount=tax_amount,
        cgst_rate=cgst_rate,
        cgst_amount=cgst_amount,
        sgst_rate=sgst_rate,
        sgst_amount=sgst_amount,
        igst_rate=igst_rate,
        igst_amount=igst_amount,
        line_total=line_total
    )

def calculate_return_proportional_tax(
    sale_item_tax_amount: Decimal,
    sale_item_quantity: int,
    return_quantity: int
) -> Decimal:
    """
    Computes exact proportional tax reversal from the original sale item snapshot.
    Preserves exact historical consistency without rounding drift.
    """
    if sale_item_quantity <= 0 or return_quantity <= 0:
        return Decimal("0.00")
    sale_item_tax = Decimal(str(sale_item_tax_amount))
    reversed_tax = (sale_item_tax * Decimal(return_quantity)) / Decimal(sale_item_quantity)
    return quantize_money(reversed_tax)

