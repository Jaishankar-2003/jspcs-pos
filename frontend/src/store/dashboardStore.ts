import { create } from 'zustand';

export interface ActiveUser {
    userId: number;
    username: string;
    role: string;
    loginTime: string;
    status: string;
}

export interface CashierRevenue {
    cashierName: string;
    status: string;
    revenue: number;
}

interface DashboardState {
    totalRevenue: number;
    productCount: number;
    activeUsers: ActiveUser[];
    cashierRevenue: CashierRevenue[];
    lastUpdated: Date;
    
    setInitialData: (data: Partial<DashboardState>) => void;
    addActiveUser: (user: ActiveUser) => void;
    removeActiveUser: (userId: number) => void;
    processInvoiceEvent: (cashierName: string, amount: number, totalRevenue: number) => void;
    clearRevenue: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    totalRevenue: 0,
    productCount: 0,
    activeUsers: [],
    cashierRevenue: [],
    lastUpdated: new Date(),
    
    setInitialData: (data) => set((state) => ({ 
        ...state, 
        ...data,
        lastUpdated: new Date()
    })),
    
    addActiveUser: (user) => set((state) => {
        // Prevent duplicates
        if (state.activeUsers.find(u => u.userId === user.userId)) {
            return state;
        }
        return { 
            activeUsers: [...state.activeUsers, user],
            lastUpdated: new Date()
        };
    }),
    
    removeActiveUser: (userId) => set((state) => ({
        activeUsers: state.activeUsers.filter(u => u.userId !== userId),
        lastUpdated: new Date()
    })),
    
    processInvoiceEvent: (cashierName, amount, totalRevenue) => set((state) => {
        const existingCashier = state.cashierRevenue.find(c => c.cashierName === cashierName);
        let newCashierRevenue;
        
        if (existingCashier) {
            newCashierRevenue = state.cashierRevenue.map(c => 
                c.cashierName === cashierName 
                    ? { ...c, revenue: c.revenue + amount }
                    : c
            );
        } else {
            newCashierRevenue = [
                ...state.cashierRevenue, 
                { cashierName, status: "ONLINE", revenue: amount }
            ];
        }
        
        return {
            totalRevenue,
            cashierRevenue: newCashierRevenue,
            lastUpdated: new Date()
        };
    }),
    
    clearRevenue: () => set({ 
        totalRevenue: 0, 
        cashierRevenue: [],
        lastUpdated: new Date()
    })
}));
