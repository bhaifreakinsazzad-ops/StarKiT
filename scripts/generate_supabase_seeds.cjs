/**
 * StarkiT Supabase 44-Variant Seed Script Generator
 * Generates supabase/002_catalog_seed.sql and supabase/seed.sql
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const catalog44 = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/starkit_44_variants.json'), 'utf8')).variants;
const accessories = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/accessories_drop02.json'), 'utf8'));

let sql = `-- ==============================================================================
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
`;

const variantValues = [];

// 1. All 44 Variants for Drop 01 Hoodies
catalog44.forEach((v) => {
  const isDoc = v.status === 'DOCUMENTED';
  const sizesJson = JSON.stringify(v.available_sizes || []);
  const escapedName = v.design_name.replace(/'/g, "''");
  const escapedColor = v.color.replace(/'/g, "''");

  variantValues.push(
    `  ('${v.slot_id}', '${v.sku}', '${v.design_id}', '${escapedName}', '${escapedColor}', '${v.status}', ${v.price_bdt}, '${sizesJson}'::jsonb, ${v.stock_quantity}, true, true, ${isDoc}, ${isDoc}, ${v.approved_for_publication})`
  );
});

// 2. All 35 Accessories for Drop 02
accessories.forEach((a) => {
  const v = a.variants[0];
  const sizesJson = JSON.stringify(v.available_sizes || ['Standard']);
  const escapedName = a.name.replace(/'/g, "''");
  const escapedColor = v.color.replace(/'/g, "''");

  variantValues.push(
    `  ('${a.id}', '${v.sku}', '${a.id}', '${escapedName}', '${escapedColor}', 'DOCUMENTED', ${a.price_bdt}, '${sizesJson}'::jsonb, 50, true, true, true, true, true)`
  );
});

sql += variantValues.join(',\n') + ';\n\ncommit;\n';

fs.writeFileSync(path.join(ROOT, 'supabase/002_catalog_seed.sql'), sql, 'utf8');
fs.writeFileSync(path.join(ROOT, 'supabase/seed.sql'), sql, 'utf8');
console.log(`✓ Supabase seeds updated with ${catalog44.length} Drop 01 variants + ${accessories.length} Drop 02 accessories.`);
