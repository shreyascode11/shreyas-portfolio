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

export class Reveal {
  constructor() {
    this.initSplitChars();
    this.initSplitLines();
    this.initBlocks();
  }

  initSplitChars() {
    document.querySelectorAll('[data-split]').forEach((el) => {
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
        duration: 1.1,
        ease: 'power4.out',
        // Cap the total stagger spread at ~1s so long statements don't
        // take forever to finish revealing.
        stagger: Math.min(0.035, 1 / chars.length),
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });
  }

  initSplitLines() {
    document.querySelectorAll('[data-split-lines]').forEach((el) => {
      const lines = splitLines(el);
      gsap.from(lines, {
        yPercent: 110,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });
  }

  initBlocks() {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 40,
        autoAlpha: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    // Project rows get a slightly larger travel + self-stagger feel
    document.querySelectorAll('.project').forEach((el) => {
      gsap.from(el, {
        y: 70,
        autoAlpha: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });
  }

  refresh() {
    ScrollTrigger.refresh();
  }
}
