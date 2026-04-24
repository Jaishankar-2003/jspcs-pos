import { useEffect, useRef } from 'react';
import { useDashboardStore } from './dashboardStore';

const getWsUrl = () => {
    const token = localStorage.getItem('token');
    const tokenQuery = token ? `?token=${token}` : '';
    
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace('http', 'ws') + '/api/dashboard/ws' + tokenQuery;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/dashboard/ws${tokenQuery}`;
};

export const useDashboardWebSocket = () => {
    const wsRef = useRef<WebSocket | null>(null);
    const { addActiveUser, removeActiveUser, processInvoiceEvent, clearRevenue } = useDashboardStore();

    useEffect(() => {
        const WS_URL = getWsUrl();
        console.log("Initializing Dashboard WebSocket at:", WS_URL);
        
        const connect = () => {
            const ws = new WebSocket(WS_URL);
            
            ws.onopen = () => {
                console.log("Connected to Dashboard WebSocket");
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("Received WS event:", data.type, data);
                    
                    switch (data.type) {
                        case 'USER_LOGIN':
                            addActiveUser(data.user);
                            break;
                        case 'USER_LOGOUT':
                            removeActiveUser(data.userId);
                            break;
                        case 'INVOICE_CREATED':
                            processInvoiceEvent(data.cashierName, data.amount, data.totalRevenue);
                            break;
                        case 'REVENUE_CLEARED':
                            console.log("Triggering clearRevenue in store");
                            clearRevenue();
                            break;
                        default:
                            console.log("Unknown WS event:", data);
                    }
                } catch (error) {
                    console.error("Error parsing WS message:", error);
                }
            };
            
            ws.onclose = () => {
                console.log("Disconnected from Dashboard WebSocket. Reconnecting in 5s...");
                setTimeout(connect, 5000);
            };
            
            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                ws.close();
            };
            
            wsRef.current = ws;
        };

        connect();

        return () => {
            if (wsRef.current) {
                console.log("Cleaning up Dashboard WebSocket");
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, [addActiveUser, removeActiveUser, processInvoiceEvent, clearRevenue]);
};
