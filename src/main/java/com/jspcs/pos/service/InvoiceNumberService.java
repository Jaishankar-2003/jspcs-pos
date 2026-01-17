package com.jspcs.pos.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceNumberService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public String generateNextInvoiceNumber() {
        try {
            LocalDate today = LocalDate.now();
            String datePrefix = today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            
            // Get the next sequence number
            String sql = "SELECT nextval('invoice_number_seq')";
            Long sequenceNumber = jdbcTemplate.queryForObject(sql, Long.class);
            
            // Format: INV-YYYYMMDD-NNNN (e.g., INV-20240117-0001)
            String invoiceNumber = String.format("INV-%s-%04d", datePrefix, sequenceNumber);
            
            log.info("Generated invoice number: {}", invoiceNumber);
            return invoiceNumber;
            
        } catch (Exception e) {
            log.error("Error generating invoice number", e);
            throw new RuntimeException("Failed to generate invoice number", e);
        }
    }

    @Transactional
    public String generateNextInvoiceNumber(String prefix) {
        try {
            LocalDate today = LocalDate.now();
            String datePrefix = today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            
            // Get the next sequence number
            String sql = "SELECT nextval('invoice_number_seq')";
            Long sequenceNumber = jdbcTemplate.queryForObject(sql, Long.class);
            
            // Format: PREFIX-YYYYMMDD-NNNN (e.g., CASH-20240117-0001)
            String invoiceNumber = String.format("%s-%s-%04d", prefix, datePrefix, sequenceNumber);
            
            log.info("Generated invoice number: {}", invoiceNumber);
            return invoiceNumber;
            
        } catch (Exception e) {
            log.error("Error generating invoice number with prefix: {}", prefix, e);
            throw new RuntimeException("Failed to generate invoice number", e);
        }
    }

    public Long getCurrentSequenceValue() {
        try {
            String sql = "SELECT last_value FROM invoice_number_seq";
            return jdbcTemplate.queryForObject(sql, Long.class);
        } catch (Exception e) {
            log.warn("Could not get current sequence value, returning 0");
            return 0L;
        }
    }

    @Transactional
    public void resetSequence(long newValue) {
        try {
            String sql = "ALTER SEQUENCE invoice_number_seq RESTART WITH ?";
            jdbcTemplate.update(sql, newValue);
            log.info("Reset invoice number sequence to: {}", newValue);
        } catch (Exception e) {
            log.error("Error resetting invoice sequence", e);
            throw new RuntimeException("Failed to reset invoice sequence", e);
        }
    }
}
