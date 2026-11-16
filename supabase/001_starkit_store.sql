-- StarkiT private order and inventory schema. Run in Supabase SQL editor.
-- All products remain disallowed for ordering until administrator verifies each condition.
create extension if not exists pgcrypto;

create table if not exists public.store_settings (
 key text primary key,
 value jsonb not null default 'null'::jsonb,
 updated_at timestamptz not null default now()
);
insert into public.store_settings(key,value) values
 ('cod_enabled','false'::jsonb),
 ('delivery_dhaka_bdt','null'::jsonb),
 ('delivery_outside_bdt','null'::jsonb)
on conflict(key) do nothing;

create table if not exists public.store_variants (
 sku text primary key check(sku ~ '^STK-H[0-9]{3}-(BLK|MRN|BRN|CRM)$'),
 product_id text not null,
 product_name text not null,
 color text not null,
 price_bdt integer not null check(price_bdt>0),
 sizes jsonb not null default '[]'::jsonb check(jsonb_typeof(sizes)='array'),
 stock_quantity integer check(stock_quantity>=0),
 rights_verified boolean not null default false,
 specifications_verified boolean not null default false,
 stock_verified boolean not null default false,
 commercial_terms_verified boolean not null default false,
 approved_for_publication boolean not null default false,
 updated_at timestamptz not null default now()
);
create index if not exists ix_starkit_variants_product on public.store_variants(product_id);

create table if not exists public.store_orders (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 idempotency_key uuid not null unique,
 customer_name text not null,
 customer_phone text not null,
 shipping_address text not null,
 district text not null,
 zone text not null check(zone in('dhaka','outside')),
 notes text,
 subtotal_bdt integer not null default 0 check(subtotal_bdt>=0),
 shipping_bdt integer not null default 0 check(shipping_bdt>=0),
 total_bdt integer not null default 0 check(total_bdt>=0),
 status text not null default 'pending_confirmation' check(status in('pending_confirmation','confirmed','processing','shipped','delivered','cancelled')),
 created_at timestamptz not null default now()
);
create index if not exists ix_starkit_orders_created on public.store_orders(created_at desc);
create table if not exists public.store_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.store_orders(id) on delete restrict,
 sku text not null,
 product_name text not null,
 color text not null,
 size text not null,
 quantity integer not null check(quantity between 1 and 20),
 unit_price_bdt integer not null check(unit_price_bdt>0),
 line_total_bdt integer not null check(line_total_bdt>=0)
);
create index if not exists ix_starkit_order_items_order on public.store_order_items(order_id);

alter table public.store_settings enable row level security;
alter table public.store_variants enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
-- No public policies. All reads/writes occur under the server-side service role only.

create or replace function public.submit_starkit_order(
 p_idempotency uuid, p_customer_name text, p_customer_phone text,
 p_address text,p_district text,p_zone text,p_notes text,p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
declare
 v_order_id uuid;v_ref text;v_item jsonb;v_variant public.store_variants%rowtype;
 v_sku text;v_size text;v_qty int;v_subtotal int:=0;v_shipping int;v_cod jsonb;v_zone_fee jsonb;
begin
 if p_customer_name is null or length(p_customer_name)<2 or length(p_customer_name)>120
 or p_customer_phone is null or p_customer_phone !~ '^([+]?880|0)1[3-9][0-9]{8}$'
 or p_address is null or length(p_address)<10 or length(p_address)>600
 or p_district is null or length(p_district)<2 or length(p_district)>80
 or p_zone not in('dhaka','outside')
 or p_items is null or jsonb_typeof(p_items)<>'array'
 or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>20
 then raise exception 'Invalid order details' using errcode='P0001'; end if;
 select value into v_cod from public.store_settings where key='cod_enabled';
 if coalesce(v_cod,'false'::jsonb)<>'true'::jsonb then raise exception 'COD not activated' using errcode='P0001';end if;
 select value into v_zone_fee from public.store_settings where key=case when p_zone='dhaka' then 'delivery_dhaka_bdt' else 'delivery_outside_bdt' end;
 if v_zone_fee is null or jsonb_typeof(v_zone_fee)<>'number' or (v_zone_fee::text)::int<0 then raise exception 'Delivery rate not approved' using errcode='P0001';end if;
 v_shipping:=(v_zone_fee::text)::int;
 v_ref:='STK-'||upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 12));
 insert into public.store_orders(reference,idempotency_key,customer_name,customer_phone,shipping_address,district,zone,notes)
 values(v_ref,p_idempotency,p_customer_name,p_customer_phone,p_address,p_district,p_zone,p_notes)
 on conflict(idempotency_key) do nothing returning id into v_order_id;
 if v_order_id is null then
  select reference,total_bdt into v_ref,v_subtotal from public.store_orders where idempotency_key=p_idempotency;
  return jsonb_build_object('reference',v_ref,'total_bdt',v_subtotal,'status','already_submitted');
 end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_sku:=v_item->>'sku';v_size:=v_item->>'size';
  if coalesce(v_item->>'quantity','') !~ '^[0-9]+$' then raise exception 'Invalid quantity' using errcode='P0001'; end if;
  v_qty:=(v_item->>'quantity')::int;
  if v_qty<1 or v_qty>20 or v_sku is null or v_size is null or length(v_size)>10 then raise exception 'Invalid item' using errcode='P0001';end if;
  select * into v_variant from public.store_variants where sku=v_sku for update;
  if not found or not(v_variant.rights_verified and v_variant.specifications_verified and v_variant.stock_verified and v_variant.commercial_terms_verified and v_variant.approved_for_publication)
   or v_variant.stock_quantity is null or v_variant.stock_quantity<v_qty
   or not exists(select 1 from jsonb_array_elements_text(v_variant.sizes) as sz(size_value) where sz.size_value=v_size)
  then raise exception 'SKU unavailable / unapproved' using errcode='P0001';end if;
  update public.store_variants set stock_quantity=stock_quantity-v_qty,updated_at=now() where sku=v_sku;
  insert into public.store_order_items(order_id,sku,product_name,color,size,quantity,unit_price_bdt,line_total_bdt)
  values(v_order_id,v_sku,v_variant.product_name,v_variant.color,v_size,v_qty,v_variant.price_bdt,v_qty*v_variant.price_bdt);
  v_subtotal:=v_subtotal+(v_qty*v_variant.price_bdt);
 end loop;
 update public.store_orders set subtotal_bdt=v_subtotal,shipping_bdt=v_shipping,total_bdt=v_subtotal+v_shipping where id=v_order_id;
 return jsonb_build_object('reference',v_ref,'subtotal_bdt',v_subtotal,'shipping_bdt',v_shipping,'total_bdt',v_subtotal+v_shipping,'status','pending_confirmation');
end $$;
revoke all on function public.submit_starkit_order(uuid,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_starkit_order(uuid,text,text,text,text,text,text,jsonb) to service_role;
