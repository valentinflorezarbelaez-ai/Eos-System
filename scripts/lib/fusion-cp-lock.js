/**
 * @module fusion-cp-lock
 * M1 — Strict-verify fusion control-plane lock (Ladder 2 G1).
 *
 * Fail-closed existence + light import/API smoke for Write Barrier,
 * Mission Loop runtime, MCP SSOT (+ sync contract), long-run GameDay harness,
 * and ADR-0013/0014. No full GameDay soak (keep CI fast).
 *
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  authorizeWrite,
  withWriteScope,
  barrierCheck,
  isFundacionPath
} from '../../src/core/write-barrier/index.js';
import {
  MISSION_LOOP_STAGES,
  evaluateStageTransition,
  createInitialLoopState,
  isMissionLoopStage
} from '../../src/core/mcp/mission-loop.js';
import { MissionLoopRuntime } from '../../src/core/mcp/mission-loop-runtime.js';
import { loadSsot, runSync } from '../mcp-ssot-sync.js';
import {
  LongRunGameDayHarness,
  DEFAULT_CI_ITERATIONS,
  FAULT_CATALOG
} from '../../src/core/adversarial/long-run-gameday-harness.js';

/** Relative paths that must exist for fusion control-plane integrity. */
export const FUSION_CP_REQUIRED_PATHS = Object.freeze([
  'src/core/write-barrier/index.js',
  'src/core/write-barrier/authorize.js',
  'src/core/write-barrier/scope.js',
  'src/core/mcp/mission-loop.js',
  'src/core/mcp/mission-loop-runtime.js',
  'config/mcp/eos-mcp.ssot.json',
  'scripts/mcp-ssot-sync.js',
  'src/core/adversarial/long-run-gameday-harness.js',
  'docs/architecture/adrs/ADR-0013-write-barrier-sandbox.md',
  'docs/architecture/adrs/ADR-0014-mission-loop-mcp-enforcement.md'
]);

