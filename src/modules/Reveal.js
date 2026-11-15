// =====================================================================
// Reveal — scroll-triggered entrances.
//
// Three flavours, all driven by data attributes in the HTML:
//   [data-split]        heading split into chars, staggered rise
//   [data-split-lines]  paragraph split into lines, staggered rise
//   [data-reveal]       block fade + translate up
//
// Reduced motion: everything is left visible and static (main.js simply
// never constructs this class).
// =====================================================================
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Wrap each word of an element in a line-measuring span, then group
 *  words into per-line containers so lines can slide up independently. */
function splitLines(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');

  // Group words that share an offsetTop into lines
  const lines = [];
  let current = null;
  let lastTop = null;
  el.querySelectorAll('.word').forEach((word) => {
    const top = word.offsetTop;
    if (top !== lastTop) {
      current = [];
      lines.push(current);
      lastTop = top;
    }
    current.push(word);
  });

  const split = lines
    .map(
      (line) =>
        `<span class="split-line"><span>${line
          .map((w) => w.textContent)
          .join(' ')}</span></span>`
    )
    .join(' ');
  // Real text for screen readers; animated copy hidden from them
  el.innerHTML = `<span class="sr-only">${el.textContent.trim()}</span><span aria-hidden="true">${split}</span>`;

  return el.querySelectorAll('.split-line > span');
}

// Splitting text and creating ScrollTriggers measures layout for every
// word — done all at once it was one ~300ms main-thread task at the
// moment the curtain lifts. Now only what's on (or just below) the
// screen is set up immediately; everything further down is set up in
// small batches while the browser is idle, nearest first, long before
// a visitor can scroll to it.
const idle = (cb) =>
  'requestIdleCallback' in window
    ? requestIdleCallback(cb, { timeout: 500 })
    : setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: false }), 16);

export class Reveal {
  constructor() {
    const tasks = [
      ...[...document.querySelectorAll('[data-split]')].map((el) => [el, () => this.splitChars(el)]),
      ...[...document.querySelectorAll('[data-split-lines]')].map((el) => [el, () => this.splitLinesOf(el)]),
      ...[...document.querySelectorAll('[data-reveal]')].map((el) => [el, () => this.block(el)]),
      ...[...document.querySelectorAll('.project')].map((el) => [el, () => this.projectRow(el)])
    ]
      .map(([el, run]) => ({ el, run, top: el.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top);

    const fold = window.innerHeight * 1.25;
    const later = [];
    for (const t of tasks) (t.top < fold ? t.run() : later.push(t));

    const pump = (deadline) => {
      while (later.length && (deadline.timeRemaining() > 6 || deadline.didTimeout)) {
        later.shift().run();
        if (deadline.didTimeout) break; // one per forced slice, stay short
      }
      if (later.length) idle(pump);
      else ScrollTrigger.refresh();
    };
    if (later.length) idle(pump);
  }

  splitChars(el) {
    {
      const text = el.textContent.trim();
      // Each char gets its own overflow-hidden mask so multi-line
      // headings clip per character. Chars are grouped into .word
      // wrappers so line breaks can't happen mid-word. Screen readers
      // get the real text via .sr-only; the spans are aria-hidden.
      const split = text
        .split(/\s+/)
        .map(
          (word) =>
            `<span class="word">${word
              .split('')
              .map((c) => `<span class="char-mask"><span class="char">${c}</span></span>`)
              .join('')}</span>`
        )
        .join(' ');
      el.innerHTML = `<span class="sr-only">${text}</span><span aria-hidden="true">${split}</span>`;

      const chars = el.querySelectorAll('.char');
      gsap.from(chars, {
        yPercent: 115,
        duration: 0.8,
        ease: 'power4.out',
        // Cap the total stagger spread at ~0.6s so long statements finish
        // revealing quickly.
        stagger: Math.min(0.035, 0.45 / chars.length),
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    }
  }

  splitLinesOf(el) {
    const lines = splitLines(el);
    gsap.from(lines, {
      yPercent: 110,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.09,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  }

  // Blocks fade with plain opacity, never visibility:hidden. Unrevealed
  // content stays in the accessibility tree and stays keyboard-focusable,
  // so screen-reader heading navigation and Tab don't skip whole sections
  // below the fold.
  block(el) {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  }

  // Project rows get a slightly larger travel
  projectRow(el) {
    gsap.from(el, {
      y: 70,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  }

  refresh() {
    ScrollTrigger.refresh();
  }
}
