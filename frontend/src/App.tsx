import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CashierLayout } from '@/layouts/CashierLayout';
import { PrivateRoute } from '@/router/PrivateRoute';
import { DashboardPage } from '@/features/admin/pages/DashboardPage';
import { ProductsPage } from '@/features/admin/pages/ProductsPage';
import { InventoryPage } from '@/features/admin/pages/InventoryPage';
import { UsersPage } from '@/features/admin/pages/UsersPage';
import { ReportsPage } from '@/features/admin/pages/ReportsPage';
import { SettingsPage } from '@/features/admin/pages/SettingsPage';
import { BillingPage } from '@/features/cashier/pages/BillingPage';
import { InvoiceHistoryPage } from '@/features/cashier/pages/InvoiceHistoryPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthLayout />}>
          <Route index element={<LoginPage />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<PrivateRoute roles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="history" element={<InvoiceHistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Cashier Routes */}
        <Route element={<PrivateRoute roles={['CASHIER', 'ADMIN']} />}>
          <Route path="/cashier" element={<CashierLayout />}>
            <Route index element={<Navigate to="billing" replace />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="history" element={<InvoiceHistoryPage />} />
          </Route>
        </Route>

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
}
