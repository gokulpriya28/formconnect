-- ============================================================================
-- TRANSPARENT - FARMER TO CUSTOMER MARKETPLACE
-- COMPLETE SUPABASE SCHEMA & RLS MIGRATION
-- ============================================================================
-- Description: Complete schema and RLS setup for the MVP.
-- Replaces previous legacy schema.
-- ============================================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: DATABASE SCHEMA
-- ============================================================================

-- Create custom enum types for status tracking
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'farmer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE (Extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  phone_number TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  delivery_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. PAYMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. REVIEWS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, order_id)
);

-- ----------------------------------------------------------------------------
-- 6. TRANSPORT REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  expected_date DATE NOT NULL,
  pickup_location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 2: TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_products_modtime ON public.products;
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_orders_modtime ON public.orders;
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_payments_modtime ON public.payments;
CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_reviews_modtime ON public.reviews;
CREATE TRIGGER update_reviews_modtime BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_transport_requests_modtime ON public.transport_requests;
CREATE TRIGGER update_transport_requests_modtime BEFORE UPDATE ON public.transport_requests FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- ============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;
CREATE OR REPLACE FUNCTION public.is_farmer() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'farmer');
$$;
CREATE OR REPLACE FUNCTION public.is_customer() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'customer');
$$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
CREATE POLICY "Admin can view all users" ON public.users FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Admin can update any user" ON public.users;
CREATE POLICY "Admin can update any user" ON public.users FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- products policies
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Farmers can insert their own products" ON public.products;
CREATE POLICY "Farmers can insert their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = farmer_id AND public.is_farmer());
DROP POLICY IF EXISTS "Farmers can update their own products" ON public.products;
CREATE POLICY "Farmers can update their own products" ON public.products FOR UPDATE USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);
DROP POLICY IF EXISTS "Farmers can delete their own products" ON public.products;
CREATE POLICY "Farmers can delete their own products" ON public.products FOR DELETE USING (auth.uid() = farmer_id);
DROP POLICY IF EXISTS "Admin can manage all products" ON public.products;
CREATE POLICY "Admin can manage all products" ON public.products FOR ALL USING (public.is_admin());

-- orders policies
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id AND public.is_customer());
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Farmers can view orders related to their products" ON public.orders;
CREATE POLICY "Farmers can view orders related to their products" ON public.orders FOR SELECT USING (auth.uid() = farmer_id);
DROP POLICY IF EXISTS "Farmers can update order status for their products" ON public.orders;
CREATE POLICY "Farmers can update order status for their products" ON public.orders FOR UPDATE USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);
DROP POLICY IF EXISTS "Admin can view and manage all orders" ON public.orders;
CREATE POLICY "Admin can view and manage all orders" ON public.orders FOR ALL USING (public.is_admin());

-- payments policies
DROP POLICY IF EXISTS "Customers can view their own payments" ON public.payments;
CREATE POLICY "Customers can view their own payments" ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.customer_id = auth.uid()));
DROP POLICY IF EXISTS "Farmers can view payments for their orders" ON public.payments;
CREATE POLICY "Farmers can view payments for their orders" ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.farmer_id = auth.uid()));
DROP POLICY IF EXISTS "Admin can view all payments" ON public.payments;
CREATE POLICY "Admin can view all payments" ON public.payments FOR SELECT USING (public.is_admin());

-- reviews policies
DROP POLICY IF EXISTS "Customers can create reviews for delivered orders only" ON public.reviews;
CREATE POLICY "Customers can create reviews for delivered orders only" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id AND public.is_customer() AND EXISTS (SELECT 1 FROM public.orders WHERE orders.id = reviews.order_id AND orders.customer_id = auth.uid() AND orders.status = 'delivered'));
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.reviews;
CREATE POLICY "Customers can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Admin can delete any review" ON public.reviews;
CREATE POLICY "Admin can delete any review" ON public.reviews FOR DELETE USING (public.is_admin());

-- transport requests policies
DROP POLICY IF EXISTS "Farmers can create transport requests" ON public.transport_requests;
CREATE POLICY "Farmers can create transport requests" ON public.transport_requests FOR INSERT WITH CHECK (auth.uid() = farmer_id AND public.is_farmer());
DROP POLICY IF EXISTS "Farmers can view their own transport requests" ON public.transport_requests;
CREATE POLICY "Farmers can view their own transport requests" ON public.transport_requests FOR SELECT USING (auth.uid() = farmer_id);
DROP POLICY IF EXISTS "Admin can manage all transport requests" ON public.transport_requests;
CREATE POLICY "Admin can manage all transport requests" ON public.transport_requests FOR ALL USING (public.is_admin());

-- notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update notification read status" ON public.notifications;
CREATE POLICY "Users can update notification read status" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
CREATE POLICY "Admin can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admin can manage all notifications" ON public.notifications;
CREATE POLICY "Admin can manage all notifications" ON public.notifications FOR ALL USING (public.is_admin());
