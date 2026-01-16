# WebSocket Real-Time Synchronization Design
## JSPCS POS - Event-Based Real-Time Updates

---

## 1. WebSocket Server Architecture

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              WEBSOCKET ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Clients    │  (Multiple Cashier Terminals + Admin Dashboard)
│  (Browsers)  │
└──────┬───────┘
       │
       │ WebSocket Connection (STOMP over SockJS)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│         Spring WebSocket Message Broker                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         WebSocketConfig                            │    │
│  │  - STOMP Endpoint: /ws                             │    │
│  │  - Message Broker: /topic, /queue                  │    │
│  │  - Application Prefix: /app                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         WebSocketNotificationService               │    │
│  │  - Broadcast events to topics                      │    │
│  │  - Send targeted messages to queues                │    │
│  │  - Handle event publishing                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Event Handlers                             │    │
│  │  - SaleEventHandler                                │    │
│  │  - StockEventHandler                                │    │
│  │  - PriceEventHandler                                │    │
│  │  - ManualEntryEventHandler                         │    │
│  │  - ConfigChangeEventHandler                        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
       │
       │ Event Triggers
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│         Service Layer                                        │
│  - InvoiceService (sale events)                             │
│  - InventoryService (stock events)                          │
│  - ProductService (price events)                            │
│  - ManualEntryLogService (manual entry events)              │
│  - AdminService (config change events)                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 WebSocket Configuration

**Location**: `com.jspcs.pos.config.websocket.WebSocketConfig.java`

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple message broker for topics (broadcast)
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix for client-to-server messages
        config.setApplicationDestinationPrefixes("/app");
        
        // User destination prefix (for targeted messages)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint with SockJS fallback
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // Configure for LAN in production
                .withSockJS();  // Fallback for browsers that don't support WebSocket
        
        // Optional: Add heartbeat configuration
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Configure thread pool for inbound messages
        registration.taskExecutor()
                .corePoolSize(10)
                .maxPoolSize(20)
                .queueCapacity(100);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        // Configure thread pool for outbound messages
        registration.taskExecutor()
                .corePoolSize(10)
                .maxPoolSize(20)
                .queueCapacity(100);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registry) {
        // Configure message size limits
        registry.setMessageSizeLimit(128 * 1024);  // 128 KB
        registry.setSendTimeLimit(20 * 1000);  // 20 seconds
        registry.setSendBufferSizeLimit(512 * 1024);  // 512 KB
    }
}
```

### 1.3 WebSocket Security Configuration

**Location**: `com.jspcs.pos.config.security.WebSocketSecurityConfig.java`

```java
@Configuration
public class WebSocketSecurityConfig extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    @Override
    protected void configureInbound(MessageSecurityMetadataSourceRegistry messages) {
        // Configure security for WebSocket messages
        messages
            // Public endpoints (for connection)
            .simpDestMatchers("/app/**").permitAll()
            
            // Topics (broadcast) - authenticated users only
            .simpDestMatchers("/topic/**").authenticated()
            .simpDestMatchers("/queue/**").authenticated()
            
            // User-specific destinations
            .simpDestMatchers("/user/**").authenticated();
    }

    @Override
    protected boolean sameOriginDisabled() {
        // Allow cross-origin for LAN access
        // Configure properly for production (specific origins)
        return true;
    }
}
```

### 1.4 WebSocket Notification Service

**Location**: `com.jspcs.pos.service.notification.WebSocketNotificationService.java`

```java
@Service
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final Logger log = LoggerFactory.getLogger(WebSocketNotificationService.class);

    /**
     * Broadcast event to all connected clients (topic)
     */
    public void broadcast(String topic, Object payload) {
        try {
            messagingTemplate.convertAndSend(topic, payload);
            log.debug("Broadcast event to topic: {}, payload: {}", topic, payload);
        } catch (Exception e) {
            log.error("Error broadcasting event to topic: {}", topic, e);
            // Fail silently or implement retry logic
        }
    }

    /**
     * Send event to specific user (queue)
     */
    public void sendToUser(String username, String destination, Object payload) {
        try {
            messagingTemplate.convertAndSendToUser(username, destination, payload);
            log.debug("Sent event to user: {}, destination: {}, payload: {}", username, destination, payload);
        } catch (Exception e) {
            log.error("Error sending event to user: {}, destination: {}", username, destination, e);
            // Fail silently or implement retry logic
        }
    }

    /**
     * Broadcast sale created event
     */
    public void broadcastSaleCreated(SaleCreatedEvent event) {
        broadcast("/topic/sales/created", event);
        // Also send to admin dashboard
        broadcast("/topic/admin/sales/created", event);
    }

    /**
     * Broadcast stock updated event
     */
    public void broadcastStockUpdated(StockUpdatedEvent event) {
        // Broadcast to all clients
        broadcast("/topic/stock/updated", event);
        // Also send product-specific update
        broadcast("/topic/stock/updated/" + event.getProductId(), event);
    }

    /**
     * Broadcast price updated event
     */
    public void broadcastPriceUpdated(PriceUpdatedEvent event) {
        broadcast("/topic/prices/updated", event);
        // Also send product-specific update
        broadcast("/topic/prices/updated/" + event.getProductId(), event);
    }

    /**
     * Broadcast manual entry recorded event
     */
    public void broadcastManualEntryRecorded(ManualEntryRecordedEvent event) {
        // Send to admin dashboard only
        broadcast("/topic/admin/manual-entries/recorded", event);
    }

    /**
     * Broadcast configuration change event
     */
    public void broadcastConfigChanged(ConfigChangedEvent event) {
        // Send to admin dashboard only
        broadcast("/topic/admin/config/changed", event);
    }
}
```

---

## 2. Event Payload Structure

### 2.1 Sale Created Event

**Topic**: `/topic/sales/created`, `/topic/admin/sales/created`

**Event Class**: `com.jspcs.pos.dto.websocket.SaleCreatedEvent.java`

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SaleCreatedEvent {
    private String eventType = "SALE_CREATED";
    private UUID invoiceId;
    private String invoiceNumber;
    private UUID cashierId;
    private String cashierName;
    private UUID counterId;
    private String counterNumber;
    private BigDecimal grandTotal;
    private String paymentStatus;
    private Instant createdAt;
    private List<SaleItem> items;

    // Getters and setters

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SaleItem {
        private UUID productId;
        private String productName;
        private String productSku;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;

        // Getters and setters
    }
}
```

