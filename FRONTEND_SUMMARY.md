# React Frontend Architecture Summary
## JSPCS POS - Quick Reference Guide

---

## Folder Structure Overview

```
src/
├── api/                    # API client layer
├── websocket/              # WebSocket client
├── store/                  # State management
├── router/                 # Routing
├── layouts/                # Layout components
├── features/               # Feature modules
│   ├── auth/
│   ├── admin/
│   ├── cashier/
│   └── shared/
└── utils/                  # Utilities
```

---

## Component Hierarchy

### Application Structure
```
App
├── Router
│   ├── PublicRoute → LoginPage
│   └── PrivateRoute
│       ├── AdminRoute → AdminLayout → Admin Pages
│       └── CashierRoute → CashierLayout → Cashier Pages
```

### Admin Layout
```
AdminLayout
├── Header (Logo, UserMenu, ConnectionStatus)
├── Sidebar (Navigation)
└── Main Content (Route Pages)
```

### Cashier Layout
```
CashierLayout
├── Header (CounterInfo, UserInfo, ConnectionStatus)
└── Main Content
    └── BillingPage
        ├── BillingPanel
        │   ├── ProductSearchBar
        │   ├── Cart
        │   ├── DiscountPanel
        │   └── PaymentPanel
        └── ProductGrid (optional)
```

---

## Routing Strategy

### Route Structure
```
Public:
├── /login

Admin (protected, ADMIN role):
├── /admin/dashboard
├── /admin/products
├── /admin/inventory
├── /admin/users
├── /admin/reports
└── /admin/settings

Cashier (protected, CASHIER or ADMIN):
├── /cashier/dashboard
├── /cashier/billing
└── /cashier/invoices
```

### Route Protection
- **PrivateRoute**: Requires authentication
- **AdminRoute**: Requires ADMIN role
- **CashierRoute**: Requires CASHIER or ADMIN role
- **Redirect**: Based on role after login

---

## State Management

### Strategy: Hybrid Approach

#### Global State (Zustand/Redux)
- **Auth**: User, token, role
- **Cart**: Items, totals, discount
- **Products**: Products cache
- **Inventory**: Stock levels cache
- **UI**: Modals, notifications, loading
- **Connection**: WebSocket status

#### Server State (React Query)
- **Products**: Products list, single product
- **Inventory**: Inventory levels
- **Invoices**: Invoice list, single invoice
- **Reports**: Report data

#### Local State (useState)
- **Form inputs**: Controlled components
- **UI state**: Modals, dropdowns
- **Component state**: Component-specific state

---

## WebSocket Integration

### Integration Points
1. **App Level**: Initialize connection
2. **Store Level**: Update global state on events
3. **Component Level**: Subscribe to events

### Event Handlers
- **Stock Updates**: Update inventorySlice
- **Price Updates**: Update productsSlice
- **Sale Created**: Update invoicesSlice
- **Config Changes**: Update relevant state

---

## Keyboard-First UX

### Focus Management
- **Primary Input**: Barcode search bar (auto-focus)
- **Tab Order**: Logical flow
- **Shortcuts**: F-keys, Ctrl+key

### Keyboard Shortcuts
```
Enter: Submit/Add item
Esc: Cancel/Close modal
Tab: Next field
Shift+Tab: Previous field
Ctrl+Enter: Process payment
Ctrl+H: Hold cart
F1: Focus barcode input

Cart:
+/-: Quantity
Delete: Remove item

Payment:
1/2/3: Payment mode
Enter: Process payment
```

### Barcode Input Flow
1. Auto-focus on page load
2. Scan/Type barcode
3. Enter → Add to cart
4. Clear input → Auto-focus (ready for next)

---

## Offline-Safe Behavior

### Offline Detection
- Browser `navigator.onLine`
- Network event listeners
- WebSocket connection status
- API request failures

### UI States
```
Online:
├── All features enabled
├── Real-time updates (WebSocket)
└── Green indicator

Offline (WebSocket disconnected):
├── Polling fallback
├── Yellow indicator
└── Reduced update frequency

Offline (Network disconnected):
├── Red indicator
├── Critical operations disabled
├── Local operations allowed
└── Queue operations for sync
```

### Operation Strategy
**Read (Allowed):**
- View products (cached)
- View cart (local state)
- View invoices (cached)

**Write (Queued):**
- Add to cart (local, sync later)
- Create invoice (disabled)
- Process payment (disabled)

### Sync Strategy
- Queue failed operations (localStorage)
- Retry on reconnect
- Conflict resolution
- User notification

---

## State Ownership Strategy

### Global State (Store)
- **Ownership**: Application-level
- **Examples**: Auth, Cart, Connection
- **Access**: Any component (hooks/selectors)
- **Updates**: Actions/dispatchers

### Server State (React Query)
- **Ownership**: Server data (cached)
- **Examples**: Products, Inventory, Invoices
- **Access**: Components via hooks
- **Updates**: Mutations, refetch

### Local State (useState)
- **Ownership**: Component-specific
- **Examples**: Form inputs, UI state
- **Access**: Component + children (props)
- **Updates**: setState

### Prop Drilling vs Context
- **Props**: 1-2 levels deep
- **Context**: Deeply nested
- **Store**: Widely shared

---

## Key Features

### Admin Panel
- Dashboard (stats, charts)
- Product management
- Inventory management
- User management
- Reports
- Settings

### Cashier Panel
- Billing interface
- Cart management
- Payment processing
- Invoice history
- Keyboard-first UX

### Shared Features
- Authentication
- Real-time updates (WebSocket)
- Offline support
- Connection status
- Error handling

---

## Technology Stack

### Core
- **React**: 18+
- **React Router**: v6
- **State Management**: Zustand or Redux Toolkit
- **Server State**: React Query / TanStack Query
- **Styling**: Tailwind CSS

### Additional
- **WebSocket**: STOMP.js, SockJS
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **Validation**: Zod or Yup
- **Build Tool**: Vite or Webpack

---

## Best Practices

### Component Design
✅ Feature-based organization  
✅ Container/Presenter pattern  
✅ Reusable components  
✅ Custom hooks for logic  
✅ Proper prop types  

### State Management
✅ Global state for widely shared data  
✅ Server state for API data  
✅ Local state for component-specific  
✅ Avoid unnecessary global state  
✅ Use selectors for computed values  

### Performance
✅ Code splitting (route-based)  
✅ React Query caching  
✅ Memoization (useMemo, useCallback)  
✅ Lazy loading components  
✅ Optimize re-renders  

### Accessibility
✅ Keyboard navigation  
✅ ARIA labels  
✅ Focus management  
✅ Screen reader support  
✅ Semantic HTML  

---

## Summary

This React frontend architecture provides:

✅ **Complete Structure**: Feature-based folder organization  
✅ **Clear Hierarchy**: Component relationships defined  
✅ **Routing Strategy**: Role-based routing with protection  
✅ **State Management**: Hybrid approach (Store + React Query + Local)  
✅ **WebSocket Integration**: Real-time updates with state  
✅ **Keyboard-First UX**: Full keyboard navigation  
✅ **Offline-Safe**: Graceful degradation and sync  
✅ **Scalability**: Modular, maintainable architecture  

**Status:** ✅ Frontend architecture design complete - Ready for implementation

