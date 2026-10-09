# Home-farry & Co API — FastAPI + Supabase

Real backend for the furniture marketplace frontend. Replaces mock data and localStorage demo auth with:

- **PostgreSQL on Supabase**
- **JWT auth** (customer / seller / admin)
- Products, businesses, orders, wishlist, admin enroll-seller
- Platform commission tracking (default 5% of paid product sales)

---

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → New project  
2. Note:
   - **Project URL**
   - **anon key** & **service_role key** (Settings → API)
   - **Database password**
   - **Connection string** (Settings → Database → URI)  
     Prefer **Session mode** pooler, e.g.  
     `postgresql://postgres.XXXX:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres`

3. In the SQL Editor, paste and run:

   `supabase/migrations/001_initial_schema.sql`

   (Or skip this — the FastAPI app will `create_all` tables on startup if they are missing.)

4. If the database already exists, also run `supabase/migrations/005_allow_deleted_business_status.sql` in the Supabase SQL Editor. This allows permanently deleted sellers to be marked as deleted while preserving their order history.

---

## 2. Configure the backend

```bash
cd furniture-marketplace-backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres.XXXX:YOUR_PASSWORD@aws-0-....pooler.supabase.com:5432/postgres
JWT_SECRET=some-long-random-string-at-least-32-characters
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> **Important:** Use the `postgresql+asyncpg://` scheme (not `postgresql://`) so SQLAlchemy async works.

### Configure seller email

Admin seller enrollment and account password resets send email through Gmail SMTP. Use a dedicated Gmail account with 2-Step Verification enabled, then create a Google App Password. Set these values in the backend `.env` (never in the frontend environment):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail-address@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-gmail-address@gmail.com
FRONTEND_URL=http://127.0.0.1:5173
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
```

Use the Gmail App Password, not the account's normal password. Keep it private and restart the backend after changing `.env`. Seller invitations include a generated password that expires in 24 hours and must be changed at first sign-in. Password-reset links for active accounts expire after 20 minutes and can only be used once. If mail delivery is not configured or fails, seller enrollment or password reset reports an explicit error rather than silently claiming success.

Administrator accounts are provisioned outside the public signup flow. Existing admin accounts and credentials remain in the database and can continue signing in through `/login`.

### Production security checklist

- Set `ENVIRONMENT=production` and inject a unique, randomly generated `JWT_SECRET` of at least 32 characters. The API refuses to start in production with a short or example secret. Rotating this secret signs out all users.
- Keep `.env` files out of source control. Use deployment environment secrets for database, Supabase, SMTP, and payment credentials; rotate any credentials that have been shared or exposed.
- Password resets invalidate existing access tokens. Apply the Supabase migration `004_user_token_version.sql` when managing schema with migrations; the application also adds the column during startup.
- Serve the frontend and API over HTTPS and set `CORS_ORIGINS` to only the production frontend origins.

### Configure Paystack checkout

Set `PAYSTACK_SECRET_KEY` in the backend `.env` to your Paystack test secret
key for testing, then switch to your live secret key for production. Keep this
key on the backend only; do not expose it in the frontend environment. Configure
the Paystack dashboard webhook URL as
`https://your-public-api.example.com/api/payments/paystack/webhook`. The webhook
must be publicly reachable over HTTPS.

Checkout redirects customers to Paystack's hosted payment page. The backend
initializes each transaction, reserves stock, validates Paystack's signed
webhook, and verifies successful or failed transactions against Paystack's API
before updating order status. Unpaid reservations expire after
`PAYSTACK_PAYMENT_EXPIRY_MINUTES` (30 minutes by default), and their stock is
released. The browser return URL is not treated as proof of payment.

---

## 3. Seed demo data

```bash
python scripts/seed.py
```

This loads:

- 12 categories  
- 10 businesses (matching the frontend demo)  
- 50 products  
- Demo accounts (see below)

---

## 4. Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

- Health: http://localhost:8000/health  
- Docs: http://localhost:8000/docs  

---

The seed script adds development-only demo users. Do not use seeded demo credentials in a deployed environment; provision production administrators securely and use admin-only seller enrollment.

