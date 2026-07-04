// =====================================================================
// Nav — minimal fixed header. Anchor links route through the accent
// wipe (PageTransition); the header gains a blurred backdrop once the
// page is scrolled. Also owns the footer's back-to-top button.
// =====================================================================
export class Nav {
  /**
   * @param {import('./PageTransition.js').PageTransition} transition
   * @param {import('./SmoothScroll.js').SmoothScroll|null} smoothScroll
   * @param {boolean} reducedMotion plain jumps instead of wipes
   */
  constructor(transition, smoothScroll, reducedMotion = false) {
    this.el = document.querySelector('[data-nav]');
    this.transition = transition;
    this.smoothScroll = smoothScroll;
    this.reducedMotion = reducedMotion;

    document.querySelectorAll('[data-nav-link]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return; // let the browser handle broken anchors
        e.preventDefault();
        this.goTo(target);
      });
    });

    document.querySelector('[data-back-to-top]')?.addEventListener('click', () => {
      // Back-to-top is a glide, not a wipe — it reads better for "return"
      if (this.smoothScroll) {
        this.smoothScroll.scrollTo(0, { duration: 1.6 });
      } else {
        window.scrollTo({ top: 0 });
      }
    });

    // Scrollspy targets: header links only, mapped to their sections
    this.spy = [...this.el.querySelectorAll('.nav__link')]
      .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
      .filter((s) => s.section);

    // Blur the nav background after leaving the hero
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.onScroll();
  }

  goTo(target) {
    if (this.reducedMotion) {
      target.scrollIntoView();
      return;
    }
    this.transition.to(target);
  }

  onScroll() {
    this.el.classList.toggle('is-scrolled', window.scrollY > 40);

    // Scrollspy: the last section whose top passed the upper third of
    // the viewport is "current"
    const probe = window.scrollY + window.innerHeight * 0.35;
    let current = null;
    for (const s of this.spy) {
      if (s.section.offsetTop <= probe) current = s;
    }
    for (const s of this.spy) {
      s.link.classList.toggle('is-active', s === current);
    }
  }
}
