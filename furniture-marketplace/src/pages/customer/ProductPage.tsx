import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Star,
  Truck,
  Shield,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatZAR } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import type { Business } from '../../types';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, loading } = useProducts();
  const product = products.find((item) => item.id === id);
  const productBusinessId = product?.businessId;
  const [businessResult, setBusinessResult] = useState<{
    id: string;
    business: Business | null;
  } | null>(null);

  useEffect(() => {
    if (!productBusinessId) return;
    api.getBusiness(productBusinessId)
      .then((result) =>
        setBusinessResult({ id: productBusinessId, business: api.toBusiness(result) })
      )
      .catch((error: unknown) => {
        console.error('Unable to load product seller from the backend:', error);
        setBusinessResult({ id: productBusinessId, business: null });
      });
  }, [productBusinessId]);

  const business =
    productBusinessId && businessResult?.id === productBusinessId
      ? businessResult.business
      : null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || '');
  const [selectedSize, setSelectedSize] = useState(product?.sizes[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem } = useCart();
  const { isWishlisted, toggleItem } = useWishlist();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  if (!product && loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center text-muted">
          Loading product…
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ivory">
        <h1 className="font-display text-2xl font-semibold">Product not found</h1>
        <Link to="/search" className="mt-4 text-brown underline">
          Browse furniture
        </Link>
      </div>
    );
  }

  const price = product.salePrice ?? product.price;
  const wishlisted = isWishlisted(product.id);
  const discount = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const handleAddToCart = () => {
    addItem(product, quantity, selectedColor, selectedSize);
    setAddedToCart(true);
    toast('Added to cart', 'success');
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    addItem(product, quantity, selectedColor, selectedSize);
    navigate('/checkout');
  };

  const handleAskSeller = () => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }
    if (user.role !== 'customer') {
      toast('Sign in with a customer account to message this seller.', 'error');
      return;
    }
    setMessageOpen(true);
  };

  const submitSellerMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSendingMessage(true);
    try {
      const message = await api.startProductConversation(product.id, messageText);
      toast('Your message was sent to the seller.', 'success');
      setMessageOpen(false);
      navigate(`/messages?conversationId=${encodeURIComponent(message.conversationId)}`);
    } catch (error) {
      console.error('Unable to send message to seller:', error);
      toast(
        error instanceof Error ? error.message : 'Could not send your message.',
        'error'
      );
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
            <Link to="/" className="hover:text-charcoal">
              Home
            </Link>
            <span>/</span>
            <Link to={`/category/${product.category.toLowerCase()}`} className="hover:text-charcoal">
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-charcoal line-clamp-1">{product.name}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Gallery */}
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                {product.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImage((i) =>
                          i === 0 ? product.images.length - 1 : i - 1
                        )
                      }
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-soft hover:bg-white"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImage((i) =>
                          i === product.images.length - 1 ? 0 : i + 1
                        )
                      }
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-soft hover:bg-white"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={cn(
                        'h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                        selectedImage === i ? 'border-brown' : 'border-transparent'
                      )}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    to={`/store/${business?.slug ?? product.businessId}`}
                    className="text-sm font-medium text-brown hover:underline"
                  >
                    {product.businessName}
                    {business?.verified && (
                      <Badge variant="success" className="ml-2">
                        Verified
                      </Badge>
                    )}
                  </Link>
                  <h1 className="mt-1 font-display text-2xl font-semibold text-charcoal sm:text-3xl">
                    {product.name}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void toggleItem(product.id)
                      .then(() =>
                        toast(
                          wishlisted ? 'Removed from wishlist' : 'Added to wishlist',
                          'success'
                        )
                      )
                      .catch((error: unknown) => {
                        console.error('Unable to update wishlist:', error);
                        toast(
                          error instanceof Error
                            ? error.message
                            : 'Could not update your wishlist.',
                          'error'
                        );
                      });
                  }}
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sand transition-colors hover:bg-cream',
                    wishlisted && 'border-error text-error'
                  )}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart className={cn('h-5 w-5', wishlisted && 'fill-current')} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        'h-4 w-4',
                        s <= Math.round(product.rating)
                          ? 'fill-gold text-gold'
                          : 'text-sand'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating}</span>
                <span className="text-sm text-muted">
                  ({product.reviewCount} reviews)
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-charcoal">
                  {formatZAR(price)}
                </span>
                {product.salePrice && (
                  <>
                    <span className="text-lg text-muted line-through">
                      {formatZAR(product.price)}
                    </span>
                    <Badge variant="error">-{discount}%</Badge>
                  </>
                )}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                {product.description}
              </p>

              {/* Options */}
              {product.colors.length > 0 && product.colors[0] !== 'Custom' && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-charcoal">
                    Colour: <span className="font-normal text-stone">{selectedColor}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                          selectedColor === color
                            ? 'border-brown bg-brown/5 text-brown'
                            : 'border-sand text-stone hover:border-beige'
                        )}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.sizes.length > 0 && product.sizes[0] !== 'Custom' && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-charcoal">
                    Size: <span className="font-normal text-stone">{selectedSize}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                          selectedSize === size
                            ? 'border-brown bg-brown/5 text-brown'
                            : 'border-sand text-stone hover:border-beige'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mt-6 flex items-center gap-4">
                <p className="text-sm font-medium text-charcoal">Quantity</p>
                <div className="flex items-center rounded-lg border border-sand">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center text-stone hover:bg-cream"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="flex h-10 w-10 items-center justify-center text-stone hover:bg-cream"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted">
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || quantity > product.stock}
                >
                  {addedToCart ? (
                    <>
                      <Check className="h-4 w-4" /> Added to cart
                    </>
                  ) : (
                    'Add to Cart'
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={handleBuyNow}
                  disabled={product.stock === 0 || quantity > product.stock}
                >
                  Buy Now
                </Button>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="mt-3 w-full"
                onClick={handleAskSeller}
                disabled={!business}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Ask Seller
              </Button>

              {/* Delivery & warranty */}
              <div className="mt-8 space-y-3 rounded-xl border border-sand bg-cream/40 p-4">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-5 w-5 text-brown" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      Estimated delivery: {product.deliveryEstimate}
                    </p>
                    <p className="text-xs text-muted">Free local delivery on orders over R2,000</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-brown" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">{product.warranty}</p>
                    <p className="text-xs text-muted">Warranty included</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details tabs */}
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="font-display text-xl font-semibold text-charcoal">
                Product details
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Material', product.material],
                  ['Dimensions', product.dimensions],
                  ['Weight', product.weight],
                  ['Assembly', product.assembly],
                  ['Care', product.care],
                  ['SKU', product.sku],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-cream/50 px-4 py-3">
                    <dt className="text-xs font-medium text-muted">{label}</dt>
                    <dd className="mt-0.5 text-sm text-charcoal">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Seller card */}
            {business && (
              <div className="rounded-xl border border-sand bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <img
                    src={business.logo || '/favicon.svg'}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-charcoal">{business.name}</h3>
                      {business.verified && (
                        <Badge variant="success">Verified</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <Star className="h-3 w-3 fill-gold text-gold" />
                      {business.rating} · {business.location.city}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted line-clamp-2">
                  {business.description}
                </p>
                <p className="mt-2 text-xs text-stone">{business.responseTime}</p>
                <Link to={`/store/${business.slug}`} className="mt-4 block">
                  <Button variant="outline" size="sm" fullWidth>
                    Visit Store
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Reviews preview */}
          <div className="mt-16">
            <h2 className="font-display text-xl font-semibold text-charcoal">
              Customer reviews
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  name: 'Thandi M.',
                  rating: 5,
                  title: 'Absolutely love it',
                  comment:
                    'The quality is outstanding. Delivery was on time and the sofa looks even better in person.',
                  date: '12 Sep 2026',
                  verified: true,
                },
                {
                  name: 'James K.',
                  rating: 4,
                  title: 'Great value',
                  comment:
                    'Solid build and comfortable. Slight delay on delivery but seller communicated well.',
                  date: '28 Aug 2026',
                  verified: true,
                },
                {
                  name: 'Priya S.',
                  rating: 5,
                  title: 'Perfect for our lounge',
                  comment:
                    'Exactly as described. The fabric is durable and the colour matches our décor perfectly.',
                  date: '5 Aug 2026',
                  verified: true,
                },
              ].map((review, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-sand bg-white p-5 shadow-soft"
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          'h-3.5 w-3.5',
                          s <= review.rating ? 'fill-gold text-gold' : 'text-sand'
                        )}
                      />
                    ))}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-charcoal">
                    {review.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone line-clamp-3">{review.comment}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-charcoal">{review.name}</span>
                    {review.verified && (
                      <Badge variant="success" className="text-[10px]">
                        Verified Purchase
                      </Badge>
                    )}
                    <span>· {review.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {messageOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/60 px-4 py-8 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMessageOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-message-title"
            className="w-full max-w-lg rounded-2xl border border-sand bg-white p-6 shadow-premium"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="seller-message-title" className="font-display text-xl font-semibold text-charcoal">
                  Ask {business?.name}
                </h2>
                <p className="mt-1 text-sm text-muted">About {product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setMessageOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-cream hover:text-charcoal"
                aria-label="Close message form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitSellerMessage} className="mt-5">
              <label htmlFor="seller-message" className="text-sm font-medium text-charcoal">
                Your message
              </label>
              <textarea
                id="seller-message"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                maxLength={4000}
                rows={5}
                required
                autoFocus
                placeholder="Ask about materials, delivery, sizing, or anything else..."
                className="mt-2 w-full rounded-lg border border-sand bg-ivory px-3 py-2 text-sm outline-none focus:border-brown"
              />
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMessageOpen(false)}
                  disabled={sendingMessage}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sendingMessage || !messageText.trim()}>
                  {sendingMessage ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
