# StarkiT — Store Operations, 7-Gate Approval & Admin Portal Guide

**Portal URL:** `/admin.html`  
**Backend Endpoint:** `/api/admin` (`api/admin.js`)

---

## 1. Authentication & Role-Based Access Control (RBAC)

`admin.html` keeps all administrative credentials **strictly in JavaScript memory** (zero `localStorage` or `sessionStorage` writes).

### Method A: Administrator API Key (`X-Admin-Key`)
- Configure `STARKIT_ADMIN_API_KEY` in `.env` (local) or Vercel Environment Variables using a random string of **at least 32 characters**.
- Select `X-Admin-Key` on the Operations Portal gate, paste the key, and authenticate.
- `api/admin.js` verifies the key using constant-time comparison (`crypto.timingSafeEqual`).
- When Supabase credentials are not configured locally, `api/admin.js` and `api/orders.js` seamlessly operate against the shared in-memory `runtime-store.js` engine so administrators can test 7-gate approvals, promotion rules, media uploads, and checkout end-to-end.

### Method B: Supabase RBAC Session Token (`Supabase JWT`)
- Create staff accounts in **Supabase Authentication** and register their `user_id` + `email` + `role` inside `public.store_admin_users`.
- Supported roles:
  - `owner` / `admin`: Full access across orders, 7-gate approvals, price tier updates, promotion rules, media uploads, and store mode switches.
  - `merchandiser`: Inventory stock updates, 7-gate evidence submission, media uploads/imports.
  - `viewer`: Read-only access to dashboard orders, inventory matrix, and audit logs.
- Select `Supabase JWT` on `/admin.html` and paste the user's Supabase access token.

---

## 2. Dashboard Modules

| Tab | Purpose | Key Actions |
|---|---|---|
| **Overview** | Live COD KPIs, architectural snapshot (`11` Drop 01 hoodie designs / `15` verified variants), `STK-H012` IP hold reminder | Inspect recent customer orders |
| **Orders** | Customer fulfillment queue | Search by reference/phone/district; transition statuses (`pending_confirmation` → `confirmed` → `processing` → `shipped` → `delivered` / `cancelled`); print COD invoices with applied promo discounts; export courier CSV |
| **Inventory & 7-Gate** | SKU stock table + Approval workflow panel | Update variant stock counts; run the **7-Gate Approval** submission with pre-populated checklist & reviewer evidence notes |
| **Tiers & Offers** | Manage draft 4-tier retail prices (`BDT 1,099–1,499`) and multi-piece promotional rules | Inspect per-tier approval counts; edit `discount_type` (`NONE`, `FIXED_BDT`, `PERCENT`, `INQUIRY`), `discount_value`, and `free_shipping`, then Save or Approve & Activate `DUO_SELECTION`, `TRIO_PLUS`, or `WHOLESALE_RESELLER` |
| **Media & Drive** | Direct photo upload + Google Drive OAuth import into Supabase Storage (`starkit-media`) | Upload validated `.webp` / `.jpg` / `.png` assets per SKU & view type (`front`, `back`, `detail_01`, `detail_02`, `reference_composite`) via Google Sign-In or direct `drive.readonly` OAuth token |
| **Audit Logs** | Immutable compliance history | Inspect every stock, price, promotion, order status, and approval event recorded in `store_audit_logs` |
| **Settings** | Delivery fee, COD toggle, store mode (`preview` / `public`), support phone | Persist operational store settings hydrated dynamically onto the storefront |

---

## 3. Running the 7-Gate Product Approval Workflow

No Drop 01 hoodie or colorway can become purchasable online until all 7 evidence gates pass inside **Inventory & 7-Gate** (`action: "submit_approval_evidence"`):

1. **Artwork Rights Verified (`artwork_rights_ok`):** Written clearance or original copyright attestation recorded (mandatory for character/trademarked concepts such as `STK-H001`, `STK-H004`, `STK-H005`, `STK-H006`, `STK-H008`, `STK-H010`, `STK-H011`).
2. **Garment Specs Verified (`garment_specs_ok`):** Physical fabric GSM (330–350 GSM fleece target), print fastness, and wash test confirmed.
3. **Sample Photography Verified (`sample_photo_ok`):** Authentic color-matched studio assets uploaded cleanly without colorway cross-contamination.
4. **Size Run Verified (`size_run_ok`):** M / L / XL / XXL grading measurements verified against production sample.
5. **Physical Stock Verified (`stock_count_ok`):** On-hand count (`stock_quantity > 0`) confirmed for approved SKUs.
6. **Price Tier Approved (`pricing_approved_ok`):** Draft tier (`CORE ৳1,099`, `SELECT ৳1,250`, `SIGNATURE ৳1,369`, or `PREMIUM ৳1,499`) formally signed off by founder.
7. **Commercial Terms Verified (`commercial_terms_ok`):** COD fee (`৳80` Dhaka / `৳150` Outside, free `>= ৳3,000`), exchange SLA (7 days), and dispatch workflow confirmed.

> **Security Guardrail:** Attempting to flip `approved_for_publication: true` directly via `update_stock` returns `HTTP 403`. Approval transitions must pass `submit_approval_evidence` through valid state transitions (`READY_FOR_APPROVAL` → `APPROVED` → `PUBLISHED`) and log non-empty reviewer notes.

---

## 4. Configuring Multi-Piece Offers (`Tiers & Offers`)

1. Open **Tiers & Offers** in `/admin.html`.
2. Locate `DUO_SELECTION` (min 2 hoodies), `TRIO_PLUS` (min 3 hoodies), or `WHOLESALE_RESELLER` (min 10 units).
3. Choose the discount type (`FIXED_BDT` or `PERCENT`), enter the numeric discount value, toggle `Free Ship` if desired, and click **Approve & Activate** (or **Save** to store draft settings).
4. Approved rules reflect automatically on the storefront via `/api/admin?action=public_storefront_state` and compute identically inside `api/orders.js` and `submit_starkit_order`.

---

## 5. Uploading Variant Photography (`Media & Drive`)

- Accepted binary formats: **WebP, JPEG, PNG** (verified via magic-byte header inspection in `api/admin.js`; SVG uploads are rejected for XSS safety; max payload limit enforced).
- Assign each uploaded file to a target `sku` (e.g., `STK-H001-BLK`) and `view_type` (`front`, `back`, `detail_01`, `detail_02`, `reference_composite`).
- Files are stored in the Supabase Storage bucket `STARKIT_MEDIA_BUCKET` (`starkit-media` by default) and indexed in `public.store_media_assets` for verified SKU galleries.
- For Google Drive imports, open **Media & Drive**, authenticate via **Sign in with Google** (self-hosted Firebase Auth SDK) or paste a short-lived `drive.readonly` OAuth access token, browse folders, and import directly.

---

## 6. Controlling Live Storefront Availability

1. `assets/js/store-config.js` configures initial storefront metadata (`mode: 'public'`, `cod_enabled: true`). Public storefronts automatically fetch `/api/admin?action=public_storefront_state` to reflect any runtime/Supabase updates from Admin **Settings**.
2. Drop 01 hoodies (`STK-H*`) remain non-purchasable (`price_approved: false`, `approved_for_publication: false`) until approved via the 7-Gate workflow.
3. In Vercel / server `.env`, set `STARKIT_ORDERS_ENABLED=true`, `STARKIT_DB_APPROVAL_AUTHORITATIVE=true`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STARKIT_ADMIN_API_KEY`, and (optional) `META_ACCESS_TOKEN`.
