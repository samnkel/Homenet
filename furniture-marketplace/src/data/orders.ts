import type { Order } from '../types';

/** Simulated marketplace orders for admin analytics & 5% fee tracking */
export const orders: Order[] = [
  {
    id: 'ord-001',
    orderNumber: 'FL-10483',
    customerId: 'cust-01',
    customerName: 'Thandi Mokoena',
    customerEmail: 'thandi.m@email.com',
    businessId: 'biz-001',
    businessName: 'ABC Furniture',
    items: [
      {
        productId: 'prod-001',
        productName: 'Modern L-Shape Sofa',
        productImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200',
        quantity: 1,
        unitPrice: 12999,
        totalPrice: 12999,
        variant: 'Grey / L-Shape',
      },
    ],
    subtotal: 12999,
    deliveryFee: 0,
    discount: 0,
    total: 12999,
    status: 'preparing',
    paymentStatus: 'paid',
    paymentMethod: 'Card',
    deliveryAddress: {
      id: 'a1',
      label: 'Home',
      street: '14 Palm Avenue',
      suburb: 'Umhlanga',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      postalCode: '4319',
    },
    estimatedDelivery: '2026-10-12',
    createdAt: '2026-10-05T08:15:00',
    updatedAt: '2026-10-05T09:00:00',
    trackingSteps: [
      { label: 'Order Placed', completed: true, date: '2026-10-05' },
      { label: 'Payment Confirmed', completed: true, date: '2026-10-05' },
      { label: 'Seller Accepted', completed: true, date: '2026-10-05' },
      { label: 'Preparing', completed: true },
      { label: 'Ready for Delivery', completed: false },
      { label: 'Out for Delivery', completed: false },
      { label: 'Delivered', completed: false },
    ],
  },
  {
    id: 'ord-002',
    orderNumber: 'FL-10484',
    customerId: 'cust-02',
    customerName: 'James van der Berg',
    customerEmail: 'james.vdb@email.com',
    businessId: 'biz-003',
    businessName: 'Jozi Living Co',
    items: [
      {
        productId: 'prod-003',
        productName: 'Modular Sectional Sofa',
        productImage: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200',
        quantity: 1,
        unitPrice: 18999,
        totalPrice: 18999,
      },
    ],
    subtotal: 18999,
    deliveryFee: 350,
    discount: 0,
    total: 19349,
    status: 'out_for_delivery',
    paymentStatus: 'paid',
    paymentMethod: 'EFT',
    deliveryAddress: {
      id: 'a2',
      label: 'Home',
      street: '88 Rivonia Road',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
    },
    estimatedDelivery: '2026-10-06',
    createdAt: '2026-10-05T07:30:00',
    updatedAt: '2026-10-05T10:00:00',
    trackingSteps: [
      { label: 'Order Placed', completed: true, date: '2026-10-05' },
      { label: 'Payment Confirmed', completed: true, date: '2026-10-05' },
      { label: 'Seller Accepted', completed: true, date: '2026-10-05' },
      { label: 'Preparing', completed: true, date: '2026-10-05' },
      { label: 'Ready for Delivery', completed: true, date: '2026-10-05' },
      { label: 'Out for Delivery', completed: true },
      { label: 'Delivered', completed: false },
    ],
  },
  {
    id: 'ord-003',
    orderNumber: 'FL-10485',
    customerId: 'cust-03',
    customerName: 'Priya Naidoo',
    customerEmail: 'priya.n@email.com',
    businessId: 'biz-001',
    businessName: 'ABC Furniture',
    items: [
      {
        productId: 'prod-021',
        productName: 'Hybrid Pocket Spring Mattress',
        productImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=200',
        quantity: 2,
        unitPrice: 6499,
        totalPrice: 12998,
        variant: 'Queen',
      },
    ],
    subtotal: 12998,
    deliveryFee: 0,
    discount: 500,
    total: 12498,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'Card',
    deliveryAddress: {
      id: 'a3',
      label: 'Home',
      street: '22 Beach Road',
      suburb: 'Ballito',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      postalCode: '4420',
    },
    estimatedDelivery: '2026-10-05',
    createdAt: '2026-10-04T14:20:00',
    updatedAt: '2026-10-05T11:00:00',
    trackingSteps: [
      { label: 'Order Placed', completed: true, date: '2026-10-04' },
      { label: 'Payment Confirmed', completed: true, date: '2026-10-04' },
      { label: 'Seller Accepted', completed: true, date: '2026-10-04' },
      { label: 'Preparing', completed: true, date: '2026-10-04' },
      { label: 'Ready for Delivery', completed: true, date: '2026-10-05' },
      { label: 'Out for Delivery', completed: true, date: '2026-10-05' },
      { label: 'Delivered', completed: true, date: '2026-10-05' },
    ],
  },
  {
    id: 'ord-004',
    orderNumber: 'FL-10486',
    customerId: 'cust-04',
    customerName: 'Lerato Dlamini',
    customerEmail: 'lerato.d@email.com',
    businessId: 'biz-002',
    businessName: 'Cape Craft Interiors',
    items: [
      {
        productId: 'prod-002',
        productName: 'Velvet Chesterfield Sofa',
        productImage: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=200',
        quantity: 1,
        unitPrice: 18999,
        totalPrice: 18999,
        variant: 'Emerald / 3-Seater',
      },
    ],
    subtotal: 18999,
    deliveryFee: 450,
    discount: 0,
    total: 19449,
    status: 'accepted',
    paymentStatus: 'paid',
    paymentMethod: 'Instant payment',
    deliveryAddress: {
      id: 'a4',
      label: 'Home',
      street: '15 Albert Road',
      suburb: 'Woodstock',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '7925',
    },
    estimatedDelivery: '2026-10-10',
    createdAt: '2026-10-05T09:45:00',
    updatedAt: '2026-10-05T10:15:00',
    trackingSteps: [
      { label: 'Order Placed', completed: true, date: '2026-10-05' },
      { label: 'Payment Confirmed', completed: true, date: '2026-10-05' },
      { label: 'Seller Accepted', completed: true },
      { label: 'Preparing', completed: false },
      { label: 'Ready for Delivery', completed: false },
      { label: 'Out for Delivery', completed: false },
      { label: 'Delivered', completed: false },
    ],
  },
  {
    id: 'ord-005',
    orderNumber: 'FL-10487',
    customerId: 'cust-05',
    customerName: 'Michael Botha',
    customerEmail: 'mike.b@email.com',
    businessId: 'biz-006',
    businessName: 'Urban Nest Furniture',
    items: [
      {
        productId: 'prod-009',
        productName: 'Extendable Dining Set',
        productImage: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=200',
        quantity: 1,
        unitPrice: 9999,
        totalPrice: 9999,
      },
      {
        productId: 'prod-033',
        productName: 'Dining Chair Set of 4',
        productImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200',
        quantity: 1,
        unitPrice: 3999,
        totalPrice: 3999,
      },
    ],
    subtotal: 13998,
    deliveryFee: 0,
    discount: 0,
    total: 13998,
    status: 'payment_confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'Card',
    deliveryAddress: {
      id: 'a5',
      label: 'Home',
      street: '50 Oxford Road',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
    },
    estimatedDelivery: '2026-10-09',
    createdAt: '2026-10-05T11:00:00',
    updatedAt: '2026-10-05T11:05:00',
    trackingSteps: [
      { label: 'Order Placed', completed: true, date: '2026-10-05' },
      { label: 'Payment Confirmed', completed: true },
      { label: 'Seller Accepted', completed: false },
      { label: 'Preparing', completed: false },
      { label: 'Ready for Delivery', completed: false },
      { label: 'Out for Delivery', completed: false },
      { label: 'Delivered', completed: false },
    ],
  },
];

