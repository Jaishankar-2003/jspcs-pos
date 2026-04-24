import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import webSocketService from '../services/websocket';
import type {
  SalesUpdateMessage,
  StockAlertMessage,
  InvoiceCreatedMessage,
  SystemNotificationMessage,
} from '../services/websocket';

export interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  lastSalesUpdate: SalesUpdateMessage | null;
  lastStockAlert: StockAlertMessage | null;
  lastInvoiceCreated: InvoiceCreatedMessage | null;
  lastSystemNotification: SystemNotificationMessage | null;
  clearNotifications: () => void;
}

export const useWebSocket = (autoConnect = true): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSalesUpdate, setLastSalesUpdate] = useState<SalesUpdateMessage | null>(null);
  const [lastStockAlert, setLastStockAlert] = useState<StockAlertMessage | null>(null);
  const [lastInvoiceCreated, setLastInvoiceCreated] = useState<InvoiceCreatedMessage | null>(null);
  const [lastSystemNotification, setLastSystemNotification] = useState<SystemNotificationMessage | null>(null);

  const subscriptionsRef = useRef<{ unsubscribe: () => void }[]>([]);

  const clearNotifications = useCallback(() => {
    setLastSalesUpdate(null);
    setLastStockAlert(null);
    setLastInvoiceCreated(null);
    setLastSystemNotification(null);
  }, []);

  const connect = useCallback(async () => {
    try {
      await webSocketService.connect();
      setIsConnected(true);

      // Subscribe to sales updates
      const salesSub = webSocketService.subscribeToSalesUpdates((message) => {
        setLastSalesUpdate(message);
        toast.success(`New sale: ${message.data.invoiceNumber} - ₹${message.data.grandTotal}`, {
          icon: '💰',
          duration: 4000,
        });
      });

      // Subscribe to stock alerts
      const stockSub = webSocketService.subscribeToStockAlerts((message) => {
        setLastStockAlert(message);
        const alertType = message.data.alertType === 'OUT_OF_STOCK' ? '🔴' : '🟡';
        toast.error(
          `${alertType} ${message.data.productName}: ${message.data.currentStock} units left`,
          {
            duration: 6000,
          }
        );
      });

      // Subscribe to invoice updates
      const invoiceSub = webSocketService.subscribeToInvoiceUpdates((message) => {
        setLastInvoiceCreated(message);
        toast.success(`Invoice ${message.data.invoiceNumber} created`, {
          icon: '🧾',
          duration: 4000,
        });
      });

      // Subscribe to system notifications
      const systemSub = webSocketService.subscribeToSystemNotifications((message) => {
        setLastSystemNotification(message);
        const toastOptions = {
          duration: message.data.severity === 'ERROR' ? 8000 : 5000,
        };

        switch (message.data.severity) {
          case 'SUCCESS':
            toast.success(message.data.message, toastOptions);
            break;
          case 'ERROR':
            toast.error(message.data.message, toastOptions);
            break;
          case 'WARNING':
            toast(message.data.message, toastOptions);
            break;
          default:
            toast(message.data.message, toastOptions);
        }
      });

      subscriptionsRef.current = [salesSub, stockSub, invoiceSub, systemSub];
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
      toast.error('Failed to connect to real-time updates');
    }
  }, []);

  const disconnect = useCallback(() => {
    subscriptionsRef.current.forEach(sub => {
      if (sub && sub.unsubscribe) {
        sub.unsubscribe();
      }
    });
    subscriptionsRef.current = [];
    webSocketService.disconnect();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    lastSalesUpdate,
    lastStockAlert,
    lastInvoiceCreated,
    lastSystemNotification,
    clearNotifications,
  };
};

export default useWebSocket;
