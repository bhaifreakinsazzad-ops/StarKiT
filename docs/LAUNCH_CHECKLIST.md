# StarkiT — Client Handover & Launch Checklist
## DROP 01 Hoodie Storefront (`11` Designs / `15` Studio-Verified SKUs)

---

### 1. Client Handover Baseline (Completed)
- **Focused Product Scope:** Storefront contains strictly the **`11` real Drop 01 hoodie designs** and their **`15` studio-verified colorway SKUs** (`67` `.webp` studio images) across **`22` generated HTML pages**.
- **Zero Placeholder/Non-Hoodie Clutter:** All provisional empty colorway slots, concept placeholders, and Drop 02 accessory listings have been cleanly removed from HTML, JSON, JS, SQL seeds, `/public/`, and tests.
- **Public Checkout Ready:** `store-config.js` is configured for public Cash on Delivery (`৳80` Inside Dhaka, `৳150` Outside Dhaka, Free Delivery over `৳3,000`).

---

### 2. Pre-Launch Verification & Operations Checklist

#### A. Architecture & Storefront
- [x] Official StarkiT wordmark (`ستاركيت` / `STARKIT`), `#170000` palette, `Afacad Flux` + `Hind Siliguri` + `JetBrains Mono` applied across all **22 HTML pages**.
- [x] `11` hoodie designs across `15` documented colorway SKUs backed by `67` verified `.webp` studio assets.
- [x] `STK-H012` excluded cleanly from Drop 01 master and recorded in `discrepancy_reconciliation`.
- [x] Meta Pixel `1390081606323661` funnel (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) + server-side CAPI deduplication installed.
- [x] Storefront live hydration (`GET /api/admin?action=public_storefront_state`) syncs settings, promotions, approvals, and stock counts cleanly.

#### B. Deployment & Environment Variables (Vercel / Node + Supabase)
- [ ] Run Supabase migrations in SQL Editor: `001_starkit_store.sql` → `002_catalog_seed.sql` → `003_admin_views_and_helpers.sql` → `005_security_and_60_variant_upgrade.sql`.
- [ ] Create Supabase Storage bucket `starkit-media`.
- [ ] Set production environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, 32+ char `STARKIT_ADMIN_API_KEY`, `STARKIT_ORDERS_ENABLED=true`, `STARKIT_PUBLIC_URL`, and optionally `META_ACCESS_TOKEN`.
- [ ] Log into `/admin.html`, review opening stock counts & multi-piece offers in **Tiers & Offers**, and place one end-to-end test Cash on Delivery order.
