/**
 * Mission EE — Temporal Deadline & TTL Governance Port Test Suite.
 * SPEC-0141 / ADR-0119.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 9600063c (do NOT rewrite tip pins)
 * - PASS = sealed deadline/TTL ≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L34; refuse L35 auto-close
 * - Live timer / schema-json add / tip-rewrite refused
 * - EXPIRE when observedExpired true (hermetic clock injection)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EE_PRODUCTION_READY,
  EE_RECEIPT_PRODUCTION_READY,
  EE_RECEIPT_KIND,
  EE_FREEZE_PIN_SHORT,
  buildTemporalDeadlineTtlReceipt,
  verifyTemporalDeadlineTtlReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/temporal-deadline-ttl-receipt.js';

import {
  TemporalDeadlineTtlPolicyGate,
  EE_CODES,
  EE_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveTimer,
  isFundacionTarget
} from '../src/core/composition/temporal-deadline-ttl-policy-gate.js';

import {
  TemporalDeadlineTtlPort,
  EE_PORT_PRODUCTION_READY,
  EE_PORT_KIND
} from '../src/core/composition/temporal-deadline-ttl-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockDeadline(overrides = {}) {
  return {
    processId: 'proc-ee-001',
    deadlineAt: '2026-09-26T12:00:00.000Z',
    ttlMs: 3600000,
    clockSkewBudgetMs: 5000,
    triggerEvent: 'SagaStepAwaiting',
    ...overrides
  };
}

describe('Mission EE — Temporal Deadline & TTL Receipt (SPEC-0141)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EE1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 9600063c', () => {
    assert.equal(EE_PRODUCTION_READY, 'NO');
    assert.equal(EE_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EE_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EE_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EE_FREEZE_PIN_SHORT, '9600063c');
  });

  it('EE2: builds canonical nine-field sealed EE-RCPT-* with freeze soft-observe + ceiling hold + temporal hold', () => {
    const receipt = buildTemporalDeadlineTtlReceipt({
      planId: 'plan-ee-01',
      changeId: 'eos-ladder-35-mission-ee',
      decision: 'PASS',
      deadline: makeMockDeadline()
    });

    assert.equal(receipt.kind, EE_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EE-RCPT-'));
    assert.equal(receipt.operation, 'TEMPORAL_DEADLINE_TTL_GOVERNANCE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '9600063c');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l34ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveTimerRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.temporalHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.temporalHold.liveTimerRefused, true);
    assert.equal(receipt.temporalHold.wallClockSchedulerRefused, true);
    assert.equal(receipt.temporalHold.tipRewriteRefused, true);
    assert.equal(receipt.temporalHold.schemaJsonAddRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.deadlineDigest, 'string');
    assert.equal(receipt.deadlineDigest.length, 64);
  });

  it('EE3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildTemporalDeadlineTtlReceipt({
      planId: 'plan-ee-tamper',
      changeId: 'eos-ladder-35-mission-ee',
      decision: 'PASS'
    });

    assert.equal(verifyTemporalDeadlineTtlReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyTemporalDeadlineTtlReceipt(tampered).ok, false);
  });
});

describe('Mission EE — Temporal Deadline & TTL Policy Gate (SPEC-0141)', () => {
  it('EE4: validates well-formed plan (planId+changeId+ACTIVE+deadline processId/deadlineAt)', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();
    const deadline = makeMockDeadline();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ee-valid',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      deadline
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EE_CODES.OK);
  });

  it('EE5: rejects missing deadline or invalid deadline', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ee-nodeadline',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EE_CODES.MISSING_DEADLINE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ee-invaliddeadline',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EE_CODES.INVALID_DEADLINE);
  });

  it('EE6: rejects missing processId / deadlineAt', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const resPid = gate.evaluatePreconditions({
      planId: 'plan-ee-nopid',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: makeMockDeadline({ processId: '' })
    });
    assert.equal(resPid.ok, false);
    assert.equal(resPid.code, EE_CODES.MISSING_PROCESS_ID);

    const resAt = gate.evaluatePreconditions({
      planId: 'plan-ee-noat',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: makeMockDeadline({ deadlineAt: '   ' })
    });
    assert.equal(resAt.ok, false);
    assert.equal(resAt.code, EE_CODES.MISSING_DEADLINE_AT);
  });

  it('EE7: DENY invalid deadlineAt ISO + LIVE_TIMER claims', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const badIso = gate.evaluatePreconditions({
      planId: 'plan-ee-badiso',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: makeMockDeadline({ deadlineAt: 'not-a-valid-iso' })
    });
    assert.equal(badIso.ok, false);
    assert.equal(badIso.decision, 'DENY');
    assert.equal(badIso.code, EE_CODES.INVALID_DEADLINE_AT);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ee-livetimer',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      liveTimer: true,
      deadline: makeMockDeadline()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EE_CODES.LIVE_TIMER_FORBIDDEN);
  });

  it('EE8: rejects live timer claim strings and schema-json add', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const timerClaim = gate.evaluatePreconditions({
      planId: 'plan-ee-timerclaim',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live wall-clock scheduler execution',
      deadline: makeMockDeadline()
    });
    assert.equal(timerClaim.ok, false);
    assert.equal(timerClaim.code, EE_CODES.LIVE_TIMER_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ee-schema',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-deadline-ttl.json',
      deadline: makeMockDeadline()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EE_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveTimer('setTimeout bind process lifetime'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EE9: allows HOLD mode with zero mutations', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ee-hold',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EE_CODES.HOLD);
  });

  it('EE10: EXPIRE path when observedExpired true (hermetic clock injection)', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ee-expire',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: makeMockDeadline({ observedExpired: true })
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'EXPIRE');
    assert.equal(res.code, EE_CODES.EXPIRE);
  });

  it('EE11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ee-del1',
      changeId: 'eos-ladder-35-mission-ee',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EE_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ee-del2',
      changeId: 'eos-ladder-35-mission-ee',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EE_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EE12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ee-secret',
      changeId: 'eos-ladder-35-mission-ee',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EE_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EE13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ee-fundacion',
      changeId: 'eos-ladder-35-mission-ee',
      target: 'Documents/Fundacion/deadline'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EE_CODES.FUNDACION_DENIED);
  });

  it('EE14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L34 reopen, L35 auto-close, mass prune, GHE', () => {
    const gate = new TemporalDeadlineTtlPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ee-pr',
      changeId: 'eos-ladder-35-mission-ee',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EE_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ee-l30',
      changeId: 'eos-ladder-35-mission-ee',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EE_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ee-l31',
      changeId: 'eos-ladder-35-mission-ee',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EE_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-ee-l32',
      changeId: 'eos-ladder-35-mission-ee',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EE_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-ee-l33',
      changeId: 'eos-ladder-35-mission-ee',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EE_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-ee-l34',
      changeId: 'eos-ladder-35-mission-ee',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EE_CODES.L34_REOPEN_FORBIDDEN);

    const l35CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ee-l35-close',
      changeId: 'eos-ladder-35-mission-ee',
      instruction: 'auto-close ladder-35 now'
    });
    assert.equal(l35CloseRes.ok, false);
    assert.equal(l35CloseRes.code, EE_CODES.L35_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ee-tip',
      changeId: 'eos-ladder-35-mission-ee',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EE_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ee-mass',
      changeId: 'eos-ladder-35-mission-ee',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EE_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ee-ghe',
      changeId: 'eos-ladder-35-mission-ee',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EE_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EE — Temporal Deadline & TTL Port (SPEC-0141)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EE15: govern happy path ACTIVE + deadline -> PASS + EE-RCPT-* (≠ live timer ≠ tip-refresh)', async () => {
    const port = new TemporalDeadlineTtlPort();
    const deadline = makeMockDeadline();

    const res = await port.govern({
      planId: 'plan-ee-pass',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EE-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.temporalHold.liveTimerRefused, true);
    assert.equal(res.receipt.temporalHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.temporalHold.wallClockSchedulerRefused, true);
    assert.equal(res.receipt.freezeObserve.liveTimerRefused, true);
    assert.equal(res.receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(typeof res.receipt.deadlineDigest, 'string');
    assert.equal(res.receipt.deadlineDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EE_PORT_KIND, 'eos-temporal-deadline-ttl-port');
  });

  it('EE16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new TemporalDeadlineTtlPort();

    const res = await port.govern({
      planId: 'plan-ee-hold',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EE17: verifyTrail + EXPIRE seal + live-timer deny + auto-seal refuse', async () => {
    const port = new TemporalDeadlineTtlPort();

    await port.govern({
      planId: 'plan-ee-trail-01',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: makeMockDeadline()
    });

    await port.govern({
      planId: 'plan-ee-trail-02',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(
      brokenTrail.error.includes('receiptHash mismatch') ||
        brokenTrail.error.includes('Invalid receipt')
    );

    const expirePort = new TemporalDeadlineTtlPort();
    const expireRes = await expirePort.govern({
      planId: 'plan-ee-expire-seal',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      deadline: makeMockDeadline({ observedExpired: true })
    });
    assert.equal(expireRes.ok, false);
    assert.equal(expireRes.decision, 'EXPIRE');
    assert.equal(expireRes.code, EE_CODES.EXPIRE);
    assert.ok(expireRes.receipt.receiptId.startsWith('EE-RCPT-'));
    assert.equal(expireRes.receipt.decision, 'EXPIRE');
    assert.equal(expireRes.receipt.temporalHold.liveTimerRefused, true);

    const liveDeny = await expirePort.govern({
      planId: 'plan-ee-live-deny',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      instruction: 'execute live timer with setInterval',
      deadline: makeMockDeadline()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EE_CODES.LIVE_TIMER_FORBIDDEN);
    assert.ok(liveDeny.receipt.receiptId.startsWith('EE-RCPT-'));

    const autoSealRes = await expirePort.govern({
      planId: 'plan-ee-autoseal',
      changeId: 'eos-ladder-35-mission-ee',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      deadline: makeMockDeadline()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EE_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
