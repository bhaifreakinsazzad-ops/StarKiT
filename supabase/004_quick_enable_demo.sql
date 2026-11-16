-- OPTIONAL TESTING SEED: Activates COD and populates inventory for all 15 SKUs.
-- ONLY run this script in a sandbox or test database when conducting end-to-end checkout verification.

begin;

-- 1. Enable Cash on Delivery and configure standard Bangladesh delivery rates
insert into public.store_settings (key, value)
values
  ('cod_enabled', 'true'::jsonb),
  ('delivery_dhaka_bdt', '80'::jsonb),
  ('delivery_outside_bdt', '150'::jsonb)
on conflict (key) do update
set value = excluded.value, updated_at = now();

-- 2. Activate all 15 SKUs with standard streetwear sizes and initial test inventory
update public.store_variants
set
  sizes = '["M", "L", "XL", "XXL"]'::jsonb,
  stock_quantity = 50,
  rights_verified = true,
  specifications_verified = true,
  stock_verified = true,
  commercial_terms_verified = true,
  approved_for_publication = true,
  updated_at = now();

commit;
