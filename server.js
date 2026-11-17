import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import ordersHandler from './api/orders.js';
import adminHandler from './api/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Safe security headers compatible with iframe preview & Meta Pixel
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const BLOCKED_PREFIXES = ['/supabase', '/scripts', '/catalog', '/docs', '/node_modules'];
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
const BLOCKED_EXT = /\.(py|sql|cjs|md|csv|pdf|env|lock)$/i;

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#170000">
  <title>404 — Page Not Found | StarkiT</title>
  <link rel="icon" type="image/png" href="/assets/images/starkit-logo-transparent.png">
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body style="background:#fbf9f5;color:#170000;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:32px;text-align:center;">
  <main style="max-width:520px;">
    <p class="eyebrow" style="color:#be555c;margin-bottom:10px;">STARKIT · ARCHIVE</p>
    <h1 style="font-size:clamp(3rem,10vw,5rem);font-weight:900;line-height:0.95;margin:0 0 14px;">404</h1>
    <p style="font-size:1.05rem;color:#554;line-height:1.6;margin:0 0 28px;">This page could not be found in the StarkiT archive. Explore our live Drop 01 hoodies and Fariza's Territory artisan pieces.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <a href="/shop.html" class="btn">EXPLORE COLLECTION ↗</a>
      <a href="/index.html" class="btn btn-outline">BACK TO HOME</a>
    </div>
  </main>
</body>
</html>`;

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

// Block internal repository, database, and build artifacts from direct HTTP exposure
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

// Cache policy for static assets vs HTML
app.use('/assets', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
});

app.use(
  express.static(__dirname, {
    extensions: ['html'],
    dotfiles: 'ignore'
  })
);

// Branded 404 fallback
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
