// ============================================================
//  NexusCore — ToolManager
//  Register + execute tools with role-based access control.
//  Each tool declares its required role; execution validates
//  the caller's role before invoking the handler.
// ============================================================
const ROLE_LEVEL = {
    spectator: 0,
    player: 1,
    builder: 2,
    mod: 3,
    admin: 4,
};
function hasPermission(callerRole, requiredRole) {
    return ROLE_LEVEL[callerRole] >= ROLE_LEVEL[requiredRole];
}
export class ToolManager {
    tools = new Map();
    executionLog = [];
    maxLog = 200;
    // ── Registration ────────────────────────────────────────────
    register(tool) {
        if (this.tools.has(tool.id)) {
            throw new Error(`Tool "${tool.id}" is already registered. Unregister first.`);
        }
        this.validateDefinition(tool);
        this.tools.set(tool.id, tool);
    }
    unregister(id) {
        return this.tools.delete(id);
    }
    has(id) {
        return this.tools.has(id);
    }
    list(category) {
        const all = Array.from(this.tools.values());
        return category ? all.filter(t => t.category === category) : all;
    }
    // ── Execution ────────────────────────────────────────────────
    async execute(id, params, ctx) {
        const tool = this.tools.get(id);
        if (!tool) {
            return { ok: false, error: `Unknown tool: "${id}"` };
        }
        // Role check
        if (!hasPermission(ctx.role, tool.requiresRole)) {
            return {
                ok: false,
                error: `Permission denied: tool "${id}" requires role "${tool.requiresRole}", caller has "${ctx.role}"`,
            };
        }
        // Parameter validation
        const validationError = this.validateParams(tool, params);
        if (validationError) {
            return { ok: false, error: validationError };
        }
        // Fill defaults
        const filledParams = this.fillDefaults(tool, params);
        // Execute with timing
        const start = Date.now();
        let result;
        try {
            result = await tool.handler(filledParams, ctx);
        }
        catch (e) {
            result = { ok: false, error: String(e) };
        }
        const durationMs = Date.now() - start;
        // Log
        this.executionLog.push({ toolId: id, agentId: ctx.agentId, params: filledParams, result, durationMs, timestamp: start });
        if (this.executionLog.length > this.maxLog) {
            this.executionLog = this.executionLog.slice(-this.maxLog);
        }
        return result;
    }
    // ── Audit ────────────────────────────────────────────────────
    getExecutionLog(filter) {
        let log = [...this.executionLog];
        if (filter?.toolId)
            log = log.filter(r => r.toolId === filter.toolId);
        if (filter?.agentId)
            log = log.filter(r => r.agentId === filter.agentId);
        if (filter?.since)
            log = log.filter(r => r.timestamp >= filter.since);
        return log;
    }
    clearLog() {
        this.executionLog = [];
    }
    // ── Private ──────────────────────────────────────────────────
    validateDefinition(tool) {
        if (!tool.id || typeof tool.id !== 'string')
            throw new Error('Tool must have a string id');
        if (!tool.handler || typeof tool.handler !== 'function')
            throw new Error(`Tool "${tool.id}" must have a handler function`);
    }
    validateParams(tool, params) {
        for (const p of tool.parameters) {
            if (p.required && !(p.name in params)) {
                return `Missing required parameter "${p.name}" for tool "${tool.id}"`;
            }
        }
        return null;
    }
    fillDefaults(tool, params) {
        const filled = { ...params };
        for (const p of tool.parameters) {
            if (!(p.name in filled) && p.default !== undefined) {
                filled[p.name] = p.default;
            }
        }
        return filled;
    }
}
