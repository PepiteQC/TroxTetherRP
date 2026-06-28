import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app    = express();
const server = createServer(app);
const wss    = new WebSocketServer({ server });

const PORT          = process.env.PORT || 5000;
const SAVES_DIR     = path.join(__dirname, 'saves');
const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');
const LOGS_FILE     = path.join(__dirname, 'server_logs.json');
const DB_FILE       = path.join(__dirname, 'etherprism_db.json');

[SAVES_DIR, SNAPSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json({ limit: '50mb' }));

// ============================================================
//  ROUTES PRINCIPALES
// ============================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/etherforge', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'etherforge.html')); });
app.get('/character-creator', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'character-creator.html')); });
app.get('/troxt-chat', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'troxt-chat.html')); });
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
//  ÉTAT GLOBAL
// ============================================================
const serverStartTime = Date.now();

const world = {
  platforms: [],
  players: new Map(),
  nextPlatformId: 1,
  state: {
    world_name: 'EtherWorld-QC',
    time_of_day: 12.0,
    weather: 'sunny',
    server_status: 'running',
    max_players: 100,
    environment_data: {},
    statistics: { total_joins: 0, total_saves: 0 }
  }
};

const serverLogs    = [];
const snapshots     = [];
const MAX_SNAPSHOTS = 10;

function addLog(eventType, userId = null, message = '', data = {}, severity = 'info') {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    event_type: eventType,
    user_id: userId,
    message, data, severity
  };
  serverLogs.unshift(entry);
  if (serverLogs.length > 500) serverLogs.pop();
  try { fs.writeFileSync(LOGS_FILE, JSON.stringify(serverLogs.slice(0, 200), null, 2)); } catch (e) {}
  return entry;
}

