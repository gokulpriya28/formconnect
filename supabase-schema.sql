create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  role text not null default 'Buyer',
  district text,
  village text,
  profile_image text,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  seller_name text not null default 'Local Farmer',
  seller_role text not null default 'Farmer',
  district text default 'Tamil Nadu',
  village text default 'Tamil Nadu',
  name text not null,
  emoji text default '🌾',
  price numeric not null default 0,
  ms_p numeric not null default 0,
  unit text not null default 'kg',
  qty integer not null default 0,
  organic boolean not null default false,
  express boolean not null default false,
  delivery text default 'Tomorrow',
  rating numeric default 4.8,
  reviews integer default 10,
  category text default 'Vegetables',
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  buyer_id uuid references auth.users(id) on delete set null,
  farmer_id uuid references auth.users(id) on delete set null,
  produce text not null,
  farmer text not null default 'Local Farmer',
  buyer text not null default 'Guest Buyer',
  qty integer not null default 0,
  amount numeric not null default 0,
  status text not null default 'pending',
  date text default 'Today',
  payment text default 'UPI',
  gst numeric default 0,
  created_at timestamptz default now()
);

alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists buyer_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists farmer_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists produce text;
alter table public.orders add column if not exists farmer text default 'Local Farmer';
alter table public.orders add column if not exists buyer text default 'Guest Buyer';
alter table public.orders add column if not exists qty integer default 0;
alter table public.orders add column if not exists amount numeric default 0;
alter table public.orders add column if not exists status text default 'pending';
alter table public.orders add column if not exists date text default 'Today';
alter table public.orders add column if not exists payment text default 'UPI';
alter table public.orders add column if not exists gst numeric default 0;
alter table public.orders add column if not exists created_at timestamptz default now();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "products_select_all" on public.products;
drop policy if exists "products_manage_own" on public.products;
drop policy if exists "orders_select_all" on public.orders;
drop policy if exists "orders_manage_own" on public.orders;
drop policy if exists "orders_update_own" on public.orders;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "products_select_all" on public.products
  for select using (true);
create policy "products_manage_own" on public.products
  for insert with check (auth.uid() = owner_id or owner_id is null);
create policy "products_update_own" on public.products
  for update using (auth.uid() = owner_id);
create policy "products_delete_own" on public.products
  for delete using (auth.uid() = owner_id);

create policy "orders_select_all" on public.orders
  for select using (true);

DO $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name in ('buyer_id', 'farmer_id')
  ) then
    create policy "orders_manage_own" on public.orders
      for insert with check (
        auth.uid() = buyer_id or auth.uid() = farmer_id or buyer_id is null or farmer_id is null
      );
    create policy "orders_update_own" on public.orders
      for update using (
        auth.uid() = buyer_id or auth.uid() = farmer_id
      );
  else
    create policy "orders_manage_own" on public.orders
      for insert with check (
        auth.uid() = user_id or user_id is null
      );
    create policy "orders_update_own" on public.orders
      for update using (
        auth.uid() = user_id
      );
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public_product_images_read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "authenticated_product_images_upload" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "authenticated_product_images_update" on storage.objects
  for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "authenticated_product_images_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
