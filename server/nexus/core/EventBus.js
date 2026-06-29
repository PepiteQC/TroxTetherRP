// ============================================================
//  NexusCore — EventBus
//  Wildcard Pub/Sub event system.
//  Topics support glob-style patterns: "entity.*.damage"
// ============================================================
function uid() {
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function topicMatches(pattern, topic) {
    if (pattern === '*' || pattern === topic)
        return true;
    const re = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$');
    return re.test(topic);
}
export class EventBus {
    subscriptions = [];
    log = [];
    maxLog;
    constructor(options = {}) {
        this.maxLog = options.maxLog ?? 1000;
    }
    // ── Publish ──────────────────────────────────────────────────
    publish(topic, payload, source = 'system') {
        const event = {
            id: uid(),
            topic,
            payload,
            timestamp: Date.now(),
            source,
        };
        // Log
        this.log.push(event);
        if (this.log.length > this.maxLog) {
            this.log = this.log.slice(-this.maxLog);
        }
        // Dispatch
        const matching = this.subscriptions.filter(s => topicMatches(s.pattern, topic));
        for (const sub of matching) {
            try {
                const result = sub.handler(event);
                if (result instanceof Promise)
                    result.catch(() => undefined);
            }
            catch {
                // Don't let one bad handler break others
            }
        }
        return event;
    }
    // ── Subscribe ────────────────────────────────────────────────
    subscribe(pattern, handler) {
        const sub = {
            id: uid(),
            pattern,
            handler: handler,
        };
        this.subscriptions.push(sub);
        return () => {
            this.subscriptions = this.subscriptions.filter(s => s.id !== sub.id);
        };
    }
    subscribeAll(handler) {
        return this.subscribe('*', handler);
    }
    once(topic) {
        return new Promise(resolve => {
            const unsub = this.subscribe(topic, event => {
                unsub();
                resolve(event);
            });
        });
    }
    // ── History ──────────────────────────────────────────────────
    history(filter) {
        let result = [...this.log];
        if (filter?.topic)
            result = result.filter(e => topicMatches(filter.topic, e.topic));
        if (filter?.since)
            result = result.filter(e => e.timestamp >= filter.since);
        if (filter?.limit)
            result = result.slice(-filter.limit);
        return result;
    }
    listenerCount(pattern) {
        return this.subscriptions.filter(s => s.pattern === pattern).length;
    }
    clearHistory() {
        this.log = [];
    }
}