/** Platform fee: 5% of order subtotal (product value before delivery) */
export const PLATFORM_FEE_RATE = 0.05;

export function getTodaysOrders(): Order[] {
  const today = new Date().toISOString().slice(0, 10);
  // For demo: treat 2026-10-05 as "today" plus any real today
  return orders.filter(
    (o) =>
      o.createdAt.startsWith('2026-10-05') ||
      o.createdAt.startsWith(today)
  );
}

export function getSellerOwedSummary() {
  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
  const bySeller: Record<
    string,
    { businessId: string; businessName: string; gmv: number; fee: number; orderCount: number }
  > = {};

  for (const order of paidOrders) {
    if (!bySeller[order.businessId]) {
      bySeller[order.businessId] = {
        businessId: order.businessId,
        businessName: order.businessName,
        gmv: 0,
        fee: 0,
        orderCount: 0,
      };
    }
    bySeller[order.businessId].gmv += order.subtotal;
    bySeller[order.businessId].fee += order.subtotal * PLATFORM_FEE_RATE;
    bySeller[order.businessId].orderCount += 1;
  }

  return Object.values(bySeller).sort((a, b) => b.fee - a.fee);
}

export function getTotalPlatformFees(): number {
  return getSellerOwedSummary().reduce((sum, s) => sum + s.fee, 0);
}
