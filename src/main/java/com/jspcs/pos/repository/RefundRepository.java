package com.jspcs.pos.repository;

import com.jspcs.pos.entity.sales.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRepository extends JpaRepository<Refund, UUID> {
    
    List<Refund> findByRefundStatus(Refund.RefundStatus refundStatus);
    
    List<Refund> findByOriginalInvoiceId(UUID originalInvoiceId);
    
    List<Refund> findByProcessedById(UUID processedById);
    
    List<Refund> findByProductId(UUID productId);
}
