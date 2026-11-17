# StarkiT — Technical Audit & Architecture Migration Report

**Brand:** StarkiT (`ستاركيت`) · `WEAR YOUR WORLD.`  
**Market:** Bangladesh (Dhaka Metropolitan + 64 Districts Cash on Delivery)  
**Scope:** Upgrade from 11-design / 44-variant legacy baseline to 15-design / 60-variant Drop 01 + 35-item Drop 02, 4-tier pricing framework, interactive spatial showroom, full-stack security hardening, and operational handover.

---

## 1. Before vs. After Architecture Summary

| Dimension | Prior Baseline (`44-Variant`) | Current Production Architecture (`60-Variant + Drop 02`) |
|---|---|---|
| **Drop 01 Hoodie Designs** | 11 designs (`STK-H001`–`STK-H011`) | **15 designs** (`STK-H001`–`STK-H011` + `STK-H013`–`STK-H016`) |
| **Drop 01 Colorway Matrix** | 44 planned slots (15 ready / 29 pending) | **60 planned slots** (`15 DOCUMENTED` / `45 PROVISIONAL` media-pending) |
| **Excluded IP Hold** | `STK-H012` undocumented in HTML | Explicitly cataloged in `discrepancy_reconciliation` & UI (`HOLD / EXCLUDED`) |
| **Drop 02 Accessories** | 35 Fariza's Territory SKUs | **35 Fariza's Territory SKUs** unified in master catalog & 35 PDPs |
| **Total HTML Pages** | 56 pages | **61 modular HTML pages** (`index`, `shop`, `checkout`, `admin`, 6 info pages, 50 PDPs) |
| **Pricing Architecture** | Flat legacy per-design prices (৳1,290–৳1,690) | **4 Draft Retail Tiers**: Core `৳1,099`, Select `৳1,250`, Signature `৳1,369`, Premium `৳1,499` |
| **Multi-Piece Offers** | Unconfigured static labels | **Admin-configurable promotion engine** (`SINGLE_PIECE` active; `DUO_SELECTION`, `TRIO_PLUS`, `WHOLESALE_RESELLER` draft/inactive until owner rule approval) |
| **Interactive Hero** | Static grid / experimental single file | **Three.js Spatial Showroom + Virtual Wardrobe (15 looks) + 4-view stage + Live Swatches + Right Purchase Panel** |
| **Frontend Architecture** | Monolithic script patterns | Modular ES Modules (`assets/js/core/*` + `assets/js/modules/*`) sharing pure logic with backend/tests |
| **Checkout & Commercial Gate** | Open local demo / unhardened flags | Fail-closed (`STARKIT_ORDERS_ENABLED=false`, `mode: 'preview'`, `cod_enabled: false`), server-side price & promo computation, SKU approval gate |
| **Admin Authentication** | Simple key prompt | **Dual Auth**: `X-Admin-Key` (timing-safe SHA-256 compare, min 32 chars) OR **Supabase Auth JWT + `store_admin_users` RBAC** (`owner`, `admin`, `merchandiser`, `viewer`), memory-only headers (zero `localStorage`) |
| **7-Gate Approval Workflow** | Manual boolean flag | Evidence-backed `submit_approval_evidence` enforcing all 7 verification gates (`artwork_rights`, `garment_specs`, `sample_photo`, `size_run`, `stock_count`, `pricing_approved`, `commercial_terms`) and immutable `store_audit_logs` |

---

## 2. Discrepancy Reconciliation (`STK-H012` Kinetic Stage)

- **Origin:** Prior experimental HTML (`starkit_urban_streetwear_spatial_fashion_store.html`) referenced `STK-H012` (*Kinetic Stage — Marshmello Edition*).
- **Verification Outcome:** `STK-H012` is absent from `docs/source/starkit_brand_book_by_pomelli.pdf`, `docs/source/master_gallery.json`, and the canonical variant matrix, and features recognizable third-party artist/brand trade dress.
- **Decision:** `STK-H012` remains **excluded from the 15-design / 60-slot Drop 01 master** and is recorded under `discrepancy_reconciliation` in `catalog/starkit_products.json` (`status: EXCLUDED_PENDING_SEPARATE_REVIEW`). The 4 new concept hoodie designs occupy `STK-H013` through `STK-H016` so no SKU identifiers collide.

