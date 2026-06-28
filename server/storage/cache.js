export class HotCache {
  constructor() {
    this.items = new Map();
  }

  set(key, value, ttlMs = 0) {
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0;
    this.items.set(key, { value, expiresAt });
    return value;
  }

  get(key) {
    const entry = this.items.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.items.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key) {
    return this.items.delete(key);
  }

  snapshot() {
    return Array.from(this.items.entries()).map(([key, entry]) => ({
      key,
      expiresAt: entry.expiresAt,
      value: entry.value,
    }));
  }
}

export const hotCache = new HotCache();
