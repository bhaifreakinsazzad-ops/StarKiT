/**
 * StarkiT — Master Client Handover & Distribution Packaging Script
 * Builds StarkiT_DROP01_Hoodies_Complete_Store/ and StarkiT_DROP01_Hoodies_Complete_Store.zip
 * containing the complete production storefront, serverless APIs, media assets, canonical catalogs,
 * Supabase migrations (001-005), test suite, and documentation.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG_NAME = 'StarkiT_DROP01_Hoodies_Complete_Store';
const PKG_DIR = path.join(ROOT, PKG_NAME);
const ZIP_FILE = path.join(ROOT, `${PKG_NAME}.zip`);

console.log('================================================================');
console.log('STARKIT — BUILDING CLIENT HANDOVER & PRODUCTION ARCHIVE');
console.log(`Target: ${PKG_NAME}.zip`);
console.log('================================================================');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.vercel' || entry.name === PKG_NAME) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Clean previous build directory & archive
if (fs.existsSync(PKG_DIR)) {
  fs.rmSync(PKG_DIR, { recursive: true, force: true });
}
if (fs.existsSync(ZIP_FILE)) {
  fs.unlinkSync(ZIP_FILE);
}

fs.mkdirSync(PKG_DIR, { recursive: true });

// 2. Build Subdirectories
const websiteDir = path.join(PKG_DIR, 'website');
const mediaDir = path.join(PKG_DIR, 'media');
const catalogDir = path.join(PKG_DIR, 'catalog');
const databaseDir = path.join(PKG_DIR, 'database');
const docsDir = path.join(PKG_DIR, 'docs');

fs.mkdirSync(websiteDir, { recursive: true });
fs.mkdirSync(mediaDir, { recursive: true });
fs.mkdirSync(catalogDir, { recursive: true });
fs.mkdirSync(databaseDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

// A. Populate website/ (deployable root for Vercel / Node.js)
console.log('Packaging website source code (22 HTML pages, ES modules, APIs, tests, scripts)...');
const htmlPages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
htmlPages.forEach((f) => fs.copyFileSync(path.join(ROOT, f), path.join(websiteDir, f)));

copyDirSync(path.join(ROOT, 'products'), path.join(websiteDir, 'products'));
copyDirSync(path.join(ROOT, 'assets'), path.join(websiteDir, 'assets'));
copyDirSync(path.join(ROOT, 'api'), path.join(websiteDir, 'api'));
copyDirSync(path.join(ROOT, 'tests'), path.join(websiteDir, 'tests'));
copyDirSync(path.join(ROOT, 'scripts'), path.join(websiteDir, 'scripts'));

const rootConfigs = [
  'server.js',
  'package.json',
  'package-lock.json',
  'vercel.json',
  '.vercelignore',
  '.env.example',
  '.gitignore',
  'sitemap.xml',
  'robots.txt',
  'metadata.json',
  'verify_package.js',
  'verify_package.py',
  'README.md',
  'README_BN.md'
];
rootConfigs.forEach((f) => {
  if (fs.existsSync(path.join(ROOT, f))) {
    fs.copyFileSync(path.join(ROOT, f), path.join(websiteDir, f));
  }
});

// B. Populate media/
console.log('Packaging all media assets (67 WebPs + 13 reference JPGs)...');
copyDirSync(path.join(ROOT, 'assets/images'), mediaDir);
if (fs.existsSync(path.join(ROOT, 'docs/original_references'))) {
  copyDirSync(path.join(ROOT, 'docs/original_references'), path.join(mediaDir, 'original_references'));
}

// C. Populate catalog/
console.log('Packaging canonical 11-design / 15-variant Drop 01 catalog files...');
const catalogFiles = [
  'starkit_products.json',
  'starkit_60_variants.json',
  'starkit_44_variants.json',
  'starkit_variants.csv',
  'starkit_media_manifest.csv',
  'starkit_knowledge_base.json',
  'promotions.json'
];
catalogFiles.forEach((f) => {
  const p = path.join(ROOT, 'catalog', f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(catalogDir, f));
  }
});
// Mirror catalog into website/catalog too so verify_package.js and npm test run inside website/
copyDirSync(catalogDir, path.join(websiteDir, 'catalog'));

// D. Populate database/
console.log('Packaging Supabase migrations (001-005) & seed scripts...');
const dbFiles = fs.readdirSync(path.join(ROOT, 'supabase')).filter((f) => f.endsWith('.sql'));
dbFiles.forEach((f) => {
  fs.copyFileSync(path.join(ROOT, 'supabase', f), path.join(databaseDir, f));
});

// E. Populate docs/
console.log('Packaging documentation suite...');
const docFiles = fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md') || f.endsWith('.png') || f.endsWith('.csv'));
docFiles.forEach((f) => {
  fs.copyFileSync(path.join(ROOT, 'docs', f), path.join(docsDir, f));
});
// Mirror docs/ and supabase/ into website/ so standalone npm test works cleanly inside website/
copyDirSync(path.join(ROOT, 'docs'), path.join(websiteDir, 'docs'));
copyDirSync(path.join(ROOT, 'supabase'), path.join(websiteDir, 'supabase'));

// Copy .env.example and README.md to root of handover package
fs.copyFileSync(path.join(ROOT, '.env.example'), path.join(PKG_DIR, '.env.example'));
fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(PKG_DIR, 'README.md'));

console.log('✓ Package folder structure assembled.');

// 3. Compress into ZIP file (cross-platform: PowerShell on win32, Python stdlib zipfile on POSIX)
console.log(`Compressing ${PKG_NAME} into ${PKG_NAME}.zip ...`);
try {
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      ['-NoProfile', '-Command', `Compress-Archive -Path '${PKG_DIR}' -DestinationPath '${ZIP_FILE}' -Force`],
      { stdio: 'inherit' }
    );
  } else {
    execFileSync(
      'python3',
      ['-m', 'zipfile', '-c', ZIP_FILE, PKG_NAME],
      { cwd: ROOT, stdio: 'inherit' }
    );
  }
  const zipStat = fs.statSync(ZIP_FILE);
  console.log(`✓ ARCHIVE CREATED SUCCESSFULLY: ${ZIP_FILE}`);
  console.log(`✓ ARCHIVE SIZE: ${(zipStat.size / (1024 * 1024)).toFixed(2)} MB`);
} catch (e) {
  console.error('Compression failed:', e.message);
  process.exit(1);
}
