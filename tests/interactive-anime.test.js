import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldReduceMotion,
  collectShowroomEntranceTargets,
  animateShowroomHeroEntrance
} from '../assets/js/interactive-anime.js';

function createMockNode(id = '', children = []) {
  const attrs = {};
  return {
    id,
    children,
    style: { opacity: '', transform: '', willChange: '' },
    setAttribute(name, val) {
      attrs[name] = String(val);
    },
    getAttribute(name) {
      return attrs[name] ?? null;
    }
  };
}

function createMockRoot() {
  const showroom = createMockNode('showroom');
  const introChildren = [
    createMockNode('logo'),
    createMockNode('eyebrow'),
    createMockNode('headline'),
    createMockNode('copy'),
    createMockNode('cta-group'),
    createMockNode('meta-line')
  ];
  const intro = createMockNode('intro', introChildren);
  const stage = createMockNode('showroomStage');
  const stageTabs = [createMockNode('tab-front'), createMockNode('tab-back')];
  const panel = createMockNode('floatingPurchasePanel');
  const wardrobeHead = createMockNode('wardrobeHead');
  const wardrobeItems = [createMockNode('w-1'), createMockNode('w-2'), createMockNode('w-3')];
  const statCells = [createMockNode('stat-1'), createMockNode('stat-2')];

  return {
    showroom,
    introChildren,
    stage,
    stageTabs,
    panel,
    wardrobeHead,
    wardrobeItems,
    statCells,
    querySelector(sel) {
      if (sel === '.showroom') return showroom;
      if (sel === '.showroom-intro, .hero-copy') return intro;
      if (sel === '#showroomStage') return stage;
      if (sel === '#floatingPurchasePanel') return panel;
      if (sel === '.wardrobe-head') return wardrobeHead;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.stage-view-tabs .stage-view-tab') return stageTabs;
      if (sel === '#wardrobeRail .wardrobe-item') return wardrobeItems;
      if (sel === '.stats-strip .stat-cell') return statCells;
      return [];
    }
  };
}

test('shouldReduceMotion evaluates prefers-reduced-motion media query safely', () => {
  assert.equal(shouldReduceMotion(null), false);
  assert.equal(shouldReduceMotion({ matchMedia: () => ({ matches: false }) }), false);
  assert.equal(shouldReduceMotion({ matchMedia: () => ({ matches: true }) }), true);
});

test('collectShowroomEntranceTargets gathers intro, stage, panel, wardrobe, and stats nodes', () => {
  const root = createMockRoot();
  const collected = collectShowroomEntranceTargets(root);
  assert.equal(collected.introItems.length, 6);
  assert.equal(collected.stage, root.stage);
  assert.equal(collected.stageTabs.length, 2);
  assert.equal(collected.panel, root.panel);
  assert.equal(collected.wardrobeItems.length, 3);
  assert.equal(collected.statCells.length, 2);
});

test('animateShowroomHeroEntrance skips timeline and clears inline styles when prefers-reduced-motion matches', () => {
  const root = createMockRoot();
  root.panel.style.opacity = '0.2';
  root.panel.style.transform = 'translateY(12px)';

  const res = animateShowroomHeroEntrance({
    root,
    win: { matchMedia: (q) => ({ matches: q.includes('reduce') }) }
  });

  assert.equal(res.mode, 'reduced');
  assert.equal(res.timeline, null);
  assert.equal(root.showroom.getAttribute('data-entrance'), 'reduced');
  assert.equal(root.panel.style.opacity, '');
  assert.equal(root.panel.style.transform, '');
});
