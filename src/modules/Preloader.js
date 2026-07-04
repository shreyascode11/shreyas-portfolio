// =====================================================================
// Preloader — fullscreen intro: counter 0→100 + name reveal, then a
// slide-up exit. The counter runs to ~90 on a fixed timeline, then
// waits for `readyPromise` (WebGL assets / fonts) before snapping to
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
  constructor({ readyPromise, onExit, reducedMotion = false }) {
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

    const intro = gsap.timeline();
    intro.to(this.nameEl.querySelectorAll('.char'), {
      y: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.045
    });
    intro.to(counter, {
      value: 90,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: setCounter
    }, 0.2);

    return new Promise((resolve) => {
      // Wait for both the intro timeline AND real asset readiness
      Promise.all([
        new Promise((r) => intro.eventCallback('onComplete', r)),
        this.readyPromise
      ]).then(() => {
        const exit = gsap.timeline({ onComplete: resolve });
        exit.to(counter, {
          value: 100,
          duration: 0.3,
          ease: 'power1.out',
          onUpdate: setCounter
        });
        exit.add(() => {
          document.documentElement.style.overflow = '';
          this.onExit?.();
        });
        exit.to(this.el, {
          yPercent: -100,
          duration: 1,
          ease: 'power4.inOut'
        }, '+=0.15');
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
