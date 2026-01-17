package com.jspcs.pos.controller.sales;

import com.jspcs.pos.dto.request.sales.CreateInvoiceRequest;
import com.jspcs.pos.dto.response.sales.InvoiceResponse;
import com.jspcs.pos.service.sales.ISalesService;
import com.jspcs.pos.service.WebSocketService;
import com.jspcs.pos.service.PdfService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
@Slf4j
public class SalesController {

    private final ISalesService salesService;
    private final WebSocketService webSocketService;
    private final PdfService pdfService;

    @PostMapping("/invoices")
    @PreAuthorize("hasRole('CASHIER') or hasRole('ADMIN')")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        InvoiceResponse response = salesService.createInvoiceByUsername(request, username);
        
        // Broadcast real-time update
        webSocketService.broadcastSalesUpdate(response);
        webSocketService.broadcastInvoiceCreated(response);
        
        log.info("Invoice created and broadcasted: {}", response.getInvoiceNumber());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable UUID id) {
        return ResponseEntity.ok(salesService.getInvoice(id));
    }

    @GetMapping("/invoices/number/{number}")
    public ResponseEntity<InvoiceResponse> getInvoiceByNumber(@PathVariable String number) {
        return ResponseEntity.ok(salesService.getInvoiceByNumber(number));
    }

    @GetMapping("/invoices/{id}/pdf")
    @PreAuthorize("hasRole('CASHIER') or hasRole('ADMIN')")
    public ResponseEntity<ByteArrayResource> generateInvoicePdf(@PathVariable UUID id) {
        try {
            InvoiceResponse invoice = salesService.getInvoice(id);
            
            Map<String, Object> pdfData = new HashMap<>();
            pdfData.put("invoice", invoice);
            pdfData.put("items", invoice.getItems());
            
            byte[] pdfBytes = pdfService.generateInvoicePdf(pdfData);
            
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);
            
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, 
                "attachment; filename=invoice_" + invoice.getInvoiceNumber() + ".pdf");
            headers.add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE);
            
            return ResponseEntity.ok()
                .headers(headers)
                .contentLength(pdfBytes.length)
                .body(resource);
                
        } catch (Exception e) {
            log.error("Error generating PDF for invoice: {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
