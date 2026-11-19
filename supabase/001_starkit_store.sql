-- ==============================================================================
-- StarkiT DROP 01 — Production Database Schema & Transaction Engine (Hardened)
-- Target Database: Supabase PostgreSQL
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Store Global Settings (safe fail-closed defaults until commercial activation)
create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (key, value) values
  ('cod_enabled', 'false'::jsonb),
  ('store_mode', '"preview"'::jsonb),
  ('delivery_dhaka_bdt', '80'::jsonb),
  ('delivery_outside_bdt', '150'::jsonb),
  ('free_shipping_threshold', '3000'::jsonb)
on conflict (key) do nothing;

-- 2. Store Products & SKU Variants Inventory (safe unapproved defaults)
create table if not exists public.store_variants (
  sku text primary key check(sku ~ '^STK-H[0-9]{3}-(BLK|MRN|BRN|CRM)$'),
  slot_id text,
  product_id text not null,
  product_name text not null,
  color text not null,
  status text not null default 'DOCUMENTED' check(status in ('DOCUMENTED')),
  price_bdt integer not null check(price_bdt > 0),
  sizes jsonb not null default '[]'::jsonb check(jsonb_typeof(sizes) = 'array'),
  stock_quantity integer not null default 0 check(stock_quantity >= 0),
  rights_verified boolean not null default false,
  specifications_verified boolean not null default false,
  stock_verified boolean not null default false,
  commercial_terms_verified boolean not null default false,
  price_approved boolean not null default false,
  approved_for_publication boolean not null default false,
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
  discount_bdt integer not null default 0 check(discount_bdt >= 0),
  shipping_bdt integer not null default 0 check(shipping_bdt >= 0),
  total_bdt integer not null default 0 check(total_bdt >= 0),
  applied_promotions jsonb not null default '[]'::jsonb,
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

-- 5. Atomic Transactional Order Function (with verified-flag & promotion gating)
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
  v_hoodie_subtotal int := 0;
  v_hoodie_qty int := 0;
  v_total_qty int := 0;
  v_discount int := 0;
  v_promo_free_ship boolean := false;
  v_applied_promos jsonb := '[]'::jsonb;
  v_shipping int := 0;
  v_cod jsonb;
  v_zone_fee jsonb;
  v_free_threshold jsonb;
  v_existing_ref text;
  v_existing_total int;
  v_promo record;
  v_promo_discount int;
  v_promo_base int;
  v_best_single_discount int := 0;
  v_best_single_free_ship boolean := false;
  v_best_single_promo jsonb := null;
  v_comb_discount int := 0;
  v_comb_free_ship boolean := false;
  v_comb_promos jsonb := '[]'::jsonb;
begin
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

  select value into v_cod from public.store_settings where key = 'cod_enabled';
  if coalesce(v_cod, 'false'::jsonb) <> 'true'::jsonb then
    raise exception 'Cash on Delivery is temporarily disabled' using errcode = 'P0001';
  end if;

  select value into v_zone_fee from public.store_settings
  where key = case when p_zone = 'dhaka' then 'delivery_dhaka_bdt' else 'delivery_outside_bdt' end;

  if v_zone_fee is null or jsonb_typeof(v_zone_fee) <> 'number' or (v_zone_fee::text)::int < 0 then
    v_shipping := case when p_zone = 'dhaka' then 80 else 150 end;
  else
    v_shipping := (v_zone_fee::text)::int;
  end if;

  select reference, total_bdt into v_existing_ref, v_existing_total
  from public.store_orders where idempotency_key = p_idempotency;

  if found then
    return jsonb_build_object(
      'reference', v_existing_ref,
      'total_bdt', v_existing_total,
      'status', 'already_submitted'
    );
  end if;

  v_ref := 'STK-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

  insert into public.store_orders (
    reference, idempotency_key, customer_name, customer_phone,
    shipping_address, district, zone, notes
  ) values (
    v_ref, p_idempotency, trim(p_customer_name), trim(p_customer_phone),
    trim(p_address), trim(p_district), p_zone, trim(coalesce(p_notes, ''))
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_sku := v_item->>'sku';
    v_size := v_item->>'size';

    if coalesce(v_item->>'quantity', '') !~ '^[0-9]+$' then
      raise exception 'Invalid quantity format' using errcode = 'P0001';
    end if;
    v_qty := (v_item->>'quantity')::int;

    if v_qty < 1 or v_qty > 20 or v_sku is null or v_size is null or length(v_size) > 32 then
      raise exception 'Invalid item specification' using errcode = 'P0001';
    end if;

    select * into v_variant from public.store_variants where sku = v_sku for update;

    if not found
       or not v_variant.approved_for_publication
       or not v_variant.rights_verified
       or not v_variant.stock_verified
       or not v_variant.specifications_verified
       or not v_variant.commercial_terms_verified
       or v_variant.status <> 'DOCUMENTED'
    then
      raise exception 'SKU % is not verified or approved for sale', v_sku using errcode = 'P0001';
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

    update public.store_variants
    set stock_quantity = stock_quantity - v_qty, updated_at = now()
    where sku = v_sku;

    insert into public.store_order_items (
      order_id, sku, product_name, color, size, quantity, unit_price_bdt, line_total_bdt
    ) values (
      v_order_id, v_sku, v_variant.product_name, v_variant.color,
      v_size, v_qty, v_variant.price_bdt, v_qty * v_variant.price_bdt
    );

    v_subtotal := v_subtotal + (v_qty * v_variant.price_bdt);
    v_total_qty := v_total_qty + v_qty;
    if v_sku like 'STK-%' then
      v_hoodie_qty := v_hoodie_qty + v_qty;
      v_hoodie_subtotal := v_hoodie_subtotal + (v_qty * v_variant.price_bdt);
    end if;
  end loop;

  -- Evaluate approved, active promotions if store_promotions table exists
  if to_regclass('public.store_promotions') is not null then
    for v_promo in
      select * from public.store_promotions
      where active = true and requires_approval = false
      order by min_qty desc, discount_value desc
    loop
      v_promo_base := case when v_promo.applies_to = 'hoodies' then v_hoodie_subtotal else v_subtotal end;
      if (v_promo.applies_to = 'hoodies' and v_hoodie_qty >= v_promo.min_qty and v_hoodie_subtotal > 0)
         or (v_promo.applies_to <> 'hoodies' and v_total_qty >= v_promo.min_qty and v_subtotal > 0)
      then
        v_promo_discount := 0;
        if v_promo.discount_type = 'FIXED_BDT' and v_promo.discount_value > 0 then
          v_promo_discount := least(v_promo_base, v_promo.discount_value);
        elsif v_promo.discount_type = 'PERCENT' and v_promo.discount_value > 0 and v_promo.discount_value <= 80 then
          v_promo_discount := least(v_promo_base, round(v_promo_base * v_promo.discount_value / 100.0)::int);
        end if;

        if v_promo_discount > 0 or v_promo.free_shipping then
          if coalesce(v_promo.combinable, false) then
            v_comb_discount := v_comb_discount + v_promo_discount;
            v_comb_free_ship := v_comb_free_ship or v_promo.free_shipping;
            v_comb_promos := v_comb_promos || jsonb_build_array(jsonb_build_object(
              'code', v_promo.code,
              'title', v_promo.title,
              'discount_bdt', v_promo_discount,
              'free_shipping', v_promo.free_shipping
            ));
          else
            if v_best_single_promo is null
               or v_promo_discount > v_best_single_discount
               or (v_promo_discount = v_best_single_discount and v_promo.free_shipping and not v_best_single_free_ship)
            then
              v_best_single_discount := v_promo_discount;
              v_best_single_free_ship := v_promo.free_shipping;
              v_best_single_promo := jsonb_build_object(
                'code', v_promo.code,
                'title', v_promo.title,
                'discount_bdt', v_promo_discount,
                'free_shipping', v_promo.free_shipping
              );
            end if;
          end if;
        end if;
      end if;
    end loop;

    if v_best_single_promo is not null and v_best_single_discount >= v_comb_discount then
      v_discount := v_best_single_discount;
      v_promo_free_ship := v_best_single_free_ship;
      v_applied_promos := jsonb_build_array(v_best_single_promo);
    elsif jsonb_array_length(v_comb_promos) > 0 then
      v_discount := least(v_subtotal, v_comb_discount);
      v_promo_free_ship := v_comb_free_ship;
      v_applied_promos := v_comb_promos;
    end if;
  end if;

  select value into v_free_threshold from public.store_settings where key = 'free_shipping_threshold';
  if v_promo_free_ship
     or (v_free_threshold is not null
         and jsonb_typeof(v_free_threshold) = 'number'
         and round((v_free_threshold::text)::numeric)::int > 0
         and (v_subtotal - v_discount) >= round((v_free_threshold::text)::numeric)::int)
  then
    v_shipping := 0;
  end if;

  update public.store_orders
  set
    subtotal_bdt = v_subtotal,
    discount_bdt = v_discount,
    shipping_bdt = v_shipping,
    total_bdt = greatest(0, v_subtotal - v_discount) + v_shipping,
    applied_promotions = v_applied_promos
  where id = v_order_id;

  return jsonb_build_object(
    'reference', v_ref,
    'subtotal_bdt', v_subtotal,
    'discount_bdt', v_discount,
    'shipping_bdt', v_shipping,
    'total_bdt', greatest(0, v_subtotal - v_discount) + v_shipping,
    'applied_promotions', v_applied_promos,
    'status', 'pending_confirmation',
    'created_at', now()
  );
end $$;

revoke all on function public.submit_starkit_order(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_starkit_order(uuid, text, text, text, text, text, text, jsonb) to service_role;
