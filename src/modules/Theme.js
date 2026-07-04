// =====================================================================
// Theme — day / night view toggle.
//
// Stamps `data-theme="dark"` on <html> (tokens.css swaps the color
// plane), persists the choice in localStorage, and emits a
// `themechange` CustomEvent on window so the WebGL pieces (hero blob,
// placeholder textures) can re-color themselves.
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

    this.button?.addEventListener('click', () => {
      this.apply(this.current === 'dark' ? 'light' : 'dark', true);
    });
  }

  apply(theme, persist) {
    this.current = theme;
    document.documentElement.dataset.theme = theme;
    if (persist) storage.set(theme);

    if (this.button) {
      const toDark = theme === 'light';
      this.button.textContent = toDark ? '☾' : '☀';
      this.button.setAttribute(
        'aria-label',
        toDark ? 'Switch to night view' : 'Switch to day view'
      );
    }

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
}