/**
 * @param {string} rootDir
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditFusionControlPlane(rootDir) {
  const checks = [];
  const failures = [];
  const root = path.resolve(rootDir || process.cwd());

  for (const rel of FUSION_CP_REQUIRED_PATHS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      failures.push({
        path: rel,
        message: 'Fusion CP required path missing',
        type: 'fusion-cp-lock'
      });
    } else {
      checks.push({
        path: rel,
        status: 'VERIFIED',
        type: 'fusion-cp-lock'
      });
    }
  }

  if (failures.length > 0) {
    return { ok: false, checks, failures };
  }

  // --- Write Barrier light smoke ---
  try {
    if (typeof authorizeWrite !== 'function' || typeof withWriteScope !== 'function') {
      throw new Error('Write Barrier API surface incomplete');
    }
    if (typeof barrierCheck !== 'function' || typeof isFundacionPath !== 'function') {
      throw new Error('Write Barrier barrierCheck/isFundacionPath missing');
    }
    const fundacionProbe = path.join(os.homedir(), 'Documents', 'Fundacion', 'm1-probe.txt');
    const fundacionVerdict = authorizeWrite(fundacionProbe, {
      repoRoot: root,
      requireScope: false
    });
    if (fundacionVerdict.allowed !== false) {
      throw new Error('Write Barrier Fundacion deny smoke failed (allowed=true)');
    }
    const noScope = authorizeWrite(path.join(root, 'src', 'core', 'write-barrier', 'index.js'), {
      repoRoot: root,
      requireScope: true
    });
    if (noScope.allowed !== false) {
      throw new Error('Write Barrier requireScope=true without ALS should DENY');
    }
    checks.push({
      path: 'WriteBarrier (API + Fundacion DENY + scope fail-closed)',
      status: 'VERIFIED',
      type: 'fusion-cp-write-barrier'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/write-barrier/index.js',
      message: 'Write Barrier smoke failed: ' + err.message,
      type: 'fusion-cp-write-barrier'
    });
  }

  // --- Mission Loop runtime light smoke ---
  try {
    if (!MISSION_LOOP_STAGES || !MISSION_LOOP_STAGES.INTENT) {
      throw new Error('MISSION_LOOP_STAGES missing Intent');
    }
    if (typeof evaluateStageTransition !== 'function' || typeof createInitialLoopState !== 'function') {
      throw new Error('Mission loop API surface incomplete');
    }
    if (typeof MissionLoopRuntime !== 'function') {
      throw new Error('MissionLoopRuntime not a constructor');
    }
    const specStage = MISSION_LOOP_STAGES.SPEC;
    const transition = evaluateStageTransition(MISSION_LOOP_STAGES.INTENT, specStage);
    if (!transition || typeof transition !== 'object') {
      throw new Error('evaluateStageTransition did not return object');
    }
    if (transition.ok !== true) {
      throw new Error('Intent->Spec transition expected ok=true: ' + (transition.reason || transition.code));
    }
    const initial = createInitialLoopState('MIS-M1-SMOKE');
    const stage = initial && (initial.stage || initial.current_stage || MISSION_LOOP_STAGES.INTENT);
    if (!stage || !isMissionLoopStage(stage)) {
      throw new Error('createInitialLoopState missing valid stage');
    }
    const runtime = new MissionLoopRuntime({ baseDir: root, custodyEnabled: false });
    if (typeof runtime.loadState !== 'function' || typeof runtime.loopStatePath !== 'function') {
      throw new Error('MissionLoopRuntime missing loadState/loopStatePath');
    }
    checks.push({
      path: 'MissionLoopRuntime (stages + transition + ctor)',
      status: 'VERIFIED',
      type: 'fusion-cp-mission-loop'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/mcp/mission-loop-runtime.js',
      message: 'Mission Loop smoke failed: ' + err.message,
      type: 'fusion-cp-mission-loop'
    });
  }

  // --- MCP SSOT + sync contract light smoke ---
  try {
    const ssotPath = path.join(root, 'config', 'mcp', 'eos-mcp.ssot.json');
    const ssot = loadSsot(ssotPath);
    if (!ssot || !ssot.version || !ssot.coreServers || !ssot.coreServers['eos-local'] || !ssot.profiles) {
      throw new Error('SSOT missing version/coreServers.eos-local/profiles');
    }
    const syncResult = runSync({ root: root, ssotPath: ssotPath, check: true });
    if (!syncResult.ok) {
      const bad = (syncResult.results || [])
        .filter(function (r) { return r.status !== 'OK'; })
        .map(function (r) { return r.path + ':' + r.status; })
        .join(', ');
      throw new Error('MCP SSOT sync contract drift: ' + bad);
    }
    checks.push({
      path: 'McpSsot (v' + ssot.version + ', sync check ok, consumers=' + (syncResult.results || []).length + ')',
      status: 'VERIFIED',
      type: 'fusion-cp-mcp-ssot'
    });
  } catch (err) {
    failures.push({
      path: 'config/mcp/eos-mcp.ssot.json',
      message: 'MCP SSOT smoke failed: ' + err.message,
      type: 'fusion-cp-mcp-ssot'
    });
  }

  // --- Long-run GameDay harness light smoke (no soak) ---
  try {
    if (typeof LongRunGameDayHarness !== 'function') {
      throw new Error('LongRunGameDayHarness not a constructor');
    }
    if (DEFAULT_CI_ITERATIONS !== 25) {
      throw new Error('DEFAULT_CI_ITERATIONS expected 25, got ' + DEFAULT_CI_ITERATIONS);
    }
    if (!Array.isArray(FAULT_CATALOG) || FAULT_CATALOG.length < 3) {
      throw new Error('FAULT_CATALOG missing or too small');
    }
    checks.push({
      path: 'LongRunGameDayHarness (ctor + CI N=' + DEFAULT_CI_ITERATIONS + ' + faults=' + FAULT_CATALOG.length + ')',
      status: 'VERIFIED',
      type: 'fusion-cp-gameday'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/adversarial/long-run-gameday-harness.js',
      message: 'GameDay harness smoke failed: ' + err.message,
      type: 'fusion-cp-gameday'
    });
  }

  return { ok: failures.length === 0, checks: checks, failures: failures };
}

export default auditFusionControlPlane;
