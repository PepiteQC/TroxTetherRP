// ============================================================
//  EtherWorld Materials — Builder + Platform Tester 3D Runtime
//  Additif uniquement : ne modifie pas public/game.js
// ============================================================
import * as THREE from 'three'

const VERSION = '1.0.0'
const POLL_MS = 350
const MAX_TRIES = 80

const MATERIALS = [
  { id: 'ew-concrete-main', name: 'Béton Québec HD', category: 'architecture', color: '#d9d6cd', roughness: 0.91, metalness: 0 },
  { id: 'ew-concrete-dark', name: 'Béton Nuit', category: 'architecture', color: '#242a31', roughness: 0.86, metalness: 0.05 },
  { id: 'ew-stone-quebec', name: 'Pierre Québec', category: 'architecture', color: '#958f84', roughness: 0.96, metalness: 0 },
  { id: 'ew-wood-warm', name: 'Bois chaleureux', category: 'interior', color: '#8b5e3c', roughness: 0.43, metalness: 0 },
  { id: 'ew-metal-black', name: 'Métal noir architectural', category: 'architecture', color: '#0b1118', roughness: 0.3, metalness: 0.82 },
  { id: 'ew-brushed-steel', name: 'Acier brossé', category: 'utility', color: '#9ba3ad', roughness: 0.38, metalness: 0.94 },
  { id: 'ew-glass-cyan', name: 'Verre cyan', category: 'glass', color: '#9beaff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.34 },
  { id: 'ew-door-glass', name: 'Verre porte premium', category: 'glass', color: '#9beaff', roughness: 0.04, metalness: 0.12, transparent: true, opacity: 0.46 },
  { id: 'ew-grass-quebec', name: 'Gazon Québec', category: 'terrain', color: '#294c2b', roughness: 1, metalness: 0 },
  { id: 'ew-asphalt-night', name: 'Asphalte nuit', category: 'terrain', color: '#1b1f25', roughness: 0.98, metalness: 0 },
  { id: 'ew-snow-fresh', name: 'Neige fraîche', category: 'terrain', color: '#f8fdff', roughness: 0.88, metalness: 0 },
  { id: 'ew-interior-wall', name: 'Mur intérieur chaud', category: 'interior', color: '#f3f0e8', roughness: 0.82, metalness: 0 },
  { id: 'ew-hardwood-floor', name: 'Plancher bois luxe', category: 'interior', color: '#a87546', roughness: 0.38, metalness: 0 },
  { id: 'ew-fabric-sofa', name: 'Tissu sofa graphite', category: 'interior', color: '#303843', roughness: 0.87, metalness: 0 },
  { id: 'ew-fabric-rug', name: 'Tapis nuit', category: 'interior', color: '#171c24', roughness: 0.9, metalness: 0 },
  { id: 'ew-ceramic-white', name: 'Céramique blanche', category: 'interior', color: '#f6f7f3', roughness: 0.4, metalness: 0 },
  { id: 'ew-screen-glow', name: 'Écran TroxT', category: 'light', color: '#02101b', roughness: 0.18, metalness: 0.15, emissive: '#00e8ff', emissiveIntensity: 0.32 },
  { id: 'ew-warm-light', name: 'Lumière chaude', category: 'light', color: '#ffd39a', roughness: 0.2, metalness: 0.1, emissive: '#ffd39a', emissiveIntensity: 1.25 },
  { id: 'ew-neon-accent', name: 'Néon Ether', category: 'light', color: '#00e8ff', roughness: 0.2, metalness: 0.15, emissive: '#00e8ff', emissiveIntensity: 1.3 },
  { id: 'ew-tree-trunk', name: 'Tronc naturel', category: 'nature', color: '#6b442c', roughness: 0.9, metalness: 0 },
  { id: 'ew-pine-dark', name: 'Pin sombre', category: 'nature', color: '#173d25', roughness: 0.95, metalness: 0 },
  { id: 'ew-leaf-green', name: 'Feuillage vivant', category: 'nature', color: '#2f7a3d', roughness: 0.95, metalness: 0 },
  { id: 'ew-bin-green', name: 'Bac recyclage vert', category: 'utility', color: '#1f6f43', roughness: 0.8, metalness: 0 },
  { id: 'ew-bin-dark', name: 'Bac utilitaire sombre', category: 'utility', color: '#232832', roughness: 0.8, metalness: 0 }
]

const state = {
  game: null,
  cache: new Map(),
  textures: new Map(),
  panel: null,
  selectedMaterial: 'ew-concrete-main',
  tries: 0,
  timer: null,
  patchedAdmin: false
}

function log(message, level = 'info') {
  console.log(`[EtherMaterials:${level}]`, message)
  try { window.troxtAdmin?.log?.(`Materials: ${message}`, level) } catch {}
}

function makeTexture(def) {
  const key = `${def.id}-texture`
  if (state.textures.has(key)) return state.textures.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = def.color
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < 4200; i++) {
    const v = Math.random() > 0.5 ? 255 : 0
    const a = def.category === 'terrain' ? 0.065 : 0.035
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }

  if (def.id.includes('wood') || def.id.includes('floor') || def.id.includes('trunk')) {
    for (let y = 0; y < 256; y += 8) {
      ctx.fillStyle = 'rgba(0,0,0,0.085)'
      ctx.fillRect(0, y, 256, 1 + Math.random())
    }
  }

  if (def.id.includes('concrete') || def.id.includes('stone') || def.id.includes('asphalt')) {
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'
    ctx.lineWidth = 0.7
    for (let i = 0; i < 18; i++) {
      ctx.beginPath()
      let x = Math.random() * 256
      let y = Math.random() * 256
      ctx.moveTo(x, y)
      for (let s = 0; s < 5; s++) {
        x += (Math.random() - 0.5) * 26
        y += (Math.random() - 0.5) * 26
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(def.category === 'terrain' ? 6 : 2, def.category === 'terrain' ? 6 : 2)
  texture.anisotropy = 8
  state.textures.set(key, texture)
  return texture
}

function getMaterialDef(id = state.selectedMaterial) {
  return MATERIALS.find(item => item.id === id) || MATERIALS[0]
}

function makeMaterial(id) {
  const def = getMaterialDef(id)
  const cacheKey = `${def.id}-${Date.now()}-${Math.random()}`
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color),
    map: ['architecture', 'interior', 'terrain', 'nature'].includes(def.category) ? makeTexture(def) : undefined,
    roughness: def.roughness,
    metalness: def.metalness,
    emissive: def.emissive ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: def.emissiveIntensity || 0,
    transparent: Boolean(def.transparent || (def.opacity !== undefined && def.opacity < 1)),
    opacity: def.opacity ?? 1,
    depthWrite: !(def.transparent || (def.opacity !== undefined && def.opacity < 1))
  })
  state.cache.set(cacheKey, material)
  return material
}

