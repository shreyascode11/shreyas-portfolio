// =====================================================================
// MAIN — orchestrates the whole experience.
//
// Boot order:
//   1. Detect capabilities (touch / reduced motion / WebGL)
//   2. Render project rows from /src/data/projects.js
//   3. Start the preloader; init WebGL behind it (hero + distortion)
//   4. On preloader exit: reveals, smooth scroll, cursor, transitions
//   5. Single gsap.ticker loop drives Lenis + both GL scenes + cursor
// =====================================================================
// NOTE: three is never imported at the top level — it's lazy-loaded in
// initGL() so the initial chunk (preloader, styles, UI) stays tiny.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { projects } from './data/projects.js';
import { experience, education, certifications, languages } from './data/profile.js';
import { Preloader } from './modules/Preloader.js';
import { Theme } from './modules/Theme.js';
import { Menu } from './modules/Menu.js';
import { SmoothScroll } from './modules/SmoothScroll.js';
import { Cursor } from './modules/Cursor.js';
import { PageTransition } from './modules/PageTransition.js';
import { Reveal } from './modules/Reveal.js';
import { Nav } from './modules/Nav.js';

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

// Full GL (hero shader + image distortion) only on non-touch, motion-OK,
// WebGL-capable devices. Touch devices get the static hero gradient and
// plain <img> thumbnails.
const useHeroGL = !reducedMotion && !isTouch && supportsWebGL();
const useDistortion = useHeroGL; // same bar for now

// ---------------------------------------------------------------------
// Render the Work section from data.
// ---------------------------------------------------------------------
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

      return `
        <li class="project">
          <div class="project__link">
            <span class="project__index mono">${index}</span>
            <div class="project__body">
              <h3 class="project__title">${p.name}</h3>
              <p class="project__blurb">${p.blurb}</p>
              <p class="project__meta mono">
                <span class="project__year">${p.year}</span>
                <span>${p.role}</span>
              </p>
              <div class="project__tags">${tags}</div>
              <div class="project__links">${links}</div>
            </div>
            ${(() => {
              // Thumbnails link out (they read as clickable), lazy-load
              // since the Work section sits below the fold
              const media = p.video
                ? `<video src="${p.video}" muted loop playsinline preload="auto"
                     ${reducedMotion ? '' : 'autoplay'}
                     aria-label="${p.name} — project preview"></video>`
                : `<img src="${p.image}" alt="${p.name} — project preview" loading="lazy" decoding="async" width="1024" height="768" />`;
              const href = p.links.live || p.links.github;
              return href
                ? `<a class="project__media" href="${href}" target="_blank" rel="noopener noreferrer" data-hover data-name="${p.name}" aria-label="Open ${p.name}">${media}</a>`
                : `<div class="project__media" data-name="${p.name}">${media}</div>`;
            })()}
          </div>
        </li>`;
    })
    .join('');
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

  document.querySelector('[data-experience-list]').innerHTML =
    experience.map(timelineItem).join('');
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
        <h4 class="cert__name">${c.name}</h4>
        <span class="cert__period mono">${c.period}</span>
        <p class="cert__desc">${c.desc}</p>
        ${c.url ? '<span class="cert__view mono">View certificate ↗</span>' : ''}`;
      return c.url
        ? `<li data-reveal><a class="cert" href="${c.url}" target="_blank" rel="noopener noreferrer" aria-label="View certificate: ${c.name}">${inner}</a></li>`
        : `<li class="cert" data-reveal>${inner}</li>`;
    })
    .join('');
}

// If a placeholder image 404s and WebGL isn't handling thumbnails,
// swap the broken <img> for a generated gradient so nothing looks broken.
async function installImageFallbacks() {
  const { makePlaceholder } = await import('./gl/placeholder.js');
  const failed = new Set();
  const nameOf = (img) => img.closest('.project__media')?.dataset.name || '';
  const swap = (img, i) => {
    failed.add(i);
    const theme = document.documentElement.dataset.theme || 'light';
    img.src = makePlaceholder(i, theme, nameOf(img)).toDataURL('image/jpeg', 0.85);
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
  renderProfile();
  startLocalClock();

  let hero = null;
  let distortion = null;

  // Day/night toggle — applied before GL init so textures pick the
  // right palette; later switches propagate via the themechange event.
  new Theme();
  window.addEventListener('themechange', (e) => {
    hero?.setTheme(e.detail.theme);
    distortion?.setTheme(e.detail.theme);
  });

  // Everything the preloader should wait for goes into this promise.
  // A GL failure must never strand the preloader — fall back gracefully.
  const glReady = initGL().then(
    (gl) => {
      hero = gl.hero;
      distortion = gl.distortion;
    },
    (err) => {
      console.error('WebGL init failed, using fallbacks:', err);
      document.querySelector('[data-hero-gl]').classList.add('is-fallback');
      installImageFallbacks();
    }
  );
  const readyPromise = Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    glReady
  ]);

  // Reveals are constructed on preloader exit so hero elements animate
  // in as the curtain lifts (their triggers are already in view).
  const preloader = new Preloader({
    readyPromise,
    reducedMotion,
    onExit: () => {
      hero?.intro();
      if (!reducedMotion) new Reveal();
    }
  });

  const preloaderDone = preloader.start();

  // Smooth scroll everywhere except reduced motion (native scroll there)
  const smoothScroll = reducedMotion ? null : new SmoothScroll();
  const transition = new PageTransition(smoothScroll);
  new Nav(transition, smoothScroll, reducedMotion);
  new Menu(smoothScroll);

  const cursor = !isTouch && !reducedMotion ? new Cursor() : null;

  // Only render GL scenes while their sections are (nearly) on screen —
  // no reason to burn GPU at the footer. Marquee pauses offscreen too.
  const visible = { hero: true, work: true };
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
  watch('.marquee', (v) =>
    document.querySelector('.marquee__track')?.classList.toggle('is-paused', !v)
  );

  // ------ single shared render loop ------
  gsap.ticker.add((time) => {
    if (visible.hero) hero?.update(time);
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
 * chunk so first paint — the preloader — is instant). Falls back to a
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

  const [{ Hero }, { ImageDistortion }, { LoadingManager }] = await Promise.all([
    import('./gl/Hero.js'),
    import('./gl/ImageDistortion.js'),
    import('three')
  ]);
  const loadingManager = new LoadingManager();

  const hero = new Hero(heroContainer, 'high');
  // Theme was applied before GL init — sync the blob's palette to it
  hero.setTheme(document.documentElement.dataset.theme || 'light');
  const distortion = useDistortion
    ? new ImageDistortion(
        distortionCanvas,
        document.querySelectorAll('.project__media'),
        loadingManager
      )
    : null;

  // Resolve when every texture registered with the manager settles
  // (missing placeholder images resolve via onError → generated gradient).
  await new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    loadingManager.onLoad = done;
    // Safety net: never block the preloader more than 4s on textures
    setTimeout(done, 4000);
  });

  return { hero, distortion };
}

boot();
