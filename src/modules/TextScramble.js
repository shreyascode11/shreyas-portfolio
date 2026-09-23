// =====================================================================
// TextScramble — on hover, a mono label shuffles through glyphs and
// resolves left-to-right into its real text (~0.4s). Mono type keeps
// every glyph the same width, so nothing around it shifts.
//
// Applies to [data-scramble]. Each element keeps a fixed aria-label so
// assistive tech always hears the real word, never the noise.
// =====================================================================
const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
const DURATION = 420;

export function initScramble(root = document) {
  root.querySelectorAll('[data-scramble]').forEach((el) => {
    const final = el.textContent.trim();
    el.setAttribute('aria-label', final);
    let raf = 0;

    el.addEventListener('pointerenter', () => {
      cancelAnimationFrame(raf);
      const start = performance.now();

      const step = (now) => {
        const p = Math.min((now - start) / DURATION, 1);
        const settled = Math.floor(p * final.length);
        let out = '';
        for (let i = 0; i < final.length; i++) {
          out += i < settled || final[i] === ' '
            ? final[i]
            : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(step);
        else el.textContent = final;
      };
      raf = requestAnimationFrame(step);
    });
  });
}
