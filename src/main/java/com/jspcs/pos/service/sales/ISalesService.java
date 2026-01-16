package com.jspcs.pos.service.sales;

import com.jspcs.pos.dto.request.sales.CreateInvoiceRequest;
import com.jspcs.pos.dto.response.sales.InvoiceResponse;

import java.util.UUID;

public interface ISalesService {
    InvoiceResponse createInvoice(CreateInvoiceRequest request, UUID cashierId);

    InvoiceResponse getInvoice(UUID id);

    InvoiceResponse getInvoiceByNumber(String invoiceNumber);
    // Page<InvoiceResponse> listInvoices(Pageable pageable); // Skipping Page for
    // brevity, can add later
}
