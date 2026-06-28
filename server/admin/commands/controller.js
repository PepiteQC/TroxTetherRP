// C:\troxtetherworld\server\admin\commands\controller.js
import { CommandExecutor } from './Executor.js';

export class CommandController {
  constructor() {
    this.executor = null;
  }

  initialize(kernel) {
    this.executor = new CommandExecutor(kernel);
    this._registerDefaultCommands(kernel);
  }

  listCommands(req, res) {
    const commands = Array.from(this.executor.commands.values()).map(c => ({
      name: c.name,
      description: c.description,
      category: c.category,
      permission: c.permission
    }));
    res.json({ success: true, data: commands });
  }

  async executeCommand(req, res) {
    try {
      const { command, params } = req.body;
      const result = await this.executor.execute(command, params, req.user?.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async executeByName(req, res) {
    try {
      const result = await this.executor.execute(req.params.name, req.body, req.user?.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getHistory(req, res) {
    const history = this.executor.getHistory(req.query);
    res.json({ success: true, data: history });
  }

  _registerDefaultCommands(kernel) {
    const { defaultCommands } = require('./defaults.js');
    defaultCommands.forEach(cmd => this.executor.register(cmd));
  }
}