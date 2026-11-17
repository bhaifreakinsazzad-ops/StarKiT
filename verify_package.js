/**
 * Offline integrity and asset resolution verification for StarkiT 15-Design / 60-Variant Architecture.
 * Validates 50 master designs (15 Drop 01 hoodies / 60 variant slots + 35 Drop 02 accessories),
 * 67 WebP images, 13 original JPGs, 35 accessory JPGs, all HTML pages, Meta Pixel ID, and Supabase seeds.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateCatalogArchitecture } from './assets/js/core/catalog-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

console.log('--- RUNNING STARKIT DROP 01 60-VARIANT CANONICAL VERIFICATION ---');

// 1. Verify Catalog JSON
const catalogPath = path.join(ROOT, 'assets/catalog.json');
if (!fs.existsSync(catalogPath)) {
  throw new Error('assets/catalog.json not found');
}
const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const fullCatalog = catalogData.products;
if (!Array.isArray(fullCatalog) || fullCatalog.length !== 50) {
  throw new Error(`Expected 50 master designs (15 hoodies + 35 accessories), found ${fullCatalog ? fullCatalog.length : 0}`);
}

const arch = validateCatalogArchitecture(fullCatalog);
if (!arch.valid) {
  throw new Error(`Catalog architecture validation failed:\n- ${arch.errors.join('\n- ')}`);
}

const hoodies = fullCatalog.filter((p) => p.id.startsWith('STK-'));
const accessories = fullCatalog.filter((p) => p.id.startsWith('FT-'));

// 2. Verify Canonical Catalog Files in catalog/
const requiredCatalogFiles = [
  'catalog/starkit_products.json',
  'catalog/starkit_60_variants.json',
  'catalog/starkit_44_variants.json',
  'catalog/starkit_variants.csv',
  'catalog/starkit_media_manifest.csv',
  'catalog/starkit_knowledge_base.json',
  'catalog/promotions.json'
];
for (const cf of requiredCatalogFiles) {
  if (!fs.existsSync(path.join(ROOT, cf))) {
    throw new Error(`Required canonical catalog file missing: ${cf}`);
  }
}

// 3. Verify Documentation Suite in docs/
const requiredDocFiles = [
  'docs/README.md',
  'docs/README_BN.md',
  'docs/BRAND_IMPLEMENTATION.md',
  'docs/PRODUCT_IMPORT_REPORT.md',
  'docs/COLORWAY_STATUS_REPORT.md',
  'docs/MEDIA_QA_REPORT.md',
  'docs/QA_REPORT.md',
  'docs/DEPLOYMENT_GUIDE.md',
  'docs/LAUNCH_CHECKLIST.md'
];
for (const df of requiredDocFiles) {
  if (!fs.existsSync(path.join(ROOT, df))) {
    throw new Error(`Required documentation file missing: ${df}`);
  }
}

// 4. Verify Media Assets on Disk
const expectedImages = [];
for (const p of [...hoodies, ...accessories]) {
  const prodPage = path.join(ROOT, 'products', `${p.slug}.html`);
  if (!fs.existsSync(prodPage)) {
    throw new Error(`Missing product detail page: products/${p.slug}.html`);
  }

  for (const v of p.variants) {
    if (String(p.id).startsWith('STK-') && !v.sku.startsWith(p.id)) {
      throw new Error(`SKU ${v.sku} does not start with product ID ${p.id}`);
    }
    if (v.status === 'DOCUMENTED') {
      if (!Array.isArray(v.gallery) || v.gallery.length < 1) {
        throw new Error(`Documented SKU ${v.sku} is missing gallery images`);
      }
      for (const image of v.gallery) {
        const filename = image.filename;
        expectedImages.push(filename);
        const imgPath = path.join(ROOT, 'assets/images', filename);
        if (!fs.existsSync(imgPath)) {
          throw new Error(`Missing image file on disk: ${filename}`);
        }
        const stat = fs.statSync(imgPath);
        if (stat.size < 1000) {
          throw new Error(`Corrupted image file: ${filename} (${stat.size} bytes)`);
        }
      }
    }
  }
}

if (expectedImages.length !== 67) {
  throw new Error(`Expected 67 hoodie gallery images across documented variants, found ${expectedImages.length}`);
}

const refJpgs = fs.readdirSync(path.join(ROOT, 'docs/original_references')).filter((f) => f.endsWith('.jpg'));
if (refJpgs.length !== 13) {
  throw new Error(`Expected 13 original JPG reference files, found ${refJpgs.length}`);
}

const accessoryJpgs = fs.readdirSync(path.join(ROOT, 'assets/images/accessories')).filter((f) => f.endsWith('.jpg'));
if (accessoryJpgs.length !== 35) {
  throw new Error(`Expected 35 accessory JPG files, found ${accessoryJpgs.length}`);
}

// 5. Verify Essential Deployable Files
const essentialFiles = [
  'index.html',
  'shop.html',
  'checkout.html',
  'order-confirmation.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'returns.html',
  'shipping.html',
  'terms.html',
  'admin.html',
  'sitemap.xml',
  'robots.txt',
  'api/orders.js',
  'api/admin.js',
  'supabase/001_starkit_store.sql',
  'supabase/002_catalog_seed.sql',
  'supabase/003_admin_views_and_helpers.sql',
  'supabase/004_quick_enable_demo.sql',
  'supabase/005_security_and_60_variant_upgrade.sql',
  'supabase/seed.sql',
  'assets/js/catalog-data.js',
  'assets/js/app.js',
  'assets/js/core/catalog-schema.js',
  'assets/js/core/pricing-engine.js',
  'assets/js/core/runtime-store.js',
  'assets/js/core/validation.js',
  'assets/js/modules/showroom-hero.js',
  'assets/js/modules/product-grid.js',
  'assets/js/modules/offer-display.js',
  'assets/js/modules/cart-drawer.js',
  'assets/js/modules/product-viewer.js',
  'assets/js/modules/checkout-form.js',
  'assets/js/modules/order-confirmation.js',
  'assets/js/modules/admin-manager.js',
  'assets/js/spatial-three.js',
  'assets/js/interactive-anime.js',
  'assets/js/motion-engine.js',
  'assets/js/vendor/three.core.js',
  'assets/js/vendor/three.module.js',
  'assets/js/vendor/anime.esm.js',
  'assets/js/vendor/anime.min.js',
  'assets/js/vendor/motion.js',
  'assets/js/vendor/firebase-app.js',
  'assets/js/vendor/firebase-auth.js',
  'assets/js/store-config.js',
  'assets/css/styles.css',
  'assets/images/starkit-logo-brand-original.png',
  'assets/images/starkit-logo-transparent.png',
  'vercel.json',
  '.env.example'
];
for (const file of essentialFiles) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    throw new Error(`Essential file missing: ${file}`);
  }
}

// 6. HTML Link & Asset Integrity Check
const htmlFiles = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, f)),
  ...fs.readdirSync(path.join(ROOT, 'products')).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, 'products', f))
];

console.log(`Auditing ${htmlFiles.length} HTML files for link, typography, and Meta Pixel integrity...`);
const brokenLinks = [];

for (const htmlPath of htmlFiles) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const dir = path.dirname(htmlPath);

  const titleMatches = content.match(/<title>[\s\S]*?<\/title>/gi);
  if (!titleMatches || titleMatches.length !== 1) {
    throw new Error(`Invalid title tag count (${titleMatches ? titleMatches.length : 0}) in ${path.relative(ROOT, htmlPath)}`);
  }

  const strippedContent = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (tag, body) => tag.replace(body, ''));
  const urlRegex = /(?:src|href)=["']([^"']+)["']/gi;
  let match;
  while ((match = urlRegex.exec(strippedContent)) !== null) {
    const rawUrl = match[1];
    if (
      !rawUrl ||
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://') ||
      rawUrl.startsWith('#') ||
      rawUrl.startsWith('mailto:') ||
      rawUrl.startsWith('tel:') ||
      rawUrl.startsWith('data:') ||
      rawUrl.startsWith('javascript:') ||
      rawUrl.startsWith('${')
    ) {
      continue;
    }
    const cleanUrl = rawUrl.split('#')[0].split('?')[0];
    if (!cleanUrl) continue;
    const resolvedPath = path.resolve(dir, cleanUrl);
    if (!fs.existsSync(resolvedPath)) {
      brokenLinks.push({ file: path.relative(ROOT, htmlPath), url: rawUrl, resolved: resolvedPath });
    }
  }

  if (!content.includes('1390081606323661')) {
    throw new Error(`Meta Pixel ID 1390081606323661 missing in ${path.relative(ROOT, htmlPath)}`);
  }
  if (!content.includes('Afacad+Flux') && !content.includes('Afacad Flux')) {
    throw new Error(`Brand Book font Afacad Flux missing in ${path.relative(ROOT, htmlPath)}`);
  }
}

if (brokenLinks.length > 0) {
  console.error('Broken links found:', brokenLinks);
  throw new Error(`Found ${brokenLinks.length} broken link(s)!`);
}

console.log('✓ PASS: 15 Drop 01 hoodies configured with canonical 4-color architecture (60 slots).');
console.log('✓ PASS: Exactly 15 documented variants and 45 provisional media-pending slots verified.');
console.log('✓ PASS: 35 Drop 02 Fariza\'s Territory accessories validated.');
console.log('✓ PASS: Full catalog verified at 50 master designs + STK-H012 preserved in hold register.');
console.log('✓ PASS: All 67 WebP images, 35 accessory JPGs, and 13 reference JPGs verified on disk.');
console.log(`✓ PASS: All ${htmlFiles.length} HTML pages audited with zero broken links, Afacad Flux font, and Meta Pixel 1390081606323661.`);
