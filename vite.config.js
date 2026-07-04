import { defineConfig } from 'vite';

// Minimal config — shaders live as JS template literals in /src/shaders,
// so no GLSL plugin is required. Add `base: '/repo-name/'` if deploying
// to GitHub Pages under a sub-path.
export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: false,
    // three.module.js is one big lazy-loaded chunk by design — it loads
    // behind the preloader, not on first paint. Silence the size nag.
    chunkSizeWarningLimit: 900
  }
});
