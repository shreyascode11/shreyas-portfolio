// =====================================================================
// Companion — "Pip", a little ink doodle that tags along.
//
// A hand-drawn SVG creature (round body, antenna with an accent bulb,
// stubby arms and legs) whose lines "boil" like frame-by-frame
// animation: an feTurbulence displacement whose seed changes a few
// times a second (only while Pip is doing something).
//
// Behaviour:
//   desktop  trails the pointer (a step behind, never under it), hops
//            as it travels, looks where you look; wanders off to explore
//            when you stop, and dozes after a while
//   touch    patrols the bottom edge, hops when you scroll fast
//   both     click / tap it for a line (and a "hide me" option)
//
// Manners — company, not a nuisance:
//   • says hello on the first visit only, and makes at most a few
//     comments per visit, well spaced, never while someone is typing
//   • fades out of the way while a form field has focus, while the
//     menu / ⌘K palette is open, and when the pointer is going for a
//     link or button that Pip happens to be standing on
//   • only its body is clickable, so it can't swallow clicks
//   • hidable from its bubble, ⌘K or the mobile menu (remembered)
//   reduced motion: sits still bottom-left, no boil; still talks
//
// Purely decorative (aria-hidden). `update(time)` runs on the shared
// gsap.ticker.
// =====================================================================
const SIZE = 72;
const KEY_ENABLED = 'companion';
const KEY_MET = 'companion-met';
const AUTO_LINES_PER_VISIT = 3;
const AUTO_LINE_GAP_MS = 25000;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
};

const SVG = `
<svg class="pip__svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <defs>
    <filter id="pip-boil" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="1" data-boil />
      <feDisplacementMap in="SourceGraphic" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <ellipse class="pip__shadow" cx="60" cy="113" rx="21" ry="3.6" />
  <g class="pip__rig" filter="url(#pip-boil)">
    <g class="pip__leg pip__leg--l"><path d="M50 88 q-1 8 -5 14 l-6 1" /></g>
    <g class="pip__leg pip__leg--r"><path d="M70 88 q1 8 5 14 l6 1" /></g>
    <g class="pip__body">
      <g class="pip__antenna"><path d="M61 34 q-4 -11 3 -20" /><circle class="pip__bulb" cx="65" cy="12" r="5.2" /></g>
      <g class="pip__arm pip__arm--l"><path d="M32 64 q-9 3 -14 -4" /></g>
      <g class="pip__arm pip__arm--r"><path d="M88 64 q9 3 14 -4" /></g>
      <path class="pip__blob" d="M60 33 C79 32 90 45 90 62 C91 80 77 92 60 91 C42 92 29 80 30 62 C30 45 41 33.5 60 33 Z" />
      <path class="pip__hatch" d="M38 72 l5 -4 M41 78 l7 -5 M46 83 l6 -4" />
      <g class="pip__eyes">
        <ellipse class="pip__eye" cx="51" cy="57" rx="3.6" ry="5" />
        <ellipse class="pip__eye" cx="69" cy="57" rx="3.6" ry="5" />
      </g>
      <path class="pip__cheek" d="M41 66 h5 M74 66 h5" />
      <path class="pip__mouth pip__mouth--smile" d="M55 68 q5 5 10 0" />
      <ellipse class="pip__mouth pip__mouth--o" cx="60" cy="70" rx="3" ry="3.8" />
    </g>
  </g>
</svg>`;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CLICKABLE = 'a, button, input, textarea, select, label, [data-hover], [data-orbit-stage]';
const isTypingTarget = (el) => !!el?.matches?.('input, textarea, select, [contenteditable="true"]');

