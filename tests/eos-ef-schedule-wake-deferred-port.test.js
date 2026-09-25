/**
 * Mission EF — Schedule Wake & Deferred Trigger Port Test Suite.
 * SPEC-0142 / ADR-0120.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 0a286ad8 (do NOT rewrite tip pins)
 * - PASS = hermetic deferred-wake ≠ live cron ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L34; refuse L35 auto-close
 * - Live cron / OS scheduler / network wake / schema-json add / tip-rewrite refused
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EF_PRODUCTION_READY,
  EF_RECEIPT_PRODUCTION_READY,
  EF_RECEIPT_KIND,
  EF_FREEZE_PIN_SHORT,
  buildScheduleWakeDeferredReceipt,
  verifyScheduleWakeDeferredReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/schedule-wake-deferred-receipt.js';

import {
  ScheduleWakeDeferredPolicyGate,
  EF_CODES,
  EF_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveCron,
  isFundacionTarget
} from '../src/core/composition/schedule-wake-deferred-policy-gate.js';

import {
  ScheduleWakeDeferredPort,
  EF_PORT_PRODUCTION_READY,
  EF_PORT_KIND
} from '../src/core/composition/schedule-wake-deferred-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockSchedule(overrides = {}) {
  return {
    scheduleId: 'sched-ef-001',
    wakeAt: '2026-09-26T18:00:00.000Z',
    deferredFromProcessId: 'proc-ee-001',
    triggerKind: 'DEFERRED',
    payloadDigest: 'a'.repeat(64),
    ...overrides
  };
}

describe('Mission EF — Schedule Wake & Deferred Trigger Receipt (SPEC-0142)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EF1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin 0a286ad8', () => {
    assert.equal(EF_PRODUCTION_READY, 'NO');
    assert.equal(EF_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EF_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EF_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EF_FREEZE_PIN_SHORT, '0a286ad8');
  });

  it('EF2: builds canonical nine-field sealed EF-RCPT-* with freeze soft-observe + ceiling hold + schedule hold', () => {
    const receipt = buildScheduleWakeDeferredReceipt({
      planId: 'plan-ef-01',
      changeId: 'eos-ladder-35-mission-ef',
      decision: 'PASS',
      schedule: makeMockSchedule()
    });

    assert.equal(receipt.kind, EF_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EF-RCPT-'));
    assert.equal(receipt.operation, 'SCHEDULE_WAKE_DEFERRED_TRIGGER');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '0a286ad8');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l34ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveCronRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.scheduleHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.scheduleHold.liveCronRefused, true);
    assert.equal(receipt.scheduleHold.osSchedulerRefused, true);
    assert.equal(receipt.scheduleHold.networkWakeRefused, true);
    assert.equal(receipt.scheduleHold.tipRewriteRefused, true);
    assert.equal(receipt.scheduleHold.schemaJsonAddRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.scheduleDigest, 'string');
    assert.equal(receipt.scheduleDigest.length, 64);
  });

  it('EF3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildScheduleWakeDeferredReceipt({
      planId: 'plan-ef-tamper',
      changeId: 'eos-ladder-35-mission-ef',
      decision: 'PASS'
    });

    assert.equal(verifyScheduleWakeDeferredReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyScheduleWakeDeferredReceipt(tampered).ok, false);
  });
});

describe('Mission EF — Schedule Wake & Deferred Trigger Policy Gate (SPEC-0142)', () => {
  it('EF4: validates well-formed plan (planId+changeId+ACTIVE+schedule scheduleId/wakeAt/triggerKind)', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();
    const schedule = makeMockSchedule();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ef-valid',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      schedule
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EF_CODES.OK);
  });

  it('EF5: rejects missing schedule or invalid schedule', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ef-noschedule',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EF_CODES.MISSING_SCHEDULE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ef-invalidschedule',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EF_CODES.INVALID_SCHEDULE);
  });

  it('EF6: rejects missing scheduleId / wakeAt', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const resSid = gate.evaluatePreconditions({
      planId: 'plan-ef-nosid',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule({ scheduleId: '' })
    });
    assert.equal(resSid.ok, false);
    assert.equal(resSid.code, EF_CODES.MISSING_SCHEDULE_ID);

    const resWake = gate.evaluatePreconditions({
      planId: 'plan-ef-nowake',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule({ wakeAt: '   ' })
    });
    assert.equal(resWake.ok, false);
    assert.equal(resWake.code, EF_CODES.MISSING_WAKE_AT);
  });

  it('EF7: DENY invalid wakeAt ISO + LIVE_CRON claims', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const badIso = gate.evaluatePreconditions({
      planId: 'plan-ef-badiso',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule({ wakeAt: 'not-a-valid-iso' })
    });
    assert.equal(badIso.ok, false);
    assert.equal(badIso.decision, 'DENY');
    assert.equal(badIso.code, EF_CODES.INVALID_WAKE_AT);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ef-livecron',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      liveCron: true,
      schedule: makeMockSchedule()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EF_CODES.LIVE_CRON_FORBIDDEN);
  });

  it('EF8: rejects live cron claim strings and schema-json add', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const cronClaim = gate.evaluatePreconditions({
      planId: 'plan-ef-cronclaim',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live cron OS scheduler execution',
      schedule: makeMockSchedule()
    });
    assert.equal(cronClaim.ok, false);
    assert.equal(cronClaim.code, EF_CODES.LIVE_CRON_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ef-schema',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-schedule-wake.json',
      schedule: makeMockSchedule()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EF_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveCron('setInterval bind process lifetime'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EF9: allows HOLD mode with zero mutations', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ef-hold',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EF_CODES.HOLD);
  });

  it('EF10: DENY missing/invalid triggerKind; PASS ONCE and DEFERRED', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const missing = gate.evaluatePreconditions({
      planId: 'plan-ef-nokind',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule({ triggerKind: '' })
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.code, EF_CODES.MISSING_TRIGGER_KIND);

    const invalid = gate.evaluatePreconditions({
      planId: 'plan-ef-badkind',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule({ triggerKind: 'RECURRING' })
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.code, EF_CODES.INVALID_TRIGGER_KIND);

    const once = gate.evaluatePreconditions({
      planId: 'plan-ef-once',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule({ triggerKind: 'ONCE' })
    });
    assert.equal(once.ok, true);
    assert.equal(once.decision, 'PASS');

    const deferred = gate.evaluatePreconditions({
      planId: 'plan-ef-deferred',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule({ triggerKind: 'DEFERRED' })
    });
    assert.equal(deferred.ok, true);
    assert.equal(deferred.decision, 'PASS');
  });

  it('EF11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ef-del1',
      changeId: 'eos-ladder-35-mission-ef',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EF_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ef-del2',
      changeId: 'eos-ladder-35-mission-ef',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EF_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EF12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ef-secret',
      changeId: 'eos-ladder-35-mission-ef',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EF_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EF13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ef-fundacion',
      changeId: 'eos-ladder-35-mission-ef',
      target: 'Documents/Fundacion/schedule'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EF_CODES.FUNDACION_DENIED);
  });

  it('EF14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L34 reopen, L35 auto-close, mass prune, GHE', () => {
    const gate = new ScheduleWakeDeferredPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ef-pr',
      changeId: 'eos-ladder-35-mission-ef',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EF_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ef-l30',
      changeId: 'eos-ladder-35-mission-ef',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EF_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ef-l31',
      changeId: 'eos-ladder-35-mission-ef',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EF_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-ef-l32',
      changeId: 'eos-ladder-35-mission-ef',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EF_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-ef-l33',
      changeId: 'eos-ladder-35-mission-ef',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EF_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-ef-l34',
      changeId: 'eos-ladder-35-mission-ef',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EF_CODES.L34_REOPEN_FORBIDDEN);

    const l35CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ef-l35-close',
      changeId: 'eos-ladder-35-mission-ef',
      instruction: 'auto-close ladder-35 now'
    });
    assert.equal(l35CloseRes.ok, false);
    assert.equal(l35CloseRes.code, EF_CODES.L35_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ef-tip',
      changeId: 'eos-ladder-35-mission-ef',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EF_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ef-mass',
      changeId: 'eos-ladder-35-mission-ef',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EF_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ef-ghe',
      changeId: 'eos-ladder-35-mission-ef',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EF_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EF — Schedule Wake & Deferred Trigger Port (SPEC-0142)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EF15: govern happy path ACTIVE + schedule -> PASS + EF-RCPT-* (≠ live cron ≠ tip-refresh)', async () => {
    const port = new ScheduleWakeDeferredPort();
    const schedule = makeMockSchedule();

    const res = await port.govern({
      planId: 'plan-ef-pass',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EF-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.scheduleHold.liveCronRefused, true);
    assert.equal(res.receipt.scheduleHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.scheduleHold.osSchedulerRefused, true);
    assert.equal(res.receipt.scheduleHold.networkWakeRefused, true);
    assert.equal(res.receipt.freezeObserve.liveCronRefused, true);
    assert.equal(res.receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(typeof res.receipt.scheduleDigest, 'string');
    assert.equal(res.receipt.scheduleDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EF_PORT_KIND, 'eos-schedule-wake-deferred-port');
  });

  it('EF16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new ScheduleWakeDeferredPort();

    const res = await port.govern({
      planId: 'plan-ef-hold',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EF17: verifyTrail + live-cron deny + auto-seal refuse', async () => {
    const port = new ScheduleWakeDeferredPort();

    await port.govern({
      planId: 'plan-ef-trail-01',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      schedule: makeMockSchedule()
    });

    await port.govern({
      planId: 'plan-ef-trail-02',
      changeId: 'eos-ladder-35-mission-ef',
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

    const cronPort = new ScheduleWakeDeferredPort();
    const cronDeny = await cronPort.govern({
      planId: 'plan-ef-cron-deny',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      instruction: 'execute live cron with setInterval',
      schedule: makeMockSchedule()
    });
    assert.equal(cronDeny.ok, false);
    assert.equal(cronDeny.decision, 'DENY');
    assert.equal(cronDeny.code, EF_CODES.LIVE_CRON_FORBIDDEN);
    assert.ok(cronDeny.receipt.receiptId.startsWith('EF-RCPT-'));

    const autoSealRes = await cronPort.govern({
      planId: 'plan-ef-autoseal',
      changeId: 'eos-ladder-35-mission-ef',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      schedule: makeMockSchedule()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EF_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
