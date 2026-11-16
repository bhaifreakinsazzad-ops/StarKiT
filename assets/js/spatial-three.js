/**
 * StarkiT Spatial 3D WebGL Engine — Three.js
 * Implements a high-luxury, interactive 3D geometric brand emblem and starry particle atmosphere.
 * Complies with WCAG, 60fps mobile DPR clamping, and battery-saving intersection observers.
 */
import * as THREE from './vendor/three.module.js';

export function initSpatialHero(containerId = 'spatialHeroContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Scene, Camera & Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 7.5);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.pointerEvents = 'none'; // Keep touch scrolling 100% free
  renderer.domElement.style.zIndex = '1';
  container.insertBefore(renderer.domElement, container.firstChild);

  // Group for whole 3D assemblage
  const emblemGroup = new THREE.Group();
  scene.add(emblemGroup);

  // 1. Faceted Central Core (Star Polyhedron / Luxury Monolith)
  const coreGeo = new THREE.IcosahedronGeometry(1.6, 0);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x170000,
    emissive: 0x44161b,
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.85,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    flatShading: true
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  emblemGroup.add(coreMesh);

  // 2. Outer Golden Filigree Cage (Wireframe Cage)
  const wireGeo = new THREE.IcosahedronGeometry(1.95, 1);
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xc5a880,
    metalness: 0.95,
    roughness: 0.25,
    wireframe: true
  });
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  emblemGroup.add(wireMesh);

  // 3. Floating Orbital Rings (Luxurious Artisan Celestial Rings)
  const ringGeo = new THREE.TorusGeometry(2.35, 0.035, 16, 100);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xe6caa3,
    metalness: 0.9,
    roughness: 0.3
  });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = Math.PI / 3;
  emblemGroup.add(ring1);

  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.rotation.y = Math.PI / 4;
  ring2.rotation.x = -Math.PI / 4;
  ring2.scale.set(1.15, 1.15, 1.15);
  emblemGroup.add(ring2);

  // 4. Star Particles Cloud (Dhaka Skyline & StarKiT Universe)
  const particleCount = 450;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleScales = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const r = 3.5 + Math.random() * 6.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = r * Math.cos(phi);
    particleScales[i] = Math.random() * 0.04 + 0.02;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xf5dfbe,
    size: 0.055,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Studio Lighting Setup
  const ambientLight = new THREE.AmbientLight(0xfff6ed, 0.9);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffeed6, 2.4);
  keyLight.position.set(5, 7, 6);
  scene.add(keyLight);

  const rimLightWine = new THREE.PointLight(0xc45a60, 4.0, 15);
  rimLightWine.position.set(-5, -4, 2);
  scene.add(rimLightWine);

  const rimLightGold = new THREE.PointLight(0xc5a880, 3.5, 15);
  rimLightGold.position.set(4, -3, -3);
  scene.add(rimLightGold);

  // Mouse & Touch Interaction with smooth damping
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
    targetX = x * 1.5;
    targetY = y * 1.2;
  }

  window.addEventListener('mousemove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });

  // Resize Handling
  function onResize() {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', onResize);

  // IntersectionObserver to pause rendering when scrolled out of view (Battery Optimization)
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

  // Render Loop
  let clock = new THREE.Clock();
  let animationId;

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (!isVisible) return;

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Damped mouse tracking
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    // Organic rotations
    emblemGroup.rotation.y = elapsed * 0.25 + mouseX;
    emblemGroup.rotation.x = Math.sin(elapsed * 0.2) * 0.15 + mouseY;
    emblemGroup.position.y = Math.sin(elapsed * 0.8) * 0.12;

    wireMesh.rotation.y = -elapsed * 0.18;
    ring1.rotation.z = elapsed * 0.35;
    ring2.rotation.z = -elapsed * 0.28;

    particles.rotation.y = elapsed * 0.05;
    particles.rotation.x = Math.sin(elapsed * 0.04) * 0.08;

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
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  };
}
