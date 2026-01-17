package com.jspcs.pos.controller.inventory;

import com.jspcs.pos.service.StockAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inventory/stock-alerts")
@RequiredArgsConstructor
@Slf4j
public class StockAlertController {

    private final StockAlertService stockAlertService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getAllStockAlerts() {
        log.info("Getting all stock alerts");
        return ResponseEntity.ok(stockAlertService.getAllStockAlerts());
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getStockSummary() {
        log.info("Getting stock summary");
        return ResponseEntity.ok(stockAlertService.getStockSummary());
    }

    @PostMapping("/check")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> triggerManualStockCheck() {
        log.info("Manual stock check triggered");
        stockAlertService.triggerManualStockCheck();
        return ResponseEntity.ok(Map.of("message", "Stock check triggered successfully"));
    }
}
