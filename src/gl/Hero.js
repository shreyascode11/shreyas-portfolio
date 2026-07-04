// =====================================================================
// Hero — the interactive 3D centerpiece. A noise-displaced sphere that
// reacts to cursor position and velocity (see /src/shaders/hero.js).
//
// Lives inside the .hero__gl container. `update()` is driven from the
// single gsap.ticker loop in main.js. `intro()` is played by the
// preloader when it finishes.
// =====================================================================
import * as THREE from 'three';
import gsap from 'gsap';
import { Renderer, disposeScene } from './Renderer.js';
import { heroVertex, heroFragment } from '../shaders/hero.js';

export class Hero {
  /**
   * @param {HTMLElement} container the .hero__gl element
   * @param {'high'|'low'} quality  geometry detail level
   */
  constructor(container, quality = 'high') {
    this.container = container;

    this.gl = new Renderer({ container, alpha: true });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    this.camera.position.z = 7;

    // Raw + smoothed mouse state. The shader gets the smoothed values so
    // the blob feels weighty rather than twitchy.
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);
    this.mouseSpeed = 0;
    this.mouseSpeedTarget = 0;
    this.lastPointer = null;

    this.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: this.mouse },
      uMouseSpeed: { value: 0 },
      uReveal: { value: 0 }, // preloader tweens this 0→1
      // Light-theme palette: glossy orange-red body (the Lusion-style
      // signature), warm glow where the noise swells, dark rim so the
      // silhouette stays crisp against the off-white background.
      uColorBody: { value: new THREE.Color('#ff4b00') },  // --accent-bright
      uColorGlow: { value: new THREE.Color('#ffb38a') },  // warm highlight
      uColorRim: { value: new THREE.Color('#2a1004') }    // dark edge
    };

    // High subdivision so the vertex displacement stays smooth
    const detail = quality === 'high' ? 96 : 48;
    const geometry = new THREE.IcosahedronGeometry(1.7, detail);
    const material = new THREE.ShaderMaterial({
      vertexShader: heroVertex,
      fragmentShader: heroFragment,
      uniforms: this.uniforms
    });

    this.mesh = new THREE.Mesh(geometry, material);
    // Slightly right of center and raised — the statement sits bottom-left
    this.mesh.position.set(0.9, 0.15, 0);
    this.scene.add(this.mesh);

    // Ambient particle field — floating dust around the object, like the
    // reference scene. Cheap: one Points object, rotated slowly.
    const count = quality === 'high' ? 380 : 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2.5 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = -1 - Math.random() * 5;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xe9e9e4,
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    this.particles = new THREE.Points(particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);

    this.onPointerMove = this.onPointerMove.bind(this);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    // If the GPU context is lost (driver reset, tab backgrounded too
    // long), swap to the static gradient instead of a black hole.
    this.contextLost = false;
    this.gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      container.classList.add('is-fallback');
      this.gl.domElement.style.display = 'none';
    });

    this.resize();
  }

  onPointerMove(e) {
    // Normalise to -1..1 with y up (matches shader space)
    this.mouseTarget.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );

    // Velocity: distance moved since last event, clamped to 0..1
    if (this.lastPointer) {
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      const speed = Math.min(Math.hypot(dx, dy) / 40, 1);
      this.mouseSpeedTarget = Math.max(this.mouseSpeedTarget, speed);
    }
    this.lastPointer = { x: e.clientX, y: e.clientY };
  }

  /**
   * Re-color the scene for day/night view.
   * Night: monochrome moon-rock — dark body, gray swells, white fresnel
   * rim — matching the reference's cinematic monochrome scene.
   * Day: the signature orange blob with a dark edge.
   */
  setTheme(theme) {
    const palette =
      theme === 'dark'
        ? { body: '#26262b', glow: '#82828a', rim: '#e9e9e4', particles: 0xe9e9e4, pOpacity: 0.55 }
        : { body: '#ff4b00', glow: '#ffb38a', rim: '#2a1004', particles: 0x101010, pOpacity: 0.3 };

    for (const [uniform, hex] of [
      [this.uniforms.uColorBody, palette.body],
      [this.uniforms.uColorGlow, palette.glow],
      [this.uniforms.uColorRim, palette.rim]
    ]) {
      gsap.to(uniform.value, { ...new THREE.Color(hex), duration: 0.6, ease: 'power2.out' });
    }
    this.particleMaterial.color.setHex(palette.particles);
    this.particleMaterial.opacity = palette.pOpacity;
  }

  /** Intro reveal, played when the preloader exits. */
  intro() {
    gsap.to(this.uniforms.uReveal, { value: 1, duration: 1.6, ease: 'power3.out' });
    gsap.from(this.mesh.scale, {
      x: 0.6, y: 0.6, z: 0.6,
      duration: 1.6,
      ease: 'power3.out'
    });
  }

  /** @param {number} time seconds since start */
  update(time) {
    if (this.contextLost) return;
    this.uniforms.uTime.value = time;

    // Ease mouse state toward targets — this is what makes motion feel slow
    // and confident instead of jittery.
    this.mouse.lerp(this.mouseTarget, 0.05);
    this.mouseSpeedTarget *= 0.94; // decay when the cursor stops
    this.mouseSpeed += (this.mouseSpeedTarget - this.mouseSpeed) * 0.06;
    this.uniforms.uMouseSpeed.value = this.mouseSpeed;

    // Slow drift + slight lean toward the cursor
    this.mesh.rotation.y = time * 0.08 + this.mouse.x * 0.35;
    this.mesh.rotation.x = this.mouse.y * -0.25;

    // Particle field drifts even slower — depth without distraction
    this.particles.rotation.y = time * 0.015;

    this.gl.render(this.scene, this.camera);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.gl.setSize(w, h);

    // On narrow screens center the blob behind the type
    this.mesh.position.x = w < 900 ? 0 : 0.9;
  }

  dispose() {
    window.removeEventListener('pointermove', this.onPointerMove);
    disposeScene(this.scene);
    this.gl.dispose();
  }
}
