/**
 * @module MissionCLI
 * @description Command-line dispatcher for EOS Mission operations.
 * Implements the CLI interface for the Human Director and external agent environments.
 */

import { MissionRuntime } from '../core/runtime/mission-runtime.js';
import { TutorMaestro } from '../core/tutor/tutor-maestro.js';
import { runOperatorDoctor, formatDoctorReport } from '../core/runtime/operator-doctor.js';
import { listLocalMissions, suggestNextAction, formatNextReport, classifyApplyBand } from '../core/runtime/operator-next.js';
import { resolveControlPlaneRoot } from '../core/runtime/control-plane-root.js';
import { loadRecentLessons } from '../core/runtime/mission-learning.js';
import {
  ProjectPipelineRunner,
  parseOrchestrateArgs,
  PIPELINE_PHASES
} from '../core/runtime/project-pipeline-runner.js';
import { FirstPrinciplesSimplifierEngine } from '../core/optimization/first-principles-simplifier-engine.js';
import { ElevateOrchestrator } from '../core/elevate/elevate-orchestrator.js';
import { ProjectOnboarder } from '../core/projects/project-onboarder.js';
import { RelationalTraceabilityMatrix } from '../core/ontology/relational-traceability-matrix.js';
import { AutonomousLoopEngine } from '../core/runtime/autonomous-loop-engine.js';
import fs from 'node:fs';
import path from 'node:path';

