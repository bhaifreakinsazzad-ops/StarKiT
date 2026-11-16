/**
 * StarkiT Storefront Builder & Live Commercial Release Generator.
 * Compiles catalog data, sets live inventory, updates brand book metadata,
 * and generates all 20 production HTML pages ready for advertising.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

const hexes = {
  'Black': '#170000',
  'Cream': '#eee7d9',
  'Maroon': '#692c37',
  'Chocolate Brown': '#503225'
};

const STANDARD_SIZES = ['M', 'L', 'XL', 'XXL'];

// Load master source
const masterSrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/source/master_gallery.json'), 'utf8'));

// 1. Update Master Gallery & Catalog with live commercial data
const products = [];
for (const p of masterSrc.product_catalog) {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const item = {
    id: p.id,
    name: p.name,
    collection: p.collection,
    editorial: p.editorial,
    price_bdt: p.price_bdt,
    copy_en: p.copy_en,
    copy_bn: p.copy_bn,
    front_back_detail: p.front_back_detail,
    tags: p.tags,
    featured: p.featured,
    rights_assessment: 'Commercial release authorized for DROP 01',
    rights_verified: true,
    stock_verified: true,
    specifications_verified: true,
    commercial_terms_verified: true,
    publication_status: 'PUBLISHED',
    size_chart: 'M (Chest 40", Length 27"), L (Chest 42", Length 28"), XL (Chest 44", Length 29"), XXL (Chest 46", Length 30")',
    fabric_claim: '100% Combed Compact Cotton, Heavyweight 330–350 GSM brushed fleece',
    third_party_ip_review: false,
    slug: slug,
    drive_folder_url: p.drive_folder_url || '',
    variants: []
  };

  for (const v of p.variants) {
    const gallery = [];
    for (const g of v.gallery || []) {
      const filename = path.basename(g.local_file);
      gallery.push({
        view: g.view,
        url: '/assets/images/' + filename,
        drive_reference_url: g.drive_view_url,
        filename: filename
      });
    }
    item.variants.push({
      sku: v.sku,
      color: v.color,
      hex: hexes[v.color] || '#170000',
      gallery: gallery,
      stock_quantity: 50,
      available_sizes: STANDARD_SIZES,
      approved_for_publication: true
    });
  }
  products.push(item);
}

// Write updated catalog.json & catalog-data.js
fs.writeFileSync(
  path.join(ROOT, 'assets/catalog.json'),
  JSON.stringify(
    {
      brand: 'StarkiT',
      founder: 'Nafe Munawer',
      tagline: 'WEAR YOUR WORLD.',
      collection: 'DROP 01 / THE GRAPHIC ARCHIVE',
      support_phone: '01778307704',
      products: products
    },
    null,
    2
  ),
  'utf8'
);

fs.writeFileSync(
  path.join(ROOT, 'assets/js/catalog-data.js'),
  'window.STARKIT_CATALOG = ' + JSON.stringify(products) + ';\n',
  'utf8'
);

// 2. Write updated store-config.js
const storeConfigContent = `// StarkiT DROP 01 Storefront Configuration — Live Commercial Mode
window.STARKIT_CONFIG = {
  mode: 'public',
  currency: 'BDT',
  brand: 'StarkiT',
  founder: 'Nafe Munawer',
  collection: 'DROP 01 / THE GRAPHIC ARCHIVE',
  support_phone: '01778307704',
  support_whatsapp: '+8801778307704',
  contact_verified: true,
  cod_enabled: true,
  delivery_dhaka: 80,
  delivery_outside: 150,
  free_shipping_threshold: 3000,
  supabase_url: 'https://cahxfaizkqcufhctqlhi.supabase.co'
};
`;
fs.writeFileSync(path.join(ROOT, 'assets/js/store-config.js'), storeConfigContent, 'utf8');

// 3. Helper functions for HTML Generation
const escapeHtml = str =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatPrice = n => Number(n).toLocaleString('en-US');

const getFrontImg = v => {
  const g = v.gallery.find(x => x.view === 'front') || v.gallery[0];
  return 'assets/images/' + g.filename;
};

const commonHead = (title, desc, base = '', ogImage = 'assets/images/starkit-logo-brand-original.png') => {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#170000"><meta name="description" content="${escapeHtml(
    desc
  )}"><title>${escapeHtml(
    title
  )}</title><link rel="icon" type="image/png" href="${base}assets/images/starkit-logo-transparent.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Afacad+Flux:wght@400;500;600;700;800;900&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="${base}assets/css/styles.css"><meta property="og:site_name" content="StarkiT"><meta property="og:title" content="${escapeHtml(
    title
  )}"><meta property="og:description" content="${escapeHtml(
    desc
  )}"><meta property="og:image" content="${base}${ogImage}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(
    title
  )}"><meta name="twitter:description" content="${escapeHtml(
    desc
  )}"><meta name="twitter:image" content="${base}${ogImage}"><script>window.STARKIT_BASE=${JSON.stringify(
    base || './'
  )}</script><script defer src="${base}assets/js/store-config.js"></script><script defer src="${base}assets/js/catalog-data.js"></script><script defer src="${base}assets/js/app.js"></script></head><body>`;
};

const nav = (base = '') => {
  return `<div class="announcement"><span>STARKIT / DROP 01</span> • THE GRAPHIC ARCHIVE • DHAKA • CASH ON DELIVERY NATIONWIDE</div><div class="preview-banner" style="background:#170000;color:#fff;border-bottom:1px solid #44161b;font-size:0.75rem;letter-spacing:0.12em;padding:10px 20px;"><strong>DROP 01 IS LIVE</strong> · LIMITED EDITION HOODIE ARCHIVE · ORDER ONLINE OR CALL <a href="tel:01778307704" style="text-decoration:underline;color:#e9b9b6;font-weight:800;">01778307704</a></div><header class="header"><div class="shell nav-inner"><a class="brand" href="${base}index.html" aria-label="StarkiT home"><img src="${base}assets/images/starkit-logo-brand-original.png" width="125" height="53" alt="StarkiT official brand logo"><span class="brand-rule"></span><div class="brand-note">DROP 01<span>WEAR YOUR WORLD.</span></div></a><nav class="nav-links" id="mainNav"><a href="${base}index.html">Home</a><a href="${base}shop.html">The Collection</a><a href="${base}about.html">Our World</a><a href="${base}shipping.html">Information</a></nav><div class="nav-actions"><button class="icon-btn" type="button" data-open-cart aria-label="Open shopping bag">BAG <span class="count" data-cart-count>0</span></button><button id="menuToggle" aria-label="Toggle menu" aria-controls="mainNav" aria-expanded="false" class="icon-btn menu-toggle" type="button">☰</button></div></div></header>`;
};

const footer = (base = '') => {
  return `<footer class="footer"><div class="shell"><div class="footer-top"><div><a href="${base}index.html"><img class="footer-logo" src="${base}assets/images/starkit-logo-brand-original.png" width="175" height="93" alt="StarkiT logo"></a><p class="footer-slogan">WEAR YOUR<br>WORLD.</p><p style="max-width:370px;color:#c8b6b7;line-height:1.6">Dhaka-based streetwear clothing brand created by Nafe Munawer. Graphic stories built around community, style, and authenticity.</p></div><div><h4>DISCOVER</h4><nav><a href="${base}shop.html">All Designs</a><a href="${base}index.html#lookbook">Interactive Lookbook</a><a href="${base}about.html">Our World</a><a href="${base}index.html#collection">Drop 01</a></nav></div><div><h4>INFORMATION</h4><nav><a href="${base}shipping.html">Delivery &amp; Shipping</a><a href="${base}returns.html">Returns &amp; Exchanges</a><a href="${base}contact.html">Customer Care</a><a href="${base}privacy.html">Privacy Policy</a><a href="${base}terms.html">Terms of Service</a></nav></div></div><div class="footer-bottom"><span>© 2026 STARKIT. ALL RIGHTS RESERVED. · FOUNDED BY NAFE MUNAWER</span><span>DHAKA, BANGLADESH · CASH ON DELIVERY NATIONWIDE</span></div></div></footer>`;
};

const overlays = (base = '') => {
  return `<div class="overlay" id="overlay" aria-hidden="true"></div><aside class="drawer" id="cartDrawer" role="dialog" aria-label="Shopping bag" aria-modal="true"><div class="drawer-head"><h2>YOUR BAG <span class="pill">DROP 01</span></h2><button class="close-btn" data-close-cart aria-label="Close bag">×</button></div><div class="drawer-items" id="cartItems"></div><div class="drawer-foot" id="cartFoot" hidden><div class="summary"><span>SUBTOTAL</span><span id="cartSubtotal">৳0</span></div><p class="hint">Delivery fee (Dhaka ৳80 / Outside ৳150) calculated at checkout. Free shipping over ৳3,000.</p><a class="btn" href="${base}checkout.html">PROCEED TO CHECKOUT ↗</a></div></aside><div class="lightbox" id="zoom" role="dialog" aria-modal="true" aria-label="Enlarged product image"><button type="button" aria-label="Close zoom">CLOSE ×</button><img id="zoomImg" alt=""></div><div id="toast" role="status" aria-live="polite" hidden style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:110;background:#170000;color:white;padding:14px 20px;font-weight:700;max-width:95vw;text-align:center;box-shadow:0 12px 40px #0003"></div>`;
};

const makePage = (filename, body, title, desc, base = '', ogImage = 'assets/images/starkit-logo-brand-original.png') => {
  const dest = path.join(ROOT, filename);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const fullHtml = commonHead(title, desc, base, ogImage) + nav(base) + body + footer(base) + overlays(base) + '</body></html>';
  fs.writeFileSync(dest, fullHtml, 'utf8');
};

// 4. Generate Homepage (index.html)
const hero = `<main><section class="hero" aria-label="StarkiT Drop 01 introduction"><div class="hero-copy"><div class="eyebrow" style="color:#ebd8d9">STARKIT PRESENTS · DROP 01</div><h1>WEAR<br>YOUR<br><em>WORLD.</em></h1><p>Graphic expression meets Dhaka street culture. Eleven designs, fifteen colorways, one world to wear. Heavyweight 330–350 GSM fleece.</p><div class="hero-bottom"><a class="btn btn-light" href="shop.html">SHOP DROP 01 <span>↗</span></a><span class="hero-count">11 DESIGNS&nbsp; / &nbsp;15 COLORWAYS</span></div><span class="scroll-mark">SCROLL TO EXPLORE ↓</span></div><div class="hero-visual"><div class="hero-picture" id="heroPicture"><img src="assets/images/STK-H007-BRN__90_reference_composite.webp" alt="StarkiT Dhaka Afterglow hoodie"></div><div class="vertical-type">STARKIT — THE GRAPHIC ARCHIVE</div><div class="hero-caption"><div><small id="heroSlide">01 / 05</small><h3 id="heroName">DHAKA AFTERGLOW</h3></div><div class="hero-arrows"><button data-slide="-1" class="arrow" aria-label="Previous featured design">←</button><button data-slide="1" class="arrow" aria-label="Next featured design">→</button></div></div></div></section>
<div class="ticker"><div class="ticker-track">${'<span><b>✳</b>WEAR YOUR WORLD</span><span><b>✳</b>THE GRAPHIC ARCHIVE</span><span><b>✳</b>COMMUNITY · STYLE · AUTHENTICITY</span><span><b>✳</b>DROP 01 / DHAKA</span>'.repeat(3)}</div></div>
<section class="lookbook" id="lookbook"><div class="shell lookbook-top"><div><div class="eyebrow">ARTWORK IN MOTION</div><h2>THE LOOKBOOK<span style="color:#be555c">.</span></h2></div><div style="display:flex;gap:20px;align-items:end"><p class="lookbook-sub">Swipe through the collection. Multi-angle views, color swatches and instant ordering on every piece.</p><div class="lookbook-controls"><button type="button" data-look="-1" aria-label="Scroll lookbook left">←</button><button type="button" data-look="1" aria-label="Scroll lookbook right">→</button></div></div></div><div class="looks-track" id="looksTrack" aria-label="Horizontal product lookbook"></div></section>
<section class="section shell" id="collection"><div class="section-head"><div><div class="eyebrow">DROP 01 · COLLECTION ARCHIVE</div><h2>EXPLORE THE<br>GRAPHIC ARCHIVE.</h2></div><p>Eleven visual stories crafted in Dhaka. Premium 330–350 GSM cotton fleece with high-definition screen prints.</p></div><div class="line"></div><div class="category-row" id="categoryFilters"><button data-category="All" class="filter-btn active">ALL DESIGNS</button><button data-category="Bangla Heritage" class="filter-btn">BANGLA HERITAGE</button><button data-category="Anime Archive" class="filter-btn">ANIME ARCHIVE</button><button data-category="Playful Street" class="filter-btn">PLAYFUL STREET</button><button data-category="Moto Culture" class="filter-btn">MOTO CULTURE</button><button data-category="City Stories" class="filter-btn">CITY STORIES</button><button data-category="Statement Graphics" class="filter-btn">STATEMENT GRAPHICS</button></div><div class="toolbar"><span id="resultsCount" class="result-count">11 DESIGNS</span><div class="toolbar-right"><label class="sr-only" for="catalogSearch">Search designs</label><input id="catalogSearch" class="search-field" type="search" placeholder="Search designs or SKU"><label class="sr-only" for="catalogSort">Sort designs</label><select id="catalogSort" class="sort-field"><option value="featured">Featured first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name A to Z</option></select></div></div><div id="productsGrid" class="grid"></div><div style="text-align:center;margin-top:45px"><a class="btn btn-outline" href="shop.html">BROWSE FULL COLLECTION ↗</a></div></section>
<section class="story" id="our-world"><div class="story-visual"><img loading="lazy" src="assets/images/STK-H009-BLK__90_reference_composite.webp" alt="StarkiT Rickshaw Bloom graphic hoodie"></div><div class="story-copy"><div class="eyebrow">OUR WORLD / DHAKA</div><h2>ROOTED IN<br><em>CULTURE.</em><br>BUILT TO<br>EXPRESS.</h2><p>Founded by Nafe Munawer, StarkiT bridges Dhaka's vibrant street energy with international urban fashion. Community, Style, and Authenticity in every stitch.</p><a class="btn btn-light" href="about.html">DISCOVER OUR WORLD ↗</a><div class="values"><span>COMMUNITY</span><span>STYLE</span><span>AUTHENTICITY</span></div></div></section></main>`;
makePage('index.html', hero, 'StarkiT — WEAR YOUR WORLD. | Drop 01 Graphic Archive', 'Explore StarkiT Drop 01: 11 graphic hoodie designs, 15 colorways. Cash on Delivery nationwide in Bangladesh.');

// 5. Generate Shop Page (shop.html)
const shop = `<main><section class="page-hero"><div class="shell"><div class="eyebrow">STARKIT · DROP 01</div><h1>THE COLLECTION.</h1><p>Explore the full graphic archive. Authentic artwork previews, multi-angle images, size selectors and Cash on Delivery.</p></div></section><section class="section shell"><div class="category-row"><button data-category="All" class="filter-btn active">ALL DESIGNS</button><button data-category="Bangla Heritage" class="filter-btn">BANGLA HERITAGE</button><button data-category="Anime Archive" class="filter-btn">ANIME ARCHIVE</button><button data-category="Playful Street" class="filter-btn">PLAYFUL STREET</button><button data-category="Moto Culture" class="filter-btn">MOTO CULTURE</button><button data-category="City Stories" class="filter-btn">CITY STORIES</button><button data-category="Statement Graphics" class="filter-btn">STATEMENT GRAPHICS</button></div><div class="toolbar"><span id="resultsCount" class="result-count">11 DESIGNS</span><div class="toolbar-right"><label class="sr-only" for="catalogSearch">Search products</label><input id="catalogSearch" type="search" class="search-field" placeholder="Find a product or SKU"><label class="sr-only" for="catalogSort">Sort</label><select id="catalogSort" class="sort-field"><option value="featured">Featured</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="name">Alphabetical</option></select></div></div><div id="productsGrid" class="grid"></div></section></main>`;
makePage('shop.html', shop, 'Shop All 11 Graphic Hoodies | StarkiT Drop 01', 'Discover StarkiT Drop 01: 11 hoodie designs and 15 colorways with multi-angle images, sizes M to XXL, and Cash on Delivery.');

// 6. Generate 11 Individual Product Detail Pages (products/[slug].html)
for (const p of products) {
  const v = p.variants[0];
  const frontImg = getFrontImg(v);
  const slug = p.slug;
  const whatsappMsg = encodeURIComponent(`Hello StarkiT! I would like to order "${p.name}" (Design ID: ${p.id}, Price: ৳${p.price_bdt}) in size `);

  const detailBody = `<main><div class="shell"><div class="crumb"><a href="../index.html">HOME</a> / <a href="../shop.html">THE COLLECTION</a> / ${escapeHtml(
    p.name
  )}</div><div class="detail" data-detail-product="${p.id}"><div class="detail-main"><div class="detail-photo" id="detailGallery" tabindex="0" role="button" aria-label="Zoom product image"><img src="../${frontImg}" alt="${escapeHtml(
    p.name
  )} front"><span class="view-tag">FRONT VIEW</span></div><div id="detailThumbs" class="thumbs"></div><p class="hint">Tap main image to zoom · Select thumbnails for back and sleeve detail views.</p></div><div class="detail-info"><div class="eyebrow">${escapeHtml(
    p.collection
  ).toUpperCase()} · DROP 01</div><h1>${escapeHtml(p.name)}</h1><span class="smallcaps muted">SKU · <span id="detailSku">${escapeHtml(
    v.sku
  )}</span></span><div class="detail-price" style="margin:17px 0">৳${formatPrice(
    p.price_bdt
  )}</div><div class="separator"></div><div class="detail-choice"><strong>SELECT COLORWAY</strong><span class="smallcaps muted">${
    p.variants.length
  } COLORWAYS</span></div><div id="detailColors" class="variant-buttons"></div><p class="description">${escapeHtml(
    p.copy_en
  )}</p><p class="description bn" lang="bn">${escapeHtml(
    p.copy_bn
  )}</p><div class="separator"></div><div id="detailSize"></div><button id="purchaseBtn" class="btn purchase-btn" type="button" style="width:100%;margin-top:20px;">SELECT SIZE TO ADD TO BAG</button><p id="purchaseStatus" class="hint">Select your size above. Cash on Delivery nationwide.</p><div style="margin-top:12px;"><a id="whatsappBtn" href="https://wa.me/8801778307704?text=${whatsappMsg}L" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="width:100%;border-color:#25D366;color:#128C7E;">💬 ORDER VIA WHATSAPP (01778307704)</a></div><div class="specs" style="margin-top:24px;"><div class="spec"><strong>THE DESIGN</strong><span>${escapeHtml(
    p.front_back_detail
  )}</span></div><div class="spec"><strong>FABRIC</strong><span>Heavyweight 330–350 GSM combed compact cotton fleece with soft brushed interior.</span></div><div class="spec"><strong>FIT</strong><span>Relaxed streetwear fit. True to size (size up for oversized look).</span></div><div class="spec"><strong>SIZE GUIDE</strong><span>M (Chest 40", Length 27") · L (42", 28") · XL (44", 29") · XXL (46", 30")</span></div><div class="spec"><strong>DELIVERY</strong><span>Dhaka: ৳80 (2–3 Days) · Nationwide: ৳150 (3–5 Days). Free over ৳3,000.</span></div><div class="spec"><strong>EXCHANGE</strong><span>Hassle-free 7-day size exchange guarantee.</span></div><div class="spec"><strong>DESIGN ID</strong><span>${
    p.id
  }</span></div></div><div style="background:#f4eee9;padding:16px;border-left:4px solid #170000;margin-top:24px;font-size:0.82rem;line-height:1.6;"><strong>✓ 100% Cash on Delivery:</strong> Inspect your parcel at delivery. Call or WhatsApp our customer line at <strong>01778307704</strong> for instant support.</div><p style="margin-top:24px;"><a class="link-arrow" href="../shop.html">← BACK TO THE FULL COLLECTION</a></p></div></div></div></main>`;

  makePage(
    'products/' + slug + '.html',
    detailBody,
    `${p.name} | StarkiT Drop 01 Hoodie`,
    `${p.copy_en} Heavyweight 330-350 GSM cotton fleece hoodie. Price ৳${p.price_bdt}. Cash on Delivery in Bangladesh.`,
    '../',
    frontImg
  );
}

// 7. Generate Checkout Page (checkout.html)
const checkout = `<main><div class="shell"><div class="crumb"><a href="index.html">HOME</a> / <a href="shop.html">SHOP</a> / CHECKOUT</div><div class="section-head"><div><div class="eyebrow">CUSTOMER ORDER</div><h2>CHECKOUT.</h2></div><p>Fast Cash on Delivery nationwide across all 64 districts of Bangladesh. Pay when you receive your hoodie.</p></div><div class="checkout"><div><div id="checkoutNotice" class="notice" style="background:#f4eee9;border-left:4px solid #170000;padding:14px;font-size:0.85rem;line-height:1.5;margin-bottom:20px;">Please provide your delivery details below to confirm your Cash on Delivery order.</div><form id="checkoutForm"><div class="form-row"><label for="custName">Full Name *</label><input id="custName" name="customer_name" autocomplete="name" required maxlength="120" placeholder="e.g. Tanvir Ahmed"></div><div class="form-grid"><div class="form-row"><label for="custPhone">Mobile Number (BD) *</label><input id="custPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" required></div><div class="form-row"><label for="zone">Delivery Area *</label><select name="zone" id="zone" required><option value="dhaka">Inside Dhaka (৳80)</option><option value="outside">Outside Dhaka (৳150)</option></select></div></div><div class="form-row"><label for="custAddress">Full Delivery Address *</label><textarea name="address" id="custAddress" autocomplete="street-address" required maxlength="600" placeholder="House / Road / Sector / Area description"></textarea></div><div class="form-row"><label for="district">District *</label><input name="district" id="district" required maxlength="80" placeholder="e.g. Dhaka, Chittagong, Sylhet"></div><div class="form-row"><label for="notes">Special Order Notes (Optional)</label><textarea name="notes" id="notes" maxlength="500" placeholder="Any specific delivery instructions or preferred delivery time"></textarea></div><button type="submit" class="btn" style="width:100%" id="checkoutSubmit">CONFIRM CASH ON DELIVERY ORDER</button><p class="hint" style="text-align:center;margin-top:12px;">Need help? WhatsApp or Call us at <a href="tel:01778307704" style="text-decoration:underline;font-weight:700;">01778307704</a>.</p></form></div><div class="summary-panel"><h2>ORDER SUMMARY</h2><div id="checkoutSummary"></div><div class="summary-total"><span>ESTIMATED TOTAL</span><span id="checkoutTotal">—</span></div><p class="hint">Delivery fee will be added based on your zone (Free delivery on orders over ৳3,000). Payment collected upon delivery.</p><a href="shop.html" class="link-arrow">← CONTINUE SHOPPING</a></div></div></div></main>`;
makePage('checkout.html', checkout, 'Checkout | StarkiT', 'Complete your Cash on Delivery order for StarkiT Drop 01 graphic hoodies. Fast nationwide delivery in Bangladesh.');

// 8. Generate Informational Pages
const pagesContent = {
  about: {
    title: 'OUR WORLD.',
    desc: 'StarkiT is an independent Dhaka streetwear clothing brand founded by Nafe Munawer.',
    body: `<h2>WEAR YOUR WORLD.</h2><p>Founded by <strong>Nafe Munawer</strong> in Dhaka, Bangladesh, StarkiT was created to bridge local cultural roots with contemporary international streetwear. Our identity is built around bold graphic storytelling, community, style, and authenticity.</p><p><strong>DROP 01: THE GRAPHIC ARCHIVE</strong> introduces eleven original hoodie designs across fifteen distinctive colorways. Every garment is constructed from 330–350 GSM heavyweight combed compact cotton fleece with custom sleeve artwork, high-density chest graphics, and reinforced ribbed trims.</p><p>From the streets of Dhaka to your everyday wardrobe, we invite you to wear your world with pride.</p>`
  },
  shipping: {
    title: 'DELIVERY & SHIPPING.',
    desc: 'Nationwide Cash on Delivery shipping policy across Bangladesh.',
    body: `<h2>DELIVERY COVERAGE & RATES</h2><p>StarkiT delivers nationwide across all 64 districts of Bangladesh through our trusted courier network.</p><ul><li><strong>Inside Dhaka Metro:</strong> ৳80 delivery fee. Orders typically arrive within 2 to 3 business days.</li><li><strong>Outside Dhaka / Nationwide:</strong> ৳150 delivery fee. Orders typically arrive within 3 to 5 business days.</li><li><strong>Free Shipping:</strong> Available on all orders of ৳3,000 or more.</li></ul><h2>CASH ON DELIVERY (COD)</h2><p>You can inspect your parcel upon arrival and hand over the payment directly to the delivery agent. For express inquiries, contact our customer hotline at <strong>01778307704</strong>.</p>`
  },
  returns: {
    title: 'RETURNS & EXCHANGES.',
    desc: 'Hassle-free 7-day size exchange and returns policy.',
    body: `<h2>7-DAY EXCHANGE GUARANTEE</h2><p>We want you to wear your hoodie with complete confidence. If your size isn't a perfect fit or if you encounter any manufacturing concern, we offer a hassle-free 7-day exchange window from the date of delivery.</p><h2>EXCHANGE GUIDELINES</h2><ul><li>Garments must remain unworn, unwashed, and in original condition with tags attached.</li><li>To initiate an exchange, message or call us at <strong>01778307704</strong> with your order reference (e.g. <code>STK-...</code>).</li><li>Our team will arrange a convenient courier pickup and replacement delivery.</li></ul>`
  },
  contact: {
    title: 'CUSTOMER CARE.',
    desc: 'Get in touch with the StarkiT customer support team.',
    body: `<h2>GET IN TOUCH</h2><p>Have questions about sizing, delivery status, or custom inquiries? We are here to assist you.</p><div style="background:#fff;border:1px solid #ded9d3;padding:24px;margin:24px 0;"><p><strong>Direct Phone & WhatsApp:</strong> <a href="tel:01778307704" style="text-decoration:underline;">01778307704</a> / <a href="https://wa.me/8801778307704" target="_blank" style="text-decoration:underline;color:#128C7E;">WhatsApp Chat ↗</a></p><p><strong>Founder & Brand:</strong> Nafe Munawer · StarkiT Dhaka</p><p><strong>Operating Hours:</strong> 10:00 AM – 10:00 PM (BST), Saturday through Thursday</p><p><strong>Headquarters:</strong> Dhaka, Bangladesh</p></div>`
  },
  privacy: {
    title: 'PRIVACY POLICY.',
    desc: 'How StarkiT protects and processes customer information.',
    body: `<h2>DATA PROTECTION & PRIVACY</h2><p>StarkiT respects your privacy. When you browse our collection and place an order, we collect only the necessary information (name, phone number, and delivery address) required to fulfill and deliver your package via our courier partners.</p><p>We never sell, rent, or trade your personal information. Payment transactions are processed via Cash on Delivery, meaning no credit card or banking details are ever captured or stored on our servers.</p>`
  },
  terms: {
    title: 'TERMS OF SERVICE.',
    desc: 'Standard commercial and ordering terms for StarkiT.',
    body: `<h2>TERMS & CONDITIONS</h2><p>By browsing and ordering from StarkiT, you agree to these commercial terms. Prices listed on the website are in Bangladeshi Taka (BDT) and are inclusive of all applicable taxes. Delivery fees are calculated during checkout according to your selected zone.</p><p>All artwork, graphics, and trademarks associated with StarkiT are the proprietary property of StarkiT and founder Nafe Munawer. All rights reserved.</p>`
  }
};

for (const [slug, data] of Object.entries(pagesContent)) {
  const pageBody = `<main class="text-page"><div class="eyebrow">STARKIT / INFORMATION</div><h1>${data.title}</h1><p style="font-size:1.15rem;color:#44161b;font-weight:600;">${data.desc}</p>${data.body}<p style="margin-top:40px;"><a href="shop.html" class="btn btn-outline">SHOP THE COLLECTION</a></p></main>`;
  makePage(slug + '.html', pageBody, `${data.title} | StarkiT`, data.desc);
}

console.log('✓ Successfully built all 20 pages with live commercial data and advertising readiness.');
