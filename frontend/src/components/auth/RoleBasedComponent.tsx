import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RoleBasedComponentProps {
  children: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean; // If true, require all permissions; if false, require any
  fallback?: React.ReactNode;
}

export const RoleBasedComponent: React.FC<RoleBasedComponentProps> = ({
  children,
  roles = [],
  permissions = [],
  requireAll = false,
  fallback = null,
}) => {
  const { hasAnyRole, hasPermission } = useAuth();

  // Check role-based access
  const hasRequiredRole = roles.length === 0 || hasAnyRole(roles);

  // Check permission-based access
  let hasRequiredPermission = true;
  if (permissions.length > 0) {
    if (requireAll) {
      hasRequiredPermission = permissions.every(permission => hasPermission(permission));
    } else {
      hasRequiredPermission = permissions.some(permission => hasPermission(permission));
    }
  }

  const hasAccess = hasRequiredRole && hasRequiredPermission;

  if (!hasAccess && fallback) {
    return <>{fallback}</>;
  }

  return hasAccess ? <>{children}</> : null;
};

// Specific role components for convenience
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleBasedComponent roles={['ADMIN']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const ManagerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleBasedComponent roles={['ADMIN', 'MANAGER']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const CashierOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleBasedComponent roles={['ADMIN', 'MANAGER', 'CASHIER']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

// Permission-based components
export const CanCreateUsers: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleBasedComponent permissions={['user_create']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const CanManageProducts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleBasedComponent permissions={['product_create', 'product_update', 'product_delete']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const CanViewReports: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleBasedComponent permissions={['reports_view']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const CanApproveRefunds: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleBasedComponent permissions={['refunds_approve']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export default RoleBasedComponent;
