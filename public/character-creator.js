// ============================================================
//  ETHERWORLD — Character Creator 3D  v2.0 PREMIUM
//  Powered by TroxT Neural Core
//  Full PBR Humanoid + Particle System + Accessories
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── PALETTES ─────────────────────────────────────────────────
const SKIN_COLORS  = ['#fde0c4','#f5cba7','#e8a87c','#d48b5a','#b06040','#7a3e20','#5c2810','#3a1808'];
const HAIR_COLORS  = ['#0a0502','#2a1206','#4a2010','#7c3a1a','#b06030','#c8a050','#e8d080',
                      '#f0f0f0','#c0c0c0','#606060','#b03020','#ff4080','#4060d0','#20a060'];
const EYE_COLORS   = ['#1a3a8c','#204a20','#7c3a10','#106868','#5c5c6c','#802860','#c04010','#18284c'];
const OUTFIT_COLS  = ['#0f0f14','#1a1a2e','#2a1a3e','#1a2a3e','#1e3a1e','#3a1a1a',
                      '#2a3a10','#8a6a10','#6a3020','#3a2a4e','#d0d0d0','#e8e8e0'];
const SKIN_ROUGH   = [0.55, 0.6, 0.62, 0.65, 0.68, 0.7, 0.72, 0.74];

const HAIR_STYLES  = ['Buzz','Crew Cut','Side Part','Slick Back','Undercut','Long Wavy','Mohawk','Afro','Bald','Quiff'];
const FACE_SHAPES  = ['Regular','Square','Round','Oval','Diamond','Heart'];
const BODY_TYPES   = ['Slim','Regular','Athletic','Stocky','Heavy'];
const FACIAL_HAIR  = ['Clean','5 O\'Clock','Goatee','Circle Beard','Full Beard','Handlebar','None'];
const TOPS         = ['T-Shirt','Hoodie','Dress Shirt','Bomber','Tank Top','Suit Jacket','Turtleneck','Flannel'];
const PANTS        = ['Slim Jeans','Chinos','Shorts','Track Pants','Cargo','Dress Pants','Joggers'];
const SHOES        = ['Sneakers','Chelsea Boots','Oxford','Sandals','High-Tops','Slip-Ons','Timbs'];
const ACC_GLASSES  = ['None','Aviators','Round','Wayfarer','Sports','Visor'];
const ACC_HATS     = ['None','Snapback','Beanie','Fedora','Cap','Beret'];
const ACC_JEWELRY  = ['None','Chain','Pendant','Dog Tags','Pearl','Choker'];

// ── STATE ─────────────────────────────────────────────────────
const S = {
  step:0, gender:'male', name:'NOUVEAU_PERSO', nationality:'american',
  skin:1, faceShape:0, eyeColor:0, noseBridge:50, noseSize:50,
  faceWidth:50, cheekH:50, jawWidth:50, eyeSize:50, eyeSpacing:50, lipSize:50,
  hairStyle:1, hairColor:0, facialHair:0,
  bodyType:1, height:50, muscular:45, fatness:30,
  topStyle:0, topColor:1, pantsStyle:0, pantsColor:1, shoesStyle:0, shoesColor:0,
  glassesStyle:0, hatStyle:0, jewelryStyle:0,
  glassesColor:0, hatColor:1,
};

// ── RENDERER SETUP ────────────────────────────────────────────
const canvas   = document.getElementById('cc-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputColorSpace   = THREE.SRGBColorSpace;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x040810, 0.04);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 80);
camera.position.set(0, 1.55, 3.8);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.05, 0);
controls.enableDamping    = true;
controls.dampingFactor    = 0.06;
controls.maxPolarAngle    = Math.PI * 0.88;
controls.minPolarAngle    = Math.PI * 0.04;
controls.minDistance      = 1.2;
controls.maxDistance      = 7;
controls.autoRotate       = true;
controls.autoRotateSpeed  = 0.6;
controls.update();

// ── BACKGROUND ───────────────────────────────────────────────
// Gradient skybox using a large sphere with shader
const bgGeo = new THREE.SphereGeometry(40, 32, 16);
const bgMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vPos;
    void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
  `,
  fragmentShader: `
    varying vec3 vPos;
    uniform float uTime;
    void main() {
      float y = (normalize(vPos).y + 1.0) * 0.5;
      vec3 top = vec3(0.02, 0.04, 0.10);
      vec3 mid = vec3(0.01, 0.02, 0.06);
      vec3 bot = vec3(0.00, 0.01, 0.03);
      vec3 col = mix(bot, mix(mid, top, y * 0.8), y);
      // subtle nebula tint
      float n = sin(vPos.x*0.1 + uTime*0.3) * cos(vPos.z*0.08 + uTime*0.2) * 0.5 + 0.5;
      col += vec3(0.01, 0.0, 0.03) * n * (1.0 - y);
      gl_FragColor = vec4(col, 1.0);
    }
  `
});
const bgSphere = new THREE.Mesh(bgGeo, bgMat);
scene.add(bgSphere);

// ── LIGHTS ───────────────────────────────────────────────────
// Key light
const keyL = new THREE.DirectionalLight(0xfff5e0, 3.0);
keyL.position.set(4, 7, 5);
keyL.castShadow = true;
keyL.shadow.mapSize.set(2048, 2048);
keyL.shadow.camera.near = 0.5;
keyL.shadow.camera.far  = 20;
keyL.shadow.camera.top  = 4; keyL.shadow.camera.bottom = -1;
keyL.shadow.camera.left = -4; keyL.shadow.camera.right  = 4;
keyL.shadow.bias = -0.0005;
scene.add(keyL);

// Fill
const fillL = new THREE.DirectionalLight(0x2244aa, 1.0);
fillL.position.set(-5, 3, -2);
scene.add(fillL);

// Cyan rim (back-right)
const rimL = new THREE.DirectionalLight(0x00d4ff, 2.0);
rimL.position.set(2, 5, -6);
scene.add(rimL);

// Purple rim (back-left)
const rimL2 = new THREE.DirectionalLight(0x9b87ff, 1.2);
rimL2.position.set(-3, 4, -5);
scene.add(rimL2);

// Upward bounce
const bounceL = new THREE.DirectionalLight(0x102040, 0.8);
bounceL.position.set(0, -3, 2);
scene.add(bounceL);

// Ambient
scene.add(new THREE.AmbientLight(0x0a1020, 1.5));

// Platform spot
const spot = new THREE.SpotLight(0x00d4ff, 6, 12, Math.PI * 0.18, 0.6, 2);
spot.position.set(0, 7, 0);
spot.target.position.set(0, 0, 0);
scene.add(spot, spot.target);

// ── ENVIRONMENT / FLOOR ──────────────────────────────────────
// Main floor disc
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x060c1a, roughness: 0.2, metalness: 0.8,
  envMapIntensity: 0.5,
});
const floorM = new THREE.Mesh(new THREE.CircleGeometry(8, 64), floorMat);
floorM.rotation.x = -Math.PI / 2;
floorM.receiveShadow = true;
scene.add(floorM);

// Hex pattern platform
const platGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.04, 6, 1);
const platMat = new THREE.MeshStandardMaterial({ color: 0x0a1428, roughness: 0.3, metalness: 0.9 });
const plat = new THREE.Mesh(platGeo, platMat);
plat.receiveShadow = true;
plat.position.y = 0.02;
scene.add(plat);

// Inner glow ring
const innerRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.78, 0.014, 8, 64),
  new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 3 })
);
innerRing.rotation.x = -Math.PI / 2;
innerRing.position.y = 0.045;
scene.add(innerRing);

// Outer glow ring
const outerRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.02, 0.008, 8, 64),
  new THREE.MeshStandardMaterial({ color: 0x9b87ff, emissive: 0x9b87ff, emissiveIntensity: 2 })
);
outerRing.rotation.x = -Math.PI / 2;
outerRing.position.y = 0.044;
scene.add(outerRing);

// Grid lines (3 concentric circles)
[2.5, 4.5, 6.5].forEach((r, i) => {
  const grid = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.005, 4, 128),
    new THREE.MeshStandardMaterial({
      color: 0x00d4ff, emissive: 0x00d4ff,
      emissiveIntensity: 0.3 - i * 0.08,
      transparent: true, opacity: 0.4 - i * 0.1
    })
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.01;
  scene.add(grid);
});

// Radial lines on floor
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.01, 0),
    new THREE.Vector3(Math.cos(angle) * 7, 0.01, Math.sin(angle) * 7)
  ]);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x001828, transparent: true, opacity: 0.5
  });
  scene.add(new THREE.Line(lineGeo, lineMat));
}

// ── PARTICLE SYSTEM ──────────────────────────────────────────
const PARTICLE_COUNT = 280;
const pPositions  = new Float32Array(PARTICLE_COUNT * 3);
const pVelocities = new Float32Array(PARTICLE_COUNT * 3);
const pSizes      = new Float32Array(PARTICLE_COUNT);
const pAlphas     = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const r = 1.5 + Math.random() * 4.5;
  const a = Math.random() * Math.PI * 2;
  pPositions[i*3]   = Math.cos(a) * r;
  pPositions[i*3+1] = Math.random() * 4.5 - 0.5;
  pPositions[i*3+2] = Math.sin(a) * r;
  pVelocities[i*3]   = (Math.random() - 0.5) * 0.002;
  pVelocities[i*3+1] = 0.003 + Math.random() * 0.006;
  pVelocities[i*3+2] = (Math.random() - 0.5) * 0.002;
  pSizes[i]  = 1.5 + Math.random() * 3;
  pAlphas[i] = Math.random();
}

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
pGeo.setAttribute('size',     new THREE.BufferAttribute(pSizes, 1));

const pMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uTex: { value: makeCircleTex() } },
  vertexShader: `
    attribute float size;
    uniform float uTime;
    varying float vAlpha;
    void main(){
      vec3 p = position;
      float t = uTime * 0.5;
      p.y = mod(p.y + t * size * 0.4, 5.0) - 0.5;
      vAlpha = 0.15 + 0.2 * sin(uTime + p.x * 2.0);
      gl_PointSize = size * (280.0 / length((modelViewMatrix * vec4(p,1.0)).xyz));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTex;
    varying float vAlpha;
    void main(){
      vec4 t = texture2D(uTex, gl_PointCoord);
      if(t.a < 0.1) discard;
      gl_FragColor = vec4(0.1, 0.75, 1.0, t.a * vAlpha);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});

function makeCircleTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16,16,0, 16,16,16);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(200,240,255,0.6)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,32,32);
  return new THREE.CanvasTexture(c);
}

scene.add(new THREE.Points(pGeo, pMat));

// ── MATERIALS ─────────────────────────────────────────────────
const M = {
  skin:    new THREE.MeshStandardMaterial({ color: 0xf5cba7, roughness: 0.62, metalness: 0.0 }),
  hair:    new THREE.MeshStandardMaterial({ color: 0x0a0502, roughness: 0.85, metalness: 0.0 }),
  eyeW:   new THREE.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.25, metalness: 0.0 }),
  eyeI:   new THREE.MeshStandardMaterial({ color: 0x1a3a8c, roughness: 0.15, metalness: 0.05 }),
  eyeP:   new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.05, metalness: 0.0 }),
  eyeH:   new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.0,  metalness: 0.0, emissive: 0xffffff, emissiveIntensity: 0.8 }),
  lip:    new THREE.MeshStandardMaterial({ color: 0xb86050, roughness: 0.5,  metalness: 0.0 }),
  nose:   new THREE.MeshStandardMaterial({ color: 0xf0c090, roughness: 0.65, metalness: 0.0 }),
  top:    new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.88, metalness: 0.0 }),
  bot:    new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.85, metalness: 0.0 }),
  shoe:   new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7,  metalness: 0.15 }),
  sole:   new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.95, metalness: 0.0 }),
  belt:   new THREE.MeshStandardMaterial({ color: 0x1c1206, roughness: 0.65, metalness: 0.2 }),
  buckle: new THREE.MeshStandardMaterial({ color: 0xd4a830, roughness: 0.25, metalness: 0.9 }),
  glass:  new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.7 }),
  glassFrame: new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.3, metalness: 0.8 }),
  chain:  new THREE.MeshStandardMaterial({ color: 0xd0a820, roughness: 0.2, metalness: 1.0 }),
  nail:   new THREE.MeshStandardMaterial({ color: 0xe8c0a0, roughness: 0.3, metalness: 0.05 }),
  lash:   new THREE.MeshStandardMaterial({ color: 0x050402, roughness: 0.9, metalness: 0.0 }),
  brow:   new THREE.MeshStandardMaterial({ color: 0x0a0502, roughness: 0.9, metalness: 0.0 }),
};

// ── CHARACTER GROUP ───────────────────────────────────────────
const charGroup = new THREE.Group();
scene.add(charGroup);

function mk(geo, mat, castShadow=true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow  = castShadow;
  m.receiveShadow = true;
  return m;
}

