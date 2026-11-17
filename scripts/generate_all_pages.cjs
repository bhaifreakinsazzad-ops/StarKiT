/**
 * StarkiT Static Storefront Page Generator
 * Builds informational pages (about, shipping, returns, contact, privacy, terms),
 * all 15 Drop 01 Hoodie PDPs (including STK-H013..STK-H016 concepts),
 * all 35 Drop 02 Fariza's Territory Artisan Accessory PDPs,
 * plus /sitemap.xml and /robots.txt.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT, 'products');
if (!fs.existsSync(PRODUCTS_DIR)) fs.mkdirSync(PRODUCTS_DIR, { recursive: true });

const catalogJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/catalog.json'), 'utf8'));
const products = catalogJson.products || [];

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Afacad+Flux:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap';

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonLd(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

function renderHead({ base, title, description, ogImage, ogType = 'website', jsonLd = null }) {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#170000">
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)}</title>
  <link rel="icon" type="image/png" href="${base}assets/images/starkit-favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${FONT_URL}" rel="stylesheet">
  <link rel="stylesheet" href="${base}assets/css/styles.css">
  <meta property="og:site_name" content="StarkiT">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${base}${String(ogImage).replace(/^\//, '')}">
  <meta property="og:type" content="${esc(ogType)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${base}${String(ogImage).replace(/^\//, '')}">
  ${jsonLd ? `<script type="application/ld+json">\n  ${safeJsonLd(jsonLd)}\n  </script>` : ''}
  <script>window.STARKIT_BASE = ${JSON.stringify(base)};</script>
  <script defer src="${base}assets/js/store-config.js"></script>
  <script defer src="${base}assets/js/catalog-data.js"></script>
  <script defer src="${base}assets/js/vendor/anime.min.js"></script>
  <script defer src="${base}assets/js/vendor/motion.js"></script>
  <script type="module" src="${base}assets/js/app.js"></script>
  <!-- Meta Pixel Code -->
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1390081606323661');
  fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1390081606323661&ev=PageView&noscript=1" /></noscript>
  <!-- End Meta Pixel Code -->
</head>`;
}

function renderHeader({ base, activeNav }) {
  return `<div class="announcement"><span>StarkiT</span> &middot; Drop 01 Graphic Archive (15 Designs / 60 Slots) &middot; Cash on Delivery across 64 districts &middot; Support <a href="tel:01778307704">01778307704</a></div>

  <header class="header">
    <div class="shell nav-inner">
      <a class="brand" href="${base}index.html" aria-label="StarkiT home">
        <img src="${base}assets/images/starkit-logo-dark.png" alt="StarkiT ستاركيت" height="34">
      </a>
      <nav class="nav-links" id="mainNav">
        <a href="${base}index.html"${activeNav === 'showroom' ? ' class="active"' : ''}>Showroom</a>
        <a href="${base}shop.html"${activeNav === 'collection' ? ' class="active"' : ''}>Collection</a>
        <a href="${base}about.html"${activeNav === 'about' ? ' class="active"' : ''}>Our World</a>
        <a href="${base}shipping.html"${activeNav === 'info' ? ' class="active"' : ''}>Delivery</a>
      </nav>
      <div class="nav-actions">
        <button class="icon-btn" type="button" data-open-cart aria-label="Open shopping bag">Bag <span class="count" data-cart-count>0</span></button>
        <button id="menuToggle" aria-label="Toggle navigation menu" aria-controls="mainNav" aria-expanded="false" class="icon-btn menu-toggle" type="button">☰</button>
      </div>
    </div>
  </header>`;
}

function renderFooter({ base }) {
  return `<footer class="footer">
    <div class="shell">
      <div class="footer-top">
        <div>
          <a href="${base}index.html">
            <img class="footer-logo" src="${base}assets/images/starkit-logo-transparent.png" alt="StarkiT ستاركيت">
          </a>
          <p class="footer-slogan">Wear your world.</p>
          <p style="max-width:380px;color:rgba(243,239,230,0.72);line-height:1.65;">Dhaka-based streetwear and artisan house founded by Nafe Munawer. Drop 01 The Graphic Archive &amp; Drop 02 Fariza&#39;s Territory.</p>
        </div>
        <div>
          <h4>Discover</h4>
          <nav>
            <a href="${base}shop.html">All 50 Designs</a>
            <a href="${base}index.html#lookbook">Interactive Lookbook</a>
            <a href="${base}about.html">Our World</a>
            <a href="${base}index.html#collection">Drop 01 &amp; 02</a>
          </nav>
        </div>
        <div>
          <h4>Information</h4>
          <nav>
            <a href="${base}shipping.html">Delivery &amp; Shipping</a>
            <a href="${base}returns.html">Returns &amp; Exchanges</a>
            <a href="${base}contact.html">Customer Care</a>
            <a href="${base}privacy.html">Privacy Policy</a>
            <a href="${base}terms.html">Terms of Service</a>
            <a href="${base}admin.html">Admin Portal</a>
          </nav>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 StarkiT · Founded by Nafe Munawer</span>
        <span>Dhaka, Bangladesh · Cash on Delivery Nationwide</span>
      </div>
    </div>
  </footer>

  <div class="overlay" id="overlay" aria-hidden="true"></div>
  <aside class="drawer" id="cartDrawer" role="dialog" aria-label="Shopping bag" aria-modal="true">
    <div class="drawer-head">
      <div class="drawer-head-brand">
        <img src="${base}assets/images/starkit-logo-transparent.png" alt="StarkiT">
        <h2>Your Bag</h2>
      </div>
      <button class="close-btn" data-close-cart aria-label="Close bag">×</button>
    </div>
    <div class="drawer-items" id="cartItems"></div>
    <div class="drawer-foot" id="cartFoot" hidden>
      <div class="summary"><span>Subtotal</span><span id="cartSubtotal">৳0</span></div>
      <p class="hint">Delivery fee (Dhaka ৳80 / Outside ৳150) calculated at checkout. Free shipping over ৳3,000.</p>
      <a class="btn" href="${base}checkout.html">Proceed to Checkout ↗</a>
    </div>
  </aside>

  <div class="lightbox" id="zoom" role="dialog" aria-modal="true" aria-label="Enlarged product image">
    <button type="button" aria-label="Close zoom">Close ×</button>
    <img id="zoomImg" alt="">
  </div>
  <div id="toast" role="status" aria-live="polite" hidden style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:110;background:#170000;color:#f3efe6;padding:13px 20px;border-radius:4px;font-weight:600;max-width:95vw;text-align:center;border:1px solid rgba(191,161,119,0.4);box-shadow:0 12px 36px rgba(0,0,0,0.28);"></div>`;
}

// 1. Informational Pages
const INFO_PAGES = [
  {
    filename: 'about.html',
    activeNav: 'about',
    title: 'Our World | StarkiT',
    description:
      'StarkiT is an independent Dhaka streetwear and luxury artisan house founded by Nafe Munawer featuring 15 Drop 01 hoodie designs (60 planned colorways) and 35 Drop 02 Fariza\'s Territory pieces.',
    body: `
    <div class="eyebrow">StarkiT / Brand Heritage</div>
    <h1>Our World.</h1>
    <p style="font-size:1.12rem;color:var(--crimson);font-weight:600;">StarkiT is an independent Dhaka streetwear and artisan house founded by Nafe Munawer.</p>
    <h2>Wear your world.</h2>
    <p>Founded by <strong>Nafe Munawer</strong> in Dhaka, Bangladesh, StarkiT bridges local cultural roots with contemporary graphic streetwear silhouettes and living Bangladeshi craft traditions. Our identity centers on considered storytelling, community, style, and authenticity.</p>
    <div style="margin:28px 0;border-radius:var(--radius);overflow:hidden;border:1px solid var(--line);">
      <img src="assets/images/editorial/fariza-drop02-editorial-banner.jpg" alt="Drop 02 Fariza's Territory Dhaka Atelier Campaign" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;">
    </div>
    <h3>Drop 01: The Graphic Archive (15 Designs / 60 Colorway Slots)</h3>
    <p>Fifteen hoodie designs engineered in 330–350 GSM combed compact fleece across our four signature brand palettes — Black (#170000), Cream (#F3EFE6), Maroon (#5B1A24), and Chocolate Brown (#4B2E24) — yielding 60 colorway slots across four structured retail pricing tiers (Core ৳1,099, Select ৳1,250, Signature ৳1,369, and Premium ৳1,499). Eleven archive releases feature 15 documented studio colorway galleries available for immediate Cash on Delivery, while four concept editions (STK-H013 through STK-H016) expand the archive.</p>
    <h3>Drop 02: The Artisan Edit · Fariza&#39;s Territory</h3>
    <p>In partnership with <strong>Fariza&#39;s Territory</strong>, StarkiT presents thirty-five handcrafted Dhaka artisan pieces celebrating Bangladeshi folk craft: 5 hand-sculpted botanical &amp; folk decorative mirrors, 19 wearable art jewelry sets, and 11 silk-thread &amp; micro-bead embroidered bangles.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:24px 0;">
      <figure style="margin:0;border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden;background:var(--cream);">
        <img src="assets/images/editorial/fariza-mirror-lifestyle.jpg" alt="Fariza's Territory Sculpted Botanical Wooden Mirror" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">
        <figcaption style="padding:10px 12px;font-size:0.8rem;font-weight:600;color:var(--ink);">Decorative Mirrors · Hand-Sculpted Floral Relief</figcaption>
      </figure>
      <figure style="margin:0;border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden;background:var(--cream);">
        <img src="assets/images/editorial/fariza-jewelry-indigo-lifestyle.jpg" alt="Fariza's Territory Indigo & Saffron Wearable Art Set" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">
        <figcaption style="padding:10px 12px;font-size:0.8rem;font-weight:600;color:var(--ink);">Wearable Art · Indigo &amp; Kalka Folk Pendants</figcaption>
      </figure>
      <figure style="margin:0;border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden;background:var(--cream);">
        <img src="assets/images/editorial/fariza-bangles-lifestyle.jpg" alt="Fariza's Territory Silk-Thread Embroidered Bangles" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">
        <figcaption style="padding:10px 12px;font-size:0.8rem;font-weight:600;color:var(--ink);">Bangles &amp; Accents · Silk-Thread &amp; Beadwork</figcaption>
      </figure>
    </div>
    <p>From the streets of Dhaka to all 64 districts across Bangladesh, wear your world with quiet confidence.</p>
    <p style="margin-top:36px;"><a href="shop.html" class="btn btn-outline">Explore All 50 Designs ↗</a></p>`
  },
  {
    filename: 'shipping.html',
    activeNav: 'info',
    title: 'Delivery & Shipping | StarkiT',
    description: 'Nationwide Cash on Delivery shipping policy across all 64 districts of Bangladesh.',
    body: `
    <div class="eyebrow">StarkiT / Information</div>
    <h1>Delivery &amp; Shipping.</h1>
    <p style="font-size:1.12rem;color:var(--crimson);font-weight:600;">Nationwide Cash on Delivery shipping policy across Bangladesh.</p>
    <h2>Delivery coverage &amp; rates</h2>
    <p>StarkiT delivers nationwide across all 64 districts of Bangladesh through our verified courier network.</p>
    <ul>
      <li><strong>Inside Dhaka Metro:</strong> ৳80 delivery fee. Orders arrive within 2 to 3 business days after confirmation.</li>
      <li><strong>Outside Dhaka / Nationwide:</strong> ৳150 delivery fee. Orders arrive within 3 to 5 business days after dispatch.</li>
      <li><strong>Free Shipping Threshold:</strong> Orders reaching ৳3,000 net subtotal (or qualifying Admin-activated offers) unlock free nationwide delivery.</li>
    </ul>
    <h2>Cash on Delivery (COD)</h2>
    <p>Inspect your sealed parcel upon delivery and pay the rider directly in BDT. For delivery assistance, call or WhatsApp <strong>01778307704</strong>.</p>
    <p style="margin-top:36px;"><a href="shop.html" class="btn btn-outline">Browse Collection ↗</a></p>`
  },
  {
    filename: 'returns.html',
    activeNav: 'info',
    title: 'Returns & Exchanges | StarkiT',
    description: 'Hassle-free 7-day size exchange and returns policy for StarkiT garments and artisan pieces.',
    body: `
    <div class="eyebrow">StarkiT / Information</div>
    <h1>Returns &amp; Exchanges.</h1>
    <p style="font-size:1.12rem;color:var(--crimson);font-weight:600;">Hassle-free 7-day size exchange and returns policy.</p>
    <h2>7-day exchange guarantee</h2>
    <p>We want you to wear every StarkiT piece with confidence. If your hoodie fit isn&#39;t quite right or you receive an item with any defect, we offer a 7-day exchange window from delivery.</p>
    <h2>Exchange guidelines</h2>
    <ul>
      <li>Items must remain unworn, unwashed, and in original packaging with garment tags attached.</li>
      <li>To request a size swap or inspection review, message <strong>01778307704</strong> with your order reference (e.g. <code>STK-...</code>).</li>
      <li>Our Dhaka team coordinates pickup and dispatch of your replacement piece.</li>
    </ul>
    <p style="margin-top:36px;"><a href="shop.html" class="btn btn-outline">Browse Collection ↗</a></p>`
  },
  {
    filename: 'contact.html',
    activeNav: 'info',
    title: 'Customer Care | StarkiT',
    description: 'Get in touch with the StarkiT Dhaka customer care team via phone or WhatsApp.',
    body: `
    <div class="eyebrow">StarkiT / Information</div>
    <h1>Customer Care.</h1>
    <p style="font-size:1.12rem;color:var(--crimson);font-weight:600;">Direct Dhaka studio support for sizing, delivery, and wholesale inquiries.</p>
    <h2>Get in touch</h2>
    <p>Questions about Drop 01 hoodie sizing, provisional colorway release dates, or Fariza&#39;s Territory artisan pieces? Reach our team directly.</p>
    <div class="summary-panel" style="margin:24px 0;">
      <p style="margin-bottom:10px;"><strong>Direct Phone &amp; WhatsApp:</strong> <a href="tel:01778307704" style="text-decoration:underline;">01778307704</a> &middot; <a href="https://wa.me/8801778307704" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;color:#15803d;font-weight:600;">WhatsApp Chat ↗</a></p>
      <p style="margin-bottom:10px;"><strong>Founder &amp; Creative Direction:</strong> Nafe Munawer · StarkiT Dhaka</p>
      <p style="margin-bottom:10px;"><strong>Operating Hours:</strong> 10:00 AM – 10:00 PM (BST), Saturday through Thursday</p>
      <p style="margin-bottom:0;"><strong>Headquarters:</strong> Dhaka, Bangladesh</p>
    </div>
    <p style="margin-top:36px;"><a href="shop.html" class="btn btn-outline">Browse Collection ↗</a></p>`
  },
  {
    filename: 'privacy.html',
    activeNav: 'info',
    title: 'Privacy Policy | StarkiT',
    description: 'How StarkiT handles and protects customer contact and delivery data.',
    body: `
    <div class="eyebrow">StarkiT / Information</div>
    <h1>Privacy Policy.</h1>
    <p style="font-size:1.12rem;color:var(--crimson);font-weight:600;">How StarkiT protects and processes customer information.</p>
    <h2>Data protection &amp; privacy</h2>
    <p>StarkiT respects your privacy. When you place a Cash on Delivery order, we collect only the name, Bangladesh mobile number, district, and delivery address necessary to verify and ship your parcel.</p>
    <p>We never sell, rent, or trade personal data. Because orders are settled via Cash on Delivery, no bank card numbers or financial credentials are collected on our storefront.</p>
    <p style="margin-top:36px;"><a href="shop.html" class="btn btn-outline">Browse Collection ↗</a></p>`
  },
  {
    filename: 'terms.html',
    activeNav: 'info',
    title: 'Terms of Service | StarkiT',
    description: 'Commercial ordering, pricing, and intellectual property terms for StarkiT.',
    body: `
    <div class="eyebrow">StarkiT / Information</div>
    <h1>Terms of Service.</h1>
    <p style="font-size:1.12rem;color:var(--crimson);font-weight:600;">Standard commercial and ordering terms for StarkiT.</p>
    <h2>Terms &amp; conditions</h2>
    <p>All listed storefront prices are in Bangladeshi Taka (BDT). Draft tier pricing on preview or provisional SKUs remains non-binding until approved for public sale by StarkiT administration. Delivery fees (৳80 inside Dhaka, ৳150 nationwide) are confirmed on checkout.</p>
    <p>All StarkiT trademarks, typography, garment photography, and branding remain the property of StarkiT and founder Nafe Munawer. Designs incorporating third-party IP remain paused under internal rights clearance until licensed.</p>
    <p style="margin-top:36px;"><a href="shop.html" class="btn btn-outline">Browse Collection ↗</a></p>`
  }
];

for (const page of INFO_PAGES) {
  const html = `<!DOCTYPE html>
<html lang="en">
${renderHead({
  base: './',
  title: page.title,
  description: page.description,
  ogImage: 'assets/images/starkit-logo-brand-original.png'
})}
<body>
  ${renderHeader({ base: './', activeNav: page.activeNav })}
  <main class="text-page">
    ${page.body}
  </main>
  ${renderFooter({ base: './' })}
</body>
</html>`;
  fs.writeFileSync(path.join(ROOT, page.filename), html, 'utf8');
}

// 2. Generate all 50 Product Detail Pages (15 Hoodies + 35 Artisan Accessories)
let hoodiePages = 0;
let accessoryPages = 0;

for (const p of products) {
  const isHoodie = String(p.id).startsWith('STK-');
  const firstDocVariant =
    (p.variants || []).find((v) => v.status === 'DOCUMENTED' && Array.isArray(v.gallery) && v.gallery.length > 0) ||
    (p.variants || [])[0];
  const firstImgObj =
    (firstDocVariant?.gallery || []).find((g) => g.view === 'front') ||
    (firstDocVariant?.gallery || [])[0] ||
    null;
  const ogImg = firstImgObj ? String(firstImgObj.url).replace(/^\//, '') : 'assets/images/starkit-logo-brand-original.png';
  const tierLabel = p.price_tier ? `${p.price_tier} TIER` : p.collection || 'Artisan Craft';
  const collectionCrumb = isHoodie ? p.category || 'Drop 01 Hoodies' : p.collection || 'Artisan Accessories';
  const categoryShopHref = `../shop.html?category=${isHoodie ? 'Streetwear' : encodeURIComponent(collectionCrumb)}`;
  const priceMetaPrefix = isHoodie && p.price_approved !== true ? 'Draft tier price' : 'Price';
  const slotCount = (p.variants || []).length;

  const productSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: firstDocVariant?.sku || p.id,
      brand: { '@type': 'Brand', name: 'StarkiT' },
      category: collectionCrumb,
      description: p.copy_en,
      image: `../${ogImg}`,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BDT',
        price: Number(p.price_bdt),
        availability: p.publication_status === 'PUBLISHED' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Showroom', item: '../index.html' },
        { '@type': 'ListItem', position: 2, name: 'Collection', item: '../shop.html' },
        { '@type': 'ListItem', position: 3, name: p.name }
      ]
    }
  ];

  const initialStageHtml = firstImgObj
    ? `<img src="../${esc(String(firstImgObj.url).replace(/^\//, ''))}" alt="${esc(p.name)}" referrerpolicy="no-referrer">
       <span class="view-tag">${isHoodie ? 'Front View' : 'Handcrafted Studio Piece'}</span>`
    : `<div class="stage-provisional-slate">
         <div class="stage-swatch-disc" style="background:${esc(firstDocVariant?.hex || '#170000')};"></div>
         <div class="eyebrow" style="margin-bottom:8px;">Concept Design · Media Pending</div>
         <h3 style="margin:0 0 8px;">${esc(p.name)}</h3>
         <p style="margin:0;color:var(--mute);max-width:34ch;font-size:0.9rem;">
           ${esc(p.id)} studio photography is awaiting upload across 4 colorway slots.
         </p>
       </div>`;

  const isPublishedLive = p.publication_status === 'PUBLISHED' && firstDocVariant?.approved_for_publication === true;

  const specsHtml = isHoodie
    ? `
      <div class="spec"><strong>The Design</strong><span>${esc(p.front_back_detail || p.editorial)}</span></div>
      <div class="spec"><strong>Price Tier</strong><span>${esc(p.price_tier)} · ৳${Number(p.price_bdt).toLocaleString('en-BD')} (${p.price_approved ? 'Verified Archive Price' : 'Pending Sign-Off'})</span></div>
      <div class="spec"><strong>Fabric Spec</strong><span>${esc(p.fabric_claim || 'Heavyweight 330–350 GSM fleece')}</span></div>
      <div class="spec"><strong>Size Chart</strong><span>${esc(p.size_chart || 'M, L, XL, XXL')}</span></div>
      <div class="spec"><strong>Authenticity</strong><span>${esc(p.publication_status === 'PUBLISHED' ? 'Official StarkiT Drop 01 Studio Edition' : (p.rights_assessment || 'Pending verification'))}</span></div>
      <div class="spec"><strong>Delivery</strong><span>Dhaka: ৳80 (2–3 Days) · Nationwide: ৳150 (3–5 Days). Free over ৳3,000.</span></div>
      <div class="spec"><strong>Design ID</strong><span>${esc(p.id)} · ${esc(p.publication_status === 'PUBLISHED' ? 'LIVE / IN STOCK' : (p.approval_status || 'MEDIA_PENDING'))}</span></div>`
    : `
      <div class="spec"><strong>The Design</strong><span>${esc(p.front_back_detail || p.editorial)}</span></div>
      <div class="spec"><strong>Materials &amp; Craft</strong><span>${esc(p.fabric_claim || 'Handcrafted in Dhaka')}</span></div>
      <div class="spec"><strong>Sizing &amp; Fit</strong><span>${esc(p.size_chart || 'Standard Artisan Fit')}</span></div>
      <div class="spec"><strong>Origin</strong><span>Dhaka, Bangladesh · Fariza&#39;s Territory Studio</span></div>
      <div class="spec"><strong>Delivery</strong><span>Dhaka: ৳80 (2–3 Days) · Nationwide: ৳150 (3–5 Days). Free over ৳3,000.</span></div>
      <div class="spec"><strong>Exchange</strong><span>Hassle-free 7-day exchange guarantee.</span></div>
      <div class="spec"><strong>Design ID</strong><span>${esc(p.id)}</span></div>`;

  const pdpHtml = `<!DOCTYPE html>
<html lang="en">
${renderHead({
  base: '../',
  title: `${p.name} | StarkiT ${isHoodie ? 'Drop 01 Hoodie' : 'Artisan Accessories'}`,
  description: `${p.copy_en} ${priceMetaPrefix} ৳${Number(p.price_bdt).toLocaleString('en-BD')}. Cash on Delivery nationwide in Bangladesh.`,
  ogImage: ogImg,
  ogType: 'product',
  jsonLd: productSchema
})}
<body>
  ${renderHeader({ base: '../', activeNav: 'collection' })}
  <main>
    <div class="shell">
      <div class="crumb"><a href="../index.html">Showroom</a> / <a href="../shop.html">Collection</a> / <a href="${categoryShopHref}">${esc(collectionCrumb)}</a> / ${esc(p.name)}</div>
      <div class="detail" data-detail-product="${esc(p.id)}">
        <div class="detail-main">
          <div class="detail-photo" id="detailGallery" tabindex="0" role="button" aria-label="Zoom product image">
            ${initialStageHtml}
          </div>
          <div id="detailThumbs" class="thumbs"></div>
          <p class="hint">${isHoodie ? 'Tap main studio image to enlarge · Select thumbnails to inspect back and garment craft details.' : 'Tap main photo to enlarge · Select thumbnails to explore studio lifestyle styling and Dhaka atelier views.'}</p>
        </div>

        <div class="detail-info">
          <div class="eyebrow">${isHoodie ? `Drop 01 · ${esc(tierLabel)}` : `Fariza&#39;s Territory · ${esc(collectionCrumb)}`}</div>
          <h1>${esc(p.name)}</h1>
          ${p.bengali_name ? `<h2 class="bn" style="font-size:1.1rem;color:var(--mute);margin:4px 0 10px;font-weight:600;">${esc(p.bengali_name)}</h2>` : ''}
          <span class="smallcaps muted">SKU · <span id="detailSku">${esc(firstDocVariant?.sku || p.id)}</span></span>
          <div class="detail-price" style="margin:14px 0;">৳${Number(p.price_bdt).toLocaleString('en-BD')}</div>
          <div class="separator"></div>
          <div class="detail-choice"><strong>${isHoodie ? '4-Color Working Palette' : 'Artisan Finish'}</strong><span class="smallcaps muted">${slotCount} Colorway ${slotCount === 1 ? 'Edition' : 'Slots'}</span></div>
          <div id="detailColors" class="variant-buttons"></div>
          <p class="description">${esc(p.copy_en)}</p>
          <p class="description bn" lang="bn">${esc(p.copy_bn)}</p>
          <div class="separator"></div>
          <div id="detailSize"></div>
          <button id="purchaseBtn" class="btn purchase-btn" type="button" style="width:100%;margin-top:20px;">${isPublishedLive ? `Add to Bag — ৳${Number(p.price_bdt).toLocaleString('en-BD')}` : 'Check Availability'}</button>
          <p id="purchaseStatus" class="hint">${isPublishedLive ? `In stock (${Number(firstDocVariant.stock_quantity || 25)} units) · Cash on Delivery across Bangladesh` : 'Checking publication and stock readiness…'}</p>
          <div style="margin-top:10px;">
            <a id="whatsappBtn" href="https://wa.me/8801778307704" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="width:100%;border-color:#15803d;color:#15803d;">Inquire via WhatsApp (01778307704)</a>
          </div>

          <div class="specs">${specsHtml}</div>
          <div class="notice"><strong>Cash on Delivery:</strong> Available across all 64 districts of Bangladesh with doorstep parcel inspection. Studio support: <strong>01778307704</strong>.</div>
          <p style="margin-top:24px;"><a class="link-arrow" href="../shop.html">← Back to Full Collection</a></p>
        </div>
      </div>
    </div>
  </main>

  <div class="sticky-mobile-bar visible" aria-label="Quick purchase bar">
    <div style="min-width:0;">
      <strong style="display:block;font-size:0.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.name)}</strong>
      <small id="mobileStickyLabel" style="font-family:var(--font-mono);font-size:0.72rem;color:rgba(243,239,230,0.78);">${esc(firstDocVariant?.color || '')} · ৳${Number(p.price_bdt).toLocaleString('en-BD')}</small>
    </div>
    <button id="mobileStickyBtn" type="button" class="btn btn-light btn-sm">Add to Bag</button>
  </div>

  ${renderFooter({ base: '../' })}
</body>
</html>`;

  fs.writeFileSync(path.join(PRODUCTS_DIR, `${p.slug}.html`), pdpHtml, 'utf8');
  if (isHoodie) hoodiePages++;
  else accessoryPages++;
}

// 3. Sitemap & robots.txt
const staticRoutes = [
  'index.html',
  'shop.html',
  'about.html',
  'shipping.html',
  'returns.html',
  'contact.html',
  'privacy.html',
  'terms.html'
];
const today = new Date().toISOString().split('T')[0];
const sitemapEntries = [
  ...staticRoutes.map(
    (r) => `  <url><loc>https://starkit-drop01-store.vercel.app/${r}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`
  ),
  ...products.map(
    (p) => `  <url><loc>https://starkit-drop01-store.vercel.app/products/${esc(p.slug)}.html</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`
  )
];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml, 'utf8');

const robotsTxt = `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\nSitemap: https://starkit-drop01-store.vercel.app/sitemap.xml\n`;
fs.writeFileSync(path.join(ROOT, 'robots.txt'), robotsTxt, 'utf8');

console.log(`Generated ${INFO_PAGES.length} info pages, ${hoodiePages} hoodie PDPs, ${accessoryPages} accessory PDPs, sitemap.xml, and robots.txt.`);
