import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

export interface SalesUpdateMessage extends WebSocketMessage {
  type: 'SALES_UPDATE';
  data: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    cashierName: string;
    createdAt: string;
  };
}

export interface StockAlertMessage extends WebSocketMessage {
  type: 'STOCK_ALERT';
  data: {
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    alertType: 'LOW_STOCK' | 'OUT_OF_STOCK';
  };
}

export interface InvoiceCreatedMessage extends WebSocketMessage {
  type: 'INVOICE_CREATED';
  data: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    customerName?: string;
    createdAt: string;
  };
}

export interface SystemNotificationMessage extends WebSocketMessage {
  type: 'SYSTEM_NOTIFICATION';
  data: {
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  };
}

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client && this.client.connected) {
        resolve();
        return;
      }

      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

      this.client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        connectHeaders: {
          // Add auth headers if needed
          // 'Authorization': `Bearer ${getToken()}`
        },
        debug: (str) => {
          console.log('WebSocket Debug:', str);
        },
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        },
        onDisconnect: () => {
          console.log('WebSocket disconnected');
        },
        onStompError: (frame) => {
          console.error('WebSocket STOMP error:', frame);
          reject(new Error(frame.headers['message']));
        },
        onWebSocketError: (error) => {
          console.error('WebSocket error:', error);
          this.handleReconnect();
          reject(error);
        },
      });

      this.client.activate();
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.client) {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions.clear();
      this.client.deactivate();
      this.client = null;
    }
  }

  subscribeToSalesUpdates(callback: (message: SalesUpdateMessage) => void) {
    if (!this.client?.connected) {
      throw new Error('WebSocket not connected');
    }

    const subscription = this.client.subscribe('/topic/sales-updates', (message) => {
      try {
        const data: SalesUpdateMessage = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing sales update message:', error);
      }
    });

    this.subscriptions.set('sales-updates', subscription);
    return subscription;
  }

  subscribeToStockAlerts(callback: (message: StockAlertMessage) => void) {
    if (!this.client?.connected) {
      throw new Error('WebSocket not connected');
    }

    const subscription = this.client.subscribe('/topic/stock-alerts', (message) => {
      try {
        const data: StockAlertMessage = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing stock alert message:', error);
      }
    });

    this.subscriptions.set('stock-alerts', subscription);
    return subscription;
  }

  subscribeToInvoiceUpdates(callback: (message: InvoiceCreatedMessage) => void) {
    if (!this.client?.connected) {
      throw new Error('WebSocket not connected');
    }

    const subscription = this.client.subscribe('/topic/invoice-updates', (message) => {
      try {
        const data: InvoiceCreatedMessage = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing invoice update message:', error);
      }
    });

    this.subscriptions.set('invoice-updates', subscription);
    return subscription;
  }

  subscribeToSystemNotifications(callback: (message: SystemNotificationMessage) => void) {
    if (!this.client?.connected) {
      throw new Error('WebSocket not connected');
    }

    const subscription = this.client.subscribe('/topic/system-notifications', (message) => {
      try {
        const data: SystemNotificationMessage = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing system notification message:', error);
      }
    });

    this.subscriptions.set('system-notifications', subscription);
    return subscription;
  }

  subscribeToUserNotifications(username: string, callback: (message: WebSocketMessage) => void) {
    if (!this.client?.connected) {
      throw new Error('WebSocket not connected');
    }

    const subscription = this.client.subscribe(`/user/${username}/queue/notifications`, (message) => {
      try {
        const data: WebSocketMessage = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing user notification message:', error);
      }
    });

    this.subscriptions.set(`user-${username}`, subscription);
    return subscription;
  }

  unsubscribe(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
