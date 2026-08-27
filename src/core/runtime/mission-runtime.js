/**
 * @module MissionRuntime
 * @description Local orchestration runtime managing the lifecycle, storage layout,
 * ledger chaining, task contracts, and verification of EOS missions under .missions/<mission-id>/
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { UniversalTechnicalDiscoveryEngine } from '../discovery/universal-technical-discovery-engine.js';
import { GovernedTechnicalSelectionEngine } from '../discovery/governed-technical-selection-engine.js';
import { CursorMissionPackageGenerator } from '../adapters/cursor-mission-package.js';
import {
  CursorReturnIngestionEngine,
  CONSTITUTIONAL_PROTECTED_SURFACES
} from '../adapters/cursor-return-ingestion-engine.js';
import { RoleSkillRegistryEngine } from '../roles/role-skill-registry-engine.js';
import { MultiAgentSupervisionEngine } from '../supervision/multi-agent-supervision-engine.js';
import { HashChainedLedger, calculateSha256 } from '../sdd/epistemic-evidence-engine.js';
import { ExecutiveMissionReporter } from '../observability/executive-mission-reporter.js';
import { AuthorityTruthSource } from '../authority/authority-truth-source.js';
import { HitlGatekeeper } from '../sdd/hitl-gatekeeper.js';
import { IntegrationGatekeeper } from '../governance/integration-gatekeeper.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { CanonicalRulesIndex } from '../rules/canonical-rules-index.js';
import { updateManifestFile } from '../contracts/integrity-manifest.js';
import { SDD_STATES } from '../sdd/sdd-fsm-engine.js';

export class MissionRuntime {
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.missionsRoot = path.join(this.baseDir, '.missions');
    this.discoveryEngine = new UniversalTechnicalDiscoveryEngine();
    this.selectionEngine = new GovernedTechnicalSelectionEngine();
    this.packageGenerator = new CursorMissionPackageGenerator({ baseDir: this.baseDir });
    this.ingestionEngine = new CursorReturnIngestionEngine();
    this.roleRegistry = new RoleSkillRegistryEngine();
    this.supervisionEngine = new MultiAgentSupervisionEngine();
    this.reporter = new ExecutiveMissionReporter({ baseDir: this.baseDir });
    this.ats = options.ats || new AuthorityTruthSource({ missionsRoot: this.missionsRoot });
    this.hitl = options.hitl || new HitlGatekeeper();
    this.integrationGate = options.integrationGate || new IntegrationGatekeeper();
    this.schemas = options.schemas || new SchemaValidator();
    this.rules = options.rules || new CanonicalRulesIndex();
    this.allowLocalDirectorReceipt = options.allowLocalDirectorReceipt !== false;

    if (!fs.existsSync(this.missionsRoot)) {
      fs.mkdirSync(this.missionsRoot, { recursive: true });
    }
  }

  getMissionDir(missionId) {
    return path.join(this.missionsRoot, missionId);
  }

  _updateManifestFile(missionDir, relPath, contentStr) {
    updateManifestFile(missionDir, relPath, contentStr);
  }

  /**
   * Creates and initializes a new mission
   * @param {Object} params { goal, projectPath, authorityLevel, budgetCapUsd }
   * @returns {Object} Mission creation record
   */
  createMission(params = {}) {
    if (!params.goal || typeof params.goal !== 'string') {
      throw new Error('INVALID_PARAM_GOAL: A clear mission goal string is required.');
    }

    const projectPath = params.projectPath ? path.resolve(this.baseDir, params.projectPath) : this.baseDir;
    if (!fs.existsSync(projectPath)) {
      throw new Error(`PROJECT_PATH_NOT_FOUND: The target path '${params.projectPath}' does not exist.`);
    }

    const missionId = `MIS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const missionDir = this.getMissionDir(missionId);

    // 1. Create directory structure
    const subdirs = ['tasks', 'evidence', 'reports', 'cursor', 'ledger', 'selections'];
    for (const sub of subdirs) {
      fs.mkdirSync(path.join(missionDir, sub), { recursive: true });
    }

    // 2. Discover project profile
    const profile = this.discoveryEngine.discoverProject(projectPath);
    const profileStr = JSON.stringify(profile, null, 2);
    fs.writeFileSync(path.join(missionDir, 'project-profile.json'), profileStr, 'utf8');

    // 3. Direction record
    const direction = {
      mission_id: missionId,
      goal: params.goal,
      business_context: params.businessContext || 'Autonomous Engineering Mission under EOS Governance',
      target_project: profile.project_id,
      project_path: projectPath,
      created_at: new Date().toISOString(),
      authority_level: params.authorityLevel || 'LEVEL_0',
      budget_cap_usd: params.budgetCapUsd || 0.10
    };
    const directionStr = JSON.stringify(direction, null, 2);
    fs.writeFileSync(path.join(missionDir, 'direction.json'), directionStr, 'utf8');

    // 4. Initial ledger and event
    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_INITIALIZED', {
      goal: params.goal,
      project_id: profile.project_id,
      authority_level: direction.authority_level
    });

    // 5. Initial mission-package.json
    const initialPkg = {
      schema_version: '1.0.0',
      mission_id: missionId,
      contract_id: `CON-${missionId.replace('MIS-', '')}`,
      status: 'active',
      phase: null, // written exclusively by AuthorityTruthSource.initMission
      direction: {
        raw_prompt: params.goal,
        interpreted_goal: params.goal,
        business_context: direction.business_context,
        success_criteria: ['Deterministic test execution', 'Cryptographic evidence'],
        constraints: ['Strict read-only default']
      },
      authority: {
        level: direction.authority_level,
        delegated_to: 'DIRECTOR_SUPERVISED',
        valid_until: new Date(Date.now() + 86400000).toISOString(),
        restrictions: ['External network egress blocked']
      },
      budgets: {
        max_tokens: 50000,
        max_cost_usd: direction.budget_cap_usd,
        max_duration_seconds: 3600,
        max_retries_per_task: 2
      },
      scope: {
        project_id: profile.project_id,
        root_path: projectPath,
        included_paths: ['src/**', 'tests/**'],
        excluded_paths: ['docs/governance/**'],
        protected_surfaces: ['docs/governance/**']
      },
      artifacts: { required: ['evidence_receipts'], produced: [] },
      orchestration: { assigned_roles: [], tasks: [] },
      evidence_policy: { required_categories: ['UNIT_TEST'], hash_algorithm: 'SHA-256', chain_to_ledger: true }
    };
    const pkgStr = JSON.stringify(initialPkg, null, 2);
    this.schemas.assertValid(initialPkg, 'mission-package.local.schema.json', 'mission-package');
    this.schemas.assertValid(direction, 'direction.local.schema.json', 'direction');
    fs.writeFileSync(path.join(missionDir, 'mission-package.json'), pkgStr, 'utf8');

    // Constitutional init: AuthorityTruthSource is the sole writer of persisted phase
    this.ats.initMission({
      missionId,
      authorityLevel: direction.authority_level,
      budgetLimits: {
        max_input_tokens: initialPkg.budgets.max_tokens,
        max_output_tokens: 10000,
        max_duration_seconds: initialPkg.budgets.max_duration_seconds
      }
    });
    // Re-read package after ATS sync (phase/status authoritative)
    const pkgAfterAts = fs.readFileSync(path.join(missionDir, 'mission-package.json'), 'utf8');

    // 6. Initial integrity manifest
    const manifest = {
      mission_id: missionId,
      created_at: new Date().toISOString(),
      files: {
        'direction.json': calculateSha256(directionStr),
        'project-profile.json': calculateSha256(profileStr),
        'mission-package.json': calculateSha256(pkgAfterAts)
      }
    };
    fs.writeFileSync(path.join(missionDir, 'integrity-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    return {
      mission_id: missionId,
      status: 'active',
      mission_dir: missionDir,
      project_id: profile.project_id
    };
  }

  /**
   * Inspects a mission's state and metadata
   * @param {string} missionId
   */
  inspectMission(missionId) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);
    }

    const direction = JSON.parse(fs.readFileSync(path.join(missionDir, 'direction.json'), 'utf8'));
    const profile = JSON.parse(fs.readFileSync(path.join(missionDir, 'project-profile.json'), 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(path.join(missionDir, 'mission-package.json'), 'utf8'));

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    const events = ledger.getEvents(missionId);

    return {
      mission_id: missionId,
      status: pkg.status,
      phase: pkg.phase,
      direction,
      profile,
      events_count: events.length,
      latest_event: events.length > 0 ? events[events.length - 1] : null
    };
  }

  /**
   * Plans the mission via the gated FSM lifecycle (VISION → … → PLAN).
   * Does NOT use deprecated runtime.plan_mission bridge.
   * @param {string} missionId
   * @param {object} [options]
   * @param {object} [options.hitlReceipt] explicit HITL receipt for HUMAN_DIRECTION_GATE
   * @param {boolean} [options.requireExternalHitl] deny auto local fixture receipt
   */
  planMission(missionId, options = {}) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);
    }

    const direction = JSON.parse(fs.readFileSync(path.join(missionDir, 'direction.json'), 'utf8'));
    const profile = JSON.parse(fs.readFileSync(path.join(missionDir, 'project-profile.json'), 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(path.join(missionDir, 'mission-package.json'), 'utf8'));

    this.schemas.assertValid(direction, 'direction.local.schema.json', 'direction');
    this.schemas.assertValid(pkg, 'mission-package.local.schema.json', 'mission-package');

    // Generate atomic tasks
    const tasks = [
      {
        task_id: `TASK-${missionId.replace('MIS-', '')}-01`,
        name: 'Technical Architecture & Stack Verification',
        assigned_role: 'SYSTEM_ARCHITECT',
        objective: `Analyze repository architecture for ${profile.project_id} and verify compatibility`,
        required_outputs: ['Architecture verification receipt'],
        status: 'PLANNED',
        duration_ms: null
      },
      {
        task_id: `TASK-${missionId.replace('MIS-', '')}-02`,
        name: 'Core Module Implementation / Verification',
        assigned_role: 'CORE_ENGINEER',
        objective: `Implement or verify core deliverables satisfying: ${direction.goal}`,
        required_outputs: ['Code changes', 'Automated test suite passes'],
        status: 'PLANNED',
        duration_ms: null
      },
      {
        task_id: `TASK-${missionId.replace('MIS-', '')}-03`,
        name: 'Evidence Audit & Ledger Chain Verification',
        assigned_role: 'EVIDENCE_AUDITOR',
        objective: 'Audit all task execution evidence receipts and commit cryptographic hashes',
        required_outputs: ['Verified evidence manifest'],
        status: 'PLANNED',
        duration_ms: null
      }
    ];

    // Write tasks and evaluate role selection
    for (const task of tasks) {
      const selection = this.roleRegistry.selectAgentForTask({
        ...task,
        mission_id: missionId,
        authority_level: direction.authority_level
      }, profile);

      const taskContract = {
        schema_version: '1.0.0',
        task_id: task.task_id,
        mission_id: missionId,
        parent_task_id: null,
        assigned_role: selection.selected_role_id,
        agent_id: 'AGENT-LOCAL-01',
        objective: task.objective,
        inputs: [],
        required_outputs: task.required_outputs.map(o => ({ type: 'ARTIFACT', description: o })),
        acceptance_criteria: ['Test pass rate = 100%', 'Zero security violations'],
        allowed_tools: ['read_file', 'grep_search', 'list_dir'],
        allowed_read_roots: [direction.project_path],
        allowed_write_roots: [direction.project_path],
        protected_surfaces: [...CONSTITUTIONAL_PROTECTED_SURFACES],
        authority_level: direction.authority_level,
        budget: { max_tokens: 15000, max_cost_usd: 0.03, max_duration_seconds: 600 },
        stop_conditions: ['FATAL_ERROR', 'BUDGET_EXCEEDED'],
        escalation_conditions: ['SECURITY_POLICY_VIOLATION'],
        status: task.status
      };
      const taskStr = JSON.stringify(taskContract, null, 2);
      fs.writeFileSync(path.join(missionDir, 'tasks', `${task.task_id}.json`), taskStr, 'utf8');
      this._updateManifestFile(missionDir, `tasks/${task.task_id}.json`, taskStr);

      const selectionStr = JSON.stringify(selection, null, 2);
      fs.writeFileSync(path.join(missionDir, 'selections', `SEL-${task.task_id}.json`), selectionStr, 'utf8');
      this._updateManifestFile(missionDir, `selections/SEL-${task.task_id}.json`, selectionStr);
    }

    const plan = {
      mission_id: missionId,
      planned_at: new Date().toISOString(),
      tasks,
      governance_gates: ['HITL_DIRECTION_APPROVAL', 'EVIDENCE_VERIFICATION_GATE'],
      fsm_path: [
        'VISION_INTAKE',
        'MISSION_FORMULATION',
        'HUMAN_DIRECTION_GATE',
        'DISCOVER',
        'DEFINE',
        'PLAN'
      ],
      rules_cited: this.rules.cite(['R-ATS-01', 'R-HITL-01', 'R-SCHEMA-01'])
    };
    const planStr = JSON.stringify(plan, null, 2);
    fs.writeFileSync(path.join(missionDir, 'plan.json'), planStr, 'utf8');
    this._updateManifestFile(missionDir, 'plan.json', planStr);

    const authority = direction.authority_level || 'LEVEL_0';
    const transitions = this._advanceToPlanViaCanonicalFsm(missionId, missionDir, {
      direction,
      profile,
      pkg,
      authority,
      hitlReceipt: options.hitlReceipt,
      requireExternalHitl: options.requireExternalHitl === true
    });

    // Attach planned tasks after phase commit (orchestration payload, not phase)
    const pkgFile = path.join(missionDir, 'mission-package.json');
    const pkgCommitted = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    pkgCommitted.orchestration = pkgCommitted.orchestration || {};
    pkgCommitted.orchestration.tasks = tasks;
    const pkgStr = JSON.stringify(pkgCommitted, null, 2);
    fs.writeFileSync(pkgFile, pkgStr, 'utf8');
    this._updateManifestFile(missionDir, 'mission-package.json', pkgStr);

    // Log event
    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_PLANNED', {
      tasks_count: tasks.length,
      plan_hash: calculateSha256(planStr),
      fsm_path: plan.fsm_path,
      transitions: transitions.map((t) => t.event_type)
    });

    return {
      mission_id: missionId,
      tasks_generated: tasks.length,
      phase: this.ats.getSnapshot(missionId).state,
      transitions,
      plan
    };
  }

  /**
   * Walk canonical FSM from VISION_INTAKE to PLAN with required artifacts + HITL.
   * @private
   */
  _advanceToPlanViaCanonicalFsm(missionId, missionDir, ctx) {
    const { direction, profile, pkg, authority } = ctx;
    fs.mkdirSync(path.join(missionDir, 'artifacts'), { recursive: true });

    const art = (kind, payload) => this._writeMissionArtifact(missionDir, kind, payload);

    const vision = art('vision', {
      mission_id: missionId,
      goal: direction.goal,
      business_context: direction.business_context
    });
    const missionPackage = art('mission_package', pkg);
    const contract = art('contract', {
      contract_id: pkg.contract_id,
      mission_id: missionId,
      terms: ['local_governed', 'no_network', 'no_fundacion_mutation']
    });
    const inventory = art('repository_inventory', {
      project_id: profile.project_id,
      root_path: direction.project_path,
      discovered_keys: Object.keys(profile)
    });
    const techSpec = art('technical_spec', {
      mission_id: missionId,
      approach: 'Governed local plan generation',
      goal: direction.goal
    });
    const acceptance = art('acceptance_criteria', {
      mission_id: missionId,
      criteria: ['phase_equals_PLAN', 'tasks_status_PLANNED', 'authority_snapshot_synced']
    });

    const steps = [];
    const run = (event_type, to_state, artifacts, extra = {}) => {
      const res = this.ats.commitTransition({
        missionId,
        event_type,
        to_state,
        authority_level: authority,
        artifacts,
        ...extra
      });
      steps.push({ event_type, to_state, state: res.snapshot.state });
      return res;
    };

    run('mission.formulate', SDD_STATES.MISSION_FORMULATION, [vision]);
    run('mission.propose_direction', SDD_STATES.HUMAN_DIRECTION_GATE, [missionPackage, contract]);

    let hitlReceipt = ctx.hitlReceipt || null;
    if (!hitlReceipt) {
      const receiptPath = path.join(missionDir, 'hitl', 'direction-approval.json');
      if (fs.existsSync(receiptPath)) {
        hitlReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      }
    }
    if (!hitlReceipt) {
      if (ctx.requireExternalHitl || this.allowLocalDirectorReceipt === false) {
        const err = new Error(
          'HITL_RECEIPT_REQUIRED: Provide hitlReceipt or .missions/<id>/hitl/direction-approval.json before leaving HUMAN_DIRECTION_GATE'
        );
        err.code = 'HITL_RECEIPT_REQUIRED';
        throw err;
      }
      hitlReceipt = this.hitl.issueLocalBoundedReceipt({
        missionId,
        gateId: 'HUMAN_DIRECTION_GATE',
        reason: 'Auto-issued LOCAL_BOUNDED fixture receipt for planMission (MEASURED_LOCAL_FIXTURE)'
      });
      fs.mkdirSync(path.join(missionDir, 'hitl'), { recursive: true });
      const receiptStr = JSON.stringify(hitlReceipt, null, 2);
      fs.writeFileSync(path.join(missionDir, 'hitl', 'direction-approval.json'), receiptStr, 'utf8');
      this._updateManifestFile(missionDir, 'hitl/direction-approval.json', receiptStr);
      this.schemas.assertValid(hitlReceipt, 'hitl-receipt.local.schema.json', 'hitl-receipt');
    }

    run('human.approve_direction', SDD_STATES.DISCOVER, [], { hitlReceipt });
    run('discovery.complete', SDD_STATES.DEFINE, [inventory]);
    run('definition.complete', SDD_STATES.PLAN, [techSpec, acceptance]);

    return steps;
  }

  /** @private */
  _writeMissionArtifact(missionDir, kind, payload) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    const rel = `artifacts/${kind}.json`;
    fs.writeFileSync(path.join(missionDir, rel), body, 'utf8');
    this._updateManifestFile(missionDir, rel, body);
    return {
      id: kind,
      kind,
      sha256: calculateSha256(body),
      uri: rel
    };
  }

  /**
   * Packages the mission for Cursor operator
   * @param {string} missionId
   * @param {string} target 'cursor'
   */
  packageMission(missionId, target = 'cursor') {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);
    }

    const direction = JSON.parse(fs.readFileSync(path.join(missionDir, 'direction.json'), 'utf8'));
    const profile = JSON.parse(fs.readFileSync(path.join(missionDir, 'project-profile.json'), 'utf8'));
    const plan = fs.existsSync(path.join(missionDir, 'plan.json'))
      ? JSON.parse(fs.readFileSync(path.join(missionDir, 'plan.json'), 'utf8'))
      : { tasks: [] };

    const pkg = JSON.parse(fs.readFileSync(path.join(missionDir, 'mission-package.json'), 'utf8'));
    const { jsonPackage, markdownPrompt, manifestHash } = this.packageGenerator.generatePackage({
      mission_id: missionId,
      project_id: profile.project_id,
      project_root: direction.project_path,
      phase: pkg.phase,
      direction: {
        goal: direction.goal,
        business_context: direction.business_context
      },
      authority: {
        level: direction.authority_level,
        max_budget_usd: direction.budget_cap_usd
      },
      tasks: plan.tasks,
      allowed_tools: ['read_file', 'grep_search', 'list_dir'],
      protected_surfaces: ['docs/governance/**', '.eos/ledger/**']
    });

    // Write to cursor subdirectory
    const cursorPkgStr = JSON.stringify(jsonPackage, null, 2);
    fs.writeFileSync(path.join(missionDir, 'cursor', 'mission-package.json'), cursorPkgStr, 'utf8');
    fs.writeFileSync(path.join(missionDir, 'cursor', 'CURSOR_PROMPT.md'), markdownPrompt, 'utf8');

    // Update integrity manifest
    this._updateManifestFile(missionDir, 'cursor/mission-package.json', cursorPkgStr);
    this._updateManifestFile(missionDir, 'cursor/CURSOR_PROMPT.md', markdownPrompt);

    // Log event
    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_PACKAGED', {
      target,
      manifest_hash: manifestHash
    });

    return {
      mission_id: missionId,
      target,
      manifest_hash: manifestHash,
      cursor_prompt_path: path.join(missionDir, 'cursor', 'CURSOR_PROMPT.md')
    };
  }

  /**
   * Generates mission status and executive report
   * @param {string} missionId
   * @param {string} format 'json' | 'markdown'
   */
  reportMission(missionId, format = 'markdown') {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);
    }

    const direction = JSON.parse(fs.readFileSync(path.join(missionDir, 'direction.json'), 'utf8'));
    const plan = fs.existsSync(path.join(missionDir, 'plan.json'))
      ? JSON.parse(fs.readFileSync(path.join(missionDir, 'plan.json'), 'utf8'))
      : { tasks: [] };

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    const events = ledger.getEvents(missionId);
    const chainCheck = ledger.verifyChainIntegrity(missionId);

    // Reflect what actually came back: a task whose return was reconciled ACCEPT with a clean
    // test run is reported VERIFIED, everything else keeps its planned status. The verdict
    // stays scoped to technical verification and never claims a business outcome.
    const returns = this._readAcceptedReturns(missionDir, { acceptedOnly: false });
    const evidence = this._deriveVerificationEvidence(missionDir);
    const verifiedTaskIds = new Set(evidence.filter((e) => e.status === 'VERIFIED').map((e) => e.task_id));
    const tasks = (plan.tasks || []).map((t) =>
      verifiedTaskIds.has(t.task_id) ? { ...t, status: 'VERIFIED' } : t
    );

    const phase = this.ats.getSnapshot(missionId).state;
    const snapshotIntegrity = this.ats.verifySnapshotIntegrity(missionId);
    const technicallyVerified =
      phase === SDD_STATES.COMPLETED &&
      chainCheck.valid &&
      snapshotIntegrity.valid &&
      evidence.length > 0 &&
      evidence.every((e) => e.status === 'VERIFIED');

    const { jsonReport, markdownReport } = this.reporter.generateReport({
      mission_id: missionId,
      goal: direction.goal,
      epistemic_verdict: technicallyVerified
        ? 'TECHNICALLY_VERIFIED_WITHIN_LOCAL_SCOPE'
        : 'NOT_PROVEN',
      provenance: {
        token_count: 'NOT_RUN',
        cost_usd: 'NOT_RUN',
        latency: 'NOT_RUN',
        reversibility: 'NOT_RUN',
        provider_reliability: 'NOT_RUN'
      },
      tasks,
      evidence: {
        total_receipts: tasks.length,
        verified_receipts: tasks.filter((t) => t.status === 'VERIFIED').length,
        hash_chain_integrity: chainCheck.valid ? 'VALID' : 'CORRUPTED',
        authority_snapshot_integrity: snapshotIntegrity.code,
        ledger_chain_count: events.length,
        returns_ingested: returns.length,
        observed_test_results: evidence.map((e) => ({ task_id: e.task_id, status: e.status, ...e.observed }))
      },
      economics: {
        total_tokens: null,
        estimated_cost_usd: null,
        budget_cap_usd: direction.budget_cap_usd,
        efficiency_ratio_evidence_per_kt: null,
        epistemic_class: 'NOT_RUN'
      },
      deviations: [],
      hitl_action_items: [],
      governance: {
        network_egress_status: 'BLOCKED_OFFLINE',
        credentials_active_count: 0
      }
    });

    // Save reports
    const reportJsonStr = JSON.stringify(jsonReport, null, 2);
    fs.writeFileSync(path.join(missionDir, 'reports', 'executive-report.json'), reportJsonStr, 'utf8');
    fs.writeFileSync(path.join(missionDir, 'reports', 'EXECUTIVE_REPORT.md'), markdownReport, 'utf8');
    this._updateManifestFile(missionDir, 'reports/executive-report.json', reportJsonStr);
    this._updateManifestFile(missionDir, 'reports/EXECUTIVE_REPORT.md', markdownReport);

    return format === 'json' ? jsonReport : markdownReport;
  }

  /**
   * Verifies the cryptographic integrity of a mission
   * @param {string} missionId
   */
  verifyMission(missionId) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);
    }

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    const chainCheck = ledger.verifyChainIntegrity(missionId);

    // The authority snapshot is the mission's state of record but is not listed in the
    // integrity manifest, so it is checked against the hash anchored in the ledger.
    const snapshotIntegrity = this.ats.verifySnapshotIntegrity(missionId);

    const manifestFile = path.join(missionDir, 'integrity-manifest.json');
    const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { files: {} };

    let manifestValid = true;
    const discrepancies = [];

    for (const [relPath, expectedHash] of Object.entries(manifest.files || {})) {
      const fullPath = path.join(missionDir, relPath);
      if (!fs.existsSync(fullPath)) {
        manifestValid = false;
        discrepancies.push(`Missing file: ${relPath}`);
        continue;
      }
      const actualHash = calculateSha256(fs.readFileSync(fullPath, 'utf8'));
      if (actualHash !== expectedHash) {
        manifestValid = false;
        discrepancies.push(`Hash mismatch in ${relPath} (expected: ${expectedHash.substring(0, 8)}..., actual: ${actualHash.substring(0, 8)}...)`);
      }
    }

    if (!snapshotIntegrity.valid) {
      discrepancies.push(
        `AUTHORITY_SNAPSHOT_${snapshotIntegrity.code}: authority-snapshot.json does not match the hash anchored in the ledger ` +
          `(anchored: ${String(snapshotIntegrity.expected).substring(0, 8)}..., actual: ${String(snapshotIntegrity.actual).substring(0, 8)}...)`
      );
    }

    return {
      mission_id: missionId,
      valid: chainCheck.valid && manifestValid && snapshotIntegrity.valid,
      ledger_chain: chainCheck,
      manifest_valid: manifestValid,
      authority_snapshot: snapshotIntegrity,
      discrepancies
    };
  }

  /**
   * Pauses an active mission
   * @param {string} missionId
   * @param {string} reason
   */
  pauseMission(missionId, reason = 'Operator paused mission') {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);

    this.ats.commitTransition({
      missionId,
      event_type: 'mission.pause',
      authority_level: 'LEVEL_0',
      actor: { identity: 'operator', role: 'HUMAN_DIRECTOR', identity_type: 'human_owner' }
    });

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_PAUSED', { reason });

    return { mission_id: missionId, status: 'paused', reason };
  }

  /**
   * Resumes a paused mission
   * @param {string} missionId
   */
  resumeMission(missionId) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);

    this.ats.commitTransition({
      missionId,
      event_type: 'mission.resume',
      authority_level: 'LEVEL_0',
      actor: { identity: 'operator', role: 'HUMAN_DIRECTOR', identity_type: 'human_owner' }
    });

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_RESUMED', {});

    const snap = this.ats.getSnapshot(missionId);
    return { mission_id: missionId, status: 'active', phase: snap.state };
  }

  /**
   * Closes a mission
   * @param {string} missionId
   * @param {string} reason
   */
  closeMission(missionId, reason = 'Mission successfully completed') {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);

    // IntegrationGatekeeper on call path: refuse close if FDIR kill-switch tripped
    if (this.integrationGate.fdirSafeModeTripped) {
      throw new Error(
        `INTEGRATION_BLOCKED [FDIR_SAFE_MODE]: Cannot close mission while kill switch is active (${this.integrationGate.trippedReason})`
      );
    }

    this.ats.commitTransition({
      missionId,
      event_type: 'mission.complete',
      to_state: 'COMPLETED',
      authority_level: 'LEVEL_0',
      actor: { identity: 'operator', role: 'HUMAN_DIRECTOR', identity_type: 'human_owner' }
    });

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_CLOSED', { reason, integration_gate: 'CHECKED_NOT_LIVE' });

    return { mission_id: missionId, status: 'completed', reason };
  }

  /**
   * Abandons a mission without asserting that its work was verified.
   * This is the honest counterpart to closeMission: CANCELLED makes no evidence claim,
   * whereas COMPLETED does and therefore requires the full gated path.
   * @param {string} missionId
   * @param {string} reason
   */
  cancelMission(missionId, reason = 'Operator cancelled mission') {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);

    this.ats.commitTransition({
      missionId,
      event_type: 'mission.cancel',
      authority_level: 'LEVEL_0',
      actor: { identity: 'operator', role: 'HUMAN_DIRECTOR', identity_type: 'human_owner' }
    });

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_CANCELLED', { reason });

    return { mission_id: missionId, status: 'cancelled', reason };
  }

  /**
   * Performs the next canonical transition for a mission, deriving each gate's required
   * artifacts, outputs and evidence from what is actually on disk. Gates deny when the
   * underlying facts are absent, so COMPLETED is unreachable without a verified return.
   *
   * @param {string} missionId
   * @param {object} [options]
   * @param {object} [options.hitlReceipt] receipt for HUMAN_RELEASE_GATE
   * @param {boolean} [options.requireExternalHitl] refuse the local fixture receipt
   * @param {string} [options.reviewerIdentity] independent reviewer identity
   * @returns {{mission_id: string, from: string, to: string, event_type: string}}
   */
  advanceMission(missionId, options = {}) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);
    }

    const state = this.ats.getSnapshot(missionId).state;
    const step = this._buildAdvanceStep(missionId, missionDir, state, options);

    const res = this.ats.commitTransition({
      missionId,
      event_type: step.event_type,
      to_state: step.to_state,
      authority_level: step.authority_level || 'LEVEL_0',
      actor: step.actor,
      artifacts: step.artifacts || [],
      evidence_refs: step.evidence_refs || [],
      hitlReceipt: step.hitlReceipt || null,
      context: step.context || {}
    });

    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'MISSION_ADVANCED', {
      event_type: step.event_type,
      from_state: state,
      to_state: res.snapshot.state,
      gate_inputs: step.gate_inputs || {}
    });

    return {
      mission_id: missionId,
      from: state,
      to: res.snapshot.state,
      event_type: step.event_type,
      receipt_id: res.receipt?.receipt_id
    };
  }

  /**
   * Resolves the single legal next step and the real facts each gate demands.
   * @private
   */
  _buildAdvanceStep(missionId, missionDir, state, options) {
    const IMPLEMENTER = 'AGENT-LOCAL-01';

    switch (state) {
      case SDD_STATES.PLAN: {
        const plan = this._readMissionJson(missionDir, 'plan.json');
        if (!plan) {
          throw this._advanceError('ADVANCE_BLOCKED_NO_PLAN', 'plan.json is missing; run mission plan first');
        }
        const taskContracts = this._readTaskContracts(missionDir);
        if (taskContracts.length === 0) {
          throw this._advanceError('ADVANCE_BLOCKED_NO_TASKS', 'no task contracts found under tasks/');
        }
        return {
          event_type: 'plan.approve',
          to_state: SDD_STATES.DELEGATE,
          artifacts: [
            this._writeMissionArtifact(missionDir, 'implementation_plan', plan),
            this._writeMissionArtifact(missionDir, 'task_graph', {
              mission_id: missionId,
              nodes: taskContracts.map((t) => ({ task_id: t.task_id, role: t.assigned_role, status: t.status }))
            })
          ],
          gate_inputs: { tasks: taskContracts.length }
        };
      }

      case SDD_STATES.DELEGATE: {
        const taskContracts = this._readTaskContracts(missionDir);
        const contract = taskContracts[0];
        if (!contract) {
          throw this._advanceError('ADVANCE_BLOCKED_NO_TASK_CONTRACT', 'no task contract available to delegate');
        }
        return {
          event_type: 'task.assign',
          to_state: SDD_STATES.SUPERVISE,
          context: { taskContract: contract, implementer: { identity: IMPLEMENTER } },
          gate_inputs: { delegated_task: contract.task_id }
        };
      }

      case SDD_STATES.SUPERVISE: {
        const accepted = this._readAcceptedReturns(missionDir);
        if (accepted.length === 0) {
          throw this._advanceError(
            'ADVANCE_BLOCKED_NO_ACCEPTED_RETURN',
            'no accepted Cursor return package; submit work with mission submit before completing the task'
          );
        }
        return {
          event_type: 'task.complete',
          to_state: SDD_STATES.VERIFY,
          authority_level: 'LEVEL_1',
          context: {
            implementer: { identity: IMPLEMENTER },
            outputs: accepted.flatMap((r) =>
              (r.returnPkg.affected_files || []).map((f) => ({
                task_id: r.taskId,
                path: f.path,
                action: f.action
              }))
            )
          },
          gate_inputs: { accepted_returns: accepted.map((r) => r.taskId) }
        };
      }

      case SDD_STATES.VERIFY: {
        const evidence = this._deriveVerificationEvidence(missionDir);
        return {
          event_type: 'verification.complete',
          to_state: SDD_STATES.REVIEW,
          evidence_refs: evidence,
          context: { implementer: { identity: IMPLEMENTER } },
          gate_inputs: { evidence: evidence.map((e) => ({ id: e.id, status: e.status })) }
        };
      }

      case SDD_STATES.REVIEW: {
        const reviewer = options.reviewerIdentity || 'REVIEWER-INDEPENDENT-01';
        return {
          event_type: 'review.accept',
          to_state: SDD_STATES.HUMAN_RELEASE_GATE,
          actor: { identity: reviewer, role: 'INDEPENDENT_REVIEWER', identity_type: 'eos_reviewer' },
          context: { implementer: { identity: IMPLEMENTER }, reviewer: { identity: reviewer } },
          gate_inputs: { reviewer, implementer: IMPLEMENTER }
        };
      }

      case SDD_STATES.HUMAN_RELEASE_GATE: {
        let receipt = options.hitlReceipt || null;
        if (!receipt) {
          const receiptPath = path.join(missionDir, 'hitl', 'release-approval.json');
          if (fs.existsSync(receiptPath)) {
            receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
          }
        }
        if (!receipt) {
          if (options.requireExternalHitl === true || this.allowLocalDirectorReceipt === false) {
            throw this._advanceError(
              'HITL_RECEIPT_REQUIRED',
              'provide hitlReceipt or .missions/<id>/hitl/release-approval.json before leaving HUMAN_RELEASE_GATE'
            );
          }
          receipt = this.hitl.issueLocalBoundedReceipt({
            missionId,
            gateId: 'HUMAN_RELEASE_GATE',
            reason: 'Auto-issued LOCAL_BOUNDED fixture receipt for release gate (MEASURED_LOCAL_FIXTURE)'
          });
          fs.mkdirSync(path.join(missionDir, 'hitl'), { recursive: true });
          const receiptStr = JSON.stringify(receipt, null, 2);
          fs.writeFileSync(path.join(missionDir, 'hitl', 'release-approval.json'), receiptStr, 'utf8');
          this._updateManifestFile(missionDir, 'hitl/release-approval.json', receiptStr);
          this.schemas.assertValid(receipt, 'hitl-receipt.local.schema.json', 'hitl-receipt');
        }
        return {
          event_type: 'human.approve_release',
          to_state: SDD_STATES.OPERATE_AND_LEARN,
          hitlReceipt: receipt,
          gate_inputs: { receipt_id: receipt.receipt_id, epistemic_class: receipt.epistemic_class || 'EXTERNAL' }
        };
      }

      case SDD_STATES.OPERATE_AND_LEARN:
        return {
          event_type: 'mission.close',
          to_state: SDD_STATES.COMPLETED,
          actor: { identity: 'operator', role: 'HUMAN_DIRECTOR', identity_type: 'human_owner' },
          gate_inputs: {}
        };

      default:
        throw this._advanceError(
          'ADVANCE_NOT_APPLICABLE',
          `no canonical advance defined from state ${state}`
        );
    }
  }

  /**
   * Builds evidence references from the ingested return packages. Status is derived from the
   * observed reconciliation verdict and test results, never asserted, so an unverified return
   * produces evidence the VERIFY gate will refuse.
   * @private
   */
  _deriveVerificationEvidence(missionDir) {
    const returns = this._readAcceptedReturns(missionDir, { acceptedOnly: false });
    return returns.map(({ taskId, returnPkg, assessment }) => {
      const tr = returnPkg.test_results || {};
      const testsClean = tr.total_tests > 0 && tr.failed_tests === 0 && tr.pass_rate === 1;
      const reconciled = assessment?.verdict === 'ACCEPT';
      return {
        id: `EVD-RETURN-${taskId}`,
        task_id: taskId,
        status: testsClean && reconciled ? 'VERIFIED' : 'NOT_VERIFIED',
        category: 'UNIT_TEST',
        observed: {
          reconciliation_verdict: assessment?.verdict || 'UNKNOWN',
          total_tests: tr.total_tests ?? null,
          failed_tests: tr.failed_tests ?? null,
          pass_rate: tr.pass_rate ?? null
        },
        sha256: calculateSha256(JSON.stringify({ taskId, tr, verdict: assessment?.verdict }))
      };
    });
  }

  /** @private */
  _readAcceptedReturns(missionDir, { acceptedOnly = true } = {}) {
    const returnsDir = path.join(missionDir, 'cursor', 'returns');
    if (!fs.existsSync(returnsDir)) return [];
    return fs
      .readdirSync(returnsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const taskId = f.replace(/\.json$/, '');
        const returnPkg = JSON.parse(fs.readFileSync(path.join(returnsDir, f), 'utf8'));
        const assessmentFile = path.join(missionDir, 'evidence', `return-${taskId}-assessment.json`);
        const assessment = fs.existsSync(assessmentFile)
          ? JSON.parse(fs.readFileSync(assessmentFile, 'utf8'))
          : null;
        return { taskId, returnPkg, assessment };
      })
      .filter((r) => (acceptedOnly ? r.assessment?.verdict === 'ACCEPT' : true));
  }

  /** @private */
  _readTaskContracts(missionDir) {
    const tasksDir = path.join(missionDir, 'tasks');
    if (!fs.existsSync(tasksDir)) return [];
    return fs
      .readdirSync(tasksDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(tasksDir, f), 'utf8')));
  }

  /** @private */
  _readMissionJson(missionDir, relPath) {
    const full = path.join(missionDir, relPath);
    return fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, 'utf8')) : null;
  }

  /** @private */
  _advanceError(code, message) {
    const err = new Error(`${code}: ${message}`);
    err.code = code;
    return err;
  }

  /**
   * Ingests and reconciles a Cursor Return Package against its corresponding task contract
   * @param {string} missionId
   * @param {string} returnPkgPath Relative or absolute path to the return package JSON
   */
  submitReturnPackage(missionId, returnPkgPath) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`MISSION_NOT_FOUND: Mission '${missionId}' does not exist.`);
    }

    const resolvedPkgPath = path.isAbsolute(returnPkgPath) ? returnPkgPath : path.resolve(this.baseDir, returnPkgPath);
    if (!fs.existsSync(resolvedPkgPath)) {
      throw new Error(`RETURN_PACKAGE_NOT_FOUND: File '${returnPkgPath}' does not exist.`);
    }

    const returnPkg = JSON.parse(fs.readFileSync(resolvedPkgPath, 'utf8'));
    const taskId = returnPkg.task_id;
    const taskContractFile = path.join(missionDir, 'tasks', `${taskId}.json`);

    if (!fs.existsSync(taskContractFile)) {
      throw new Error(`TASK_CONTRACT_NOT_FOUND: Task contract '${taskId}' does not exist in mission '${missionId}'.`);
    }

    const taskContract = JSON.parse(fs.readFileSync(taskContractFile, 'utf8'));

    // Seed the engine from the mission's durable nonce registry. The engine's in-memory set
    // does not survive a process boundary, and every CLI submission is a new process, so
    // without this a replayed return package is accepted a second time.
    const nonceRegistryFile = path.join(missionDir, 'nonce-registry.json');
    const knownNonces = fs.existsSync(nonceRegistryFile)
      ? JSON.parse(fs.readFileSync(nonceRegistryFile, 'utf8')).nonces || []
      : [];
    this.ingestionEngine.consumedNonces = new Set(knownNonces);

    // Ingest & evaluate via engine
    const evaluation = this.ingestionEngine.ingestAndEvaluate(returnPkg, taskContract);

    if (returnPkg.nonce && !knownNonces.includes(returnPkg.nonce)) {
      fs.writeFileSync(
        nonceRegistryFile,
        JSON.stringify(
          { mission_id: missionId, updated_at: new Date().toISOString(), nonces: [...knownNonces, returnPkg.nonce] },
          null,
          2
        ),
        'utf8'
      );
    }

    // An accepted assessment is never overwritten by a later non-accepted submission.
    // Otherwise replaying a package would destroy the evidence of the legitimate submission
    // that preceded it and strand the mission, turning a replay into an evidence attack.
    const returnsDir = path.join(missionDir, 'cursor', 'returns');
    const assessmentFile = path.join(missionDir, 'evidence', `return-${taskId}-assessment.json`);
    const priorAssessment = fs.existsSync(assessmentFile)
      ? JSON.parse(fs.readFileSync(assessmentFile, 'utf8'))
      : null;
    const supersedesAccepted = priorAssessment?.verdict === 'ACCEPT' && evaluation.verdict !== 'ACCEPT';

    fs.mkdirSync(returnsDir, { recursive: true });
    const retainedStr = JSON.stringify(returnPkg, null, 2);
    const assessmentStr = JSON.stringify(evaluation, null, 2);

    if (supersedesAccepted) {
      const attemptsDir = path.join(missionDir, 'evidence', 'rejected-attempts');
      fs.mkdirSync(attemptsDir, { recursive: true });
      const stamp = `${taskId}-${Date.now()}`;
      fs.writeFileSync(path.join(attemptsDir, `${stamp}-return.json`), retainedStr, 'utf8');
      fs.writeFileSync(path.join(attemptsDir, `${stamp}-assessment.json`), assessmentStr, 'utf8');
      this._updateManifestFile(missionDir, `evidence/rejected-attempts/${stamp}-return.json`, retainedStr);
      this._updateManifestFile(missionDir, `evidence/rejected-attempts/${stamp}-assessment.json`, assessmentStr);
    } else {
      fs.writeFileSync(path.join(returnsDir, `${taskId}.json`), retainedStr, 'utf8');
      this._updateManifestFile(missionDir, `cursor/returns/${taskId}.json`, retainedStr);
      fs.writeFileSync(assessmentFile, assessmentStr, 'utf8');
      this._updateManifestFile(missionDir, `evidence/return-${taskId}-assessment.json`, assessmentStr);
    }

    // Load selection record if available
    const selectionFile = path.join(missionDir, 'selections', `SEL-${taskId}.json`);
    const selectionRecord = fs.existsSync(selectionFile) ? JSON.parse(fs.readFileSync(selectionFile, 'utf8')) : {};

    // 8-Dimensional Multi-Agent Supervision Evaluation
    const supervision = this.supervisionEngine.evaluateSubmission(taskContract, selectionRecord, returnPkg, []);
    const supervisionFile = path.join(missionDir, 'evidence', `supervision-${taskId}.json`);
    const supervisionStr = JSON.stringify(supervision, null, 2);
    fs.writeFileSync(supervisionFile, supervisionStr, 'utf8');
    this._updateManifestFile(missionDir, `evidence/supervision-${taskId}.json`, supervisionStr);

    // Log to ledger
    const ledger = new HashChainedLedger({ baseDir: path.join(missionDir, 'ledger') });
    ledger.appendEvent(missionId, 'CURSOR_RETURN_INGESTED', {
      task_id: taskId,
      verdict: evaluation.verdict,
      reconciliation_hash: evaluation.reconciliation_hash,
      deviations_count: evaluation.deviations.length,
      nonce: returnPkg.nonce || null,
      quarantined_as_rejected_attempt: supersedesAccepted
    });
    ledger.appendEvent(missionId, 'TASK_SUPERVISED', {
      task_id: taskId,
      verdict: supervision.verdict,
      overall_score: supervision.overall_score,
      reviewer_role: supervision.reviewer_role_id
    });

    return {
      ...evaluation,
      supervision
    };
  }
}