// ── BUILD CHARACTER ───────────────────────────────────────────
function buildCharacter() {
  while (charGroup.children.length) charGroup.remove(charGroup.children[0]);

  const fat = S.fatness / 100;
  const mus = S.muscular / 100;
  const hgt = 0.85 + S.height * 0.003;

  // ── HEAD ──
  const headR = 0.148 + fat * 0.022;
  const head = mk(new THREE.SphereGeometry(headR, 32, 24), M.skin);
  head.position.set(0, 1.67, 0);
  head.scale.set(0.95 + fat * 0.06, 1, 0.88 + fat * 0.04);
  charGroup.add(head);

  // Forehead
  const forehead = mk(new THREE.SphereGeometry(headR * 0.8, 20, 14), M.skin);
  forehead.position.set(0, 1.76, 0.01);
  forehead.scale.set(0.9, 0.65, 0.75);
  charGroup.add(forehead);

  // Jaw
  const jawH = 0.08 + fat * 0.015;
  const jaw = mk(new THREE.SphereGeometry(headR * 0.78, 20, 14), M.skin);
  jaw.position.set(0, 1.565 + fat * 0.01, 0.02);
  jaw.scale.set(0.88 + fat * 0.08, 0.62 + fat * 0.1, 0.78 + fat * 0.04);
  charGroup.add(jaw);

  // Cheekbones
  [-1,1].forEach(s => {
    const cheek = mk(new THREE.SphereGeometry(0.058 + fat * 0.012, 14, 12), M.skin);
    cheek.position.set(s * (0.106 + fat * 0.014), 1.645, 0.075);
    cheek.scale.set(1, 0.72, 0.7);
    charGroup.add(cheek);
  });

  // ── EYES ──
  const eyeSpOff = (S.eyeSpacing - 50) * 0.0005;
  [-1,1].forEach(s => {
    const ex = s * (0.054 + eyeSpOff);
    const ey = 1.672;
    const ez = 0.118 + fat * 0.005;

    // Eye socket (slight depression)
    const socket = mk(new THREE.SphereGeometry(0.031, 14, 10), M.skin);
    socket.position.set(ex, ey, ez - 0.006);
    socket.scale.set(1, 0.85, 0.7);
    charGroup.add(socket);

    // Sclera (white)
    const eyeScl = (S.eyeSize - 50) * 0.0003;
    const sclera = mk(new THREE.SphereGeometry(0.0285 + eyeScl, 16, 12), M.eyeW);
    sclera.position.set(ex, ey, ez);
    charGroup.add(sclera);

    // Iris
    const iris = mk(new THREE.SphereGeometry(0.018 + eyeScl * 0.6, 14, 10), M.eyeI);
    iris.position.set(ex, ey, ez + 0.018);
    charGroup.add(iris);

    // Pupil
    const pupil = mk(new THREE.SphereGeometry(0.009, 10, 8), M.eyeP);
    pupil.position.set(ex, ey, ez + 0.026);
    charGroup.add(pupil);

    // Specular highlight
    const spec = mk(new THREE.SphereGeometry(0.004, 6, 6), M.eyeH);
    spec.position.set(ex + 0.006, ey + 0.006, ez + 0.028);
    charGroup.add(spec);

    // Upper eyelid
    const lidGeo = new THREE.SphereGeometry(0.031, 14, 8, 0, Math.PI*2, 0, Math.PI*0.5);
    const lid = mk(lidGeo, M.skin);
    lid.position.set(ex, ey + 0.003, ez);
    lid.rotation.x = 0.22;
    charGroup.add(lid);

    // Lower eyelid line
    const llid = mk(new THREE.SphereGeometry(0.0285, 14, 6, 0, Math.PI*2, Math.PI*0.55, Math.PI*0.2), M.skin);
    llid.position.set(ex, ey - 0.002, ez - 0.001);
    charGroup.add(llid);

    // Eyelashes (top)
    for (let li = 0; li < 6; li++) {
      const ang = (li / 5 - 0.5) * 0.9 * s;
      const lash = mk(new THREE.BoxGeometry(0.002, 0.009, 0.001), M.lash);
      lash.position.set(ex + Math.sin(ang)*0.025*s, ey + 0.027, ez + 0.012);
      lash.rotation.z = ang * 0.4;
      charGroup.add(lash);
    }
  });

  // ── EYEBROWS ──
  [-1,1].forEach(s => {
    const browOff = (S.faceWidth - 50) * 0.0003;
    const brow = mk(new THREE.BoxGeometry(0.048, 0.009, 0.01), M.brow);
    brow.position.set(s * (0.054 + browOff), 1.698, 0.112);
    brow.rotation.z = s * -0.12;
    brow.rotation.x = -0.1;
    charGroup.add(brow);

    // Brow arch peak
    const peak = mk(new THREE.BoxGeometry(0.012, 0.011, 0.009), M.brow);
    peak.position.set(s * (0.042 + browOff * 0.5), 1.701, 0.113);
    charGroup.add(peak);
  });

  // ── NOSE ──
  const noseS = (S.noseSize - 50) * 0.003;
  const noseBr = (S.noseBridge - 50) * 0.001;

  // Bridge
  const bridge = mk(new THREE.CapsuleGeometry(0.012 + noseBr, 0.04 + noseBr, 6, 8), M.nose);
  bridge.position.set(0, 1.666, 0.134 + fat * 0.003);
  bridge.rotation.x = Math.PI * 0.08;
  charGroup.add(bridge);

  // Tip
  const tip = mk(new THREE.SphereGeometry(0.022 + noseS, 14, 10), M.nose);
  tip.position.set(0, 1.645, 0.152 + fat * 0.004 + noseS);
  tip.scale.set(1.1 + noseS * 3, 0.88, 0.95);
  charGroup.add(tip);

  // Nostrils
  [-1,1].forEach(s => {
    const n = mk(new THREE.SphereGeometry(0.01 + noseS * 0.5, 10, 8), M.nose);
    n.position.set(s * (0.02 + noseS), 1.641, 0.146 + fat * 0.003);
    n.scale.set(0.85, 0.75, 0.9);
    charGroup.add(n);
    // Nostril opening
    const no = mk(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3a1808, roughness: 0.9 }));
    no.position.set(s * (0.019 + noseS), 1.640, 0.149 + fat * 0.003);
    charGroup.add(no);
  });

  // ── LIPS / MOUTH ──
  const lipS = (S.lipSize - 50) * 0.0008;

  // Upper lip
  const ulip = mk(new THREE.BoxGeometry(0.064 + lipS*2, 0.012 + lipS, 0.014), M.lip);
  ulip.position.set(0, 1.632, 0.14 + fat * 0.003 + lipS*0.5);
  ulip.rotation.x = -0.05;
  charGroup.add(ulip);

  // Cupid's bow
  [-1,1].forEach(s => {
    const peak = mk(new THREE.SphereGeometry(0.008, 8, 6), M.lip);
    peak.position.set(s * 0.012, 1.636, 0.142 + fat * 0.003);
    charGroup.add(peak);
  });

  // Lower lip (fuller)
  const llip = mk(new THREE.SphereGeometry(0.036 + lipS, 14, 8), M.lip);
  llip.position.set(0, 1.623, 0.143 + fat * 0.003 + lipS*0.5);
  llip.scale.set(1 + lipS * 3, 0.65 + lipS * 2, 0.75);
  charGroup.add(llip);

  // Mouth corners
  [-1,1].forEach(s => {
    const corner = mk(new THREE.SphereGeometry(0.007, 8, 6), M.skin);
    corner.position.set(s * 0.033, 1.629, 0.138 + fat * 0.002);
    charGroup.add(corner);
  });

  // ── PHILTRUM ──
  const phil = mk(new THREE.BoxGeometry(0.018, 0.022, 0.004), M.skin);
  phil.position.set(0, 1.64, 0.145 + fat * 0.002);
  charGroup.add(phil);

  // ── EARS ──
  [-1,1].forEach(s => {
    const ear = mk(new THREE.SphereGeometry(0.028, 14, 10), M.skin);
    ear.scale.set(0.45, 0.88, 0.52);
    ear.position.set(s * (0.145 + fat * 0.01), 1.66, 0.0);
    charGroup.add(ear);
    // Ear lobe
    const lobe = mk(new THREE.SphereGeometry(0.016, 8, 8), M.skin);
    lobe.position.set(s * (0.147 + fat * 0.01), 1.636, -0.002);
    lobe.scale.set(0.6, 0.75, 0.55);
    charGroup.add(lobe);
    // Inner ear
    const inner = mk(new THREE.SphereGeometry(0.012, 8, 6), M.skin);
    inner.scale.set(0.4, 0.55, 0.2);
    inner.position.set(s * (0.142 + fat * 0.01), 1.66, s * 0.004);
    charGroup.add(inner);
  });

  // ── NECK ──
  const neckW = 0.058 + fat * 0.01 + mus * 0.008;
  const neck = mk(new THREE.CylinderGeometry(neckW, neckW * 1.08, 0.13, 20), M.skin);
  neck.position.set(0, 1.548, 0);
  charGroup.add(neck);

  // Adam's apple (male)
  if (S.gender === 'male') {
    const adam = mk(new THREE.SphereGeometry(0.016, 10, 8), M.skin);
    adam.position.set(0, 1.555, neckW * 1.02);
    adam.scale.set(0.7, 0.8, 0.5);
    charGroup.add(adam);
  }

  // ── COLLAR AREA ──
  const collarSkin = mk(new THREE.CylinderGeometry(neckW * 1.2, neckW * 1.6, 0.055, 16), M.skin);
  collarSkin.position.set(0, 1.49, 0);
  charGroup.add(collarSkin);

  // ── TORSO ──
  const chW = 0.19 + fat * 0.04 + mus * 0.025;
  const chD = 0.12 + fat * 0.025 + mus * 0.015;
  const torsoH = 0.36;

  const torso = mk(new THREE.BoxGeometry(chW * 2, torsoH, chD * 2), M.top);
  torso.position.set(0, 1.29, 0);
  charGroup.add(torso);

  // Chest rounding (front)
  const chestFront = mk(new THREE.SphereGeometry(chW * 0.95, 16, 10), M.top);
  chestFront.position.set(0, 1.38, chD * 0.75);
  chestFront.scale.set(1, 0.55, 0.55);
  charGroup.add(chestFront);

  // Pecs (muscular)
  if (S.muscular > 40) {
    const pecMult = Math.min((S.muscular - 40) / 60, 1);
    [-1,1].forEach(s => {
      const pec = mk(new THREE.SphereGeometry(0.07 + pecMult * 0.03, 16, 12), M.top);
      pec.position.set(s * (chW * 0.6), 1.38, chD * 0.85);
      pec.scale.set(0.95, 0.7, 0.65);
      charGroup.add(pec);
    });
  }

  // Shoulder caps
  const shoulderW = chW + 0.04 + mus * 0.02;
  [-1,1].forEach(s => {
    const sh = mk(new THREE.SphereGeometry(0.075 + mus * 0.018, 16, 12), M.top);
    sh.position.set(s * shoulderW, 1.455, 0);
    sh.scale.set(0.88, 0.8, 0.85);
    charGroup.add(sh);
  });

  // Belly (fat)
  if (fat > 0.45) {
    const bellyR = (fat - 0.45) * 0.18;
    const belly = mk(new THREE.SphereGeometry(bellyR + 0.04, 14, 10), M.top);
    belly.position.set(0, 1.19, chD * 0.9 + bellyR * 0.5);
    charGroup.add(belly);
  }

  // Waist / lower torso
  const waistW = (chW - 0.025 + fat * 0.02) * 0.95;
  const waist = mk(new THREE.CylinderGeometry(waistW * 1.12, waistW * 1.18, 0.1, 16), M.top);
  waist.position.set(0, 1.12, 0);
  charGroup.add(waist);

  // ── PELVIS ──
  const hipW = 0.165 + fat * 0.028 + mus * 0.01;
  const hipD = 0.115 + fat * 0.018;
  const pelvis = mk(new THREE.BoxGeometry(hipW * 2, 0.14, hipD * 2), M.bot);
  pelvis.position.set(0, 1.03, 0);
  charGroup.add(pelvis);

  // Hip rounding
  [-1,1].forEach(s => {
    const hip = mk(new THREE.SphereGeometry(0.065 + fat * 0.018, 14, 10), M.bot);
    hip.position.set(s * (hipW * 0.85), 1.04, 0);
    hip.scale.set(0.75, 0.85, 0.85);
    charGroup.add(hip);
  });

  // ── BELT ──
  const beltGeo = new THREE.TorusGeometry(hipW * 1.04, 0.013, 8, 40, Math.PI * 1.08);
  const beltM = mk(beltGeo, M.belt);
  beltM.rotation.x = Math.PI / 2;
  beltM.position.set(0, 1.09, 0.02);
  charGroup.add(beltM);

  const buckle = mk(new THREE.BoxGeometry(0.045, 0.038, 0.012), M.buckle);
  buckle.position.set(0, 1.09, hipD * 1.04);
  charGroup.add(buckle);
  const buckleInner = mk(new THREE.BoxGeometry(0.025, 0.018, 0.008), M.belt);
  buckleInner.position.set(0, 1.09, hipD * 1.06);
  charGroup.add(buckleInner);

  // ── ARMS ──
  buildArm(-1, chW, shoulderW, mus, fat);
  buildArm( 1, chW, shoulderW, mus, fat);

  // ── LEGS ──
  buildLeg(-1, hipW, mus, fat, hgt);
  buildLeg( 1, hipW, mus, fat, hgt);

  // ── HAIR ──
  buildHair(fat, headR);

  // ── FACIAL HAIR ──
  buildFacialHair(fat);

  // ── ACCESSORIES ──
  buildGlasses(fat, headR);
  buildHat(fat, headR);
  buildJewelry(neckW);
}

// ── ARMS ─────────────────────────────────────────────────────
function buildArm(side, chW, shW, mus, fat) {
  const x = side * (shW + 0.005);
  const upArmR  = 0.046 + mus * 0.018 + fat * 0.008;
  const foreR   = 0.036 + mus * 0.010 + fat * 0.005;

  // Upper arm
  const ua = mk(new THREE.CapsuleGeometry(upArmR, 0.21, 8, 14), M.top);
  ua.position.set(x, 1.30, 0);
  ua.rotation.z = side * -0.14;
  charGroup.add(ua);

  // Elbow
  const elbow = mk(new THREE.SphereGeometry(upArmR * 0.88, 12, 10), M.top);
  elbow.position.set(x * 1.02, 1.125, 0.01);
  charGroup.add(elbow);

  // Forearm
  const fa = mk(new THREE.CapsuleGeometry(foreR, 0.20, 8, 14), M.skin);
  fa.position.set(x * 1.03, 1.095, 0.015);
  fa.rotation.z = side * -0.07;
  charGroup.add(fa);

  // Wrist
  const wrist = mk(new THREE.SphereGeometry(foreR * 0.9, 10, 8), M.skin);
  wrist.position.set(x * 1.06, 0.952, 0.02);
  charGroup.add(wrist);

  // Hand (palm)
  const hand = mk(new THREE.BoxGeometry(0.072, 0.09, 0.032), M.skin);
  hand.position.set(x * 1.09, 0.92, 0.018);
  charGroup.add(hand);

  // Fingers
  for (let f = 0; f < 4; f++) {
    const foff = (f - 1.5) * 0.018;
    const fing = mk(new THREE.CapsuleGeometry(0.009, 0.032, 4, 8), M.skin);
    fing.position.set(x * 1.09 + foff, 0.875, 0.018);
    charGroup.add(fing);
    // Fingernail
    const nail = mk(new THREE.BoxGeometry(0.013, 0.004, 0.006), M.nail);
    nail.position.set(x * 1.09 + foff, 0.862, 0.022);
    charGroup.add(nail);
  }

  // Thumb
  const thumb = mk(new THREE.CapsuleGeometry(0.011, 0.026, 4, 6), M.skin);
  thumb.position.set(x * 1.11 + side * 0.038, 0.93, 0.024);
  thumb.rotation.z = side * 0.55;
  charGroup.add(thumb);

  // Watch (left wrist, if accessories)
  if (side === -1 && S.jewelryStyle > 0) {
    const watchBand = mk(new THREE.TorusGeometry(foreR * 1.05, 0.01, 8, 20), M.belt);
    watchBand.position.set(x * 1.045, 0.97, 0.015);
    charGroup.add(watchBand);
    const watchFace = mk(new THREE.BoxGeometry(0.028, 0.028, 0.012), M.glassFrame);
    watchFace.position.set(x * 1.055, 0.97, 0.028);
    charGroup.add(watchFace);
    const watchGlass = mk(new THREE.BoxGeometry(0.022, 0.022, 0.006), M.glass);
    watchGlass.position.set(x * 1.056, 0.97, 0.033);
    charGroup.add(watchGlass);
  }
}

