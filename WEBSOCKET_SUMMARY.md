# WebSocket Real-Time Synchronization Summary
## JSPCS POS - Quick Reference Guide

---

## Architecture Overview

```
Clients (Browsers) 
  ↓ WebSocket (STOMP over SockJS)
Spring WebSocket Message Broker
  ↓ Event Publishing
Service Layer (Event Triggers)
```

**Key Components:**
- WebSocketConfig (STOMP configuration)
- WebSocketNotificationService (event broadcasting)
- Event Handlers (per event type)
- Frontend WebSocketService (React)

---

## Events

### 1. Sale Created
**Topics**: `/topic/sales/created`, `/topic/admin/sales/created`  
**Subscribers**: All cashiers, Admin dashboard  
**Payload**: Invoice details, items, totals

### 2. Stock Updated
**Topics**: `/topic/stock/updated`, `/topic/stock/updated/{productId}`  
**Subscribers**: All cashiers, Admin dashboard  
**Payload**: Product ID, stock levels, update type

### 3. Price Updated
**Topics**: `/topic/prices/updated`, `/topic/prices/updated/{productId}`  
**Subscribers**: All cashiers, Admin dashboard  
**Payload**: Product ID, old/new price, price change

### 4. Manual Entry Recorded
**Topics**: `/topic/admin/manual-entries/recorded`  
**Subscribers**: Admin dashboard only  
**Payload**: Entry details, cashier info, search term

### 5. Configuration Change
**Topics**: `/topic/admin/config/changed`  
**Subscribers**: Admin dashboard only  
**Payload**: Config type, change type, entity details

---

## Subscription Model

### Cashier Terminal Subscriptions
```
├─> /topic/stock/updated (all stock updates)
├─> /topic/stock/updated/{productId} (product-specific)
├─> /topic/prices/updated (all price updates)
├─> /topic/prices/updated/{productId} (product-specific)
└─> /topic/sales/created (all sales - optional)
```

### Admin Dashboard Subscriptions
```
├─> /topic/admin/sales/created (all sales)
├─> /topic/admin/manual-entries/recorded (manual entries)
├─> /topic/admin/config/changed (config changes)
├─> /topic/admin/low-stock-alerts (low stock alerts)
├─> /topic/stock/updated (all stock updates)
└─> /topic/prices/updated (all price updates)
```

---

## Event Payload Structure

### Sale Created Event
```json
{
  "eventType": "SALE_CREATED",
  "invoiceId": "...",
  "invoiceNumber": "INV-20240101-0000001",
  "cashierId": "...",
  "counterId": "...",
  "grandTotal": 1250.50,
  "paymentStatus": "PAID",
  "items": [...]
}
```

### Stock Updated Event
```json
{
  "eventType": "STOCK_UPDATED",
  "productId": "...",
  "currentStock": 95,
  "reservedStock": 5,
  "availableStock": 90,
  "updateType": "DEDUCTION",
  "quantity": -5
}
```

### Price Updated Event
```json
{
  "eventType": "PRICE_UPDATED",
  "productId": "...",
  "oldPrice": 100.00,
  "newPrice": 110.00,
  "priceChange": 10.00,
  "priceChangePercent": 10.0
}
```

---

## Fallback Strategy

### 1. Automatic Reconnection
- **Strategy**: Exponential backoff
- **Max Attempts**: 10
- **Base Delay**: 1 second
- **Max Delay**: 30 seconds
- **Result**: Switches to polling if max attempts reached

### 2. Polling Fallback
- **Interval**: 5 seconds (configurable)
- **Endpoint**: `/api/notifications/updates?since={timestamp}`
- **Method**: HTTP GET polling
- **Activation**: When WebSocket max reconnection attempts reached
- **Deactivation**: When WebSocket reconnects

### 3. Connection Status
- **Indicators**: Connected (green), Polling (yellow), Disconnected (red)
- **UI Component**: ConnectionStatusComponent
- **Updates**: Real-time status display

### 4. Message Queue (Future)
- **Storage**: Optional event storage in database
- **Retrieval**: Get missed events on reconnect
- **Retention**: 24 hours
- **Cleanup**: Scheduled job (daily)

---

## WebSocket Configuration

### Endpoints
- **WebSocket**: `/ws` (with SockJS fallback)
- **Message Broker**: `/topic` (broadcast), `/queue` (targeted)
- **Application Prefix**: `/app` (client-to-server)

### Security
- **Authentication**: Spring Security integration
- **Authorization**: Role-based subscription control
- **CORS**: Configured for LAN access

### Performance
- **Message Size**: 128 KB limit
- **Send Timeout**: 20 seconds
- **Buffer Size**: 512 KB limit
- **Thread Pool**: 10-20 threads (configurable)

---

## Implementation Flow

### Backend
1. Service layer triggers event
2. WebSocketNotificationService.broadcast() called
3. Event converted to payload
4. Message sent to topic/queue
5. All subscribed clients receive update

### Frontend
1. WebSocket connection established
2. Client subscribes to topics (based on role)
3. Event received via STOMP MESSAGE frame
4. Event handler processes update
5. UI updated in real-time

### Fallback
1. WebSocket disconnects
2. Reconnection attempts start (exponential backoff)
3. If max attempts reached → Enable polling
4. Polling requests updates every 5 seconds
5. When WebSocket reconnects → Disable polling

---

## Key Features

✅ **Real-Time Updates**: Instant synchronization across all clients  
✅ **Role-Based Subscriptions**: Different topics for different roles  
✅ **Automatic Reconnection**: Exponential backoff strategy  
✅ **Polling Fallback**: HTTP polling when WebSocket unavailable  
✅ **Connection Status**: Visual indicator for connection state  
✅ **Event Payloads**: Structured JSON payloads for all events  
✅ **Error Handling**: Graceful degradation and recovery  
✅ **Scalability**: Efficient broadcast mechanism  

---

## Best Practices

### DO:
✅ Use topics for broadcast (multiple subscribers)  
✅ Use queues for targeted messages (single subscriber)  
✅ Implement reconnection logic with exponential backoff  
✅ Provide polling fallback for reliability  
✅ Show connection status to users  
✅ Handle WebSocket errors gracefully  
✅ Use SockJS for browser compatibility  

### DON'T:
❌ Don't send sensitive data in WebSocket messages  
❌ Don't rely solely on WebSocket (provide fallback)  
❌ Don't block WebSocket threads with long operations  
❌ Don't send large payloads (keep < 128 KB)  
❌ Don't ignore connection state  
❌ Don't forget cleanup on component unmount  

---

**Status:** ✅ WebSocket design complete - Ready for implementation

