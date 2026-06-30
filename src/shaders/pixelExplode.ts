export const pixelExplodeVertexShader = `
uniform float uTime;
attribute vec3 velocity;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  
  // Explosion effect: points move outwards based on their velocity vector
  // We use ease-out math: log(time) or sqrt(time) could be used, but linear * attenuation works
  vec3 pos = position + velocity * (1.0 - exp(-uTime * 2.0)) * 10.0;
  
  // Fade out over time (intro phase lasts ~3s)
  vAlpha = smoothstep(3.0, 1.0, uTime);
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (15.0 / -mvPosition.z); // Size attenuation based on depth
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const pixelExplodeFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  if (vAlpha <= 0.01) discard;
  // Make particles circular
  float d = distance(gl_PointCoord, vec2(0.5));
  if (d > 0.5) discard;
  
  // Soft glow edge
  float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`;
