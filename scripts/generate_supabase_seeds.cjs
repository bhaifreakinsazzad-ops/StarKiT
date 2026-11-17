/**
 * StarkiT Supabase 15-Design / 60-Variant Seed Script Generator
 * Generates supabase/002_catalog_seed.sql and supabase/seed.sql
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const productsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/starkit_products.json'), 'utf8')).products;
const variants60 = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/starkit_60_variants.json'), 'utf8')).variants;
const accessories = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/accessories_drop02.json'), 'utf8'));
const promotions = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/promotions.json'), 'utf8')).promotions;

const esc = (s) => String(s ?? '').replace(/'/g, "''");

let sql = `-- ==============================================================================
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
`;

const productRows = [];
productsData.forEach((p) => {
  productRows.push(
    `  ('${esc(p.id)}', '${esc(p.name)}', '${esc(p.slug)}', '${esc(p.category)}', '${esc(p.category)}', 'DROP_01', '${esc(p.price_tier)}', ${p.draft_price_bdt}, null, ${p.price_approved === true}, '${esc(p.approval_status)}', ${p.rights_verified === true}, ${p.specifications_verified === true}, ${p.stock_verified === true}, ${p.commercial_terms_verified === true}, ${p.third_party_ip_review === true}, '${esc(p.rights_assessment)}')`
  );
});
accessories.forEach((a) => {
  productRows.push(
    `  ('${esc(a.id)}', '${esc(a.name)}', '${esc(a.slug)}', '${esc(a.category)}', '${esc(a.collection)}', 'DROP_02', 'ACCESSORY', ${a.price_bdt}, ${a.price_bdt}, true, 'PUBLISHED', true, true, true, true, false, '${esc(a.rights_assessment)}')`
  );
});

sql += `do $$
begin
  if to_regclass('public.store_products') is not null then
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
`;

const variantValues = [];

// All 60 Drop 01 Hoodie Variant Slots (unapproved / stock=0 until admin evidence approval)
variants60.forEach((v) => {
  const sizesJson = JSON.stringify(v.available_sizes || []);
  variantValues.push(
    `  ('${esc(v.slot_id)}', '${esc(v.sku)}', '${esc(v.design_id)}', '${esc(v.design_name)}', '${esc(v.color)}', '${esc(v.status)}', '${esc(v.price_tier)}', ${v.price_bdt}, ${v.draft_price_bdt}, false, '${sizesJson}'::jsonb, ${v.stock_quantity}, false, ${v.status === 'DOCUMENTED'}, false, false, false)`
  );
});

// All 35 Drop 02 Accessories (Fariza's Territory — separated from Drop 01 60-variant count)
accessories.forEach((a) => {
  const v = a.variants[0];
  const sizesJson = JSON.stringify(v.available_sizes || ['Standard']);
  variantValues.push(
    `  ('${esc(a.id)}', '${esc(v.sku)}', '${esc(a.id)}', '${esc(a.name)}', '${esc(v.color)}', 'DOCUMENTED', 'ACCESSORY', ${a.price_bdt}, ${a.price_bdt}, true, '${sizesJson}'::jsonb, ${Number(v.stock_quantity || 50)}, true, true, true, true, true)`
  );
});

sql += variantValues.join(',\n') + ';\n\ncommit;\n';

fs.writeFileSync(path.join(ROOT, 'supabase/002_catalog_seed.sql'), sql, 'utf8');
fs.writeFileSync(path.join(ROOT, 'supabase/seed.sql'), sql, 'utf8');
console.log(`✓ Supabase seeds updated: ${productsData.length} Drop 01 hoodies (${variants60.length} variants) + ${accessories.length} Drop 02 accessories + ${promotions.length} promotion rules.`);
