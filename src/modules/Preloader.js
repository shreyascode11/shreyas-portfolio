// =====================================================================
// Preloader — the ink intro.
//
//   sketch  the name appears as a wobbly pencil outline (boiling lines,
//           the same ink language as Pip) once its font has arrived
//   ink     orange ink floods the letters left → right. The ink level
//           IS the progress: it runs to 90% on a fixed timeline, then
//           waits for `readyPromise` (fonts + WebGL, capped) before
//           filling — so it never lies, and never hangs on a slow line
//   sign    a signature underline draws itself; the status reads
//           sketching → inking → ready
//   peel    the page lifts away along a hand-inked wavy edge
//
// The first frame is pure HTML/CSS (status line + empty stage), so
// nothing on the network sits in front of first paint.
// =====================================================================
import gsap from 'gsap';

export class Preloader {
  /**
   * @param {Object} options
   * @param {Promise} options.readyPromise resolves when assets are loaded
   * @param {Promise} [options.fontsReady] the name waits for its font
   * @param {Function} [options.onExit] called as the exit animation starts
   * @param {boolean} [options.reducedMotion] skip animation, quick fade
   */
  constructor({ readyPromise, fontsReady, onExit, reducedMotion = false }) {
    this.el = document.querySelector('.preloader');
    this.stage = this.el.querySelector('.preloader__stage');
    this.nameEl = this.el.querySelector('[data-preloader-name]');
    this.sign = this.el.querySelector('.preloader__sign path');
    this.statusEl = this.el.querySelector('[data-preloader-status]');
    this.boil = this.el.querySelector('[data-preloader-boil]');
    this.edge = this.el.querySelector('.preloader__edge');
    this.inkStops = this.el.querySelectorAll('[data-ink-stop]');
    this.readyPromise = readyPromise;
    this.fontsReady = fontsReady ?? Promise.resolve();
    this.onExit = onExit;
    this.reducedMotion = reducedMotion;

    document.documentElement.style.overflow = 'hidden'; // no scroll during load
  }

  setStatus(text) {
    if (this.statusEl.textContent !== text) this.statusEl.textContent = text;
  }

  /** @returns {Promise} resolves when the preloader has fully exited */
  start() {
    if (this.reducedMotion) return this.exitReduced();

    // Pencil lines boil at ~8 fps, like hand-drawn frames
    let seed = 1;
    const boil = setInterval(() => {
      seed = (seed % 4) + 1;
      this.boil?.setAttribute('seed', seed);
    }, 120);

    const ink = { v: 0 };
    const setInk = () => {
      const offset = ink.v.toFixed(3);
      this.inkStops.forEach((s) => s.setAttribute('offset', offset));
      this.setStatus(ink.v < 0.35 ? 'sketching' : ink.v < 1 ? 'inking' : 'ready');
    };

    // Sketch in as soon as the font is here (capped, so a slow font
    // never holds the intro), then ink to 90% while assets load
    const sketched = Promise.race([this.fontsReady, new Promise((r) => setTimeout(r, 450))])
      .then(() => new Promise((r) => {
        // Ghost lines firm up into a solid pencil outline
        const text = this.nameEl.querySelector('text');
        text.style.strokeDasharray = 'none';
        gsap.to(text, { strokeOpacity: 1, duration: 0.3, ease: 'power2.out' });
        gsap.to(this.nameEl, { y: 0, rotate: 0, duration: 0.45, ease: 'power3.out' });
        gsap.to(ink, { v: 0.9, duration: 0.55, ease: 'power2.inOut', delay: 0.1, onUpdate: setInk });
        gsap.to(this.sign, { strokeDashoffset: 0.12, duration: 0.6, ease: 'power2.inOut', delay: 0.15 });
        setTimeout(r, 650);
      }));

    return new Promise((resolve) => {
      Promise.all([sketched, this.readyPromise]).then(() => {
        const exit = gsap.timeline({
          onComplete: () => {
            clearInterval(boil);
            resolve();
          }
        });
        // Finish the ink and the signature flourish
        exit.to(ink, { v: 1, duration: 0.15, ease: 'power1.out', onUpdate: setInk });
        exit.to(this.sign, { strokeDashoffset: 0, duration: 0.15, ease: 'power1.out' }, '<');
        exit.add(() => {
          document.documentElement.style.overflow = '';
          this.onExit?.();
        });
        // Peel: the page lifts away, the inked wavy edge leading
        exit.to(this.el, {
          y: () => -(this.el.offsetHeight + (this.edge?.getBoundingClientRect().height ?? 0)),
          duration: 0.6,
          ease: 'power4.inOut'
        });
        exit.to(this.stage, { y: -40, opacity: 0, duration: 0.4, ease: 'power2.in' }, '<');
        exit.set(this.el, { display: 'none' });
        this.el.classList.add('is-done');
      });
    });
  }

  /** Reduced motion: no sketching or peeling — inked, then a quick fade. */
  exitReduced() {
    this.inkStops.forEach((s) => s.setAttribute('offset', '1'));
    this.nameEl.style.transform = 'none';
    const text = this.nameEl.querySelector('text');
    text.style.strokeOpacity = '1';
    text.style.strokeDasharray = 'none';
    this.nameEl.style.filter = 'none';
    this.sign.style.strokeDashoffset = '0';
    this.setStatus('ready');
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
