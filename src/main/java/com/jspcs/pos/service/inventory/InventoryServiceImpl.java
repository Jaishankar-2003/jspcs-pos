package com.jspcs.pos.service.inventory;

import com.jspcs.pos.entity.product.Product;
import com.jspcs.pos.entity.product.StockMovement;
import com.jspcs.pos.exception.model.EntityNotFoundException;
import com.jspcs.pos.exception.model.InsufficientStockException;
import com.jspcs.pos.repository.InventoryRepository;
import com.jspcs.pos.repository.ProductRepository;
import com.jspcs.pos.repository.StockMovementRepository; // Need this repo, creating on fly or assuming
import com.jspcs.pos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements IInventoryService {

    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void adjustStock(UUID productId, int quantity, String reason, String movementType, UUID userId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));

        // We use StockMovement to trigger the DB trigger
        // 'trigger_update_inventory_on_stock_movement'
        // This handles concurrent updates and history keeping.

        // Need previous stock for the record, but the Trigger validates using NEW
        // stock.
        // Actually the trigger logic:
        // NEW.new_stock = previous + quantity.
        // So we need to calculate new stock or let DB handle it?
        // The trigger 'update_inventory_on_stock_movement' logic:
        /*
         * IF NEW.new_stock < 0 THEN RAISE EXCEPTION ...
         * INSERT INTO inventory ... ON CONFLICT DO UPDATE ...
         */
        // But stock_movements table constraint checks:
        /*
         * new_stock = previous_stock + quantity
         */
        // So I MUST provide correct 'previous_stock' and 'new_stock' in the INSERT
        // statement.
        // This means I must Fetch current inventory first.

        var inventory = product.getInventory();
        int currentStock = inventory != null ? inventory.getCurrentStock() : 0;
        int newStock;

        if ("OUT".equals(movementType) || "sales".equalsIgnoreCase(movementType)) { // rudimentary check
            newStock = currentStock - Math.abs(quantity);
        } else {
            newStock = currentStock + Math.abs(quantity);
        }
        // Actually movement_type logic in constraint:
        // IN, RETURN: new = prev + abs(qty)
        // OUT: new = prev - abs(qty)

        int qty = quantity; // Absolute? No, standard sign usually.
        // Let's standardise: quantity should be positive, movement type dictates sign.
        // But constraint says:
        // movement_type IN ('IN', 'RETURN') AND new_stock = previous_stock +
        // ABS(quantity)
        // movement_type = 'OUT' AND new_stock = previous_stock - ABS(quantity)

        if (newStock < 0) {
            throw new InsufficientStockException("Insufficient stock for product " + product.getSku());
        }

        StockMovement movement = StockMovement.builder()
                .product(product)
                .movementType(movementType)
                .quantity(quantity) // Store signed or unsigned? Constraint says "quantity != 0". Logic uses
                                    // ABS(quantity). So sign doesn't matter for calc, but good for context.
                .previousStock(currentStock)
                .newStock(newStock)
                .reason(reason)
                .createdBy(userId != null ? userRepository.getReferenceById(userId) : null)
                .build();

        stockMovementRepository.save(movement);
    }

    @Override
    public boolean hasSufficientStock(UUID productId, int quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        var inventory = product.getInventory();
        int current = inventory != null ? inventory.getAvailableStock() : 0; // Use available (current - reserved)
        return current >= quantity;
    }
}