**JSON Payload Example**:
```json
{
  "eventType": "SALE_CREATED",
  "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
  "invoiceNumber": "INV-20240101-0000001",
  "cashierId": "660e8400-e29b-41d4-a716-446655440001",
  "cashierName": "John Doe",
  "counterId": "770e8400-e29b-41d4-a716-446655440002",
  "counterNumber": "C001",
  "grandTotal": 1250.50,
  "paymentStatus": "PAID",
  "createdAt": "2024-01-01T10:30:00Z",
  "items": [
    {
      "productId": "880e8400-e29b-41d4-a716-446655440003",
      "productName": "Product A",
      "productSku": "SKU001",
      "quantity": 2,
      "unitPrice": 100.00,
      "lineTotal": 200.00
    }
  ]
}
```

### 2.2 Stock Updated Event

**Topic**: `/topic/stock/updated`, `/topic/stock/updated/{productId}`

**Event Class**: `com.jspcs.pos.dto.websocket.StockUpdatedEvent.java`

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockUpdatedEvent {
    private String eventType = "STOCK_UPDATED";
    private UUID productId;
    private String productSku;
    private String productName;
    private Integer currentStock;
    private Integer reservedStock;
    private Integer availableStock;
    private String updateType;  // RESERVATION, DEDUCTION, RETURN, ADJUSTMENT
    private Integer quantity;  // Change quantity (positive or negative)
    private UUID updatedBy;
    private Instant updatedAt;
    private String reason;

    // Getters and setters
}
```

**JSON Payload Example**:
```json
{
  "eventType": "STOCK_UPDATED",
  "productId": "880e8400-e29b-41d4-a716-446655440003",
  "productSku": "SKU001",
  "productName": "Product A",
  "currentStock": 95,
  "reservedStock": 5,
  "availableStock": 90,
  "updateType": "DEDUCTION",
  "quantity": -5,
  "updatedBy": "660e8400-e29b-41d4-a716-446655440001",
  "updatedAt": "2024-01-01T10:30:00Z",
  "reason": "SALE"
}
```

### 2.3 Price Updated Event

**Topic**: `/topic/prices/updated`, `/topic/prices/updated/{productId}`

**Event Class**: `com.jspcs.pos.dto.websocket.PriceUpdatedEvent.java`

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PriceUpdatedEvent {
    private String eventType = "PRICE_UPDATED";
    private UUID productId;
    private String productSku;
    private String productName;
    private BigDecimal oldPrice;
    private BigDecimal newPrice;
    private BigDecimal priceChange;  // newPrice - oldPrice
    private BigDecimal priceChangePercent;  // ((newPrice - oldPrice) / oldPrice) * 100
    private UUID updatedBy;
    private String updatedByName;
    private Instant updatedAt;
    private String reason;

    // Getters and setters
}
```

