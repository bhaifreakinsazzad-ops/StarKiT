import { escapeHtml, formatBdt } from '../core/validation.js';
import { PRICE_TIERS } from '../core/catalog-schema.js';
import { DEFAULT_PROMOTIONS } from '../core/pricing-engine.js';

export function initOfferDisplay({ products, onSelectTier }) {
  const tiersMount = document.getElementById('priceTiersMount');
  const offersMount = document.getElementById('offerDisplayMount');
  if (!tiersMount && !offersMount) return;

  const hoodies = (products || []).filter((p) => p.id && p.id.startsWith('STK-'));

  if (tiersMount) {
    const tierCards = Object.values(PRICE_TIERS)
      .map((tier) => {
        const tierProducts = hoodies.filter((p) => (p.price_tier || p.tier) === tier.code || Number(p.price_bdt) === tier.price_bdt);
        const approvedCount = tierProducts.filter((p) => p.price_approved).length;
        const namesList = tierProducts.map((p) => escapeHtml(p.name)).join(' · ') || 'Catalog slot';
        return `
          <article class="tier-card" data-tier-card="${escapeHtml(tier.code)}">
            <div>
              <div class="tier-head">
                <span class="tier-name">${escapeHtml(tier.label)}</span>
                <span class="tier-price">${formatBdt(tier.price_bdt)}</span>
              </div>
              <p class="tier-designs" style="margin-top:8px;">${namesList}</p>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--line);">
              <span class="smallcaps muted">${tierProducts.length} Designs · ${approvedCount > 0 ? `${approvedCount} Approved` : 'Draft Price'}</span>
              <button type="button" class="btn btn-outline btn-sm" data-filter-tier="${escapeHtml(tier.code)}">Filter Tier</button>
            </div>
          </article>`;
      })
      .join('');
    tiersMount.innerHTML = tierCards;

    tiersMount.querySelectorAll('[data-filter-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tierCode = btn.dataset.filterTier;
        tiersMount.querySelectorAll('.tier-card').forEach((card) => {
          card.classList.toggle('active', card.dataset.tierCard === tierCode);
        });
        if (onSelectTier) onSelectTier(tierCode);
        const colSection = document.getElementById('collection');
        if (colSection) colSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  if (offersMount) {
    const promos = Array.isArray(window.STARKIT_PROMOTIONS) && window.STARKIT_PROMOTIONS.length
      ? window.STARKIT_PROMOTIONS
      : DEFAULT_PROMOTIONS;

    const visibleOffers = promos.filter((pr) => pr.show_in_offer_panel !== false);

    offersMount.innerHTML = visibleOffers
      .map((promo) => {
        const isLive = Boolean(promo.active) && !promo.requires_approval;
        let rewardText = 'Standard tier pricing applied cleanly at checkout.';
        if (promo.discount_type === 'FIXED_BDT' && Number(promo.discount_value) > 0) {
          rewardText = `BDT ${Number(promo.discount_value).toLocaleString()} off${promo.free_shipping ? ' + Free Nationwide Shipping' : ''}`;
        } else if (promo.discount_type === 'PERCENT' && Number(promo.discount_value) > 0) {
          rewardText = `${Number(promo.discount_value)}% off`;
        } else if (promo.discount_type === 'INQUIRY') {
          rewardText = 'Direct B2B studio quote upon inquiry';
        } else if (promo.free_shipping) {
          rewardText = 'Free Nationwide Shipping';
        }
        return `
          <article class="offer-card">
            <div class="offer-kicker">${escapeHtml(promo.code)} · ${isLive ? 'Active Offer' : 'Draft Offer · Pending Owner Activation'}</div>
            <h3>${escapeHtml(promo.title)}</h3>
            <p>${escapeHtml(promo.description)}</p>
            <div style="margin-top:10px;font-family:var(--font-mono);font-size:0.76rem;color:var(--ink);">
              Min Hoodies: ${Number(promo.min_qty || 1)} · ${escapeHtml(rewardText)}
            </div>
          </article>`;
      })
      .join('');
  }
}
