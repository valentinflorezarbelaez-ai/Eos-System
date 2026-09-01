/**
 * @module EosMcpServer
 * @version 1.3.0
 * @description JSON-RPC 2.0 stdio MCP Server for EOS Mission OS.
 * Wires MissionRuntime for local governed mission tools; deny-by-default guards remain.
 */

import readline from 'node:readline';
import { ContextCompiler } from '../scripts/engine/context-compiler.js';
import { MissionLedger } from '../scripts/engine/mission-ledger.js';
import { AuthorityAdapter } from '../scripts/engine/authority-adapter.js';
import { McpMissionBridge, normalizeToolName } from './core/mcp/mcp-mission-bridge.js';

const CANONICAL_TOOLS = [
  { name: 'eos.mission.resolve', description: 'Resolve raw intent into structured mission DAG', category: 'MISSION', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.mission.start', description: 'Initialize and start a mission', category: 'MISSION', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.mission.status', description: 'Get current mission status and telemetry', category: 'MISSION', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.mission.recover', description: 'Recover mission state from append-only ledger', category: 'MISSION', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.context.compile', description: 'Compile token-budgeted prompt context with receipts', category: 'CONTEXT', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.ledger.get_features', description: 'Get feature list and task DoD status', category: 'LEDGER', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.ledger.update_feature', description: 'Update feature status with evidence receipt', category: 'LEDGER', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.authority.check', description: 'Check monotonic authority permissions and gates', category: 'GOVERNANCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.policy.validate', description: 'Validate operation against machine-readable policy engine', category: 'GOVERNANCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.evidence.record', description: 'Record immutable evidence receipt with SHA-256 hash', category: 'EVIDENCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.evidence.get', description: 'Retrieve verified evidence receipt by ID', category: 'EVIDENCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.verifier.run', description: 'Run strict governance and schema verification', category: 'QUALITY', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.provider.route', description: 'Route prompt or task to optimal model/provider', category: 'ROUTING', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.provider.health', description: 'Get latency, health and error rate for providers', category: 'ROUTING', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.workspace.discover', description: 'Inspect workspace files, dependencies and git state', category: 'WORKSPACE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.workspace.barrier_check', description: 'Enforce write barrier against unauthorized external paths', category: 'WORKSPACE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.fdir.status', description: 'Get current FDIR health state and safe mode status', category: 'RELIABILITY', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.fdir.trip', description: 'Trip safe mode breaker to halt all mutating operations', category: 'RELIABILITY', sideEffects: 'NONE', requiredAuthority: 'A2' },
  { name: 'eos.audit.run', description: 'Run complete 21-step compliance audit', category: 'AUDIT', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.report.generate', description: 'Generate executive mission summary report', category: 'AUDIT', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' }
];

class EosMcpServer {
  constructor(customLedger = null, options = {}) {
    this._ledger = customLedger;
    this.bridge = options.bridge || new McpMissionBridge({ baseDir: options.baseDir || process.cwd() });
  }

  /**
   * Built on first use: MissionLedger provisions .eos/ledger and EOS-MISSION-CONTROL,
   * which must not happen for tool calls that never touch the ledger.
   */
  get ledger() {
    if (!this._ledger) {
      this._ledger = new MissionLedger();
    }
    return this._ledger;
  }

  evaluateToolGuard(toolDef, env = process.env) {
    const rawMode = env.EOS_MODE !== undefined ? env.EOS_MODE : 'read-only';
    const rawAutonomy = env.EOS_AUTONOMY_LEVEL !== undefined ? env.EOS_AUTONOMY_LEVEL : 'LEVEL_0';
    const rawAllowExternal = env.EOS_ALLOW_EXTERNAL_SIDE_EFFECTS !== undefined ? env.EOS_ALLOW_EXTERNAL_SIDE_EFFECTS : 'false';

    if (typeof rawMode !== 'string' || typeof rawAutonomy !== 'string') {
      return {
        allowed: false,
        reason: 'INVALID_GOVERNANCE_CONFIGURATION: Non-string environment values'
      };
    }

    const mode = rawMode.trim().toLowerCase();
    const autonomy = rawAutonomy.trim().toUpperCase();
    const allowExternal = String(rawAllowExternal).trim().toLowerCase() === 'true';

    const validModes = ['read-only', 'read-write', 'production', 'simulation'];
    if (!validModes.includes(mode)) {
      return {
        allowed: false,
        reason: `INVALID_GOVERNANCE_CONFIGURATION: Unrecognized EOS_MODE '${rawMode}'`
      };
    }

    const normalizedAutonomy = AuthorityAdapter.normalize(autonomy);
    if (normalizedAutonomy.isDenied) {
      return {
        allowed: false,
        reason: `INVALID_GOVERNANCE_CONFIGURATION: Unrecognized or denied EOS_AUTONOMY_LEVEL '${rawAutonomy}'`
      };
    }

    if (mode === 'read-only' && toolDef.sideEffects === 'LEDGER_WRITE') {
      return {
        allowed: false,
        reason: 'READ_ONLY_MODE_BLOCKS_LEDGER_WRITE'
      };
    }

    if (!allowExternal && toolDef.sideEffects === 'EXTERNAL_WRITE') {
      return {
        allowed: false,
        reason: 'EXTERNAL_SIDE_EFFECTS_DISABLED'
      };
    }

    const requiredAuth = toolDef.requiredAuthority || 'A0';
    const authCheck = AuthorityAdapter.checkAuthority(requiredAuth, autonomy);
    if (!authCheck.authorized) {
      return {
        allowed: false,
        reason: `INSUFFICIENT_AUTONOMY_LEVEL: Required ${requiredAuth} (rank ${authCheck.requiredRank}) exceeds granted ${autonomy} (rank ${authCheck.effectiveRank})`
      };
    }

    return { allowed: true };
  }

  _guarded(toolDef, env, fn) {
    const guard = this.evaluateToolGuard(toolDef, env);
    if (!guard.allowed) {
      return {
        tool: toolDef.name,
        status: 'DENIED',
        executed: false,
        sideEffects: 'NONE',
        reason: guard.reason
      };
    }
    try {
      const data = fn();
      return {
        tool: toolDef.name,
        status: 'SUCCESS',
        executed: true,
        sideEffects: toolDef.sideEffects,
        ...data
      };
    } catch (err) {
      return {
        tool: toolDef.name,
        status: 'ERROR',
        executed: false,
        sideEffects: 'NONE',
        reason: err.message,
        code: err.code || 'TOOL_ERROR'
      };
    }
  }

  async handleToolCall(rawName, args = {}, env = process.env) {
    const name = normalizeToolName(rawName);
    const toolDef = CANONICAL_TOOLS.find((t) => t.name === name);

    if (!toolDef) {
      return {
        tool: rawName,
        status: 'DENIED',
        executed: false,
        sideEffects: 'NONE',
        reason: `UNKNOWN_TOOL: '${rawName}' (normalized: '${name}')`
      };
    }

    switch (name) {
      case 'eos.context.compile':
        return this._guarded(toolDef, env, () => ({
          receipt: ContextCompiler.compileMissionContext(args)
        }));

      case 'eos.ledger.get_features':
        return this._guarded(toolDef, env, () => ({
          features: this.ledger.getFeatureList(args.missionId)
        }));

      case 'eos.ledger.update_feature':
        return this._guarded(toolDef, env, () => ({
          feature: this.ledger.updateFeatureStatus(
            args.missionId,
            args.featureId,
            args.newStatus,
            args.evidenceReceipt
          )
        }));

      case 'eos.authority.check':
        return this._guarded(toolDef, env, () => ({
          auth: AuthorityAdapter.checkAuthority(args.requiredLevel, args.grantedLevel)
        }));

      case 'eos.mission.recover':
        return this._guarded(toolDef, env, () => ({
          recovered: this.ledger.recover(args.missionId)
        }));

      case 'eos.mission.resolve':
        return this._guarded(toolDef, env, () => ({
          resolution: this.bridge.resolveIntent(args)
        }));

      case 'eos.mission.start':
        return this._guarded(toolDef, env, () => ({
          mission: this.bridge.startMission(args)
        }));

      case 'eos.mission.status':
        return this._guarded(toolDef, env, () => ({
          mission_status: this.bridge.missionStatus(args)
        }));

      case 'eos.policy.validate':
        return this._guarded(toolDef, env, () => ({
          policy: this.bridge.policyValidate(args)
        }));

      case 'eos.evidence.get':
        return this._guarded(toolDef, env, () => ({
          evidence: this.bridge.getEvidence(args)
        }));

      case 'eos.evidence.record':
        return this._guarded(toolDef, env, () => this.bridge.recordEvidence(args));

      case 'eos.verifier.run':
        return this._guarded(toolDef, env, () => ({
          verification: this.bridge.verifierRun(args)
        }));

      case 'eos.workspace.discover':
        return this._guarded(toolDef, env, () => ({
          workspace: this.bridge.discoverWorkspace(args)
        }));

      case 'eos.workspace.barrier_check':
        return this._guarded(toolDef, env, () => ({
          barrier: this.bridge.barrierCheck(args)
        }));

      case 'eos.fdir.status':
        return this._guarded(toolDef, env, () => ({
          fdir: this.bridge.fdirStatus()
        }));

      case 'eos.fdir.trip':
        return this._guarded(toolDef, env, () => ({
          incident: this.bridge.fdirTrip(args)
        }));

      case 'eos.report.generate':
        return this._guarded(toolDef, env, () => ({
          report: this.bridge.reportMission(args)
        }));

      case 'eos.audit.run':
        return this._guarded(toolDef, env, () => {
          const status = this.bridge.missionStatus({});
          const fdir = this.bridge.fdirStatus();
          const discovery = this.bridge.discoverWorkspace({});
          return {
            audit: {
              schema_version: '1.0.0',
              scope: 'LOCAL_GOVERNED_MVP',
              missions: status,
              fdir,
              workspace: {
                head: discovery.git?.head,
                has_mission_cli: discovery.has_mission_cli,
                has_mcp_server: discovery.has_mcp_server
              },
              dictamen: 'COMPLETE_FOR_LOCAL_GOVERNED_USE',
              production_ready: false,
              epistemic_class: 'MEASURED'
            }
          };
        });

      case 'eos.provider.route':
      case 'eos.provider.health':
        return {
          tool: name,
          status: 'NOT_CONFIGURED',
          executed: false,
          sideEffects: 'NONE',
          message:
            'Provider routing is out of scope for local governed MVP (no network credentials). Use Cursor/local models outside EOS provider router.',
          epistemic_class: 'NOT_VERIFIED'
        };

      default:
        return {
          tool: name,
          status: 'DENIED',
          executed: false,
          sideEffects: 'NONE',
          reason: `NO_HANDLER_REGISTERED: '${name}' is declared in CANONICAL_TOOLS without a handler`
        };
    }
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'eos-mission-os', version: '1.3.0' }
        }
      };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: CANONICAL_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: { type: 'object' }
          }))
        }
      };
    }

    if (method === 'tools/call') {
      if (!params || !params.name) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: 'Invalid params: tools/call requires params.name' }
        };
      }
      const result = await this.handleToolCall(params.name, params.arguments || {});
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        }
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method '${method}' not found` }
    };
  }

  start() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    const write = (response) => process.stdout.write(JSON.stringify(response) + '\n');

    rl.on('line', async (line) => {
      if (!line.trim()) return;

      let request;
      try {
        request = JSON.parse(line);
      } catch (err) {
        write({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error', data: err.message }
        });
        return;
      }

      try {
        write(await this.handleRequest(request));
      } catch (err) {
        write({
          jsonrpc: '2.0',
          id: request.id ?? null,
          error: { code: -32603, message: 'Internal error', data: err.message }
        });
      }
    });
  }
}

export { EosMcpServer, CANONICAL_TOOLS };

if (process.argv[1] && process.argv[1].endsWith('mcp-server.js')) {
  const server = new EosMcpServer();
  server.start();
}