function findPlatform(id) {
  const game = state.game || window.game
  if (!game?.platformMeshes) return null
  if (id === undefined || id === null || id === 'selected') {
    const selected = game.selectedPlatform
    return selected != null ? game.platformMeshes.get(selected) : null
  }
  return game.platformMeshes.get(Number(id)) || null
}

function applyToMesh(mesh, materialId) {
  if (!mesh) return false
  if (mesh.material) mesh.material.dispose?.()
  mesh.material = makeMaterial(materialId)
  mesh.material.needsUpdate = true
  return true
}

function applyToPlatform(target = 'selected', materialId = state.selectedMaterial) {
  const record = findPlatform(target)
  if (!record?.mesh) return { success: false, reason: 'platform not found' }
  applyToMesh(record.mesh, materialId)
  if (record.data) {
    const def = getMaterialDef(materialId)
    record.data.material = materialId
    record.data.color = def.color
  }
  log(`Matériau ${materialId} appliqué plateforme ${record.data?.id ?? target}`, 'success')
  return { success: true, target, materialId }
}

function applyAll(materialId = state.selectedMaterial, filter = 'all') {
  const game = state.game || window.game
  if (!game?.platformMeshes) return { success: false, count: 0 }
  let count = 0
  game.platformMeshes.forEach(record => {
    if (filter !== 'all' && record.data?.type !== filter) return
    applyToMesh(record.mesh, materialId)
    if (record.data) {
      const def = getMaterialDef(materialId)
      record.data.material = materialId
      record.data.color = def.color
    }
    count++
  })
  log(`Matériau ${materialId} appliqué à ${count} plateformes`, 'success')
  return { success: true, count, materialId, filter }
}

