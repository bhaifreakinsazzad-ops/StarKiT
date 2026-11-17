# StarkiT — Outstanding Commercial Approvals & Risk Register

**Status:** Storefront in **Technical Preview (`mode: 'preview'`, `cod_enabled: false`, `STARKIT_ORDERS_ENABLED=false`)**  
**Purpose:** Single source of truth listing every open IP review, unverified colorway slot, draft pricing tier, and inactive promotion requiring founder sign-off prior to live public e-commerce launch.

---

## 1. Master Hoodie Design Registry (15 Active + 1 Held = 16 Catalog IDs)

| Design ID | Design Name | Collection | Draft Tier | Draft Price | Legacy Price | Price Approved? | Documented Colorways (15) | Media-Pending Colorways (45) | Artwork / Commercial Rights Action Required |
|---|---|---|---|---|---|---|---|---|---|
| **STK-H001** | SHINOBI SUNSET | Anime Archive | `SIGNATURE` | ৳1,369 | ৳1,590 | No (Draft) | BLK, CRM (2) | MRN, BRN (2) | Obtain written character/emblem licensing or swap to original artwork |
| **STK-H002** | PEACE BRO CLUB | Playful Street | `CORE` | ৳1,099 | ৳1,290 | No (Draft) | BLK (1) | CRM, MRN, BRN (3) | Record original artwork authorship declaration |
| **STK-H003** | FOLK ROUTE | Bangla Heritage | `CORE` | ৳1,099 | ৳1,390 | No (Draft) | BLK (1) | CRM, MRN, BRN (3) | Record original artwork authorship declaration |
| **STK-H004** | THE RIDER CODE | Moto Culture | `PREMIUM` | ৳1,499 | ৳1,690 | No (Draft) | MRN (1) | BLK, CRM, BRN (3) | Obtain Royal Enfield / motorcycle trademark authorization or remove mark |
| **STK-H005** | MOONLIT HERO | Anime Archive | `SIGNATURE` | ৳1,369 | ৳1,590 | No (Draft) | BLK (1) | CRM, MRN, BRN (3) | Obtain written character/title licensing or replace artwork |
| **STK-H006** | CELLULOID NIGHTS | Bangla Heritage | `SELECT` | ৳1,250 | ৳1,490 | No (Draft) | BLK (1) | CRM, MRN, BRN (3) | Confirm personality/film likeness clearance & poster typography rights |
| **STK-H007** | DHAKA AFTERGLOW | City Stories | `SELECT` | ৳1,250 | ৳1,490 | No (Draft) | BRN (1) | BLK, CRM, MRN (3) | Record original architectural artwork clearance |
| **STK-H008** | COLLECTIVE VOICE | Statement Graphics | `CORE` | ৳1,099 | ৳1,390 | No (Draft) | BLK, CRM, MRN, BRN (4) | *(None — 0)* | Confirm written authorization for organizational emblem usage |
| **STK-H009** | RICKSHAW BLOOM | Bangla Heritage | `SELECT` | ৳1,250 | ৳1,490 | No (Draft) | BLK (1) | CRM, MRN, BRN (3) | Confirm artisan motif attribution & original design rights |
| **STK-H010** | CHEESE CHASE | Playful Street | `CORE` | ৳1,099 | ৳1,390 | No (Draft) | BLK (1) | CRM, MRN, BRN (3) | Obtain Warner Bros / Tom & Jerry commercial license or retire graphic |
| **STK-H011** | NIGHT CIRCUIT | Moto Culture | `SIGNATURE` | ৳1,369 | ৳1,590 | No (Draft) | BLK (1) | CRM, MRN, BRN (3) | Obtain Hot Wheels trademark license or strip logo markings |
| **STK-H012** *(HELD)* | *KINETIC STAGE (Marshmello)* | *Excluded Experimental* | *N/A* | *Excluded* | *N/A* | *Excluded* | *0* | *0* | **EXCLUDED / ON HOLD:** Excluded from 15-design / 60-slot Drop 01 master pending separate artist IP licensing |
| **STK-H013** | SHADOW SHINOBI | Concept Drop / Anime Archive | `SIGNATURE` | ৳1,369 | — | No (Draft) | *(None — 0)* | BLK, CRM, MRN, BRN (4) | Original concept briefing + full 4-colorway studio photography required |
| **STK-H014** | URBAN HERITAGE | Concept Drop / Bangla Heritage | `SELECT` | ৳1,250 | — | No (Draft) | *(None — 0)* | BLK, CRM, MRN, BRN (4) | Final artwork approval + full 4-colorway studio photography required |
| **STK-H015** | HERITAGE STATIC | Concept Drop / City Stories | `PREMIUM` | ৳1,499 | — | No (Draft) | *(None — 0)* | BLK, CRM, MRN, BRN (4) | Final artwork approval + full 4-colorway studio photography required |
| **STK-H016** | MIDNIGHT SIGNAL | Concept Drop / Moto Culture | `PREMIUM` | ৳1,499 | — | No (Draft) | *(None — 0)* | BLK, CRM, MRN, BRN (4) | Original artwork review + full 4-colorway studio photography required |

---

## 2. Outstanding Colorway Photography Slots (`45` Media-Pending SKUs)

- **15 Documented SKUs** have verified local `.webp` photography (`67` total `.webp` files).
- **29 Original Provisional Slots** across `STK-H001`–`STK-H011` require studio renders/photography.
- **16 New Concept Slots** across `STK-H013`–`STK-H016` require studio renders/photography.
- **Total Media-Pending Slots:** **`45`** (`29 + 16 = 45`). All 45 intentionally disable checkout and show a hex-matched `Media Pending` studio card rather than borrowing photos from another colorway.

---

## 3. Draft Pricing & Promotional Rules Pending Founder Decision

- **Four-Tier Hoodie Pricing (`price_approved: false`):** Repricing from legacy `৳1,290–৳1,690` to `৳1,099 / ৳1,250 / ৳1,369 / ৳1,499` is modeled cleanly across all UI and JSON catalogs as **Draft Pricing**; founder sign-off is required before enabling live commercial checkout.
- **Multi-Piece & Volume Promotions (`active: false`):**
  - `SINGLE_PIECE` (`active: true`): Standard four-tier checkout without unauthorized discounts.
  - `DUO_SELECTION` (`2+` hoodies): Set to `discount_value: 0, active: false, requires_approval: true`.
  - `TRIO_PLUS` (`3+` hoodies): Set to `discount_value: 0, active: false, requires_approval: true`.
  - `WHOLESALE_RESELLER` (`10+` units): Set to `discount_type: INQUIRY, active: false, requires_approval: true`.
- **Model Photography Tabs:** Disabled cleanly as `Model Shoot Pending` on showroom & PDPs until editorial lookbook shoots are uploaded.

---

## 4. Physical Production & Legal Gate Checklist

- [ ] Complete garment lab shrinkage & print wash fastness verification (`330–350 GSM` fleece spec).
- [ ] Photograph and upload verified `01_front.webp` & `02_back.webp` for any provisional SKUs planned for initial launch batch.
- [ ] Approve final draft prices per tier (`CORE`, `SELECT`, `SIGNATURE`, `PREMIUM`) via Admin 7-Gate workflow.
- [ ] Decide bundle discounts (`DUO_SELECTION` / `TRIO_PLUS`) in Admin `Tiers & Offers`.
- [ ] Set `STARKIT_ORDERS_ENABLED=true`, `store-config.js` `mode: 'live'`, and `cod_enabled: true` when switching live.
