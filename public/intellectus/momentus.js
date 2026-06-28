export class MomentusScheduler {
  constructor() {
    this.tasks = new Map();
  }

  every(name, intervalMs, task) {
    this.stop(name);
    const timer = setInterval(task, intervalMs);
    this.tasks.set(name, timer);
    return timer;
  }

  stop(name) {
    const timer = this.tasks.get(name);
    if (timer) clearInterval(timer);
    this.tasks.delete(name);
  }

  stopAll() {
    for (const name of this.tasks.keys()) this.stop(name);
  }
}
