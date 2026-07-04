// =====================================================================
// SmoothScroll — Lenis wired into GSAP's ticker + ScrollTrigger.
// One RAF loop for the whole site lives in main.js via gsap.ticker;
// Lenis just gets stepped from it here.
// =====================================================================
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export class SmoothScroll {
  constructor() {
    this.lenis = new Lenis({
      duration: 1.15,            // generous, weighty glide
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    // Keep ScrollTrigger in sync with Lenis' virtual scroll
    this.lenis.on('scroll', ScrollTrigger.update);

    // Step Lenis from GSAP's ticker (ms → s conversion)
    this.tick = (time) => this.lenis.raf(time * 1000);
    gsap.ticker.add(this.tick);
    gsap.ticker.lagSmoothing(0);
  }

  /**
   * Scroll to a target element/selector/number.
   * @param {Element|string|number} target
   * @param {Object} [options] lenis scrollTo options (immediate, offset…)
   */
  scrollTo(target, options = {}) {
    this.lenis.scrollTo(target, { duration: 1.4, ...options });
  }

  stop() { this.lenis.stop(); }
  start() { this.lenis.start(); }

  destroy() {
    gsap.ticker.remove(this.tick);
    this.lenis.destroy();
  }
}
