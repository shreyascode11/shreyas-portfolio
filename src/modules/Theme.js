// =====================================================================
// Theme — day / night view toggle.
//
// Stamps `data-theme="dark"` on <html> (tokens.css swaps the color
// plane), persists the choice in localStorage, and emits a
// `themechange` CustomEvent on window so the WebGL pieces (hero blob,
// placeholder textures) can re-color themselves.
//
// Switching animates as a circle expanding from the toggle, via the
// View Transitions API; browsers without it (or reduced-motion users)
// get an instant switch. The sun/moon icons are inline SVG swapped by
// CSS on [data-theme], so they render identically on every platform
// (the old ☀/☾ text glyphs became colour emoji on iOS).
// =====================================================================
const STORAGE_KEY = 'theme';

// localStorage throws in some strict-privacy modes — never let that
// take the whole site down.
const storage = {
  get() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  },
  set(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  }
};

export class Theme {
  constructor() {
    this.button = document.querySelector('[data-theme-toggle]');

    // Saved choice wins; otherwise the site's native look is the dark,
    // cinematic night view (the day view is the alternate).
    this.current = storage.get() ?? 'dark';

    this.apply(this.current, false);

    this.button?.addEventListener('click', () => this.toggle(this.button));
  }

  /**
   * Flip the theme with the circular reveal.
   * @param {Element} [origin] element the circle grows from (defaults
   *   to the nav toggle; falls back to screen centre if hidden)
   */
  toggle(origin = this.button) {
    const next = this.current === 'dark' ? 'light' : 'dark';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) {
      this.apply(next, true);
      return;
    }

    const rect = origin?.getBoundingClientRect();
    const visible = rect && rect.width > 0;
    const x = visible ? rect.left + rect.width / 2 : innerWidth / 2;
    const y = visible ? rect.top + rect.height / 2 : innerHeight / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    // Kill CSS colour transitions for the duration, so the new snapshot
    // is already the final palette (otherwise the circle reveals a fade)
    const root = document.documentElement;
    root.classList.add('is-theme-switching');
    const transition = document.startViewTransition(() => this.apply(next, true));
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      })
      .catch(() => { /* transition skipped — the switch still happened */ });
    transition.finished.finally(() => root.classList.remove('is-theme-switching'));
  }

  apply(theme, persist) {
    this.current = theme;
    document.documentElement.dataset.theme = theme;
    if (persist) storage.set(theme);

    this.button?.setAttribute(
      'aria-label',
      theme === 'light' ? 'Switch to night view' : 'Switch to day view'
    );

    // Keep the browser UI (mobile address bar) in step with the page
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#e9e9e4' : '#0e0e0c');

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
}
