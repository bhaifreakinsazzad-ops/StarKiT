-- ==============================================================================
-- StarkiT Upgrade Migration 005 — Security, 15 Designs / 60 Variants,
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
alter table public.store_variants add column if not exists status text not null default 'PROVISIONAL';
alter table public.store_variants add column if not exists price_tier text;
alter table public.store_variants add column if not exists draft_price_bdt integer;
alter table public.store_variants add column if not exists price_approved boolean not null default false;

-- 2. Add promotion & discount columns on store_orders
alter table public.store_orders add column if not exists discount_bdt integer not null default 0 check(discount_bdt >= 0);
alter table public.store_orders add column if not exists applied_promotions jsonb not null default '[]'::jsonb;

-- 3. Master Product Table (15 Drop 01 Hoodies + 35 Drop 02 Accessories)
create table if not exists public.store_products (
  id text primary key,
  name text not null,
  slug text not null unique,
  category text not null,
  collection text not null,
  drop_code text not null default 'DROP_01',
  price_tier text not null check(price_tier in ('CORE', 'SELECT', 'SIGNATURE', 'PREMIUM', 'ACCESSORY')),
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
  ('STK-H011', 'NIGHT CIRCUIT', 'night-circuit', 'Moto Culture', 'Moto Culture', 'DROP_01', 'SIGNATURE', 1369, 1369, true, 'PUBLISHED', true, true, true, true, true, 'Verified Drop 01 Archive Release — Approved for Public Commercial Sale.'),
  ('STK-H013', 'SHADOW SHINOBI', 'shadow-shinobi', 'Anime Archive', 'Anime Archive', 'DROP_01', 'SIGNATURE', 1369, null, false, 'MEDIA_PENDING', false, false, false, false, true, 'Concept-stage design: original illustration confirmation, studio mockups, and licensing review pending.'),
  ('STK-H014', 'URBAN HERITAGE', 'urban-heritage', 'Bangla Heritage', 'Bangla Heritage', 'DROP_01', 'SELECT', 1250, null, false, 'MEDIA_PENDING', false, false, false, false, false, 'Concept-stage original artwork: graphic sign-off, production sample, and photography pending.'),
  ('STK-H015', 'HERITAGE STATIC', 'heritage-static', 'Statement Graphics', 'Statement Graphics', 'DROP_01', 'PREMIUM', 1499, null, false, 'MEDIA_PENDING', false, false, false, false, false, 'Concept-stage collector piece: screen-separation proof, GSM sample, and studio photos pending.'),
  ('STK-H016', 'MIDNIGHT SIGNAL', 'midnight-signal', 'City Stories', 'City Stories', 'DROP_01', 'PREMIUM', 1499, null, false, 'MEDIA_PENDING', false, false, false, false, false, 'Concept-stage flagship design: artwork approval, sample shoot, and stock allocation pending.'),
  ('FT-HM-001', 'LAVENDER ROSE MIRROR', 'ft-hm-001-lavender-rose-mirror', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-002', 'GOLDEN MARIGOLD MIRROR', 'ft-hm-002-golden-marigold-mirror', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-003', 'CRIMSON HERITAGE MIRROR', 'ft-hm-003-crimson-heritage-mirror', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-004', 'ROYAL PLUM MIRROR', 'ft-hm-004-royal-plum-mirror', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-005', 'TEAL BLOOM MIRROR', 'ft-hm-005-teal-bloom-mirror', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-001', 'INDIGO FOLK RELIEF SET', 'ft-jwl-001-indigo-folk-relief-set', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 699, 699, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-002', 'SAFFRON FOLK RELIEF SET', 'ft-jwl-002-saffron-folk-relief-set', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 649, 649, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-003', 'WILDFLOWER BOUQUET PENDANT', 'ft-jwl-003-wildflower-bouquet-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-004', 'CRIMSON MANDALA PENDANT', 'ft-jwl-004-crimson-mandala-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-005', 'CARNIVAL SUNFLOWER SET', 'ft-jwl-005-carnival-sunflower-set', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 699, 699, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-006', 'SCARLET BLOSSOM PENDANT', 'ft-jwl-006-scarlet-blossom-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-007', 'PAISLEY FOLK DROP', 'ft-jwl-007-paisley-folk-drop', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-008', 'GOLDEN JASMINE GARLAND', 'ft-jwl-008-golden-jasmine-garland', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-009', 'RUBY SUNBURST PENDANT', 'ft-jwl-009-ruby-sunburst-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 329, 329, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-010', 'HERITAGE RICKSHAW PENDANT', 'ft-jwl-010-heritage-rickshaw-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 449, 449, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-011', 'AZURE LACE SQUARE', 'ft-jwl-011-azure-lace-square', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 359, 359, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-012', 'KALEIDO MIRROR BLOOM', 'ft-jwl-012-kaleido-mirror-bloom', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-013', 'TURQUOISE PINWHEEL', 'ft-jwl-013-turquoise-pinwheel', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 389, 389, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-014', 'VIOLET GARDEN MEDALLION', 'ft-jwl-014-violet-garden-medallion', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 379, 379, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-015', 'COCOA CROSSHATCH PENDANT', 'ft-jwl-015-cocoa-crosshatch-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 299, 299, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-016', 'SPRING LEAF PENDANT', 'ft-jwl-016-spring-leaf-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 329, 329, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-017', 'MIDNIGHT SHELL FRINGE', 'ft-jwl-017-midnight-shell-fringe', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 379, 379, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-018', 'AQUA DAISY BLOOM', 'ft-jwl-018-aqua-daisy-bloom', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-019', 'MARIGOLD SUNFLOWER PENDANT', 'ft-jwl-019-marigold-sunflower-pendant', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 329, 329, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-001', 'PAINTED BANGLE HARMONY SELECTION', 'ft-ba-001-painted-bangle-harmony-selection', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 219, 219, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-002', 'NOIR SILVER-TONE BEAD BANGLES', 'ft-ba-002-noir-silver-tone-bead-bangles', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 479, 479, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-003', 'SUNBURST FOLK ACCENT BANGLE', 'ft-ba-003-sunburst-folk-accent-bangle', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 449, 449, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-004', 'BLUSH BEADED STITCH TRIO', 'ft-ba-004-blush-beaded-stitch-trio', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 549, 549, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-005', 'COLOR POP STITCH TRIO', 'ft-ba-005-color-pop-stitch-trio', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 549, 549, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-006', 'MIDNIGHT BLOOM BANGLES', 'ft-ba-006-midnight-bloom-bangles', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 599, 599, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-007', 'DAISY SKY FLORAL PAIR', 'ft-ba-007-daisy-sky-floral-pair', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-008', 'SUNSET BLOOM BANGLES', 'ft-ba-008-sunset-bloom-bangles', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-009', 'EVERYDAY THREAD LUXE TRIO', 'ft-ba-009-everyday-thread-luxe-trio', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-010', 'SAGE CHARM STITCH TRIO', 'ft-ba-010-sage-charm-stitch-trio', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 549, 549, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-011', 'CARVED FLORA COLORWAY PAIR', 'ft-ba-011-carved-flora-colorway-pair', 'Artisan Accessories', 'Fariza''s Territory', 'DROP_02', 'ACCESSORY', 449, 449, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation')
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
