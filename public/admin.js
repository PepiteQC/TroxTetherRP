// ════════════════════════════════════════════════════════════
//  EtherWorld Admin Panel — v2.0
//  Routes: world-state, platforms, props, textures,
//          entities, settings, snapshots, players
// ════════════════════════════════════════════════════════════

const state = {
  world:    null,
  textures: [],
  settings: {},
  entities: [],
  players:  [],
  ws:       null,
};

const $ = (id) => document.getElementById(id);

// ── Token ────────────────────────────────────────────────────
function token() {
  return localStorage.getItem("etherworld_admin_token") || $("adminToken")?.value || "";
}

function headers() {
  return { "Content-Type": "application/json", "x-admin-token": token() };
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = "info") {
  const box = $("toast");
  box.textContent = msg;
  box.className   = `show ${type}`;
  clearTimeout(box._t);
  box._t = setTimeout(() => box.classList.remove("show"), 3000);
}

// ── API ──────────────────────────────────────────────────────
async function api(path, options = {}) {
  const res  = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

const num = (id) => Number($(id)?.value || 0);
const val = (id) => $(id)?.value || "";

// ── Escape ───────────────────────────────────────────────────
function esc(v) {
  return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

// ── Material dropdown ─────────────────────────────────────────
function fillSelect(selectId, textures) {
  const sel = $(selectId);
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = "";
  for (const t of textures) {
    const o = document.createElement("option");
    o.value = t.id; o.textContent = `${t.name} (${t.id})`;
    sel.appendChild(o);
  }
  if (cur) sel.value = cur;
}

// ════════════════════════════════════════════════════════════
//  LOAD
// ════════════════════════════════════════════════════════════
async function load() {
  const [ws, et, sn] = await Promise.all([
    api("/api/world-state"),
    api("/api/entities").catch(() => ({ entities: [] })),
    api("/api/entity-types").catch(() => ({ types: [] })),
  ]);

  state.world    = ws.world;
  state.textures = ws.textures;
  state.settings = ws.settings;
  state.entities = et.entities;
  state.entityTypes = sn.types || [];
  state.players  = ws.world?.players || [];

  render();
}

// ════════════════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════════════════
function render() {
  if (!state.world) return;

  // Stats dashboard
  $("statPlatforms").textContent = state.world.platforms?.length ?? 0;
  $("statProps").textContent     = state.world.props?.length ?? 0;
  $("statTextures").textContent  = state.textures?.length ?? 0;
  $("statPlayers").textContent   = state.players?.length ?? 0;
  $("statEntities").textContent  = state.entities?.length ?? 0;
  $("worldPreview").textContent  = JSON.stringify(
    { version: state.world.version, name: state.world.name, updatedAt: state.world.updatedAt,
      platforms: state.world.platforms?.length, props: state.world.props?.length,
      players: state.players?.length, lastSave: state.world.lastSaveReason },
    null, 2
  );

  // Dropdowns matériaux
  fillSelect("platformMaterial", state.textures);
  fillSelect("propMaterial",     state.textures);
  fillSelect("entityMaterialSel", state.textures);

  // Dropdown entity types
  const etSel = $("entityTypeSel");
  if (etSel && state.entityTypes.length) {
    const cur = etSel.value;
    etSel.innerHTML = state.entityTypes.map(t => `<option value="${t}">${t}</option>`).join("");
    if (cur) etSel.value = cur;
  }

  renderSettings();
  renderTextures();
  renderPlatforms();
  renderProps();
  renderEntities();
  renderPlayers();
  renderLogs();
}

// ── Settings ─────────────────────────────────────────────────
function renderSettings() {
  const s = state.settings;
  if (!s) return;
  const fields = ["grid","snap","snapSize","physicsDebug","adminTheme",
                  "maxPlayers","gravity","fogEnabled","fogColor","fogNear","fogFar"];
  for (const f of fields) {
    const el = $("set_" + f);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = Boolean(s[f]);
    else el.value = s[f] ?? "";
  }
}

// ── Textures ─────────────────────────────────────────────────
function renderTextures() {
  const box = $("textureList");
  if (!box) return;
  box.innerHTML = "";
  for (const t of state.textures) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="row">
        <div class="swatch" style="background:${t.color};box-shadow:0 0 14px ${t.emission||"transparent"}"></div>
        <div>
          <h4>${esc(t.name)} <span class="badge">${esc(t.category)}</span></h4>
          <p class="mono">${esc(t.id)}</p>
          <p>rough <b>${t.roughness}</b> · metal <b>${t.metallic}</b> · ao <b>${t.ao}</b> · opacity <b>${t.opacity??1}</b></p>
          <p class="muted">${esc(t.notes||"")}</p>
        </div>
      </div>
      <div class="item-actions">
        <button class="small danger" data-del-tex="${t.id}">🗑</button>
      </div>`;
    box.appendChild(item);
  }
  box.querySelectorAll("[data-del-tex]").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm(`Supprimer texture ${btn.dataset.delTex} ?`)) return;
      await api(`/api/poly-textures/${btn.dataset.delTex}`, { method:"DELETE" });
      toast("Texture supprimée", "success"); await load();
    })
  );
}

// ── Platforms ────────────────────────────────────────────────
function renderPlatforms() {
  const box = $("platformList");
  if (!box) return;
  box.innerHTML = "";
  for (const p of state.world.platforms || []) {
    const locked = p.locked ? "🔒" : "";
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div>
        <h4>${esc(p.name)} ${locked} <span class="badge">${esc(p.type)}</span></h4>
        <p class="mono">${esc(p.id)}</p>
        <p>pos [${p.position.map(v=>v.toFixed(1)).join(", ")}] · size [${p.size.map(v=>v.toFixed(1)).join(", ")}]</p>
        <p>mat: ${esc(p.material)} · <span style="color:${p.color}">●</span> ${p.color}</p>
      </div>
      <div class="item-actions">
        <button class="small" data-edit-platform="${p.id}">✏️</button>
        <button class="small danger" data-del-platform="${p.id}" ${p.id==="spawn_platform"?"disabled":""}>🗑</button>
      </div>`;
    box.appendChild(item);
  }
  box.querySelectorAll("[data-del-platform]").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm(`Supprimer platform ${btn.dataset.delPlatform} ?`)) return;
      await api(`/api/platforms/${btn.dataset.delPlatform}?force=1`, { method:"DELETE" });
      toast("Platform supprimée", "success"); await load();
    })
  );
  box.querySelectorAll("[data-edit-platform]").forEach(btn =>
    btn.addEventListener("click", () => openEditModal("platform", btn.dataset.editPlatform))
  );
}

