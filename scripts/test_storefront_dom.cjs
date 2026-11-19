/**
 * StarkiT Headless DOM & Catalog Architecture Simulation Test
 * Validates 11 Drop 01 hoodie designs / 15 documented studio colorways (0 provisional, 0 accessories),
 * 67 WebP media manifest records, and core HTML storefront routes.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/catalog.json'), 'utf8'));

console.log('--- RUNNING STOREFRONT DOM & CATALOG ARCHITECTURE SIMULATION ---');

const hoodies = catalog.products.filter((p) => p.id.startsWith('STK-'));
if (hoodies.length !== 11 || catalog.products.length !== 11) {
  throw new Error(`Expected 11 Drop 01 hoodie designs, found ${hoodies.length} (${catalog.products.length} total)`);
}
if (hoodies.some((h) => h.id === 'STK-H012')) {
  throw new Error('STK-H012 must remain excluded/on hold');
}

let totalVariants = 0;
let documentedVariants = 0;
let provisionalVariants = 0;

hoodies.forEach((h) => {
  if (!Array.isArray(h.variants) || h.variants.length < 1) {
    throw new Error(`Design ${h.id} (${h.name}) has no variants`);
  }
  totalVariants += h.variants.length;
  h.variants.forEach((v) => {
    if (v.status === 'DOCUMENTED') {
      documentedVariants++;
      if (!v.gallery || v.gallery.length === 0) {
        throw new Error(`Documented SKU ${v.sku} has no gallery`);
      }
      if (!v.available_sizes || v.available_sizes.length === 0) {
        throw new Error(`Documented SKU ${v.sku} has no sizes`);
      }
      if (v.approved_for_publication !== true || Number(v.stock_quantity) <= 0) {
        throw new Error(`Documented SKU ${v.sku} must be approved_for_publication=true with positive stock for live advertising`);
      }
    } else {
      provisionalVariants++;
      throw new Error(`Provisional or unknown status disallowed for ${v.sku}: ${v.status}`);
    }
  });
});

if (totalVariants !== 15 || documentedVariants !== 15 || provisionalVariants !== 0) {
  throw new Error(`Expected 15 total / 15 documented / 0 provisional, got ${totalVariants} / ${documentedVariants} / ${provisionalVariants}`);
}

console.log(`✓ PASS: 11 hoodie designs across ${totalVariants} documented studio variants (0 provisional, 0 accessories).`);

const mediaManifest = fs
  .readFileSync(path.join(ROOT, 'catalog/starkit_media_manifest.csv'), 'utf8')
  .trim()
  .split('\n')
  .slice(1);
if (mediaManifest.length !== 67) {
  throw new Error(`Expected 67 media manifest records, found ${mediaManifest.length}`);
}

mediaManifest.forEach((line) => {
  const parts = line.split(',');
  const filename = parts[4];
  const diskPath = path.join(ROOT, 'assets/images', filename);
  if (!fs.existsSync(diskPath)) {
    throw new Error(`Missing media file on disk: ${diskPath}`);
  }
  const sz = fs.statSync(diskPath).size;
  if (sz < 1000) {
    throw new Error(`Corrupted or suspiciously small media file: ${diskPath} (${sz} bytes)`);
  }
});

console.log('✓ PASS: All 67 WebP image assets verified on disk.');

const expectedPages = [
  'index.html',
  'shop.html',
  'about.html',
  'checkout.html',
  'order-confirmation.html',
  'contact.html',
  'shipping.html',
  'returns.html',
  'privacy.html',
  'terms.html',
  'admin.html'
];
expectedPages.forEach((page) => {
  if (!fs.existsSync(path.join(ROOT, page))) throw new Error(`Missing page: ${page}`);
});
console.log('✓ PASS: All core storefront and policy pages verified.');
