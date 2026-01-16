package com.jspcs.pos.dto.request.sales;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvoiceRequest {
    private UUID customerId; // Optional if registered customer
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String customerGstin;

    @NotEmpty(message = "Invoice must have at least one item")
    private List<InvoiceItemRequest> items;

    private String notes;
}