// ── Props ────────────────────────────────────────────────────
function renderProps() {
  const box = $("propList");
  if (!box) return;
  box.innerHTML = "";
  for (const p of state.world.props || []) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div>
        <h4>${esc(p.name)} <span class="badge">${esc(p.type)}</span>${p.interactive?"<span class='badge green'>interactive</span>":""}</h4>
        <p class="mono">${esc(p.id)}</p>
        <p>pos [${p.position.map(v=>v.toFixed(1)).join(", ")}] · size [${p.size.map(v=>v.toFixed(1)).join(", ")}]</p>
        <p>mat: ${esc(p.material)} · <span style="color:${p.color}">●</span> ${p.color}</p>
      </div>
      <div class="item-actions">
        <button class="small" data-edit-prop="${p.id}">✏️</button>
        <button class="small danger" data-del-prop="${p.id}">🗑</button>
      </div>`;
    box.appendChild(item);
  }
  box.querySelectorAll("[data-del-prop]").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm(`Supprimer prop ${btn.dataset.delProp} ?`)) return;
      await api(`/api/props/${btn.dataset.delProp}`, { method:"DELETE" });
      toast("Prop supprimé", "success"); await load();
    })
  );
  box.querySelectorAll("[data-edit-prop]").forEach(btn =>
    btn.addEventListener("click", () => openEditModal("prop", btn.dataset.editProp))
  );
}

// ── Entities ─────────────────────────────────────────────────
function renderEntities() {
  const box = $("entityList");
  if (!box) return;
  box.innerHTML = "";
  if (!state.entities.length) {
    box.innerHTML = "<p class='muted' style='padding:12px'>Aucune entité. Crée-en une ci-dessus.</p>";
    return;
  }
  for (const e of state.entities) {
    const item = document.createElement("div");
    item.className = "item";
    const pos = e.position ? e.position.map(v=>Number(v).toFixed(1)).join(", ") : "?";
    item.innerHTML = `
      <div>
        <h4>${esc(e.name)} <span class="badge">${esc(e.type)}</span> <span class="badge">${esc(e.category)}</span></h4>
        <p class="mono">${esc(e.id)}</p>
        <p>pos [${pos}]${e.health !== undefined ? ` · HP <b>${e.health}/${e.maxHealth}</b>` : ""}
           ${e.state ? ` · état: <b>${esc(e.state)}</b>` : ""}</p>
        ${e.tags?.length ? `<p>🏷 ${e.tags.map(t=>`<span class='badge'>${esc(t)}</span>`).join(" ")}</p>` : ""}
      </div>
      <div class="item-actions">
        ${e.type==="npc" ? `<button class="small green" data-talk="${e.id}">💬</button>` : ""}
        ${e.interact !== undefined || e.type==="interactive_prop" ? `<button class="small" data-interact="${e.id}">⚡</button>` : ""}
        <button class="small danger" data-del-entity="${e.id}">🗑</button>
      </div>`;
    box.appendChild(item);
  }
  box.querySelectorAll("[data-del-entity]").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm(`Supprimer entité ${btn.dataset.delEntity} ?`)) return;
      await api(`/api/entities/${btn.dataset.delEntity}`, { method:"DELETE" });
      toast("Entité supprimée", "success"); await load();
    })
  );
  box.querySelectorAll("[data-talk]").forEach(btn =>
    btn.addEventListener("click", async () => {
      const r = await api(`/api/entities/${btn.dataset.talk}/talk`, { method:"POST", body: JSON.stringify({ playerId:"admin" }) });
      toast(`💬 ${r.speaker}: ${r.line}`, "info");
    })
  );
  box.querySelectorAll("[data-interact]").forEach(btn =>
    btn.addEventListener("click", async () => {
      const r = await api(`/api/entities/${btn.dataset.interact}/interact`, { method:"POST", body: JSON.stringify({ playerId:"admin" }) });
      toast(`⚡ ${r.result?.action || "interacted"} (uses: ${r.result?.useCount ?? "?"})`, "info");
    })
  );
}

// ── Players ──────────────────────────────────────────────────
function renderPlayers() {
  const box = $("playerList");
  if (!box) return;
  box.innerHTML = "";
  const players = Array.isArray(state.players) ? state.players : Object.values(state.players || {});
  if (!players.length) {
    box.innerHTML = "<p class='muted' style='padding:12px'>Aucun joueur connecté.</p>";
    return;
  }
  for (const p of players) {
    const item = document.createElement("div");
    item.className = "item";
    const pos = p.position ? p.position.map(v=>Number(v).toFixed(1)).join(", ") : "?";
    const since = p.connectedAt ? new Date(p.connectedAt).toLocaleTimeString() : "?";
    item.innerHTML = `
      <div>
        <h4>${esc(p.name || "Guest")} <span class="badge green">en ligne</span></h4>
        <p class="mono">${esc(p.id)}</p>
        <p>pos [${pos}] · connecté depuis ${since}</p>
      </div>`;
    box.appendChild(item);
  }
}

// ── Logs ─────────────────────────────────────────────────────
function renderLogs() {
  const box = $("logList");
  if (!box) return;
  box.innerHTML = "";
  for (const log of state.world?.logs || []) {
    const item = document.createElement("div");
    item.className = "item log-item";
    const detail = JSON.stringify(log.detail || {});
    const time   = new Date(log.at).toLocaleTimeString();
    item.innerHTML = `
      <div>
        <h4><span class="log-action">${esc(log.action)}</span> <span class="muted" style="font-size:12px">${time}</span></h4>
        <p class="mono" style="font-size:11px">${esc(log.id)}</p>
        <p class="muted" style="font-size:12px">${esc(detail)}</p>
      </div>`;
    box.appendChild(item);
  }
}

// ════════════════════════════════════════════════════════════
//  MODAL EDIT
// ════════════════════════════════════════════════════════════
function openEditModal(type, id) {
  const item = type === "platform"
    ? state.world.platforms.find(p => p.id === id)
    : state.world.props.find(p => p.id === id);
  if (!item) return;

  $("modalTitle").textContent = `Modifier ${type} — ${item.name}`;
  $("modalType").value  = type;
  $("modalId").value    = id;
  $("modalName").value  = item.name || "";
  $("modalColor").value = item.color || "#ffffff";
  $("modalPX").value    = item.position?.[0] ?? 0;
  $("modalPY").value    = item.position?.[1] ?? 0;
  $("modalPZ").value    = item.position?.[2] ?? 0;
  $("modalSX").value    = item.size?.[0] ?? 1;
  $("modalSY").value    = item.size?.[1] ?? 1;
  $("modalSZ").value    = item.size?.[2] ?? 1;
  $("editModal").classList.add("open");
}

// ════════════════════════════════════════════════════════════
//  SNAPSHOTS
// ════════════════════════════════════════════════════════════
async function loadSnapshots() {
  const box = $("snapshotList");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Chargement...</p>";
  try {
    const data = await api("/api/admin/snapshots");
    if (!data.files?.length) {
      box.innerHTML = "<p class='muted' style='padding:12px'>Aucun snapshot.</p>";
      return;
    }
    box.innerHTML = "";
    for (const f of data.files) {
      const item = document.createElement("div");
      item.className = "item";
      const ts = f.replace("snapshot-","").replace(".json","");
      const date = new Date(Number(ts)).toLocaleString();
      item.innerHTML = `
        <div>
          <h4>📸 ${esc(f)}</h4>
          <p class="muted">${date}</p>
        </div>`;
      box.appendChild(item);
    }
  } catch (e) {
    box.innerHTML = `<p class='muted'>Erreur: ${esc(e.message)}</p>`;
  }
}

// ════════════════════════════════════════════════════════════
//  WEBSOCKET
// ════════════════════════════════════════════════════════════
function connectWs() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws    = new WebSocket(`${proto}//${location.host}`);
  state.ws    = ws;

  ws.addEventListener("open", () => {
    $("wsLight").classList.add("on");
    $("serverStatus").textContent = "Live ✓";
  });

  ws.addEventListener("close", () => {
    $("wsLight").classList.remove("on");
    $("serverStatus").textContent = "Déconnecté";
    setTimeout(connectWs, 1500);
  });

  const reloadOn = new Set([
    "platform_created","platform_deleted","platform_updated",
    "prop_created","prop_deleted","prop_updated",
    "texture_created","texture_deleted","texture_updated",
    "entity_created","entity_deleted","entity_updated",
    "world_reset","world_saved","settings_updated",
    "logs_cleared",
  ]);

  ws.addEventListener("message", async (e) => {
    try {
      const msg = JSON.parse(e.data);

      // Players en temps réel
      if (msg.type === "player_joined" || msg.type === "player_left" || msg.type === "player_update") {
        await load(); return;
      }

      if (reloadOn.has(msg.type)) { await load(); return; }

      // Autosave indicator
      if (msg.type === "autosave") {
        $("lastSave").textContent = "Autosave: " + new Date(msg.at).toLocaleTimeString();
      }
    } catch {}
  });
}

