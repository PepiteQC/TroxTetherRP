// ============================================================
//  NexusCore — MemorySystem
//  Episodic (events) + Semantic (facts) memory.
//  Fully local, no external dependency.
// ============================================================
function uid() {
    return Math.random().toString(36).slice(2, 12).toUpperCase();
}
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2);
}
function similarity(a, b) {
    const ta = new Set(tokenize(a));
    const tb = new Set(tokenize(b));
    if (ta.size === 0 || tb.size === 0)
        return 0;
    let overlap = 0;
    for (const t of ta)
        if (tb.has(t))
            overlap++;
    return overlap / Math.max(ta.size, tb.size);
}
export class MemorySystem {
    episodic = [];
    semantic = new Map();
    maxEpisodic;
    constructor(options = {}) {
        this.maxEpisodic = options.maxEpisodic ?? 500;
    }
    // ── Episodic ────────────────────────────────────────────────
    store(entry) {
        const full = {
            ...entry,
            id: uid(),
            timestamp: Date.now(),
        };
        this.episodic.push(full);
        // Prune oldest low-importance entries when over cap
        if (this.episodic.length > this.maxEpisodic) {
            this.episodic.sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp);
            this.episodic = this.episodic.slice(0, this.maxEpisodic);
        }
        return full;
    }
    recall(query, topK = 5) {
        if (this.episodic.length === 0)
            return [];
        return this.episodic
            .map(e => ({
            entry: e,
            score: similarity(query, e.content) * 0.5 +
                similarity(query, e.topic) * 0.3 +
                e.importance * 0.2,
        }))
            .filter(x => x.score > 0.05)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map(x => x.entry);
    }
    // ── Semantic ────────────────────────────────────────────────
    remember(fact) {
        const key = `${fact.subject}::${fact.predicate}`;
        const existing = this.semantic.get(key);
        // Merge: higher confidence wins, or update if same source
        if (existing && existing.confidence >= fact.confidence && existing.source !== fact.source) {
            return existing;
        }
        const full = {
            ...fact,
            id: existing?.id ?? uid(),
            updatedAt: Date.now(),
        };
        this.semantic.set(key, full);
        return full;
    }
    lookup(subject, predicate) {
        const results = [];
        for (const fact of this.semantic.values()) {
            const subjectMatch = fact.subject.toLowerCase().includes(subject.toLowerCase());
            const predicateMatch = predicate === undefined || fact.predicate === predicate;
            if (subjectMatch && predicateMatch)
                results.push(fact);
        }
        return results;
    }
    forget(id) {
        // Episodic
        const eidx = this.episodic.findIndex(e => e.id === id);
        if (eidx >= 0) {
            this.episodic.splice(eidx, 1);
            return true;
        }
        // Semantic
        for (const [key, fact] of this.semantic.entries()) {
            if (fact.id === id) {
                this.semantic.delete(key);
                return true;
            }
        }
        return false;
    }
    clear() {
        this.episodic = [];
        this.semantic.clear();
    }
    stats() {
        const topics = this.episodic
            .slice(-20)
            .map(e => e.topic)
            .filter((t, i, arr) => arr.indexOf(t) === i)
            .slice(0, 5);
        return {
            episodicCount: this.episodic.length,
            semanticCount: this.semantic.size,
            oldestEpisodic: this.episodic.length > 0
                ? Math.min(...this.episodic.map(e => e.timestamp))
                : null,
            recentTopics: topics,
        };
    }
}