function injectPanel() {
  if (state.panel || !document.body) return
  const style = document.createElement('style')
  style.textContent = `
    .ether-materials-panel{position:fixed;right:14px;bottom:86px;z-index:1400;width:270px;max-height:48vh;overflow:auto;background:rgba(5,8,16,.9);border:1px solid rgba(125,211,252,.25);border-radius:14px;color:#e8edf5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(14px);box-shadow:0 18px 60px rgba(0,0,0,.45)}
    .em-head{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:10px}.em-head strong{color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px}.em-head span{color:#64748b;font-size:10px}.em-body{padding:10px;display:flex;flex-direction:column;gap:8px}.em-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.em-mat{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:#cbd5e1;border-radius:9px;padding:7px;cursor:pointer;text-align:left;font-size:10px}.em-mat.active{border-color:#c9a84c;color:#ffe0a0;background:rgba(201,168,76,.12)}.em-swatch{width:100%;height:18px;border-radius:6px;margin-bottom:5px;border:1px solid rgba(255,255,255,.16)}.em-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.em-actions button{border:1px solid rgba(125,211,252,.25);background:rgba(125,211,252,.08);color:#bdefff;border-radius:9px;padding:8px;cursor:pointer;font-size:11px}.em-actions button:hover{border-color:#7dd3fc}.em-note{font-size:10px;color:#64748b;line-height:1.4}
  `
  document.head.appendChild(style)

  state.panel = document.createElement('section')
  state.panel.className = 'ether-materials-panel'
  state.panel.innerHTML = `
    <div class="em-head"><div><strong>EtherMaterials</strong><span>Builder + Platform 3D</span></div></div>
    <div class="em-body">
      <div class="em-actions">
        <button data-em-action="selected">Apply selected</button>
        <button data-em-action="all">Apply all</button>
        <button data-em-action="ground">Ground</button>
        <button data-em-action="random">Random</button>
      </div>
      <div class="em-grid"></div>
      <div class="em-note">Sélectionne une plateforme dans l’éditeur, puis applique un matériau. Commandes: material list / material apply.</div>
    </div>
  `
  document.body.appendChild(state.panel)
  renderPanel()
  state.panel.addEventListener('click', event => {
    const mat = event.target.closest?.('[data-mat]')
    if (mat) {
      state.selectedMaterial = mat.dataset.mat
      renderPanel()
      return
    }
    const action = event.target.dataset?.emAction
    if (action === 'selected') applyToPlatform('selected')
    if (action === 'all') applyAll()
    if (action === 'ground') applyAll(state.selectedMaterial, 'ground')
    if (action === 'random') {
      const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]
      state.selectedMaterial = material.id
      applyAll(material.id)
      renderPanel()
    }
  })
}

function renderPanel() {
  if (!state.panel) return
  const grid = state.panel.querySelector('.em-grid')
  if (!grid) return
  grid.innerHTML = MATERIALS.map(item => `
    <button class="em-mat ${item.id === state.selectedMaterial ? 'active' : ''}" data-mat="${item.id}" title="${item.id}">
      <div class="em-swatch" style="background:${item.color};box-shadow:${item.emissive ? `0 0 14px ${item.emissive}` : 'none'}"></div>
      <strong>${item.name}</strong><br><span>${item.category}</span>
    </button>
  `).join('')
}

function patchAdmin() {
  const bridge = window.troxtAdmin || window.EtherWorldAdminBridge
  if (!bridge || bridge.__etherMaterialsPatched) return
  const originalExecute = typeof bridge.execute === 'function' ? bridge.execute.bind(bridge) : null
  bridge.execute = (command, payload = {}) => {
    const text = String(command || '').trim()
    const [root, action, a, b] = text.split(/\s+/)
    if (!['material', 'materials', 'mat'].includes(root?.toLowerCase())) {
      return originalExecute ? originalExecute(command, payload) : null
    }
    if (!action || action === 'list') return { success: true, materials: MATERIALS }
    if (action === 'select') {
      state.selectedMaterial = a || state.selectedMaterial
      renderPanel()
      return { success: true, selected: state.selectedMaterial }
    }
    if (action === 'apply') return applyToPlatform(a || 'selected', b || payload.material || state.selectedMaterial)
    if (action === 'all') return applyAll(a || payload.material || state.selectedMaterial)
    if (action === 'ground') return applyAll(a || payload.material || state.selectedMaterial, 'ground')
    return { success: true, commands: ['material list', 'material select ew-concrete-main', 'material apply selected ew-wood-warm', 'material all ew-asphalt-night', 'material ground ew-grass-quebec'] }
  }
  bridge.materials = api
  bridge.__etherMaterialsPatched = true
}

function attach(game) {
  if (!game?.scene || state.game === game) return
  state.game = game
  game.etherMaterials = api
  game.applyMaterialToPlatform = applyToPlatform
  game.applyMaterialToAllPlatforms = applyAll
  injectPanel()
  patchAdmin()
  log('EtherMaterials attaché à Platform Tester 3D', 'success')
}

function boot() {
  if (window.game?.scene) attach(window.game)
  if (state.game) return
  state.tries++
  if (state.tries > 80) {
    clearInterval(state.timer)
    state.timer = null
  }
}

const api = {
  version: VERSION,
  list: () => MATERIALS,
  get: getMaterialDef,
  select(id) { state.selectedMaterial = id; renderPanel(); return getMaterialDef(id) },
  apply: applyToPlatform,
  applyAll,
  makeMaterial,
  status: () => ({ version: VERSION, selected: state.selectedMaterial, materials: MATERIALS.length, attached: Boolean(state.game) })
}

window.EtherMaterials = api
window.addEventListener('etherworld:materials:apply', event => applyToPlatform(event.detail?.target || 'selected', event.detail?.material || state.selectedMaterial))

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { state.timer = setInterval(boot, 350); boot() }, { once: true })
else { state.timer = setInterval(boot, 350); boot() }
