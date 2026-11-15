// =====================================================================
// WorkOrbit — the projects as a 3D ring of curved screens.
//
// Each project thumbnail becomes a card bent onto a cylinder (vertex
// shader), arranged around a slowly turning ring with a faint floor
// reflection. Drag / swipe to spin with inertia; it snaps to the
// nearest card. Clicking the front card opens that project's row in
// the list below; clicking another card brings it to the front.
//
// It's a visual front-end for the list, not a replacement: the list
// stays the accessible source of truth, and the HUD (title + prev /
// next / open) is real DOM.
//
// Driven from main.js's shared gsap.ticker (`update`). Texture paths
// come from each project's 800w WebP sibling.
// =====================================================================
import * as THREE from 'three';
import { Renderer, disposeScene } from './Renderer.js';
import { makePlaceholder } from './placeholder.js';

const CARD_W = 3.2;
const CARD_H = 2.4;
const AUTO_ADVANCE_MS = 4200;

const vertex = /* glsl */ `
  uniform float uBend;     // cylinder radius the card is wrapped onto
  uniform float uLift;     // front card rises slightly
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float a = p.x / uBend;
    p.x = sin(a) * uBend;
    p.z = cos(a) * uBend - uBend;
    p.y += uLift;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uImage;     // texture size (px) for cover-fit
  uniform vec3 uBg;        // page background, for dimming toward it
  uniform float uDim;      // 0 = front & bright, 1 = fully receded
  uniform float uReflect;  // 1 on the floor-reflection copy
  uniform float uOpacity;
  varying vec2 vUv;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    // cover-fit the image into the 4:3 card
    float cardAspect = ${(CARD_W / CARD_H).toFixed(4)};
    float imgAspect = uImage.x / uImage.y;
    vec2 uv = vUv - 0.5;
    if (imgAspect > cardAspect) uv.x *= cardAspect / imgAspect;
    else uv.y *= imgAspect / cardAspect;
    uv += 0.5;

    vec3 col = texture2D(uTex, uv).rgb;
    col = mix(col, uBg, uDim * 0.78);

    // rounded corners with a soft 1px-ish edge
    vec2 p = (vUv - 0.5) * vec2(cardAspect, 1.0);
    float d = roundedBox(p, vec2(cardAspect, 1.0) * 0.5, 0.045);
    float alpha = 1.0 - smoothstep(-0.004, 0.002, d);

    if (uReflect > 0.5) {
      // strongest where the card meets the floor, gone by mid-card
      alpha *= pow(max(1.0 - vUv.y * 1.6, 0.0), 3.0) * 0.2;
    }
    gl_FragColor = vec4(col, alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

function cssColor(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(value || '#0e0e0c');
}

export class WorkOrbit {
  /**
   * @param {HTMLElement} stage   element the canvas fills
   * @param {Array} projects      project data (name, image, kind…)
   * @param {Object} hooks
   * @param {(i:number)=>void} hooks.onChange  front card changed
   * @param {(i:number)=>void} hooks.onOpen    front card clicked
   * @param {'high'|'low'} [quality]
   */
  constructor(stage, projects, { onChange, onOpen }, quality = 'high') {
    this.stage = stage;
    this.projects = projects;
    this.onChange = onChange;
    this.onOpen = onOpen;
    this.count = projects.length;
    this.step = (Math.PI * 2) / this.count;
    // Ring radius: enough circumference for every card plus breathing room
    this.radius = (this.count * CARD_W * 1.35) / (Math.PI * 2);

    this.gl = new Renderer({ container: stage, alpha: true, maxDpr: quality === 'high' ? 1.75 : 1.4 });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.ring = new THREE.Group();
    this.scene.add(this.ring);

    this.rot = 0;          // current ring angle (radians, eased)
    this.rotTarget = 0;    // where it's heading
    this.active = 0;
    this.matches = projects.map(() => true);
    this.pointer = { x: 0, y: 0 };
    this.tilt = { x: 0, y: 0 };
    this.lastInteraction = performance.now();
    this.hovering = false;
    this.bg = cssColor('--bg');

    this.cards = projects.map((p, i) => this.createCard(p, i));
    this.bindInput();
    this.resize();
    this.onChange?.(0);
  }

  createCard(project, index) {
    const uniforms = {
      uTex: { value: null },
      uImage: { value: new THREE.Vector2(4, 3) },
      uBg: { value: this.bg },
      uDim: { value: 0 },
      uReflect: { value: 0 },
      uOpacity: { value: 0 },
      uBend: { value: this.radius },
      uLift: { value: 0 }
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false
    });
    const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H, 32, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.index = index;

    // Floor reflection: the same card mirrored under itself
    const reflMaterial = material.clone();
    reflMaterial.uniforms = THREE.UniformsUtils.clone(uniforms);
    reflMaterial.uniforms.uReflect.value = 1;
    reflMaterial.uniforms.uBg.value = this.bg;
    const reflection = new THREE.Mesh(geometry, reflMaterial);
    reflection.scale.y = -1;
    reflection.position.y = -CARD_H - 0.08;

    const holder = new THREE.Group();
    const angle = index * this.step;
    holder.position.set(Math.sin(angle) * this.radius, 0, Math.cos(angle) * this.radius);
    holder.rotation.y = angle;
    holder.add(mesh, reflection);
    this.ring.add(holder);

    const card = { mesh, reflection, uniforms, reflUniforms: reflMaterial.uniforms, angle, dim: 1 };

    const setTexture = (texture, w, h) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      for (const u of [uniforms, reflMaterial.uniforms]) {
        u.uTex.value = texture;
        u.uImage.value.set(w, h);
      }
      card.ready = performance.now();
    };
    const base = project.image?.replace(/\.jpe?g$/i, '');
    const fallback = () => {
      const theme = document.documentElement.dataset.theme || 'dark';
      const canvas = makePlaceholder(index, theme, project.name);
      setTexture(new THREE.CanvasTexture(canvas), canvas.width, canvas.height);
    };
    if (base) {
      new THREE.TextureLoader().load(
        `${base}-800.webp`,
        (t) => setTexture(t, t.image.width, t.image.height),
        undefined,
        fallback
      );
    } else {
      fallback();
    }
    return card;
  }

  // ------------------------------------------------------------------
  // Input: drag with inertia, click to focus/open, hover pauses auto-spin
  // ------------------------------------------------------------------
  bindInput() {
    const el = this.stage;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let drag = null;

    const hitIndex = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, this.camera);
      // Only front-facing, mostly-visible cards are clickable
      const hits = raycaster.intersectObjects(this.cards.map((c) => c.mesh));
      const hit = hits.find((h) => this.cards[h.object.userData.index].dim < 0.85);
      return hit ? hit.object.userData.index : -1;
    };

    el.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, rot: this.rotTarget, moved: 0, lastX: e.clientX, v: 0, t: performance.now() };
      this.lastInteraction = performance.now();
    });
    window.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx), Math.abs(e.clientY - drag.y));
      // a full stage-width drag spins about 1.6 cards
      this.rotTarget = drag.rot - (dx / r.width) * this.step * 1.6 * (r.width < 700 ? 1.4 : 1);
      const now = performance.now();
      drag.v = (e.clientX - drag.lastX) / Math.max(now - drag.t, 1);
      drag.lastX = e.clientX;
      drag.t = now;
      this.lastInteraction = now;
    }, { passive: true });
    const end = (e) => {
      if (!drag) return;
      const wasClick = drag.moved < 6;
      if (wasClick && e.type === 'pointerup') {
        const i = hitIndex(e);
        if (i === this.active) this.onOpen?.(i);
        else if (i >= 0) this.goTo(i);
      } else {
        // inertia: fling a little further, then settle on a card
        const r = el.getBoundingClientRect();
        this.rotTarget -= (drag.v * 180 / r.width) * this.step;
        this.snap();
      }
      drag = null;
      this.lastInteraction = performance.now();
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    el.addEventListener('pointerenter', () => (this.hovering = true));
    el.addEventListener('pointerleave', () => (this.hovering = false));
  }

  /** Nearest card to the ring's target angle (skipping filtered-out ones). */
  snap() {
    const raw = Math.round(this.rotTarget / this.step);
    const i = ((raw % this.count) + this.count) % this.count;
    if (this.matches[i]) {
      this.rotTarget = raw * this.step;
    } else {
      this.goTo(this.nearestMatch(i));
    }
  }

  nearestMatch(from) {
    for (let d = 0; d < this.count; d++) {
      for (const s of [1, -1]) {
        const i = (((from + s * d) % this.count) + this.count) % this.count;
        if (this.matches[i]) return i;
      }
    }
    return from;
  }

  /** Spin the shortest way round so card `i` faces the camera. */
  goTo(i) {
    const current = Math.round(this.rotTarget / this.step);
    let delta = (i - (((current % this.count) + this.count) % this.count));
    if (delta > this.count / 2) delta -= this.count;
    if (delta < -this.count / 2) delta += this.count;
    this.rotTarget = (current + delta) * this.step;
    this.lastInteraction = performance.now();
  }

  next(dir = 1) {
    let i = this.active;
    for (let n = 0; n < this.count; n++) {
      i = (((i + dir) % this.count) + this.count) % this.count;
      if (this.matches[i]) break;
    }
    this.goTo(i);
  }

  /** Dim cards outside the current Work filter; hop off them if needed. */
  setFilter(kind) {
    this.matches = this.projects.map((p) => kind === 'all' || (p.kind ?? []).includes(kind));
    if (!this.matches[this.active]) this.goTo(this.nearestMatch(this.active));
  }

  setTheme() {
    // CSS variables flip with data-theme; read once they have
    requestAnimationFrame(() => this.bg.copy(cssColor('--bg')));
  }

  // ------------------------------------------------------------------
  update(time) {
    const now = performance.now();

    // Gentle auto-advance while nobody's touching it
    if (!this.hovering && now - this.lastInteraction > AUTO_ADVANCE_MS) {
      this.next(1);
      this.lastInteraction = now;
    }

    this.rot += (this.rotTarget - this.rot) * 0.075;
    this.ring.rotation.y = -this.rot;

    // Slow float + a lean toward the pointer
    this.tilt.x += (this.pointer.y * 0.06 - this.tilt.x) * 0.05;
    this.tilt.y += (this.pointer.x * 0.12 - this.tilt.y) * 0.05;
    this.ring.rotation.x = this.tilt.x;
    this.ring.position.y = Math.sin(time * 0.8) * 0.05;
    this.ring.rotation.z = this.tilt.y * 0.15;

    // Which card is in front?
    const raw = Math.round(this.rot / this.step);
    const active = ((raw % this.count) + this.count) % this.count;
    if (active !== this.active) {
      this.active = active;
      this.onChange?.(active);
    }

    for (let i = 0; i < this.count; i++) {
      const card = this.cards[i];
      // angular distance from the front, wrapped to [0, π]
      let d = Math.abs(((card.angle - this.rot) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const front = 1 - Math.min(d / (this.step * 1.2), 1);
      const target = (1 - front) * 0.85 + (this.matches[i] ? 0 : 0.55);
      card.dim += (Math.min(target, 1) - card.dim) * 0.1;
      const fadeIn = card.ready ? Math.min((now - card.ready) / 700, 1) : 0;
      const lift = front * 0.12;
      for (const u of [card.uniforms, card.reflUniforms]) {
        u.uDim.value = card.dim;
        u.uOpacity.value = fadeIn;
        u.uLift.value = lift;
      }
      // Draw far cards first so transparent edges blend correctly
      const order = Math.round((1 - d / Math.PI) * 100);
      card.mesh.renderOrder = order;
      card.reflection.renderOrder = order - 200;
    }

    this.gl.render(this.scene, this.camera);
  }

  resize() {
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Fit: the front card takes ~38% of a wide stage, ~70% of a phone's,
    // and never more than ~62% of the height
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const share = aspect > 1.3 ? 0.38 : 0.7;
    const dW = CARD_W / (share * 2 * tanHalf * aspect);
    const dH = CARD_H / (0.62 * 2 * tanHalf);
    const dist = Math.max(dW, dH);
    this.camera.position.set(0, CARD_H * 0.32, this.radius + dist);
    this.camera.lookAt(0, -CARD_H * 0.12, this.radius * 0.4);
    this.camera.updateProjectionMatrix();
    this.gl.setSize(w, h);
  }

  dispose() {
    disposeScene(this.scene);
    this.gl.dispose();
  }
}