export class Companion {
  /**
   * @param {Object} o
   * @param {boolean} o.isTouch
   * @param {boolean} o.reducedMotion
   * @param {Array<{el: Element, text: string}>} o.spots  may say once in view
   * @param {string[]} o.pokeLines  random lines when clicked
   * @param {string} [o.greeting]   first visit only
   * @param {(on:boolean)=>void} [o.onToggle]
   */
  constructor({ isTouch, reducedMotion, spots = [], pokeLines = [], greeting, onToggle }) {
    this.isTouch = isTouch;
    this.still = reducedMotion;
    this.pokeLines = pokeLines;
    this.onToggle = onToggle;
    this.enabled = store.get(KEY_ENABLED) !== 'off';

    this.el = document.createElement('div');
    this.el.className = 'pip';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = `${SVG}<div class="pip__bubble"><span class="pip__text"></span><button class="pip__hide mono" type="button" tabindex="-1">hide me</button></div>`;
    document.body.appendChild(this.el);

    const $ = (s) => this.el.querySelector(s);
    this.svg = $('.pip__svg');
    this.boil = $('[data-boil]');
    this.body = $('.pip__body');
    this.legs = [$('.pip__leg--l'), $('.pip__leg--r')];
    this.arms = [$('.pip__arm--l'), $('.pip__arm--r')];
    this.antenna = $('.pip__antenna');
    this.eyes = $('.pip__eyes');
    this.shadow = $('.pip__shadow');
    this.bubble = $('.pip__bubble');
    this.text = $('.pip__text');

    // ---- state -------------------------------------------------------
    this.pos = { x: 64, y: this.isTouch || this.still ? this.ground() : window.innerHeight * 0.7 };
    this.vel = { x: 0, y: 0 };
    this.target = { ...this.pos };
    this.hop = 0;          // height above the travel line
    this.hopV = 0;
    this.squash = 0;
    this.facing = 1;
    this.walk = 0;
    this.lean = 0;
    this.antennaSwing = 0;
    this.look = { x: 0, y: 0 };
    this.pointer = null;
    this.pointerSide = 1;  // which side of the pointer to trail on
    this.overClickable = false;
    this.lastPointerMove = performance.now();
    this.nextWander = 0;
    this.mode = 'follow';  // follow | wander | sleep
    this.shy = false;      // a form field has focus
    this.talkUntil = 0;
    this.waveUntil = 0;
    this.nextBlink = performance.now() + rand(2000, 5000);
    this.blinkUntil = 0;
    this.lastScrollY = window.scrollY;
    this.lastScrollHop = 0;
    this.lastBoil = 0;
    this.seed = 1;
    this.autoLines = 0;
    this.lastAutoLine = -Infinity;

    this.bindEvents();
    this.watchSpots(spots);
    this.applyEnabled({ silent: true });

    // Hello once, ever — not on every visit
    if (this.enabled && greeting && !store.get(KEY_MET)) {
      store.set(KEY_MET, '1');
      setTimeout(() => this.say(greeting, 3400), 900);
    }
  }

  ground() {
    return window.innerHeight - SIZE * 0.62;
  }

