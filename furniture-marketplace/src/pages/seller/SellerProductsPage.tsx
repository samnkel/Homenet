import { useEffect, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileSpreadsheet, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatZAR } from '../../utils/format';
import { useProducts } from '../../context/ProductContext';
import { useToast } from '../../context/ToastContext';
import type { Product } from '../../types';
import * as api from '../../services/api';
import { categories } from '../../data/categories';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function SellerProductRow({
  product,
  onUpdated,
  onDeleted,
}: {
  product: Product;
  onUpdated: (product: Product) => void;
  onDeleted: (productId: string) => void;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [priceDraft, setPriceDraft] = useState(String(product.salePrice ?? product.price));
  const { updateProduct, deleteProduct } = useProducts();
  const { toast } = useToast();
  const isInStock = product.stock > 0 && product.status !== 'out_of_stock';

  const savePrice = async () => {
    const price = Number(priceDraft);
    if (!Number.isFinite(price) || price < 0) {
      toast('Enter a valid price of zero or more', 'error');
      return;
    }
    try {
      const updated = await updateProduct(product.id, { price, salePrice: null });
      onUpdated(updated);
      setEditingPrice(false);
      toast('Product price updated', 'success');
    } catch (error) {
      console.error('Unable to update product price:', error);
      toast('Could not update the product price. Please try again.', 'error');
    }
  };

  const toggleStock = async () => {
    try {
      const updated = await updateProduct(
        product.id,
        isInStock
          ? { stock: 0, status: 'out_of_stock' }
          : { stock: 1, status: 'active' }
      );
      onUpdated(updated);
      toast(isInStock ? 'Product marked as sold out' : 'Product marked in stock', 'success');
    } catch (error) {
      console.error('Unable to update product stock:', error);
      toast('Could not update product availability. Please try again.', 'error');
    }
  };

  const removeProduct = async () => {
    if (!window.confirm(`Remove "${product.name}" from your catalogue?`)) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      onDeleted(product.id);
      toast('Product removed from your catalogue', 'success');
    } catch (error) {
      console.error('Unable to delete product:', error);
      toast(
        error instanceof Error ? error.message : 'Could not remove this product.',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-t border-sand">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={product.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <span className="font-medium text-charcoal">{product.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted">{product.category}</td>
      <td className="px-4 py-3 font-medium">
        {editingPrice ? (
          <div className="flex min-w-40 items-center gap-1">
            <span className="text-muted">R</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceDraft}
              onChange={(event) => setPriceDraft(event.target.value)}
              aria-label={`Price for ${product.name}`}
              className="h-9 w-24 rounded border border-sand px-2 outline-none focus:border-brown"
            />
            <button
              type="button"
              onClick={savePrice}
              className="rounded p-1 text-success hover:bg-cream"
              aria-label={`Save price for ${product.name}`}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPriceDraft(String(product.salePrice ?? product.price));
                setEditingPrice(false);
              }}
              className="rounded p-1 text-muted hover:bg-cream"
              aria-label={`Cancel price edit for ${product.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {formatZAR(product.salePrice ?? product.price)}
            <button
              type="button"
              onClick={() => {
                setPriceDraft(String(product.salePrice ?? product.price));
                setEditingPrice(true);
              }}
              className="rounded p-1 text-muted hover:bg-cream hover:text-brown"
              aria-label={`Edit price for ${product.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
      <td className="px-4 py-3">{product.stock}</td>
      <td className="px-4 py-3">
        <Badge variant={isInStock ? 'success' : 'error'}>
          {isInStock ? 'In stock' : 'Sold out'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={isInStock ? 'outline' : 'primary'}
            onClick={toggleStock}
          >
            Mark {isInStock ? 'sold out' : 'in stock'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={removeProduct}
            disabled={deleting}
            aria-label={`Delete ${product.name}`}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Removing…' : 'Delete'}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function SellerProductsPage() {
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createProductsBulk } = useProducts();
  const { toast } = useToast();

  useEffect(() => {
    const loadSellerProducts = async () => {
      try {
        const business = await api.getMyBusiness();
        if (!business) {
          setSellerProducts([]);
          return;
        }
        const products = await api.listProducts({
          businessId: business.id,
          status: '',
        });
        setSellerProducts(products.map(api.toProduct));
        setError(null);
      } catch (loadError) {
        console.error('Unable to load seller products:', loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load seller products.'
        );
      } finally {
        setLoading(false);
      }
    };
    void loadSellerProducts();
  }, []);

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('CSV files must be smaller than 2 MB.');
      }
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error('The CSV has no product rows.');
      const headers = rows[0].map((header) => header.trim().toLowerCase());
      const requiredHeaders = ['name', 'category', 'price', 'stock', 'sku'];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length) {
        throw new Error(`Missing required CSV columns: ${missingHeaders.join(', ')}.`);
      }
      if (rows.length - 1 > 100) {
        throw new Error('You can import up to 100 products in one CSV file.');
      }

      const column = (values: string[], name: string) => {
        const index = headers.indexOf(name);
        return index < 0 ? '' : values[index]?.trim() ?? '';
      };
      const imported = rows.slice(1).map((values, index) => {
        const line = index + 2;
        const name = column(values, 'name');
        const rawCategory = column(values, 'category');
        const category = categories.find(
          (item) => item.name.toLowerCase() === rawCategory.toLowerCase()
        );
        const rawPrice = column(values, 'price');
        const rawStock = column(values, 'stock');
        const sku = column(values, 'sku');
        const price = Number(rawPrice);
        const stock = Number(rawStock);
        const rawSalePrice = column(values, 'saleprice');
        const salePrice = rawSalePrice ? Number(rawSalePrice) : undefined;

        if (!name || !category || !sku || !rawPrice || !rawStock) {
          throw new Error(`Row ${line}: name, valid category, price, stock, and SKU are required.`);
        }
        if (!Number.isFinite(price) || price < 0) {
          throw new Error(`Row ${line}: price must be a valid non-negative number.`);
        }
        if (!Number.isInteger(stock) || stock < 0) {
          throw new Error(`Row ${line}: stock must be a non-negative whole number.`);
        }
        if (
          salePrice !== undefined &&
          (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)
        ) {
          throw new Error(`Row ${line}: salePrice must be between zero and price.`);
        }

        const optional = (key: string) => column(values, key);
        const list = (key: string) =>
          optional(key).split('|').map((value) => value.trim()).filter(Boolean);
        return {
          name,
          category: category.name,
          price,
          stock,
          sku,
          salePrice,
          description: optional('description'),
          material: optional('material'),
          dimensions: optional('dimensions'),
          weight: optional('weight'),
          warranty: optional('warranty'),
          assembly: optional('assembly'),
          care: optional('care'),
          deliveryEstimate: optional('deliveryestimate'),
          colors: list('colors'),
          sizes: list('sizes'),
          images: list('images'),
          style: optional('style'),
          featured: false,
          newArrival: false,
          status: stock > 0 ? 'active' as const : 'out_of_stock' as const,
        };
      });

      const skuSet = new Set<string>();
      for (const product of imported) {
        const normalizedSku = product.sku.toLowerCase();
        if (skuSet.has(normalizedSku)) {
          throw new Error(`The CSV contains duplicate SKU "${product.sku}".`);
        }
        skuSet.add(normalizedSku);
      }

      const created = await createProductsBulk(imported);
      setSellerProducts((current) => [...created, ...current]);
      toast(`${created.length} products imported successfully`, 'success');
    } catch (importError) {
      console.error('Unable to import seller products from CSV:', importError);
      toast(
        importError instanceof Error ? importError.message : 'Could not import the CSV.',
        'error'
      );
    } finally {
      setImporting(false);
      input.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Products</h1>
          <p className="mt-1 text-sm text-muted">{sellerProducts.length} products in your catalogue</p>
        </div>
        <Link to="/seller/products/new">
          <Button>
            <Plus className="h-4 w-4" /> Add product
          </Button>
        </Link>
      </div>
      <section className="mt-5 rounded-xl border border-sand bg-white p-4 shadow-soft">
        <label className="flex flex-col gap-2 text-sm font-medium text-charcoal sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brown" />
            Import multiple products from CSV
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={importing || loading}
            onChange={importCsv}
            className="max-w-full text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-brown file:px-4 file:py-2 file:font-medium file:text-white disabled:opacity-50"
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          Required columns: name, category, price, stock, sku. Optional: description, salePrice, material, dimensions, weight, warranty, assembly, care, deliveryEstimate, colors, sizes, images, style. Separate multiple colors, sizes, and image URLs with |. Maximum 100 products per CSV.
        </p>
        <a
          href="/product-template.csv"
          download
          className="mt-2 inline-flex text-sm font-medium text-brown hover:underline"
        >
          Download CSV template
        </a>
        {importing && <p className="mt-2 text-xs text-muted">Importing products…</p>}
      </section>
      {loading && <p className="mt-6 text-sm text-muted">Loading your products…</p>}
      {error && <p role="alert" className="mt-6 text-sm text-error">{error}</p>}
      {!loading && !error && sellerProducts.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          No products yet. Add your first product to get started.
        </p>
      )}
      <div className="mt-6 overflow-hidden rounded-xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sellerProducts.map((product) => (
              <SellerProductRow
                key={product.id}
                product={product}
                onUpdated={(updated) =>
                  setSellerProducts((current) =>
                    current.map((item) => item.id === updated.id ? updated : item)
                  )
                }
                onDeleted={(productId) =>
                  setSellerProducts((current) =>
                    current.filter((item) => item.id !== productId)
                  )
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
