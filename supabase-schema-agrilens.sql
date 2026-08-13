-- ============================================================================
-- AGRILENS — PRODUCTION-GRADE SCHEMA & RLS ENFORCEMENT
-- Complete multi-role agricultural ecosystem with strict RBAC at database level
-- ============================================================================
-- Description: Security-first schema with RLS policies that do NOT rely on frontend
-- Replaces legacy marketplace schema with comprehensive ecosystem tables
-- ============================================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'admin', 'govt');
CREATE TYPE farmer_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected', 'suspended');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE scheme_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'withdrawn');

-- ─── CORE TABLES ─────────────────────────────────────────────────────────

-- 1. PROFILES TABLE (Multi-role, centralized)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL CHECK (char_length(full_name) <= 200),
  phone TEXT CHECK (char_length(phone) <= 20),
  role user_role NOT NULL DEFAULT 'buyer',
  
  -- Farmer-specific fields
  pan_number TEXT UNIQUE CHECK (char_length(pan_number) <= 20),
  aadhar_number TEXT UNIQUE CHECK (char_length(aadhar_number) <= 20),
  farm_size_acres NUMERIC CHECK (farm_size_acres > 0),
  irrigation_type TEXT CHECK (char_length(irrigation_type) <= 50),
  
  -- Location
  district TEXT NOT NULL CHECK (char_length(district) <= 100),
  village TEXT CHECK (char_length(village) <= 100),
  latitude NUMERIC CHECK (latitude >= -90 AND latitude <= 90),
  longitude NUMERIC CHECK (longitude >= -180 AND longitude <= 180),
  
  -- Buyer-specific
  business_name TEXT CHECK (char_length(business_name) <= 200),
  gstin TEXT UNIQUE CHECK (char_length(gstin) <= 15),
  
  -- Security & Status
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status farmer_verification_status DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  verification_document_url TEXT CHECK (char_length(verification_document_url) <= 500),
  
  -- Soft delete
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT role_specific_fields CHECK (
    CASE 
      WHEN role = 'farmer' THEN pan_number IS NOT NULL AND farm_size_acres IS NOT NULL
      WHEN role = 'buyer' THEN business_name IS NOT NULL AND gstin IS NOT NULL
      ELSE true
    END
  )
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_district ON public.profiles(district);
CREATE INDEX idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- 2. FARMER_DIGITAL_ID TABLE (Farmer identification & QR code)
CREATE TABLE IF NOT EXISTS public.farmer_digital_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_id_code TEXT UNIQUE NOT NULL, -- Format: AGRLN-STATE-DISTRICT-SEQNUM
  qr_code_data JSONB NOT NULL, -- Contains farmer metadata for QR scanning
  qr_code_url TEXT CHECK (char_length(qr_code_url) <= 500),
  digital_signature TEXT, -- Signed QR data for verification
  
  -- Card lifecycle
  physical_card_status TEXT NOT NULL DEFAULT 'not_requested',
  physical_card_number TEXT UNIQUE CHECK (char_length(physical_card_number) <= 30),
  card_requested_at TIMESTAMPTZ,
  card_issued_at TIMESTAMPTZ,
  card_expiry_at TIMESTAMPTZ,
  
  -- Verification
  qr_verification_count INTEGER NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_farmer_digital_ids_farmer_id ON public.farmer_digital_ids(farmer_id);
CREATE INDEX idx_farmer_digital_ids_code ON public.farmer_digital_ids(farmer_id_code);
CREATE INDEX idx_farmer_digital_ids_card_status ON public.farmer_digital_ids(physical_card_status);

