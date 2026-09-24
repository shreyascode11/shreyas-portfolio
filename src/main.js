// =====================================================================
// MAIN — orchestrates the whole experience.
//
// Boot order:
//   1. Detect capabilities (touch / reduced motion / WebGL)
//   2. Render project rows from /src/data/projects.js
//   3. Start the preloader; init WebGL behind it after first paint
//   4. On preloader exit: reveals, smooth scroll, cursor, transitions
//   5. Single gsap.ticker loop drives Lenis + both GL scenes + cursor
// =====================================================================
// NOTE: three is never imported at the top level — it's lazy-loaded in
// initGL() so the initial chunk (preloader, styles, UI) stays tiny.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { projects } from './data/projects.js';
import { experience, education, certifications, languages } from './data/profile.js';
import { stack } from './data/stack.js';
import { Preloader } from './modules/Preloader.js';
import { Theme } from './modules/Theme.js';
import { Menu } from './modules/Menu.js';
import { SmoothScroll } from './modules/SmoothScroll.js';
import { Cursor } from './modules/Cursor.js';
import { PageTransition } from './modules/PageTransition.js';
import { Reveal } from './modules/Reveal.js';
import { Nav } from './modules/Nav.js';
import { CommandPalette } from './modules/CommandPalette.js';
import { initScramble } from './modules/TextScramble.js';
import { toast, copyText } from './modules/Toast.js';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------
// Capability flags — decide how heavy the experience gets.
// ---------------------------------------------------------------------
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// The hero scene runs everywhere WebGL exists (phones get a lighter
// quality tier). Hover-driven extras (image distortion, custom cursor)
// stay desktop-only since touch has no hover.
const useHeroGL = !reducedMotion && supportsWebGL();
const useDistortion = useHeroGL && !isTouch;

// Longest the preloader will hold for WebGL, measured from boot. The
// preloader's own intro runs about 1.2s.
const GL_WAIT_MS = 1600;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolves after the page has loaded its critical resources and painted
// a frame. Capped, so one stalled request can't hold everything back.
function afterFirstPaint() {
  const loaded =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((r) => window.addEventListener('load', r, { once: true }));
  return Promise.race([loaded, wait(2500)]).then(
    () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))
  );
}

// Resolves when `el` comes within `rootMargin` of the viewport, or a few
// seconds after first paint once the browser is idle, whichever is first.
function whenNear(el, rootMargin) {
  return new Promise((resolve) => {
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && done(),
      { rootMargin }
    );
    const done = () => {
      io.disconnect();
      resolve();
    };
    io.observe(el);
    const idle = (cb) =>
      'requestIdleCallback' in window ? requestIdleCallback(cb) : setTimeout(cb, 0);
    afterFirstPaint().then(() => wait(3000)).then(() => idle(done));
  });
}

// ---------------------------------------------------------------------
// Render the Work section from data.
// ---------------------------------------------------------------------
// Responsive thumbnails: each project JPEG ships with AVIF and WebP
// siblings at these widths (name-480.avif …). The media column is at
// most 30rem wide on desktop and spans the container under 900px.
const THUMB_WIDTHS = [480, 800, 1200];
const THUMB_SIZES = '(max-width: 900px) 92vw, 480px';

function thumbnail(p) {
  const alt = `${p.name} — project preview`;
  const base = p.image.replace(/\.jpe?g$/i, '');
  const attrs = `alt="${alt}" loading="lazy" decoding="async" width="1200" height="900"`;
  if (base === p.image) return `<img src="${p.image}" ${attrs} />`;
  const srcset = (ext) => THUMB_WIDTHS.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
  return `<picture>
      <source type="image/avif" srcset="${srcset('avif')}" sizes="${THUMB_SIZES}" />
      <source type="image/webp" srcset="${srcset('webp')}" sizes="${THUMB_SIZES}" />
      <img src="${p.image}" data-gl-src="${base}-1200.webp" ${attrs} />
    </picture>`;
}

