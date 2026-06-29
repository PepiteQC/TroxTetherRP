// ============================================================
//  NexusCore — AutonomousAgent
//  Composes MemorySystem + ToolManager + CognitiveLoop into
//  a self-contained intelligent agent.
// ============================================================
import { MemorySystem } from '../core/MemorySystem.js';
import { ToolManager } from '../core/ToolManager.js';
import { CognitiveLoop } from '../core/CognitiveLoop.js';
export class AutonomousAgent {
    id;
    config;
    memory;
    toolManager;
    loop;
    startedAt;
    constructor(config, extraTools) {
        this.id = config.id;
        this.config = config;
        this.startedAt = Date.now();
        // Memory
        this.memory = new MemorySystem({ maxEpisodic: config.maxMemoryEntries ?? 300 });
        // Tool manager — merge passed tools
        this.toolManager = new ToolManager();
        if (extraTools) {
            for (const tool of extraTools.list()) {
                if (config.enableTools.includes(tool.id)) {
                    this.toolManager.register(tool);
                }
            }
        }
        // Cognitive loop
        this.loop = new CognitiveLoop({
            agentId: config.id,
            role: config.role,
            tools: this.toolManager,
            memory: this.memory,
        });
        // Boot memory entry
        if (config.enableMemory) {
            this.memory.store({
                topic: 'agent.boot',
                content: `Agent ${config.name} (${config.id}) booted with ${config.enableTools.length} tools`,
                importance: 0.7,
                tags: ['system', 'boot'],
            });
        }
    }
    // ── Core API ─────────────────────────────────────────────────
    async think(input) {
        const action = await this.loop.tick(input);
        if (this.config.enableMemory) {
            this.memory.store({
                topic: 'agent.action',
                content: `[${action.type}] ${action.reasoning.slice(0, 120)}`,
                importance: action.confidence,
                tags: ['action', action.type, action.toolId ?? 'no-tool'],
            });
        }
        return action;
    }
    getMemory() {
        return this.memory;
    }
    getState() {
        return this.loop.getState();
    }
    exportState() {
        return {
            config: this.config,
            cognitiveState: this.loop.getState(),
            memoryStats: this.memory.stats(),
            toolIds: this.toolManager.list().map(t => t.id),
            uptime: Date.now() - this.startedAt,
        };
    }
    reset() {
        this.memory.clear();
    }
    // ── Tool Management ──────────────────────────────────────────
    registerTool(tool) {
        if (this.config.enableTools.includes(tool.id)) {
            this.toolManager.register(tool);
        }
    }
    listTools() {
        return this.toolManager.list();
    }
}
