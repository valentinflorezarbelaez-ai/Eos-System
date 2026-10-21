/**
 * Mission FK — Bidirectional Mismatch Quarantine / Deny Governance Port Test Suite.
 * SPEC-0173 / ADR-0157.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 038a9a4 (do NOT rewrite tip pins)
 * - PASS = sealed mismatch quarantine/deny decision ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FJ/FL/Canary
 * - VERIFIED / HOLD verdict => no-op HOLD (never a false quarantine)
 * - NEVER reopen L30–L40; refuse L41 auto-close (FL–FM pending)
 * - Quarantine is a decision record only (no payload copy)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FK_PRODUCTION_READY,
  FK_RECEIPT_PRODUCTION_READY,
  FK_RECEIPT_KIND,
  FK_FREEZE_PIN_SHORT,
  FK_FREEZE_PIN,
  FK_OPERATION,
  FK_DISPOSITIONS,
  FK_VERDICTS,
  buildBidirectionalMismatchQuarantineDenyReceipt,
  verifyBidirectionalMismatchQuarantineDenyReceipt,
  canonicalBidirectionalMismatchQuarantineDenySealBody,
  computeMismatchDigest,
  sha256Canonical,
  _resetReceiptSeqForTests
} from '../src/core/composition/bidirectional-mismatch-quarantine-deny-receipt.js';

import {
  BidirectionalMismatchQuarantineDenyPolicyGate,
  FK_CODES,
  FK_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveHttpEgress,
  claimsWallClockAuthority,
  claimsTipRefreshAuthority,
  claimsRawMismatchSecretMaterial,
  claimsLadderReopen,
  claimsL41AutoClose,
  isFundacionTarget,
  isValidSha256Hex
} from '../src/core/composition/bidirectional-mismatch-quarantine-deny-policy-gate.js';

import {
  BidirectionalMismatchQuarantineDenyPort,
  FK_PORT_PRODUCTION_READY,
  FK_PORT_KIND
} from '../src/core/composition/bidirectional-mismatch-quarantine-deny-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeDigest(label) {
  return sha256Canonical(`opaque-${label}`);
}

function makeMockMismatch(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fi-demo-001',
    bindingId: 'bind-opaque-fi-demo-001',
    roundTripId: 'rt-opaque-fj-demo-001',
    requestId: 'req-opaque-fj-demo-001',
    replyId: 'rep-opaque-fj-demo-001',
    requestDigest: makeDigest('request-001'),
    replyDigest: makeDigest('reply-001'),
    mismatchClass: 'round-trip-integrity-mismatch',
    desiredDisposition: 'QUARANTINE',
    observedVerdict: 'MISMATCH',
    authorized: true,
    ...overrides
  };
}

function makePlan(overrides = {}) {
  return {
    planId: 'plan-fk-01',
    changeId: 'eos-ladder-41-mission-fk',
    mismatch: makeMockMismatch(),
    ...overrides
  };
}

describe('Mission FK — Bidirectional Mismatch Quarantine / Deny Receipt (SPEC-0173)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FK1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 038a9a4', () => {
    assert.equal(FK_PRODUCTION_READY, 'NO');
    assert.equal(FK_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FK_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FK_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FK_FREEZE_PIN_SHORT, '038a9a4');
    assert.equal(FK_FREEZE_PIN, '038a9a4ac4b213b58a09cd6956d797ab8a713869');
    assert.deepEqual([...FK_DISPOSITIONS], ['QUARANTINE', 'DENY', 'HOLD']);
    assert.deepEqual([...FK_VERDICTS], ['VERIFIED', 'MISMATCH', 'HOLD']);
  });

  it('FK2: builds canonical nine-field sealed FK-RCPT-* with freeze soft-observe + ceiling + quarantineHold + mismatchDigest', () => {
    const mismatch = makeMockMismatch();
    const receipt = buildBidirectionalMismatchQuarantineDenyReceipt({
      planId: 'plan-fk-01',
      changeId: 'eos-ladder-41-mission-fk',
      decision: 'PASS',
      mismatch
    });

    assert.equal(receipt.kind, FK_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FK-RCPT-'));
    assert.equal(receipt.operation, FK_OPERATION);
    assert.equal(receipt.operation, 'BIDIRECTIONAL_MISMATCH_QUARANTINE_DENY');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '038a9a4');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l41AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l40ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawMismatchSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.quarantineHold.failClosed, true);
    assert.equal(receipt.quarantineHold.mismatchSecretMaterialRefused, true);
    assert.equal(receipt.quarantineHold.mismatchSecretZeroHeld, true);
    assert.equal(receipt.quarantineHold.decisionRecordOnly, true);
    assert.equal(receipt.quarantineHold.noPayloadCopy, true);
    assert.equal(receipt.quarantineHold.consumesFiCorrelationBinding, true);
    assert.equal(receipt.quarantineHold.consumesFjRoundTripVerdict, true);
    assert.equal(receipt.mismatchDigest, computeMismatchDigest(mismatch));
    assert.ok(receipt.freezeObserve.nonClaimLabels.length >= 20);
  });

  it('FK3: mismatchDigest is deterministic and opaque-only (ignores secret/raw fields)', () => {
    const mismatch = makeMockMismatch();
    const a = computeMismatchDigest(mismatch);
    assert.equal(a, computeMismatchDigest({ ...mismatch }));
    assert.equal(
      computeMismatchDigest({ ...mismatch, mismatchSecret: makeSyntheticSecret(), requestPayload: 'raw' }),
      a
    );
    assert.match(a, /^[0-9a-f]{64}$/);
  });

  it('FK4: verifies sealed receipt and rejects tampered decision/hash/delta', () => {
    const receipt = buildBidirectionalMismatchQuarantineDenyReceipt({
      planId: 'plan-fk-02',
      changeId: 'eos-ladder-41-mission-fk',
      decision: 'PASS',
      mismatch: makeMockMismatch()
    });

    assert.equal(verifyBidirectionalMismatchQuarantineDenyReceipt(receipt).ok, true);
    assert.equal(verifyBidirectionalMismatchQuarantineDenyReceipt({ ...receipt, decision: 'DENY' }).ok, false);
    assert.equal(verifyBidirectionalMismatchQuarantineDenyReceipt({ ...receipt, receiptHash: 'f'.repeat(64) }).ok, false);
    assert.equal(verifyBidirectionalMismatchQuarantineDenyReceipt({ ...receipt, fundacionDelta: 1 }).ok, false);

    assert.deepEqual(Object.keys(canonicalBidirectionalMismatchQuarantineDenySealBody(receipt)), [
      'receiptId',
      'operation',
      'planId',
      'decision',
      'changeId',
      'mismatchDigest',
      'timestamp',
      'fundacionDelta',
      'prevReceiptHash'
    ]);
  });

  it('FK5: sequences FK-RCPT ids and supports prevReceiptHash chaining', () => {
    const first = buildBidirectionalMismatchQuarantineDenyReceipt({ planId: 'plan-fk-03', mismatch: makeMockMismatch() });
    const second = buildBidirectionalMismatchQuarantineDenyReceipt({
      planId: 'plan-fk-03',
      mismatch: makeMockMismatch(),
      prevReceiptHash: first.receiptHash
    });
    assert.equal(first.receiptId, 'FK-RCPT-0001');
    assert.equal(second.receiptId, 'FK-RCPT-0002');
    assert.equal(second.prevReceiptHash, first.receiptHash);
  });
});


describe('Mission FK — Mismatch Quarantine / Deny Policy Gate (SPEC-0173)', () => {
  const gate = new BidirectionalMismatchQuarantineDenyPolicyGate();

  it('FK6: happy path ACTIVE -> PASS on explicit MISMATCH + QUARANTINE', () => {
    const res = gate.evaluatePreconditions(makePlan());
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FK_CODES.OK);
    assert.equal(gate.evaluatePreconditions(makePlan({
      mismatch: makeMockMismatch({ desiredDisposition: 'DENY' })
    })).decision, 'PASS');
  });

  it('FK7: DENY missing planId/changeId/mismatch and invalid mismatch shape', () => {
    assert.equal(gate.evaluatePreconditions({}).code, FK_CODES.MISSING_PLAN_ID);
    assert.equal(gate.evaluatePreconditions({ planId: 'plan-fk-01', changeId: '' }).code, FK_CODES.MISSING_CHANGE_ID);
    assert.equal(gate.evaluatePreconditions({ planId: 'plan-fk-01', changeId: 'eos-ladder-41-mission-fk' }).code, FK_CODES.MISSING_MISMATCH);
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: 'not-an-object' })).code, FK_CODES.INVALID_MISMATCH);
  });

  it('FK8: DENY each missing required mismatch string field with dedicated code', () => {
    const cases = [
      ['correlationId', FK_CODES.MISSING_CORRELATION_ID],
      ['bindingId', FK_CODES.MISSING_BINDING_ID],
      ['roundTripId', FK_CODES.MISSING_ROUND_TRIP_ID],
      ['requestId', FK_CODES.MISSING_REQUEST_ID],
      ['replyId', FK_CODES.MISSING_REPLY_ID],
      ['mismatchClass', FK_CODES.MISSING_MISMATCH_CLASS]
    ];
    for (const [field, code] of cases) {
      assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ [field]: '' }) })).code, code, field);
    }
  });

  it('FK9: DENY missing/invalid request and reply digests (sha256 hex enforced)', () => {
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ requestDigest: '' }) })).code, FK_CODES.MISSING_REQUEST_DIGEST);
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ replyDigest: '' }) })).code, FK_CODES.MISSING_REPLY_DIGEST);
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ requestDigest: 'not-hex' }) })).code, FK_CODES.INVALID_REQUEST_DIGEST);
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ replyDigest: 'abc123' }) })).code, FK_CODES.INVALID_REPLY_DIGEST);
    assert.equal(isValidSha256Hex(makeDigest('x')), true);
    assert.equal(isValidSha256Hex('abc123'), false);
  });

  it('FK10: DENY missing/invalid desiredDisposition and observedVerdict', () => {
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ desiredDisposition: '' }) })).code, FK_CODES.MISSING_DESIRED_DISPOSITION);
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ desiredDisposition: 'DELETE' }) })).code, FK_CODES.INVALID_DESIRED_DISPOSITION);
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ observedVerdict: '' }) })).code, FK_CODES.MISSING_OBSERVED_VERDICT);
    assert.equal(gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ observedVerdict: 'OK' }) })).code, FK_CODES.INVALID_OBSERVED_VERDICT);
  });

  it('FK11: fail-closed DENY when quarantine claim is unauthorized', () => {
    const res = gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ authorized: false }) }));
    assert.equal(res.ok, false);
    assert.equal(res.code, FK_CODES.MISMATCH_UNAUTHORIZED);
  });

  it('FK12: VERIFIED / HOLD verdict => no-op HOLD (never a false quarantine)', () => {
    const verified = gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ observedVerdict: 'VERIFIED' }) }));
    assert.equal(verified.ok, true);
    assert.equal(verified.decision, 'HOLD');

    const held = gate.evaluatePreconditions(makePlan({ mismatch: makeMockMismatch({ observedVerdict: 'HOLD' }) }));
    assert.equal(held.ok, true);
    assert.equal(held.decision, 'HOLD');
  });

  it('FK13: Law VI DENY secret-looking fields and synthetic secret tokens', () => {
    const fieldRes = gate.evaluatePreconditions({ ...makePlan(), mismatchSecret: makeSyntheticSecret() });
    assert.equal(fieldRes.code, FK_CODES.SECRET_FIELD_FORBIDDEN);
    assert.equal(findSecretLookingField({ quarantineSecret: 'x' }), 'quarantineSecret');

    const tokenRes = gate.evaluatePreconditions({ ...makePlan(), note: makeSyntheticSecret() });
    assert.equal(tokenRes.code, FK_CODES.SECRET_LEAK_FORBIDDEN);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(scanForSecrets('opaque-note'), false);
  });


  it('FK14: refuses PRODUCTION_READY flip, tip rewrite, schema add, GHE, Fundacion, L30–L40 reopen, L41 auto-close, live egress, wall-clock, tip-refresh, FI/FJ/FL elevate, prune, auto-seal', () => {
    const cases = [
      [{ liveHttpEgress: true }, FK_CODES.LIVE_HTTP_EGRESS_FORBIDDEN],
      [{ wallClockAuthority: true }, FK_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN],
      [{ tipRefreshAuthority: true }, FK_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN],
      [{ rawSecretMaterial: true }, FK_CODES.RAW_MISMATCH_SECRET_MATERIAL_FORBIDDEN],
      [{ fiAsQuarantine: true }, FK_CODES.FI_AS_QUARANTINE_FORBIDDEN],
      [{ fjAsQuarantine: true }, FK_CODES.FJ_AS_QUARANTINE_FORBIDDEN],
      [{ flAsQuarantine: true }, FK_CODES.FL_AS_QUARANTINE_FORBIDDEN],
      [{ schemaJsonAdd: true }, FK_CODES.SCHEMA_JSON_ADD_FORBIDDEN],
      [{ productionReady: 'YES' }, FK_CODES.PRODUCTION_READY_FLIP_FORBIDDEN],
      [{ claimGhe: true }, FK_CODES.GHE_CLAIM_FORBIDDEN],
      [{ target: 'Fundacion/secret' }, FK_CODES.FUNDACION_DENIED],
      [{ reopenL30: true }, FK_CODES.L30_REOPEN_FORBIDDEN],
      [{ reopenL40: true }, FK_CODES.L40_REOPEN_FORBIDDEN],
      [{ autoCloseL41: true }, FK_CODES.L41_AUTO_CLOSE_FORBIDDEN],
      [{ tipRewrite: true }, FK_CODES.TIP_REWRITE_FORBIDDEN],
      [{ massPrune: true }, FK_CODES.MASS_PRUNE_FORBIDDEN],
      [{ hardDelete: true }, FK_CODES.HARD_DELETE_FORBIDDEN],
      [{ autoSeal: true }, FK_CODES.AUTO_SEAL_FORBIDDEN],
      [{ networkWrite: true }, FK_CODES.NETWORK_WRITE_FORBIDDEN]
    ];
    for (const [override, code] of cases) {
      assert.equal(gate.evaluatePreconditions(makePlan(override)).code, code, JSON.stringify(override));
    }

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY = YES'), true);
    assert.equal(claimsHardDelete('rm -rf /'), true);
    assert.equal(claimsMassPrune('mass prune all'), true);
    assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
    assert.equal(claimsLiveHttpEgress('claim live HTTP egress'), true);
    assert.equal(claimsWallClockAuthority('wall-clock authority'), true);
    assert.equal(claimsTipRefreshAuthority('tip-refresh authority'), true);
    assert.equal(claimsRawMismatchSecretMaterial('raw mismatch payload'), true);
    assert.equal(claimsLadderReopen('reopen ladder 40', 40), true);
    assert.equal(claimsL41AutoClose('auto-close ladder 41'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
  });
});

describe('Mission FK — Mismatch Quarantine / Deny Port (SPEC-0173)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FK15: govern happy path -> PASS + FK-RCPT-* + MISMATCH_QUARANTINED decision record', async () => {
    const port = new BidirectionalMismatchQuarantineDenyPort();
    const res = await port.govern(makePlan());

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FK_CODES.OK);
    assert.ok(res.receipt.receiptId.startsWith('FK-RCPT-'));
    assert.equal(res.receipt.mismatch.status, 'MISMATCH_QUARANTINED');
    assert.equal(res.receipt.mismatch.evaluated, true);
    assert.equal(res.receipt.mismatch.failClosed, true);
    assert.equal(res.receipt.mismatch.decisionRecordOnly, true);
    assert.equal(res.receipt.mismatch.noPayloadCopy, true);
    assert.equal(res.receipt.mismatch.consumesFiCorrelationBinding, true);
    assert.equal(res.receipt.mismatch.consumesFjRoundTripVerdict, true);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(port.productionReady, 'NO');
    assert.equal(port.trail.length, 1);
    assert.equal(port.verifyTrail().ok, true);
    assert.equal(port.verifyTrail().verifiedCount, 1);
  });

  it('FK16: govern VERIFIED verdict -> HOLD with zero quarantine and no PASS', async () => {
    const port = new BidirectionalMismatchQuarantineDenyPort();
    const res = await port.govern(
      makePlan({ mismatch: makeMockMismatch({ observedVerdict: 'VERIFIED' }) })
    );

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ritualMode, 'HOLD');
    assert.equal(port.trail.filter((r) => r.decision === 'PASS').length, 0);
    assert.equal(port.verifyTrail().ok, true);
  });

  it('FK17: DENY unauthorized is fail-closed, chain stays verifiable, tamper is detected', async () => {
    const port = new BidirectionalMismatchQuarantineDenyPort();
    const denied = await port.govern(
      makePlan({ mismatch: makeMockMismatch({ authorized: false }) })
    );

    assert.equal(denied.ok, false);
    assert.equal(denied.decision, 'DENY');
    assert.equal(denied.code, FK_CODES.MISMATCH_UNAUTHORIZED);
    assert.equal(denied.receipt.mismatch.status, 'MISMATCH_UNAUTHORIZED');

    const passed = await port.govern(makePlan({ planId: 'plan-fk-02' }));
    assert.equal(passed.decision, 'PASS');
    assert.equal(port.trail.length, 2);
    assert.equal(port.verifyTrail().ok, true);
    assert.equal(port.verifyTrail().verifiedCount, 2);

    port.trail[0] = { ...port.trail[0], receiptHash: 'e'.repeat(64) };
    const broken = port.verifyTrail();
    assert.equal(broken.ok, false);
    assert.equal(broken.verifiedCount, 0);
  });
});

