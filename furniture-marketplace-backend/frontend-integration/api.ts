/**
 * Drop-in API client for the furniture-marketplace frontend.
 *
 * 1. Copy this file to: src/services/api.ts
 * 2. Set VITE_API_URL=http://localhost:8000/api in frontend .env
 * 3. Replace AuthContext / ProductContext usage gradually (see notes in README)
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'furnilocal_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------- Auth ----------

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'seller' | 'admin';
  createdAt: string;
}

export async function login(email: string, password: string) {
  const data = await request<{ access_token: string; user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data.user;
}

export async function register(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}) {
  const data = await request<{ access_token: string; user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setToken(data.access_token);
  return data.user;
}

export async function me() {
  return request<ApiUser>('/auth/me');
}

export function logout() {
  setToken(null);
}

// ---------- Products ----------

export interface ProductListParams {
  q?: string;
  category?: string;
  businessId?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listProducts(params: ProductListParams = {}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.category) sp.set('category', params.category);
  if (params.businessId) sp.set('business_id', params.businessId);
  if (params.minPrice != null) sp.set('min_price', String(params.minPrice));
  if (params.maxPrice != null) sp.set('max_price', String(params.maxPrice));
  if (params.featured != null) sp.set('featured', String(params.featured));
  if (params.status) sp.set('status', params.status);
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return request<{ items: unknown[]; total: number; page: number; pageSize: number }>(
    `/products${qs ? `?${qs}` : ''}`
  );
}

export async function getProduct(id: string) {
  return request(`/products/${id}`);
}

export async function createProduct(body: Record<string, unknown>) {
  return request('/products', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateProduct(id: string, body: Record<string, unknown>) {
  return request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteProduct(id: string) {
  return request(`/products/${id}`, { method: 'DELETE' });
}

// ---------- Businesses ----------

export async function listBusinesses(params?: { status?: string; city?: string }) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.city) sp.set('city', params.city);
  const qs = sp.toString();
  return request(`/businesses${qs ? `?${qs}` : ''}`);
}

export async function getBusiness(idOrSlug: string) {
  return request(`/businesses/${idOrSlug}`);
}

export async function myBusiness() {
  return request('/businesses/me/mine');
}

// ---------- Orders ----------

export async function createOrder(body: {
  items: {
    productId: string;
    quantity: number;
    selectedColor?: string;
    selectedSize?: string;
  }[];
  deliveryAddress: {
    label?: string;
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
  };
  paymentMethod?: string;
  deliveryFee?: number;
  discount?: number;
}) {
  return request('/orders', { method: 'POST', body: JSON.stringify(body) });
}

export async function listOrders(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/orders${qs}`);
}

export async function getOrder(id: string) {
  return request(`/orders/${id}`);
}

export async function updateOrderStatus(id: string, status: string) {
  return request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---------- Wishlist ----------

export async function listWishlist() {
  return request('/wishlist');
}

export async function addToWishlist(productId: string) {
  return request(`/wishlist/${productId}`, { method: 'POST' });
}

export async function removeFromWishlist(productId: string) {
  return request(`/wishlist/${productId}`, { method: 'DELETE' });
}

// ---------- Categories & Admin ----------

export async function listCategories() {
  return request('/categories');
}

export async function adminStats() {
  return request('/admin/stats');
}

export async function enrollSeller(body: Record<string, unknown>) {
  return request('/admin/enroll-seller', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