function createSnapshot(type = 'auto', description = '') {
  const snap = {
    id: uuidv4(), type,
    description: description || `${type} save`,
    created_at: new Date().toISOString(),
    player_count: world.players.size,
    platform_count: world.platforms.length,
    world_state: { ...world.state },
    platforms: JSON.parse(JSON.stringify(world.platforms))
  };
  snapshots.unshift(snap);
  while (snapshots.length > MAX_SNAPSHOTS) {
    const removed = snapshots.pop();
    const fp = path.join(SNAPSHOTS_DIR, `${removed.id}.json`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${snap.id}.json`), JSON.stringify(snap, null, 2));
  world.state.statistics.total_saves++;
  addLog('snapshot_created', null, `Snapshot: ${snap.id}`, { type }, 'info');
  return snap;
}

let autoSaveInterval = null;

function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(() => {
    if (world.state.server_status === 'running') {
      createSnapshot('auto', 'Auto-save');
      broadcast({ type: 'auto_save', timestamp: new Date().toISOString() });
      console.log(`[AutoSave] ${world.platforms.length} platforms, ${world.players.size} players`);
    }
  }, 60000);
}

// ============================================================
//  GÉNÉRATION PROCÉDURALE
// ============================================================
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function weightedChoice(items, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function addPlatform(data) {
  const platform = { id: world.nextPlatformId++, ...data, createdAt: Date.now() };
  world.platforms.push(platform);
  return platform;
}

function generateDefaultPlatforms(seed = 42) {
  world.platforms = [];
  world.nextPlatformId = 1;
  const rng = seededRandom(seed);
  const colors = { static:'#6688cc', moving:'#cc8844', falling:'#cc4444', bouncy:'#44cc88', rotating:'#aa44cc' };

  addPlatform({ type:'ground', position:[0,-1,0], size:[40,2,40], color:'#4a7c59', material:'standard', isStatic:true });

  let last = { x:0, y:1, z:0 };
  for (let i = 0; i < 30; i++) {
    last = { x: last.x+(rng()-.5)*8, y: last.y+1.5+rng()*2, z: last.z+(rng()-.5)*8 };
    const types = ['static','moving','falling','bouncy','rotating'];
    const w = [.45,.2,.15,.1,.1];
    const ptype = weightedChoice(types, w, rng);
    const p = { type:ptype, position:[last.x,last.y,last.z], size:[1.5+rng()*3,.4,1.5+rng()*3], color:colors[ptype], material:'standard', isStatic:ptype==='static' };
    if (ptype==='moving')   p.movement = { axis:['x','y','z'][Math.floor(rng()*3)], amplitude:2+rng()*4, speed:.5+rng()*1.5 };
    if (ptype==='falling')  { p.fallDelay=.5+rng(); p.respawnTime=3+rng()*2; }
    if (ptype==='bouncy')   p.bounceForce = 10+rng()*15;
    if (ptype==='rotating') p.rotation = { axis:'y', speed:.5+rng()*2 };
    addPlatform(p);
  }
  addPlatform({ type:'goal', position:[last.x,last.y+2,last.z], size:[4,.5,4], color:'#ffdd44', material:'emissive', isStatic:true });
}

generateDefaultPlatforms();
startAutoSave();
addLog('server_start', null, 'Server started', {}, 'info');

// ============================================================
//  API — PLATFORMS
// ============================================================
app.get('/api/platforms', (req, res) => {
  res.json({ platforms: world.platforms, playerCount: world.players.size });
});

app.post('/api/platforms', (req, res) => {
  const p = addPlatform(req.body);
  broadcast({ type: 'platform_added', platform: p });
  res.json({ success: true, platform: p });
});

app.put('/api/platforms/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = world.platforms.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  world.platforms[idx] = { ...world.platforms[idx], ...req.body, id };
  broadcast({ type: 'platform_updated', platform: world.platforms[idx] });
  res.json({ success: true, platform: world.platforms[idx] });
});

app.delete('/api/platforms/:id', (req, res) => {
  const id = parseInt(req.params.id);
  world.platforms = world.platforms.filter(p => p.id !== id);
  broadcast({ type: 'platform_removed', platformId: id });
  res.json({ success: true });
});

app.post('/api/platforms/generate', (req, res) => {
  const seed = req.body.seed || Math.floor(Math.random() * 100000);
  generateDefaultPlatforms(seed);
  broadcast({ type: 'world_reset', platforms: world.platforms });
  addLog('world_generated', null, `Seed ${seed}`, { seed }, 'info');
  res.json({ success: true, seed, count: world.platforms.length });
});

// ============================================================
//  API — SAVE / LOAD
// ============================================================
app.post('/api/save', (req, res) => {
  const name = req.body.name || `level_${Date.now()}`;
  const data = { name, version:'2.0', createdAt: new Date().toISOString(), platforms: world.platforms };
  fs.writeFileSync(path.join(SAVES_DIR, `${name}.json`), JSON.stringify(data, null, 2));
  addLog('manual_save', null, `Saved: ${name}`, { name }, 'info');
  res.json({ success: true, name });
});

app.post('/api/load', (req, res) => {
  const fp = path.join(SAVES_DIR, `${req.body.name}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  world.platforms = data.platforms;
  world.nextPlatformId = Math.max(...world.platforms.map(p => p.id)) + 1;
  broadcast({ type: 'world_reset', platforms: world.platforms });
  res.json({ success: true, data });
});

app.get('/api/saves', (req, res) => {
  const files = fs.readdirSync(SAVES_DIR).filter(f => f.endsWith('.json'));
  const saves = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(SAVES_DIR, f), 'utf-8'));
    return { name: data.name, createdAt: data.createdAt, platformCount: data.platforms.length };
  });
  res.json({ saves });
});

// ============================================================
//  API — ADMIN
// ============================================================
app.get('/api/admin/world', (req, res) => {
  res.json({ ...world.state, player_count: world.players.size, platform_count: world.platforms.length, uptime_seconds: Math.floor((Date.now()-serverStartTime)/1000) });
});

app.patch('/api/admin/world', (req, res) => {
  ['time_of_day','weather','server_status','environment_data'].forEach(k => { if (req.body[k] !== undefined) world.state[k] = req.body[k]; });
  broadcast({ type: 'world_state_updated', state: world.state });
  addLog('admin_action', null, 'World state updated', req.body, 'info');
  res.json({ success: true, state: world.state });
});

