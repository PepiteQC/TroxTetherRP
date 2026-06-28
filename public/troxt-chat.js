// ============================================================
//  TroxT Agent — Neural Chat Interface
//  EtherWorld Platform v1.0
//  Rule-based NLP + rich markdown responses
// ============================================================

// ── BACKGROUND CANVAS (particles) ────────────────────────────
(function initBg() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * 1920, y: Math.random() * 1080,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.4, a: Math.random(),
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,255,${p.a * 0.4})`;
      ctx.fill();
    });
    // Connect nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,212,255,${(1 - d / 100) * 0.07})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── KNOWLEDGE BASE ────────────────────────────────────────────
const KB = {
  greet: {
    patterns: [/^(salut|bonjour|hello|hi|hey|coucou|yo)\b/i, /^(bonsoir|bonne nuit)/i],
    responses: [
      () => `Bonjour ! Je suis <b>TroxT Agent</b>, l'intelligence centrale d'EtherWorld.<br><br>Je peux vous guider sur :<ul><li><b>Character Creator</b> — création de personnages RP</li><li><b>Animations GLB</b> — système d'animations additives</li><li><b>EtherPrism</b> — base de données RP</li><li><b>Export & Partage</b> — JSON et liens partagés</li></ul>Que voulez-vous explorer ?`,
    ],
    suggestions: ['Character Creator', 'Animations GLB', 'EtherPrism', 'Modules EtherWorld'],
  },

  character: {
    patterns: [/character.creator|créat.*(personnage|perso)|perso.*créat|comment.*(crée|faire|créer).*(perso|personnage)/i, /character\b/i],
    responses: [
      () => `Le <b>Character Creator v2.0</b> est l'un des modules phares d'EtherWorld.<br><br><b>7 étapes de personnalisation :</b><ul><li><b>1 — Identité</b> : nom, genre, nationalité</li><li><b>2 — Visage</b> : forme, yeux, nez, lèvres, sourcils</li><li><b>3 — Cheveux</b> : 10 styles + 14 couleurs + pilosité faciale</li><li><b>4 — Corps</b> : taille, musculature, corpulence</li><li><b>5 — Tenue</b> : haut, bas, chaussures + couleurs PBR</li><li><b>6 — Accessoires</b> : lunettes, chapeaux, bijoux</li><li><b>7 — Animations</b> : GLB + blending additif</li></ul>Tout est rendu en temps réel avec <code>Three.js</code> PBR + particules.`,
    ],
    suggestions: ['Animations GLB', 'Comment exporter mon personnage ?', 'Accessoires disponibles'],
  },

  animations: {
    patterns: [/animat|glb|mixamo|xbot|idle|walk|run|blending|additif|additive|mixer/i],
    responses: [
      () => `Le système d'<b>animation additive</b> d'EtherWorld est basé sur <code>THREE.AnimationMixer</code>.<br><br><b>Architecture :</b><ul><li><b>Animations de base</b> : <code>idle</code> / <code>walk</code> / <code>run</code> — une seule active à la fois, CrossFade 0.5s</li><li><b>Animations additives</b> : <code>sad_pose</code> / <code>sneak_pose</code> / <code>agree</code> / <code>headShake</code></li><li>Les additives se <b>superposent</b> à la base via <code>makeClipAdditive()</code></li><li>Chaque additive a un <b>slider de poids</b> (0→100%)</li></ul><b>Modèles supportés :</b><ul><li>🤖 <b>Xbot Mixamo</b> (threejs.org — 7 clips inclus)</li><li>📁 <b>Upload GLB</b> local</li><li>🌐 <b>Ready Player Me</b> (URL .glb)</li><li>🖼️ <b>Image → 3D</b> (simulation pipeline)</li></ul>`,
    ],
    suggestions: ['Qu\'est-ce que makeClipAdditive ?', 'Ready Player Me', 'Retourner au personnage procédural'],
  },

  additive: {
    patterns: [/makeClipAdditive|additive.*blend|blend.*additif|superpos/i],
    responses: [
      () => `<b>makeClipAdditive</b> est une fonction de Three.js qui transforme une animation normale en animation <i>additive</i>.<br><br><b>Principe :</b><ul><li>On prend l'animation de <b>repos</b> (<code>idle</code> à t=0) comme référence</li><li>On calcule la <b>différence</b> entre chaque frame et cette référence</li><li>Le clip résultant encode uniquement le <b>delta de mouvement</b></li><li>On peut alors le <b>mélanger par-dessus</b> n'importe quelle animation de base</li></ul><b>Exemple :</b> <code>sad_pose</code> appliqué à 60% sur <code>run</code> → le personnage court, mais avec des épaules légèrement tombantes.<br><br><span class='tc-tag cyan'>blendMode = AdditiveAnimationBlendMode</span>`,
    ],
    suggestions: ['Comment régler les sliders ?', 'Animations de base', 'Xbot Mixamo'],
  },

  rpm: {
    patterns: [/ready.player.me|rpm|avatar.*url|url.*glb/i],
    responses: [
      () => `Pour utiliser un avatar <b>Ready Player Me</b> dans le Character Creator :<br><br><b>Étapes :</b><ul><li>Allez sur <code>readyplayer.me</code> et créez votre avatar</li><li>Copiez l'URL <code>.glb</code> (format : <code>models.readyplayer.me/ID.glb</code>)</li><li>Dans EtherWorld → onglet <b>Anim</b> → bouton <span class='tc-tag cyan'>🌐 Ready Player Me</span></li><li>Collez l'URL dans la boîte de dialogue</li><li>Le modèle se charge avec ses animations si disponibles</li></ul><b>Note CORS :</b> si le modèle ne charge pas, certains hébergeurs bloquent les requêtes cross-origin. Téléchargez d'abord le <code>.glb</code> et utilisez <b>Upload GLB</b>.`,
    ],
    suggestions: ['Upload GLB local', 'Animations GLB', 'Blending additif'],
  },

  prism: {
    patterns: [/etherprism|prism|database|db|table.*rp|rp.*table|joueur.*db|players.*db/i],
    responses: [
      () => `<b>EtherPrism</b> est le système de gestion de base de données RP d'EtherWorld.<br><br><b>Tables disponibles :</b><ul><li><span class='tc-tag green'>players</span> Joueurs et personnages RP</li><li><span class='tc-tag cyan'>vehicles</span> Véhicules enregistrés</li><li><span class='tc-tag purple'>jobs</span> Métiers et grades</li><li><span class='tc-tag gold'>factions</span> Gangs et organisations</li><li><span class='tc-tag green'>inventory</span> Objets et armes</li><li><span class='tc-tag cyan'>houses</span> Propriétés immobilières</li></ul><b>Fonctionnalités :</b> CRUD complet · Seed automatique · Import/Export · Rafraîchissement live 5s<br><br>Accessible depuis la <b>landing page</b> → section EtherPrism.`,
    ],
    suggestions: ['Seed la database', 'Modules EtherWorld', 'EtherForge 3D'],
  },

  export: {
    patterns: [/export|partag|share|json.*téléchar|téléchar.*json|lien.*personnage|personnage.*lien/i],
    responses: [
      () => `Le système d'<b>Export & Partage</b> permet de sauvegarder et partager vos personnages.<br><br><b>3 options disponibles :</b><ul><li>📄 <b>Télécharger JSON</b> — fichier <code>.json</code> avec toutes les données (nom, sliders, couleurs, tenue, accessoires, mode GLB)</li><li>🔗 <b>Lien de partage</b> — URL encodée en <code>base64</code> dans le hash (#char=...) — copiée dans le presse-papier</li><li>👁 <b>Voir code JSON</b> — affiche les données brutes directement dans le modal</li></ul><b>Format :</b><ul><li><code>_ew_version</code>, <code>_exported</code>, <code>_server</code></li><li><code>character</code> : tous les paramètres</li><li><code>glbMode</code>, <code>baseAction</code></li></ul>Le lien restaure <b>automatiquement</b> le personnage à l'ouverture de la page.`,
    ],
    suggestions: ['Comment importer un JSON ?', 'Character Creator', 'Animations GLB'],
  },

  modules: {
    patterns: [/module|etherforge|etherweave|etherlens|ecosystème|ecosystem/i],
    responses: [
      () => `L'écosystème <b>EtherWorld</b> est composé de 4 modules principaux :<br><br><ul><li>🗄️ <b>EtherPrism</b> <span class='tc-tag green'>Live</span> — Base de données RP (CRUD, tables, admin)</li><li>⚒️ <b>EtherForge</b> <span class='tc-tag cyan'>Dev</span> — Workshop 3D (scène, PBR, GLTF export)</li><li>🧵 <b>EtherWeave</b> <span class='tc-tag purple'>Dev</span> — Générateur de textures procédurales</li><li>🔬 <b>EtherLens</b> <span class='tc-tag gold'>Dev</span> — Analyse visuelle (OCR, détection, mesures)</li></ul>Tous orchestrés par <b>TroxT</b> via le TroxT Bridge et l'Event Bus WebSocket.`,
    ],
    suggestions: ['EtherPrism', 'EtherForge 3D', 'Character Creator'],
  },

  troxt: {
    patterns: [/troxt|neural.core|qui.*es.tu|tu.*es.quoi|c'est quoi troxt|intelligence/i],
    responses: [
      () => `Je suis <b>TroxT</b> — le cerveau central d'EtherWorld.<br><br><b>Architecture :</b><ul><li>🔗 <b>TroxT Bridge</b> — connexion entre tous les modules</li><li>📡 <b>Event Bus</b> — communication décentralisée via WebSocket</li><li>💾 <b>Memory Core</b> — mémoire persistante partagée</li><li>🌐 <b>Neural API</b> — interface unifiée pour chaque module</li></ul>Chaque action sur la plateforme passe par mon cœur neural. Je lis, j'analyse, j'orchestre.<br><br><span class='tc-tag cyan'>Version : TroxT-v2.0</span> <span class='tc-tag green'>Status : Online</span>`,
    ],
    suggestions: ['Modules EtherWorld', 'Character Creator', 'EtherPrism'],
  },

  rp: {
    patterns: [/conseil.*rp|tips.*rp|rp.*conseil|roleplay|role.play|gta.*rp|fivem/i],
    responses: [
      () => `Quelques <b>conseils RP</b> pour débuter sur EtherWorld :<br><br><ul><li>🎭 <b>Backstory</b> — Créez une histoire cohérente pour votre personnage (origine, motivations)</li><li>📝 <b>Nom réaliste</b> — Utilisez le format <code>Prénom_Nom</code> suggéré par le Character Creator</li><li>👔 <b>Tenue cohérente</b> — Adaptez la tenue au rôle (civil, médecin, policier, criminel)</li><li>🎬 <b>Animations</b> — Utilisez les poses additives (sad, sneak) pour enrichir vos interactions</li><li>🌍 <b>Nationalité</b> — Choisissez une origine qui influence votre façon de jouer</li><li>💾 <b>Sauvegardez</b> — Exportez votre personnage JSON pour ne jamais le perdre</li></ul>`,
    ],
    suggestions: ['Character Creator', 'Animations GLB', 'Export personnage'],
  },

  forge: {
    patterns: [/etherforge|3d.*créat|créat.*3d|gltf|scène.*3d|3d.*scène/i],
    responses: [
      () => `<b>EtherForge</b> est le workshop 3D d'EtherWorld, actuellement en développement.<br><br><b>Fonctionnalités prévues :</b><ul><li>🏗️ Éditeur de scène 3D interactif</li><li>🎨 Éditeur de matériaux PBR (roughness, metalness, emissive)</li><li>📦 Export <code>GLTF</code> / <code>GLB</code> vers le Character Creator</li><li>💡 Placement de lumières (point, spot, directional)</li><li>🌄 Skybox et environnement HDRI</li></ul>En attendant, vous pouvez accéder à <b>EtherForge</b> via <code>/etherforge</code> pour voir la version prototype.`,
    ],
    suggestions: ['EtherPrism', 'Character Creator', 'Modules EtherWorld'],
  },

  howto: {
    patterns: [/comment.*(utilis|navigue|march|fonctionn)|how.*(use|work|navig)/i],
    responses: [
      () => `<b>Comment naviguer sur EtherWorld :</b><ul><li>🏠 <b>Landing</b> (<code>/</code>) — Vue d'ensemble de la plateforme + EtherPrism admin</li><li>👤 <b>Character Creator</b> (<code>/character-creator</code>) — Créer un personnage RP complet</li><li>🎮 <b>Platform Tester</b> (<code>/game</code>) — Tester la plateforme 3D en temps réel</li><li>⚒️ <b>EtherForge</b> (<code>/etherforge</code>) — Workshop 3D</li><li>🤖 <b>TroxT Chat</b> (<code>/troxt-chat</code>) — Vous êtes ici !</li></ul>Utilisez la navigation en haut pour switcher entre les modules.`,
    ],
    suggestions: ['Character Creator', 'EtherPrism', 'Platform Tester'],
  },

  thanks: {
    patterns: [/^(merci|thank|thx|super|excellent|parfait|génial|cool|nickel|bravo|well done|très bien)\b/i],
    responses: [
      () => `Avec plaisir ! C'est pour ça que je suis là. <b>TroxT</b> est à votre service.<br>N'hésitez pas si vous avez d'autres questions sur la plateforme ⬡`,
      () => `Merci à vous ! C'est toujours un plaisir d'orchestrer EtherWorld. Autre chose ?`,
    ],
    suggestions: ['Autre question ?', 'Character Creator', 'Animations GLB'],
  },

  fallback: {
    responses: [
      (q) => `Je n'ai pas de réponse précise sur <b>"${q.slice(0,40)}…"</b>, mais je peux vous aider sur :<ul><li>Character Creator · Animations GLB · Blending additif</li><li>EtherPrism · EtherForge · Modules EtherWorld</li><li>Export JSON · Liens de partage · Ready Player Me</li></ul>Reformulez ou choisissez un sujet dans la sidebar.`,
      (q) => `Ce sujet dépasse peut-être ma base de connaissances actuelle. Voici ce que je maîtrise :<ul><li>🎭 Tout l'écosystème EtherWorld</li><li>👤 Le Character Creator v2.0 complet</li><li>🎬 Le système d'animations Three.js</li><li>🗄️ EtherPrism et la DB RP</li></ul>`,
    ],
    suggestions: ['Character Creator', 'Animations GLB', 'Modules EtherWorld', 'EtherPrism'],
  },
};

