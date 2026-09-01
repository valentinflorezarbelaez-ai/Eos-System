import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'docs/audits/EOS_FOUNDATIONAL_CONTEXT_AUDIT.md'
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

  const hasLevel3Auth = fs.existsSync(authRecordL3Path) && 
                        /AUTHORIZED/i.test(fs.readFileSync(authRecordL3Path, 'utf8')) &&
                        fs.existsSync(dagL3Path);
  const hasLevel2Auth = fs.existsSync(authRecordL2Path) && 
                        fs.readFileSync(authRecordL2Path, 'utf8').includes('AUTHORIZED — LEVEL 2');

  if (fs.existsSync(externalFundacionPath)) {
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
