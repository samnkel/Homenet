import type { Business, Product, ProductCategory } from '../types';

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const API_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api')
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : 'http://localhost:8000/api';
const TOKEN_KEY = 'furnilocal_token';

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  role: 'customer' | 'seller' | 'admin';
  mustChangePassword?: boolean;
  createdAt: string;
}

export type ApiProduct = Omit<Product, 'category'> & { category: string };

export interface ApiOrder {
  id: string;
  orderNumber: string;
  businessId: string;
  businessName: string;
  customerName: string;
  items: {
    id: string;
    productId: string | null;
    productName: string;
    productImage?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variant?: string | null;
  }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  platformFee: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryAddress: {
    firstName?: string;
    lastName?: string;
    street?: string;
    suburb?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
  };
  estimatedDelivery?: string | null;
  trackingSteps: { label: string; completed: boolean; date?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PaystackCheckout {
  paymentUrl: string;
  reference: string;
  total: number;
}

export interface PaymentStatus {
  reference: string;
  status: 'pending' | 'paid' | 'failed';
  total: number;
  orderNumbers: string[];
  deliveryAddress: { suburb?: string; city?: string };
  estimatedDelivery?: string | null;
}

export interface ApiConversation {
  id: string;
  productId: string | null;
  productName: string;
  otherParticipantName: string;
  otherParticipantRole: 'customer' | 'seller' | 'admin';
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'seller' | 'admin';
  content: string;
  productId: string | null;
  createdAt: string;
  read: boolean;
}

export interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'system' | 'promotion';
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export interface ApiDashboardStats {
  total_users: number;
  total_sellers: number;
  total_products: number;
  total_orders: number;
  orders_today: number;
  platform_commission_earned: number;
  revenue_today: number;
  total_revenue: number;
}

export interface ApiBusiness {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerName: string | null;
  description: string;
  logo: string | null;
  coverImage: string | null;
  rating: number;
  reviewCount: number;
  productCount: number;
  location: {
    city: string;
    suburb: string;
    address: string;
    lat?: number | null;
    lng?: number | null;
  };
  verified: boolean;
  status: 'pending' | 'verified' | 'suspended' | 'rejected';
  deliveryAvailable: boolean;
  deliveryAreas: string[];
  openingHours: { day: string; open: string; close: string }[];
  phone: string;
  email: string;
  responseTime: string;
  joinedAt: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
}

export interface ProductListParams {
  businessId?: string;
  status?: string;
  pageSize?: number;
}

export type CreateProductInput = Pick<
  Product,
  'name' | 'category' | 'price' | 'stock' | 'sku'
> &
  Partial<
    Pick<
      Product,
      | 'description'
      | 'images'
      | 'salePrice'
      | 'material'
      | 'dimensions'
      | 'weight'
      | 'warranty'
      | 'assembly'
      | 'care'
      | 'deliveryEstimate'
      | 'colors'
      | 'sizes'
      | 'style'
      | 'featured'
      | 'newArrival'
      | 'status'
    >
  >;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'detail' in body) {
        const detail = body.detail;
        message = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
    } catch {
      // Keep the HTTP status text when the error response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<ApiUser> {
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
}): Promise<ApiUser> {
  const data = await request<{ access_token: string; user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setToken(data.access_token);
  return data.user;
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function changeTemporaryPassword(newPassword: string): Promise<ApiUser> {
  const data = await request<{ access_token: string; user: ApiUser }>(
    '/auth/change-temporary-password',
    {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }
  );
  setToken(data.access_token);
  return data.user;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiUser> {
  const data = await request<{ access_token: string; user: ApiUser }>(
    '/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }
  );
  setToken(data.access_token);
  return data.user;
}

export function deleteCustomerAccount(
  currentPassword: string,
  confirmation: string
): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ currentPassword, confirmation }),
  });
}

export function logout() {
  setToken(null);
}

export function getCurrentUser() {
  return request<ApiUser>('/auth/me');
}

export function listCategories(): Promise<ApiCategory[]> {
  return request<ApiCategory[]>('/categories');
}

export async function listProducts(
  filters: ProductListParams = { status: 'active' }
): Promise<ApiProduct[]> {
  const params = new URLSearchParams({
    page: '1',
    pageSize: String(filters.pageSize ?? 100),
  });
  if (filters.status !== undefined) params.set('status', filters.status);
  if (filters.businessId) params.set('business_id', filters.businessId);
  const response = await request<{ items: ApiProduct[] }>(`/products?${params}`);
  return response.items;
}

export async function listAllBusinessProducts(businessId: string): Promise<ApiProduct[]> {
  const pageSize = 100;
  const products: ApiProduct[] = [];
  let page = 1;
  let total = 0;

  do {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      business_id: businessId,
      status: 'active',
    });
    const response = await request<{
      items: ApiProduct[];
      total: number;
    }>(`/products?${params}`);
    products.push(...response.items);
    total = response.total;
    page += 1;
  } while (products.length < total);

  return products;
}

export function getMyBusiness(): Promise<ApiBusiness | null> {
  return request<ApiBusiness | null>('/businesses/me/mine');
}

