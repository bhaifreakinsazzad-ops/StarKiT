import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PRICE_TIERS,
  canTransitionApproval,
  hasCompleteApprovalEvidence,
  isVariantPurchasable,
  validateCatalogArchitecture
} from '../assets/js/core/catalog-schema.js';
import {
  DEFAULT_PROMOTIONS,
  calculateOrderPricing
} from '../assets/js/core/pricing-engine.js';
import {
  detectImageSignature,
  formatBdt,
  isValidBdPhone,
  resolveAssetUrl,
  sanitizeCsvCell,
  validateOrderRequestBody
} from '../assets/js/core/validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('Catalog satisfies 11 Drop 01 hoodie / 15 studio colorway architecture with STK-H012 excluded', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/catalog.json'), 'utf8'));
  const masterHoodies = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/starkit_products.json'), 'utf8'));
  const result = validateCatalogArchitecture(catalog.products);
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(result.summary.hoodies, 11);
  assert.equal(result.summary.hoodieVariants, 15);
  assert.equal(result.summary.documentedVariants, 15);
  assert.equal(result.summary.provisionalVariants, 0);
  assert.equal(result.summary.accessories, 0);
  assert.equal(catalog.products.length, 11);
  assert.equal(masterHoodies.discrepancy_reconciliation?.html_extra_design_id, 'STK-H012');
  assert.equal(masterHoodies.discrepancy_reconciliation?.authoritative_catalog_inclusion, false);
});

test('Four-tier hoodie pricing schedule assigns exact BDT tiers', () => {
  assert.equal(PRICE_TIERS.CORE.price_bdt, 1099);
  assert.equal(PRICE_TIERS.SELECT.price_bdt, 1250);
  assert.equal(PRICE_TIERS.SIGNATURE.price_bdt, 1369);
  assert.equal(PRICE_TIERS.PREMIUM.price_bdt, 1499);
  assert.equal(formatBdt(1369), '৳1,369');
});

test('7-Gate approval evidence and workflow transitions enforce strict state machine', () => {
  assert.equal(canTransitionApproval('DRAFT', 'PUBLISHED'), false);
  assert.equal(canTransitionApproval('RIGHTS_REVIEW', 'READY_FOR_APPROVAL'), true);
  assert.equal(canTransitionApproval('READY_FOR_APPROVAL', 'APPROVED'), true);
  assert.equal(canTransitionApproval('APPROVED', 'PUBLISHED'), true);

  const incomplete = {
    artwork_rights_ok: true,
    garment_specs_ok: true,
    sample_photo_ok: true,
    size_run_ok: true,
    stock_count_ok: true,
    pricing_approved_ok: false,
    commercial_terms_ok: true
  };
  assert.equal(hasCompleteApprovalEvidence(incomplete), false);
  assert.equal(hasCompleteApprovalEvidence({ ...incomplete, pricing_approved_ok: true }), true);
});

test('Variant purchasability fails closed in preview mode or when gates are incomplete', () => {
  const docVariant = {
    sku: 'STK-H002-BLK',
    status: 'DOCUMENTED',
    approved_for_publication: false,
    stock_quantity: 10,
    available_sizes: ['M', 'L']
  };
  const draftProd = {
    id: 'STK-H002',
    publication_status: 'HOLD / NOT FOR PUBLIC SALES',
    rights_verified: false,
    stock_verified: false,
    specifications_verified: true,
    commercial_terms_verified: false,
    price_approved: false
  };
  assert.equal(isVariantPurchasable(draftProd, docVariant, { mode: 'public', cod_enabled: true }), false);

  const liveProd = {
    ...draftProd,
    publication_status: 'PUBLISHED',
    rights_verified: true,
    stock_verified: true,
    commercial_terms_verified: true,
    price_approved: true
  };
  const liveVariant = { ...docVariant, approved_for_publication: true };
  assert.equal(isVariantPurchasable(liveProd, liveVariant, { mode: 'preview', cod_enabled: false }), false);
  assert.equal(isVariantPurchasable(liveProd, liveVariant, { mode: 'public', cod_enabled: true }), true);
  assert.equal(isVariantPurchasable(liveVariant, liveProd, { mode: 'public', cod_enabled: true }), true);

  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/catalog.json'), 'utf8'));
  const hoodie = catalog.products.find((p) => p.id === 'STK-H008');
  assert.equal(hoodie.variants.length, 4);
  assert.equal(isVariantPurchasable(hoodie, hoodie.variants[0], { mode: 'public', cod_enabled: true }), true);
});

test('Pricing engine applies 0 unapproved bundle discount by default, and exact discount once activated', () => {
  const map = new Map([
    ['STK-H001-BLK', { product: { id: 'STK-H001', price_bdt: 1369 } }],
    ['STK-H004-MRN', { product: { id: 'STK-H004', price_bdt: 1499 } }]
  ]);

  const inactiveRes = calculateOrderPricing({
    items: [
      { sku: 'STK-H001-BLK', quantity: 1 },
      { sku: 'STK-H004-MRN', quantity: 1 }
    ],
    catalogMap: map,
    zone: 'dhaka',
    promotions: DEFAULT_PROMOTIONS
  });
  assert.equal(inactiveRes.subtotal_bdt, 2868);
  assert.equal(inactiveRes.discount_bdt, 0);
  assert.equal(inactiveRes.shipping_bdt, 80);
  assert.equal(inactiveRes.total_bdt, 2948);

  const activePromos = DEFAULT_PROMOTIONS.map((p) =>
    p.code === 'DUO_SELECTION'
      ? { ...p, active: true, requires_approval: false, discount_type: 'FIXED_BDT', discount_value: 200, free_shipping: true }
      : p
  );
  const activeRes = calculateOrderPricing({
    items: [
      { sku: 'STK-H001-BLK', quantity: 1 },
      { sku: 'STK-H004-MRN', quantity: 1 }
    ],
    catalogMap: map,
    zone: 'outside',
    promotions: activePromos
  });
  assert.equal(activeRes.discount_bdt, 200);
  assert.equal(activeRes.is_free_shipping, true);
  assert.equal(activeRes.shipping_bdt, 0);
  assert.equal(activeRes.total_bdt, 2668);
});

