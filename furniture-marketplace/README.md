# Home-farry & Co — Premium Furniture Marketplace

React frontend for a local furniture marketplace connecting customers, furniture businesses, and platform administrators. It uses the FastAPI backend for products, seller details, authentication, wishlist, orders, and admin/seller operations.

## Status

The customer and seller/admin flows are integrated with the FastAPI backend. Cart contents remain in the browser until checkout. Payments are still demo-only; do not treat checkout as real payment capture.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- Lucide React icons
- clsx + tailwind-merge

## Getting Started

```bash
cd furniture-marketplace
npm install
npm run dev
```

Start the backend separately from `furniture-marketplace-backend` using its README setup, then open http://localhost:5173.

The frontend API base URL defaults to `http://localhost:8000/api`. To override it, set `VITE_API_URL` in `.env.local`:

```env
VITE_API_URL=http://localhost:8000/api
```

For Vercel, set `VITE_API_URL` in the project's environment variables to the deployed backend URL, including `/api` (for example, `https://your-backend.onrender.com/api`), then redeploy the frontend. Vite embeds this variable at build time.

For a backend seeded with demo data, use the demo accounts documented in the backend README.

> **Note**: If `npm install` fails in constrained environments, run it on a normal machine. The project uses standard packages.

## Project Structure

```
src/
  components/
    ui/          # Button, Badge, etc.
    layout/      # Header, Footer
    product/     # ProductCard
    business/
  pages/
    customer/    # Home, Search, Product, Cart, Orders...
    seller/      # Dashboard, Products, Orders...
    admin/       # Platform overview, Businesses...
  data/          # Static category/demo presentation data
  types/         # TypeScript domain models
  services/      # FastAPI client and response mapping
  hooks/
  utils/
```

The backend seed script provides **10** South African furniture businesses, **50** products across 12 categories, and customer/seller/admin development accounts.

## Key Routes (Customer)

| Route | Description |
|-------|-------------|
| `/` | Premium homepage |
| `/search` | Search + filters |
| `/product/:id` | Product detail |
| `/store/:slug` | Seller storefront |
| `/cart` | Cart |
| `/checkout` | Multi-step checkout (demo) |
| `/orders` | Order list + tracking |
| `/wishlist` | Saved items |
| `/account` | Profile & settings |
| `/messages` | Customer messages with sellers |

Seller: `/seller/*` (including `/seller/messages`)  
Admin: `/admin/*`

Sellers manage individual products and import multiple products from a CSV on
their Products page. The CSV requires `name,category,price,stock,sku`; optional
product fields and the 100-product import limit are shown beside the upload field.
Customers can confirm receipt of paid orders and cancel paid or unpaid orders
within 24 hours from My deliveries. Paid cancellations require manual refund
handling. Sellers can review delivered and cancelled orders in Order history;
only customers can confirm delivery or cancel orders.

## Design System

Warm ivory backgrounds, charcoal text, warm brown accents, subtle gold, refined typography (Inter + Playfair Display), generous whitespace, soft shadows.

## Development notes

- Configure the backend database and run its seed script before using database-backed features.
- The frontend never receives Supabase database credentials; only the API base URL belongs in Vite configuration.
- Checkout uses the backend to initialize Paystack transactions; configure the Paystack secret key and webhook before accepting payments.

---

Built as a polished marketplace demo with API-backed data and authentication.