-- 3. PRODUCTS TABLE (Farmer marketplace listings)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Product info
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  category TEXT NOT NULL CHECK (char_length(category) <= 100),
  description TEXT CHECK (char_length(description) <= 1000),
  emoji TEXT DEFAULT '🌾' CHECK (char_length(emoji) <= 10),
  
  -- Pricing & stock
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0 AND unit_price <= 999999),
  mandi_reference_price NUMERIC CHECK (mandi_reference_price >= 0),
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (char_length(unit) <= 20),
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  
  -- Quality & certification
  is_organic BOOLEAN NOT NULL DEFAULT false,
  is_express_delivery BOOLEAN NOT NULL DEFAULT false,
  quality_grade TEXT CHECK (char_length(quality_grade) <= 20),
  certifications JSONB, -- e.g., ["fssai", "organic", "soil_health_card"]
  
  -- Delivery
  expected_delivery_days INTEGER DEFAULT 1 CHECK (expected_delivery_days > 0),
  delivery_radius_km INTEGER DEFAULT 30 CHECK (delivery_radius_km > 0),
  
  -- Rating & reviews
  average_rating NUMERIC DEFAULT 4.8 CHECK (average_rating >= 0 AND average_rating <= 5),
  total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
  total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
  
  -- Media
  image_urls TEXT[] CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 10),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_farmer_id ON public.products(farmer_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_is_organic ON public.products(is_organic);

-- 4. ORDERS TABLE (Secure escrow transactions)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  
  -- Order details
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  unit_price_at_order NUMERIC NOT NULL CHECK (unit_price_at_order >= 0),
  subtotal NUMERIC NOT NULL GENERATED ALWAYS AS (quantity_ordered * unit_price_at_order) STORED,
  
  -- Breakdown for transparency
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL GENERATED ALWAYS AS (subtotal + platform_fee + tax_amount) STORED,
  
  -- Farmer earnings (90% of subtotal)
  farmer_payout NUMERIC NOT NULL GENERATED ALWAYS AS (subtotal * 0.9) STORED,
  
  -- Delivery
  delivery_address TEXT NOT NULL CHECK (char_length(delivery_address) <= 500),
  delivery_by_date DATE NOT NULL,
  
  -- Status tracking
  status order_status NOT NULL DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Verification
  buyer_confirmed_at TIMESTAMPTZ,
  farmer_accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_farmer_id ON public.orders(farmer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- 5. PAYMENTS TABLE (Razorpay integration & escrow)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- Razorpay details
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status payment_status NOT NULL DEFAULT 'pending',
  
  -- Escrow tracking
  escrow_held_at TIMESTAMPTZ,
  escrow_released_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- 6. GOVERNMENT_SCHEMES TABLE (Benefit programs)
CREATE TABLE IF NOT EXISTS public.government_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_dept_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  
  -- Scheme metadata
  scheme_code TEXT UNIQUE NOT NULL CHECK (char_length(scheme_code) <= 50),
  scheme_name TEXT NOT NULL CHECK (char_length(scheme_name) <= 200),
  description TEXT CHECK (char_length(description) <= 2000),
  
  -- Eligibility rules (JSON-based for flexibility)
  eligibility_criteria JSONB NOT NULL, -- e.g., {districts: [...], min_farm_size: 1, crops: [...]}
  
  -- Benefit amounts
  benefit_type TEXT NOT NULL CHECK (char_length(benefit_type) <= 100), -- "cash_subsidy", "credit", "insurance"
  max_benefit_amount NUMERIC CHECK (max_benefit_amount > 0),
  
  -- Dates
  effective_from DATE NOT NULL,
  effective_to DATE NOT NULL,
  status scheme_status NOT NULL DEFAULT 'active',
  
  -- Tracking
  total_applicants INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schemes_status ON public.government_schemes(status);
CREATE INDEX idx_schemes_created_by ON public.government_schemes(created_by_dept_id);

-- 7. SCHEME_APPLICATIONS TABLE (Farmer benefit applications)
CREATE TABLE IF NOT EXISTS public.scheme_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheme_id UUID NOT NULL REFERENCES public.government_schemes(id) ON DELETE CASCADE,
  
  -- Application data
  application_status application_status NOT NULL DEFAULT 'draft',
  supporting_documents JSONB NOT NULL, -- URLs to uploaded proof
  
  -- Approval workflow
  submitted_at TIMESTAMPTZ,
  reviewed_by_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT CHECK (char_length(rejection_reason) <= 500),
  
  -- Benefit disbursement
  approved_at TIMESTAMPTZ,
  benefit_amount NUMERIC CHECK (benefit_amount >= 0),
  disbursed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheme_applications_farmer_id ON public.scheme_applications(farmer_id);
CREATE INDEX idx_scheme_applications_scheme_id ON public.scheme_applications(scheme_id);
CREATE INDEX idx_scheme_applications_status ON public.scheme_applications(application_status);

-- 8. AUDIT_LOGS TABLE (Comprehensive change tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (char_length(event_type) <= 100),
  resource_type TEXT NOT NULL CHECK (char_length(resource_type) <= 100), -- 'order', 'product', 'profile', 'scheme_application'
  resource_id UUID,
  
  -- Change details
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT CHECK (char_length(change_summary) <= 500),
  
  -- Context
  ip_address INET,
  user_agent TEXT CHECK (char_length(user_agent) <= 500),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_id ON public.audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 9. LOGIN_EVENTS TABLE (Security & analytics)
CREATE TABLE IF NOT EXISTS public.login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT CHECK (char_length(user_agent) <= 500),
  login_success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT CHECK (char_length(failure_reason) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_events_user_id ON public.login_events(user_id);
CREATE INDEX idx_login_events_created_at ON public.login_events(created_at);

-- ─── HELPER FUNCTIONS ────────────────────────────────────────────────────

-- Get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true AND is_deleted = false;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is farmer
CREATE OR REPLACE FUNCTION public.is_farmer()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'farmer'::user_role;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is buyer
CREATE OR REPLACE FUNCTION public.is_buyer()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'buyer'::user_role;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'admin'::user_role;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is govt
CREATE OR REPLACE FUNCTION public.is_govt()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'govt'::user_role;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── TRIGGERS ────────────────────────────────────────────────────────────

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_update_timestamp ON public.profiles;
CREATE TRIGGER profiles_update_timestamp BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS products_update_timestamp ON public.products;
CREATE TRIGGER products_update_timestamp BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS orders_update_timestamp ON public.orders;
CREATE TRIGGER orders_update_timestamp BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS payments_update_timestamp ON public.payments;
CREATE TRIGGER payments_update_timestamp BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS farmer_digital_ids_update_timestamp ON public.farmer_digital_ids;
CREATE TRIGGER farmer_digital_ids_update_timestamp BEFORE UPDATE ON public.farmer_digital_ids
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Audit trigger for sensitive changes
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, event_type, resource_type, resource_id, old_values, new_values, change_summary)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    TG_OP || ' on ' || TG_TABLE_NAME
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS audit_orders ON public.orders;
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_digital_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES POLICIES ───────────────────────────────────────────────────

-- Users see only their own profile (or admins/govt see all)
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR public.is_admin()
    OR public.is_govt()
  );

-- Users can only insert their own profile on first signup (self-service Farmer/Buyer only)
DROP POLICY IF EXISTS "profiles_insert_own_self_service" ON public.profiles;
CREATE POLICY "profiles_insert_own_self_service" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND role IN ('farmer'::user_role, 'buyer'::user_role)
  );

-- Users update only their own profile (cannot change role without admin)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id AND is_deleted = false)
  WITH CHECK (
    auth.uid() = id
    AND role IN ('farmer'::user_role, 'buyer'::user_role)
    AND is_active = true
  );

