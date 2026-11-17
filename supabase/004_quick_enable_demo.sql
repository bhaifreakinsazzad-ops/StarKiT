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
  ('delivery_outside_bdt', '150'::jsonb),
  ('free_shipping_threshold', '3000'::jsonb)
on conflict (key) do update
set value = excluded.value, updated_at = now();

update public.store_variants
set
  sizes = case
    when jsonb_array_length(sizes) > 0 then sizes
    when sku like 'FT-BA-%' then '["2.4", "2.6", "2.8"]'::jsonb
    when sku like 'FT-%' then '["Standard"]'::jsonb
    else '["M", "L", "XL", "XXL"]'::jsonb
  end,
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

do $$
begin
  if to_regclass('public.store_products') is not null then
    update public.store_products
    set
      approved_price_bdt = draft_price_bdt,
      price_approved = true,
      approval_status = 'PUBLISHED',
      rights_verified = true,
      specifications_verified = true,
      stock_verified = true,
      commercial_terms_verified = true,
      updated_at = now()
    where id not in ('STK-H012', 'STK-H013', 'STK-H014', 'STK-H015', 'STK-H016');

    if to_regclass('public.store_product_approvals') is not null then
      insert into public.store_product_approvals (
        product_id, artwork_rights_ok, garment_specs_ok, sample_photo_ok,
        size_run_ok, stock_count_ok, pricing_approved_ok, commercial_terms_ok,
        evidence_notes, reviewed_by, reviewed_at
      )
      select
        id, true, true, true, true, true, true, true,
        'Sandbox demo activation (004_quick_enable_demo.sql)',
        'sandbox_demo',
        now()
      from public.store_products
      where id not in ('STK-H012', 'STK-H013', 'STK-H014', 'STK-H015', 'STK-H016')
      on conflict (product_id) do update set
        artwork_rights_ok = true,
        garment_specs_ok = true,
        sample_photo_ok = true,
        size_run_ok = true,
        stock_count_ok = true,
        pricing_approved_ok = true,
        commercial_terms_ok = true,
        evidence_notes = excluded.evidence_notes,
        reviewed_by = excluded.reviewed_by,
        reviewed_at = now();
    end if;
  end if;
end $$;

commit;
