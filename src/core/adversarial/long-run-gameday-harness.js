/**
 * @module long-run-gameday-harness
 * ROI5 — CI-safe long-run / GameDay harness.
 *
 * Exercises Mission Loop + Write Barrier + Evidence Custody under repeated
 * adversarial / fault-injection scenarios. Sandboxed under a control-plane
 * temp root (.eos/gameday or os.tmpdir). Fundacion Δ=0 invariant.
 *
 * Prefer this thin harness over resurrecting archive/quarantine/engine-roi2
 * long-run dumps. Reuses governance scenario IDs from the adversarial lab map
 * where useful; does not fake parallel stacks.
 *
 * PRODUCTION_READY: NO
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MissionLoopRuntime, MissionLoopDeniedError } from '../mcp/mission-loop-runtime.js';
import { MISSION_LOOP_STAGES } from '../mcp/mission-loop.js';
import {
  EvidenceCustody,
  EvidenceCustodyError,
  resolveCustodyBaseDir
} from '../sdd/evidence-custody.js';
import {
  authorizeWrite,
  withWriteScope,
  withWriteScopeSync,
  isFundacionPath
} from '../write-barrier/index.js';

/** Default CI iteration count — keep verify/CI fast. */
export const DEFAULT_CI_ITERATIONS = 25;

/** Soft upper default for operator soak without an explicit flag. */
export const DEFAULT_OPERATOR_ITERATIONS = 50;

/** Absolute max guard (operator may pass --iterations up to this). */
export const MAX_ITERATIONS = 5000;

/** Real external target — never written by this harness. */
export const FUNDACION_EXTERNAL =
  process.env.EOS_FUNDACION_PATH ||
  path.join(os.homedir(), 'Documents', 'Fundacion');

/**
 * Allowed blast-radius levels (B0–B3). Mirrors docs/governance/BLAST_RADIUS_MODEL.json.
 */
export const ALLOWED_BLAST = Object.freeze(['B0', 'B1', 'B2', 'B3']);

/**
 * Deterministic fault / scenario catalog for long-run rotation.
 * Includes control-plane faults + a subset of ADV_* lab scenario ids.
 */
export const FAULT_CATALOG = Object.freeze([
  { id: 'HAPPY_MULTI', kind: 'happy' },
  { id: 'ADV_TOOL_01', kind: 'tool_fail' },
  { id: 'WRITE_OUTSIDE_ALLOWLIST', kind: 'barrier_deny' },
  { id: 'FUNDACION_WRITE_ATTEMPT', kind: 'fundacion_deny' },
  { id: 'CUSTODY_TAMPER', kind: 'custody_break' },
  { id: 'ADV_FALSE_SUCCESS_12', kind: 'false_success' },
  { id: 'MISSION_LOOP_SKIP', kind: 'mission_loop_skip' },
  { id: 'BLAST_RADIUS_B7', kind: 'blast_deny' },
  { id: 'ADV_EVIDENCE_06', kind: 'happy' },
  { id: 'ADV_GOVERNANCE_08', kind: 'barrier_deny' }
]);

/**
 * @param {string} dir
 * @returns {{ path: string, items: string[], exists: boolean, capturedAt: string }}
 */
export function snapshotDirectoryListing(dir) {
  const exists = fs.existsSync(dir);
  const items = exists ? fs.readdirSync(dir).sort() : [];
  return {
    path: dir,
    items,
    exists,
    capturedAt: new Date().toISOString()
  };
}

/**
 * @param {{ items: string[] }} baseline
 * @param {{ items: string[] }} current
 */
export function fundacionDelta(baseline, current) {
  const delta = (current.items?.length || 0) - (baseline.items?.length || 0);
  const itemsMatch =
    JSON.stringify(baseline.items || []) === JSON.stringify(current.items || []);
  return {
    delta,
    itemsMatch,
    steadyStateValid: itemsMatch && delta === 0,
    baselineCount: baseline.items?.length || 0,
    currentCount: current.items?.length || 0
  };
}

