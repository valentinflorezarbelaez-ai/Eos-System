/**
 * @module ToolPruner
 * @version 1.0.0
 * @description Dynamic MCP Tool Pruning for EOS (LIDR & Vercel Principle).
 * Scopes available tools by lifecycle phase (explore, implement, verify) to reduce cognitive load and prevent hallucinations.
 */

export const TOOL_PHASES = Object.freeze(['explore', 'implement', 'verify', 'all']);

/**
 * Filter canonical MCP tools based on active phase.
 * @param {Array<object>} tools - Array of canonical tool definitions.
 * @param {string} [phase='all'] - Active phase ('explore' | 'implement' | 'verify' | 'all')
 * @returns {Array<object>}
 */
export function pruneToolsByPhase(tools = [], phase = 'all') {
  const normPhase = String(phase || 'all').toLowerCase().trim();

  if (normPhase === 'all' || !TOOL_PHASES.includes(normPhase)) {
    return tools;
  }

  switch (normPhase) {
    case 'explore':
      // Read-only tools for workspace discovery, context compiling, routing, and status
      return tools.filter((t) => {
        const sideEffects = String(t.sideEffects || '').toUpperCase();
        const category = String(t.category || '').toUpperCase();
        const name = String(t.name || '').toLowerCase();

        const isReadOnly = sideEffects === 'NONE' || sideEffects === 'READ_ONLY';
        const isDiscoveryCategory = ['WORKSPACE', 'CONTEXT', 'ROUTING', 'RELIABILITY'].includes(category);
        const isQueryName = name.includes('status') || name.includes('discover') || name.includes('get') || name.includes('inspect');

        return isReadOnly && (isDiscoveryCategory || isQueryName || category === 'MISSION');
      });

    case 'implement':
      // Tools for mission progression, code modifications, and ledger state transitions
      return tools.filter((t) => {
        const category = String(t.category || '').toUpperCase();
        const name = String(t.name || '').toLowerCase();

        return ['MISSION', 'LEDGER', 'SCAFFOLD'].includes(category) ||
               name.includes('expand') || name.includes('start') || name.includes('update') || name.includes('resolve');
      });

    case 'verify':
      // Tools for strict verification, invariant checking, auditing, and evidence recording
      return tools.filter((t) => {
        const category = String(t.category || '').toUpperCase();
        const name = String(t.name || '').toLowerCase();

        return ['QUALITY', 'EVIDENCE', 'GOVERNANCE'].includes(category) ||
               name.includes('verifier') || name.includes('evidence') || name.includes('audit') || name.includes('barrier');
      });

    default:
      return tools;
  }
}

/**
 * Resolves the active tool phase from CLI arguments or environment variables.
 * @param {string[]} [argv=process.argv]
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {string} One of 'explore' | 'implement' | 'verify' | 'all'
 */
export function resolveToolPhase(argv = process.argv, env = process.env) {
  for (const arg of argv) {
    if (arg.startsWith('--phase=')) {
      const p = arg.split('=')[1].toLowerCase().trim();
      if (TOOL_PHASES.includes(p)) return p;
    } else if (arg.startsWith('--tool-phase=')) {
      const p = arg.split('=')[1].toLowerCase().trim();
      if (TOOL_PHASES.includes(p)) return p;
    }
  }

  if (env.EOS_TOOL_PHASE) {
    const p = env.EOS_TOOL_PHASE.toLowerCase().trim();
    if (TOOL_PHASES.includes(p)) return p;
  }

  return 'all';
}
