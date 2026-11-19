# StarkiT — Product Architecture & Import Audit Report
## DROP 01 (`11` Designs / `15` Studio-Verified Colorway SKUs)

### 1. Executive Summary
This document establishes the production product data model for **StarkiT**:

- **Drop 01 Hoodie Designs:** `11` original parent hoodie designs across **`15` studio-verified colorway SKUs**.
- **Verified Media (`67` WebP Files):** Every live variant has a locally verified `.webp` studio gallery (front, back, detail, and reference composite views).
- **Zero Fake/Placeholder Products:** Concept designs (`STK-H013`–`STK-H016`), unphotographed `PROVISIONAL` slots, and non-hoodie lines have been cleanly removed from the store prior to client handover.
- **Reference Photography:** `13` high-resolution camera JPEG files preserved in `docs/original_references/`.
- **Discrepancy Reconciliation:** `STK-H012` (*Kinetic Stage — Marshmello Edition*) remains excluded from catalog distribution (`discrepancy_reconciliation` in `catalog/starkit_products.json`).

---

### 2. Master Registry — 11 Drop 01 Hoodie Designs

| Design ID | Design Name | Collection | Tier | Price (BDT) | Legacy Price | Verified SKUs (`15` Total) | Status |
|---|---|---|---|---|---|---|---|
| **STK-H001** | SHINOBI SUNSET | Anime Archive | `SIGNATURE` | ৳1,369 | ৳1,590 | BLK, CRM (2) | Published / Studio Verified |
| **STK-H002** | PEACE BRO CLUB | Playful Street | `CORE` | ৳1,099 | ৳1,290 | BLK (1) | Published / Studio Verified |
| **STK-H003** | FOLK ROUTE | Bangla Heritage | `CORE` | ৳1,099 | ৳1,390 | BLK (1) | Published / Studio Verified |
| **STK-H004** | THE RIDER CODE | Moto Culture | `PREMIUM` | ৳1,499 | ৳1,690 | MRN (1) | Published / Studio Verified |
| **STK-H005** | MOONLIT HERO | Anime Archive | `SIGNATURE` | ৳1,369 | ৳1,590 | BLK (1) | Published / Studio Verified |
| **STK-H006** | CELLULOID NIGHTS | Bangla Heritage | `SELECT` | ৳1,250 | ৳1,490 | BLK (1) | Published / Studio Verified |
| **STK-H007** | DHAKA AFTERGLOW | City Stories | `SELECT` | ৳1,250 | ৳1,490 | BRN (1) | Published / Studio Verified |
| **STK-H008** | COLLECTIVE VOICE | Statement Graphics | `CORE` | ৳1,099 | ৳1,390 | BLK, CRM, MRN, BRN (4) | Published / Studio Verified |
| **STK-H009** | RICKSHAW BLOOM | Bangla Heritage | `SELECT` | ৳1,250 | ৳1,490 | BLK (1) | Published / Studio Verified |
| **STK-H010** | CHEESE CHASE | Playful Street | `CORE` | ৳1,099 | ৳1,390 | BLK (1) | Published / Studio Verified |
| **STK-H011** | NIGHT CIRCUIT | Moto Culture | `SIGNATURE` | ৳1,369 | ৳1,590 | BLK (1) | Published / Studio Verified |

---

### 3. Drop 01 Brand Colorways

1. **Black (`BLK`):** `#170000`
2. **Cream (`CRM`):** `#F3EFE6`
3. **Maroon (`MRN`):** `#5B1A24`
4. **Chocolate Brown (`BRN`):** `#4B2E24`
