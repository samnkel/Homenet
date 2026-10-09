import { useEffect, useState } from 'react';
import { Link, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  LogOut,
  CheckCircle,
  XCircle,
  Shield,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatZAR } from '../../utils/format';
import { cn } from '../../utils/cn';
import { AdminEnrollSellerPage } from './AdminEnrollSellerPage';
import * as api from '../../services/api';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/businesses', label: 'Sellers', icon: Store },
  { to: '/admin/orders', label: 'Sales', icon: ShoppingBag },
  { to: '/admin/fees', label: 'Platform commissions', icon: Shield },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Checking your account…</div>;
  }
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-ivory">
      <aside className="hidden w-56 shrink-0 border-r border-sand bg-white lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-sand px-4">
          <Shield className="h-5 w-5 text-brown" />
          <span className="font-display font-semibold text-charcoal">Admin</span>
        </div>
        <nav className="p-3 space-y-0.5">
          {NAV.map((item) => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
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
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              logout();
              toast('Signed out', 'info');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-cream"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-sand bg-white px-4 lg:px-6">
          <p className="text-sm text-muted">
            Platform admin · <span className="font-medium text-charcoal">{user?.email}</span>
          </p>
          <Link to="/" className="text-sm text-brown hover:underline">
            View marketplace
          </Link>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState<api.ApiDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminStats()
      .then(setStats)
      .catch((loadError: unknown) => {
        console.error('Unable to load admin statistics:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load statistics.');
      });
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">
        Platform overview
      </h1>
      <p className="mt-1 text-sm text-muted">Live marketplace totals from the backend.</p>
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total paid sales', value: stats ? formatZAR(stats.total_revenue) : '—' },
          { label: "Today's revenue", value: stats ? formatZAR(stats.revenue_today) : '—' },
          { label: "Today's orders", value: stats ? String(stats.orders_today) : '—' },
          { label: 'Total users', value: stats ? String(stats.total_users) : '—' },
          {
            label: 'Platform commission earned',
            value: stats ? formatZAR(stats.platform_commission_earned) : '—',
          },
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
    </div>
  );
}

