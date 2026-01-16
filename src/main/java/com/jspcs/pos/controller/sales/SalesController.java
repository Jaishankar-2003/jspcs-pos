package com.jspcs.pos.controller.sales;

import com.jspcs.pos.dto.request.sales.CreateInvoiceRequest;
import com.jspcs.pos.dto.response.sales.InvoiceResponse;
import com.jspcs.pos.service.sales.ISalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
public class SalesController {

    private final ISalesService salesService;

    @PostMapping("/invoices")
    @PreAuthorize("hasRole('CASHIER') or hasRole('ADMIN')")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        // We need to find the user by username to get the ID.
        // For simplicity, let's assume we add a method to IUserService for this or use
        // UserRepository if injected.
        // Better yet, update ISalesService to take username instead of UUID if
        // possible,
        // but let's stick to the current service contract and fetch the ID here.

        return ResponseEntity.status(HttpStatus.CREATED).body(salesService.createInvoiceByUsername(request, username));
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable UUID id) {
        return ResponseEntity.ok(salesService.getInvoice(id));
    }

    @GetMapping("/invoices/number/{number}")
    public ResponseEntity<InvoiceResponse> getInvoiceByNumber(@PathVariable String number) {
        return ResponseEntity.ok(salesService.getInvoiceByNumber(number));
    }
}
