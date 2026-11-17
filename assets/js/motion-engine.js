/**
 * StarkiT Unified Motion & Micro-UI Orchestrator (Anime.js v4.5.0)
 * Orchestrates kinetic hero timelines, scroll progress & section reveals,
 * desktop fine-pointer 3D card tilt + gold specular cursor aura, magnetic buttons,
 * stat counter rollups, cart/product tactile springs, and spring toast pops.
 */
import { animate, createTimeline, stagger, createSpring, utils } from './vendor/anime.esm.js';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isFinePointer = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let toastHideTimer = null;

export function luxuryToast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.hidden = false;

  clearTimeout(toastHideTimer);

  if (prefersReduced()) {
    t.style.opacity = '1';
    toastHideTimer = setTimeout(() => {
      t.hidden = true;
    }, 3200);
    return;
  }

  utils.remove(t);
  animate(t, {
    y: [22, 0],
    opacity: [0, 1],
    scale: [0.92, 1],
    ease: createSpring({ stiffness: 360, damping: 24 }),
    duration: 580
  });

  toastHideTimer = setTimeout(() => {
    utils.remove(t);
    animate(t, {
      opacity: [1, 0],
      y: [0, 16],
      ease: 'inQuad',
      duration: 280,
      onComplete: () => {
        t.hidden = true;
        t.style.opacity = '';
        t.style.transform = '';
      }
    });
  }, 3100);
}

export function animateHeroSwap(pictureEl, nameEl, direction = 1) {
  if (!pictureEl || prefersReduced()) return;
  const img = pictureEl.querySelector('img');
  const offset = direction >= 0 ? 34 : -34;
  if (img) {
    utils.remove(img);
    animate(img, {
      opacity: [0, 1],
      x: [offset, 0],
      scale: [0.965, 1],
      ease: 'outExpo',
      duration: 620,
      onComplete: () => {
        img.style.transform = '';
      }
    });
  }
  if (nameEl) {
    utils.remove(nameEl);
    animate(nameEl, {
      opacity: [0, 1],
      y: [10, 0],
      ease: 'outExpo',
      duration: 480,
      onComplete: () => {
        nameEl.style.transform = '';
      }
    });
  }
}

export function animateGallerySwap(galleryEl) {
  if (!galleryEl || prefersReduced()) return;
  const target = galleryEl.querySelector('img') || galleryEl.querySelector('.dev-concept-stage');
  if (!target) return;
  utils.remove(target);
  animate(target, {
    opacity: [0.35, 1],
    scale: [0.975, 1],
    ease: 'outExpo',
    duration: 460,
    onComplete: () => {
      target.style.transform = '';
    }
  });
}

export function animateCartOpen() {
  if (prefersReduced()) return;
  const lines = document.querySelectorAll('#cartItems .cart-line');
  if (!lines.length) return;
  utils.remove(lines);
  animate(lines, {
    opacity: [0, 1],
    x: [22, 0],
    delay: stagger(45, { start: 60 }),
    ease: 'outExpo',
    duration: 520,
    onComplete: () => {
      lines.forEach((el) => {
        el.style.transform = '';
        el.style.opacity = '';
      });
    }
  });
}

export function animateSpringPop(target) {
  if (!target || prefersReduced()) return;
  const els = typeof target === 'string' ? document.querySelectorAll(target) : target instanceof NodeList || Array.isArray(target) ? target : [target];
  if (!els.length) return;
  utils.remove(els);
  animate(els, {
    scale: [1, 1.18, 1],
    ease: createSpring({ stiffness: 460, damping: 18 }),
    duration: 420,
    onComplete: () => {
      els.forEach((el) => {
        if (el?.style) el.style.transform = '';
      });
    }
  });
}

