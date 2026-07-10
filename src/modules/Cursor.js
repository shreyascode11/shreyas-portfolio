// =====================================================================
// Cursor — small accent circle that lags the pointer, scales up over
// interactive elements, and leaves a soft smoke trail behind it: puffs
// spawn along the pointer's path, drift upward, expand and dissolve.
// Smoke is drawn on a fullscreen 2D canvas (cheap radial gradients,
// capped particle count). Never constructed on touch devices (main.js
// guards that), so no touch checks needed here.
//
// Interactive = a, button, or anything with [data-hover].
// =====================================================================
import gsap from 'gsap';

const HOVER_SELECTOR = 'a, button, [data-hover]';
const MAX_PARTICLES = 140;

export class Cursor {
  constructor() {
    this.el = document.querySelector('[data-cursor]');
    document.documentElement.classList.add('has-cursor');

    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.target = { ...this.pos };
    this.shown = false;

    // Quick setters avoid re-creating tweens every frame
    this.setX = gsap.quickSetter(this.el, 'x', 'px');
    this.setY = gsap.quickSetter(this.el, 'y', 'px');

    // ---- smoke canvas ----------------------------------------------------
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cursor-smoke';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.lastSpawn = { ...this.pos };
    this.spawning = true; // paused while the cursor is enlarged over links

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    window.addEventListener('pointermove', (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
      if (!this.shown) {
        this.shown = true;
        gsap.to(this.el, { opacity: 1, duration: 0.3 });
      }
    }, { passive: true });

    // Scale up on interactive elements (event delegation)
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(HOVER_SELECTOR)) this.grow();
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(HOVER_SELECTOR)) this.shrink();
    });

    document.addEventListener('pointerleave', () => {
      gsap.to(this.el, { opacity: 0, duration: 0.3 });
      this.shown = false; // existing puffs dissolve on their own
    });
  }

  resize() {
    // 1× pixel ratio is plenty — smoke is soft by nature, and it keeps
    // the per-frame fill cost low on large screens.
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  grow() {
    gsap.to(this.el, { scale: 3.2, opacity: 0.9, duration: 0.35, ease: 'power3.out' });
    this.spawning = false; // smoke under the big circle reads as clutter
  }

  shrink() {
    gsap.to(this.el, { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' });
    this.spawning = true;
  }

  /** Emit puffs along the path travelled since the last spawn point. */
  spawnSmoke() {
    const dx = this.pos.x - this.lastSpawn.x;
    const dy = this.pos.y - this.lastSpawn.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return;

    // Faster sweeps drop more puffs, spread along the segment
    const count = Math.min(Math.ceil(dist / 8), 4);
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / count;
      this.particles.push({
        x: this.lastSpawn.x + dx * t + (Math.random() - 0.5) * 6,
        y: this.lastSpawn.y + dy * t + (Math.random() - 0.5) * 6,
        r: 5 + Math.random() * 6,
        life: 1,
        decay: 0.016 + Math.random() * 0.014,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.25 - Math.random() * 0.45 // smoke rises
      });
    }
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
    this.lastSpawn.x = this.pos.x;
    this.lastSpawn.y = this.pos.y;
  }

  /** Called from the shared ticker — trails the pointer with a lerp. */
  update() {
    this.pos.x += (this.target.x - this.pos.x) * 0.18;
    this.pos.y += (this.target.y - this.pos.y) * 0.18;
    this.setX(this.pos.x);
    this.setY(this.pos.y);

    if (this.shown && this.spawning) this.spawnSmoke();

    // ---- render smoke ----------------------------------------------------
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.particles.length) return;

    // Pale vapor on the night theme, soft dark smoke on day
    const dark = document.documentElement.dataset.theme !== 'light';
    const rgb = dark ? '226, 226, 220' : '38, 38, 34';

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.r *= 1.035; // puffs expand as they dissolve

      const alpha = p.life * p.life * (dark ? 0.13 : 0.1);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(${rgb}, ${alpha})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