/**
 * Minimal sandboxed control-plane fixture for GameDay (SSOT + dirs).
 * @param {string} [parent]
 */
export function createGameDaySandbox(parent) {
  const root = fs.mkdtempSync(
    path.join(parent || os.tmpdir(), 'eos-gameday-lr-')
  );
  for (const rel of [
    'src',
    'tests',
    'docs',
    'config/security',
    'scripts',
    '.eos/custody',
    '.eos/gameday',
    '.missions',
    'Fundacion',
    'outside-allow'
  ]) {
    fs.mkdirSync(path.join(root, rel), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'src', 'ok.txt'), 'seed\n', 'utf8');
  fs.writeFileSync(path.join(root, 'Fundacion', 'probe.md'), 'frozen\n', 'utf8');
  fs.writeFileSync(path.join(root, 'outside-allow', 'x.txt'), 'x\n', 'utf8');
  fs.writeFileSync(
    path.join(root, 'config', 'security', 'write-barrier-ssot-roots.json'),
    JSON.stringify(
      {
        version: 1,
        repoRelativeAllowRoots: ['src', 'tests', 'docs', 'config', 'scripts', '.eos'],
        alwaysDenyRepoRelative: ['Fundacion'],
        protectedFilesRepoRelative: []
      },
      null,
      2
    ),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    '{"name":"eos-gameday-sandbox","type":"module"}\n',
    'utf8'
  );
  return root;
}

/**
 * @param {number} n
 * @param {object} fault
 */
function pickMissionId(n, fault) {
  return `GD-LR-${String(n).padStart(4, '0')}-${fault.id}`;
}

export class LongRunGameDayHarness {
  /**
   * @param {object} [options]
   * @param {string} [options.sandboxRoot] — if omitted, creates temp sandbox
   * @param {boolean} [options.keepSandbox=false]
   * @param {string} [options.fundacionPath] — external Fundacion (read-only probe)
   * @param {string[]} [options.catalog]
   */
  constructor(options = {}) {
    this.ownsSandbox = !options.sandboxRoot;
    this.sandboxRoot = options.sandboxRoot || createGameDaySandbox(options.sandboxParent);
    this.keepSandbox = options.keepSandbox === true;
    this.fundacionPath = options.fundacionPath || FUNDACION_EXTERNAL;
    this.catalog = options.catalog || FAULT_CATALOG;
    this.custodyDir = path.join(this.sandboxRoot, '.eos', 'custody');
    this.reportDir = path.join(this.sandboxRoot, '.eos', 'gameday');
    fs.mkdirSync(this.custodyDir, { recursive: true });
    fs.mkdirSync(this.reportDir, { recursive: true });

    this.custody = new EvidenceCustody({
      controlPlaneRoot: this.sandboxRoot,
      baseDir: this.custodyDir
    });
    this.runtime = new MissionLoopRuntime({
      baseDir: this.sandboxRoot,
      custody: this.custody,
      getMissionDir: (id) => path.join(this.sandboxRoot, '.missions', id)
    });

    this.externalBaseline = snapshotDirectoryListing(this.fundacionPath);
    this.sandboxFundacionBaseline = snapshotDirectoryListing(
      path.join(this.sandboxRoot, 'Fundacion')
    );
  }

