"use strict";
// packages/shared/src/constants/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_SAVE_MS = exports.NETWORK = exports.PLAYER_DEFAULTS = exports.WORLD = exports.HTTP_STATUS = exports.WS_EVENTS = exports.CLIENT_CONFIG = exports.SERVER_CONFIG = void 0;
// ═══════════════════════════════════════════
// Constantes partagées
// ═══════════════════════════════════════════
exports.SERVER_CONFIG = {
    DEFAULT_PORT: 3001,
    DEFAULT_WS_PORT: 3002,
    DEFAULT_MAX_PLAYERS: 100,
    DEFAULT_TICK_RATE: 20, // 20 ticks/sec
    API_VERSION: 'v1',
    API_PREFIX: '/api/v1',
};
exports.CLIENT_CONFIG = {
    DEFAULT_PORT: 5173,
    ADMIN_PORT: 5174,
};
exports.WS_EVENTS = {
    // Client → Server
    PLAYER_MOVE: 'player:move',
    PLAYER_ACTION: 'player:action',
    CHAT_SEND: 'chat:send',
    PING: 'ping',
    // Server → Client
    WORLD_STATE: 'world:state',
    PLAYER_JOINED: 'player:joined',
    PLAYER_LEFT: 'player:left',
    PLAYER_UPDATED: 'player:updated',
    CHAT_MESSAGE: 'chat:message',
    SYSTEM_MESSAGE: 'system:message',
    PONG: 'pong',
    // Bidirectional
    ERROR: 'error',
    DISCONNECT: 'disconnect',
    CONNECT: 'connect',
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
};
exports.WORLD = {
    DEFAULT_SIZE: { x: 1000, y: 100, z: 1000 },
    SPAWN_POINT: { x: 0, y: 1, z: 0 },
    GRAVITY: -9.81,
    MAX_CHAT_LENGTH: 500,
    MAX_USERNAME_LENGTH: 32,
    MIN_USERNAME_LENGTH: 3,
};
exports.PLAYER_DEFAULTS = {
    HEALTH: 100,
    MAX_HEALTH: 100,
    LEVEL: 1,
    EXPERIENCE: 0,
    MOVE_SPEED: 5,
    SPRINT_MULTIPLIER: 1.5,
};
// ── Network constants ────────────────────────────────────────
exports.NETWORK = {
    DEFAULT_PORT: 3001,
    DEFAULT_WS_PORT: 3002,
    MAX_PLAYERS: 100,
};
// ── Auto-save ────────────────────────────────────────────────
exports.AUTO_SAVE_MS = 60_000;