// ── LEGS ─────────────────────────────────────────────────────
function buildLeg(side, hipW, mus, fat, hgt) {
  const x = side * (hipW - 0.04);
  const thighR = 0.068 + fat * 0.022 + mus * 0.012;
  const shinR  = 0.050 + fat * 0.012 + mus * 0.006;

  // Thigh
  const thigh = mk(new THREE.CapsuleGeometry(thighR, 0.28 * hgt, 8, 14), M.bot);
  thigh.position.set(x, 0.79 * hgt, 0.008);
  charGroup.add(thigh);

  // Knee cap
  const knee = mk(new THREE.SphereGeometry(thighR * 0.72, 12, 10), M.bot);
  knee.position.set(x, 0.6 * hgt, 0.04 * hgt);
  knee.scale.set(0.88, 0.72, 0.78);
  charGroup.add(knee);

  // Shin
  const shin = mk(new THREE.CapsuleGeometry(shinR, 0.25 * hgt, 8, 14), M.bot);
  shin.position.set(x, 0.5 * hgt, 0.012);
  charGroup.add(shin);

  // Ankle
  const ankle = mk(new THREE.SphereGeometry(shinR * 0.8, 12, 10), M.skin);
  ankle.position.set(x, 0.34 * hgt, 0.01);
  charGroup.add(ankle);

  // Ankle bone bump
  [-1,1].forEach(as => {
    const ab = mk(new THREE.SphereGeometry(0.016, 8, 6), M.skin);
    ab.position.set(x + as * 0.036, 0.35 * hgt, 0.005);
    charGroup.add(ab);
  });

  // Shoe body
  const shoeW = 0.085, shoeH = 0.058, shoeL = 0.195;
  const shoe = mk(new THREE.BoxGeometry(shoeW, shoeH, shoeL), M.shoe);
  shoe.position.set(x, 0.305 * hgt, 0.032);
  charGroup.add(shoe);

  // Toe cap
  const toecap = mk(new THREE.SphereGeometry(shoeW * 0.55, 12, 8), M.shoe);
  toecap.position.set(x, 0.318 * hgt, 0.115);
  toecap.scale.set(1, 0.65, 0.72);
  charGroup.add(toecap);

  // Heel
  const heel = mk(new THREE.BoxGeometry(shoeW * 0.9, shoeH * 0.4, 0.04), M.shoe);
  heel.position.set(x, 0.28 * hgt, -0.07);
  charGroup.add(heel);

  // Sole
  const sole = mk(new THREE.BoxGeometry(shoeW + 0.01, 0.018, shoeL + 0.01), M.sole);
  sole.position.set(x, 0.274 * hgt, 0.032);
  charGroup.add(sole);

  // Laces (simple)
  for (let l = 0; l < 3; l++) {
    const lace = mk(new THREE.BoxGeometry(shoeW * 0.75, 0.005, 0.006), M.eyeW);
    lace.position.set(x, 0.352 * hgt, 0.04 + l * 0.022);
    charGroup.add(lace);
  }
}

// ── HAIR ─────────────────────────────────────────────────────
function buildHair(fat, headR) {
  const s = S.hairStyle;
  if (s === 8) return; // Bald

  const hg = new THREE.Group();
  const hy = 1.68 + fat * 0.005;
  const r = headR + 0.005;

  if (s === 0) { // Buzz
    const b = mk(new THREE.SphereGeometry(r, 28, 18), M.hair);
    b.position.y = hy;
    b.scale.set(0.952, 0.72, 0.87);
    hg.add(b);
  }
  else if (s === 1) { // Crew Cut
    const top = mk(new THREE.SphereGeometry(r, 24, 16), M.hair);
    top.position.set(0, hy + 0.015, 0);
    top.scale.set(0.954, 0.6, 0.88);
    hg.add(top);
    // Short sides
    [-1,1].forEach(sd => {
      const side = mk(new THREE.BoxGeometry(0.04, 0.14, 0.16), M.hair);
      side.position.set(sd * (headR + 0.01), hy - 0.02, 0);
      side.scale.set(1, 1, 1);
      hg.add(side);
    });
    const back = mk(new THREE.BoxGeometry(0.22, 0.12, 0.04), M.hair);
    back.position.set(0, hy - 0.02, -headR + 0.005);
    hg.add(back);
  }
  else if (s === 2) { // Side Part
    const top = mk(new THREE.SphereGeometry(r, 24, 16), M.hair);
    top.position.set(-0.018, hy + 0.01, 0);
    top.scale.set(0.96, 0.62, 0.88);
    hg.add(top);
    const ridge = mk(new THREE.BoxGeometry(0.15, 0.022, 0.20), M.hair);
    ridge.position.set(-0.038, hy + 0.065, 0);
    ridge.rotation.z = 0.14;
    hg.add(ridge);
    // Swept portion
    const sweep = mk(new THREE.SphereGeometry(r * 0.7, 16, 10), M.hair);
    sweep.position.set(0.04, hy + 0.07, 0.03);
    sweep.scale.set(0.6, 0.45, 0.7);
    sweep.rotation.z = -0.3;
    hg.add(sweep);
  }
  else if (s === 3) { // Slick Back
    const top = mk(new THREE.SphereGeometry(r, 24, 16), M.hair);
    top.position.set(0, hy + 0.005, -0.01);
    top.scale.set(0.955, 0.6, 0.9);
    hg.add(top);
    // Back wave
    for (let i = 0; i < 3; i++) {
      const wave = mk(new THREE.BoxGeometry(0.2 - i*0.02, 0.035, 0.06), M.hair);
      wave.position.set(0, hy + 0.035 - i*0.01, -0.06 - i*0.06);
      wave.rotation.x = -0.2 - i*0.1;
      hg.add(wave);
    }
  }
  else if (s === 4) { // Undercut
    const top = mk(new THREE.SphereGeometry(r, 24, 16), M.hair);
    top.position.set(0, hy + 0.025, 0);
    top.scale.set(0.94, 0.7, 0.88);
    hg.add(top);
    // Pomp
    const pomp = mk(new THREE.BoxGeometry(0.175, 0.075, 0.16), M.hair);
    pomp.position.set(0, hy + 0.105, 0.03);
    pomp.rotation.x = 0.1;
    hg.add(pomp);
    const pompCap = mk(new THREE.SphereGeometry(0.09, 14, 10), M.hair);
    pompCap.position.set(0, hy + 0.14, 0.025);
    pompCap.scale.set(0.95, 0.6, 0.8);
    hg.add(pompCap);
  }
  else if (s === 5) { // Long Wavy
    const base = mk(new THREE.SphereGeometry(r, 24, 18), M.hair);
    base.position.set(0, hy, 0);
    base.scale.set(0.97, 0.72, 0.92);
    hg.add(base);
    // Flowing strands
    const strandData = [
      [0, -0.1, -0.09, 0, -0.08, 0.22],
      [-0.095, -0.12, -0.04, 0.15, -0.08, 0.2],
      [0.095, -0.12, -0.04, -0.15, -0.08, 0.2],
      [-0.06, -0.15, 0.0, 0.1, -0.06, 0.18],
      [0.06, -0.15, 0.0, -0.1, -0.06, 0.18],
      [0, -0.18, 0.01, 0, -0.05, 0.16],
    ];
    strandData.forEach(([sx,sy,sz, rx,ry,rz]) => {
      const strand = mk(new THREE.CapsuleGeometry(0.032 + Math.random()*0.01, 0.18 + Math.random()*0.08, 6, 8), M.hair);
      strand.position.set(sx, hy + sy, sz);
      strand.rotation.set(rx*0.2, ry*0.1, rz*0.1);
      hg.add(strand);
    });
  }
  else if (s === 6) { // Mohawk
    // Shaved sides (skin-colored)
    [-1,1].forEach(sd => {
      const shaved = mk(new THREE.SphereGeometry(r * 0.98, 16, 12), M.skin);
      shaved.position.set(sd * 0.06, hy, 0.01);
      shaved.scale.set(0.5, 0.7, 0.85);
      hg.add(shaved);
    });
    // Mohawk strip
    const strip = mk(new THREE.BoxGeometry(0.055, 0.0, 0.25), M.hair);
    strip.position.set(0, hy, 0);
    hg.add(strip);
    for (let i = 0; i < 6; i++) {
      const spike = mk(new THREE.ConeGeometry(0.022, 0.1 + Math.random()*0.05, 6), M.hair);
      spike.position.set(0, hy + 0.06 + Math.random()*0.02, 0.06 - i*0.04);
      spike.rotation.x = (Math.random()-0.5)*0.1;
      hg.add(spike);
    }
  }
  else if (s === 7) { // Afro
    const afro = mk(new THREE.SphereGeometry(r * 1.25, 24, 18), M.hair);
    afro.position.set(0, hy + 0.06, 0);
    afro.scale.set(1, 0.95, 1);
    hg.add(afro);
    // Texture bumps
    for (let i = 0; i < 20; i++) {
      const th = Math.random() * Math.PI;
      const ph = Math.random() * Math.PI * 2;
      const rr = r * 1.22;
      const bump = mk(new THREE.SphereGeometry(0.025 + Math.random()*0.015, 6, 6), M.hair);
      bump.position.set(
        Math.sin(th)*Math.cos(ph)*rr,
        hy + 0.06 + Math.cos(th)*rr*0.9,
        Math.sin(th)*Math.sin(ph)*rr
      );
      hg.add(bump);
    }
  }
  else if (s === 9) { // Quiff
    const top = mk(new THREE.SphereGeometry(r, 24, 16), M.hair);
    top.position.set(0, hy + 0.02, 0);
    top.scale.set(0.95, 0.65, 0.88);
    hg.add(top);
    // Front quiff
    const q = mk(new THREE.BoxGeometry(0.12, 0.07, 0.12), M.hair);
    q.position.set(0, hy + 0.1, 0.06);
    q.rotation.x = -0.35;
    hg.add(q);
    const qCap = mk(new THREE.SphereGeometry(0.075, 12, 8), M.hair);
    qCap.position.set(0, hy + 0.135, 0.055);
    qCap.scale.set(0.85, 0.65, 0.7);
    hg.add(qCap);
  }

  charGroup.add(hg);
}

// ── FACIAL HAIR ───────────────────────────────────────────────
function buildFacialHair(fat) {
  const s = S.facialHair;
  if (s === 0 || s === 6) return;

  const fhMat = new THREE.MeshStandardMaterial({ color: M.hair.color.clone(), roughness: 0.88, metalness: 0 });

  if (s === 1) { // 5 o'clock
    const stubble = mk(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: M.hair.color.clone(), roughness: 0.95, transparent: true, opacity: 0.35 }));
    stubble.scale.set(1, 0.48, 0.78);
    stubble.position.set(0, 1.615, 0.065);
    charGroup.add(stubble);
  }
  else if (s === 2) { // Goatee
    const g = mk(new THREE.BoxGeometry(0.048, 0.058, 0.02), fhMat);
    g.position.set(0, 1.603, 0.14);
    charGroup.add(g);
    const gCap = mk(new THREE.SphereGeometry(0.028, 10, 8), fhMat);
    gCap.scale.set(0.9, 0.65, 0.75);
    gCap.position.set(0, 1.59, 0.138);
    charGroup.add(gCap);
    const mst = mk(new THREE.BoxGeometry(0.086, 0.02, 0.015), fhMat);
    mst.position.set(0, 1.634, 0.142);
    charGroup.add(mst);
  }
  else if (s === 3) { // Circle beard
    const cb = mk(new THREE.SphereGeometry(0.052, 14, 10), fhMat);
    cb.scale.set(0.92, 0.95, 0.8);
    cb.position.set(0, 1.608, 0.11);
    charGroup.add(cb);
    const mst = mk(new THREE.BoxGeometry(0.075, 0.018, 0.015), fhMat);
    mst.position.set(0, 1.636, 0.14);
    charGroup.add(mst);
  }
  else if (s === 4) { // Full beard
    const bd = mk(new THREE.SphereGeometry(0.11, 18, 14), fhMat);
    bd.scale.set(0.9, 0.52, 0.76 + fat * 0.05);
    bd.position.set(0, 1.61, 0.062);
    charGroup.add(bd);
    // Cheek fill
    [-1,1].forEach(sd => {
      const cf = mk(new THREE.SphereGeometry(0.06, 12, 10), fhMat);
      cf.scale.set(0.55, 0.6, 0.55);
      cf.position.set(sd * 0.085, 1.632, 0.09);
      charGroup.add(cf);
    });
    const mst = mk(new THREE.BoxGeometry(0.1, 0.025, 0.016), fhMat);
    mst.position.set(0, 1.638, 0.14);
    charGroup.add(mst);
  }
  else if (s === 5) { // Handlebar
    [-1,1].forEach(sd => {
      const bar = mk(new THREE.CapsuleGeometry(0.009, 0.06, 4, 8), fhMat);
      bar.position.set(sd * 0.038, 1.636, 0.135);
      bar.rotation.z = sd * 0.3;
      charGroup.add(bar);
      const curl = mk(new THREE.TorusGeometry(0.018, 0.007, 6, 12, Math.PI), fhMat);
      curl.position.set(sd * 0.068, 1.626, 0.128);
      curl.rotation.z = sd * (Math.PI * 0.6);
      curl.rotation.x = 0.3;
      charGroup.add(curl);
    });
  }
}

