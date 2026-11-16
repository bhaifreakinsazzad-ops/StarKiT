# StarkiT — Product Architecture & Import Audit Report
## DROP 01 / THE GRAPHIC ARCHIVE — 44-SLOT CANONICAL ARCHITECTURE

### 1. Executive Summary
This document establishes the verified, normalized product data model for **StarkiT DROP 01 — THE GRAPHIC ARCHIVE**.

* **Authoritative Collection Scope**: 11 Master Parent Designs × 4 Planned Colorways = **44 Total Variant Slots**.
* **Documented Live Variants**: **15 SKUs** (Complete physical mockup image sets available; verified on disk).
* **Provisional In-Development Slots**: **29 SKUs** (Colorway planning slots established; physical mockups & production samples pending).
* **Existing Product Media Assets**: **67 WebP Images** (100% verified on local disk; mapped to SKUs).
* **Original Reference Photography**: **13 High-Resolution Studio JPEGs** (Preserved in `docs/original_references/`).
* **HTML Discrepancy Reconciliation**: `STK-H012 — Kinetic Stage` (Marshmello Brand Book Edition) is identified as an extra design present in earlier experimental HTML files, but absent from the authoritative 11-design master catalog. It is classified as **HOLD / EXCLUDED FROM 44-SLOT MASTER** pending separate commercial licensing.

---

### 2. 11 Parent Designs — Master Registry

| Design ID | Design Name | Collection / Storyline | Proposed Retail Price | Documented Colorways | Provisional Slots | Artwork Rights Note | Launch Gate Status |
|---|---|---|---|---|---|---|---|
| **STK-H001** | SHINOBI SUNSET | Anime Archive | ৳1,590 | Cream, Black (2) | Maroon, Brown (2) | Third-party character & logo; licensing verification | HOLD / PRE-RELEASE |
| **STK-H002** | PEACE BRO CLUB | Playful Street | ৳1,290 | Black (1) | Cream, Maroon, Brown (3) | Originality & artwork ownership confirmation | HOLD / PRE-RELEASE |
| **STK-H003** | FOLK ROUTE | Bangla Heritage | ৳1,390 | Black (1) | Cream, Maroon, Brown (3) | Originality & artwork ownership confirmation | HOLD / PRE-RELEASE |
| **STK-H004** | THE RIDER CODE | Moto Culture | ৳1,690 | Maroon (1) | Black, Cream, Brown (3) | Royal Enfield / motorcycle trademark verification | HOLD / PRE-RELEASE |
| **STK-H005** | MOONLIT HERO | Anime Archive | ৳1,590 | Black (1) | Cream, Maroon, Brown (3) | Third-party character & title; licensing verification | HOLD / PRE-RELEASE |
| **STK-H006** | CELLULOID NIGHTS | Bangla Heritage | ৳1,490 | Black (1) | Cream, Maroon, Brown (3) | Confirm rights to actor likenesses & film artwork | HOLD / PRE-RELEASE |
| **STK-H007** | DHAKA AFTERGLOW | City Stories | ৳1,490 | Chocolate Brown (1) | Black, Cream, Maroon (3) | Originality & architectural artwork confirmation | HOLD / PRE-RELEASE |
| **STK-H008** | COLLECTIVE VOICE | Statement Graphics | ৳1,390 | Black, Cream, Maroon, Brown (4) | None (0) | Written authorization for organizational emblem | HOLD / PRE-RELEASE |
| **STK-H009** | RICKSHAW BLOOM | Bangla Heritage | ৳1,490 | Black (1) | Cream, Maroon, Brown (3) | Originality & rickshaw artisan attribution | HOLD / PRE-RELEASE |
| **STK-H010** | CHEESE CHASE | Playful Street | ৳1,390 | Black (1) | Cream, Maroon, Brown (3) | Tom & Jerry characters & title licensing | HOLD / PRE-RELEASE |
| **STK-H011** | NIGHT CIRCUIT | Moto Culture | ৳1,590 | Black (1) | Cream, Maroon, Brown (3) | Hot Wheels trademark / logo licensing | HOLD / PRE-RELEASE |

---

### 3. Four-Color Architecture Matrix

The working palette standard applies 4 planned colorways to every design:

1. **Black (BLK)**: `#170000`
2. **Cream (CRM)**: `#F3EFE6`
3. **Maroon (MRN)**: `#5B1A24`
4. **Chocolate Brown (BRN)**: `#4B2E24`

```
Slot Breakdown:
- 11 Designs × 4 Colors = 44 Total Slots
- Documented (15 slots):
  * STK-H001: BLK, CRM
  * STK-H002: BLK
  * STK-H003: BLK
  * STK-H004: MRN
  * STK-H005: BLK
  * STK-H006: BLK
  * STK-H007: BRN
  * STK-H008: BLK, CRM, MRN, BRN (Complete 4-color set)
  * STK-H009: BLK
  * STK-H010: BLK
  * STK-H011: BLK
- Provisional / In-Development (29 slots):
  * All remaining combinations mapped with unique SKUs and explicit parent relationships.
```

---

### 4. Media Asset Breakdown (67 Verified WebP Files)

Every single one of the 67 image files from the source ZIP has been validated on disk with full metadata:

* **Front Views (01_front.webp)**: 15 files (1 per documented SKU).
* **Back Views (02_back.webp)**: 15 files (1 per documented SKU).
* **Close-Up Detail 01 (03_detail_01.webp)**: 11 files (STK-H001-BLK, STK-H001-CRM, STK-H003-BLK, STK-H004-MRN, STK-H005-BLK, STK-H006-BLK, STK-H009-BLK, STK-H010-BLK, STK-H011-BLK).
* **Close-Up Detail 02 (04_detail_02.webp)**: 6 files (STK-H001-BLK, STK-H001-CRM, STK-H003-BLK, STK-H004-MRN, STK-H005-BLK, STK-H006-BLK, STK-H009-BLK, STK-H011-BLK).
* **Close-Up Detail 03 (05_detail_03.webp)**: 5 files (STK-H001-BLK, STK-H001-CRM, STK-H004-MRN, STK-H005-BLK, STK-H011-BLK).
* **Reference Composites (90_reference_composite.webp)**: 15 files (1 per documented SKU).
* **Total Image Files**: **67 Files** (Zero missing, zero corrupted).

---

### 5. Discrepancy Reconciliation: STK-H012 (Kinetic Stage)
* **Finding**: The experimental `starkit_urban_streetwear_spatial_fashion_store.html` introduced a 12th hoodie design (`STK-H012 — Kinetic Stage / Marshmello Edition`).
* **Source Comparison**: Neither `starkit_brand_book_by_pomelli.pdf`, `master_gallery.json`, nor the 44-colorway readiness spreadsheet include `STK-H012`.
* **Decision**: In strict accordance with Phase 03.4, `STK-H012` is excluded from the canonical DROP 01 44-slot product launch. Code and asset references are cataloged for future separate review, but public presentation and inventory slots remain firmly bound to the 11 core designs (44 slots).
