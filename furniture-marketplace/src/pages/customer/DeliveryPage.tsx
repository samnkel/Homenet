import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck, MapPin, Truck } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { formatZAR } from '../../utils/format';
import * as api from '../../services/api';

function deliveryLabel(status: string, paymentStatus: string) {
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'delivered') return 'Delivered';
  if (paymentStatus === 'pending') return 'Awaiting payment';
  if (status === 'shipped') return 'Out for delivery';
  if (status === 'processing') return 'Preparing your order';
  return 'Pending delivery';
}

export function DeliveryPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<api.ApiOrder[]>([]);
  const [ordersLoadedAt, setOrdersLoadedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const customerOrders = await api.listOrders();
      setOrdersLoadedAt(Date.now());
      setOrders(
        customerOrders.filter(
          (order) =>
            order.paymentStatus === 'paid' ||
            order.paymentStatus === 'pending' ||
            (order.paymentStatus === 'failed' && order.status === 'cancelled')
        )
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load deliveries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      setLoading(false);
      return;
    }
    void loadOrders();
  }, [loadOrders, user]);

  const changeCustomerOrder = async (
    orderId: string,
    action: 'cancel' | 'confirm-delivery'
  ) => {
    const order = orders.find((item) => item.id === orderId);
    const confirmed = action === 'cancel'
      ? window.confirm(
        order?.paymentStatus === 'paid'
          ? 'Cancel this order? Payment was already received. Any refund must be arranged manually with the seller.'
          : 'Cancel this unpaid checkout? All seller orders in this checkout will be cancelled.'
      )
      : window.confirm('Confirm that this order has arrived and is in your hands?');
    if (!confirmed) return;

    setUpdatingOrder(orderId);
    setError('');
    try {
      const updated = action === 'cancel'
        ? await api.cancelCustomerOrder(orderId)
        : await api.confirmOrderDelivery(orderId);
      if (action === 'cancel' && order?.paymentStatus === 'pending') {
        await loadOrders();
      } else {
        setOrders((current) =>
          current.map((currentOrder) =>
            currentOrder.id === updated.id ? updated : currentOrder
          )
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this order.');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const canCancel = (order: api.ApiOrder) =>
    (order.paymentStatus === 'paid' || order.paymentStatus === 'pending') &&
    order.status !== 'cancelled' &&
    order.status !== 'delivered' &&
    ordersLoadedAt - Date.parse(order.createdAt) <= 24 * 60 * 60 * 1000;

  const pageContent = authLoading || loading ? (
    <div className="rounded-xl border border-sand bg-white p-8 text-center text-muted">
      Loading your deliveries…
    </div>
  ) : !user || user.role !== 'customer' ? (
    <div className="rounded-xl border border-sand bg-white p-8 text-center shadow-soft">
      <PackageCheck className="mx-auto h-9 w-9 text-brown" />
      <h1 className="mt-3 font-display text-2xl font-semibold text-charcoal">
        Sign in to track deliveries
      </h1>
      <p className="mt-2 text-sm text-muted">
        Your paid orders and delivery updates will appear here.
      </p>
      <Link to="/login" className="mt-5 inline-block">
        <Button>Sign in</Button>
      </Link>
    </div>
  ) : (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-charcoal">My deliveries</h1>
        <p className="mt-2 text-sm text-muted">
          Track your orders, confirm delivery, or cancel within 24 hours.
        </p>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-error">{error}</p>}
      {orders.length === 0 && !error ? (
        <div className="rounded-xl border border-sand bg-white p-8 text-center shadow-soft">
          <PackageCheck className="mx-auto h-9 w-9 text-sand" />
          <h2 className="mt-3 font-display text-xl font-semibold text-charcoal">
            No deliveries yet
          </h2>
          <p className="mt-2 text-sm text-muted">
            Your checkout and paid orders will appear here with their current status.
          </p>
          <Link to="/search" className="mt-5 inline-block">
            <Button>Browse furniture</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <article
              key={order.id}
              className="overflow-hidden rounded-xl border border-sand bg-white shadow-soft"
            >
              <header className="flex flex-col gap-3 border-b border-sand bg-cream/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-muted">Order</p>
                  <p className="font-semibold text-charcoal">{order.orderNumber}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-brown">
                  <Truck className="h-4 w-4" />
                  {deliveryLabel(order.status, order.paymentStatus)}
                </div>
              </header>
              <div className="space-y-4 p-5">
                <div className="divide-y divide-sand">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt=""
                          className="h-16 w-20 rounded-lg bg-cream object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-cream">
                          <PackageCheck className="h-6 w-6 text-sand" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-charcoal">{item.productName}</p>
                        <p className="mt-1 text-xs text-muted">
                          Quantity: {item.quantity}
                          {item.variant ? ` · ${item.variant}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-charcoal">
                        {formatZAR(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 border-t border-sand pt-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brown" />
                    <div>
                      <p className="font-medium text-charcoal">Delivering to</p>
                      <p className="mt-1 text-muted">
                        {order.deliveryAddress.street}, {order.deliveryAddress.suburb}
                        <br />
                        {order.deliveryAddress.city}, {order.deliveryAddress.province}{' '}
                        {order.deliveryAddress.postalCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-medium text-charcoal">Seller: {order.businessName}</p>
                    <p className="mt-1 text-muted">
                      {order.estimatedDelivery
                        ? `Estimated delivery: ${order.estimatedDelivery}`
                        : 'Delivery estimate pending'}
                    </p>
                    <p className="mt-2 font-semibold text-charcoal">
                      {order.paymentStatus === 'paid' ? 'Total paid' : 'Order total'}:{' '}
                      {formatZAR(order.total)}
                    </p>
                  </div>
                </div>
                {order.status === 'cancelled' && (
                  <p className="rounded-lg border border-sand bg-cream p-3 text-sm text-muted">
                    {order.paymentStatus === 'paid'
                      ? 'This order is cancelled. Payment was not automatically refunded; contact the seller to arrange a refund.'
                      : 'This unpaid checkout was cancelled.'}
                  </p>
                )}
                {order.status !== 'cancelled' &&
                  order.status !== 'delivered' &&
                  !canCancel(order) && (
                    <p className="text-right text-xs text-muted">
                      The 24-hour cancellation window has expired.
                    </p>
                  )}
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-sand pt-4">
                    {order.paymentStatus === 'paid' && (
                      <Button
                        type="button"
                        variant="outline"
                        loading={updatingOrder === order.id}
                        disabled={updatingOrder !== null}
                        onClick={() => void changeCustomerOrder(order.id, 'confirm-delivery')}
                      >
                        I received this order
                      </Button>
                    )}
                    {canCancel(order) && (
                      <Button
                        type="button"
                        variant="danger"
                        loading={updatingOrder === order.id}
                        disabled={updatingOrder !== null}
                        onClick={() => void changeCustomerOrder(order.id, 'cancel')}
                      >
                        Cancel order
                      </Button>
                    )}
                  </div>
                )}
                {order.trackingSteps.length > 0 && (
                  <ol className="flex flex-wrap gap-x-5 gap-y-2 border-t border-sand pt-4">
                    {order.trackingSteps.map((step) => (
                      <li
                        key={step.label}
                        className={`text-xs ${
                          step.completed ? 'font-medium text-success' : 'text-muted'
                        }`}
                      >
                        <span aria-hidden="true">{step.completed ? '✓ ' : '○ '}</span>
                        {step.label}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{pageContent}</main>
      <Footer />
    </div>
  );
}
