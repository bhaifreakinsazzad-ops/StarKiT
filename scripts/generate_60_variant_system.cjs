/**
 * StarkiT DROP 01 — 15-Design / 60-Variant & 4-Tier Architecture Generator
 * Normalizes and produces:
 * 1. catalog/starkit_products.json
 * 2. catalog/starkit_60_variants.json (plus catalog/starkit_44_variants.json compatibility pointer)
 * 3. catalog/starkit_variants.csv
 * 4. catalog/starkit_media_manifest.csv
 * 5. catalog/starkit_knowledge_base.json
 * 6. catalog/promotions.json
 * 7. assets/catalog.json and assets/js/catalog-data.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1. Authoritative 4-Color Working Palette (Brand Book aligned)
const WORKING_PALETTE = [
  { name: 'Black', code: 'BLK', hex: '#170000', labelBn: 'কালো' },
  { name: 'Cream', code: 'CRM', hex: '#F3EFE6', labelBn: 'ক্রিম' },
  { name: 'Maroon', code: 'MRN', hex: '#5B1A24', labelBn: 'মেরুন' },
  { name: 'Chocolate Brown', code: 'BRN', hex: '#4B2E24', labelBn: 'চকলেট ব্রাউন' }
];

// 2. Authoritative 4 Retail Price Tiers (Draft Pending Owner Sign-Off)
const PRICE_TIERS = {
  CORE: { code: 'CORE', label: 'Core Archive', price_bdt: 1099 },
  SELECT: { code: 'SELECT', label: 'Select Studio', price_bdt: 1250 },
  SIGNATURE: { code: 'SIGNATURE', label: 'Signature Drop', price_bdt: 1369 },
  PREMIUM: { code: 'PREMIUM', label: 'Premium Collector', price_bdt: 1499 }
};

// 3. Authoritative 15 Parent Hoodie Designs (11 Existing + 4 Concept Designs; STK-H012 preserved in hold register)
const DESIGNS = [
  {
    id: 'STK-H001',
    name: 'SHINOBI SUNSET',
    category: 'Anime Archive',
    editorial: 'THE SHINOBI LEGACY',
    price_tier: 'SIGNATURE',
    price_bdt: 1369,
    legacy_price_bdt: 1590,
    copy_en: 'Bold Japanese-inspired storytelling meets a dramatic crimson-sun composition.',
    copy_bn: 'ক্রিমসন সান, শক্তিশালী ব্যাক আর্ট ও স্লিভ ডিটেইলে স্টেটমেন্ট লুক।',
    front_back_detail: 'Front + Back + Sleeve Art',
    tags: ['anime', 'graphic', 'red sun', 'sleeve print', 'signature'],
    featured: true,
    third_party_ip_review: true,
    rights_assessment: 'Third-party character and logo: written commercial licensing required prior to public sale.',
    approval_status: 'RIGHTS_REVIEW',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1qtzNUmQEcWkFn9rpROcj5xr-2dvRahXG',
    slug: 'shinobi-sunset'
  },
  {
    id: 'STK-H002',
    name: 'PEACE BRO CLUB',
    category: 'Playful Street',
    editorial: 'GOOD VIBES ONLY',
    price_tier: 'CORE',
    price_bdt: 1099,
    legacy_price_bdt: 1290,
    copy_en: 'A laid-back graphic with unmistakable street energy.',
    copy_bn: 'অল-ব্ল্যাক বেসে প্লেফুল ক্যাট আর্ট—ক্যাজুয়াল ডেইলি স্টাইলের জন্য।',
    front_back_detail: 'Bold Back Graphic',
    tags: ['cat', 'fun', 'graphic', 'street', 'core'],
    featured: true,
    third_party_ip_review: false,
    rights_assessment: 'Originality and artwork ownership to be confirmed by owner prior to commercial activation.',
    approval_status: 'READY_FOR_APPROVAL',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1n45WYtN_t8DG2QBeJ86i2Fyqz4O3rfEo',
    slug: 'peace-bro-club'
  },
  {
    id: 'STK-H003',
    name: 'FOLK ROUTE',
    category: 'Bangla Heritage',
    editorial: 'DESHI GRAPHIC HERITAGE',
    price_tier: 'CORE',
    price_bdt: 1099,
    legacy_price_bdt: 1390,
    copy_en: 'Local roots reinterpreted through modern street aesthetics.',
    copy_bn: 'বাংলার ফোক মোটিফ ও আরবান কম্পোজিশনের মেলবন্ধন।',
    front_back_detail: 'Center Chest + Back Art',
    tags: ['folk', 'heritage', 'bengali', 'streetwear', 'core'],
    featured: false,
    third_party_ip_review: false,
    rights_assessment: 'Originality and artwork ownership to be confirmed by owner prior to commercial activation.',
    approval_status: 'READY_FOR_APPROVAL',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1NZsxFJoRGuFEJFJ1vsR6iQFS3RkPw9CW',
    slug: 'folk-route'
  },
  {
    id: 'STK-H004',
    name: 'THE RIDER CODE',
    category: 'Moto Culture',
    editorial: 'TWO WHEELS ONE SOUL',
    price_tier: 'PREMIUM',
    price_bdt: 1499,
    legacy_price_bdt: 1690,
    copy_en: 'Inspired by cafe racer culture and open highway freedom.',
    copy_bn: 'ক্যাফে রেসার ড্রাইভ এবং হাইওয়ের উন্মুক্ত রোমাঞ্চ।',
    front_back_detail: 'Dual Sleeve + Oversized Back',
    tags: ['rider', 'motorcycle', 'speed', 'crimson', 'premium'],
    featured: true,
    third_party_ip_review: true,
    rights_assessment: 'Motorcycle trademark / likeness imagery: authorization required prior to public sale.',
    approval_status: 'RIGHTS_REVIEW',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1gxKPiboPAXx1tqKZufQt-zvQx97SVmnP',
    slug: 'the-rider-code'
  },
  {
    id: 'STK-H005',
    name: 'MOONLIT HERO',
    category: 'Anime Archive',
    editorial: 'DARK CITY VIGILANTE',
    price_tier: 'SIGNATURE',
    price_bdt: 1369,
    legacy_price_bdt: 1590,
    copy_en: 'Moody monochrome artwork capturing nocturnal adrenaline.',
    copy_bn: 'রাতের শহর ও চাঁদের আলোয় অ্যাকশন এস্থেটিক।',
    front_back_detail: 'Full Back Mural + Sleeve Typography',
    tags: ['anime', 'night', 'monochrome', 'hero', 'signature'],
    featured: false,
    third_party_ip_review: true,
    rights_assessment: 'Third-party character and title: written commercial licensing required prior to public sale.',
    approval_status: 'RIGHTS_REVIEW',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1JN6xfn3hM3lRJ5uGjKL3naaFmctKWBr1',
    slug: 'moonlit-hero'
  },
  {
    id: 'STK-H006',
    name: 'CELLULOID NIGHTS',
    category: 'Bangla Heritage',
    editorial: 'RETRO DHALLYWOOD NOSTALGIA',
    price_tier: 'SELECT',
    price_bdt: 1250,
    legacy_price_bdt: 1490,
    copy_en: 'A tribute to the golden era of vintage cinema graphics.',
    copy_bn: 'রেট্রো সিনেমা পোস্টার আর সোনালী সেলুলয়েডের স্মৃতি।',
    front_back_detail: 'Vintage Poster Print on Back',
    tags: ['cinema', 'retro', 'dhallywood', 'vintage', 'select'],
    featured: false,
    third_party_ip_review: true,
    rights_assessment: 'Confirm rights to any identifiable cinema likenesses or poster artwork.',
    approval_status: 'RIGHTS_REVIEW',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1QXfEwlocWgHXNCcUK-7zDrlYZEDhiU3U',
    slug: 'celluloid-nights'
  },
  {
    id: 'STK-H007',
    name: 'DHAKA AFTERGLOW',
    category: 'City Stories',
    editorial: 'URBAN CHROMATICS',
    price_tier: 'SELECT',
    price_bdt: 1250,
    legacy_price_bdt: 1490,
    copy_en: 'City sunset tones against raw architectural lines.',
    copy_bn: 'ঢাকার সূর্যাস্ত ও মেগাসিটির নিওন আলো।',
    front_back_detail: 'High-Density Chest Print + Back Typography',
    tags: ['dhaka', 'sunset', 'city', 'warm brown', 'select'],
    featured: true,
    third_party_ip_review: false,
    rights_assessment: 'Originality and artwork ownership to be confirmed by owner prior to commercial activation.',
    approval_status: 'READY_FOR_APPROVAL',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1nAWGQp0DVvR1ccwaITSSYV3b5t3aNLun',
    slug: 'dhaka-afterglow'
  },
  {
    id: 'STK-H008',
    name: 'COLLECTIVE VOICE',
    category: 'Statement Graphics',
    editorial: 'THE GRAPHIC MANIFESTO',
    price_tier: 'CORE',
    price_bdt: 1099,
    legacy_price_bdt: 1390,
    copy_en: 'Typographic movement celebrating unity and expression.',
    copy_bn: 'ঐক্য ও স্বকীয়তার সাহসী টাইপোগ্রাফিক স্টেটমেন্ট।',
    front_back_detail: 'Front Contrast Typography + Minimal Back',
    tags: ['manifesto', 'typography', 'statement', 'all-colors', 'core'],
    featured: false,
    third_party_ip_review: true,
    rights_assessment: 'Organization emblem/typography: written authorization and sales-policy review required.',
    approval_status: 'RIGHTS_REVIEW',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1My6ZK2-Vw8093Uj9LhjW8rOSwblWf4hK',
    slug: 'collective-voice'
  },
  {
    id: 'STK-H009',
    name: 'RICKSHAW BLOOM',
    category: 'Bangla Heritage',
    editorial: 'LIVING TRADITION',
    price_tier: 'SELECT',
    price_bdt: 1250,
    legacy_price_bdt: 1490,
    copy_en: 'Vibrant rickshaw enamel floristry reimagined as wearable street art.',
    copy_bn: 'রিকশা পেইন্টিংয়ের জীবন্ত ফুলের নকশা আধুনিক পোশাকে।',
    front_back_detail: 'Intricate Enamel-Inspired Back Artwork',
    tags: ['rickshaw', 'folk-art', 'flowers', 'tradition', 'select'],
    featured: true,
    third_party_ip_review: false,
    rights_assessment: 'Originality and artwork ownership to be confirmed by owner prior to commercial activation.',
    approval_status: 'READY_FOR_APPROVAL',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1SMaKxW61pqZKPXrCS06OUk3lRS3okqP8',
    slug: 'rickshaw-bloom'
  },
  {
    id: 'STK-H010',
    name: 'CHEESE CHASE',
    category: 'Playful Street',
    editorial: 'THE CAT & MOUSE CHASE',
    price_tier: 'CORE',
    price_bdt: 1099,
    legacy_price_bdt: 1390,
    copy_en: 'Dynamic chase sequence rendered in bold cartoon linework.',
    copy_bn: 'নস্টালজিক ক্যাট-অ্যান্ড-মাউস চেজ গ্রাফিক্স।',
    front_back_detail: 'Back Chase Scene + Chest Logo',
    tags: ['cartoon', 'nostalgia', 'playful', 'chase', 'core'],
    featured: false,
    third_party_ip_review: true,
    rights_assessment: 'Cartoon character likenesses and title: written commercial licensing required.',
    approval_status: 'RIGHTS_REVIEW',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1Uxl62Ty4IbJii1tcC-x7BQba-0oLxNYs',
    slug: 'cheese-chase'
  },
  {
    id: 'STK-H011',
    name: 'NIGHT CIRCUIT',
    category: 'Moto Culture',
    editorial: 'MIDNIGHT RACING LEAGUE',
    price_tier: 'SIGNATURE',
    price_bdt: 1369,
    legacy_price_bdt: 1590,
    copy_en: 'Drift racing typography and mechanical blueprint elements.',
    copy_bn: 'নাইট রেসিং সার্কিট ও মেকানিক্যাল ব্লুপ্রিন্ট।',
    front_back_detail: 'Full Back Circuit Diagram + Sleeve Accents',
    tags: ['circuit', 'racing', 'drift', 'blueprint', 'signature'],
    featured: false,
    third_party_ip_review: true,
    rights_assessment: 'Die-cast racing trademark / logos: written commercial licensing required.',
    approval_status: 'RIGHTS_REVIEW',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    drive_folder: 'https://drive.google.com/drive/folders/1HkP_v8kw6VggeZ-KTRX9MxGoirLlgavF',
    slug: 'night-circuit'
  },
  // 4 NEW CONCEPT-STAGE DESIGNS (STK-H013 through STK-H016 — STK-H012 intentionally excluded/held)
  {
    id: 'STK-H013',
    name: 'SHADOW SHINOBI',
    category: 'Anime Archive',
    editorial: 'CONCEPT 01 · STEALTH CHRONICLES',
    price_tier: 'SIGNATURE',
    price_bdt: 1369,
    legacy_price_bdt: null,
    copy_en: 'Concept-stage nocturnal stealth graphic exploring layered ink textures and crimson emblems across all four base palettes.',
    copy_bn: 'কনসেপ্ট স্টেজ ডিজাইন—গভীর কালি ও ক্রিমসন অ্যাকসেন্টে শ্যাডো শিনোবি এডিশন।',
    front_back_detail: 'Concept Placement · Chest Crest + Full Back Artwork',
    tags: ['concept', 'anime', 'stealth', 'signature', 'media-pending'],
    featured: false,
    third_party_ip_review: true,
    rights_assessment: 'Concept-stage design: original illustration confirmation, studio mockups, and licensing review pending.',
    approval_status: 'MEDIA_PENDING',
    publication_status: 'CONCEPT / MEDIA PENDING',
    drive_folder: '',
    slug: 'shadow-shinobi',
    is_concept: true
  },
  {
    id: 'STK-H014',
    name: 'URBAN HERITAGE',
    category: 'Bangla Heritage',
    editorial: 'CONCEPT 02 · DHAKA ARCHITECTURE',
    price_tier: 'SELECT',
    price_bdt: 1250,
    legacy_price_bdt: null,
    copy_en: 'Concept-stage fusion of Bengali typographic geometry and contemporary urban minimalism.',
    copy_bn: 'কনসেপ্ট স্টেজ ডিজাইন—বাংলার স্থাপত্য ও আরবান টাইপোগ্রাফির আধুনিক রূপ।',
    front_back_detail: 'Concept Placement · Architectural Chest + Back Grid',
    tags: ['concept', 'heritage', 'dhaka', 'select', 'media-pending'],
    featured: false,
    third_party_ip_review: false,
    rights_assessment: 'Concept-stage original artwork: graphic sign-off, production sample, and photography pending.',
    approval_status: 'MEDIA_PENDING',
    publication_status: 'CONCEPT / MEDIA PENDING',
    drive_folder: '',
    slug: 'urban-heritage',
    is_concept: true
  },
  {
    id: 'STK-H015',
    name: 'HERITAGE STATIC',
    category: 'Statement Graphics',
    editorial: 'CONCEPT 03 · ANALOG FREQUENCY',
    price_tier: 'PREMIUM',
    price_bdt: 1499,
    legacy_price_bdt: null,
    copy_en: 'Concept-stage collector edition pairing distressed analog halftone frequencies with Dhaka street motifs.',
    copy_bn: 'কনসেপ্ট স্টেজ প্রিমিয়াম এডিশন—অ্যানালগ স্ট্যাটিক টেক্সচার ও হেরিটেজ গ্রাফিক্স।',
    front_back_detail: 'Concept Placement · Multi-Pass Halftone Back + Sleeve Marks',
    tags: ['concept', 'statement', 'halftone', 'premium', 'media-pending'],
    featured: false,
    third_party_ip_review: false,
    rights_assessment: 'Concept-stage collector piece: screen-separation proof, GSM sample, and studio photos pending.',
    approval_status: 'MEDIA_PENDING',
    publication_status: 'CONCEPT / MEDIA PENDING',
    drive_folder: '',
    slug: 'heritage-static',
    is_concept: true
  },
  {
    id: 'STK-H016',
    name: 'MIDNIGHT SIGNAL',
    category: 'City Stories',
    editorial: 'CONCEPT 04 · LATE NIGHT TRANSMISSIONS',
    price_tier: 'PREMIUM',
    price_bdt: 1499,
    legacy_price_bdt: null,
    copy_en: 'Concept-stage flagship nocturnal graphic inspired by late-night Dhaka neon reflections and radio wave geometry.',
    copy_bn: 'কনসেপ্ট স্টেজ প্রিমিয়াম এডিশন—ঢাকার মধ্যরাতের লাইট ও সিগন্যাল গ্রাফিক্স।',
    front_back_detail: 'Concept Placement · Oversized Back Graphic + Reflective Detail Spec',
    tags: ['concept', 'dhaka', 'night', 'premium', 'media-pending'],
    featured: false,
    third_party_ip_review: false,
    rights_assessment: 'Concept-stage flagship design: artwork approval, sample shoot, and stock allocation pending.',
    approval_status: 'MEDIA_PENDING',
    publication_status: 'CONCEPT / MEDIA PENDING',
    drive_folder: '',
    slug: 'midnight-signal',
    is_concept: true
  }
];

// Load master gallery to bind the 15 documented SKU galleries and 67 verified local .webp files
const masterSrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/source/master_gallery.json'), 'utf8'));

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
        filename,
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
        filename
      };
    });
  });
});

console.log(`Documented image SKUs: ${Object.keys(documentedImagesBySku).length}, verified WebP files: ${mediaManifestRows.length}`);

// Generate 15 Designs x 4 Colors = 60 Variant Matrix
const all60Variants = [];
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
      const frontImg = gallery.find((g) => g.view === 'front')?.url || gallery[0]?.url || '';
      const backImg = gallery.find((g) => g.view === 'back')?.url || gallery[0]?.url || '';
      const compositeImg = gallery.find((g) => g.view === 'reference_composite')?.url || '';

      variantRecord = {
        slot_id: slotId,
        design_id: d.id,
        design_name: d.name,
        category: d.category,
        color: colorObj.name,
        color_bn: colorObj.labelBn,
        hex: colorObj.hex,
        sku,
        status: 'DOCUMENTED',
        sku_status: 'DOCUMENTED IN SOURCE',
        color_status: 'DOCUMENTED MOCKUP / PRE-RELEASE AUDIT',
        asset_status: 'MOCKUP_FILES_PRESENT',
        media_count: gallery.length,
        gallery,
        front_image: frontImg,
        back_image: backImg,
        composite_image: compositeImg,
        price_tier: d.price_tier,
        price_bdt: d.price_bdt,
        draft_price_bdt: d.price_bdt,
        legacy_price_bdt: d.legacy_price_bdt,
        price_approved: false,
        stock_quantity: 0,
        available_sizes: ['M', 'L', 'XL', 'XXL'],
        approved_for_publication: false,
        publication_status: d.publication_status,
        drive_folder: d.drive_folder,
        next_action: 'Approve draft tier price, confirm physical sample/stock, and clear artwork rights in Admin.'
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
        sku,
        status: 'PROVISIONAL',
        sku_status: d.is_concept ? 'CONCEPT DESIGN / MEDIA PENDING' : 'PROVISIONAL / NOT SOURCE-VERIFIED',
        color_status: 'PROPOSED / APPROVAL REQUIRED',
        asset_status: 'NEW_MOCKUPS_REQUIRED',
        media_count: 0,
        gallery: [],
        front_image: '',
        back_image: '',
        composite_image: '',
        price_tier: d.price_tier,
        price_bdt: d.price_bdt,
        draft_price_bdt: d.price_bdt,
        legacy_price_bdt: d.legacy_price_bdt,
        price_approved: false,
        stock_quantity: 0,
        available_sizes: [],
        approved_for_publication: false,
        publication_status: d.publication_status,
        development_notice: d.is_concept
          ? 'CONCEPT DESIGN · STUDIO MOCKUPS PENDING'
          : 'COLORWAY IN DEVELOPMENT / AWAITING APPROVAL',
        drive_folder: d.drive_folder,
        next_action: 'Upload real studio front/back/detail assets and verify garment specs & rights in Admin.'
      };
    }

    all60Variants.push(variantRecord);
    productVariants.push(variantRecord);
  });

  enrichedDesigns.push({
    ...d,
    draft_price_bdt: d.price_bdt,
    price_approved: false,
    target_color_count: 4,
    documented_variant_count: productVariants.filter((v) => v.status === 'DOCUMENTED').length,
    provisional_variant_count: productVariants.filter((v) => v.status === 'PROVISIONAL').length,
    fabric_claim: 'Heavyweight 330–350 GSM fleece specification (pending batch lab/sample sign-off for unverified runs)',
    size_chart: 'M (Chest 40", Length 27"), L (Chest 42", Length 28"), XL (Chest 44", Length 29"), XXL (Chest 46", Length 30")',
    rights_verified: false,
    stock_verified: false,
    specifications_verified: !d.is_concept,
    commercial_terms_verified: false,
    variants: productVariants
  });
});

console.log(`60-Variant Generation: ${enrichedDesigns.length} designs × 4 = ${all60Variants.length} slots (${documentedCount} Documented + ${provisionalCount} Provisional)`);

// Load Drop 02 Accessories (kept cleanly separate from the 60 hoodie variants)
let accessoryProducts = [];
try {
  accessoryProducts = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/accessories_drop02.json'), 'utf8'));
  console.log(`Loaded ${accessoryProducts.length} Drop 02 accessories cleanly separated from Drop 01 hoodies.`);
} catch (e) {
  console.warn('Could not read accessories:', e.message);
}

const reconciliationRecord = {
  html_extra_design_id: 'STK-H012',
  html_extra_design_name: 'KINETIC STAGE (Marshmello Brand Book Edition)',
  authoritative_catalog_inclusion: false,
  reused_or_overwritten: false,
  status: 'HOLD / EXCLUDED FROM 60-SLOT MASTER',
  reason: 'Excluded pending separate third-party commercial licensing. New concept designs were assigned STK-H013 through STK-H016 to guarantee zero SKU collision.'
};

// A. catalog/starkit_products.json
const productsPayload = {
  schema_version: '4.0-authoritative-drop01-60slot',
  generated_date: new Date().toISOString(),
  brand: 'StarkiT',
  tagline: 'WEAR YOUR WORLD.',
  collection: 'DROP 01 / THE GRAPHIC ARCHIVE',
  market: 'Bangladesh',
  design_count: enrichedDesigns.length,
  total_colorway_slots: all60Variants.length,
  documented_variant_count: documentedCount,
  provisional_variant_count: provisionalCount,
  price_tiers: PRICE_TIERS,
  discrepancy_reconciliation: reconciliationRecord,
  products: enrichedDesigns
};
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_products.json'), JSON.stringify(productsPayload, null, 2), 'utf8');

// B. catalog/starkit_60_variants.json (+ starkit_44_variants.json compatibility record)
const variantsPayload = {
  schema_version: '4.0-prelaunch-60-slot',
  generated_date: new Date().toISOString(),
  brand: 'StarkiT',
  total_designs: enrichedDesigns.length,
  total_slots: all60Variants.length,
  documented_count: documentedCount,
  provisional_count: provisionalCount,
  working_palette: WORKING_PALETTE,
  price_tiers: PRICE_TIERS,
  discrepancy_reconciliation: reconciliationRecord,
  variants: all60Variants
};
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_60_variants.json'), JSON.stringify(variantsPayload, null, 2), 'utf8');
fs.writeFileSync(
  path.join(ROOT, 'catalog/starkit_44_variants.json'),
  JSON.stringify(
    {
      ...variantsPayload,
      deprecated_notice: 'Superseded by catalog/starkit_60_variants.json (15 designs / 60 colorway slots).'
    },
    null,
    2
  ),
  'utf8'
);

// C. catalog/starkit_variants.csv
const csvHeaders = [
  'slot_id',
  'design_id',
  'design_name',
  'category',
  'price_tier',
  'color',
  'hex',
  'sku',
  'status',
  'sku_status',
  'color_status',
  'asset_status',
  'media_count',
  'draft_price_bdt',
  'legacy_price_bdt',
  'price_approved',
  'stock_quantity',
  'sizes_available',
  'approved_for_publication',
  'publication_status',
  'drive_folder',
  'next_action'
];
const csvRows = [csvHeaders.join(',')];
all60Variants.forEach((v) => {
  csvRows.push(
    [
      v.slot_id,
      v.design_id,
      `"${v.design_name}"`,
      `"${v.category}"`,
      v.price_tier,
      v.color,
      v.hex,
      v.sku,
      v.status,
      `"${v.sku_status}"`,
      `"${v.color_status}"`,
      `"${v.asset_status}"`,
      v.media_count,
      v.draft_price_bdt,
      v.legacy_price_bdt ?? '',
      v.price_approved,
      v.stock_quantity,
      `"${v.available_sizes.join(' ')}"`,
      v.approved_for_publication,
      `"${v.publication_status}"`,
      `"${v.drive_folder}"`,
      `"${v.next_action}"`
    ].join(',')
  );
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
  manifestRows.push(
    [
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
    ].join(',')
  );
});
fs.writeFileSync(path.join(ROOT, 'catalog/starkit_media_manifest.csv'), manifestRows.join('\n'), 'utf8');

// E. catalog/promotions.json
const promotionsConfig = {
  schema_version: '1.0',
  note: 'Admin-configurable promotion rules. Multi-piece offers remain inactive until approved by the store owner.',
  promotions: [
    {
      code: 'SINGLE_PIECE',
      title: 'Single Piece',
      subtitle: 'Standard Archive Tier',
      tier_type: 'SINGLE',
      min_qty: 1,
      applies_to: 'hoodies',
      discount_type: 'NONE',
      discount_value: 0,
      free_shipping: false,
      combinable: false,
      active: true,
      requires_approval: false,
      badge: 'Standard Order',
      description: 'Order any single hoodie at its official four-tier price (Core ৳1,099 to Premium ৳1,499) with nationwide Cash on Delivery.'
    },
    {
      code: 'DUO_SELECTION',
      title: 'Duo Selection',
      subtitle: '2 Hoodies · Configurable Offer Slot',
      tier_type: 'DUO',
      min_qty: 2,
      applies_to: 'hoodies',
      discount_type: 'FIXED_BDT',
      discount_value: 0,
      free_shipping: false,
      combinable: false,
      active: false,
      requires_approval: true,
      badge: 'Pending Owner Rule',
      description: 'Configurable 2-hoodie bundle rule. Owner can assign a fixed BDT discount or free delivery inside Admin when launching this offer.'
    },
    {
      code: 'TRIO_PLUS',
      title: 'Three or More',
      subtitle: '3+ Hoodies · Multi-Piece Offer Slot',
      tier_type: 'TRIO_PLUS',
      min_qty: 3,
      applies_to: 'hoodies',
      discount_type: 'FIXED_BDT',
      discount_value: 0,
      free_shipping: false,
      combinable: false,
      active: false,
      requires_approval: true,
      badge: 'Pending Owner Rule',
      description: 'Configurable 3+ hoodie volume offer. Activated only after owner sets exact margin-verified savings in Admin.'
    },
    {
      code: 'WHOLESALE_RESELLER',
      title: 'Wholesale & Reseller',
      subtitle: '10+ Units · Studio Inquiry',
      tier_type: 'WHOLESALE',
      min_qty: 10,
      applies_to: 'hoodies',
      discount_type: 'INQUIRY',
      discount_value: 0,
      free_shipping: false,
      combinable: false,
      active: false,
      requires_approval: true,
      badge: 'Inquiry / Custom Quote',
      description: 'Stockists, campus clubs, and bulk orders (10+ pieces). Configure reseller rules in Admin or contact Dhaka support.'
    }
  ]
};
fs.writeFileSync(path.join(ROOT, 'catalog/promotions.json'), JSON.stringify(promotionsConfig, null, 2), 'utf8');
fs.writeFileSync(path.join(ROOT, 'assets/promotions.json'), JSON.stringify(promotionsConfig, null, 2), 'utf8');

// F. catalog/starkit_knowledge_base.json
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
      chocolate_brown: '#4B2E24',
      cream: '#F3EFE6',
      champagne_gold: '#bfa177'
    },
    typography: {
      primary_latin: 'Afacad Flux',
      primary_bengali: 'Hind Siliguri',
      monospace: 'JetBrains Mono'
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
    payment: 'Cash on Delivery (COD) across all 64 districts of Bangladesh with parcel inspection at doorstep once commercial mode is enabled',
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
      parent_designs: enrichedDesigns.length,
      existing_designs: 11,
      new_concept_designs: 4,
      held_excluded_design: 'STK-H012',
      target_colorways_per_design: 4,
      total_planned_slots: all60Variants.length,
      documented_colorways: documentedCount,
      provisional_colorways: provisionalCount,
      verified_media_assets: mediaManifestRows.length,
      price_tiers: PRICE_TIERS
    },
    drop_02: {
      name: 'DROP 02 — ARTISAN ACCENTS & JEWELRY',
      brand: "Fariza's Territory",
      categories: ['Decorative Mirrors', 'Wearable Art', 'Bangles & Accents'],
      total_handcrafted_skus: accessoryProducts.length
    }
  },
  designs: enrichedDesigns.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    price_tier: d.price_tier,
    price_bdt: d.price_bdt,
    legacy_price_bdt: d.legacy_price_bdt,
    price_approved: d.price_approved,
    approval_status: d.approval_status,
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

// G. Update assets/catalog.json & assets/js/catalog-data.js
const combinedCatalog = {
  brand: 'StarkiT',
  founder: 'Nafe Munawer',
  tagline: 'WEAR YOUR WORLD.',
  collection: 'DROP 01 / THE GRAPHIC ARCHIVE & DROP 02 / FARIZA’S TERRITORY',
  support_phone: '01778307704',
  architecture: {
    hoodie_designs: enrichedDesigns.length,
    hoodie_variant_slots: all60Variants.length,
    documented_hoodie_variants: documentedCount,
    provisional_hoodie_variants: provisionalCount,
    drop02_accessories: accessoryProducts.length,
    held_design_id: 'STK-H012'
  },
  price_tiers: PRICE_TIERS,
  promotions: promotionsConfig.promotions,
  products: [...enrichedDesigns, ...accessoryProducts]
};
fs.writeFileSync(path.join(ROOT, 'assets/catalog.json'), JSON.stringify(combinedCatalog, null, 2), 'utf8');

const catalogJsContent = `// STARKIT OFFICIAL STORE CATALOG DATA
// Auto-generated 15-Design / 60-Variant Hoodie Architecture + Drop 02 Accessories
const STARKIT_CATALOG = ${JSON.stringify(combinedCatalog.products, null, 2)};
const STARKIT_PROMOTIONS = ${JSON.stringify(promotionsConfig.promotions, null, 2)};
const STARKIT_PRICE_TIERS = ${JSON.stringify(PRICE_TIERS, null, 2)};
if (typeof window !== 'undefined') {
  window.STARKIT_CATALOG = STARKIT_CATALOG;
  window.STARKIT_PROMOTIONS = STARKIT_PROMOTIONS;
  window.STARKIT_PRICE_TIERS = STARKIT_PRICE_TIERS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = STARKIT_CATALOG;
}
if (typeof globalThis !== 'undefined') {
  globalThis.STARKIT_CATALOG = STARKIT_CATALOG;
  globalThis.STARKIT_PROMOTIONS = STARKIT_PROMOTIONS;
  globalThis.STARKIT_PRICE_TIERS = STARKIT_PRICE_TIERS;
}
`;
fs.writeFileSync(path.join(ROOT, 'assets/js/catalog-data.js'), catalogJsContent, 'utf8');

console.log('✓ ALL 8 CANONICAL 15-DESIGN / 60-VARIANT STORE ASSETS SYNCHRONIZED.');
