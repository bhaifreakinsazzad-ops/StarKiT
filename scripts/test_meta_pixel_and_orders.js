import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('=== VERIFYING META PIXEL PRESENCE & FAIL-CLOSED ORDER SECURITY ===\n');

const allHtmlFiles = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, f)),
  ...fs.readdirSync(path.join(ROOT, 'products')).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, 'products', f))
];

let missingPixel = 0;
for (const p of allHtmlFiles) {
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('1390081606323661') || !content.includes('connect.facebook.net/en_US/fbevents.js')) {
    console.error(`Missing Meta Pixel in: ${path.relative(ROOT, p)}`);
    missingPixel++;
  }
}

if (missingPixel > 0) {
  throw new Error(`Meta Pixel is missing in ${missingPixel} files!`);
}
console.log(`✓ PASS: All ${allHtmlFiles.length} HTML files verified with Dataset ID 1390081606323661.`);

// Verify orders API fails closed when STARKIT_ORDERS_ENABLED is not enabled
const { default: orderHandler } = await import('../api/orders.js');
const prevEnabled = process.env.STARKIT_ORDERS_ENABLED;
delete process.env.STARKIT_ORDERS_ENABLED;

let capturedCode = null;
let capturedData = null;
const mockRes = {
  status(code) {
    capturedCode = code;
    return this;
  },
  setHeader() {
    return this;
  },
  end(str) {
    capturedData = JSON.parse(str);
  }
};

await orderHandler(
  {
    method: 'POST',
    headers: { host: 'starkit.bd' },
    body: {
      customer: { name: 'Tanvir Ahmed', phone: '01712345678', address: 'House 12, Road 5, Dhanmondi', district: 'Dhaka', zone: 'dhaka' },
      items: [{ sku: 'STK-H007-BRN', size: 'L', quantity: 1 }]
    }
  },
  mockRes
);

if (prevEnabled !== undefined) process.env.STARKIT_ORDERS_ENABLED = prevEnabled;

if (capturedCode !== 503) {
  throw new Error(`Expected fail-closed 503 when ordering is disabled, got ${capturedCode}: ${JSON.stringify(capturedData)}`);
}
console.log('✓ PASS: Orders API fails closed (503) when STARKIT_ORDERS_ENABLED is not active.');
