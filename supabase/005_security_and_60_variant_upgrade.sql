-- ==============================================================================
-- StarkiT Upgrade Migration 005 — Security, 11 Designs / 15 Studio Variants,
-- 4-Tier Pricing Review, Evidence-Gated Approvals, Promotions & Media Storage
-- Safe non-destructive migration (idempotent for existing Supabase databases).
-- ==============================================================================

begin;

-- 1. Harden existing store_variants defaults for any legacy deployments
alter table public.store_variants
  alter column stock_quantity set default 0,
  alter column sizes set default '[]'::jsonb,
  alter column rights_verified set default false,
  alter column specifications_verified set default false,
  alter column stock_verified set default false,
  alter column commercial_terms_verified set default false,
  alter column approved_for_publication set default false;

alter table public.store_variants add column if not exists slot_id text;
alter table public.store_variants add column if not exists status text not null default 'DOCUMENTED';
alter table public.store_variants add column if not exists price_tier text;
alter table public.store_variants add column if not exists draft_price_bdt integer;
alter table public.store_variants add column if not exists price_approved boolean not null default false;

-- 1b. Safe store_settings free_shipping_threshold seed (key-value schema; guarded against legacy column-based schemas)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings' and column_name = 'key'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings' and column_name = 'value'
  ) then
    insert into public.store_settings (key, value) values
      ('cod_enabled', 'false'::jsonb),
      ('store_mode', '"preview"'::jsonb),
      ('delivery_dhaka_bdt', '80'::jsonb),
      ('delivery_outside_bdt', '150'::jsonb),
      ('free_shipping_threshold', '3000'::jsonb)
    on conflict (key) do nothing;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings' and column_name = 'free_delivery_threshold'
  ) then
    execute 'alter table public.store_settings alter column free_delivery_threshold set default 3000.00';
  end if;
end $$;

-- 2. Add promotion & discount columns on store_orders
alter table public.store_orders add column if not exists discount_bdt integer not null default 0 check(discount_bdt >= 0);
alter table public.store_orders add column if not exists applied_promotions jsonb not null default '[]'::jsonb;

-- 3. Master Product Table (11 Drop 01 Hoodies)
create table if not exists public.store_products (
  id text primary key,
  name text not null,
  slug text not null unique,
  category text not null,
  collection text not null,
  drop_code text not null default 'DROP_01',
  price_tier text not null check(price_tier in ('CORE', 'SELECT', 'SIGNATURE', 'PREMIUM')),
  draft_price_bdt integer not null check(draft_price_bdt > 0),
  approved_price_bdt integer check(approved_price_bdt is null or approved_price_bdt > 0),
  price_approved boolean not null default false,
  approval_status text not null default 'DRAFT' check(
    approval_status in ('DRAFT', 'MEDIA_PENDING', 'RIGHTS_REVIEW', 'QUALITY_REVIEW', 'READY_FOR_APPROVAL', 'APPROVED', 'PUBLISHED', 'ARCHIVED')
  ),
  rights_verified boolean not null default false,
  specifications_verified boolean not null default false,
  stock_verified boolean not null default false,
  commercial_terms_verified boolean not null default false,
  third_party_ip_review boolean not null default false,
  rights_assessment text,
  updated_at timestamptz not null default now()
);

-- 4. Evidence-Based Product Approval Checklist Table (7 Mandatory Gates)
create table if not exists public.store_product_approvals (
  product_id text primary key references public.store_products(id) on delete cascade,
  artwork_rights_ok boolean not null default false,
  garment_specs_ok boolean not null default false,
  sample_photo_ok boolean not null default false,
  size_run_ok boolean not null default false,
  stock_count_ok boolean not null default false,
  pricing_approved_ok boolean not null default false,
  commercial_terms_ok boolean not null default false,
  evidence_notes text not null default '',
  reviewed_by text,
  reviewed_at timestamptz
);

