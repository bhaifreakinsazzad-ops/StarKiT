# StarkiT — WEAR YOUR WORLD. | DROP 01 / THE GRAPHIC ARCHIVE

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Deployment%20Ready-black.svg)](https://vercel.com/)
[![Supabase Enabled](https://img.shields.io/badge/Supabase-Database%20Integrated-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)]()

> **StarkiT** is an independent Dhaka streetwear and graphic lifestyle brand founded on the ethos **"WEAR YOUR WORLD."** This repository contains the complete production-grade storefront, editorial collection lookbook, asset library, serverless order API, and PostgreSQL schema for **DROP 01: THE GRAPHIC ARCHIVE**.

---

## ⚡ Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run integrity verification and syntax checks
npm test

# 3. Start local server
npm start
# Open http://localhost:3000 (or the port displayed in terminal)
```

---

## 🎨 Brand & Design System

Synthesized directly from the official 7-page StarkiT Brand Book:

* **Brand Tagline:** `WEAR YOUR WORLD.`
* **Core Brand Values:** Community · Style · Authenticity
* **Aesthetic Direction:** Urban Streetwear, Youthful Dynamism, Playful Tactility, Kinetic Energy, Bold Graphic Storytelling.
* **Typography:**
  * **Primary Brand Typeface:** `Afacad Flux` (Weights: 400, 500, 600, 700, 800, 900)
  * **Bengali Copy Typeface:** `Hind Siliguri` (Weights: 400, 500, 600, 700)
* **Color Palette:**
  * **Jet Black (Primary Ink):** `#170000`
  * **Deep Burgundy / Wine:** `#44161B` / `#692C37`
  * **Studio Paper / Backdrop:** `#F6F5F3` / `#F7F5F1`
  * **Sand / Warm Neutral:** `#EBE7DF` / `#E8DCD0`
  * **Accent Crimson:** `#BC5358` / `#BE555C`
  * **Line / Subtle Border:** `#DED9D3` / `#C9C1BD`
  * **Pure White:** `#FFFFFF`

---

## 📦 DROP 01 Product Catalog Matrix

| Product ID | Name | Category / Story | Colorway SKU | Price (BDT) | Views |
|---|---|---|---|---|---|
| **STK-H001** | **SHINOBI SUNSET** | Anime Archive | `STK-H001-CRM` (Cream)<br>`STK-H001-BLK` (Black) | ৳1,590 | Front, Back, 3 Details, Composite (6 views/color) |
| **STK-H002** | **PEACE BRO CLUB** | Playful Street | `STK-H002-BLK` (Black) | ৳1,290 | Front, Back, Composite (3 views) |
| **STK-H003** | **FOLK ROUTE** | Bangla Heritage | `STK-H003-BLK` (Black) | ৳1,390 | Front, Back, 2 Details, Composite (5 views) |
| **STK-H004** | **THE RIDER CODE** | Moto Culture | `STK-H004-MRN` (Maroon) | ৳1,690 | Front, Back, 3 Details, Composite (6 views) |
| **STK-H005** | **MOONLIT HERO** | Anime Archive | `STK-H005-BLK` (Black) | ৳1,590 | Front, Back, 3 Details, Composite (6 views) |
| **STK-H006** | **CELLULOID NIGHTS** | Bangla Heritage | `STK-H006-BLK` (Black) | ৳1,490 | Front, Back, 2 Details, Composite (5 views) |
| **STK-H007** | **DHAKA AFTERGLOW** | City Stories | `STK-H007-BRN` (Choc Brown) | ৳1,490 | Front, Back, Composite (3 views) |
| **STK-H008** | **COLLECTIVE VOICE** | Statement Graphics | `STK-H008-BLK` (Black)<br>`STK-H008-MRN` (Maroon)<br>`STK-H008-BRN` (Choc Brown)<br>`STK-H008-CRM` (Cream) | ৳1,390 | Front, Back, Composite (3 views/color) |
| **STK-H009** | **RICKSHAW BLOOM** | Bangla Heritage | `STK-H009-BLK` (Black) | ৳1,490 | Front, Back, 2 Details, Composite (5 views) |
| **STK-H010** | **CHEESE CHASE** | Playful Street | `STK-H010-BLK` (Black) | ৳1,390 | Front, Back, Detail, Composite (4 views) |
| **STK-H011** | **NIGHT CIRCUIT** | Moto Culture | `STK-H011-BLK` (Black) | ৳1,590 | Front, Back, 3 Details, Composite (6 views) |

* **Total:** 11 distinct hoodie designs, 15 SKU colorways, 67 unique local WebP assets, 13 source reference photography files.

---

## 🏛 System Architecture & Technology Stack

```
   ┌────────────────────────────────────────────────────────┐
   │                  CLIENT / STOREFRONT                   │
   │  Static HTML5 + Modern CSS + Vanilla ES6 JavaScript    │
   │  Responsive Grid · Bag Drawer · Zoom Lightbox          │
   └──────────┬─────────────────────────────▲───────────────┘
              │                             │
    POST /api/orders               Order Confirmation (STK-...)
              │                             │
   ┌──────────▼─────────────────────────────┴───────────────┐
   │              VERCEL SERVERLESS FUNCTION                │
   │  Path: api/orders.js (Node.js runtime >= 20)           │
   │  - Validates BD Phone (/^(?:\+?880|0)1[3-9]\d{8}$/)    │
   │  - Validates SKU regex & quantity limits (<= 40)       │
   │  - Idempotency UUID validation                         │
   │  - Uses Supabase Private Service Role Key              │
   └──────────┬─────────────────────────────────────────────┘
              │
      RPC: submit_starkit_order(...)
              │
   ┌──────────▼─────────────────────────────────────────────┐
   │             SUPABASE (POSTGRESQL + RLS)                │
   │  Schema: supabase/001_starkit_store.sql                │
   │  - Row Level Security (RLS) on all tables              │
   │  - Atomic Transaction with SELECT FOR UPDATE           │
   │  - Verifies approved_for_publication = true            │
   │  - Decrements verified stock automatically             │
   │  - Computes subtotal + shipping in database            │
   └────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Guide

### 1. Push to GitHub

```bash
# 1. Check local git status
git status

# 2. Add your GitHub remote repository
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 3. Rename branch to main if needed and push
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your newly pushed GitHub repository.
3. Framework Preset: **Other** (Static HTML).
4. Root Directory: `./` (leave default).
5. Add the following **Environment Variables** in Vercel:
   * `SUPABASE_URL`: Your Supabase Project URL (`https://xyzcompany.supabase.co`)
   * `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role secret key
   * `STARKIT_ORDERS_ENABLED`: `false` (set to `true` when ready to go live)
6. Click **Deploy**. Vercel will deploy the static storefront and create the `/api/orders` serverless function.

---

## 🗄 Supabase Database Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Execute the SQL scripts in this exact order:
   * `supabase/001_starkit_store.sql`: Creates schema, RLS policies, tables, and the transactional stored function.
   * `supabase/002_catalog_seed.sql`: Seeds all 15 SKUs with their catalog prices and initial records.
   * `supabase/003_admin_views_and_helpers.sql`: Creates administrator dashboard view `v_starkit_orders_dashboard` and fulfillment helpers.
   * *(Optional for Sandbox testing)* `supabase/004_quick_enable_demo.sql`: Automatically configures standard COD fees (Dhaka ৳80, Outside ৳150) and seeds test inventory across all SKUs so you can test complete end-to-end checkout immediately!

---

## 🧪 Verification & QA

Run the built-in integrity test suite:

```bash
npm test
```

This verifies:
* All 20 HTML pages have valid titles and zero broken relative links.
* All 67 WebP images and 13 original JPG references are present and uncorrupted.
* All 11 products and 15 SKU variants match the master catalog.
* ES6 syntax checks pass for both frontend and backend serverless code.
* Zero external asset dependencies — completely self-contained.

---

## 📄 License & Commercial Notice

All photography composites, logos, and graphic layouts in DROP 01 are proprietary to StarkiT. Ensure all artwork rights, production specifications, and commercial policies are cleared prior to activating live commercial checkout.
