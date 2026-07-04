// =====================================================================
// ImageDistortion — WebGL hover distortion for project thumbnails.
//
// One fullscreen transparent canvas (fixed, pointer-events: none) with
// an orthographic camera in CSS-pixel space. Each .project__media gets
// a plane synced to its bounding rect every frame (so it tracks Lenis
// scrolling for free). Hover state and cursor velocity are read from
// DOM pointer events and fed to the shader as uniforms.
//
// If a project image is missing (placeholders not added yet), a
// procedural gradient texture is generated instead — see placeholder.js.
// =====================================================================
import * as THREE from 'three';
import gsap from 'gsap';
import { Renderer, disposeScene } from './Renderer.js';
import { makePlaceholder } from './placeholder.js';
import { distortionVertex, distortionFragment } from '../shaders/distortion.js';

export class ImageDistortion {
  /**
   * @param {HTMLCanvasElement} canvas the fixed fullscreen canvas
   * @param {NodeListOf<Element>} mediaEls .project__media elements
   * @param {THREE.LoadingManager} loadingManager shared with the preloader
   */
  constructor(canvas, mediaEls, loadingManager) {
    this.gl = new Renderer({ canvas, alpha: true });
    canvas.classList.add('is-active');

    this.scene = new THREE.Scene();
    // Ortho camera in CSS pixels: (0,0) at viewport center, y up
    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, -100, 100);

    this.loader = new THREE.TextureLoader(loadingManager);
    this.items = [];

    mediaEls.forEach((el, i) => this.createItem(el, i));
    this.resize();
  }

  createItem(el, index) {
    const img = el.querySelector('img');
    const video = el.querySelector('video');

    const uniforms = {
      uTexture: { value: null },
      uPlaneSize: { value: new THREE.Vector2(1, 1) },
      uImageSize: { value: new THREE.Vector2(1024, 768) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uVelocity: { value: 0 },
      // Match the CSS --radius of .project__media
      uRadius: { value: parseFloat(getComputedStyle(el).borderRadius) || 0 },
      uTime: { value: 0 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: distortionVertex,
      fragmentShader: distortionFragment,
      uniforms,
      transparent: true
    });
    // Hidden until its texture is ready, so there's no black flash
    material.visible = false;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    this.scene.add(mesh);

    const item = { el, mesh, uniforms, lastPointer: null, velocityTarget: 0 };
    this.items.push(item);

    const applyTexture = (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const src = texture.image;
      uniforms.uImageSize.value.set(
        src.naturalWidth || src.width,
        src.naturalHeight || src.height
      );
      uniforms.uTexture.value = texture;
      material.visible = true;
      // WebGL now owns this thumbnail; fade the DOM img out
      el.classList.add('is-gl');
    };

    // Video thumbnails: sample the playing <video> as a live texture so
    // the hover ripple runs over moving footage (very Lusion).
    if (video) {
      const useVideo = () => {
        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        uniforms.uImageSize.value.set(video.videoWidth, video.videoHeight);
        uniforms.uTexture.value = texture;
        material.visible = true;
        el.classList.add('is-gl');
      };
      if (video.readyState >= 2) useVideo();
      else video.addEventListener('loadeddata', useVideo, { once: true });
      // Muted autoplay can still be blocked in edge cases — nudge it.
      video.play().catch(() => {});
      this.attachHover(el, item, uniforms);
      return;
    }

    // Try the real image; fall back to a generated gradient placeholder
    this.loader.load(
      img.src,
      applyTexture,
      undefined,
      () => {
        // Remember it's synthetic so setTheme() can re-generate it
        item.placeholderIndex = index;
        const theme = document.documentElement.dataset.theme || 'light';
        const placeholder = makePlaceholder(index, theme, el.dataset.name || '');
        applyTexture(new THREE.CanvasTexture(placeholder));
        // Also swap the DOM img so non-GL fallbacks look right too
        img.src = placeholder.toDataURL('image/jpeg', 0.85);
      }
    );

    this.attachHover(el, item, uniforms);
  }

  /** Hover state comes from the DOM element (canvas is pointer-events:none). */
  attachHover(el, item, uniforms) {
    el.addEventListener('pointerenter', () => {
      gsap.to(uniforms.uHover, { value: 1, duration: 0.9, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(uniforms.uHover, { value: 0, duration: 1.1, ease: 'power3.out' });
      item.lastPointer = null;
    });
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      uniforms.uMouse.value.set(
        (e.clientX - rect.left) / rect.width,
        1 - (e.clientY - rect.top) / rect.height
      );
      if (item.lastPointer) {
        const speed = Math.hypot(
          e.clientX - item.lastPointer.x,
          e.clientY - item.lastPointer.y
        ) / 30;
        item.velocityTarget = Math.min(Math.max(item.velocityTarget, speed), 1);
      }
      item.lastPointer = { x: e.clientX, y: e.clientY };
    });
  }

  /** Re-generate placeholder textures for the day/night switch. */
  setTheme(theme) {
    for (const item of this.items) {
      if (item.placeholderIndex === undefined) continue; // real image
      const placeholder = makePlaceholder(
        item.placeholderIndex,
        theme,
        item.el.dataset.name || ''
      );
      item.uniforms.uTexture.value?.dispose();
      const texture = new THREE.CanvasTexture(placeholder);
      texture.colorSpace = THREE.SRGBColorSpace;
      item.uniforms.uTexture.value = texture;
      item.el.querySelector('img').src = placeholder.toDataURL('image/jpeg', 0.85);
    }
  }

  /** Sync every plane to its DOM rect and advance uniforms. */
  update(time) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const item of this.items) {
      const rect = item.el.getBoundingClientRect();

      // Skip offscreen planes entirely
      const visible = rect.bottom > 0 && rect.top < vh;
      item.mesh.visible = visible && item.uniforms.uTexture.value !== null;
      if (!item.mesh.visible) continue;

      // DOM rect → world position (ortho camera centered on viewport)
      item.mesh.scale.set(rect.width, rect.height, 1);
      item.mesh.position.set(
        rect.left + rect.width / 2 - vw / 2,
        -(rect.top + rect.height / 2) + vh / 2,
        0
      );
      item.uniforms.uPlaneSize.value.set(rect.width, rect.height);

      // Ease velocity down when the cursor slows/stops
      item.velocityTarget *= 0.92;
      item.uniforms.uVelocity.value +=
        (item.velocityTarget - item.uniforms.uVelocity.value) * 0.08;
      item.uniforms.uTime.value = time;
    }

    this.gl.render(this.scene, this.camera);
  }

  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.camera.left = -vw / 2;
    this.camera.right = vw / 2;
    this.camera.top = vh / 2;
    this.camera.bottom = -vh / 2;
    this.camera.updateProjectionMatrix();
    this.gl.setSize(vw, vh);
  }

  dispose() {
    disposeScene(this.scene);
    this.gl.dispose();
  }
}