**JSON Payload Example**:
```json
{
  "eventType": "PRICE_UPDATED",
  "productId": "880e8400-e29b-41d4-a716-446655440003",
  "productSku": "SKU001",
  "productName": "Product A",
  "oldPrice": 100.00,
  "newPrice": 110.00,
  "priceChange": 10.00,
  "priceChangePercent": 10.0,
  "updatedBy": "990e8400-e29b-41d4-a716-446655440004",
  "updatedByName": "Admin User",
  "updatedAt": "2024-01-01T10:30:00Z",
  "reason": "PRICE_ADJUSTMENT"
}
```

### 2.4 Manual Entry Recorded Event

**Topic**: `/topic/admin/manual-entries/recorded`

**Event Class**: `com.jspcs.pos.dto.websocket.ManualEntryRecordedEvent.java`

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ManualEntryRecordedEvent {
    private String eventType = "MANUAL_ENTRY_RECORDED";
    private UUID entryId;
    private UUID cashierId;
    private String cashierName;
    private UUID counterId;
    private String counterNumber;
    private String searchedValue;
    private UUID matchedProductId;
    private String matchedProductName;
    private String action;  // SEARCH, SELECT, ADD_NEW, CANCEL
    private Instant recordedAt;

    // Getters and setters
}
```

**JSON Payload Example**:
```json
{
  "eventType": "MANUAL_ENTRY_RECORDED",
  "entryId": "aa0e8400-e29b-41d4-a716-446655440005",
  "cashierId": "660e8400-e29b-41d4-a716-446655440001",
  "cashierName": "John Doe",
  "counterId": "770e8400-e29b-41d4-a716-446655440002",
  "counterNumber": "C001",
  "searchedValue": "Coca Cola 500ml",
  "matchedProductId": "880e8400-e29b-41d4-a716-446655440003",
  "matchedProductName": "Coca Cola 500ml",
  "action": "SELECT",
  "recordedAt": "2024-01-01T10:30:00Z"
}
```

### 2.5 Configuration Change Event

**Topic**: `/topic/admin/config/changed`

**Event Class**: `com.jspcs.pos.dto.websocket.ConfigChangedEvent.java`

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConfigChangedEvent {
    private String eventType = "CONFIG_CHANGED";
    private String configType;  // PRODUCT, USER, ROLE, COUNTER, SYSTEM
    private String changeType;  // CREATE, UPDATE, DELETE
    private UUID entityId;
    private String entityName;
    private Map<String, Object> oldValues;
    private Map<String, Object> newValues;
    private UUID changedBy;
    private String changedByName;
    private Instant changedAt;
    private String reason;

    // Getters and setters
}
```