// ── STATE ─────────────────────────────────────────────────────
let msgCount  = 0;
let startTime = Date.now();
let isTyping  = false;

// ── DOM REFS ──────────────────────────────────────────────────
const messagesEl = document.getElementById('tc-messages');
const inputEl    = document.getElementById('tc-input');
const sendBtn    = document.getElementById('tc-send-btn');
const typingEl   = document.getElementById('tc-typing');
const statMsgs   = document.getElementById('stat-msgs');
const statTime   = document.getElementById('stat-time');

// ── SESSION TIMER ─────────────────────────────────────────────
setInterval(() => {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  if (statTime) statTime.textContent = `${m}:${sec}`;
}, 1000);

// ── RENDER MESSAGE ────────────────────────────────────────────
function renderMsg(role, html, suggestions = []) {
  const isAgent = role === 'agent';
  const now     = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const msgEl = document.createElement('div');
  msgEl.className = `tc-msg ${role}`;

  const avatarHTML = isAgent
    ? `<div class="tc-msg-avatar">⬡</div>`
    : `<div class="tc-msg-avatar">👤</div>`;

  const senderLabel = isAgent ? 'TroxT Agent' : 'Vous';

  msgEl.innerHTML = `
    ${avatarHTML}
    <div class="tc-msg-body">
      <div class="tc-msg-meta">
        <span class="tc-msg-sender">${senderLabel}</span>
        <span>${now}</span>
      </div>
      <div class="tc-msg-bubble">${html}</div>
    </div>
  `;

  messagesEl.appendChild(msgEl);

  // Add suggestion buttons if agent message
  if (isAgent && suggestions.length > 0) {
    const suggEl = document.createElement('div');
    suggEl.className = 'tc-suggestions';
    suggestions.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'tc-sugg-btn';
      btn.textContent = s;
      btn.addEventListener('click', () => { sendMessage(s); });
      suggEl.appendChild(btn);
    });
    messagesEl.appendChild(suggEl);
  }

  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
  msgCount++;
  if (statMsgs) statMsgs.textContent = msgCount;
}

