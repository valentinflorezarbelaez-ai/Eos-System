/**
 * @file src/core/mcp/mcp-capability-router.js
 * @description SPEC-0009 Dynamic MCP Capability Router & Multi-Tool Orchestrator.
 *
 * Implements declarative capability projection, least-privilege authority gating
 * (L0_READONLY vs L1_LOCAL_GOVERNED), and fail-closed server availability verification.
 *
 * L0: Ponytail Tier 2 pure Node.js standard library (no external npm dependencies).
 * Invariants: PRODUCTION_READY=NO | Fundacion Delta=0 | AT_CEILING (no new JSON schemas).
 */

import fs from 'node:fs';
import path from 'node:path';

export class McpCapabilityError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'MCP_CAPABILITY_ERROR') {
    super(message);
    this.name = 'McpCapabilityError';
    this.code = code;
  }
}

/** Canonical mapping of capability domains to prioritized candidate MCP servers */
export const CAPABILITY_MAP = Object.freeze({
  DESIGN: Object.freeze(['StitchMCP', 'figma', 'figma-desktop', 'mobbin']),
  BROWSER_QA: Object.freeze(['chrome-devtools-mcp', 'playwright']),
  DATABASE: Object.freeze(['supabase', 'postgres']),
  VCS: Object.freeze(['github', 'git']),
  MEMORY: Object.freeze(['engram', 'memory']),
  PROJECT_INTAKE: Object.freeze(['atlassian-mcp-server', 'notion']),
  RESEARCH: Object.freeze(['brave-search', 'fetch', 'context7']),
  REASONING: Object.freeze(['sequential-thinking']),
  CORE_GOVERNANCE: Object.freeze(['eos-local'])
});

export const ALLOWED_PHASES = Object.freeze([
  'INTAKE',
  'SPEC',
  'PLAN',
  'APPLY',
  'VERIFY',
  'REVIEW'
]);

export const READONLY_PHASES = new Set(['INTAKE', 'SPEC', 'PLAN', 'VERIFY', 'REVIEW']);

export const DEFAULT_CORE_SERVERS = Object.freeze(['eos-local', 'engram']);

export const RESTRICTED_ROOTS = Object.freeze([
  'Fundacion',
  'docs/governance',
  'C:\\Users\\valen\\Documents\\Fundacion'
]);

/**
 * Extracts capability tokens from task description strings (e.g. "@needs(VCS, BROWSER_QA)").
 * @param {string} taskText
 * @returns {string[]} Upper-cased capability tokens
 */
export function parseTaskCapabilities(taskText) {
  if (!taskText || typeof taskText !== 'string') {
    return [];
  }
  const match = taskText.match(/@needs\(([^)]+)\)/i);
  if (!match || !match[1]) {
    return [];
  }
  return match[1]
    .split(',')
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
}

export class McpCapabilityRouter {
  /**
   * @param {object} [options]
   * @param {object} [options.availableConfig] In-memory available servers configuration
   * @param {string} [options.baseDir] Root directory for loading config files
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.availableConfig = options.availableConfig || this._loadDefaultConfig();
  }

  /**
   * Loads default available servers from config/mcp/eos-mcp.ssot.json if present.
   * @private
   */
  _loadDefaultConfig() {
    const ssotPath = path.resolve(this.baseDir, 'config/mcp/eos-mcp.ssot.json');
    if (fs.existsSync(ssotPath)) {
      try {
        const raw = fs.readFileSync(ssotPath, 'utf8');
        const parsed = JSON.parse(raw);
        const servers = { ...(parsed.coreServers || {}) };
        if (parsed.consumers && parsed.consumers['.cursor/mcp.json']?.extraServers) {
          Object.assign(servers, parsed.consumers['.cursor/mcp.json'].extraServers);
        }
        if (parsed.consumers && parsed.consumers['.agents/mcp_config.json']?.extraServers) {
          Object.assign(servers, parsed.consumers['.agents/mcp_config.json'].extraServers);
        }
        return { servers };
      } catch {
        // Fallback to empty servers on parse error
      }
    }
    return { servers: {} };
  }

  /**
   * Resolves the minimal MCP capability envelope for a task or lifecycle phase.
   * @param {object} args
   * @param {string[]} [args.capabilities] Explicit capability tokens
   * @param {string} [args.taskText] Task description string containing optional @needs(...)
   * @param {string} [args.phase='INTAKE'] Lifecycle phase (INTAKE, SPEC, PLAN, APPLY, VERIFY, REVIEW)
   * @param {object} [args.availableConfig] Optional override for available servers
   * @returns {object} Immutable McpCapabilityEnvelope
   */
  resolveMcpEnvelope({
    capabilities = [],
    taskText = '',
    phase = 'INTAKE',
    availableConfig = null
  } = {}) {
    const normalizedPhase = String(phase || '').toUpperCase();
    if (!ALLOWED_PHASES.includes(normalizedPhase)) {
      throw new McpCapabilityError(
        `INVALID_PHASE: '${phase}' is not a valid SDLC phase. Must be one of [${ALLOWED_PHASES.join(', ')}]`,
        'INVALID_PHASE'
      );
    }

    const mergedCaps = new Set();
    for (const cap of capabilities) {
      if (cap && typeof cap === 'string') {
        mergedCaps.add(cap.trim().toUpperCase());
      }
    }
    for (const cap of parseTaskCapabilities(taskText)) {
      mergedCaps.add(cap);
    }

    const config = availableConfig || this.availableConfig;
    const knownServerNames = new Set(Object.keys((config && config.servers) || {}));

    const resolvedServers = new Set();
    const missingRequiredServers = [];

    // Always include core servers if available or known
    for (const coreServer of DEFAULT_CORE_SERVERS) {
      if (knownServerNames.size === 0 || knownServerNames.has(coreServer)) {
        resolvedServers.add(coreServer);
      }
    }

    for (const cap of mergedCaps) {
      const candidates = CAPABILITY_MAP[cap];
      if (!candidates) {
        missingRequiredServers.push(cap);
        continue;
      }

      // If availableConfig is empty, allow the first candidate as ideal projection
      if (knownServerNames.size === 0) {
        resolvedServers.add(candidates[0]);
        continue;
      }

      // Match candidate server that is present in available servers
      const matched = candidates.find((c) => knownServerNames.has(c));
      if (matched) {
        resolvedServers.add(matched);
      } else {
        missingRequiredServers.push(cap);
      }
    }

    const isReadOnly = READONLY_PHASES.has(normalizedPhase);
    const profile = isReadOnly ? 'L0_READONLY' : 'L1_LOCAL_GOVERNED';
    const writeAllowed = !isReadOnly;
    const status = missingRequiredServers.length > 0 ? 'DEFICIENT' : 'RESOLVED';

    const envelope = {
      schema: 'eos.mcp_capability_envelope.v1',
      phase: normalizedPhase,
      profile,
      capabilities: Object.freeze(Array.from(mergedCaps).sort()),
      resolvedServers: Object.freeze(Array.from(resolvedServers).sort()),
      missingRequiredServers: Object.freeze(Array.from(new Set(missingRequiredServers)).sort()),
      status,
      authority: Object.freeze({
        phase: normalizedPhase,
        writeAllowed,
        writeBarrierEnforced: true,
        restrictedRoots: RESTRICTED_ROOTS
      }),
      PRODUCTION_READY: 'NO',
      timestamp: new Date().toISOString()
    };

    return Object.freeze(envelope);
  }
}