export function initMotionEngine() {
  if (typeof window === 'undefined') return;
  window.luxuryToast = luxuryToast;
  const reduced = prefersReduced();
  const finePointer = isFinePointer();

  // 1. SCROLL-LINKED READING PROGRESS BAR (rAF-coalesced)
  let progressBar = document.getElementById('scrollProgressBar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'scrollProgressBar';
    document.body.appendChild(progressBar);
  }

  let progressRaf = 0;
  function paintScrollProgress() {
    progressRaf = 0;
    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalScroll > 0 ? window.scrollY / totalScroll : 0;
    progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress)).toFixed(4)})`;
  }
  function scheduleScrollProgress() {
    if (!progressRaf) progressRaf = requestAnimationFrame(paintScrollProgress);
  }
  window.addEventListener('scroll', scheduleScrollProgress, { passive: true });
  paintScrollProgress();

  // 2. ORCHESTRATED KINETIC HERO ENTRANCE TIMELINE (Anime.js v4)
  const heroCopy = document.querySelector('.hero-copy');
  if (heroCopy && !reduced) {
    const logoStamp = heroCopy.querySelector('.hero-logo-stamp');
    const eyebrow = heroCopy.querySelector('.eyebrow');
    const h1 = heroCopy.querySelector('h1');
    const copyP = heroCopy.querySelector('p');
    const actions = heroCopy.querySelector('.hero-bottom');
    const heroPic = document.querySelector('#heroPicture');
    const statCells = document.querySelectorAll('.stats-strip .stat-cell');

    const tl = createTimeline({
      defaults: { ease: 'outExpo', duration: 680 }
    });

    if (logoStamp) tl.add(logoStamp, { opacity: [0, 1], y: [14, 0] }, 20);
    if (eyebrow) tl.add(eyebrow, { opacity: [0, 1], y: [14, 0] }, 60);
    if (h1) tl.add(h1, { opacity: [0, 1], y: [24, 0], duration: 760 }, 110);
    if (copyP) tl.add(copyP, { opacity: [0, 1], y: [16, 0] }, 210);
    if (actions) tl.add(actions, { opacity: [0, 1], y: [14, 0] }, 280);
    if (heroPic) tl.add(heroPic, { opacity: [0, 1], scale: [0.97, 1], duration: 720 }, 150);
    if (statCells.length) {
      tl.add(
        statCells,
        {
          opacity: [0, 1],
          y: [12, 0],
          delay: stagger(55),
          duration: 540,
          onComplete: () => statCells.forEach((el) => (el.style.transform = ''))
        },
        320
      );
    }
  }

  // 3. LOOKBOOK & STORY & DETAIL SCROLL CHOREOGRAPHY
  if (!reduced && 'IntersectionObserver' in window) {
    const scrollItems = document.querySelectorAll('.story-copy > *, .specs .spec, .section-head');
    if (scrollItems.length) {
      const revealIO = new IntersectionObserver(
        (entries, obs) => {
          const visibleTargets = [];
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              visibleTargets.push(entry.target);
              obs.unobserve(entry.target);
            }
          });
          if (visibleTargets.length) {
            animate(visibleTargets, {
              opacity: [0, 1],
              y: [18, 0],
              delay: stagger(45),
              ease: 'outExpo',
              duration: 580,
              onComplete: () => {
                visibleTargets.forEach((el) => {
                  el.style.transform = '';
                  el.style.opacity = '';
                });
              }
            });
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -24px 0px' }
      );
      scrollItems.forEach((el) => revealIO.observe(el));
    }

    const lookTrack = document.getElementById('looksTrack');
    if (lookTrack) {
      const animateLookTiles = () => {
        const tiles = lookTrack.querySelectorAll('.look-tile:not([data-animated])');
        if (!tiles.length) return;
        tiles.forEach((t) => (t.dataset.animated = '1'));
        animate(tiles, {
          opacity: [0, 1],
          y: [18, 0],
          delay: stagger(45, { start: 30 }),
          ease: 'outExpo',
          duration: 580,
          onComplete: () => {
            tiles.forEach((el) => {
              el.style.transform = '';
              el.style.opacity = '';
            });
          }
        });
      };

      const lookIO = new IntersectionObserver(
        (entries, obs) => {
          if (entries.some((e) => e.isIntersecting)) {
            animateLookTiles();
            obs.disconnect();
          }
        },
        { threshold: 0.08 }
      );
      lookIO.observe(lookTrack);
    }
  }

  // 4. GRID STAGGER ON FILTER/SEARCH UPDATES
  function animateGridStagger() {
    const cards = document.querySelectorAll('#productsGrid .card');
    if (!cards.length) return;

    cards.forEach((c) => c.classList.add('visible'));
    if (reduced) return;

    utils.remove(cards);
    animate(cards, {
      opacity: [0, 1],
      y: [16, 0],
      delay: stagger(28, { start: 20 }),
      ease: 'outExpo',
      duration: 520,
      onComplete: () => {
        cards.forEach((c) => {
          c.style.transform = '';
          c.style.opacity = '';
        });
      }
    });
  }

  const grid = document.getElementById('productsGrid');
  if (grid) {
    animateGridStagger();
    const observer = new MutationObserver(() => {
      animateGridStagger();
    });
    observer.observe(grid, { childList: true });
  }

  // 5. SUBTLE TACTILE MAGNETIC INTERACTION FOR PRIMARY CTAs
  if (finePointer && !reduced) {
    const magneticButtons = document.querySelectorAll('.btn, .btn-light, .icon-btn, [data-open-cart]');
    magneticButtons.forEach((btn) => {
      if (btn.__magBound) return;
      btn.__magBound = true;
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${(x * 0.1).toFixed(1)}px, ${(y * 0.1).toFixed(1)}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)';
        btn.style.transform = 'translate(0, 0)';
        setTimeout(() => {
          btn.style.transition = '';
          btn.style.transform = '';
        }, 220);
      });
    });
  }

  // 7. STATISTICAL COUNTER ROLLUPS (Anime.js v4)
  const counterElements = document.querySelectorAll('[data-counter]');
  if (counterElements.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const targetVal = parseInt(el.dataset.counter, 10) || 0;
          const prefix = el.dataset.counterPrefix || '';
          const suffix = el.dataset.counterSuffix || '';

          if (!reduced) {
            const state = { val: 0 };
            animate(state, {
              val: targetVal,
              modifier: utils.round(0),
              ease: 'outExpo',
              duration: 1550,
              onUpdate: () => {
                el.textContent = `${prefix}${Number(state.val).toLocaleString()}${suffix}`;
              },
              onComplete: () => {
                el.textContent = `${prefix}${targetVal.toLocaleString()}${suffix}`;
              }
            });
          } else {
            el.textContent = `${prefix}${targetVal.toLocaleString()}${suffix}`;
          }
          obs.unobserve(el);
        });
      },
      { threshold: 0.2 }
    );

    counterElements.forEach((el) => counterObserver.observe(el));
  }
}
