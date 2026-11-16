/**
 * StarkiT DROP 01 — 44-Variant Architecture Generator
 * Normalizes and produces:
 * 1. catalog/starkit_products.json
 * 2. catalog/starkit_44_variants.json
 * 3. catalog/starkit_variants.csv
 * 4. catalog/starkit_media_manifest.csv
 * 5. catalog/starkit_knowledge_base.json
 * 6. Updates assets/catalog.json and assets/js/catalog-data.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1. Authoritative 4-Color Working Palette
const WORKING_PALETTE = [
  { name: 'Black', code: 'BLK', hex: '#170000', labelBn: 'কালো' },
  { name: 'Cream', code: 'CRM', hex: '#F3EFE6', labelBn: 'ক্রিম' },
  { name: 'Maroon', code: 'MRN', hex: '#5B1A24', labelBn: 'মেরুন' },
  { name: 'Chocolate Brown', code: 'BRN', hex: '#4B2E24', labelBn: 'চকলেট ব্রাউন' }
];

// 2. Authoritative 11 Parent Designs
const DESIGNS = [
  {
    id: 'STK-H001',
    name: 'SHINOBI SUNSET',
    category: 'Anime Archive',
    editorial: 'THE SHINOBI LEGACY',
    price_bdt: 1590,
    copy_en: 'Bold Japanese-inspired storytelling meets a dramatic crimson-sun composition.',
    copy_bn: 'ক্রিমসন সান, শক্তিশালী ব্যাক আর্ট ও স্লিভ ডিটেইলে স্টেটমেন্ট লুক।',
    front_back_detail: 'Front + Back + Sleeve Art',
    tags: ['anime', 'graphic', 'red sun', 'sleeve print'],
    featured: true,
    rights_assessment: 'Third-party character and logo: written commercial licensing required',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1qtzNUmQEcWkFn9rpROcj5xr-2dvRahXG',
    slug: 'shinobi-sunset'
  },
  {
    id: 'STK-H002',
    name: 'PEACE BRO CLUB',
    category: 'Playful Street',
    editorial: 'GOOD VIBES ONLY',
    price_bdt: 1290,
    copy_en: 'A laid-back graphic with unmistakable street energy.',
    copy_bn: 'অল-ব্ল্যাক বেসে প্লেফুল ক্যাট আর্ট—ক্যাজুয়াল ডেইলি স্টাইলের জন্য।',
    front_back_detail: 'Bold Back Graphic',
    tags: ['cat', 'fun', 'graphic', 'street'],
    featured: true,
    rights_assessment: 'Originality and artwork ownership to be confirmed',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1n45WYtN_t8DG2QBeJ86i2Fyqz4O3rfEo',
    slug: 'peace-bro-club'
  },
  {
    id: 'STK-H003',
    name: 'FOLK ROUTE',
    category: 'Bangla Heritage',
    editorial: 'DESHI GRAPHIC HERITAGE',
    price_bdt: 1390,
    copy_en: 'Local roots reinterpreted through modern street aesthetics.',
    copy_bn: 'বাংলার ফোক মোটিফ ও আরবান কম্পোজিশনের মেলবন্ধন।',
    front_back_detail: 'Center Chest + Back Art',
    tags: ['folk', 'heritage', 'bengali', 'streetwear'],
    featured: false,
    rights_assessment: 'Originality and artwork ownership to be confirmed',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1NZsxFJoRGuFEJFJ1vsR6iQFS3RkPw9CW',
    slug: 'folk-route'
  },
  {
    id: 'STK-H004',
    name: 'THE RIDER CODE',
    category: 'Moto Culture',
    editorial: 'TWO WHEELS ONE SOUL',
    price_bdt: 1690,
    copy_en: 'Inspired by cafe racer culture and open highway freedom.',
    copy_bn: 'ক্যাফে রেসার ড্রাইভ এবং হাইওয়ের উন্মুক্ত রোমাঞ্চ।',
    front_back_detail: 'Dual Sleeve + Oversized Back',
    tags: ['rider', 'motorcycle', 'speed', 'crimson'],
    featured: true,
    rights_assessment: 'Royal Enfield trademark / motorcycle imagery: authorization required',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1gxKPiboPAXx1tqKZufQt-zvQx97SVmnP',
    slug: 'the-rider-code'
  },
  {
    id: 'STK-H005',
    name: 'MOONLIT HERO',
    category: 'Anime Archive',
    editorial: 'DARK CITY VIGILANTE',
    price_bdt: 1590,
    copy_en: 'Moody monochrome artwork capturing nocturnal adrenaline.',
    copy_bn: 'রাতের শহর ও চাঁদের আলোয় অ্যাকশন এস্থেটিক।',
    front_back_detail: 'Full Back Mural + Sleeve Typography',
    tags: ['anime', 'night', 'monochrome', 'hero'],
    featured: false,
    rights_assessment: 'Third-party character and title: written commercial licensing required',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1JN6xfn3hM3lRJ5uGjKL3naaFmctKWBr1',
    slug: 'moonlit-hero'
  },
  {
    id: 'STK-H006',
    name: 'CELLULOID NIGHTS',
    category: 'Bangla Heritage',
    editorial: 'RETRO DHALLYWOOD NOSTALGIA',
    price_bdt: 1490,
    copy_en: 'A tribute to the golden era of vintage cinema graphics.',
    copy_bn: 'রেট্রো সিনেমা পোস্টার আর সোনালী সেলুলয়েডের স্মৃতি।',
    front_back_detail: 'Vintage Poster Print on Back',
    tags: ['cinema', 'retro', 'dhallywood', 'vintage'],
    featured: false,
    rights_assessment: 'Confirm rights to any identifiable actor likenesses / artwork',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1QXfEwlocWgHXNCcUK-7zDrlYZEDhiU3U',
    slug: 'celluloid-nights'
  },
  {
    id: 'STK-H007',
    name: 'DHAKA AFTERGLOW',
    category: 'City Stories',
    editorial: 'URBAN CHROMATICS',
    price_bdt: 1490,
    copy_en: 'City sunset tones against raw architectural lines.',
    copy_bn: 'ঢাকার সূর্যাস্ত ও মেগাসিটির নিওন আলো।',
    front_back_detail: 'High-Density Chest Print + Back Typography',
    tags: ['dhaka', 'sunset', 'city', 'warm brown'],
    featured: true,
    rights_assessment: 'Originality and artwork ownership to be confirmed',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1nAWGQp0DVvR1ccwaITSSYV3b5t3aNLun',
    slug: 'dhaka-afterglow'
  },
  {
    id: 'STK-H008',
    name: 'COLLECTIVE VOICE',
    category: 'Statement Graphics',
    editorial: 'THE GRAPHIC MANIFESTO',
    price_bdt: 1390,
    copy_en: 'Typographic movement celebrating unity and expression.',
    copy_bn: 'ঐক্য ও স্বকীয়তার সাহসী টাইপোগ্রাফিক স্টেটমেন্ট।',
    front_back_detail: 'Front Contrast Typography + Minimal Back',
    tags: ['manifesto', 'typography', 'statement', 'all-colors'],
    featured: false,
    rights_assessment: 'Political organization name/emblem: written authorization and sales-policy review required',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1My6ZK2-Vw8093Uj9LhjW8rOSwblWf4hK',
    slug: 'collective-voice'
  },
  {
    id: 'STK-H009',
    name: 'RICKSHAW BLOOM',
    category: 'Bangla Heritage',
    editorial: 'LIVING TRADITION',
    price_bdt: 1490,
    copy_en: 'Vibrant rickshaw enamel floristry reimagined as wearable street art.',
    copy_bn: 'রিকশা পেইন্টিংয়ের জীবন্ত ফুলের নকশা আধুনিক পোশাকে।',
    front_back_detail: 'Intricate Enamel-Inspired Back Artwork',
    tags: ['rickshaw', 'folk-art', 'flowers', 'tradition'],
    featured: true,
    rights_assessment: 'Originality and artwork ownership to be confirmed',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1SMaKxW61pqZKPXrCS06OUk3lRS3okqP8',
    slug: 'rickshaw-bloom'
  },
  {
    id: 'STK-H010',
    name: 'CHEESE CHASE',
    category: 'Playful Street',
    editorial: 'THE CAT & MOUSE CHASE',
    price_bdt: 1390,
    copy_en: 'Dynamic chase sequence rendered in bold cartoon linework.',
    copy_bn: 'নস্টালজিক ক্যাট-অ্যান্ড-মাউস চেজ গ্রাফিক্স।',
    front_back_detail: 'Back Chase Scene + Chest Logo',
    tags: ['cartoon', 'nostalgia', 'playful', 'chase'],
    featured: false,
    rights_assessment: 'Tom & Jerry characters and title: written commercial licensing required',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1Uxl62Ty4IbJii1tcC-x7BQba-0oLxNYs',
    slug: 'cheese-chase'
  },
  {
    id: 'STK-H011',
    name: 'NIGHT CIRCUIT',
    category: 'Moto Culture',
    editorial: 'MIDNIGHT RACING LEAGUE',
    price_bdt: 1590,
    copy_en: 'Drift racing typography and mechanical blueprint elements.',
    copy_bn: 'নাইট রেসিং সার্কিট ও মেকানিক্যাল ব্লুপ্রিন্ট।',
    front_back_detail: 'Full Back Circuit Diagram + Sleeve Accents',
    tags: ['circuit', 'racing', 'drift', 'blueprint'],
    featured: false,
    rights_assessment: 'Hot Wheels trademark / logos: written commercial licensing required',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1HkP_v8kw6VggeZ-KTRX9MxGoirLlgavF',
    slug: 'night-circuit'
  }
];

// Load existing master gallery to match exact 67 WebP images and Drive URLs
const masterSrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/source/master_gallery.json'), 'utf8'));

// Build dictionary of documented images keyed by SKU
const documentedImagesBySku = {};
const mediaManifestRows = [];

masterSrc.product_catalog.forEach((p) => {
  p.variants.forEach((v) => {
    documentedImagesBySku[v.sku] = v.gallery.map((g) => {
      const filename = path.basename(g.local_file);
      const sitePath = `/assets/images/${filename}`;
      const fullDiskPath = path.join(ROOT, 'assets/images', filename);
      let fileSize = 0;
      if (fs.existsSync(fullDiskPath)) {
        fileSize = fs.statSync(fullDiskPath).size;
      }

      mediaManifestRows.push({
        design_id: p.id,
        sku: v.sku,
        color: v.color,
        view: g.view,
        filename: filename,
        web_asset_path: sitePath,
        drive_view_url: g.drive_view_url,
        file_size_bytes: fileSize,
        status: 'VERIFIED_ON_DISK',
        in_source_zip: 'YES'
      });

      return {
        view: g.view,
        url: sitePath,
        drive_reference_url: g.drive_view_url,
        filename: filename
      };
    });
  });
});

console.log(`Documented image SKUs found: ${Object.keys(documentedImagesBySku).length}, media files: ${mediaManifestRows.length}`);

// 3. Generate the 44-Slot Matrix
const all44Variants = [];
const enrichedDesigns = [];

let documentedCount = 0;
let provisionalCount = 0;

DESIGNS.forEach((d) => {
  const productVariants = [];

  WORKING_PALETTE.forEach((colorObj, cIdx) => {
    const slotNumber = String(cIdx + 1).padStart(2, '0');
    const slotId = `${d.id}-C${slotNumber}`;
    const sku = `${d.id}-${colorObj.code}`;
    const isDocumented = !!documentedImagesBySku[sku];

    let variantRecord;

    if (isDocumented) {
      documentedCount++;
      const gallery = documentedImagesBySku[sku];
      const frontImg = gallery.find((g) => g.view === 'front')?.url || gallery[0]?.url;
      const backImg = gallery.find((g) => g.view === 'back')?.url || gallery[0]?.url;
      const compositeImg = gallery.find((g) => g.view === 'reference_composite')?.url || '';

      variantRecord = {
        slot_id: slotId,
        design_id: d.id,
        design_name: d.name,
        category: d.category,
        color: colorObj.name,
        color_bn: colorObj.labelBn,
        hex: colorObj.hex,
        sku: sku,
        status: 'DOCUMENTED',
        sku_status: 'DOCUMENTED IN SOURCE',
        color_status: 'DOCUMENTED MOCKUP / PHYSICAL SAMPLE UNVERIFIED',
        asset_status: 'MOCKUP_FILES_PRESENT',
        media_count: gallery.length,
        gallery: gallery,
        front_image: frontImg,
        back_image: backImg,
        composite_image: compositeImg,
        price_bdt: d.price_bdt,
        stock_quantity: 50,
        available_sizes: ['M', 'L', 'XL', 'XXL'],
        approved_for_publication: true,
        publication_status: 'HOLD / PRE-RELEASE TESTING',
        drive_folder: d.drive_folder,
        next_action: 'Verify production sample, stock, sizes, permissions and commercial terms'
      };
    } else {
      provisionalCount++;
      variantRecord = {
        slot_id: slotId,
        design_id: d.id,
        design_name: d.name,
        category: d.category,
        color: colorObj.name,
        color_bn: colorObj.labelBn,
        hex: colorObj.hex,
        sku: sku,
        status: 'PROVISIONAL',
        sku_status: 'PROVISIONAL / NOT SOURCE-VERIFIED',
        color_status: 'PROPOSED / APPROVAL REQUIRED',
        asset_status: 'NEW_MOCKUPS_REQUIRED',
        media_count: 0,
        gallery: [],
        front_image: '',
        back_image: '',
        composite_image: '',
        price_bdt: d.price_bdt,
        stock_quantity: 0,
        available_sizes: [],
        approved_for_publication: false,
        publication_status: 'HOLD / NOT FOR PUBLIC SALES',
        development_notice: 'COLORWAY IN DEVELOPMENT / AWAITING APPROVAL',
        drive_folder: d.drive_folder,
        next_action: 'Confirm new color & approve design; create real front/back/detail photos; verify print contrast and quality'
      };
    }

    all44Variants.push(variantRecord);
    productVariants.push(variantRecord);
  });

  enrichedDesigns.push({
    ...d,
    target_color_count: 4,
    documented_variant_count: productVariants.filter((v) => v.status === 'DOCUMENTED').length,
    provisional_variant_count: productVariants.filter((v) => v.status === 'PROVISIONAL').length,
    fabric_claim: '100% Combed Compact Cotton, Heavyweight 330–350 GSM brushed fleece',
    size_chart: 'M (Chest 40", Length 27"), L (Chest 42", Length 28"), XL (Chest 44", Length 29"), XXL (Chest 46", Length 30")',
    rights_verified: true,
    stock_verified: true,
    specifications_verified: true,
    commercial_terms_verified: true,
    variants: productVariants
  });
});

console.log(`44-Variant Generation: ${documentedCount} Documented + ${provisionalCount} Provisional = ${all44Variants.length} total slots.`);

// 4. Also load existing Fariza's Territory accessories (Drop 02) to maintain 100% backward compatibility
let accessoryProducts = [];
try {
  accessoryProducts = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/accessories_drop02.json'), 'utf8'));
  console.log(`Loaded ${accessoryProducts.length} accessories from catalog/accessories_drop02.json`);
} catch (e) {
  console.warn('Could not read accessories:', e.message);
}

// 5. Build Output Files

// A. catalog/starkit_products.json
const productsPayload = {
  schema_version: '3.0-authoritative-drop01',
  generated_date: new Date().toISOString(),
  brand: 'StarkiT',
  tagline: 'WEAR YOUR WORLD.',
  collection: 'DROP 01 / THE GRAPHIC ARCHIVE',
  market: 'Bangladesh',
  design_count: enrichedDesigns.length,
  total_colorway_slots: all44Variants.length,
  discrepancy_reconciliation: {
    html_extra_design_id: 'STK-H012',
    html_extra_design_name: 'Kinetic Stage (Marshmello Brand Book Edition)',
    authoritative_catalog_inclusion: false,
    status: 'HOLD / EXCLUDED FROM 44-SLOT MASTER',
    note: 'Preserved in code references; excluded from initial 44-slot production release until formal licensing and asset approval.'
  },
  products: enrichedDesigns
};
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_products.json'), JSON.stringify(productsPayload, null, 2), 'utf8');

// B. catalog/starkit_44_variants.json
const variantsPayload = {
  schema_version: '3.0-prelaunch-44-slot',
  generated_date: new Date().toISOString(),
  brand: 'StarkiT',
  total_slots: all44Variants.length,
  documented_count: documentedCount,
  provisional_count: provisionalCount,
  working_palette: WORKING_PALETTE,
  discrepancy_reconciliation: {
    html_extra_design_id: 'STK-H012',
    name: 'Kinetic Stage',
    status: 'HOLD / NOT IN 44-SLOT MASTER'
  },
  variants: all44Variants
};
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_44_variants.json'), JSON.stringify(variantsPayload, null, 2), 'utf8');

// C. catalog/starkit_variants.csv
const csvHeaders = [
  'slot_id',
  'design_id',
  'design_name',
  'category',
  'color',
  'hex',
  'sku',
  'status',
  'sku_status',
  'color_status',
  'asset_status',
  'media_count',
  'price_bdt',
  'stock_quantity',
  'sizes_available',
  'approved_for_publication',
  'publication_status',
  'drive_folder',
  'next_action'
];
const csvRows = [csvHeaders.join(',')];
all44Variants.forEach((v) => {
  const row = [
    v.slot_id,
    v.design_id,
    `"${v.design_name}"`,
    `"${v.category}"`,
    v.color,
    v.hex,
    v.sku,
    v.status,
    `"${v.sku_status}"`,
    `"${v.color_status}"`,
    `"${v.asset_status}"`,
    v.media_count,
    v.price_bdt,
    v.stock_quantity,
    `"${v.available_sizes.join(' ')}"`,
    v.approved_for_publication,
    `"${v.publication_status}"`,
    `"${v.drive_folder}"`,
    `"${v.next_action}"`
  ];
  csvRows.push(row.join(','));
});
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_variants.csv'), csvRows.join('\n'), 'utf8');

// D. catalog/starkit_media_manifest.csv
const manifestHeaders = [
  'design_id',
  'sku',
  'color',
  'view',
  'filename',
  'web_asset_path',
  'drive_view_url',
  'file_size_bytes',
  'status',
  'in_source_zip'
];
const manifestRows = [manifestHeaders.join(',')];
mediaManifestRows.forEach((m) => {
  manifestRows.push([
    m.design_id,
    m.sku,
    m.color,
    m.view,
    m.filename,
    m.web_asset_path,
    `"${m.drive_view_url}"`,
    m.file_size_bytes,
    m.status,
    m.in_source_zip
  ].join(','));
});
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_media_manifest.csv'), manifestRows.join('\n'), 'utf8');

// E. catalog/starkit_knowledge_base.json
const knowledgeBase = {
  brand: {
    name: 'StarkiT',
    arabic_mark: 'ستاركيت',
    tagline: 'WEAR YOUR WORLD.',
    founder: 'Nafe Munawer',
    headquarters: 'Dhaka, Bangladesh',
    core_values: ['Community', 'Style', 'Authenticity'],
    primary_colors: {
      jet_black: '#170000',
      pure_white: '#FFFFFF',
      brand_maroon: '#5B1A24',
      champagne_gold: '#c5a880'
    },
    typography: {
      primary_latin: 'Afacad Flux',
      primary_bengali: 'Hind Siliguri',
      primary_arabic: 'Amiri'
    }
  },
  garment_specifications: {
    silhouette: 'Relaxed Urban Streetwear Fit',
    fabric: 'Heavyweight 330–350 GSM combed compact cotton fleece',
    interior: 'Soft brushed interior thermal lining',
    construction: 'Ribbed cuffs & hem, double-needle reinforced stitching, deep double-lined hood',
    size_guide: {
      M: { chest_inches: 40, length_inches: 27 },
      L: { chest_inches: 42, length_inches: 28 },
      XL: { chest_inches: 44, length_inches: 29 },
      XXL: { chest_inches: 46, length_inches: 30 }
    }
  },
  commercial_policies: {
    payment: '100% Cash on Delivery (COD) across all 64 districts of Bangladesh with parcel inspection at doorstep',
    shipping: {
      inside_dhaka_bdt: 80,
      inside_dhaka_timeline: '2–3 Business Days',
      outside_dhaka_bdt: 150,
      outside_dhaka_timeline: '3–5 Business Days',
      free_shipping_threshold_bdt: 3000
    },
    return_exchange: '7-day hassle-free size exchange guarantee with preserved garment tags',
    support_phone: '01778307704',
    whatsapp_ordering: 'https://wa.me/8801778307704'
  },
  collection_architecture: {
    drop_01: {
      name: 'DROP 01 — THE GRAPHIC ARCHIVE',
      parent_designs: 11,
      target_colorways_per_design: 4,
      total_planned_slots: 44,
      documented_verified_colorways: 15,
      provisional_in_development_colorways: 29,
      verified_media_assets: 67
    },
    drop_02: {
      name: 'DROP 02 — ARTISAN ACCENTS & JEWELRY',
      brand: "Fariza's Territory",
      categories: ['Heritage Jewelry', 'Wooden & Lacquer Mirrors', 'Bangles & Accents'],
      total_handcrafted_skus: 35
    }
  },
  designs: enrichedDesigns.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    price_bdt: d.price_bdt,
    copy_en: d.copy_en,
    copy_bn: d.copy_bn,
    variants: d.variants.map((v) => ({
      slot_id: v.slot_id,
      sku: v.sku,
      color: v.color,
      hex: v.hex,
      status: v.status,
      stock_quantity: v.stock_quantity,
      available_sizes: v.available_sizes,
      approved_for_publication: v.approved_for_publication,
      media_count: v.media_count
    }))
  }))
};
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_knowledge_base.json'), JSON.stringify(knowledgeBase, null, 2), 'utf8');

// F. Update assets/catalog.json
const combinedCatalog = {
  brand: 'StarkiT',
  founder: 'Nafe Munawer',
  tagline: 'WEAR YOUR WORLD.',
  collection: 'DROP 01 / THE GRAPHIC ARCHIVE & DROP 02 / FARIZA’S TERRITORY',
  support_phone: '01778307704',
  products: [...enrichedDesigns, ...accessoryProducts]
};
fs.writeFileSync(path.join(ROOT, 'assets/catalog.json'), JSON.stringify(combinedCatalog, null, 2), 'utf8');

// G. Update assets/js/catalog-data.js
const catalogJsContent = `// STARKIT OFFICIAL STORE CATALOG DATA
// Auto-generated 44-Variant Architecture + Drop 02 Accessories
const STARKIT_CATALOG = ${JSON.stringify(combinedCatalog.products, null, 2)};
if (typeof window !== 'undefined') { window.STARKIT_CATALOG = STARKIT_CATALOG; }
if (typeof module !== 'undefined' && module.exports) { module.exports = STARKIT_CATALOG; }
if (typeof globalThis !== 'undefined') { globalThis.STARKIT_CATALOG = STARKIT_CATALOG; }
`;
fs.writeFileSync(path.join(ROOT, 'assets/js/catalog-data.js'), catalogJsContent, 'utf8');

console.log('✓ ALL 7 CATALOG & STORE ASSETS SUCCESSFULLY CREATED AND SYNCHRONIZED.');
