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
import { CursorReturnIngestionEngine } from '../adapters/cursor-return-ingestion-engine.js';
import { RoleSkillRegistryEngine } from '../roles/role-skill-registry-engine.js';
import { MultiAgentSupervisionEngine } from '../supervision/multi-agent-supervision-engine.js';
import { HashChainedLedger, calculateSha256 } from '../sdd/epistemic-evidence-engine.js';
import { ExecutiveMissionReporter } from '../observability/executive-mission-reporter.js';
import { AuthorityTruthSource } from '../authority/authority-truth-source.js';
import { HitlGatekeeper } from '../sdd/hitl-gatekeeper.js';
import { IntegrationGatekeeper } from '../governance/integration-gatekeeper.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { CanonicalRulesIndex } from '../rules/canonical-rules-index.js';
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
  }

  getMissionDir(missionId) {
    return path.join(this.missionsRoot, missionId);
  }

  _updateManifestFile(missionDir, relPath, contentStr) {
    const manifestFile = path.join(missionDir, 'integrity-manifest.json');
    const manifest = fs.existsSync(manifestFile)
      ? JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
      : { mission_id: path.basename(missionDir), files: {} };

    manifest.files[relPath] = calculateSha256(contentStr);
    manifest.updated_at = new Date().toISOString();
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
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
        protected_surfaces: ['docs/governance/**'],
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

    const { jsonReport, markdownReport } = this.reporter.generateReport({
      mission_id: missionId,
      goal: direction.goal,
      epistemic_verdict: 'NOT_PROVEN',
      provenance: {
        token_count: 'NOT_RUN',
        cost_usd: 'NOT_RUN',
        latency: 'NOT_RUN',
        reversibility: 'NOT_RUN',
        provider_reliability: 'NOT_RUN'
      },
      tasks: plan.tasks,
      evidence: {
        total_receipts: plan.tasks.length,
        verified_receipts: plan.tasks.filter(t => t.status === 'VERIFIED').length,
        hash_chain_integrity: chainCheck.valid ? 'VALID' : 'CORRUPTED',
        ledger_chain_count: events.length
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

    return {
      mission_id: missionId,
      valid: chainCheck.valid && manifestValid,
      ledger_chain: chainCheck,
      manifest_valid: manifestValid,
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

    // Ingest & evaluate via engine
    const evaluation = this.ingestionEngine.ingestAndEvaluate(returnPkg, taskContract);

    // Save assessment to evidence folder
    const assessmentFile = path.join(missionDir, 'evidence', `return-${taskId}-assessment.json`);
    const assessmentStr = JSON.stringify(evaluation, null, 2);
    fs.writeFileSync(assessmentFile, assessmentStr, 'utf8');
    this._updateManifestFile(missionDir, `evidence/return-${taskId}-assessment.json`, assessmentStr);

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
      deviations_count: evaluation.deviations.length
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
