import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/api';

const WISHLIST_KEY = 'home_net_wishlist';

function loadWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) && value.every((id) => typeof id === 'string')
      ? value
      : [];
  } catch {
    return [];
  }
}

interface WishlistContextValue {
  productIds: string[];
  isWishlisted: (productId: string) => boolean;
  toggleItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState(loadWishlist);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setProductIds(loadWishlist());
      return;
    }
    api
      .listWishlist()
      .then((products) => {
        setProductIds(products.map((product) => product.id));
        setError(null);
      })
      .catch((error: unknown) => {
        console.error('Unable to load wishlist from the backend:', error);
        setError(
          error instanceof Error ? error.message : 'Unable to load your wishlist.'
        );
      });
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(productIds));
    }
  }, [productIds, isAuthenticated, loading]);

  const removeItem = (productId: string) => {
    setProductIds((current) => current.filter((id) => id !== productId));
  };

  const toggleItem = async (productId: string) => {
    const remove = productIds.includes(productId);
    setProductIds((current) =>
      remove ? current.filter((id) => id !== productId) : [...current, productId]
    );
    if (!isAuthenticated) return;
    try {
      if (remove) await api.removeFromWishlist(productId);
      else await api.addToWishlist(productId);
    } catch (error) {
      setProductIds((current) =>
        remove
          ? current.includes(productId)
            ? current
            : [...current, productId]
          : current.filter((id) => id !== productId)
      );
      throw error;
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        productIds,
        isWishlisted: (productId) => productIds.includes(productId),
        toggleItem,
        removeItem,
      }}
    >
      {error && (
        <div role="alert" className="fixed inset-x-0 top-10 z-[100] bg-error px-4 py-2 text-center text-sm text-white">
          Could not load your wishlist: {error}
        </div>
      )}
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
