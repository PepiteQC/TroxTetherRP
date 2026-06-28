// C:\troxtetherworld\server\admin\commands\advanced\advancedCommandsLoader.js
import { economyCommands } from './economyCommands.js';
import { worldCommands } from './worldCommands.js';
import { playerCommands } from './playerCommands.js';
import { factionCommands } from './factionCommands.js';
import { debugCommands } from './debugCommands.js';

export function loadAdvancedCommands(executor) {
  const allCommands = [
    ...economyCommands,
    ...worldCommands,
    ...playerCommands,
    ...factionCommands,
    ...debugCommands
  ];

  allCommands.forEach(cmd => executor.register(cmd));
  console.log(`[Commands] ${allCommands.length} commandes avancées chargées`);
  return allCommands;
}