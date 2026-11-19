/**
 * StarkiT Supabase Drop 01 (11 Hoodies / 15 Documented Variants) Seed Script Generator
 * Generates supabase/002_catalog_seed.sql, supabase/seed.sql, and updates 005 backfill
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const productsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/starkit_products.json'), 'utf8')).products;
const variants = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/starkit_60_variants.json'), 'utf8')).variants;
const promotions = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/promotions.json'), 'utf8')).promotions;

const esc = (s) => String(s ?? '').replace(/'/g, "''");

let sql = `-- ==============================================================================
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
`;

const productRows = [];
productsData.forEach((p) => {
  productRows.push(
    `  ('${esc(p.id)}', '${esc(p.name)}', '${esc(p.slug)}', '${esc(p.category)}', '${esc(p.category)}', 'DROP_01', '${esc(p.price_tier)}', ${p.draft_price_bdt}, ${p.draft_price_bdt}, true, 'PUBLISHED', true, true, true, true, ${p.third_party_ip_review === true}, '${esc(p.rights_assessment)}')`
  );
});

sql += `do $$
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
    delete from public.store_products where id not like 'STK-H%' or id not in (${productsData.map((p) => `'${esc(p.id)}'`).join(', ')});
    insert into public.store_products (
      id, name, slug, category, collection, drop_code, price_tier,
      draft_price_bdt, approved_price_bdt, price_approved, approval_status,
      rights_verified, specifications_verified, stock_verified, commercial_terms_verified,
      third_party_ip_review, rights_assessment
    ) values
${productRows.join(',\n')}
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
${promotions
  .map(
    (pr) =>
      `      ('${esc(pr.code)}', '${esc(pr.title)}', '${esc(pr.subtitle)}', '${esc(pr.tier_type)}', ${pr.min_qty}, '${esc(pr.applies_to)}', '${esc(pr.discount_type)}', ${pr.discount_value}, ${pr.free_shipping}, ${pr.combinable}, ${pr.active}, ${pr.requires_approval}, '${esc(pr.description)}')`
  )
  .join(',\n')}
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
`;

const variantValues = variants.map((v) => {
  const sizesJson = JSON.stringify(
    Array.isArray(v.available_sizes) && v.available_sizes.length > 0
      ? v.available_sizes
      : ['M', 'L', 'XL', 'XXL']
  );
  const stockQty = Number(v.stock_quantity) > 0 ? Number(v.stock_quantity) : 25;
  return `  ('${esc(v.slot_id)}', '${esc(v.sku)}', '${esc(v.design_id)}', '${esc(v.design_name)}', '${esc(v.color)}', 'DOCUMENTED', '${esc(v.price_tier)}', ${v.price_bdt}, ${v.draft_price_bdt}, true, '${sizesJson}'::jsonb, ${stockQty}, true, true, true, true, true)`;
});

sql += variantValues.join(',\n') + ';\n\ncommit;\n';

fs.writeFileSync(path.join(ROOT, 'supabase/002_catalog_seed.sql'), sql, 'utf8');
fs.writeFileSync(path.join(ROOT, 'supabase/seed.sql'), sql, 'utf8');

const m005Path = path.join(ROOT, 'supabase/005_security_and_60_variant_upgrade.sql');
if (fs.existsSync(m005Path)) {
  const m005Raw = fs.readFileSync(m005Path, 'utf8');
  const startMarker = '-- 9. Idempotent Catalog & Promotion Seed Backfill';
  const base005 = m005Raw.includes(startMarker)
    ? m005Raw.slice(0, m005Raw.indexOf(startMarker)).trimEnd()
    : m005Raw.replace(/\ncommit;\s*$/i, '').trimEnd();

  const backfillBlock = `${startMarker} (safe when 005 runs after 002)
insert into public.store_products (
  id, name, slug, category, collection, drop_code, price_tier,
  draft_price_bdt, approved_price_bdt, price_approved, approval_status,
  rights_verified, specifications_verified, stock_verified, commercial_terms_verified,
  third_party_ip_review, rights_assessment
) values
${productRows.join(',\n')}
on conflict (id) do nothing;

insert into public.store_promotions (
  code, title, subtitle, tier_type, min_qty, applies_to, discount_type,
  discount_value, free_shipping, combinable, active, requires_approval, description
) values
${promotions
  .map(
    (pr) =>
      `  ('${esc(pr.code)}', '${esc(pr.title)}', '${esc(pr.subtitle)}', '${esc(pr.tier_type)}', ${pr.min_qty}, '${esc(pr.applies_to)}', '${esc(pr.discount_type)}', ${pr.discount_value}, ${pr.free_shipping}, ${pr.combinable}, ${pr.active}, ${pr.requires_approval}, '${esc(pr.description)}')`
  )
  .join(',\n')}
on conflict (code) do nothing;

commit;
`;
  fs.writeFileSync(m005Path, `${base005}\n\n${backfillBlock}`, 'utf8');
}

console.log(`✓ Supabase seeds updated: ${productsData.length} Drop 01 hoodies (${variants.length} documented variants) + ${promotions.length} promotion rules.`);
