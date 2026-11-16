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

console.log(`Injecting Motion.dev into ${allHtmlFiles.length} HTML files...`);

let updated = 0;

for (const filePath of allHtmlFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isProductSubdir = filePath.includes(path.sep + 'products' + path.sep);
  const prefix = isProductSubdir ? '../' : '';

  if (content.includes('motion.js')) {
    continue;
  }

  const target = `<script defer src="${prefix}assets/js/vendor/anime.min.js"></script>`;
  const replacement = `<script defer src="${prefix}assets/js/vendor/anime.min.js"></script><script defer src="${prefix}assets/js/vendor/motion.js"></script>`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
  }
}

console.log(`Successfully injected Motion.dev into ${updated} HTML files!`);
