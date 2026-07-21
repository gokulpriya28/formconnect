-- ============================================================
-- FarmConnect — Supabase Schema (Security-Hardened)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

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

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  buyer_id    uuid references auth.users(id) on delete set null,
  farmer_id   uuid references auth.users(id) on delete set null,
  produce     text not null check (char_length(produce) between 1 and 200),
  farmer      text not null default 'Local Farmer' check (char_length(farmer) <= 200),
  buyer       text not null default 'Guest Buyer' check (char_length(buyer) <= 200),
  qty         integer not null default 0 check (qty >= 0 and qty <= 1000000),
  amount      numeric not null default 0 check (amount >= 0),
  status      text not null default 'pending'
                check (status in ('pending','confirmed','in-transit','delivered','cancelled')),
  date        text default 'Today' check (char_length(date) <= 30),
  payment     text default 'UPI' check (char_length(payment) <= 50),
  gst         numeric default 0 check (gst >= 0),
  created_at  timestamptz not null default now()
);

-- ── Audit Log Table ─────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  event_type  text not null check (char_length(event_type) <= 100),
  payload     jsonb default '{}',
  user_agent  text check (char_length(user_agent) <= 500),
  created_at  timestamptz not null default now()
);

-- ── Login Events Table ───────────────────────────────────────
create table if not exists public.login_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  email_hash  text,                              -- SHA-256 hash of email, not plaintext
  event_type  text not null check (event_type in ('SIGNIN','SIGNOUT','FAILED','SIGNUP','RESET')),
  user_agent  text check (char_length(user_agent) <= 500),
  created_at  timestamptz not null default now()
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

-- Soft-delete: users can mark themselves deleted
create policy "profiles_delete_own" on public.profiles
  for update using (auth.uid() = id);

-- ── Products Policies ────────────────────────────────────────
create policy "products_select_all" on public.products
  for select using (true);

create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = owner_id);

create policy "products_update_own" on public.products
  for update using (auth.uid() = owner_id);

create policy "products_delete_own" on public.products
  for delete using (auth.uid() = owner_id);

-- ── Orders Policies ──────────────────────────────────────────
create policy "orders_select_own" on public.orders
  for select using (
    auth.uid() = buyer_id
    or auth.uid() = farmer_id
    or auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('Admin','Government')
    )
  );

create policy "orders_insert_own" on public.orders
  for insert with check (
    auth.uid() = buyer_id or auth.uid() = user_id or buyer_id is null
  );

create policy "orders_update_own" on public.orders
  for update using (
    auth.uid() = buyer_id or auth.uid() = farmer_id
  );

-- ── Audit Logs Policies ───────────────────────────────────────
-- Users can write their own audit events
create policy "audit_insert_own" on public.audit_logs
  for insert with check (auth.uid() = user_id or user_id is null);

-- Only Admins can read audit logs
create policy "audit_select_admin" on public.audit_logs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Admin'
    )
  );

-- Login events: only self + admin
create policy "login_events_insert" on public.login_events
  for insert with check (true);

create policy "login_events_select_admin" on public.login_events
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Admin'
    )
  );

-- ── Storage Bucket ───────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,   -- 5 MB hard limit (enforced by Supabase Storage)
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

drop policy if exists "public_product_images_read"            on storage.objects;
drop policy if exists "authenticated_product_images_upload"   on storage.objects;
drop policy if exists "authenticated_product_images_update"   on storage.objects;
drop policy if exists "authenticated_product_images_delete"   on storage.objects;

create policy "public_product_images_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "authenticated_product_images_upload" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

create policy "authenticated_product_images_update" on storage.objects
  for update using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

-- Users can only delete their own uploaded files
create policy "authenticated_product_images_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
