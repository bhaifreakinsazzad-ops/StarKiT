# StarkiT — Commercial Publishing & Launch Checklist
## DROP 01 / THE GRAPHIC ARCHIVE & DROP 02 / ARTISAN EDIT

This checklist governs the operational transition between **State A (Technical Preview Ready)** and **State B (Commercial Publishing Approved)**.

---

### 1. Two Operational Release States

#### State A — Technical Preview Ready (CURRENT STATUS: COMPLETED)
* Complete 44-variant product architecture fully implemented in code, catalog files, and database schemas.
* 15 source-documented variants have mapped multi-view image galleries, verified pricing, and active shopping flows.
* 29 provisional variants are explicitly classified as in-development with purchasing disabled.
* 35 Drop 02 artisan accessories integrated with verified handmade photography and specs.
* High-luxury UI/UX powered by Three.js 3D spatial monolith, Motion.dev spring micro-interactions, and Anime.js typography.
* Full test suite passing with 0 broken links, 0 broken images, and verified Meta Pixel & CAPI telemetry.

#### State B — Commercial Publishing Approved (ACTIVATION CRITERIA)
A specific product design or variant moves from Technical Preview to Live Commercial Selling only after all required checkpoints below are signed off by the Founder / Creative Director.

---

### 2. Launch Gate Checklist

#### A. Brand & Catalog Integrity
- [x] Official StarkiT logo (Arabic mark `ستاركيت` + spaced Latin wordmark) applied across all 56 pages.
- [x] Afacad Flux (Latin), Hind Siliguri (Bengali), and Amiri (Arabic) typography correctly licensed and loaded.
- [x] Exactly 11 parent hoodie designs and 44 variant slots established.
- [x] All 15 source-documented colorways mapped with 67 WebP image assets.
- [x] All 29 provisional colorways clearly gated with `COLORWAY IN DEVELOPMENT / AWAITING APPROVAL`.
- [x] Experimental 12th design (`STK-H012 — Kinetic Stage`) excluded from 44-slot master.
- [x] Proposed retail prices verified: STK-H001 (৳1590), H002 (৳1290), H003 (৳1390), H004 (৳1690), H005 (৳1590), H006 (৳1490), H007 (৳1490), H008 (৳1390), H009 (৳1490), H010 (৳1390), H011 (৳1590).

#### B. Artwork Rights & Commercial IP Verification
- [ ] **STK-H001 (Shinobi Sunset)**: Written commercial licensing / authorization for character and logo graphics.
- [ ] **STK-H002 (Peace Bro Club)**: Confirmation of original artwork ownership.
- [ ] **STK-H003 (Folk Route)**: Confirmation of original artwork ownership.
- [ ] **STK-H004 (The Rider Code)**: Royal Enfield / motorcycle trademark commercial authorization.
- [ ] **STK-H005 (Moonlit Hero)**: Character and title written commercial licensing.
- [ ] **STK-H006 (Celluloid Nights)**: Identifiable actor likenesses and retro film artwork rights confirmation.
- [ ] **STK-H007 (Dhaka Afterglow)**: Originality and architectural vector rights confirmation.
- [ ] **STK-H008 (Collective Voice)**: Written authorization and sales-policy review for organizational emblem.
- [ ] **STK-H009 (Rickshaw Bloom)**: Originality and folk artisan collaboration review.
- [ ] **STK-H010 (Cheese Chase)**: Written commercial licensing for Tom & Jerry character artwork.
- [ ] **STK-H011 (Night Circuit)**: Written commercial licensing for Hot Wheels trademarks / logos.

#### C. Garment Specifications & Sizing
- [x] Standard garment claim: Heavyweight 330–350 GSM combed compact cotton fleece with soft brushed interior.
- [x] Unsupported GSM customization options (280–480 GSM sliders) eliminated from production store.
- [x] Verified size guide: M (Chest 40", Length 27"), L (42", 28"), XL (44", 29"), XXL (46", 30").
- [ ] Physical production sample fit check on models across all 4 sizes.
- [ ] Physical garment wash & shrinkage test (< 3% after cold wash).

#### D. Commerce & Delivery Infrastructure
- [x] 100% Cash on Delivery (COD) established as primary payment method nationwide.
- [x] Verified delivery rates: Dhaka Metropolitan ৳80 (2–3 business days), Outside Dhaka ৳150 (3–5 business days).
- [x] Free delivery threshold configured for orders of ৳3,000 and above.
- [x] Dedicated customer support phone number: `01778307704` (Direct calls & WhatsApp ordering).
- [x] Dedicated courier onboarding (Steadfast / Pathao / Paperfly) with automated tracking sync.
- [x] 7-Day hassle-free size exchange policy documented on all product pages and `/returns.html`.

#### E. Technical & Security Deployments
- [x] Meta Pixel `1390081606323661` installed across all 56 HTML pages.
- [x] Meta Conversions API (CAPI) active in serverless order pipeline with SHA-256 customer identifier hashing.
- [x] Server-side price re-computation and validation in `api/orders.js`.
- [x] Strict server-side rejection of orders containing provisional or unapproved SKUs.
- [x] Supabase migration scripts `001_starkit_store.sql` and `002_catalog_seed.sql` generated and tested.
- [x] Admin dashboard at `/admin.html` secured with authentication for order status and stock controls.
- [x] Offline-first local vendor bundles (`three.module.js`, `anime.min.js`, `motion.js`) with 0 external CDN dependencies.
- [x] Complete downloadable distribution package prepared: `StarkiT_DROP01_44_Variant_Complete_Store.zip`.

---

### 3. Transition Authority
To transition a provisional variant to live commercial status:
1. Upload verified photography (front, back, details, composite) to `assets/images/`.
2. Update the variant record in `catalog/starkit_44_variants.json` from `PROVISIONAL` to `DOCUMENTED`.
3. Set `approved_for_publication: true` and specify initial inventory in `stock_quantity`.
4. Run `node scripts/generate_44_variant_system.cjs` and `node scripts/import_catalog_supabase.cjs`.
5. Deploy changes to Vercel production.
