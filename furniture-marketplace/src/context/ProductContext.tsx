import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Category, Product, ProductCategory } from '../types';
import * as api from '../services/api';

interface ProductContextValue {
  products: Product[];
  categories: Category[];
  categoriesError: string | null;
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  updateProduct: (
    productId: string,
    updates: Omit<Partial<Product>, 'salePrice'> & { salePrice?: number | null }
  ) => Promise<Product>;
  createProduct: (product: Parameters<typeof api.createProduct>[0]) => Promise<Product>;
  createProductsBulk: (
    products: Parameters<typeof api.createProductsBulk>[0]
  ) => Promise<Product[]>;
  deleteProduct: (productId: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCategories = async () => {
    try {
      const response = await api.listCategories();
      setCategories(
        response.map((category) => ({
          ...category,
          name: category.name as ProductCategory,
          image: category.image ?? '',
        }))
      );
      setCategoriesError(null);
    } catch (loadError) {
      console.error('Unable to load categories from the backend:', loadError);
      setCategoriesError(
        loadError instanceof Error ? loadError.message : 'Unable to load categories.'
      );
    }
  };

  const refreshProducts = async () => {
    setLoading(true);
    try {
      const response = await api.listProducts();
      setProducts(response.map(api.toProduct));
      setError(null);
    } catch (loadError) {
      console.error('Unable to load products from the backend:', loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load products from the backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProducts();
    void refreshCategories();
  }, []);

  const updateProduct = async (
    productId: string,
    updates: Omit<Partial<Product>, 'salePrice'> & { salePrice?: number | null }
  ) => {
    const updatedProduct = await api.updateProduct(productId, updates);
    const product = api.toProduct(updatedProduct);
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? product : item))
    );
    await refreshCategories();
    return product;
  };

  const createProduct = async (product: Parameters<typeof api.createProduct>[0]) => {
    const createdProduct = await api.createProduct(product);
    const result = api.toProduct(createdProduct);
    setProducts((current) => [result, ...current]);
    await refreshCategories();
    return result;
  };

  const createProductsBulk = async (
    products: Parameters<typeof api.createProductsBulk>[0]
  ) => {
    const createdProducts = await api.createProductsBulk(products);
    const results = createdProducts.map(api.toProduct);
    setProducts((current) => [...results, ...current]);
    await refreshCategories();
    return results;
  };

  const deleteProduct = async (productId: string) => {
    await api.deleteProduct(productId);
    setProducts((current) => current.filter((item) => item.id !== productId));
    await refreshCategories();
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        categoriesError,
        loading,
        error,
        refreshProducts,
        refreshCategories,
        updateProduct,
        createProduct,
        createProductsBulk,
        deleteProduct,
      }}
    >
      {error && (
        <div role="alert" className="fixed inset-x-0 top-0 z-[100] bg-error px-4 py-2 text-center text-sm text-white">
          Could not connect to the product service: {error}
        </div>
      )}
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within ProductProvider');
  return context;
}
