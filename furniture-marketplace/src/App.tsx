import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ProductProvider } from './context/ProductContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { HomePage } from './pages/customer/HomePage';
import { SearchPage } from './pages/customer/SearchPage';
import { ProductPage } from './pages/customer/ProductPage';
import { CartPage } from './pages/customer/CartPage';
import { WishlistPage } from './pages/customer/WishlistPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { DeliveryPage } from './pages/customer/DeliveryPage';
import { MessagesPage } from './pages/customer/MessagesPage';
import { StorePage } from './pages/customer/StorePage';
import { SettingsPage } from './pages/customer/SettingsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import {
  ChangeTemporaryPasswordPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/auth/PasswordPages';
import { SellerDashboard } from './pages/seller/SellerDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { useAuth } from './context/AuthContext';
import { PageLoader } from './components/ui/PageLoader';

function TemporaryPasswordGate() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

function SiteVisitLoader() {
  const location = useLocation();
  const { loading: authLoading } = useAuth();

  if (authLoading) return <PageLoader />;
  return <SiteVisitLoaderTimer key={location.key} />;
}

function SiteVisitLoaderTimer() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  return visible ? <PageLoader /> : null;
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory p-8 text-center">
      <h1 className="font-display text-3xl font-semibold text-charcoal">{title}</h1>
      <p className="mt-2 max-w-md text-muted">Coming soon in the next polish pass.</p>
      <a href="/" className="mt-6 text-brown underline">← Back to home</a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<TemporaryPasswordGate />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/category/:category" element={<SearchPage />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/delivery" element={<DeliveryPage />} />
                    <Route path="/orders" element={<DeliveryPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/change-password" element={<ChangeTemporaryPasswordPage />} />
                    <Route path="/seller/*" element={<SellerDashboard />} />
                    <Route path="/admin/*" element={<AdminDashboard />} />
                    <Route path="/account" element={<Navigate to="/delivery" replace />} />
                    <Route path="/store/:storeId" element={<StorePage />} />
                    <Route path="*" element={<Placeholder title="Page Not Found" />} />
                  </Route>
                </Routes>
                <SiteVisitLoader />
              </BrowserRouter>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
