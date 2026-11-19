# StarkiT — Quality Assurance & Verification Report

**Testing Scope:** 11-Design / 15-SKU Drop 01 Hoodie Storefront, 4-Tier Pricing Engine, 22 HTML Storefront Pages, Full Meta Pixel Funnel + CAPI, Hardened Serverless & Runtime APIs (`api/orders.js` + `api/admin.js` + `runtime-store.js`), and Live HTTP Verification.

---

## Automated Unit, Security, DOM & Asset Suite (`npm test`)

- **`npm run check` (Syntax Validation):** Verifies zero syntax errors across `server.js`, `api/orders.js`, `api/admin.js`, `assets/js/app.js`, `assets/js/spatial-three.js`, `assets/js/motion-engine.js`, `assets/js/interactive-anime.js`, `assets/js/drive-sync.js`, `assets/js/core/*`, and `assets/js/modules/*`.
- **`tests/catalog-and-pricing.test.js` (`node:test`):**
  - Verifies `11` Drop 01 hoodies, `15` studio-documented variants, `0` provisional slots, `0` accessories, and `STK-H012` exclusion in `discrepancy_reconciliation`.
  - Validates `PRICE_TIERS` (`CORE` `৳1,099`, `SELECT` `৳1,250`, `SIGNATURE` `৳1,369`, `PREMIUM` `৳1,499`), 7-gate approval transitions, `isVariantPurchasable`, `calculateOrderPricing`, Bangladesh phone formats, and magic-byte upload validation.
- **`tests/api-security.test.js` (`node:test`):**
  - Verifies `api/orders.js` (`405` non-POST, `403` invalid origin, `503` fail-closed when `STARKIT_ORDERS_ENABLED !== 'true'`, `409` blocking unapproved/non-catalog SKUs, and `201` COD order placement).
  - Verifies `api/admin.js` (`public_storefront_state` returning 11 products / 15 variants with zero PII leakage, `401`/`503` unauthenticated blocks, `get_drive_config` key scoping, and 7-gate approval/promotion flows) plus checks that `firebase-applet-config.json` contains no hardcoded Google/Gemini API keys.
- **`verify_package.js`, `scripts/test_storefront_dom.cjs`, `scripts/test_customer_flow.cjs`, & `scripts/test_meta_pixel_and_orders.js`:**
  - Verified all **`22` HTML pages** (`index.html`, `shop.html`, `checkout.html`, `order-confirmation.html`, `admin.html`, 6 info pages, 11 hoodie PDPs) for valid relative links, `Afacad Flux` + `Hind Siliguri` fonts, consistent brand logos, Meta Pixel `1390081606323661`, `67` `.webp` studio images, and `13` camera reference `.jpg` assets.
