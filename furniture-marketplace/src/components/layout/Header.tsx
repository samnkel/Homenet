import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  ShoppingCart,
  Bell,
  User,
  Menu,
  X,
  Sofa,
  LogOut,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { useProducts } from '../../context/ProductContext';
import { formatZAR } from '../../utils/format';
import * as api from '../../services/api';

const desktopNavClass = (isActive: boolean) =>
  cn(
    'inline-flex shrink-0 items-center rounded-lg px-4 py-2 text-sm transition-all',
    isActive
      ? 'nav-link-shine bg-gradient-to-r from-gold/80 via-gold to-gold/80 font-bold text-charcoal shadow-soft hover:-translate-y-0.5 hover:shadow-card'
      : 'font-semibold text-brown hover:bg-cream'
  );

const mobileNavClass = (isActive: boolean) =>
  cn(
    'flex items-center rounded-lg px-3 py-2.5 text-sm transition-all',
    isActive
      ? 'nav-link-shine bg-gradient-to-r from-gold/80 via-gold to-gold/80 font-bold text-charcoal shadow-soft hover:-translate-y-0.5 hover:shadow-card'
      : 'font-medium text-charcoal hover:bg-cream'
  );

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<api.ApiNotification[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { productIds } = useWishlist();
  const { products } = useProducts();
  const { user, isAuthenticated, isSeller, isAdmin, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    let active = true;
    const loadNotifications = () => {
      void api.listNotifications()
        .then((items) => {
          if (active) setNotifications(items);
        })
        .catch((error: unknown) => {
          console.error('Unable to load notifications:', error);
        });
    };
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  const suggestions =
    searchQuery.trim().length >= 1
      ? products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.businessName.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 6)
      : [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setMobileOpen(false);
    }
  };

  const selectSuggestion = (productId: string, name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    navigate(`/product/${productId}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-sand bg-beige/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-5 lg:gap-8">
        <button
          type="button"
          className="lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-charcoal to-brown shadow-card ring-1 ring-gold/70">
            <Sofa className="h-5 w-5 text-gold-light" strokeWidth={1.8} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-beige bg-gold" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-charcoal">
            Home-farry &amp; Co
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            to="/wishlist"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-stone transition-colors hover:bg-cream hover:text-charcoal"
            aria-label="Wishlist"
          >
            <Heart
              className={cn(
                'h-5 w-5',
                productIds.length > 0 && 'wishlist-heart-pump fill-brown text-brown'
              )}
            />
            {productIds.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brown px-1 text-[10px] font-bold text-white">
                {productIds.length}
              </span>
            )}
          </Link>
          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-stone transition-colors hover:bg-cream hover:text-charcoal"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brown px-1 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login');
                  return;
                }
                setShowNotifications((visible) => !visible);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-stone transition-colors hover:bg-cream hover:text-charcoal"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell className="h-5 w-5" />
              {notifications.some((item) => !item.read) && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-beige bg-error" />
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-sand bg-white shadow-elevated">
                <div className="border-b border-sand px-4 py-3">
                  <h2 className="font-semibold text-charcoal">Notifications</h2>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted">
                      You’re all caught up.
                    </p>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          if (!notification.read) {
                            void api.markNotificationRead(notification.id)
                              .then(() =>
                                setNotifications((items) =>
                                  items.map((item) =>
                                    item.id === notification.id ? { ...item, read: true } : item
                                  )
                                )
                              )
                              .catch((error: unknown) =>
                                console.error('Unable to mark notification read:', error)
                              );
                          }
                          navigate(notification.link || '/');
                        }}
                        className={cn(
                          'block w-full border-b border-sand/70 px-4 py-3 text-left transition-colors hover:bg-cream/60',
                          !notification.read && 'bg-gold/10'
                        )}
                      >
                        <span className="block text-sm font-semibold text-charcoal">
                          {notification.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {isSeller && (
                  <Link
                    to="/seller/messages"
                    onClick={() => setShowNotifications(false)}
                    className="block px-4 py-3 text-center text-sm font-medium text-brown hover:bg-cream"
                  >
                    Open messages
                  </Link>
                )}
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="relative group">
              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-lg px-2 text-stone hover:bg-cream hover:text-charcoal"
              >
                <User className="h-5 w-5" />
                <span className="hidden text-sm font-medium sm:inline">
                  {user?.firstName}
                </span>
              </button>
              <div className="invisible absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-sand bg-white py-1 shadow-elevated opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                {isSeller && (
                  <Link
                    to="/seller"
                    className="block px-4 py-2 text-sm text-charcoal hover:bg-cream"
                  >
                    Seller Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block px-4 py-2 text-sm text-charcoal hover:bg-cream"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-cream"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login?role=seller" className="hidden sm:block">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>

      <nav className="hidden border-t border-gold bg-white lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) => desktopNavClass(isActive)}
          >
            Home
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) => desktopNavClass(isActive)}
          >
            All Furniture
          </NavLink>
          <NavLink
            to="/delivery"
            className={({ isActive }) => desktopNavClass(isActive)}
          >
            Track Delivery
          </NavLink>
          <div ref={searchRef} className="relative ml-auto min-w-0 max-w-md flex-1">
            <form onSubmit={handleSearch}>
              <div className="relative flex w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search furniture..."
                  className="h-9 w-full rounded-l-lg border border-r-0 border-sand bg-ivory pl-9 pr-3 text-sm outline-none transition-colors focus:border-brown focus:bg-white"
                  autoComplete="off"
                />
                <Button type="submit" size="sm" className="rounded-l-none rounded-r-lg px-3">
                  Search
                </Button>
              </div>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-sand bg-white shadow-elevated">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectSuggestion(p.id, p.name)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream"
                  >
                    <img
                      src={p.images[0]}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-charcoal">{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.category} · {p.businessName}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-charcoal">
                      {formatZAR(p.salePrice ?? p.price)}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                    setShowSuggestions(false);
                  }}
                  className="w-full border-t border-sand px-4 py-2.5 text-center text-sm font-medium text-brown hover:bg-cream"
                >
                  See all results for "{searchQuery}"
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div
        className={cn(
          'fixed inset-0 top-[57px] z-40 bg-beige transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col gap-2 p-4">
          <form onSubmit={handleSearch} className="mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search furniture..."
                className="h-11 w-full rounded-lg border border-sand bg-ivory pl-10 pr-4 text-sm outline-none focus:border-brown"
              />
            </div>
          </form>
          <NavLink
            to="/"
            onClick={() => setMobileOpen(false)}
            end
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            Home
          </NavLink>
          <NavLink
            to="/search"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            All Furniture
          </NavLink>
          <NavLink
            to="/delivery"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            Track Delivery
          </NavLink>
          <hr className="my-2 border-sand" />
          <Link
            to="/login?role=seller"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-charcoal hover:bg-cream"
          >
            Sign in
          </Link>
          <div className="flex gap-3 px-3 text-sm">
            <Link
              to="/login?role=seller"
              onClick={() => setMobileOpen(false)}
              className="text-brown hover:underline"
            >
              Seller portal
            </Link>
            <Link
              to="/login?role=admin"
              onClick={() => setMobileOpen(false)}
              className="text-brown hover:underline"
            >
              Admin portal
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
