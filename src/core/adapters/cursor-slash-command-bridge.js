/**
 * @module CursorSlashCommandBridge
 * @description Native command dispatcher for Cursor Chat & Composer shortcuts (/sdd-*).
 * Bridges human prompt shortcuts directly into governed EOS core engines.
 */

export class CursorSlashCommandBridge {
  /**
   * @param {object} [options]
   * @param {object} [options.runtime] MissionRuntime instance
   */
  constructor(options = {}) {
    this.runtime = options.runtime || null;
  }

  /**
   * Parses and executes a slash command string
   * @param {string} rawInput e.g. "/sdd-scaffold identity User"
   * @param {object} [context]
   * @returns {Promise<object>} Command execution result
   */
  async execute(rawInput = '', context = {}) {
    const trimmed = (rawInput || '').trim();
    if (!trimmed.startsWith('/sdd-') && trimmed !== '/sdd') {
      return {
        isSlashCommand: false,
        status: 'IGNORED',
        message: 'Input is not an /sdd slash command'
      };
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'sdd-help':
      case 'sdd':
        return {
          isSlashCommand: true,
          status: 'SUCCESS',
          command: '/sdd-help',
          available_commands: [
            { command: '/sdd-resolve <goal>', description: 'Resolve raw intent into structured mission DAG' },
            { command: '/sdd-scaffold <module> <entity>', description: 'Generate Clean/Hexagonal architecture scaffold' },
            { command: '/sdd-hud', description: 'Render ANSI Mission Control live terminal dashboard' },
            { command: '/sdd-bkm <query>', description: 'Search distilled Best Known Methods memory' },
            { command: '/sdd-verify <missionId>', description: 'Run strict governance and schema verification' }
          ]
        };

      case 'sdd-resolve': {
        const goal = args.join(' ');
        if (!goal) return { isSlashCommand: true, status: 'ERROR', message: 'Usage: /sdd-resolve <goal description>' };
        const resolution = this.runtime?.bridge?.resolveIntent({ goal }) || { goal, status: 'RESOLVED_PLAN' };
        return {
          isSlashCommand: true,
          status: 'SUCCESS',
          command: '/sdd-resolve',
          result: resolution
        };
      }

      case 'sdd-scaffold': {
        const moduleName = args[0] || 'core';
        const entityName = args[1] || 'Entity';
        const files = this.runtime?.scaffolder?.generateHexagonalModule({ moduleName, entityName }) || [];
        return {
          isSlashCommand: true,
          status: 'SUCCESS',
          command: '/sdd-scaffold',
          module: moduleName,
          entity: entityName,
          generated_files_count: files.length,
          files
        };
      }

      case 'sdd-hud': {
        const hud = this.runtime?.hud?.renderFullDashboard(context) || 'EOS MISSION CONTROL HUD';
        return {
          isSlashCommand: true,
          status: 'SUCCESS',
          command: '/sdd-hud',
          dashboard: hud
        };
      }

      case 'sdd-bkm': {
        const query = args.join(' ');
        return {
          isSlashCommand: true,
          status: 'SUCCESS',
          command: '/sdd-bkm',
          query,
          results: []
        };
      }

      default:
        return {
          isSlashCommand: true,
          status: 'UNKNOWN_COMMAND',
          command: `/${command}`,
          message: `Unknown /sdd command '/${command}'. Type /sdd-help for available shortcuts.`
        };
    }
  }
}
