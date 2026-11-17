# StarkiT — Product Architecture & Import Audit Report
## DROP 01 (`15` Designs / `60` Colorway Slots) & DROP 02 (`35` Artisan Pieces)

### 1. Executive Summary
This document establishes the normalized product data model for **StarkiT**:

- **Drop 01 Hoodie Designs:** `15` parent designs × `4` working colors = **`60` planned colorway slots**.
- **Documented SKUs (`15`):** Complete locally verified `.webp` photography galleries (`67` WebP files on disk).
- **Provisional Media-Pending Slots (`45`):** `29` planned colorways across `STK-H001`–`STK-H011` plus `16` slots across concept designs `STK-H013`–`STK-H016`.
- **Drop 02 Artisan Collection (`35`):** `5` Decorative Mirrors, `19` Wearable Art jewelry pieces, and `11` Bangles & Accents (`35` verified `.jpg` files).
- **Reference Photography:** `13` high-resolution camera JPEG files preserved in `docs/original_references/`.
- **Discrepancy Reconciliation:** `STK-H012` (*Kinetic Stage — Marshmello Edition*) from prior experimental HTML is **excluded** from the 60-slot master and placed on formal IP hold (`discrepancy_reconciliation` in `catalog/starkit_products.json`).

---

### 2. Master Registry — 15 Parent Hoodie Designs

| Design ID | Design Name | Collection | Draft Tier | Draft Price | Legacy Price | Documented (15) | Media-Pending (45) | Launch Status |
|---|---|---|---|---|---|---|---|---|
| **STK-H001** | SHINOBI SUNSET | Anime Archive | `SIGNATURE` | ৳1,369 | ৳1,590 | BLK, CRM (2) | MRN, BRN (2) | Draft / Pending 7-Gate |
| **STK-H002** | PEACE BRO CLUB | Playful Street | `CORE` | ৳1,099 | ৳1,290 | BLK (1) | CRM, MRN, BRN (3) | Draft / Pending 7-Gate |
| **STK-H003** | FOLK ROUTE | Bangla Heritage | `CORE` | ৳1,099 | ৳1,390 | BLK (1) | CRM, MRN, BRN (3) | Draft / Pending 7-Gate |
| **STK-H004** | THE RIDER CODE | Moto Culture | `PREMIUM` | ৳1,499 | ৳1,690 | MRN (1) | BLK, CRM, BRN (3) | Draft / Pending 7-Gate |
| **STK-H005** | MOONLIT HERO | Anime Archive | `SIGNATURE` | ৳1,369 | ৳1,590 | BLK (1) | CRM, MRN, BRN (3) | Draft / Pending 7-Gate |
| **STK-H006** | CELLULOID NIGHTS | Bangla Heritage | `SELECT` | ৳1,250 | ৳1,490 | BLK (1) | CRM, MRN, BRN (3) | Draft / Pending 7-Gate |
| **STK-H007** | DHAKA AFTERGLOW | City Stories | `SELECT` | ৳1,250 | ৳1,490 | BRN (1) | BLK, CRM, MRN (3) | Draft / Pending 7-Gate |
| **STK-H008** | COLLECTIVE VOICE | Statement Graphics | `CORE` | ৳1,099 | ৳1,390 | BLK, CRM, MRN, BRN (4) | *(0)* | Draft / Pending 7-Gate |
| **STK-H009** | RICKSHAW BLOOM | Bangla Heritage | `SELECT` | ৳1,250 | ৳1,490 | BLK (1) | CRM, MRN, BRN (3) | Draft / Pending 7-Gate |
| **STK-H010** | CHEESE CHASE | Playful Street | `CORE` | ৳1,099 | ৳1,390 | BLK (1) | CRM, MRN, BRN (3) | Draft / Pending 7-Gate |
| **STK-H011** | NIGHT CIRCUIT | Moto Culture | `SIGNATURE` | ৳1,369 | ৳1,590 | BLK (1) | CRM, MRN, BRN (3) | Draft / Pending 7-Gate |
| **STK-H013** | SHADOW SHINOBI *(Concept)* | Anime Archive | `SIGNATURE` | ৳1,369 | — | *(0)* | BLK, CRM, MRN, BRN (4) | Concept / Media Pending |
| **STK-H014** | URBAN HERITAGE *(Concept)* | Bangla Heritage | `SELECT` | ৳1,250 | — | *(0)* | BLK, CRM, MRN, BRN (4) | Concept / Media Pending |
| **STK-H015** | HERITAGE STATIC *(Concept)* | City Stories | `PREMIUM` | ৳1,499 | — | *(0)* | BLK, CRM, MRN, BRN (4) | Concept / Media Pending |
| **STK-H016** | MIDNIGHT SIGNAL *(Concept)* | Moto Culture | `PREMIUM` | ৳1,499 | — | *(0)* | BLK, CRM, MRN, BRN (4) | Concept / Media Pending |

---

### 3. Four Working Colorways

Every design maps to all 4 canonical Drop 01 shades:
1. **Black (`BLK`):** `#170000`
2. **Cream (`CRM`):** `#F3EFE6`
3. **Maroon (`MRN`):** `#5B1A24`
4. **Chocolate Brown (`BRN`):** `#4B2E24`

Undocumented slots never inherit imagery from another colorway; they render the dedicated hex-matched `Media Pending` studio stage and block checkout on both client and server.
