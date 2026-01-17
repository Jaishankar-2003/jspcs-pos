package com.jspcs.pos.service;

import com.jspcs.pos.entity.sales.Refund;
import com.jspcs.pos.entity.sales.SalesInvoice;
import com.jspcs.pos.entity.product.Product;
import com.jspcs.pos.entity.user.User;
import com.jspcs.pos.repository.RefundRepository;
import com.jspcs.pos.repository.SalesInvoiceRepository;
import com.jspcs.pos.repository.ProductRepository;
import com.jspcs.pos.repository.UserRepository;
import com.jspcs.pos.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundService {

    private final RefundRepository refundRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final WebSocketService webSocketService;
    private final InvoiceNumberService invoiceNumberService;

    @Transactional
    public Refund createRefund(UUID originalInvoiceId, UUID productId, Integer quantity, 
                              String refundReason, Refund.RefundType refundType, 
                              String processedByUsername) {
        
        // Validate original invoice
        SalesInvoice originalInvoice = salesInvoiceRepository.findById(originalInvoiceId)
                .orElseThrow(() -> new RuntimeException("Original invoice not found"));
        
        // Validate product
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        
        // Get processing user
        User processedBy = userRepository.findByUsername(processedByUsername)
                .orElseThrow(() -> new RuntimeException("Processing user not found"));
        
        // Generate refund number
        String refundNumber = generateRefundNumber();
        
        // Calculate refund amounts
        BigDecimal unitPrice = findOriginalUnitPrice(originalInvoice, productId);
        BigDecimal refundAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));
        BigDecimal taxRefunded = calculateTaxRefund(refundAmount, product.getGstRate());
        
        // Create refund
        Refund refund = Refund.builder()
                .id(UUID.randomUUID())
                .originalInvoice(originalInvoice)
                .refundNumber(refundNumber)
                .refundDate(LocalDateTime.now())
                .product(product)
                .quantityReturned(quantity)
                .unitPrice(unitPrice)
                .refundAmount(refundAmount)
                .taxRefunded(taxRefunded)
                .refundReason(refundReason)
                .refundType(refundType)
                .refundStatus(Refund.RefundStatus.PENDING)
                .processedBy(processedBy)
                .customerName(originalInvoice.getCustomerName())
                .customerPhone(originalInvoice.getCustomerPhone())
                .build();
        
        refund = refundRepository.save(refund);
        
        // Broadcast refund notification
        webSocketService.broadcastSystemNotification(Map.of(
            "title", "New Refund Request",
            "message", String.format("Refund %s requested for %s units of %s", 
                refundNumber, quantity, product.getName()),
            "severity", "INFO"
        ));
        
        log.info("Created refund: {} for invoice: {}", refundNumber, originalInvoice.getInvoiceNumber());
        return refund;
    }

    @Transactional
    public Refund approveRefund(UUID refundId, String approvedByUsername, String notes) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));
        
        User approvedBy = userRepository.findByUsername(approvedByUsername)
                .orElseThrow(() -> new RuntimeException("Approving user not found"));
        
        if (refund.getRefundStatus() != Refund.RefundStatus.PENDING) {
            throw new RuntimeException("Refund is not in pending status");
        }
        
        refund.setRefundStatus(Refund.RefundStatus.APPROVED);
        if (notes != null) {
            refund.setNotes(refund.getNotes() + "\nApproved by " + approvedByUsername + ": " + notes);
        }
        
        refund = refundRepository.save(refund);
        
        // Process the refund (update inventory, create stock movement)
        processRefund(refund);
        
        // Broadcast approval
        webSocketService.broadcastSystemNotification(Map.of(
            "title", "Refund Approved",
            "message", String.format("Refund %s has been approved", refund.getRefundNumber()),
            "severity", "SUCCESS"
        ));
        
        log.info("Approved refund: {}", refund.getRefundNumber());
        return refund;
    }

    @Transactional
    public Refund rejectRefund(UUID refundId, String rejectedByUsername, String reason) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));
        
        User rejectedBy = userRepository.findByUsername(rejectedByUsername)
                .orElseThrow(() -> new RuntimeException("Rejecting user not found"));
        
        if (refund.getRefundStatus() != Refund.RefundStatus.PENDING) {
            throw new RuntimeException("Refund is not in pending status");
        }
        
        refund.setRefundStatus(Refund.RefundStatus.REJECTED);
        refund.setNotes(refund.getNotes() + "\nRejected by " + rejectedByUsername + ": " + reason);
        
        refund = refundRepository.save(refund);
        
        // Broadcast rejection
        webSocketService.broadcastSystemNotification(Map.of(
            "title", "Refund Rejected",
            "message", String.format("Refund %s has been rejected: %s", refund.getRefundNumber(), reason),
            "severity", "WARNING"
        ));
        
        log.info("Rejected refund: {} - Reason: {}", refund.getRefundNumber(), reason);
        return refund;
    }

    private void processRefund(Refund refund) {
        // Update inventory (add stock back)
        // This should trigger stock movement creation via the existing inventory service
        
        // Update refund status to processed
        refund.setRefundStatus(Refund.RefundStatus.PROCESSED);
        refundRepository.save(refund);
        
        log.info("Processed refund: {} - Added {} units of {} back to inventory", 
            refund.getRefundNumber(), refund.getQuantityReturned(), refund.getProduct().getName());
    }

    private BigDecimal findOriginalUnitPrice(SalesInvoice invoice, UUID productId) {
        // This would typically query the invoice_items table
        // For simplicity, we'll use the current product price
        Product product = productRepository.findById(productId).orElse(null);
        return product != null ? product.getSellingPrice() : BigDecimal.ZERO;
    }

    private BigDecimal calculateTaxRefund(BigDecimal refundAmount, BigDecimal gstRate) {
        if (gstRate == null || gstRate.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return refundAmount.multiply(gstRate.divide(BigDecimal.valueOf(100)));
    }

    private String generateRefundNumber() {
        return invoiceNumberService.generateNextInvoiceNumber("REF");
    }

    public List<Refund> getPendingRefunds() {
        return refundRepository.findByRefundStatus(Refund.RefundStatus.PENDING);
    }

    public List<Refund> getRefundsByInvoice(UUID invoiceId) {
        return refundRepository.findByOriginalInvoiceId(invoiceId);
    }

    public Refund getRefund(UUID refundId) {
        return refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));
    }
}
