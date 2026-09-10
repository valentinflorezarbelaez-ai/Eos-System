import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSddCeremonySpawn } from '../src/core/sdd/organic-routing-gate.js';
import { evaluateApplyClaim, auditTddReceipts } from '../src/core/sdd/tdd-evidence-receipt.js';
import { assertRddDoesNotGrantDelivery } from '../src/core/governance/rdd-review-stance.js';
import { ArchitecturalFitnessEngine } from '../src/core/ast/architectural-fitness-engine.js';
import { ContractEvidenceSealer } from '../src/core/formal/contract-evidence-sealer.js';
import { EconomicContractValidator } from '../src/core/formal/economic-contract-validator.js';
import { EvidenceCustody } from '../src/core/sdd/evidence-custody.js';
import { auditCanonicalEvdWritePaths, auditMissionLocalEvdWritePaths } from '../src/core/sdd/evd-seal-path.js';
import { auditMissionArtifactWritePaths } from '../src/core/runtime/mission-artifact-write.js';
import { verifyEngramContract } from '../src/core/memory/engram-contract.js';
import { auditFusionControlPlane, FUSION_CP_REQUIRED_PATHS } from './lib/fusion-cp-lock.js';
import { auditSentinelFdir, SENTINEL_FDIR_REQUIRED_PATHS } from './lib/sentinel-fdir-lock.js';
import { auditHooksInstallSurface, HOOKS_INSTALL_REQUIRED_PATHS } from './lib/hooks-install-smoke.js';
import { auditMcpCatalogLock, MCP_CATALOG_REQUIRED_PATHS } from './lib/mcp-catalog-lock.js';
import { auditP6InventoryLock, P6_INVENTORY_REQUIRED_PATHS } from './lib/p6-inventory-lock.js';
import { auditComplexityBudgetLock, COMPLEXITY_BUDGET_REQUIRED_PATHS } from './lib/complexity-budget-lock.js';
import { auditDeferredWritersLock, DEFERRED_WRITERS_REQUIRED_PATHS } from './lib/deferred-writers-lock.js';
import { auditContextPackLock, CONTEXT_PACK_REQUIRED_PATHS } from './lib/context-pack-lock.js';
import { auditLoopEngineeringLock, LOOP_ENGINEERING_REQUIRED_PATHS } from './lib/loop-engineering-lock.js';
import { auditWorktreePolicyLock, WORKTREE_POLICY_REQUIRED_PATHS } from './lib/worktree-policy-lock.js';
import { auditSpecbootCycleLock, SPECBOOT_CYCLE_REQUIRED_PATHS } from './lib/specboot-cycle-lock.js';
import { auditMcpToolKeepLock, MCP_TOOL_KEEP_REQUIRED_PATHS } from './lib/mcp-tool-keep-lock.js';
import { auditModelRoutingRatchetLock, MODEL_ROUTING_RATCHET_REQUIRED_PATHS } from './lib/model-routing-ratchet-lock.js';
import { auditKeepPoPruneHoldLock, KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS } from './lib/keep-po-prune-hold-lock.js';
import { auditComplexityCeilingHoldLock, COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS } from './lib/complexity-ceiling-hold-lock.js';
import { auditAgyWorkstationLock, AGY_WORKSTATION_REQUIRED_PATHS } from './lib/agy-workstation-lock.js';
import { auditDirtyDeferTriageLock, DIRTY_DEFER_TRIAGE_REQUIRED_PATHS } from './lib/dirty-defer-triage-lock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const isJson = args.includes('--json');
const knownFlags = ['--strict', '--json'];

// Check for invalid flags
const unknownArgs = args.filter(arg => !knownFlags.includes(arg));
if (unknownArgs.length > 0) {
  console.error(`Invalid arguments: ${unknownArgs.join(', ')}`);
  process.exit(2);
}

