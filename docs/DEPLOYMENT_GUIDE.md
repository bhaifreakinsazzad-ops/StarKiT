# StarkiT — Production Deployment & Infrastructure Guide
## Vercel Serverless Architecture + Supabase PostgreSQL Engine

### 1. Architecture Overview
* **Hosting Platform**: Vercel (Edge Network + Serverless Functions)
* **Database Engine**: Supabase (PostgreSQL 15+ with Row Level Security, Atomic RPC, and Storage)
* **Frontend Runtime**: Zero-build vanilla web architecture (22 Static HTML5 pages, CSS3, ES Modules, Three.js r187, Anime.js v4.5.0, Motion.dev, and self-hosted Firebase Auth SDK in `assets/js/vendor/`)
* **Commerce APIs**:
  - `POST /api/orders`: Fail-closed Cash-on-Delivery order intake with origin validation, rate limiting, idempotency, server-side promo/shipping calculation, atomic stock deduction (`submit_starkit_order`), and Meta Conversions API (CAPI) dispatch.
  - `GET /api/admin?action=public_storefront_state`: Non-PII public hydration of store settings, approved promotions, and variant availability/gallery overlays.
  - `GET / POST /api/admin`: Timing-safe `X-Admin-Key` or Supabase JWT RBAC console for orders, 7-gate approvals, tier pricing, promotions, media uploads, and audit logs.
* **Telemetry & Tracking**: Meta Pixel (`1390081606323661`) client-side (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) + serverless CAPI deduplication (`event_id = reference`).

---

### 2. Environment Variables Configuration

Copy `.env.example` to `.env` locally or configure in Vercel Project Settings > Environment Variables:

```bash
# ==============================================================================
# STARKIT PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# Supabase Credentials (from Supabase Project Settings > API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<set-in-vercel-env>
SUPABASE_SERVICE_ROLE_KEY=<set-in-vercel-env-server-only>

# Admin Portal Access (minimum 32 random characters)
STARKIT_ADMIN_API_KEY=<generate-32plus-char-cryptographic-secret>
STARKIT_MEDIA_BUCKET=starkit-media

# Store Commercial Operation Controls
STARKIT_STORE_MODE=public              # 'preview' or 'public'
STARKIT_ORDERS_ENABLED=true            # Set 'false' to pause live POST /api/orders intake
STARKIT_DB_APPROVAL_AUTHORITATIVE=true # Lets Supabase store_variants 7-gate flags authorize runtime sales
STARKIT_PUBLIC_URL=https://your-domain.vercel.app

# Meta Pixel & Conversions API (Server-side only for META_ACCESS_TOKEN)
META_PIXEL_ID=1390081606323661
META_DATASET_ID=1390081606323661
META_ACCESS_TOKEN=<set-rotated-meta-system-user-token-in-vercel-env>
META_TEST_EVENT_CODE=<optional-test-code>
```

---

### 3. Database Migration & Seeding Steps

1. **Log in to Supabase Dashboard**: Navigate to **SQL Editor**.
2. **Execute Migrations in Order**:
   - Run `supabase/001_starkit_store.sql` — creates `store_settings`, `store_variants`, `store_orders`, `store_order_items`, RLS policies, and `submit_starkit_order` RPC.
   - Run `supabase/002_catalog_seed.sql` — cleans legacy placeholder/accessory rows and seeds all `11` Drop 01 hoodie designs, `15` studio-verified `DOCUMENTED` variants, and `4` `store_promotions`.
   - Run `supabase/003_admin_views_and_helpers.sql` — installs `v_starkit_orders_dashboard`, `update_starkit_order_status`, and evidence-gated `starkit_publish_sku`.
   - Run `supabase/005_security_and_60_variant_upgrade.sql` — creates `store_products`, `store_product_approvals`, `store_promotions`, `store_media_assets`, `store_admin_users`, and `store_audit_logs` (with idempotent catalog/promotion backfill).
   - *(Staging / sandbox testing only)* Run `supabase/004_quick_enable_demo.sql` to activate sample stock (`25` units) on `STK-H001`–`STK-H011` documented SKUs. Never run `004` on unverified production inventory.
3. **Create Storage Bucket**:
   - In Supabase Storage, create bucket `starkit-media` (public read if displaying uploaded product previews directly on storefront) for `/admin.html` direct uploads & Google Drive imports.
4. **Verify Seed**:
   ```sql
   select status, count(*) from public.store_variants group by status;
   -- Expected: DOCUMENTED: 15 (15 studio-verified hoodie SKUs)
   select drop_code, count(*) from public.store_products group by drop_code;
   -- Expected: DROP_01: 11 (STK-H001 through STK-H011)
   ```

---

### 4. Vercel Deployment Instructions

1. Ensure `.vercelignore` keeps `docs/`, `supabase/`, `catalog/`, `scripts/`, `tests/`, and build archives out of public static hosting.
2. Push code to `notrealenginellc/StarKiT:main` or deploy via `vercel --prod`.
3. In Vercel Project Settings:
   - **Framework Preset**: `Other`
   - **Build Command**: `npm run build`
   - **Output Directory**: `public`
4. Configure all environment variables from Section 2 and redeploy.

---

### 5. Post-Deployment Verification Checklist
- [ ] Homepage `/` loads cleanly with 3D Polyhedral Monolith in `#spatialHeroContainer` and zero console errors.
- [ ] All 22 HTML routes resolve cleanly without broken images or missing `/assets/js/vendor/*` modules.
- [ ] Unapproved SKUs return `HTTP 409` server-side when commercial mode is disabled or before 7-gate clearance.
- [ ] Admin portal at `/admin.html` authenticates with `STARKIT_ADMIN_API_KEY` or Supabase JWT, completes 7-gate approval on an intended SKU, and persists stock/promotion updates.
- [ ] Test COD checkout (`POST /api/orders`) returns `HTTP 201` with a `STK-...` reference and displays `/order-confirmation.html`.
- [ ] Meta Pixel Helper verifies `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, and `Purchase` events with matching `event_id` in Meta Events Manager.
