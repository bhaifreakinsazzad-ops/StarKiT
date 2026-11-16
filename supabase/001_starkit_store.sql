-- ==============================================================================
-- StarkiT DROP 01 — Production Database Schema & Transaction Engine
-- Target Database: Supabase PostgreSQL
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Store Global Settings
create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

-- Active live defaults: COD enabled, standard BD rates, 3000 BDT free shipping threshold
insert into public.store_settings (key, value) values
  ('cod_enabled', 'true'::jsonb),
  ('delivery_dhaka_bdt', '80'::jsonb),
  ('delivery_outside_bdt', '150'::jsonb),
  ('free_shipping_threshold', '3000'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- 2. Store Products & SKU Variants Inventory
create table if not exists public.store_variants (
  sku text primary key check(sku ~ '^(STK-H[0-9]{3}-(BLK|MRN|BRN|CRM)|FT-(HM|JWL|BA)-[0-9]{3})$'),
  product_id text not null,
  product_name text not null,
  color text not null,
  price_bdt integer not null check(price_bdt > 0),
  sizes jsonb not null default '["M", "L", "XL", "XXL"]'::jsonb check(jsonb_typeof(sizes) = 'array'),
  stock_quantity integer not null default 50 check(stock_quantity >= 0),
  rights_verified boolean not null default true,
  specifications_verified boolean not null default true,
  stock_verified boolean not null default true,
  commercial_terms_verified boolean not null default true,
  approved_for_publication boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists ix_starkit_variants_product on public.store_variants(product_id);

-- 3. Customer Orders
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key uuid not null unique,
  customer_name text not null,
  customer_phone text not null,
  shipping_address text not null,
  district text not null,
  zone text not null check(zone in ('dhaka', 'outside')),
  notes text,
  subtotal_bdt integer not null default 0 check(subtotal_bdt >= 0),
  shipping_bdt integer not null default 0 check(shipping_bdt >= 0),
  total_bdt integer not null default 0 check(total_bdt >= 0),
  status text not null default 'pending_confirmation' check(
    status in ('pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
  ),
  created_at timestamptz not null default now()
);

create index if not exists ix_starkit_orders_created on public.store_orders(created_at desc);
create index if not exists ix_starkit_orders_ref on public.store_orders(reference);
create index if not exists ix_starkit_orders_phone on public.store_orders(customer_phone);

-- 4. Order Line Items
create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  sku text not null,
  product_name text not null,
  color text not null,
  size text not null,
  quantity integer not null check(quantity between 1 and 20),
  unit_price_bdt integer not null check(unit_price_bdt > 0),
  line_total_bdt integer not null check(line_total_bdt >= 0)
);

create index if not exists ix_starkit_order_items_order on public.store_order_items(order_id);

-- Enable Row Level Security (RLS)
alter table public.store_settings enable row level security;
alter table public.store_variants enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

-- 5. Atomic Transactional Order Function
create or replace function public.submit_starkit_order(
  p_idempotency uuid,
  p_customer_name text,
  p_customer_phone text,
  p_address text,
  p_district text,
  p_zone text,
  p_notes text,
  p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order_id uuid;
  v_ref text;
  v_item jsonb;
  v_variant public.store_variants%rowtype;
  v_sku text;
  v_size text;
  v_qty int;
  v_subtotal int := 0;
  v_shipping int := 0;
  v_cod jsonb;
  v_zone_fee jsonb;
  v_free_threshold jsonb;
  v_existing_ref text;
  v_existing_total int;
begin
  -- Validate Customer Info
  if p_customer_name is null or length(trim(p_customer_name)) < 2 or length(p_customer_name) > 120
     or p_customer_phone is null or p_customer_phone !~ '^([+]?880|0)1[3-9][0-9]{8}$'
     or p_address is null or length(trim(p_address)) < 10 or length(p_address) > 600
     or p_district is null or length(trim(p_district)) < 2 or length(p_district) > 80
     or p_zone not in ('dhaka', 'outside')
     or p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20
  then
    raise exception 'Invalid customer order parameters' using errcode = 'P0001';
  end if;

  -- Check COD status
  select value into v_cod from public.store_settings where key = 'cod_enabled';
  if coalesce(v_cod, 'false'::jsonb) <> 'true'::jsonb then
    raise exception 'Cash on Delivery is temporarily disabled' using errcode = 'P0001';
  end if;

  -- Read Zone Delivery Fee
  select value into v_zone_fee from public.store_settings
  where key = case when p_zone = 'dhaka' then 'delivery_dhaka_bdt' else 'delivery_outside_bdt' end;
  
  if v_zone_fee is null or jsonb_typeof(v_zone_fee) <> 'number' or (v_zone_fee::text)::int < 0 then
    v_shipping := case when p_zone = 'dhaka' then 80 else 150 end;
  else
    v_shipping := (v_zone_fee::text)::int;
  end if;

  -- Check Idempotency
  select reference, total_bdt into v_existing_ref, v_existing_total
  from public.store_orders where idempotency_key = p_idempotency;
  
  if found then
    return jsonb_build_object(
      'reference', v_existing_ref,
      'total_bdt', v_existing_total,
      'status', 'already_submitted'
    );
  end if;

  -- Generate Unique Human-Readable Reference Code: STK-XXXXXXXXXXXX
  v_ref := 'STK-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

  -- Insert Order Shell
  insert into public.store_orders (
    reference, idempotency_key, customer_name, customer_phone,
    shipping_address, district, zone, notes
  ) values (
    v_ref, p_idempotency, trim(p_customer_name), trim(p_customer_phone),
    trim(p_address), trim(p_district), p_zone, trim(coalesce(p_notes, ''))
  ) returning id into v_order_id;

  -- Process and Validate Line Items
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_sku := v_item->>'sku';
    v_size := v_item->>'size';
    
    if coalesce(v_item->>'quantity', '') !~ '^[0-9]+$' then
      raise exception 'Invalid quantity format' using errcode = 'P0001';
    end if;
    v_qty := (v_item->>'quantity')::int;

    if v_qty < 1 or v_qty > 20 or v_sku is null or v_size is null or length(v_size) > 10 then
      raise exception 'Invalid item specification' using errcode = 'P0001';
    end if;

    -- Lock and verify variant row
    select * into v_variant from public.store_variants where sku = v_sku for update;
    
    if not found or not v_variant.approved_for_publication then
      raise exception 'SKU % is not active for sale', v_sku using errcode = 'P0001';
    end if;

    if v_variant.stock_quantity < v_qty then
      raise exception 'Insufficient stock for SKU % (requested: %, available: %)',
        v_sku, v_qty, v_variant.stock_quantity using errcode = 'P0001';
    end if;

    if not exists (
      select 1 from jsonb_array_elements_text(v_variant.sizes) as sz(s)
      where sz.s = v_size
    ) then
      raise exception 'Size % is not available for SKU %', v_size, v_sku using errcode = 'P0001';
    end if;

    -- Decrement Inventory Atomic
    update public.store_variants
    set stock_quantity = stock_quantity - v_qty, updated_at = now()
    where sku = v_sku;

    -- Insert Order Line Item
    insert into public.store_order_items (
      order_id, sku, product_name, color, size, quantity, unit_price_bdt, line_total_bdt
    ) values (
      v_order_id, v_sku, v_variant.product_name, v_variant.color,
      v_size, v_qty, v_variant.price_bdt, v_qty * v_variant.price_bdt
    );

    v_subtotal := v_subtotal + (v_qty * v_variant.price_bdt);
  end loop;

  -- Apply Free Shipping if subtotal >= free_shipping_threshold (default 3000 BDT)
  select value into v_free_threshold from public.store_settings where key = 'free_shipping_threshold';
  if v_free_threshold is not null and (v_free_threshold::text)::int > 0 and v_subtotal >= (v_free_threshold::text)::int then
    v_shipping := 0;
  end if;

  -- Update Final Order Totals
  update public.store_orders
  set subtotal_bdt = v_subtotal, shipping_bdt = v_shipping, total_bdt = v_subtotal + v_shipping
  where id = v_order_id;

  return jsonb_build_object(
    'reference', v_ref,
    'subtotal_bdt', v_subtotal,
    'shipping_bdt', v_shipping,
    'total_bdt', v_subtotal + v_shipping,
    'status', 'pending_confirmation',
    'created_at', now()
  );
end $$;

-- Permissions: Only service_role may execute submit_starkit_order
revoke all on function public.submit_starkit_order(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_starkit_order(uuid, text, text, text, text, text, text, jsonb) to service_role;
