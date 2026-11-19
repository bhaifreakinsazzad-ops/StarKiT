# StarkiT — WEAR YOUR WORLD. | DROP 01 হুডি স্টোরফ্রন্ট (১১টি ডিজাইন / ১৫টি ভেরিফায়েড SKU)

> **StarkiT** (`ستاركيت`) হলো ঢাকার একটি স্বাধীন স্ট্রিটওয়্যার ফ্যাশন হাউস, যার প্রতিষ্ঠাতা **নাফে মুনাওয়ার (Nafe Munawer)**। এই রিপোজিটরিতে রয়েছে Three.js ইন্টারেক্টিভ 3D শোরুম, কিউরেটেড Drop 01 হুডি কালেকশন (`11`টি আসল হুডি ডিজাইন / `15`টি স্টুডিও-ভেরিফায়েড কালারওয়ে SKU), ৪-স্তরের প্রাইসিং ইঞ্জিন, ৭-গেট অ্যাডমিন অ্যাপ্রুভাল ওয়ার্কফ্লো, এবং Vercel / Supabase COD API।

---

## ১) দ্রুত লোকাল ডেভেলপমেন্ট ও প্রিভিউ

```bash
# ১. ডিপেনডেন্সি ইনস্টল করুন
npm install

# ২. ইউনিট টেস্ট, API সিকিউরিটি, DOM ইন্টিগ্রিটি এবং প্যাকেজ ভেরিফিকেশন চালান
npm test

# ৩. ক্যাটালগ জেনারেট ও public/ ডিরেক্টরি বিল্ড করুন
npm run build

# ৪. লোকাল ডেভেলপমেন্ট সার্ভার চালু করুন (http://localhost:3000)
npm start
```

- ডেভেলপমেন্ট বা ক্লায়েন্ট রিভিউয়ের সময় Supabase কনফিগার করা না থাকলেও `runtime-store.js` ইন-মেমরি ফলব্যাকের মাধ্যমে `/admin.html` ও অর্ডার ফ্লো পরীক্ষা করা যাবে।
- প্রোডাকশনে অনলাইন অর্ডার সক্রিয় করতে `.env` বা Vercel-এ `STARKIT_ORDERS_ENABLED=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, এবং ৩২+ অক্ষরের `STARKIT_ADMIN_API_KEY` সেট করুন।

---

## ২) সিস্টেম ও ক্যাটালগ আর্কিটেকচার

- **Drop 01 হুডি ক্যাটালগ (১১টি আসল ডিজাইন / ১৫টি স্টুডিও কালারওয়ে SKU):**
  - ৪টি ব্র্যান্ড কালারওয়ে প্যালেট: Black (`#170000`), Cream (`#F3EFE6`), Maroon (`#5B1A24`), Chocolate Brown (`#4B2E24`)।
  - **১৫টি ডকুমেন্টেড SKU** (৬৭টি লোকাল `.webp` স্টুডিও ইমেজসহ)। স্টোরফ্রন্টে কোনো ফেইক বা মিডিয়া-বিহীন প্রোভিশনাল প্রোডাক্ট নেই।
  - **আইপি হোল্ড (IP Exclusion):** `STK-H012` (*Kinetic Stage — Marshmello Edition*) তৃতীয় পক্ষের লাইসেন্সিং পর্যালোচনার জন্য তালিকা থেকে বাদ রাখা হয়েছে।
- **৪-স্তরের মূল্য নির্ধারণ (Four-Tier Pricing):**
  - `CORE`: `৳1,099` · `SELECT`: `৳1,250` · `SIGNATURE`: `৳1,369` · `PREMIUM`: `৳1,499`।
- **ডিজাইন ও অ্যানিমেশন সিস্টেম:**
  - ফন্ট: `Afacad Flux` (ল্যাটিন), `Hind Siliguri` (বাংলা), `JetBrains Mono` (SKU/মেটাডেটা)।
  - থ্রিডি শোরুম ও মাইক্রো-ইন্টারঅ্যাকশন: `Three.js` পলিহেড্রাল মনোলিথ, `Anime.js v4.5.0` ও `Motion.dev`।
- **২২টি HTML পেজ:**
  - `index.html`: 3D শোরুম, ভার্চুয়াল ওয়ার্ডরোব, ৪-স্তরের মূল্য কার্ড, লুকবুক ও ১১টি হুডির গ্রিড।
  - `shop.html`: লাইভ সার্চ, থিম ক্যাটাগরি, টিয়ার, কালার ও সর্টিং ফিল্টার।
  - `products/*.html`: ১১টি হুডির আলাদা SEO-বান্ধব প্রোডাক্ট ডিটেইল পেজ।
  - `checkout.html` ও `order-confirmation.html`: ক্যাশ অন ডেলিভারি (ঢাকা `৳80`, ঢাকার বাইরে `৳150`, `৳3,000+` অর্ডারে ফ্রি ডেলিভারি), বাংলা/BD ফোন ভ্যালিডেশন ও সেশন রিসিপ্ট।
  - তথ্যবহুল পেজ: `about.html`, `shipping.html`, `returns.html`, `contact.html`, `privacy.html`, `terms.html`।
  - অ্যাডমিন পোর্টাল (`admin.html`): ৭-গেট প্রোডাক্ট অ্যাপ্রুভাল, প্রোমোশন কনফিগারেশন, অর্ডার ম্যানেজমেন্ট, ইনভয়েস প্রিন্ট, Google Drive/Supabase মিডিয়া আপলোড ও অডিট লগ।
- **ট্র্যাকিং ও ডেটাবেস:**
  - Meta Pixel (`1390081606323661`) + সার্ভার-সাইড Conversions API (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`)।
  - Supabase PostgreSQL মাইগ্রেশন: `supabase/001_starkit_store.sql` থেকে `005_security_and_60_variant_upgrade.sql` এবং `supabase/seed.sql`।

---

## ৩) ফাইল ও ডিরেক্টরি পরিচিতি

| পাথ | বিবরণ |
|---|---|
| `index.html`, `shop.html`, `products/*.html` | শোরুম, কালেকশন ও ১১টি হুডির প্রোডাক্ট ডিটেইল পেজ |
| `checkout.html`, `order-confirmation.html` | Cash on Delivery চেকআউট ও কনফার্মেশন পেজ |
| `admin.html`, `api/admin.js`, `api/orders.js` | অ্যাডমিন অপারেশনস পোর্টাল ও নিরাপদ সার্ভারলেস এপিআই |
| `assets/js/core/` & `assets/js/modules/` | শেয়ার্ড স্কিমা, প্রাইসিং ইঞ্জিন, ভ্যালিডেশন ও মডুলার ফ্রন্টএন্ড |
| `supabase/001`–`005` | PostgreSQL স্কিমা, RLS, অ্যাটমিক `submit_starkit_order` RPC ও RBAC |
| `docs/` & `catalog/` | ব্র্যান্ড গাইড, অডিট, লঞ্চ চেকলিস্ট ও ক্যানোনিকাল ক্যাটালগ ম্যানিফেস্ট |
| `tests/` & `scripts/` | অটোমেটেড ইউনিট, সিকিউরিটি, DOM, Meta Pixel ও বিল্ড স্ক্রিপ্ট |