export function listWishlist(): Promise<ApiProduct[]> {
  return request<ApiProduct[]>('/wishlist');
}

export function addToWishlist(productId: string): Promise<void> {
  return request<void>(`/wishlist/${encodeURIComponent(productId)}`, { method: 'POST' });
}

export function removeFromWishlist(productId: string): Promise<void> {
  return request<void>(`/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}

export function listOrders(): Promise<ApiOrder[]> {
  return request<ApiOrder[]>('/orders');
}

export function updateOrderStatus(
  orderId: string,
  status: string
): Promise<ApiOrder> {
  return request<ApiOrder>(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function cancelCustomerOrder(orderId: string): Promise<ApiOrder> {
  return request<ApiOrder>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
  });
}

export function confirmOrderDelivery(orderId: string): Promise<ApiOrder> {
  return request<ApiOrder>(`/orders/${encodeURIComponent(orderId)}/confirm-delivery`, {
    method: 'POST',
  });
}

export function adminStats(): Promise<ApiDashboardStats> {
  return request<ApiDashboardStats>('/admin/stats');
}

export function listBusinesses(filters: { status?: string; city?: string } = {}): Promise<ApiBusiness[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.city) params.set('city', filters.city);
  const query = params.toString();
  return request<ApiBusiness[]>(`/businesses${query ? `?${query}` : ''}`);
}

export function getBusiness(idOrSlug: string): Promise<ApiBusiness> {
  return request<ApiBusiness>(`/businesses/${encodeURIComponent(idOrSlug)}`);
}

export function setBusinessStatus(
  businessId: string,
  status: ApiBusiness['status']
): Promise<{ id: string; status: ApiBusiness['status']; verified: boolean }> {
  const params = new URLSearchParams({ status_value: status });
  return request(`/admin/businesses/${encodeURIComponent(businessId)}/status?${params}`, {
    method: 'PATCH',
  });
}

export function deleteSeller(businessId: string): Promise<void> {
  return request<void>(`/admin/businesses/${encodeURIComponent(businessId)}`, {
    method: 'DELETE',
  });
}

export function enrollSeller(payload: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  description: string;
  city: string;
  suburb: string;
  address: string;
  businessPhone: string;
  businessEmail: string;
  temporaryPassword: string;
}): Promise<ApiBusiness> {
  return request<ApiBusiness>('/admin/enroll-seller', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  productId: string,
  updates: Omit<Partial<Product>, 'salePrice'> & { salePrice?: number | null }
): Promise<ApiProduct> {
  return request<ApiProduct>(`/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteProduct(productId: string): Promise<void> {
  return request<void>(`/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}

export async function createProduct(
  product: CreateProductInput
): Promise<ApiProduct> {
  return request<ApiProduct>('/products', {
    method: 'POST',
    body: JSON.stringify({
      ...product,
      salePrice: product.salePrice ?? null,
    }),
  });
}

export async function createProductsBulk(
  products: CreateProductInput[]
): Promise<ApiProduct[]> {
  return request<ApiProduct[]>('/products/bulk', {
    method: 'POST',
    body: JSON.stringify({
      products: products.map((product) => ({
        ...product,
        salePrice: product.salePrice ?? null,
      })),
    }),
  });
}

export async function createOrder(body: {
  items: {
    productId: string;
    quantity: number;
    selectedColor?: string;
    selectedSize?: string;
  }[];
  deliveryAddress: {
    label: string;
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  deliveryMethod: 'standard' | 'express';
}): Promise<PaystackCheckout> {
  return request<PaystackCheckout>('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getPaymentStatus(reference: string): Promise<PaymentStatus> {
  return request<PaymentStatus>(`/orders/payment/${encodeURIComponent(reference)}`);
}

export function startProductConversation(
  productId: string,
  content: string
): Promise<ApiMessage> {
  return request<ApiMessage>('/messages', {
    method: 'POST',
    body: JSON.stringify({ productId, content }),
  });
}

export function listConversations(): Promise<ApiConversation[]> {
  return request<ApiConversation[]>('/messages/conversations');
}

export function listConversationMessages(conversationId: string): Promise<ApiMessage[]> {
  return request<ApiMessage[]>(
    `/messages/conversations/${encodeURIComponent(conversationId)}`
  );
}

export function sendConversationMessage(
  conversationId: string,
  content: string
): Promise<ApiMessage> {
  return request<ApiMessage>(
    `/messages/conversations/${encodeURIComponent(conversationId)}`,
    { method: 'POST', body: JSON.stringify({ content }) }
  );
}

export function listNotifications(): Promise<ApiNotification[]> {
  return request<ApiNotification[]>('/notifications');
}

export function markNotificationRead(notificationId: string): Promise<void> {
  return request<void>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
  });
}

export function toProduct(product: ApiProduct): Product {
  return { ...product, category: product.category as ProductCategory };
}

export function toBusiness(business: ApiBusiness): Business {
  return {
    ...business,
    ownerName: business.ownerName ?? undefined,
    logo: business.logo ?? '',
    coverImage: business.coverImage ?? business.logo ?? '',
    location: {
      ...business.location,
      lat: business.location.lat ?? undefined,
      lng: business.location.lng ?? undefined,
    },
  };
}
