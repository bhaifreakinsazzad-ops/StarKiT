# StarkiT — Commercial Publishing & Launch Checklist
## DROP 01 (`15` Designs / `60` Slots) & DROP 02 (`35` Artisan Pieces)

---

### 1. Operational Release States

#### State A — Public Archive + Gated Drop 01 Hoodies (CURRENT CLIENT HANDOVER BASELINE)
- Complete `15`-design / `60`-slot Drop 01 hoodie architecture + `35` Drop 02 Fariza's Territory artisan pieces across **61 HTML pages**.
- `15` documented Drop 01 hoodie SKUs backed by `67` local `.webp` studio images; `45` media-pending colorway slots clearly gated and non-purchasable (`HTTP 409`).
- Draft four-tier pricing (`Core ৳1,099`, `Select ৳1,250`, `Signature ৳1,369`, `Premium ৳1,499`) modeled clearly with `price_approved: false` pending owner 7-gate sign-off.
- `store-config.js` is set to `mode: 'public'`, `cod_enabled: true` so Drop 02 Fariza's Territory (`FT-*`) pieces are purchasable once `STARKIT_ORDERS_ENABLED=true`, while all unapproved Drop 01 hoodies (`STK-H*`) remain strictly gated behind the 7-gate approval engine in both storefront UI and `api/orders.js`.

#### State B — Full Drop 01 Live Commercial Operations (Founder Activation Required)
Move Drop 01 hoodie SKUs to State B only after every gate in Section 2 is complete and recorded via `/admin.html` **Inventory & 7-Gate**.

---

### 2. Launch Gate Checklist

#### A. Architecture & Storefront
- [x] Official StarkiT wordmark (`ستاركيت` / `STARKIT`), `#170000` palette, `Afacad Flux` + `Hind Siliguri` + `JetBrains Mono` applied across all **61 HTML pages**.
- [x] `15` hoodie designs × `4` colors = `60` colorway slots (`15` documented, `45` media-pending) + `35` Fariza's Territory accessories (`95` total SKUs).
- [x] `STK-H012` (*Kinetic Stage — Marshmello Edition*) excluded cleanly from Drop 01 master and held in `discrepancy_reconciliation`.
- [x] Meta Pixel `1390081606323661` full funnel (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) + server-side CAPI deduplication installed cleanly.
- [x] Storefront live hydration (`GET /api/admin?action=public_storefront_state`) syncs runtime/Supabase approvals, stock counts, and promotions automatically.

#### B. Open Commercial, IP & Pricing Approvals (Founder Sign-Off Required)
- [ ] Complete artwork rights / licensing verification for all designs flagged in `docs/OUTSTANDING_APPROVALS_REGISTER.md` (notably `STK-H001`, `STK-H004`, `STK-H005`, `STK-H006`, `STK-H008`, `STK-H010`, `STK-H011`).
- [ ] Review and approve draft four-tier prices (`৳1,099 / ৳1,250 / ৳1,369 / ৳1,499`) and configure any multi-piece rules (`DUO_SELECTION`, `TRIO_PLUS`, `WHOLESALE_RESELLER`) inside Admin **Tiers & Offers**.
- [ ] Upload verified studio photography for any of the `45` media-pending colorway slots targeted for Drop 01 launch.
- [ ] Verify physical `330–350 GSM` garment wash, shrinkage, and M–XXL size-run fit before enabling stock.
- [ ] Execute 7-gate `submit_approval_evidence` approval inside `/admin.html` for every launch SKU.

#### C. Live Deployment Activation
- [ ] Run Supabase migrations `001`–`005` (`001`, `002`, `003`, `005`) and create storage bucket `starkit-media`.
- [ ] Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, 32+ char `STARKIT_ADMIN_API_KEY`, `STARKIT_DB_APPROVAL_AUTHORITATIVE=true`, `STARKIT_ORDERS_ENABLED=true`, `STARKIT_PUBLIC_URL`, and `META_ACCESS_TOKEN` in Vercel.
- [ ] Verify one live Cash on Delivery order end-to-end and inspect it inside `/admin.html` **Orders**.
