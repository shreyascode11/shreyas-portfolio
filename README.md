<div align="center">

# Shreyas — Portfolio

**A cinematic, WebGL-driven personal portfolio, built from scratch.**
Custom GLSL shaders · smooth scroll · day & night themes · no frameworks, no backend.

### [**View it live →**](https://shreyas-portfolio-virid.vercel.app/)

![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r170-000000?logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3-88CE02?logo=greensock&logoColor=black)
![Lenis](https://img.shields.io/badge/Lenis-smooth%20scroll-FF4B00)
![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)

</div>

---

## Overview

This is the personal portfolio of **Shreyas** — a full-stack AI developer. The site itself is part of the portfolio: every shader, animation and interaction is hand-written in vanilla JavaScript and GLSL, with no UI framework and no server. It ships as a fully static bundle.

## Highlights

- **Interactive 3D hero** — a noise-displaced sphere driven by a custom vertex/fragment shader pair. It reacts to cursor position and velocity, surrounded by a drifting particle field. Phones render the same scene on a reduced quality tier (lower geometry density, capped pixel ratio) to keep scrolling smooth.
- **Day / night themes** — a single toggle re-colors the entire experience, *including* the WebGL scene and generated artwork. The choice persists and is applied before first paint, so there is no theme flash.
- **WebGL hover distortion** — project thumbnails ripple with an RGB-split displacement shader on hover, supporting both static images and looping video textures.
- **Procedural cover art** — projects without final imagery receive canvas-generated, poster-style covers (index numeral, orbit rings, gradient field), themed to match the active palette and cached per theme.
- **Cinematic motion** — preloader with a real progress counter, per-character text reveals, accent wipe transitions between sections, Lenis-powered smooth scrolling, and scrollspy navigation.
- **Data-driven content** — projects, experience, education, certifications and languages are plain JavaScript modules; layout, reveal animations and WebGL all derive from them.

## Tech Stack

| Layer | Choice |
|---|---|
| Build | [Vite](https://vitejs.dev) |
| 3D / Shaders | [Three.js](https://threejs.org) with hand-written GLSL |
| Animation | [GSAP](https://gsap.com) + ScrollTrigger |
| Scrolling | [Lenis](https://lenis.darkroom.engineering) |
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
│   └── placeholder.js      Procedural cover generator, cached per theme
├── shaders/                GLSL as template literals — simplex noise,
│                           hero displacement, distortion + rounded-corner mask
├── modules/                Preloader · SmoothScroll · Cursor · Theme ·
│                           Menu · Nav (scrollspy) · PageTransition · Reveal
├── data/                   projects.js · profile.js (all site content)
└── styles/                 tokens.css (design system) · main.css
```

Notable engineering details:

- **Three.js is lazy-loaded behind the preloader** — the initial bundle is ~55 KB gzipped; the 3D chunk streams in while the loading counter runs.
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
