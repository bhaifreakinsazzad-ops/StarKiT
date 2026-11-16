-- ==============================================================================
-- StarkiT DROP 01 (44 Variant Slots) & DROP 02 (35 Accessories) Database Seed
-- Authoritative Schema Seeding: 11 Designs, 44 Variants (15 Live / 29 Provisional), 35 Accessories
-- ==============================================================================

begin;

-- Ensure status column exists in store_variants
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='status') then
    alter table public.store_variants add column status text default 'DOCUMENTED';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='store_variants' and column_name='slot_id') then
    alter table public.store_variants add column slot_id text;
  end if;
end $$;

-- Truncate existing seed variants safely
delete from public.store_variants where true;

insert into public.store_variants (
  slot_id,
  sku,
  product_id,
  product_name,
  color,
  status,
  price_bdt,
  sizes,
  stock_quantity,
  rights_verified,
  specifications_verified,
  stock_verified,
  commercial_terms_verified,
  approved_for_publication
)
values
  ('STK-H001-C01', 'STK-H001-BLK', 'STK-H001', 'SHINOBI SUNSET', 'Black', 'DOCUMENTED', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H001-C02', 'STK-H001-CRM', 'STK-H001', 'SHINOBI SUNSET', 'Cream', 'DOCUMENTED', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H001-C03', 'STK-H001-MRN', 'STK-H001', 'SHINOBI SUNSET', 'Maroon', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H001-C04', 'STK-H001-BRN', 'STK-H001', 'SHINOBI SUNSET', 'Chocolate Brown', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H002-C01', 'STK-H002-BLK', 'STK-H002', 'PEACE BRO CLUB', 'Black', 'DOCUMENTED', 1290, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H002-C02', 'STK-H002-CRM', 'STK-H002', 'PEACE BRO CLUB', 'Cream', 'PROVISIONAL', 1290, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H002-C03', 'STK-H002-MRN', 'STK-H002', 'PEACE BRO CLUB', 'Maroon', 'PROVISIONAL', 1290, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H002-C04', 'STK-H002-BRN', 'STK-H002', 'PEACE BRO CLUB', 'Chocolate Brown', 'PROVISIONAL', 1290, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H003-C01', 'STK-H003-BLK', 'STK-H003', 'FOLK ROUTE', 'Black', 'DOCUMENTED', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H003-C02', 'STK-H003-CRM', 'STK-H003', 'FOLK ROUTE', 'Cream', 'PROVISIONAL', 1390, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H003-C03', 'STK-H003-MRN', 'STK-H003', 'FOLK ROUTE', 'Maroon', 'PROVISIONAL', 1390, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H003-C04', 'STK-H003-BRN', 'STK-H003', 'FOLK ROUTE', 'Chocolate Brown', 'PROVISIONAL', 1390, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H004-C01', 'STK-H004-BLK', 'STK-H004', 'THE RIDER CODE', 'Black', 'PROVISIONAL', 1690, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H004-C02', 'STK-H004-CRM', 'STK-H004', 'THE RIDER CODE', 'Cream', 'PROVISIONAL', 1690, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H004-C03', 'STK-H004-MRN', 'STK-H004', 'THE RIDER CODE', 'Maroon', 'DOCUMENTED', 1690, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H004-C04', 'STK-H004-BRN', 'STK-H004', 'THE RIDER CODE', 'Chocolate Brown', 'PROVISIONAL', 1690, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H005-C01', 'STK-H005-BLK', 'STK-H005', 'MOONLIT HERO', 'Black', 'DOCUMENTED', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H005-C02', 'STK-H005-CRM', 'STK-H005', 'MOONLIT HERO', 'Cream', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H005-C03', 'STK-H005-MRN', 'STK-H005', 'MOONLIT HERO', 'Maroon', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H005-C04', 'STK-H005-BRN', 'STK-H005', 'MOONLIT HERO', 'Chocolate Brown', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H006-C01', 'STK-H006-BLK', 'STK-H006', 'CELLULOID NIGHTS', 'Black', 'DOCUMENTED', 1490, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H006-C02', 'STK-H006-CRM', 'STK-H006', 'CELLULOID NIGHTS', 'Cream', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H006-C03', 'STK-H006-MRN', 'STK-H006', 'CELLULOID NIGHTS', 'Maroon', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H006-C04', 'STK-H006-BRN', 'STK-H006', 'CELLULOID NIGHTS', 'Chocolate Brown', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H007-C01', 'STK-H007-BLK', 'STK-H007', 'DHAKA AFTERGLOW', 'Black', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H007-C02', 'STK-H007-CRM', 'STK-H007', 'DHAKA AFTERGLOW', 'Cream', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H007-C03', 'STK-H007-MRN', 'STK-H007', 'DHAKA AFTERGLOW', 'Maroon', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H007-C04', 'STK-H007-BRN', 'STK-H007', 'DHAKA AFTERGLOW', 'Chocolate Brown', 'DOCUMENTED', 1490, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-C01', 'STK-H008-BLK', 'STK-H008', 'COLLECTIVE VOICE', 'Black', 'DOCUMENTED', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-C02', 'STK-H008-CRM', 'STK-H008', 'COLLECTIVE VOICE', 'Cream', 'DOCUMENTED', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-C03', 'STK-H008-MRN', 'STK-H008', 'COLLECTIVE VOICE', 'Maroon', 'DOCUMENTED', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-C04', 'STK-H008-BRN', 'STK-H008', 'COLLECTIVE VOICE', 'Chocolate Brown', 'DOCUMENTED', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H009-C01', 'STK-H009-BLK', 'STK-H009', 'RICKSHAW BLOOM', 'Black', 'DOCUMENTED', 1490, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H009-C02', 'STK-H009-CRM', 'STK-H009', 'RICKSHAW BLOOM', 'Cream', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H009-C03', 'STK-H009-MRN', 'STK-H009', 'RICKSHAW BLOOM', 'Maroon', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H009-C04', 'STK-H009-BRN', 'STK-H009', 'RICKSHAW BLOOM', 'Chocolate Brown', 'PROVISIONAL', 1490, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H010-C01', 'STK-H010-BLK', 'STK-H010', 'CHEESE CHASE', 'Black', 'DOCUMENTED', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H010-C02', 'STK-H010-CRM', 'STK-H010', 'CHEESE CHASE', 'Cream', 'PROVISIONAL', 1390, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H010-C03', 'STK-H010-MRN', 'STK-H010', 'CHEESE CHASE', 'Maroon', 'PROVISIONAL', 1390, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H010-C04', 'STK-H010-BRN', 'STK-H010', 'CHEESE CHASE', 'Chocolate Brown', 'PROVISIONAL', 1390, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H011-C01', 'STK-H011-BLK', 'STK-H011', 'NIGHT CIRCUIT', 'Black', 'DOCUMENTED', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H011-C02', 'STK-H011-CRM', 'STK-H011', 'NIGHT CIRCUIT', 'Cream', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H011-C03', 'STK-H011-MRN', 'STK-H011', 'NIGHT CIRCUIT', 'Maroon', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('STK-H011-C04', 'STK-H011-BRN', 'STK-H011', 'NIGHT CIRCUIT', 'Chocolate Brown', 'PROVISIONAL', 1590, '[]'::jsonb, 0, true, true, false, false, false),
  ('FT-HM-001', 'FT-HM-001', 'FT-HM-001', 'LAVENDER ROSE MIRROR', 'Lavender / Rose Red', 'DOCUMENTED', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-002', 'FT-HM-002', 'FT-HM-002', 'GOLDEN MARIGOLD MIRROR', 'Marigold Yellow / Blue', 'DOCUMENTED', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-003', 'FT-HM-003', 'FT-HM-003', 'CRIMSON HERITAGE MIRROR', 'Crimson Red / Navy', 'DOCUMENTED', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-004', 'FT-HM-004', 'FT-HM-004', 'ROYAL PLUM MIRROR', 'Deep Plum / Lavender', 'DOCUMENTED', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-005', 'FT-HM-005', 'FT-HM-005', 'TEAL BLOOM MIRROR', 'Deep Teal / Gold', 'DOCUMENTED', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-001', 'FT-JWL-001', 'FT-JWL-001', 'INDIGO FOLK RELIEF SET', 'Indigo Navy / Cobalt', 'DOCUMENTED', 699, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-002', 'FT-JWL-002', 'FT-JWL-002', 'SAFFRON FOLK RELIEF SET', 'Saffron / Burnt Orange', 'DOCUMENTED', 649, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-003', 'FT-JWL-003', 'FT-JWL-003', 'WILDFLOWER BOUQUET PENDANT', 'Yellow / Red / Green', 'DOCUMENTED', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-004', 'FT-JWL-004', 'FT-JWL-004', 'CRIMSON MANDALA PENDANT', 'Crimson / Emerald Green', 'DOCUMENTED', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-005', 'FT-JWL-005', 'FT-JWL-005', 'CARNIVAL SUNFLOWER SET', 'Multicolor / Sunflower', 'DOCUMENTED', 699, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-006', 'FT-JWL-006', 'FT-JWL-006', 'SCARLET BLOSSOM PENDANT', 'Scarlet Red / Emerald', 'DOCUMENTED', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-007', 'FT-JWL-007', 'FT-JWL-007', 'PAISLEY FOLK DROP', 'Brick Red / Jewel Tones', 'DOCUMENTED', 399, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-008', 'FT-JWL-008', 'FT-JWL-008', 'GOLDEN JASMINE GARLAND', 'Sunshine Yellow / White', 'DOCUMENTED', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-009', 'FT-JWL-009', 'FT-JWL-009', 'RUBY SUNBURST PENDANT', 'Ruby / Magenta / Gold', 'DOCUMENTED', 329, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-010', 'FT-JWL-010', 'FT-JWL-010', 'HERITAGE RICKSHAW PENDANT', 'Forest Green / Rickshaw Art', 'DOCUMENTED', 449, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-011', 'FT-JWL-011', 'FT-JWL-011', 'AZURE LACE SQUARE', 'Ivory White / Sky Blue', 'DOCUMENTED', 359, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-012', 'FT-JWL-012', 'FT-JWL-012', 'KALEIDO MIRROR BLOOM', 'Aqua / Rainbow Floral', 'DOCUMENTED', 399, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-013', 'FT-JWL-013', 'FT-JWL-013', 'TURQUOISE PINWHEEL', 'Turquoise / Gold', 'DOCUMENTED', 389, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-014', 'FT-JWL-014', 'FT-JWL-014', 'VIOLET GARDEN MEDALLION', 'Violet / Lilac', 'DOCUMENTED', 379, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-015', 'FT-JWL-015', 'FT-JWL-015', 'COCOA CROSSHATCH PENDANT', 'Cocoa Brown / Ivory', 'DOCUMENTED', 299, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-016', 'FT-JWL-016', 'FT-JWL-016', 'SPRING LEAF PENDANT', 'Ivory White / Spring Green', 'DOCUMENTED', 329, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-017', 'FT-JWL-017', 'FT-JWL-017', 'MIDNIGHT SHELL FRINGE', 'Midnight Black / White Shells', 'DOCUMENTED', 379, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-018', 'FT-JWL-018', 'FT-JWL-018', 'AQUA DAISY BLOOM', 'Aqua / Turquoise', 'DOCUMENTED', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-019', 'FT-JWL-019', 'FT-JWL-019', 'MARIGOLD SUNFLOWER PENDANT', 'Marigold Yellow / Orange', 'DOCUMENTED', 329, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-001', 'FT-BA-001', 'FT-BA-001', 'PAINTED BANGLE HARMONY SELECTION', 'Assorted Hand-Painted', 'DOCUMENTED', 219, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-002', 'FT-BA-002', 'FT-BA-002', 'NOIR SILVER-TONE BEAD BANGLES', 'Noir Black / Silver', 'DOCUMENTED', 479, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-003', 'FT-BA-003', 'FT-BA-003', 'SUNBURST FOLK ACCENT BANGLE', 'Festive Orange', 'DOCUMENTED', 449, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-004', 'FT-BA-004', 'FT-BA-004', 'BLUSH BEADED STITCH TRIO', 'Blush Pink / Peach', 'DOCUMENTED', 549, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-005', 'FT-BA-005', 'FT-BA-005', 'COLOR POP STITCH TRIO', 'Maroon / Teal / Lime', 'DOCUMENTED', 549, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-006', 'FT-BA-006', 'FT-BA-006', 'MIDNIGHT BLOOM BANGLES', 'Midnight Black / Neon Stitch', 'DOCUMENTED', 599, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-007', 'FT-BA-007', 'FT-BA-007', 'DAISY SKY FLORAL PAIR', 'Turquoise Sky / Royal Blue', 'DOCUMENTED', 399, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-008', 'FT-BA-008', 'FT-BA-008', 'SUNSET BLOOM BANGLES', 'Sunset Orange / Coral', 'DOCUMENTED', 399, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-009', 'FT-BA-009', 'FT-BA-009', 'EVERYDAY THREAD LUXE TRIO', 'Peach / Teal / Burgundy', 'DOCUMENTED', 499, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-010', 'FT-BA-010', 'FT-BA-010', 'SAGE CHARM STITCH TRIO', 'Sage Green / Mint', 'DOCUMENTED', 549, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-011', 'FT-BA-011', 'FT-BA-011', 'CARVED FLORA COLORWAY PAIR', 'Cobalt / Emerald / Burgundy / Yellow', 'DOCUMENTED', 449, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true);

commit;
