package com.jspcs.pos.repository;

import com.jspcs.pos.entity.sales.SalesInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, UUID> {
    Optional<SalesInvoice> findByInvoiceNumber(String invoiceNumber);

    boolean existsByInvoiceNumber(String invoiceNumber);
}
