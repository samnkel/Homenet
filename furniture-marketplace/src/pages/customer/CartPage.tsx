import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { useCart } from '../../context/CartContext';
import { formatZAR } from '../../utils/format';

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cream">
            <ShoppingBag className="h-10 w-10 text-muted" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-semibold text-charcoal">
            Your cart is empty
          </h1>
          <p className="mt-2 text-muted">Browse furniture and add items to get started.</p>
          <Link to="/search" className="mt-6">
            <Button size="lg">
              Explore Furniture <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">
            Shopping cart
          </h1>
          <p className="mt-1 text-sm text-muted">
            {items.length} item{items.length !== 1 ? 's' : ''} in your cart
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const price = item.product.salePrice ?? item.product.price;
                return (
                  <div
                    key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`}
                    className="flex gap-4 rounded-xl border border-sand bg-white p-4 shadow-soft"
                  >
                    <Link to={`/product/${item.productId}`} className="shrink-0">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-24 w-24 rounded-lg object-cover sm:h-28 sm:w-28"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted">{item.product.businessName}</p>
                          <Link
                            to={`/product/${item.productId}`}
                            className="font-medium text-charcoal hover:text-brown"
                          >
                            {item.product.name}
                          </Link>
                          {(item.selectedColor || item.selectedSize) && (
                            <p className="mt-0.5 text-xs text-muted">
                              {[item.selectedColor, item.selectedSize]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="h-8 w-8 shrink-0 rounded-lg text-muted hover:bg-error-light hover:text-error"
                          aria-label="Remove"
                        >
                          <Trash2 className="mx-auto h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center rounded-lg border border-sand">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="flex h-9 w-9 items-center justify-center text-stone hover:bg-cream"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            className="flex h-9 w-9 items-center justify-center text-stone hover:bg-cream"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="font-semibold text-charcoal">
                          {formatZAR(price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 rounded-xl border border-sand bg-white p-6 shadow-soft">
                <h2 className="font-semibold text-charcoal">Order summary</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Subtotal</dt>
                    <dd className="font-medium">{formatZAR(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Delivery</dt>
                    <dd className="font-medium">
                      {deliveryFee === 0 ? (
                        <span className="text-success">Free</span>
                      ) : (
                        formatZAR(deliveryFee)
                      )}
                    </dd>
                  </div>
                  <div className="border-t border-sand pt-3 flex justify-between text-base">
                    <dt className="font-semibold text-charcoal">Total</dt>
                    <dd className="font-bold text-charcoal">{formatZAR(total)}</dd>
                  </div>
                </dl>
                <Link to="/checkout" className="mt-6 block">
                  <Button size="lg" fullWidth>
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  to="/search"
                  className="mt-3 block text-center text-sm text-brown hover:underline"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
