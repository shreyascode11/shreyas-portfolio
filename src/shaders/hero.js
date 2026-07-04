// =====================================================================
// HERO SHADER — a noise-displaced sphere ("liquid blob").
//
// The vertex shader pushes each vertex along its normal by layered
// simplex noise. The mouse adds energy: uMouse biases where the surface
// swells, uMouseSpeed raises the overall amplitude while the cursor
// moves. The fragment shader lights it with a fresnel rim (lime accent)
// over a violet body so it reads against the near-black background.
//
// Tweakables are grouped at the top of each `main()` as constants.
// =====================================================================
import { simplexNoise3D } from './noise.js';

export const heroVertex = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;        // smoothed cursor, NDC-ish (-1..1)
uniform float uMouseSpeed;  // smoothed cursor velocity (0..1)
uniform float uReveal;      // intro progress (0..1) — gates displacement

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

${simplexNoise3D}

void main() {
  // --- tweakables -----------------------------------------------------
  float BASE_AMP   = 0.22;  // resting displacement amplitude
  float MOUSE_AMP  = 0.45;  // extra amplitude from cursor movement
  float FREQ_LOW   = 1.6;   // large slow swells
  float FREQ_HIGH  = 3.8;   // fine detail ripples
  float SPEED      = 0.18;  // time scale
  // ---------------------------------------------------------------------

  vec3 p = normalize(position);
  float t = uTime * SPEED;

  // Two octaves of noise: big slow forms + finer moving detail
  float n = snoise(vec3(p * FREQ_LOW) + t);
  n += 0.45 * snoise(vec3(p * FREQ_HIGH) - t * 1.6);

  // Bias the swell toward the cursor side of the sphere (0..1)
  float mouseSide = dot(p.xy, uMouse) * 0.5 + 0.5;

  float amp = (BASE_AMP + MOUSE_AMP * uMouseSpeed * mouseSide) * uReveal;
  vec3 displaced = position + normal * n * amp;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

  vNoise = n;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const heroFragment = /* glsl */ `
uniform vec3 uColorBody;   // orange-red body
uniform vec3 uColorGlow;   // warm highlight where noise swells
uniform vec3 uColorRim;    // dark edge for silhouette definition
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

void main() {
  // Fresnel: strongest at grazing angles → defines the silhouette
  float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 2.4);

  // Body: orange, warmed/brightened where the noise swells outward
  vec3 color = mix(uColorBody, uColorGlow, smoothstep(-0.2, 1.4, vNoise));

  // Rim: darken the edge so the shape reads crisply on the light bg
  color = mix(color, uColorRim, fresnel * 0.7);

  // Faint animated banding for a "scanned" technical texture
  float bands = sin(vNoise * 14.0 + uTime * 0.4) * 0.03;
  color += bands;

  gl_FragColor = vec4(color, 1.0);
}
`;