test('Validation guards enforce Bangladesh phones, order bodies, and image magic-byte signatures', () => {
  assert.equal(isValidBdPhone('01778307704'), true);
  assert.equal(isValidBdPhone('+8801778307704'), true);
  assert.equal(isValidBdPhone('01234567890'), false);

  const badBody = validateOrderRequestBody({
    customer: { name: 'A', phone: '1234', address: 'short', district: 'Dhaka', zone: 'dhaka' },
    items: []
  });
  assert.equal(badBody.ok, false);

  const goodBody = validateOrderRequestBody({
    customer: {
      name: 'Nafe Test',
      phone: '01778307704',
      address: 'House 14, Road 6, Banani, Dhaka',
      district: 'Dhaka',
      zone: 'dhaka'
    },
    items: [{ sku: 'STK-H001-BLK', size: 'L', quantity: 1 }]
  });
  assert.equal(goodBody.ok, true);

  assert.equal(detectImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))?.ext, 'png');
  assert.equal(detectImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.ext, 'jpg');
  assert.equal(detectImageSignature(Buffer.from('RIFFxxxxWEBP'))?.ext, 'webp');
  assert.equal(detectImageSignature(Buffer.from('<svg></svg>   ')), null);
});

test('Asset URL resolver & CSV sanitizer block XSS schemes and spreadsheet formula injection', () => {
  assert.equal(resolveAssetUrl('/assets/images/STK-H001-BLK__01_front.webp', './'), './assets/images/STK-H001-BLK__01_front.webp');
  assert.equal(resolveAssetUrl('assets/images/STK-H001-BLK__01_front.webp', '../'), '../assets/images/STK-H001-BLK__01_front.webp');
  assert.equal(resolveAssetUrl('https://cdn.example.com/media/hoodie.webp', './'), 'https://cdn.example.com/media/hoodie.webp');
  assert.equal(resolveAssetUrl('data:image/webp;base64,UklGRh4AAABXRUJQVlA4', './'), 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4');
  assert.equal(resolveAssetUrl('javascript:alert(1)', './'), '');
  assert.equal(resolveAssetUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', './'), '');

  assert.equal(sanitizeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`);
  assert.equal(sanitizeCsvCell('+8801778307704'), `"' +8801778307704"`.replace("' ", "'"));
  assert.equal(sanitizeCsvCell('-100'), `"'-100"`);
  assert.equal(sanitizeCsvCell('Tanvir "Test"\nLine2'), `"Tanvir ""Test"" Line2"`);
});

test('Pricing engine prefers variant price_bdt override and evaluates combinable promo stacks vs best single promo', () => {
  const map = new Map([
    [
      'STK-H001-BLK',
      {
        product: { id: 'STK-H001', price_bdt: 1369 },
        variant: { sku: 'STK-H001-BLK', price_bdt: 1450 }
      }
    ]
  ]);

  const combinablePromos = [
    {
      code: 'STACK_A',
      title: 'Stack A',
      tier_type: 'MULTI',
      min_qty: 2,
      applies_to: 'hoodies',
      discount_type: 'FIXED_BDT',
      discount_value: 100,
      free_shipping: false,
      combinable: true,
      active: true,
      requires_approval: false
    },
    {
      code: 'STACK_B',
      title: 'Stack B',
      tier_type: 'MULTI',
      min_qty: 2,
      applies_to: 'hoodies',
      discount_type: 'PERCENT',
      discount_value: 10,
      free_shipping: true,
      combinable: true,
      active: true,
      requires_approval: false
    },
    {
      code: 'SOLO_BEST',
      title: 'Solo Best',
      tier_type: 'MULTI',
      min_qty: 2,
      applies_to: 'hoodies',
      discount_type: 'FIXED_BDT',
      discount_value: 250,
      free_shipping: false,
      combinable: false,
      active: true,
      requires_approval: false
    }
  ];

  // Subtotal = 2 * 1450 = 2900. Stack A + B = 100 + 290 = 390 + free shipping > Solo Best (250)
  const stacked = calculateOrderPricing({
    items: [{ sku: 'STK-H001-BLK', quantity: 2 }],
    catalogMap: map,
    zone: 'outside',
    promotions: combinablePromos
  });
  assert.equal(stacked.subtotal_bdt, 2900);
  assert.equal(stacked.discount_bdt, 390);
  assert.equal(stacked.is_free_shipping, true);
  assert.equal(stacked.shipping_bdt, 0);
  assert.equal(stacked.total_bdt, 2510);
  assert.deepEqual(stacked.applied_promotions.map((p) => p.code), ['STACK_A', 'STACK_B']);
});
