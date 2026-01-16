package com.jspcs.pos.entity.sales;

import com.jspcs.pos.entity.base.AbstractEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "gst_tax_details")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class GstTaxDetail extends AbstractEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private SalesInvoice invoice;

    @Column(name = "gst_rate", nullable = false)
    private BigDecimal gstRate;

    @Column(name = "taxable_amount", nullable = false)
    private BigDecimal taxableAmount;

    @Column(name = "cgst_amount", nullable = false)
    private BigDecimal cgstAmount;

    @Column(name = "sgst_amount", nullable = false)
    private BigDecimal sgstAmount;

    @Column(name = "igst_amount", nullable = false)
    private BigDecimal igstAmount;

    @Column(name = "total_tax_amount", insertable = false, updatable = false)
    private BigDecimal totalTaxAmount;
}
