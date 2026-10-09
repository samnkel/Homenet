import { useEffect, useState } from 'react';
import { Link, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageCircle,
  LogOut,
  Store,
  Archive,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { formatZAR } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useProducts } from '../../context/ProductContext';
import { SellerProductsPage } from './SellerProductsPage';
import { SellerAddProductPage } from './SellerAddProductPage';
import { MessagesPage } from '../customer/MessagesPage';
import * as api from '../../services/api';

const NAV = [
  { to: '/seller', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/seller/products', label: 'Products', icon: Package },
  { to: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/seller/history', label: 'History', icon: Archive },
  { to: '/seller/messages', label: 'Messages', icon: MessageCircle },
];

function SellerShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isSeller, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Checking your account…</div>;
  }
  if (!isSeller) return <Navigate to="/login?role=seller" replace />;

  const handleLogout = () => {
    logout();
    toast('Signed out', 'info');
  };

  return (
    <div className="flex min-h-screen bg-ivory">
      <aside className="hidden w-56 shrink-0 border-r border-sand bg-white lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-sand px-4">
          <Store className="h-5 w-5 text-brown" />
          <span className="font-display font-semibold text-charcoal">Seller</span>
        </div>
        <nav className="p-3 space-y-0.5">
          {NAV.map((item) => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to) && item.to !== '/seller';
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brown/10 text-brown'
                    : 'text-stone hover:bg-cream hover:text-charcoal'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 hidden lg:block" style={{ width: '13rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-cream"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-sand bg-white px-4 lg:px-6">
          <p className="text-sm text-muted">
            Signed in as <span className="font-medium text-charcoal">{user?.firstName} {user?.lastName}</span>
          </p>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-brown hover:underline">
              View storefront
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="lg:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SellerOverview() {
  const { products } = useProducts();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<api.ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayPlatformFees, setTodayPlatformFees] = useState(0);

  useEffect(() => {
    Promise.all([api.getMyBusiness(), api.listOrders()])
      .then(([business, orderList]) => {
        setBusinessId(business?.id ?? null);
        setMyOrders(orderList);
        const today = new Date().toDateString();
        const paidToday = orderList.filter(
          (order) =>
            new Date(order.createdAt).toDateString() === today &&
            order.paymentStatus === 'paid'
        );
        setTodayRevenue(paidToday.reduce((sum, order) => sum + order.subtotal, 0));
        setTodayPlatformFees(paidToday.reduce((sum, order) => sum + order.platformFee, 0));
      })
      .catch((loadError: unknown) => {
        console.error('Unable to load seller dashboard:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  const myProducts = products.filter((product) => product.businessId === businessId);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Your live seller overview</p>
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Sales today', value: formatZAR(todayRevenue) },
          { label: 'Orders', value: String(myOrders.length) },
          { label: 'Active products', value: loading ? '…' : String(myProducts.length) },
          { label: 'Platform fee today', value: formatZAR(todayPlatformFees) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-sand bg-white p-5 shadow-soft"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-charcoal">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-charcoal">Recent orders</h2>
          <Link to="/seller/orders" className="text-sm text-brown hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-sand bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream/50 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.slice(0, 5).map((o) => (
                <tr key={o.id} className="border-t border-sand">
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3">{formatZAR(o.total)}</td>
                  <td className="px-4 py-3 capitalize text-muted">{o.status.replace(/_/g, ' ')}</td>
                </tr>
              ))}
              {!loading && myOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SellerOrdersPage() {
  const [orders, setOrders] = useState<api.ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api.listOrders()
      .then((sellerOrders) =>
        setOrders(
          sellerOrders.filter(
            (order) => order.status !== 'delivered' && order.status !== 'cancelled'
          )
        )
      )
      .catch((loadError: unknown) => {
        console.error('Unable to load seller orders:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load orders.');
      })
      .finally(() => setLoading(false));
  }, []);

  const changeStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    try {
      const updated = await api.updateOrderStatus(orderId, status);
      setOrders((current) =>
        current.map((order) => order.id === orderId ? updated : order)
      );
      toast('Order status updated', 'success');
    } catch (updateError) {
      console.error('Unable to update order status:', updateError);
      toast(
        updateError instanceof Error ? updateError.message : 'Could not update order status.',
        'error'
      );
    } finally {
      setUpdatingOrder(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-muted">Manage incoming orders</p>
      {loading && <p className="mt-4 text-sm text-muted">Loading orders…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-sand">
                <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3">{order.customerName}</td>
                <td className="px-4 py-3">{order.items.map((item) => item.productName).join(', ')}</td>
                <td className="px-4 py-3">{formatZAR(order.total)}</td>
                <td className="px-4 py-3">
                  {order.status === 'delivered' || order.status === 'cancelled' ? (
                    <span className="font-medium capitalize text-muted">{order.status}</span>
                  ) : (
                    <select
                      value={order.status}
                      disabled={updatingOrder === order.id}
                      onChange={(event) => void changeStatus(order.id, event.target.value)}
                      aria-label={`Status for order ${order.orderNumber}`}
                      className="rounded border border-sand bg-white px-2 py-1 capitalize"
                    >
                      {['pending', 'confirmed', 'processing', 'shipped'].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">No orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SellerOrderHistoryPage() {
  const [orders, setOrders] = useState<api.ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listOrders()
      .then((sellerOrders) =>
        setOrders(
          sellerOrders.filter(
            (order) => order.status === 'delivered' || order.status === 'cancelled'
          )
        )
      )
      .catch((loadError: unknown) => {
        console.error('Unable to load seller order history:', loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load order history.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Order history</h1>
      <p className="mt-1 text-sm text-muted">
        Delivered orders confirmed by customers and cancelled orders.
      </p>
      {loading && <p className="mt-4 text-sm text-muted">Loading order history…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Final status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-sand">
                <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3">{order.customerName}</td>
                <td className="px-4 py-3">{order.items.map((item) => item.productName).join(', ')}</td>
                <td className="px-4 py-3">{formatZAR(order.total)}</td>
                <td className="px-4 py-3 capitalize">{order.status}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(order.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!loading && !error && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  Delivered and cancelled orders will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SellerDashboard() {
  return (
    <SellerShell>
      <Routes>
        <Route index element={<SellerOverview />} />
        <Route path="products" element={<SellerProductsPage />} />
        <Route path="products/new" element={<SellerAddProductPage />} />
        <Route path="orders" element={<SellerOrdersPage />} />
        <Route path="history" element={<SellerOrderHistoryPage />} />
        <Route path="messages" element={<MessagesPage />} />
      </Routes>
    </SellerShell>
  );
}