// ── GLASSES ──────────────────────────────────────────────────
function buildGlasses(fat, headR) {
  const s = S.glassesStyle;
  if (s === 0) return;

  const gMat = new THREE.MeshStandardMaterial({ color: M.glassFrame.color.clone(), roughness: 0.25, metalness: 0.8 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0a1828, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.6 });

  const eyeY = 1.672, eyeZ = 0.13 + fat * 0.005;

  if (s === 1) { // Aviators
    [-1,1].forEach(sd => {
      // Lens (teardrop-ish, use ellipsoid)
      const lens = mk(new THREE.SphereGeometry(0.033, 16, 12), lensMat);
      lens.position.set(sd * 0.054, eyeY, eyeZ + 0.028);
      lens.scale.set(0.85, 0.98, 0.3);
      charGroup.add(lens);
      // Rim
      const rim = mk(new THREE.TorusGeometry(0.033, 0.004, 6, 28), gMat);
      rim.position.set(sd * 0.054, eyeY, eyeZ + 0.026);
      rim.scale.set(0.85, 0.98, 1);
      charGroup.add(rim);
    });
    // Bridge
    const bridge = mk(new THREE.CapsuleGeometry(0.003, 0.038, 4, 6), gMat);
    bridge.position.set(0, eyeY + 0.002, eyeZ + 0.024);
    bridge.rotation.z = Math.PI / 2;
    charGroup.add(bridge);
    // Arms
    [-1,1].forEach(sd => {
      const arm = mk(new THREE.BoxGeometry(0.005, 0.004, 0.1), gMat);
      arm.position.set(sd * 0.145, eyeY, eyeZ - 0.014);
      arm.rotation.y = sd * 0.08;
      charGroup.add(arm);
    });
  }
  else if (s === 2) { // Round
    [-1,1].forEach(sd => {
      const lens = mk(new THREE.SphereGeometry(0.028, 14, 12), lensMat);
      lens.position.set(sd * 0.054, eyeY, eyeZ + 0.026);
      lens.scale.set(0.9, 0.9, 0.28);
      charGroup.add(lens);
      const rim = mk(new THREE.TorusGeometry(0.029, 0.005, 8, 28), gMat);
      rim.position.set(sd * 0.054, eyeY, eyeZ + 0.025);
      rim.scale.set(0.9, 0.9, 1);
      charGroup.add(rim);
    });
    const bridge = mk(new THREE.CapsuleGeometry(0.003, 0.032, 4, 6), gMat);
    bridge.position.set(0, eyeY, eyeZ + 0.022);
    bridge.rotation.z = Math.PI / 2;
    charGroup.add(bridge);
  }
  else if (s === 3) { // Wayfarer
    [-1,1].forEach(sd => {
      const lens = mk(new THREE.BoxGeometry(0.058, 0.044, 0.01), lensMat);
      lens.position.set(sd * 0.054, eyeY, eyeZ + 0.026);
      charGroup.add(lens);
      // Frame
      const frm = mk(new THREE.BoxGeometry(0.062, 0.048, 0.008), gMat);
      frm.position.set(sd * 0.054, eyeY, eyeZ + 0.022);
      charGroup.add(frm);
      const frmI = mk(new THREE.BoxGeometry(0.054, 0.040, 0.01), new THREE.MeshStandardMaterial({ color: 0x000000 }));
      frmI.position.set(sd * 0.054, eyeY, eyeZ + 0.026);
      charGroup.add(frmI);
    });
  }
  else if (s === 4) { // Sports
    [-1,1].forEach(sd => {
      const lens = mk(new THREE.SphereGeometry(0.036, 14, 10), lensMat);
      lens.position.set(sd * 0.054, eyeY, eyeZ + 0.027);
      lens.scale.set(0.95, 0.7, 0.26);
      charGroup.add(lens);
    });
    // Wraparound frame
    const frame = mk(new THREE.BoxGeometry(0.175, 0.036, 0.01), gMat);
    frame.position.set(0, eyeY, eyeZ + 0.022);
    charGroup.add(frame);
  }
  else if (s === 5) { // Visor
    const visor = mk(new THREE.SphereGeometry(headR * 1.05, 16, 8, 0, Math.PI*2, Math.PI*0.35, Math.PI*0.18), new THREE.MeshStandardMaterial({ color: 0x001a2e, roughness: 0.02, metalness: 0.2, transparent: true, opacity: 0.5 }));
    visor.position.set(0, 1.74, 0.02);
    charGroup.add(visor);
  }
}

// ── HAT ──────────────────────────────────────────────────────
function buildHat(fat, headR) {
  const s = S.hatStyle;
  if (s === 0) return;

  const hatMat = new THREE.MeshStandardMaterial({ color: OUTFIT_COLS[S.hatColor] ? new THREE.Color(OUTFIT_COLS[S.hatColor]) : new THREE.Color(0x1a1a2e), roughness: 0.85, metalness: 0.02 });

  if (s === 1) { // Snapback
    const brim = mk(new THREE.CylinderGeometry(headR * 1.25, headR * 1.25, 0.022, 20), hatMat);
    brim.position.set(0, 1.79, 0.01);
    brim.scale.set(1, 1, 0.65);
    charGroup.add(brim);
    const crown = mk(new THREE.CylinderGeometry(headR * 0.99, headR * 1.04, 0.09, 20), hatMat);
    crown.position.set(0, 1.835, 0);
    charGroup.add(crown);
    const top = mk(new THREE.SphereGeometry(headR * 0.99, 16, 12, 0, Math.PI*2, 0, Math.PI*0.5), hatMat);
    top.position.set(0, 1.88, 0);
    charGroup.add(top);
    // Bill
    const bill = mk(new THREE.BoxGeometry(0.24, 0.016, 0.1), hatMat);
    bill.position.set(0, 1.784, headR * 0.95 + 0.04);
    bill.rotation.x = 0.05;
    charGroup.add(bill);
  }
  else if (s === 2) { // Beanie
    const beanie = mk(new THREE.SphereGeometry(headR * 1.06, 20, 16), hatMat);
    beanie.position.set(0, 1.74, 0);
    beanie.scale.set(1, 0.8, 0.95);
    charGroup.add(beanie);
    const fold = mk(new THREE.TorusGeometry(headR * 1.04, 0.022, 8, 28), hatMat);
    fold.rotation.x = Math.PI / 2;
    fold.position.set(0, 1.69, 0);
    charGroup.add(fold);
    const pom = mk(new THREE.SphereGeometry(0.032, 10, 8), hatMat);
    pom.position.set(0, 1.82, 0);
    charGroup.add(pom);
  }
  else if (s === 3) { // Fedora
    const brim = mk(new THREE.CylinderGeometry(headR * 1.45, headR * 1.45, 0.025, 24), hatMat);
    brim.position.set(0, 1.79, 0);
    charGroup.add(brim);
    const crown = mk(new THREE.CylinderGeometry(headR * 0.96, headR * 1.02, 0.12, 20), hatMat);
    crown.position.set(0, 1.845, 0);
    charGroup.add(crown);
    const crownTop = mk(new THREE.SphereGeometry(headR * 0.96, 16, 12, 0, Math.PI*2, 0, Math.PI*0.5), hatMat);
    crownTop.position.set(0, 1.905, 0);
    charGroup.add(crownTop);
    // Ribbon
    const ribbon = mk(new THREE.TorusGeometry(headR * 1.01, 0.015, 6, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.set(0, 1.8, 0);
    charGroup.add(ribbon);
  }
  else if (s === 4) { // Cap (curved bill)
    const crown = mk(new THREE.SphereGeometry(headR * 1.04, 20, 14, 0, Math.PI*2, 0, Math.PI*0.65), hatMat);
    crown.position.set(0, 1.73, 0);
    charGroup.add(crown);
    const bill = mk(new THREE.CylinderGeometry(0.12, 0.13, 0.015, 14, 1, false, -0.5, 2.1), hatMat);
    bill.position.set(0, 1.732, 0.065);
    bill.rotation.x = -0.15;
    charGroup.add(bill);
  }
  else if (s === 5) { // Beret
    const beret = mk(new THREE.SphereGeometry(headR * 1.12, 20, 14), hatMat);
    beret.position.set(-0.04, 1.78, 0.01);
    beret.scale.set(1.08, 0.5, 1.05);
    charGroup.add(beret);
  }
}

// ── JEWELRY ──────────────────────────────────────────────────
function buildJewelry(neckW) {
  const s = S.jewelryStyle;
  if (s === 0) return;

  if (s === 1 || s === 2) { // Chain / Pendant
    const chainY = 1.47;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = neckW * 1.15;
      const link = mk(new THREE.TorusGeometry(0.006, 0.002, 4, 8), M.chain);
      link.position.set(Math.cos(a)*r, chainY - Math.sin(a)*0.04, Math.sin(a)*r * 0.8);
      link.rotation.y = a;
      charGroup.add(link);
    }
    // Pendant
    if (s === 2) {
      const pend = mk(new THREE.BoxGeometry(0.022, 0.028, 0.005), M.chain);
      pend.position.set(0, 1.40, neckW * 1.1);
      charGroup.add(pend);
    }
  }
  else if (s === 3) { // Dog Tags
    const chain2 = mk(new THREE.CapsuleGeometry(0.004, 0.22, 4, 8), M.chain);
    chain2.position.set(0, 1.4, 0.05);
    charGroup.add(chain2);
    const tag = mk(new THREE.BoxGeometry(0.032, 0.044, 0.004), new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.2, metalness: 0.9 }));
    tag.position.set(0.008, 1.33, 0.08);
    tag.rotation.z = 0.1;
    charGroup.add(tag);
  }
  else if (s === 4) { // Pearl necklace
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = neckW * 1.12;
      const pearl = mk(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf8f0e8, roughness: 0.1, metalness: 0.0 }));
      pearl.position.set(Math.cos(a)*r, 1.47 - Math.sin(a)*0.025, Math.sin(a)*r * 0.75);
      charGroup.add(pearl);
    }
  }
  else if (s === 5) { // Choker
    const chokerGeo = new THREE.TorusGeometry(neckW * 1.08, 0.012, 8, 32);
    const choker = mk(chokerGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7, metalness: 0.0 }));
    choker.rotation.x = Math.PI / 2;
    choker.position.set(0, 1.52, 0);
    charGroup.add(choker);
  }
}

// ── APPLY COLORS ─────────────────────────────────────────────
function applyColors() {
  M.skin.color.set(SKIN_COLORS[S.skin]);
  M.skin.roughness = SKIN_ROUGH[S.skin] || 0.62;
  M.nose.color.set(new THREE.Color(SKIN_COLORS[S.skin]).multiplyScalar(0.94));
  M.hair.color.set(HAIR_COLORS[S.hairColor]);
  M.brow.color.set(HAIR_COLORS[S.hairColor]);
  M.eyeI.color.set(EYE_COLORS[S.eyeColor]);
  M.lip.color.set(new THREE.Color(SKIN_COLORS[S.skin]).lerp(new THREE.Color(0xc05050), 0.45));
  M.top.color.set(OUTFIT_COLS[S.topColor]);
  M.bot.color.set(OUTFIT_COLS[S.pantsColor]);
  M.shoe.color.set(OUTFIT_COLS[S.shoesColor]);
  // Update all material needsUpdate
  Object.values(M).forEach(m => { if (m && m.color) m.needsUpdate = true; });
}

// ── RESIZE ───────────────────────────────────────────────────
function resize() {
  const vp = document.querySelector('.cc-viewport');
  if (!vp) return;
  const w = vp.clientWidth, h = vp.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ── ANIMATE LOOP ─────────────────────────────────────────────
const clock    = new THREE.Clock();
const mixerClock = new THREE.Clock();
let glbMode    = false;
let animMixer  = null;
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Update bg shader
  bgMat.uniforms.uTime.value = t;
  pMat.uniforms.uTime.value  = t;

  // Glow rings pulse
  innerRing.material.emissiveIntensity = 2.5 + Math.sin(t * 2.2) * 0.8;
  outerRing.material.emissiveIntensity = 1.5 + Math.sin(t * 1.6 + 1) * 0.5;

  // Rim lights color shift
  const rimCycle = Math.sin(t * 0.4);
  rimL.intensity  = 1.8 + rimCycle * 0.4;
  rimL2.intensity = 1.0 - rimCycle * 0.3;

  // Character subtle idle (only in procedural mode)
  if (!glbMode) charGroup.position.y = Math.sin(t * 0.7) * 0.007;

  // Platform glow
  spot.intensity = 5.5 + Math.sin(t * 1.1) * 1.2;

  // GLB animation mixer
  if (animMixer && glbMode) animMixer.update(mixerClock.getDelta());

  controls.update();
  renderer.render(scene, camera);
}

// ── INITIAL BUILD ─────────────────────────────────────────────
buildCharacter();
applyColors();
animate();

// ════════════════════════════════════════════════════════════
//  UI LOGIC
// ════════════════════════════════════════════════════════════

const STEP_COUNT  = 7;
const STEP_PANELS = ['identity','face','hair','body','outfit','accessories','animations'];

// ── TROXT LOG ─────────────────────────────────────────────────
const logBody = document.querySelector('.cc-troxt-log-body');
const INIT_LOGS = [
  { t: 'TroxT Neural Core v2.0 — Online', c: '' },
  { t: 'Three.js PBR renderer initialized', c: '' },
  { t: 'Particle system active (280 nodes)', c: '' },
  { t: 'Character DNA generator loaded', c: 'success' },
  { t: 'Awaiting identity configuration…', c: 'warn' },
];
INIT_LOGS.forEach(l => addLog(l.t, l.c));

function addLog(msg, cls='') {
  if (!logBody) return;
  const line = document.createElement('div');
  line.className = 'cc-log-line';
  line.innerHTML = `<span class="log-prefix">▸</span><span class="log-text ${cls}">${msg}</span>`;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
  while (logBody.children.length > 24) logBody.removeChild(logBody.firstChild);
}

// ── TABS ─────────────────────────────────────────────────────
document.querySelectorAll('.cc-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cc-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById('panel-' + btn.dataset.panel);
    if (panel) panel.classList.add('active');
  });
});