-- 5. Configurable Promotion & Offer Rules Table
create table if not exists public.store_promotions (
  code text primary key,
  title text not null,
  subtitle text not null default '',
  tier_type text not null check(tier_type in ('SINGLE', 'DUO', 'TRIO_PLUS', 'WHOLESALE')),
  min_qty integer not null default 1 check(min_qty >= 1),
  applies_to text not null default 'hoodies' check(applies_to in ('hoodies', 'all')),
  discount_type text not null default 'NONE' check(discount_type in ('NONE', 'FIXED_BDT', 'PERCENT', 'INQUIRY')),
  discount_value integer not null default 0 check(discount_value >= 0),
  free_shipping boolean not null default false,
  combinable boolean not null default false,
  active boolean not null default false,
  requires_approval boolean not null default true,
  description text not null default '',
  approved_by text,
  updated_at timestamptz not null default now()
);

-- 6. Persistent Media Asset Registry (Supabase Storage + Local Verified WebPs)
create table if not exists public.store_media_assets (
  id uuid primary key default gen_random_uuid(),
  design_id text not null,
  sku text not null,
  view_type text not null default 'front',
  storage_bucket text not null default 'starkit-media',
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  byte_size integer not null check(byte_size >= 0),
  source_type text not null default 'LOCAL' check(source_type in ('LOCAL', 'DRIVE_IMPORT', 'UPLOAD')),
  checksum_sha256 text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists ix_starkit_media_sku on public.store_media_assets(sku);

-- 7. Administrator RBAC Profiles (bound to Supabase Auth users)
create table if not exists public.store_admin_users (
  user_id uuid primary key,
  email text not null unique,
  role text not null default 'viewer' check(role in ('owner', 'admin', 'merchandiser', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 8. Immutable Admin Audit Trail
create table if not exists public.store_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  auth_method text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ix_starkit_audit_created on public.store_audit_logs(created_at desc);

-- Lock down all sensitive tables with RLS (service_role bypasses RLS for server-side APIs)
alter table public.store_products enable row level security;
alter table public.store_product_approvals enable row level security;
alter table public.store_promotions enable row level security;
alter table public.store_media_assets enable row level security;
alter table public.store_admin_users enable row level security;
alter table public.store_audit_logs enable row level security;

-- 9. Idempotent Catalog & Promotion Seed Backfill (safe when 005 runs after 002)
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
on conflict (id) do nothing;

insert into public.store_promotions (
  code, title, subtitle, tier_type, min_qty, applies_to, discount_type,
  discount_value, free_shipping, combinable, active, requires_approval, description
) values
  ('SINGLE_PIECE', 'Single Piece', 'Standard Archive Tier', 'SINGLE', 1, 'hoodies', 'NONE', 0, false, false, true, false, 'Order any single hoodie at its official four-tier price (Core ৳1,099 to Premium ৳1,499) with nationwide Cash on Delivery.'),
  ('DUO_SELECTION', 'Duo Selection', '2 Hoodies · Configurable Offer Slot', 'DUO', 2, 'hoodies', 'FIXED_BDT', 0, false, false, false, true, 'Configurable 2-hoodie bundle rule. Owner can assign a fixed BDT discount or free delivery inside Admin when launching this offer.'),
  ('TRIO_PLUS', 'Three or More', '3+ Hoodies · Multi-Piece Offer Slot', 'TRIO_PLUS', 3, 'hoodies', 'FIXED_BDT', 0, false, false, false, true, 'Configurable 3+ hoodie volume offer. Activated only after owner sets exact margin-verified savings in Admin.'),
  ('WHOLESALE_RESELLER', 'Wholesale & Reseller', '10+ Units · Studio Inquiry', 'WHOLESALE', 10, 'hoodies', 'INQUIRY', 0, false, false, false, true, 'Stockists, campus clubs, and bulk orders (10+ pieces). Configure reseller rules in Admin or contact Dhaka support.')
on conflict (code) do nothing;

commit;
