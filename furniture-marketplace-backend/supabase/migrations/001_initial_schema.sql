-- FurniLocal / Furniture Marketplace — Supabase schema
-- Run in Supabase SQL Editor (or via supabase db push)

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== USERS ==========
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(30),
  avatar        TEXT,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'seller', 'admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ========== ADDRESSES ==========
CREATE TABLE IF NOT EXISTS addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         VARCHAR(50) DEFAULT 'Home',
  street        VARCHAR(255) NOT NULL,
  suburb        VARCHAR(100) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  province      VARCHAR(100) NOT NULL,
  postal_code   VARCHAR(20) NOT NULL,
  is_default    BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- ========== BUSINESSES ==========
CREATE TABLE IF NOT EXISTS businesses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(200) NOT NULL UNIQUE,
  owner_id          UUID NOT NULL REFERENCES users(id),
  description       TEXT DEFAULT '',
  logo              TEXT,
  cover_image       TEXT,
  rating            DOUBLE PRECISION DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  product_count     INTEGER DEFAULT 0,
  city              VARCHAR(100) NOT NULL,
  suburb            VARCHAR(100) NOT NULL,
  address           VARCHAR(255) NOT NULL,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  verified          BOOLEAN DEFAULT FALSE,
  status            VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'verified', 'suspended', 'rejected', 'deleted')),
  delivery_available BOOLEAN DEFAULT TRUE,
  delivery_areas    TEXT[] DEFAULT '{}',
  opening_hours     JSONB DEFAULT '[]',
  phone             VARCHAR(30) DEFAULT '',
  email             VARCHAR(255) DEFAULT '',
  response_time     VARCHAR(100) DEFAULT '',
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);

-- ========== CATEGORIES ==========
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL UNIQUE,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  image         TEXT,
  product_count INTEGER DEFAULT 0
);

-- ========== PRODUCTS ==========
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  description       TEXT DEFAULT '',
  category          VARCHAR(50) NOT NULL,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  images            TEXT[] DEFAULT '{}',
  price             DOUBLE PRECISION NOT NULL,
  sale_price        DOUBLE PRECISION,
  rating            DOUBLE PRECISION DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  stock             INTEGER DEFAULT 0,
  sku               VARCHAR(100) NOT NULL UNIQUE,
  material          VARCHAR(255) DEFAULT '',
  dimensions        VARCHAR(255) DEFAULT '',
  weight            VARCHAR(50) DEFAULT '',
  warranty          VARCHAR(255) DEFAULT '',
  assembly          VARCHAR(255) DEFAULT '',
  care              TEXT DEFAULT '',
  delivery_estimate VARCHAR(100) DEFAULT '',
  colors            TEXT[] DEFAULT '{}',
  sizes             TEXT[] DEFAULT '{}',
  style             VARCHAR(100) DEFAULT '',
  featured          BOOLEAN DEFAULT FALSE,
  new_arrival       BOOLEAN DEFAULT FALSE,
  status            VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'draft', 'archived', 'out_of_stock')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops); -- optional if pg_trgm enabled

-- ========== PRODUCT VARIANTS ==========
CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(50),
  size        VARCHAR(50),
  material    VARCHAR(100),
  price       DOUBLE PRECISION NOT NULL,
  sale_price  DOUBLE PRECISION,
  stock       INTEGER DEFAULT 0,
  sku         VARCHAR(100) NOT NULL UNIQUE,
  images      TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- ========== REVIEWS ==========
CREATE TABLE IF NOT EXISTS reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES businesses(id),
  customer_id       UUID NOT NULL REFERENCES users(id),
  customer_name     VARCHAR(200) NOT NULL,
  customer_avatar   TEXT,
  rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title             VARCHAR(200) DEFAULT '',
  comment           TEXT DEFAULT '',
  verified_purchase BOOLEAN DEFAULT FALSE,
  seller_reply      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ========== ORDERS ==========
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      VARCHAR(50) NOT NULL UNIQUE,
  customer_id       UUID NOT NULL REFERENCES users(id),
  customer_name     VARCHAR(200) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  business_id       UUID NOT NULL REFERENCES businesses(id),
  business_name     VARCHAR(200) NOT NULL,
  subtotal          DOUBLE PRECISION NOT NULL,
  delivery_fee      DOUBLE PRECISION DEFAULT 0,
  discount          DOUBLE PRECISION DEFAULT 0,
  platform_fee      DOUBLE PRECISION DEFAULT 0,
  total             DOUBLE PRECISION NOT NULL,
  status            VARCHAR(30) DEFAULT 'pending',
  payment_status    VARCHAR(20) DEFAULT 'pending',
  payment_method    VARCHAR(50) DEFAULT 'card',
  delivery_address  JSONB NOT NULL,
  estimated_delivery VARCHAR(100),
  tracking_steps    JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- ========== ORDER ITEMS ==========
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  product_name  VARCHAR(255) NOT NULL,
  product_image TEXT,
  sku           VARCHAR(100) DEFAULT '',
  variant       VARCHAR(100),
  quantity      INTEGER NOT NULL,
  unit_price    DOUBLE PRECISION NOT NULL,
  total_price   DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ========== WISHLIST ==========
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);

-- ========== MESSAGING ==========
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants      JSONB DEFAULT '[]',
  last_message      TEXT DEFAULT '',
  last_message_at   TIMESTAMPTZ,
  unread_count      INTEGER DEFAULT 0,
  product_id        UUID,
  order_id          UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id),
  sender_name       VARCHAR(200) NOT NULL,
  sender_role       VARCHAR(20) NOT NULL,
  content           TEXT NOT NULL,
  product_id        UUID,
  order_id          UUID,
  read              BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- ========== PROMOTIONS ==========
CREATE TABLE IF NOT EXISTS promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  code            VARCHAR(50) NOT NULL UNIQUE,
  title           VARCHAR(200) NOT NULL,
  description     TEXT DEFAULT '',
  discount_type   VARCHAR(20) NOT NULL,
  discount_value  DOUBLE PRECISION NOT NULL,
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ NOT NULL,
  status          VARCHAR(20) DEFAULT 'scheduled',
  usage_count     INTEGER DEFAULT 0
);

-- ========== NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(30) DEFAULT 'system',
  read        BOOLEAN DEFAULT FALSE,
  link        VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ========== AUDIT LOGS ==========
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp     TIMESTAMPTZ DEFAULT NOW(),
  actor         VARCHAR(200) NOT NULL,
  actor_role    VARCHAR(20) NOT NULL,
  action        VARCHAR(100) NOT NULL,
  resource      VARCHAR(100) NOT NULL,
  resource_id   VARCHAR(100) DEFAULT '',
  status        VARCHAR(20) DEFAULT 'success'
);

-- ========== UPDATED_AT TRIGGER ==========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== ROW LEVEL SECURITY (optional when using Supabase client directly) ==========
-- FastAPI uses the service role / direct connection, so RLS is bypassed there.
-- Enable these if you also query from the browser with the anon key.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Public read for active products & verified businesses
CREATE POLICY "Public read active products" ON products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public read verified businesses" ON businesses
  FOR SELECT USING (status = 'verified');

-- Users can manage their own wishlist
CREATE POLICY "Users manage own wishlist" ON wishlist_items
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Note: auth.uid() only works with Supabase Auth.
-- With custom FastAPI JWT, prefer the API layer for authorization.