// ── STEP NAVIGATION ──────────────────────────────────────────
function setStep(s) {
  S.step = Math.max(0, Math.min(STEP_COUNT - 1, s));
  document.querySelectorAll('.cc-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`[data-panel="${STEP_PANELS[S.step]}"]`);
  if (tab) tab.classList.add('active');
  const panel = document.getElementById('panel-' + STEP_PANELS[S.step]);
  if (panel) panel.classList.add('active');

  document.querySelectorAll('.cc-progress-dot').forEach((d, i) => {
    d.classList.toggle('active', i === S.step);
    d.classList.toggle('done', i < S.step);
  });
  document.querySelectorAll('.cc-step').forEach((el, i) => {
    el.classList.toggle('active', i === S.step);
    el.classList.toggle('done', i < S.step);
  });

  const confirmBtn = document.querySelector('.cc-btn-confirm');
  if (confirmBtn) {
    confirmBtn.classList.toggle('visible', S.step === STEP_COUNT - 1);
  }
}

document.querySelector('.cc-btn-prev')?.addEventListener('click', () => setStep(S.step - 1));
document.querySelector('.cc-btn-next')?.addEventListener('click', () => setStep(S.step + 1));
document.querySelectorAll('.cc-step').forEach((el, i) => el.addEventListener('click', () => setStep(i)));
setStep(0);

// ── HELPERS ──────────────────────────────────────────────────
function mkSwatches(sel, colors, key, rebuild=true) {
  const c = document.querySelector(sel);
  if (!c) return;
  c.innerHTML = '';
  colors.forEach((col, i) => {
    const sw = document.createElement('div');
    sw.className = 'cc-swatch' + (i === S[key] ? ' active' : '');
    sw.style.background = col;
    sw.title = col;
    sw.addEventListener('click', () => {
      c.querySelectorAll('.cc-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      S[key] = i;
      if (rebuild) { applyColors(); }
      updateSummary();
    });
    c.appendChild(sw);
  });
}

function mkGrid(sel, items, key, icons, onPick) {
  const c = document.querySelector(sel);
  if (!c) return;
  c.innerHTML = '';
  items.forEach((label, i) => {
    const el = document.createElement('div');
    el.className = 'cc-option' + (i === S[key] ? ' active' : '');
    el.innerHTML = icons ? `<span class="opt-icon">${icons[i]}</span>${label}` : label;
    el.addEventListener('click', () => {
      c.querySelectorAll('.cc-option').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      S[key] = i;
      onPick(i);
    });
    c.appendChild(el);
  });
}

function mkSlider(id, key, onPick) {
  const sl = document.getElementById('sl-'+id), vl = document.getElementById('sl-'+id+'-v');
  if (!sl) return;
  sl.value = S[key];
  setSlidePct(sl);
  if (vl) vl.textContent = S[key];
  sl.addEventListener('input', e => {
    S[key] = parseInt(e.target.value);
    if (vl) vl.textContent = S[key];
    setSlidePct(sl);
    onPick();
  });
}
function setSlidePct(sl) {
  const pct = ((sl.value - sl.min) / (sl.max - sl.min)) * 100;
  sl.style.setProperty('--pct', pct + '%');
}

function mkAccGrid(sel, items, icons, key, onPick) {
  const c = document.querySelector(sel);
  if (!c) return;
  c.innerHTML = '';
  items.forEach((label, i) => {
    const el = document.createElement('div');
    el.className = 'acc-card' + (i === S[key] ? ' active' : '');
    el.innerHTML = `<span class="acc-icon">${icons[i]}</span><span class="acc-name">${label}</span>`;
    el.addEventListener('click', () => {
      c.querySelectorAll('.acc-card').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      S[key] = i;
      onPick();
    });
    c.appendChild(el);
  });
}

// ── IDENTITY ─────────────────────────────────────────────────
document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.gender = btn.dataset.gender;
    buildCharacter(); applyColors();
    addLog(`Genre → ${S.gender === 'male' ? 'Masculin ♂' : 'Féminin ♀'}`);
    updateSummary();
  });
});

const nameInput = document.querySelector('.cc-name-input');
nameInput?.addEventListener('input', e => {
  S.name = e.target.value.toUpperCase() || 'NOUVEAU_PERSO';
  document.getElementById('vp-char-name')?.textContent && (document.getElementById('vp-char-name').textContent = S.name);
  document.querySelector('.cc-char-name-display') && (document.querySelector('.cc-char-name-display').textContent = S.name);
  updateSummary();
});

document.querySelector('#sel-nationality')?.addEventListener('change', e => {
  S.nationality = e.target.value;
  addLog(`Nationalité → ${e.target.options[e.target.selectedIndex].text}`);
  updateSummary();
});

mkSwatches('#sw-skin', SKIN_COLORS, 'skin', false);
document.querySelector('#sw-skin')?.addEventListener('click', () => {
  buildCharacter(); applyColors(); addLog('Teinte de peau mise à jour');
});

// ── FACE ─────────────────────────────────────────────────────
mkGrid('#grid-face-shape', FACE_SHAPES, 'faceShape',
  ['😐','🟥','⭕','🥚','💎','❤️'],
  () => { buildCharacter(); applyColors(); addLog(`Forme du visage → ${FACE_SHAPES[S.faceShape]}`); updateSummary(); }
);
mkSwatches('#sw-eye', EYE_COLORS, 'eyeColor', false);
document.querySelector('#sw-eye')?.addEventListener('click', () => { buildCharacter(); applyColors(); });

const faceSliders = [
  ['face-width','faceWidth'],['cheek-h','cheekH'],['jaw-w','jawWidth'],
  ['nose-size','noseSize'],['nose-bridge','noseBridge'],
  ['eye-size','eyeSize'],['eye-space','eyeSpacing'],['lip','lipSize']
];
faceSliders.forEach(([id,key]) => mkSlider(id, key, () => { buildCharacter(); applyColors(); }));

// ── HAIR ─────────────────────────────────────────────────────
const HAIR_ICONS = ['✂️','✂️','🔀','↩️','⬆️','🌊','⚡','🔵','🪩','☝️'];
mkGrid('#grid-hair-style', HAIR_STYLES, 'hairStyle', HAIR_ICONS, () => {
  buildCharacter(); applyColors(); addLog(`Coiffure → ${HAIR_STYLES[S.hairStyle]}`);
});
mkSwatches('#sw-hair-color', HAIR_COLORS, 'hairColor', false);
document.querySelector('#sw-hair-color')?.addEventListener('click', () => { buildCharacter(); applyColors(); });

const FH_ICONS = ['😊','🧔','🧔','⭕','🧔','〰️','🔘'];
mkGrid('#grid-facial', FACIAL_HAIR, 'facialHair', FH_ICONS, () => {
  buildCharacter(); applyColors(); addLog(`Pilosité → ${FACIAL_HAIR[S.facialHair]}`);
});

// ── BODY ─────────────────────────────────────────────────────
const BODY_ICONS = ['🪄','👤','💪','🏋️','🐘'];
mkGrid('#grid-body-type', BODY_TYPES, 'bodyType', BODY_ICONS, i => {
  const presets = [[25,22,25],[40,45,30],[55,75,28],[60,50,55],[45,35,80]];
  [S.height, S.muscular, S.fatness] = [50, presets[i][1], presets[i][2]];
  ['height','muscular','fatness'].forEach(k => {
    const sl = document.getElementById('sl-'+k);
    if (sl) { sl.value = S[k]; setSlidePct(sl); }
    const vl = document.getElementById('sl-'+k+'-v');
    if (vl) vl.textContent = S[k];
  });
  buildCharacter(); applyColors();
  addLog(`Morphologie → ${BODY_TYPES[S.bodyType]}`, 'success'); updateSummary();
});
mkSlider('height', 'height', () => { buildCharacter(); applyColors(); updateSummary(); });
mkSlider('muscular','muscular',() => { buildCharacter(); applyColors(); });
mkSlider('fatness', 'fatness', () => { buildCharacter(); applyColors(); });

// ── OUTFIT ────────────────────────────────────────────────────
const TOP_ICONS  = ['👕','🧥','👔','💥','🎽','🤵','🐢','🧶'];
const PANT_ICONS = ['👖','👖','🩳','🩱','🎒','👔','🩳'];
const SHOE_ICONS = ['👟','👢','👞','🩴','👟','🥿','🥾'];

mkGrid('#grid-top-style', TOPS, 'topStyle', TOP_ICONS, () => {
  applyColors(); addLog(`Haut → ${TOPS[S.topStyle]}`); updateSummary();
});
mkSwatches('#sw-top-color', OUTFIT_COLS, 'topColor');

mkGrid('#grid-pants-style', PANTS, 'pantsStyle', PANT_ICONS, () => {
  applyColors(); addLog(`Bas → ${PANTS[S.pantsStyle]}`); updateSummary();
});
mkSwatches('#sw-pants-color', OUTFIT_COLS, 'pantsColor');

mkGrid('#grid-shoes-style', SHOES, 'shoesStyle', SHOE_ICONS, () => {
  applyColors(); addLog(`Chaussures → ${SHOES[S.shoesStyle]}`); updateSummary();
});
mkSwatches('#sw-shoes-color', OUTFIT_COLS, 'shoesColor');

// ── ACCESSORIES ───────────────────────────────────────────────
const GL_ICONS  = ['🚫','🕶️','⭕','🔲','🏃','👓'];
const HAT_ICONS = ['🚫','🧢','🎿','🎩','🧢','🎨'];
const JW_ICONS  = ['🚫','⛓️','📿','🪖','📿','🖤'];

mkAccGrid('#grid-glasses', ACC_GLASSES, GL_ICONS, 'glassesStyle', () => {
  buildCharacter(); applyColors(); addLog(`Lunettes → ${ACC_GLASSES[S.glassesStyle]}`); updateSummary();
});
mkSwatches('#sw-glasses-color', OUTFIT_COLS, 'glassesColor', false);
document.querySelector('#sw-glasses-color')?.addEventListener('click', () => { buildCharacter(); applyColors(); });

mkAccGrid('#grid-hat', ACC_HATS, HAT_ICONS, 'hatStyle', () => {
  buildCharacter(); applyColors(); addLog(`Couvre-chef → ${ACC_HATS[S.hatStyle]}`); updateSummary();
});
mkSwatches('#sw-hat-color', OUTFIT_COLS, 'hatColor', false);
document.querySelector('#sw-hat-color')?.addEventListener('click', () => { buildCharacter(); applyColors(); });

mkAccGrid('#grid-jewelry', ACC_JEWELRY, JW_ICONS, 'jewelryStyle', () => {
  buildCharacter(); applyColors(); addLog(`Bijoux → ${ACC_JEWELRY[S.jewelryStyle]}`); updateSummary();
});

// ── RANDOM ────────────────────────────────────────────────────
document.getElementById('btn-random')?.addEventListener('click', () => {
  const rnd = (arr) => Math.floor(Math.random() * arr.length);
  S.skin       = rnd(SKIN_COLORS);
  S.hairStyle  = rnd(HAIR_STYLES);
  S.hairColor  = rnd(HAIR_COLORS);
  S.eyeColor   = rnd(EYE_COLORS);
  S.faceShape  = rnd(FACE_SHAPES);
  S.bodyType   = rnd(BODY_TYPES);
  S.facialHair = rnd(FACIAL_HAIR);
  S.topStyle   = rnd(TOPS);  S.topColor  = rnd(OUTFIT_COLS);
  S.pantsStyle = rnd(PANTS); S.pantsColor= rnd(OUTFIT_COLS);
  S.shoesStyle = rnd(SHOES); S.shoesColor= rnd(OUTFIT_COLS);
  S.glassesStyle= Math.random() > 0.55 ? rnd(ACC_GLASSES) : 0;
  S.hatStyle    = Math.random() > 0.6 ? rnd(ACC_HATS) : 0;
  S.jewelryStyle= Math.random() > 0.5 ? rnd(ACC_JEWELRY) : 0;
  S.height   = 30 + Math.floor(Math.random() * 60);
  const bt = rnd(BODY_TYPES);
  S.bodyType = bt;
  const presets = [[25,22,25],[40,45,30],[55,75,28],[60,50,55],[45,35,80]];
  [, S.muscular, S.fatness] = [50, presets[bt][1], presets[bt][2]];
  S.faceWidth = 30 + Math.random()*40; S.cheekH = 30+Math.random()*40;
  S.jawWidth  = 30 + Math.random()*40; S.noseSize = 35+Math.random()*30;
  S.noseBridge= 35 + Math.random()*30; S.eyeSize = 35+Math.random()*30;
  S.eyeSpacing= 35 + Math.random()*30; S.lipSize = 35+Math.random()*30;
  rebuildAll();
  buildCharacter(); applyColors(); updateSummary();
  addLog('🎲 TroxT: Personnage aléatoire généré', 'success');
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  Object.assign(S, {
    skin:1, faceShape:0, eyeColor:0, noseBridge:50, noseSize:50, faceWidth:50,
    cheekH:50, jawWidth:50, eyeSize:50, eyeSpacing:50, lipSize:50,
    hairStyle:1, hairColor:0, facialHair:0, bodyType:1, height:50, muscular:45, fatness:30,
    topStyle:0, topColor:1, pantsStyle:0, pantsColor:1, shoesStyle:0, shoesColor:0,
    glassesStyle:0, hatStyle:0, jewelryStyle:0, glassesColor:0, hatColor:1,
  });
  rebuildAll();
  buildCharacter(); applyColors(); updateSummary();
  addLog('↺ Personnage réinitialisé');
});

function rebuildAll() {
  mkSwatches('#sw-skin', SKIN_COLORS, 'skin', false);
  mkSwatches('#sw-eye', EYE_COLORS, 'eyeColor', false);
  mkSwatches('#sw-hair-color', HAIR_COLORS, 'hairColor', false);
  mkSwatches('#sw-top-color', OUTFIT_COLS, 'topColor');
  mkSwatches('#sw-pants-color', OUTFIT_COLS, 'pantsColor');
  mkSwatches('#sw-shoes-color', OUTFIT_COLS, 'shoesColor');
  mkSwatches('#sw-glasses-color', OUTFIT_COLS, 'glassesColor', false);
  mkSwatches('#sw-hat-color', OUTFIT_COLS, 'hatColor', false);
  mkGrid('#grid-face-shape', FACE_SHAPES, 'faceShape', ['😐','🟥','⭕','🥚','💎','❤️'], () => { buildCharacter(); applyColors(); updateSummary(); });
  mkGrid('#grid-body-type', BODY_TYPES, 'bodyType', BODY_ICONS, () => { buildCharacter(); applyColors(); updateSummary(); });
  mkGrid('#grid-hair-style', HAIR_STYLES, 'hairStyle', HAIR_ICONS, () => { buildCharacter(); applyColors(); });
  mkGrid('#grid-facial', FACIAL_HAIR, 'facialHair', FH_ICONS, () => { buildCharacter(); applyColors(); });
  mkGrid('#grid-top-style', TOPS, 'topStyle', TOP_ICONS, () => { applyColors(); updateSummary(); });
  mkGrid('#grid-pants-style', PANTS, 'pantsStyle', PANT_ICONS, () => { applyColors(); updateSummary(); });
  mkGrid('#grid-shoes-style', SHOES, 'shoesStyle', SHOE_ICONS, () => { applyColors(); updateSummary(); });
  mkAccGrid('#grid-glasses', ACC_GLASSES, GL_ICONS, 'glassesStyle', () => { buildCharacter(); applyColors(); updateSummary(); });
  mkAccGrid('#grid-hat', ACC_HATS, HAT_ICONS, 'hatStyle', () => { buildCharacter(); applyColors(); updateSummary(); });
  mkAccGrid('#grid-jewelry', ACC_JEWELRY, JW_ICONS, 'jewelryStyle', () => { buildCharacter(); applyColors(); updateSummary(); });
  faceSliders.forEach(([id,key]) => mkSlider(id, key, () => { buildCharacter(); applyColors(); }));
  mkSlider('height','height',()=>{ buildCharacter(); applyColors(); updateSummary(); });
  mkSlider('muscular','muscular',()=>{ buildCharacter(); applyColors(); });
  mkSlider('fatness','fatness',()=>{ buildCharacter(); applyColors(); });
  if (nameInput) nameInput.value = S.name;
}

