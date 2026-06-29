// Bus d'événements typé, prioritaire avec historique
export class Arcadius {
  constructor() {
    this.listeners = new Map()
    this.history   = []
    this.middleware = []
  }

  // Abonnement avec priorité
  on(event, handler, priority = 5) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push({ handler, priority })
    // Trier par priorité (plus haute = premier)
    this.listeners.get(event).sort((a, b) => b.priority - a.priority)
  }

  // Émettre un événement
  async emit(event, data) {
    const entry = { event, data, timestamp: Date.now() }
    this.history.push(entry)

    // Passer par le middleware
    let processed = data
    for (const mw of this.middleware) {
      processed = await mw(event, processed)
    }

    // Déclencher les handlers
    const handlers = this.listeners.get(event) || []
    for (const { handler } of handlers) {
      await handler(processed)
    }

    return entry
  }

  // Ajouter middleware
  use(fn) {
    this.middleware.push(fn)
  }

  // Historique filtré
  getHistory(event, limit = 50) {
    return this.history
      .filter(h => !event || h.event === event)
      .slice(-limit)
  }
}