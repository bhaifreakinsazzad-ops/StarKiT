# StarkiT — Media QA & Asset Verification Report
## DROP 01 / THE GRAPHIC ARCHIVE

### 1. Asset Inventory Summary
* **Total WebP Assets Documented**: 67 Files
* **Total WebP Assets Verified on Disk**: 67 Files (100% Match)
* **Total Original High-Resolution References**: 13 JPEG Files (`docs/original_references/`)
* **Total Drop 02 Accessory Photos**: 35 JPEG Files (`assets/images/accessories/`)
* **Corrupted or Broken Files**: 0
* **External CDN Fallback Dependencies**: 0 (100% Locally Staged)

---

### 2. Format & Dimension Standards
* **Web Delivery Format**: Google WebP (`.webp`)
* **Aspect Ratio**: Standardized 4:5 vertical portrait aspect ratio (`1200 × 1500 px` equivalent native rendering).
* **Color Profile**: sRGB, optimized for vibrant reproduction across OLED mobile screens and Retina desktop displays.
* **Compression**: Lossy WebP with quality 85–90, achieving 70–80% bandwidth savings compared to raw PNG/JPEG while preserving textile micro-textures and sleeve line art.

---

### 3. SKU-by-SKU Asset Mapping Matrix

| SKU | Color | Front View | Back View | Detail 01 | Detail 02 | Detail 03 | Composite | Total Files |
|---|---|---|---|---|---|---|---|---|
| **STK-H001-BLK** | Black | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6 |
| **STK-H001-CRM** | Cream | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6 |
| **STK-H002-BLK** | Black | ✓ | ✓ | — | — | — | ✓ | 3 |
| **STK-H003-BLK** | Black | ✓ | ✓ | ✓ | ✓ | — | ✓ | 5 |
| **STK-H004-MRN** | Maroon | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6 |
| **STK-H005-BLK** | Black | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6 |
| **STK-H006-BLK** | Black | ✓ | ✓ | ✓ | ✓ | — | ✓ | 5 |
| **STK-H007-BRN** | Brown | ✓ | ✓ | — | — | — | ✓ | 3 |
| **STK-H008-BLK** | Black | ✓ | ✓ | — | — | — | ✓ | 3 |
| **STK-H008-CRM** | Cream | ✓ | ✓ | — | — | — | ✓ | 3 |
| **STK-H008-MRN** | Maroon | ✓ | ✓ | — | — | — | ✓ | 3 |
| **STK-H008-BRN** | Brown | ✓ | ✓ | — | — | — | ✓ | 3 |
| **STK-H009-BLK** | Black | ✓ | ✓ | ✓ | ✓ | — | ✓ | 5 |
| **STK-H010-BLK** | Black | ✓ | ✓ | ✓ | — | — | ✓ | 4 |
| **STK-H011-BLK** | Black | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6 |
| **TOTALS** | — | **15** | **15** | **11** | **6** | **5** | **15** | **67** |

---

### 4. Integrity Assurance Checks
1. **Zero CDN Dependencies**: All assets are served locally from `/assets/images/`. No dependency on external Google Drive URLs for rendering.
2. **Stable Aspect Ratios**: Containers enforce `aspect-ratio: 4/5` and `object-fit: cover` to eliminate Cumulative Layout Shift (CLS < 0.05).
3. **Dual-Angle Hover Mechanics**: On product listing cards, `img.front` and `img.back` are loaded and cross-fade via GPU-accelerated opacity transforms on hover.
4. **Provisional Colorway Asset Isolation**: The 29 provisional colorway slots intentionally have `media_count: 0`. The UI renders the dynamic color swatch canvas instead of displaying images from another colorway.
