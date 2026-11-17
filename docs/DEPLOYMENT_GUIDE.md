# StarkiT — Production Deployment & Infrastructure Guide
## Vercel Serverless Architecture + Supabase PostgreSQL Engine

### 1. Architecture Overview
* **Hosting Platform**: Vercel (Edge Network + Serverless Functions)
* **Database Engine**: Supabase (PostgreSQL 15+ with Row Level Security and JSONB support)
* **Frontend Runtime**: Zero-build vanilla web architecture (Static HTML5, CSS3, ES Modules, Three.js WebGL, Anime.js, Motion.dev)
* **Commerce APIs**:
  - `POST /api/orders`: Serverless order submission with idempotency, inventory locking, and Meta Conversions API (CAPI) dispatch.
  - `GET /api/admin`: Authenticated administrative reporting and order status management.
* **Telemetry & Tracking**: Meta Pixel (`1390081606323661`) client-side + serverless CAPI with SHA-256 customer identifier hashing and deduplication.

---

### 2. Environment Variables Configuration

Create `.env` (or set in Vercel Project Settings > Environment Variables):

```bash
# ==============================================================================
# STARKIT PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# Supabase Credentials (from Supabase Project Settings > API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<set-in-vercel-env>
SUPABASE_SERVICE_ROLE_KEY=<set-in-vercel-env-server-only>

# Meta Pixel & Conversions API (CAPI)
META_PIXEL_ID=1390081606323661
META_DATASET_ID=1390081606323661
META_ACCESS_TOKEN=<set-rotated-meta-system-user-token-in-vercel-env>
META_TEST_EVENT_CODE=<optional-test-code>

# Store Commercial Operation Controls
STARKIT_STORE_MODE=preview        # 'preview' or 'public' (keep preview until owner sign-off)
STARKIT_ORDERS_ENABLED=false      # 'true' only after legal, stock, and pricing approval
STARKIT_ADMIN_API_KEY=<generate-32plus-char-cryptographic-secret>
STARKIT_MEDIA_BUCKET=starkit-media
STARKIT_PUBLIC_URL=https://your-domain.vercel.app
```

---

### 3. Database Migration & Seeding Steps

1. **Log in to Supabase Dashboard**: Navigate to **SQL Editor**.
2. **Execute Schema Migration**:
   - Run the contents of `supabase/001_starkit_store.sql` to establish `store_products`, `store_variants`, `store_orders`, `store_order_items`, and the atomic stored procedure `submit_starkit_order`.
3. **Execute 44-Variant Seed Script**:
   - Run the contents of `supabase/002_catalog_seed.sql` (or `supabase/seed.sql`).
   - This populates all 11 designs, 44 variant slots (15 live documented + 29 in-development provisional), and 35 Fariza's Territory accessories.
4. **Verify Seed**:
   ```sql
   select status, count(*) from public.store_variants group by status;
   -- Expected: DOCUMENTED: 50 (15 hoodies + 35 accessories), PROVISIONAL: 29
   ```

---

### 4. Vercel Deployment Instructions

#### Deploy via Vercel CLI
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Link & Deploy to Preview
vercel

# 3. Deploy to Production
vercel --prod
```

#### Deploy via GitHub Integration
1. Push code to `notrealenginellc/StarKiT:main`.
2. Connect repository in Vercel Dashboard.
3. Configure Environment Variables as specified above.
4. Set Build Command: `None` (Static project with Serverless Functions).
5. Set Output Directory: `.` (Root directory).
6. Click **Deploy**.

---

### 5. Post-Deployment Verification Checklist
- [ ] Homepage loads in under 1.5 seconds on 4G mobile connection.
- [ ] 3D Polyhedral Monolith renders at 60fps in `#spatialHeroContainer`.
- [ ] Test purchase of STK-H001-BLK via Cash on Delivery completes and returns HTTP 201 with reference number.
- [ ] Meta Pixel Helper extension verifies `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, and `Purchase` events.
- [ ] Meta Events Manager verifies server-side Conversions API (CAPI) events with matching `event_id`.
- [ ] Switching to a provisional colorway (e.g. STK-H001-MRN) displays `COLORWAY IN DEVELOPMENT / AWAITING APPROVAL` and disables checkout.
- [ ] Admin portal at `/admin.html` displays live order records and inventory controls.
