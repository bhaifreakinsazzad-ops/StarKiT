# StarkiT — Quality Assurance & Verification Report

**Testing Scope:** 15-Design / 60-Slot Catalog Architecture, 4-Tier Draft Pricing, 61 HTML Storefront Pages, Serverless Security (`api/orders.js` + `api/admin.js`), and Headless Chromium UI/UX Verification.

---

## 1. Automated Unit, Security, DOM & Asset Suite (`npm test`)

Executed cleanly after implementation (`npm test` -> exit code `0`):
- **`tests/catalog-and-pricing.test.js` (`node:test`):**
  - Verifies `15` Drop 01 hoodies, `60` total colorway slots (`15` documented / `45` provisional), `35` Drop 02 accessories, `STK-H012` exclusion in `discrepancy_reconciliation`.
  - Validates `PRICE_TIERS` (`CORE` `৳1,099`, `SELECT` `৳1,250`, `SIGNATURE` `৳1,369`, `PREMIUM` `৳1,499`), `canTransitionApproval`, `hasCompleteApprovalEvidence` (all 7 gates required), `isVariantPurchasable`, `calculateOrderPricing` (default inactive promo behavior + activated promo rules), Bangladesh phone formats (`01[3-9]...` / `+8801[3-9]...`), and magic-byte image validation (PNG/JPEG/WebP accepted; SVG rejected).
- **`tests/api-security.test.js` (`node:test`):**
  - Tests `api/orders.js`: `405` non-POST, `403` invalid origin, `503` fail-closed when `STARKIT_ORDERS_ENABLED !== 'true'`, and `409` blocking `PROVISIONAL` SKUs (`STK-H013-BLK`).
  - Tests `api/admin.js`: `401`/`503` invalid/missing `X-Admin-Key`, `403` blocking direct `approved_for_publication: true` bypass in `update_stock`.
- **`verify_package.js` & DOM Integrity (`scripts/test_storefront_dom.cjs`):**
  - Verified all **`61` HTML pages** (`index.html`, `shop.html`, `checkout.html`, `admin.html`, 6 info pages, 15 hoodie PDPs, 35 Drop 02 PDPs) for relative links, Brand Book fonts (`Afacad Flux` + `Hind Siliguri`), `#170000` palette, Meta Pixel `1390081606323661`, zero missing local files, `67` `.webp` + `35` accessory `.jpg` + `13` reference `.jpg` assets.
  - Note: Runtime `.test.js` assertions test isolated serverless handlers and mocked configurations; live Supabase Postgres RPC persistence runs only when `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` are provisioned.

---

## 2. Headless Chromium (`playwright-cli`) Browser Verification

Verified live against `http://localhost:3000`:
- **Desktop (`1440×900`) — `/` Showroom & Catalog Archive:**
  - Three.js spatial wireframe canvas (`#spatialHeroContainer`), Virtual Wardrobe (`15` hoodie looks), central 4-tab stage (`Front`, `Back`, `Detail`, disabled `Model Shoot Pending`), active swatch border contrast, right purchase panel (`৳1,369` Signature Draft), Four-Tier pricing cards, Offer showcase cards, and 50-design catalog grid rendered with zero horizontal overflow and zero console JS errors.
  - Verified interactive switching to concept hoodie `STK-H013` (*Shadow Shinobi*, `.stage-provisional-slate`, `৳1,369`), switching to Cream (`STK-H001-CRM`) & `Back` tab (`./assets/images/STK-H001-CRM__02_back.webp`), Quick View modal open/close, Side-by-Side Compare tray & table open/close, and Tier filtering (`PREMIUM` -> `3 designs`, `All` -> `50 designs`).
- **Mobile (`390×844`) — PDPs, Shop, Checkout:**
  - Verified `/products/dhaka-afterglow.html` and `/products/shadow-shinobi.html`: `.sticky-mobile-bar` (`58px`), Fit Finder responsive single-column stack (`Size XXL` recommendation computed cleanly on `5'11"+` / `Broad`), zero horizontal overflow across PDPs, `/shop.html` (`50` cards), and `/checkout.html`.
- **Admin Portal (`/admin.html`):**
  - Verified Operations Portal gate blocks invalid credentials visibly (`Authentication failed. Verify your STARKIT_ADMIN_API_KEY or Supabase JWT permissions.`), keeps dashboard locked, and prints zero console JS errors.
