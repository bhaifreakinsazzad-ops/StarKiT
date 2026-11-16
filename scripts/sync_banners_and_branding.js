import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const allHtmlFiles = [
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => path.join(ROOT, f)),
  ...fs.readdirSync(path.join(ROOT, 'products')).filter(f => f.endsWith('.html')).map(f => path.join(ROOT, 'products', f))
];

console.log(`Synchronizing brand banners across ${allHtmlFiles.length} HTML files...`);

let updated = 0;

const oldAnnounce = '<div class="announcement"><span>STARKIT / DROP 01</span> • THE GRAPHIC ARCHIVE • DHAKA • CASH ON DELIVERY NATIONWIDE</div>';
const newAnnounce = '<div class="announcement"><span>STARKIT · LUXURY BANGLADESH</span> • DROP 01 &amp; 02 • WEAR YOUR WORLD • CASH ON DELIVERY NATIONWIDE</div>';

const oldPreview = '<div class="preview-banner" style="background:#170000;color:#fff;border-bottom:1px solid #44161b;font-size:0.75rem;letter-spacing:0.12em;padding:10px 20px;"><strong>DROP 01 IS LIVE</strong> · LIMITED EDITION HOODIE ARCHIVE · ORDER ONLINE OR CALL <a href="tel:01778307704" style="text-decoration:underline;color:#e9b9b6;font-weight:800;">01778307704</a></div>';
const newPreview = '<div class="preview-banner" style="background:#170000;color:#fff;border-bottom:1px solid #44161b;font-size:0.75rem;letter-spacing:0.12em;padding:10px 20px;"><strong>DROP 01 &amp; 02 ARE LIVE</strong> · 46 MASTER DESIGNS &middot; 50 SKUS · ORDER ONLINE OR CALL <a href="tel:01778307704" style="text-decoration:underline;color:#e9b9b6;font-weight:800;">01778307704</a></div>';

const oldBrandNote = '<div class="brand-note">DROP 01<span>WEAR YOUR WORLD.</span></div>';
const newBrandNote = '<div class="brand-note">DROP 01 &amp; 02<span style="font-family:\'Amiri\',serif;letter-spacing:0.18em;color:#c5a880;font-size:0.85rem;">ستاركيت</span><span>WEAR YOUR WORLD.</span></div>';

for (const filePath of allHtmlFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  if (content.includes(oldAnnounce)) {
    content = content.replace(oldAnnounce, newAnnounce);
  }
  if (content.includes(oldPreview)) {
    content = content.replace(oldPreview, newPreview);
  }
  if (content.includes(oldBrandNote)) {
    content = content.replace(oldBrandNote, newBrandNote);
  }

  // Also ensure pill in cart drawer says DROP 01 & 02
  content = content.replace(
    '<div class="drawer-head"><h2>YOUR BAG <span class="pill">DROP 01</span></h2>',
    '<div class="drawer-head"><h2>YOUR BAG <span class="pill">DROP 01 &amp; 02</span></h2>'
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
  }
}

console.log(`Branding sync complete: ${updated} files updated.`);