---

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register customer |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/auth/me` | JWT | Current user |
| POST | `/api/auth/change-password` | Customer JWT | Change password after verifying current password |
| DELETE | `/api/auth/account` | Customer JWT + current password | Permanently delete customer account and linked data |
| POST | `/api/auth/forgot-password` | — | Email a seller reset link |
| POST | `/api/auth/reset-password` | — | Consume a one-time reset link |
| POST | `/api/auth/change-temporary-password` | Temporary seller JWT | Set seller's permanent password |
| GET | `/api/products` | — | List/search/filter |
| GET | `/api/products/{id}` | — | Product detail |
| POST | `/api/products` | seller/admin | Create product |
| POST | `/api/products/bulk` | seller/admin | Create up to 100 products atomically |
| PATCH | `/api/products/{id}` | seller/admin | Update product |
| DELETE | `/api/products/{id}` | seller/admin | Delete product |
| GET | `/api/businesses` | — | List businesses |
| GET | `/api/businesses/{id}` | — | Business detail (id or slug) |
| GET | `/api/businesses/me/mine` | seller | Own business |
| POST | `/api/orders` | customer | Create pending seller orders and Paystack checkout |
| GET | `/api/orders/payment/{reference}` | customer | Check verified checkout status |
| POST | `/api/payments/paystack/webhook` | Paystack | Validate payment notification |
| GET | `/api/orders` | JWT | My orders (role-aware) |
| PATCH | `/api/orders/{id}/status` | seller/admin | Update status |
| POST | `/api/orders/{id}/cancel` | Owning customer | Cancel a paid order within 24 hours (manual refund) or cancel an unpaid checkout |
| POST | `/api/orders/{id}/confirm-delivery` | Owning customer | Confirm the order has been received |

Cancelling an unpaid multi-seller checkout cancels all orders sharing its payment
reference and releases their stock. Sellers can update order preparation and
shipping statuses, but only customers can cancel or confirm delivery.
| POST | `/api/messages` | customer | Start or continue a conversation about a product |
| GET | `/api/messages/conversations` | customer/seller | List own conversations |
| GET/POST | `/api/messages/conversations/{id}` | participant | Read or reply in a conversation |
| GET | `/api/notifications` | JWT | List own notifications |
| PATCH | `/api/notifications/{id}/read` | JWT | Mark own notification as read |
| GET/POST/DELETE | `/api/wishlist/...` | JWT | Wishlist |
| GET | `/api/categories` | — | Categories |
| GET | `/api/admin/stats` | admin | Dashboard stats |
| POST | `/api/admin/enroll-seller` | admin | Create seller + business |
| DELETE | `/api/admin/businesses/{id}` | admin | Permanently delete seller data while preserving order/payment snapshots |

Seller bulk product imports use a CSV with `name,category,price,stock,sku` columns.
Optional columns are `description,salePrice,material,dimensions,weight,warranty,assembly,care,deliveryEstimate,colors,sizes,images,style`;
use `|` to separate multiple colors, sizes, or image URLs. Imports are limited to
100 rows and are rejected as a whole if any row is invalid or a SKU already exists.
Permanent seller deletion removes the seller account and seller-controlled content,
deletes products, and anonymizes the business record needed by retained orders.
Order/payment records and their product-name/price snapshots remain available to
customers and administrators.

Send JWT as: `Authorization: Bearer <token>`

---

## Wire the frontend

The marketplace frontend is wired to this API. Start the backend as described above, then configure the frontend:

1. Copy `furniture-marketplace/.env.example` to `furniture-marketplace/.env`.
2. Set `VITE_API_URL=http://127.0.0.1:8000/api` (or the deployed API URL).
3. Start the frontend with `npm run dev` from `furniture-marketplace`.

The frontend uses the backend for customer/seller/admin login, customer-only registration, seller password recovery, product catalogue reads and seller product edits, and authenticated customer checkout. Cart contents remain in the browser until checkout; orders and stock changes are persisted by the API.

Do not put Supabase service-role credentials or database credentials in the frontend environment. Only the public API base URL belongs in the Vite configuration.

---

## Production notes

- Do **not** expose the service role key to the browser.  
- Verify Paystack transactions on the server before setting `payment_status=paid`.
- Prefer Alembic migrations for schema changes instead of `create_all`.  
- Enable Supabase connection pooling and set appropriate `pool_size`.  
- Rotate `JWT_SECRET` and use HTTPS.
