/**
 * StarkiT Unified Motion & Micro-UI Orchestrator
 * Fuses Motion.dev (Spring physics, scroll-linked progress, gesture dragging)
 * with Anime.js (Kinetic typography, 3D card tilt, magnetic buttons, counter rollups)
 * and an ambient luxury cursor aura.
 */

export function initMotionEngine() {
  const hasAnime = typeof window.anime !== 'undefined';
  const hasMotion = typeof window.Motion !== 'undefined';

  // 1. SCROLL-LINKED READING PROGRESS BAR (Motion.dev / Fallback)
  let progressBar = document.getElementById('scrollProgressBar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'scrollProgressBar';
    progressBar.style.cssText =
      'position:fixed;top:0;left:0;height:3px;width:100%;z-index:9999;background:linear-gradient(90deg,#be555c,#c5a880,#ebd8d9);transform-origin:0% 50%;transform:scaleX(0);pointer-events:none;';
    document.body.appendChild(progressBar);
  }

  function updateScrollProgress() {
    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalScroll > 0 ? window.scrollY / totalScroll : 0;
    progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress();

  // 2. LUXURY AMBIENT CURSOR GLOW (Desktop only)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice && !document.getElementById('cursorGlow')) {
    const glow = document.createElement('div');
    glow.id = 'cursorGlow';
    glow.style.cssText =
      'position:fixed;top:0;left:0;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(197,168,128,0.08) 0%,rgba(190,85,92,0.04) 40%,transparent 70%);pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:opacity 0.4s ease;opacity:0;mix-blend-mode:screen;';
    document.body.appendChild(glow);

    let mouseX = -500;
    let mouseY = -500;
    let glowX = -500;
    let glowY = -500;

    window.addEventListener(
      'mousemove',
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        glow.style.opacity = '1';
      },
      { passive: true }
    );

    document.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    });

    function renderGlow() {
      glowX += (mouseX - glowX) * 0.12;
      glowY += (mouseY - glowY) * 0.12;
      glow.style.left = `${glowX}px`;
      glow.style.top = `${glowY}px`;
      requestAnimationFrame(renderGlow);
    }
    renderGlow();
  }

  // 3. KINETIC HERO TYPOGRAPHY STAGGER (Anime.js / Motion)
  const heroHeading = document.querySelector('.hero-copy h1');
  if (heroHeading && hasAnime) {
    try {
      window.anime({
        targets: heroHeading,
        opacity: [0, 1],
        translateY: [45, 0],
        easing: 'easeOutExpo',
        duration: 1200,
        delay: 200
      });

      const heroP = document.querySelector('.hero-copy p');
      if (heroP) {
        window.anime({
          targets: heroP,
          opacity: [0, 1],
          translateY: [30, 0],
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
          translateY: [25, 0],
          easing: 'easeOutExpo',
          duration: 900,
          delay: 650
        });
      }
    } catch (e) {
      console.warn('Hero typography animation error:', e);
    }
  }

  // 4. 3D CARD PERSPECTIVE TILT & SPECULAR CURSOR GLOW
  function setupCardTilt() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
      if (card.__tiltBound) return;
      card.__tiltBound = true;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotX = ((y - centerY) / centerY) * -10;
        const rotY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`;
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

  // Watch for dynamic card grid updates (filters / sorting)
  const grid = document.getElementById('productsGrid');
  if (grid) {
    const observer = new MutationObserver(() => {
      setupCardTilt();
      animateGridStagger();
    });
    observer.observe(grid, { childList: true });
  }

  function animateGridStagger() {
    if (!hasAnime) return;
    const cards = document.querySelectorAll('#productsGrid .card');
    if (!cards.length) return;
    try {
      window.anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [35, 0],
        scale: [0.96, 1],
        delay: window.anime.stagger(50, { start: 100 }),
        easing: 'easeOutExpo',
        duration: 750
      });
    } catch (e) {}
  }

  // 5. MAGNETIC BUTTON MICRO-INTERACTION (Proximity Physics)
  const magneticButtons = document.querySelectorAll('.btn, .btn-light, .icon-btn, [data-open-cart]');
  magneticButtons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)';
      btn.style.transform = 'translate(0, 0)';
      setTimeout(() => {
        btn.style.transition = '';
      }, 350);
    });
  });

  // 6. STATISTICAL COUNTER ROLLUPS
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

  // 7. SPRING NOTIFICATION TOAST POP
  window.luxuryToast = function (message, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = message;
    t.hidden = false;

    if (hasAnime) {
      window.anime.remove(t);
      window.anime({
        targets: t,
        translateY: [25, 0],
        opacity: [0, 1],
        scale: [0.9, 1],
        easing: 'easeOutElastic(1, .75)',
        duration: 700
      });

      clearTimeout(window.luxuryToast.timer);
      window.luxuryToast.timer = setTimeout(() => {
        window.anime({
          targets: t,
          opacity: [1, 0],
          translateY: [0, 20],
          easing: 'easeInQuad',
          duration: 350,
          complete: () => {
            t.hidden = true;
          }
        });
      }, 3200);
    } else {
      clearTimeout(window.luxuryToast.timer);
      window.luxuryToast.timer = setTimeout(() => {
        t.hidden = true;
      }, 3200);
    }
  };
}

export const luxuryToast = (msg, type) => {
  if (typeof window.luxuryToast === 'function') {
    window.luxuryToast(msg, type);
  }
};
