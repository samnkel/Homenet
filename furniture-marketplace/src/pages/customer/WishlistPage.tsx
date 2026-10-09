import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { useWishlist } from '../../context/WishlistContext';
import { useProducts } from '../../context/ProductContext';

export function WishlistPage() {
  const { productIds } = useWishlist();
  const { products } = useProducts();
  const wishlistedProducts = productIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product) => product !== undefined);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">
            Your wishlist
          </h1>
          <p className="mt-1 text-sm text-muted">
            {wishlistedProducts.length} saved product{wishlistedProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        {wishlistedProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {wishlistedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-sand bg-cream/30 py-16 text-center">
            <p className="font-medium text-charcoal">Your wishlist is empty</p>
            <p className="mt-1 text-sm text-muted">
              Save furniture you love with the heart button on any product.
            </p>
            <Link to="/search" className="mt-5 inline-block">
              <Button>Browse furniture</Button>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
