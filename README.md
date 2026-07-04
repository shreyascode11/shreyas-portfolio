# Shreyas — Portfolio

Dark, cinematic, WebGL-driven personal portfolio (with a light "day view" toggle). Vanilla JS (ES modules) + Three.js + custom GLSL, GSAP/ScrollTrigger, Lenis smooth scroll, built with Vite. No backend — fully static.

## Run it

```bash
npm install
npm run dev      # dev server at http://localhost:5173 (live reload)
npm run build    # production build → /dist
npm run preview  # serve the built /dist at http://localhost:4173
```

> Editing content? Use `npm run dev`. The preview server only shows the last build.

## Where to edit things

| What | Where |
|---|---|
| **Projects** (names, blurbs, tech, links, media) | [`src/data/projects.js`](src/data/projects.js) — supports `image` and/or `video` (looping muted thumbnail). Add an object, everything updates |
| **Experience / education / certifications / languages** | [`src/data/profile.js`](src/data/profile.js) — certs with a `url` open the file on click |
| **Project media** | drop JPGs/MP4s into `public/assets/projects/`; until they exist, designed cover cards are generated automatically |
| **Certificates** | files live in `public/assets/certs/` |
| **Colors, type, spacing, radii, motion + night/day palettes** | [`src/styles/tokens.css`](src/styles/tokens.css) |
| **Layout / component styles** | [`src/styles/main.css`](src/styles/main.css) |
| **Hero blob & particles** | [`src/gl/Hero.js`](src/gl/Hero.js) + shader in [`src/shaders/hero.js`](src/shaders/hero.js) (tweakables at the top of `main()`) |
| **Thumbnail hover distortion** | [`src/gl/ImageDistortion.js`](src/gl/ImageDistortion.js) + [`src/shaders/distortion.js`](src/shaders/distortion.js) |
| **Static copy** (hero statement, bio, freelance offers, contact) | [`index.html`](index.html) |
| **Social share card** | `public/og.png` (1200×630). After deploying, change the `og:image` meta in `index.html` to the absolute URL |

## Architecture

```
src/
  main.js            boot, capability detection, data rendering,
                     the single gsap.ticker render loop (IO-gated)
  gl/
    Renderer.js      WebGLRenderer wrapper (DPR cap, disposal)
    Hero.js          noise-displaced sphere + particle field (theme-aware)
    ImageDistortion.js  hover ripple on thumbnails (images & videos)
    placeholder.js   generated cover cards (cached per theme)
  shaders/           GLSL as template literals (noise, hero, distortion)
  modules/           Preloader, SmoothScroll (Lenis), Cursor, Theme
                     (day/night), Menu (mobile overlay), Nav (scrollspy
                     + wipe transitions), PageTransition, Reveal
  data/              projects.js, profile.js
public/
  assets/projects/   project thumbnails (jpg/mp4)
  assets/certs/      certificate files
  og.png, 404.html
```

## Quality notes

- **Themes**: night-first; toggle persists (pre-paint inline script prevents theme flash); WebGL palettes and generated covers follow the theme.
- **Performance**: Three.js lazy-loads behind the preloader; hero/distortion only render while on screen; DPR capped at 1.75; covers cached per theme; marquee pauses offscreen.
- **Accessibility**: real heading hierarchy, split-text animations keep screen-reader text via `.sr-only`, keyboard-focus styles, skip link, `prefers-reduced-motion` gets native scroll and no animation.
- **Mobile**: hamburger → fullscreen menu; static gradient hero; no custom cursor/distortion.
- **Robustness**: WebGL init failure or context loss falls back to a static gradient; localStorage failures are ignored.

## Deploy

`npm run build`, then host `dist/` anywhere static (Vercel/Netlify/GitHub Pages). `404.html` is picked up by Vercel/Netlify automatically. Remember to point `og:image` at your live domain.