app.get('/api/admin/players', (req, res) => {
  const players = [];
  world.players.forEach((p, id) => { players.push({ id, name:p.name, color:p.color, position:p.position, joinedAt:p.joinedAt, playtime: Math.floor((Date.now()-p.joinedAt)/1000) }); });
  res.json({ players });
});

app.post('/api/admin/players/:id/kick', (req, res) => {
  const player = world.players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  player.ws.send(JSON.stringify({ type:'kicked', reason: req.body.reason||'Kicked by admin' }));
  player.ws.close();
  addLog('admin_action', null, `Kicked: ${req.params.id}`, {}, 'warning');
  res.json({ success: true });
});

app.post('/api/admin/players/:id/teleport', (req, res) => {
  const player = world.players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  player.ws.send(JSON.stringify({ type:'teleport', position: req.body.position }));
  res.json({ success: true });
});

app.get('/api/admin/snapshots', (req, res) => {
  res.json({ snapshots: snapshots.map(s => ({ id:s.id, type:s.type, description:s.description, created_at:s.created_at, player_count:s.player_count, platform_count:s.platform_count })) });
});

app.post('/api/admin/snapshots', (req, res) => {
  const snap = createSnapshot(req.body.type||'manual', req.body.description||'Manual save');
  res.json({ success: true, snapshot: snap });
});

app.post('/api/admin/snapshots/:id/restore', (req, res) => {
  const snap = snapshots.find(s => s.id === req.params.id);
  if (!snap) return res.status(404).json({ error: 'Not found' });
  world.platforms = JSON.parse(JSON.stringify(snap.platforms));
  world.nextPlatformId = Math.max(...world.platforms.map(p => p.id), 0) + 1;
  Object.assign(world.state, snap.world_state);
  broadcast({ type: 'world_reset', platforms: world.platforms });
  broadcast({ type: 'world_state_updated', state: world.state });
  addLog('snapshot_restored', null, `Restored: ${snap.id}`, {}, 'warning');
  res.json({ success: true });
});

app.get('/api/admin/logs', (req, res) => {
  const limit = parseInt(req.query.limit)||100;
  const severity = req.query.severity;
  let logs = serverLogs.slice(0, limit);
  if (severity && severity !== 'all') logs = logs.filter(l => l.severity === severity);
  res.json({ logs });
});

app.get('/api/admin/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const up = Math.floor((Date.now()-serverStartTime)/1000);
  res.json({
    uptime_seconds: up, uptime_formatted: formatUptime(up),
    player_count: world.players.size, platform_count: world.platforms.length,
    snapshot_count: snapshots.length,
    memory: { used_mb: Math.round(mem.heapUsed/1024/1024), total_mb: Math.round(mem.heapTotal/1024/1024), percent: Math.round((mem.heapUsed/mem.heapTotal)*100) },
    os: { platform: os.platform(), cpus: os.cpus().length, free_memory_mb: Math.round(os.freemem()/1024/1024), total_memory_mb: Math.round(os.totalmem()/1024/1024) },
    server_status: world.state.server_status, statistics: world.state.statistics
  });
});

app.post('/api/admin/server/:action', (req, res) => {
  switch (req.params.action) {
    case 'pause': world.state.server_status='paused'; clearInterval(autoSaveInterval); broadcast({type:'server_paused'}); addLog('admin_action',null,'Paused',{},'warning'); break;
    case 'resume': world.state.server_status='running'; startAutoSave(); broadcast({type:'server_resumed'}); addLog('admin_action',null,'Resumed',{},'info'); break;
    case 'save': createSnapshot('manual','Admin save'); broadcast({type:'manual_save'}); break;
    case 'backup': const b = createSnapshot('backup',req.body.description||'Backup'); res.json({success:true,snapshot:b}); return;
  }
  res.json({ success: true, status: world.state.server_status });
});

