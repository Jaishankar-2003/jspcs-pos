package com.jspcs.pos.service.inventory;

import java.util.UUID;

public interface IInventoryService {
    void adjustStock(UUID productId, int quantity, String reason, String movementType, UUID userId);

    boolean hasSufficientStock(UUID productId, int quantity);
}
