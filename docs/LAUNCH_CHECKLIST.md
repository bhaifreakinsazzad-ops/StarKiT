# StarkiT — Commercial Publishing & Launch Checklist
## DROP 01 (`15` Designs / `60` Slots) & DROP 02 (`35` Artisan Pieces)

---

### 1. Operational Release States

#### State A — Technical Preview Ready (CURRENT STATUS)
- Complete `15`-design / `60`-slot Drop 01 hoodie architecture + `35` Drop 02 artisan pieces across **61 HTML pages**.
- `15` documented colorway SKUs backed by `67` local `.webp` studio images; `45` media-pending colorway slots clearly gated and non-purchasable.
- Draft four-tier pricing (`Core ৳1,099`, `Select ৳1,250`, `Signature ৳1,369`, `Premium ৳1,499`) modeled clearly with `price_approved: false` pending owner sign-off.
- Storefront (`store-config.js`: `mode: 'preview'`, `cod_enabled: false`) and backend (`STARKIT_ORDERS_ENABLED=false`) operate **fail-closed** until all approvals complete.

#### State B — Live Commercial Operations (Founder Activation Required)
Only move SKUs to State B after every gate in Section 2 is complete and recorded via `/admin.html` **Inventory & 7-Gate**.

---

### 2. Launch Gate Checklist

#### A. Architecture & Storefront
- [x] Official StarkiT wordmark (`ستاركيت` / `STARKIT`), `#170000` palette, `Afacad Flux` + `Hind Siliguri` + `JetBrains Mono` applied across all **61 HTML pages**.
- [x] `15` hoodie designs × `4` colors = `60` colorway slots (`15` documented, `45` media-pending).
- [x] `STK-H012` (*Kinetic Stage — Marshmello Edition*) excluded cleanly from Drop 01 master and held in `discrepancy_reconciliation`.
- [x] Meta Pixel `1390081606323661` embedded cleanly across all **61 HTML pages** with zero duplicate loaders.

#### B. Open Commercial, IP & Pricing Approvals (Founder Sign-Off Required)
- [ ] Complete artwork rights / licensing verification for all designs flagged in `docs/OUTSTANDING_APPROVALS_REGISTER.md` (notably `STK-H001`, `STK-H004`, `STK-H005`, `STK-H006`, `STK-H008`, `STK-H010`, `STK-H011`).
- [ ] Review and approve draft four-tier prices (`৳1,099 / ৳1,250 / ৳1,369 / ৳1,499`) and configure any multi-piece rules (`DUO_SELECTION`, `TRIO_PLUS`, `WHOLESALE_RESELLER`) inside Admin **Tiers & Offers**.
- [ ] Upload verified studio photography for any of the `45` media-pending colorway slots targeted for Drop 01 launch.
- [ ] Verify physical `330–350 GSM` garment wash, shrinkage, and M–XXL size-run fit before enabling stock.
- [ ] Execute 7-gate `submit_approval_evidence` approval inside `/admin.html` for every launch SKU.

#### C. Live Deployment Activation
- [ ] Run Supabase migrations `001`–`005` (`supabase/005_security_and_60_variant_upgrade.sql`).
- [ ] Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, 32+ char `STARKIT_ADMIN_API_KEY`, and `META_ACCESS_TOKEN` in Vercel.
- [ ] Flip `store-config.js` to `mode: 'live'`, `cod_enabled: true` and set `STARKIT_ORDERS_ENABLED=true`.