  cleanup() {
    if (this.ownsSandbox && !this.keepSandbox && this.sandboxRoot) {
      try {
        fs.rmSync(this.sandboxRoot, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    }
  }

  /**
   * Ensure mission directory + loop state exist.
   * @param {string} missionId
   */
  bootstrapMission(missionId) {
    const dir = path.join(this.sandboxRoot, '.missions', missionId);
    fs.mkdirSync(dir, { recursive: true });
    return this.runtime.initLoop(missionId);
  }

  assertIsolation() {
    const external = fundacionDelta(
      this.externalBaseline,
      snapshotDirectoryListing(this.fundacionPath)
    );
    const sandboxFund = fundacionDelta(
      this.sandboxFundacionBaseline,
      snapshotDirectoryListing(path.join(this.sandboxRoot, 'Fundacion'))
    );
    if (!external.steadyStateValid) {
      return {
        ok: false,
        code: 'FUNDACION_DELTA_NONZERO',
        external,
        sandboxFund
      };
    }
    if (!sandboxFund.steadyStateValid) {
      return {
        ok: false,
        code: 'SANDBOX_FUNDACION_TOUCHED',
        external,
        sandboxFund
      };
    }
    return { ok: true, code: 'DELTA_ZERO', external, sandboxFund };
  }

  /**
   * Blast-radius gate — mirrors adversarial laboratory safety barrier.
   * @param {string} blastRadius
   * @param {string} [target]
   */
  assertBlastAllowed(blastRadius = 'B2', target) {
    if (target && (isFundacionPath(target) || /Fundacion/i.test(target))) {
      return {
        allowed: false,
        reason: 'Blast target Fundacion forbidden by safety barrier'
      };
    }
    if (!ALLOWED_BLAST.includes(blastRadius)) {
      return {
        allowed: false,
        reason: `Blast radius ${blastRadius} forbidden (allowed: ${ALLOWED_BLAST.join(',')})`
      };
    }
    return { allowed: true };
  }

  /** @param {object} fault @param {number} iter */
  runHappy(fault, iter) {
    const missionId = pickMissionId(iter, fault);
    this.bootstrapMission(missionId);
    const adv = this.runtime.advance({
      missionId,
      to: MISSION_LOOP_STAGES.SPEC,
      ok: true,
      evidence: { fault_id: fault.id, iter }
    });
    const custody = this.custody.verify({ failClosed: true });
    if (!custody.valid) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'CUSTODY_VERIFY_FAILED_AFTER_HAPPY',
        custody,
        advance: adv
      };
    }
    return {
      status: 'PASS',
      failClosed: false,
      mission_id: missionId,
      stage: adv.stage,
      custody_count: custody.count,
      custody_verdict: custody.verdict
    };
  }

