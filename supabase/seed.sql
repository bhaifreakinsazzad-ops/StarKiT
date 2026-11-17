-- ==============================================================================
-- StarkiT DROP 01 (15 Designs / 60 Variant Slots) & DROP 02 (35 Accessories) Seed
-- Safe unapproved defaults for unverified hoodies; Fariza's Territory accessories separated.
-- ==============================================================================

begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='status') then
    alter table public.store_variants add column status text not null default 'PROVISIONAL';
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
  ('FT-HM-001', 'LAVENDER ROSE MIRROR', 'ft-hm-001-lavender-rose-mirror', 'Artisan Accessories', 'Decorative Mirrors', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-002', 'GOLDEN MARIGOLD MIRROR', 'ft-hm-002-golden-marigold-mirror', 'Artisan Accessories', 'Decorative Mirrors', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-003', 'CRIMSON HERITAGE MIRROR', 'ft-hm-003-crimson-heritage-mirror', 'Artisan Accessories', 'Decorative Mirrors', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-004', 'ROYAL PLUM MIRROR', 'ft-hm-004-royal-plum-mirror', 'Artisan Accessories', 'Decorative Mirrors', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-HM-005', 'TEAL BLOOM MIRROR', 'ft-hm-005-teal-bloom-mirror', 'Artisan Accessories', 'Decorative Mirrors', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-001', 'INDIGO FOLK RELIEF SET', 'ft-jwl-001-indigo-folk-relief-set', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 699, 699, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-002', 'SAFFRON FOLK RELIEF SET', 'ft-jwl-002-saffron-folk-relief-set', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 649, 649, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-003', 'WILDFLOWER BOUQUET PENDANT', 'ft-jwl-003-wildflower-bouquet-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-004', 'CRIMSON MANDALA PENDANT', 'ft-jwl-004-crimson-mandala-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-005', 'CARNIVAL SUNFLOWER SET', 'ft-jwl-005-carnival-sunflower-set', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 699, 699, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-006', 'SCARLET BLOSSOM PENDANT', 'ft-jwl-006-scarlet-blossom-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-007', 'PAISLEY FOLK DROP', 'ft-jwl-007-paisley-folk-drop', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-008', 'GOLDEN JASMINE GARLAND', 'ft-jwl-008-golden-jasmine-garland', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-009', 'RUBY SUNBURST PENDANT', 'ft-jwl-009-ruby-sunburst-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 329, 329, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-010', 'HERITAGE RICKSHAW PENDANT', 'ft-jwl-010-heritage-rickshaw-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 449, 449, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-011', 'AZURE LACE SQUARE', 'ft-jwl-011-azure-lace-square', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 359, 359, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-012', 'KALEIDO MIRROR BLOOM', 'ft-jwl-012-kaleido-mirror-bloom', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-013', 'TURQUOISE PINWHEEL', 'ft-jwl-013-turquoise-pinwheel', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 389, 389, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-014', 'VIOLET GARDEN MEDALLION', 'ft-jwl-014-violet-garden-medallion', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 379, 379, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-015', 'COCOA CROSSHATCH PENDANT', 'ft-jwl-015-cocoa-crosshatch-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 299, 299, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-016', 'SPRING LEAF PENDANT', 'ft-jwl-016-spring-leaf-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 329, 329, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-017', 'MIDNIGHT SHELL FRINGE', 'ft-jwl-017-midnight-shell-fringe', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 379, 379, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-018', 'AQUA DAISY BLOOM', 'ft-jwl-018-aqua-daisy-bloom', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 349, 349, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-JWL-019', 'MARIGOLD SUNFLOWER PENDANT', 'ft-jwl-019-marigold-sunflower-pendant', 'Artisan Accessories', 'Wearable Art', 'DROP_02', 'ACCESSORY', 329, 329, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-001', 'PAINTED BANGLE HARMONY SELECTION', 'ft-ba-001-painted-bangle-harmony-selection', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 219, 219, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-002', 'NOIR SILVER-TONE BEAD BANGLES', 'ft-ba-002-noir-silver-tone-bead-bangles', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 479, 479, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-003', 'SUNBURST FOLK ACCENT BANGLE', 'ft-ba-003-sunburst-folk-accent-bangle', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 449, 449, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-004', 'BLUSH BEADED STITCH TRIO', 'ft-ba-004-blush-beaded-stitch-trio', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 549, 549, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-005', 'COLOR POP STITCH TRIO', 'ft-ba-005-color-pop-stitch-trio', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 549, 549, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-006', 'MIDNIGHT BLOOM BANGLES', 'ft-ba-006-midnight-bloom-bangles', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 599, 599, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-007', 'DAISY SKY FLORAL PAIR', 'ft-ba-007-daisy-sky-floral-pair', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-008', 'SUNSET BLOOM BANGLES', 'ft-ba-008-sunset-bloom-bangles', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 399, 399, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-009', 'EVERYDAY THREAD LUXE TRIO', 'ft-ba-009-everyday-thread-luxe-trio', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 499, 499, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-010', 'SAGE CHARM STITCH TRIO', 'ft-ba-010-sage-charm-stitch-trio', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 549, 549, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation'),
  ('FT-BA-011', 'CARVED FLORA COLORWAY PAIR', 'ft-ba-011-carved-flora-colorway-pair', 'Artisan Accessories', 'Bangles & Accents', 'DROP_02', 'ACCESSORY', 449, 449, true, 'PUBLISHED', true, true, true, true, false, 'Authentic Fariza’s Territory Artisan Creation')
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

-- 3. Seed store_variants (60 Drop 01 Hoodie Slots + 35 Drop 02 Accessories)
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
  ('STK-H001-C03', 'STK-H001-MRN', 'STK-H001', 'SHINOBI SUNSET', 'Maroon', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H001-C04', 'STK-H001-BRN', 'STK-H001', 'SHINOBI SUNSET', 'Chocolate Brown', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H002-C01', 'STK-H002-BLK', 'STK-H002', 'PEACE BRO CLUB', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H002-C02', 'STK-H002-CRM', 'STK-H002', 'PEACE BRO CLUB', 'Cream', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H002-C03', 'STK-H002-MRN', 'STK-H002', 'PEACE BRO CLUB', 'Maroon', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H002-C04', 'STK-H002-BRN', 'STK-H002', 'PEACE BRO CLUB', 'Chocolate Brown', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H003-C01', 'STK-H003-BLK', 'STK-H003', 'FOLK ROUTE', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H003-C02', 'STK-H003-CRM', 'STK-H003', 'FOLK ROUTE', 'Cream', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H003-C03', 'STK-H003-MRN', 'STK-H003', 'FOLK ROUTE', 'Maroon', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H003-C04', 'STK-H003-BRN', 'STK-H003', 'FOLK ROUTE', 'Chocolate Brown', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H004-C01', 'STK-H004-BLK', 'STK-H004', 'THE RIDER CODE', 'Black', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H004-C02', 'STK-H004-CRM', 'STK-H004', 'THE RIDER CODE', 'Cream', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H004-C03', 'STK-H004-MRN', 'STK-H004', 'THE RIDER CODE', 'Maroon', 'DOCUMENTED', 'PREMIUM', 1499, 1499, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H004-C04', 'STK-H004-BRN', 'STK-H004', 'THE RIDER CODE', 'Chocolate Brown', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H005-C01', 'STK-H005-BLK', 'STK-H005', 'MOONLIT HERO', 'Black', 'DOCUMENTED', 'SIGNATURE', 1369, 1369, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H005-C02', 'STK-H005-CRM', 'STK-H005', 'MOONLIT HERO', 'Cream', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H005-C03', 'STK-H005-MRN', 'STK-H005', 'MOONLIT HERO', 'Maroon', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H005-C04', 'STK-H005-BRN', 'STK-H005', 'MOONLIT HERO', 'Chocolate Brown', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H006-C01', 'STK-H006-BLK', 'STK-H006', 'CELLULOID NIGHTS', 'Black', 'DOCUMENTED', 'SELECT', 1250, 1250, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H006-C02', 'STK-H006-CRM', 'STK-H006', 'CELLULOID NIGHTS', 'Cream', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H006-C03', 'STK-H006-MRN', 'STK-H006', 'CELLULOID NIGHTS', 'Maroon', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H006-C04', 'STK-H006-BRN', 'STK-H006', 'CELLULOID NIGHTS', 'Chocolate Brown', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H007-C01', 'STK-H007-BLK', 'STK-H007', 'DHAKA AFTERGLOW', 'Black', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H007-C02', 'STK-H007-CRM', 'STK-H007', 'DHAKA AFTERGLOW', 'Cream', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H007-C03', 'STK-H007-MRN', 'STK-H007', 'DHAKA AFTERGLOW', 'Maroon', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H007-C04', 'STK-H007-BRN', 'STK-H007', 'DHAKA AFTERGLOW', 'Chocolate Brown', 'DOCUMENTED', 'SELECT', 1250, 1250, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C01', 'STK-H008-BLK', 'STK-H008', 'COLLECTIVE VOICE', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C02', 'STK-H008-CRM', 'STK-H008', 'COLLECTIVE VOICE', 'Cream', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C03', 'STK-H008-MRN', 'STK-H008', 'COLLECTIVE VOICE', 'Maroon', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H008-C04', 'STK-H008-BRN', 'STK-H008', 'COLLECTIVE VOICE', 'Chocolate Brown', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H009-C01', 'STK-H009-BLK', 'STK-H009', 'RICKSHAW BLOOM', 'Black', 'DOCUMENTED', 'SELECT', 1250, 1250, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H009-C02', 'STK-H009-CRM', 'STK-H009', 'RICKSHAW BLOOM', 'Cream', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H009-C03', 'STK-H009-MRN', 'STK-H009', 'RICKSHAW BLOOM', 'Maroon', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H009-C04', 'STK-H009-BRN', 'STK-H009', 'RICKSHAW BLOOM', 'Chocolate Brown', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H010-C01', 'STK-H010-BLK', 'STK-H010', 'CHEESE CHASE', 'Black', 'DOCUMENTED', 'CORE', 1099, 1099, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H010-C02', 'STK-H010-CRM', 'STK-H010', 'CHEESE CHASE', 'Cream', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H010-C03', 'STK-H010-MRN', 'STK-H010', 'CHEESE CHASE', 'Maroon', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H010-C04', 'STK-H010-BRN', 'STK-H010', 'CHEESE CHASE', 'Chocolate Brown', 'PROVISIONAL', 'CORE', 1099, 1099, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H011-C01', 'STK-H011-BLK', 'STK-H011', 'NIGHT CIRCUIT', 'Black', 'DOCUMENTED', 'SIGNATURE', 1369, 1369, true, '["M","L","XL","XXL"]'::jsonb, 25, true, true, true, true, true),
  ('STK-H011-C02', 'STK-H011-CRM', 'STK-H011', 'NIGHT CIRCUIT', 'Cream', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H011-C03', 'STK-H011-MRN', 'STK-H011', 'NIGHT CIRCUIT', 'Maroon', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H011-C04', 'STK-H011-BRN', 'STK-H011', 'NIGHT CIRCUIT', 'Chocolate Brown', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H013-C01', 'STK-H013-BLK', 'STK-H013', 'SHADOW SHINOBI', 'Black', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H013-C02', 'STK-H013-CRM', 'STK-H013', 'SHADOW SHINOBI', 'Cream', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H013-C03', 'STK-H013-MRN', 'STK-H013', 'SHADOW SHINOBI', 'Maroon', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H013-C04', 'STK-H013-BRN', 'STK-H013', 'SHADOW SHINOBI', 'Chocolate Brown', 'PROVISIONAL', 'SIGNATURE', 1369, 1369, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H014-C01', 'STK-H014-BLK', 'STK-H014', 'URBAN HERITAGE', 'Black', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H014-C02', 'STK-H014-CRM', 'STK-H014', 'URBAN HERITAGE', 'Cream', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H014-C03', 'STK-H014-MRN', 'STK-H014', 'URBAN HERITAGE', 'Maroon', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H014-C04', 'STK-H014-BRN', 'STK-H014', 'URBAN HERITAGE', 'Chocolate Brown', 'PROVISIONAL', 'SELECT', 1250, 1250, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H015-C01', 'STK-H015-BLK', 'STK-H015', 'HERITAGE STATIC', 'Black', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H015-C02', 'STK-H015-CRM', 'STK-H015', 'HERITAGE STATIC', 'Cream', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H015-C03', 'STK-H015-MRN', 'STK-H015', 'HERITAGE STATIC', 'Maroon', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H015-C04', 'STK-H015-BRN', 'STK-H015', 'HERITAGE STATIC', 'Chocolate Brown', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H016-C01', 'STK-H016-BLK', 'STK-H016', 'MIDNIGHT SIGNAL', 'Black', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H016-C02', 'STK-H016-CRM', 'STK-H016', 'MIDNIGHT SIGNAL', 'Cream', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H016-C03', 'STK-H016-MRN', 'STK-H016', 'MIDNIGHT SIGNAL', 'Maroon', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('STK-H016-C04', 'STK-H016-BRN', 'STK-H016', 'MIDNIGHT SIGNAL', 'Chocolate Brown', 'PROVISIONAL', 'PREMIUM', 1499, 1499, false, '[]'::jsonb, 0, false, false, false, false, false),
  ('FT-HM-001', 'FT-HM-001', 'FT-HM-001', 'LAVENDER ROSE MIRROR', 'Lavender / Rose Red', 'DOCUMENTED', 'ACCESSORY', 499, 499, true, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-002', 'FT-HM-002', 'FT-HM-002', 'GOLDEN MARIGOLD MIRROR', 'Marigold Yellow / Blue', 'DOCUMENTED', 'ACCESSORY', 499, 499, true, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-003', 'FT-HM-003', 'FT-HM-003', 'CRIMSON HERITAGE MIRROR', 'Crimson Red / Navy', 'DOCUMENTED', 'ACCESSORY', 499, 499, true, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-004', 'FT-HM-004', 'FT-HM-004', 'ROYAL PLUM MIRROR', 'Deep Plum / Lavender', 'DOCUMENTED', 'ACCESSORY', 499, 499, true, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-005', 'FT-HM-005', 'FT-HM-005', 'TEAL BLOOM MIRROR', 'Deep Teal / Gold', 'DOCUMENTED', 'ACCESSORY', 499, 499, true, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-001', 'FT-JWL-001', 'FT-JWL-001', 'INDIGO FOLK RELIEF SET', 'Indigo Navy / Cobalt', 'DOCUMENTED', 'ACCESSORY', 699, 699, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-002', 'FT-JWL-002', 'FT-JWL-002', 'SAFFRON FOLK RELIEF SET', 'Saffron / Burnt Orange', 'DOCUMENTED', 'ACCESSORY', 649, 649, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-003', 'FT-JWL-003', 'FT-JWL-003', 'WILDFLOWER BOUQUET PENDANT', 'Yellow / Red / Green', 'DOCUMENTED', 'ACCESSORY', 349, 349, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-004', 'FT-JWL-004', 'FT-JWL-004', 'CRIMSON MANDALA PENDANT', 'Crimson / Emerald Green', 'DOCUMENTED', 'ACCESSORY', 349, 349, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-005', 'FT-JWL-005', 'FT-JWL-005', 'CARNIVAL SUNFLOWER SET', 'Multicolor / Sunflower', 'DOCUMENTED', 'ACCESSORY', 699, 699, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-006', 'FT-JWL-006', 'FT-JWL-006', 'SCARLET BLOSSOM PENDANT', 'Scarlet Red / Emerald', 'DOCUMENTED', 'ACCESSORY', 349, 349, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-007', 'FT-JWL-007', 'FT-JWL-007', 'PAISLEY FOLK DROP', 'Brick Red / Jewel Tones', 'DOCUMENTED', 'ACCESSORY', 399, 399, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-008', 'FT-JWL-008', 'FT-JWL-008', 'GOLDEN JASMINE GARLAND', 'Sunshine Yellow / White', 'DOCUMENTED', 'ACCESSORY', 349, 349, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-009', 'FT-JWL-009', 'FT-JWL-009', 'RUBY SUNBURST PENDANT', 'Ruby / Magenta / Gold', 'DOCUMENTED', 'ACCESSORY', 329, 329, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-010', 'FT-JWL-010', 'FT-JWL-010', 'HERITAGE RICKSHAW PENDANT', 'Forest Green / Rickshaw Art', 'DOCUMENTED', 'ACCESSORY', 449, 449, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-011', 'FT-JWL-011', 'FT-JWL-011', 'AZURE LACE SQUARE', 'Ivory White / Sky Blue', 'DOCUMENTED', 'ACCESSORY', 359, 359, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-012', 'FT-JWL-012', 'FT-JWL-012', 'KALEIDO MIRROR BLOOM', 'Aqua / Rainbow Floral', 'DOCUMENTED', 'ACCESSORY', 399, 399, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-013', 'FT-JWL-013', 'FT-JWL-013', 'TURQUOISE PINWHEEL', 'Turquoise / Gold', 'DOCUMENTED', 'ACCESSORY', 389, 389, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-014', 'FT-JWL-014', 'FT-JWL-014', 'VIOLET GARDEN MEDALLION', 'Violet / Lilac', 'DOCUMENTED', 'ACCESSORY', 379, 379, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-015', 'FT-JWL-015', 'FT-JWL-015', 'COCOA CROSSHATCH PENDANT', 'Cocoa Brown / Ivory', 'DOCUMENTED', 'ACCESSORY', 299, 299, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-016', 'FT-JWL-016', 'FT-JWL-016', 'SPRING LEAF PENDANT', 'Ivory White / Spring Green', 'DOCUMENTED', 'ACCESSORY', 329, 329, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-017', 'FT-JWL-017', 'FT-JWL-017', 'MIDNIGHT SHELL FRINGE', 'Midnight Black / White Shells', 'DOCUMENTED', 'ACCESSORY', 379, 379, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-018', 'FT-JWL-018', 'FT-JWL-018', 'AQUA DAISY BLOOM', 'Aqua / Turquoise', 'DOCUMENTED', 'ACCESSORY', 349, 349, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-019', 'FT-JWL-019', 'FT-JWL-019', 'MARIGOLD SUNFLOWER PENDANT', 'Marigold Yellow / Orange', 'DOCUMENTED', 'ACCESSORY', 329, 329, true, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-001', 'FT-BA-001', 'FT-BA-001', 'PAINTED BANGLE HARMONY SELECTION', 'Assorted Hand-Painted', 'DOCUMENTED', 'ACCESSORY', 219, 219, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-002', 'FT-BA-002', 'FT-BA-002', 'NOIR SILVER-TONE BEAD BANGLES', 'Noir Black / Silver', 'DOCUMENTED', 'ACCESSORY', 479, 479, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-003', 'FT-BA-003', 'FT-BA-003', 'SUNBURST FOLK ACCENT BANGLE', 'Festive Orange', 'DOCUMENTED', 'ACCESSORY', 449, 449, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-004', 'FT-BA-004', 'FT-BA-004', 'BLUSH BEADED STITCH TRIO', 'Blush Pink / Peach', 'DOCUMENTED', 'ACCESSORY', 549, 549, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-005', 'FT-BA-005', 'FT-BA-005', 'COLOR POP STITCH TRIO', 'Maroon / Teal / Lime', 'DOCUMENTED', 'ACCESSORY', 549, 549, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-006', 'FT-BA-006', 'FT-BA-006', 'MIDNIGHT BLOOM BANGLES', 'Midnight Black / Neon Stitch', 'DOCUMENTED', 'ACCESSORY', 599, 599, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-007', 'FT-BA-007', 'FT-BA-007', 'DAISY SKY FLORAL PAIR', 'Turquoise Sky / Royal Blue', 'DOCUMENTED', 'ACCESSORY', 399, 399, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-008', 'FT-BA-008', 'FT-BA-008', 'SUNSET BLOOM BANGLES', 'Sunset Orange / Coral', 'DOCUMENTED', 'ACCESSORY', 399, 399, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-009', 'FT-BA-009', 'FT-BA-009', 'EVERYDAY THREAD LUXE TRIO', 'Peach / Teal / Burgundy', 'DOCUMENTED', 'ACCESSORY', 499, 499, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-010', 'FT-BA-010', 'FT-BA-010', 'SAGE CHARM STITCH TRIO', 'Sage Green / Mint', 'DOCUMENTED', 'ACCESSORY', 549, 549, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-011', 'FT-BA-011', 'FT-BA-011', 'CARVED FLORA COLORWAY PAIR', 'Cobalt / Emerald / Burgundy / Yellow', 'DOCUMENTED', 'ACCESSORY', 449, 449, true, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true);

commit;
