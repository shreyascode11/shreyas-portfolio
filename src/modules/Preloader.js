// =====================================================================
// Preloader — fullscreen intro: counter 0→100 + name reveal, then a
// slide-up exit. The counter runs to ~90 on a fixed timeline, then
// waits for `readyPromise` (fonts, plus WebGL for a capped time) before snapping to
// 100 and exiting — so it never lies about progress but also never
// hangs at 3% on a slow connection.
// =====================================================================
import gsap from 'gsap';

export class Preloader {
  /**
   * @param {Object} options
   * @param {Promise} options.readyPromise resolves when assets are loaded
   * @param {Function} [options.onExit] called as the exit animation starts
   * @param {boolean} [options.reducedMotion] skip animation, quick fade
   */
  constructor({ readyPromise, fontsReady, onExit, reducedMotion = false }) {
    this.fontsReady = fontsReady ?? Promise.resolve();
    this.el = document.querySelector('.preloader');
    this.counterEl = this.el.querySelector('[data-preloader-counter]');
    this.nameEl = this.el.querySelector('[data-preloader-name]');
    this.readyPromise = readyPromise;
    this.onExit = onExit;
    this.reducedMotion = reducedMotion;

    // Split the name into chars for a staggered rise
    this.nameEl.innerHTML = this.nameEl.textContent
      .split('')
      .map((c) => `<span class="char">${c}</span>`)
      .join('');

    document.documentElement.style.overflow = 'hidden'; // no scroll during load
  }

  /** @returns {Promise} resolves when the preloader has fully exited */
  start() {
    if (this.reducedMotion) return this.exitReduced();

    const counter = { value: 0 };
    const setCounter = () => {
      this.counterEl.textContent = Math.round(counter.value);
    };

    // Kept brisk (~0.8s): every moment the curtain is up is a moment the
    // page isn't visible. The counter starts at once; the name waits for
    // its font (capped) so it never rises in the fallback face.
    const counted = new Promise((r) => gsap.to(counter, {
      value: 90,
      duration: 0.6,
      ease: 'power2.inOut',
      onUpdate: setCounter,
      onComplete: r
    }));
    // Resolves once the name has *started* rising: the curtain can lift
    // while the last letters settle, rather than after
    const named = Promise.race([this.fontsReady, new Promise((r) => setTimeout(r, 450))])
      .then(() => new Promise((r) => {
        gsap.to(this.nameEl.querySelectorAll('.char'), {
          y: 0,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.025
        });
        setTimeout(r, 300);
      }));

    return new Promise((resolve) => {
      // Wait for both the intro AND real asset readiness
      Promise.all([counted, named, this.readyPromise]).then(() => {
        const exit = gsap.timeline({ onComplete: resolve });
        exit.to(counter, {
          value: 100,
          duration: 0.1,
          ease: 'power1.out',
          onUpdate: setCounter
        });
        exit.add(() => {
          document.documentElement.style.overflow = '';
          this.onExit?.();
        });
        exit.to(this.el, {
          yPercent: -100,
          duration: 0.6,
          ease: 'power4.inOut'
        });
        exit.set(this.el, { display: 'none' });
        this.el.classList.add('is-done');
      });
    });
  }

  /** Reduced motion: brief pause, simple fade, content immediately usable. */
  exitReduced() {
    this.counterEl.textContent = '100';
    this.nameEl.querySelectorAll('.char').forEach((c) => (c.style.transform = 'none'));
    return this.readyPromise.then(
      () =>
        new Promise((resolve) => {
          document.documentElement.style.overflow = '';
          this.onExit?.();
          gsap.to(this.el, {
            autoAlpha: 0,
            duration: 0.3,
            onComplete: () => {
              this.el.style.display = 'none';
              resolve();
            }
          });
        })
    );
  }
}
