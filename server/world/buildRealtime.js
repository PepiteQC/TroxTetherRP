export class BuildRealtime {
  constructor({ memory, bus }) {
    this.memory = memory;
    this.bus = bus;
  }

  async applyPatch(patch, actor = "system") {
    const saved = this.memory.mutate("build-patch", (state) => {
      state.buildPatches.push({
        id: crypto.randomUUID(),
        actor,
        patch,
        createdAt: new Date().toISOString(),
      });
    });
    await this.bus.emit("build.patch.applied", { actor, patch }, "normal");
    return saved.buildPatches.at(-1);
  }
}