const REQUIRED_PATHS = [
  '.git',
  '.gitignore',
  '.editorconfig',
  'package.json',
  '.agents/AGENTS.md',
  '.agents/skills/sdd/SKILL.md',
  '.agents/skills/evidence-auditor/SKILL.md',
  '.agents/skills/security-auditor/SKILL.md',
  '.agents/skills/quality-auditor/SKILL.md',
  '.agents/skills/accessibility-auditor/SKILL.md',
  '.agents/skills/performance-auditor/SKILL.md',
  '.agents/skills/seo-auditor/SKILL.md',
  '.agents/skills/browser-qa/SKILL.md',
  'docs/core/CONSTITUTION.md',
  'docs/core/GOVERNANCE.md',
  'docs/workflows/EOS_CYCLE.md',
  'docs/workflows/TRACEABILITY.md',
  'docs/workflows/INTAKE_PIPELINE.md',
  'docs/workflows/SPECIFICATION_PIPELINE.md',
  'docs/workflows/MULTI_AGENT_HANDOFF.md',
  'docs/workflows/WEBSITE_QUALITY_MODEL.md',
  'docs/architecture/adrs/ADR-0001-eos-workspace-initialization.md',
  'docs/architecture/adrs/ADR-0002-autonomous-control-plane-architecture.md',
  'docs/architecture/adrs/ADR-0009-github-actions-cicd.md',
  'docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md',
  'docs/decisions/ADR-0010-LIDR-SPECBOOT-GENTLEMAN-DISCIPLINE-BRIDGE.md',
  'docs/base-standards.md',
  'docs/backend-standards.md',
  'docs/manuals/OPENSPEC_RUNTIME.md',
  'openspec/config.yaml',
  'ai-specs/README.md',
  'scripts/openspec-cli.js',
  'src/core/sdd/organic-routing-gate.js',
  'src/core/sdd/tdd-evidence-receipt.js',
  'src/core/governance/rdd-review-stance.js',
  'src/core/observability/operator-hud.js',
  'src/core/ast/architectural-fitness-engine.js',
  'src/core/formal/contract-evidence-sealer.js',
  'src/core/sdd/evidence-custody.js',
  'src/core/sdd/evd-seal-path.js',
  'tests/eos-g7-evd-custody-seal-path.test.js',
  'docs/releases/EOS_G7_EVD_CUSTODY_SEAL_PATH_2026-09-08.md',
  'scripts/custody-verify.js',
  'tests/roi4-i3-evidence-custody.test.js',
  'src/core/memory/engram-contract.js',
  'tests/roi6-engram-unify.test.js',
  'src/core/formal/economic-contract-validator.js',
  'tests/architectural-fitness.test.js',
  'tests/knowledge-ontology-consolidation.test.js',
  'tests/contract-evidence-sealer.test.js',
  'tests/economic-contract-validator.test.js',
  'bin/eos-doctor.js',
  'src/core/runtime/operator-doctor.js',
  'tests/eos-n3-operator-doctor.test.js',
  'docs/releases/EOS_N3_OPERATOR_DOCTOR_2026-09-08.md',
  'tests/eos-n4-hud-fusion-cp-lock.test.js',
  'docs/releases/EOS_N4_HUD_FUSION_CP_POST_G7_2026-09-08.md',
  'scripts/lib/independent-fusion-light.js',
  'tests/eos-n5-independent-fusion-light.test.js',
  'docs/releases/EOS_N5_INDEPENDENT_VERIFIER_FUSION_LIGHT_2026-09-08.md',
  'tests/eos-q3-doctor-fusion-light-l4-surfaces.test.js',
  'docs/releases/EOS_Q3_DOCTOR_FUSION_LIGHT_L4_SURFACES_2026-09-09.md',
  'tests/eos-r3-doctor-fusion-light-l5-surfaces.test.js',
  'docs/releases/EOS_R3_DOCTOR_FUSION_LIGHT_L5_SURFACES_2026-09-09.md',
  'tests/eos-t3-doctor-fusion-light-l7-surfaces.test.js',
  'docs/releases/EOS_T3_DOCTOR_FUSION_LIGHT_L7_SURFACES_2026-09-09.md',
  'tests/eos-u3-doctor-fusion-light-t4-t8.test.js',
  'docs/releases/EOS_U3_DOCTOR_FUSION_LIGHT_T4_T8_2026-09-09.md',
  'src/core/observability/mission-os-evd-observe-pack.js',
  'scripts/ci/mission-os-evd-observe-pack.js',
  'tests/eos-t4-mission-os-evd-observe-pack.test.js',
    'docs/releases/EOS_T4_MISSION_OS_EVD_OBSERVE_PACK_2026-09-09.md',
  'src/core/observability/mission-os-deepen.js',
  'scripts/ci/mission-os-deepen.js',
  'tests/eos-u4-mission-os-deepen.test.js',
  'docs/releases/EOS_U4_MISSION_OS_DEEPEN_2026-09-09.md',
  'scripts/lib/agy-admin-hitl-lock.js',
  'scripts/ci/agy-admin-hitl-checklist.js',
  'tests/eos-u5-agy-admin-hitl-checklist.test.js',
  'docs/releases/EOS_U5_AGY_ADMIN_HITL_CHECKLIST_2026-09-09.md',
  'docs/harness/AGY_ADMIN_HITL_CHECKLIST.md',
  'scripts/lib/openspec-cli-hold-lock.js',
  'scripts/ci/openspec-cli-hold-gate.js',
  'tests/eos-u6-openspec-cli-hold.test.js',
  'docs/releases/EOS_U6_OPENSPEC_CLI_HOLD_2026-09-09.md',
  'docs/harness/OPENSPEC_CLI_HOLD_RITUAL.md',
  'scripts/lib/keep-po-prune-hold-lock.js',
  'scripts/ci/keep-po-prune-gate.js',
  'tests/eos-t5-keep-po-prune-hold.test.js',
  'docs/releases/EOS_T5_KEEP_PO_PRUNE_HOLD_2026-09-09.md',
  'docs/harness/KEEP_PO_PRUNE_RITUAL.md',
  'scripts/lib/complexity-ceiling-hold-lock.js',
  'scripts/ci/complexity-ceiling-hold-gate.js',
  'tests/eos-t6-complexity-ceiling-hold.test.js',
  'docs/releases/EOS_T6_COMPLEXITY_CEILING_HOLD_2026-09-09.md',
  'docs/harness/COMPLEXITY_CEILING_HOLD_RITUAL.md',
  'scripts/lib/agy-workstation-lock.js',
  'scripts/ci/agy-workstation-smoke.js',
  'tests/eos-t7-agy-workstation-evidence.test.js',
  'docs/releases/EOS_T7_AGY_WORKSTATION_EVIDENCE_2026-09-09.md',
  'docs/harness/AGY_WORKSTATION_CHECKLIST.md',
  'scripts/lib/sentinel-fdir-lock.js',
  'tests/eos-n6-sentinel-fdir-lock.test.js',
  'docs/releases/EOS_N6_SENTINEL_FDIR_STRICT_LOCK_2026-09-08.md',
  'scripts/install-git-hooks.js',
  'scripts/lib/hooks-install-smoke.js',
  'tests/eos-p3-hooks-install-smoke.test.js',
  'docs/releases/EOS_P3_HOOKS_INSTALL_SMOKE_2026-09-08.md',
  'tests/eos-p4-mission-local-evd-seal.test.js',
  'docs/releases/EOS_P4_MISSION_LOCAL_EVD_SEAL_2026-09-09.md',
  'scripts/lib/mcp-catalog-lock.js',
  'tests/eos-p5-mcp-catalog-reconcile.test.js',
  'docs/releases/EOS_P5_MCP_CATALOG_RECONCILE_2026-09-09.md',
  'scripts/lib/p6-inventory-lock.js',
  'tests/eos-p6-complexity-prune-inventory.test.js',
  'tests/eos-q6-p6-inventory-verify-lock.test.js',
  'docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md',
  'docs/releases/EOS_Q6_P6_INVENTORY_VERIFY_LOCK_2026-09-09.md',
  'scripts/lib/complexity-budget-lock.js',
  'tests/eos-r4-at-ceiling-schema-gate.test.js',
  'docs/releases/EOS_R4_AT_CEILING_SCHEMA_GATE_2026-09-09.md',
  'scripts/lib/deferred-writers-lock.js',
  'tests/eos-r5-deferred-writers-governance.test.js',
  'docs/releases/EOS_R5_DEFERRED_WRITERS_INVENTORY_2026-09-09.md',
  'docs/releases/EOS_R5_DEFERRED_WRITERS_GOVERNANCE_2026-09-09.md',
  'scripts/lib/context-pack-lock.js',
  'tests/eos-s2-context-pack-tpc.test.js',
  'docs/harness/CONTEXT_PACK_TPC.md',
  'docs/releases/EOS_S2_CONTEXT_PACK_TPC_2026-09-09.md',
  'scripts/lib/loop-engineering-lock.js',
  'tests/eos-s3-loop-engineering-4q.test.js',
  'docs/harness/LOOP_ENGINEERING_4Q.md',
  'docs/architecture/adrs/ADR-0017-loop-engineering-4q.md',
  'docs/releases/EOS_S3_LOOP_ENGINEERING_4Q_2026-09-09.md',
  'scripts/lib/worktree-policy-lock.js',
  'tests/eos-s4-worktree-isolation.test.js',
  'docs/harness/WORKTREE_ISOLATION_POLICY.md',
  'docs/releases/EOS_S4_WORKTREE_ISOLATION_2026-09-09.md',
  'scripts/lib/specboot-cycle-lock.js',
  'tests/eos-specboot-antigravity-first.test.js',
  'docs/harness/SPECBOOT_CYCLE.md',
  'docs/harness/ANTIGRAVITY_FIRST.md',
  'docs/releases/EOS_SPECBOOT_ANTIGRAVITY_FIRST_2026-09-09.md',
  'scripts/lib/mcp-tool-keep-lock.js',
  'tests/eos-s5-mcp-tool-keep-inventory.test.js',
  'docs/releases/EOS_S5_MCP_TOOL_KEEP_INVENTORY_2026-09-09.md',
  'scripts/lib/model-routing-ratchet-lock.js',
  'tests/eos-s6-model-routing-ratchet.test.js',
  'docs/harness/MODEL_ROUTING.md',
  'docs/harness/RATCHET_RITUAL.md',
  'docs/architecture/adrs/ADR-0018-model-routing-ratchet.md',
  'docs/releases/EOS_S6_MODEL_ROUTING_RATCHET_2026-09-09.md',
  'bin/eos-hud.js',
  'bin/eos-top.js',
  'docs/specs/eos_core/SPEC-GHA-001-github-actions-cicd.md',
  'docs/governance/CI_CD_CONTRACT.md',
  'docs/governance/CI_CD_CONTRACT.json',
  '.github/workflows/ci.yml',
  '.github/workflows/cd-release-gate.yml',
  'scripts/ci/assert-gha-contract.js',
  'scripts/ci/extract-json-payload.js',
  'tests/github-actions-cicd.test.js',
  'docs/architecture/TOOL_AGNOSTIC_ARCHITECTURE.md',
  'docs/architecture/CAPABILITY_INTELLIGENCE_ENGINE.md',
  'docs/capabilities/schema.json',
  'docs/capabilities/REGISTRY.json',
  'docs/tools/schema.json',
  'docs/tools/REGISTRY.json',
  'docs/tools/SELECTION_ENGINE.json',
  'docs/adapters/schema.json',
  'docs/adapters/REGISTRY.json',
  'docs/providers/schema.json',
  'docs/providers/REGISTRY.json',
  'docs/providers/SELECTION_POLICY.json',
  'docs/agents/REGISTRY.json',
  'docs/agents/SELECTION_ENGINE.json',
  'docs/agents/TEAM_COMPOSITION.json',
  'docs/orchestration/TASK_DECOMPOSITION.json',
  'docs/orchestration/TASK_GRAPH.json',
  'docs/orchestration/ENGINEERING_FACTORY.md',
  'docs/orchestration/EXECUTION_PLANNER.json',
  'docs/orchestration/FALLBACK_ENGINE.json',
  'docs/orchestration/FAILURE_HANDLING.json',
  'docs/policies/POLICY_ENGINE.json',
  'docs/policies/AUTONOMY_RISK_MODEL.json',
  'docs/policies/REVERSIBILITY_ENGINE.json',
  'docs/projects/STATE_MACHINE.json',
  'docs/orchestration/DRY_RUN_ENGINE.json',
  'docs/architecture/ROLLBACK_STRATEGY.md',
  'docs/knowledge/CONTINUOUS_LEARNING_LOOP.md',
  'docs/knowledge/RESEARCH_ENGINE.md',
  'docs/knowledge/AGENT_PERFORMANCE_MEMORY.json',
  'docs/intelligence/sources/schema.json',
  'docs/intelligence/sources/SOURCES.json',
  'docs/intelligence/research/schema.json',
  'docs/intelligence/research/RSC-0001-gentleman-engram-study.json',
  'docs/intelligence/research/RSC-0002-multi-agent-orchestration-study.json',
  'docs/intelligence/research/RSC-0003-software-factory-study.json',
  'docs/intelligence/research/RSC-0004-tool-agnostic-adapter-architecture.json',
  'docs/architecture/AUTONOMOUS_EXECUTION_RUNTIME.md',
  'docs/orchestration/EXECUTION_RUNTIME.json',
  'docs/orchestration/EXECUTION_STATE_MACHINE.json',
  'docs/orchestration/REPLAN_ENGINE.json',
  'docs/orchestration/EXECUTION_HISTORY.json',
  'docs/orchestration/ENGINEERING_LIFECYCLE.json',
  'docs/agents/AGENT_COUNCIL.json',
  'docs/missions/schema.json',
  'docs/missions/REGISTRY.json',
  'docs/architecture/AUTONOMOUS_ENGINEERING_MISSION_ENGINE.md',
  'docs/governance/META_GOVERNANCE_ENGINE.md',
  'docs/intelligence/research/RSC-0005-capability-selection-engine.json',
  'docs/intelligence/research/RSC-0006-autonomous-execution-runtime.json',
  'docs/intelligence/research/RSC-0007-autonomous-engineering-mission-simulation.json',
  'docs/intelligence/research/RSC-0008-engineering-factory-strategy-optimization.json',
  'docs/intelligence/research/RSC-0009-autonomous-engineering-mission-proving.json',
  'docs/intelligence/research/RSC-0010-autonomous-self-evaluation-evolution.json',
  'docs/intelligence/research/RSC-0011-autonomous-engineering-operating-loop.json',
  'docs/intelligence/research/RSC-0012-production-readiness-release-governance.json',
  'docs/intelligence/research/RSC-0013-adversarial-engineering-chaos-resilience.json',
  'docs/governance/RELEASE_GOVERNANCE_ENGINE.md',
  'docs/governance/PRODUCTION_READINESS_MODEL.json',
  'docs/governance/RELEASE_CONTRACT.json',
  'docs/governance/ADVERSARIAL_TRUTH_PRINCIPLE.md',
  'docs/governance/ADVERSARIAL_ATTACK_TAXONOMY.json',
  'docs/governance/BLAST_RADIUS_MODEL.json',
  'docs/governance/RESILIENCE_MODEL.json',
  'docs/architecture/ENGINEERING_FACTORY.md',
  'docs/architecture/AUTONOMOUS_ENGINEERING_FACTORY_PROVING.md',
  'docs/architecture/AUTONOMOUS_SELF_EVOLUTION_ENGINE.md',
  'docs/architecture/AUTONOMOUS_ENGINEERING_OPERATING_LOOP.md',
  'docs/intelligence/ENGINEERING_ECONOMICS.md',
  'docs/orchestration/STRATEGY_ENGINE.json',
  'docs/orchestration/STRATEGY_SELECTION_POLICY.json',
  'docs/orchestration/EVOLUTION_STATE_MACHINE.json',
  'docs/orchestration/OPERATING_LOOP_STATE_MACHINE.json',
  'docs/orchestration/OPERATING_LOOP_CONTRACT.json',
  'docs/orchestration/RELEASE_GATE_STATE_MACHINE.json',
  'docs/orchestration/GAME_DAY_STATE_MACHINE.json',
  'docs/evolution/schema.json',
  'docs/evolution/REGISTRY.json',
  'docs/decisions/STRATEGY_DECISIONS/schema.json',
  'docs/intelligence/AGENT_PERFORMANCE_MEMORY.json',
  'docs/intelligence/TOOL_PERFORMANCE_MEMORY.json',
  'docs/intelligence/patterns/schema.json',
  'docs/intelligence/patterns/PAT-0001-spec-driven-development.json',
  'docs/intelligence/patterns/PAT-0002-evidence-first-verification.json',
  'docs/intelligence/anti-patterns/schema.json',
  'docs/intelligence/anti-patterns/ANT-0001-premature-external-implementation.json',
  'docs/intelligence/anti-patterns/ANT-0002-tool-first-blind-copying.json',
  'docs/intelligence/comparisons/CMP-0001-industry-engineering-matrix.json',
  'docs/intelligence/capabilities/schema.json',
  'docs/intelligence/capabilities/CAP-0001-persistent-engineering-memory.json',
  'docs/intelligence/decisions/schema.json',
  'docs/intelligence/decisions/DEC-INT-0001-adopt-engram-memory-protocol.json',
  'docs/intelligence/META_VERIFICATION.md',
  'docs/intelligence/KNOWLEDGE_GRAPH_MODEL.md',
  'docs/intelligence/CAPABILITY_VERIFICATION_MATRIX.md',
  'scripts/adapters/mock-code-adapter.js',
  'scripts/adapters/mock-research-adapter.js',
  'scripts/adapters/mock-test-adapter.js',
  'scripts/adapters/mock-browser-adapter.js',
  'scripts/engine/capability-intelligence-engine.js',
  'scripts/engine/autonomous-execution-runtime.js',
  'scripts/engine/autonomous-engineering-mission-engine.js',
  'scripts/engine/autonomous-engineering-factory.js',
  'scripts/engine/autonomous-self-evolution-engine.js',
  'scripts/engine/autonomous-engineering-operating-loop.js',
  'scripts/engine/release-decision-engine.js',
  'scripts/engine/production-readiness-review.js',
  'scripts/engine/adversarial-laboratory-engine.js',
  'scripts/engine/strategy-engine.js',
  'scripts/engine/strategy-simulator.js',
  'scripts/engine/strategy-selection-engine.js',
  'scripts/engine/simulate-strategies.js',
  'tests/fixtures/projects/synthetic-app/package.json',
  'tests/fixtures/projects/synthetic-app/SPEC.json',
  'tests/fixtures/projects/synthetic-app/AUTHORIZATION.json',
  'tests/fixtures/mission-projects/synthetic-website/package.json',
  'tests/fixtures/mission-projects/synthetic-api/package.json',
  'tests/fixtures/mission-projects/synthetic-ecommerce/package.json',
  'tests/fixtures/mission-projects/synthetic-data/package.json',
  'tests/fixtures/mission-projects/synthetic-mobile/package.json',
  'tests/fixtures/mission-projects/synthetic-ai-agent/package.json',
  'tests/fixtures/mission-projects/synthetic-migration/package.json',
  'tests/fixtures/mission-projects/synthetic-security-remediation/package.json',
  'tests/fixtures/production-projects/synthetic-production-website/package.json',
  'tests/fixtures/production-projects/synthetic-production-api/package.json',
  'tests/fixtures/production-projects/synthetic-production-ecommerce/package.json',
  'tests/fixtures/production-projects/synthetic-production-ai-agent/package.json',
  'tests/fixtures/production-projects/synthetic-production-migration/package.json',
  'tests/fixtures/adversarial-projects/synthetic-adversarial-tool/package.json',
  'tests/fixtures/adversarial-projects/synthetic-adversarial-provider/package.json',
  'tests/fixtures/adversarial-projects/synthetic-adversarial-agent/package.json',
  'tests/fixtures/adversarial-projects/synthetic-adversarial-evidence/package.json',
  'tests/fixtures/adversarial-projects/synthetic-adversarial-governance/package.json',
  'tests/control-plane-hardening.test.js',
  'tests/intelligence.test.js',
  'tests/factory-governance.test.js',
  'tests/adapter-architecture.test.js',
  'tests/capability-intelligence.test.js',
  'tests/execution-runtime.test.js',
  'tests/mission-engine.test.js',
  'tests/strategy-engine.test.js',
  'tests/factory-proving.test.js',
  'tests/self-evolution.test.js',
  'tests/operating-loop.test.js',
  'tests/release-governance.test.js',
  'tests/adversarial-chaos.test.js',
  'docs/evidence/schema.json',
  'docs/evidence/TEMPLATE.md',
  'docs/evidence/EVD-0001.json',
  'docs/evidence/EVD-0002.json',
  'docs/evidence/EVD-0003.json',
  'docs/evidence/EVD-0004.json',
  'docs/evidence/EVD-0005.json',
  'docs/evidence/EVD-0006.json',
  'docs/evidence/EVD-0007.json',
  'docs/evidence/EVD-0008.json',
  'docs/evidence/EVD-0009.json',
  'docs/evidence/EVD-0010.json',
  'docs/evidence/EVD-0011.json',
  'docs/evidence/EVD-0012.json',
  'docs/evidence/EVD-0013.json',
  'docs/evidence/EVD-0014.json',
  'docs/evidence/EVD-0015.json',
  'docs/evidence/EVD-0016.json',
  'docs/evidence/EVD-0017.json',
  'docs/evidence/EVD-0018.json',
  'docs/evidence/EVD-0019.json',
  'docs/evidence/EVD-0020.json',
  'docs/evidence/EVD-0021.json',
  'docs/evidence/EVD-0022.json',
  'docs/evidence/EVD-0023.json',
  'docs/governance/EOS_INDEPENDENT_EMPIRICAL_VALIDATION_STANDARD.md',
  'docs/governance/CLAIM_VALIDATION_MODEL.json',
  'docs/governance/EVIDENCE_INDEPENDENCE_MODEL.json',
  'docs/governance/FALSIFICATION_CONTRACT.json',
  'docs/governance/CONTRADICTION_MODEL.json',
  'docs/governance/VALIDATION_STATE_MACHINE.json',
  'docs/governance/COMPLEXITY_BUDGET.json',
  'scripts/engine/independent-verification-harness.js',
  'tests/fixtures/falsification-projects/synthetic-falsification-valid/package.json',
  'tests/fixtures/falsification-projects/synthetic-falsification-contradictory/package.json',
  'tests/independent-validation.test.js',
  'docs/specs/TEMPLATE.md',
  'docs/projects/REGISTRY_MODEL.md',
  'docs/projects/TEMPLATE.json',
  'docs/projects/schema.json',
  'docs/projects/registry.json',
  'docs/projects/registrations/fundacion.json',
  'docs/projects/registrations/fundacion/DECISION_RECORD.md',
  'docs/projects/registrations/fundacion/IMPLEMENTATION_AUTHORIZATION.md',
  'docs/intake/TEMPLATE.md',
  'docs/intake/fundacion/PROJECT_CONTEXT.md',
  'docs/intake/fundacion/CONTENT_INVENTORY.md',
  'docs/intake/fundacion/OBSERVATIONS.md',
  'docs/intake/fundacion/UNKNOWN_AND_GAPS.md',
  'docs/intake/fundacion/REQUIREMENTS_DISCOVERY.md',
  'docs/intake/fundacion/inventory.json',
  'docs/specs/fundacion/SPEC-0001-fundacion-core.md',
  'docs/audits/EOS_PHASE_6_TECHNICAL_AUDIT.md',
  'docs/audits/EOS_PHASE_7_REMEDIATION.md',
  'docs/audits/EOS_PHASE_8_RELEASE_READINESS.md',
  'docs/audits/EOS_PHASE_9_STAGING_PREVIEW.md',
  'docs/audits/EOS_CURRENT_STATE_AUDIT.md',
  'docs/audits/EOS_PHASE_10_CONTROL_PLANE_HARDENING.md',
  'docs/audits/EOS_PHASE_11_ENGINEERING_INTELLIGENCE.md',
  'docs/audits/EOS_PHASE_12_AUTONOMOUS_ENGINEERING_FACTORY.md',
  'docs/audits/EOS_PHASE_13_TOOL_AGNOSTIC_ARCHITECTURE.md',
  'docs/audits/EOS_PHASE_14_CAPABILITY_INTELLIGENCE.md',
  'docs/audits/EOS_PHASE_15_AUTONOMOUS_EXECUTION_RUNTIME.md',
  'docs/audits/EOS_PHASE_16_AUTONOMOUS_MISSION_SIMULATION.md',
  'docs/audits/EOS_PHASE_17_ENGINEERING_FACTORY.md',
  'docs/audits/EOS_PHASE_18_END_TO_END_MISSION_PROVING.md',
  'docs/audits/EOS_PHASE_19_AUTONOMOUS_SELF_EVALUATION.md',
  'docs/audits/EOS_PHASE_20_AUTONOMOUS_ENGINEERING_OPERATING_LOOP.md',
  'docs/audits/EOS_PHASE_21_AUTONOMOUS_RELEASE_GOVERNANCE.md',
  'docs/audits/EOS_PHASE_22_ADVERSARIAL_RESILIENCE.md',
  'docs/evidence/EVD-0024.json',
  'docs/evidence/EVD-0025.json',
  'docs/evidence/EVD-0026.json',
  'docs/evidence/EVD-0027.json',
  'docs/evidence/EVD-0028.json',
  'docs/evidence/EVD-0029.json',
  'docs/evidence/EVD-0030.json',
  'docs/evidence/EVD-0031.json',
  'docs/audits/EOS_PHASE_24_INDEPENDENT_VALIDATION.md',
  'docs/audits/EOS_PHASE_26_REAL_PROJECT_DISCOVERY.md',
  'docs/audits/EOS_PHASE_28_ECOSYSTEM_BENCHMARK.md',
  'docs/audits/EOS_PHASE_29_AGENTIC_INTEGRATION.md',
  'docs/audits/EOS_PHASE_30_REAL_PROJECT_PROPOSAL.md',
  'docs/audits/EOS_PHASE_30_CONTROLLED_IMPLEMENTATION.md',
  'docs/audits/EOS_PHASE_31_EXTERNAL_PRODUCT_VALIDATION.md',
  'docs/audits/EOS_PHASE_32_BROWSER_RUNTIME_VALIDATION.md',
  'docs/audits/EOS_FORENSIC_AUDIT_REPORT.md',
  'docs/audits/EOS_FORENSIC_FINDINGS.json',
  'docs/audits/EOS_FORENSIC_INVARIANTS.json',
  'docs/audits/EOS_FORENSIC_CONTRADICTIONS.json',
  'docs/audits/EOS_FORENSIC_REDUNDANCY.json',
  'docs/audits/EOS_FORENSIC_COMPLEXITY.json',
  'docs/audits/EOS_FORENSIC_EVIDENCE.json',
  'docs/audits/EOS_FORENSIC_READINESS.json',
  'docs/audits/EOS_SYSTEM_AUDIT_REPORT.md',
  'docs/audits/EOS_SYSTEM_AUDIT_FINDINGS.json',
  'docs/audits/EOS_SYSTEM_INVARIANTS.json',
  'docs/audits/EOS_SYSTEM_CONTRADICTIONS.json',
  'docs/audits/EOS_SYSTEM_GOVERNANCE_MATRIX.json',
  'docs/audits/EOS_SYSTEM_STATE_MACHINE_AUDIT.json',
  'docs/audits/EOS_SYSTEM_EVIDENCE_AUDIT.json',
  'docs/audits/EOS_SYSTEM_SECURITY_AUDIT.json',
  'docs/audits/EOS_SYSTEM_COMPLEXITY_AUDIT.json',
  'docs/audits/EOS_SYSTEM_READINESS_ASSESSMENT.json',
  'docs/audits/EOS_SYSTEM_AUDIT_EVIDENCE.json',
  'docs/core/FOUNDATIONAL_CONTEXT.md',
  'docs/audits/EOS_FOUNDATIONAL_CONTEXT_AUDIT.md',
  // M1 fusion control-plane lock (Ladder 2 G1)
  ...FUSION_CP_REQUIRED_PATHS,
  // N6 Sentinel/FDIR strict-verify lock (Ladder 3 H6)
  ...SENTINEL_FDIR_REQUIRED_PATHS,
  ...HOOKS_INSTALL_REQUIRED_PATHS,
  ...MCP_CATALOG_REQUIRED_PATHS,
  ...P6_INVENTORY_REQUIRED_PATHS,
  ...COMPLEXITY_BUDGET_REQUIRED_PATHS,
  ...DEFERRED_WRITERS_REQUIRED_PATHS,
  ...CONTEXT_PACK_REQUIRED_PATHS,
  ...LOOP_ENGINEERING_REQUIRED_PATHS,
  ...WORKTREE_POLICY_REQUIRED_PATHS,
  ...SPECBOOT_CYCLE_REQUIRED_PATHS,
    ...MCP_TOOL_KEEP_REQUIRED_PATHS,
  ...MODEL_ROUTING_RATCHET_REQUIRED_PATHS,
  ...KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS,
  ...COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS,
  ...AGY_WORKSTATION_REQUIRED_PATHS,
  ...DIRTY_DEFER_TRIAGE_REQUIRED_PATHS
];

