package com.jspcs.pos.dto.response.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryResponse {
    private UUID productId;
    private String productName;
    private String sku;
    private Integer currentStock;
    private Integer reservedStock;
    private Integer availableStock;
    private LocalDateTime lastMovementAt;
}
