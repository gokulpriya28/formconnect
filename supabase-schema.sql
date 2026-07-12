create extension if not exists pgcrypto;

create table if not exists public.produce_listings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  farmer text not null default 'Local Farmer',
  village text not null default 'Tamil Nadu',
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
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
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

alter table public.produce_listings enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Allow public read access" on public.produce_listings;
drop policy if exists "Allow public insert access" on public.produce_listings;
drop policy if exists "Allow public read access" on public.orders;
drop policy if exists "Allow public insert access" on public.orders;

create policy "Allow public read access" on public.produce_listings
  for select using (true);
create policy "Allow public insert access" on public.produce_listings
  for insert with check (true);

create policy "Allow public read access" on public.orders
  for select using (true);
create policy "Allow public insert access" on public.orders
  for insert with check (true);
