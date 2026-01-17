package com.jspcs.pos.entity.sales;

import com.jspcs.pos.entity.base.AuditableEntity;
import com.jspcs.pos.entity.product.Product;
import com.jspcs.pos.entity.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refunds")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Refund extends AuditableEntity {

    @Id
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_invoice_id", nullable = false)
    private SalesInvoice originalInvoice;

    @Column(name = "refund_number", nullable = false, unique = true)
    private String refundNumber;

    @Column(name = "refund_date", nullable = false)
    private LocalDateTime refundDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity_returned", nullable = false)
    private Integer quantityReturned;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "refund_amount", nullable = false)
    private BigDecimal refundAmount;

    @Column(name = "tax_refunded", nullable = false)
    private BigDecimal taxRefunded;

    @Column(name = "refund_reason")
    private String refundReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_type", nullable = false)
    private RefundType refundType;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", nullable = false)
    private RefundStatus refundStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by", nullable = false)
    private User processedBy;

    @Column(name = "notes")
    private String notes;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_phone")
    private String customerPhone;

    public enum RefundType {
        FULL_RETURN,
        PARTIAL_RETURN,
        EXCHANGE,
        DAMAGED_RETURN,
        EXPIRED_RETURN
    }

    public enum RefundStatus {
        PENDING,
        APPROVED,
        REJECTED,
        PROCESSED,
        CANCELLED
    }
}