// ── SUMMARY ───────────────────────────────────────────────────
function updateSummary() {
  const nameD = document.querySelector('.cc-char-name-display');
  if (nameD) nameD.textContent = S.name;
  const idD = document.querySelector('.cc-char-id');
  if (idD) idD.textContent = `ID: EW-${String(Date.now()).slice(-6)} • ${S.nationality.toUpperCase()}`;
  const vpN = document.getElementById('vp-char-name');
  if (vpN) vpN.textContent = S.name;

  const traits = {
    'trait-gender': S.gender === 'male' ? '♂ Masculin' : '♀ Féminin',
    'trait-face':   FACE_SHAPES[S.faceShape],
    'trait-body':   BODY_TYPES[S.bodyType],
    'trait-top':    TOPS[S.topStyle],
    'trait-pants':  PANTS[S.pantsStyle],
    'trait-shoes':  SHOES[S.shoesStyle],
    'trait-acc':    [
      S.glassesStyle > 0 ? ACC_GLASSES[S.glassesStyle] : null,
      S.hatStyle > 0 ? ACC_HATS[S.hatStyle] : null,
      S.jewelryStyle > 0 ? ACC_JEWELRY[S.jewelryStyle] : null,
    ].filter(Boolean).join(', ') || 'Aucun',
  };
  Object.entries(traits).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  // Stat bars
  [['stat-height','height','cyan'],['stat-muscle','muscular','purple'],['stat-weight','fatness','gold']].forEach(([id,key,cls]) => {
    const fill = document.getElementById(id+'-fill');
    const txt  = document.getElementById(id+'-txt');
    if (fill) { fill.style.width = S[key]+'%'; fill.className = 'cc-stat-fill '+cls; }
    if (txt)  txt.textContent = S[key]+'%';
  });
}
updateSummary();

// ── CONFIRM MODAL ─────────────────────────────────────────────
const modal     = document.querySelector('.cc-modal-overlay');
const spawnAnim = document.querySelector('.cc-spawn-anim');

document.querySelector('.cc-btn-confirm')?.addEventListener('click', () => {
  document.querySelector('.cc-modal-char-name').textContent = S.name;
  const fields = {
    'modal-gender': S.gender === 'male' ? '♂ Masculin' : '♀ Féminin',
    'modal-face':   FACE_SHAPES[S.faceShape],
    'modal-body':   BODY_TYPES[S.bodyType],
    'modal-hair':   HAIR_STYLES[S.hairStyle],
    'modal-top':    TOPS[S.topStyle],
    'modal-pants':  PANTS[S.pantsStyle],
    'modal-shoes':  SHOES[S.shoesStyle],
    'modal-acc':    [ACC_GLASSES[S.glassesStyle] !== 'None' ? ACC_GLASSES[S.glassesStyle] : '', ACC_HATS[S.hatStyle] !== 'None' ? ACC_HATS[S.hatStyle] : ''].filter(Boolean).join(', ') || '—',
    'modal-id':     `EW-${String(Date.now()).slice(-6)}`,
    'modal-server': 'EtherWorld RP',
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
  modal.classList.add('visible');
  addLog('⚡ Confirmation du personnage en cours…', 'warn');
});

document.querySelector('.cc-modal-cancel')?.addEventListener('click', () => modal.classList.remove('visible'));

document.querySelector('.cc-modal-spawn')?.addEventListener('click', () => {
  modal.classList.remove('visible');
  spawnAnim.classList.add('active');
  addLog(`✅ "${S.name}" enregistré dans EtherPrism!`, 'success');
  addLog('TroxT: Synchronisation avec la base de données…', 'success');
  setTimeout(() => { spawnAnim.classList.remove('active'); }, 3200);
});

// ── AUTO-ROTATE PAUSE ─────────────────────────────────────────
let rotTimeout;
canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });
canvas.addEventListener('pointerup',   () => {
  clearTimeout(rotTimeout);
  rotTimeout = setTimeout(() => { controls.autoRotate = true; }, 5000);
});

// ── KEYBOARD ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') setStep(S.step + 1);
  if (e.key === 'ArrowLeft')  setStep(S.step - 1);
  if (e.key === 'Escape')     modal.classList.remove('visible');
  if ((e.key === 'r' || e.key === 'R') && !e.target.matches('input, select, textarea')) {
    document.getElementById('btn-random')?.click();
  }
});

// ════════════════════════════════════════════════════════════
//  GLB / ANIMATION SYSTEM  — Three.js Additive Blending
//  Translated from React Three Fiber (useGLTF, useAnimations)
//  to vanilla Three.js AnimationMixer + GLTFLoader
// ════════════════════════════════════════════════════════════

const XBOT_URL   = 'https://threejs.org/examples/models/gltf/Xbot.glb';
const gltfLoader = new GLTFLoader();

// GLB scene group (sits alongside charGroup in scene)
const glbGroup = new THREE.Group();
scene.add(glbGroup);
glbGroup.visible = false;

let animActions = {};          // keyed by lowercase clip name
let baseActionName  = 'idle';
let xbotAnimations  = null;    // cached Xbot clips for retargeting
let animPlaybackSpeed = 1;

// Additive weights state
const additiveWeights = { sad_pose: 0, sneak_pose: 0, agree: 0, headShake: 0 };

// ── LOADING OVERLAY ───────────────────────────────────────────
const vpLoading    = document.getElementById('vp-loading');
const vpLoadingTxt = document.getElementById('vp-loading-text');
const glbBadge     = document.getElementById('vp-glb-badge');
const animPanel    = document.getElementById('panel-animations');

function showLoading(msg = 'Chargement du modèle…') {
  if (vpLoading)    { vpLoadingTxt.textContent = msg; vpLoading.classList.add('active'); }
  setModelDot('loading');
}
function hideLoading() {
  if (vpLoading) vpLoading.classList.remove('active');
}
function setModelDot(mode) { // 'procedural' | 'glb' | 'loading'
  const dot  = document.querySelector('.model-dot');
  const text = document.getElementById('model-mode-text');
  if (!dot) return;
  dot.className = 'model-dot ' + mode;
  if (text) {
    const labels = {
      procedural: 'Mode : Personnage procédural',
      glb:        'Mode : Modèle GLB animé',
      loading:    'Mode : Chargement en cours…'
    };
    text.textContent = labels[mode] || '';
  }
}
function setAnimPanelActive(active) {
  if (animPanel) animPanel.classList.toggle('glb-active', active);
}

// ── SWITCH TO PROCEDURAL ──────────────────────────────────────
function switchToProcedural() {
  if (animMixer) { animMixer.stopAllAction(); animMixer = null; }
  animActions = {}; baseActionName = 'idle';
  glbMode = false;
  glbGroup.visible  = false;
  charGroup.visible = true;
  if (glbBadge) glbBadge.classList.remove('visible');
  setModelDot('procedural');
  setAnimPanelActive(false);
  document.getElementById('anim-info-source').textContent = 'Procédural';
  controls.target.set(0, 1.05, 0);
  controls.update();
  addLog('⚙️ Mode procédural restauré', '');
  // Reset base action buttons
  document.querySelectorAll('.cc-anim-action-btn').forEach(b => b.classList.toggle('active', b.dataset.action === 'idle'));
  baseActionName = 'idle';
  // Reset additive sliders
  resetAdditiveSliders();
  // Mark model buttons
  document.querySelectorAll('.cc-model-btn').forEach(b => b.classList.remove('active'));
}

function resetAdditiveSliders() {
  ['sad','sneak','agree','headshake'].forEach(k => {
    const sl = document.getElementById('sl-' + k);
    const vl = document.getElementById('sl-' + k + '-v');
    if (sl) { sl.value = 0; setSlidePct(sl); }
    if (vl) vl.textContent = '0';
  });
  Object.keys(additiveWeights).forEach(k => additiveWeights[k] = 0);
}

// ── SETUP ADDITIVE ANIMATIONS ─────────────────────────────────
function setupAnimations(clips, targetObject) {
  animActions = {};
  if (animMixer) animMixer.stopAllAction();
  animMixer = new THREE.AnimationMixer(targetObject);

  const idleClip = clips.find(c => c.name.toLowerCase() === 'idle');
  if (!idleClip) { addLog('⚠️ Clip "idle" introuvable', 'warn'); return; }

  const ADDITIVE_NAMES = ['sad_pose', 'sneak_pose', 'agree', 'headshake'];
  const BASE_NAMES     = ['idle', 'walk', 'run'];

  clips.forEach(clip => {
    const nameLow = clip.name.toLowerCase();

    if (ADDITIVE_NAMES.includes(nameLow)) {
      // For _pose clips: subclip frames 2–3 as a static reference frame
      let additiveClip = clip;
      if (nameLow.endsWith('_pose')) {
        additiveClip = THREE.AnimationUtils.subclip(clip, clip.name, 2, 3, 30);
      }
      // Make the clip additive relative to idle's rest pose
      THREE.AnimationUtils.makeClipAdditive(additiveClip, 0, idleClip);

      const action = animMixer.clipAction(additiveClip);
      action.enabled  = true;
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(0);
      action.blendMode = THREE.AdditiveAnimationBlendMode;
      action.play();
      animActions[nameLow] = action;
    }

    if (BASE_NAMES.includes(nameLow)) {
      const action = animMixer.clipAction(clip);
      action.enabled = true;
      action.setEffectiveTimeScale(animPlaybackSpeed);
      action.setEffectiveWeight(nameLow === baseActionName ? 1 : 0);
      action.play();
      animActions[nameLow] = action;
    }
  });

  addLog(`✅ ${Object.keys(animActions).length} actions chargées`, 'success');
  addLog('Additive blending actif : sad / sneak / agree / headShake', '');
  setAnimPanelActive(true);
}

// ── LOAD GLB ─────────────────────────────────────────────────
function loadGLB(url, label = 'GLB', isXbot = false) {
  showLoading(`Chargement ${label}…`);
  addLog(`📡 Connexion : ${label}`, 'warn');

  gltfLoader.load(
    url,
    (gltf) => {
      // Clear previous GLB content
      while (glbGroup.children.length) glbGroup.remove(glbGroup.children[0]);

      const model = gltf.scene;
      model.traverse(obj => {
        if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
      });

      // Xbot needs scaling (Mixamo units: cm → m)
      if (isXbot) {
        model.scale.set(0.01, 0.01, 0.01);
        model.rotation.x = Math.PI / 2;
        xbotAnimations = gltf.animations;
      }

      glbGroup.add(model);

      // Switch scene to GLB mode
      charGroup.visible = false;
      glbGroup.visible  = true;
      glbMode = true;

      // Camera retarget
      controls.target.set(0, 0.9, 0);
      controls.update();

      if (glbBadge) glbBadge.classList.add('visible');
      setModelDot('glb');
      document.getElementById('anim-info-source').textContent = label;

      // Set up animations
      const clips = gltf.animations.length > 0 ? gltf.animations : (xbotAnimations || []);
      if (clips.length > 0) {
        setupAnimations(clips, model);
      } else {
        addLog('ℹ️ Aucune animation dans ce GLB', 'warn');
        setAnimPanelActive(false);
      }

      hideLoading();
      addLog(`✅ "${label}" chargé avec succès`, 'success');
    },
    (progress) => {
      if (progress.total > 0) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        if (vpLoadingTxt) vpLoadingTxt.textContent = `Chargement ${label}… ${pct}%`;
      }
    },
    (err) => {
      hideLoading();
      setModelDot('procedural');
      addLog(`❌ Erreur chargement: ${err.message || 'CORS/réseau'}`, 'warn');
      console.error('[GLB Loader]', err);
    }
  );
}

// ── SWITCH BASE ACTION ─────────────────────────────────────────
function switchBaseAction(name) {
  if (!animMixer || name === baseActionName) return;
  const prev = animActions[baseActionName];
  const next = animActions[name];
  if (!prev || !next) { addLog(`⚠️ Action "${name}" non trouvée`, 'warn'); return; }

  next.enabled = true;
  next.setEffectiveTimeScale(animPlaybackSpeed);
  next.setEffectiveWeight(1);
  next.time = 0;
  prev.crossFadeTo(next, 0.5, true);
  baseActionName = name;

  document.querySelectorAll('.cc-anim-action-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.action === name)
  );
  addLog(`▶ Animation de base → ${name}`, '');
}

// ── UI: BASE ACTIONS ──────────────────────────────────────────
document.querySelectorAll('.cc-anim-action-btn').forEach(btn => {
  btn.addEventListener('click', () => switchBaseAction(btn.dataset.action));
});

// ── UI: ADDITIVE SLIDERS ──────────────────────────────────────
const additiveMap = {
  'sl-sad':       'sad_pose',
  'sl-sneak':     'sneak_pose',
  'sl-agree':     'agree',
  'sl-headshake': 'headshake',
};
Object.entries(additiveMap).forEach(([slId, clipName]) => {
  const sl = document.getElementById(slId);
  const vl = document.getElementById(slId + '-v');
  if (!sl) return;
  sl.addEventListener('input', () => {
    const weight = parseInt(sl.value) / 100;
    additiveWeights[clipName] = weight;
    if (vl) vl.textContent = sl.value;
    setSlidePct(sl);
    // Apply immediately to mixer
    const action = animActions[clipName];
    if (action) action.setEffectiveWeight(weight);
  });
});

