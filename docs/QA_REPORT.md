# StarkiT — Quality Assurance & Verification Report

**Testing Scope:** 15-Design / 60-Slot Drop 01 + 35-Item Drop 02 Catalog Architecture (`95` Total SKUs), 4-Tier Draft Pricing, 61 HTML Storefront Pages, Full Meta Pixel Funnel + CAPI, Hardened Serverless & Runtime APIs (`api/orders.js` + `api/admin.js` + `runtime-store.js`), and Live HTTP / UI Verification.

---

## 1. Automated Unit, Security, DOM & Asset Suite (`npm test`)

Executed cleanly (`npm test` -> exit code `0`):
- **`npm run check` (Syntax Validation):**
  - Verifies zero ES module / Node syntax errors across `server.js`, `api/orders.js`, `api/admin.js`, `assets/js/app.js`, `assets/js/spatial-three.js`, `assets/js/motion-engine.js`, `assets/js/interactive-anime.js`, `assets/js/drive-sync.js`, `assets/js/core/*`, and `assets/js/modules/*`.
- **`tests/catalog-and-pricing.test.js` (`node:test`):**
  - Verifies `15` Drop 01 hoodies, `60` total colorway slots (`15` documented / `45` provisional), `35` Drop 02 accessories, `STK-H012` exclusion in `discrepancy_reconciliation`.
  - Validates `PRICE_TIERS` (`CORE` `৳1,099`, `SELECT` `৳1,250`, `SIGNATURE` `৳1,369`, `PREMIUM` `৳1,499`), `canTransitionApproval`, `hasCompleteApprovalEvidence` (all 7 gates required), `isVariantPurchasable`, `calculateOrderPricing` (default inactive promo behavior + activated promo rules), Bangladesh phone formats (`01[3-9]...` / `+8801[3-9]...`), and magic-byte image validation (PNG/JPEG/WebP accepted; SVG rejected).
- **`tests/api-security.test.js` (`node:test`):**
  - Tests `api/orders.js`: `405` non-POST, `403` invalid origin, `503` fail-closed when `STARKIT_ORDERS_ENABLED !== 'true'`, `409` blocking `PROVISIONAL` SKUs (`STK-H013-BLK`), and live runtime COD order completion (`201`) once an SKU clears 7-Gate approval.
  - Tests `api/admin.js`: public non-PII `public_storefront_state` (`200`, zero PII leakage), `401`/`503` invalid/missing `X-Admin-Key`, `403` blocking direct `approved_for_publication: true` bypass in `update_stock`, and authenticated 7-gate `submit_approval_evidence` + `update_promotion` flows.
- **`tests/interactive-anime.test.js` (`node:test`):**
  - Validates `shouldReduceMotion`, `collectShowroomEntranceTargets`, and `animateShowroomHeroEntrance` reduced-motion cleanup.
- **`verify_package.js`, `scripts/test_storefront_dom.cjs`, `scripts/test_customer_flow.cjs`, `scripts/test_meta_pixel_and_orders.js`, & `scripts/sync_banners_and_branding.js`:**
  - Verified all **`61` HTML pages** (`index.html`, `shop.html`, `checkout.html`, `order-confirmation.html`, `admin.html`, 6 info pages, 15 hoodie PDPs, 35 Drop 02 PDPs) for valid relative links, Brand Book fonts (`Afacad Flux` + `Hind Siliguri`), consistent logos (`starkit-logo-dark.png`, `starkit-logo-transparent.png`, `starkit-favicon.png`), Meta Pixel `1390081606323661`, zero missing local files, `67` `.webp` + `35` accessory `.jpg` + `13` reference `.jpg` assets, and vendored libraries (`three`, `animejs`, `motion`, `firebase`).

---

## 2. Live Storefront, SEO, Admin Portal & Telemetry Verification

- **SEO & Metadata Audit:**
  - `sitemap.xml` includes all indexable storefront, policy, and 50 product detail routes (`checkout.html` & `order-confirmation.html` marked `noindex,follow`; `admin.html` marked `noindex,nofollow`).
  - Drop 02 accessories display approved retail `Price` metadata, category-filtered breadcrumb links, and clean gallery captions (no erroneous garment `Model Pending` badges).
- **Meta Pixel E-Commerce Funnel (`1390081606323661`):**
  - `PageView` across all 61 pages, `ViewContent` on PDP load (`product-viewer.js`), `AddToCart` on cart additions (`cart-drawer.js`), `InitiateCheckout` on checkout initialization (`checkout-form.js`), and deduplicated browser + server-side CAPI `Purchase` on order confirmation (`api/orders.js`).
- **Admin Portal & Hydration:**
  - `/admin.html` authenticates via `X-Admin-Key` or Supabase JWT, loads self-hosted Firebase Auth SDK (`assets/js/vendor/firebase-*.js`) plus manual Drive OAuth token flow, pre-populates 7-gate evidence checkboxes by `product_id`, allows editing promotion discounts in **Tiers & Offers**, and renders applied promo discounts on printable invoices.
  - Public storefront hydrates live settings, promotions, stock counts, and 7-gate approval status from `GET /api/admin?action=public_storefront_state`.
