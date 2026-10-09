import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { useProducts } from '../../context/ProductContext';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
];

const PRICE_RANGES = [
  { label: 'Under R5,000', min: 0, max: 5000 },
  { label: 'R5,000 – R10,000', min: 5000, max: 10000 },
  { label: 'R10,000 – R15,000', min: 10000, max: 15000 },
  { label: 'R15,000 – R25,000', min: 15000, max: 25000 },
  { label: 'Over R25,000', min: 25000, max: Infinity },
];

export function SearchPage() {
  const { products, categories, categoriesError, loading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const [sort, setSort] = useState('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : []
  );
  const [selectedPrice, setSelectedPrice] = useState<{ min: number; max: number } | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = [...products];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.businessName.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((p) =>
        selectedCategories.some((c) => p.category.toLowerCase() === c.toLowerCase())
      );
    }

    if (selectedPrice) {
      result = result.filter((p) => {
        const price = p.salePrice ?? p.price;
        return price >= selectedPrice.min && price < selectedPrice.max;
      });
    }

    if (minRating > 0) {
      result = result.filter((p) => p.rating >= minRating);
    }

    if (inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    switch (sort) {
      case 'price-asc':
        result.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
        break;
      case 'price-desc':
        result.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [products, query, selectedCategories, selectedPrice, minRating, inStockOnly, sort]);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPrice(null);
    setMinRating(0);
    setInStockOnly(false);
    setSearchParams(query ? { q: query } : {});
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-charcoal">Category</h3>
        <div className="mt-3 space-y-2">
          {categories.map((cat) => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.name)}
                onChange={() => toggleCategory(cat.name)}
                className="h-4 w-4 rounded border-sand text-brown focus:ring-brown"
              />
              <span className="text-stone">{cat.name}</span>
              <span className="ml-auto text-xs text-muted">{cat.productCount}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-charcoal">Price</h3>
        <div className="mt-3 space-y-2">
          {PRICE_RANGES.map((range) => (
            <label key={range.label} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="price"
                checked={
                  selectedPrice?.min === range.min && selectedPrice?.max === range.max
                }
                onChange={() => setSelectedPrice({ min: range.min, max: range.max })}
                className="h-4 w-4 border-sand text-brown focus:ring-brown"
              />
              <span className="text-stone">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-charcoal">Rating</h3>
        <div className="mt-3 space-y-2">
          {[4, 3].map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="rating"
                checked={minRating === r}
                onChange={() => setMinRating(r)}
                className="h-4 w-4 border-sand text-brown focus:ring-brown"
              />
              <span className="text-stone">{r}+ stars</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-sand text-brown focus:ring-brown"
          />
          <span className="text-stone">In stock only</span>
        </label>
      </div>

      <Button variant="outline" size="sm" fullWidth onClick={clearFilters}>
        Clear all filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Results header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-charcoal">
                {query ? `Results for “${query}”` : 'All furniture'}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {loading
                  ? 'Loading products…'
                  : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-sand px-3 py-2 text-sm font-medium text-stone lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-10 appearance-none rounded-lg border border-sand bg-white pl-3 pr-8 text-sm outline-none focus:border-brown"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </div>
          </div>
          {categoriesError && (
            <p role="alert" className="mt-4 text-sm text-error">
              Could not load category availability: {categoriesError}
            </p>
          )}

          <div className="mt-8 flex gap-8">
            {/* Desktop filters */}
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-28 rounded-xl border border-sand bg-white p-5 shadow-soft">
                <h2 className="text-sm font-semibold text-charcoal">Filters</h2>
                <div className="mt-4">
                  <FilterPanel />
                </div>
              </div>
            </aside>

            {/* Product grid */}
            <div className="flex-1">
              {loading ? (
                <p role="status" className="py-20 text-center text-muted">
                  Loading products…
                </p>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sand bg-cream/30 py-20 text-center">
                  <p className="text-lg font-medium text-charcoal">No products found</p>
                  <p className="mt-1 text-sm text-muted">
                    Try adjusting your filters or search terms
                  </p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-charcoal/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-premium">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-charcoal">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full p-1 hover:bg-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterPanel />
            <Button
              className="mt-6 w-full"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Show {filtered.length} results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
