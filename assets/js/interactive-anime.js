/**
 * StarkiT Luxury Interactive Micro-UI Engine — Anime.js
 * Implements kinetic typography, 3D card tilt with specular glow, magnetic buttons,
 * and statistical counter rollups.
 */

export function initInteractiveUI() {
  const hasAnime = typeof window.anime !== 'undefined';

  // 1. KINETIC HERO TYPOGRAPHY STAGGER
  const heroHeading = document.querySelector('.hero-copy h1');
  if (heroHeading && hasAnime) {
    try {
      window.anime({
        targets: heroHeading,
        opacity: [0, 1],
        translateY: [40, 0],
        easing: 'easeOutExpo',
        duration: 1200,
        delay: 200
      });

      const heroP = document.querySelector('.hero-copy p');
      if (heroP) {
        window.anime({
          targets: heroP,
          opacity: [0, 1],
          translateY: [25, 0],
          easing: 'easeOutExpo',
          duration: 1000,
          delay: 450
        });
      }

      const heroActions = document.querySelector('.hero-copy .hero-bottom');
      if (heroActions) {
        window.anime({
          targets: heroActions,
          opacity: [0, 1],
          translateY: [20, 0],
          easing: 'easeOutExpo',
          duration: 900,
          delay: 650
        });
      }
    } catch (e) {
      console.warn('Anime hero typography error:', e);
    }
  }

  // 2. 3D CARD PERSPECTIVE TILT & SPECULAR CURSOR GLOW
  function setupCardTilt() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
      if (card.__tiltBound) return;
      card.__tiltBound = true;

      const media = card.querySelector('.card-media') || card;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotX = ((y - centerY) / centerY) * -9;
        const rotY = ((x - centerX) / centerX) * 9;

        card.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)';
        card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        setTimeout(() => {
          card.style.transition = '';
        }, 450);
      });
    });
  }

  setupCardTilt();

  // Watch for dynamic card grid updates
  const grid = document.getElementById('productsGrid');
  if (grid) {
    const observer = new MutationObserver(() => {
      setupCardTilt();
    });
    observer.observe(grid, { childList: true });
  }

  // 3. MAGNETIC BUTTON MICRO-INTERACTION
  const magneticButtons = document.querySelectorAll('.btn, .btn-light, .icon-btn, [data-open-cart]');
  magneticButtons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)';
      btn.style.transform = 'translate(0, 0)';
      setTimeout(() => {
        btn.style.transition = '';
      }, 350);
    });
  });

  // 4. STATISTICAL COUNTER ROLLUPS (Anime.js)
  const counterElements = document.querySelectorAll('[data-counter]');
  if (counterElements.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const targetVal = parseInt(el.dataset.counter, 10) || 0;
            const prefix = el.dataset.counterPrefix || '';
            const suffix = el.dataset.counterSuffix || '';

            if (hasAnime) {
              const obj = { val: 0 };
              window.anime({
                targets: obj,
                val: targetVal,
                round: 1,
                easing: 'easeOutExpo',
                duration: 1800,
                update: () => {
                  el.textContent = `${prefix}${obj.val.toLocaleString()}${suffix}`;
                }
              });
            } else {
              el.textContent = `${prefix}${targetVal.toLocaleString()}${suffix}`;
            }
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.2 }
    );

    counterElements.forEach((el) => counterObserver.observe(el));
  }

  // 5. ANIMATED NOTIFICATION TOAST POP
  window.animeToast = function (message) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = message;
    t.hidden = false;

    if (hasAnime) {
      window.anime.remove(t);
      window.anime({
        targets: t,
        translateY: [20, 0],
        opacity: [0, 1],
        scale: [0.92, 1],
        easing: 'easeOutElastic(1, .8)',
        duration: 600
      });

      clearTimeout(window.animeToast.timer);
      window.animeToast.timer = setTimeout(() => {
        window.anime({
          targets: t,
          opacity: [1, 0],
          translateY: [0, 15],
          easing: 'easeInQuad',
          duration: 350,
          complete: () => {
            t.hidden = true;
          }
        });
      }, 3200);
    } else {
      clearTimeout(window.animeToast.timer);
      window.animeToast.timer = setTimeout(() => {
        t.hidden = true;
      }, 3200);
    }
  };
}
