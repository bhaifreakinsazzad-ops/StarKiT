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

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.all('/api/orders', (req, res, next) => {
  Promise.resolve(ordersHandler(req, res)).catch(next);
});

app.all('/api/admin', (req, res, next) => {
  Promise.resolve(adminHandler(req, res)).catch(next);
});

app.use(
  express.static(__dirname, {
    extensions: ['html'],
    dotfiles: 'ignore'
  })
);

app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`StarkiT storefront listening on http://${HOST}:${PORT}`);
});
