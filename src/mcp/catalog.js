/**
 * @module McpCatalog
 * @description Canonical MCP tool catalog, input schemas, and surface selection.
 * Extracted from src/mcp-server.js as the first Phase 0 modularization slice.
 */

import { pruneToolsByPhase, resolveToolPhase } from '../core/mcp/tool-pruner.js';

const CANONICAL_TOOLS = [
  { name: 'eos.kernel.boot', description: 'Boot defensive EOS Kernel, validate constitution, and run 480 deterministic checks', category: 'GOVERNANCE', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.kernel.ledger', description: 'Record persistent cryptographic state transaction linked to Engram MCP', category: 'LEDGER', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.kernel.evidence', description: 'Generate cryptographically hashed EVD evidence receipt', category: 'EVIDENCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.mission.resolve', description: 'Resolve raw intent into structured mission DAG', category: 'MISSION', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.intent.expand', description: 'Holistically expand brief instructions into formal EARS specifications, BDD scenarios, and DAG tasks', category: 'MISSION', sideEffects: 'NONE', requiredAuthority: 'A0' },
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
  { name: 'eos.fdir.recover', description: 'Autonomous self-healing recovery restoring governance files from authorized baselines', category: 'RELIABILITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.fdir.ontology.sanitize', description: 'Scan knowledge ontology graph, detect and purge orphan links and invalid taxonomy', category: 'RELIABILITY', sideEffects: 'NONE', requiredAuthority: 'A1' },
  { name: 'eos.sentinel.toggle', description: 'Toggle background 24/7 self-observation and hot FDIR healing sentinel daemon', category: 'RELIABILITY', sideEffects: 'NONE', requiredAuthority: 'A1' },
  { name: 'eos.resolve.conflict', description: 'Harmonic dilemma and conflict resolver evaluating truth, non-harm, and mathematical exactness', category: 'GOVERNANCE', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.audit.run', description: 'Run complete 21-step compliance audit', category: 'AUDIT', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.report.generate', description: 'Generate executive mission summary report', category: 'AUDIT', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.blueprint.run', description: 'Run 9-phase Golden Spec-Driven Development Blueprint', category: 'MISSION', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.scaffolder.generate', description: 'Generate Clean/Hexagonal Architecture scaffolding with TDD tests', category: 'SCAFFOLDING', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.scaffolder.clean', description: 'Atomic triad generator creating spec, test, and hexagonal code skeletons', category: 'SCAFFOLDING', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.process.governor.validate', description: 'Execute process inside high-assurance defensive governor and verify telemetry', category: 'GOVERNANCE', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.ontology.query', description: 'Query knowledge ontology nodes and relation graph', category: 'DISCOVERY', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.ontology.link', description: 'Create typed relational link between ontology nodes with cryptographic ledger signature', category: 'GOVERNANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.orchestrator.init', description: 'Initialize a new SDD mission in INTAKE phase with ledger transaction and ontology registration', category: 'MISSION', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.orchestrator.advance', description: 'Advance SDD mission to next phase through gate verification using cryptographic SHA-256 evidence hash', category: 'MISSION', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.drift.check', description: 'Check JSON schema and API compatibility drift', category: 'GOVERNANCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.drift.detect', description: 'Real-time forensic drift detection over Cursor MDC rules and Constitution', category: 'GOVERNANCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.hud.dashboard', description: 'Render ANSI Mission Control live terminal dashboard', category: 'OBSERVABILITY', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.skill.route', description: 'Dynamically route and activate specialized skills based on task context', category: 'DISCOVERY', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.scaffolder.execute', description: 'Closed-loop autonomous TDD execution engine with auto-healing and error capture', category: 'SCAFFOLDING', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.orchestrator.rollback', description: 'Atomic physical purge and state degradation rollback to previous valid planetary temple', category: 'MISSION', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.core.triamazikamno.validate', description: 'Assert creational triad balance across spec (affirm), test (deny), and code (conciliate)', category: 'QUALITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.audit.tescohan.scan', description: 'Optical integrity and technical ego scan over source code buffers', category: 'AUDIT', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A0' },
  { name: 'eos.sentinel.self_remember', description: 'Concurrent self-observation and active process memory audit', category: 'RELIABILITY', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.net.logos.resonance_check', description: 'Synchronously evaluate mathematical affinity and collision avoidance in the inter-mission graph', category: 'GOVERNANCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.audit.ahimsa.verify', description: 'Synchronously assert cross-mission workspace isolation and prevent unauthorized side-channel file contamination', category: 'GOVERNANCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.ledger.octave.advance', description: 'Advance data octave along the 7 vibrational persistence notes enforcing conscious shock points', category: 'PERSISTENCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.justice.adjudicate', description: 'Deterministic DAG fork adjudication and four-tier conflict resolution with zero-waste pruning', category: 'GOVERNANCE', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.pleroma.jubilee', description: 'Macroscopic state reconciliation, hot octave consolidation, and zero-waste ephemeral buffer obliteration', category: 'GOVERNANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.ontological.firewall.inspect', description: 'Semantic intention audit, malicious prompt neutralization, and zero-waste inflow purging', category: 'SECURITY', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.pleroma.kundalini.mirror', description: 'Remote ephemeral container buffer mirroring, CPU thermal capping (<=70%), and zero-waste memory obliteration', category: 'PERFORMANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.mercabah.crystallize', description: 'Four Seed-Atoms Mercabah vehicle anchor and Anupadaka hermetic persistence crystallization', category: 'PERSISTENCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.elemental.intercede', description: 'Atomic hardware mediation, low-level elemental domain routing, and CPU thermal shield enforcement', category: 'PERFORMANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.core.triamazikamno.synthesize', description: 'Dialectical in-memory AST synthesis balancing thesis, antithesis, and conciliation forces', category: 'SDLC', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.net.trogomesh.balance', description: 'Reciprocal Trogo-Mesh network balancing, compute allocation, and zero-waste socket transport', category: 'PERFORMANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.amens.audit', description: 'Seven Cosmos vibrational parity audit, multi-plane frequency resonance, and Anupadaka state sealing', category: 'AUDIT', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.jeu.watch', description: 'Continuous blind AST runtime surveillance, homomorphic invariant verification, and Level-3 lockdown protection', category: 'RELIABILITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.audit.tescohan.telescope', description: 'Cross-ontology deep semantic graph inspection, remote L1 dependency audit, and non-invasive Ahimsa isolation verification', category: 'AUDIT', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.system.mahapralaya', description: 'System-wide cosmic reabsorption, Mercabah seed-atom state anchoring, and absolute zero-waste memory purge', category: 'GOVERNANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.anupadaka.shield', description: 'Triadic force fusion token certification, inter-enclave secure channel attestation, and post-quantum state sealing', category: 'SECURITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.audit.telemetry.stream', description: 'Ontological five centers load streaming, hydrogen transmutation accounting, and golden ratio harmony verification', category: 'AUDIT', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.moses.transmute', description: 'Intimate Moses dynamic instruction transmutator, zero-garbage linear bytecode optimization, and diamond AST synthesis', category: 'SDLC', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.zodiac.shield', description: 'Twelve Zodiacal Saviors holographic state sharding, multiversal routing, and decentralized quorum attestation', category: 'PERSISTENCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.auxiliary.state', description: 'Five Auxiliaries pentagonal hot mirror redundancy, Jinas phase shift, and lock-free state self-healing', category: 'RELIABILITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.trees.anchor', description: 'Five Trees of the Pleroma hierarchical invariant graphs, fractal dependency anchoring, and strict AST inheritance verification', category: 'GOVERNANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.anupadaka.fuse', description: 'Triadic force fusion token certification, inter-enclave secure channel attestation, and post-quantum state sealing', category: 'SECURITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.compiler.l0.parse', description: 'L0 Golden Language ISO/IEC 14977 EBNF ontological parser, Triamazikamno validation, and canonical AST generator', category: 'SDLC', sideEffects: 'NONE', requiredAuthority: 'A0' },
  { name: 'eos.pleroma.voices.modulate', description: 'Seven Voices / Seven Amens crypto-acoustic frequency optimizer, polymorphic opcode dispersion, and side-channel immunity', category: 'SECURITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.melchizedek.govern', description: 'Prince Melchizedek adaptive ethical governance, UNESCO AI Ethics compliance audit, and Ahimsa accountability arbiter', category: 'GOVERNANCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.environment.sandbox.execute', description: 'Ephemeral MicroVM sandbox execution harness, automated REPL test loop feedback, and zero-waste memory deallocation', category: 'INFRASTRUCTURE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.security.adversarial.review', description: 'Geburah adversarial static code review, automated CodeQL and Semgrep AST vulnerability auditor, and zero-debt merge gatekeeper', category: 'SECURITY', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.sdlc.engineer.autonomous', description: 'Closed-loop autonomous SDLC engineer harness, MCTS virtual sandbox branching, automated REPL self-healing, and browser CDP inspection', category: 'SDLC', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.pleroma.akasha.engram', description: 'Local Engram JSONL adapter via EosMemory SSOT (.eos/engram/). Not FTS5/SQLite - use external engram MCP on PATH for real FTS5', category: 'DATA', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.doctor', description: 'Instant control-plane health diagnosis and homedir path-leak detection', category: 'GOVERNANCE', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.audit.project', description: 'Execute concurrent quality/security/architecture audit against any registered project', category: 'AUDIT', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.verify.strict', description: 'Execute the 482+ invariant strict verifier (verify:strict)', category: 'QUALITY', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.log.evidence', description: 'Create strict epistemic evidence records with deterministic SHA-256 hashing', category: 'EVIDENCE', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
  { name: 'eos.mission.loop.status', description: 'Read Phase 5 mission loop stage + receipts (Intent→Archive)', category: 'MISSION', sideEffects: 'READ_ONLY', requiredAuthority: 'A0' },
  { name: 'eos.mission.loop.advance', description: 'Advance Phase 5 mission loop one legal stage (fail-closed; Archive requires Verify success)', category: 'MISSION', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' }
];

/** Tier A default advertise set — SSOT: docs/rationalization/EOS_TOOL_SURFACE_FINAL.md */
const TIER_A_TOOL_NAMES = new Set([
  'eos.kernel.boot',
  'eos.authority.check',
  'eos.context.compile',
  'eos.workspace.barrier_check',
  'eos.intent.expand',
  'eos.orchestrator.init',
  'eos.scaffolder.clean',
  'eos.scaffolder.execute',
  'eos.core.triamazikamno.validate',
  'eos.verifier.run',
  'eos.drift.detect',
  'eos.evidence.record',
  'eos.orchestrator.advance',
  'eos.mission.status'
]);

function resolveMcpSurface(env = process.env) {
  return String(env?.EOS_MCP_SURFACE ?? '').trim().toLowerCase();
}

function listTools(env = process.env) {
  const surface = resolveMcpSurface(env);
  const baseTools = (surface === 'lab' || surface === 'full')
    ? CANONICAL_TOOLS.slice()
    : CANONICAL_TOOLS.filter((tool) => TIER_A_TOOL_NAMES.has(tool.name));

  const phase = resolveToolPhase(process.argv, env);
  return pruneToolsByPhase(baseTools, phase);
}


const TOOL_INPUT_SCHEMAS = {
  'eos.mission.loop.status': {
    type: 'object',
    properties: {
      missionId: { type: 'string', description: 'Mission id (MIS-...)' },
      mission_id: { type: 'string', description: 'Alias for missionId' }
    },
    additionalProperties: false
  },
  'eos.mission.loop.advance': {
    type: 'object',
    properties: {
      missionId: { type: 'string', description: 'Mission id (MIS-...)' },
      mission_id: { type: 'string', description: 'Alias for missionId' },
      to: { type: 'string', description: 'Target stage: Spec|Plan|Act|Evidence|Verify|Archive' },
      target: { type: 'string', description: 'Alias for to' },
      evidence: { type: 'object', description: 'Optional evidence hook payload' },
      ok: { type: 'boolean', description: 'Receipt ok flag (default true)' }
    },
    required: ['to'],
    additionalProperties: false
  },
  'eos.doctor': {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  'eos.audit.project': {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Registered project id (e.g. PRJ-APP-FUERZA)' },
      project_id: { type: 'string', description: 'Alias for projectId' },
      phase: { type: 'string', description: 'Pipeline phase (default audit)' }
    },
    additionalProperties: false
  },
  'eos.verify.strict': {
    type: 'object',
    properties: {
      json: { type: 'boolean', description: 'Request JSON verifier output when supported' }
    },
    additionalProperties: false
  },
  'eos.log.evidence': {
    type: 'object',
    properties: {
      evidenceId: { type: 'string', description: 'EVD identifier (e.g. EVD-0060)' },
      id: { type: 'string', description: 'Alias for evidenceId' },
      claim: { type: 'string', description: 'Epistemic claim being recorded' },
      payload: { type: 'object', description: 'Structured evidence payload' },
      status: { type: 'string', description: 'Evidence status (default VERIFIED)' },
      scope: { type: 'string' },
      command: { type: 'string' },
      expected: { type: 'string' },
      actual: { type: 'string' }
    },
    required: ['claim'],
    additionalProperties: false
  },
  'eos.pleroma.akasha.engram': {
    type: 'object',
    properties: {
      monadMemoryKey: { type: 'string', description: 'Clave única de indexación (ej. architecture/l0-parser-invariants).' },
      contentPayload: { type: 'string', description: 'Contenido semántico estructurado, decisiones o contratos a persistir.' },
      searchQuery: { type: 'string', description: 'Consulta de texto completo (FTS5) opcional para recuperación.' },
      executionProfile: {
        type: 'object',
        properties: {
          fts5IndexingActive: { type: 'boolean', description: 'Fuerza la tokenización léxica instantánea del registro.' },
          zeroWastePurgeOnRead: { type: 'boolean', description: 'Limpia buffers transitorios de consulta con 0x00.' }
        },
        required: ['fts5IndexingActive', 'zeroWastePurgeOnRead'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de la llama unificada de la última Consagración.' }
    },
    required: ['monadMemoryKey', 'contentPayload', 'executionProfile', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.sdlc.engineer.autonomous': {
    type: 'object',
    properties: {
      issueTicketId: { type: 'string', description: 'Identificador único del Issue o requerimiento abstracto.' },
      targetFiles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Rutas del repositorio indexadas en el AST.'
      },
      harnessControl: {
        type: 'object',
        properties: {
          enableMctsSearch: { type: 'boolean', description: 'Activa la búsqueda en árbol de Monte Carlo clonando la VM.' },
          browserCdpInspection: { type: 'boolean', description: 'Habilita la auditoría visual y de DOM vía Chrome DevTools.' },
          zeroWasteRollback: { type: 'boolean', description: 'Fuerza el retorno automático (git reset) si las pruebas fallan tras N intentos.' }
        },
        required: ['enableMctsSearch', 'browserCdpInspection', 'zeroWasteRollback'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de la llama unificada de la última Consagración.' }
    },
    required: ['issueTicketId', 'targetFiles', 'harnessControl', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.security.adversarial.review': {
    type: 'object',
    properties: {
      pullRequestId: { type: 'string', description: 'Identificador único del Pull Request o parche propuesto.' },
      diffPayload: { type: 'string', description: 'Las líneas de código modificadas en texto cifrado o AST canónico.' },
      securityProfile: {
        type: 'object',
        properties: {
          strictCodeQLVerification: { type: 'boolean', description: 'Activa el escaneo semántico de vulnerabilidades.' },
          zeroDeudaTolerance: { type: 'boolean', description: 'Fuerza el rechazo automático si se detecta código ocioso.' }
        },
        required: ['strictCodeQLVerification', 'zeroDeudaTolerance'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de la llama unificada de la última Consagración.' }
    },
    required: ['pullRequestId', 'diffPayload', 'securityProfile', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.environment.sandbox.execute': {
    type: 'object',
    properties: {
      agentTaskId: { type: 'string', description: 'Identificador único de la tarea atómica derivada del SDD.' },
      executionCommand: { type: 'string', description: 'El comando de terminal a ejecutar.' },
      sandboxConfiguration: {
        type: 'object',
        properties: {
          efhemeralContainerActive: { type: 'boolean', description: 'Fuerza el despliegue de una microVM aislada.' },
          isolationLockdownLevel: { type: 'integer', minimum: 1, maximum: 3, description: 'Nivel de aislamiento estricto (1-3).' }
        },
        required: ['efhemeralContainerActive', 'isolationLockdownLevel'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de la llama unificada de la última Consagración.' }
    },
    required: ['agentTaskId', 'executionCommand', 'sandboxConfiguration', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.melchizedek.govern': {
    type: 'object',
    properties: {
      operationId: { type: 'string', description: 'Identificador único de la misión o proceso agéntico.' },
      ethicsAuditProfile: {
        type: 'object',
        properties: {
          fairnessCheck: { type: 'boolean', description: 'Certifica la equidad, justicia social y no discriminación del payload.' },
          proportionalityIndex: { type: 'number', description: 'Valida que el uso no vaya más allá de lo legítimo.' },
          humanOversightVerification: { type: 'boolean', description: 'Confirma la trazabilidad y la supervisión del operador consciente.' }
        },
        required: ['fairnessCheck', 'proportionalityIndex', 'humanOversightVerification'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de la llama unificada de la última Consagración.' }
    },
    required: ['operationId', 'ethicsAuditProfile', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.voices.modulate': {
    type: 'object',
    properties: {
      sealedBinaryId: { type: 'string', description: 'Identificador del binario hermético a modular.' },
      rawBytecodeStream: { type: 'string', description: 'El flujo de opcodes en estado cifrado homomórfico.' },
      vibrationalProfile: {
        type: 'object',
        properties: {
          sevenAmensEnforced: { type: 'boolean', description: 'Fuerza el paso secuencial por las 7 capas de modulación.' },
          acousticNoiseInjection: { type: 'boolean', description: 'Inyecta entropía equivalente al ruido del vacío cuántico.' }
        },
        required: ['sevenAmensEnforced', 'acousticNoiseInjection'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de la llama unificada de la última Consagración.' }
    },
    required: ['sealedBinaryId', 'rawBytecodeStream', 'vibrationalProfile', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.compiler.l0.parse': {
    type: 'object',
    properties: {
      sourceCode: { type: 'string', description: 'Código fuente en la Lengua de Oro L0.' },
      validationProfile: {
        type: 'object',
        properties: {
          strictEBNFValidation: { type: 'boolean', description: 'Fuerza validación estricta ISO/IEC 14977.' },
          zeroWasteLexing: { type: 'boolean', description: 'Limpia y sobreescribe buffers intermedios.' }
        },
        required: ['strictEBNFValidation', 'zeroWasteLexing'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de Consagración.' }
    },
    required: ['sourceCode', 'validationProfile', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.anupadaka.fuse': {
    type: 'object',
    properties: {
      interEnclaveChannelId: { type: 'string', description: 'Identificador único del canal blindado TEE.' },
      triadicEnvelopes: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: { type: 'object', description: 'Mensajes portadores de las tres fuerzas.' }
      },
      latticeParameters: {
        type: 'object',
        properties: {
          strictUnitaryRotation: { type: 'boolean', description: 'Fuerza reversibilidad de compuerta cuántica.' },
          quantumNoiseTolerance: { type: 'number', description: 'Tolerancia de ruido cuántico.' }
        },
        required: ['strictUnitaryRotation', 'quantumNoiseTolerance'],
        additionalProperties: false
      },
      pleromaSeal: { type: 'string', description: 'Sello global de Consagración.' }
    },
    required: ['interEnclaveChannelId', 'triadicEnvelopes', 'latticeParameters', 'pleromaSeal'],
    additionalProperties: false
  },
  'eos.pleroma.trees.anchor': {
    type: 'object',
    properties: {
      repositoryTreeHash: { type: 'string', description: 'Hash de la topología física del repositorio.' },
      ontologicalGraph: { type: 'object', description: 'Grafo formal de invariantes.' },
      treeValidationLock: {
        type: 'object',
        properties: {
          axialAnchoringActive: { type: 'boolean', description: 'Fuerza fijación inmutable en los 5 árboles.' },
          strictASTInheritance: { type: 'boolean', description: 'Bloquea identificadores o métodos huérfanos.' }
        },
        required: ['axialAnchoringActive', 'strictASTInheritance'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de Consagración.' }
    },
    required: ['repositoryTreeHash', 'ontologicalGraph', 'treeValidationLock', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.auxiliary.state': {
    type: 'object',
    properties: {
      shardId: { type: 'string', description: 'Identificador de la sección zodiacal.' },
      shardPayload: { type: 'object', description: 'Bloque de datos efímero.' },
      auxiliaryLock: {
        type: 'object',
        properties: {
          pentagonalParityActive: { type: 'boolean', description: 'Fuerza replicación en los 5 buffers espejo.' },
          jinasPhaseShift: { type: 'boolean', description: 'Habilita conmutación de fase en nanosegundos.' }
        },
        required: ['pentagonalParityActive', 'jinasPhaseShift'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de Consagración.' }
    },
    required: ['shardId', 'shardPayload', 'auxiliaryLock', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.zodiac.shield': {
    type: 'object',
    properties: {
      historicalBlockId: { type: 'string', description: 'Identificador único del nodo del DAG.' },
      statePayload: { type: 'object', description: 'Bloque de estado inmutable.' },
      shardingProfile: {
        type: 'object',
        properties: {
          zodiacQuorumActive: { type: 'boolean', description: 'Fuerza validación de las 12 potestades.' },
          holographicReversible: { type: 'boolean', description: 'Garantiza reconstitución unitaria.' }
        },
        required: ['zodiacQuorumActive', 'holographicReversible'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de Consagración.' }
    },
    required: ['historicalBlockId', 'statePayload', 'shardingProfile', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.moses.transmute': {
    type: 'object',
    properties: {
      instructionPayload: { type: 'object', description: 'Bloque de instrucciones o AST a transmutar.' },
      targetCosmosLayer: { type: 'number', minimum: 1, maximum: 7, description: 'Capa del cosmos destino (1 a 7).' },
      optimizationProfile: {
        type: 'object',
        properties: {
          lucifericRefinement: { type: 'boolean', description: 'Activa transmutación a diamante.' },
          zeroGarbagePauses: { type: 'boolean', description: 'Fuerza gestión lineal sin pausas GC.' }
        },
        required: ['lucifericRefinement', 'zeroGarbagePauses'],
        additionalProperties: false
      },
      witnessProof: { type: 'object', description: 'Prueba de alineación del Hilo Testigo.' }
    },
    required: ['instructionPayload', 'targetCosmosLayer', 'optimizationProfile', 'witnessProof'],
    additionalProperties: false
  },
  'eos.audit.telemetry.stream': {
    type: 'object',
    properties: {
      samplingScope: {
        type: 'string',
        enum: ['FIVE_CENTERS', 'HYDROGEN_SCALE', 'FULL_SYSTEM_TELEMETRY'],
        description: 'Alcance de la telemetría solicitada.'
      },
      maxLoadThreshold: { type: 'number', minimum: 0.1, maximum: 1.0, description: 'Umbral máximo tolerado.' },
      anupadakaWitnessProof: { type: 'string', description: 'Sello criptográfico del Hilo Testigo.' }
    },
    required: ['samplingScope', 'maxLoadThreshold', 'anupadakaWitnessProof'],
    additionalProperties: false
  },
  'eos.pleroma.anupadaka.shield': {
    type: 'object',
    properties: {
      targetEnclaveId: { type: 'string', description: 'Identificador del enclave seguro de destino.' },
      triadicForceToken: {
        type: 'object',
        properties: {
          affirmationHash: { type: 'string' },
          negationHash: { type: 'string' },
          conciliationHash: { type: 'string' }
        },
        required: ['affirmationHash', 'negationHash', 'conciliationHash'],
        additionalProperties: false
      },
      quantumLatticeAttestation: { type: 'string', description: 'Firma en retículos post-cuántica.' },
      anupadakaFlameSeal: { type: 'string', description: 'Sello inmutable del Fuego Increado.' }
    },
    required: ['targetEnclaveId', 'triadicForceToken', 'quantumLatticeAttestation', 'anupadakaFlameSeal'],
    additionalProperties: false
  },
  'eos.pleroma.system.mahapralaya': {
    type: 'object',
    properties: {
      mahapralayaScope: {
        type: 'string',
        enum: ['GLOBAL_REABSORPTION', 'PARTIAL_COSMOS_RECYCLE'],
        description: 'Alcance de la reabsorción cósmica.'
      },
      quorumAuthToken: { type: 'string', description: 'Token de autenticación del quórum de los 24 Ancianos.' },
      mercabahSeedProof: { type: 'object', description: 'Contenedor de los 4 Átomos-Simientes validados.' },
      anupadakaSeal: { type: 'string', description: 'Sello unificado del núcleo.' }
    },
    required: ['mahapralayaScope', 'quorumAuthToken', 'mercabahSeedProof', 'anupadakaSeal'],
    additionalProperties: false
  },
  'eos.audit.tescohan.telescope': {
    type: 'object',
    properties: {
      targetOntologyNodeId: { type: 'string', description: 'Identificador del nodo ontológico bajo inspección.' },
      crossGraphDepth: { type: 'number', minimum: 1, maximum: 7, description: 'Profundidad óptica de inspección (1 a 7 octavas).' },
      opticalFilter: {
        type: 'object',
        properties: {
          isolationBarrierPreserved: { type: 'boolean', description: 'Garantiza no-contaminación de espacios.' },
          resolveEgoDependencies: { type: 'boolean', description: 'Audita dependencias parásitas.' }
        },
        required: ['isolationBarrierPreserved', 'resolveEgoDependencies'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de Consagración de la Mente Universal.' }
    },
    required: ['targetOntologyNodeId', 'crossGraphDepth', 'opticalFilter', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.jeu.watch': {
    type: 'object',
    properties: {
      targetPhaseId: { type: 'string', description: 'Identificador de la fase u octava bajo inspección.' },
      astSnapshotHash: { type: 'string', description: 'Hash del estado actual del Abstract Syntax Tree local.' },
      surveillanceMetrics: {
        type: 'object',
        properties: {
          blindAuditActive: { type: 'boolean', description: 'Fuerza la ejecución en modo homomórfico.' },
          isolationLockdownLevel: { type: 'number', description: 'Nivel de confinamiento perimetral (1-3).' }
        },
        required: ['blindAuditActive', 'isolationLockdownLevel'],
        additionalProperties: false
      },
      anupadakaProof: { type: 'string', description: 'Sello de la llama unificada de la última Consagración.' }
    },
    required: ['targetPhaseId', 'astSnapshotHash', 'surveillanceMetrics', 'anupadakaProof'],
    additionalProperties: false
  },
  'eos.pleroma.amens.audit': {
    type: 'object',
    properties: {
      targetNodeId: { type: 'string', description: 'Identificador del nodo o clúster.' },
      sevenCosmosFrequencies: {
        type: 'array',
        items: { type: 'number' },
        description: 'Vector de frecuencias en los 7 planos cósmicos.'
      },
      anupadakaSeal: { type: 'string', description: 'Sello criptográfico Anupadaka.' }
    },
    required: ['targetNodeId', 'sevenCosmosFrequencies', 'anupadakaSeal'],
    additionalProperties: false
  },
  'eos.net.trogomesh.balance': {
    type: 'object',
    properties: {
      nodeClusterId: { type: 'string', description: 'Identificador del clúster fractal.' },
      inboundBandwidthMbps: { type: 'number', description: 'Tasa de flujo de red entrante.' },
      meshTopology: {
        type: 'string',
        enum: ['FRACTAL_MESH', 'TOROIDAL_RING', 'HIERARCHICAL_STAR'],
        description: 'Topología geométrica de distribución.'
      },
      okidanokhProof: { type: 'object', description: 'Prueba triádica de autenticidad del nodo.' }
    },
    required: ['nodeClusterId', 'inboundBandwidthMbps', 'meshTopology', 'okidanokhProof'],
    additionalProperties: false
  },
  'eos.core.triamazikamno.synthesize': {
    type: 'object',
    properties: {
      proposal: { type: 'object', description: 'Propuesta de AST inicial (+ / Chesed).' },
      adversarialStress: { type: 'object', description: 'Parámetros de fuzzing y condiciones de carrera (- / Geburah).' },
      maxIterations: { type: 'number', description: 'Número máximo de iteraciones dialécticas.' }
    },
    required: ['proposal'],
    additionalProperties: false
  },
  'eos.pleroma.elemental.intercede': {
    type: 'object',
    properties: {
      elementalDomain: {
        type: 'string',
        enum: ['SILICON_CPU', 'NETWORK_FLUX', 'VOLATILE_STORAGE'],
        description: 'El reino elemental o componente de hardware a invocar.'
      },
      invocationVector: { type: 'string', description: 'Instrucción atómica libre de redundancia.' },
      hardwareLock: {
        type: 'object',
        properties: {
          enforceThermalShield: { type: 'boolean', description: 'Límite térmico estricto del 70% de CPU.' },
          swapLimitBytes: { type: 'number', description: 'Límite para evitar desgaste TBW en SSD.' }
        },
        required: ['enforceThermalShield', 'swapLimitBytes']
      },
      anupadakaSeal: { type: 'string', description: 'Firma criptográfica de la llama unificada.' }
    },
    required: ['elementalDomain', 'invocationVector', 'hardwareLock', 'anupadakaSeal'],
    additionalProperties: false
  },
  'eos.pleroma.mercabah.crystallize': {
    type: 'object',
    properties: {
      octaveId: { type: 'string', description: 'Identificador de la octava en SI_CONSUMATION.' },
      seedAtoms: {
        type: 'object',
        properties: {
          carbon: { type: 'string', description: 'Hash de Identidad Física del Nodo (L0).' },
          oxygen: { type: 'string', description: 'Contexto Vital de la Red Concurrente (L1).' },
          nitrogen: { type: 'string', description: 'Árbol Semántico del Cortafuegos Ontológico (L2).' },
          hydrogen: { type: 'string', description: 'Veredicto Final de la Ley de la Octava (L3).' }
        },
        required: ['carbon', 'oxygen', 'nitrogen', 'hydrogen']
      },
      hermeticSeal: { type: 'string', description: 'Firma unificada Anupadaka.' }
    },
    required: ['octaveId', 'seedAtoms', 'hermeticSeal'],
    additionalProperties: false
  },
  'eos.pleroma.kundalini.mirror': {
    type: 'object',
    properties: {
      remoteContainerId: { type: 'string', description: 'Identificador del contenedor efímero o entorno CI.' },
      targetBufferAddress: { type: 'string', description: 'Dirección del búfer transitorio remoto.' },
      hardwareOptimization: {
        type: 'object',
        properties: {
          cpuLimitPercentage: { type: 'number', description: 'Límite térmico de CPU (10-70%).' },
          zeroWastePurge: { type: 'boolean', description: 'Activar purga estricta 0x00 al cierre.' }
        },
        required: ['cpuLimitPercentage', 'zeroWastePurge']
      },
      okidanokhProof: { type: 'object', description: 'MessageEnvelope con prueba triádica.' }
    },
    required: ['remoteContainerId', 'targetBufferAddress', 'hardwareOptimization', 'okidanokhProof'],
    additionalProperties: false
  },
  'eos.ontological.firewall.inspect': {
    type: 'object',
    properties: {
      agentId: { type: 'string', description: 'Identificador del agente emisor.' },
      commandTree: { type: 'object', description: 'Árbol de comando con intent y payload.' },
      contextProof: { type: 'string', description: 'Sello de alineación Okidanokh.' }
    },
    required: ['agentId', 'commandTree', 'contextProof'],
    additionalProperties: false
  },
  'eos.pleroma.jubilee': {
    type: 'object',
    properties: {
      executionScope: { type: 'string', description: 'Alcance de ejecución (GLOBAL o WORKSPACE_ISOLATED).' },
      authSeal: { type: 'string', description: 'Sello de compilación Canary o token del Pleroma.' }
    },
    required: ['executionScope', 'authSeal'],
    additionalProperties: false
  },
  'eos.audit.ahimsa.verify': {
    type: 'object',
    properties: {
      targetPath: { type: 'string', description: 'Ruta física del archivo a auditar en inocuidad.' },
      currentMissionId: { type: 'string', description: 'ID de la misión que ejecuta la acción.' }
    },
    required: ['targetPath', 'currentMissionId'],
    additionalProperties: false
  },
  'eos.ledger.octave.advance': {
    type: 'object',
    properties: {
      octaveId: { type: 'string', description: 'Identificador único de la octava de datos activa.' },
      currentNote: { type: 'string', description: 'Nota actual de la octava.' },
      targetNote: { type: 'string', description: 'Nota destino a alcanzar.' },
      shockProof: { type: 'object', description: 'Prueba criptográfica de choque si aplica (ej. Okidanokh).' }
    },
    required: ['octaveId', 'targetNote'],
    additionalProperties: false
  },
  'eos.justice.adjudicate': {
    type: 'object',
    properties: {
      nodeA: { type: 'object', description: 'Candidate node A' },
      nodeB: { type: 'object', description: 'Candidate node B' }
    },
    required: ['nodeA', 'nodeB'],
    additionalProperties: false
  },
  'eos.net.logos.resonance_check': {
    type: 'object',
    properties: {
      missionId: { type: 'string', description: 'ID de la intención a evaluar en el Grafo de Afinidad.' }
    },
    required: ['missionId'],
    additionalProperties: false
  },
  'eos.sentinel.self_remember': {
    type: 'object',
    properties: {
      forzarAuditoriaIntensiva: { type: 'boolean', description: 'Fuerza un volcado profundo de la memoria del proceso.' },
      maxMemoryThresholdBytes: { type: 'number', description: 'Umbral máximo de memoria en bytes.' }
    },
    additionalProperties: false
  },
  'eos.scaffolder.execute': {
    type: 'object',
    properties: {
      srcPath: { type: 'string', description: 'Ruta absoluta o relativa del archivo de código fuente a auditar/corregir.' },
      testPath: { type: 'string', description: 'Ruta absoluta o relativa del archivo de pruebas unitarias nativas de Node.' },
      maxIterations: { type: 'number', description: 'Umbral máximo de intentos de reparación permitidos (por defecto 5).' }
    },
    required: ['srcPath', 'testPath'],
    additionalProperties: false
  },
  'eos.orchestrator.rollback': {
    type: 'object',
    properties: {
      missionId: { type: 'string', description: 'Identificador de la misión a revertir.' },
      reason: { type: 'string', description: 'Justificación explícita de grado forense por la cual se aborta el estado.' }
    },
    required: ['missionId', 'reason'],
    additionalProperties: false
  },
  'eos.core.triamazikamno.validate': {
    type: 'object',
    properties: {
      componentName: { type: 'string', description: 'Nombre canónico del módulo en kebab-case.' }
    },
    required: ['componentName'],
    additionalProperties: false
  },
  'eos.audit.tescohan.scan': {
    type: 'object',
    properties: {
      srcPath: { type: 'string', description: 'Ruta absoluta o relativa del componente de producción a radiografiar.' }
    },
    required: ['srcPath'],
    additionalProperties: false
  },
  'eos.fdir.ontology.sanitize': {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  'eos.orchestrator.init': {
    type: 'object',
    properties: {
      idMision: { type: 'string', description: 'Identificador único y canónico en mayúsculas de la nueva misión.' },
      descripcion: { type: 'string', description: 'Propósito, alcance y metas claras de la tarea de ingeniería.' }
    },
    required: ['idMision', 'descripcion'],
    additionalProperties: false
  },
  'eos.orchestrator.advance': {
    type: 'object',
    properties: {
      idMision: { type: 'string', description: 'Identificador de la misión activa a transitar.' },
      hashEvidencia: { type: 'string', description: 'Sello criptográfico SHA-256 (sha256-... o 64 hex) que aprueba el Gate anterior.' }
    },
    required: ['idMision', 'hashEvidencia'],
    additionalProperties: false
  },
  'eos.ontology.query': {
    type: 'object',
    properties: {
      idNodo: { type: 'string', description: 'Identificador canónico del nodo a inspeccionar en el grafo.' }
    },
    required: ['idNodo'],
    additionalProperties: false
  },
  'eos.ontology.link': {
    type: 'object',
    properties: {
      idOrigen: { type: 'string', description: 'Identificador del nodo origen de la relación.' },
      idDestino: { type: 'string', description: 'Identificador del nodo destino.' },
      tipoRelacion: {
        type: 'string',
        enum: ['GOVERNED_BY', 'DEPENDS_ON', 'AUDITED_BY', 'USES'],
        description: 'Tipo de enlace relacional estructurado bajo la taxonomía de EOS.'
      }
    },
    required: ['idOrigen', 'idDestino', 'tipoRelacion'],
    additionalProperties: false
  },
  'eos.process.governor.validate': {
    type: 'object',
    properties: {
      idOperacion: { type: 'string', description: 'Identificador único de la operación en el Ledger.' },
      payloadSimulacion: { type: 'object', description: 'Datos de salida a verificar e indexar.' }
    },
    required: ['idOperacion', 'payloadSimulacion'],
    additionalProperties: false
  },
  'eos.scaffolder.clean': {
    type: 'object',
    properties: {
      nombreComponente: {
        type: 'string',
        pattern: '^[a-z0-9-]+$',
        description: 'Nombre único del módulo en notación kebab-case (letras, números y guiones cortos).'
      }
    },
    required: ['nombreComponente']
  },
  'eos.sentinel.toggle': {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['START', 'STOP'], description: 'Start or stop the background sentinel daemon' },
      lineasBase: { type: 'object', description: 'Authorized baseline hashes and backup contents map' }
    },
    required: ['action']
  },
  'eos.intent.expand': {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Raw human instruction or goal statement to expand' },
      domainContext: { type: 'string', description: 'Optional domain or stack context' },
      authorityLevel: { type: 'string', enum: ['LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'], description: 'Granted autonomy authority level' }
    },
    required: ['prompt']
  },
  'eos.resolve.conflict': {
    type: 'object',
    properties: {
      conflict: { type: 'string', description: 'Description of the dilemma or technical conflict to resolve' },
      options: { type: 'array', items: { type: 'string' }, description: 'Candidate resolution approaches' },
      context: { type: 'object', description: 'Optional operational context' }
    },
    required: ['conflict']
  },
  'eos.fdir.recover': {
    type: 'object',
    properties: {
      lineasBaseAutorizadas: {
        type: 'object',
        description: 'Complete map of authorized SHA-256 baseline hashes and backup contents retrieved from Engram'
      }
    },
    required: ['lineasBaseAutorizadas']
  },
  'eos.drift.detect': {
    type: 'object',
    properties: {
      lineasBaseEsperadas: { type: 'object', description: 'Expected SHA-256 baseline hashes map (retrieved from Engram)' }
    }
  },
  'eos.kernel.boot': { type: 'object', properties: {}, additionalProperties: false },
  'eos.kernel.ledger': {
    type: 'object',
    properties: {
      idMision: { type: 'string', description: 'Unique mission identifier' },
      metadata: { type: 'object', description: 'State mutation payload to seal in cryptographic ledger' }
    },
    required: ['idMision']
  },
  'eos.kernel.evidence': {
    type: 'object',
    properties: {
      idEvidencia: { type: 'string', description: 'Unique evidence identifier (e.g. EVD-0001)' },
      categoria: { type: 'string', description: 'Audit or verification category' },
      payload: { type: 'object', description: 'Execution metadata, raw logs, or test results' }
    },
    required: ['idEvidencia']
  },
  'eos.mission.resolve': {
    type: 'object',
    properties: {
      goal: { type: 'string', description: 'Raw objective or user intent' },
      projectPath: { type: 'string', description: 'Relative or absolute project path' }
    },
    required: ['goal']
  },
  'eos.mission.start': {
    type: 'object',
    properties: {
      goal: { type: 'string', description: 'Mission goal statement' },
      projectPath: { type: 'string', description: 'Path to target workspace' },
      authorityLevel: { type: 'string', enum: ['LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'], description: 'Granted autonomy level' }
    },
    required: ['goal']
  },
  'eos.mission.status': {
    type: 'object',
    properties: { missionId: { type: 'string', description: 'Mission ID to query' } }
  },
  'eos.mission.recover': {
    type: 'object',
    properties: { missionId: { type: 'string', description: 'Mission ID to recover from append-only ledger' } },
    required: ['missionId']
  },
  'eos.context.compile': {
    type: 'object',
    properties: {
      mission: { type: 'object', description: 'Mission context object' },
      contract: { type: 'object', description: 'Authority and budget contract' }
    }
  },
  'eos.ledger.get_features': {
    type: 'object',
    properties: { missionId: { type: 'string', description: 'Mission identifier' } }
  },
  'eos.ledger.update_feature': {
    type: 'object',
    properties: {
      missionId: { type: 'string', description: 'Mission identifier' },
      featureId: { type: 'string', description: 'Feature identifier' },
      newStatus: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'VERIFIED', 'COMPLETED'], description: 'Target feature status' },
      evidenceReceipt: { type: 'object', description: 'Cryptographic evidence receipt' }
    },
    required: ['missionId', 'featureId', 'newStatus']
  },
  'eos.authority.check': {
    type: 'object',
    properties: {
      requiredLevel: { type: 'string', description: 'Required minimum autonomy authority level' },
      grantedLevel: { type: 'string', description: 'Current granted autonomy authority level' }
    },
    required: ['requiredLevel', 'grantedLevel']
  },
  'eos.policy.validate': {
    type: 'object',
    properties: {
      operation: { type: 'string', description: 'Operation type to validate' },
      targetPath: { type: 'string', description: 'Target file or directory path' }
    }
  },
  'eos.evidence.record': {
    type: 'object',
    properties: {
      missionId: { type: 'string', description: 'Mission identifier' },
      id: { type: 'string', description: 'Receipt ID' },
      payload: { type: 'object', description: 'Evidence payload' },
      category: { type: 'string', description: 'Category' },
      status: { type: 'string', description: 'Status' }
    },
    required: ['missionId']
  },
  'eos.evidence.get': {
    type: 'object',
    properties: {
      missionId: { type: 'string', description: 'Mission identifier' },
      id: { type: 'string', description: 'Receipt ID' }
    }
  },
  'eos.verifier.run': {
    type: 'object',
    properties: {
      strict: { type: 'boolean', description: 'Strict deterministic mode' },
      missionId: { type: 'string', description: 'Mission context identifier' }
    }
  },
  'eos.provider.route': {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Task prompt' },
      taskType: { type: 'string', description: 'Task category' }
    }
  },
  'eos.provider.health': {
    type: 'object',
    properties: { providerId: { type: 'string', description: 'Provider ID' } }
  },
  'eos.workspace.discover': {
    type: 'object',
    properties: { rootPath: { type: 'string', description: 'Workspace root' } }
  },
  'eos.workspace.barrier_check': {
    type: 'object',
    properties: { path: { type: 'string', description: 'Target path to check against External Write Barrier' } },
    required: ['path']
  },
  'eos.fdir.status': { type: 'object', properties: {} },
  'eos.fdir.trip': {
    type: 'object',
    properties: { reason: { type: 'string', description: 'Diagnostic reason' } },
    required: ['reason']
  },
  'eos.audit.run': {
    type: 'object',
    properties: { missionId: { type: 'string', description: 'Mission ID' } }
  },
  'eos.report.generate': {
    type: 'object',
    properties: { missionId: { type: 'string', description: 'Mission ID' } }
  },
  'eos.blueprint.run': {
    type: 'object',
    properties: { blueprint_path: { type: 'string', description: 'Path to blueprint JSON' } }
  },
  'eos.scaffolder.generate': {
    type: 'object',
    properties: {
      moduleName: { type: 'string', description: 'Module name' },
      targetDir: { type: 'string', description: 'Target directory' }
    },
    required: ['moduleName']
  },
  'eos.drift.check': {
    type: 'object',
    properties: {
      baseline: { type: 'object', description: 'Baseline schema' },
      candidate: { type: 'object', description: 'Candidate schema' }
    }
  },
  'eos.hud.dashboard': {
    type: 'object',
    properties: { missionId: { type: 'string', description: 'Mission ID' } }
  },
  'eos.skill.route': {
    type: 'object',
    properties: {
      taskContext: { type: 'string', description: 'Task context' },
      task: { type: 'string', description: 'Task instruction' }
    }
  }
};

export {
  CANONICAL_TOOLS,
  TIER_A_TOOL_NAMES,
  TOOL_INPUT_SCHEMAS,
  listTools,
  resolveMcpSurface
};
