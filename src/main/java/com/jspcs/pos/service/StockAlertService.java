package com.jspcs.pos.service;

import com.jspcs.pos.entity.product.Inventory;
import com.jspcs.pos.entity.product.Product;
import com.jspcs.pos.repository.InventoryRepository;
import com.jspcs.pos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAlertService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final WebSocketService webSocketService;

    @Scheduled(fixedRate = 60000) // Check every minute
    public void checkStockLevels() {
        try {
            List<Inventory> lowStockItems = findLowStockItems();
            List<Inventory> outOfStockItems = findOutOfStockItems();

            if (!lowStockItems.isEmpty()) {
                lowStockItems.forEach(this::broadcastLowStockAlert);
            }

            if (!outOfStockItems.isEmpty()) {
                outOfStockItems.forEach(this::broadcastOutOfStockAlert);
            }

        } catch (Exception e) {
            log.error("Error checking stock levels", e);
        }
    }

    private List<Inventory> findLowStockItems() {
        return inventoryRepository.findLowStockItems();
    }

    private List<Inventory> findOutOfStockItems() {
        return inventoryRepository.findOutOfStockItems();
    }

    private void broadcastLowStockAlert(Inventory inventory) {
        Product product = inventory.getProduct();
        
        if (product != null && product.getIsActive()) {
            Map<String, Object> alert = createStockAlert(
                    product,
                    inventory.getCurrentStock(),
                    product.getLowStockThreshold(),
                    "LOW_STOCK"
            );
            
            webSocketService.broadcastStockAlert(alert);
            log.warn("Low stock alert for product {}: {} units (threshold: {})",
                    product.getName(), inventory.getCurrentStock(), product.getLowStockThreshold());
        }
    }

    private void broadcastOutOfStockAlert(Inventory inventory) {
        Product product = inventory.getProduct();
        
        if (product != null && product.getIsActive()) {
            Map<String, Object> alert = createStockAlert(
                    product,
                    inventory.getCurrentStock(),
                    product.getLowStockThreshold(),
                    "OUT_OF_STOCK"
            );
            
            webSocketService.broadcastStockAlert(alert);
            log.error("Out of stock alert for product {}: {} units",
                    product.getName(), inventory.getCurrentStock());
        }
    }

    private Map<String, Object> createStockAlert(Product product, int currentStock, int threshold, String alertType) {
        Map<String, Object> alert = new HashMap<>();
        alert.put("productId", product.getId());
        alert.put("productName", product.getName());
        alert.put("productSku", product.getSku());
        alert.put("currentStock", currentStock);
        alert.put("threshold", threshold);
        alert.put("alertType", alertType);
        alert.put("timestamp", LocalDateTime.now());
        alert.put("severity", alertType.equals("OUT_OF_STOCK") ? "CRITICAL" : "WARNING");
        return alert;
    }

    public List<Map<String, Object>> getAllStockAlerts() {
        List<Map<String, Object>> allAlerts = new java.util.ArrayList<>();
        
        // Low stock alerts
        List<Inventory> lowStockItems = findLowStockItems();
        lowStockItems.forEach(inventory -> {
            Product product = inventory.getProduct();
            if (product != null && product.getIsActive()) {
                allAlerts.add(createStockAlert(
                        product,
                        inventory.getCurrentStock(),
                        product.getLowStockThreshold(),
                        "LOW_STOCK"
                ));
            }
        });

        // Out of stock alerts
        List<Inventory> outOfStockItems = findOutOfStockItems();
        outOfStockItems.forEach(inventory -> {
            Product product = inventory.getProduct();
            if (product != null && product.getIsActive()) {
                allAlerts.add(createStockAlert(
                        product,
                        inventory.getCurrentStock(),
                        product.getLowStockThreshold(),
                        "OUT_OF_STOCK"
                ));
            }
        });

        return allAlerts;
    }

    public Map<String, Object> getStockSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        // Total products
        long totalProducts = productRepository.countActiveProducts();
        summary.put("totalProducts", totalProducts);
        
        // Products with stock
        long productsWithStock = inventoryRepository.countProductsWithStock();
        summary.put("productsWithStock", productsWithStock);
        
        // Low stock products
        long lowStockProducts = inventoryRepository.countLowStockProducts();
        summary.put("lowStockProducts", lowStockProducts);
        
        // Out of stock products
        long outOfStockProducts = inventoryRepository.countOutOfStockProducts();
        summary.put("outOfStockProducts", outOfStockProducts);
        
        // Stock health percentage
        double stockHealthPercentage = totalProducts > 0 
                ? ((double) (productsWithStock - lowStockProducts) / totalProducts) * 100
                : 0;
        summary.put("stockHealthPercentage", Math.round(stockHealthPercentage * 100.0) / 100.0);
        
        return summary;
    }

    public void triggerManualStockCheck() {
        log.info("Manual stock check triggered");
        checkStockLevels();
    }
}
