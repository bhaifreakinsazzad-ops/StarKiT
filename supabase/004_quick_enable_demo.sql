-- OPTIONAL SANDBOX TESTING SEED ONLY
-- Activates Cash on Delivery and populates sandbox inventory ONLY for DOCUMENTED
-- non-concept SKUs. NEVER runs automatically in production and NEVER activates
-- PROVISIONAL colorways or concept-stage designs (STK-H013..STK-H016) or held STK-H012.

begin;

insert into public.store_settings (key, value)
values
  ('cod_enabled', 'true'::jsonb),
  ('store_mode', '"public"'::jsonb),
  ('delivery_dhaka_bdt', '80'::jsonb),
  ('delivery_outside_bdt', '150'::jsonb)
on conflict (key) do update
set value = excluded.value, updated_at = now();

update public.store_variants
set
  sizes = case when sku like 'FT-%' then '["Standard"]'::jsonb else '["M", "L", "XL", "XXL"]'::jsonb end,
  stock_quantity = 25,
  rights_verified = true,
  specifications_verified = true,
  stock_verified = true,
  commercial_terms_verified = true,
  price_approved = true,
  approved_for_publication = true,
  updated_at = now()
where status = 'DOCUMENTED'
  and product_id not in ('STK-H012', 'STK-H013', 'STK-H014', 'STK-H015', 'STK-H016');

commit;
