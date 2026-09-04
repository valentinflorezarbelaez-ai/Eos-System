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
import fs from 'node:fs';

export class MissionCLI {
  constructor(options = {}) {
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
    return {
      success: false,
      output: `Unknown command: '${command}'. Run 'eos --help' for usage.`
    };
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
  eos orchestrate --project <PROJECT_ID> --pipeline [intake|recon|audit|verify|release]
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

  eos orchestrate --project <PROJECT_ID> --pipeline <phase>
      Unified pipeline runner: registration contract → concurrent auditors →
      satellite lint/build/test validation → cryptographic EVD seal.

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

SAFETY INVARIANTS:
  - Default Authority: LEVEL_0 / READ_ONLY
  - External Network: Strictly BLOCKED
  - Project Mutation: Zero mutation outside authorized worktrees (Δ = 0)
================================================================================
`;
  }
}