**JSON Payload Example**:
```json
{
  "eventType": "CONFIG_CHANGED",
  "configType": "PRODUCT",
  "changeType": "UPDATE",
  "entityId": "880e8400-e29b-41d4-a716-446655440003",
  "entityName": "Product A",
  "oldValues": {
    "sellingPrice": 100.00,
    "gstRate": 18.0
  },
  "newValues": {
    "sellingPrice": 110.00,
    "gstRate": 18.0
  },
  "changedBy": "990e8400-e29b-41d4-a716-446655440004",
  "changedByName": "Admin User",
  "changedAt": "2024-01-01T10:30:00Z",
  "reason": "PRICE_ADJUSTMENT"
}
```

---

## 3. Client Subscription Model

### 3.1 Subscription Patterns

```
┌─────────────────────────────────────────────────────────────┐
│              SUBSCRIPTION MODEL                              │
└─────────────────────────────────────────────────────────────┘

Cashier Terminal Subscriptions:
├─> /topic/stock/updated                    (All stock updates)
├─> /topic/stock/updated/{productId}        (Product-specific)
├─> /topic/prices/updated                   (All price updates)
├─> /topic/prices/updated/{productId}       (Product-specific)
└─> /topic/sales/created                    (All sales - optional)

Admin Dashboard Subscriptions:
├─> /topic/admin/sales/created              (All sales)
├─> /topic/admin/manual-entries/recorded    (Manual entries)
├─> /topic/admin/config/changed             (Config changes)
├─> /topic/admin/low-stock-alerts           (Low stock alerts)
├─> /topic/stock/updated                    (All stock updates)
└─> /topic/prices/updated                   (All price updates)
```

### 3.2 Client Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│              CLIENT CONNECTION FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. Client establishes WebSocket connection
   └─> ws://server-ip:8080/ws

2. Client sends STOMP CONNECT frame
   └─> {
         "username": "cashier1",
         "password": "session_token"  // Or use HTTP session
       }

3. Server validates authentication
   └─> Spring Security validates session/credentials

4. Server sends CONNECTED frame
   └─> Connection established

5. Client subscribes to topics
   └─> SUBSCRIBE
       id: sub-1
       destination: /topic/stock/updated

6. Server confirms subscription
   └─> Server ready to send messages

7. Client receives messages
   └─> MESSAGE
       subscription: sub-1
       destination: /topic/stock/updated
       body: { ... event payload ... }
```

### 3.3 Frontend Implementation (React)

```javascript
// WebSocketService.js
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

class WebSocketService {
    constructor() {
        this.stompClient = null;
        this.subscriptions = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000;
        this.heartbeatInterval = null;
    }