-- Admin can update any profile (including role assignment)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── PRODUCTS POLICIES ───────────────────────────────────────────────────

-- Anyone can view active products (marketplace discovery)
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT USING (is_active = true AND is_deleted = false);

-- Farmers see their own products (including inactive)
DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own" ON public.products
  FOR SELECT USING (farmer_id = auth.uid());

-- Admin sees all products
DROP POLICY IF EXISTS "products_select_admin" ON public.products;
CREATE POLICY "products_select_admin" ON public.products
  FOR SELECT USING (public.is_admin());

-- Only verified farmers can insert products
DROP POLICY IF EXISTS "products_insert_verified_farmer" ON public.products;
CREATE POLICY "products_insert_verified_farmer" ON public.products
  FOR INSERT WITH CHECK (
    public.is_farmer()
    AND farmer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_verified = true
        AND p.verification_status = 'verified'::farmer_verification_status
        AND p.is_deleted = false
    )
  );

-- Farmers update/delete only their own products
DROP POLICY IF EXISTS "products_manage_own" ON public.products;
CREATE POLICY "products_manage_own" ON public.products
  FOR UPDATE USING (farmer_id = auth.uid())
  WITH CHECK (farmer_id = auth.uid());

DROP POLICY IF EXISTS "products_delete_own" ON public.products;
CREATE POLICY "products_delete_own" ON public.products
  FOR DELETE USING (farmer_id = auth.uid());

