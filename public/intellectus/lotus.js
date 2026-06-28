export class LotusMemory {
  constructor() {
    this.versions = [];
    this.state = {
      players: [],
      houses: [],
      weapons: [],
      rpSchemas: [],
      buildPatches: [],
    };
  }

  read() {
    return structuredClone(this.state);
  }

  mutate(label, updater) {
    const next = structuredClone(this.state);
    updater(next);
    this.state = next;
    this.versions.unshift({
      id: crypto.randomUUID(),
      label,
      createdAt: new Date().toISOString(),
      state: structuredClone(this.state),
    });
    this.versions = this.versions.slice(0, 20);
    return this.read();
  }
}
