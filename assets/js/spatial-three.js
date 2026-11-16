/**
 * StarkiT Spatial 3D WebGL Showroom Engine — Three.js
 * Master-Level High-Luxury 3D Brand Monolith & Dynamic Celestial Particle Nebula.
 * Complies with 60fps mobile DPR clamping, touch scroll safety, and battery-guard auto-pausing.
 */
import * as THREE from './vendor/three.module.js';

export function initSpatialHero(containerId = 'spatialHeroContainer') {
  const container = document.getElementById(containerId);
  if (!container) return null;

  // 1. Scene, Camera & ACES Filmic Renderer
  const scene = new THREE.Scene();
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 7.8);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none'; // Keep touch scrolling 100% free
  canvas.style.zIndex = '1';
  canvas.style.transition = 'opacity 0.8s ease';
  container.insertBefore(canvas, container.firstChild);

  // 2. 3D Monolith Assemblage Group
  const assemblage = new THREE.Group();
  scene.add(assemblage);

  // Core 1: Faceted Central Polyhedron in Deep StarkiT Lacquer & Metallic Specular
  const coreGeo = new THREE.IcosahedronGeometry(1.65, 0);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x140102,
    emissive: 0x3d1015,
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.88,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    flatShading: true
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  assemblage.add(coreMesh);

  // Core 2: Golden Wireframe Filigree Cage
  const wireGeo = new THREE.IcosahedronGeometry(1.98, 1);
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xc5a880,
    metalness: 0.96,
    roughness: 0.22,
    wireframe: true
  });
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  assemblage.add(wireMesh);

  // Core 3: Floating Dual Celestial Orbital Rings (Artisan Geometry)
  const ringGeo1 = new THREE.TorusGeometry(2.45, 0.038, 16, 120);
  const ringMat1 = new THREE.MeshStandardMaterial({
    color: 0xe6caa3,
    metalness: 0.92,
    roughness: 0.28
  });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI / 3;
  assemblage.add(ring1);

  const ringGeo2 = new THREE.TorusGeometry(2.75, 0.025, 16, 120);
  const ringMat2 = new THREE.MeshStandardMaterial({
    color: 0xbe555c,
    metalness: 0.85,
    roughness: 0.35
  });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.y = Math.PI / 4;
  ring2.rotation.x = -Math.PI / 4;
  assemblage.add(ring2);

  // Core 4: Starlight Particle Nebula (500 Particles with Depth & Interactive Flow)
  const particleCount = 500;
  const particleGeo = new THREE.BufferGeometry();
  const basePositions = new Float32Array(particleCount * 3);
  const currentPositions = new Float32Array(particleCount * 3);
  const particleVels = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const r = 3.2 + Math.random() * 7.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = y;
    basePositions[i * 3 + 2] = z;

    currentPositions[i * 3] = x;
    currentPositions[i * 3 + 1] = y;
    currentPositions[i * 3 + 2] = z;

    particleVels[i * 3] = (Math.random() - 0.5) * 0.003;
    particleVels[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
    particleVels[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xf5dfbe,
    size: 0.062,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // 3. High-Contrast Studio Rim & Key Lighting
  const ambientLight = new THREE.AmbientLight(0xfff6ed, 0.95);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffeed6, 2.6);
  keyLight.position.set(5.5, 7.5, 6.0);
  scene.add(keyLight);

  const rimWine = new THREE.PointLight(0xc45a60, 4.5, 18);
  rimWine.position.set(-5.5, -4.0, 2.5);
  scene.add(rimWine);

  const rimGold = new THREE.PointLight(0xc5a880, 4.0, 18);
  rimGold.position.set(4.5, -3.5, -3.5);
  scene.add(rimGold);

  // 4. Pointer Interaction with Smooth Dampening
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  function onPointerMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    targetX = x * 1.6;
    targetY = y * 1.3;
  }

  window.addEventListener('mousemove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });

  // 5. Responsive Resize Handling
  function onResize() {
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // 6. Battery-Saving IntersectionObserver & Tab Visibility
  let isVisible = true;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);
  }

  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
  });

  // 7. Render Loop with 60fps Optimization
  const clock = new THREE.Clock();
  let animationId;

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (!isVisible) return;

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Damped camera & assemblage follow
    mouseX += (targetX - mouseX) * 0.055;
    mouseY += (targetY - mouseY) * 0.055;

    assemblage.rotation.y = elapsed * 0.28 + mouseX;
    assemblage.rotation.x = Math.sin(elapsed * 0.24) * 0.16 + mouseY;
    assemblage.position.y = Math.sin(elapsed * 0.9) * 0.14;

    wireMesh.rotation.y = -elapsed * 0.22;
    wireMesh.rotation.z = Math.sin(elapsed * 0.15) * 0.1;

    ring1.rotation.z = elapsed * 0.38;
    ring2.rotation.z = -elapsed * 0.32;
    ring2.rotation.y = elapsed * 0.15;

    // Organic particle drift
    particles.rotation.y = elapsed * 0.06;
    particles.rotation.x = Math.sin(elapsed * 0.05) * 0.09;

    renderer.render(scene, camera);
  }

  animate();

  return {
    destroy() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };
}