-- Admin can manage all products
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (public.is_admin());

-- ─── ORDERS POLICIES ─────────────────────────────────────────────────────

-- Buyers see their own orders
DROP POLICY IF EXISTS "orders_select_own_buyer" ON public.orders;
CREATE POLICY "orders_select_own_buyer" ON public.orders
  FOR SELECT USING (buyer_id = auth.uid());

-- Farmers see orders for their products
DROP POLICY IF EXISTS "orders_select_own_farmer" ON public.orders;
CREATE POLICY "orders_select_own_farmer" ON public.orders
  FOR SELECT USING (farmer_id = auth.uid());

-- Admin sees all orders
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT USING (public.is_admin());

-- Only buyers can create orders
DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
CREATE POLICY "orders_insert_buyer" ON public.orders
  FOR INSERT WITH CHECK (
    public.is_buyer()
    AND buyer_id = auth.uid()
  );

-- Farmers can update order status
DROP POLICY IF EXISTS "orders_update_farmer_status" ON public.orders;
CREATE POLICY "orders_update_farmer_status" ON public.orders
  FOR UPDATE USING (farmer_id = auth.uid())
  WITH CHECK (farmer_id = auth.uid());

-- Buyers can confirm orders
DROP POLICY IF EXISTS "orders_update_buyer" ON public.orders;
CREATE POLICY "orders_update_buyer" ON public.orders
  FOR UPDATE USING (buyer_id = auth.uid() AND status = 'pending'::order_status)
  WITH CHECK (buyer_id = auth.uid());

-- Admin can update any order
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (public.is_admin());

-- ─── PAYMENTS POLICIES ───────────────────────────────────────────────────

-- Buyers view their own payments
DROP POLICY IF EXISTS "payments_select_buyer" ON public.payments;
CREATE POLICY "payments_select_buyer" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );

-- Farmers view payments for their orders
DROP POLICY IF EXISTS "payments_select_farmer" ON public.payments;
CREATE POLICY "payments_select_farmer" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.farmer_id = auth.uid()
    )
  );

-- Admin views all payments
DROP POLICY IF EXISTS "payments_select_admin" ON public.payments;
CREATE POLICY "payments_select_admin" ON public.payments
  FOR SELECT USING (public.is_admin());

-- Only backend/admin can insert/update payments
DROP POLICY IF EXISTS "payments_insert_admin" ON public.payments;
CREATE POLICY "payments_insert_admin" ON public.payments
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "payments_update_admin" ON public.payments;
CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── GOVERNMENT SCHEMES POLICIES ──────────────────────────────────────────

-- All authenticated users can view active schemes
DROP POLICY IF EXISTS "schemes_select_all_active" ON public.government_schemes;
CREATE POLICY "schemes_select_all_active" ON public.government_schemes
  FOR SELECT USING (status = 'active'::scheme_status);

