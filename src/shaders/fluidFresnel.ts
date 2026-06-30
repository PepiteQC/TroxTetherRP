export const fluidFresnelVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fluidFresnelFragmentShader = `
uniform float uTime;
uniform vec3 color1;
uniform vec3 color2;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Simple view direction fresnel
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float fresnelTerm = dot(viewDirection, vNormal);
  fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);
  fresnelTerm = pow(fresnelTerm, 3.0);
  
  // Simple noise for fluid effect
  float noise = sin(vUv.x * 10.0 + uTime * 0.5) * cos(vUv.y * 10.0 + uTime * 0.5);
  vec3 color = mix(color1, color2, noise * 0.5 + 0.5); 
  
  gl_FragColor = vec4(color * fresnelTerm, fresnelTerm * 0.3);
}
`;