function renderProjects() {
  const list = document.querySelector('[data-work-list]');

  list.innerHTML = projects
    .map((p, i) => {
      const index = String(i + 1).padStart(2, '0');
      const tags = p.tech
        .map((t) => `<span class="project__tag">${t}</span>`)
        .join('');
      const links = [
        p.links.live &&
          `<a class="mono" href="${p.links.live}" target="_blank" rel="noopener noreferrer">Live ↗</a>`,
        p.links.github &&
          `<a class="mono" href="${p.links.github}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`
      ]
        .filter(Boolean)
        .join('');

      // Expandable "why & what" panel, sourced from the project's README
      const details =
        p.why || p.features
          ? `
        <div class="project__more">
          <button class="project__more-toggle mono" aria-expanded="false">More +</button>
          <div class="project__details">
            <div class="project__details-inner">
              ${p.why ? `
                <h4 class="project__dlabel mono">Why it exists</h4>
                <p class="project__dtext">${p.why}</p>` : ''}
              ${p.features ? `
                <h4 class="project__dlabel mono">What it does</h4>
                <ul class="project__dlist">
                  ${p.features.map((f) => `<li>${f}</li>`).join('')}
                </ul>` : ''}
            </div>
          </div>
        </div>`
          : '';

      return `
        <li class="project">
          <div class="project__link">
            <span class="project__index mono">${index}</span>
            <div class="project__body">
              <h3 class="project__title">${p.name}</h3>
              ${p.award ? `<p class="project__award mono">★ ${p.award}</p>` : ''}
              <p class="project__blurb">${p.blurb}</p>
              <p class="project__meta mono">
                <span class="project__year">${p.year}</span>
                <span>${p.role}</span>
              </p>
              <div class="project__tags">${tags}</div>
              <div class="project__links">${links}</div>
              ${details}
            </div>
            ${(() => {
              // Thumbnails link out (they read as clickable), lazy-load
              // since the Work section sits below the fold
              const media = p.video
                ? `<video src="${p.video}" muted loop playsinline preload="auto"
                     ${reducedMotion ? '' : 'autoplay'}
                     aria-label="${p.name} — project preview"></video>`
                : thumbnail(p);
              const href = p.links.live || p.links.github;
              return href
                ? `<a class="project__media" href="${href}" target="_blank" rel="noopener noreferrer" data-hover data-cursor-label="View" data-name="${p.name}" aria-label="Open ${p.name}">${media}</a>`
                : `<div class="project__media" data-name="${p.name}">${media}</div>`;
            })()}
          </div>
        </li>`;
    })
    .join('');

  // Expand/collapse the "why & what" panels (pure CSS grid-rows animation;
  // ScrollTrigger re-measures after the height settles)
  list.addEventListener('click', (e) => {
    const toggle = e.target.closest('.project__more-toggle');
    if (!toggle) return;
    const more = toggle.closest('.project__more');
    const open = more.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Less −' : 'More +';
    setTimeout(() => ScrollTrigger.refresh(), 650);
  });
}

// ---------------------------------------------------------------------
// Experience layer: hero scroll-exit, statement mouse-parallax and
// magnetic buttons. Desktop + full-motion only (guarded at call site).
// ---------------------------------------------------------------------
// `getHero` is a getter because the GL scene may arrive after this runs.
function initHeroScroll(getHero) {
  const scrollTrigger = {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => getHero()?.setScrollProgress(self.progress)
  };
  // Statement exits slower than the scroll (classic depth trick);
  // the aside drifts faster, like a nearer layer.
  gsap.to('.hero__inner', { yPercent: 30, ease: 'none', scrollTrigger });
  gsap.to('.hero__aside', {
    yPercent: 80,
    ease: 'none',
    scrollTrigger: { ...scrollTrigger, onUpdate: undefined }
  });
}

/** Statement + aside lean gently away from the cursor. */
function createHeroParallax() {
  const statement = document.querySelector('.hero__statement');
  const aside = document.querySelector('.hero__aside');
  if (!statement) return () => {};

  const setSX = gsap.quickSetter(statement, 'x', 'px');
  const setSY = gsap.quickSetter(statement, 'y', 'px');
  const setAX = aside ? gsap.quickSetter(aside, 'x', 'px') : () => {};

  const target = { x: 0, y: 0 };
  const pos = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  return () => {
    pos.x += (target.x - pos.x) * 0.05;
    pos.y += (target.y - pos.y) * 0.05;
    setSX(pos.x * -16);
    setSY(pos.y * -10);
    setAX(pos.x * -28);
  };
}

