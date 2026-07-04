// =====================================================================
// Cursor — small lime circle that lags the pointer and scales up over
// interactive elements. Never constructed on touch devices (main.js
// guards that), so no touch checks needed here.
//
// Interactive = a, button, or anything with [data-hover].
// =====================================================================
import gsap from 'gsap';

const HOVER_SELECTOR = 'a, button, [data-hover]';

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
      this.shown = false;
    });
  }

  grow() {
    gsap.to(this.el, { scale: 3.2, opacity: 0.9, duration: 0.35, ease: 'power3.out' });
  }

  shrink() {
    gsap.to(this.el, { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' });
  }

  /** Called from the shared ticker — trails the pointer with a lerp. */
  update() {
    this.pos.x += (this.target.x - this.pos.x) * 0.18;
    this.pos.y += (this.target.y - this.pos.y) * 0.18;
    this.setX(this.pos.x);
    this.setY(this.pos.y);
  }
}
