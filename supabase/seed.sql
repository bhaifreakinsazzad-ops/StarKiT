-- ==============================================================================
-- StarkiT DROP 01 (11 Hoodie Designs / 15 Studio-Verified Variants) Seed
-- ==============================================================================

begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='status') then
    alter table public.store_variants add column status text not null default 'DOCUMENTED';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='slot_id') then
    alter table public.store_variants add column slot_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='price_tier') then
    alter table public.store_variants add column price_tier text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='draft_price_bdt') then
    alter table public.store_variants add column draft_price_bdt integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='price_approved') then
    alter table public.store_variants add column price_approved boolean not null default false;
  end if;
end $$;

-- 1. Seed store_products (when migration 005 is applied)
do $$
begin
  if to_regclass('public.store_settings') is not null then
    insert into public.store_settings (key, value)
    values
      ('cod_enabled', 'true'::jsonb),
      ('store_mode', '"public"'::jsonb),
      ('delivery_dhaka_bdt', '80'::jsonb),
      ('delivery_outside_bdt', '150'::jsonb),
      ('free_shipping_threshold', '3000'::jsonb)
    on conflict (key) do update
    set value = excluded.value, updated_at = now();
  end if;

  if to_regclass('public.store_products') is not null then
    delete from public.store_products where id not like 'STK-H%' or id not in ('STK-H001', 'STK-H002', 'STK-H003', 'STK-H004', 'STK-H005', 'STK-H006', 'STK-H007', 'STK-H008', 'STK-H009', 'STK-H010', 'STK-H011');
    insert into public.store_products (
      id, name, slug, category, collection, drop_code, price_tier,
      draft_price_bdt, approved_price_bdt, price_approved, approval_status,
      rights_verified, specifications_verified, stock_verified, commercial_terms_verified,
      third_party_ip_review, rights_assessment
    ) values
  ('STK-H001', 'SHINOBI SUNSET', 'shinobi-sunset', 'Anime Archive', 'Anime Archive', 'DROP_01', 'SIGNATURE', 1369, 1369, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H002', 'PEACE BRO CLUB', 'peace-bro-club', 'Playful Street', 'Playful Street', 'DROP_01', 'CORE', 1099, 1099, true, 'PUBLISHED', true, true, true, true, false, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H003', 'FOLK ROUTE', 'folk-route', 'Bangla Heritage', 'Bangla Heritage', 'DROP_01', 'CORE', 1099, 1099, true, 'PUBLISHED', true, true, true, true, false, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H004', 'THE RIDER CODE', 'the-rider-code', 'Moto Culture', 'Moto Culture', 'DROP_01', 'PREMIUM', 1499, 1499, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H005', 'MOONLIT HERO', 'moonlit-hero', 'Anime Archive', 'Anime Archive', 'DROP_01', 'SIGNATURE', 1369, 1369, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H006', 'CELLULOID NIGHTS', 'celluloid-nights', 'Bangla Heritage', 'Bangla Heritage', 'DROP_01', 'SELECT', 1250, 1250, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H007', 'DHAKA AFTERGLOW', 'dhaka-afterglow', 'City Stories', 'City Stories', 'DROP_01', 'SELECT', 1250, 1250, true, 'PUBLISHED', true, true, true, true, false, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H008', 'COLLECTIVE VOICE', 'collective-voice', 'Statement Graphics', 'Statement Graphics', 'DROP_01', 'CORE', 1099, 1099, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H009', 'RICKSHAW BLOOM', 'rickshaw-bloom', 'Bangla Heritage', 'Bangla Heritage', 'DROP_01', 'SELECT', 1250, 1250, true, 'PUBLISHED', true, true, true, true, false, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H010', 'CHEESE CHASE', 'cheese-chase', 'Playful Street', 'Playful Street', 'DROP_01', 'CORE', 1099, 1099, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H011', 'NIGHT CIRCUIT', 'night-circuit', 'Moto Culture', 'Moto Culture', 'DROP_01', 'SIGNATURE', 1369, 1369, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.')
    on conflict (id) do update set
      name = excluded.name,
      price_tier = excluded.price_tier,
      draft_price_bdt = excluded.draft_price_bdt,
      approved_price_bdt = excluded.approved_price_bdt,
      price_approved = excluded.price_approved,
      approval_status = excluded.approval_status,
      rights_verified = excluded.rights_verified,
      specifications_verified = excluded.specifications_verified,
      stock_verified = excluded.stock_verified,
      commercial_terms_verified = excluded.commercial_terms_verified,
      rights_assessment = excluded.rights_assessment,
      updated_at = now();
  end if;
end $$;

-- 2. Seed store_promotions (multi-piece bundles remain inactive until owner approval)
do $$
begin
  if to_regclass('public.store_promotions') is not null then
    insert into public.store_promotions (
      code, title, subtitle, tier_type, min_qty, applies_to, discount_type,
      discount_value, free_shipping, combinable, active, requires_approval, description
    ) values
      ('SINGLE_PIECE', 'Single Piece', 'Standard Archive Tier', 'SINGLE', 1, 'hoodies', 'NONE', 0, false, false, true, false, 'Order any single hoodie at its official four-tier price (Core ৳1,099 to Premium ৳1,499) with nationwide Cash on Delivery.'),
      ('DUO_SELECTION', 'Duo Selection', '2 Hoodies · Configurable Offer Slot', 'DUO', 2, 'hoodies', 'FIXED_BDT', 0, false, false, false, true, 'Configurable 2-hoodie bundle rule. Owner can assign a fixed BDT discount or free delivery inside Admin when launching this offer.'),
      ('TRIO_PLUS', 'Three or More', '3+ Hoodies · Multi-Piece Offer Slot', 'TRIO_PLUS', 3, 'hoodies', 'FIXED_BDT', 0, false, false, false, true, 'Configurable 3+ hoodie volume offer. Activated only after owner sets exact margin-verified savings in Admin.'),
      ('WHOLESALE_RESELLER', 'Wholesale & Reseller', '10+ Units · Studio Inquiry', 'WHOLESALE', 10, 'hoodies', 'INQUIRY', 0, false, false, false, true, 'Stockists, campus clubs, and bulk orders (10+ pieces). Configure reseller rules in Admin or contact Dhaka support.')
    on conflict (code) do nothing;
  end if;
end $$;

-- 3. Seed store_variants (15 Studio-Verified Drop 01 Hoodie Variants)
delete from public.store_variants where true;

insert into public.store_variants (
  slot_id,
  sku,
  product_id,
  product_name,
  color,
  status,
  price_tier,
  price_bdt,
  draft_price_bdt,
  price_approved,
  sizes,
  stock_quantity,
  rights_verified,
  specifications_verified,
  stock_verified,
  commercial_terms_verified,
  approved_for_publication
)
values
  ('STK-H001-C01', 'STK-H001-BLK', 'STK-H001', 'SHINOBI SUNSET', 'Black', 'DOCUMENTED', 'SIGNATURE', 1369, 1369, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H001-C02', 'STK-H001-CRM', 'STK-H001', 'SHINOBI SUNSET', 'Cream', 'DOCUMENTED', 'SIGNATURE', 1369, 1369, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H002-C01', 'STK-H002-BLK', 'STK-H002', 'PEACE BRO CLUB', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H003-C01', 'STK-H003-BLK', 'STK-H003', 'FOLK ROUTE', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H004-C01', 'STK-H004-MRN', 'STK-H004', 'THE RIDER CODE', 'Maroon', 'DOCUMENTED', 'PREMIUM', 1499, 1499, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H005-C01', 'STK-H005-BLK', 'STK-H005', 'MOONLIT HERO', 'Black', 'DOCUMENTED', 'SIGNATURE', 1369, 1369, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H006-C01', 'STK-H006-BLK', 'STK-H006', 'CELLULOID NIGHTS', 'Black', 'DOCUMENTED', 'SELECT', 1250, 1250, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H007-C01', 'STK-H007-BRN', 'STK-H007', 'DHAKA AFTERGLOW', 'Chocolate Brown', 'DOCUMENTED', 'SELECT', 1250, 1250, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C01', 'STK-H008-BLK', 'STK-H008', 'COLLECTIVE VOICE', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C02', 'STK-H008-CRM', 'STK-H008', 'COLLECTIVE VOICE', 'Cream', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C03', 'STK-H008-MRN', 'STK-H008', 'COLLECTIVE VOICE', 'Maroon', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C04', 'STK-H008-BRN', 'STK-H008', 'COLLECTIVE VOICE', 'Chocolate Brown', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H009-C01', 'STK-H009-BLK', 'STK-H009', 'RICKSHAW BLOOM', 'Black', 'DOCUMENTED', 'SELECT', 1250, 1250, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H010-C01', 'STK-H010-BLK', 'STK-H010', 'CHEESE CHASE', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H011-C01', 'STK-H011-BLK', 'STK-H011', 'NIGHT CIRCUIT', 'Black', 'DOCUMENTED', 'SIGNATURE', 1369, 1369, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true);

commit;
