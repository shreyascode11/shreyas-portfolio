<div align="center">

# Shreyas — Portfolio

**A cinematic, WebGL-driven personal portfolio.**
Custom GLSL shaders · buttery smooth scroll · day & night themes · zero frameworks, zero backend.

### [**View it live →**](https://shreyas-portfolio-virid.vercel.app/)

![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r170-000000?logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3-88CE02?logo=greensock&logoColor=black)
![Lenis](https://img.shields.io/badge/Lenis-smooth%20scroll-FF4B00)
![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)

</div>

---

## ✨ Features

- **Interactive 3D hero** — a noise-displaced sphere written in custom GLSL that reacts to cursor position and velocity, surrounded by a drifting particle field
- **Day / night themes** — one toggle re-colors the whole site *including* the WebGL scene and generated artwork; choice persists, applied before first paint (no flash)
- **WebGL hover distortion** — project thumbnails ripple with an RGB-split shader on hover; supports both images and looping videos (`VideoTexture`)
- **Generated cover art** — projects without real screenshots get procedurally drawn poster-style covers (canvas), themed and cached
- **Cinematic motion** — preloader with progress counter, per-character text reveals, accent wipe transitions, Lenis smooth scrolling, scrollspy navigation
- **Fully data-driven content** — projects, experience, education, certifications and languages live in two plain JS files

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Build | [Vite](https://vitejs.dev) |
| 3D / Shaders | [Three.js](https://threejs.org) + hand-written GLSL (no plugins) |
| Animation | [GSAP](https://gsap.com) + ScrollTrigger |
| Scrolling | [Lenis](https://lenis.darkroom.engineering) |
| Styling | Plain CSS with design tokens (custom properties) |
| Hosting | Any static host — no backend required |

## 🚀 Getting Started

```bash
git clone https://github.com/shreyascode11/shreyas-portfolio.git
cd shreyas-portfolio
npm install
npm run dev        # → http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with live reload — use this while editing |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` at `localhost:4173` |

## 📁 Project Structure

```
src/
├── main.js                 Boot, capability detection, data rendering,
│                           single render loop (IntersectionObserver-gated)
├── gl/
│   ├── Renderer.js         WebGLRenderer wrapper — DPR cap, disposal
│   ├── Hero.js             Displaced sphere + particles (theme-aware)
│   ├── ImageDistortion.js  Hover ripple over thumbnails (image & video)
│   └── placeholder.js      Procedural cover cards, cached per theme
├── shaders/                GLSL as template literals (noise, hero, distortion)
├── modules/                Preloader · SmoothScroll · Cursor · Theme ·
│                           Menu · Nav (scrollspy) · PageTransition · Reveal
├── data/
│   ├── projects.js         ← add a project here, everything updates
│   └── profile.js          ← experience, education, certs, languages
└── styles/
    ├── tokens.css          ← every color, size and easing (both themes)
    └── main.css            Component styles

public/
├── assets/projects/        Project thumbnails (.jpg / .mp4)
├── assets/certs/           Certificate files (cards link to them)
├── og.png                  Social share card (1200×630)
└── 404.html                Custom not-found page
```

## ✏️ Customization

Content and design decisions are centralized — nothing requires digging through markup or animation code.

| Concern | Location | Scope |
|---|---|---|
| Project entries | `src/data/projects.js` | Title, description, role, tech stack, external links, media paths. New entries propagate to layout, reveals and WebGL automatically. |
| Professional profile | `src/data/profile.js` | Experience, education, certifications (with linked credential files), languages. |
| Design system | `src/styles/tokens.css` | Both theme palettes, type scale, spacing, radii, motion curves — every visual constant is a custom property here. |
| Hero shader | `src/shaders/hero.js` · `src/gl/Hero.js` | Displacement amplitude, noise frequency and speed (documented constants at the top of the shader); per-theme color palettes. |
| Hover distortion | `src/shaders/distortion.js` | Ripple density, displacement strength, chromatic-split intensity. |
| Page copy | `index.html` | Hero statement, biography, freelance offerings, contact CTA. |

### Project media

Each project accepts an `image` and/or a `video` path served from `public/assets/projects/`:

```js
image: "/assets/projects/ecoscan.jpg",   // static thumbnail — 4:3, ≥1200×900 recommended
video: "/assets/projects/ecoscan.mp4",   // looping muted preview — takes priority over image
```

Recommended video specs: 5–10 s screen capture, H.264 MP4, 720p, under ~3 MB. Until real media exists at these paths, the site renders procedurally generated, theme-aware cover art — the layout never shows a broken image.

## ⚡ Performance & Accessibility

- Three.js is **lazy-loaded behind the preloader** — the initial bundle is ~55 KB gzipped
- GL scenes **only render while on screen**; marquee pauses offscreen; `devicePixelRatio` capped at 1.75
- **`prefers-reduced-motion`** gets native scroll, no split-text animation, and a static hero
- Real heading hierarchy, skip link, keyboard-visible focus, and split-text animations keep a **screen-reader-readable copy** of every heading
- Graceful degradation: no WebGL / lost GPU context / blocked localStorage all fall back cleanly

## 📦 Deploying

`npm run build`, then host `dist/` on any static platform (Vercel · Netlify · GitHub Pages · S3+CloudFront). With Vercel, just import the repo — zero config. After deploying, point the `og:image` meta in `index.html` at your live domain.

---

<div align="center">

**Shreyas** — Full-Stack & AI Developer

[GitHub](https://github.com/shreyascode11/) · [LinkedIn](https://www.linkedin.com/in/shreyas1102/) · [Email](mailto:shreoriginal@gmail.com)

</div>
