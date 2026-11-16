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

console.log(`Auditing ${allHtmlFiles.length} HTML files...`);

let updatedCount = 0;

for (const filePath of allHtmlFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  const isProductSubdir = filePath.includes(path.sep + 'products' + path.sep);
  const prefix = isProductSubdir ? '../' : '';

  // 1. Ensure Google fonts includes Amiri for Arabic calligraphy
  if (content.includes('fonts.googleapis.com') && !content.includes('Amiri')) {
    content = content.replace(
      /family=Afacad\+Flux:wght@400;500;600;700;800;900&family=Hind\+Siliguri:wght@400;500;600;700/g,
      'family=Afacad+Flux:wght@400;500;600;700;800;900&family=Amiri:wght@400;700&family=Hind+Siliguri:wght@400;500;600;700'
    );
  }

  // 2. Ensure anime.min.js and type="module" for app.js
  const badScriptTag = new RegExp(`<script defer src="${prefix}assets/js/app.js"></script>`, 'g');
  if (badScriptTag.test(content)) {
    content = content.replace(
      badScriptTag,
      `<script defer src="${prefix}assets/js/vendor/anime.min.js"></script><script type="module" src="${prefix}assets/js/app.js"></script>`
    );
  }

  // Also check plain script without defer
  const badScriptTag2 = new RegExp(`<script src="${prefix}assets/js/app.js"></script>`, 'g');
  if (badScriptTag2.test(content)) {
    content = content.replace(
      badScriptTag2,
      `<script defer src="${prefix}assets/js/vendor/anime.min.js"></script><script type="module" src="${prefix}assets/js/app.js"></script>`
    );
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`Updated scripts & fonts in: ${path.relative(ROOT, filePath)}`);
  }
}

console.log(`Audit complete: ${updatedCount} files updated with type="module" and anime.js.`);
