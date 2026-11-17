/**
 * StarkiT Spatial 3D WebGL Showroom Engine — Three.js (r187+)
 * Bespoke procedural Atelier Monolith ("Obsidian Lacquer Core, Engraved Gold Filigree,
 * Dual Gimbal Rings, Instanced Diamond Nodes & Soft Starlight Nebula")
 * engineered with PMREM studio reflections, WebGL2 software-rasterizer pacing,
 * zero-allocation per-frame damping, touch-scroll safety, and full GPU disposal.
 */
import * as THREE from './vendor/three.module.js';

const _dampTarget = { rotX: 0, rotY: 0, scrollY: 0, impulse: 0 };
const _dummyObj = new THREE.Object3D();

function detectSoftwareWebGL() {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftware: true };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return { supported: true, isSoftware };
  } catch {
    return { supported: false, isSoftware: true };
  }
}

function createStudioEnvMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0b090a);

  const panelGeo = new THREE.PlaneGeometry(1, 1);
  const crispWhiteMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf6f4f0).multiplyScalar(2.4), side: THREE.DoubleSide });
  const champagneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfa177).multiplyScalar(1.9), side: THREE.DoubleSide });
  const crimsonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8e2934).multiplyScalar(1.5), side: THREE.DoubleSide });

  const keyPanel = new THREE.Mesh(panelGeo, crispWhiteMat);
  keyPanel.position.set(5, 6, 5);
  keyPanel.scale.set(7, 5, 1);
  keyPanel.lookAt(0, 0, 0);
  envScene.add(keyPanel);

  const rimPanel = new THREE.Mesh(panelGeo, champagneMat);
  rimPanel.position.set(-6, 3, -4);
  rimPanel.scale.set(6, 4, 1);
  rimPanel.lookAt(0, 0, 0);
  envScene.add(rimPanel);

  const bounceCrimsonPanel = new THREE.Mesh(panelGeo, crimsonMat);
  bounceCrimsonPanel.position.set(0, -6, 3);
  bounceCrimsonPanel.scale.set(8, 5, 1);
  bounceCrimsonPanel.lookAt(0, 0, 0);
  envScene.add(bounceCrimsonPanel);

  const envRT = pmrem.fromScene(envScene, 0.04);

  panelGeo.dispose();
  crispWhiteMat.dispose();
  champagneMat.dispose();
  crimsonMat.dispose();
  pmrem.dispose();

  return envRT;
}

function createEngravedGoldTexture(maxAnisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Sleek brushed titanium-champagne metallic finish
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#a88c66');
  grad.addColorStop(0.28, '#eae5dc');
  grad.addColorStop(0.55, '#bfa177');
  grad.addColorStop(0.82, '#f2eee6');
  grad.addColorStop(1, '#a88c66');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);

  // Subtle geometric heritage chevrons echoing the STΛRKIT wordmark
  ctx.strokeStyle = 'rgba(11, 9, 10, 0.25)';
  ctx.lineWidth = 2;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 16, 18);
    ctx.lineTo(x + 28, 64);
    ctx.lineTo(x + 16, 110);
    ctx.lineTo(x + 4, 64);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(11, 9, 10, 0.35)';
  ctx.fillRect(0, 10, 512, 3);
  ctx.fillRect(0, 115, 512, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = Math.min(8, maxAnisotropy || 1);
  return tex;
}

function createGlowSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(246, 244, 240, 0.95)');
  grad.addColorStop(0.32, 'rgba(191, 161, 119, 0.65)');
  grad.addColorStop(0.68, 'rgba(142, 41, 52, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initSpatialHero(containerId = 'spatialHeroContainer') {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const probe = detectSoftwareWebGL();
  if (!probe.supported) return null;

  const isSoftwareGl = probe.isSoftware;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Scene, Camera & ACES Filmic Renderer
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b090a, 0.036);

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const camera = new THREE.PerspectiveCamera(40, width / Math.max(1, height), 0.1, 80);
  camera.position.set(0, 0, 8.2);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);

  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1';
  container.insertBefore(canvas, container.firstChild);

  const disposables = [];
  const envRT = createStudioEnvMap(renderer);
  scene.environment = envRT.texture;
  disposables.push(envRT);

  // 2. Composite StarkiT Atelier Crest Assemblage
  const assemblage = new THREE.Group();
  assemblage.position.set(0.6, 0.05, -0.35);
  scene.add(assemblage);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const goldTexture = createEngravedGoldTexture(maxAniso);
  const spriteTexture = createGlowSpriteTexture();
  disposables.push(goldTexture, spriteTexture);

  // Part A: Faceted Deep Obsidian Lacquer Core
  const coreGeo = new THREE.IcosahedronGeometry(1.42, 0);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f0c0e,
    emissive: 0x220a0e,
    emissiveIntensity: 0.35,
    roughness: 0.14,
    metalness: 0.88,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.4,
    flatShading: true
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  assemblage.add(coreMesh);
  disposables.push(coreGeo, coreMat);

  // Part B: Outer Platinum-White Geodesic Filigree Cage
  const wireGeo = new THREE.IcosahedronGeometry(1.74, 1);
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xe6e1d9,
    metalness: 0.92,
    roughness: 0.22,
    wireframe: true,
    transparent: true,
    opacity: 0.42
  });
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  assemblage.add(wireMesh);
  disposables.push(wireGeo, wireMat);

  // Part C: Engraved Equatorial Ring
  const crownGeo = new THREE.TorusGeometry(2.05, 0.048, 20, 96);
  const crownMat = new THREE.MeshStandardMaterial({
    map: goldTexture,
    color: 0xf4efe7,
    metalness: 0.92,
    roughness: 0.22,
    envMapIntensity: 1.4
  });
  const crownMesh = new THREE.Mesh(crownGeo, crownMat);
  crownMesh.rotation.x = Math.PI * 0.36;
  crownMesh.rotation.y = Math.PI * 0.08;
  assemblage.add(crownMesh);
  disposables.push(crownGeo, crownMat);

  // Part D: Dual Celestial Gimbal Orbits (Platinum-Champagne + Restrained Crimson)
  const ringGeo1 = new THREE.TorusGeometry(2.42, 0.024, 16, 120);
  const ringMat1 = new THREE.MeshStandardMaterial({
    color: 0xdfd8ce,
    metalness: 0.94,
    roughness: 0.2,
    envMapIntensity: 1.4
  });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI / 3;
  assemblage.add(ring1);
  disposables.push(ringGeo1, ringMat1);

  const ringGeo2 = new THREE.TorusGeometry(2.74, 0.02, 16, 120);
  const ringMat2 = new THREE.MeshStandardMaterial({
    color: 0x8e2934,
    metalness: 0.86,
    roughness: 0.26,
    envMapIntensity: 1.25
  });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.y = Math.PI / 4;
  ring2.rotation.x = -Math.PI / 4;
  assemblage.add(ring2);
  disposables.push(ringGeo2, ringMat2);

  // Part E: Instanced Diamond Facet Beads Orbiting on Outer Gimbal
  const beadCount = 14;
  const beadGeo = new THREE.OctahedronGeometry(0.055, 0);
  const beadMat = new THREE.MeshPhysicalMaterial({
    color: 0xf6f4f0,
    metalness: 0.95,
    roughness: 0.1,
    clearcoat: 1.0,
    envMapIntensity: 1.6
  });
  const beadMesh = new THREE.InstancedMesh(beadGeo, beadMat, beadCount);
  for (let i = 0; i < beadCount; i++) {
    const theta = (i / beadCount) * Math.PI * 2;
    _dummyObj.position.set(Math.cos(theta) * 2.42, Math.sin(theta) * 2.42, 0);
    _dummyObj.rotation.set(theta, theta * 0.5, 0);
    _dummyObj.scale.setScalar(i % 2 === 0 ? 1.0 : 0.72);
    _dummyObj.updateMatrix();
    beadMesh.setMatrixAt(i, _dummyObj.matrix);
  }
  beadMesh.instanceMatrix.needsUpdate = true;
  beadMesh.computeBoundingSphere();
  ring1.add(beadMesh);
  disposables.push(beadGeo, beadMat);

  // Part F: Restrained Fine Particle Dust
  const particleCount = isSoftwareGl ? 110 : 220;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const cGold = new THREE.Color(0xbfa177);
  const cWine = new THREE.Color(0x8e2934);
  const cWhite = new THREE.Color(0xf6f4f0);

  for (let i = 0; i < particleCount; i++) {
    const r = 3.0 + Math.random() * 6.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const tone = i % 6 === 0 ? cWine : i % 3 === 0 ? cGold : cWhite;
    colors[i * 3] = tone.r;
    colors[i * 3 + 1] = tone.g;
    colors[i * 3 + 2] = tone.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.11,
    map: spriteTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
  disposables.push(particleGeo, particleMat);

  // 3. Three-Point Architectural Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0xf6f4f0, 0x1a090c, 0.85);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
  keyLight.position.set(5.5, 7.5, 6.0);
  scene.add(keyLight);

  const rimWine = new THREE.PointLight(0x8e2934, 4.8, 20, 1.5);
  rimWine.position.set(-5.0, -3.8, 2.8);
  scene.add(rimWine);

  const rimGold = new THREE.PointLight(0xbfa177, 4.0, 20, 1.5);
  rimGold.position.set(4.5, 2.5, -3.5);
  scene.add(rimGold);

  // 4. Pointer, Scroll & Slide Impulse Targets
  let pointerActive = false;
  function onPointerMove(e) {
    const src = e.touches ? e.touches[0] : e;
    if (!src) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (src.clientX - rect.left) / rect.width - 0.5;
    const ny = (src.clientY - rect.top) / rect.height - 0.5;
    _dampTarget.rotX = THREE.MathUtils.clamp(ny * 0.9, -0.55, 0.55);
    _dampTarget.rotY = THREE.MathUtils.clamp(nx * 1.15, -0.7, 0.7);
    pointerActive = true;
  }

  function onPointerLeave() {
    pointerActive = false;
    _dampTarget.rotX = 0;
    _dampTarget.rotY = 0;
  }

  function onScroll() {
    const ratio = THREE.MathUtils.clamp(window.scrollY / Math.max(400, window.innerHeight), 0, 1.2);
    _dampTarget.scrollY = ratio;
  }

  window.addEventListener('mousemove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  document.addEventListener('mouseleave', onPointerLeave, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // 5. Responsive Resize Handling
  function onResize() {
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    // Keep monolith balanced on narrow screens
    assemblage.position.x = w < 640 ? 0.15 : 0.55;
    const baseScale = w < 520 ? 0.82 : 1.0;
    assemblage.scale.setScalar(baseScale);
  }
  onResize();
  window.addEventListener('resize', onResize, { passive: true });

  // 6. Battery & Viewport Guard
  let inViewport = true;
  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          inViewport = entries[i].isIntersecting;
        }
      },
      { threshold: 0.04 }
    );
    observer.observe(container);
  }

  let tabVisible = !document.hidden;
  function onVisibilityChange() {
    tabVisible = !document.hidden;
    if (tabVisible) lastTime = performance.now();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  // WebGL2 Sync-Fence Pacer for Software Rasterizers (prevents SwiftShader CPU starvation)
  const glCtx = isSoftwareGl ? renderer.getContext() : null;
  let timerId = 0;
  let rafId = 0;
  let disposed = false;

  function afterDraw(cb) {
    if (disposed) return;
    if (glCtx && typeof glCtx.fenceSync === 'function') {
      const sync = glCtx.fenceSync(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0);
      glCtx.flush();
      const poll = () => {
        if (disposed) {
          if (sync) glCtx.deleteSync(sync);
          return;
        }
        const status = sync ? glCtx.getSyncParameter(sync, glCtx.SYNC_STATUS) : glCtx.SIGNALED;
        if (status === glCtx.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) glCtx.deleteSync(sync);
          timerId = window.setTimeout(cb, 80);
        }
      };
      timerId = window.setTimeout(poll, 5);
    } else {
      timerId = window.setTimeout(cb, 80);
    }
  }

  // 7. Zero-Allocation Damped Kinematic Loop
  let lastTime = performance.now();
  let elapsed = 0;
  let dampedRotX = 0;
  let dampedRotY = 0;
  let dampedScroll = 0;
  let spinBoost = 0;
  const _targetAccent = new THREE.Color(0x5b1a24);
  const _currentAccent = new THREE.Color(0x5b1a24);

  function tick() {
    if (disposed) return;
    const now = performance.now();
    const rawDelta = (now - lastTime) * 0.001;
    lastTime = now;
    const delta = Math.min(Math.max(rawDelta, 0.001), 0.05);

    if (inViewport && tabVisible) {
      if (!reducedMotion) {
        elapsed += delta;
        dampedRotX = THREE.MathUtils.damp(dampedRotX, pointerActive ? _dampTarget.rotX : 0, 4.5, delta);
        dampedRotY = THREE.MathUtils.damp(dampedRotY, pointerActive ? _dampTarget.rotY : 0, 4.5, delta);
        dampedScroll = THREE.MathUtils.damp(dampedScroll, _dampTarget.scrollY, 5.0, delta);
        spinBoost = THREE.MathUtils.damp(spinBoost, _dampTarget.impulse, 3.8, delta);
        _dampTarget.impulse = THREE.MathUtils.damp(_dampTarget.impulse, 0, 3.8, delta);

        _currentAccent.lerp(_targetAccent, 1 - Math.exp(-4.0 * delta));
        rimWine.color.copy(_currentAccent);
        ringMat2.color.copy(_currentAccent);

        assemblage.rotation.y = elapsed * 0.24 + dampedRotY + spinBoost;
        assemblage.rotation.x = Math.sin(elapsed * 0.26) * 0.14 + dampedRotX - dampedScroll * 0.35;
        assemblage.position.y = 0.1 + Math.sin(elapsed * 0.85) * 0.11 - dampedScroll * 0.65;

        wireMesh.rotation.y = -elapsed * 0.2;
        wireMesh.rotation.z = Math.sin(elapsed * 0.18) * 0.1;

        crownMesh.rotation.z = elapsed * 0.28 + spinBoost * 0.6;
        ring1.rotation.z = elapsed * 0.34 + spinBoost * 0.8;
        ring2.rotation.z = -elapsed * 0.28 - spinBoost * 0.5;
        ring2.rotation.y = Math.PI / 4 + elapsed * 0.14;

        particles.rotation.y = elapsed * 0.045 + dampedRotY * 0.25;
        particles.rotation.x = Math.sin(elapsed * 0.05) * 0.07;
      } else {
        assemblage.rotation.set(0.18, 0.52, 0);
      }

      renderer.render(scene, camera);
    }

    if (reducedMotion) return;
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  if (reducedMotion) {
    renderer.render(scene, camera);
  } else {
    rafId = requestAnimationFrame(tick);
  }

  return {
    pulse(direction = 1) {
      _dampTarget.impulse += (Number(direction) >= 0 ? 1 : -1) * 0.55;
    },
    setAccentColor(hex) {
      if (!hex) return;
      try {
        _targetAccent.set(hex);
        if (reducedMotion) {
          rimWine.color.copy(_targetAccent);
          ringMat2.color.copy(_targetAccent);
          renderer.render(scene, camera);
        }
      } catch {}
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      if (observer) observer.disconnect();
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      for (let i = 0; i < disposables.length; i++) {
        if (disposables[i] && typeof disposables[i].dispose === 'function') {
          disposables[i].dispose();
        }
      }
      renderer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };
}
