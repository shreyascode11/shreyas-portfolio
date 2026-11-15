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

// Paint first, then run. The entry module is fetched immediately
// (modulepreload) but only *executed* after the first frame has painted,
// and the web fonts are switched on at the same moment (until then the
// fallback stack is used — see the inline style in index.html). The
// preloader is pure HTML+CSS, so it shows on the very first frame and
// nothing on the network sits in front of it.
function paintFirst() {
  return {
    name: 'paint-first',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html) return;
      const entry = /<script type="module" crossorigin src="([^"]+)"><\/script>/;
      const match = html.source.match(entry);
      if (!match) return;
      const src = match[1];
      // Waits for the browser's own first-contentful-paint entry (its
      // timestamp is when the frame was actually presented), with a
      // short fallback for browsers without paint timing / hidden tabs.
      const loader =
        `<script>(function(){var done=false;function go(){if(done)return;done=true;` +
        `document.documentElement.classList.add('fonts-on');` +
        `var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src='${src}';` +
        `document.head.appendChild(s)}` +
        `try{new PerformanceObserver(function(l){if(l.getEntriesByName('first-contentful-paint').length)setTimeout(go,0)})` +
        `.observe({type:'paint',buffered:true})}catch(e){}` +
        `setTimeout(go,250)})()</script>`;
      html.source = html.source
        .replace(entry, `<link rel="modulepreload" crossorigin href="${src}">`)
        .replace('</body>', `${loader}\n</body>`)
        // Source comments are for humans; the shipped page is smaller
        // without them (keeps the whole document in the first round trip)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\n\s*\n+/g, '\n');
    }
  };
}

// Shaders live as JS template literals in /src/shaders, so no GLSL plugin
// is required. Add `base: '/repo-name/'` if deploying to GitHub Pages
// under a sub-path (and update the inline-css href match).
export default defineConfig({
  plugins: [inlineCss(), paintFirst()],
  build: {
    target: 'es2020',
    sourcemap: false,
    // three.module.js is one big lazy-loaded chunk by design — it loads
    // behind the preloader, not on first paint. Silence the size nag.
    chunkSizeWarningLimit: 900
  }
});
