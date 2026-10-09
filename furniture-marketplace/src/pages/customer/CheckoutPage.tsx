import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, CreditCard, Building2, Smartphone, ArrowLeft } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { LoaderAnimation } from '../../components/ui/PageLoader';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatZAR } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const STEPS = ['Address', 'Delivery', 'Payment', 'Review'] as const;

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const paymentReturn = searchParams.get('payment') === 'return';
  const paymentCancelled = searchParams.get('payment') === 'cancelled';
  const paymentReference = searchParams.get('reference');
  const [step, setStep] = useState(0);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [confirmedEstimatedDelivery, setConfirmedEstimatedDelivery] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    'pending' | 'paid' | 'failed' | null
  >(null);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [paymentStatusError, setPaymentStatusError] = useState('');

  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    suburb: '',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    postalCode: '',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');

  const deliveryFee = deliveryMethod === 'express' ? 550 : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (!paymentReturn) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const checkPayment = async () => {
      if (!paymentReference) {
        setPaymentStatusError('The payment reference is missing.');
        setCheckingPayment(false);
        return;
      }

      try {
        const payment = await api.getPaymentStatus(paymentReference);
        if (!active) return;
        setPaymentStatus(payment.status);
        setOrderNumber(payment.orderNumbers.join(', '));
        setConfirmedTotal(payment.total);
        setAddress((current) => ({
          ...current,
          suburb: payment.deliveryAddress.suburb ?? current.suburb,
          city: payment.deliveryAddress.city ?? current.city,
        }));
        setConfirmedEstimatedDelivery(payment.estimatedDelivery ?? '');
        if (payment.status === 'paid') {
          clearCart();
          setOrderPlaced(true);
          setCheckingPayment(false);
          return;
        }
        if (payment.status === 'failed' || attempts >= 20) {
          setCheckingPayment(false);
          return;
        }
        attempts += 1;
        timer = setTimeout(() => void checkPayment(), 3000);
      } catch (error) {
        if (!active) return;
        if (attempts < 20) {
          attempts += 1;
          timer = setTimeout(() => void checkPayment(), 3000);
          return;
        }
        setPaymentStatusError(
          error instanceof Error ? error.message : 'Could not check payment status.'
        );
        setCheckingPayment(false);
      }
    };

    void checkPayment();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [clearCart, paymentReference, paymentReturn]);

  if (items.length === 0 && !orderPlaced && !paymentReturn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <h1 className="font-display text-2xl font-semibold">Your cart is empty</h1>
          <Link to="/search" className="mt-4 text-brown underline">
            Browse furniture
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Checking your account…
      </div>
    );
  }

  if (!user || user.role !== 'customer') {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            Sign in to complete your order
          </h1>
          <p className="mt-2 max-w-md text-muted">
            Your cart is saved. Sign in with a customer account or create one to continue checkout.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/login" state={{ from: '/checkout' }}>
              <Button>Sign in</Button>
            </Link>
            <Link to="/register" state={{ from: '/checkout' }}>
              <Button variant="outline">Create account</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (paymentReturn && !orderPlaced) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          {checkingPayment ? (
            <LoaderAnimation message="Confirming your payment securely" />
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-charcoal">
                {paymentStatus === 'failed'
                  ? 'Payment not completed'
                  : 'Payment confirmation delayed'}
              </h1>
              <p className="mt-3 max-w-md text-muted">
                {paymentStatusError ||
                  (paymentStatus === 'failed'
                    ? 'Your payment was not completed. Your cart has been kept so you can try again.'
                    : 'Payment is still pending. Your order will be confirmed after Paystack verifies it.')}
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Check again
                </Button>
                <Link to="/cart">
                  <Button>Return to cart</Button>
                </Link>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold text-charcoal">
            Order confirmed
          </h1>
          <p className="mt-2 text-muted">Thank you for your purchase.</p>
          <div className="mt-8 w-full max-w-md rounded-xl border border-sand bg-white p-6 shadow-soft text-left">
            <p className="text-sm text-muted">Order number</p>
            <p className="text-lg font-semibold text-charcoal">{orderNumber}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Total paid</dt>
                <dd className="font-medium">{formatZAR(confirmedTotal ?? total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Payment</dt>
                <dd className="font-medium">Paystack</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery to</dt>
                <dd className="font-medium text-right">
                  {address.suburb}, {address.city}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Estimated delivery</dt>
                <dd className="font-medium">
                  {confirmedEstimatedDelivery ||
                    (deliveryMethod === 'express' ? '1–2 business days' : '3–5 business days')}
                </dd>
              </div>
            </dl>
          </div>
          <div className="mt-8 flex gap-3">
            <Link to="/delivery">
              <Button>Track delivery</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Continue shopping</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canContinue = () => {
    if (step === 0) {
      return (
        address.firstName &&
        address.lastName &&
        address.phone &&
        address.street &&
        address.suburb &&
        address.city &&
        address.postalCode
      );
    }
    return true;
  };

  const placeOrder = async () => {
    setPlacingOrder(true);
    try {
      const orders = await api.createOrder({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
        })),
        deliveryAddress: {
          label: 'Home',
          street: address.street,
          suburb: address.suburb,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
          firstName: address.firstName,
          lastName: address.lastName,
          phone: address.phone,
        },
        deliveryMethod,
      });
      window.location.assign(orders.paymentUrl);
    } catch (error) {
      console.error('Unable to place order:', error);
      toast(
        error instanceof Error
          ? error.message
          : 'Could not place your order. Please try again.',
        'error'
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-charcoal"
          >
            <ArrowLeft className="h-4 w-4" /> Back to cart
          </Link>
          <h1 className="mt-4 font-display text-2xl font-semibold text-charcoal sm:text-3xl">
            Checkout
          </h1>
          {paymentCancelled && (
            <p className="mt-4 rounded-lg border border-sand bg-cream p-4 text-sm text-charcoal">
              Payment was cancelled or not completed. Your cart is still here; you can try again.
            </p>
          )}

          {/* Steps */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    i < step
                      ? 'bg-success text-white'
                      : i === step
                        ? 'bg-brown text-white'
                        : 'bg-sand text-muted'
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </button>
                <span
                  className={cn(
                    'text-sm font-medium',
                    i === step ? 'text-charcoal' : 'text-muted'
                  )}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="mx-2 h-px w-6 bg-sand sm:w-10" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Step 0: Address */}
              {step === 0 && (
                <div className="rounded-xl border border-sand bg-white p-6 shadow-soft">
                  <h2 className="font-semibold text-charcoal">Delivery address</h2>
                  <p className="mt-1 text-sm text-muted">
                    Enter the address where we should deliver your order.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-charcoal">First name</label>
                      <input
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        value={address.firstName}
                        onChange={(e) =>
                          setAddress({ ...address, firstName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-charcoal">Last name</label>
                      <input
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        value={address.lastName}
                        onChange={(e) =>
                          setAddress({ ...address, lastName: e.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-charcoal">Phone</label>
                      <input
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        placeholder="+27 82 000 0000"
                        value={address.phone}
                        onChange={(e) =>
                          setAddress({ ...address, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-charcoal">Street address</label>
                      <input
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        value={address.street}
                        onChange={(e) =>
                          setAddress({ ...address, street: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-charcoal">Suburb</label>
                      <input
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        value={address.suburb}
                        onChange={(e) =>
                          setAddress({ ...address, suburb: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-charcoal">City</label>
                      <input
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        value={address.city}
                        onChange={(e) =>
                          setAddress({ ...address, city: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-charcoal">Province</label>
                      <select
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        value={address.province}
                        onChange={(e) =>
                          setAddress({ ...address, province: e.target.value })
                        }
                      >
                        <option>KwaZulu-Natal</option>
                        <option>Gauteng</option>
                        <option>Western Cape</option>
                        <option>Eastern Cape</option>
                        <option>Free State</option>
                        <option>Limpopo</option>
                        <option>Mpumalanga</option>
                        <option>North West</option>
                        <option>Northern Cape</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-charcoal">Postal code</label>
                      <input
                        className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                        value={address.postalCode}
                        onChange={(e) =>
                          setAddress({ ...address, postalCode: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Delivery */}
              {step === 1 && (
                <div className="rounded-xl border border-sand bg-white p-6 shadow-soft">
                  <h2 className="font-semibold text-charcoal">Delivery method</h2>
                  <div className="mt-4 space-y-3">
                    {([
                      {
                        id: 'standard',
                        label: 'Standard delivery',
                        desc: '3–5 business days',
                        price: 0,
                      },
                      {
                        id: 'express',
                        label: 'Express delivery',
                        desc: '1–2 business days',
                        price: 550,
                      },
                    ] as const).map((opt) => (
                      <label
                        key={opt.id}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors',
                          deliveryMethod === opt.id
                            ? 'border-brown bg-brown/5'
                            : 'border-sand hover:border-beige'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="delivery"
                            checked={deliveryMethod === opt.id}
                            onChange={() => setDeliveryMethod(opt.id)}
                            className="h-4 w-4 text-brown"
                          />
                          <div>
                            <p className="font-medium text-charcoal">{opt.label}</p>
                            <p className="text-sm text-muted">{opt.desc}</p>
                          </div>
                        </div>
                        <span className="font-semibold">
                          {opt.price === 0 ? 'Free' : formatZAR(opt.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <div className="rounded-xl border border-sand bg-white p-6 shadow-soft">
                  <h2 className="font-semibold text-charcoal">Secure payment</h2>
                  <p className="mt-1 text-sm text-muted">
                    You will be redirected to Paystack to choose an available payment method and
                    complete payment securely. Home-farry &amp; Co never collects or stores your card details.
                  </p>
                  <div className="mt-5 flex items-center gap-3 rounded-lg border border-sand bg-cream/50 p-4">
                    <CreditCard className="h-5 w-5 text-stone" />
                    <Building2 className="h-5 w-5 text-stone" />
                    <Smartphone className="h-5 w-5 text-stone" />
                    <span className="text-sm font-medium text-charcoal">
                      Card, EFT, and other Paystack-supported options
                    </span>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <div className="rounded-xl border border-sand bg-white p-6 shadow-soft">
                  <h2 className="font-semibold text-charcoal">Review your order</h2>
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <p className="font-medium text-charcoal">Deliver to</p>
                      <p className="text-muted">
                        {address.firstName} {address.lastName}
                        <br />
                        {address.street}, {address.suburb}
                        <br />
                        {address.city}, {address.province} {address.postalCode}
                        <br />
                        {address.phone}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">Delivery</p>
                      <p className="text-muted capitalize">
                        {deliveryMethod} · {formatZAR(deliveryFee) === 'R0' ? 'Free' : formatZAR(deliveryFee)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">Payment</p>
                      <p className="text-muted">Paystack secure checkout</p>
                    </div>
                    <div className="border-t border-sand pt-4">
                      {items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex justify-between py-2"
                        >
                          <span className="text-muted">
                            {item.product.name} × {item.quantity}
                          </span>
                          <span className="font-medium">
                            {formatZAR(
                              (item.product.salePrice ?? item.product.price) *
                                item.quantity
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  Back
                </Button>
                {step < 3 ? (
                  <Button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canContinue()}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button onClick={() => void placeOrder()} disabled={placingOrder}>
                    {placingOrder ? 'Connecting to Paystack…' : `Pay securely · ${formatZAR(total)}`}
                  </Button>
                )}
              </div>
            </div>

            {/* Order summary sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 rounded-xl border border-sand bg-white p-6 shadow-soft">
                <h2 className="font-semibold text-charcoal">Order summary</h2>
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3">
                      <img
                        src={item.product.images[0]}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted">Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatZAR(
                          (item.product.salePrice ?? item.product.price) * item.quantity
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <dl className="mt-4 space-y-2 border-t border-sand pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Subtotal</dt>
                    <dd>{formatZAR(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Delivery</dt>
                    <dd>{deliveryFee === 0 ? 'Free' : formatZAR(deliveryFee)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-sand pt-2 text-base font-bold">
                    <dt>Total</dt>
                    <dd>{formatZAR(total)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
