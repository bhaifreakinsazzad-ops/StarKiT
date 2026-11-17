// server.js – Express server for StarkiT storefront
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import ordersHandler from './api/orders.js';
import adminHandler from './api/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadLocalEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    if (!key || process.env[key] !== undefined) continue;
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadLocalEnvFile(path.join(__dirname, '.env'));

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://apis.google.com https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com https://*.googleusercontent.com",
  "connect-src 'self' https://*.supabase.co https://www.facebook.com https://connect.facebook.net https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP_HEADER);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Block access to internal files and directories
const BLOCKED_PREFIXES = ['/supabase', '/scripts', '/catalog', '/docs', '/node_modules', '/tests'];
const BLOCKED_EXACT = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/vercel.json',
  '/bun.lock',
  '/metadata.json',
  '/readme.md',
  '/readme_bn.md',
  '/verify_package.js',
  '/verify_package.py',
  '/build_store.js',
  '/build_catalog.py',
  '/generate_site.py'
]);
const BLOCKED_EXT = /\.(py|sql|cjs|md|csv|pdf|env|lock|bak)$/i;

app.use((req, res, next) => {
  const reqPath = (req.path || '/').toLowerCase();
  if (
    reqPath.includes('/.') ||
    BLOCKED_EXACT.has(reqPath) ||
    BLOCKED_PREFIXES.some((prefix) => reqPath === prefix || reqPath.startsWith(prefix + '/')) ||
    BLOCKED_EXT.test(reqPath)
  ) {
    return res.status(404).type('html').send(NOT_FOUND_HTML);
  }
  next();
});

// Serve vendored Firebase ESM bundles safely without exposing node_modules
app.get('/vendor/firebase/firebase-app.js', (req, res) => {
  res.type('application/javascript').sendFile(path.join(__dirname, 'assets/js/vendor/firebase-app.js'));
});
app.get('/vendor/firebase/firebase-auth.js', (req, res) => {
  res.type('application/javascript').sendFile(path.join(__dirname, 'assets/js/vendor/firebase-auth.js'));
});

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(__dirname, { extensions: ['html'], dotfiles: 'ignore' }));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoints
app.all('/api/orders', (req, res, next) => {
  Promise.resolve(ordersHandler(req, res)).catch(next);
});
app.all('/api/admin', (req, res, next) => {
  Promise.resolve(adminHandler(req, res)).catch(next);
});
app.use('/api', (req, res) => {
  res.status(404).setHeader('Cache-Control', 'no-store').json({ error: 'API endpoint not found' });
});

// Branded 404 fallback page
const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#170000">
  <title>404 — Page Not Found | StarkiT</title>
  <link rel="icon" type="image/png" href="/assets/images/starkit-favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Afacad+Flux:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body style="background:#f6f4f0;color:#170000;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:32px;text-align:center;">
  <main style="max-width:480px;">
    <a href="/index.html" style="display:inline-block;margin-bottom:28px;">
      <img src="/assets/images/starkit-logo-dark.png" alt="StarkiT" style="height:44px;width:auto;margin:0 auto;">
    </a>
    <p class="eyebrow" style="justify-content:center;color:#5B1A24;margin-bottom:10px;">StarkiT Archive</p>
    <h1 style="font-size:clamp(3.2rem,9vw,4.8rem);font-weight:800;line-height:0.95;margin:0 0 14px;font-variant-numeric:tabular-nums;">404</h1>
    <p style="font-size:1rem;color:#5c5654;line-height:1.65;margin:0 0 28px;">This page could not be found in the StarkiT archive. Return to the showroom to explore Drop 01 hoodies and Fariza's Territory artisan pieces.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <a href="/shop.html" class="btn">Explore Collection</a>
      <a href="/index.html" class="btn btn-outline">Back to Showroom</a>
    </div>
  </main>
</body>
</html>`;

app.use((req, res) => {
  res.status(404).type('html').send(NOT_FOUND_HTML);
});

app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`StarkiT storefront listening on http://${HOST}:${PORT}`);
});