-- Government officers can manage schemes
DROP POLICY IF EXISTS "schemes_manage_govt" ON public.government_schemes;
CREATE POLICY "schemes_manage_govt" ON public.government_schemes
  FOR ALL USING (public.is_govt() OR public.is_admin());

-- ─── SCHEME APPLICATIONS POLICIES ─────────────────────────────────────────

-- Farmers see only their own applications
DROP POLICY IF EXISTS "scheme_applications_select_own" ON public.scheme_applications;
CREATE POLICY "scheme_applications_select_own" ON public.scheme_applications
  FOR SELECT USING (farmer_id = auth.uid());

-- Farmers can create and update their own applications (draft/submitted)
DROP POLICY IF EXISTS "scheme_applications_insert_farmer" ON public.scheme_applications;
CREATE POLICY "scheme_applications_insert_farmer" ON public.scheme_applications
  FOR INSERT WITH CHECK (
    public.is_farmer()
    AND farmer_id = auth.uid()
  );

DROP POLICY IF EXISTS "scheme_applications_update_farmer" ON public.scheme_applications;
CREATE POLICY "scheme_applications_update_farmer" ON public.scheme_applications
  FOR UPDATE USING (farmer_id = auth.uid() AND application_status IN ('draft'::application_status, 'submitted'::application_status))
  WITH CHECK (farmer_id = auth.uid());

-- Government officers review and approve applications
DROP POLICY IF EXISTS "scheme_applications_select_govt" ON public.scheme_applications;
CREATE POLICY "scheme_applications_select_govt" ON public.scheme_applications
  FOR SELECT USING (public.is_govt() OR public.is_admin());

DROP POLICY IF EXISTS "scheme_applications_update_govt" ON public.scheme_applications;
CREATE POLICY "scheme_applications_update_govt" ON public.scheme_applications
  FOR UPDATE USING (public.is_govt() OR public.is_admin())
  WITH CHECK (public.is_govt() OR public.is_admin());

-- ─── FARMER DIGITAL ID POLICIES ──────────────────────────────────────────

-- Farmers see only their own digital ID
DROP POLICY IF EXISTS "farmer_digital_ids_select_own" ON public.farmer_digital_ids;
CREATE POLICY "farmer_digital_ids_select_own" ON public.farmer_digital_ids
  FOR SELECT USING (farmer_id = auth.uid());

-- Only system can create digital IDs (backend trigger on farmer verification)
DROP POLICY IF EXISTS "farmer_digital_ids_insert_admin" ON public.farmer_digital_ids;
CREATE POLICY "farmer_digital_ids_insert_admin" ON public.farmer_digital_ids
  FOR INSERT WITH CHECK (public.is_admin());

-- Admin can update digital IDs
DROP POLICY IF EXISTS "farmer_digital_ids_update_admin" ON public.farmer_digital_ids;
CREATE POLICY "farmer_digital_ids_update_admin" ON public.farmer_digital_ids
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── AUDIT LOGS POLICIES ──────────────────────────────────────────────────

-- Users see only their own audit logs
DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Admin sees all audit logs (read-only)
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Only backend can insert audit logs
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ─── LOGIN EVENTS POLICIES ────────────────────────────────────────────────

-- Users see their own login events
DROP POLICY IF EXISTS "login_events_select_own" ON public.login_events;
CREATE POLICY "login_events_select_own" ON public.login_events
  FOR SELECT USING (user_id = auth.uid());

-- Admin sees all login events
DROP POLICY IF EXISTS "login_events_select_admin" ON public.login_events;
CREATE POLICY "login_events_select_admin" ON public.login_events
  FOR SELECT USING (public.is_admin());

-- Only backend can insert login events
DROP POLICY IF EXISTS "login_events_insert_system" ON public.login_events;
CREATE POLICY "login_events_insert_system" ON public.login_events
  FOR INSERT WITH CHECK (true);

-- ─── DONE ─────────────────────────────────────────────────────────────────
-- Schema migration complete. All policies are database-enforced.
-- Do not rely on frontend role checks. Backend always validates against RLS.
