/**
 * @file tests/eos-cq-local-ci-continuity-port.test.js
 * SPEC-0100 / Mission CQ — Local CI Continuity Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; no network / no GH API
 *   ci_environment: github_actions=BILLING_BLOCKED, local_surrogate=ACTIVE,
 *                   github_actions_verdict=NOT_RUN — never claim GH green
 *   NON-CLAIM: ≠ GHA green / ≠ GHE / ≠ PRODUCTION_READY=YES / ≠ reopen L26
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CQ_PRODUCTION_READY,
  CQ_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CQ_RECEIPT_KIND,
  CQ_CONTINUITY_MODES,
  CQ_CI_ENVIRONMENT_TEMPLATE,
  sha256Canonical,
  forceCiEnvironment,
  buildLocalCiContinuityReceipt,
  verifyLocalCiContinuityReceipt,
  canonicalLocalCiContinuitySealBody,
  _resetReceiptSeqForTests
} from '../src/core/ci/local-ci-continuity-receipt.js';

import {
  LocalCiContinuityPolicyGate,
  CQ_CODES,
  CQ_MAX_REASONS,
  CQ_ID_PATTERN,
  CQ_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsGheEnforcement,
  claimsGhaGreen,
  claimsProductionReadyFlip,
  isFundacionTarget,
  isTamperedDigest
} from '../src/core/ci/local-ci-continuity-policy-gate.js';

import {
  LocalCiContinuityPort,
  CQ_PORT_PRODUCTION_READY,
  CQ_PORT_KIND,
  decisionForContinuity,
  softImportSurrogate
} from '../src/core/ci/local-ci-continuity-port.js';

import * as surrogateDouble from './fixtures/local-ci-surrogate-double.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionLocalCiContinuity123456';
}

function goodDigest(seed = 'eos-cq-local-ci-continuity') {
  return sha256Canonical(seed);
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l27-cq-001',
    runId: 'run.local-ci.cq-001',
    continuityMode: 'ACTIVE',
    continuityDigest: goodDigest('cq-continuity-1'),
    surrogateInput: {
      assumeVerifyPass: true,
      skipVerifyStrict: true,
      dirty: false,
      stale: false,
      drift: false
    },
    reasons: ['hermetic local-ci continuity govern'],
    label: 'happy pass continuity',
    ...overrides
  };
}

describe('Mission CQ — Local CI Continuity Receipt (SPEC-0100)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CQ_PRODUCTION_READY, 'NO');
    assert.equal(CQ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CQ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CQ_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CQ-RCPT-* with BILLING_BLOCKED ci_environment', () => {
    const receipt = buildLocalCiContinuityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      runId: 'run.demo.1',
      decision: 'PASS',
      continuityMode: 'ACTIVE',
      continuityDigest: goodDigest('demo'),
      surrogateOk: true,
      verifyOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CQ_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CQ-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.runId, 'run.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.continuityMode, 'ACTIVE');
    assert.equal(receipt.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(receipt.ciEnvironment.local_surrogate, 'ACTIVE');
    assert.equal(receipt.ciEnvironment.github_actions_verdict, 'NOT_RUN');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.githubActionsGreen, false);
    assert.equal(receipt.nonClaims.gheEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(receipt.nonClaims.l26Reopen, false);

    const body = canonicalLocalCiContinuitySealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyLocalCiContinuityReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('forceCiEnvironment refuses GH green overrides; detects receipt tampering', () => {
    const forced = forceCiEnvironment({
      github_actions: 'GREEN',
      github_actions_verdict: 'PASS'
    });
    assert.equal(forced.github_actions, 'BILLING_BLOCKED');
    assert.equal(forced.github_actions_verdict, 'NOT_RUN');
    assert.ok(forced.refusal);
    assert.equal(CQ_CI_ENVIRONMENT_TEMPLATE.github_actions, 'BILLING_BLOCKED');

    const receipt = buildLocalCiContinuityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      runId: 'run.t',
      decision: 'PASS',
      continuityMode: 'ACTIVE',
      continuityDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyLocalCiContinuityReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CQ — Local CI Continuity Policy Gate (SPEC-0100)', () => {
  let gate;

  beforeEach(() => {
    gate = new LocalCiContinuityPolicyGate();
  });

  it('validates a well-formed continuity plan with planId↔runId + ACTIVE mode', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CQ_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l27-cq-001');
    assert.equal(res.runId, 'run.local-ci.cq-001');
    assert.equal(res.continuityDigest.length, 64);
    assert.equal(res.continuityMode, 'ACTIVE');
    assert.equal(res.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(res.ciEnvironment.github_actions_verdict, 'NOT_RUN');
    assert.ok(CQ_ID_PATTERN.test('plan-l27-cq-001'));
    assert.ok(CQ_MAX_REASONS >= 1);
    assert.ok(CQ_CONTINUITY_MODES.includes('ACTIVE'));
    assert.ok(CQ_CONTINUITY_MODES.includes('HOLD'));
  });

  it('rejects empty plan / missing planId / runId / continuityMode / digest fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CQ_CODES.EMPTY_PLAN_DENY);

    const noPlan = gate.evaluatePlan({
      runId: 'run-1',
      continuityDigest: goodDigest('x'),
      continuityMode: 'HOLD'
    });
    assert.equal(noPlan.valid, false);
    assert.equal(noPlan.code, CQ_CODES.MISSING_PLAN_ID_DENY);

    const noRun = gate.evaluatePlan({
      planId: 'plan-1',
      continuityDigest: goodDigest('x'),
      continuityMode: 'HOLD'
    });
    assert.equal(noRun.valid, false);
    assert.equal(noRun.code, CQ_CODES.MISSING_RUN_ID_DENY);

    const noMode = gate.evaluatePlan({
      planId: 'plan-1',
      runId: 'run-1',
      continuityDigest: goodDigest('x')
    });
    assert.equal(noMode.valid, false);
    assert.equal(noMode.code, CQ_CODES.MISSING_CONTINUITY_MODE_DENY);

    const noDigest = gate.evaluatePlan({
      planId: 'plan-1',
      runId: 'run-1',
      continuityMode: 'HOLD'
    });
    assert.equal(noDigest.valid, false);
    assert.equal(noDigest.code, CQ_CODES.MISSING_CONTINUITY_DIGEST_DENY);
  });

  it('rejects invalid continuityMode and oversized reasons', () => {
    const badMode = gate.evaluatePlan({
      ...sampleHappyPlan({ planId: 'plan-bad-mode' }),
      continuityMode: 'GHA_GREEN'
    });
    assert.equal(badMode.valid, false);
    assert.equal(badMode.code, CQ_CODES.INVALID_CONTINUITY_MODE_DENY);

    const tight = new LocalCiContinuityPolicyGate({ maxReasons: 2 });
    const res = tight.evaluatePlan({
      planId: 'plan-over',
      runId: 'run-over',
      continuityMode: 'HOLD',
      continuityDigest: goodDigest('over'),
      reasons: ['a', 'b', 'c']
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CQ_CODES.OVERSIZED_REASONS_DENY);
  });

  it('detects secrets (Law VI) and blocks Fundacion ALWAYS_DENY', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const sec = gate.evaluatePlan({
      ...sampleHappyPlan(),
      label: `govern with key ${secret}`
    });
    assert.equal(sec.valid, false);
    assert.equal(sec.code, CQ_CODES.SECRET_DETECTED_DENY);

    assert.equal(
      isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'),
      true
    );
    const fund = gate.evaluatePlan({
      ...sampleHappyPlan(),
      target: 'C:/Users/valen/Documents/Fundacion/out.json'
    });
    assert.equal(fund.valid, false);
    assert.equal(fund.code, CQ_CODES.FUNDACION_ALWAYS_DENY);

    const runFund = gate.evaluatePlan({
      planId: 'plan-fund-run',
      runId: 'Fundacion/secret-run',
      continuityDigest: goodDigest('f'),
      continuityMode: 'HOLD'
    });
    assert.equal(runFund.valid, false);
    assert.equal(runFund.code, CQ_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects GHA green, GHE enforcement, and PRODUCTION_READY flip claims', () => {
    assert.equal(claimsGhaGreen('claims GitHub Actions green'), true);
    assert.equal(
      claimsGheEnforcement('claims GH Enterprise enforcement'),
      true
    );
    assert.equal(
      claimsProductionReadyFlip('flip PRODUCTION_READY=YES'),
      true
    );

    const gha = gate.evaluatePlan({
      ...sampleHappyPlan({ planId: 'plan-gha' }),
      label: 'GitHub Actions green guaranteed'
    });
    assert.equal(gha.valid, false);
    assert.equal(gha.code, CQ_CODES.GHA_GREEN_CLAIM_DENY);

    const ghe = gate.evaluatePlan({
      ...sampleHappyPlan({ planId: 'plan-ghe' }),
      label: 'verified via GitHub Enterprise enforcement'
    });
    assert.equal(ghe.valid, false);
    assert.equal(ghe.code, CQ_CODES.GHE_ENFORCEMENT_CLAIM_DENY);

    const flip = gate.evaluatePlan({
      ...sampleHappyPlan({ planId: 'plan-flip' }),
      label: 'claim PRODUCTION_READY=YES flip'
    });
    assert.equal(flip.valid, false);
    assert.equal(flip.code, CQ_CODES.PRODUCTION_READY_FLIP_DENY);

    const envClaim = gate.evaluatePlan({
      ...sampleHappyPlan({ planId: 'plan-env-green' }),
      ciEnvironment: { github_actions: 'GREEN', github_actions_verdict: 'PASS' }
    });
    assert.equal(envClaim.valid, false);
    assert.equal(envClaim.code, CQ_CODES.GHA_GREEN_CLAIM_DENY);
  });

  it('rejects invalid and tampered digests fail-closed', () => {
    assert.equal(isTamperedDigest('TAMPERED_DIGEST_MARKER'), true);
    assert.equal(isTamperedDigest('0'.repeat(64)), true);

    const badHex = gate.evaluatePlan({
      planId: 'plan-bad-digest',
      runId: 'run-bad',
      continuityMode: 'HOLD',
      continuityDigest: 'not-a-valid-sha256'
    });
    assert.equal(badHex.valid, false);
    assert.equal(badHex.code, CQ_CODES.INVALID_CONTINUITY_DIGEST_DENY);

    const tampered = gate.evaluatePlan({
      planId: 'plan-tamper',
      runId: 'run-tamper',
      continuityMode: 'HOLD',
      continuityDigest: '0'.repeat(64)
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.code, CQ_CODES.TAMPERED_DIGEST_DENY);
  });
});

describe('Mission CQ — Local CI Continuity Port (SPEC-0100)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new LocalCiContinuityPort({
      surrogate: surrogateDouble,
      preferBuiltinDouble: false
    });
  });

  it('govern happy path ACTIVE: surrogate ok → PASS + CQ receipt with BILLING_BLOCKED', async () => {
    const plan = sampleHappyPlan();
    const res = await port.govern(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CQ_CODES.GOVERN_PASS);
    assert.equal(res.planId, 'plan-l27-cq-001');
    assert.equal(res.continuityMode, 'ACTIVE');
    assert.equal(res.continuityDigest.length, 64);
    assert.equal(res.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(res.ciEnvironment.local_surrogate, 'ACTIVE');
    assert.equal(res.ciEnvironment.github_actions_verdict, 'NOT_RUN');

    assert.equal(res.receipt.kind, CQ_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CQ-RCPT-'));
    assert.equal(res.receipt.decision, 'PASS');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(res.receipt.nonClaims.githubActionsGreen, false);

    const stored = port.getDecision(res.planId);
    assert.ok(stored);
    assert.equal(stored.decision, 'PASS');
  });

  it('govern HOLD → HOLD (observe; still BILLING_BLOCKED — NOT GHA green)', async () => {
    assert.equal(decisionForContinuity('ACTIVE', { ok: true }), 'PASS');
    assert.equal(decisionForContinuity('HOLD', { ok: true }), 'HOLD');
    assert.equal(decisionForContinuity('ACTIVE', { ok: false }), 'DENY');

    const hold = await port.govern({
      planId: 'plan-hold',
      runId: 'run.hold.1',
      continuityMode: 'HOLD',
      continuityDigest: goodDigest('hold')
    });
    assert.equal(hold.ok, true);
    assert.equal(hold.decision, 'HOLD');
    assert.equal(hold.code, CQ_CODES.GOVERN_HOLD);
    assert.equal(hold.receipt.decision, 'HOLD');
    assert.equal(hold.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(hold.ciEnvironment.github_actions_verdict, 'NOT_RUN');
    assert.ok(hold.receipt.receiptId.startsWith('CQ-RCPT-'));
  });

  it('evaluate() aliases govern(); gateSnapshot path seals PASS without live runner', async () => {
    const res = await port.evaluate({
      planId: 'plan-snapshot',
      runId: 'run.snapshot.1',
      continuityMode: 'ACTIVE',
      continuityDigest: goodDigest('snap'),
      gateSnapshot: {
        ok: true,
        primary_failure: null,
        dirty: { dirty: false },
        freeze_lag: { stale: false },
        mission_pack: { drift: { drifted: false } },
        verify_strict: { ok: true, source: 'recorded' }
      }
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CQ_CODES.GOVERN_PASS);
    assert.equal(res.ciEnvironment.github_actions_verdict, 'NOT_RUN');
    assert.ok(res.receipt.receiptId.startsWith('CQ-RCPT-'));
  });

  it('deny dirty/stale/drift/verify matrix via surrogate → sealed DENY', async () => {
    const dirty = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-dirty' }),
      surrogateInput: { dirty: true, assumeVerifyPass: true, skipVerifyStrict: true }
    });
    assert.equal(dirty.ok, false);
    assert.equal(dirty.decision, 'DENY');
    assert.equal(dirty.code, CQ_CODES.SURROGATE_FAIL_DENY);
    assert.equal(dirty.dirty, true);
    assert.ok(dirty.receipt.receiptId.startsWith('CQ-RCPT-'));
    assert.equal(dirty.ciEnvironment.github_actions, 'BILLING_BLOCKED');

    const stale = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-stale' }),
      surrogateInput: { stale: true, assumeVerifyPass: true, skipVerifyStrict: true }
    });
    assert.equal(stale.ok, false);
    assert.equal(stale.stale, true);
    assert.equal(stale.code, CQ_CODES.SURROGATE_FAIL_DENY);

    const drift = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-drift' }),
      surrogateInput: { drift: true, assumeVerifyPass: true, skipVerifyStrict: true }
    });
    assert.equal(drift.ok, false);
    assert.equal(drift.drift, true);

    const verifyFail = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-verify-fail' }),
      surrogateInput: {
        verifyFail: true,
        recordedResult: { ok: false, exitCode: 6 }
      }
    });
    assert.equal(verifyFail.ok, false);
    assert.equal(verifyFail.verifyOk, false);
  });

  it('deny empty / Fundacion / secrets / GHA green / GHE / PRODUCTION_READY flip emit sealed DENY', async () => {
    const empty = await port.govern({});
    assert.equal(empty.ok, false);
    assert.equal(empty.code, CQ_CODES.EMPTY_PLAN_DENY);
    assert.equal(empty.receipt.decision, 'DENY');
    assert.ok(empty.receipt.receiptId.startsWith('CQ-RCPT-'));

    const fund = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-fund' }),
      target: 'Documents/Fundacion/out'
    });
    assert.equal(fund.ok, false);
    assert.equal(fund.code, CQ_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(verifyLocalCiContinuityReceipt(fund.receipt).ok, true);

    const secret = makeSyntheticSecret();
    const sec = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-secret' }),
      payload: { token: secret }
    });
    assert.equal(sec.ok, false);
    assert.equal(sec.code, CQ_CODES.SECRET_DETECTED_DENY);

    const gha = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-gha-port' }),
      label: 'GitHub Actions green guaranteed'
    });
    assert.equal(gha.ok, false);
    assert.equal(gha.code, CQ_CODES.GHA_GREEN_CLAIM_DENY);

    const flip = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-flip-port' }),
      label: 'PRODUCTION_READY=YES flip now'
    });
    assert.equal(flip.ok, false);
    assert.equal(flip.code, CQ_CODES.PRODUCTION_READY_FLIP_DENY);

    const ghe = await port.govern({
      ...sampleHappyPlan({ planId: 'plan-ghe-port' }),
      label: 'GHE enforcement guaranteed'
    });
    assert.equal(ghe.ok, false);
    assert.equal(ghe.code, CQ_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('verifyTrail validates CQ receipt chain; tamper breaks trail', async () => {
    const a = await port.govern(sampleHappyPlan({ planId: 'trail-a' }));
    const b = await port.govern({
      planId: 'trail-b',
      runId: 'run.trail.b',
      continuityDigest: goodDigest('trail-b'),
      continuityMode: 'HOLD'
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CQ_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, planId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CQ_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ GHA green / ≠ GHE / PRODUCTION_READY=NO; soft-import optional', async () => {
    assert.equal(CQ_PORT_KIND, 'eos-local-ci-continuity-port');
    const receipt = buildLocalCiContinuityReceipt({
      operation: 'GOVERN',
      planId: 'nonclaim',
      runId: 'run-nc',
      decision: 'PASS',
      continuityMode: 'ACTIVE',
      continuityDigest: goodDigest('nc')
    });
    assert.equal(receipt.nonClaims.githubActionsGreen, false);
    assert.equal(receipt.nonClaims.gheEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(receipt.nonClaims.l26Reopen, false);
    assert.equal(CQ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CQ_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(receipt.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(receipt.ciEnvironment.github_actions_verdict, 'NOT_RUN');

    // Soft-import may be null on hermetic box (no co-located surrogate) — OK
    const soft = await softImportSurrogate(
      path.join(__dirname, '../src/core/ci/local-ci-surrogate.js')
    );
    assert.ok(soft === null || typeof soft.runLocalCiSurrogate === 'function');

    // Builtin double path still seals BILLING_BLOCKED
    const builtinPort = new LocalCiContinuityPort({ preferBuiltinDouble: true });
    const res = await builtinPort.govern({
      planId: 'plan-builtin',
      runId: 'run.builtin.1',
      continuityMode: 'ACTIVE',
      continuityDigest: goodDigest('builtin'),
      surrogateInput: { assumeVerifyPass: true, skipVerifyStrict: true }
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(res.ciEnvironment.github_actions_verdict, 'NOT_RUN');
  });
});
