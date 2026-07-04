// =====================================================================
// Menu — fullscreen overlay navigation for small screens.
// Opens from the nav burger; links close it (their navigation is
// handled by Nav via [data-nav-link]). Escape closes. Scroll is locked
// while open (overflow + Lenis stop).
// =====================================================================
export class Menu {
  /** @param {import('./SmoothScroll.js').SmoothScroll|null} smoothScroll */
  constructor(smoothScroll) {
    this.el = document.querySelector('[data-menu]');
    this.button = document.querySelector('[data-menu-toggle]');
    this.smoothScroll = smoothScroll;
    this.open = false;
    if (!this.el || !this.button) return;

    this.button.addEventListener('click', () => this.toggle(!this.open));

    this.el.querySelectorAll('[data-menu-close]').forEach((link) => {
      link.addEventListener('click', () => this.toggle(false));
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.toggle(false);
    });
  }

  toggle(open) {
    this.open = open;
    this.el.classList.toggle('is-open', open);
    this.button.classList.toggle('is-open', open);
    this.button.setAttribute('aria-expanded', String(open));
    this.button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    this.el.setAttribute('aria-hidden', String(!open));
    document.documentElement.classList.toggle('menu-open', open);
    if (this.smoothScroll) {
      open ? this.smoothScroll.stop() : this.smoothScroll.start();
    }
  }
}
