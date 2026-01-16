package com.jspcs.pos.service.inventory;

import com.jspcs.pos.dto.request.inventory.StockAdjustmentRequest;
import com.jspcs.pos.dto.response.inventory.InventoryResponse;

import java.util.List;
import java.util.UUID;

public interface IInventoryService {
    List<InventoryResponse> getAllInventory();

    InventoryResponse getInventoryByProductId(UUID productId);

    InventoryResponse adjustStock(UUID productId, StockAdjustmentRequest request);

    boolean hasSufficientStock(UUID productId, Integer quantity);

    void adjustStock(UUID productId, Integer quantity, String reason, String type, UUID userId);
}
