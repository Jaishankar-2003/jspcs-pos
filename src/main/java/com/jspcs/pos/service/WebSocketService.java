package com.jspcs.pos.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastSalesUpdate(@NonNull Object salesData) {
        log.info("Broadcasting sales update: {}", salesData);
        messagingTemplate.convertAndSend("/topic/sales-updates", Map.of(
            "type", "SALES_UPDATE",
            "data", salesData,
            "timestamp", LocalDateTime.now()
        ));
    }

    public void broadcastStockAlert(@NonNull Object stockAlert) {
        log.info("Broadcasting stock alert: {}", stockAlert);
        messagingTemplate.convertAndSend("/topic/stock-alerts", Map.of(
            "type", "STOCK_ALERT",
            "data", stockAlert,
            "timestamp", LocalDateTime.now()
        ));
    }

    public void sendToUser(@NonNull String username, @NonNull String destination, @NonNull Object payload) {
        messagingTemplate.convertAndSendToUser(username, destination, Map.of(
            "type", "USER_NOTIFICATION",
            "data", payload,
            "timestamp", LocalDateTime.now()
        ));
    }

    public void broadcastInvoiceCreated(@NonNull Object invoiceData) {
        messagingTemplate.convertAndSend("/topic/invoice-updates", Map.of(
            "type", "INVOICE_CREATED",
            "data", invoiceData,
            "timestamp", LocalDateTime.now()
        ));
    }

    public void broadcastSystemNotification(@NonNull Object notification) {
        messagingTemplate.convertAndSend("/topic/system-notifications", Map.of(
            "type", "SYSTEM_NOTIFICATION",
            "data", notification,
            "timestamp", LocalDateTime.now()
        ));
    }
}