// ============================================================
//  API — EXPORT / IMPORT GLTF
// ============================================================
app.get('/api/export/gltf', (req, res) => {
  const gltf = {
    asset: { version:'2.0', generator:'EtherWorld' }, scene:0,
    scenes: [{ name:'Level', nodes: world.platforms.map((_,i)=>i) }],
    nodes: world.platforms.map(p => ({ name:`platform_${p.id}_${p.type}`, translation:p.position, scale:p.size, extras:{platformData:{...p}} }))
  };
  res.setHeader('Content-Type','model/gltf+json');
  res.json(gltf);
});

app.post('/api/import/gltf', (req, res) => {
  if (!req.body.nodes) return res.status(400).json({ error:'Invalid glTF' });
  world.platforms = []; world.nextPlatformId = 1;
  req.body.nodes.forEach(n => { if (n.extras?.platformData) addPlatform(n.extras.platformData); });
  broadcast({ type:'world_reset', platforms: world.platforms });
  res.json({ success: true, count: world.platforms.length });
});

// ============================================================
//  ETHERPRISM — RP DATABASE
// ============================================================
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
  }
  const db = {
    players: [], vehicles: [], houses: [], shops: [],
    jobs: [], inventory: [], factions: [], bank_accounts: [],
    _meta: { created_at: new Date().toISOString(), version: '1.0', total_queries: 0 }
  };
  saveDB(db);
  return db;
}

