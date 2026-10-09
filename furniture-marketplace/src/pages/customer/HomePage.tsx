import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, MapPin, CheckCircle, Star } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useProducts } from '../../context/ProductContext';
import * as api from '../../services/api';
import type { Business } from '../../types';

export function HomePage() {
  const { products, categories, categoriesError } = useProducts();
  const [localBusinesses, setLocalBusinesses] = useState<Business[]>([]);
  const featured = products.filter((product) => product.featured).slice(0, 8);

  useEffect(() => {
    api.listBusinesses({ status: 'verified' })
      .then((businesses) => setLocalBusinesses(businesses.map(api.toBusiness).slice(0, 4)))
      .catch((error: unknown) => {
        console.error('Unable to load local businesses from the backend:', error);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gold bg-charcoal">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&h=900&fit=crop&q=80"
              alt="Beautiful living room with modern furniture"
              className="h-full w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/70 to-transparent" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-30 lg:py-42">
            <div className="max-w-xl">
              <Badge variant="gold" className="mb-4">
                Trusted local furniture
              </Badge>
              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Make room for
                <span className="mt-1 block font-normal italic text-gold-light">
                  the way you live.
                </span>
              </h1>
              <p className="mt-4 text-lg text-white/80">
                Discover beautiful furniture from trusted local businesses across South Africa.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/search">
                  <Button size="lg" className="w-full sm:w-auto">
                    Explore Furniture
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/search?near=me">
                  <Button variant="outline" size="lg" className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                    <MapPin className="h-4 w-4" />
                    Find Furniture Near You
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <a
            href="#categories"
            aria-label="Scroll down to shop by category"
            className="scroll-cue absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-white/80 transition-colors hover:text-white"
          >
            <span>Scroll to explore</span>
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          </a>
        </section>

        {/* Categories */}
        <section id="categories" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">
                Shop by category
              </h2>
              <p className="mt-1 text-muted">Find the perfect piece for every room</p>
            </div>
            <Link
              to="/search"
              className="hidden items-center gap-1 text-sm font-medium text-brown hover:underline sm:flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-cream shadow-soft transition-all hover:shadow-card"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-sm font-semibold text-white">{cat.name}</h3>
                  <p className="text-xs text-white/70">{cat.productCount} products</p>
                </div>
              </Link>
            ))}
          </div>
          {categoriesError && (
            <p role="alert" className="mt-4 text-sm text-error">
              Could not load category availability: {categoriesError}
            </p>
          )}
        </section>

        {/* Featured products */}
        <section className="bg-cream/50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">
                  Featured furniture
                </h2>
                <p className="mt-1 text-muted">Hand-picked pieces from top local sellers</p>
              </div>
              <Link
                to="/search"
                className="hidden items-center gap-1 text-sm font-medium text-brown hover:underline sm:flex"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Local businesses */}
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">
                Furniture near you
              </h2>
              <p className="mt-1 text-muted">Trusted local businesses in Durban & beyond</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {localBusinesses.map((biz) => (
              <Link
                key={biz.id}
                to={`/store/${biz.slug}`}
                className="group overflow-hidden rounded-xl bg-white shadow-card transition-all hover:shadow-elevated"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={biz.coverImage || biz.logo || '/favicon.svg'}
                    alt={biz.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={biz.logo || '/favicon.svg'}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover ring-2 ring-white shadow-soft"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-semibold text-charcoal group-hover:text-brown">
                          {biz.name}
                        </h3>
                        {biz.verified && (
                          <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <Star className="h-3 w-3 fill-gold text-gold" />
                        <span>{biz.rating}</span>
                        <span>·</span>
                        <span>{biz.location.city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>{biz.deliveryAvailable ? 'Delivery available' : 'Pickup only'}</span>
                    <span>{biz.productCount} products</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full" as-child={undefined}>
                    Visit Store
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Promo banner */}
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="relative overflow-hidden rounded-2xl bg-brown">
            <div className="absolute inset-0 opacity-20">
              <img
                src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&h=400&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="relative flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
              <div>
                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                  Weekend Furniture Sale
                </h2>
                <p className="mt-1 text-white/80">
                  Up to 30% off selected sofas, beds and dining sets. Ends Sunday.
                </p>
              </div>
              <Link to="/search?sale=true">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  Shop the sale
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
