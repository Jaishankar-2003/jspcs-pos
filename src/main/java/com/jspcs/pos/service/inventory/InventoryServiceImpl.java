package com.jspcs.pos.service.inventory;

import com.jspcs.pos.dto.request.inventory.StockAdjustmentRequest;
import com.jspcs.pos.dto.response.inventory.InventoryResponse;
import com.jspcs.pos.entity.product.Inventory;
import com.jspcs.pos.exception.model.EntityNotFoundException;
import com.jspcs.pos.repository.InventoryRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements IInventoryService {

    private final InventoryRepository inventoryRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public List<InventoryResponse> getAllInventory() {
        return inventoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryResponse getInventoryByProductId(UUID productId) {
        Inventory inventory = inventoryRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for product ID: " + productId));
        return mapToResponse(inventory);
    }

    @Override
    @Transactional
    public InventoryResponse adjustStock(UUID productId, StockAdjustmentRequest request) {
        Inventory inventory = inventoryRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for product ID: " + productId));

        inventory.setCurrentStock(inventory.getCurrentStock() + request.getQuantity());
        inventory.setLastMovementAt(LocalDateTime.now());

        inventory = inventoryRepository.save(inventory);
        entityManager.flush();
        entityManager.refresh(inventory);

        return mapToResponse(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasSufficientStock(UUID productId, Integer quantity) {
        Inventory inventory = inventoryRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for product ID: " + productId));
        return inventory.getCurrentStock() >= quantity;
    }

    @Override
    @Transactional
    public void adjustStock(UUID productId, Integer quantity, String reason, String type, UUID userId) {
        Inventory inventory = inventoryRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for product ID: " + productId));

        if ("OUT".equals(type)) {
            inventory.setCurrentStock(inventory.getCurrentStock() - quantity);
        } else {
            inventory.setCurrentStock(inventory.getCurrentStock() + quantity);
        }
        inventory.setLastMovementAt(LocalDateTime.now());
        // In a real app, we would also create a StockMovement record here.
        inventoryRepository.save(inventory);
    }

    private InventoryResponse mapToResponse(Inventory inventory) {
        return InventoryResponse.builder()
                .productId(inventory.getId())
                .productName(inventory.getProduct().getName())
                .sku(inventory.getProduct().getSku())
                .currentStock(inventory.getCurrentStock())
                .reservedStock(inventory.getReservedStock())
                .availableStock(inventory.getAvailableStock())
                .lastMovementAt(inventory.getLastMovementAt())
                .build();
    }
}
