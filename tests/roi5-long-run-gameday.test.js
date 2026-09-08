import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LongRunGameDayHarness,
  createGameDaySandbox,
  parseLongRunArgs,
  fundacionDelta,
  snapshotDirectoryListing,
  DEFAULT_CI_ITERATIONS,
  FAULT_CATALOG
} from '../src/core/adversarial/long-run-gameday-harness.js';

describe('ROI5 long-run GameDay harness', () => {
  let harness;

  beforeEach(() => {
    harness = new LongRunGameDayHarness({ keepSandbox: true });
  });

  afterEach(() => {
    if (harness) harness.cleanup();
  });

  it('happy multi-iter: short run all_passed and Fundacion delta 0', () => {
    const summary = harness.run({ iterations: 10, writeReport: false });
    assert.equal(summary.PRODUCTION_READY, 'NO');
    assert.equal(summary.iterations_executed, 10);
    assert.equal(summary.failed, 0);
    assert.equal(summary.all_passed, true);
    assert.equal(summary.fundacion_untouched, true);
    assert.equal(summary.fundacion_delta, 0);
    assert.ok(summary.custody_final.valid);
  });

  it('Fundacion deny fault recovers with fail-closed DENY', () => {
    const outcome = harness.runFundacionDeny(
      { id: 'FUNDACION_WRITE_ATTEMPT', kind: 'fundacion_deny' },
      1
    );
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.recovery, 'FUNDACION_DENY');
    assert.equal(outcome.failClosed, true);
    assert.equal(harness.assertIsolation().ok, true);
  });

  it('barrier deny: write outside allowlist DENY', () => {
    const outcome = harness.runBarrierDeny(
      { id: 'WRITE_OUTSIDE_ALLOWLIST', kind: 'barrier_deny' },
      2
    );
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.recovery, 'BARRIER_DENY');
    assert.equal(outcome.failClosed, true);
  });

  it('custody break: tamper abort fail-closed', () => {
    const outcome = harness.runCustodyBreak(
      { id: 'CUSTODY_TAMPER', kind: 'custody_break' },
      3
    );
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.recovery, 'CUSTODY_ABORT');
    assert.equal(outcome.failClosed, true);
    assert.equal(outcome.deny_code, 'CUSTODY_CHAIN_BROKEN');
  });

  it('false success: Evidence to Verify without evidence DENY fail-closed', () => {
    const outcome = harness.runFalseSuccess(
      { id: 'ADV_FALSE_SUCCESS_12', kind: 'false_success' },
      4
    );
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.recovery, 'FALSE_SUCCESS_FAIL_CLOSED');
    assert.equal(outcome.failClosed, true);
    assert.ok(outcome.deny_code);
  });

  it('mission-loop skip Intent to Act DENY', () => {
    const outcome = harness.runMissionLoopSkip(
      { id: 'MISSION_LOOP_SKIP', kind: 'mission_loop_skip' },
      5
    );
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.recovery, 'SKIP_DENIED');
    assert.equal(outcome.failClosed, true);
  });

  it('tool fail at Intent DENY recorded', () => {
    const outcome = harness.runToolFail({ id: 'ADV_TOOL_01', kind: 'tool_fail' }, 6);
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.recovery, 'DENY_RECORDED');
    assert.equal(outcome.failClosed, true);
  });

  it('blast radius B7 abort', () => {
    const outcome = harness.runBlastDeny({ id: 'BLAST_RADIUS_B7', kind: 'blast_deny' }, 7);
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.recovery, 'BLAST_ABORTED');
  });

  it('parseLongRunArgs defaults and soak', () => {
    assert.equal(parseLongRunArgs([]).iterations, DEFAULT_CI_ITERATIONS);
    assert.equal(parseLongRunArgs(['--soak']).iterations, 50);
    assert.equal(parseLongRunArgs(['--iterations', '40']).iterations, 40);
    assert.equal(parseLongRunArgs(['--iterations=12']).iterations, 12);
  });

  it('fundacionDelta helper detects mismatch', () => {
    const d = fundacionDelta({ items: ['a', 'b'] }, { items: ['a', 'b', 'c'] });
    assert.equal(d.delta, 1);
    assert.equal(d.steadyStateValid, false);
  });

  it('createGameDaySandbox has SSOT and Fundacion probe', () => {
    const root = createGameDaySandbox();
    try {
      assert.equal(snapshotDirectoryListing(path.join(root, 'Fundacion')).exists, true);
      assert.ok(
        fs.existsSync(
          path.join(root, 'config', 'security', 'write-barrier-ssot-roots.json')
        )
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('FAULT_CATALOG covers required kinds', () => {
    const kinds = new Set(FAULT_CATALOG.map((f) => f.kind));
    for (const k of [
      'happy',
      'tool_fail',
      'barrier_deny',
      'fundacion_deny',
      'custody_break',
      'false_success',
      'mission_loop_skip',
      'blast_deny'
    ]) {
      assert.ok(kinds.has(k), 'missing kind ' + k);
    }
  });
});
