// ============================================================
//  NexusCore — CognitiveLoop
//  Perception → Attention → Reasoning → Action
//  The agent "thinks" in discrete ticks; each tick produces
//  one AgentAction.
// ============================================================
const DEFAULT_RULES = [
    {
        patterns: [/spawn|create|add|place/i],
        toolId: 'world.spawn',
        extractParams: (i) => ({ type: /\b(cube|sphere|tree|car|box)\b/i.exec(i)?.[1] ?? 'cube' }),
        confidence: 0.85,
        reasoning: 'User wants to spawn an object',
    },
    {
        patterns: [/teleport|move|goto|tp\b/i],
        toolId: 'world.teleport',
        extractParams: (i) => {
            const m = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/.exec(i);
            return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]), z: parseFloat(m[3]) } : { x: 0, y: 0, z: 0 };
        },
        confidence: 0.9,
        reasoning: 'User wants to teleport',
    },
    {
        patterns: [/weather|climat/i],
        toolId: 'world.weather',
        extractParams: (i) => ({ type: /\b(rain|snow|fog|clear|sun)\b/i.exec(i)?.[1] ?? 'clear' }),
        confidence: 0.88,
        reasoning: 'User wants to change weather',
    },
    {
        patterns: [/time|heure|hour|clock/i],
        toolId: 'world.time',
        extractParams: (i) => {
            const h = /\b(\d{1,2})\b/.exec(i);
            return { hour: h ? parseInt(h[1]) : 12 };
        },
        confidence: 0.85,
        reasoning: 'User wants to change time',
    },
    {
        patterns: [/remember|recall|memory|souvien/i],
        toolId: 'memory.recall',
        extractParams: (i) => ({ query: i }),
        confidence: 0.8,
        reasoning: 'User wants to query memory',
    },
];
export class CognitiveLoop {
    state;
    tools;
    memory;
    toolCtx;
    maxRecentPerceptions;
    constructor(opts) {
        this.tools = opts.tools;
        this.memory = opts.memory;
        this.maxRecentPerceptions = opts.maxRecentPerceptions ?? 20;
        this.toolCtx = {
            agentId: opts.agentId,
            role: opts.role,
            memory: opts.memory,
        };
        this.state = {
            agentId: opts.agentId,
            currentGoal: null,
            pendingIntentions: [],
            recentPerceptions: [],
            loopCount: 0,
            lastTickAt: Date.now(),
            status: 'idle',
        };
    }
    // ── Perception ────────────────────────────────────────────────
    perceive(raw, sensorType = 'input') {
        const p = {
            timestamp: Date.now(),
            sensorType,
            raw,
            context: { loopCount: this.state.loopCount },
        };
        this.state.recentPerceptions.push(p);
        if (this.state.recentPerceptions.length > this.maxRecentPerceptions) {
            this.state.recentPerceptions = this.state.recentPerceptions.slice(-this.maxRecentPerceptions);
        }
        return p;
    }
    // ── Reasoning ─────────────────────────────────────────────────
    async reason(perception) {
        const text = typeof perception.raw === 'string'
            ? perception.raw
            : JSON.stringify(perception.raw);
        const intentions = [];
        for (const rule of DEFAULT_RULES) {
            const matched = rule.patterns.some(p => p.test(text));
            if (matched && this.tools.has(rule.toolId)) {
                intentions.push({
                    goal: rule.toolId,
                    priority: rule.confidence,
                    toolId: rule.toolId,
                    toolParams: rule.extractParams(text),
                    confidence: rule.confidence,
                    reasoning: rule.reasoning,
                });
            }
        }
        // Sort by confidence descending
        intentions.sort((a, b) => b.confidence - a.confidence);
        // Store in memory
        if (intentions.length > 0) {
            this.memory.store({
                topic: 'cognition.intent',
                content: `Identified ${intentions.length} intentions from: "${text.slice(0, 80)}"`,
                importance: Math.max(...intentions.map(i => i.confidence)),
                tags: ['reasoning', ...intentions.map(i => i.toolId ?? 'unknown')],
            });
        }
        this.state.pendingIntentions = intentions;
        return intentions;
    }
    // ── Action ────────────────────────────────────────────────────
    async act(intention) {
        if (!intention.toolId) {
            return { ok: false, error: 'No tool specified in intention' };
        }
        this.state.status = 'acting';
        const result = await this.tools.execute(intention.toolId, intention.toolParams ?? {}, this.toolCtx);
        this.state.status = result.ok ? 'idle' : 'error';
        return result;
    }
    // ── Full tick ────────────────────────────────────────────────
    async tick(input) {
        this.state.loopCount++;
        this.state.lastTickAt = Date.now();
        this.state.status = 'thinking';
        const perception = this.perceive(input);
        const intentions = await this.reason(perception);
        if (intentions.length === 0) {
            this.state.status = 'idle';
            return {
                type: 'no_op',
                reasoning: `No known intent found in: "${String(input).slice(0, 60)}"`,
                confidence: 0,
            };
        }
        const best = intentions[0];
        if (best.confidence < 0.5) {
            this.state.status = 'idle';
            return {
                type: 'message',
                message: `Low-confidence match (${(best.confidence * 100).toFixed(0)}%). Did you mean: ${best.reasoning}?`,
                reasoning: best.reasoning,
                confidence: best.confidence,
            };
        }
        if (best.toolId && this.tools.has(best.toolId)) {
            const result = await this.act(best);
            return {
                type: 'tool_call',
                toolId: best.toolId,
                toolParams: best.toolParams,
                reasoning: best.reasoning,
                confidence: best.confidence,
                message: result.ok ? undefined : result.error,
            };
        }
        this.state.status = 'idle';
        return {
            type: 'message',
            message: best.reasoning,
            reasoning: best.reasoning,
            confidence: best.confidence,
        };
    }
    getState() {
        return { ...this.state };
    }
}
