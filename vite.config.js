import { defineConfig } from 'vite';

// Inline the stylesheet (one file, ~8 KB gz) into index.html at build
// time. A <link> is render-blocking: first paint would wait an extra
// round trip for it. Inlined, the preloader paints with the HTML itself.
function inlineCss() {
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html) return;
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type !== 'asset' || !name.endsWith('.css')) continue;
        const link = new RegExp(`<link rel="stylesheet"[^>]*href="/${escape(name)}"[^>]*>`);
        if (!link.test(html.source)) continue;
        html.source = html.source.replace(link, () => `<style>${file.source}</style>`);
        delete bundle[name];
      }
    }
  };
}

// Shaders live as JS template literals in /src/shaders, so no GLSL plugin
// is required. Add `base: '/repo-name/'` if deploying to GitHub Pages
// under a sub-path (and update the inline-css href match).
export default defineConfig({
  plugins: [inlineCss()],
  build: {
    target: 'es2020',
    sourcemap: false,
    // three.module.js is one big lazy-loaded chunk by design — it loads
    // behind the preloader, not on first paint. Silence the size nag.
    chunkSizeWarningLimit: 900
  }
});