// ── FIND RESPONSE ─────────────────────────────────────────────
function findResponse(query) {
  const q = query.trim().toLowerCase();

  for (const [, kb] of Object.entries(KB)) {
    if (!kb.patterns) continue;
    for (const pat of kb.patterns) {
      if (pat.test(q)) {
        const fn = kb.responses[Math.floor(Math.random() * kb.responses.length)];
        return { html: fn(query), suggestions: kb.suggestions || [] };
      }
    }
  }

  // Fallback
  const fb = KB.fallback;
  const fn = fb.responses[Math.floor(Math.random() * fb.responses.length)];
  return { html: fn(query), suggestions: fb.suggestions };
}

// ── SEND MESSAGE ──────────────────────────────────────────────
function sendMessage(text) {
  const msg = (text || inputEl.value).trim();
  if (!msg || isTyping) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  updateCharCount();

  // Render user message
  renderMsg('user', escapeHtml(msg));

  // Show typing
  isTyping = true;
  sendBtn.disabled = true;
  typingEl.classList.add('visible');
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });

  // Simulate thinking delay (600–1400ms based on query length)
  const delay = Math.min(600 + msg.length * 10, 1400);

  setTimeout(() => {
    typingEl.classList.remove('visible');
    const { html, suggestions } = findResponse(msg);
    renderMsg('agent', html, suggestions);
    isTyping = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }, delay);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── INPUT EVENTS ──────────────────────────────────────────────