/** Pills gently pull toward the cursor and spring back on leave. */
function initMagnetic() {
  document
    .querySelectorAll('.btn, .nav__theme, .nav__burger, .footer__top')
    .forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: x * 0.35, y: y * 0.35, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      });
    });
}

/** Stats count up from zero the first time they scroll into view. */
function initStats() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const pad = Number(el.dataset.pad || 0);
    const format = (v) => {
      const s = v.toFixed(decimals);
      return pad ? s.padStart(pad, '0') : s;
    };
    const state = { v: 0 };
    el.textContent = format(0); // hidden by the reveal until it enters
    gsap.to(state, {
      v: target,
      duration: 1.6,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = format(state.v)),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
}

/**
 * Closing "SHREYAS" wordmark: font-size is solved so the word spans the
 * container exactly (real text, so the font's kerning is kept), then it
 * rises out of its mask when scrolled to.
 */
function initWordmark() {
  const el = document.querySelector('[data-wordmark]');
  if (!el) return;
  const fit = () => {
    el.style.fontSize = '100px';
    const measured = el.getBoundingClientRect().width;
    const available = el.parentElement.clientWidth;
    if (measured > 0) el.style.fontSize = `${Math.floor((100 * available / measured) * 99) / 100}px`;
  };
  fit();
  document.fonts?.ready.then(fit);
  window.addEventListener('resize', fit);
  if (!reducedMotion) {
    gsap.from(el, {
      yPercent: 102,
      duration: 1.5,
      ease: 'power4.out',
      scrollTrigger: { trigger: el.parentElement, start: 'top 92%' }
    });
  }
}

/** 2px accent bar across the top that fills as you read. */
function initProgress() {
  const bar = document.querySelector('[data-progress]');
  if (!bar) return;
  const setScale = gsap.quickSetter(bar, 'scaleX');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    setScale(max > 0 ? Math.min(scrollY / max, 1) : 0);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/**
 * Marquee reacts to scrolling: it speeds up with scroll velocity, runs
 * in the direction you scroll, and the words lean into the motion.
 * Drives the existing CSS animation through its playbackRate (no
 * position jumps). Returns a per-frame update for the shared ticker.
 */
function createMarqueeVelocity(smoothScroll) {
  const track = document.querySelector('.marquee__track');
  if (!track?.getAnimations) return null;
  let anim = null;

  let lastY = scrollY;
  let direction = 1;
  let rate = 1;
  let skew = 0;
  return () => {
    anim ??= track.getAnimations()[0];
    if (!anim) return; // reduced motion → no CSS animation to drive
    const v = smoothScroll ? smoothScroll.lenis.velocity : scrollY - lastY;
    lastY = scrollY;
    if (Math.abs(v) > 0.5) direction = Math.sign(v);
    const targetRate = direction * (1 + Math.min(Math.abs(v) / 10, 4));
    rate += (targetRate - rate) * 0.08;
    skew += (Math.max(-8, Math.min(8, v * 0.25)) - skew) * 0.12;
    anim.playbackRate = rate;
    track.style.setProperty('--marquee-skew', `${skew.toFixed(2)}deg`);
  };
}

/** Everything the ⌘K palette can do. */
function buildCommands({ goTo, theme, smoothScroll }) {
  const section = (id) => () => goTo(document.querySelector(id));
  const open = (url) => () => window.open(url, '_blank', 'noopener');
  const commands = [
    { group: 'Navigate', label: 'Work', hint: '02', keywords: ['projects', 'portfolio'], run: section('#work') },
    { group: 'Navigate', label: 'Stack', hint: '03', keywords: ['skills', 'tech', 'tools'], run: section('#stack') },
    { group: 'Navigate', label: 'Journey', hint: '04', keywords: ['experience', 'education', 'career', 'timeline'], run: section('#journey') },
    { group: 'Navigate', label: 'Freelance', hint: '05', keywords: ['services', 'hire', 'client'], run: section('#freelance') },
    { group: 'Navigate', label: 'Certifications', hint: '06', keywords: ['awards', 'hackathon', 'achievements'], run: section('#certifications') },
    { group: 'Navigate', label: 'Contact', hint: '07', keywords: ['message', 'reach', 'hire'], run: section('#contact') },
    {
      group: 'Navigate', label: 'Back to top', hint: '↑', keywords: ['home', 'hero', 'start'],
      run: () => (smoothScroll ? smoothScroll.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0 }))
    },
    {
      group: 'Actions', label: 'Copy email address', hint: CONTACT_EMAIL, keywords: ['mail', 'contact'],
      run: async () => toast((await copyText(CONTACT_EMAIL)) ? 'Email copied to clipboard' : CONTACT_EMAIL)
    },
    {
      group: 'Actions', label: 'Send a message', hint: 'form', keywords: ['contact', 'hire', 'email'],
      run: () => {
        wakeBackend();
        goTo(document.querySelector('[data-contact-form]'));
        setTimeout(() => document.querySelector('[data-contact-form] input[name="name"]')?.focus({ preventScroll: true }), 1300);
      }
    },
    {
      group: 'Actions', label: 'Download CV', hint: 'PDF', keywords: ['resume', 'cv', 'pdf'],
      run: () => {
        const a = document.createElement('a');
        a.href = '/Shreyas_Resume.pdf';
        a.download = 'Shreyas_Resume.pdf';
        a.click();
      }
    },
    {
      group: 'Actions',
      label: () => (theme.current === 'dark' ? 'Switch to day view' : 'Switch to night view'),
      hint: 'theme', keywords: ['theme', 'dark', 'light', 'mode'],
      run: () => theme.toggle()
    },
    ...projects.map((p) => ({
      group: 'Projects',
      label: p.name,
      hint: p.links.live ? 'live ↗' : 'github ↗',
      keywords: [...p.tech, p.award ? 'award' : ''],
      run: open(p.links.live || p.links.github)
    })),
    { group: 'Elsewhere', label: 'GitHub', hint: '↗', keywords: ['code', 'repos'], run: open('https://github.com/shreyascode11') },
    { group: 'Elsewhere', label: 'LinkedIn', hint: '↗', keywords: ['profile', 'connect'], run: open('https://www.linkedin.com/in/shreyas1102/') },
    { group: 'Elsewhere', label: 'Instagram', hint: '↗', keywords: ['social'], run: open('https://www.instagram.com/_shreyassrivas_/') },
    { group: 'Elsewhere', label: 'View this site’s source', hint: '↗', keywords: ['code', 'repo', 'github'], run: open('https://github.com/shreyascode11/shreyas-portfolio') }
  ];
  return commands;
}

