// =====================================================================
// PageTransition — the accent-colored wipe used when jumping between
// sections from the nav. Sequence: wipe covers the screen (from the
// bottom), scroll snaps instantly while hidden, wipe exits upward.
// =====================================================================
import gsap from 'gsap';

export class PageTransition {
  /** @param {import('./SmoothScroll.js').SmoothScroll|null} smoothScroll */
  constructor(smoothScroll) {
    this.el = document.querySelector('[data-wipe]');
    this.smoothScroll = smoothScroll;
    this.running = false;
  }

  /**
   * Wipe to an in-page target.
   * @param {Element} target section to land on
   * @returns {Promise}
   */
  to(target) {
    if (this.running) return Promise.resolve();
    this.running = true;

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.running = false;
          resolve();
        }
      });

      // Cover: grow from the bottom edge
      tl.set(this.el, { transformOrigin: '50% 100%' });
      tl.to(this.el, { scaleY: 1, duration: 0.55, ease: 'power4.in' });

      // Jump while the screen is covered
      tl.add(() => {
        if (this.smoothScroll) {
          this.smoothScroll.scrollTo(target, { immediate: true, force: true });
        } else {
          target.scrollIntoView(); // no-Lenis fallback (reduced motion)
        }
      });

      // Reveal: shrink toward the top edge
      tl.set(this.el, { transformOrigin: '50% 0%' }, '+=0.05');
      tl.to(this.el, { scaleY: 0, duration: 0.7, ease: 'power4.out' });
    });
  }
}
