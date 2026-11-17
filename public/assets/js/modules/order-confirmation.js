import { escapeHtml, formatBdt } from '../core/validation.js';

export function initOrderConfirmation({ base }) {
  const container = document.getElementById('confirmationContainer');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const urlRef = params.get('ref') || '';

  let receipt = null;
  try {
    const raw = sessionStorage.getItem('starkit_last_receipt');
    if (raw) receipt = JSON.parse(raw);
  } catch {}

  const ref = (receipt && receipt.reference) || urlRef;
  if (!ref) {
    container.innerHTML = `
      <div class="summary-panel" style="text-align:center;padding:48px 24px;">
        <img src="${base}assets/images/starkit-logo-dark.png" alt="StarkiT" style="height:36px;margin:0 auto 18px;">
        <h1>No Active Order Receipt</h1>
        <p class="muted" style="max-width:44ch;margin:0 auto 24px;">
          Order confirmation receipts are stored securely in your current browser session. Return to the collection or contact customer support with your reference.
        </p>
        <a href="${base}shop.html" class="btn">Return to Collection ↗</a>
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
          <h1 style="margin:0;font-size:2.1rem;font-weight:800;">Order ${escapeHtml(ref)}</h1>
          <p class="muted" style="margin:6px 0 0;">Status: <strong>${escapeHtml((receipt?.status || 'pending_confirmation').replace(/_/g, ' ').toUpperCase())}</strong></p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="window.print()">Print Receipt</button>
      </div>

      ${
        receipt
          ? `<div class="specs" style="margin-top:0;">
               <div class="spec"><strong>Reference</strong><span style="font-family:var(--font-mono);">${escapeHtml(receipt.reference)}</span></div>
               <div class="spec"><strong>Delivery District</strong><span>${escapeHtml(receipt.district)} (${receipt.zone === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span></div>
               <div class="spec"><strong>Contact (Masked)</strong><span style="font-family:var(--font-mono);">${escapeHtml(receipt.masked_phone || 'Verified')}</span></div>
               <div class="spec"><strong>Subtotal</strong><span class="tabular">${formatBdt(receipt.subtotal_bdt || 0)}</span></div>
               ${receipt.discount_bdt ? `<div class="spec"><strong>Promotions</strong><span class="tabular">−${formatBdt(receipt.discount_bdt)}</span></div>` : ''}
               <div class="spec"><strong>Delivery Fee</strong><span class="tabular">${receipt.shipping_bdt === 0 ? 'FREE' : formatBdt(receipt.shipping_bdt || 0)}</span></div>
               <div class="spec"><strong>Total Payable (COD)</strong><strong class="tabular" style="font-size:1.1rem;">${formatBdt(receipt.total_bdt || 0)}</strong></div>
             </div>`
          : `<div class="notice">Order reference <strong>${escapeHtml(ref)}</strong> received. Contact support at 01778307704 for status updates.</div>`
      }

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px;">
        <a href="${waSupport}" target="_blank" rel="noopener noreferrer" class="btn">Confirm on WhatsApp ↗</a>
        <a href="${base}shop.html" class="btn btn-outline">Continue Shopping</a>
      </div>
    </div>`;
}