function updateCharCount() {
  const len = inputEl.value.length;
  const el  = document.getElementById('tc-char-count');
  if (el) el.textContent = `${len} / 800`;
}

inputEl.addEventListener('input', () => {
  updateCharCount();
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', () => sendMessage());

// ── TOPIC BUTTONS ─────────────────────────────────────────────
document.querySelectorAll('.tc-topic-btn').forEach(btn => {
  btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
});

// ── CLEAR CHAT ────────────────────────────────────────────────
document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
  messagesEl.innerHTML = '';
  msgCount = 0;
  if (statMsgs) statMsgs.textContent = '0';
  renderWelcome();
});

// ── WELCOME MESSAGE ───────────────────────────────────────────
function renderWelcome() {
  const el = document.createElement('div');
  el.className = 'tc-welcome';
  el.innerHTML = `
    <span class="tc-welcome-hex">⬡</span>
    <div class="tc-welcome-title">TroxT Neural Core</div>
    <div class="tc-welcome-sub">Intelligence centrale d'EtherWorld · Posez votre première question</div>
  `;
  messagesEl.appendChild(el);

  // Auto welcome after 600ms
  setTimeout(() => {
    renderMsg('agent',
      `Bienvenue dans le <b>TroxT Agent Chat</b> ⬡<br><br>Je suis l'intelligence centrale d'EtherWorld. Je connais l'intégralité de la plateforme — modules, mécaniques, systèmes d'animation, base de données RP et outils de création.<br><br>Que souhaitez-vous explorer ?`,
      ['Character Creator', 'Animations GLB', 'EtherPrism', 'Modules EtherWorld', 'Conseils RP']
    );
  }, 600);
}

// ── INIT ──────────────────────────────────────────────────────
renderWelcome();
inputEl.focus();