// Console easter egg — developers always look.
function signConsole() {
  try {
    console.log(
      '%cS.%c\n\nNice to see a fellow dev in here.\n' +
        'Hand-written Three.js + GLSL, no frameworks — the code is at\n' +
        'https://github.com/shreyascode11/shreyas-portfolio\n\n' +
        'Say hi: shreoriginal@gmail.com',
      'font: 700 64px "Space Grotesk", sans-serif; color: #ff4b00;',
      'font: 12px monospace; color: #8a8a82;'
    );
  } catch { /* consoles can be weird; never break the site over a gag */ }
}

// ---------------------------------------------------------------------
// Contact form → n8n webhook, self-hosted on a free Render instance.
//
// Free Render boxes sleep after ~15 min idle and take 30-60s to boot.
// While booting, Render's edge rejects requests instantly (502/503/429,
// without CORS headers, so fetch just throws). The form is built to
// ride that out and never lose a message:
//   1. Pre-wake: ping /healthz a few seconds after the page loads, again
//      as the contact section approaches and when a field is focused —
//      visitors read for well over a minute, so the box is usually warm.
//   2. Retry through the boot window: attempts that fail *fast* were
//      rejected before the workflow ran, so they're retried with growing
//      gaps (~60s in total) and can't send a duplicate. An attempt that
//      fails slowly might have been processed, so it's never retried.
//   3. Fallback: after 12s a "send by email" button appears, pre-filled
//      with everything they typed; on final failure it becomes the main
//      action. The form is never cleared unless the send succeeded.
// ---------------------------------------------------------------------
const N8N_BASE = 'https://shreyas-n8n.onrender.com';
const N8N_WEBHOOK_URL = `${N8N_BASE}/webhook/portfolio-contact`;
const CONTACT_EMAIL = 'shreoriginal@gmail.com';
// Gaps between retries of fast-failing sends — ~60s total, enough to
// cover a Render cold boot
const RETRY_DELAYS = [3000, 5000, 8000, 12000, 15000, 18000];

