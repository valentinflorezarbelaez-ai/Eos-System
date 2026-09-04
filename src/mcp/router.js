import { GovernanceHandler } from './handlers/governance-handler.js';
import { MissionHandler } from './handlers/mission-handler.js';
import { EvidenceHandler } from './handlers/evidence-handler.js';
import { AuditVerifierHandler } from './handlers/audit-verifier-handler.js';
import { SpecDriftDetector } from '../core/runtime/spec-drift-detector.js';
import { GuardrailSandwich } from './guardrail-sandwich.js';

/**
 * Modular JSON-RPC MCP Router & Tool Registry
 */
export class McpRouter {
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || process.cwd();
    this.governanceHandler = new GovernanceHandler({ controlPlaneRoot: this.controlPlaneRoot });
    this.missionHandler = new MissionHandler({ controlPlaneRoot: this.controlPlaneRoot });
    this.evidenceHandler = new EvidenceHandler({ controlPlaneRoot: this.controlPlaneRoot });
    this.auditVerifierHandler = new AuditVerifierHandler({ controlPlaneRoot: this.controlPlaneRoot });
    this.specDriftDetector = new SpecDriftDetector();
    this.guardrailSandwich = new GuardrailSandwich();

    this.aliases = new Map();
    this.tools = new Map();

    this.#registerDefaultHandlers();
  }

  #registerDefaultHandlers() {
    // Governance
    this.registerTool('eos.kernel.boot', (args) => this.governanceHandler.boot(args), 'Boot defensive EOS Kernel');
    this.registerTool('eos.authority.check', (args) => this.governanceHandler.checkAuthority(args), 'Check monotonic authority');
    this.registerTool('eos.policy.validate', (args) => this.governanceHandler.validatePolicy(args), 'Validate machine policy');

    // Missions
    this.registerTool('eos.mission.resolve', (args) => this.missionHandler.resolveIntent(args), 'Resolve intent into DAG');
    this.registerTool('eos.mission.status', (args) => this.missionHandler.getMissionStatus(args), 'Get mission status');

    // Evidence
    this.registerTool('eos.evidence.record', (args) => this.evidenceHandler.recordEvidence(args), 'Record cryptographic evidence');
    this.registerTool('eos.evidence.get', (args) => this.evidenceHandler.getEvidence(args), 'Get evidence by ID');

    // Verifier & Audits & Context & Drift
    this.registerTool('eos.verifier.run', (args) => this.auditVerifierHandler.runVerifier(args), 'Run verification checks');
    this.registerTool('eos.context.compile', (args) => this.auditVerifierHandler.compileContext(args), 'Compile prompt context');
    this.registerTool('eos.audit.parallel_dag.run', (args) => this.auditVerifierHandler.runParallelAudits(args), 'Run 7 quality audits in parallel DAG');
    this.registerTool('eos.drift.spec_to_code', (args) => this.specDriftDetector.detectDrift(args.specMarkdown, args.sourceCode), 'Detect spec-to-code drift and parity');
  }

  registerTool(name, handler, description = '') {
    this.tools.set(name, { handler, description });
  }

  registerAlias(aliasName, canonicalName) {
    this.aliases.set(aliasName, canonicalName);
  }

  resolveToolName(name) {
    if (this.aliases.has(name)) {
      return this.aliases.get(name);
    }
    return name;
  }

  listTools() {
    const list = [];
    for (const [name, def] of this.tools.entries()) {
      list.push({
        name,
        description: def.description
      });
    }
    return list;
  }

  async dispatch(toolName, args = {}, context = {}) {
    const canonicalName = this.resolveToolName(toolName);
    const toolDef = this.tools.get(canonicalName);

    if (!toolDef || typeof toolDef.handler !== 'function') {
      throw new Error(`TOOL_NOT_FOUND: Tool [${toolName}] is not registered in MCP Router.`);
    }

    // 1. Pre-Tool Input Guardrail
    const inputEvaluation = this.guardrailSandwich.evaluateInputGuardrail(canonicalName, args, context);
    if (!inputEvaluation.allowed) {
      return {
        error: true,
        guardrailBlocked: true,
        status: inputEvaluation.status,
        reason: inputEvaluation.reason
      };
    }

    // 2. Execution Boundary
    const rawResult = await toolDef.handler(args);

    // 3. Post-Tool Output Guardrail
    const outputEvaluation = this.guardrailSandwich.evaluateOutputGuardrail(canonicalName, rawResult, context);
    return outputEvaluation.payload;
  }
}
