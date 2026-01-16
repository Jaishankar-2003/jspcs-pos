package com.jspcs.pos.dto.response.sales;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {
    private UUID id;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private LocalTime invoiceTime;
    private String cashierName;
    private String counterName;
    private String customerName;
    private String customerPhone;

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxableAmount;
    private BigDecimal totalTaxAmount;
    private BigDecimal roundOff;
    private BigDecimal grandTotal;

    private String paymentStatus;
    private List<InvoiceItemResponse> items;
}
