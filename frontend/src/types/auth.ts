export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  permissions: Record<string, boolean>;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface RolePermissions {
  [key: string]: {
    [permission: string]: boolean;
  };
}

export const ROLE_PERMISSIONS = {
  ADMIN: {
    all: true,
    users: true,
    products: true,
    inventory: true,
    sales: true,
    reports: true,
    refunds: true,
    settings: true,
  },
  MANAGER: {
    users: false,
    products: true,
    inventory: true,
    sales: true,
    reports: true,
    refunds: true,
    settings: false,
  },
  CASHIER: {
    users: false,
    products: false,
    inventory_view: true,
    sales: true,
    reports: false,
    refunds: false,
    settings: false,
  },
} as const;

export const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user_create',
  USER_READ: 'user_read',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  
  // Product Management
  PRODUCT_CREATE: 'product_create',
  PRODUCT_READ: 'product_read',
  PRODUCT_UPDATE: 'product_update',
  PRODUCT_DELETE: 'product_delete',
  
  // Inventory Management
  INVENTORY_VIEW: 'inventory_view',
  INVENTORY_ADJUST: 'inventory_adjust',
  INVENTORY_REPORTS: 'inventory_reports',
  
  // Sales Management
  SALES_CREATE: 'sales_create',
  SALES_READ: 'sales_read',
  SALES_UPDATE: 'sales_update',
  SALES_DELETE: 'sales_delete',
  
  // Reports
  REPORTS_VIEW: 'reports_view',
  REPORTS_EXPORT: 'reports_export',
  
  // Refunds
  REFUNDS_CREATE: 'refunds_create',
  REFUNDS_APPROVE: 'refunds_approve',
  REFUNDS_VIEW: 'refunds_view',
  
  // Settings
  SETTINGS_VIEW: 'settings_view',
  SETTINGS_UPDATE: 'settings_update',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Role = keyof typeof ROLE_PERMISSIONS;
