<div align="center">

# Shreyas — Portfolio

**A cinematic, WebGL-driven personal portfolio, built from scratch.**
Custom GLSL shaders · smooth scroll · day & night themes · no framework, no server of its own.

### [**View it live →**](https://shreyas-portfolio-virid.vercel.app/)

![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r170-000000?logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3-88CE02?logo=greensock&logoColor=black)
![Lenis](https://img.shields.io/badge/Lenis-smooth%20scroll-FF4B00)
![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)
![Lighthouse](https://img.shields.io/badge/Lighthouse-100%20·%20100%20·%20100%20·%20100-0CCE6B?logo=lighthouse&logoColor=white)

</div>

---

## Overview

This is the personal portfolio of **Shreyas** — a full-stack AI developer. The site itself is part of the portfolio: every shader, animation and interaction is hand-written in vanilla JavaScript and GLSL, with no UI framework and no server code of its own. It ships as a fully static bundle, deployed on Vercel; the one dynamic feature — the contact form — posts to a free Google Apps Script web app ([`contact-backend/`](contact-backend/)) rather than a server this repo hosts.

## Highlights

- **Interactive 3D hero** — a noise-displaced sphere driven by a custom vertex/fragment shader pair. It reacts to cursor position and velocity, surrounded by a drifting particle field. Phones render the same scene on a reduced quality tier (lower geometry density, capped pixel ratio) to keep scrolling smooth.
- **Day / night themes** — a single toggle re-colors the entire experience, *including* the WebGL scene and generated artwork. The choice persists and is applied before first paint, so there is no theme flash.
- **WebGL hover distortion** — project thumbnails ripple with an RGB-split displacement shader on hover, supporting both static images and looping video textures.
- **Procedural cover art** — projects without final imagery receive canvas-generated, poster-style covers (index numeral, orbit rings, gradient field), themed to match the active palette and cached per theme.
- **Ink intro** — instead of a percentage counter, the name is sketched in boiling pencil lines (faint ghost lines on the very first frame), flooded with orange ink as the page actually loads (the ink level *is* the progress), signed with a hand-drawn underline, and the page peels away along a hand-inked wavy edge.
- **Cinematic motion** — per-character text reveals, accent wipe transitions between sections, Lenis-powered smooth scrolling, and scrollspy navigation.
- **A layered interaction system** — the hero parallaxes against the cursor and exits in depth-sorted layers on scroll, buttons pull magnetically toward the pointer, and the custom cursor morphs into contextual labels ("View", "Open") over clickable cards, all gated behind a shared `prefers-reduced-motion` / touch check.
- **Holographic AI** — beside the About text on wide screens, a teal particle head (a generic human head mesh sliced into evenly spaced contour rows of dots, interior surfaces stripped so only the outer skin shows) lit by a side key light. It turns to follow the cursor, steady with no flicker. Plain canvas 2D, rendered only while on screen.
- **Automated contact pipeline** — the contact form posts to a Google Apps Script web app (free, nothing to keep awake) that logs the message to a Google Sheet, emails it to me with reply-to set to the sender, and auto-replies with a thank-you; it has a honeypot, validation and rate limits. Setup: [`contact-backend/README.md`](contact-backend/README.md). If it's slow, down or not set up yet, the visitor gets one-click alternatives — open in Gmail, their email app, or copy the message — and their draft is kept until a message actually goes through.
- **Command palette** — press ⌘K / Ctrl+K (or `/`) to jump to any section, copy the email, download the CV, switch themes or jump to any project (or its live demo); a keyboard-first ARIA combobox.
- **3D work orbit** — the projects as a ring of curved screens (a cylinder-bend vertex shader) with a floor reflection. Drag or swipe to spin with inertia, click the front screen to open that project; it follows the Work filter and the day/night theme, and loads only as the section approaches.
- **Pip, a doodle companion** — a hand-drawn SVG creature whose lines "boil" (animated `feTurbulence` displacement) while it moves. It trails a step behind the cursor, hops as it travels, wanders and dozes when you stop, and patrols the bottom edge on phones. It's chatty: a hello (or "welcome back"), a remark on every section and project as you reach it, reactions to what you do (switching theme, filtering, spinning the orbit, copying a link, sending the form) and the odd idle thought while you read. It also has manners: lines are spaced out and never stack, it stays quiet and fades out of the way while you type or have the menu / ⌘K open, and it steps aside when you reach for a link it's standing on. Click it for a line; hide or restore it from its bubble, ⌘K or the mobile menu.
- **Filterable, linkable work** — filter projects by AI / Web / 3D (the choice is kept in the URL as `?work=ai`), and every project has its own shareable link (`/#project-srm-redesign`) that scrolls to it and opens its details. Projects can carry a before → after metrics strip.
- **Data-driven content** — projects, experience, education, certifications, languages and the tech stack are plain JavaScript modules; layout, reveal animations and WebGL all derive from them.

## Tech Stack

| Layer | Choice |
|---|---|
| Build | [Vite](https://vitejs.dev) |
| 3D / Shaders | [Three.js](https://threejs.org) with hand-written GLSL |
| Animation | [GSAP](https://gsap.com) + ScrollTrigger |
| Scrolling | [Lenis](https://lenis.darkroom.engineering) |
| Contact backend | [Google Apps Script](https://developers.google.com/apps-script) web app — Sheet log, email, auto-reply (free) |
| Styling | Plain CSS on a design-token system (custom properties) |
| Hosting | Vercel (fully static — works on any static host) |

## Architecture

```
src/
├── main.js                 Boot, capability detection, data rendering,
│                           and the single render loop (IntersectionObserver-gated)
├── gl/
│   ├── Renderer.js         WebGLRenderer wrapper — DPR caps, resource disposal
│   ├── Hero.js             Displaced sphere + particle field (theme-aware)
│   ├── ImageDistortion.js  Hover ripple over thumbnails (image & video textures)
│   ├── WorkOrbit.js        3D ring of curved project screens (drag, snap, reflect)
│   ├── Hologram.js         Particle head beside About (canvas 2D, follows cursor)
│   └── placeholder.js      Procedural cover generator, cached per theme
├── shaders/                GLSL as template literals — simplex noise,
│                           hero displacement, distortion + rounded-corner mask
├── modules/                Preloader · SmoothScroll · Cursor · Theme ·
│                           Menu · Nav (scrollspy) · PageTransition · Reveal ·
│                           CommandPalette (⌘K) · TextScramble · Toast ·
│                           Companion (Pip, the doodle)
├── data/                   projects.js · profile.js · stack.js (all site content)
│                           icons.js — Simple Icons paths, lazy-loaded
│                           headMesh.js — hologram head geometry, lazy-loaded
└── styles/                 tokens.css (design system) · main.css ·
                            companion.css · hologram.css (load with their modules)
contact-backend/            Code.gs — the contact form's Google Apps Script
                            (Sheet log, email, auto-reply) + setup guide
```

Notable engineering details:

- **Lighthouse 100 / 100 / 100 / 100 on mobile and desktop** (Lighthouse 12, simulated slow 4G for mobile): FCP 1.1 s, LCP 1.5 s, TBT ≈ 30 ms, CLS 0 on mobile; FCP 0.3 s, LCP 0.4 s on desktop.
- **Paint first, then run.** CSS is inlined at build time, and a small build plugin (`paintFirst` in `vite.config.js`) preloads the entry module but executes it only after the browser reports first contentful paint. The web fonts switch on at the same moment (the very first frame — just the preloader — uses the system stack), so nothing on the network sits in front of first paint. HTML comments and indentation are stripped from the shipped page, and Pip's styles load with Pip, so the whole document fits in the first round trip.
- **Three.js is lazy-loaded behind the preloader** — it starts only after first paint and its shaders compile while the counter runs; the preloader waits on it for at most ~0.7s. The 3D work orbit loads only when the visitor heads for the Work section, the hologram only on wide screens as About approaches, and Pip arrives once the browser is idle.
- **No long tasks at reveal time.** Split-text and scroll-reveal setup runs immediately only for what's on screen; everything below the fold is prepared in small idle-time batches, nearest first.
- **Responsive, modern images** — thumbnails ship as AVIF → WebP → JPEG at 480/800/1200w (≈10–40 KB instead of 120–200 KB); brand icons load only as the Stack section approaches.
- **GL scenes render only while visible.** IntersectionObservers gate the hero, thumbnail, work-orbit and hologram scenes; the marquee pauses offscreen.
- **Split-text animations are screen-reader safe** — the real text remains in the accessibility tree while the animated per-character copy is `aria-hidden`.
- **Graceful degradation at every layer**: no WebGL → static gradient; lost GPU context → fallback swap; blocked `localStorage` → ignored; `prefers-reduced-motion` → native scroll, no animation, static hero.

## Running Locally

```bash
git clone https://github.com/shreyascode11/shreyas-portfolio.git
cd shreyas-portfolio
npm install
npm run dev        # development server → http://localhost:5173
npm run build      # production build → dist/
```


## Credits

- Head geometry for the hologram: the base mesh of [MakeHuman](https://github.com/makehumancommunity/makehuman) (`makehuman/data/3dobjs/base.obj`, head and neck only). MakeHuman's assets are released under CC0 1.0 (public domain) — a generic human, not any real person.

---

<div align="center">

**Shreyas** — Full-Stack & AI Developer

[Portfolio](https://shreyas-portfolio-virid.vercel.app/) · [GitHub](https://github.com/shreyascode11/) · [LinkedIn](https://www.linkedin.com/in/shreyas1102/) · [Email](mailto:shreoriginal@gmail.com)

</div>
