package com.jspcs.pos.controller.inventory;

import com.jspcs.pos.dto.request.inventory.StockAdjustmentRequest;
import com.jspcs.pos.dto.response.inventory.InventoryResponse;
import com.jspcs.pos.service.inventory.IInventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final IInventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<InventoryResponse>> getAllInventory() {
        return ResponseEntity.ok(inventoryService.getAllInventory());
    }

    @GetMapping("/{productId}")
    public ResponseEntity<InventoryResponse> getInventory(@PathVariable UUID productId) {
        return ResponseEntity.ok(inventoryService.getInventoryByProductId(productId));
    }

    @PostMapping("/{productId}/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InventoryResponse> adjustStock(
            @PathVariable UUID productId,
            @Valid @RequestBody StockAdjustmentRequest request) {
        return ResponseEntity.ok(inventoryService.adjustStock(productId, request));
    }
}
