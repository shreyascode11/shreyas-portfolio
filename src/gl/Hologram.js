// =====================================================================
// Hologram — a particle head that turns to watch the visitor.
//
// The head is the MakeHuman base mesh (a generic human, CC0 — see
// src/data/headMesh.js), sliced by horizontal planes; dots are spaced
// evenly along every slice, so the surface reads as clean contour rows
// wrapping the whole head — face, ears and skull in one continuous
// surface. A side key light with a gentle sheen carves the features,
// the silhouette glows a little, and the neck fades away. Steady (no
// flicker); only the head moves, turning toward the cursor, or drifting
// on its own when there's no pointer.
//
// Plain canvas 2D, dots batched by brightness (one fill style per
// level). Rendered only while on screen (main.js). Reduced motion:
// drawn once, facing ahead.
// =====================================================================
import '../styles/hologram.css';
import { HEAD_V, HEAD_F } from '../data/headMesh.js';

const STRIDE = 7;           // x y z nx ny nz fade
const BUCKETS = 9;
const ROW = 0.026;          // distance between contour slices
const SPACING = 0.021;      // distance between dots along a slice
const NECK_FADE = [-1.36, -0.82]; // y range over which the neck fades in

const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const rand = (a, b) => a + Math.random() * (b - a);

export class Hologram {
  /**
   * @param {HTMLElement} root   the .holo element (empty in the HTML)
   * @param {Object} [o]
   * @param {boolean} [o.isTouch]
   * @param {boolean} [o.reducedMotion]
   */
  constructor(root, { isTouch = false, reducedMotion = false } = {}) {
    this.root = root;
    // The page ships only the empty column (so the layout is reserved);
    // the projection itself is built here when it loads
    root.innerHTML = '<canvas class="holo__canvas" data-holo-canvas></canvas>';
    this.canvas = root.querySelector('[data-holo-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.isTouch = isTouch;
    this.still = reducedMotion;

    this.buildModel();

    this.yaw = 0;
    this.pitch = 0;
    this.target = { x: 0, y: 0 };
    this.hasPointer = false;
    this.wanderAt = 0;

    this.readColors();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('themechange', () => requestAnimationFrame(() => this.readColors()));

    const onMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.target.x = e.clientX - r.left;
      this.target.y = e.clientY - r.top;
      this.hasPointer = true;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    if (isTouch) window.addEventListener('pointerdown', onMove, { passive: true });

    if (this.still) this.update(0);
  }

  // ------------------------------------------------------------------
  // Model: slice the mesh into contour rows of evenly spaced dots
  // ------------------------------------------------------------------
  buildModel() {
    const nv = HEAD_V.length / 3;
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < pos.length; i++) pos[i] = HEAD_V[i] / 1000;

    // Smooth vertex normals (area-weighted), pointing outward
    const nrm = new Float32Array(nv * 3);
    for (let t = 0; t < HEAD_F.length; t += 3) {
      const a = HEAD_F[t] * 3, b = HEAD_F[t + 1] * 3, c = HEAD_F[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      for (const k of [a, b, c]) { nrm[k] += nx; nrm[k + 1] += ny; nrm[k + 2] += nz; }
    }
    let outward = 0;
    for (let k = 0; k < nv * 3; k += 3) {
      const l = Math.hypot(nrm[k], nrm[k + 1], nrm[k + 2]) || 1;
      nrm[k] /= l; nrm[k + 1] /= l; nrm[k + 2] /= l;
      outward += nrm[k] * pos[k] + nrm[k + 2] * pos[k + 2];
    }
    if (outward < 0) for (let k = 0; k < nrm.length; k++) nrm[k] = -nrm[k];

    // Slice every triangle with the planes y = k·ROW; walk each cut
    // segment laying dots SPACING apart (carrying the remainder along so
    // spacing stays even where segments meet)
    const P = [];
    const lerp = (i, j, t, out) => {
      for (let d = 0; d < 3; d++) {
        out[d] = pos[i + d] + (pos[j + d] - pos[i + d]) * t;
        out[d + 3] = nrm[i + d] + (nrm[j + d] - nrm[i + d]) * t;
      }
      return out;
    };
    for (let t = 0; t < HEAD_F.length; t += 3) {
      const ids = [HEAD_F[t] * 3, HEAD_F[t + 1] * 3, HEAD_F[t + 2] * 3];
      const ys = ids.map((i) => pos[i + 1]);
      const k0 = Math.ceil(Math.min(...ys) / ROW);
      const k1 = Math.floor(Math.max(...ys) / ROW);
      for (let k = k0; k <= k1; k++) {
        const y = k * ROW;
        const cut = [];
        for (let e = 0; e < 3; e++) {
          const i = ids[e], j = ids[(e + 1) % 3];
          const yi = pos[i + 1], yj = pos[j + 1];
          if ((yi - y) * (yj - y) > 0 || yi === yj) continue;
          cut.push(lerp(i, j, (y - yi) / (yj - yi), new Float32Array(6)));
        }
        if (cut.length < 2) continue;
        const [a, b] = cut;
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
        // phase from the position keeps neighbouring segments in step
        const phase = ((Math.atan2(a[0], a[2]) + Math.PI) * 0.37) % SPACING;
        for (let s = phase; s < len; s += SPACING) {
          const u = s / len;
          const p = [0, 1, 2, 3, 4, 5].map((d) => a[d] + (b[d] - a[d]) * u);
          const l = Math.hypot(p[3], p[4], p[5]) || 1;
          P.push(p[0], p[1], p[2], p[3] / l, p[4] / l, p[5] / l, smooth(NECK_FADE[0], NECK_FADE[1], p[1]));
        }
      }
    }
    // Keep only the outer skin. The mesh also models the inside of the
    // mouth, the throat and the eye sockets; seen through the dots those
    // read as a ghostly inner face. For each direction out from the
    // middle of the head, drop anything well inside the outermost layer.
    const C = [0, -0.15, 0.05];
    const LAT = 72, LON = 144;
    const bin = (x, y, z) => {
      const dx = x - C[0], dy = y - C[1], dz = z - C[2];
      const r = Math.hypot(dx, dy, dz) || 1e-6;
      const la = Math.min(LAT - 1, Math.floor(((Math.asin(dy / r) / Math.PI) + 0.5) * LAT));
      const lo = Math.min(LON - 1, Math.floor(((Math.atan2(dx, dz) / Math.PI + 1) / 2) * LON));
      return [la * LON + lo, r];
    };
    const outer = new Float32Array(LAT * LON);
    for (let i = 0; i < P.length; i += STRIDE) {
      const [b, r] = bin(P[i], P[i + 1], P[i + 2]);
      if (r > outer[b]) outer[b] = r;
    }
    const kept = [];
    for (let i = 0; i < P.length; i += STRIDE) {
      const [b, r] = bin(P[i], P[i + 1], P[i + 2]);
      if (r >= outer[b] - 0.07) for (let d = 0; d < STRIDE; d++) kept.push(P[i + d]);
    }

    this.P = new Float32Array(kept);
    this.buckets = Array.from({ length: BUCKETS }, () => []);
  }

  readColors() {
    const css = getComputedStyle(this.root);
    const pick = (v, d) => (v.trim() || d);
    this.base = pick(css.getPropertyValue('--holo'), '#2fb3a8');
    this.hi = pick(css.getPropertyValue('--holo-hi'), '#d4fff8');
    this.dark = (document.documentElement.dataset.theme || 'dark') === 'dark';
    const mix = (a, b, t) => {
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
      return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
    };
    this.styles = Array.from({ length: BUCKETS }, (_, i) => mix(this.base, this.hi, Math.max(0, (i - 4) / (BUCKETS - 5)) * 0.9));
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min(this.w * 0.5, this.h * 0.36);
    this.cx = this.w / 2;
    this.cy = this.h * 0.4;
  }

  update(time) {
    if (!this.w) return;
    const now = performance.now();
    const ctx = this.ctx;

    // ---- where to face -------------------------------------------------
    let tx = this.target.x;
    let ty = this.target.y;
    if (!this.hasPointer || this.still) {
      if (now > this.wanderAt) {
        this.idle = { x: this.cx + rand(-0.5, 0.5) * this.w, y: this.cy + rand(-0.2, 0.3) * this.h };
        this.wanderAt = now + rand(2500, 4500);
      }
      tx = this.still ? this.cx : this.idle.x;
      ty = this.still ? this.cy : this.idle.y;
    }
    const k = this.still ? 1 : 0.05;
    this.yaw += (Math.max(-0.5, Math.min(0.5, ((tx - this.cx) / this.w) * 0.85)) - this.yaw) * k;
    this.pitch += (Math.max(-0.25, Math.min(0.25, ((ty - this.cy) / this.h) * 0.45)) - this.pitch) * k;
    if (!this.still) {
      this.yaw += Math.sin(time * 0.5) * 0.0012; // a gentle, living sway
      this.pitch += Math.sin(time * 0.7) * 0.0006;
    }

    const cyw = Math.cos(this.yaw), syw = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const S = this.scale;

    // key light from the upper left, in front (fixed to the view), and
    // the half-vector for a soft sheen on the brow, nose, cheeks and lips
    const ll = Math.hypot(-0.72, 0.42, 0.58);
    const lx = -0.72 / ll, ly = 0.42 / ll, lz = 0.58 / ll;
    const hl = Math.hypot(lx, ly, lz + 1);
    const hx = lx / hl, hy = ly / hl, hz = (lz + 1) / hl;

    const P = this.P;
    const buckets = this.buckets;
    for (const b of buckets) b.length = 0;
    for (let i = 0; i < P.length; i += STRIDE) {
      const fade = P[i + 6];
      if (fade < 0.02) continue;
      const nx0 = P[i + 3], ny0 = P[i + 4], nz0 = P[i + 5];
      const nrx = nx0 * cyw + nz0 * syw;
      let nrz = -nx0 * syw + nz0 * cyw;
      const nry = ny0 * cp - nrz * sp;
      nrz = ny0 * sp + nrz * cp;
      if (nrz < -0.1) continue;                         // the far side

      const x = P[i], y = P[i + 1], z = P[i + 2];
      const rx = x * cyw + z * syw;
      let rz = -x * syw + z * cyw;
      const ry = y * cp - rz * sp;
      rz = y * sp + rz * cp;
      const f = 3.6 / (3.6 - rz);

      const diffuse = Math.max(0, nrx * lx + nry * ly + nrz * lz);
      const sheen = Math.pow(Math.max(0, nrx * hx + nry * hy + nrz * hz), 24);
      const rim = Math.pow(1 - Math.min(1, Math.abs(nrz)), 3) * 0.3;
      // contrast: the side light carves shadows beside the nose, under
      // the brow and lips, and along the cheeks
      let b = 0.05 + Math.pow(diffuse, 1.6) * 0.9 + sheen * 0.5 + rim;
      b *= (0.5 + 0.5 * smooth(-0.6, 0.8, rz)) * fade;  // depth, neck fade
      if (b < 0.04) continue;
      buckets[Math.min(BUCKETS - 1, Math.floor(b * BUCKETS))].push(this.cx + rx * S * f, this.cy - ry * S * f, 1.35 + (f - 1) * 1.2);
    }

    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = this.dark ? 'lighter' : 'source-over';
    for (let bi = 0; bi < BUCKETS; bi++) {
      const pts = buckets[bi];
      if (!pts.length) continue;
      ctx.fillStyle = this.styles[bi];
      ctx.globalAlpha = (0.2 + (bi / (BUCKETS - 1)) * 0.8) * (this.dark ? 0.9 : 0.85);
      for (let j = 0; j < pts.length; j += 3) {
        const d = pts[j + 2];
        ctx.fillRect(pts[j] - d / 2, pts[j + 1] - d / 2, d, d);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
