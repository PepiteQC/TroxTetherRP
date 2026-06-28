// C:\troxtetherworld\server\admin\commands\Executor.js
export class CommandExecutor {
  constructor(kernel) {
    this.kernel = kernel;
    this.commands = new Map();
    this.history = [];
    this.maxHistory = 1000;
  }

  register(command) {
    if (this.commands.has(command.name)) {
      throw new Error(`Commande ${command.name} déjà enregistrée`);
    }
    this.commands.set(command.name, command);
    console.log(`[Commands] ${command.name} enregistrée`);
  }

  async execute(commandName, params = {}, executor = 'system') {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Commande inconnue: ${commandName}`);
    }

    // Vérifier les permissions
    if (!this._checkPermission(executor, command.permission)) {
      throw new Error('Permissions insuffisantes');
    }

    // Valider les paramètres
    const validation = command.validate(params);
    if (!validation.valid) {
      throw new Error(`Paramètres invalides: ${validation.errors.join(', ')}`);
    }

    // Log la commande
    const entry = {
      command: commandName,
      params,
      executor,
      timestamp: Date.now(),
      status: 'pending'
    };
    this.history.push(entry);

    try {
      // Exécuter
      const result = await command.execute(params, this.kernel);
      
      entry.status = 'completed';
      entry.result = result;
      entry.duration = Date.now() - entry.timestamp;

      // Émettre événement
      this.kernel.bus.emit('command:executed', {
        command: commandName,
        result,
        executor,
        duration: entry.duration
      });

      return { success: true, data: result };
    } catch (error) {
      entry.status = 'failed';
      entry.error = error.message;
      
      console.error(`[Commands] Erreur ${commandName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  getHistory(filter = {}) {
    let history = [...this.history];
    
    if (filter.command) {
      history = history.filter(h => h.command === filter.command);
    }
    if (filter.status) {
      history = history.filter(h => h.status === filter.status);
    }
    if (filter.executor) {
      history = history.filter(h => h.executor === filter.executor);
    }
    
    return history.slice(-100);
  }

  _checkPermission(executor, required) {
    if (!required || required === 'everyone') return true;
    // TODO: Vérifier les permissions réelles de l'executor
    return true;
  }
}