// ════════════════════════════════════════════════════════════
//  TABS
// ════════════════════════════════════════════════════════════
function bindTabs() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      const tab = $(btn.dataset.tab);
      if (tab) tab.classList.add("active");
      $("pageTitle").textContent    = btn.textContent.trim();
      $("pageSubtitle").textContent = btn.dataset.subtitle || "";

      // Charger snapshots a la demande
      if (btn.dataset.tab === "snapshots") loadSnapshots();

      // Charger TroxT a la demande
      if (btn.dataset.tab === "troxt") {
        bindTroxtUI();
        await refreshTroxtPanel();
        await loadTroxtSkills();
        // Polling toutes les 5s quand onglet actif
        if (troxtState.polling) clearInterval(troxtState.polling);
        troxtState.polling = setInterval(refreshTroxtPanel, 5000);
      } else {
        if (troxtState.polling) { clearInterval(troxtState.polling); troxtState.polling = null; }
      }
    });
  });
}

// ════════════════════════════════════════════════════════════
//  ACTIONS
// ════════════════════════════════════════════════════════════
function bindActions() {
  // Token
  $("adminToken").value = localStorage.getItem("etherworld_admin_token") || "";
  $("saveToken").addEventListener("click", () => {
    localStorage.setItem("etherworld_admin_token", $("adminToken").value);
    toast("Token sauvegardé", "success");
  });

  // Topbar
  $("refreshBtn").addEventListener("click",    async () => { await load(); toast("Refresh OK", "success"); });
  $("saveWorldBtn").addEventListener("click",  async () => { await api("/api/world-state/save",  { method:"POST", body:"{}" }); toast("World sauvegardé", "success"); await load(); });
  $("exportWorldBtn").addEventListener("click",async () => { const r = await api("/api/admin/export", { method:"POST", body:"{}" }); toast(`Export: ${r.filename}`, "success"); });
  $("resetWorldBtn").addEventListener("click", async () => {
    if (!confirm("Reset complet du monde ?")) return;
    await api("/api/world-state/reset", { method:"POST", body:"{}" });
    toast("World reset", "info"); await load();
  });

  // Snapshot
  $("snapshotBtn")?.addEventListener("click", async () => {
    await api("/api/admin/snapshot", { method:"POST", body:"{}" });
    toast("Snapshot créé !", "success");
    await loadSnapshots();
  });

  // Clear logs
  $("clearLogsBtn")?.addEventListener("click", async () => {
    if (!confirm("Effacer tous les logs ?")) return;
    await api("/api/admin/clear-logs", { method:"POST", body:"{}" });
    toast("Logs effacés", "info"); await load();
  });

  // ── Texture ──────────────────────────────────────────────
  $("createTextureBtn").addEventListener("click", async () => {
    try {
      await api("/api/poly-textures", { method:"POST", body: JSON.stringify({
        name:      val("texName")     || "Poly Texture",
        category:  val("texCategory") || "custom",
        color:     val("texColor"),
        emission:  val("texEmission"),
        roughness: num("texRoughness"),
        metallic:  num("texMetallic"),
        normal:    num("texNormal"),
        ao:        num("texAo"),
        notes:     val("texNotes"),
      })});
      toast("Texture créée !", "success"); await load();
    } catch(e) { toast(e.message, "error"); }
  });

  // ── Platform ─────────────────────────────────────────────
  $("createPlatformBtn").addEventListener("click", async () => {
    try {
      await api("/api/platforms", { method:"POST", body: JSON.stringify({
        name:     val("platformName") || "Platform",
        type:     val("platformType") || "custom",
        color:    val("platformColor"),
        material: val("platformMaterial"),
        position: [num("platformX"), num("platformY"), num("platformZ")],
        size:     [num("platformSX"), num("platformSY"), num("platformSZ")],
      })});
      toast("Platform créée !", "success"); await load();
    } catch(e) { toast(e.message, "error"); }
  });

  // ── Prop ─────────────────────────────────────────────────
  $("createPropBtn").addEventListener("click", async () => {
    try {
      await api("/api/props", { method:"POST", body: JSON.stringify({
        name:        val("propName") || "Prop",
        type:        val("propType") || "cube",
        color:       val("propColor"),
        material:    val("propMaterial"),
        interactive: $("propInteractive")?.checked || false,
        position:    [num("propX"), num("propY"), num("propZ")],
        size:        [num("propSX"), num("propSY"), num("propSZ")],
      })});
      toast("Prop créé !", "success"); await load();
    } catch(e) { toast(e.message, "error"); }
  });

  // ── Entity ───────────────────────────────────────────────
  $("createEntityBtn")?.addEventListener("click", async () => {
    try {
      const type = val("entityTypeSel");
      const body = {
        type,
        name:     val("entityName") || type,
        position: [num("entityX"), num("entityY"), num("entityZ")],
        color:    val("entityColor") || "#ffffff",
      };
      // Champs spéciaux selon le type
      if (type === "npc") {
        body.displayName = val("entityName");
        body.role        = val("entityRole") || "civilian";
        body.dialogue    = val("entityDialogue").split("\n").filter(Boolean);
        body.health      = num("entityHealth") || 100;
      }
      if (type === "interactive_prop") {
        body.prompt     = val("entityPrompt") || "Appuyer sur E";
        body.cooldownMs = num("entityCooldown") || 1000;
        body.action     = val("entityAction") || "none";
      }
      if (type === "trigger_zone") {
        body.shape   = val("entityShape") || "box";
        body.size    = [num("entitySX")||4, num("entitySY")||3, num("entitySZ")||4];
        body.onEnter = val("entityOnEnter") || "none";
        body.oneShot = $("entityOneShot")?.checked || false;
      }
      await api("/api/entities", { method:"POST", body: JSON.stringify(body) });
      toast(`Entité ${type} créée !`, "success"); await load();
    } catch(e) { toast(e.message, "error"); }
  });

  // Champs dynamiques entity
  $("entityTypeSel")?.addEventListener("change", () => {
    const t = val("entityTypeSel");
    $("entityFieldsNpc")?.classList.toggle("hidden",          t !== "npc");
    $("entityFieldsInteractive")?.classList.toggle("hidden",  t !== "interactive_prop");
    $("entityFieldsTrigger")?.classList.toggle("hidden",      t !== "trigger_zone");
  });

  // ── Settings ─────────────────────────────────────────────
  $("saveSettingsBtn")?.addEventListener("click", async () => {
    try {
      const patch = {
        grid:        $("set_grid")?.checked,
        snap:        $("set_snap")?.checked,
        snapSize:    Number($("set_snapSize")?.value || 0.5),
        physicsDebug: $("set_physicsDebug")?.checked,
        adminTheme:  val("set_adminTheme"),
        maxPlayers:  Number($("set_maxPlayers")?.value || 50),
        gravity:     Number($("set_gravity")?.value || -9.81),
        fogEnabled:  $("set_fogEnabled")?.checked,
        fogColor:    val("set_fogColor"),
        fogNear:     Number($("set_fogNear")?.value || 80),
        fogFar:      Number($("set_fogFar")?.value || 200),
      };
      await api("/api/settings", { method:"PATCH", body: JSON.stringify(patch) });
      toast("Settings sauvegardés !", "success"); await load();
    } catch(e) { toast(e.message, "error"); }
  });

  // ── Spawn presets ────────────────────────────────────────
  document.querySelectorAll(".preset").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api("/api/admin/spawn-preset", { method:"POST", body: JSON.stringify({
          preset:   btn.dataset.preset,
          position: [num("spawnX"), num("spawnY"), num("spawnZ")],
        })});
        toast(`Spawn ${btn.dataset.preset} !`, "success"); await load();
      } catch(e) { toast(e.message, "error"); }
    });
  });

  // ── Modal edit save ──────────────────────────────────────
  $("modalSaveBtn")?.addEventListener("click", async () => {
    const type = val("modalType");
    const id   = val("modalId");
    const patch = {
      name:     val("modalName"),
      color:    val("modalColor"),
      position: [num("modalPX"), num("modalPY"), num("modalPZ")],
      size:     [num("modalSX"), num("modalSY"), num("modalSZ")],
    };
    try {
      await api(`/api/${type === "platform" ? "platforms" : "props"}/${id}?force=1`, {
        method:"PATCH", body: JSON.stringify(patch)
      });
      toast("Modifié !", "success");
      $("editModal").classList.remove("open");
      await load();
    } catch(e) { toast(e.message, "error"); }
  });

  $("modalCancelBtn")?.addEventListener("click", () => $("editModal").classList.remove("open"));
  $("editModal")?.addEventListener("click", (e) => { if (e.target === $("editModal")) $("editModal").classList.remove("open"); });
}