// ── UI: PLAYBACK SPEED ────────────────────────────────────────
const slSpeed = document.getElementById('sl-speed');
const slSpeedV = document.getElementById('sl-speed-v');
if (slSpeed) {
  slSpeed.addEventListener('input', () => {
    animPlaybackSpeed = parseInt(slSpeed.value) / 100;
    if (slSpeedV) slSpeedV.textContent = slSpeed.value;
    setSlidePct(slSpeed);
    // Apply to all base actions
    ['idle','walk','run'].forEach(name => {
      const action = animActions[name];
      if (action) action.setEffectiveTimeScale(animPlaybackSpeed);
    });
  });
}

// ── UI: XBOT BUTTON ──────────────────────────────────────────
document.getElementById('btn-xbot')?.addEventListener('click', () => {
  document.querySelectorAll('.cc-model-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-xbot').classList.add('active');
  addLog('🤖 Chargement Xbot (Mixamo / threejs.org)…', 'warn');
  loadGLB(XBOT_URL, 'Xbot Mixamo', true);
});

// ── UI: GLB FILE UPLOAD ───────────────────────────────────────
document.getElementById('input-glb-upload')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  document.querySelectorAll('.cc-model-btn').forEach(b => b.classList.remove('active'));
  e.target.parentElement.classList.add('active');
  addLog(`📁 Fichier GLB : ${file.name}`, '');
  loadGLB(url, file.name.replace('.glb',''), false);
});

// ── UI: READY PLAYER ME ───────────────────────────────────────
document.getElementById('btn-rpm')?.addEventListener('click', () => {
  const rpmUrl = prompt(
    '🌐 Coller l\'URL GLB de Ready Player Me :\n(ex: https://models.readyplayer.me/VOTRE_ID.glb)',
    'https://models.readyplayer.me/'
  );
  if (!rpmUrl || !rpmUrl.includes('.glb')) {
    addLog('⚠️ URL invalide (doit finir par .glb)', 'warn'); return;
  }
  document.querySelectorAll('.cc-model-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-rpm').classList.add('active');
  addLog('🌐 Chargement avatar Ready Player Me…', 'warn');
  loadGLB(rpmUrl, 'RPM Avatar', false);
});

// ── UI: IMAGE → 3D (simulation) ───────────────────────────────
document.getElementById('input-img-upload')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  showLoading('Analyse de l\'image…');
  addLog('🖼️ Image reçue — pipeline Image-to-3D simulé', 'warn');
  addLog('⏳ Connexion à TroxT 3D Neural Engine…', '');

  // Simulate a multi-step fake pipeline (Hunyuan3D / TripoSR style)
  const steps = [
    [800,  '🔬 Segmentation de l\'image…'],
    [1600, '🧠 Estimation de profondeur…'],
    [2400, '🔷 Construction du mesh 3D…'],
    [3200, '✨ Application des textures PBR…'],
    [4000, '📦 Compilation du fichier GLB…'],
  ];
  steps.forEach(([delay, msg]) => {
    setTimeout(() => { if (vpLoadingTxt) vpLoadingTxt.textContent = msg; addLog(msg, ''); }, delay);
  });

  setTimeout(() => {
    hideLoading();
    addLog('⚠️ Note : pipeline Image-to-3D nécessite un serveur GPU (ex: Hunyuan3D, TripoSR)', 'warn');
    addLog('💡 Chargement du fallback : Xbot pour la démo', '');
    document.getElementById('btn-xbot')?.click();
  }, 4600);
});

// ── UI: BACK TO PROCEDURAL ────────────────────────────────────
document.getElementById('btn-procedural')?.addEventListener('click', () => {
  switchToProcedural();
  document.getElementById('btn-xbot')?.classList.remove('active');
});

// ════════════════════════════════════════════════════════════
//  EXPORT & SHARE SYSTEM
//  JSON download · URL share link · Raw code viewer
//  URL hash format: #char=<base64(JSON)>
// ════════════════════════════════════════════════════════════

const exportModal    = document.getElementById('export-modal');
const exportToast    = document.getElementById('export-toast');
const exportRawBox   = document.getElementById('export-raw-box');
const exportRawPre   = document.getElementById('export-raw-pre');
let   rawVisible     = false;
let   toastTimer     = null;

// ── BUILD EXPORT PAYLOAD ──────────────────────────────────────
function buildExportPayload() {
  const { step: _s, ...charData } = S;      // omit UI step
  return {
    _ew_version: '2.0',
    _exported:   new Date().toISOString(),
    _server:     'EtherWorld RP',
    character:   charData,
    glbMode:     glbMode,
    baseAction:  baseActionName,
  };
}

// ── SHOW TOAST ────────────────────────────────────────────────
function showExportToast(msg, isError = false) {
  if (!exportToast) return;
  exportToast.textContent = msg;
  exportToast.className   = 'cc-export-toast visible' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { exportToast.className = 'cc-export-toast'; }, 2800);
}

// ── UPDATE MODAL PREVIEW ──────────────────────────────────────
function updateExportPreview() {
  const el = document.getElementById('export-preview-name');
  const id = document.getElementById('export-preview-id');
  const tags = document.getElementById('export-preview-tags');
  if (el) el.textContent = S.name || 'NOUVEAU_PERSO';
  if (id) id.textContent = `EW-${String(Date.now()).slice(-6)} · EtherWorld RP`;
  if (tags) {
    const FACE_SHAPES = ['Regular', 'Ovale', 'Carré', 'Oblong', 'Coeur', 'Losange'];
    const TOPS = ['Débardeur','T-Shirt','Chemise','Hoodie','Veste','Manteau','Costume','No Top'];
    const tagList = [
      S.gender === 'male' ? '♂ Masculin' : '♀ Féminin',
      FACE_SHAPES[S.faceShape] || 'Regular',
      TOPS[S.topStyle] || 'T-Shirt',
      glbMode ? '⬡ GLB Animé' : '⚙ Procédural',
    ];
    tags.innerHTML = tagList.map(t => `<span class="exp-tag">${t}</span>`).join('');
  }
}

// ── OPEN / CLOSE EXPORT MODAL ─────────────────────────────────
function openExportModal() {
  updateExportPreview();
  rawVisible = false;
  if (exportRawBox) exportRawBox.style.display = 'none';
  const btn = document.getElementById('btn-toggle-raw');
  if (btn) btn.textContent = '👁 Voir';
  if (exportToast) exportToast.className = 'cc-export-toast';
  exportModal?.classList.add('visible');
  addLog('📤 Panneau Export ouvert', '');
}
function closeExportModal() { exportModal?.classList.remove('visible'); }

document.getElementById('btn-export-modal')?.addEventListener('click', openExportModal);
document.getElementById('btn-export-close')?.addEventListener('click', closeExportModal);
exportModal?.addEventListener('click', (e) => { if (e.target === exportModal) closeExportModal(); });