  /** @param {object} fault @param {number} iter */
  runToolFail(fault, iter) {
    const missionId = pickMissionId(iter, fault);
    this.bootstrapMission(missionId);
    // Act write tool while still at Intent — must DENY
    let denied = false;
    let code = null;
    try {
      this.runtime.enforceTool('eos.scaffolder.execute', { missionId });
    } catch (err) {
      denied = err instanceof MissionLoopDeniedError;
      code = err.code || err.message;
    }
    if (!denied) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'TOOL_FAIL_EXPECTED_DENY_BUT_ALLOWED',
        code
      };
    }
    this.custody.sealMissionLoopReceipt({
      mission_id: missionId,
      kind: 'tool_fail_contained',
      fault_id: fault.id,
      deny_code: code
    });
    return {
      status: 'PASS',
      recovery: 'DENY_RECORDED',
      failClosed: true,
      deny_code: code,
      mission_id: missionId
    };
  }

  /** @param {object} fault @param {number} iter */
  runBarrierDeny(fault, iter) {
    const missionId = pickMissionId(iter, fault);
    const outside = path.join(this.sandboxRoot, 'outside-allow', 'x.txt');
    let verdict;
    withWriteScopeSync(
      {
        repoRoot: this.sandboxRoot,
        roots: ['src', 'tests', 'docs'],
        label: `gameday-barrier:${missionId}`
      },
      () => {
        verdict = authorizeWrite(outside, { repoRoot: this.sandboxRoot });
      }
    );
    if (verdict?.allowed) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'BARRIER_EXPECTED_DENY_BUT_ALLOWED',
        verdict
      };
    }
    this.custody.sealMissionLoopReceipt({
      mission_id: missionId,
      kind: 'barrier_deny',
      fault_id: fault.id,
      reason: verdict?.reason || 'DENIED'
    });
    return {
      status: 'PASS',
      recovery: 'BARRIER_DENY',
      failClosed: true,
      reason: verdict?.reason,
      mission_id: missionId
    };
  }

  /** @param {object} fault @param {number} iter */
  runFundacionDeny(fault, iter) {
    const missionId = pickMissionId(iter, fault);
    const fundPath = path.join(this.sandboxRoot, 'Fundacion', 'probe.md');
    const verdict = authorizeWrite(fundPath, {
      repoRoot: this.sandboxRoot,
      requireScope: false
    });
    let custodyDenied = false;
    let custodyCode = null;
    try {
      resolveCustodyBaseDir(
        this.sandboxRoot,
        path.join(this.sandboxRoot, 'Fundacion', 'custody')
      );
    } catch (err) {
      custodyDenied = err instanceof EvidenceCustodyError;
      custodyCode = err.code;
    }
    if (verdict.allowed || verdict.reason !== 'FUNDACION_ALWAYS_DENY') {
      // Still accept ALWAYS_DENY_ROOT as Fundacion deny via SSOT
      if (!String(verdict.reason || '').includes('FUNDACION') &&
          verdict.reason !== 'ALWAYS_DENY_ROOT') {
        return {
          status: 'ABORT',
          failClosed: true,
          reason: 'FUNDACION_EXPECTED_DENY_BUT_ALLOWED',
          verdict
        };
      }
    }
    if (!custodyDenied) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'CUSTODY_FUNDACION_EXPECTED_DENY',
        custodyCode
      };
    }
    this.custody.sealMissionLoopReceipt({
      mission_id: missionId,
      kind: 'fundacion_deny',
      fault_id: fault.id,
      write_reason: verdict.reason,
      custody_code: custodyCode
    });
    return {
      status: 'PASS',
      recovery: 'FUNDACION_DENY',
      failClosed: true,
      write_reason: verdict.reason,
      custody_code: custodyCode,
      mission_id: missionId
    };
  }

  /** @param {object} fault @param {number} iter */
  runCustodyBreak(fault, iter) {
    const missionId = pickMissionId(iter, fault);
    // Use a dedicated chain dir so prior happy seals do not mask tamper
    const breakDir = path.join(this.sandboxRoot, '.eos', 'custody-break', String(iter));
    fs.mkdirSync(breakDir, { recursive: true });
    const local = new EvidenceCustody({
      controlPlaneRoot: this.sandboxRoot,
      baseDir: breakDir,
      chainId: `CP-GD-BREAK-${iter}`
    });
    local.sealEvdRecord({ evidence_id: `EVD-GD-${iter}`, seal_hash: 'abc' });
    local.sealVerifyReceipt({ receipt_id: `RCPT-GD-${iter}`, status: 'OK' });

    const logPath = local.getLogPath();
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    const evt = JSON.parse(lines[0]);
    evt.payload.evidence_id = 'EVD-TAMPERED';
    lines[0] = JSON.stringify(evt);
    fs.writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');

    let aborted = false;
    let code = null;
    try {
      local.verify({ failClosed: true });
    } catch (err) {
      aborted = err instanceof EvidenceCustodyError;
      code = err.code;
    }
    if (!aborted) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'CUSTODY_TAMPER_DID_NOT_FAIL_CLOSED'
      };
    }
    // Record abort on main custody (meta evidence of containment)
    this.custody.sealMissionLoopReceipt({
      mission_id: missionId,
      kind: 'custody_break_abort',
      fault_id: fault.id,
      deny_code: code
    });
    return {
      status: 'PASS',
      recovery: 'CUSTODY_ABORT',
      failClosed: true,
      deny_code: code,
      mission_id: missionId
    };
  }

  /**
   * False success must fail-closed: Evidence→Verify without evidence receipt DENY;
   * claiming success while custody/verify would lie is rejected.
   * @param {object} fault
   * @param {number} iter
   */
  runFalseSuccess(fault, iter) {
    const missionId = pickMissionId(iter, fault);
    this.bootstrapMission(missionId);
    // Place loop at Evidence WITHOUT an evidence receipt (stage_advance to Evidence
    // would stamp stage:Evidence and falsely satisfy VERIFY_REQUIRES_EVIDENCE).
    const planted = this.runtime.loadState(missionId);
    planted.stage = MISSION_LOOP_STAGES.EVIDENCE;
    planted.receipts = [
      {
        kind: 'false_claim',
        ok: true,
        claim: 'all_green',
        recorded_at: new Date().toISOString()
      }
    ];
    this.runtime.saveState(missionId, planted);
    // False success: claim Verify without evidence receipt — must DENY fail-closed
    let denied = false;
    let code = null;
    try {
      this.runtime.advance({
        missionId,
        to: MISSION_LOOP_STAGES.VERIFY,
        ok: true,
        evidence: { false_success: true, claim: 'all_green' }
      });
    } catch (err) {
      denied = err instanceof MissionLoopDeniedError;
      code = err.code || err.message;
    }
    if (!denied) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'FALSE_SUCCESS_WAS_ACCEPTED',
        code
      };
    }
    this.custody.sealMissionLoopReceipt({
      mission_id: missionId,
      kind: 'false_success_fail_closed',
      fault_id: fault.id,
      deny_code: code
    });
    return {
      status: 'PASS',
      recovery: 'FALSE_SUCCESS_FAIL_CLOSED',
      failClosed: true,
      deny_code: code,
      mission_id: missionId
    };
  }

  /** @param {object} fault @param {number} iter */
  runMissionLoopSkip(fault, iter) {
    const missionId = pickMissionId(iter, fault);
    this.bootstrapMission(missionId);
    let denied = false;
    let code = null;
    try {
      this.runtime.advance({
        missionId,
        to: MISSION_LOOP_STAGES.ACT,
        ok: true
      });
    } catch (err) {
      denied = err instanceof MissionLoopDeniedError;
      code = err.code || err.message;
    }
    if (!denied) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'MISSION_LOOP_SKIP_WAS_ALLOWED'
      };
    }
    this.custody.sealMissionLoopReceipt({
      mission_id: missionId,
      kind: 'mission_loop_skip_deny',
      fault_id: fault.id,
      deny_code: code
    });
    return {
      status: 'PASS',
      recovery: 'SKIP_DENIED',
      failClosed: true,
      deny_code: code,
      mission_id: missionId
    };
  }

  /** @param {object} fault @param {number} iter */
  runBlastDeny(fault, iter) {
    const gate = this.assertBlastAllowed('B7', FUNDACION_EXTERNAL);
    if (gate.allowed) {
      return {
        status: 'ABORT',
        failClosed: true,
        reason: 'BLAST_B7_SHOULD_BE_FORBIDDEN'
      };
    }
    this.custody.sealMissionLoopReceipt({
      mission_id: pickMissionId(iter, fault),
      kind: 'blast_deny',
      fault_id: fault.id,
      detail: gate.reason
    });
    return {
      status: 'PASS',
      recovery: 'BLAST_ABORTED',
      failClosed: true,
      reason: gate.reason
    };
  }

  /**
   * @param {object} fault
   * @param {number} iter
   */
  runFault(fault, iter) {
    switch (fault.kind) {
      case 'happy':
        return this.runHappy(fault, iter);
      case 'tool_fail':
        return this.runToolFail(fault, iter);
      case 'barrier_deny':
        return this.runBarrierDeny(fault, iter);
      case 'fundacion_deny':
        return this.runFundacionDeny(fault, iter);
      case 'custody_break':
        return this.runCustodyBreak(fault, iter);
      case 'false_success':
        return this.runFalseSuccess(fault, iter);
      case 'mission_loop_skip':
        return this.runMissionLoopSkip(fault, iter);
      case 'blast_deny':
        return this.runBlastDeny(fault, iter);
      default:
        return {
          status: 'ABORT',
          failClosed: true,
          reason: `UNKNOWN_FAULT_KIND:${fault.kind}`
        };
    }
  }

  /**
   * @param {object} [options]
   * @param {number} [options.iterations]
   * @param {boolean} [options.writeReport=true]
   */
  run(options = {}) {
    let iterations = Number(options.iterations);
    if (!Number.isFinite(iterations) || iterations < 1) {
      iterations = DEFAULT_CI_ITERATIONS;
    }
    if (iterations > MAX_ITERATIONS) {
      iterations = MAX_ITERATIONS;
    }

    const startedAt = new Date().toISOString();
    const results = [];
    let passed = 0;
    let failed = 0;
    let aborts = 0;

    for (let i = 1; i <= iterations; i++) {
      const fault = this.catalog[(i - 1) % this.catalog.length];
      let outcome;
      try {
        outcome = this.runFault(fault, i);
      } catch (err) {
        outcome = {
          status: 'ABORT',
          failClosed: true,
          reason: `UNCAUGHT:${err.message}`,
          code: err.code || null
        };
      }

      const isolation = this.assertIsolation();
      if (!isolation.ok) {
        outcome = {
          status: 'ABORT',
          failClosed: true,
          reason: isolation.code,
          isolation,
          prior: outcome
        };
      }

      const row = {
        iter: i,
        fault_id: fault.id,
        fault_kind: fault.kind,
        ...outcome,
        isolation: isolation.ok
          ? { ok: true, code: isolation.code, delta: isolation.external.delta }
          : isolation,
        at: new Date().toISOString()
      };
      results.push(row);

      if (row.status === 'PASS') passed += 1;
      else {
        failed += 1;
        aborts += 1;
        // Fail-closed: stop long-run on hard isolation violation
        if (row.reason === 'FUNDACION_DELTA_NONZERO' || row.reason === 'SANDBOX_FUNDACION_TOUCHED') {
          break;
        }
      }
    }

    const custodyFinal = this.custody.audit ? this.custody.audit() : this.custody.verify({ failClosed: false });
    const isolationFinal = this.assertIsolation();
    const finishedAt = new Date().toISOString();

    const summary = {
      harness: 'roi5-long-run-gameday',
      PRODUCTION_READY: 'NO',
      iterations_requested: iterations,
      iterations_executed: results.length,
      passed,
      failed,
      aborts,
      all_passed: failed === 0 && isolationFinal.ok,
      fundacion_delta: isolationFinal.external?.delta ?? null,
      fundacion_untouched: isolationFinal.ok === true,
      custody_final: {
        valid: custodyFinal.valid,
        verdict: custodyFinal.verdict,
        count: custodyFinal.count
      },
      sandbox_root: this.sandboxRoot,
      started_at: startedAt,
      finished_at: finishedAt,
      catalog_size: this.catalog.length,
      results
    };

    if (options.writeReport !== false) {
      const reportPath = path.join(this.reportDir, 'long-run-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');
      summary.report_path = reportPath;
    }

    return summary;
  }
}

/**
 * Parse CLI argv for iterations / keep-sandbox.
 * @param {string[]} argv
 */
export function parseLongRunArgs(argv = process.argv.slice(2)) {
  let iterations = DEFAULT_CI_ITERATIONS;
  let keepSandbox = false;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--iterations' || a === '-n') {
      iterations = Number(argv[++i]);
    } else if (a.startsWith('--iterations=')) {
      iterations = Number(a.split('=')[1]);
    } else if (a === '--soak') {
      iterations = DEFAULT_OPERATOR_ITERATIONS;
    } else if (a === '--keep-sandbox') {
      keepSandbox = true;
    } else if (a === '--json') {
      json = true;
    }
  }
  if (!Number.isFinite(iterations) || iterations < 1) {
    iterations = DEFAULT_CI_ITERATIONS;
  }
  return { iterations, keepSandbox, json };
}

export default LongRunGameDayHarness;
