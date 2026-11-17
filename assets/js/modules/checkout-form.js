import { escapeHtml, formatBdt, maskPhoneForDisplay, validateOrderRequestBody } from '../core/validation.js';
import { luxuryToast } from '../interactive-anime.js';

export function initCheckoutForm({ base, storeConfig, cartApi }) {
  const form = document.getElementById('checkoutForm');
  const summaryEl = document.getElementById('checkoutSummary');
  const totalEl = document.getElementById('checkoutTotal');
  const zoneSelect = document.getElementById('zone');
  const submitBtn = document.getElementById('checkoutSubmit');
  const noticeEl = document.getElementById('checkoutNotice');
  if (!form || !cartApi) return;

  function renderSummary() {
    const zone = zoneSelect ? zoneSelect.value : 'dhaka';
    const pricing = cartApi.getPricingSummary(zone);

    if (!pricing.items.length) {
      if (summaryEl) {
        summaryEl.innerHTML = `<p class="muted">Your bag is currently empty. Add live items from the collection before checking out.</p>`;
      }
      if (totalEl) totalEl.textContent = '৳0';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    if (summaryEl) {
      summaryEl.innerHTML =
        pricing.items
          .map(
            (i) => `
            <div class="summary-item">
              <div>
                <strong>${escapeHtml(i.product_name)}</strong><br>
                <small>${escapeHtml(i.color)} · Size ${escapeHtml(i.size)} · Qty ${i.quantity}</small>
              </div>
              <strong class="tabular">${formatBdt(i.line_total_bdt)}</strong>
            </div>`
          )
          .join('') +
        (pricing.discount_bdt > 0
          ? `<div class="summary-item"><span>Approved Promotions</span><strong>−${formatBdt(pricing.discount_bdt)}</strong></div>`
          : '') +
        `<div class="summary-item"><span>Delivery (${zone === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span><strong>${pricing.shipping_bdt === 0 ? 'FREE' : formatBdt(pricing.shipping_bdt)}</strong></div>`;
    }

    if (totalEl) totalEl.textContent = formatBdt(pricing.total_bdt);

    const isLiveMode = storeConfig?.mode === 'public' && storeConfig?.cod_enabled === true;
    if (!isLiveMode && noticeEl) {
      noticeEl.textContent =
        'Storefront is currently in Commercial Preview Mode until all 7 product gates and Cash on Delivery activation are signed off in Admin.';
    }
    if (submitBtn) submitBtn.disabled = false;
  }

  zoneSelect?.addEventListener('change', renderSummary);
  window.addEventListener('starkit:cart-updated', renderSummary);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cartItems = cartApi.getItems();
    if (!cartItems.length) {
      luxuryToast('Your shopping bag is empty.');
      return;
    }

    const formData = new FormData(form);
    const payload = {
      customer: {
        name: String(formData.get('customer_name') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        address: String(formData.get('address') || '').trim(),
        district: String(formData.get('district') || '').trim(),
        zone: String(formData.get('zone') || 'dhaka').trim(),
        notes: String(formData.get('notes') || '').trim()
      },
      items: cartItems.map((c) => ({
        sku: c.sku,
        size: c.size,
        quantity: Number(c.quantity) || 1
      })),
      idempotency_key:
        window.crypto && typeof window.crypto.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `stk-${Date.now()}-${Math.random().toString(16).slice(2)}`
    };

    const validation = validateOrderRequestBody(payload);
    if (!validation.ok) {
      luxuryToast(validation.error);
      if (noticeEl) {
        noticeEl.textContent = validation.error;
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying Order…';
    }

    try {
      const res = await fetch(`${base}api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Unable to submit order (HTTP ${res.status}).`);
      }

      // Persist ONLY masked, session-scoped non-PII receipt in sessionStorage (zero persistent localStorage PII)
      const maskedReceipt = {
        reference: data.reference,
        status: data.status || 'pending_confirmation',
        zone: payload.customer.zone,
        district: payload.customer.district,
        masked_phone: maskPhoneForDisplay(payload.customer.phone),
        subtotal_bdt: data.subtotal_bdt,
        discount_bdt: data.discount_bdt || 0,
        shipping_bdt: data.shipping_bdt,
        total_bdt: data.total_bdt,
        created_at: new Date().toISOString()
      };
      try {
        sessionStorage.setItem('starkit_last_receipt', JSON.stringify(maskedReceipt));
      } catch {}

      if (typeof window.fbq === 'function') {
        try {
          window.fbq(
            'track',
            'Purchase',
            {
              content_ids: cartItems.map((i) => i.sku),
              content_type: 'product',
              value: Number(data.total_bdt) || 0,
              currency: 'BDT'
            },
            { eventID: data.reference }
          );
        } catch {}
      }

      cartApi.clear();
      window.location.href = `${base}order-confirmation.html?ref=${encodeURIComponent(data.reference)}`;
    } catch (err) {
      luxuryToast(err.message);
      if (noticeEl) noticeEl.textContent = err.message;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Cash on Delivery Order';
      }
    }
  });

  renderSummary();
}