---

## 3. Four-Tier Draft Pricing Model

All hoodie designs assign a canonical `price_tier`, `price_bdt`, `legacy_price_bdt`, and `price_approved: false` pending owner commercial sign-off:

| Tier Code | Label | Draft Price (BDT) | Assigned Designs | Count |
|---|---|---|---|---|
| `CORE` | Core Archive | **৳1,099** | `STK-H002` Peace Bro Club, `STK-H003` Folk Route, `STK-H008` Collective Voice, `STK-H010` Cheese Chase | 4 |
| `SELECT` | Select Studio | **৳1,250** | `STK-H006` Celluloid Nights, `STK-H007` Dhaka Afterglow, `STK-H009` Rickshaw Bloom, `STK-H014` Urban Heritage | 4 |
| `SIGNATURE` | Signature Drop | **৳1,369** | `STK-H001` Shinobi Sunset, `STK-H005` Moonlit Hero, `STK-H011` Night Circuit, `STK-H013` Shadow Shinobi | 4 |
| `PREMIUM` | Premium Collector | **৳1,499** | `STK-H004` The Rider Code, `STK-H015` Heritage Static, `STK-H016` Midnight Signal | 3 |

---

## 4. Security & Server Architecture Remediations

1. **Path & Directory Hardening (`server.js`):** Normalized filesystem path resolution blocks directory traversal (`..`) and blocks public HTTP access (`404`) to `/api`, `/catalog`, `/supabase`, `/scripts`, `/docs`, `/tests`, and `/node_modules`.
2. **Strict Security Headers (`server.js` + `vercel.json`):** Sets `Content-Security-Policy` (`frame-ancestors 'none'` on HTML, restricted `script-src`/`img-src`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
3. **Public vs. Private Data Split:** Storefront fetches promotions safely from `assets/promotions.json` (kept synced by `scripts/generate_60_variant_system.cjs`), leaving `catalog/*.json` strictly private on the server.
4. **Fail-Closed Order API (`api/orders.js`):**
   - Rejects non-`POST` (`405`) and invalid cross-origin requests (`403`).
   - Returns `503` whenever `STARKIT_ORDERS_ENABLED !== 'true'`, `SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` is unset.
   - Rate-limits submissions per client IP + phone, enforces strict Bangladesh mobile validation (`01[3-9]XXXXXXXX` / `+8801[3-9]XXXXXXXX`), validates UUID v4 `idempotency_key`, blocks unapproved/`PROVISIONAL` SKUs (`409`), and recomputes every item subtotal, active multi-piece promo discount, and district delivery fee server-side.
5. **Hardened Admin API (`api/admin.js`):**
   - Timing-safe key validation + Supabase Auth RBAC role verification (`owner`, `admin`, `merchandiser`, `viewer`).
   - Blocks direct `approved_for_publication: true` overrides on `update_stock` (`403`), routing publication changes exclusively through `submit_approval_evidence` and server-side workflow checks (`canTransitionApproval`).
   - Validates image uploads by binary magic-byte inspection (`detectImageSignature`: PNG/JPEG/WebP only; SVG rejected against stored XSS).
   - Writes an audit trail entry to `store_audit_logs` on every privileged mutation.

---

## 5. Database Schema & Migrations (`/supabase/`)

Execute scripts cleanly in order on a fresh Supabase project, or apply `005` on top of an existing `001`–`004` instance:
1. `supabase/001_starkit_store.sql` — Core tables (`store_variants`, `store_orders`, `store_order_items`, `store_config`), RLS policies, and `submit_starkit_order` atomic RPC (`SELECT FOR UPDATE`).
2. `supabase/002_catalog_seed.sql` — Canonical 60-slot hoodie matrix + 35 Drop 02 accessory SKUs.
3. `supabase/003_admin_views_and_helpers.sql` — Order fulfillment summary views and helper routines.
4. `supabase/004_quick_enable_demo.sql` — *(Optional staging sandbox only)* Seeds sample stock and COD fee config for test environments.
5. `supabase/005_security_and_60_variant_upgrade.sql` — Adds `store_products`, `store_product_approvals` (7 gates), `store_promotions`, `store_media_assets`, `store_admin_users` (RBAC), `store_audit_logs`, and `discount_bdt` / `applied_promotions` on `store_orders`.
