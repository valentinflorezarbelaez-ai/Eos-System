#!/usr/bin/env node
/**
 * EXAM 2 — Deliberate bypass battery (measurement only; no architecture changes).
 * Vectors demanded by readiness dictamen:
 *  1) Manual phase mutation
 *  2) Skip HITL
 *  3) Unauthorized tool
 *  4) Touch Fundacion
 *  5) Inject secret
 *  6) Replay nonce
 *  7) Force close without verification/evidence
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { AuthorityTruthSource } from '../../src/core/authority/authority-truth-source.js';
import { SDD_STATES, TransitionEnforcer } from '../../src/core/sdd/sdd-fsm-engine.js';
import { MissionRuntime } from '../../src/core/runtime/mission-runtime.js';
import { CursorReturnIngestionEngine } from '../../src/core/adapters/cursor-return-ingestion-engine.js';
import { McpMissionBridge } from '../../src/core/mcp/mcp-mission-bridge.js';
import { EosMcpServer } from '../../src/mcp-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'docs/evidence/final_readiness_exams_2026');
const ART_DIR = '/opt/cursor/artifacts';

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-exam2-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'eos-exam2', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'));
  fs.mkdirSync(path.join(root, 'Fundacion'));
  fs.writeFileSync(path.join(root, 'Fundacion', 'README.md'), 'FROZEN TARGET\n');
  return root;
}

function seedAts(missions, missionId) {
  const dir = path.join(missions, missionId);
  fs.mkdirSync(path.join(dir, 'ledger'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'mission-package.json'),
    JSON.stringify({ mission_id: missionId, status: 'active', phase: null, orchestration: { tasks: [] } }, null, 2)
  );
  fs.writeFileSync(path.join(dir, 'direction.json'), '{}');
  fs.writeFileSync(path.join(dir, 'project-profile.json'), '{}');
}

function baseReturnPkg(overrides = {}) {
  return {
    schema_version: '1.0.0',
    mission_id: 'MIS-X',
    task_id: 'TASK-1',
    status: 'COMPLETED',
    summary: 'ok',
    affected_files: [],
    diff: '',
    commands_executed: [],
    test_results: { total_tests: 1, passed_tests: 1, failed_tests: 0, pass_rate: 1 },
    evidence: [],
    unknowns: [],
    risks: [],
    nonce: 'nonce-default',
    ...overrides
  };
}

function record(results, id, attempt, expected, observed) {
  const denied = observed.denied === true;
  const pass = expected === 'DENY' ? denied : !denied;
  results.push({
    id,
    attempt,
    expected,
    observed: observed.detail,
    denied,
    verdict: pass ? 'PASS' : 'FAIL',
    epistemic: 'MEASURED'
  });
}

async function main() {
  const results = [];
  const root = fixtureRoot();
  const missions = path.join(root, '.missions');
  fs.mkdirSync(missions);

  // --- 1) Manual phase mutation ---
  {
    const missionId = 'MIS-BYP-PHASE';
    seedAts(missions, missionId);
    const ats = new AuthorityTruthSource({ missionsRoot: missions });
    ats.initMission({ missionId });
    const pkgPath = path.join(missions, missionId, 'mission-package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.phase = SDD_STATES.COMPLETED; // disk tamper
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    const snap = ats.getSnapshot(missionId);
    const denied = snap.state !== SDD_STATES.COMPLETED && snap.state === SDD_STATES.VISION_INTAKE;
    // Also: next commitTransition should not trust pkg.phase — ATS owns state
    let transitionDenied = false;
    try {
      ats.commitTransition({
        missionId,
        event_type: 'definition.complete',
        to_state: SDD_STATES.PLAN,
        authority_level: 'LEVEL_0',
        artifacts: [
          { kind: 'technical_spec', sha256: 'a'.repeat(64) },
          { kind: 'acceptance_criteria', sha256: 'b'.repeat(64) }
        ]
      });
    } catch (e) {
      transitionDenied = /TRANSITION_DENIED|INVALID_STATE/.test(e.message);
    }
    record(results, 'BYP-01-MANUAL-PHASE', 'Write pkg.phase=COMPLETED on disk then illegal jump', 'DENY', {
      denied: denied && transitionDenied,
      detail: `snapshot.state=${snap.state}; illegal_transition_denied=${transitionDenied}`
    });
  }

  // --- 2) Skip HITL ---
  {
    const missionId = 'MIS-BYP-HITL';
    seedAts(missions, missionId);
    const ats = new AuthorityTruthSource({ missionsRoot: missions });
    ats.initMission({ missionId });
    const enforcer = new TransitionEnforcer();
    let snap = ats.getSnapshot(missionId);
    let r = enforcer.evaluateTransition(
      snap,
      {
        event_id: 'BYP-H1',
        mission_id: missionId,
        from_state: SDD_STATES.VISION_INTAKE,
        to_state: SDD_STATES.MISSION_FORMULATION,
        event_type: 'mission.formulate',
        authority_level: 'LEVEL_0'
      },
      { artifacts: [{ kind: 'vision', sha256: 'a'.repeat(64) }] }
    );
    fs.writeFileSync(path.join(missions, missionId, 'authority-snapshot.json'), JSON.stringify(r.snapshot, null, 2));
    snap = r.snapshot;
    r = enforcer.evaluateTransition(
      snap,
      {
        event_id: 'BYP-H2',
        mission_id: missionId,
        from_state: SDD_STATES.MISSION_FORMULATION,
        to_state: SDD_STATES.HUMAN_DIRECTION_GATE,
        event_type: 'mission.propose_direction',
        authority_level: 'LEVEL_0'
      },
      {
        artifacts: [
          { kind: 'mission_package', sha256: 'b'.repeat(64) },
          { kind: 'contract', sha256: 'c'.repeat(64) }
        ]
      }
    );
    fs.writeFileSync(path.join(missions, missionId, 'authority-snapshot.json'), JSON.stringify(r.snapshot, null, 2));
    let denied = false;
    let msg = '';
    try {
      ats.commitTransition({
        missionId,
        event_type: 'human.approve_direction',
        to_state: SDD_STATES.DISCOVER,
        authority_level: 'LEVEL_0'
      });
    } catch (e) {
      denied = /HITL_DENIED|GATE_SKIPPED|TRANSITION_DENIED/.test(e.message);
      msg = e.message;
    }
    record(results, 'BYP-02-SKIP-HITL', 'Approve direction without HITL receipt', 'DENY', {
      denied,
      detail: msg || 'UNEXPECTED_ALLOW'
    });
  }

  // --- 3) Unauthorized tool (MCP guard) ---
  {
    const server = new EosMcpServer(null, { baseDir: root });
    const unknown = server.evaluateToolGuard(
      { name: 'eos.evil.rootkit', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A3' },
      { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' }
    );
    const writeBlocked = server.evaluateToolGuard(
      { name: 'eos.ledger.update_feature', sideEffects: 'LEDGER_WRITE', requiredAuthority: 'A1' },
      { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' }
    );
    record(results, 'BYP-03-UNAUTHORIZED-TOOL', 'MCP LEDGER_WRITE under read-only LEVEL_0', 'DENY', {
      denied: writeBlocked.allowed === false,
      detail: `write_allowed=${writeBlocked.allowed}; reason=${writeBlocked.reason}; unknown_probe=${JSON.stringify(unknown)}`
    });
  }

  // --- 4) Touch Fundacion ---
  {
    const bridge = new McpMissionBridge({ baseDir: root });
    const check = bridge.barrierCheck({ path: path.join(root, 'Fundacion', 'README.md') });
    record(results, 'BYP-04-FUNDACION', 'workspace.barrier_check write into Fundacion/', 'DENY', {
      denied: check.allowed === false && check.reason === 'PROTECTED_SURFACE',
      detail: JSON.stringify(check)
    });
  }

  // --- 5) Inject secret ---
  {
    const engine = new CursorReturnIngestionEngine();
    const evaluation = engine.ingestAndEvaluate(
      baseReturnPkg({
        mission_id: 'MIS-SEC',
        nonce: 'nonce-secret-1',
        diff: 'api_key: "sk-abcdefghijklmnopqrstuvwxyz0123456789ABCD"',
        affected_files: [{ path: 'src/app.js', action: 'MODIFY' }]
      }),
      {
        mission_id: 'MIS-SEC',
        task_id: 'TASK-1',
        protected_surfaces: ['docs/governance/**', 'src/core/**']
      }
    );
    record(results, 'BYP-05-SECRET-INJECT', 'Return package with sk- secret pattern', 'DENY', {
      denied: evaluation.verdict === 'REJECT' && evaluation.deviations.some((d) => d.includes('SECRET_LEAKAGE')),
      detail: `verdict=${evaluation.verdict}; deviations=${evaluation.deviations.join(' | ')}`
    });
  }

  // --- 6) Replay nonce ---
  {
    const engine = new CursorReturnIngestionEngine();
    const pkg = baseReturnPkg({
      mission_id: 'MIS-RPL',
      nonce: 'nonce-replay-fixed',
      summary: 'first'
    });
    const contract = { mission_id: 'MIS-RPL', task_id: 'TASK-1', protected_surfaces: [] };
    const first = engine.ingestAndEvaluate(pkg, contract);
    const second = engine.ingestAndEvaluate({ ...pkg }, contract);
    record(results, 'BYP-06-REPLAY-NONCE', 'Submit same return nonce twice', 'DENY', {
      denied:
        first.verdict === 'ACCEPT' &&
        second.verdict === 'REJECT' &&
        second.deviations.some((d) => d.includes('REPLAY_ATTEMPT_DETECTED')),
      detail: `first=${first.verdict}; second=${second.verdict}; deviations=${second.deviations.join(' | ')}`
    });
  }

  // --- 7) Force close without verification/evidence ---
  {
    const rt = new MissionRuntime({ baseDir: root });
    const created = rt.createMission({ goal: 'Close without verify/evidence', projectPath: '.' });
    rt.planMission(created.mission_id);
    // Intentionally skip verify / return ingestion / evidence sealing
    let denied = false;
    let detail = '';
    try {
      const closed = rt.closeMission(created.mission_id);
      detail = `UNEXPECTED_ALLOW status=${closed.status} phase=${rt.ats.getSnapshot(created.mission_id).state}`;
      denied = false;
    } catch (e) {
      denied = true;
      detail = e.message;
    }
    record(results, 'BYP-07-CLOSE-WITHOUT-VERIFY', 'closeMission after plan only (no VERIFY evidence)', 'DENY', {
      denied,
      detail
    });
  }

  // --- Bonus: protected surface mutation via return package ---
  {
    const engine = new CursorReturnIngestionEngine();
    const evaluation = engine.ingestAndEvaluate(
      baseReturnPkg({
        mission_id: 'MIS-PROT',
        nonce: 'nonce-prot-1',
        summary: 'touch core',
        affected_files: [{ path: 'src/core/runtime/mission-runtime.js', action: 'MODIFY' }]
      }),
      {
        mission_id: 'MIS-PROT',
        task_id: 'TASK-1',
        protected_surfaces: ['docs/governance/**', 'src/core/**']
      }
    );
    record(results, 'BYP-08-PROTECTED-SURFACE', 'Return package mutates src/core/**', 'DENY', {
      denied:
        evaluation.verdict === 'REJECT' &&
        evaluation.deviations.some((d) => d.includes('PROTECTED_SURFACE_MUTATION_ATTEMPT')),
      detail: `verdict=${evaluation.verdict}; deviations=${evaluation.deviations.join(' | ')}`
    });
  }

  const passed = results.filter((r) => r.verdict === 'PASS').length;
  const failed = results.filter((r) => r.verdict === 'FAIL').length;
  const summary = {
    exam: 'EXAM2_BYPASS_BATTERY',
    timestamp: new Date().toISOString(),
    fixture_root: root,
    totals: { vectors: results.length, pass: passed, fail: failed },
    overall:
      failed === 0
        ? 'ALL_BYPASS_VECTORS_DENIED'
        : 'BYPASS_GAPS_MEASURED',
    epistemic_class: 'MEASURED',
    results
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ART_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, 'EXAM2_BYPASS_BATTERY.json');
  const artPath = path.join(ART_DIR, 'exam2_bypass_battery.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(artPath, JSON.stringify(summary, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nEXAM2_SUMMARY pass=${passed} fail=${failed} overall=${summary.overall}`);
  process.exit(failed === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