  // ------------------------------------------------------------------
  bindEvents() {
    if (!this.isTouch) {
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const dx = e.clientX - (this.pointer?.x ?? e.clientX);
        if (Math.abs(dx) > 2) this.pointerSide = dx > 0 ? -1 : 1; // trail behind the motion
        this.pointer = { x: e.clientX, y: e.clientY };
        const t = e.target instanceof Element ? e.target : null;
        this.overClickable = !!t && !this.el.contains(t) && !!t.closest(CLICKABLE);
        if (this.mode === 'sleep') this.hopV = 3; // a little start on waking
        this.mode = 'follow';
        this.lastPointerMove = performance.now();
      }, { passive: true });
    }

    // Typing? Step out of the way until the field loses focus.
    document.addEventListener('focusin', (e) => (this.shy = isTypingTarget(e.target)));
    document.addEventListener('focusout', () => (this.shy = false));

    // Poke: hop, wave, say something (with a way to dismiss)
    this.svg.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hopV = 5;
      this.waveUntil = performance.now() + 1400;
      const line = this.pokeLines[Math.floor(Math.random() * this.pokeLines.length)] ?? 'Hi!';
      this.say(line, 4000, { hideOption: true });
    });
    this.el.querySelector('.pip__hide').addEventListener('click', () => this.setEnabled(false));
  }

  /** May say a line when a spot reaches mid-screen — rationed, never chatty. */
  watchSpots(spots) {
    if (!spots.length) return;
    const lines = new Map(spots.map((s) => [s.el, s.text]));
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.target.hidden) continue;
        if (this.autoLines >= AUTO_LINES_PER_VISIT) { io.disconnect(); return; }
        const now = performance.now();
        if (now - this.lastAutoLine < AUTO_LINE_GAP_MS || this.shy || this.isBusy()) continue;
        io.unobserve(entry.target);
        this.autoLines++;
        this.lastAutoLine = now;
        this.say(lines.get(entry.target), 3200);
        this.waveUntil = now + 900;
      }
    }, { rootMargin: '-38% 0px -38% 0px' });
    spots.forEach((s) => s.el && io.observe(s.el));
  }

  /** Something else has the visitor's attention (menu, palette). */
  isBusy() {
    return document.documentElement.classList.contains('menu-open') || !!document.querySelector('.cmdk:not([hidden])');
  }

  say(text, ms = 3200, { hideOption = false } = {}) {
    if (!this.enabled || !text) return;
    this.text.textContent = text;
    this.bubble.classList.toggle('has-hide', hideOption);
    this.bubble.classList.add('is-on');
    this.talkUntil = performance.now() + Math.min(ms, 1500);
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('is-on'), ms);
  }

  applyEnabled({ silent }) {
    store.set(KEY_ENABLED, this.enabled ? 'on' : 'off');
    this.el.classList.toggle('is-off', !this.enabled);
    if (!this.enabled) this.bubble.classList.remove('is-on');
    if (!silent) this.onToggle?.(this.enabled);
  }

  setEnabled(on) {
    this.enabled = on;
    this.applyEnabled({ silent: false });
    if (on) {
      this.hopV = 5;
      setTimeout(() => this.say('I’m back!', 2000), 200);
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  // ------------------------------------------------------------------
  // Where to go this frame
  // ------------------------------------------------------------------
  chooseTarget(now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const minX = SIZE * 0.6;
    const maxX = this.isTouch ? w - 120 : w - SIZE * 0.6; // keep clear of back-to-top on phones

    if (this.still) {
      this.target = { x: 64, y: this.ground() };
      return;
    }

    if (this.isTouch || !this.pointer) {
      // Patrol the bottom edge, pausing between strolls
      if (now > this.nextWander) {
        this.target = { x: rand(minX, maxX), y: this.ground() };
        this.nextWander = now + rand(5000, 10000);
      }
      this.target.y = this.ground();
      return;
    }

    const idle = now - this.lastPointerMove;
    if (idle > 30000 && this.mode !== 'sleep') {
      this.mode = 'sleep';
    } else if (idle > 5000 && this.mode === 'follow') {
      this.mode = 'wander';
      this.nextWander = 0;
    }

    if (this.mode === 'sleep') return; // stay put
    if (this.mode === 'wander') {
      if (now > this.nextWander) {
        // Explore somewhere near the pointer, like it's looking around
        this.target = {
          x: clamp(this.pointer.x + rand(-240, 240), minX, maxX),
          y: clamp(this.pointer.y + rand(-150, 150), 110, h - SIZE * 0.6)
        };
        this.nextWander = now + rand(3200, 5600);
      }
      return;
    }

    // Follow: a step behind and a little below the pointer — far enough
    // that it never sits on what you're pointing at
    this.target = {
      x: clamp(this.pointer.x + this.pointerSide * 78, minX, maxX),
      y: clamp(this.pointer.y + 58, 110, h - SIZE * 0.6)
    };
  }

  // ------------------------------------------------------------------
  update(time) {
    if (!this.enabled) return;
    const now = performance.now();
    this.chooseTarget(now);

    // Out of the way: typing, menu / palette open, or the pointer is
    // going for a link or button Pip is standing on
    const p = this.pointer;
    const onTopOfTarget = !!p && !this.isTouch && this.overClickable &&
      Math.abs(p.x - this.pos.x) < SIZE * 0.7 && Math.abs(p.y - (this.pos.y - this.hop)) < SIZE * 0.7;
    this.el.classList.toggle('is-away', this.shy || this.isBusy() || onTopOfTarget);

    // ---- travel (damped spring with a speed cap) ---------------------
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const stiffness = this.isTouch ? 0.006 : this.mode === 'wander' ? 0.009 : 0.014;
    this.vel.x = (this.vel.x + dx * stiffness) * 0.84;
    this.vel.y = (this.vel.y + dy * stiffness) * 0.84;
    const maxSpeed = this.isTouch ? 2.2 : 9;
    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (speed > maxSpeed) {
      this.vel.x *= maxSpeed / speed;
      this.vel.y *= maxSpeed / speed;
    }
    if (this.still) this.vel.x = this.vel.y = 0;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    if (this.isTouch || this.still) this.pos.y = this.target.y;
    const moving = Math.hypot(this.vel.x, this.vel.y) > 0.35;

    // ---- scroll: a fast scroll gets a (rate-limited) hop -------------
    const scrollV = window.scrollY - this.lastScrollY;
    this.lastScrollY = window.scrollY;
    if (!this.still && this.hop === 0 && Math.abs(scrollV) > 40 && now - this.lastScrollHop > 1500) {
      this.hopV = 2.6 + Math.min(Math.abs(scrollV) / 40, 2);
      this.lastScrollHop = now;
    }

    // ---- hopping gait (small, springy hops while travelling) ---------
    if (!this.still && moving && this.hop === 0 && this.hopV === 0 && this.mode !== 'sleep') {
      this.hopV = 1.2 + Math.min(Math.hypot(this.vel.x, this.vel.y) * 0.22, 2.2);
    }
    if (this.hopV !== 0 || this.hop > 0) {
      this.hop += this.hopV;
      this.hopV -= 0.42;
      if (this.hop <= 0) {
        this.hop = 0;
        this.hopV = 0;
        this.squash = 1; // landing squish
      }
    }
    this.squash *= 0.82;

    if (Math.abs(this.vel.x) > 0.6) this.facing = this.vel.x > 0 ? 1 : -1;
    this.walk += Math.hypot(this.vel.x, this.vel.y) * 0.16;
    this.lean += (clamp(this.vel.x * 1.2, -10, 10) - this.lean) * 0.15;
    this.antennaSwing += (clamp(-this.vel.x * 3 - this.hopV * 2, -30, 30) - this.antennaSwing) * 0.12;

    // ---- look: at the pointer, else where it's going -----------------
    let lx = this.vel.x * 0.4;
    let ly = this.vel.y * 0.4;
    if (p && !this.isTouch) {
      const ax = p.x - this.pos.x;
      const ay = p.y - this.pos.y;
      const d = Math.hypot(ax, ay) || 1;
      lx = (ax / d) * 3.2;
      ly = (ay / d) * 2.4;
    }
    this.look.x += (clamp(lx, -3.5, 3.5) * this.facing - this.look.x) * 0.2;
    this.look.y += (clamp(ly, -3, 3) - this.look.y) * 0.2;

    // ---- blink / sleep / talk -----------------------------------------
    if (now > this.nextBlink) {
      this.blinkUntil = now + 130;
      this.nextBlink = now + rand(2200, 5600);
    }
    const asleep = this.mode === 'sleep';
    const eyesClosed = asleep || now < this.blinkUntil;
    const talking = now < this.talkUntil;
    const waving = now < this.waveUntil;

    // ---- line boil (~8 fps), only while something's happening ---------
    const active = moving || talking || waving || this.hop > 0;
    if (!this.still && active && now - this.lastBoil > 125) {
      this.seed = (this.seed % 4) + 1;
      this.boil.setAttribute('seed', this.seed);
      this.lastBoil = now;
    }

    // ---- write transforms ---------------------------------------------
    const breathe = Math.sin(time * 2.2) * (asleep ? 0.04 : 0.018);
    const sq = this.squash;
    const stretch = this.hopV > 0 ? Math.min(this.hopV * 0.025, 0.08) : 0;
    const sx = 1 + sq * 0.12 - stretch * 0.6 - breathe * 0.5;
    const sy = 1 - sq * 0.14 + stretch + breathe;

    this.el.style.transform = `translate3d(${(this.pos.x - SIZE / 2).toFixed(1)}px, ${(this.pos.y - SIZE / 2).toFixed(1)}px, 0)`;
    this.svg.style.transform = `translateY(${(-this.hop).toFixed(1)}px) scaleX(${this.facing}) rotate(${(this.lean * this.facing).toFixed(1)}deg)`;
    this.body.style.transform = `scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    this.antenna.style.transform = `rotate(${(this.antennaSwing * this.facing).toFixed(1)}deg)`;
    this.eyes.style.transform = `translate(${this.look.x.toFixed(2)}px, ${this.look.y.toFixed(2)}px) scaleY(${eyesClosed ? 0.12 : 1})`;
    this.shadow.style.transform = `scale(${(1 - Math.min(this.hop / 50, 0.5)).toFixed(3)})`;

    const airborne = this.hop > 0;
    const swing = moving && !airborne ? Math.sin(this.walk) * 26 : 0;
    const tuck = airborne ? 20 : 0;
    this.legs[0].style.transform = `rotate(${(swing + tuck).toFixed(1)}deg)`;
    this.legs[1].style.transform = `rotate(${(-swing - tuck).toFixed(1)}deg)`;

    const wave = waving ? Math.sin(time * 16) * 32 - 45 : 0;
    const armsUp = airborne ? 22 : 0;
    this.arms[0].style.transform = `rotate(${(armsUp + (talking ? Math.sin(time * 9) * 8 : 0)).toFixed(1)}deg)`;
    this.arms[1].style.transform = `rotate(${(-armsUp + wave).toFixed(1)}deg)`;

    this.el.classList.toggle('is-talking', talking);
    this.el.classList.toggle('is-asleep', asleep);

    // Bubble flips to stay on-screen
    this.bubble.classList.toggle('is-left', this.pos.x > window.innerWidth - 260);
    this.bubble.classList.toggle('is-below', this.pos.y < 150);
  }
}
