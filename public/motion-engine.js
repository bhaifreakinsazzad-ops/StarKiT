/**
 * StarkiT Unified Motion & Micro-UI Orchestrator (Anime.js v4.5.0)
 * Orchestrates kinetic hero timelines, scroll progress & section reveals,
 * desktop fine-pointer 3D card tilt + gold specular cursor aura, magnetic buttons,
 * stat counter rollups, cart/product tactile springs, and spring toast pops.
 */
import { animate, createTimeline, stagger, createSpring, utils } from './vendor/anime.esm.js';

export function shouldReduceMotion(win = typeof window !== 'undefined' ? window : null) {
  return Boolean(
    win &&
      typeof win.matchMedia === 'function' &&
      win.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const prefersReduced = () => shouldReduceMotion();

const isFinePointer = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function collectShowroomEntranceTargets(root = typeof document !== 'undefined' ? document : null) {
  if (!root || typeof root.querySelector !== 'function') {
    return {
      showroom: null,
      logo: null,
      eyebrow: null,
      headline: null,
      paragraph: null,
      ctaButtons: [],
      metaLine: null,
      introItems: [],
      stage: null,
      stageTabs: [],
      panel: null,
      wardrobeHead: null,
      wardrobeItems: [],
      statCells: []
    };
  }
  const showroom = root.querySelector('.showroom');
  const introContainer = root.querySelector('.showroom-intro, .hero-copy');
  const logo = introContainer?.querySelector?.('.hero-logo-stamp') || null;
  const eyebrow = introContainer?.querySelector?.('.eyebrow') || null;
  const headline = introContainer?.querySelector?.('h1') || null;
  const paragraph = introContainer?.querySelector?.('p') || null;
  const rawCtas =
    introContainer && typeof introContainer.querySelectorAll === 'function'
      ? Array.from(introContainer.querySelectorAll('.showroom-cta-group > *, a.btn, button.btn'))
      : [];
  const ctaButtons = Array.from(new Set(rawCtas));
  const metaLine = introContainer?.querySelector?.('.showroom-meta-line') || null;

  const explicitSequence = [logo, eyebrow, headline, paragraph, ...ctaButtons, metaLine].filter(Boolean);
  const introItems = explicitSequence.length
    ? explicitSequence
    : introContainer
    ? Array.from(introContainer.children || [])
    : [];

  const stage = root.querySelector('#showroomStage') || root.querySelector('#heroPicture');
  const stageTabs = Array.from(root.querySelectorAll('.stage-view-tabs .stage-view-tab'));
  const panel = root.querySelector('#floatingPurchasePanel');
  const wardrobeHead = root.querySelector('.wardrobe-head');
  const wardrobeItems = Array.from(root.querySelectorAll('#wardrobeRail .wardrobe-item'));
  const statCells = Array.from(root.querySelectorAll('.stats-strip .stat-cell'));
  return {
    showroom,
    logo,
    eyebrow,
    headline,
    paragraph,
    ctaButtons,
    metaLine,
    introItems,
    stage,
    stageTabs,
    panel,
    wardrobeHead,
    wardrobeItems,
    statCells
  };
}

let activeShowroomTimeline = null;

function clearInlineMotionStyles(nodes) {
  nodes.forEach((el) => {
    if (!el || !el.style) return;
    el.style.opacity = '';
    el.style.transform = '';
    el.style.willChange = '';
  });
}

export function animateShowroomHeroEntrance(options = {}) {
  const root = options.root || (typeof document !== 'undefined' ? document : null);
  const win = options.win || (typeof window !== 'undefined' ? window : null);
  const targets = collectShowroomEntranceTargets(root);
  const allNodes = [
    ...targets.introItems,
    targets.stage,
    ...targets.stageTabs,
    targets.panel,
    targets.wardrobeHead,
    ...targets.wardrobeItems,
    ...targets.statCells
  ].filter(Boolean);

  if (!allNodes.length) {
    return { mode: 'empty', timeline: null, targets };
  }

  const reduced = shouldReduceMotion(win);
  if (reduced) {
    if (activeShowroomTimeline && typeof activeShowroomTimeline.pause === 'function') {
      activeShowroomTimeline.pause();
      activeShowroomTimeline = null;
    }
    utils.remove(allNodes);
    clearInlineMotionStyles(allNodes);
    if (targets.showroom && typeof targets.showroom.setAttribute === 'function') {
      targets.showroom.setAttribute('data-entrance', 'reduced');
    }
    return { mode: 'reduced', timeline: null, targets };
  }

  if (targets.showroom && typeof targets.showroom.setAttribute === 'function') {
    targets.showroom.setAttribute('data-entrance', 'animating');
  }

  utils.remove(allNodes);
  allNodes.forEach((el) => {
    if (el?.style) el.style.willChange = 'transform, opacity';
  });

  const tl = createTimeline({
    defaults: { ease: 'outExpo', duration: 640 },
    onComplete: () => {
      clearInlineMotionStyles(allNodes);
      if (targets.showroom && typeof targets.showroom.setAttribute === 'function') {
        targets.showroom.setAttribute('data-entrance', 'complete');
      }
      activeShowroomTimeline = null;
    }
  });

  if (targets.introItems.length) {
    tl.add(
      targets.introItems,
      {
        opacity: [0, 1],
        y: [18, 0],
        delay: stagger(65, { start: 20 }),
        duration: 620
      },
      0
    );
  }

  if (targets.stage) {
    tl.add(
      targets.stage,
      {
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.975, 1],
        duration: 720
      },
      100
    );
  }

  if (targets.stageTabs.length) {
    tl.add(
      targets.stageTabs,
      {
        opacity: [0, 1],
        y: [10, 0],
        delay: stagger(40),
        duration: 460
      },
      260
    );
  }

  if (targets.panel) {
    tl.add(
      targets.panel,
      {
        opacity: [0, 1],
        x: [22, 0],
        y: [12, 0],
        duration: 680
      },
      180
    );
  }

  if (targets.wardrobeHead) {
    tl.add(
      targets.wardrobeHead,
      {
        opacity: [0, 1],
        y: [12, 0],
        duration: 480
      },
      240
    );
  }

  if (targets.wardrobeItems.length) {
    tl.add(
      targets.wardrobeItems,
      {
        opacity: [0, 1],
        y: [16, 0],
        delay: stagger(32),
        duration: 520
      },
      280
    );
  }

  if (targets.statCells.length) {
    tl.add(
      targets.statCells,
      {
        opacity: [0, 1],
        y: [14, 0],
        delay: stagger(50),
        duration: 500
      },
      340
    );
  }

  activeShowroomTimeline = tl;
  return { mode: 'animated', timeline: tl };
}

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
  const target = galleryEl.querySelector('img') || galleryEl.querySelector('.stage-provisional-slate');
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

  // 2. ORCHESTRATED STAGGERED SHOWROOM HERO ENTRANCE TIMELINE (Anime.js v4)
  animateShowroomHeroEntrance({ root: document, win: window });

  if (typeof window.matchMedia === 'function') {
    const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (typeof rmQuery.addEventListener === 'function' && !window.__starkitReducedListenerBound) {
      window.__starkitReducedListenerBound = true;
      rmQuery.addEventListener('change', (ev) => {
        if (ev.matches) {
          animateShowroomHeroEntrance({ root: document, win: window });
        }
      });
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