function saveDB(db) {
  db._meta.total_queries++;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let rpDB = loadDB();

app.get('/api/prism/tables', (req, res) => {
  const tables = Object.keys(rpDB).filter(k => k !== '_meta').map(name => ({
    name, count: rpDB[name].length,
    columns: rpDB[name].length > 0 ? Object.keys(rpDB[name][0]) : []
  }));
  res.json({ tables, meta: rpDB._meta });
});

app.get('/api/prism/:table', (req, res) => {
  const t = req.params.table;
  if (!rpDB[t] || t === '_meta') return res.status(404).json({ error: 'Table not found' });
  res.json({ table: t, rows: rpDB[t], count: rpDB[t].length });
});

app.get('/api/prism/:table/:id', (req, res) => {
  const t = req.params.table;
  if (!rpDB[t] || t === '_meta') return res.status(404).json({ error: 'Table not found' });
  const row = rpDB[t].find(r => r.id === parseInt(req.params.id) || r.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Row not found' });
  res.json({ table: t, row });
});

app.post('/api/prism/:table', (req, res) => {
  const t = req.params.table;
  if (t === '_meta') return res.status(400).json({ error: 'Cannot modify _meta' });
  if (!rpDB[t]) rpDB[t] = [];
  const maxId = rpDB[t].reduce((mx, r) => Math.max(mx, typeof r.id==='number' ? r.id : 0), 0);
  const row = { id: maxId+1, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  rpDB[t].push(row);
  saveDB(rpDB);
  addLog('prism_insert', null, `INSERT ${t}`, { table:t, id:row.id }, 'info');
  res.json({ success: true, table: t, row });
});

app.put('/api/prism/:table/:id', (req, res) => {
  const t = req.params.table;
  if (!rpDB[t] || t === '_meta') return res.status(404).json({ error: 'Table not found' });
  const idx = rpDB[t].findIndex(r => r.id === parseInt(req.params.id) || r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Row not found' });
  rpDB[t][idx] = { ...rpDB[t][idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(rpDB);
  addLog('prism_update', null, `UPDATE ${t} #${req.params.id}`, { table:t }, 'info');
  res.json({ success: true, table: t, row: rpDB[t][idx] });
});

app.delete('/api/prism/:table/:id', (req, res) => {
  const t = req.params.table;
  if (!rpDB[t] || t === '_meta') return res.status(404).json({ error: 'Table not found' });
  const before = rpDB[t].length;
  rpDB[t] = rpDB[t].filter(r => r.id !== parseInt(req.params.id) && r.id !== req.params.id);
  if (rpDB[t].length === before) return res.status(404).json({ error: 'Row not found' });
  saveDB(rpDB);
  addLog('prism_delete', null, `DELETE ${t} #${req.params.id}`, { table:t }, 'warning');
  res.json({ success: true });
});

app.post('/api/prism-admin/create-table', (req, res) => {
  const { name } = req.body;
  if (!name || name === '_meta') return res.status(400).json({ error: 'Invalid name' });
  if (rpDB[name]) return res.status(400).json({ error: 'Already exists' });
  rpDB[name] = [];
  saveDB(rpDB);
  addLog('prism_create_table', null, `CREATE TABLE ${name}`, {}, 'info');
  res.json({ success: true, name });
});

app.delete('/api/prism-admin/drop-table/:name', (req, res) => {
  const n = req.params.name;
  if (!rpDB[n] || n === '_meta') return res.status(400).json({ error: 'Cannot drop' });
  delete rpDB[n];
  saveDB(rpDB);
  addLog('prism_drop_table', null, `DROP TABLE ${n}`, {}, 'warning');
  res.json({ success: true });
});

app.post('/api/prism-admin/truncate/:name', (req, res) => {
  const n = req.params.name;
  if (!rpDB[n] || n === '_meta') return res.status(400).json({ error: 'Cannot truncate' });
  rpDB[n] = [];
  saveDB(rpDB);
  addLog('prism_truncate', null, `TRUNCATE ${n}`, {}, 'warning');
  res.json({ success: true });
});

app.post('/api/prism-admin/seed', (req, res) => {
  const now = new Date().toISOString();

  if (!rpDB.players.length) rpDB.players = [
    { id:1, name:'John Smith', steam_id:'steam:1100001', job:'police', rank:'sergeant', money_cash:5000, money_bank:45000, phone:'555-0101', status:'online', created_at:now, updated_at:now },
    { id:2, name:'Marie Dupont', steam_id:'steam:1100002', job:'ambulance', rank:'doctor', money_cash:3200, money_bank:67000, phone:'555-0102', status:'online', created_at:now, updated_at:now },
    { id:3, name:'Tony Montana', steam_id:'steam:1100003', job:'unemployed', rank:'none', money_cash:150000, money_bank:2000000, phone:'555-0103', status:'offline', created_at:now, updated_at:now },
    { id:4, name:'Sarah Connor', steam_id:'steam:1100004', job:'mechanic', rank:'boss', money_cash:8900, money_bank:120000, phone:'555-0104', status:'online', created_at:now, updated_at:now },
    { id:5, name:'James Wilson', steam_id:'steam:1100005', job:'taxi', rank:'employee', money_cash:1200, money_bank:15000, phone:'555-0105', status:'offline', created_at:now, updated_at:now }
  ];

  if (!rpDB.vehicles.length) rpDB.vehicles = [
    { id:1, owner_id:1, model:'police3', plate:'LSPD-001', garage:'mrpd', fuel:85, status:'parked', color:'black/white', created_at:now, updated_at:now },
    { id:2, owner_id:2, model:'ambulance', plate:'EMS-042', garage:'hospital', fuel:60, status:'out', color:'white/red', created_at:now, updated_at:now },
    { id:3, owner_id:3, model:'infernus', plate:'TONY-01', garage:'luxury', fuel:100, status:'parked', color:'red', created_at:now, updated_at:now },
    { id:4, owner_id:3, model:'adder', plate:'TONY-02', garage:'luxury', fuel:45, status:'impound', color:'gold', created_at:now, updated_at:now },
    { id:5, owner_id:4, model:'flatbed', plate:'MECH-01', garage:'mechanic', fuel:70, status:'out', color:'yellow', created_at:now, updated_at:now }
  ];

  if (!rpDB.houses.length) rpDB.houses = [
    { id:1, owner_id:3, address:'2044 North Conker Ave', price:350000, tier:'luxury', locked:true, garage_slots:4, created_at:now, updated_at:now },
    { id:2, owner_id:1, address:'0112 South Rockford Dr', price:120000, tier:'medium', locked:true, garage_slots:2, created_at:now, updated_at:now },
    { id:3, owner_id:null, address:'1337 Grove Street', price:85000, tier:'low', locked:false, garage_slots:1, created_at:now, updated_at:now },
    { id:4, owner_id:4, address:'0432 Integrity Way Apt 28', price:200000, tier:'medium', locked:true, garage_slots:1, created_at:now, updated_at:now }
  ];

  if (!rpDB.shops.length) rpDB.shops = [
    { id:1, name:'LTD Gasoline Vinewood', owner_id:null, type:'convenience', money_register:15000, status:'open', created_at:now, updated_at:now },
    { id:2, name:'Ammu-Nation Pillbox', owner_id:null, type:'weapons', money_register:50000, status:'open', created_at:now, updated_at:now },
    { id:3, name:'Tony Car Wash', owner_id:3, type:'carwash', money_register:8500, status:'open', created_at:now, updated_at:now },
    { id:4, name:'Binco Vespucci', owner_id:null, type:'clothing', money_register:12000, status:'closed', created_at:now, updated_at:now }
  ];

  if (!rpDB.jobs.length) rpDB.jobs = [
    { id:1, name:'police', label:'Los Santos Police', grades:'cadet,officer,sergeant,lieutenant,chief', salary_base:3500, on_duty:1, max_slots:15, created_at:now, updated_at:now },
    { id:2, name:'ambulance', label:'Emergency Medical', grades:'trainee,paramedic,doctor,chief', salary_base:3200, on_duty:1, max_slots:10, created_at:now, updated_at:now },
    { id:3, name:'mechanic', label:'Los Santos Customs', grades:'apprentice,mechanic,boss', salary_base:2800, on_duty:1, max_slots:8, created_at:now, updated_at:now },
    { id:4, name:'taxi', label:'Downtown Cab Co.', grades:'employee,manager', salary_base:2000, on_duty:0, max_slots:10, created_at:now, updated_at:now },
    { id:5, name:'unemployed', label:'Unemployed', grades:'none', salary_base:500, on_duty:0, max_slots:999, created_at:now, updated_at:now }
  ];

  if (!rpDB.factions.length) rpDB.factions = [
    { id:1, name:'Ballas', type:'gang', leader_id:null, territory:'Davis / Grove St', members:12, bank:250000, color:'#9b59b6', created_at:now, updated_at:now },
    { id:2, name:'Vagos', type:'gang', leader_id:null, territory:'Rancho / Jamestown', members:8, bank:180000, color:'#f1c40f', created_at:now, updated_at:now },
    { id:3, name:'Lost MC', type:'mc', leader_id:null, territory:'Sandy Shores', members:6, bank:95000, color:'#e74c3c', created_at:now, updated_at:now }
  ];

  if (!rpDB.bank_accounts.length) rpDB.bank_accounts = [
    { id:1, owner_id:1, type:'personal', balance:45000, iban:'LS-00001', created_at:now, updated_at:now },
    { id:2, owner_id:2, type:'personal', balance:67000, iban:'LS-00002', created_at:now, updated_at:now },
    { id:3, owner_id:3, type:'personal', balance:2000000, iban:'LS-00003', created_at:now, updated_at:now },
    { id:4, owner_id:3, type:'business', balance:850000, iban:'BZ-00001', created_at:now, updated_at:now }
  ];

  if (!rpDB.inventory.length) rpDB.inventory = [
    { id:1, owner_id:1, item:'weapon_pistol', quantity:1, slot:1, metadata:'{ ammo: 24 }', created_at:now, updated_at:now },
    { id:2, owner_id:1, item:'radio', quantity:1, slot:2, metadata:'{ freq: 1 }', created_at:now, updated_at:now },
    { id:3, owner_id:3, item:'weapon_smg', quantity:1, slot:1, metadata:'{ ammo: 120 }', created_at:now, updated_at:now },
    { id:4, owner_id:3, item:'lockpick', quantity:5, slot:2, metadata:'{}', created_at:now, updated_at:now },
    { id:5, owner_id:2, item:'medikit', quantity:10, slot:1, metadata:'{}', created_at:now, updated_at:now }
  ];

  saveDB(rpDB);
  addLog('prism_seed', null, 'Database seeded', {}, 'info');
  res.json({ success: true, message: 'Database seeded!' });
});

app.get('/api/prism-admin/stats', (req, res) => {
  const tables = Object.keys(rpDB).filter(k => k !== '_meta');
  const totalRows = tables.reduce((s, t) => s + rpDB[t].length, 0);
  res.json({ table_count: tables.length, total_rows: totalRows, tables: tables.map(t => ({ name:t, rows: rpDB[t].length })), meta: rpDB._meta });
});

// ============================================================
//  WEBSOCKET
// ============================================================
wss.on('connection', (ws) => {
  const playerId = uuidv4().slice(0, 8);
  const playerColor = `hsl(${Math.random()*360},70%,60%)`;
  const playerData = { id:playerId, name:`Player_${playerId}`, color:playerColor, position:[0,2,0], rotation:[0,0,0], velocity:[0,0,0], animation:'idle', joinedAt:Date.now(), ws };

  world.players.set(playerId, playerData);
  world.state.statistics.total_joins++;

  ws.send(JSON.stringify({ type:'init', playerId, color:playerColor, platforms:world.platforms, worldState:world.state, players:getPlayersState() }));
  broadcast({ type:'player_joined', player:{ id:playerId, name:playerData.name, color:playerColor, position:playerData.position }}, playerId);
  addLog('player_join', playerId, `Player ${playerId} connected`, {}, 'info');
  console.log(`[WS] Player ${playerId} joined (${world.players.size} online)`);

  ws.on('message', raw => { try { handlePlayerMessage(playerId, JSON.parse(raw)); } catch(e) {} });
  ws.on('close', () => {
    world.players.delete(playerId);
    broadcast({ type:'player_left', playerId });
    addLog('player_leave', playerId, `Player ${playerId} left`, {}, 'info');
    console.log(`[WS] Player ${playerId} left (${world.players.size} online)`);
  });
});

function handlePlayerMessage(playerId, msg) {
  const player = world.players.get(playerId);
  if (!player) return;
  switch (msg.type) {
    case 'position': player.position=msg.position; player.rotation=msg.rotation||player.rotation; player.velocity=msg.velocity||player.velocity; player.animation=msg.animation||player.animation; break;
    case 'chat': broadcast({ type:'chat', playerId, name:player.name, text:msg.text?.slice(0,200) }); addLog('chat',playerId,msg.text?.slice(0,200),{},'info'); break;
    case 'set_name': player.name=msg.name?.slice(0,20)||player.name; broadcast({ type:'player_renamed', playerId, name:player.name }); break;
  }
}

function getPlayersState() {
  const state = [];
  world.players.forEach((p,id) => { state.push({ id, name:p.name, color:p.color, position:p.position, rotation:p.rotation, animation:p.animation }); });
  return state;
}

function broadcast(data, excludeId = null) {
  const msg = JSON.stringify(data);
  world.players.forEach((p, id) => { if (id !== excludeId && p.ws.readyState === 1) p.ws.send(msg); });
}

function formatUptime(s) { return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`; }

setInterval(() => { if (world.players.size > 0) broadcast({ type:'players_state', players:getPlayersState() }); }, 50);

// ============================================================
//  DÉMARRAGE
// ============================================================
server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log(' EtherWorld Platform Tester 3D  v2.0');
  console.log('========================================');
  console.log(` Landing:   http://localhost:${PORT}/`);
  console.log(` Game:      http://localhost:${PORT}/game`);
  console.log(` API:       http://localhost:${PORT}/api/platforms`);
  console.log(` Prism:     http://localhost:${PORT}/api/prism/tables`);
  console.log(` Admin:     http://localhost:${PORT}/api/admin/metrics`);
  console.log(` WebSocket: ws://localhost:${PORT}`);
  console.log('========================================');
  console.log('');
});
