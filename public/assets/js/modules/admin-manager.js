import { escapeHtml, formatBdt } from '../core/validation.js';
import { APPROVAL_TRANSITIONS, PRICE_TIERS } from '../core/catalog-schema.js';
import { DEFAULT_PROMOTIONS } from '../core/pricing-engine.js';

export function initAdminManager() {
  const loginGate = document.getElementById('loginGate');
  if (!loginGate) return;

  let authHeaders = {}; // Memory only — NEVER persisted to storage
  const dirtyInventory = new Set();

  const state = {
    authenticated: false,
    orders: [],
    catalog: JSON.parse(JSON.stringify(window.STARKIT_CATALOG || [])),
    promotions: JSON.parse(JSON.stringify(window.STARKIT_PROMOTIONS || DEFAULT_PROMOTIONS)),
    approvals: [],
    auditLogs: [],
    mediaAssets: []
  };

  function adminFetch(url, init = {}) {
    return fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), ...authHeaders }
    });
  }

  function adminToast(msg) {
    const el = document.getElementById('adminToast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(adminToast._t);
    adminToast._t = setTimeout(() => {
      el.style.display = 'none';
    }, 3800);
  }

  function setSyncStatus(label, ok) {
    const el = document.getElementById('syncIndicator');
    if (!el) return;
    el.textContent = label;
    el.style.color = ok ? '#bfa177' : 'rgba(243,239,230,0.68)';
  }

  function applyDashboardData(data) {
    state.orders = Array.isArray(data.orders) ? data.orders : [];
    state.approvals = Array.isArray(data.approvals) ? data.approvals : [];
    state.auditLogs = Array.isArray(data.audit_logs) ? data.audit_logs : [];
    state.mediaAssets = Array.isArray(data.media_assets) ? data.media_assets : [];

    if (Array.isArray(data.promotions) && data.promotions.length) {
      state.promotions = data.promotions;
    }

    if (Array.isArray(data.products) && data.products.length) {
      const prodMap = new Map(data.products.map((p) => [p.id, p]));
      state.catalog.forEach((p) => {
        const remote = prodMap.get(p.id);
        if (!remote) return;
        if (remote.approval_status) p.approval_status = remote.approval_status;
        if (typeof remote.price_approved === 'boolean') p.price_approved = remote.price_approved;
        if (typeof remote.rights_verified === 'boolean') p.rights_verified = remote.rights_verified;
        if (typeof remote.specifications_verified === 'boolean') p.specifications_verified = remote.specifications_verified;
        if (typeof remote.stock_verified === 'boolean') p.stock_verified = remote.stock_verified;
        if (typeof remote.commercial_terms_verified === 'boolean') p.commercial_terms_verified = remote.commercial_terms_verified;
        if (remote.price_tier) p.price_tier = remote.price_tier;
        if (remote.price_approved && Number.isFinite(Number(remote.approved_price_bdt))) {
          p.price_bdt = Number(remote.approved_price_bdt);
        } else if (Number.isFinite(Number(remote.draft_price_bdt))) {
          p.price_bdt = Number(remote.draft_price_bdt);
        }
        p.publication_status =
          remote.approval_status === 'PUBLISHED'
            ? 'PUBLISHED'
            : remote.approval_status === 'ARCHIVED'
            ? 'ARCHIVED'
            : 'HOLD / NOT FOR PUBLIC SALES';
      });
    }

    if (Array.isArray(data.variants) && data.variants.length) {
      const map = new Map(data.variants.map((v) => [v.sku, v]));
      state.catalog.forEach((p) => {
        (p.variants || []).forEach((v) => {
          const remote = map.get(v.sku);
          if (!remote) return;
          if (remote.status) v.status = remote.status;
          if (typeof remote.stock_quantity === 'number') v.stock_quantity = remote.stock_quantity;
          if (Array.isArray(remote.sizes)) v.available_sizes = remote.sizes;
          if (Number.isFinite(Number(remote.price_bdt))) v.price_bdt = Number(remote.price_bdt);
          if (typeof remote.price_approved === 'boolean') v.price_approved = remote.price_approved;
          if (typeof remote.approved_for_publication === 'boolean') {
            v.approved_for_publication = remote.approved_for_publication;
          }
          if (Array.isArray(remote.gallery) && remote.gallery.length > 0) {
            v.gallery = remote.gallery;
          }
          if (remote.approval_status) v.approval_status = remote.approval_status;
        });
      });
    }

    if (Array.isArray(data.settings)) {
      const lookup = Object.fromEntries(data.settings.map((s) => [s.key, s.value]));
      if (lookup.delivery_dhaka_bdt != null) document.getElementById('settingDhaka').value = lookup.delivery_dhaka_bdt;
      if (lookup.delivery_outside_bdt != null) document.getElementById('settingOutside').value = lookup.delivery_outside_bdt;
      if (lookup.free_shipping_threshold != null) document.getElementById('settingFreeThreshold').value = lookup.free_shipping_threshold;
      if (lookup.cod_enabled != null) document.getElementById('settingCodStatus').value = String(lookup.cod_enabled);
      if (lookup.support_phone != null) document.getElementById('settingPhone').value = lookup.support_phone;
      if (lookup.store_mode != null) {
        document.getElementById('settingStoreMode').value = lookup.store_mode === 'live' ? 'public' : lookup.store_mode;
      }
    }
  }

  function populateSkuSelectors() {
    const options = state.catalog
      .flatMap((p) =>
        (p.variants || []).map(
          (v) => `<option value="${escapeHtml(v.sku)}">${escapeHtml(v.sku)} — ${escapeHtml(p.name)} (${escapeHtml(v.color)})</option>`
        )
      )
      .join('');

    const manSku = document.getElementById('manSku');
    if (manSku) manSku.innerHTML = options;

    const uploadSku = document.getElementById('uploadTargetSku');
    if (uploadSku) uploadSku.innerHTML = options;
  }

  function renderDashboard() {
    const totalRev = state.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total_bdt) || 0), 0);
    const pendingCount = state.orders.filter((o) => o.status === 'pending_confirmation').length;
    const shippedCount = state.orders.filter((o) => o.status === 'shipped').length;

    const hoodies = state.catalog.filter((p) => String(p.id).startsWith('STK-'));
    const hoodieVariants = hoodies.flatMap((p) => p.variants || []);
    const documentedSlots = hoodieVariants.filter((v) => v.status === 'DOCUMENTED').length;
    const liveApproved = state.catalog
      .flatMap((p) => p.variants || [])
      .filter((v) => v.approved_for_publication === true).length;

    document.getElementById('kpiRevenue').textContent = formatBdt(totalRev);
    document.getElementById('kpiTotalOrders').textContent = String(state.orders.length);
    document.getElementById('kpiPending').textContent = String(pendingCount);
    document.getElementById('kpiShipped').textContent = String(shippedCount);
    document.getElementById('kpiSkus').textContent = `${hoodies.length} / ${hoodieVariants.length}`;
    document.getElementById('kpiSkusSub').textContent = `${documentedSlots} Doc · ${hoodieVariants.length - documentedSlots} Pending · ${liveApproved} Live SKUs`;
    document.getElementById('ordersCountBadge').textContent = String(state.orders.length);

    renderOrdersTable();
    renderInventoryAndApprovals();
    renderPricingAndPromotions();
    renderAuditLogs();
  }

  function renderOrdersTable() {
    const query = (document.getElementById('orderSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    const zoneFilter = document.getElementById('orderZoneFilter')?.value || 'all';

    const filtered = state.orders.filter((o) => {
      const matchQuery =
        !query ||
        (o.reference && o.reference.toLowerCase().includes(query)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
        (o.customer_phone && o.customer_phone.includes(query));
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchZone = zoneFilter === 'all' || o.zone === zoneFilter;
      return matchQuery && matchStatus && matchZone;
    });

    const recentBody = document.getElementById('recentOrdersBody');
    const masterBody = document.getElementById('ordersMasterBody');

    const makeRow = (o, isMaster) => {
      const itemsSummary =
        (o.items || o.store_order_items || [])
          .map((i) => `${escapeHtml(i.product_name || i.sku)} (${escapeHtml(i.size)} × ${Number(i.quantity) || 1})`)
          .join(', ') || '1 Item';
      const dateStr = o.created_at
        ? new Date(o.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '—';
      const rawPhone = String(o.customer_phone || '');
      const waUrl = `https://wa.me/${encodeURIComponent(rawPhone.replace(/^0/, '880'))}?text=${encodeURIComponent(
        `Hello ${o.customer_name || ''}! StarkiT update for order ${o.reference}.`
      )}`;

      return `
        <tr>
          <td><strong style="font-family:var(--font-mono);">${escapeHtml(o.reference)}</strong></td>
          <td><small>${escapeHtml(dateStr)}</small></td>
          <td><strong>${escapeHtml(o.customer_name)}</strong></td>
          <td>
            <a href="tel:${escapeHtml(rawPhone)}" style="text-decoration:underline;font-family:var(--font-mono);">${escapeHtml(rawPhone)}</a>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="action-btn action-btn-wa" style="padding:2px 6px;margin-left:4px;font-size:0.7rem;">WA ↗</a>
          </td>
          ${isMaster ? `<td><small>${escapeHtml(o.shipping_address)}, ${escapeHtml(o.district)} (${escapeHtml(o.zone)})</small></td>` : `<td>${escapeHtml(o.district)}</td>`}
          <td><small>${itemsSummary}</small></td>
          <td><strong>${formatBdt(o.total_bdt || 0)}</strong></td>
          <td><span class="status-badge status-${escapeHtml(o.status)}">${escapeHtml((o.status || '').replace(/_/g, ' '))}</span></td>
          ${
            isMaster
              ? `<td>
                  <select data-order-status-ref="${escapeHtml(o.reference)}" style="padding:5px;font-size:0.76rem;border:1px solid var(--border-color);border-radius:4px;">
                    ${['pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
                      .map((st) => `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st.replace(/_/g, ' ')}</option>`)
                      .join('')}
                  </select>
                </td>`
              : ''
          }
          <td><button type="button" class="action-btn" data-open-invoice="${escapeHtml(o.reference)}">Invoice</button></td>
        </tr>`;
    };

    if (recentBody) {
      recentBody.innerHTML =
        state.orders.slice(0, 5).map((o) => makeRow(o, false)).join('') ||
        '<tr><td colspan="9" style="text-align:center;color:var(--mute);padding:24px;">No live orders loaded yet.</td></tr>';
    }
    if (masterBody) {
      masterBody.innerHTML =
        filtered.map((o) => makeRow(o, true)).join('') ||
        '<tr><td colspan="10" style="text-align:center;color:var(--mute);padding:24px;">No matching orders found.</td></tr>';
    }

    document.querySelectorAll('[data-order-status-ref]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const ref = sel.dataset.orderStatusRef;
        const newStatus = sel.value;
        const order = state.orders.find((o) => o.reference === ref);
        if (!order) return;
        const prev = order.status;
        order.status = newStatus;
        renderDashboard();
        try {
          const res = await adminFetch('api/admin?action=update_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: ref, status: newStatus })
          });
          if (!res.ok) throw new Error('Update rejected');
          adminToast(`Order ${ref} updated to ${newStatus.replace(/_/g, ' ')}.`);
        } catch {
          order.status = prev;
          renderDashboard();
          adminToast(`Unable to persist status for ${ref}.`);
        }
      });
    });

    document.querySelectorAll('[data-open-invoice]').forEach((btn) => {
      btn.addEventListener('click', () => openInvoice(btn.dataset.openInvoice));
    });
  }

  function openInvoice(ref) {
    const o = state.orders.find((x) => x.reference === ref);
    if (!o) return;
    document.getElementById('invRef').textContent = o.reference;
    document.getElementById('invDate').textContent = o.created_at ? new Date(o.created_at).toLocaleString() : '—';
    document.getElementById('invCustName').textContent = o.customer_name;
    document.getElementById('invCustPhone').textContent = o.customer_phone;
    document.getElementById('invCustAddress').textContent = o.shipping_address;
    document.getElementById('invCustDistrict').textContent = o.district;

    const items = o.items || o.store_order_items || [];
    document.getElementById('invItemsBody').innerHTML = items
      .map(
        (i) => `
        <tr style="border-bottom:1px solid rgba(23,0,0,0.1);">
          <td style="padding:8px;">${escapeHtml(i.product_name || i.sku)} (${escapeHtml(i.color || '')})</td>
          <td style="padding:8px;text-align:center;">${escapeHtml(i.size)}</td>
          <td style="padding:8px;text-align:center;">${Number(i.quantity) || 1}</td>
          <td style="padding:8px;text-align:right;">${formatBdt(i.line_total_bdt || (Number(i.unit_price_bdt) || 0) * (Number(i.quantity) || 1))}</td>
        </tr>`
      )
      .join('');

    document.getElementById('invSubtotal').textContent = formatBdt(o.subtotal_bdt || 0);
    const invDiscountRow = document.getElementById('invDiscountRow');
    const invDiscount = document.getElementById('invDiscount');
    if (invDiscountRow && invDiscount) {
      if (Number(o.discount_bdt) > 0) {
        invDiscountRow.style.display = 'block';
        invDiscount.textContent = `−${formatBdt(o.discount_bdt)}`;
      } else {
        invDiscountRow.style.display = 'none';
      }
    }
    document.getElementById('invShipping').textContent = o.shipping_bdt === 0 ? 'FREE' : formatBdt(o.shipping_bdt || 0);
    document.getElementById('invTotal').textContent = formatBdt(o.total_bdt || 0);
    document.getElementById('invoiceModal').style.display = 'grid';
  }

  function renderInventoryAndApprovals() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const approvalByProduct = new Map(state.approvals.map((a) => [a.product_id, a]));
    const rows = [];

    state.catalog.forEach((p) => {
      (p.variants || []).forEach((v) => {
        const isProv = v.status === 'PROVISIONAL' || !v.gallery || v.gallery.length === 0;
        const imgHtml =
          !isProv && v.gallery && v.gallery[0]
            ? `<img class="sku-img" src="${escapeHtml(String(v.gallery[0].url || '').replace(/^\//, ''))}" alt="${escapeHtml(p.name)}">`
            : `<div class="sku-img" style="display:flex;align-items:center;justify-content:center;background:${escapeHtml(v.hex)};color:${v.hex === '#F3EFE6' ? '#170000' : '#ffffff'};font-size:0.62rem;font-weight:700;">PEND</div>`;

        const approvalRec = approvalByProduct.get(p.id);
        const gatesReady = v.approved_for_publication
          ? 'PUBLISHED'
          : isProv
          ? 'PROVISIONAL'
          : p.approval_status || (approvalRec?.reviewed_at ? 'IN_REVIEW' : 'MEDIA_VERIFIED');

        rows.push(`
          <tr>
            <td>${imgHtml}</td>
            <td><strong>${escapeHtml(p.name)}</strong><br><small style="color:var(--mute);">${escapeHtml(p.id)} · ${escapeHtml(PRICE_TIERS[p.price_tier]?.label || p.collection || '')}</small></td>
            <td><code style="font-family:var(--font-mono);font-size:0.78rem;">${escapeHtml(v.sku)}</code></td>
            <td><span class="color-dot" style="background:${escapeHtml(v.hex)};vertical-align:middle;margin-right:6px;"></span>${escapeHtml(v.color)}</td>
            <td class="tabular">${formatBdt(p.price_bdt)} ${p.price_approved ? '' : '<small style="color:#b45309;">(Draft)</small>'}</td>
            <td><input type="number" class="stock-input" data-stock-sku="${escapeHtml(v.sku)}" value="${Number(v.stock_quantity || 0)}" min="0"></td>
            <td><span style="font-size:0.76rem;">${(v.available_sizes || []).length ? escapeHtml(v.available_sizes.join(', ')) : '<em>Pending</em>'}</span></td>
            <td><span class="status-badge" style="background:${v.approved_for_publication ? '#15803d' : isProv ? '#5b1a24' : '#b45309'};">${escapeHtml(gatesReady)}</span></td>
            <td><button type="button" class="action-btn" data-open-gate="${escapeHtml(p.id)}" data-gate-sku="${escapeHtml(v.sku)}">7-Gate Sign-Off</button></td>
          </tr>`);
      });
    });

    tbody.innerHTML = rows.join('');

    tbody.querySelectorAll('[data-stock-sku]').forEach((inp) => {
      inp.addEventListener('change', () => dirtyInventory.add(inp.dataset.stockSku));
    });

    tbody.querySelectorAll('[data-open-gate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openSevenGateModal(btn.dataset.openGate, btn.dataset.gateSku);
      });
    });
  }

  function openSevenGateModal(productId, sku) {
    const modal = document.getElementById('sevenGateModal');
    const titleEl = document.getElementById('gateSkuTitle');
    const statusSelect = document.getElementById('gateTargetStatus');
    if (!modal || !titleEl) return;
    const prod = state.catalog.find((p) => p.id === productId);
    const ev = state.approvals.find((a) => a.product_id === productId);
    const currentStatus = prod?.approval_status || (String(productId).startsWith('FT-') ? 'PUBLISHED' : 'DRAFT');
    titleEl.textContent = `${productId} / ${sku} (Current: ${currentStatus})`;
    modal.dataset.productId = productId;
    modal.dataset.sku = sku;
    if (statusSelect) {
      const validNext = [currentStatus, ...(APPROVAL_TRANSITIONS[currentStatus] || ['READY_FOR_APPROVAL', 'APPROVED'])];
      const uniqueStates = [...new Set(validNext)];
      statusSelect.innerHTML = uniqueStates
        .map((st) => `<option value="${escapeHtml(st)}">${escapeHtml(st)}</option>`)
        .join('');
    }
    const setCheck = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };
    setCheck('gateLegal', ev ? ev.artwork_rights_ok : prod?.rights_verified);
    setCheck('gateSpecs', ev ? ev.garment_specs_ok : prod?.specifications_verified);
    setCheck('gateMedia', ev ? ev.sample_photo_ok : (prod?.variants || []).some((v) => v.status === 'DOCUMENTED'));
    setCheck('gateDesign', ev ? ev.size_run_ok : (prod?.variants || []).some((v) => Array.isArray(v.available_sizes) && v.available_sizes.length > 0));
    setCheck('gateStock', ev ? ev.stock_count_ok : prod?.stock_verified || (prod?.variants || []).some((v) => Number(v.stock_quantity || 0) > 0));
    setCheck('gatePricing', ev ? ev.pricing_approved_ok : prod?.price_approved);
    setCheck('gateCommercial', ev ? ev.commercial_terms_ok : prod?.commercial_terms_verified);

    const ownerEl = document.getElementById('gateOwner');
    const notesEl = document.getElementById('gateNotes');
    if (ownerEl) ownerEl.value = ev?.reviewed_by && ev.reviewed_by !== 'system_seed' ? ev.reviewed_by : '';
    if (notesEl) notesEl.value = ev?.evidence_notes || '';

    modal.style.display = 'grid';
  }

  function renderPricingAndPromotions() {
    const tiersBody = document.getElementById('adminTiersBody');
    if (tiersBody) {
      const hoodies = state.catalog.filter((p) => String(p.id).startsWith('STK-'));
      tiersBody.innerHTML = Object.values(PRICE_TIERS)
        .map((tier) => {
          const designs = hoodies.filter((p) => (p.price_tier || p.tier) === tier.code || Number(p.price_bdt) === tier.price_bdt);
          const approvedCount = designs.filter((d) => d.price_approved === true).length;
          const badgeStyle =
            approvedCount === designs.length && designs.length > 0
              ? 'background:#15803d;'
              : approvedCount > 0
              ? 'background:#1d4ed8;'
              : 'background:#b45309;';
          const badgeText =
            approvedCount === designs.length && designs.length > 0
              ? `Approved (${approvedCount}/${designs.length})`
              : approvedCount > 0
              ? `${approvedCount}/${designs.length} Approved`
              : 'Draft Pending Owner Sign-Off';
          return `
            <tr>
              <td><strong>${escapeHtml(tier.code)}</strong></td>
              <td class="tabular"><strong>${formatBdt(tier.price_bdt)}</strong></td>
              <td>${designs.map((d) => `${escapeHtml(d.id)} ${escapeHtml(d.name)}`).join(', ')}</td>
              <td><span class="status-badge" style="${badgeStyle}">${badgeText}</span></td>
            </tr>`;
        })
        .join('');
    }

    const promoBody = document.getElementById('adminPromosBody');
    if (promoBody) {
      promoBody.innerHTML = state.promotions
        .map(
          (pr) => `
          <tr>
            <td><code style="font-family:var(--font-mono);">${escapeHtml(pr.code)}</code></td>
            <td><strong>${escapeHtml(pr.title)}</strong><br><small style="color:var(--mute);">${escapeHtml(pr.description || '')}</small></td>
            <td class="tabular">${Number(pr.min_qty || 1)}</td>
            <td>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <select class="sort-field" data-promo-type="${escapeHtml(pr.code)}" style="padding:5px 8px;font-size:0.76rem;">
                  ${['NONE', 'FIXED_BDT', 'PERCENT', 'INQUIRY']
                    .map((dt) => `<option value="${dt}" ${pr.discount_type === dt ? 'selected' : ''}>${dt}</option>`)
                    .join('')}
                </select>
                <input type="number" class="stock-input" data-promo-value="${escapeHtml(pr.code)}" value="${Number(pr.discount_value || 0)}" min="0" max="50000" aria-label="Discount value for ${escapeHtml(pr.code)}">
              </div>
            </td>
            <td>
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;white-space:nowrap;cursor:pointer;">
                <input type="checkbox" data-promo-freeship="${escapeHtml(pr.code)}" ${pr.free_shipping ? 'checked' : ''}>
                Free Ship
              </label>
            </td>
            <td><span class="status-badge" style="background:${pr.active && !pr.requires_approval ? '#15803d' : '#5b1a24'};">${pr.active && !pr.requires_approval ? 'Active' : 'Inactive / Draft'}</span></td>
            <td>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="action-btn" data-save-promo="${escapeHtml(pr.code)}">Save</button>
                <button type="button" class="action-btn" data-toggle-promo="${escapeHtml(pr.code)}">
                  ${pr.active && !pr.requires_approval ? 'Pause' : 'Approve & Activate'}
                </button>
              </div>
            </td>
          </tr>`
        )
        .join('');

      async function savePromo(code, nextActive) {
        const promo = state.promotions.find((x) => x.code === code);
        if (!promo) return;
        const typeEl = promoBody.querySelector(`[data-promo-type="${code}"]`);
        const valEl = promoBody.querySelector(`[data-promo-value="${code}"]`);
        const shipEl = promoBody.querySelector(`[data-promo-freeship="${code}"]`);
        const discountType = typeEl ? typeEl.value : promo.discount_type || 'NONE';
        const discountValue = valEl ? Math.max(0, parseInt(valEl.value, 10) || 0) : Number(promo.discount_value || 0);
        const freeShipping = shipEl ? Boolean(shipEl.checked) : Boolean(promo.free_shipping);

        try {
          const res = await adminFetch('api/admin?action=update_promotion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: promo.code,
              title: promo.title,
              subtitle: promo.subtitle || '',
              tier_type: promo.tier_type || 'SINGLE',
              min_qty: Number(promo.min_qty || 1),
              applies_to: promo.applies_to || 'hoodies',
              discount_type: discountType,
              discount_value: discountValue,
              free_shipping: freeShipping,
              combinable: Boolean(promo.combinable),
              active: nextActive,
              requires_approval: !nextActive,
              description: promo.description || ''
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to update promotion');
          promo.discount_type = discountType;
          promo.discount_value = discountValue;
          promo.free_shipping = freeShipping;
          promo.active = nextActive;
          promo.requires_approval = !nextActive;
          renderPricingAndPromotions();
          adminToast(`Promotion ${code} saved (${nextActive ? 'Active' : 'Draft/Paused'}).`);
        } catch (err) {
          adminToast(err.message);
        }
      }

      promoBody.querySelectorAll('[data-save-promo]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const code = btn.dataset.savePromo;
          const promo = state.promotions.find((x) => x.code === code);
          if (!promo) return;
          const currentActive = Boolean(promo.active && !promo.requires_approval);
          savePromo(code, currentActive);
        });
      });

      promoBody.querySelectorAll('[data-toggle-promo]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const code = btn.dataset.togglePromo;
          const promo = state.promotions.find((x) => x.code === code);
          if (!promo) return;
          const nextActive = !(promo.active && !promo.requires_approval);
          savePromo(code, nextActive);
        });
      });
    }
  }

  function renderAuditLogs() {
    const body = document.getElementById('auditLogsBody');
    if (!body) return;
    body.innerHTML =
      state.auditLogs
        .map(
          (l) => `
          <tr>
            <td><small>${l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</small></td>
            <td><code style="font-family:var(--font-mono);">${escapeHtml(l.action || '')}</code></td>
            <td>${escapeHtml(l.actor || 'admin')}</td>
            <td>${escapeHtml(l.target_id || l.target_type || '—')}</td>
          </tr>`
        )
        .join('') || '<tr><td colspan="4" style="text-align:center;color:var(--mute);padding:20px;">No audit log entries loaded.</td></tr>';
  }

  // Event bindings
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('loginError');
    if (errEl) errEl.style.display = 'none';

    const mode = document.querySelector('input[name="authMode"]:checked')?.value || 'key';
    const passVal = document.getElementById('passkeyInput').value.trim();

    if (mode === 'jwt') {
      if (passVal.length < 20) {
        if (errEl) errEl.style.display = 'block';
        return;
      }
      authHeaders = { Authorization: `Bearer ${passVal}` };
    } else {
      if (passVal.length < 32) {
        if (errEl) errEl.style.display = 'block';
        return;
      }
      authHeaders = { 'X-Admin-Key': passVal };
    }

    try {
      const response = await adminFetch('api/admin?action=get_dashboard');
      if (!response.ok) throw new Error('Authentication rejected');
      const data = await response.json();
      state.authenticated = true;
      window.__STARKIT_ADMIN_HEADERS = authHeaders;
      window.dispatchEvent(new CustomEvent('starkit:admin-authenticated'));
      applyDashboardData(data);
      populateSkuSelectors();
      setSyncStatus('Authenticated Session', true);
      document.getElementById('passkeyInput').value = '';
      loginGate.style.display = 'none';
      renderDashboard();
    } catch {
      authHeaders = {};
      window.__STARKIT_ADMIN_HEADERS = {};
      if (errEl) errEl.style.display = 'block';
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    authHeaders = {};
    window.__STARKIT_ADMIN_HEADERS = {};
    state.authenticated = false;
    state.orders = [];
    location.reload();
  });

  window.switchTab = function (tabId) {
    document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.toggle('active', c.id === tabId));
  };

  document.querySelectorAll('.admin-tab-btn[data-tab]').forEach((b) => {
    b.addEventListener('click', () => window.switchTab(b.dataset.tab));
  });

  document.getElementById('saveInventoryBtn')?.addEventListener('click', async () => {
    if (!dirtyInventory.size) {
      adminToast('No modified SKU stock values to save.');
      return;
    }
    const updates = [];
    dirtyInventory.forEach((sku) => {
      const inp = document.querySelector(`[data-stock-sku="${sku}"]`);
      if (inp) updates.push({ sku, stock_quantity: parseInt(inp.value, 10) || 0 });
    });

    try {
      for (const u of updates) {
        const res = await adminFetch('api/admin?action=update_stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(u)
        });
        if (!res.ok) throw new Error(`Failed updating ${u.sku}`);
      }
      dirtyInventory.clear();
      adminToast(`Saved stock updates for ${updates.length} SKU(s).`);
    } catch (err) {
      adminToast(err.message);
    }
  });

  document.getElementById('sevenGateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const modal = document.getElementById('sevenGateModal');
    const productId = modal.dataset.productId;
    const sku = modal.dataset.sku;
    const targetStatus = document.getElementById('gateTargetStatus')?.value || 'APPROVED';
    const payload = {
      product_id: productId,
      next_status: targetStatus,
      approve_tier_price: Boolean(document.getElementById('gatePricing').checked),
      evidence: {
        artwork_rights_ok: Boolean(document.getElementById('gateLegal').checked),
        garment_specs_ok: Boolean(document.getElementById('gateSpecs').checked),
        sample_photo_ok: Boolean(document.getElementById('gateMedia').checked),
        size_run_ok: Boolean(document.getElementById('gateDesign').checked),
        stock_count_ok: Boolean(document.getElementById('gateStock').checked),
        pricing_approved_ok: Boolean(document.getElementById('gatePricing').checked),
        commercial_terms_ok: Boolean(document.getElementById('gateCommercial').checked),
        evidence_notes: `Reviewer: ${document.getElementById('gateOwner').value.trim()} — ${document.getElementById('gateNotes').value.trim()}`
      }
    };

    try {
      const res = await adminFetch('api/admin?action=submit_approval_evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '7-gate submission rejected');
      modal.style.display = 'none';
      adminToast(
        `${productId} (${sku}) transitioned cleanly to ${data.product?.approval_status || targetStatus}.`
      );
      const dashRes = await adminFetch('api/admin?action=get_dashboard');
      if (dashRes.ok) {
        applyDashboardData(await dashRes.json());
        renderDashboard();
      }
    } catch (err) {
      adminToast(err.message);
    }
  });

  document.getElementById('mediaUploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('uploadImageFile');
    const sku = document.getElementById('uploadTargetSku').value;
    const view = document.getElementById('uploadTargetView').value;
    const file = fileInput?.files?.[0];
    if (!file || !sku) {
      adminToast('Select an image file and target SKU.');
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      adminToast('Image exceeds 4.5MB upload cap.');
      return;
    }

    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('Failed reading file'));
      reader.readAsDataURL(file);
    });

    try {
      const res = await adminFetch('api/admin?action=upload_media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          design_id: sku.startsWith('STK-') ? sku.slice(0, 8) : sku,
          view_type: view,
          base64_data: base64Data
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      adminToast(`Uploaded ${file.name} for ${sku} (${view}) → ${data.storage_path}.`);
      fileInput.value = '';
      const dashRes = await adminFetch('api/admin?action=get_dashboard');
      if (dashRes.ok) {
        applyDashboardData(await dashRes.json());
        renderDashboard();
      }
    } catch (err) {
      adminToast(err.message);
    }
  });

  document.getElementById('storeSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      settings: [
        { key: 'delivery_dhaka_bdt', value: parseInt(document.getElementById('settingDhaka').value, 10) || 80 },
        { key: 'delivery_outside_bdt', value: parseInt(document.getElementById('settingOutside').value, 10) || 150 },
        { key: 'free_shipping_threshold', value: parseInt(document.getElementById('settingFreeThreshold').value, 10) || 3000 },
        { key: 'cod_enabled', value: document.getElementById('settingCodStatus').value === 'true' },
        { key: 'support_phone', value: String(document.getElementById('settingPhone').value).trim() },
        { key: 'store_mode', value: String(document.getElementById('settingStoreMode').value).trim() }
      ]
    };
    try {
      const res = await adminFetch('api/admin?action=update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Settings update rejected');
      adminToast('Store operational settings saved.');
    } catch (err) {
      adminToast(err.message);
    }
  });

  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (!state.orders.length) {
      adminToast('No orders to export.');
      return;
    }
    const headers = ['Reference', 'Created', 'Customer', 'Phone', 'Zone', 'District', 'Address', 'Total_BDT', 'Status'];
    const csvRows = [
      headers.join(','),
      ...state.orders.map((o) =>
        [
          o.reference,
          o.created_at,
          o.customer_name,
          o.customer_phone,
          o.zone,
          o.district,
          o.shipping_address,
          o.total_bdt,
          o.status
        ]
          .map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`)
          .join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `starkit-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  ['orderSearchInput', 'orderStatusFilter', 'orderZoneFilter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderOrdersTable);
    document.getElementById(id)?.addEventListener('change', renderOrdersTable);
  });
}
