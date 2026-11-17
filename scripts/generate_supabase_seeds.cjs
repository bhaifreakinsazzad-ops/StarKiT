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

const documentedDesignIds = new Set(variants60.filter((v) => v.status === 'DOCUMENTED').map((v) => v.design_id));

const productRows = [];
productsData.forEach((p) => {
  const isLive = documentedDesignIds.has(p.id);
  const approvedPrice = isLive ? p.draft_price_bdt : 'null';
  const priceApproved = isLive ? true : p.price_approved === true;
  const approvalStatus = isLive ? 'PUBLISHED' : p.approval_status;
  productRows.push(
    `  ('${esc(p.id)}', '${esc(p.name)}', '${esc(p.slug)}', '${esc(p.category)}', '${esc(p.category)}', 'DROP_01', '${esc(p.price_tier)}', ${p.draft_price_bdt}, ${approvedPrice}, ${priceApproved}, '${esc(approvalStatus)}', ${isLive || p.rights_verified === true}, ${isLive || p.specifications_verified === true}, ${isLive || p.stock_verified === true}, ${isLive || p.commercial_terms_verified === true}, ${p.third_party_ip_review === true}, '${esc(p.rights_assessment)}')`
  );
});
accessories.forEach((a) => {
  productRows.push(
    `  ('${esc(a.id)}', '${esc(a.name)}', '${esc(a.slug)}', '${esc(a.category)}', '${esc(a.collection)}', 'DROP_02', 'ACCESSORY', ${a.price_bdt}, ${a.price_bdt}, true, 'PUBLISHED', true, true, true, true, false, '${esc(a.rights_assessment)}')`
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

// 60 Drop 01 Hoodie Variant Slots (15 DOCUMENTED slots live with stock=25; 45 PROVISIONAL slots held at stock=0)
variants60.forEach((v) => {
  const isDoc = v.status === 'DOCUMENTED';
  const sizesJson = JSON.stringify(
    isDoc && (!Array.isArray(v.available_sizes) || v.available_sizes.length === 0)
      ? ['M', 'L', 'XL', 'XXL']
      : v.available_sizes || []
  );
  const stockQty = isDoc ? (Number(v.stock_quantity) > 0 ? Number(v.stock_quantity) : 25) : 0;
  variantValues.push(
    `  ('${esc(v.slot_id)}', '${esc(v.sku)}', '${esc(v.design_id)}', '${esc(v.design_name)}', '${esc(v.color)}', '${esc(v.status)}', '${esc(v.price_tier)}', ${v.price_bdt}, ${v.draft_price_bdt}, ${isDoc}, '${sizesJson}'::jsonb, ${stockQty}, ${isDoc}, ${isDoc}, ${isDoc}, ${isDoc}, ${isDoc})`
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

// Also keep idempotent store_products & store_promotions fallback seed in 005_security_and_60_variant_upgrade.sql
// so executing migrations in numerical order (001 -> 002 -> 003 -> 005) never leaves store_products empty.
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

console.log(`✓ Supabase seeds updated: ${productsData.length} Drop 01 hoodies (${variants60.length} variants) + ${accessories.length} Drop 02 accessories + ${promotions.length} promotion rules.`);
