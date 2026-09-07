/**
 * EOS Core Modern Clean Architecture Index
 * Unified entry point providing clean engineering facades, modern aliases, and canonical runtime engines.
 */

// Modern SDLC & Governance Engines
export { SpecDriftDetector } from './runtime/spec-drift-detector.js';
export { CursorTDDAutoHealer } from './runtime/cursor-tdd-auto-healer.js';
export { CursorAgentCouncil, AGENT_ROLES } from './runtime/cursor-agent-council.js';
export { ParallelAuditorDAG } from './runtime/parallel-auditor-dag.js';
export { ProjectPipelineRunner, loadProjectRegistration, parseOrchestrateArgs, PIPELINE_PHASES } from './runtime/project-pipeline-runner.js';
export { GovernanceTierClassifier, GovernanceTierExecutor, GOVERNANCE_TIERS } from './runtime/governance-tier.js';
export { EOSContextCompiler, ContextCompiler } from './runtime/context-compiler.js';
export { ParetoCostRouter, COST_TIERS } from './runtime/pareto-cost-router.js';
export { LivingArchitectureVisualizer } from './runtime/living-architecture-visualizer.js';
export { MutationTestingEngine } from './runtime/mutation-testing-engine.js';
export { TraceabilityMatrixEngine } from './runtime/traceability-matrix.js';
export { CryptographicSelfHealingSentinel } from './runtime/cryptographic-sentinel.js';
export { AdversarialRedTeamSimulator } from './runtime/adversarial-red-team.js';
export { AutonomousKaizenEngine } from './runtime/autonomous-kaizen.js';
export { OTelSemanticExporter, SPAN_KINDS } from './runtime/otel-semantic-exporter.js';
export { GitTransactionWatchdog } from './runtime/git-transaction-watchdog.js';
export { GuardrailSandwich } from '../mcp/guardrail-sandwich.js';
export { CausalAstEngine } from './ast/causal-ast-engine.js';
export { ArchitecturalFitnessEngine, DEFAULT_CLEAN_LAYERS } from './ast/architectural-fitness-engine.js';

// Governed Intelligence & LLM Integration (Phase 0)
export {
  LlmPort,
  LlmError,
  LlmAuthError,
  LlmBudgetError,
  LlmSchemaValidationError,
  LlmProviderError,
  LlmTimeoutError,
  LlmRateLimitError
} from './ports/llm-port.js';
export { GeminiAdapter } from './adapters/llm/gemini-adapter.js';
export { LlmAdapterRegistry } from './adapters/llm/adapter-registry.js';
export { LlmAuthorityGate } from './governance/llm-authority-gate.js';
export { LlmBudgetGovernor } from './intelligence/llm-budget-governor.js';
export { LlmReceiptEngine } from './intelligence/llm-receipt-engine.js';
export { GovernedLlmService } from './intelligence/governed-llm-service.js';

// Core Kernel & Governance
export { EOSKernel } from './kernel.js';
export { EOSDriftDetector } from './drift.js';
export { EOSFDIR } from './fdir.js';
export { EOSHarmonicMediator } from './mediator.js';
export { EOSIntentCompiler } from './intent-compiler.js';
export { EOSSentinelDaemon } from './sentinel-daemon.js';
export { EOSProviderRouter } from './provider-router.js';
export { EOSScaffolderClean } from './scaffolder-clean.js';
export { EOSProcessGovernor } from './process-governor.js';
export { EOSKnowledgeOntology, LAYER_TAXONOMY_MAP } from './knowledge-ontology.js';
export { EOSOrchestrator } from './orchestrator.js';
export { EOSFDIROntology } from './fdir-ontology.js';
export { RelationalTraceabilityMatrix, TRACE_LAYERS, RELATION_TYPES, RISK_TIERS } from './ontology/relational-traceability-matrix.js';

// Canonical Runtime Engines with Modern Aliases
export { EOSTescohanAuditor, EOSTescohanAuditor as CodePurityAuditor } from './runtime/tescohan-auditor.js';
export { TriamazikamnoSynthesisEngine, TriamazikamnoSynthesisEngine as TriadSynthesisEngine } from './runtime/triamazikamno-synthesis.js';
export { EOSHeptaparaparshinokhLedger, EOSHeptaparaparshinokhLedger as HierarchicalEventLedger } from './runtime/heptaparaparshinokh-ledger.js';
export { EOSKabbalahLedger, EOSKabbalahLedger as CryptographicStateLedger } from './runtime/kabbalah-ledger.js';
export { DistributedJusticeOracle, DistributedJusticeOracle as ConflictAdjudicationOracle } from './runtime/distributed-justice-oracle.js';
export { OntologicalFirewall, OntologicalFirewall as SemanticIntentionFirewall } from './runtime/ontological-firewall.js';
export { OkidanokhValidator, OkidanokhValidator as ThreeForceConsensusValidator } from './runtime/okidanokh-validator.js';
export { TrogoMeshProtocol, TrogoMeshProtocol as ReciprocalComputeMesh } from './runtime/trogo-mesh.js';
export { EOSAhimsaFilter, EOSAhimsaFilter as SideChannelIsolationGuard } from './runtime/ahimsa-filter.js';
export { EOSTriamazikamnoValidator, EOSTriamazikamnoValidator as TriadIntegrityValidator } from './runtime/triamazikamno-validator.js';
export { EOSSentinelSelfRemember, EOSSentinelSelfRemember as ProcessMemoryAuditSentinel } from './runtime/sentinel-self-remember.js';
export { L0Parser, L0Parser as FormalGrammarParser } from './runtime/l0-parser.js';
export { EOSTDDExecutor, EOSTDDExecutor as ClosedLoopTDDExecutor } from './runtime/tdd-executor.js';
export { EOSMissionOrchestrator, EOSMissionOrchestrator as MissionLifecycleOrchestrator } from './runtime/mission-orchestrator.js';
export { ContractEvidenceSealer, EARS_PATTERNS } from './formal/contract-evidence-sealer.js';

// Default export
import { EOSKernel } from './kernel.js';
import { SpecDriftDetector } from './runtime/spec-drift-detector.js';
import { CursorTDDAutoHealer } from './runtime/cursor-tdd-auto-healer.js';
import { CursorAgentCouncil } from './runtime/cursor-agent-council.js';
import { ParallelAuditorDAG } from './runtime/parallel-auditor-dag.js';

export default {
  EOSKernel,
  SpecDriftDetector,
  CursorTDDAutoHealer,
  CursorAgentCouncil,
  ParallelAuditorDAG
};
