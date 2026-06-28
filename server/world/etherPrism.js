export function createBaseRpSchema() {
  return {
    id: "troxt-rp-base-v1",
    language: "fr-QC",
    player: {
      identity: ["steamId", "displayName", "citizenId", "wallet", "bank", "job", "faction"],
      state: ["health", "hunger", "thirst", "stress", "wantedLevel"],
    },
    house: {
      fields: ["ownerId", "price", "keys", "doors", "storage", "mortgage", "builderSlots"],
      actions: ["buy", "sell", "rent", "giveKey", "lockDoor", "decorate"],
    },
    builder3d: {
      props: ["wall", "floor", "door", "window", "light", "garage", "furniture"],
      validation: ["owner-only", "zone-lock", "prop-limit", "collision-check"],
    },
    weapons: {
      actions: ["register", "equip", "repair", "seize", "blackMarketTrade"],
      guard: ["license-check", "serial-number", "anti-duplication"],
    },
    luaPattern: {
      eventPrefix: "troxt:rp",
      serverValidates: true,
      clientDisplaysOnly: true,
    },
  };
}

export function createCommandBlueprint(prompt, risk) {
  const wantsGang = prompt.toLowerCase().includes("gang");
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    prompt,
    risk,
    summary: wantsGang
      ? "Blueprint gang: territoire, economie, missions dynamiques et garde anti-abus."
      : "Blueprint RP: schema joueur, maison, Builder3D, armes et connexions serveur.",
    luaPattern: {
      shared: "Config.TroxTModule = { serverAuthority = true, eventPrefix = 'troxt:rp' }",
      server: "RegisterNetEvent('troxt:rp:request', function(payload) -- validate server-side end)",
      client: "TriggerServerEvent('troxt:rp:request', payload) -- display only",
    },
    nodeApi: ["GET /api/world/schema", "POST /api/admin/command", "POST /api/build/patch"],
    checks: ["ThirdEye before execute", "Benedictus contract", "Decaprius rollback-ready"],
  };
}
