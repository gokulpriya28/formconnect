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

-- ── Core Tables ───────────────────────────────────────────────

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text check (char_length(full_name) <= 200),
  phone           text check (char_length(phone) <= 20),        -- store encrypted at app layer
  email           text check (char_length(email) <= 254),
  role            text not null default 'Buyer'
                    check (role in ('Farmer','Buyer','Admin','Government')),
  district        text check (char_length(district) <= 100),
  village         text check (char_length(village) <= 100),
  profile_image   text check (char_length(profile_image) <= 500),
  profile_type    text check (char_length(profile_type) <= 100),
  pan_number      text check (char_length(pan_number) <= 20),
  mfa_enrolled    boolean not null default false,
  is_deleted      boolean not null default false,               -- soft-delete flag
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references auth.users(id) on delete cascade,
  seller_name   text not null default 'Local Farmer'
                  check (char_length(seller_name) <= 200),
  seller_role   text not null default 'Farmer',
  district      text default 'Tamil Nadu' check (char_length(district) <= 100),
  village       text default 'Tamil Nadu' check (char_length(village) <= 100),
  name          text not null check (char_length(name) between 1 and 200),
  emoji         text default '🌾' check (char_length(emoji) <= 10),
  price         numeric not null default 0
                  check (price >= 0 and price <= 999999),
  ms_p          numeric not null default 0
                  check (ms_p >= 0 and ms_p <= 999999),
  unit          text not null default 'kg' check (char_length(unit) <= 20),
  qty           integer not null default 0
                  check (qty >= 0 and qty <= 1000000),
  organic       boolean not null default false,
  express       boolean not null default false,
  delivery      text default 'Tomorrow' check (char_length(delivery) <= 50),
  rating        numeric default 4.8 check (rating >= 0 and rating <= 5),
  reviews       integer default 10 check (reviews >= 0),
  category      text default 'Vegetables' check (char_length(category) <= 100),
  image_url     text check (char_length(image_url) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
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

-- ── Auto-update timestamps ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ── DB-level Audit Trigger ───────────────────────────────────
-- Automatically log product changes to audit_logs
create or replace function public.audit_product_change()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_logs (user_id, event_type, payload)
  values (
    auth.uid(),
    TG_OP || '_PRODUCT',
    jsonb_build_object(
      'product_id', coalesce(new.id, old.id),
      'name',       coalesce(new.name, old.name),
      'op',         TG_OP
    )
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists products_audit on public.products;
create trigger products_audit
  after insert or update or delete on public.products
  for each row execute function public.audit_product_change();

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.audit_logs  enable row level security;
alter table public.login_events enable row level security;

-- Drop old policies
drop policy if exists "profiles_select_own"    on public.profiles;
drop policy if exists "profiles_select_admin"  on public.profiles;
drop policy if exists "profiles_upsert_own"    on public.profiles;
drop policy if exists "profiles_update_own"    on public.profiles;
drop policy if exists "profiles_update_admin"  on public.profiles;
drop policy if exists "products_select_all"    on public.products;
drop policy if exists "products_manage_own"    on public.products;
drop policy if exists "products_update_own"    on public.products;
drop policy if exists "products_delete_own"    on public.products;
drop policy if exists "orders_select_all"      on public.orders;
drop policy if exists "orders_manage_own"      on public.orders;
drop policy if exists "orders_update_own"      on public.orders;

-- ── Profiles Policies ────────────────────────────────────────
-- Users see only their own profile (unless Admin/Govt)
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id and is_deleted = false);

create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('Admin','Government')
        and p.is_deleted = false
    )
  );

-- Users insert their own profile (role locked to Farmer/Buyer only)
create policy "profiles_insert_own" on public.profiles
  for insert with check (
    auth.uid() = id
    and role in ('Farmer','Buyer')   -- Admin/Govt cannot self-assign
  );

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id and is_deleted = false)
  with check (
    auth.uid() = id
    and role in ('Farmer','Buyer')   -- cannot self-elevate to Admin
  );

-- Admins can update any profile (including role assignment)
create policy "profiles_update_admin" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Admin' and p.is_deleted = false
    )
  );

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
