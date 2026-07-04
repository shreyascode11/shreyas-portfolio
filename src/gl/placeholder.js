// =====================================================================
// makePlaceholder — procedural project cover, used while a real
// thumbnail doesn't exist yet. Designed like a poster, not a missing
// image: gradient beams + glows, a fine layout grid, orbit rings, a
// huge translucent index numeral, and the project name as the lockup.
// Theme-aware (day/night), seeded per project index so covers differ.
// Pure canvas, no Three.js — safe on the lightweight non-WebGL path.
// =====================================================================
// Covers are deterministic per (index, theme, label) — cache them so
// the day/night toggle doesn't redo the pixel work (grain loop is the
// expensive part) on the main thread every switch.
const cache = new Map();

export function makePlaceholder(index, theme = 'light', label = '') {
  const key = `${index}|${theme}|${label}`;
  if (cache.has(key)) return cache.get(key);
  const w = 1024;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const dark = theme === 'dark';
  const ink = dark ? '237, 237, 230' : '16, 16, 16';       // text tone
  const accent = dark ? '#ff5c1a' : '#e84300';
  const accentRgb = dark ? '255, 92, 26' : '255, 75, 0';

  // --- base ------------------------------------------------------------
  ctx.fillStyle = dark ? '#1a1a18' : '#e6e6e0';
  ctx.fillRect(0, 0, w, h);

  // --- gradient beams (diagonal light) -----------------------------------
  // Light theme keeps these airy — heavy overlays turn the card muddy
  const beam = ctx.createLinearGradient(0, h, w, 0);
  beam.addColorStop(0, `rgba(110, 86, 207, ${dark ? 0.35 : 0.14})`);
  beam.addColorStop(0.55, 'rgba(0,0,0,0)');
  beam.addColorStop(1, `rgba(${accentRgb}, ${dark ? 0.4 : 0.16})`);
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, w, h);

  // --- glow spots ---------------------------------------------------------
  const spots = [
    {
      x: 0.68 - index * 0.1, y: 0.32 + index * 0.1, r: 0.65,
      color: `rgba(${accentRgb}, ${dark ? 0.75 : 0.38})`
    },
    {
      x: 0.22 + index * 0.16, y: 0.8, r: 0.55,
      color: `rgba(110, 86, 207, ${dark ? 0.6 : 0.26})`
    }
  ];
  for (const s of spots) {
    const grad = ctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, s.r * w);
    grad.addColorStop(0, s.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // --- orbit rings around the main glow ------------------------------------
  const cx = spots[0].x * w;
  const cy = spots[0].y * h;
  ctx.strokeStyle = `rgba(${ink}, ${dark ? 0.22 : 0.28})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const radius = 120 + i * 85 + index * 20;
    const start = (index + i) * 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + Math.PI * (1.1 + i * 0.25));
    ctx.stroke();
  }
  // A dot riding the inner ring
  ctx.fillStyle = accent;
  const dotAngle = index * 1.7 + 0.8;
  ctx.beginPath();
  ctx.arc(cx + Math.cos(dotAngle) * 120, cy + Math.sin(dotAngle) * 120, 7, 0, Math.PI * 2);
  ctx.fill();

  // --- fine layout grid ------------------------------------------------------
  ctx.strokeStyle = `rgba(${ink}, 0.06)`;
  ctx.lineWidth = 1;
  for (let x = 64; x < w; x += 128) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 64; y < h; y += 128) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // --- huge ghost numeral, top-right ------------------------------------------
  const numeral = String(index + 1).padStart(2, '0');
  ctx.font = '700 380px "Space Grotesk", Arial, sans-serif';
  ctx.textBaseline = 'top';
  const numWidth = ctx.measureText(numeral).width;
  ctx.strokeStyle = `rgba(${ink}, ${dark ? 0.18 : 0.22})`;
  ctx.lineWidth = 2;
  ctx.strokeText(numeral, w - numWidth - 48, 36);
  ctx.fillStyle = `rgba(${ink}, 0.05)`;
  ctx.fillText(numeral, w - numWidth - 48, 36);

  // --- vignette (focuses the composition; barely-there on light) ---------------
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, dark ? 'rgba(0,0,0,0.5)' : 'rgba(140,140,132,0.14)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // --- type lockup, bottom-left --------------------------------------------------
  const pad = 72;

  // small mono kicker above the name
  ctx.fillStyle = accent;
  ctx.font = '400 26px "Space Mono", Menlo, monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`PROJECT — ${numeral}`, pad, h - pad - 118);

  if (label) {
    const name = label.toUpperCase();
    let size = 100;
    ctx.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    while (ctx.measureText(name).width > w - pad * 2 - 60 && size > 40) {
      size -= 4;
      ctx.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    }
    ctx.fillStyle = `rgba(${ink}, 0.94)`;
    ctx.fillText(name, pad, h - pad);

    // accent full-stop after the name
    const nameWidth = ctx.measureText(name).width;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(pad + nameWidth + 26, h - pad - 10, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- grain -----------------------------------------------------------------------
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);

  cache.set(key, canvas);
  return canvas;
}