// ════════════════════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
//  TROXT ADMIN PANEL
// ════════════════════════════════════════════════════════════
const troxtState = { online: false, polling: null };

function addTroxtMessage(text, role = "troxt") {
  const box = $("troxtMessages");
  if (!box) return;
  const div = document.createElement("div");
  const isUser = role === "user";
  const isSystem = role === "system";
  div.style.cssText = `
    margin: 6px 0;
    padding: 8px 12px;
    border-radius: ${isUser ? "10px 10px 3px 10px" : "10px 10px 10px 3px"};
    background: ${isUser ? "rgba(0,229,255,0.12)" : isSystem ? "rgba(255,200,0,0.08)" : "rgba(60,255,158,0.08)"};
    border: 1px solid ${isUser ? "rgba(0,229,255,0.25)" : isSystem ? "rgba(255,200,0,0.2)" : "rgba(60,255,158,0.2)"};
    color: ${isUser ? "#e5f3ff" : isSystem ? "#ffcb6b" : "#b7ffea"};
    max-width: 90%;
    ${isUser ? "margin-left:auto" : ""};
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
  `;
  const prefix = isUser ? "👤 Toi" : isSystem ? "⚙️ System" : "🤖 TroxT";
  div.innerHTML = `<span style="opacity:0.6;font-size:11px">${prefix}</span><br>${esc(text)}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function sendTroxtMessage(message) {
  if (!message.trim()) return;
  addTroxtMessage(message, "user");
  $("troxtInput").value = "";

  try {
    const res = await api("/api/troxt/chat", {
      method: "POST",
      body: JSON.stringify({ message, playerId: "admin" }),
    });

    if (res.result?.summary) {
      addTroxtMessage(res.result.summary, "troxt");
    }

    // Si skill world action → refresh
    const worldSkills = new Set(["spawn_prop","create_platform","broadcast_chat","reset_world","cleanup_troxt_props","teleport_player"]);
    if (worldSkills.has(res.result?.skill)) {
      await load();
    }

    // Refresh mémoire + stats
    await refreshTroxtPanel();

  } catch (err) {
    addTroxtMessage("Erreur : " + err.message, "system");
  }
}

async function refreshTroxtPanel() {
  try {
    const [stateRes, memRes] = await Promise.all([
      api("/api/troxt/state"),
      api("/api/troxt/memory"),
    ]);

    const s = stateRes.state;

    // Indicateur online
    const light  = $("troxtLight");
    const status = $("troxtStatus");
    if (light && status) {
      const col = s.online ? "#3cff9e" : "#ff4d6d";
      light.style.background  = col;
      light.style.boxShadow   = `0 0 10px ${col}`;
      status.textContent      = s.online
        ? `En ligne · ${s.skillCount} skills · Load ${s.cognitiveLoad}%`
        : "Hors ligne";
    }

    // Stats cognitives
    const statsBox = $("troxtStats");
    if (statsBox) {
      statsBox.innerHTML = `
        <div>🧠 Conscience : <b style="color:#00e5ff">${s.consciousnessLv}/10</b></div>
        <div>⚡ Charge cognitive : <b>${s.cognitiveLoad}%</b></div>
        <div>📊 Requêtes : <b>${s.totalRequests}</b></div>
        <div>🎯 Actions : <b>${s.totalActions}</b></div>
        <div>💾 Mémoire : <b>${s.memorySize} entrées</b></div>
        <div>🕐 Démarré : <b>${new Date(s.startedAt).toLocaleTimeString()}</b></div>
      `;
    }

    // Mémoire récente
    const memBox = $("troxtMemory");
    if (memBox && memRes.memory) {
      memBox.innerHTML = memRes.memory.slice(0, 8).map(m => `
        <div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="color:${m.type === "user_input" ? "#00e5ff" : "#3cff9e"};font-size:10px">${m.type}</span>
          <span style="margin-left:6px">${esc(m.content.slice(0, 60))}${m.content.length > 60 ? "..." : ""}</span>
        </div>
      `).join("") || "<p style='opacity:0.5'>Aucune mémoire</p>";
    }

  } catch {}
}

async function loadTroxtSkills() {
  try {
    const res = await api("/api/troxt/skills");
    const box = $("troxtSkillList");
    if (!box) return;
    box.innerHTML = res.skills.map(s => `
      <div style="padding:5px 0;border-bottom:1px solid rgba(0,229,255,0.08);display:flex;align-items:center;gap:8px;cursor:pointer"
           class="troxt-skill-btn" data-skill="${s.id}" title="${esc(s.description)}">
        <span style="color:${s.dangerous ? "#ff4d6d" : "#00e5ff"};font-size:16px">${s.dangerous ? "⚠️" : "⚡"}</span>
        <div>
          <div style="color:#e5f3ff;font-size:12px">${esc(s.id.replace(/_/g," "))}</div>
          <div style="color:#667;font-size:10px">${esc(s.description)}</div>
        </div>
      </div>
    `).join("");

    box.querySelectorAll(".troxt-skill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        $("troxtInput").value = btn.dataset.skill.replace(/_/g, " ");
        $("troxtInput").focus();
      });
    });
  } catch {}
}

function bindTroxtUI() {
  const input  = $("troxtInput");
  const sendBtn = $("troxtSendBtn");
  if (!input || !sendBtn) return;

  sendBtn.addEventListener("click", () => sendTroxtMessage(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendTroxtMessage(input.value);
  });

  // Quick actions
  document.querySelectorAll(".troxt-quick").forEach(btn => {
    btn.addEventListener("click", () => sendTroxtMessage(btn.dataset.msg));
  });

  // Message de bienvenue
  addTroxtMessage("Bonjour Admin ! Je suis TroxT. Utilise les boutons rapides ou tape une commande.", "troxt");
  addTroxtMessage('Exemples : "spawn un cube rouge", "état du monde", "liste les joueurs", "aide"', "system");
}

async function start() {
  bindTabs();
  bindActions();
  connectWs();
  try {
    await load();
    toast("Admin prêt ✓", "success");
  } catch(e) {
    toast(e.message, "error");
    console.error(e);
  }
}

start();