export class MissionCLI {
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || options.baseDir;
    this.runtime = new MissionRuntime(options);
    this.tutor = options.tutor || new TutorMaestro();
  }

  /**
   * Dispatches CLI argv arguments to corresponding runtime methods
   * @param {Array<string>} argv Command line arguments (e.g. process.argv.slice(2))
   * @returns {Object} { success: boolean, output: string, data?: Object }
   */
  async run(argv = []) {
    if (argv[0] === '--help' || argv[0] === '-h') {
      return { success: true, output: this.getHelp() };
    }

    if (argv.length === 0 || argv[0] === 'next' || argv[0] === 'n') {
      return this.handleNextCommand(argv);
    }

    const command = argv[0];

    if (command === 'mission' || command === 'm') {
      return this.handleMissionCommand(argv.slice(1));
    }

    if (command === 'role' || command === 'r') {
      return this.handleRoleCommand(argv.slice(1));
    }

    if (command === 'verify' || command === 'v') {
      return this.handleVerifyCommand(argv.slice(1));
    }

    if (command === 'doctor' || command === 'd') {
      return this.handleDoctorCommand();
    }

    if (command === 'orchestrate' || command === 'o') {
      return this.handleOrchestrateCommand(argv.slice(1));
    }

    if (command === 'simplify' || command === 's') {
      return this.handleSimplifyCommand(argv.slice(1));
    }

    if (command === 'elevate' || command === 'e') {
      return this.handleElevateCommand(argv.slice(1));
    }

    if (command === 'project' || command === 'p') {
      return this.handleProjectCommand(argv.slice(1));
    }

    if (command === 'fleet' || command === 'f') {
      return this.handleFleetCommand(argv.slice(1));
    }

    if (command === 'onboard') {
      return this.handleProjectCommand(['onboard', ...argv.slice(1)]);
    }

    if (command === 'trace' || command === 't') {
      return this.handleTraceCommand(argv.slice(1));
    }

    if (command === 'loop' || command === 'l') {
      return this.handleLoopCommand(argv.slice(1));
    }
    return {
      success: false,
      output: `Unknown command: '${command}'. Run 'eos --help' for usage.`
    };
  }

  /**
   * eos project onboard <targetPath>
   * eos project list
   */
  async handleProjectCommand(args = []) {
    const sub = args[0] || 'list';
    if (sub === 'onboard' || sub === 'add') {
      const targetPath = args[1];
      if (!targetPath) {
        return {
          success: false,
          output: "Error: Target path required. Usage: 'eos project onboard <path>'"
        };
      }
      try {
        const onboarder = new ProjectOnboarder({ controlPlaneRoot: this.runtime?.controlPlaneRoot });
        const res = onboarder.onboardProject(targetPath);
        const lines = [
          '================================================================================',
          `🚀 EOS PROJECT ONBOARDING: SUCCESS [${res.registration.project_id}]`,
          '================================================================================',
          `Name      : ${res.registration.name}`,
          `Path      : ${res.registration.path}`,
          `Type      : ${res.registration.project_type}`,
          `Stack     : ${res.registration.stack.join(', ')}`,
          `Branch    : ${res.registration.branch} (${res.registration.repository})`,
          `Contract  : ${res.registrationPath}`,
          `Intake    : ${res.contextPath}`,
          '--------------------------------------------------------------------------------',
          'Next Step :',
          `  eos orchestrate --project ${res.registration.project_id} --pipeline recon`,
          `  eos orchestrate --project ${res.registration.project_id} --pipeline audit`,
          '================================================================================'
        ];
        return { success: true, output: lines.join('\n'), data: res };
      } catch (err) {
        return { success: false, output: `Project Onboarding Failed: ${err.message}` };
      }
    }

    if (sub === 'list' || sub === 'status') {
      return this.handleFleetCommand(args.slice(1));
    }

    return {
      success: false,
      output: `Unknown project subcommand: '${sub}'. Usage: 'eos project onboard <path>' or 'eos project list'`
    };
  }

  /**
   * eos fleet [--json]
   */
  async handleFleetCommand(args = []) {
    try {
      const onboarder = new ProjectOnboarder({ controlPlaneRoot: this.runtime?.controlPlaneRoot });
      const status = onboarder.getFleetStatus();
      if (args.includes('--json')) {
        return { success: true, output: JSON.stringify(status, null, 2), data: status };
      }
      return { success: true, output: onboarder.formatFleetTable(status), data: status };
    } catch (err) {
      return { success: false, output: `Fleet Status Failed: ${err.message}` };
    }
  }

  /**
   * eos trace [--project <id>] [--file <path>] [--entity <id>] [--json]
   */
  async handleTraceCommand(args = []) {
    const isJson = args.includes('--json');
    let projectId = null;
    let filePath = null;
    let entityId = null;

    const projIdx = args.indexOf('--project');
    if (projIdx !== -1 && args[projIdx + 1]) {
      projectId = args[projIdx + 1];
    }

    const fileIdx = args.indexOf('--file');
    if (fileIdx !== -1 && args[fileIdx + 1]) {
      filePath = args[fileIdx + 1];
    }

    const entityIdx = args.indexOf('--entity');
    if (entityIdx !== -1 && args[entityIdx + 1]) {
      entityId = args[entityIdx + 1];
    }

    // Support positional argument: eos trace <pathOrProjectId>
    const nonFlags = args.filter(a => !a.startsWith('--') && a !== projectId && a !== filePath && a !== entityId);
    if (!projectId && !filePath && !entityId && nonFlags.length > 0) {
      const candidate = nonFlags[0];
      if (candidate.startsWith('PRJ-') || candidate.startsWith('prj-')) {
        projectId = candidate;
      } else if (candidate.includes('/') || candidate.includes('\\') || candidate.endsWith('.js') || candidate.endsWith('.ts') || candidate.endsWith('.md')) {
        filePath = candidate;
      } else {
        projectId = candidate;
      }
    }

    const targetProject = projectId || 'PRJ-EOS-CONTROL-PLANE';

    try {
      const rtm = new RelationalTraceabilityMatrix({
        controlPlaneRoot: this.controlPlaneRoot || this.runtime?.controlPlaneRoot || resolveControlPlaneRoot()
      });

      // If calculating blast radius for a file or entity
      if (filePath || entityId) {
        rtm.buildProjectMatrix(targetProject);
        const blast = rtm.calculateEntityBlastRadius(filePath || entityId);

        if (isJson) {
          return { success: true, output: JSON.stringify(blast, null, 2), data: blast };
        }
        return { success: true, output: rtm.formatBlastRadius(blast), data: blast };
      }

      // Default: Build and show project traceability matrix
      const matrix = rtm.buildProjectMatrix(targetProject);
      if (isJson) {
        const payload = {
          summary: matrix,
          nodes: Array.from(rtm.nodes.values()),
          edges: Array.from(rtm.forwardEdges.entries()).map(([source, targets]) => ({ source, targets }))
        };
        return { success: true, output: JSON.stringify(payload, null, 2), data: payload };
      }

      return { success: true, output: rtm.formatTraceTree(matrix), data: matrix };
    } catch (err) {
      return { success: false, output: `Trace Engine Failed: ${err.message}` };
    }
  }

  /**
   * eos loop [--project <id>] [--file <path>] [--once] [--heal] [--json]
   */
  async handleLoopCommand(args = []) {
    const isJson = args.includes('--json');
    const isOnce = args.includes('--once');
    const isHeal = args.includes('--heal');

    let projectId = null;
    let filePath = null;

    const projIdx = args.indexOf('--project');
    if (projIdx !== -1 && args[projIdx + 1]) {
      projectId = args[projIdx + 1];
    }

    const fileIdx = args.indexOf('--file');
    if (fileIdx !== -1 && args[fileIdx + 1]) {
      filePath = args[fileIdx + 1];
    }

    const nonFlags = args.filter(a => !a.startsWith('--') && a !== projectId && a !== filePath);
    if (!filePath && nonFlags.length > 0) {
      filePath = nonFlags[0];
    }

    const targetProject = projectId || 'PRJ-EOS-CONTROL-PLANE';

    try {
      const loop = new AutonomousLoopEngine({
        controlPlaneRoot: this.controlPlaneRoot || this.runtime?.controlPlaneRoot || resolveControlPlaneRoot()
      });

      // If a specific file is targeted or once mode is requested
      if (filePath || isOnce) {
        let target = filePath;
        if (!target) {
          target = 'src/core/index.js';
        }

        const passResult = loop.runSurgicalPass(target, {
          projectId: targetProject,
          heal: isHeal
        });

        if (isJson) {
          return {
            success: passResult.status === 'VERIFIED',
            output: JSON.stringify(passResult, null, 2),
            data: passResult
          };
        }

        return {
          success: passResult.status === 'VERIFIED',
          output: loop.formatLoopReport(passResult),
          data: passResult
        };
      }

      // Continuous Watcher Mode (Daemon)
      const targetDir = this.runtime?.controlPlaneRoot || resolveControlPlaneRoot();
      loop.startWatcher(targetDir, { projectId: targetProject, heal: isHeal }, (result) => {
        console.log(loop.formatLoopReport(result));
      });

      const message = `⚡ EOS AUTONOMOUS LOOP ACTIVE: Monitoring '${targetDir}' for mutations [Project: ${targetProject}]... (Press Ctrl+C to stop)`;
      return { success: true, output: isJson ? JSON.stringify({ status: 'ACTIVE', targetDir, targetProject }) : message };
    } catch (err) {
      return { success: false, output: `Loop Engine Failed: ${err.message}` };
    }
  }

  /**
   * eos orchestrate --project <PROJECT_ID> --pipeline [intake|recon|audit|verify|release]
   */
  async handleOrchestrateCommand(args = []) {
    const { projectId, phase } = parseOrchestrateArgs(args);
    if (!projectId) {
      return {
        success: false,
        output: `Error: Missing --project. Usage: eos orchestrate --project <PROJECT_ID> --pipeline [${PIPELINE_PHASES.join('|')}]`
      };
    }

    const root = resolveControlPlaneRoot({ cwd: process.cwd() });
    const pre = this.tutor.explainBefore({
      action_id: 'eos.orchestrate',
      objective: `Run unified pipeline phase ${phase} for ${projectId}`,
      concept: 'ProjectPipelineRunner — contract → auditors → satellite verify → EVD SHA-256',
      scope: ['docs/projects/registrations/', 'docs/evidence/', projectId],
      cwd: root,
      rationale: 'Removes manual terminal friction across the 21-step constitution phases',
      risks: ['Executes satellite lint/build/test when path is available'],
      expected_evidence: ['exitCode 0', 'EVD sealed with sha256-'],
      rollback: 'Delete generated EVD if run was exploratory',
      hitl_status: 'NOT_REQUIRED'
    });

    try {
      const runner = new ProjectPipelineRunner({ controlPlaneRoot: root });
      const result = await runner.run(projectId, phase);
      const post = this.tutor.explainAfter(
        { action_id: 'eos.orchestrate' },
        {
          observed: `${result.projectId}/${result.phase} → ${result.success ? 'VERIFIED' : 'FAILED'} (${result.sha256})`,
          exit_code: result.exitCode,
          classification: result.success ? 'VERIFIED' : 'RISK',
          interpretation: 'Unified pipeline completed without manual phase handoff',
          next_decision: result.success ? 'Review sealed evidence' : 'Inspect auditor/satellite failures'
        }
      );

      return {
        success: result.success,
        output: `${pre}\n\n🛰️ Pipeline ${result.phase} for ${result.projectId}\n- Auditors: ${result.steps.auditors?.status}\n- Satellite: ${result.steps.satelliteValidation?.status}\n- Evidence: ${result.evidencePath}\n- SHA-256: ${result.sha256}\n- Exit: ${result.exitCode}\n\n${post}`,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        output: `Orchestrate failed: ${err.message}`
      };
    }
  }

  handleMissionCommand(args = []) {
    if (args.length === 0) {
      return { success: false, output: "Missing subcommand. Usage: 'eos mission <create|inspect|plan|package|status|report|verify|submit|pause|resume|close>'" };
    }

    const sub = args[0];

    try {
      // 1. eos mission create --goal <text> [--project <path>]
      if (sub === 'create') {
        const goalIdx = args.indexOf('--goal');
        const projIdx = args.indexOf('--project');

        const goal = goalIdx !== -1 ? args[goalIdx + 1] : null;
        const projectPath = projIdx !== -1 ? args[projIdx + 1] : '.';

        if (!goal) {
          return { success: false, output: "Error: Missing required argument '--goal <text>'." };
        }

        const pre = this.tutor.explainBefore({
          action_id: 'mission.create',
          objective: 'Initialize a governed local mission from a human goal',
          concept: 'MissionRuntime.createMission + AuthorityTruthSource.initMission',
          scope: ['.missions/<id>', 'mission-package.json', 'authority-snapshot.json'],
          cwd: process.cwd(),
          rationale: 'Creates isolated mission storage under .missions without touching main/Fundacion',
          alternatives: ['Manual folder setup (error-prone)', 'Legacy npm run eos harness (not Mission OS)'],
          risks: ['Creates .missions directory', 'Discovery may read project files'],
          expected_evidence: ['mission_id', 'phase VISION_INTAKE', 'authority-snapshot.json'],
          rollback: 'Delete .missions/<mission_id> if unused',
          hitl_status: 'NOT_REQUIRED'
        });

        const res = this.runtime.createMission({ goal, projectPath });
        const post = this.tutor.explainAfter(
          { action_id: 'mission.create' },
          {
            observed: `Created ${res.mission_id} status=${res.status}`,
            exit_code: 0,
            classification: 'MEASURED',
            interpretation: 'Mission OS storage initialized; phase owned by ATS',
            next_decision: `Run eos mission plan ${res.mission_id}`
          }
        );
        return {
          success: true,
          output: `${pre}\n\n✅ Mission Created Successfully:\n- Mission ID: ${res.mission_id}\n- Target Project: ${res.project_id}\n- Storage Directory: ${res.mission_dir}\n- Status: ${res.status}\n\n${post}\n\nNext step: Run 'eos mission plan ${res.mission_id}' to generate tasks.`,
          data: res
        };
      }

      // 2. eos mission inspect <mission-id>
      if (sub === 'inspect') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const res = this.runtime.inspectMission(missionId);
        return {
          success: true,
          output: `📋 Mission Inspection [${res.mission_id}]:\n- Status: ${res.status} | Phase: ${res.phase}\n- Goal: ${res.direction.goal}\n- Target Project: ${res.profile.project_id}\n- Total Ledger Events: ${res.events_count}`,
          data: res
        };
      }

      // 3. eos mission plan <mission-id> [--hitl-receipt <path>] [--require-hitl]
      if (sub === 'plan') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const hitlIdx = args.indexOf('--hitl-receipt');
        const requireHitl = args.includes('--require-hitl');
        const spawnSdd = args.includes('--spawn-sdd');
        const sddOverride = args.includes('--sdd-override');
        const explicitSdd = args.includes('--explicit-sdd');
        let hitlReceipt = null;
        if (hitlIdx !== -1) {
          const receiptPath = args[hitlIdx + 1];
          if (!receiptPath) {
            return { success: false, output: "Error: --hitl-receipt requires a file path." };
          }
          hitlReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
        }

        const pre = this.tutor.explainBefore({
          action_id: 'mission.plan',
          objective: 'Advance mission through gated FSM to PLAN',
          concept: 'Canonical transitions + HITL at HUMAN_DIRECTION_GATE',
          scope: ['.missions/<id>/artifacts', 'plan.json', 'authority-snapshot.json'],
          rationale: this.runtime.rules.cite(['R-ATS-01', 'R-HITL-01']).join(' | '),
          risks: ['Issues LOCAL_BOUNDED fixture receipt unless --hitl-receipt/--require-hitl'],
          expected_evidence: ['phase PLAN', 'fsm_path recorded', 'tasks PLANNED'],
          rollback: 'mission pause; restore checkpoint; or delete disposable fixture',
          hitl_status: hitlReceipt ? 'EXTERNAL_RECEIPT' : requireHitl ? 'REQUIRED_EXTERNAL' : 'LOCAL_BOUNDED_FIXTURE_ALLOWED'
        });

        const res = this.runtime.planMission(missionId, {
          hitlReceipt,
          requireExternalHitl: requireHitl,
          spawnSddCeremony: spawnSdd,
          forceSddOverride: sddOverride,
          explicitSddRequest: explicitSdd
        });
        const post = this.tutor.explainAfter(
          { action_id: 'mission.plan' },
          {
            observed: `phase=${res.phase} tasks=${res.tasks_generated} steps=${(res.transitions || []).map((t) => t.event_type).join('→')}`,
            exit_code: 0,
            classification: 'MEASURED',
            interpretation: 'Canonical FSM path used; deprecated runtime.plan_mission bridge not invoked',
            next_decision: `eos mission package ${res.mission_id}`
          }
        );
        return {
          success: true,
          output: `${pre}\n\n📝 Mission Planned Successfully [${res.mission_id}]:\n- Phase: ${res.phase}\n- Organic route: ${res.plan.organic_routing?.route || 'n/a'} (size ignored)\n- Generated Tasks: ${res.tasks_generated}\n- FSM: ${(res.transitions || []).map((t) => t.event_type).join(' → ')}\n- Governance Gates: ${res.plan.governance_gates.join(', ')}\n\n${post}\n\nNext step: Run 'eos mission package ${res.mission_id} --target cursor' to generate operator handoff.`,
          data: res
        };
      }

      // 4. eos mission package <mission-id> [--target cursor]
      if (sub === 'package') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const targetIdx = args.indexOf('--target');
        const target = targetIdx !== -1 ? args[targetIdx + 1] : 'cursor';

        const pre = this.tutor.explainBefore({
          action_id: 'mission.package',
          objective: 'Compile a Cursor operator handoff from the planned mission',
          concept: 'MissionRuntime.packageMission → CURSOR_PROMPT.md',
          scope: ['.missions/<id>/cursor/'],
          rationale: 'Gives Cursor a bounded prompt without mutating Fundación',
          risks: ['Writes cursor/ artifacts only'],
          expected_evidence: ['CURSOR_PROMPT.md', 'manifest hash'],
          rollback: 'Delete .missions/<id>/cursor if unused',
          hitl_status: 'NOT_REQUIRED'
        });
        const res = this.runtime.packageMission(missionId, target);
        const post = this.tutor.explainAfter(
          { action_id: 'mission.package' },
          {
            observed: `packaged ${res.mission_id} target=${res.target}`,
            exit_code: 0,
            classification: 'MEASURED',
            interpretation: 'Operator package sealed; execute in Cursor then report',
            next_decision: `Open ${res.cursor_prompt_path} then eos mission report ${res.mission_id}`
          }
        );
        return {
          success: true,
          output: `${pre}\n\n📦 Cursor Mission Package Generated [${res.mission_id}]:\n- Target: ${res.target}\n- Manifest SHA-256: ${res.manifest_hash}\n- Operator Prompt: ${res.cursor_prompt_path}\n\n${post}`,
          data: res
        };
      }

      // 5. eos mission status <mission-id>
      if (sub === 'status') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const res = this.runtime.inspectMission(missionId);
        return {
          success: true,
          output: `📊 Mission Status [${res.mission_id}]: ${res.status} (Phase: ${res.phase})`,
          data: res
        };
      }

      // 6. eos mission report <mission-id> [--format json|markdown]
      if (sub === 'report') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const fmtIdx = args.indexOf('--format');
        const format = fmtIdx !== -1 ? args[fmtIdx + 1] : 'markdown';

        const res = this.runtime.reportMission(missionId, format);
        const output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
        return {
          success: true,
          output,
          data: res
        };
      }

      // 7. eos mission verify <mission-id>
      if (sub === 'verify') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const res = this.runtime.verifyMission(missionId, {
          strictTdd: args.includes('--strict-tdd')
        });
        const tddLine = res.tdd_audit
          ? `\n- TDD receipts: ${res.tdd_audit.code} (can_claim_verified=${res.tdd_audit.can_claim_verified})`
          : '';
        return {
          success: res.valid,
          output: res.valid
            ? `🔒 Cryptographic Verification PASSED [${res.mission_id}]:\n- Ledger Chain: VALID (${res.ledger_chain.count} events)\n- Manifest Files: 100% MATCH${tddLine}`
            : `❌ Verification FAILED [${res.mission_id}]:\n- Ledger Chain: ${res.ledger_chain.valid ? 'VALID' : 'CORRUPTED'}\n- Discrepancies:\n${res.discrepancies.map(d => `  - ${d}`).join('\n')}${tddLine}`,
          data: res
        };
      }

      // 8. eos mission pause <mission-id>
      if (sub === 'pause') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const res = this.runtime.pauseMission(missionId);
        return { success: true, output: `⏸️ Mission ${res.mission_id} is now PAUSED.`, data: res };
      }

      // 9. eos mission resume <mission-id>
      if (sub === 'resume') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const res = this.runtime.resumeMission(missionId);
        return { success: true, output: `▶️ Mission ${res.mission_id} is now ACTIVE.`, data: res };
      }

      // 10. eos mission close <mission-id>
      if (sub === 'close') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const pre = this.tutor.explainBefore({
          action_id: 'mission.close',
          objective: 'Close mission via commitTransition(mission.complete)',
          concept: 'Control transition to COMPLETED with FDIR pre-check',
          rationale: this.runtime.rules.cite(['R-ATS-01', 'R-FDIR-01']).join(' | '),
          risks: ['Blocked if FDIR safe mode tripped'],
          expected_evidence: ['phase COMPLETED'],
          rollback: 'Cannot un-complete; create new mission if needed',
          hitl_status: 'NOT_REQUIRED_FOR_CONTROL_COMPLETE'
        });
        const res = this.runtime.closeMission(missionId);
        const post = this.tutor.explainAfter(
          { action_id: 'mission.close' },
          {
            observed: `mission ${res.mission_id} closed`,
            exit_code: 0,
            classification: 'MEASURED',
            interpretation: 'Control transition committed through ATS',
            next_decision: 'Inspect ledger/report; do not claim production readiness'
          }
        );
        return {
          success: true,
          output: `${pre}\n\n🏁 Mission ${res.mission_id} is now CLOSED/COMPLETED.\n\n${post}`,
          data: res
        };
      }

      // 11. eos mission submit <mission-id> --file <return-pkg.json>
      if (sub === 'submit' || sub === 'ingest') {
        const missionId = args[1];
        if (!missionId) return { success: false, output: "Error: Missing '<mission-id>' argument." };

        const fileIdx = args.indexOf('--file') !== -1 ? args.indexOf('--file') : args.indexOf('--package');
        const pkgFile = fileIdx !== -1 ? args[fileIdx + 1] : args[2];

        if (!pkgFile) return { success: false, output: "Error: Missing return package file path. Usage: 'eos mission submit <id> --file <path>'" };

        const res = this.runtime.submitReturnPackage(missionId, pkgFile);
        const icon = res.verdict === 'ACCEPT' ? '✅' : (res.verdict === 'REJECT' ? '❌' : '⚠️');
        return {
          success: res.verdict === 'ACCEPT',
          output: `${icon} Cursor Return Ingested [${res.mission_id} / ${res.task_id}]:\n- Ingestion Verdict: ${res.verdict}\n- Reconciliation Hash: ${res.reconciliation_hash}\n- Deviations: ${res.deviations.length === 0 ? 'None (Clean)' : res.deviations.join(', ')}\n- Risks: ${res.risks.length === 0 ? 'None' : res.risks.join(', ')}\n- Auto-Apply Status: BLOCKED (Requires manual approval)`,
          data: res
        };
      }

      return { success: false, output: `Unknown mission subcommand: '${sub}'. Run 'eos --help' for usage.` };
    } catch (e) {
      return { success: false, output: `Command execution error: ${e.message}` };
    }
  }

  handleRoleCommand(args = []) {
    const sub = args[0] || 'list';

    if (sub === 'list') {
      const roles = this.runtime.roleRegistry.listRoles();
      const output = [
        '🎭 Canonical Agent Roles Catalog:',
        ...roles.map(r => `  - [${r.role_id}] ${r.name} (Max Auth: ${r.max_authority_level}, Budget: ${r.budget_tier})\n    ${r.description}`)
      ].join('\n');
      return { success: true, output, data: roles };
    }

    if (sub === 'inspect') {
      const roleId = args[1];
      if (!roleId) return { success: false, output: "Error: Missing role_id argument. Usage: 'eos role inspect <ROLE-ID>'" };
      const role = this.runtime.roleRegistry.getRole(roleId);
      if (!role) return { success: false, output: `Role '${roleId}' not found in registry.` };

      return {
        success: true,
        output: `📋 Role Profile [${role.role_id} - ${role.name}]:\n- Description: ${role.description}\n- Max Authority: ${role.max_authority_level}\n- Budget Tier: ${role.budget_tier}\n- Capabilities:\n${role.capabilities.map(c => `  * ${c.domain}: ${c.technologies.join(', ')} (${c.evidence_level})`).join('\n')}\n- Allowed Tools: ${role.allowed_tools.join(', ')}\n- Protected Surfaces: ${role.protected_surfaces.join(', ') || '(None)'}`,
        data: role
      };
    }

    return { success: false, output: `Unknown role subcommand: '${sub}'. Usage: 'eos role <list|inspect>'` };
  }

  handleVerifyCommand(args = []) {
    return {
      success: true,
      output: 'EOS Workspace Verification: Use `node scripts/verify-eos.js` or `eos mission verify <id>`.'
    };
  }

  handleNextCommand(argv = []) {
    const root = resolveControlPlaneRoot();
    const doctor = runOperatorDoctor({ root });
    const missions = listLocalMissions(this.runtime.missionsRoot);
    const suggestion = suggestNextAction({ doctorOk: doctor.ok, missions });
    const lessonCount = loadRecentLessons(root, 500).length;
    const apply = argv.includes('--apply');
    const applyBand = classifyApplyBand(suggestion.command);
    const card = formatNextReport({ doctor, suggestion, missions, lessonCount });

    if (!apply) {
      return {
        success: doctor.ok,
        output: card,
        data: { doctor, missions, suggestion, lessonCount, apply_band: applyBand, applied: false }
      };
    }

    if (applyBand !== 'LOW_RISK') {
      return {
        success: true,
        output: `${card}\nAPPLY: HITL_REQUIRED\nRUN MANUALLY: ${suggestion.command}`,
        data: { doctor, missions, suggestion, lessonCount, apply_band: applyBand, applied: false, hitl_required: true }
      };
    }

    const applied = this._applyLowRiskSuggestion(suggestion);
    return {
      success: applied.success,
      output: `${card}\nAPPLY: EXECUTED\n${applied.output}`,
      data: { doctor, missions, suggestion, lessonCount, apply_band: applyBand, applied: true, apply_result: applied.data }
    };
  }

  _applyLowRiskSuggestion(suggestion) {
    const cmd = suggestion.command || '';
    if (cmd === 'eos doctor') {
      return this.handleDoctorCommand();
    }
    const inspect = cmd.match(/^eos mission inspect\s+(\S+)/);
    if (inspect) {
      return this.handleMissionCommand(['inspect', inspect[1]]);
    }
    const report = cmd.match(/^eos mission report\s+(\S+)/);
    if (report) {
      return this.handleMissionCommand(['report', report[1]]);
    }
    return {
      success: false,
      output: `APPLY_REFUSED: unrecognized low-risk command ${cmd}`
    };
  }

  handleDoctorCommand() {
    const root = resolveControlPlaneRoot();
    const report = runOperatorDoctor({ root });
    const pre = this.tutor.explainBefore({
      action_id: 'eos.doctor',
      objective: 'Verify the local control plane is pinned to this repo, not the user home folder',
      concept: 'OperatorDoctor — read-only file and MCP pin checks',
      scope: ['bin/eos.js', 'src/mcp-server.js', '.cursor/mcp.json'],
      cwd: root,
      rationale: 'A homedir leak makes MCP report 0 missions and look like simulation',
      risks: ['None — read only'],
      expected_evidence: ['VERDICT PASS', 'HOMEDIR_LEAK NO'],
      rollback: 'No mutation',
      hitl_status: 'NOT_REQUIRED'
    });
    const after = this.tutor.explainAfter(
      { action_id: 'eos.doctor' },
      {
        observed: report.ok ? 'Control plane healthy' : `Failed: ${report.failed.join(', ')}`,
        classification: report.ok ? 'VERIFIED' : 'RISK',
        next_decision: report.ok ? 'Create or inspect a mission' : 'Fix MCP cwd/args to the EOS repo'
      }
    );
    return {
      success: report.ok,
      output: `${pre}\n\n${formatDoctorReport(report)}\n\n${after}`,
      data: report
    };
  }

  /**
   * eos simplify [path|--project <id>] [--json] [--strict]
   */
  async handleSimplifyCommand(args = []) {
    const isJson = args.includes('--json');
    const isStrict = args.includes('--strict');
    const projectIdx = args.indexOf('--project');
    let projectId = null;
    if (projectIdx !== -1 && args[projectIdx + 1]) {
      projectId = args[projectIdx + 1];
    }

    let targetPath = null;
    const nonFlagArgs = args.filter(a => !a.startsWith('--') && (projectIdx === -1 || (a !== projectId && a !== args[projectIdx])));
    if (nonFlagArgs.length > 0) {
      targetPath = nonFlagArgs[0];
    }

    const workspaceRoot = this.runtime.baseDir;
    const controlRoot = resolveControlPlaneRoot();
    const emptyJson = {
      filesAnalyzed: 0,
      averageBloatIndex: 0,
      overEngineeredFilesCount: 0,
      results: []
    };
    const toJson = (payload) => JSON.stringify(payload, null, 2);

    const pre = isJson ? '' : this.tutor.explainBefore({
      action_id: 'eos.simplify',
      objective: `Analyze code complexity and eliminate post-green bloat${projectId ? ` for project ${projectId}` : targetPath ? ` at ${targetPath}` : ''}`,
      concept: 'First-Principles Simplifier (Musk Rule 2 / Boris Cherny post-green pattern)',
      scope: [targetPath || projectId || 'workspace'],
      cwd: controlRoot,
      rationale: 'Prunes unnecessary wrappers, empty stubs, and bloat before commit',
      expected_evidence: ['bloatIndex < 4.0', 'simplification recommendations'],
      risks: ['Read-only analysis; no destructive changes'],
      rollback: 'N/A',
      hitl_status: 'NOT_REQUIRED'
    });

    const engine = new FirstPrinciplesSimplifierEngine();
    const filesToScan = [];

    const collectFiles = (dir) => {
      if (!fs.existsSync(dir)) return;
      const stat = fs.statSync(dir);
      if (stat.isFile()) {
        if (/\.(js|mjs|ts|tsx|py)$/.test(dir) && !dir.includes('node_modules') && !dir.includes('.git') && !dir.includes('dist') && !dir.includes('.next')) {
          filesToScan.push(dir);
        }
        return;
      }
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.missions') continue;
        if (['node_modules', 'dist', '.next', '.git', 'build', '.tempmediaStorage', '.user_uploaded'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectFiles(full);
        } else if (/\.(js|mjs|ts|tsx|py)$/.test(entry.name)) {
          filesToScan.push(full);
        }
      }
    };

    if (projectId) {
      const registryCandidates = [
        { regDir: path.join(workspaceRoot, 'docs', 'projects', 'registrations'), root: workspaceRoot },
        { regDir: path.join(controlRoot, 'docs', 'projects', 'registrations'), root: controlRoot }
      ];
      let foundPath = null;
      let foundRoot = workspaceRoot;
      const seenRegDirs = new Set();
      for (const { regDir, root: candidateRoot } of registryCandidates) {
        if (seenRegDirs.has(regDir) || !fs.existsSync(regDir)) continue;
        seenRegDirs.add(regDir);
        for (const file of fs.readdirSync(regDir)) {
          if (!file.endsWith('.json')) continue;
          try {
            const reg = JSON.parse(fs.readFileSync(path.join(regDir, file), 'utf8'));
            const pIdUpper = projectId.toUpperCase();
            if (
              reg.project_id === pIdUpper ||
              reg.projectId === pIdUpper ||
              reg.id === pIdUpper ||
              file.replace('.json', '').toUpperCase() === pIdUpper.replace('PRJ-', '')
            ) {
              foundPath = reg.path || reg.projectRoot || reg.local_path || reg.root;
              foundRoot = candidateRoot;
              break;
            }
          } catch {
            // Skip malformed registration files
          }
        }
        if (foundPath) break;
      }
      if (!foundPath) {
        const message = `Error: Project '${projectId}' not found in registry (docs/projects/registrations/).`;
        return {
          success: false,
          output: isJson ? toJson({ error: message }) : message
        };
      }
      const resolvedProject = path.isAbsolute(foundPath)
        ? foundPath
        : path.resolve(foundRoot, foundPath);
      collectFiles(resolvedProject);
    } else if (targetPath) {
      const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
      collectFiles(resolved);
    } else {
      const defaultSrc = path.join(process.cwd(), 'src');
      if (fs.existsSync(defaultSrc)) {
        collectFiles(defaultSrc);
      } else {
        collectFiles(process.cwd());
      }
    }

    if (filesToScan.length === 0) {
      if (isJson) {
        return {
          success: isStrict ? false : true,
          output: toJson(emptyJson),
          data: { fileResults: [], avgBloat: '0.0', overEngineeredCount: 0 }
        };
      }
      return {
        success: true,
        output: `${pre}\n\nℹ️  No matching source files (.js, .ts, .tsx, .py) found to analyze.`
      };
    }

    const fileResults = [];
    let totalBloat = 0;
    let overEngineeredCount = 0;

    for (const filePath of filesToScan) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const analysis = engine.analyzeCodeComplexity(content);
        const plan = engine.generateSimplificationPlan(analysis);
        totalBloat += analysis.bloatIndex;
        if (analysis.isOverEngineered) overEngineeredCount++;

        fileResults.push({
          file: path.relative(controlRoot, filePath),
          bloatIndex: analysis.bloatIndex,
          isOverEngineered: analysis.isOverEngineered,
          metrics: analysis.metrics,
          recommendations: plan.recommendations,
          estimatedLinesSaved: plan.estimated_lines_saved
        });
      } catch {
        // Ignore read errors on binary or unreadable files
      }
    }

    const avgBloat = fileResults.length > 0 ? (totalBloat / fileResults.length).toFixed(1) : '0.0';

    if (isJson) {
      return {
        success: isStrict ? overEngineeredCount === 0 : true,
        output: toJson({
          filesAnalyzed: fileResults.length,
          averageBloatIndex: parseFloat(avgBloat),
          overEngineeredFilesCount: overEngineeredCount,
          results: fileResults
        }),
        data: { fileResults, avgBloat, overEngineeredCount }
      };
    }

    const post = this.tutor.explainAfter(
      { action_id: 'eos.simplify' },
      {
        observed: `Analyzed ${fileResults.length} files. Avg Bloat: ${avgBloat}/10. Over-engineered: ${overEngineeredCount}.`,
        classification: overEngineeredCount === 0 ? 'VERIFIED' : 'FINDINGS_IDENTIFIED',
        next_decision: overEngineeredCount === 0 ? 'Code is clean and minimal (KISS). Proceed to commit.' : 'Execute simplification recommendations to prune unnecessary bloat.'
      }
    );

    const overEngineeredList = fileResults
      .filter(f => f.isOverEngineered)
      .slice(0, 10);

    let report = `
================================================================================
🧹 EOS FIRST-PRINCIPLES CODE SIMPLIFIER (Post-Green Harness Gate)
================================================================================
Files Analyzed:        ${fileResults.length}
Average Bloat Index:   ${avgBloat} / 10.0
Over-Engineered Files: ${overEngineeredCount} ${overEngineeredCount > 0 ? '⚠️' : '✅'}
Status:                ${overEngineeredCount === 0 ? 'CLEAN & MINIMAL (KISS)' : 'PRUNING REQUIRED'}
================================================================================
`;

    if (overEngineeredList.length > 0) {
      report += `\n🚨 HIGH BLOAT DETECTED IN THE FOLLOWING FILES:\n`;
      for (const item of overEngineeredList) {
        report += `\n📄 ${item.file} (Bloat Index: ${item.bloatIndex}/10)\n`;
        report += `   - Metrics: ${item.metrics.codeLines} lines | Cyclomatic: ${item.metrics.estimatedCyclomaticComplexity} | Wrappers: ${item.metrics.passThroughWrappersCount} | Stubs: ${item.metrics.emptyClassesCount}\n`;
        if (item.recommendations.length > 0) {
          report += `   - Recommendations:\n`;
          for (const rec of item.recommendations) {
            report += `     • [${rec.action}]: ${rec.rationale} (Est. -${rec.estimatedLineReduction || rec.estimatedComplexityReduction} lines/branches)\n`;
          }
        }
      }
    } else {
      report += `\n✨ Outstanding craftsmanship! All analyzed code is lean, direct, and free of unnecessary abstractions.\n`;
    }

    return {
      success: isStrict ? overEngineeredCount === 0 : true,
      output: `${pre}\n\n${report}\n${post}`,
      data: { fileResults, avgBloat, overEngineeredCount }
    };
  }

  /**
   * eos elevate [target-path] [--mode=audit|heal] [--format=json|markdown|table] [--strict]
   */
  async handleElevateCommand(args = []) {
    const isJson = args.includes('--json') || args.some(a => a === '--format=json');
    const isMarkdown = args.some(a => a === '--format=markdown');
    const isStrict = args.includes('--strict');
    const modeArg = args.find(a => a.startsWith('--mode='));
    const mode = modeArg ? modeArg.split('=')[1] : 'audit';

    const nonFlagArgs = args.filter(a => !a.startsWith('--'));
    const targetPath = path.resolve(process.cwd(), nonFlagArgs[0] || '.');

    const orchestrator = new ElevateOrchestrator({ targetPath });
    const result = await orchestrator.execute({ mode, strict: isStrict });

    if (isJson) {
      return {
        success: isStrict ? result.summary.bySeverity.critical === 0 : true,
        output: JSON.stringify(result, null, 2),
        data: result
      };
    }

    if (isMarkdown) {
      return {
        success: isStrict ? result.summary.bySeverity.critical === 0 : true,
        output: result.markdownReport,
        data: result
      };
    }

    let report = `
================================================================================
🏆 EOS-ELEVATE — Elite Autonomous Remediation & Code Elevation Engine
================================================================================
Target:    ${result.targetPath}
Mode:      ${result.mode.toUpperCase()}
Timestamp: ${new Date().toISOString()}
--------------------------------------------------------------------------------

🔍 MULTI-VECTOR AUDIT RESULTS:
   Scanned Files:  ${result.summary.totalScannedFiles}
   Total Findings: ${result.summary.totalFindings}
   - Security:      ${result.summary.byVector.security} (Critical: ${result.summary.bySeverity.critical}, High: ${result.summary.bySeverity.high})
   - Architecture:  ${result.summary.byVector.architecture}
   - Quality:       ${result.summary.byVector.quality}
   - Performance:   ${result.summary.byVector.performance}
   - Accessibility: ${result.summary.byVector.accessibility}

🔑 Cryptographic Root Digest (SHA-256):
   ${result.evidence.digest}
`;

    if (result.findings.length > 0) {
      report += '\n📋 TOP ACTIONABLE FINDINGS:\n';
      result.findings.slice(0, 5).forEach((f, idx) => {
        report += `   ${idx + 1}. [${f.severity}] ${f.ruleId} @ ${f.file}:${f.line}\n`;
        report += `      ${f.message}\n`;
      });
      if (result.findings.length > 5) {
        report += `   ... and ${result.findings.length - 5} additional finding(s). Run with --format=markdown for full breakdown.\n`;
      }
    } else {
      report += '\n✨ ZERO DEFECTS: Target codebase meets elite Tier-1 engineering standards.\n';
    }

    report += '\n================================================================================\n';
    report += `STATUS: ${result.status} · Epistemic: AUDIT_EXECUTED · Exit Code: 0\n`;
    report += '================================================================================\n';

    return {
      success: isStrict ? result.summary.bySeverity.critical === 0 : true,
      output: report,
      data: result
    };
  }

  getHelp() {
    return `
================================================================================
EOS CONTROL PLANE CLI (v3.1.0) — Autonomous Engineering Governance
================================================================================

USAGE:
  eos
  eos next
  eos next --apply
  eos doctor
  eos fleet [--json]
  eos project onboard <path>
  eos trace [--project <id>] [--file <path>] [--entity <id>] [--json]
  eos loop [--project <id>] [--file <path>] [--once] [--heal] [--json]
  eos orchestrate --project <PROJECT_ID> --pipeline [intake|recon|audit|verify|release]
  eos simplify [path|--project <id>] [--json] [--strict]
  eos mission <command> [options]
  eos role list

COMMANDS:
  eos / eos next
      Suggest the next local governed command from doctor + mission phase.

  eos next --apply
      Execute the next command only if APPLY_BAND is LOW_RISK (doctor, inspect, report).
      create/plan/package/submit/close stay HITL_REQUIRED.

  eos doctor
      Read-only check: control-plane files, MCP pin, no homedir leak.

  eos trace [--project <id>] [--file <path>] [--entity <id>] [--json]
      Enterprise Relational Traceability Matrix (RTM) & Causal Blast Radius Engine.
      Traces 7 layers (Intake ↔ Spec ↔ Plan ↔ Task ↔ Code ↔ Test ↔ Evidence)
      and calculates transitive mutation blast radius with risk tier classification.

  eos loop [--project <id>] [--file <path>] [--once] [--heal] [--json]
      Closed-loop mutation sensor and surgical TDD auto-healer.
      Monitors file mutations, resolves impacted test suites via RTM in milliseconds,
      executes surgical verification passes, and isolates regression root causes.

  eos orchestrate --project <PROJECT_ID> --pipeline <phase>
      Unified pipeline runner: registration contract → concurrent auditors →
      satellite lint/build/test validation → cryptographic EVD seal.

  eos simplify [path|--project <id>] [--json] [--strict]
      First-principles code bloat analyzer (Musk Rule 2 / Boris Cherny post-green harness).
      Detects unnecessary wrapper layers, empty class stubs, and high cyclomatic branches.

  eos mission create --goal "<text>" [--project <path>]
      Initializes a new mission, discovers project profile, and creates .missions/<id>/

  eos mission inspect <mission-id>
      Displays current mission phase, direction, and ledger state.

  eos mission plan <mission-id> [--spawn-sdd] [--explicit-sdd] [--sdd-override]
      Generates atomic task contracts, roles, budgets, and plan.json.
      --spawn-sdd fail-closes unless --explicit-sdd, accepted proposal, or --sdd-override
      (ADR-0010: size alone does not force SDD).

  eos mission package <mission-id> [--target cursor]
      Compiles the compact Cursor Mission Package (CURSOR_PROMPT.md and JSON).

  eos mission status <mission-id>
      Quick query of mission status and active phase.

  eos mission report <mission-id> [--format json|markdown]
      Compiles and renders the Executive Mission Report with metric provenance.

  eos mission submit <mission-id> --file <return-pkg.json>
      Ingests and reconciles a Cursor Return Package against task contracts.

  eos mission verify <mission-id> [--strict-tdd]
      Verifies cryptographic SHA-256 hash chaining, integrity manifest, and
      (when Strict TDD is in scope) RED→GREEN TDD evidence receipts.

  eos mission submit <mission-id> --file <return-pkg.json>
      Ingests a Cursor Return Package (anti-replay, protected surfaces, secrets, tools).

  eos mission pause <mission-id>
      Transitions mission to PAUSED and logs state snapshot in ledger.

  eos mission resume <mission-id>
      Transitions paused mission back to ACTIVE.

  eos mission close <mission-id>
      Concludes mission only if ATS phase matches package and verifyMission is valid.

  eos doctor
      Operator health check: CLI help, schema load, rules index, homedir leak.

  eos elevate [target-path] [--mode=audit|heal] [--strict]
      Elite autonomous multi-vector code audit, root cause analysis, and TDD healing.

SAFETY INVARIANTS:
  - Default Authority: LEVEL_0 / READ_ONLY
  - External Network: Strictly BLOCKED
  - Project Mutation: Zero mutation outside authorized worktrees (Δ = 0)
================================================================================
`;
  }
}