function AdminBusinesses() {
  const { toast } = useToast();
  const [list, setList] = useState<api.ApiBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSellerId, setDeletingSellerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBusinesses()
      .then(setList)
      .catch((loadError: unknown) => {
        console.error('Unable to load businesses:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load businesses.');
      })
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (id: string, status: api.ApiBusiness['status']) => {
    try {
      const result = await api.setBusinessStatus(id, status);
      setList((current) =>
        current.map((business) =>
          business.id === id
            ? { ...business, status: result.status, verified: result.verified }
            : business
        )
      );
    } catch (error) {
      console.error('Unable to update seller status:', error);
      toast(
        error instanceof Error ? error.message : 'Could not update seller status.',
        'error'
      );
      return;
    }
    toast(
      status === 'verified'
        ? 'Seller approved'
        : status === 'rejected'
          ? 'Seller rejected'
          : 'Seller suspended',
      status === 'verified' ? 'success' : 'info'
    );
  };

  const deleteSeller = async (business: api.ApiBusiness) => {
    const confirmed = window.confirm(
      `Permanently delete ${business.name} and its seller account, products, reviews, promotions, and messages? This cannot be undone. Order and payment records will be preserved, with product links removed.`
    );
    if (!confirmed) return;

    setDeletingSellerId(business.id);
    try {
      await api.deleteSeller(business.id);
      setList((current) => current.filter((item) => item.id !== business.id));
      toast('Seller and seller data permanently deleted. Order records were preserved.', 'success');
    } catch (deleteError) {
      console.error('Unable to permanently delete seller:', deleteError);
      toast(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not permanently delete the seller.',
        'error'
      );
    } finally {
      setDeletingSellerId(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">
        Seller enrollment
      </h1>
      <p className="mt-1 text-sm text-muted">
        Approve, reject or suspend furniture businesses
      </p>
      <div className="mt-5">
        <Link to="/admin/enroll">
          <Button>
            <UserPlus className="h-4 w-4" />
            Enroll a seller
          </Button>
        </Link>
      </div>
      {loading && <p className="mt-4 text-sm text-muted">Loading sellers…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="border-t border-sand">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={b.logo ?? ''}
                      alt=""
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-charcoal">{b.name}</p>
                      <p className="text-xs text-muted">{b.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">
                  {b.location.city}
                </td>
                <td className="px-4 py-3">{b.productCount}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      b.status === 'verified'
                        ? 'success'
                        : b.status === 'pending'
                          ? 'warning'
                          : 'error'
                    }
                  >
                    {b.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {b.status !== 'verified' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(b.id, 'verified')}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </Button>
                    )}
                    {b.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(b.id, 'rejected')}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    )}
                    {b.status === 'verified' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(b.id, 'suspended')}
                      >
                        Suspend
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deletingSellerId === b.id}
                      disabled={deletingSellerId !== null && deletingSellerId !== b.id}
                      onClick={() => void deleteSeller(b)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete permanently
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminTodaySales() {
  const [paidOrders, setPaidOrders] = useState<api.ApiOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listOrders()
      .then((orders) =>
        setPaidOrders(orders.filter((order) => order.paymentStatus === 'paid'))
      )
      .catch((loadError: unknown) => {
        console.error('Unable to load orders:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load orders.');
      });
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">
        All paid sales
      </h1>
      <p className="mt-1 text-sm text-muted">
        Every verified purchase · product value · 5% platform commission · amount received
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Platform commission (5%)</th>
              <th className="px-4 py-3">Amount paid</th>
            </tr>
          </thead>
          <tbody>
            {paidOrders.map((o) => (
              <tr key={o.id} className="border-t border-sand">
                <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                <td className="px-4 py-3">{o.businessName}</td>
                <td className="px-4 py-3">{o.customerName}</td>
                <td className="px-4 py-3 max-w-[180px] truncate">
                  {o.items.map((i) => i.productName).join(', ')}
                </td>
                <td className="px-4 py-3">{formatZAR(o.subtotal)}</td>
                <td className="px-4 py-3 text-brown">{formatZAR(o.platformFee)}</td>
                <td className="px-4 py-3 font-medium">{formatZAR(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {paidOrders.length === 0 && (
          <p className="p-8 text-center text-muted">No verified sales yet.</p>
        )}
      </div>
    </div>
  );
}

function AdminFees() {
  const [orders, setOrders] = useState<api.ApiOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listOrders()
      .then(setOrders)
      .catch((loadError: unknown) => {
        console.error('Unable to load platform commissions:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load platform commissions.');
      });
  }, []);
  const summary = Array.from(
    orders.filter((order) => order.paymentStatus === 'paid').reduce((groups, order) => {
      const row = groups.get(order.businessId) ?? {
        businessId: order.businessId,
        businessName: order.businessName,
        orderCount: 0,
        gmv: 0,
        fee: 0,
      };
      row.orderCount += 1;
      row.gmv += order.subtotal;
      row.fee += order.platformFee;
      groups.set(order.businessId, row);
      return groups;
    }, new Map<string, { businessId: string; businessName: string; orderCount: number; gmv: number; fee: number }>()).values()
  );
  const total = summary.reduce((sum, seller) => sum + seller.fee, 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">
      Platform commissions
      </h1>
      <p className="mt-1 text-sm text-muted">
        5% commission on verified paid product sales
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-4 rounded-xl border border-brown/20 bg-brown/5 px-5 py-4">
        <p className="text-sm text-muted">Total platform commission earned</p>
        <p className="text-3xl font-bold text-brown">{formatZAR(total)}</p>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Paid orders</th>
              <th className="px-4 py-3">Gross product sales</th>
              <th className="px-4 py-3">Commission (5%)</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.businessId} className="border-t border-sand">
                <td className="px-4 py-3 font-medium text-charcoal">
                  {s.businessName}
                </td>
                <td className="px-4 py-3">{s.orderCount}</td>
                <td className="px-4 py-3">{formatZAR(s.gmv)}</td>
                <td className="px-4 py-3 font-semibold text-brown">
                  {formatZAR(s.fee)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <AdminShell>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="businesses" element={<AdminBusinesses />} />
        <Route path="enroll" element={<AdminEnrollSellerPage />} />
        <Route path="orders" element={<AdminTodaySales />} />
        <Route path="fees" element={<AdminFees />} />
      </Routes>
    </AdminShell>
  );
}
