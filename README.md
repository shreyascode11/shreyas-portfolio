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

This is the personal portfolio of **Shreyas** — a full-stack AI developer. The site itself is part of the portfolio: every shader, animation and interaction is hand-written in vanilla JavaScript and GLSL, with no UI framework and no server code of its own. It ships as a fully static bundle, deployed on Vercel; the one dynamic feature — the contact form — talks directly to an [n8n](https://n8n.io) webhook rather than a backend this repo hosts.

## Highlights

- **Interactive 3D hero** — a noise-displaced sphere driven by a custom vertex/fragment shader pair. It reacts to cursor position and velocity, surrounded by a drifting particle field. Phones render the same scene on a reduced quality tier (lower geometry density, capped pixel ratio) to keep scrolling smooth.
- **Day / night themes** — a single toggle re-colors the entire experience, *including* the WebGL scene and generated artwork. The choice persists and is applied before first paint, so there is no theme flash.
- **WebGL hover distortion** — project thumbnails ripple with an RGB-split displacement shader on hover, supporting both static images and looping video textures.
- **Procedural cover art** — projects without final imagery receive canvas-generated, poster-style covers (index numeral, orbit rings, gradient field), themed to match the active palette and cached per theme.
- **Cinematic motion** — preloader with a real progress counter, per-character text reveals, accent wipe transitions between sections, Lenis-powered smooth scrolling, and scrollspy navigation.
- **A layered interaction system** — the hero parallaxes against the cursor and exits in depth-sorted layers on scroll, buttons pull magnetically toward the pointer, and the custom cursor morphs into contextual labels ("View", "Open") over clickable cards, all gated behind a shared `prefers-reduced-motion` / touch check.
- **Automated contact pipeline** — the contact form posts to an n8n webhook that notifies by email, logs the lead to a spreadsheet, and auto-replies to the sender, with a honeypot field and a graceful `mailto:` fallback if the webhook is ever unreachable.
- **Command palette** — press ⌘K / Ctrl+K (or `/`) to jump to any section, copy the email, download the CV, switch themes or jump to any project (or its live demo); a keyboard-first ARIA combobox.
- **3D work orbit** — the projects as a ring of curved screens (a cylinder-bend vertex shader) with a floor reflection. Drag or swipe to spin with inertia, click the front screen to open that project; it follows the Work filter and the day/night theme, and loads only as the section approaches.
- **Pip, a doodle companion** — a hand-drawn SVG creature whose lines "boil" (animated `feTurbulence` displacement) while it moves. It trails a step behind the cursor, hops as it travels, wanders and dozes when you stop, and patrols the bottom edge on phones. It has manners: a hello on the first visit only, at most three short comments per visit, and it fades out of the way while you type, while the menu or ⌘K is open, or when you reach for a link it's standing on. Click it for a line; hide or restore it from its bubble, ⌘K or the mobile menu.
- **Filterable, linkable work** — filter projects by AI / Web / 3D (the choice is kept in the URL as `?work=ai`), and every project has its own shareable link (`/#project-srm-redesign`) that scrolls to it and opens its details. Projects can carry a before → after metrics strip.
- **Data-driven content** — projects, experience, education, certifications, languages and the tech stack are plain JavaScript modules; layout, reveal animations and WebGL all derive from them.

## Tech Stack

| Layer | Choice |
|---|---|
| Build | [Vite](https://vitejs.dev) |
| 3D / Shaders | [Three.js](https://threejs.org) with hand-written GLSL |
| Animation | [GSAP](https://gsap.com) + ScrollTrigger |
| Scrolling | [Lenis](https://lenis.darkroom.engineering) |
| Automation | [n8n](https://n8n.io) — webhook-driven contact pipeline (email, spreadsheet log, auto-reply) |
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
│   └── placeholder.js      Procedural cover generator, cached per theme
├── shaders/                GLSL as template literals — simplex noise,
│                           hero displacement, distortion + rounded-corner mask
├── modules/                Preloader · SmoothScroll · Cursor · Theme ·
│                           Menu · Nav (scrollspy) · PageTransition · Reveal ·
│                           CommandPalette (⌘K) · TextScramble · Toast ·
│                           Companion (Pip, the doodle)
├── data/                   projects.js · profile.js · stack.js (all site content)
│                           icons.js — Simple Icons paths, lazy-loaded
└── styles/                 tokens.css (design system) · main.css
```

Notable engineering details:

- **Lighthouse 100 / 100 / 100 / 100 on mobile and desktop** (Lighthouse 12, simulated slow 4G for mobile): FCP 1.1 s, LCP 1.5 s, TBT ≈ 30 ms, CLS 0 on mobile; FCP 0.3 s, LCP 0.4 s on desktop.
- **Paint first, then run.** CSS is inlined at build time, and a small build plugin (`paintFirst` in `vite.config.js`) preloads the entry module but executes it only after the browser reports first contentful paint. The web fonts switch on at the same moment (the very first frame — just the preloader — uses the system stack), so nothing on the network sits in front of first paint. HTML comments are stripped from the shipped page so the whole document fits in the first round trip.
- **Three.js is lazy-loaded behind the preloader** — it starts only after first paint and its shaders compile while the counter runs; the preloader waits on it for at most ~0.7s. The 3D work orbit loads only when the visitor heads for the Work section, and Pip arrives once the browser is idle.
- **No long tasks at reveal time.** Split-text and scroll-reveal setup runs immediately only for what's on screen; everything below the fold is prepared in small idle-time batches, nearest first.
- **Responsive, modern images** — thumbnails ship as AVIF → WebP → JPEG at 480/800/1200w (≈10–40 KB instead of 120–200 KB); brand icons load only as the Stack section approaches.
- **GL scenes render only while visible.** IntersectionObservers gate the hero and thumbnail scenes; the marquee pauses offscreen.
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

---

<div align="center">

**Shreyas** — Full-Stack & AI Developer

[Portfolio](https://shreyas-portfolio-virid.vercel.app/) · [GitHub](https://github.com/shreyascode11/) · [LinkedIn](https://www.linkedin.com/in/shreyas1102/) · [Email](mailto:shreoriginal@gmail.com)

</div>
