import { formatBdt } from '../core/validation.js';

const SAFE_ORDER_REF_RE = /^STK-[A-Z0-9-]{4,24}$/i;

function sanitizeOrderRef(raw) {
  const clean = String(raw || '').trim();
  return SAFE_ORDER_REF_RE.test(clean) ? clean.toUpperCase() : '';
}

function makeSpecRow(label, valueText, { mono = false, tabular = false, boldValue = false, largeValue = false } = {}) {
  const row = document.createElement('div');
  row.className = 'spec';
  const strong = document.createElement('strong');
  strong.textContent = label;
  const valEl = document.createElement(boldValue ? 'strong' : 'span');
  if (tabular) valEl.className = 'tabular';
  if (mono) valEl.style.fontFamily = 'var(--font-mono)';
  if (largeValue) valEl.style.fontSize = '1.1rem';
  valEl.textContent = valueText;
  row.append(strong, valEl);
  return row;
}

export function initOrderConfirmation({ base }) {
  const container = document.getElementById('confirmationContainer');
  if (!container) return;

  const safeBase = base === '../' ? '../' : './';
  const params = new URLSearchParams(window.location.search);
  const urlRef = sanitizeOrderRef(params.get('ref'));

  let receipt = null;
  try {
    const raw = sessionStorage.getItem('starkit_last_receipt');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') receipt = parsed;
    }
  } catch {
    receipt = null;
  }

  const ref = sanitizeOrderRef(receipt?.reference) || urlRef;
  if (!ref) {
    container.innerHTML = `
      <div class="summary-panel" style="text-align:center;padding:48px 24px;">
        <img src="${safeBase}assets/images/starkit-logo-dark.png" alt="StarkiT" style="height:36px;margin:0 auto 18px;">
        <h1>No Active Order Receipt</h1>
        <p class="muted" style="max-width:44ch;margin:0 auto 24px;">
          Order confirmation receipts are stored securely in your current browser session. Return to the collection or contact customer support with your reference.
        </p>
        <a href="${safeBase}shop.html" class="btn">Return to Collection ↗</a>
      </div>`;
    return;
  }

  const waSupport = `https://wa.me/8801778307704?text=${encodeURIComponent(
    `Hello StarkiT! I have placed COD order ${ref}. Please confirm delivery timing.`
  )}`;

  container.innerHTML = `
    <div class="summary-panel" style="padding:36px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:22px;">
        <div>
          <div class="eyebrow" style="margin-bottom:6px;">Cash on Delivery Confirmation</div>
          <h1 id="ocHeading" style="margin:0;font-size:2.1rem;font-weight:800;"></h1>
          <p class="muted" style="margin:6px 0 0;">Status: <strong id="ocStatus"></strong></p>
        </div>
        <button type="button" id="ocPrintBtn" class="btn btn-outline btn-sm">Print Receipt</button>
      </div>
      <div id="ocDetailsMount"></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px;">
        <a id="ocWaLink" target="_blank" rel="noopener noreferrer" class="btn">Confirm on WhatsApp ↗</a>
        <a href="${safeBase}shop.html" class="btn btn-outline">Continue Shopping</a>
      </div>
    </div>`;

  const headingEl = container.querySelector('#ocHeading');
  const statusEl = container.querySelector('#ocStatus');
  const detailsMount = container.querySelector('#ocDetailsMount');
  const waLinkEl = container.querySelector('#ocWaLink');
  const printBtn = container.querySelector('#ocPrintBtn');

  if (headingEl) headingEl.textContent = `Order ${ref}`;
  if (statusEl) {
    statusEl.textContent = String(receipt?.status || 'pending_confirmation')
      .replace(/_/g, ' ')
      .toUpperCase();
  }
  if (waLinkEl) waLinkEl.setAttribute('href', waSupport);
  printBtn?.addEventListener('click', () => window.print());

  if (detailsMount) {
    if (receipt) {
      const specs = document.createElement('div');
      specs.className = 'specs';
      specs.style.marginTop = '0';
      specs.append(
        makeSpecRow('Reference', ref, { mono: true }),
        makeSpecRow(
          'Delivery District',
          `${String(receipt.district || 'Dhaka')} (${receipt.zone === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})`
        ),
        makeSpecRow('Contact (Masked)', String(receipt.masked_phone || 'Verified'), { mono: true }),
        makeSpecRow('Subtotal', formatBdt(receipt.subtotal_bdt || 0), { tabular: true })
      );
      if (Number(receipt.discount_bdt) > 0) {
        specs.append(makeSpecRow('Promotions', `−${formatBdt(receipt.discount_bdt)}`, { tabular: true }));
      }
      specs.append(
        makeSpecRow(
          'Delivery Fee',
          receipt.shipping_bdt === 0 ? 'FREE' : formatBdt(receipt.shipping_bdt || 0),
          { tabular: true }
        ),
        makeSpecRow('Total Payable (COD)', formatBdt(receipt.total_bdt || 0), {
          tabular: true,
          boldValue: true,
          largeValue: true
        })
      );
      detailsMount.replaceChildren(specs);
    } else {
      const notice = document.createElement('div');
      notice.className = 'notice';
      const strongRef = document.createElement('strong');
      strongRef.textContent = ref;
      notice.append('Order reference ', strongRef, ' received. Contact support at 01778307704 for status updates.');
      detailsMount.replaceChildren(notice);
    }
  }
}