    connect(userRole, counterId) {
        const socket = new SockJS('/ws');
        this.stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: this.reconnectDelay,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.subscribeToTopics(userRole, counterId);
                this.startHeartbeat();
            },
            onStompError: (frame) => {
                console.error('STOMP error:', frame);
                this.handleReconnect();
            },
            onWebSocketClose: () => {
                console.log('WebSocket disconnected');
                this.stopHeartbeat();
                this.handleReconnect();
            },
            onDisconnect: () => {
                console.log('STOMP disconnected');
            }
        });

        this.stompClient.activate();
    }

    subscribeToTopics(userRole, counterId) {
        // Common subscriptions
        this.subscribe('/topic/stock/updated', (message) => {
            const event = JSON.parse(message.body);
            this.handleStockUpdate(event);
        });

        this.subscribe('/topic/prices/updated', (message) => {
            const event = JSON.parse(message.body);
            this.handlePriceUpdate(event);
        });

        // Role-specific subscriptions
        if (userRole === 'CASHIER' || userRole === 'ADMIN') {
            this.subscribe('/topic/sales/created', (message) => {
                const event = JSON.parse(message.body);
                this.handleSaleCreated(event);
            });
        }

        if (userRole === 'ADMIN') {
            this.subscribe('/topic/admin/sales/created', (message) => {
                const event = JSON.parse(message.body);
                this.handleSaleCreated(event);
            });

            this.subscribe('/topic/admin/manual-entries/recorded', (message) => {
                const event = JSON.parse(message.body);
                this.handleManualEntry(event);
            });

            this.subscribe('/topic/admin/config/changed', (message) => {
                const event = JSON.parse(message.body);
                this.handleConfigChange(event);
            });

            this.subscribe('/topic/admin/low-stock-alerts', (message) => {
                const event = JSON.parse(message.body);
                this.handleLowStockAlert(event);
            });
        }
    }

    subscribe(destination, callback) {
        if (!this.stompClient || !this.stompClient.connected) {
            console.warn('Cannot subscribe: WebSocket not connected');
            return null;
        }

        const subscription = this.stompClient.subscribe(destination, callback);
        this.subscriptions.set(destination, subscription);
        return subscription;
    }

    unsubscribe(destination) {
        const subscription = this.subscriptions.get(destination);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(destination);
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            // Switch to polling fallback
            this.enablePollingFallback();
            return;
        }

        this.reconnectAttempts++;
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

        setTimeout(() => {
            if (this.stompClient) {
                this.stompClient.activate();
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.stompClient && this.stompClient.connected) {
                // Heartbeat is handled by STOMP client
                // Just verify connection is alive
                console.debug('Heartbeat: Connection alive');
            }
        }, 30000);  // 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    disconnect() {
        this.stopHeartbeat();
        this.subscriptions.forEach((subscription) => {
            subscription.unsubscribe();
        });
        this.subscriptions.clear();
        if (this.stompClient) {
            this.stompClient.deactivate();
        }
    }

    // Event handlers (to be implemented by consuming components)
    handleStockUpdate(event) {
        // Implement stock update handler
        console.log('Stock updated:', event);
    }

    handlePriceUpdate(event) {
        // Implement price update handler
        console.log('Price updated:', event);
    }

    handleSaleCreated(event) {
        // Implement sale created handler
        console.log('Sale created:', event);
    }

    handleManualEntry(event) {
        // Implement manual entry handler
        console.log('Manual entry recorded:', event);
    }

    handleConfigChange(event) {
        // Implement config change handler
        console.log('Config changed:', event);
    }

    handleLowStockAlert(event) {
        // Implement low stock alert handler
        console.log('Low stock alert:', event);
    }
}

export default new WebSocketService();
```

### 3.4 Component Integration (React)

```javascript
// ProductListComponent.jsx
import { useEffect, useState } from 'react';
import webSocketService from './WebSocketService';

function ProductListComponent() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        // Connect WebSocket
        webSocketService.connect('CASHIER', counterId);

        // Override stock update handler
        const originalHandler = webSocketService.handleStockUpdate;
        webSocketService.handleStockUpdate = (event) => {
            // Update product stock in state
            setProducts(prevProducts =>
                prevProducts.map(product =>
                    product.id === event.productId
                        ? {
                            ...product,
                            currentStock: event.currentStock,
                            reservedStock: event.reservedStock,
                            availableStock: event.availableStock,
                            lastUpdated: event.updatedAt
                        }
                        : product
                )
            );
            // Call original handler if needed
            originalHandler(event);
        };

        // Cleanup on unmount
        return () => {
            webSocketService.handleStockUpdate = originalHandler;
            webSocketService.disconnect();
        };
    }, []);

    return (
        <div>
            {products.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}
```

---

## 4. Fallback Strategy if WebSocket Disconnects

### 4.1 Fallback Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              FALLBACK STRATEGY                               │
└─────────────────────────────────────────────────────────────┘

WebSocket (Primary):
├─> Real-time push notifications
├─> Low latency
└─> Efficient for multiple clients

Fallback Strategies:
├─> 1. Automatic Reconnection
│   ├─> Exponential backoff
│   ├─> Max retry attempts
│   └─> Connection state tracking
│
├─> 2. Polling Fallback
│   ├─> HTTP polling (REST API)
│   ├─> Configurable interval
│   └─> Last update timestamp
│
├─> 3. Message Queue (Future)
│   ├─> Store missed messages
│   ├─> Retrieve on reconnect
│   └─> Message deduplication
│
└─> 4. Graceful Degradation
    ├─> Continue with polling
    ├─> Show connection status
    └─> User notification
```

### 4.2 Automatic Reconnection

**Frontend Implementation**:

```javascript
// WebSocketService.js (Enhanced)
class WebSocketService {
    constructor() {
        // ... existing code ...
        this.reconnectStrategy = 'exponential';  // exponential or linear
        this.baseReconnectDelay = 1000;  // 1 second
        this.maxReconnectDelay = 30000;  // 30 seconds
        this.isReconnecting = false;
        this.pendingMessages = [];  // Store messages during disconnection
    }

    handleReconnect() {
        if (this.isReconnecting) {
            return;  // Already reconnecting
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached. Switching to polling.');
            this.enablePollingFallback();
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        // Calculate delay (exponential backoff)
        let delay = this.baseReconnectDelay;
        if (this.reconnectStrategy === 'exponential') {
            delay = Math.min(
                this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
                this.maxReconnectDelay
            );
        } else {
            delay = this.baseReconnectDelay * this.reconnectAttempts;
        }

        console.log(`Reconnecting in ${delay}ms... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

        setTimeout(() => {
            this.isReconnecting = false;
            if (this.stompClient) {
                try {
                    this.stompClient.activate();
                } catch (error) {
                    console.error('Reconnection error:', error);
                    this.handleReconnect();
                }
            }
        }, delay);
    }

    onConnect() {
        console.log('WebSocket reconnected successfully');
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.subscribeToTopics(this.userRole, this.counterId);
        this.stopPollingFallback();  // Stop polling when WebSocket reconnects
        // Optionally: Request missed updates
        this.requestMissedUpdates();
    }
}
```

### 4.3 Polling Fallback

**Polling Service Implementation**:

```javascript
// PollingFallbackService.js
class PollingFallbackService {
    constructor() {
        this.pollInterval = 5000;  // 5 seconds
        this.pollTimer = null;
        this.lastUpdateTimestamp = null;
        this.isPolling = false;
    }