// ── JSON DOWNLOAD ─────────────────────────────────────────────
function downloadJSON() {
  const payload  = buildExportPayload();
  const jsonStr  = JSON.stringify(payload, null, 2);
  const blob     = new Blob([jsonStr], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  const safeName = (S.name || 'perso').replace(/[^a-z0-9_-]/gi, '_');
  a.href     = url;
  a.download = `ew_char_${safeName}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showExportToast('✅ Fichier JSON téléchargé !');
  addLog(`💾 Export JSON : ew_char_${safeName}.json`, 'success');
}

document.getElementById('btn-export-json')?.addEventListener('click', downloadJSON);
document.getElementById('btn-dl-json')?.addEventListener('click',      downloadJSON);

// ── SHARE LINK ────────────────────────────────────────────────
function buildShareURL() {
  const payload  = buildExportPayload();
  const encoded  = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const baseURL  = window.location.origin + window.location.pathname;
  return `${baseURL}#char=${encoded}`;
}

async function copyShareLink() {
  const shareURL = buildShareURL();
  const btn = document.getElementById('btn-copy-link');
  try {
    await navigator.clipboard.writeText(shareURL);
    if (btn) { btn.textContent = '✅ Copié !'; btn.classList.add('copied'); }
    showExportToast('🔗 Lien copié dans le presse-papier !');
    addLog('🔗 Lien de partage copié', 'success');
    setTimeout(() => {
      if (btn) { btn.textContent = '📋 Copier'; btn.classList.remove('copied'); }
    }, 2500);
  } catch (_) {
    // Fallback: show URL in prompt
    prompt('Copier ce lien :', shareURL);
    showExportToast('🔗 Lien généré — copiez depuis la boîte', '');
  }
}

document.getElementById('btn-share-link')?.addEventListener('click', () => { openExportModal(); copyShareLink(); });
document.getElementById('btn-copy-link')?.addEventListener('click',  copyShareLink);

// ── RAW JSON VIEWER ───────────────────────────────────────────
document.getElementById('btn-toggle-raw')?.addEventListener('click', () => {
  rawVisible = !rawVisible;
  if (!exportRawBox || !exportRawPre) return;
  if (rawVisible) {
    const payload = buildExportPayload();
    exportRawPre.textContent = JSON.stringify(payload, null, 2);
    exportRawBox.style.display = 'block';
    document.getElementById('btn-toggle-raw').textContent = '✕ Fermer';
  } else {
    exportRawBox.style.display = 'none';
    document.getElementById('btn-toggle-raw').textContent = '👁 Voir';
  }
});

// ── LOAD FROM URL HASH ────────────────────────────────────────
(function loadFromHash() {
  const hash = window.location.hash;
  if (!hash.startsWith('#char=')) return;
  try {
    const encoded = hash.slice(6);
    const json    = decodeURIComponent(escape(atob(encoded)));
    const data    = JSON.parse(json);
    const char    = data.character || data;

    // Merge into S (only valid keys)
    const validKeys = Object.keys(S);
    validKeys.forEach(k => {
      if (k !== 'step' && char[k] !== undefined) S[k] = char[k];
    });

    // Rebuild character after DOM ready
    setTimeout(() => {
      buildCharacter();
      applyColors();
      const charNameEl = document.getElementById('vp-char-name');
      if (charNameEl && S.name) charNameEl.textContent = S.name.toUpperCase();
      addLog(`🔗 Personnage restauré depuis le lien : ${S.name}`, 'success');
      addLog(`Source : ${data._server || 'EtherWorld RP'} — v${data._ew_version || '?'}`, '');
      // Clean hash from URL without reload
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }, 400);
  } catch (err) {
    console.warn('[EW Export] Impossible de charger depuis le hash:', err);
    addLog('⚠️ Lien de partage invalide ou expiré', 'warn');
  }
})();

// ════════════════════════════════════════════════════════════
//  ETHERWORLD CHARACTER AI ULTRA — Local Neural Render System
//  Zéro nouvelle dépendance : shader patches + textures canvas
// ════════════════════════════════════════════════════════════

const EtherCharacterUltra = (() => {
  const runtime = {
    version: '3.0-ultra-local',
    enabled: true,
    quality: 'ultra',
    textures: new Map(),
    shaderUniforms: {
      time: { value: 0 },
      skinWarmth: { value: 0.42 },
      fabricDepth: { value: 0.55 }
    },
    hud: null,
    aura: null,
    floorReflection: null,
    fps: 60,
    frameCount: 0,
    lastFpsAt: performance.now(),
    lastAdaptAt: 0,
    lastDNA: null,
    original: {}
  };

  function hashString(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeCanvasTexture(key, size, painter, repeat = [1, 1]) {
    if (runtime.textures.has(key)) return runtime.textures.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    painter(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.anisotropy = 16;
    runtime.textures.set(key, texture);
    return texture;
  }

  function paintNoise(ctx, size, count, color, alphaRange = [0.02, 0.08], radiusRange = [0.35, 1.8]) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
      const a = alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0]);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`);
      g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function createSkinAlbedo() {
    return makeCanvasTexture('skin-albedo-ultra', 1024, (ctx, size) => {
      const base = ctx.createLinearGradient(0, 0, size, size);
      base.addColorStop(0, '#fff0dc');
      base.addColorStop(0.48, '#e8b991');
      base.addColorStop(1, '#b97654');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      paintNoise(ctx, size, 18000, [120, 60, 45], [0.012, 0.045], [0.25, 1.2]);
      paintNoise(ctx, size, 9000, [255, 235, 210], [0.01, 0.04], [0.25, 1.0]);
      paintNoise(ctx, size, 220, [105, 45, 30], [0.12, 0.28], [1.2, 3.8]);
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.strokeStyle = `rgba(95,70,120,${0.025 + Math.random() * 0.055})`;
        ctx.lineWidth = 0.4 + Math.random() * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 6; s++) ctx.lineTo(x + (Math.random() - 0.5) * 42, y + (Math.random() - 0.5) * 42);
        ctx.stroke();
      }
    }, [2, 2]);
  }

  function createSkinBump() {
    return makeCanvasTexture('skin-bump-ultra', 1024, (ctx, size) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, size, size);
      paintNoise(ctx, size, 26000, [255, 255, 255], [0.025, 0.08], [0.2, 0.75]);
      paintNoise(ctx, size, 22000, [0, 0, 0], [0.018, 0.055], [0.2, 0.9]);
      for (let i = 0; i < 130; i++) {
        ctx.strokeStyle = `rgba(40,40,40,${0.08 + Math.random() * 0.12})`;
        ctx.lineWidth = 0.35 + Math.random() * 0.75;
        ctx.beginPath();
        let x = Math.random() * size;
        let y = Math.random() * size;
        ctx.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          x += (Math.random() - 0.5) * 30;
          y += (Math.random() - 0.5) * 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }, [3, 3]);
  }

  function createRoughnessMap(key, base = 180) {
    return makeCanvasTexture(key, 512, (ctx, size) => {
      ctx.fillStyle = `rgb(${base},${base},${base})`;
      ctx.fillRect(0, 0, size, size);
      paintNoise(ctx, size, 9000, [255, 255, 255], [0.02, 0.09], [0.5, 2.2]);
      paintNoise(ctx, size, 5000, [0, 0, 0], [0.02, 0.07], [0.5, 2.0]);
    }, [2, 2]);
  }

  function createFabricTexture(key, colorA = '#171b2c', colorB = '#30364f') {
    return makeCanvasTexture(key, 512, (ctx, size) => {
      ctx.fillStyle = colorA;
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.075)';
        ctx.fillRect(0, y, size, 1);
      }
      for (let x = 0; x < size; x += 5) {
        ctx.fillStyle = x % 10 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
        ctx.fillRect(x, 0, 1, size);
      }
      const g = ctx.createRadialGradient(size * 0.4, size * 0.25, 0, size * 0.4, size * 0.25, size * 0.9);
      g.addColorStop(0, colorB + '99');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      paintNoise(ctx, size, 6000, [255, 255, 255], [0.01, 0.035], [0.2, 1.0]);
    }, [3, 3]);
  }

  function createHairTexture() {
    return makeCanvasTexture('hair-fiber-ultra', 512, (ctx, size) => {
      ctx.fillStyle = '#1a0c04';
      ctx.fillRect(0, 0, size, size);
      for (let x = 0; x < size; x++) {
        const v = 35 + Math.random() * 55;
        ctx.fillStyle = `rgba(${v},${v * 0.55},${v * 0.22},${0.18 + Math.random() * 0.32})`;
        ctx.fillRect(x, 0, 1, size);
      }
      for (let i = 0; i < 180; i++) {
        ctx.strokeStyle = `rgba(255,210,130,${0.035 + Math.random() * 0.07})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        const x = Math.random() * size;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + Math.random() * 35 - 18, size * 0.33, x + Math.random() * 35 - 18, size * 0.66, x + Math.random() * 20 - 10, size); ctx.stroke();
      }
    }, [2, 1]);
  }

  function patchMaterialShader(material, mode) {
    if (material.userData.ultraShaderPatched) return;
    material.userData.ultraShaderPatched = true;
    material.onBeforeCompile = shader => {
      shader.uniforms.uUltraTime = runtime.shaderUniforms.time;
      shader.uniforms.uSkinWarmth = runtime.shaderUniforms.skinWarmth;
      shader.uniforms.uFabricDepth = runtime.shaderUniforms.fabricDepth;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>\nuniform float uUltraTime;\nuniform float uSkinWarmth;\nuniform float uFabricDepth;\nfloat ultraHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        vec2 ultraUv = gl_FragCoord.xy * 0.5;
        float grain = ultraHash(ultraUv + uUltraTime * 0.04) - 0.5;
        ${mode === 'skin' ? 'gl_FragColor.rgb += vec3(0.030, 0.010, 0.006) * uSkinWarmth + grain * 0.012;' : ''}
        ${mode === 'fabric' ? 'gl_FragColor.rgb += grain * 0.018; gl_FragColor.rgb *= 0.94 + uFabricDepth * 0.08;' : ''}
        ${mode === 'hair' ? 'gl_FragColor.rgb += vec3(0.06,0.035,0.01) * abs(sin(ultraUv.y * 0.035 + uUltraTime)); gl_FragColor.rgb += grain * 0.01;' : ''}
        `
      );
    };
    material.customProgramCacheKey = () => `ether-character-ultra-${mode}-3`;
  }

  function enhanceMaterials() {
    M.skin.map = createSkinAlbedo();
    M.skin.bumpMap = createSkinBump();
    M.skin.bumpScale = 0.0085;
    M.skin.roughnessMap = createRoughnessMap('skin-rough-ultra', 178);
    M.skin.envMapIntensity = 0.12;
    patchMaterialShader(M.skin, 'skin');

    M.hair.map = createHairTexture();
    M.hair.bumpMap = createHairTexture();
    M.hair.bumpScale = 0.018;
    M.hair.roughness = 0.72;
    patchMaterialShader(M.hair, 'hair');

    M.top.map = createFabricTexture('top-fabric-ultra', '#15182a', '#2a3050');
    M.top.bumpMap = M.top.map;
    M.top.bumpScale = 0.016;
    M.top.roughnessMap = createRoughnessMap('top-rough-ultra', 205);
    patchMaterialShader(M.top, 'fabric');

    M.bot.map = createFabricTexture('pants-fabric-ultra', '#101622', '#1e3148');
    M.bot.bumpMap = M.bot.map;
    M.bot.bumpScale = 0.012;
    M.bot.roughnessMap = createRoughnessMap('pants-rough-ultra', 215);
    patchMaterialShader(M.bot, 'fabric');

    M.shoe.map = createFabricTexture('shoe-leather-ultra', '#0c0c0d', '#202026');
    M.shoe.bumpMap = M.shoe.map;
    M.shoe.bumpScale = 0.01;
    M.shoe.roughnessMap = createRoughnessMap('shoe-rough-ultra', 160);
    M.shoe.envMapIntensity = 0.35;
    patchMaterialShader(M.shoe, 'fabric');

    Object.values(M).forEach(mat => {
      if (mat && mat.isMaterial) mat.needsUpdate = true;
    });
  }

  function clearUltraChildren() {
    const doomed = [];
    charGroup.traverse(child => {
      if (child.userData && child.userData.ultraDetail) doomed.push(child);
    });
    doomed.forEach(child => {
      if (child.parent) child.parent.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => m.dispose && m.dispose());
      }
    });
  }

  function addMicroDetailMeshes() {
    clearUltraChildren();
    const dna = computeDNA();
    const freckleMat = new THREE.MeshBasicMaterial({ color: 0x5d2d20, transparent: true, opacity: 0.34, depthWrite: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    const seamMat = new THREE.MeshStandardMaterial({ color: 0x05070d, roughness: 0.8, metalness: 0.0 });

    const freckleGeo = new THREE.SphereGeometry(0.0035, 5, 4);
    const count = 54 + (dna.rarity % 40);
    for (let i = 0; i < count; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (0.012 + Math.random() * 0.092);
      const y = 1.618 + Math.random() * 0.09;
      const z = 0.145 + Math.random() * 0.014;
      const dot = new THREE.Mesh(freckleGeo, freckleMat);
      dot.position.set(x, y, z);
      dot.scale.setScalar(0.55 + Math.random() * 1.1);
      dot.userData.ultraDetail = true;
      charGroup.add(dot);
    }

    for (let i = 0; i < 3; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.29, 0.006), seamMat);
      seam.position.set(-0.12 + i * 0.12, 1.26, 0.126);
      seam.userData.ultraDetail = true;
      charGroup.add(seam);
    }

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.006, 6, 48, Math.PI * 1.12), seamMat);
    collar.position.set(0, 1.48, 0.02);
    collar.rotation.x = Math.PI / 2;
    collar.userData.ultraDetail = true;
    charGroup.add(collar);

    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.006, 6, 96), glowMat);
    aura.position.set(0, 1.15, 0);
    aura.rotation.x = Math.PI / 2;
    aura.userData.ultraDetail = true;
    charGroup.add(aura);
  }

  function addSceneAura() {
    if (runtime.aura) return;
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    runtime.aura = new THREE.Group();
    runtime.aura.name = 'EtherCharacterUltraAura';
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15 + i * 0.22, 0.006, 6, 128), ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08 + i * 0.008;
      runtime.aura.add(ring);
    }
    scene.add(runtime.aura);
  }

  function injectUltraHUD() {
    if (runtime.hud) return;
    const style = document.createElement('style');
    style.textContent = `
      .cc-ultra-hud{position:absolute;left:14px;bottom:82px;z-index:4;pointer-events:none;border:1px solid rgba(125,211,252,.18);background:rgba(4,8,16,.72);backdrop-filter:blur(10px);border-radius:10px;padding:10px 12px;min-width:220px;box-shadow:0 0 28px rgba(0,212,255,.08)}
      .cc-ultra-hud-title{font:700 10px var(--font3);letter-spacing:2px;color:var(--cyan);text-transform:uppercase;margin-bottom:7px}
      .cc-ultra-hud-row{display:flex;justify-content:space-between;gap:12px;font:700 10px var(--font2);letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:4px}
      .cc-ultra-hud-row strong{color:var(--gold);font-family:var(--font3);font-size:10px}
      .cc-ultra-quality{color:var(--green)!important}
    `;
    document.head.appendChild(style);
    runtime.hud = document.createElement('div');
    runtime.hud.className = 'cc-ultra-hud';
    const vp = document.querySelector('.cc-viewport');
    if (vp) vp.appendChild(runtime.hud);
  }

  function computeDNA() {
    const raw = [
      S.name, S.gender, S.nationality, S.skin, S.faceShape, S.eyeColor,
      S.noseBridge, S.noseSize, S.faceWidth, S.cheekH, S.jawWidth,
      S.eyeSize, S.eyeSpacing, S.lipSize, S.hairStyle, S.hairColor,
      S.facialHair, S.bodyType, S.height, S.muscular, S.fatness,
      S.topStyle, S.topColor, S.pantsStyle, S.pantsColor, S.shoesStyle,
      S.shoesColor, S.glassesStyle, S.hatStyle, S.jewelryStyle
    ].join('|');
    const code = hashString(raw);
    const balance = 100 - Math.abs(50 - safeNumber(S.height)) * 0.35 - Math.abs(45 - safeNumber(S.muscular)) * 0.2 - Math.abs(35 - safeNumber(S.fatness)) * 0.18;
    const styleScore = 45 + (S.glassesStyle > 0 ? 10 : 0) + (S.hatStyle > 0 ? 8 : 0) + (S.jewelryStyle > 0 ? 8 : 0) + ((S.topColor !== S.pantsColor) ? 12 : 4);
    const renderScore = clamp(Math.round(balance * 0.55 + styleScore * 0.45), 1, 100);
    const rarity = parseInt(code.slice(0, 4), 16) % 1000;
    runtime.lastDNA = { code, renderScore, rarity, balance: Math.round(balance), styleScore: Math.round(styleScore) };
    return runtime.lastDNA;
  }

  function updateHUD() {
    injectUltraHUD();
    const dna = runtime.lastDNA || computeDNA();
    if (!runtime.hud) return;
    runtime.hud.innerHTML = `
      <div class="cc-ultra-hud-title">ULTRA LOCAL AI RENDER</div>
      <div class="cc-ultra-hud-row"><span>DNA</span><strong>${dna.code}</strong></div>
      <div class="cc-ultra-hud-row"><span>Graphique</span><strong>${dna.renderScore}%</strong></div>
      <div class="cc-ultra-hud-row"><span>Rareté</span><strong>${dna.rarity}/999</strong></div>
      <div class="cc-ultra-hud-row"><span>FPS</span><strong class="cc-ultra-quality">${Math.round(runtime.fps)}</strong></div>
    `;
  }

  function enhanceCharacter() {
    if (!runtime.enabled) return;
    enhanceMaterials();
    addSceneAura();
    addMicroDetailMeshes();
    computeDNA();
    updateHUD();
  }

  function adaptQuality() {
    const t = performance.now();
    runtime.frameCount++;
    if (t - runtime.lastFpsAt > 1000) {
      runtime.fps = runtime.frameCount * 1000 / (t - runtime.lastFpsAt);
      runtime.frameCount = 0;
      runtime.lastFpsAt = t;
      updateHUD();
    }
    if (t - runtime.lastAdaptAt > 2800) {
      runtime.lastAdaptAt = t;
      if (runtime.fps < 34 && runtime.quality !== 'balanced') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));
        runtime.quality = 'balanced';
        addLog('⚙️ Ultra AI: qualité adaptée pour stabilité FPS', 'warn');
      } else if (runtime.fps > 54 && runtime.quality !== 'ultra') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        runtime.quality = 'ultra';
        addLog('✨ Ultra AI: qualité visuelle restaurée', 'success');
      }
    }
    runtime.shaderUniforms.time.value = clock.getElapsedTime();
    if (runtime.aura) {
      runtime.aura.rotation.y += 0.0018;
      runtime.aura.children.forEach((ring, i) => {
        ring.material.opacity = 0.07 + Math.sin(clock.getElapsedTime() * 1.2 + i) * 0.025;
      });
    }
    requestAnimationFrame(adaptQuality);
  }

  function wrapCoreFunctions() {
    if (runtime.original.wrapped) return;
    runtime.original.wrapped = true;
    runtime.original.buildCharacter = buildCharacter;
    runtime.original.applyColors = applyColors;
    runtime.original.buildExportPayload = buildExportPayload;

    buildCharacter = function ultraBuildCharacterWrapper(...args) {
      const result = runtime.original.buildCharacter.apply(this, args);
      enhanceCharacter();
      return result;
    };

    applyColors = function ultraApplyColorsWrapper(...args) {
      const result = runtime.original.applyColors.apply(this, args);
      enhanceMaterials();
      computeDNA();
      updateHUD();
      return result;
    };

    buildExportPayload = function ultraBuildExportPayloadWrapper(...args) {
      const payload = runtime.original.buildExportPayload.apply(this, args);
      return {
        ...payload,
        _ultra_version: runtime.version,
        _ultra_graphics: {
          quality: runtime.quality,
          localAI: true,
          proceduralTextures: Array.from(runtime.textures.keys()),
          dna: computeDNA()
        }
      };
    };
  }

  function analyze() {
    const dna = computeDNA();
    return {
      version: runtime.version,
      dna,
      state: { ...S },
      quality: runtime.quality,
      materials: Object.keys(M),
      textures: Array.from(runtime.textures.keys()),
      suggestions: [
        dna.renderScore < 70 ? 'Augmenter harmonie outfit/accessoires' : 'Profil visuel très solide',
        S.jewelryStyle === 0 ? 'Ajouter bijou subtil pour silhouette premium' : 'Accessoires bien intégrés',
        S.hairStyle === 8 ? 'Mode bald propre; ajouter lunettes ou collier pour signature' : 'Cheveux avec shader fibres actif'
      ]
    };
  }

  function autoEnhanceProfile() {
    if (S.jewelryStyle === 0) S.jewelryStyle = 1;
    if (S.glassesStyle === 0 && Math.random() > 0.5) S.glassesStyle = 2;
    S.muscular = clamp(Math.round((S.muscular + 52) / 2), 10, 90);
    S.fatness = clamp(Math.round((S.fatness + 32) / 2), 10, 90);
    rebuildAll();
    buildCharacter();
    applyColors();
    updateSummary();
    addLog('🧠 Ultra AI: profil optimisé localement', 'success');
    return analyze();
  }

  function install() {
    wrapCoreFunctions();
    enhanceMaterials();
    enhanceCharacter();
    injectUltraHUD();
    addLog('🚀 Character Ultra AI v3.0 — shaders, pores, tissus, DNA local actifs', 'success');
    window.EtherCharacterAI = {
      version: runtime.version,
      analyze,
      enhance: autoEnhanceProfile,
      setQuality(mode = 'ultra') {
        runtime.quality = mode;
        renderer.setPixelRatio(mode === 'performance' ? 1 : Math.min(window.devicePixelRatio, 2));
        updateHUD();
        return analyze();
      },
      exportDNA: () => computeDNA(),
      state: S
    };
    requestAnimationFrame(adaptQuality);
  }

  return { install, analyze, enhanceCharacter, computeDNA, runtime };
})();

EtherCharacterUltra.install();
