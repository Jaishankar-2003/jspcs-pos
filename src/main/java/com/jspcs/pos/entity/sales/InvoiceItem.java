package com.jspcs.pos.entity.sales;

import com.jspcs.pos.entity.base.AbstractEntity;
import com.jspcs.pos.entity.product.Product;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_items")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceItem extends AbstractEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private SalesInvoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "product_sku", nullable = false)
    private String productSku;

    @Column(name = "product_barcode")
    private String productBarcode;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "discount_percent")
    private BigDecimal discountPercent;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount;

    @Column(name = "line_total", nullable = false)
    private BigDecimal lineTotal;

    @Column(name = "taxable_amount", nullable = false)
    private BigDecimal taxableAmount;

    @Column(name = "gst_rate", nullable = false)
    private BigDecimal gstRate;

    @Column(name = "cgst_amount", nullable = false)
    private BigDecimal cgstAmount;

    @Column(name = "sgst_amount", nullable = false)
    private BigDecimal sgstAmount;

    @Column(name = "igst_amount", nullable = false)
    private BigDecimal igstAmount;

    @Column(name = "total_tax_amount", insertable = false, updatable = false)
    private BigDecimal totalTaxAmount;

    @Column(name = "final_amount", nullable = false)
    private BigDecimal finalAmount;
}
