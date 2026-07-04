// =====================================================================
// IMAGE DISTORTION SHADER — WebGL hover effect for project thumbnails.
//
// Each thumbnail is a plane whose fragment shader:
//   1. cover-fits the texture (like CSS object-fit: cover),
//   2. displaces UVs with flowing simplex noise, scaled by uHover
//      (tweened 0→1 on mouseenter, →0 on mouseleave) and by cursor
//      velocity, so faster movement ripples harder,
//   3. splits RGB channels slightly along the displacement for a
//      chromatic fringe while the ripple is active.
// =====================================================================
import { simplexNoise3D } from './noise.js';

export const distortionVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const distortionFragment = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uPlaneSize;    // plane size in px
uniform vec2 uImageSize;    // texture natural size in px
uniform vec2 uMouse;        // cursor in plane UV space (0..1)
uniform float uHover;       // 0..1 hover progress (GSAP tweened)
uniform float uVelocity;    // smoothed cursor speed
uniform float uRadius;      // corner radius in px (matches CSS --radius)
uniform float uTime;

varying vec2 vUv;

${simplexNoise3D}

// CSS object-fit: cover, in UV space
vec2 coverUv(vec2 uv, vec2 planeSize, vec2 imageSize) {
  vec2 ratio = vec2(
    min((planeSize.x / planeSize.y) / (imageSize.x / imageSize.y), 1.0),
    min((planeSize.y / planeSize.x) / (imageSize.y / imageSize.x), 1.0)
  );
  return vec2(
    uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    uv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
}

void main() {
  // --- tweakables -----------------------------------------------------
  float NOISE_FREQ   = 4.0;   // ripple density
  float NOISE_SPEED  = 0.5;   // ripple flow speed
  float STRENGTH     = 0.045; // max UV displacement
  float RGB_SPLIT    = 0.6;   // chromatic fringe amount (× displacement)
  // ---------------------------------------------------------------------

  vec2 uv = coverUv(vUv, uPlaneSize, uImageSize);

  // Ripple strongest near the cursor, fading with distance
  float dist = distance(vUv, uMouse);
  float falloff = smoothstep(0.7, 0.0, dist);

  float n = snoise(vec3(vUv * NOISE_FREQ, uTime * NOISE_SPEED));
  vec2 offset = vec2(n, snoise(vec3(vUv * NOISE_FREQ + 7.3, uTime * NOISE_SPEED)));

  float amount = STRENGTH * uHover * (0.5 + falloff) * (1.0 + uVelocity * 2.0);
  vec2 duv = offset * amount;

  // RGB split along the displacement direction
  float r = texture2D(uTexture, uv + duv * (1.0 + RGB_SPLIT)).r;
  float g = texture2D(uTexture, uv + duv).g;
  float b = texture2D(uTexture, uv + duv * (1.0 - RGB_SPLIT)).b;

  // Rounded-rect alpha mask (SDF) so the plane matches the CSS card
  // radius instead of drawing square corners over the page.
  vec2 pos = (vUv - 0.5) * uPlaneSize;
  vec2 halfSize = uPlaneSize * 0.5 - uRadius;
  float cornerDist = length(max(abs(pos) - halfSize, 0.0)) - uRadius;
  float mask = 1.0 - smoothstep(-1.0, 1.0, cornerDist);

  gl_FragColor = vec4(r, g, b, mask);
}
`;
