package com.jspcs.pos.controller.sales;

import com.jspcs.pos.entity.sales.Refund;
import com.jspcs.pos.service.RefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/refunds")
@RequiredArgsConstructor
@Slf4j
public class RefundController {

    private final RefundService refundService;

    @PostMapping
    @PreAuthorize("hasRole('CASHIER') or hasRole('ADMIN')")
    public ResponseEntity<Refund> createRefund(@Valid @RequestBody CreateRefundRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        
        Refund refund = refundService.createRefund(
            request.getOriginalInvoiceId(),
            request.getProductId(),
            request.getQuantity(),
            request.getRefundReason(),
            request.getRefundType(),
            username
        );
        
        return ResponseEntity.ok(refund);
    }

    @PostMapping("/{refundId}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Refund> approveRefund(
            @PathVariable UUID refundId,
            @RequestBody ApproveRefundRequest request) {
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Refund refund = refundService.approveRefund(refundId, username, request.getNotes());
        
        return ResponseEntity.ok(refund);
    }

    @PostMapping("/{refundId}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Refund> rejectRefund(
            @PathVariable UUID refundId,
            @RequestBody RejectRefundRequest request) {
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Refund refund = refundService.rejectRefund(refundId, username, request.getReason());
        
        return ResponseEntity.ok(refund);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Refund>> getPendingRefunds() {
        List<Refund> refunds = refundService.getPendingRefunds();
        return ResponseEntity.ok(refunds);
    }

    @GetMapping("/invoice/{invoiceId}")
    @PreAuthorize("hasRole('CASHIER') or hasRole('ADMIN')")
    public ResponseEntity<List<Refund>> getRefundsByInvoice(@PathVariable UUID invoiceId) {
        List<Refund> refunds = refundService.getRefundsByInvoice(invoiceId);
        return ResponseEntity.ok(refunds);
    }

    @GetMapping("/{refundId}")
    @PreAuthorize("hasRole('CASHIER') or hasRole('ADMIN')")
    public ResponseEntity<Refund> getRefund(@PathVariable UUID refundId) {
        Refund refund = refundService.getRefund(refundId);
        return ResponseEntity.ok(refund);
    }

    // DTOs
    public static class CreateRefundRequest {
        private UUID originalInvoiceId;
        private UUID productId;
        private Integer quantity;
        private String refundReason;
        private Refund.RefundType refundType;

        // Getters and setters
        public UUID getOriginalInvoiceId() { return originalInvoiceId; }
        public void setOriginalInvoiceId(UUID originalInvoiceId) { this.originalInvoiceId = originalInvoiceId; }
        
        public UUID getProductId() { return productId; }
        public void setProductId(UUID productId) { this.productId = productId; }
        
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        
        public String getRefundReason() { return refundReason; }
        public void setRefundReason(String refundReason) { this.refundReason = refundReason; }
        
        public Refund.RefundType getRefundType() { return refundType; }
        public void setRefundType(Refund.RefundType refundType) { this.refundType = refundType; }
    }

    public static class ApproveRefundRequest {
        private String notes;
        
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    public static class RejectRefundRequest {
        private String reason;
        
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
