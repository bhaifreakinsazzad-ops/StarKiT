import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const allHtmlFiles = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== 'admin.html').map((f) => path.join(ROOT, f)),
  ...fs.readdirSync(path.join(ROOT, 'products')).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, 'products', f))
];

console.log(`Auditing brand lockups across ${allHtmlFiles.length} storefront HTML files...`);

let missingLogo = 0;
for (const filePath of allHtmlFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('starkit-logo-dark.png') || !content.includes('starkit-logo-transparent.png') || !content.includes('starkit-favicon.png')) {
    console.warn(`Missing derived brand logo lockup in: ${path.relative(ROOT, filePath)}`);
    missingLogo++;
  }
}

if (missingLogo > 0) {
  throw new Error(`${missingLogo} HTML file(s) missing brand logo assets.`);
}

console.log(`Branding check complete: all ${allHtmlFiles.length} storefront pages use consistent logo lockups.`);