    startPolling() {
        if (this.isPolling) {
            return;
        }

        console.log('Starting polling fallback');
        this.isPolling = true;
        this.lastUpdateTimestamp = new Date().toISOString();

        this.pollTimer = setInterval(() => {
            this.pollUpdates();
        }, this.pollInterval);

        // Initial poll
        this.pollUpdates();
    }

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.isPolling = false;
        console.log('Stopped polling fallback');
    }

    async pollUpdates() {
        try {
            // Poll for updates since last timestamp
            const response = await fetch(
                `/api/notifications/updates?since=${this.lastUpdateTimestamp}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Polling failed: ${response.statusText}`);
            }

            const updates = await response.json();
            
            // Process updates
            updates.forEach(update => {
                this.handleUpdate(update);
            });

            // Update timestamp
            if (updates.length > 0) {
                this.lastUpdateTimestamp = new Date().toISOString();
            }

        } catch (error) {
            console.error('Polling error:', error);
            // Continue polling on error (will retry next interval)
        }
    }

    handleUpdate(update) {
        // Route update to appropriate handler
        switch (update.eventType) {
            case 'STOCK_UPDATED':
                webSocketService.handleStockUpdate(update);
                break;
            case 'PRICE_UPDATED':
                webSocketService.handlePriceUpdate(update);
                break;
            case 'SALE_CREATED':
                webSocketService.handleSaleCreated(update);
                break;
            // ... other event types
        }
    }
}

export default new PollingFallbackService();
```

**Backend Polling Endpoint**:

```java
@RestController
@RequestMapping("/api/notifications")
public class NotificationPollingController {

    private final NotificationPollingService pollingService;

    /**
     * Get updates since a specific timestamp (polling fallback)
     */
    @GetMapping("/updates")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<List<NotificationUpdate>> getUpdates(
            @RequestParam("since") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since,
            @RequestParam(value = "limit", defaultValue = "100") int limit) {
        
        List<NotificationUpdate> updates = pollingService.getUpdatesSince(since, limit);
        return ResponseEntity.ok(updates);
    }
}
```

**Notification Polling Service**:

```java
@Service
public class NotificationPollingService {

    private final NotificationEventRepository eventRepository;

