// Mémoire persistante — TTL, LRU, versions, snapshots
export class Lotus {
  constructor(maxSize = 1000) {
    this.store   = new Map()
    this.maxSize = maxSize
    this.ttls    = new Map()
  }

  // Stocker avec TTL optionnel
  set(key, value, ttlMs = null) {
    // LRU: supprimer le plus ancien si plein
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value
      this.store.delete(oldest)
      this.ttls.delete(oldest)
    }

    this.store.set(key, {
      value,
      version:   (this.store.get(key)?.version ?? 0) + 1,
      createdAt: Date.now(),
    })

    if (ttlMs) {
      const timer = setTimeout(() => this.delete(key), ttlMs)
      this.ttls.set(key, timer)
    }
  }

  // Récupérer
  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null

    // Rafraîchir position LRU
    this.store.delete(key)
    this.store.set(key, entry)

    return entry.value
  }

  // Supprimer
  delete(key) {
    clearTimeout(this.ttls.get(key))
    this.ttls.delete(key)
    this.store.delete(key)
  }

  // Snapshot complet
  snapshot() {
    const snap = {}
    this.store.forEach((v, k) => { snap[k] = v })
    return snap
  }

  // Stats
  stats() {
    return {
      size:    this.store.size,
      maxSize: this.maxSize,
      keys:    [...this.store.keys()],
    }
  }
}