-- ==============================================================================
-- StarkiT Luxury Fashion & Artisan Accessories — 50 SKU Seed Data (Live Inventory)
-- 15 Hoodie Colorways (Drop 01) + 35 Fariza's Territory Artisan Accessories (Drop 02)
-- ==============================================================================

begin;

insert into public.store_variants (sku, product_id, product_name, color, price_bdt, sizes, stock_quantity, rights_verified, specifications_verified, stock_verified, commercial_terms_verified, approved_for_publication)
values
  ('STK-H001-CRM', 'STK-H001', 'SHINOBI SUNSET', 'Cream', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H001-BLK', 'STK-H001', 'SHINOBI SUNSET', 'Black', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H002-BLK', 'STK-H002', 'PEACE BRO CLUB', 'Black', 1290, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H003-BLK', 'STK-H003', 'FOLK ROUTE', 'Black', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H004-MRN', 'STK-H004', 'THE RIDER CODE', 'Maroon', 1690, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H005-BLK', 'STK-H005', 'MOONLIT HERO', 'Black', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H006-BLK', 'STK-H006', 'CELLULOID NIGHTS', 'Black', 1490, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H007-BRN', 'STK-H007', 'DHAKA AFTERGLOW', 'Chocolate Brown', 1490, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-BLK', 'STK-H008', 'COLLECTIVE VOICE', 'Black', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-MRN', 'STK-H008', 'COLLECTIVE VOICE', 'Maroon', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-BRN', 'STK-H008', 'COLLECTIVE VOICE', 'Chocolate Brown', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H008-CRM', 'STK-H008', 'COLLECTIVE VOICE', 'Cream', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H009-BLK', 'STK-H009', 'RICKSHAW BLOOM', 'Black', 1490, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H010-BLK', 'STK-H010', 'CHEESE CHASE', 'Black', 1390, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('STK-H011-BLK', 'STK-H011', 'NIGHT CIRCUIT', 'Black', 1590, '["M","L","XL","XXL"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-001', 'FT-HM-001', 'LAVENDER ROSE MIRROR', 'Lavender / Rose Red', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-002', 'FT-HM-002', 'GOLDEN MARIGOLD MIRROR', 'Marigold Yellow / Blue', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-003', 'FT-HM-003', 'CRIMSON HERITAGE MIRROR', 'Crimson Red / Navy', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-004', 'FT-HM-004', 'ROYAL PLUM MIRROR', 'Deep Plum / Lavender', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-HM-005', 'FT-HM-005', 'TEAL BLOOM MIRROR', 'Deep Teal / Gold', 499, '["Standard"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-001', 'FT-JWL-001', 'INDIGO FOLK RELIEF SET', 'Indigo Navy / Cobalt', 699, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-002', 'FT-JWL-002', 'SAFFRON FOLK RELIEF SET', 'Saffron / Burnt Orange', 649, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-003', 'FT-JWL-003', 'WILDFLOWER BOUQUET PENDANT', 'Yellow / Red / Green', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-004', 'FT-JWL-004', 'CRIMSON MANDALA PENDANT', 'Crimson / Emerald Green', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-005', 'FT-JWL-005', 'CARNIVAL SUNFLOWER SET', 'Multicolor / Sunflower', 699, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-006', 'FT-JWL-006', 'SCARLET BLOSSOM PENDANT', 'Scarlet Red / Emerald', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-007', 'FT-JWL-007', 'PAISLEY FOLK DROP', 'Brick Red / Jewel Tones', 399, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-008', 'FT-JWL-008', 'GOLDEN JASMINE GARLAND', 'Sunshine Yellow / White', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-009', 'FT-JWL-009', 'RUBY SUNBURST PENDANT', 'Ruby / Magenta / Gold', 329, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-010', 'FT-JWL-010', 'HERITAGE RICKSHAW PENDANT', 'Forest Green / Rickshaw Art', 449, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-011', 'FT-JWL-011', 'AZURE LACE SQUARE', 'Ivory White / Sky Blue', 359, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-012', 'FT-JWL-012', 'KALEIDO MIRROR BLOOM', 'Aqua / Rainbow Floral', 399, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-013', 'FT-JWL-013', 'TURQUOISE PINWHEEL', 'Turquoise / Gold', 389, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-014', 'FT-JWL-014', 'VIOLET GARDEN MEDALLION', 'Violet / Lilac', 379, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-015', 'FT-JWL-015', 'COCOA CROSSHATCH PENDANT', 'Cocoa Brown / Ivory', 299, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-016', 'FT-JWL-016', 'SPRING LEAF PENDANT', 'Ivory White / Spring Green', 329, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-017', 'FT-JWL-017', 'MIDNIGHT SHELL FRINGE', 'Midnight Black / White Shells', 379, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-018', 'FT-JWL-018', 'AQUA DAISY BLOOM', 'Aqua / Turquoise', 349, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-JWL-019', 'FT-JWL-019', 'MARIGOLD SUNFLOWER PENDANT', 'Marigold Yellow / Orange', 329, '["One Size (Adjustable)"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-001', 'FT-BA-001', 'PAINTED BANGLE HARMONY SELECTION', 'Assorted Hand-Painted', 219, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-002', 'FT-BA-002', 'NOIR SILVER-TONE BEAD BANGLES', 'Noir Black / Silver', 479, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-003', 'FT-BA-003', 'SUNBURST FOLK ACCENT BANGLE', 'Festive Orange', 449, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-004', 'FT-BA-004', 'BLUSH BEADED STITCH TRIO', 'Blush Pink / Peach', 549, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-005', 'FT-BA-005', 'COLOR POP STITCH TRIO', 'Maroon / Teal / Lime', 549, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-006', 'FT-BA-006', 'MIDNIGHT BLOOM BANGLES', 'Midnight Black / Neon Stitch', 599, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-007', 'FT-BA-007', 'DAISY SKY FLORAL PAIR', 'Turquoise Sky / Royal Blue', 399, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-008', 'FT-BA-008', 'SUNSET BLOOM BANGLES', 'Sunset Orange / Coral', 399, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-009', 'FT-BA-009', 'EVERYDAY THREAD LUXE TRIO', 'Peach / Teal / Burgundy', 499, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-010', 'FT-BA-010', 'SAGE CHARM STITCH TRIO', 'Sage Green / Mint', 549, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true),
  ('FT-BA-011', 'FT-BA-011', 'CARVED FLORA COLORWAY PAIR', 'Cobalt / Emerald / Burgundy / Yellow', 449, '["2.4","2.6","2.8"]'::jsonb, 50, true, true, true, true, true)
on conflict (sku) do update set
  sizes = excluded.sizes,
  stock_quantity = coalesce(store_variants.stock_quantity, excluded.stock_quantity),
  rights_verified = true,
  specifications_verified = true,
  stock_verified = true,
  commercial_terms_verified = true,
  approved_for_publication = true,
  updated_at = now();

commit;
