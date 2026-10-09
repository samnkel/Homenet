import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Package, Star } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ProductCard } from '../../components/product/ProductCard';
import { LoaderAnimation } from '../../components/ui/PageLoader';
import * as api from '../../services/api';
import type { Business, Product } from '../../types';

interface StoreData {
  storeId: string;
  business: Business | null;
  products: Product[];
  error?: string;
}

export function StorePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const loading = !storeData || storeData.storeId !== storeId;
  const matchesStore = storeData?.storeId === storeId;
  const business = matchesStore ? storeData?.business ?? null : null;
  const products = matchesStore ? storeData?.products ?? [] : [];
  const error = matchesStore ? storeData?.error ?? '' : '';

  useEffect(() => {
    if (!storeId) return;

    let active = true;

    const loadStore = async () => {
      try {
        const store = await api.getBusiness(storeId);
        const storeProducts = await api.listAllBusinessProducts(store.id);
        if (!active) return;
        setStoreData({
          storeId,
          business: api.toBusiness(store),
          products: storeProducts.map(api.toProduct),
        });
      } catch (loadError) {
        if (!active) return;
        console.error('Unable to load seller storefront:', loadError);
        setStoreData({
          storeId,
          business: null,
          products: [],
          error:
            loadError instanceof Error
              ? loadError.message
              : 'Could not load this seller’s store.',
        });
      }
    };

    void loadStore();
    return () => {
      active = false;
    };
  }, [storeId]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <LoaderAnimation message="Loading seller store" />
          </div>
        ) : error ? (
          <div className="mx-auto flex min-h-[50vh] max-w-7xl flex-col items-center justify-center px-4 text-center">
            <h1 className="font-display text-2xl font-semibold text-charcoal">
              Store unavailable
            </h1>
            <p role="alert" className="mt-2 text-sm text-error">{error}</p>
          </div>
        ) : business ? (
          <>
            <section className="relative isolate overflow-hidden bg-charcoal">
              <img
                src={business.coverImage || business.logo || '/favicon.svg'}
                alt=""
                className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-charcoal/90 via-charcoal/70 to-charcoal/30" />
              <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-end sm:py-16">
                <img
                  src={business.logo || '/favicon.svg'}
                  alt={`${business.name} logo`}
                  className="h-20 w-20 rounded-xl border-2 border-white/70 bg-white object-cover shadow-soft"
                />
                <div className="text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-3xl font-semibold sm:text-4xl">
                      {business.name}
                    </h1>
                    {business.verified && (
                      <span className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white">
                        Verified seller
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-white/80">
                    {business.description || 'Explore furniture from this local seller.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {[business.location.suburb, business.location.city]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      {business.rating.toFixed(1)} ({business.reviewCount} reviews)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Package className="h-4 w-4" />
                      {products.length} product{products.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
              <div className="mb-6">
                <h2 className="font-display text-2xl font-semibold text-charcoal">
                  Furniture from {business.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Browse all currently available products from this seller.
                </p>
              </div>
              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-sand bg-white px-4 py-16 text-center">
                  <p className="font-medium text-charcoal">No products available right now</p>
                  <p className="mt-1 text-sm text-muted">
                    Please check back later for new furniture.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
