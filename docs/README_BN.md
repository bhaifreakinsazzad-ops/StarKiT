# StarkiT — DROP 01 Interactive Commerce Store

**ডেলিভারি:** HTML/CSS/JavaScript-ভিত্তিক রেসপনসিভ স্টোর + ১১টি প্রোডাক্ট পেজ + ৬৭টি লোকাল WebP ইমেজ + ক্যাটালগ JSON/CSV + Vercel/Supabase COD API-এর সোর্স + ডেটাবেস মাইগ্রেশন + Node.js টেস্ট স্যুট।

---

## ১) দ্রুত লোকাল ডেভেলপমেন্ট ও প্রিভিউ

```bash
# ডিপেনডেন্সি ইনস্টল করুন
npm install

# প্যাকেজ ইন্টিগ্রিটি ও কোড সিনট্যাক্স টেস্ট করুন
npm test

# লোকাল ডেভেলপমেন্ট সার্ভার চালু করুন
npm start
```
ব্রাউজারে `http://localhost:3000` খুলুন। **প্রিভিউ সম্পূর্ণ অফলাইনেও কাজ করে**।

---

## ২) সিস্টেম ও ফিচার বিবরণ

- **১১টি অনন্য হুডি ডিজাইন / ১৫টি কালারওয়ে SKU / ৬৭টি অপ্টিমাইজড WebP ছবি / ১৩টি অরিজিনাল রেফারেন্স ছবি।**
- **ক্যাটালগ মূল্য:** ৳১,২৯০ থেকে ৳১,৬৯০ (বাংলাদেশি টাকা - BDT)।
- **ডিজাইন সিস্টেম:**
  - প্রাইমারি ফন্ট: `Afacad Flux` (400–900)
  - বাংলা ফন্ট: `Hind Siliguri` (400–700)
  - কালার প্যালেট: Jet Black (`#170000`), Wine (`#44161B`), Paper (`#F6F5F3`), Sand (`#EBE7DF`), Accent Red (`#BC5358`)।
- **পেজসমূহ:**
  - `index.html`: ফুল হিরো স্লাইডার, লুকবুক ট্র্যাক, ক্যাটাগরি ফিল্টার, গ্রিড, ব্র্যান্ড স্টোরি, ব্যাগ ড্রয়ার।
  - `shop.html`: লাইভ সার্চ, সর্টিং, ক্যাটাগরি ফিল্টারসহ সম্পূর্ণ কালেকশন।
  - `products/*.html`: ১১টি পৃথক এসইও-বান্ধব প্রোডাক্ট পেজ (Front, Back, Details, Composite Gallery, কালার সিলেক্টর, সাইজ চার্ট, স্পেসিফিকেশন)।
  - `checkout.html`: ক্যাশ অন ডেলিভারি (COD) চেকআউট, বাংলাদেশি ফোন নম্বর ভ্যালিডেশন (+8801X / 01X), ঢাকা (৳৮০) ও ঢাকার বাইরে (৳১৫০) ডেলিভারি জোন।
  - তথ্যবহুল পেজ: `about.html`, `shipping.html`, `returns.html`, `contact.html`, `privacy.html`, `terms.html`।
- **সার্ভারলেস এপিআই:** `api/orders.js` (Vercel Serverless Function) - ইনপুট স্যানিটাইজেশন, রেট লিমিট, আইডেমপোটেন্সি কি ভ্যালিডেশন এবং Supabase RPC ট্রানজ্যাকশন।
- **পোস্টগ্রেস ডেটাবেস (Supabase):**
  - `supabase/001_starkit_store.sql`: টেবিল স্ট্রাকচার, Row Level Security (RLS) ও ট্রানজ্যাকশনাল অর্ডার ফাংশন (`submit_starkit_order`)।
  - `supabase/002_catalog_seed.sql`: ১৫টি SKU-এর ক্যাটালগ সিড ডেটা।
  - `supabase/003_admin_views_and_helpers.sql`: অ্যাডমিন ড্যাশবোর্ড ভিউ (`v_starkit_orders_dashboard`) এবং অর্ডার স্ট্যাটাস আপডেট হেল্পার।
  - `supabase/004_quick_enable_demo.sql`: স্যান্ডবক্স বা স্টেজিং এনভায়রনমেন্টে তাৎক্ষণিক চেকআউট টেস্ট করার জন্য ডেমো স্টক ও সাইজ অ্যাক্টিভেশন স্ক্রিপ্ট।

---

## ৩) GitHub-এ পুশ করার নিয়ম

```bash
# ১. গিট স্ট্যাটাস চেক করুন
git status

# ২. আপনার GitHub রিমোট যুক্ত করুন
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# ৩. মেইন ব্রাঞ্চে পুশ করুন
git branch -M main
git push -u origin main
```

---

## ৪) Vercel-এ ডেপ্লয় করার নিয়ম

১. [vercel.com](https://vercel.com)-এ যান এবং **"Add New Project"** ক্লিক করুন।  
২. আপনার GitHub রিপোজিটরিটি সিলেক্ট করুন।  
৩. Framework Preset হিসেবে **Other** (Static HTML) থাকবে।  
৪. Root Directory `./` রাখুন।  
৫. Vercel Project Settings > Environment Variables-এ নিচের ভেরিয়েবলগুলো যুক্ত করুন:  
   - `SUPABASE_URL`: আপনার Supabase প্রজেক্ট URL (`https://your-ref.supabase.co`)  
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase সার্ভিস রোল সিক্রেট কি (`service_role` key)  
   - `STARKIT_ORDERS_ENABLED`: `false` (বাণিজ্যিক বিক্রি শুরু করতে চাইলে `true` করুন)  
৬. **Deploy** বাটনে ক্লিক করুন। কয়েক সেকেন্ডে সাইট লাইভ হয়ে যাবে!

---

## ৫) ফাইল ও ফোল্ডার ডিরেক্টরি

| পাথ | বিবরণ |
|---|---|
| `index.html` | হোমপেজ + ইন্টারেক্টিভ লুকবুক + ফুল ক্যাটালগ |
| `shop.html` | কালেকশন আর্কাইভ, সার্চ, সর্ট ও ফিল্টার |
| `products/*.html` | ১১টি ডেডিকেটেড প্রোডাক্ট পেজ |
| `checkout.html` | ক্যাশ অন ডেলিভারি চেকআউট পেজ |
| `about.html`, `shipping.html` ... | ব্র্যান্ড স্টোরি, ডেলিভারি ও পলিসি পেজসমূহ |
| `api/orders.js` | Vercel Serverless Function (অর্ডার প্রসেসিং) |
| `assets/images/` | ব্র্যান্ড লোগো + ৬৭টি হাই-রেজোলিউশন WebP ইমেজ |
| `assets/css/styles.css` | সম্পূর্ণ রেসপন্সিভ ডিজাইন সিস্টেম ও সিএসএস |
| `assets/js/app.js` | অ্যাপের ইন্টারঅ্যাকশন, কার্ট ড্রয়ার ও স্টেট ইঞ্জিন |
| `assets/js/catalog-data.js` | সম্পূর্ণ ক্যাটালগ ডেটা অবজেক্ট |
| `supabase/` | পোস্টগ্রেস ডেটাবেস স্কিমা ও সিড স্ক্রিপ্ট |
| `docs/` | ব্র্যান্ড বুক PDF, মিডিয়া ম্যানিফেস্ট CSV, QA রিপোর্ট |
| `verify_package.js` | অফলাইন অটোমেটেড টেস্ট স্যুট |
| `vercel.json` | Vercel ক্যাশিং ও সিকিউরিটি হেডার কনফিগ |
