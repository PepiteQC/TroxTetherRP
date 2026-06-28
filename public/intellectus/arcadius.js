export class ArcadiusBus {
  constructor() {
    this.history = [];
    this.listeners = new Map();
  }

  on(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  async emit(type, payload, priority = "normal") {
    const event = {
      id: crypto.randomUUID(),
      type,
      payload,
      priority,
      createdAt: new Date().toISOString(),
    };
    this.history.unshift(event);
    this.history = this.history.slice(0, 100);

    const handlers = this.listeners.get(type) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
    return event;
  }
}