let lastWake = 0;
/** Fire-and-forget ping to wake the Render instance (max every 5 min). */
function wakeBackend() {
  if (Date.now() - lastWake < 5 * 60_000) return;
  lastWake = Date.now();
  fetch(`${N8N_BASE}/healthz`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}

/** One POST with its own timeout; rejects on network error, timeout or non-2xx. */
async function postContact(data, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

function mailtoFor({ name = '', email = '', message = '' }) {
  const subject = `Portfolio message${name ? ` from ${name}` : ''}`;
  const body = `${message}\n\n— ${name}${email ? ` (${email})` : ''}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const fallback = form.querySelector('[data-form-fallback]');
  const setStatus = (text, kind = '') => {
    status.className = `cform__status mono${kind ? ` is-${kind}` : ''}`;
    status.textContent = text;
  };
  const showFallback = (data, primary = false) => {
    fallback.href = mailtoFor(data);
    fallback.hidden = false;
    fallback.classList.toggle('btn--fill', primary);
  };

  // Pre-wake shortly after load (visitors read long before reaching the
  // form), again as they head toward it, and when they start typing
  setTimeout(wakeBackend, 3000);
  const section = document.querySelector('#contact');
  if (section) {
    new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) wakeBackend(); },
      { rootMargin: '100% 0px' } // one viewport ahead of arrival
    ).observe(section);
  }
  form.addEventListener('focusin', wakeBackend);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());

    // Honeypot filled → it's a bot; pretend everything went fine
    if (data.website) {
      form.reset();
      return;
    }

    button.disabled = true;
    fallback.hidden = true;
    setStatus('Sending…');
    const fallbackHint = setTimeout(() => showFallback(data), 12000);

    try {
      for (let attempt = 0; ; attempt++) {
        const started = Date.now();
        // A single slow attempt usually means Render is holding the
        // request while it boots — say so rather than look stuck
        const slowHint = setTimeout(() => setStatus('Still sending — the server is waking up…'), 8000);
        let error = null;
        try {
          await postContact(data, 45000);
        } catch (err) {
          error = err;
        } finally {
          clearTimeout(slowHint); // before any retry wait, or it fires mid-sleep
        }
        if (!error) break;
        const fast = error.name !== 'AbortError' && Date.now() - started < 15000;
        if (!fast || attempt >= RETRY_DELAYS.length) throw error;
        setStatus(`Server is waking up — retrying (${attempt + 1}/${RETRY_DELAYS.length})…`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
      setStatus('Message sent — I’ll reply soon.', 'ok');
      fallback.hidden = true;
      form.reset();
    } catch (err) {
      console.error('Contact form failed:', err);
      setStatus('Couldn’t reach the server — your message is still here.', 'error');
      showFallback(data, true);
    } finally {
      clearTimeout(fallbackHint);
      button.disabled = false;
    }
  });
}

/** "Start a project" CTAs: drop into the on-site form with a head start. */
const PREFILL = {
  website: 'Hi Shreyas — I’d like to build a website. Here’s what I have in mind: ',
  ai: 'Hi Shreyas — I’m exploring an AI feature or agent for my product. The idea: '
};
function initPrefillCTAs(goTo) {
  const form = document.querySelector('[data-contact-form]');
  const message = form?.querySelector('textarea[name="message"]');
  const name = form?.querySelector('input[name="name"]');
  if (!message) return;
  document.querySelectorAll('[data-prefill]').forEach((cta) => {
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      wakeBackend();
      // Don't clobber something the visitor already wrote
      const isTemplate = !message.value.trim() || Object.values(PREFILL).includes(message.value);
      if (isTemplate) message.value = PREFILL[cta.dataset.prefill] ?? '';
      goTo(form);
      setTimeout(() => (name.value ? message : name).focus({ preventScroll: true }), 1300);
    });
  });
}

// ---------------------------------------------------------------------
// Render the Stack section. Chips render immediately (name + an empty
// icon slot) so reveals and layout are stable; the ~15 KB of brand
// icon paths load in their own chunk and fade in when they arrive.
// ---------------------------------------------------------------------
function renderStack() {
  const list = document.querySelector('[data-stack-list]');
  if (!list) return;
  list.innerHTML = stack
    .map((pillar, i) => `
      <li class="pillar" data-reveal>
        <span class="pillar__index mono">${String(i + 1).padStart(2, '0')}</span>
        <div class="pillar__head">
          <h3 class="pillar__title">${pillar.title}</h3>
          <p class="pillar__note mono">${pillar.note} · ${pillar.items.length}</p>
        </div>
        <ul class="pillar__items">
          ${pillar.items.map((item) => `
            <li class="chip">
              <span class="chip__icon" ${item.icon ? `data-icon="${item.icon}"` : ''} aria-hidden="true">${
                item.mono ? `<span class="chip__mono">${item.mono}</span>` : ''
              }</span>
              <span class="chip__name">${item.name}</span>
            </li>`).join('')}
        </ul>
      </li>`)
    .join('');

  // Brand icons aren't needed until the section is close — fetch them
  // then (or when the browser is idle) rather than during first load.
  whenNear(list, '100% 0px')
    .then(() => import('./data/icons.js'))
    .then(({ icons }) => {
      list.querySelectorAll('[data-icon]').forEach((slot) => {
        const d = icons[slot.dataset.icon];
        if (!d) return;
        slot.innerHTML = `<svg viewBox="0 0 24 24" focusable="false"><path d="${d}"/></svg>`;
        slot.classList.add('is-loaded');
      });
    })
    .catch(() => { /* names alone still read fine */ });
}

// ---------------------------------------------------------------------
// Render Journey (experience + education) and Certifications from data.
// ---------------------------------------------------------------------
function renderProfile() {
  const timelineItem = (item) => `
    <li class="timeline__item">
      <h4 class="timeline__role">${item.role ?? item.degree}</h4>
      <span class="timeline__org mono">${item.org ?? item.school}</span>
      <span class="timeline__period mono">${item.period}</span>
      <p class="timeline__desc">${item.desc}</p>
    </li>`;

  // Several roles at one org render as a single entry with a nested
  // role track (LinkedIn-style), so a promotion reads as a progression.
  // Groups keep the order of each org's most recent role.
  const groups = [];
  const byOrg = new Map();
  experience.forEach((item) => {
    if (!byOrg.has(item.org)) {
      const group = { org: item.org, roles: [] };
      byOrg.set(item.org, group);
      groups.push(group);
    }
    byOrg.get(item.org).roles.push(item);
  });

  const groupItem = ({ org, roles }) => {
    if (roles.length === 1) return timelineItem(roles[0]);
    const [from] = roles[roles.length - 1].period.split('—');
    const to = roles[0].period.split('—')[1] ?? '';
    return `
      <li class="timeline__item timeline__item--group">
        <h4 class="timeline__role">${org}</h4>
        <span class="timeline__period mono">${from.trim()} — ${to.trim()} · ${roles.length} roles</span>
        <ol class="timeline__roles">
          ${roles.map((r) => `
            <li class="timeline__step${/present$/i.test(r.period.trim()) ? ' is-current' : ''}">
              <span class="timeline__step-role">${r.role}</span>
              <span class="timeline__period mono">${r.period}</span>
              <p class="timeline__desc">${r.desc}</p>
            </li>`).join('')}
        </ol>
      </li>`;
  };

  document.querySelector('[data-experience-list]').innerHTML =
    groups.map(groupItem).join('');
  document.querySelector('[data-education-list]').innerHTML =
    education.map(timelineItem).join('');

  document.querySelector('[data-languages-list]').innerHTML = languages
    .map(
      (l) => `
      <li class="lang">
        <span class="lang__name">${l.name}</span>
        <span class="lang__level mono">${l.level}</span>
      </li>`
    )
    .join('');

  // Cards with a `url` are links that open the certificate itself
  document.querySelector('[data-certs-list]').innerHTML = certifications
    .map((c) => {
      const inner = `
        <span class="cert__issuer mono">${c.issuer}</span>
        <h3 class="cert__name">${c.name}</h3>
        <span class="cert__period mono">${c.period}</span>
        <p class="cert__desc">${c.desc}</p>
        ${c.url ? '<span class="cert__view mono">View certificate ↗</span>' : ''}`;
      return c.url
        ? `<li data-reveal><a class="cert" href="${c.url}" target="_blank" rel="noopener noreferrer" data-cursor-label="Open" aria-label="View certificate: ${c.name}">${inner}</a></li>`
        : `<li class="cert" data-reveal>${inner}</li>`;
    })
    .join('');
}

// If a placeholder image 404s and WebGL isn't handling thumbnails,
// swap the broken <img> for a generated gradient so nothing looks broken.
async function installImageFallbacks() {
  const { makePlaceholder, setPlaceholderSrc } = await import('./gl/placeholder.js');
  const failed = new Set();
  const nameOf = (img) => img.closest('.project__media')?.dataset.name || '';
  const swap = (img, i) => {
    failed.add(i);
    const theme = document.documentElement.dataset.theme || 'light';
    setPlaceholderSrc(img, makePlaceholder(i, theme, nameOf(img)).toDataURL('image/jpeg', 0.85));
  };

  const imgs = document.querySelectorAll('.project__media img');
  imgs.forEach((img, i) => {
    img.addEventListener('error', () => swap(img, i), { once: true });
    // Already failed before the listener attached
    if (img.complete && img.naturalWidth === 0) swap(img, i);
  });

  // Keep synthetic placeholders in sync with the day/night toggle
  window.addEventListener('themechange', (e) => {
    imgs.forEach((img, i) => {
      if (failed.has(i)) {
        img.src = makePlaceholder(i, e.detail.theme, nameOf(img)).toDataURL('image/jpeg', 0.85);
      }
    });
  });
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
// Live local time in the footer — a small "I'm a real person in a real
// place" touch. Updates every 30s; IST regardless of the visitor's zone.
function startLocalClock() {
  const el = document.querySelector('[data-local-time]');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
  const tick = () => {
    el.textContent = `Chennai, IN — ${fmt.format(new Date())} IST`;
  };
  tick();
  setInterval(tick, 30_000);
}

async function boot() {
  renderProjects();
  renderStack();
  renderProfile();
  initContactForm();
  startLocalClock();

  let hero = null;
  let distortion = null;
  let curtainUp = false; // preloader has exited

  // Day/night toggle — applied before GL init so textures pick the
  // right palette; later switches propagate via the themechange event.
  const theme = new Theme();
  window.addEventListener('themechange', (e) => {
    hero?.setTheme(e.detail.theme);
    distortion?.setTheme(e.detail.theme);
  });

  // WebGL (three.js ~175 KB gz + shader compiles) starts only after first
  // paint, so it never competes with the fonts and main chunk. The
  // preloader covers the gap.
  // A GL failure must never strand the preloader — fall back gracefully.
  const glReady = afterFirstPaint()
    .then(initGL)
    .then(
      (gl) => {
        hero = gl.hero;
        distortion = gl.distortion;
        // Slow network: the curtain already lifted without it, so the
        // blob plays its entrance on arrival instead.
        if (curtainUp) hero?.intro();
      },
      (err) => {
        console.error('WebGL init failed, using fallbacks:', err);
        document.querySelector('[data-hero-gl]').classList.add('is-fallback');
        installImageFallbacks();
      }
    );
  // The preloader waits for the fonts, and waits for WebGL only up to
  // GL_WAIT_MS after boot. On a typical connection the blob still rises
  // with the curtain; a slow three.js download never holds the page back.
  const readyPromise = Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    Promise.race([glReady, wait(GL_WAIT_MS)])
  ]);

  // Reveals are constructed on preloader exit so hero elements animate
  // in as the curtain lifts (their triggers are already in view).
  const preloader = new Preloader({
    readyPromise,
    reducedMotion,
    onExit: () => {
      curtainUp = true;
      hero?.intro();
      if (!reducedMotion) {
        new Reveal();
        initStats();
        // Scrub-linked scroll animation adds real per-tick cost — worth it
        // on a trackpad/mouse, but a common source of scroll jank on
        // phones, so touch gets a plain (still smooth) exit instead.
        if (!isTouch) {
          initHeroScroll(() => hero);
          initMagnetic();
        }
      }
    }
  });

  const preloaderDone = preloader.start();

  // Smooth scroll everywhere except reduced motion (native scroll there)
  const smoothScroll = reducedMotion ? null : new SmoothScroll();
  const transition = new PageTransition(smoothScroll);
  const nav = new Nav(transition, smoothScroll, reducedMotion);
  new Menu(smoothScroll);
  const goTo = (el) => el && nav.goTo(el);

  // ⌘K palette — pauses page scroll while open
  new CommandPalette({
    commands: buildCommands({ goTo, theme, smoothScroll }),
    onOpen: () => smoothScroll?.stop(),
    onClose: () => smoothScroll?.start()
  });
  initPrefillCTAs(goTo);
  initProgress();
  initWordmark();

  const cursor = !isTouch && !reducedMotion ? new Cursor() : null;
  const heroParallax =
    !isTouch && !reducedMotion ? createHeroParallax() : null;
  // Hover-driven / per-frame flourishes stay off touch devices, in line
  // with the rest of the motion layer (mobile scroll stays cheap)
  const marqueeVelocity =
    !isTouch && !reducedMotion ? createMarqueeVelocity(smoothScroll) : null;
  if (!isTouch) initScramble();
  signConsole();

  // Only render GL scenes while their sections are (nearly) on screen —
  // no reason to burn GPU at the footer. Marquee pauses offscreen too.
  const visible = { hero: true, work: true, marquee: true };
  const watch = (selector, onChange) => {
    const el = document.querySelector(selector);
    if (!el) return;
    new IntersectionObserver(
      (entries) => onChange(entries[0].isIntersecting),
      { rootMargin: '200px' }
    ).observe(el);
  };
  watch('#hero', (v) => (visible.hero = v));
  watch('#work', (v) => (visible.work = v));
  watch('.marquee', (v) => {
    visible.marquee = v;
    document.querySelector('.marquee__track')?.classList.toggle('is-paused', !v);
  });

  // ------ single shared render loop ------
  gsap.ticker.add((time) => {
    if (visible.hero) {
      // Nothing to draw behind the opaque preloader; shaders were
      // already compiled in initGL, so the first real frame is cheap.
      if (curtainUp) hero?.update(time);
      heroParallax?.();
    }
    if (visible.marquee) marqueeVelocity?.();
    if (visible.work) distortion?.update(time);
    cursor?.update();
  });

  window.addEventListener('resize', () => {
    hero?.resize();
    distortion?.resize();
    ScrollTrigger.refresh();
  });

  await preloaderDone;

  // Reduced motion: make sure nothing is left hidden by animation plumbing
  if (reducedMotion) {
    gsap.set('[data-reveal], [data-split], [data-split-lines], .project', {
      clearProps: 'all'
    });
  }
}

/**
 * Lazily import and init the heavy WebGL pieces (kept out of the main
 * chunk and started after first paint — see boot()). Falls back to a
 * static gradient hero when GL is off.
 */
async function initGL() {
  const heroContainer = document.querySelector('[data-hero-gl]');
  const distortionCanvas = document.querySelector('[data-distortion-canvas]');

  if (!useHeroGL) {
    heroContainer.classList.add('is-fallback');
    installImageFallbacks();
    return { hero: null, distortion: null };
  }

  const [{ Hero }, distortionModule] = await Promise.all([
    import('./gl/Hero.js'),
    useDistortion ? import('./gl/ImageDistortion.js') : null
  ]);

  const hero = new Hero(heroContainer, isTouch ? 'low' : 'high');
  // Theme was applied before GL init — sync the blob's palette to it
  hero.setTheme(document.documentElement.dataset.theme || 'light');
  // Compile shaders now, behind the preloader, so the first visible
  // frame doesn't hitch
  await hero.compile();

  if (!useDistortion) {
    // Plain <img> thumbnails on touch — still need placeholder fallbacks.
    installImageFallbacks();
    return { hero, distortion: null };
  }

  // Thumbnails sit below the fold, so nothing waits on their textures.
  // Each <img> stays visible until its texture is ready (see ImageDistortion).
  const distortion = new distortionModule.ImageDistortion(
    distortionCanvas,
    document.querySelectorAll('.project__media')
  );

  return { hero, distortion };
}

boot();