    /**
     * Get events since timestamp (for polling fallback)
     */
    @Transactional(readOnly = true)
    public List<NotificationUpdate> getUpdatesSince(Instant since, int limit) {
        // Query events since timestamp
        List<NotificationEvent> events = eventRepository
            .findByCreatedAtAfterOrderByCreatedAtAsc(since, PageRequest.of(0, limit));
        
        return events.stream()
            .map(this::convertToUpdate)
            .collect(Collectors.toList());
    }

    private NotificationUpdate convertToUpdate(NotificationEvent event) {
        // Convert stored event to update DTO
        // Implementation depends on event storage strategy
        return NotificationUpdate.builder()
            .eventType(event.getEventType())
            .payload(event.getPayload())
            .createdAt(event.getCreatedAt())
            .build();
    }
}
```

### 4.4 Connection Status Indicator

**UI Component**:

```javascript
// ConnectionStatusComponent.jsx
import { useEffect, useState } from 'react';
import webSocketService from './WebSocketService';

function ConnectionStatusComponent() {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        const checkConnection = () => {
            if (webSocketService.stompClient && webSocketService.stompClient.connected) {
                setConnectionStatus('connected');
                setIsPolling(false);
            } else if (webSocketService.isPolling) {
                setConnectionStatus('polling');
                setIsPolling(true);
            } else {
                setConnectionStatus('disconnected');
                setIsPolling(false);
            }
        };

        const interval = setInterval(checkConnection, 1000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'green';
            case 'polling':
                return 'yellow';
            case 'disconnected':
                return 'red';
            default:
                return 'gray';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'Connected';
            case 'polling':
                return 'Polling (WebSocket unavailable)';
            case 'disconnected':
                return 'Disconnected';
            default:
                return 'Unknown';
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
                style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor()
                }}
            />
            <span>{getStatusText()}</span>
        </div>
    );
}
```

### 4.5 Message Queue (Future Enhancement)

**Optional: Store Events for Retrieval**:

```java
@Entity
@Table(name = "notification_events")
public class NotificationEvent {
    @Id
    private UUID id;
    
    private String eventType;
    
    @Column(columnDefinition = "JSONB")
    private Map<String, Object> payload;
    
    private Instant createdAt;
    
    private Boolean delivered = false;
    
    private Instant deliveredAt;
}
```

**Event Storage Service**:

```java
@Service
public class NotificationEventStorageService {

    private final NotificationEventRepository eventRepository;
    private final Duration eventRetentionPeriod = Duration.ofHours(24);

    /**
     * Store event for later retrieval
     */
    public void storeEvent(String eventType, Object payload) {
        NotificationEvent event = new NotificationEvent();
        event.setId(UUID.randomUUID());
        event.setEventType(eventType);
        event.setPayload(convertToMap(payload));
        event.setCreatedAt(Instant.now());
        event.setDelivered(false);
        eventRepository.save(event);
    }

    /**
     * Get undelivered events for a client
     */
    public List<NotificationEvent> getUndeliveredEvents(Instant since) {
        return eventRepository.findUndeliveredEventsSince(since);
    }

    /**
     * Mark event as delivered
     */
    public void markAsDelivered(UUID eventId) {
        NotificationEvent event = eventRepository.findById(eventId)
            .orElseThrow();
        event.setDelivered(true);
        event.setDeliveredAt(Instant.now());
        eventRepository.save(event);
    }

    /**
     * Clean up old events (scheduled job)
     */
    @Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
    public void cleanupOldEvents() {
        Instant cutoff = Instant.now().minus(eventRetentionPeriod);
        eventRepository.deleteByCreatedAtBefore(cutoff);
    }
}
```

---

## Summary

This WebSocket real-time synchronization design provides:

✅ **WebSocket Server Architecture**: Spring WebSocket with STOMP protocol  
✅ **Event Payload Structure**: Complete event definitions for all event types  
✅ **Client Subscription Model**: Role-based subscriptions with React integration  
✅ **Fallback Strategy**: Automatic reconnection, polling fallback, connection status  
✅ **Real-Time Updates**: Instant synchronization across all clients  
✅ **Robust Error Handling**: Graceful degradation and recovery  
✅ **Scalability**: Efficient broadcast mechanism for multiple clients  

**Status:** ✅ WebSocket design complete - Ready for implementation