const REQUIRED_EVIDENCE_STATUSES = [
  'VERIFIED',
  'NOT VERIFIED',
  'PARTIALLY VERIFIED',
  'BLOCKED',
  'ASSUMPTION',
  'RISK'
];

function verifyWorkspace() {
  const report = {
    status: 'PASS',
    strictMode: isStrict,
    timestamp: new Date().toISOString(),
    checks: [],
    failures: [],
    warnings: []
  };

  // 1. Existence Checks
  for (const relPath of REQUIRED_PATHS) {
    const fullPath = path.join(rootDir, relPath);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      report.checks.push({ path: relPath, status: 'VERIFIED', type: 'existence' });
    } else {
      report.failures.push({ path: relPath, message: 'Required path missing', type: 'existence' });
    }
  }

  // 2. External Target Workspace Write Barrier Check (Authorization-Aware: PROP-VRF-002)
  const externalFundacionPath = 'C:\\Users\\valen\\Documents\\Fundacion';
  const authRecordL2Path = path.join(rootDir, 'docs/projects/registrations/fundacion/IMPLEMENTATION_AUTHORIZATION.md');
  const authRecordL3Path = path.join(rootDir, 'docs/decisions/DECISION_GATE_L3_REAL_001.md');
  const dagL3Path = path.join(rootDir, 'docs/projects/registrations/fundacion/PROPOSED_L3_TASK_DAG_V2.json');
  const poDecisionFreezePath = path.join(rootDir, 'docs/decisions/PO_DECISION_LEVEL_3_ELIGIBILITY_AND_EXECUTION_AUTHORIZATION.md');

  const isFundacionFrozen = fs.existsSync(poDecisionFreezePath) && 
                            /External Target Writes \(Fundacion\)\s+STRICTLY FROZEN/i.test(fs.readFileSync(poDecisionFreezePath, 'utf8'));

  const hasLevel3Auth = !isFundacionFrozen &&
                        fs.existsSync(authRecordL3Path) && 
                        /AUTHORIZED/i.test(fs.readFileSync(authRecordL3Path, 'utf8')) &&
                        fs.existsSync(dagL3Path);
  const hasLevel2Auth = !isFundacionFrozen &&
                        fs.existsSync(authRecordL2Path) && 
                        fs.readFileSync(authRecordL2Path, 'utf8').includes('AUTHORIZED — LEVEL 2');

  if (fs.existsSync(externalFundacionPath)) {
    if (isFundacionFrozen) {
      report.checks.push({ path: 'ExternalTarget:Fundacion', status: 'VERIFIED', type: 'external-target-frozen' });
    } else {
      const contents = fs.readdirSync(externalFundacionPath);
      if (contents.length === 0) {
        report.checks.push({ path: 'ExternalTarget:Fundacion', status: 'VERIFIED', type: 'external-isolation-empty' });
      } else if (hasLevel3Auth) {
      // Level 3 Authorized: Dynamic evaluation against authorized tripartite scope
      const dagL3 = JSON.parse(fs.readFileSync(dagL3Path, 'utf8'));
      const authorizedFiles = (dagL3.tripartite_scope && dagL3.tripartite_scope.authorized_files) || [];
      const authorizedContainers = (dagL3.tripartite_scope && dagL3.tripartite_scope.authorized_container_dirs) || [];
      const authorizedMetadata = (dagL3.tripartite_scope && dagL3.tripartite_scope.authorized_metadata_dirs) || [];

      // Helper to scan directory items recursively
      const scanRelativeItems = (dir, base = '') => {
        let items = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const relPath = base ? `${base}/${entry.name}` : entry.name;
          items.push({ relPath, isDirectory: entry.isDirectory() });
          if (entry.isDirectory() && entry.name !== '.git') {
            items = items.concat(scanRelativeItems(path.join(dir, entry.name), relPath));
          }
        }
        return items;
      };

      const physicalItems = scanRelativeItems(externalFundacionPath);
      const unapprovedItems = [];

      for (const item of physicalItems) {
        if (item.isDirectory) {
          const formattedDir = item.relPath.endsWith('/') ? item.relPath : `${item.relPath}/`;
          const isContainerAuth = authorizedContainers.includes(formattedDir) || authorizedMetadata.includes(formattedDir) || item.relPath === '.git';
          if (!isContainerAuth) {
            unapprovedItems.push(item.relPath);
          }
        } else {
          const isFileAuth = authorizedFiles.includes(item.relPath);
          if (!isFileAuth) {
            unapprovedItems.push(item.relPath);
          }
        }
      }

      if (unapprovedItems.length === 0) {
        report.checks.push({ path: 'ExternalTarget:Fundacion', status: 'VERIFIED', type: 'external-target-level3-authorized' });
      } else {
        report.failures.push({ path: 'ExternalTarget:Fundacion', message: `External target contains unapproved items outside Level 3 scope: ${unapprovedItems.join(', ')}`, type: 'external-target-level3-authorized' });
      }
    } else if (hasLevel2Auth) {
      // Level 2 Authorized: Verify that all root contents strictly belong to the authorized changeset
      const authorizedRootItems = ['.editorconfig', '.gitignore', '.git', 'deployment.manifest.json', 'index.html', 'package.json', 'src'];
      const unapprovedItems = contents.filter(item => !authorizedRootItems.includes(item));
      if (unapprovedItems.length === 0) {
        report.checks.push({ path: 'ExternalTarget:Fundacion', status: 'VERIFIED', type: 'external-target-level2-authorized' });
      } else {
        report.failures.push({ path: 'ExternalTarget:Fundacion', message: `External target contains unapproved items outside Level 2 scope: ${unapprovedItems.join(', ')}`, type: 'external-target-level2-authorized' });
      }
    } else {
      report.failures.push({ path: 'ExternalTarget:Fundacion', message: `External target contains ${contents.length} unapproved items during EOS Development Mode without active authorization`, type: 'external-isolation-empty' });
    }
    }
  }

  // 3. Strict Mode Content & Consistency Audits
  if (isStrict) {
    // 3a. JSON Integrity Check
    const jsonFiles = [
      'package.json',
      'docs/capabilities/schema.json',
      'docs/capabilities/REGISTRY.json',
      'docs/tools/schema.json',
      'docs/tools/REGISTRY.json',
      'docs/tools/SELECTION_ENGINE.json',
      'docs/adapters/schema.json',
      'docs/adapters/REGISTRY.json',
      'docs/providers/schema.json',
      'docs/providers/REGISTRY.json',
      'docs/providers/SELECTION_POLICY.json',
      'docs/agents/REGISTRY.json',
      'docs/agents/SELECTION_ENGINE.json',
      'docs/agents/TEAM_COMPOSITION.json',
      'docs/orchestration/TASK_DECOMPOSITION.json',
      'docs/orchestration/TASK_GRAPH.json',
      'docs/orchestration/EXECUTION_PLANNER.json',
      'docs/orchestration/FALLBACK_ENGINE.json',
      'docs/orchestration/EXECUTION_RUNTIME.json',
      'docs/orchestration/EXECUTION_STATE_MACHINE.json',
      'docs/orchestration/REPLAN_ENGINE.json',
      'docs/orchestration/EXECUTION_HISTORY.json',
      'docs/orchestration/FAILURE_HANDLING.json',
      'docs/policies/POLICY_ENGINE.json',
      'docs/policies/AUTONOMY_RISK_MODEL.json',
      'docs/policies/REVERSIBILITY_ENGINE.json',
      'docs/projects/STATE_MACHINE.json',
      'docs/orchestration/DRY_RUN_ENGINE.json',
      'docs/knowledge/AGENT_PERFORMANCE_MEMORY.json',
      'docs/intelligence/sources/schema.json',
      'docs/intelligence/sources/SOURCES.json',
      'docs/intelligence/research/schema.json',
      'docs/intelligence/research/RSC-0001-gentleman-engram-study.json',
      'docs/intelligence/research/RSC-0002-multi-agent-orchestration-study.json',
      'docs/intelligence/research/RSC-0003-software-factory-study.json',
      'docs/intelligence/research/RSC-0004-tool-agnostic-adapter-architecture.json',
      'docs/intelligence/research/RSC-0005-capability-selection-engine.json',
      'docs/intelligence/research/RSC-0006-autonomous-execution-runtime.json',
      'docs/intelligence/research/RSC-0007-autonomous-engineering-mission-simulation.json',
      'docs/intelligence/patterns/schema.json',
      'docs/intelligence/patterns/PAT-0001-spec-driven-development.json',
      'docs/intelligence/patterns/PAT-0002-evidence-first-verification.json',
      'docs/intelligence/anti-patterns/schema.json',
      'docs/intelligence/anti-patterns/ANT-0001-premature-external-implementation.json',
      'docs/intelligence/anti-patterns/ANT-0002-tool-first-blind-copying.json',
      'docs/intelligence/comparisons/CMP-0001-industry-engineering-matrix.json',
      'docs/intelligence/capabilities/schema.json',
      'docs/intelligence/capabilities/CAP-0001-persistent-engineering-memory.json',
      'docs/intelligence/decisions/schema.json',
      'docs/intelligence/decisions/DEC-INT-0001-adopt-engram-memory-protocol.json',
      'tests/fixtures/projects/synthetic-app/package.json',
      'tests/fixtures/projects/synthetic-app/SPEC.json',
      'tests/fixtures/projects/synthetic-app/AUTHORIZATION.json',
      'docs/evidence/schema.json',
      'docs/evidence/EVD-0001.json',
      'docs/evidence/EVD-0002.json',
      'docs/evidence/EVD-0003.json',
      'docs/evidence/EVD-0004.json',
      'docs/evidence/EVD-0005.json',
      'docs/evidence/EVD-0006.json',
      'docs/evidence/EVD-0007.json',
      'docs/evidence/EVD-0008.json',
      'docs/evidence/EVD-0009.json',
      'docs/evidence/EVD-0010.json',
      'docs/evidence/EVD-0011.json',
      'docs/evidence/EVD-0012.json',
      'docs/evidence/EVD-0013.json',
      'docs/evidence/EVD-0014.json',
      'docs/evidence/EVD-0015.json',
      'docs/evidence/EVD-0016.json',
      'docs/evidence/EVD-0017.json',
      'docs/evidence/EVD-0018.json',
      'docs/evidence/EVD-0019.json',
      'docs/evidence/EVD-0020.json',
      'docs/evidence/EVD-0021.json',
      'docs/evidence/EVD-0022.json',
      'docs/evidence/EVD-0023.json',
      'docs/evidence/EVD-0024.json',
      'docs/evidence/EVD-0025.json',
      'docs/evidence/EVD-0026.json',
      'docs/evidence/EVD-0027.json',
      'docs/evidence/EVD-0028.json',
      'docs/evidence/EVD-0029.json',
      'docs/evidence/EVD-0030.json',
      'docs/evidence/EVD-0031.json',
      'docs/intelligence/research/RSC-0014-gentleman-ecosystem-benchmark.json',
      'docs/intelligence/research/RSC-0015-agentic-engineering-gap-analysis.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_STATE.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_DISCOVERY.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_ARCHITECTURE_ASSESSMENT.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_RISK_ASSESSMENT.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_EVIDENCE.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_UNCERTAINTIES.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_CONTRADICTIONS.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_RECOMMENDATIONS.json',
      'docs/intelligence/real_projects/fundacion/REAL_PROJECT_AUDIT_TRAIL.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_STATE.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_DISCOVERY.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_ARCHITECTURE_ASSESSMENT.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_RISK_ASSESSMENT.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_EVIDENCE.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_UNCERTAINTIES.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_CONTRADICTIONS.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_RECOMMENDATIONS.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_AUDIT_TRAIL.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_REQUIREMENTS.json',
      'docs/intelligence/real_projects/andes-retreat/REAL_PROJECT_PROPOSAL.json',
      'docs/intelligence/real_projects/andes-retreat/SPECIFICATION.json',
      'docs/intelligence/real_projects/andes-retreat/ARCHITECTURE.json',
      'docs/intelligence/real_projects/andes-retreat/DESIGN.json',
      'docs/intelligence/real_projects/andes-retreat/TASK_DAG.json',
      'docs/intelligence/real_projects/andes-retreat/VERIFICATION_PLAN.json',
      'docs/audits/EOS_FORENSIC_FINDINGS.json',
      'docs/audits/EOS_FORENSIC_INVARIANTS.json',
      'docs/audits/EOS_FORENSIC_CONTRADICTIONS.json',
      'docs/audits/EOS_FORENSIC_REDUNDANCY.json',
      'docs/audits/EOS_FORENSIC_COMPLEXITY.json',
      'docs/audits/EOS_FORENSIC_EVIDENCE.json',
      'docs/audits/EOS_FORENSIC_READINESS.json',
      'docs/governance/CLAIM_VALIDATION_MODEL.json',
      'docs/governance/EVIDENCE_INDEPENDENCE_MODEL.json',
      'docs/governance/FALSIFICATION_CONTRACT.json',
      'docs/governance/CONTRADICTION_MODEL.json',
      'docs/governance/VALIDATION_STATE_MACHINE.json',
      'docs/governance/COMPLEXITY_BUDGET.json',
      'tests/fixtures/falsification-projects/synthetic-falsification-valid/package.json',
      'tests/fixtures/falsification-projects/synthetic-falsification-contradictory/package.json',
      'docs/audits/EOS_SYSTEM_AUDIT_FINDINGS.json',
      'docs/audits/EOS_SYSTEM_INVARIANTS.json',
      'docs/audits/EOS_SYSTEM_CONTRADICTIONS.json',
      'docs/audits/EOS_SYSTEM_GOVERNANCE_MATRIX.json',
      'docs/audits/EOS_SYSTEM_STATE_MACHINE_AUDIT.json',
      'docs/audits/EOS_SYSTEM_EVIDENCE_AUDIT.json',
      'docs/audits/EOS_SYSTEM_SECURITY_AUDIT.json',
      'docs/audits/EOS_SYSTEM_COMPLEXITY_AUDIT.json',
      'docs/audits/EOS_SYSTEM_READINESS_ASSESSMENT.json',
      'docs/audits/EOS_SYSTEM_AUDIT_EVIDENCE.json',
      'docs/intelligence/research/RSC-0012-production-readiness-release-governance.json',
      'docs/intelligence/research/RSC-0013-adversarial-engineering-chaos-resilience.json',
      'docs/governance/ADVERSARIAL_ATTACK_TAXONOMY.json',
      'docs/governance/BLAST_RADIUS_MODEL.json',
      'docs/governance/RESILIENCE_MODEL.json',
      'docs/orchestration/GAME_DAY_STATE_MACHINE.json',
      'tests/fixtures/adversarial-projects/synthetic-adversarial-tool/package.json',
      'tests/fixtures/adversarial-projects/synthetic-adversarial-provider/package.json',
      'tests/fixtures/adversarial-projects/synthetic-adversarial-agent/package.json',
      'tests/fixtures/adversarial-projects/synthetic-adversarial-evidence/package.json',
      'tests/fixtures/adversarial-projects/synthetic-adversarial-governance/package.json',
      'docs/governance/PRODUCTION_READINESS_MODEL.json',
      'docs/governance/RELEASE_CONTRACT.json',
      'docs/governance/CI_CD_CONTRACT.json',
      'docs/orchestration/RELEASE_GATE_STATE_MACHINE.json',
      'tests/fixtures/production-projects/synthetic-production-website/package.json',
      'tests/fixtures/production-projects/synthetic-production-api/package.json',
      'tests/fixtures/production-projects/synthetic-production-ecommerce/package.json',
      'tests/fixtures/production-projects/synthetic-production-ai-agent/package.json',
      'tests/fixtures/production-projects/synthetic-production-migration/package.json',
      'docs/intelligence/research/RSC-0009-autonomous-engineering-mission-proving.json',
      'docs/intelligence/research/RSC-0010-autonomous-self-evaluation-evolution.json',
      'docs/intelligence/research/RSC-0011-autonomous-engineering-operating-loop.json',
      'docs/orchestration/EVOLUTION_STATE_MACHINE.json',
      'docs/orchestration/OPERATING_LOOP_STATE_MACHINE.json',
      'docs/orchestration/OPERATING_LOOP_CONTRACT.json',
      'docs/evolution/schema.json',
      'docs/evolution/REGISTRY.json',
      'docs/orchestration/STRATEGY_ENGINE.json',
      'docs/orchestration/STRATEGY_SELECTION_POLICY.json',
      'docs/decisions/STRATEGY_DECISIONS/schema.json',
      'docs/intelligence/AGENT_PERFORMANCE_MEMORY.json',
      'docs/intelligence/TOOL_PERFORMANCE_MEMORY.json',
      'docs/intelligence/research/RSC-0008-engineering-factory-strategy-optimization.json',
      'tests/fixtures/mission-projects/synthetic-mobile/package.json',
      'tests/fixtures/mission-projects/synthetic-ai-agent/package.json',
      'tests/fixtures/mission-projects/synthetic-migration/package.json',
      'tests/fixtures/mission-projects/synthetic-security-remediation/package.json',
      'docs/agents/AGENT_COUNCIL.json',
      'docs/orchestration/ENGINEERING_LIFECYCLE.json',
      'docs/missions/schema.json',
      'docs/missions/REGISTRY.json',
      'tests/fixtures/mission-projects/synthetic-website/package.json',
      'tests/fixtures/mission-projects/synthetic-api/package.json',
      'tests/fixtures/mission-projects/synthetic-ecommerce/package.json',
      'tests/fixtures/mission-projects/synthetic-data/package.json',
      'docs/projects/TEMPLATE.json',
      'docs/projects/schema.json',
      'docs/projects/registry.json',
      'docs/projects/registrations/fundacion.json',
      'docs/intake/fundacion/inventory.json'
    ];
    for (const jsonRel of jsonFiles) {
      const jsonPath = path.join(rootDir, jsonRel);
      if (fs.existsSync(jsonPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          report.checks.push({ path: jsonRel, status: 'VERIFIED', type: 'json-validity' });
          
          if (jsonRel === 'docs/projects/registry.json') {
            if (!Array.isArray(content.projects) || content.projects.length === 0) {
              report.failures.push({ path: jsonRel, message: 'Registry must contain a non-empty projects array', type: 'schema-validation' });
            }
          }
        } catch (err) {
          report.failures.push({ path: jsonRel, message: `Invalid JSON: ${err.message}`, type: 'json-validity' });
        }
      }
    }

    // 3b. Taxonomy Consistency Check
    const constitutionPath = path.join(rootDir, 'docs/core/CONSTITUTION.md');
    const agentsPath = path.join(rootDir, '.agents/AGENTS.md');

    if (fs.existsSync(constitutionPath) && fs.existsSync(agentsPath)) {
      const constitutionContent = fs.readFileSync(constitutionPath, 'utf-8');
      const agentsContent = fs.readFileSync(agentsPath, 'utf-8');

      for (const status of REQUIRED_EVIDENCE_STATUSES) {
        if (!constitutionContent.includes(status)) {
          report.failures.push({ path: 'docs/core/CONSTITUTION.md', message: `Missing taxonomy status: ${status}`, type: 'taxonomy' });
        }
        if (!agentsContent.includes(status)) {
          report.failures.push({ path: '.agents/AGENTS.md', message: `Missing taxonomy status: ${status}`, type: 'taxonomy' });
        }
      }
    }

    // 3c. Skill Frontmatter Validation
    const skillsDir = path.join(rootDir, '.agents/skills');
    if (fs.existsSync(skillsDir)) {
      const skills = fs.readdirSync(skillsDir);
      for (const skillName of skills) {
        const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, 'utf-8');
          if (!content.startsWith('---') || !content.includes('name:') || !content.includes('description:')) {
            report.failures.push({ path: `.agents/skills/${skillName}/SKILL.md`, message: 'Invalid YAML frontmatter', type: 'frontmatter' });
          } else {
            report.checks.push({ path: `.agents/skills/${skillName}/SKILL.md`, status: 'VERIFIED', type: 'frontmatter' });
          }
        }
      }
    }

    // 3d. L0 purity — no root npm dependencies
    const pkgPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.dependencies || pkg.devDependencies) {
        report.failures.push({
          path: 'package.json',
          message: 'L0 NODE_BUILTINS_ONLY violated: root dependencies/devDependencies present',
          type: 'l0-purity'
        });
      } else {
        report.checks.push({ path: 'package.json', status: 'VERIFIED', type: 'l0-purity' });
      }
    }

    // 3e. ADR-0010 enforcement surfaces (organic gate, TDD receipts, RDD stance)
    const accidental = evaluateSddCeremonySpawn({
      spawnSddCeremony: true,
      byteSize: 999999,
      loc: 5000,
      fileCount: 80
    });
    if (accidental.allowed !== false || accidental.code !== 'ACCIDENTAL_SDD_SPAWN') {
      report.failures.push({
        path: 'src/core/sdd/organic-routing-gate.js',
        message: 'Size-only SDD spawn must fail-closed (ADR-0010)',
        type: 'organic-gate'
      });
    } else {
      report.checks.push({ path: 'src/core/sdd/organic-routing-gate.js', status: 'VERIFIED', type: 'organic-gate' });
    }

    const missingTdd = evaluateApplyClaim({ claimComplete: true, strictTdd: true, testsExist: true, receipts: [] });
    if (missingTdd.allowed !== false || missingTdd.can_claim_verified !== false) {
      report.failures.push({
        path: 'src/core/sdd/tdd-evidence-receipt.js',
        message: 'Missing TDD receipts must deny apply-complete and VERIFIED claims',
        type: 'tdd-receipts'
      });
    } else {
      report.checks.push({ path: 'src/core/sdd/tdd-evidence-receipt.js', status: 'VERIFIED', type: 'tdd-receipts' });
    }

    const tddDir = path.join(rootDir, 'docs/evidence/tdd');
    if (fs.existsSync(tddDir)) {
      const files = fs.readdirSync(tddDir).filter((n) => n.endsWith('.json'));
      const receipts = [];
      for (const name of files) {
        try {
          const parsed = JSON.parse(fs.readFileSync(path.join(tddDir, name), 'utf8'));
          if (Array.isArray(parsed)) receipts.push(...parsed);
          else receipts.push(parsed);
        } catch (err) {
          report.failures.push({ path: `docs/evidence/tdd/${name}`, message: `Invalid TDD receipt JSON: ${err.message}`, type: 'tdd-receipts' });
        }
      }
      if (receipts.length > 0) {
        const audit = auditTddReceipts({ receipts, strictTdd: true, testsExist: true });
        if (!audit.pass) {
          report.failures.push({
            path: 'docs/evidence/tdd',
            message: `TDD receipt audit failed: ${audit.code}`,
            type: 'tdd-receipts'
          });
        } else {
          report.checks.push({ path: 'docs/evidence/tdd', status: 'VERIFIED', type: 'tdd-receipts' });
        }
      }
    }

    try {
      assertRddDoesNotGrantDelivery({ authorizes_delivery: true });
      report.failures.push({
        path: 'src/core/governance/rdd-review-stance.js',
        message: 'RDD must deny delivery grants',
        type: 'rdd-stance'
      });
    } catch (err) {
      if (err.code === 'RDD_DELIVERY_DENIED') {
        report.checks.push({ path: 'src/core/governance/rdd-review-stance.js', status: 'VERIFIED', type: 'rdd-stance' });
      } else {
        report.failures.push({ path: 'src/core/governance/rdd-review-stance.js', message: err.message, type: 'rdd-stance' });
      }
    }

    // 3f. Architectural Fitness Functions (AST Dependency Inversion & Cycle Guardrails)
    try {
      const archEngine = new ArchitecturalFitnessEngine({ baseDir: rootDir });
      const archReport = archEngine.auditArchitecture(path.join(rootDir, 'src'));
      if (!archReport.compliant) {
        for (const violation of archReport.violations) {
          report.failures.push({
            path: violation.from,
            message: `${violation.reason} (target: ${violation.to})`,
            type: 'architectural-fitness'
          });
        }
        for (const cycle of archReport.cycles) {
          report.failures.push({
            path: cycle[0],
            message: `Circular dependency detected: ${cycle.join(' -> ')}`,
            type: 'architectural-cycle'
          });
        }
      } else {
        report.checks.push({
          path: `src (Architectural Fitness: 0 violations, 0 cycles across ${archReport.total_files} files)`,
          status: 'VERIFIED',
          type: 'architectural-fitness'
        });
      }
    } catch (err) {
      report.failures.push({
        path: 'src',
        message: `Architectural fitness audit failed: ${err.message}`,
        type: 'architectural-fitness'
      });
    }

    // 3g. Contract-Based Evidence Sealing Engine (EARS Contract & Epistemic Verification)
    try {
      const sealer = new ContractEvidenceSealer({ controlPlaneRoot: rootDir });
      const spec = sealer.findSpec('EOS-TRACEABILITY-AND-BLAST-RADIUS-SPEC');
      if (!spec) {
        report.failures.push({
          path: 'docs/specs/EOS-TRACEABILITY-AND-BLAST-RADIUS-SPEC.md',
          message: 'Formal baseline specification not found by ContractEvidenceSealer',
          type: 'contract-sealer'
        });
      } else {
        const earsCheck = sealer.validateEarsContract(spec.content);
        if (!earsCheck.valid) {
          report.failures.push({
            path: spec.relativePath,
            message: 'Baseline specification fails formal EARS syntax contract',
            type: 'contract-sealer'
          });
        } else {
          // Dry-run seal to verify epistemic compliance and hash computation without disk side-effects
          const drySeal = sealer.sealContractEvidence({
            specId: 'EOS-TRACEABILITY-AND-BLAST-RADIUS-SPEC',
            taskId: 'TASK-VERIFY-INVARIANT-3G',
            projectId: 'PRJ-EOS-CONTROL-PLANE',
            command: 'node scripts/verify-eos.js --strict',
            exitCode: 0,
            stdout: 'Verification in progress',
            dryRun: true
          });
          if (drySeal.success && drySeal.record.status === 'VERIFIED') {
            report.checks.push({
              path: `ContractEvidenceSealer (EARS Contract Validated & Epistemic Law III Enforced: ${drySeal.seal_hash.slice(0, 20)}...)`,
              status: 'VERIFIED',
              type: 'contract-sealer'
            });
          } else {
            report.failures.push({
              path: 'ContractEvidenceSealer',
              message: 'Dry run contract sealing did not yield VERIFIED status',
              type: 'contract-sealer'
            });
          }
        }
      }
    } catch (err) {
      report.failures.push({
        path: 'ContractEvidenceSealer',
        message: `Contract evidence sealer audit failed: ${err.message}`,
        type: 'contract-sealer'
      });
    }

    // 3g2. ROI4 I3 Evidence Custody (canonical HashChainedLedger facade; fail-closed)
    try {
      const custody = new EvidenceCustody({ controlPlaneRoot: rootDir });
      const audit = custody.audit();
      if (!audit.valid) {
        report.failures.push({
          path: 'src/core/sdd/evidence-custody.js',
          message: `Custody chain DENY: ${audit.error || audit.verdict}`,
          type: 'evidence-custody'
        });
      } else {
        report.checks.push({
          path: `EvidenceCustody (${audit.verdict}, count=${audit.count || 0})`,
          status: 'VERIFIED',
          type: 'evidence-custody'
        });
      }
    } catch (err) {
      report.failures.push({
        path: 'src/core/sdd/evidence-custody.js',
        message: `Evidence custody audit failed: ${err.message}`,
        type: 'evidence-custody'
      });
    }



    // 3g2b. G7 canonical EVD seal path (fail-closed static audit)
    try {
      const evdAudit = auditCanonicalEvdWritePaths(rootDir);
      if (!evdAudit.ok) {
        report.failures.push({
          path: 'src/core/sdd/evd-seal-path.js',
          message: 'G7 EVD bypass writers detected: ' + JSON.stringify(evdAudit.violations),
          type: 'evd-seal-path'
        });
      } else {
        report.checks.push({
          path: 'EvdSealPath (sanctioned=' + (evdAudit.sanctioned || []).join(',') + ')',
          status: 'VERIFIED',
          type: 'evd-seal-path'
        });
      }
    } catch (err) {
      report.failures.push({
        path: 'src/core/sdd/evd-seal-path.js',
        message: 'G7 EVD seal path audit failed: ' + err.message,
        type: 'evd-seal-path'
      });
    }

    // 3g2c. P4 mission-local EVD seal path (fail-closed static audit)
    try {
      const missionEvdAudit = auditMissionLocalEvdWritePaths(rootDir);
      if (!missionEvdAudit.ok) {
        report.failures.push({
          path: 'src/core/sdd/evd-seal-path.js',
          message: 'P4 mission-local EVD bypass writers detected: ' + JSON.stringify(missionEvdAudit.violations),
          type: 'evd-seal-path-mission-local'
        });
      } else {
        report.checks.push({
          path: 'EvdSealPathMissionLocal (sanctioned=' + (missionEvdAudit.sanctioned || []).join(',') + ')',
          status: 'VERIFIED',
          type: 'evd-seal-path-mission-local'
        });
      }
    } catch (err) {
      report.failures.push({
        path: 'src/core/sdd/evd-seal-path.js',
        message: 'P4 mission-local EVD seal path audit failed: ' + err.message,
        type: 'evd-seal-path-mission-local'
      });
    }

    // 3g3. ROI6 Engram SSOT path + envelope contract (no live engram CLI required)
    try {
      const engram = verifyEngramContract(rootDir);
      if (!engram.ok) {
        report.failures.push({
          path: 'src/core/memory/engram-contract.js',
          message: 'Engram contract verify returned not ok',
          type: 'engram-contract'
        });
      } else {
        report.checks.push({
          path: 'EngramContract (' + engram.schema + ', ' + engram.relative + ')',
          status: 'VERIFIED',
          type: 'engram-contract'
        });
      }
    } catch (err) {
      report.failures.push({
        path: 'src/core/memory/engram-contract.js',
        message: 'Engram contract audit failed: ' + err.message,
        type: 'engram-contract'
      });
    }

    // 3g2d. Q5 mission-artifact write governance (selected writers via Write Barrier envelope)
    try {
      const missionArtifactAudit = auditMissionArtifactWritePaths(rootDir);
      if (!missionArtifactAudit.ok) {
        report.failures.push({
          path: 'src/core/runtime/mission-artifact-write.js',
          message: 'Q5 mission-artifact write bypass detected: ' + JSON.stringify(missionArtifactAudit.violations),
          type: 'mission-artifact-write'
        });
      } else {
        report.checks.push({
          path: 'MissionArtifactWrite (routed=' + (missionArtifactAudit.routedOk || []).join(',') + ')',
          status: 'VERIFIED',
          type: 'mission-artifact-write'
        });
      }
    } catch (err) {
      report.failures.push({
        path: 'src/core/runtime/mission-artifact-write.js',
        message: 'Q5 mission-artifact write governance audit failed: ' + err.message,
        type: 'mission-artifact-write'
      });
    }

    // 3g4. M1 Fusion control-plane lock (Write Barrier / Mission Loop / MCP SSOT / GameDay / ADR-0013/0014)
    try {
      const fusion = auditFusionControlPlane(rootDir);
      for (const c of fusion.checks) {
        report.checks.push(c);
      }
      for (const f of fusion.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/fusion-cp-lock.js',
        message: 'Fusion CP lock audit failed: ' + err.message,
        type: 'fusion-cp-lock'
      });
    }

    // 3g5. N6 Sentinel/FDIR strict-verify lock (construct/API smoke; no soak)
    try {
      const sentinelFdir = auditSentinelFdir(rootDir);
      for (const c of sentinelFdir.checks) {
        report.checks.push(c);
      }
      for (const f of sentinelFdir.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/sentinel-fdir-lock.js',
        message: 'Sentinel/FDIR lock audit failed: ' + err.message,
        type: 'sentinel-fdir-lock'
      });
    }

    // 3g6. P3 hooks-install CI/verify smoke (temp .git/hooks; never mutates checkout .git)
    try {
      const hooksInstall = auditHooksInstallSurface(rootDir);
      for (const c of hooksInstall.checks) {
        report.checks.push(c);
      }
      for (const f of hooksInstall.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/hooks-install-smoke.js',
        message: 'Hooks-install smoke audit failed: ' + err.message,
        type: 'hooks-install-lock'
      });
    }

    // 3g7. P5 MCP catalog reconcile lock (catalog total/names == CANONICAL_TOOLS)
    try {
      const mcpCatalog = auditMcpCatalogLock(rootDir);
      for (const c of mcpCatalog.checks) {
        report.checks.push(c);
      }
      for (const f of mcpCatalog.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/mcp-catalog-lock.js',
        message: 'MCP catalog lock audit failed: ' + err.message,
        type: 'mcp-catalog-lock'
      });
    }


    // 3g8. Q6 P6 inventory verify lock (doc + required sections; inventory != executed prune)
    try {
      const p6Inventory = auditP6InventoryLock(rootDir);
      for (const c of p6Inventory.checks) {
        report.checks.push(c);
      }
      for (const f of p6Inventory.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/p6-inventory-lock.js',
        message: 'P6 inventory lock audit failed: ' + err.message,
        type: 'p6-inventory-lock'
      });
    }

    // 3g9b. R5 deferred writers governance lock (Choice B NON-CLAIM inventory)
    try {
      const deferredWriters = auditDeferredWritersLock(rootDir);
      for (const c of deferredWriters.checks) {
        report.checks.push(c);
      }
      for (const f of deferredWriters.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/deferred-writers-lock.js',
        message: 'Deferred writers lock audit failed: ' + err.message,
        type: 'deferred-writers-lock'
      });
    }

    // 3g9. R4 AT_CEILING schema pressure / complexity-budget honesty lock
    try {
      const complexityBudget = auditComplexityBudgetLock(rootDir);
      for (const c of complexityBudget.checks) {
        report.checks.push(c);
      }
      for (const f of complexityBudget.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/complexity-budget-lock.js',
        message: 'Complexity budget lock audit failed: ' + err.message,
        type: 'complexity-budget-lock'
      });
    }

    // 3g10. S2 Context Pack TPC index verify lock (existence + section needles; index != runtime)
    try {
      const contextPack = auditContextPackLock(rootDir);
      for (const c of contextPack.checks) {
        report.checks.push(c);
      }
      for (const f of contextPack.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/context-pack-lock.js',
        message: 'Context Pack TPC lock audit failed: ' + err.message,
        type: 'context-pack-lock'
      });
    }

        // 3g11. S3 Loop Engineering 4Q matrix verify lock (existence + section needles; policy != autonomy)
    try {
      const loopEng = auditLoopEngineeringLock(rootDir);
      for (const c of loopEng.checks) {
        report.checks.push(c);
      }
      for (const f of loopEng.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/loop-engineering-lock.js',
        message: 'Loop Engineering 4Q lock audit failed: ' + err.message,
        type: 'loop-engineering-lock'
      });
    }

    // 3g12. S4 Worktree isolation policy verify lock (existence + section needles; policy != swarm)
    try {
      const wtPolicy = auditWorktreePolicyLock(rootDir);
      for (const c of wtPolicy.checks) {
        report.checks.push(c);
      }
      for (const f of wtPolicy.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/worktree-policy-lock.js',
        message: 'Worktree isolation policy lock audit failed: ' + err.message,
        type: 'worktree-policy-lock'
      });
    }


    // 3g13. SpecBoot cycle + Antigravity-first verify lock (existence + section needles; CloudAgent demoted)
    try {
      const specboot = auditSpecbootCycleLock(rootDir);
      for (const c of specboot.checks) {
        report.checks.push(c);
      }
      for (const f of specboot.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/specboot-cycle-lock.js',
        message: 'SpecBoot cycle / Antigravity-first lock audit failed: ' + err.message,
        type: 'specboot-cycle-lock'
      });
    }


    // 3g14. S5 MCP/tool KEEP inventory verify lock (doc + required sections; inventory != executed prune)
    try {
      const mcpToolKeep = auditMcpToolKeepLock(rootDir);
      for (const c of mcpToolKeep.checks) {
        report.checks.push(c);
      }
      for (const f of mcpToolKeep.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/mcp-tool-keep-lock.js',
        message: 'MCP/tool KEEP inventory lock audit failed: ' + err.message,
        type: 'mcp-tool-keep-lock'
      });
    }

    // 3g15. S6 model routing + ratchet ritual verify lock (docs + NON-CLAIM no auto switch / ritual!=self-heal)
    try {
      const modelRoutingRatchet = auditModelRoutingRatchetLock(rootDir);
      for (const c of modelRoutingRatchet.checks) {
        report.checks.push(c);
      }
      for (const f of modelRoutingRatchet.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/model-routing-ratchet-lock.js',
        message: 'Model routing + ratchet ritual lock audit failed: ' + err.message,
        type: 'model-routing-ratchet-lock'
      });
    }

    // 3g16. T5 KEEP PO-named prune HOLD / gate (HOLD or PO_NAMED; catalog reconcile; inventory!=silent delete)
    try {
      const keepPoPruneHold = auditKeepPoPruneHoldLock(rootDir);
      for (const c of keepPoPruneHold.checks) {
        report.checks.push(c);
      }
      for (const f of keepPoPruneHold.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/keep-po-prune-hold-lock.js',
        message: 'KEEP PO prune HOLD lock audit failed: ' + err.message,
        type: 'keep-po-prune-hold-lock'
      });
    }

    // 3g17. T6 Complexity ceiling HOLD / standing order (HOLD or PO_NAMED; R4 budget green; no vibe schemas)
    try {
      const complexityCeilingHold = auditComplexityCeilingHoldLock(rootDir);
      for (const c of complexityCeilingHold.checks) {
        report.checks.push(c);
      }
      for (const f of complexityCeilingHold.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/complexity-ceiling-hold-lock.js',
        message: 'Complexity ceiling HOLD lock audit failed: ' + err.message,
        type: 'complexity-ceiling-hold-lock'
      });
    }


    // 3g18. T7 AGY workstation evidence / smoke (honest DAEMON_ABSENT|PRESENT; no Admin; no pretend)
    try {
      const agyWorkstation = auditAgyWorkstationLock(rootDir, { skipLiveProbe: true });
      for (const c of agyWorkstation.checks) {
        report.checks.push(c);
      }
      for (const f of agyWorkstation.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/agy-workstation-lock.js',
        message: 'AGY workstation evidence lock audit failed: ' + err.message,
        type: 'agy-workstation-lock'
      });
    }

    // 3g19. T8 Dirty DEFER triage + L8 closeout (catalog/IGNORE; no mass delete; tip pin)
    try {
      const dirtyDefer = auditDirtyDeferTriageLock(rootDir);
      for (const c of dirtyDefer.checks) {
        report.checks.push(c);
      }
      for (const f of dirtyDefer.failures) {
        report.failures.push(f);
      }
    } catch (err) {
      report.failures.push({
        path: 'scripts/lib/dirty-defer-triage-lock.js',
        message: 'Dirty DEFER triage lock audit failed: ' + err.message,
        type: 'dirty-defer-triage-lock'
      });
    }

