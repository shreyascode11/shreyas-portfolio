// =====================================================================
// CommandPalette — ⌘K / Ctrl+K (or "/") menu for keyboard-first
// visitors: jump to any section, copy the email, grab the CV, toggle
// the theme, open a project. Built as an ARIA combobox + listbox:
// focus stays in the search input, arrows move the active option,
// Enter runs it, Esc closes and returns focus where it was.
//
// Commands are plain objects supplied by main.js:
//   { group, label, hint?, keywords?, run }
// `label` may be a function (for state-dependent text like the theme).
// =====================================================================
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export class CommandPalette {
  /**
   * @param {Object} options
   * @param {Array} options.commands
   * @param {Function} [options.onOpen]  e.g. pause smooth scroll
   * @param {Function} [options.onClose]
   */
  constructor({ commands, onOpen, onClose }) {
    this.commands = commands;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.isOpen = false;
    this.results = [];
    this.active = 0;
    this.lastFocus = null;

    this.build();
    this.bindGlobal();

    // Nav trigger: show the right modifier for the platform
    document.querySelectorAll('[data-cmdk-mod]').forEach((k) => {
      k.textContent = isMac ? '⌘' : 'Ctrl';
    });
    document.querySelectorAll('[data-cmdk-open]').forEach((b) => {
      b.addEventListener('click', () => this.open());
    });
  }

  build() {
    this.root = document.createElement('div');
    this.root.className = 'cmdk';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="cmdk__backdrop" data-cmdk-close></div>
      <div class="cmdk__panel" role="dialog" aria-modal="true" aria-label="Command menu" data-lenis-prevent>
        <div class="cmdk__search">
          <span class="cmdk__prompt mono" aria-hidden="true">&rsaquo;</span>
          <input class="cmdk__input" type="text" placeholder="Jump to a section, copy email, open a project…"
                 role="combobox" aria-expanded="true" aria-controls="cmdk-list"
                 aria-autocomplete="list" autocomplete="off" spellcheck="false" />
          <kbd class="cmdk__esc mono">Esc</kbd>
        </div>
        <ul class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Commands"></ul>
        <div class="cmdk__foot mono" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>`;
    document.body.appendChild(this.root);

    this.input = this.root.querySelector('.cmdk__input');
    this.list = this.root.querySelector('.cmdk__list');

    this.input.addEventListener('input', () => this.filter(this.input.value));
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.root.querySelector('[data-cmdk-close]').addEventListener('click', () => this.close());

    this.list.addEventListener('pointermove', (e) => {
      const item = e.target.closest('[data-index]');
      if (item) this.setActive(Number(item.dataset.index), false);
    });
    this.list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-index]');
      if (item) this.run(Number(item.dataset.index));
    });
  }

  bindGlobal() {
    window.addEventListener('keydown', (e) => {
      const typing = e.target.closest?.('input, textarea, [contenteditable="true"]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      } else if (e.key === '/' && !typing && !this.isOpen) {
        e.preventDefault();
        this.open();
      } else if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.lastFocus = document.activeElement;
    this.input.value = '';
    this.filter('');
    this.root.hidden = false;
    // next frame so the entrance transition runs from the hidden state
    requestAnimationFrame(() => this.root.classList.add('is-open'));
    this.input.focus({ preventScroll: true });
    this.onOpen?.();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('is-open');
    setTimeout(() => { if (!this.isOpen) this.root.hidden = true; }, 260);
    this.onClose?.();
    this.lastFocus?.focus?.({ preventScroll: true });
  }

  labelOf(cmd) {
    return typeof cmd.label === 'function' ? cmd.label() : cmd.label;
  }

  /** Rank: label prefix > word prefix > substring > keyword hit. */
  filter(query) {
    const q = query.trim().toLowerCase();
    const scored = this.commands.map((cmd, order) => {
      if (!q) return { cmd, order, score: 1 };
      const label = this.labelOf(cmd).toLowerCase();
      const keys = (cmd.keywords || []).join(' ').toLowerCase();
      let score = 0;
      if (label.startsWith(q)) score = 4;
      else if (label.split(/[\s—·-]+/).some((w) => w.startsWith(q))) score = 3;
      else if (label.includes(q)) score = 2;
      else if (keys.includes(q)) score = 1;
      return { cmd, order, score };
    });
    this.results = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map((r) => r.cmd);
    this.render(q);
  }

  render(q) {
    if (!this.results.length) {
      this.list.innerHTML = `<li class="cmdk__empty mono" role="presentation">No matches — try “email”, “cv” or “aegis”</li>`;
      this.input.removeAttribute('aria-activedescendant');
      return;
    }
    let html = '';
    let lastGroup = null;
    this.results.forEach((cmd, i) => {
      // Group headers only in the unfiltered view; ranked results read
      // better as one flat list
      if (!q && cmd.group !== lastGroup) {
        html += `<li class="cmdk__group mono" role="presentation">${cmd.group}</li>`;
        lastGroup = cmd.group;
      }
      html += `
        <li class="cmdk__item" id="cmdk-opt-${i}" role="option" aria-selected="false" data-index="${i}">
          <span class="cmdk__label">${this.labelOf(cmd)}</span>
          ${cmd.hint ? `<span class="cmdk__hint mono">${cmd.hint}</span>` : ''}
        </li>`;
    });
    this.list.innerHTML = html;
    this.setActive(0);
  }

  setActive(index, scroll = true) {
    if (!this.results.length) return;
    this.active = (index + this.results.length) % this.results.length;
    this.list.querySelectorAll('.cmdk__item').forEach((el) => {
      const on = Number(el.dataset.index) === this.active;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
      if (on && scroll) el.scrollIntoView({ block: 'nearest' });
    });
    this.input.setAttribute('aria-activedescendant', `cmdk-opt-${this.active}`);
  }

  onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.setActive(this.active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.setActive(this.active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); this.run(this.active); }
    else if (e.key === 'Tab') { e.preventDefault(); } // focus stays in the dialog
  }

  run(index) {
    const cmd = this.results[index];
    if (!cmd) return;
    // Close first (restores scrolling), then act next frame so section
    // jumps aren't fighting the scroll lock
    this.close();
    requestAnimationFrame(() => cmd.run());
  }
}
