# StarkiT — WEAR YOUR WORLD. | DROP 01 Hoodie Storefront (11 Designs / 15 Studio SKUs)

> **StarkiT** (`ستاركيت`) is an independent Dhaka streetwear house founded by **Nafe Munawer** on the ethos **"WEAR YOUR WORLD."** This repository contains the interactive Three.js hoodie showroom, curated Drop 01 Graphic Archive (`11` verified hoodie designs / `15` studio-photographed colorways), four-tier pricing engine, security-hardened order & admin APIs, and Supabase PostgreSQL migrations (`001`–`005`).

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests, API security tests, DOM integrity, and verification suite
npm test

# 3. Build /sync /public deploy directory and verify everything
npm run build

# 4. Start local server (http://localhost:3000)
npm start
```

---

## Brand & Design System

Aligned directly with `docs/source/starkit_brand_book_by_pomelli.pdf`:

- **Brand Tagline:** `WEAR YOUR WORLD.`
- **Core Brand Values:** Community · Style · Authenticity
- **Typography:**
  - **Primary Latin Typeface:** `Afacad Flux` (400–900)
  - **Bengali Copy Typeface:** `Hind Siliguri` (400–700)
  - **Technical Mono / SKU Metadata:** `JetBrains Mono`
- **Brand Palette:**
  - Jet Black (`#170000`) · Pure White (`#FFFFFF`) · Brand Maroon (`#5B1A24`)
  - Cream (`#F3EFE6`) · Chocolate Brown (`#4B2E24`) · Champagne Gold (`#BFA177`)

---

## DROP 01 Master Hoodie Catalog (`11` Designs / `15` Studio-Verified Colorway SKUs)

Every SKU in this release is backed by verified local `.webp` studio photography (`67` WebP files across front, back, detail, and reference composite views). No fake concept designs or unphotographed placeholder SKUs are shipped.

| Product ID | Design Name | Storyline | Tier (BDT Price) | Verified Colorways (`15` Total) |
|---|---|---|---|---|
| **STK-H001** | **SHINOBI SUNSET** | Anime Archive | Signature (`৳1,369`) | `BLK`, `CRM` (2) |
| **STK-H002** | **PEACE BRO CLUB** | Playful Street | Core (`৳1,099`) | `BLK` (1) |
| **STK-H003** | **FOLK ROUTE** | Bangla Heritage | Core (`৳1,099`) | `BLK` (1) |
| **STK-H004** | **THE RIDER CODE** | Moto Culture | Premium (`৳1,499`) | `MRN` (1) |
| **STK-H005** | **MOONLIT HERO** | Anime Archive | Signature (`৳1,369`) | `BLK` (1) |
| **STK-H006** | **CELLULOID NIGHTS** | Bangla Heritage | Select (`৳1,250`) | `BLK` (1) |
| **STK-H007** | **DHAKA AFTERGLOW** | City Stories | Select (`৳1,250`) | `BRN` (1) |
| **STK-H008** | **COLLECTIVE VOICE** | Statement Graphics | Core (`৳1,099`) | `BLK`, `CRM`, `MRN`, `BRN` (4) |
| **STK-H009** | **RICKSHAW BLOOM** | Bangla Heritage | Select (`৳1,250`) | `BLK` (1) |
| **STK-H010** | **CHEESE CHASE** | Playful Street | Core (`৳1,099`) | `BLK` (1) |
| **STK-H011** | **NIGHT CIRCUIT** | Moto Culture | Signature (`৳1,369`) | `BLK` (1) |

- **IP Exclusion Note:** `STK-H012` (*Kinetic Stage — Marshmello Edition*) is excluded from the Drop 01 master and held separately in `discrepancy_reconciliation`.

---

## System Architecture & Security

```
  STOREFRONT (22 Static HTML + Modular ES Modules + Three.js Showroom)
     │  - Live hydration via GET /api/admin?action=public_storefront_state + catalog/promotions.json
     ▼
  SERVERLESS / NODE APIs (api/orders.js · api/admin.js · server.js · runtime-store.js)
     │  - Strict CSP + Directory traversal & private folder blocklist (/catalog, /supabase, /docs, /tests)
     │  - Order API: fail-closed unless STARKIT_ORDERS_ENABLED=true, BD phone & UUID v4 validation,
     │    IP/phone rate limit, server-side promo/shipping calculation, validates approved live SKUs
     │  - Admin API: timing-safe X-Admin-Key OR Supabase JWT + RBAC (store_admin_users),
     │    7-gate submit_approval_evidence workflow, binary magic-byte upload guard, immutable audit logs
     │  - Runtime fallback when Supabase env vars are absent so local/preview reviews work end-to-end
     ▼
  SUPABASE POSTGRESQL + STORAGE (supabase/001..005)
     │  - Atomic submit_starkit_order(...) RPC with row locks & RLS enforcement
```

---

## Documentation Index

- `docs/AUDIT_AND_MIGRATION_REPORT.md` — Architecture & security remediations
- `docs/ADMIN_AND_APPROVAL_GUIDE.md` — Admin Portal usage, RBAC roles, 7-gate approvals, & Supabase Storage upload guide
- `docs/OUTSTANDING_APPROVALS_REGISTER.md` — IP/licensing checklist & owner sign-off register
- `docs/PRODUCT_IMPORT_REPORT.md` · `docs/COLORWAY_STATUS_REPORT.md` · `docs/MEDIA_QA_REPORT.md` · `docs/QA_REPORT.md` · `docs/LAUNCH_CHECKLIST.md`
