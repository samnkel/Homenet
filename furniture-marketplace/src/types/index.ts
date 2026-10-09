// Core domain types for the furniture marketplace

export type UserRole = 'customer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerName?: string;
  description: string;
  logo: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  location: {
    city: string;
    suburb: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  distanceKm?: number;
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

export type ProductCategory =
  | 'Sofas'
  | 'Beds'
  | 'Dining'
  | 'Tables'
  | 'Chairs'
  | 'Wardrobes'
  | 'TV Stands'
  | 'Office'
  | 'Outdoor'
  | 'Mattresses'
  | 'Kids'
  | 'Décor';

export interface ProductVariant {
  id: string;
  name: string;
  color?: string;
  size?: string;
  material?: string;
  price: number;
  salePrice?: number;
  stock: number;
  sku: string;
  images: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  businessId: string;
  businessName: string;
  images: string[];
  price: number;
  salePrice?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  material: string;
  dimensions: string;
  weight: string;
  warranty: string;
  assembly: string;
  care: string;
  deliveryEstimate: string;
  colors: string[];
  sizes: string[];
  style: string;
  featured?: boolean;
  newArrival?: boolean;
  status: 'active' | 'draft' | 'archived' | 'out_of_stock';
  variants?: ProductVariant[];
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  sellerReply?: string;
  sellerReplyAt?: string;
  status: 'published' | 'flagged' | 'hidden';
}

export type OrderStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  businessId: string;
  businessName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  deliveryAddress: Address;
  estimatedDelivery: string;
  createdAt: string;
  updatedAt: string;
  trackingSteps: { label: string; completed: boolean; date?: string }[];
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  productId?: string;
  orderId?: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: { id: string; name: string; role: UserRole; avatar?: string }[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  productId?: string;
  orderId?: string;
}

export interface Promotion {
  id: string;
  businessId: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'expired';
  usageCount: number;
}

export interface Dispute {
  id: string;
  disputeNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  businessId: string;
  businessName: string;
  reason: string;
  description: string;
  status: 'under_review' | 'resolved' | 'closed' | 'escalated';
  createdAt: string;
  resolution?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole | 'system';
  action: string;
  resource: string;
  resourceId: string;
  status: 'success' | 'failed';
}

export interface Category {
  id: string;
  name: ProductCategory;
  slug: string;
  image: string;
  productCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'system' | 'promotion';
  read: boolean;
  createdAt: string;
  link?: string;
}
