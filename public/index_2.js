"use strict";
// packages/shared/src/utils/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiResponse = createApiResponse;
exports.createApiError = createApiError;
exports.createWSMessage = createWSMessage;
exports.generateId = generateId;
exports.clamp = clamp;
exports.distance3D = distance3D;
exports.lerp = lerp;
exports.lerpVector3 = lerpVector3;
exports.formatUptime = formatUptime;
exports.isValidUsername = isValidUsername;
exports.sanitizeChat = sanitizeChat;
exports.getPublicSettings = getPublicSettings;
// ═══════════════════════════════════════════
// Utilitaires partagés
// ═══════════════════════════════════════════
function createApiResponse(data) {
    return {
        success: true,
        data,
        timestamp: Date.now(),
    };
}
function createApiError(code, message) {
    return {
        success: false,
        error: { code, message },
        timestamp: Date.now(),
    };
}
function createWSMessage(type, payload) {
    return {
        type,
        payload,
        timestamp: Date.now(),
        requestId: generateId(),
    };
}
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function distance3D(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
}
function lerpVector3(a, b, t) {
    return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        z: lerp(a.z, b.z, t),
    };
}
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0)
        return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
function isValidUsername(username) {
    return (username.length >= 3 &&
        username.length <= 32 &&
        /^[a-zA-Z0-9_-]+$/.test(username));
}
function sanitizeChat(message) {
    return message
        .trim()
        .substring(0, 500)
        .replace(/[<>]/g, '');
}
// ── Server utils ─────────────────────────────────────────────
function getPublicSettings(settings) {
    return {
        server: {
            name: settings?.server?.name ?? "TroxT RP",
            version: settings?.server?.version ?? "1.0.0",
        },
        world: {
            name: settings?.world?.name ?? "Etherworld",
            weather: settings?.world?.weather ?? "clear",
        },
        websocket: {
            maxConnections: settings?.websocket?.maxConnections ?? 100,
        },
    };
}
