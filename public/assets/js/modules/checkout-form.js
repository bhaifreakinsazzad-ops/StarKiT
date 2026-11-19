import { escapeHtml, formatBdt, maskPhoneForDisplay, validateOrderRequestBody } from '../core/validation.js';
import { luxuryToast } from '../interactive-anime.js';

function createIdempotencyUuid() {
  const c = typeof window !== 'undefined' ? window.crypto : null;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return '';
}

export function initCheckoutForm({ base, storeConfig, cartApi }) {
  const form = document.getElementById('checkoutForm');
  const summaryEl = document.getElementById('checkoutSummary');
  const totalEl = document.getElementById('checkoutTotal');
  const zoneSelect = document.getElementById('zone');
  const submitBtn = document.getElementById('checkoutSubmit');
  const noticeEl = document.getElementById('checkoutNotice');
  if (!form || !cartApi) return null;

  let trackedInitiateCheckout = false;

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

    if (!trackedInitiateCheckout && typeof window.fbq === 'function') {
      trackedInitiateCheckout = true;
      try {
        window.fbq('track', 'InitiateCheckout', {
          content_ids: pricing.items.map((i) => i.sku),
          content_type: 'product',
          num_items: pricing.item_count,
          value: Number(pricing.total_bdt) || 0,
          currency: 'BDT'
        });
      } catch {}
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

    const isLiveMode = (storeConfig?.mode === 'public' || storeConfig?.mode === 'live') && storeConfig?.cod_enabled === true;
    if (!isLiveMode && noticeEl) {
      noticeEl.textContent =
        'Storefront is currently in Commercial Preview Mode until all 7 product gates and Cash on Delivery activation are signed off in Admin.';
    } else if (isLiveMode && noticeEl && noticeEl.textContent.includes('Commercial Preview Mode')) {
      noticeEl.textContent = 'Enter your delivery details below to confirm your Cash on Delivery order.';
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
      idempotency_key: createIdempotencyUuid()
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
      const pricing = cartApi.getPricingSummary(payload.customer.zone);
      const refPreview = `STK-PREVIEW-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const waItemsList = pricing.items
        .map((i) => `• ${i.product_name} (${i.sku}, ${i.color}, Size ${i.size}) × ${i.quantity} = ${formatBdt(i.line_total_bdt)}`)
        .join('\n');
      const waText = encodeURIComponent(
        `Hello StarkiT! I would like to place a Cash on Delivery order:\n\n${waItemsList}\n\nDelivery: ${payload.customer.district} (${payload.customer.zone === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})\nTotal Payable: ${formatBdt(pricing.total_bdt)}\nName: ${payload.customer.name}\nAddress: ${payload.customer.address}`
      );
      if (noticeEl) {
        noticeEl.innerHTML = `
          <div style="margin-bottom:10px;"><strong>${escapeHtml(err.message)}</strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="https://wa.me/8801778307704?text=${waText}" target="_blank" rel="noopener noreferrer" class="btn btn-sm">Complete Order on WhatsApp ↗</a>
            <button type="button" class="btn btn-outline btn-sm" id="previewOrderReceiptBtn">Preview Confirmation Receipt →</button>
          </div>`;
        noticeEl.querySelector('#previewOrderReceiptBtn')?.addEventListener('click', () => {
          const maskedReceipt = {
            reference: refPreview,
            status: 'preview_reservation',
            zone: payload.customer.zone,
            district: payload.customer.district,
            masked_phone: maskPhoneForDisplay(payload.customer.phone),
            subtotal_bdt: pricing.subtotal_bdt,
            discount_bdt: pricing.discount_bdt || 0,
            shipping_bdt: pricing.shipping_bdt,
            total_bdt: pricing.total_bdt,
            created_at: new Date().toISOString()
          };
          try {
            sessionStorage.setItem('starkit_last_receipt', JSON.stringify(maskedReceipt));
          } catch {}
          window.location.href = `${base}order-confirmation.html?ref=${encodeURIComponent(refPreview)}`;
        });
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Cash on Delivery Order';
      }
    }
  });

  renderSummary();

  return {
    refresh: renderSummary
  };
}
