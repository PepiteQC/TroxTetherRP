	// C:\troxtetherworld\server\admin\commands\Command.js
export class Command {
  constructor(options) {
    this.name = options.name;
    this.description = options.description || '';
    this.category = options.category || 'general';
    this.permission = options.permission || 'admin';
    this.validate = options.validate || (() => ({ valid: true }));
    this.execute = options.execute;
    this.cooldown = options.cooldown || 0;
    this.cooldowns = new Map();
  }

  canExecute(executorId) {
    if (!this.cooldown) return true;
    
    const lastExec = this.cooldowns.get(executorId);
    if (lastExec && Date.now() - lastExec < this.cooldown) {
      return false;
    }
    
    this.cooldowns.set(executorId, Date.now());
    return true;
  }
}