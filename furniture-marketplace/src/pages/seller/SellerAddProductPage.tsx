import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useProducts } from '../../context/ProductContext';
import { categories } from '../../data/categories';

export function SellerAddProductPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createProduct } = useProducts();
  const [imageUrls, setImageUrls] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Sofas',
    description: '',
    price: '',
    salePrice: '',
    stock: '',
    sku: '',
    material: '',
    dimensions: '',
    colors: '',
    sizes: '',
    warranty: '2 years',
    deliveryEstimate: '3–5 business days',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.price === '' || form.stock === '') {
      toast('Please fill in name, price and stock', 'error');
      return;
    }
    const price = Number(form.price);
    const stock = Number(form.stock);
    const salePrice = form.salePrice === '' ? undefined : Number(form.salePrice);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      toast('Enter a valid price and whole-number stock quantity', 'error');
      return;
    }
    if (salePrice !== undefined && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)) {
      toast('Sale price must be a valid amount no higher than the regular price', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const images = imageUrls
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 6);
      const fallbackImage = categories.find((category) => category.name === form.category)?.image;
      await createProduct({
        name: form.name.trim(),
        category: form.category as (typeof categories)[number]['name'],
        description: form.description.trim(),
        price,
        salePrice,
        stock,
        sku:
          form.sku.trim() ||
          form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        images: images.length ? images : fallbackImage ? [fallbackImage] : [],
        material: form.material.trim(),
        dimensions: form.dimensions.trim(),
        warranty: form.warranty,
        deliveryEstimate: form.deliveryEstimate,
        colors: form.colors.split(',').map((value) => value.trim()).filter(Boolean),
        sizes: form.sizes.split(',').map((value) => value.trim()).filter(Boolean),
        featured: false,
        newArrival: false,
        status: stock > 0 ? 'active' : 'out_of_stock',
      });
      toast(`Product "${form.name}" saved`, 'success');
      navigate('/seller/products');
    } catch (error) {
      console.error('Unable to create product:', error);
      toast(
        error instanceof Error ? error.message : 'Could not save the product. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">
        Add product
      </h1>
      <p className="mt-1 text-sm text-muted">
        Add product details and pricing to your catalogue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-8">
        {/* Images */}
        <section className="rounded-xl border border-sand bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-charcoal">Product images</h2>
          <p className="mt-1 text-xs text-muted">
            Enter up to 6 image URLs, separated by commas. The category image is used if none are provided.
          </p>
          <div className="mt-4">
            <label htmlFor="imageUrls" className="text-sm font-medium">Image URLs</label>
            <textarea
              id="imageUrls"
              className="mt-1 min-h-20 w-full rounded-lg border border-sand bg-ivory px-3 py-2 text-sm outline-none focus:border-brown"
              value={imageUrls}
              onChange={(event) => setImageUrls(event.target.value)}
              placeholder="https://example.com/image-1.jpg, https://example.com/image-2.jpg"
            />
          </div>
        </section>

        {/* Basic info */}
        <section className="rounded-xl border border-sand bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-charcoal">Basic information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Product name *</label>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">SKU</label>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                value={form.sku}
                onChange={(e) => update('sku', e.target.value)}
                placeholder="ABC-SOFA-01"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="mt-1 min-h-[100px] w-full rounded-lg border border-sand bg-ivory px-3 py-2 text-sm outline-none focus:border-brown"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Pricing & stock */}
        <section className="rounded-xl border border-sand bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-charcoal">Pricing & stock</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Price (ZAR) *</label>
              <input
                type="number"
                min="0"
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sale price (optional)</label>
              <input
                type="number"
                min="0"
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                value={form.salePrice}
                onChange={(e) => update('salePrice', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stock quantity *</label>
              <input
                type="number"
                min="0"
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                value={form.stock}
                onChange={(e) => update('stock', e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        {/* Variants */}
        <section className="rounded-xl border border-sand bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-charcoal">Options (size, colour)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Colours (comma-separated)</label>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                placeholder="Grey, Charcoal, Cream"
                value={form.colors}
                onChange={(e) => update('colors', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sizes (comma-separated)</label>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                placeholder="2-Seater, 3-Seater, L-Shape"
                value={form.sizes}
                onChange={(e) => update('sizes', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Material</label>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                value={form.material}
                onChange={(e) => update('material', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dimensions</label>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                placeholder="280cm W × 180cm D × 85cm H"
                value={form.dimensions}
                onChange={(e) => update('dimensions', e.target.value)}
              />
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Saving product…' : 'Save product'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate('/seller/products')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
