// =====================================================================
// Toast — one small pill at the bottom of the screen for quick
// confirmations ("Email copied"). A single element is reused; calling
// toast() again while one is showing just swaps the text and restarts
// the timer. Announced to screen readers via aria-live.
// =====================================================================
let el = null;
let hideTimer = null;

function ensure() {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'toast mono';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

/** @param {string} text @param {number} [ms] */
export function toast(text, ms = 2200) {
  const node = ensure();
  node.textContent = text;
  // Force a reflow so re-showing the same toast restarts the transition
  node.classList.remove('is-visible');
  void node.offsetWidth;
  node.classList.add('is-visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => node.classList.remove('is-visible'), ms);
}

/** Copy text to the clipboard, with a fallback for older browsers. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}
