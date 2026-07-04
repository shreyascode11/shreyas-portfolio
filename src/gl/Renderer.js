// =====================================================================
// Renderer — thin wrapper around THREE.WebGLRenderer shared by the
// hero and the image-distortion layer. Caps devicePixelRatio for
// performance and centralises disposal.
// =====================================================================
import * as THREE from 'three';

export const MAX_DPR = 1.75;

export class Renderer {
  /**
   * @param {Object} options
   * @param {HTMLCanvasElement} [options.canvas] existing canvas to render into
   * @param {HTMLElement} [options.container] element to append a new canvas to
   * @param {boolean} [options.alpha=true] transparent clear
   */
  constructor({ canvas, container, alpha = true } = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    if (alpha) this.renderer.setClearColor(0x000000, 0);

    if (container && !canvas) container.appendChild(this.renderer.domElement);
  }

  get domElement() {
    return this.renderer.domElement;
  }

  setSize(width, height) {
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/**
 * Dispose a whole scene graph: geometries, materials, textures.
 * Call before dropping a scene so GPU memory is actually released.
 */
export function disposeScene(scene) {
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((mat) => {
        Object.values(mat.uniforms ?? {}).forEach((u) => {
          if (u.value?.isTexture) u.value.dispose();
        });
        mat.dispose();
      });
    }
  });
}