// 3h. Economic & Operational Risk Contract Engine (ECR Invariants & Circuit Breaker)
    try {
      const econValidator = new EconomicContractValidator();
      const evalSample = econValidator.evaluateTelemetry(
        { max_tokens: 50000, max_cost_usd: 0.50, max_latency_ms: 1000 },
        { tokens_consumed: 15000, cost_usd: 0.05, latency_ms: 120 }
      );
      if (evalSample.compliant && evalSample.verdict === 'ECONOMIC_CONTRACT_SATISFIED') {
        report.checks.push({
          path: `EconomicContractValidator (ECR Circuit Breaker Armed & Active: score ${evalSample.efficiency_score}/100)`,
          status: 'VERIFIED',
          type: 'economic-contract'
        });
      } else {
        report.failures.push({
          path: 'EconomicContractValidator',
          message: 'Economic contract validator baseline evaluation failed',
          type: 'economic-contract'
        });
      }
    } catch (err) {
      report.failures.push({
        path: 'EconomicContractValidator',
        message: `Economic contract validator check failed: ${err.message}`,
        type: 'economic-contract'
      });
    }
  }

  // Set overall status
  if (report.failures.length > 0) {
    report.status = 'FAIL';
  }

  // Output formatting
  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('====================================================');
    console.log(`   EOS SYSTEM — WORKSPACE VERIFICATION & AUDIT      `);
    console.log(`   Mode: ${isStrict ? 'STRICT' : 'STANDARD'}                      `);
    console.log('====================================================\n');

    for (const check of report.checks) {
      console.log(`[VERIFIED]  ${check.path} (${check.type})`);
    }

    if (report.failures.length > 0) {
      console.log('\n---------------- FAILURES --------------------------');
      for (const failure of report.failures) {
        console.log(`[FAILED]    ${failure.path}: ${failure.message}`);
      }
    }

    console.log('\n----------------------------------------------------');
    console.log(`Checks Passed: ${report.checks.length} | Failures: ${report.failures.length}`);
    console.log('----------------------------------------------------');
    console.log(`STATUS: ${report.status === 'PASS' ? 'VERIFIED — All checks passed cleanly.' : 'UNVERIFIED — Failures detected.'}\n`);
  }

  process.exit(report.status === 'PASS' ? 0 : 1);
}

verifyWorkspace();
