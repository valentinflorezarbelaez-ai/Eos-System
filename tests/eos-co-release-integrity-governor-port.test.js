/**
 * @file tests/eos-co-release-integrity-governor-port.test.js
 * SPEC-0098 / Mission CO — Release Integrity & Progressive Honesty Governor Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; no network / no GH API / digests only
 *   NON-CLAIM: ≠ Argo/Flagger / ≠ real canary / ≠ GHE / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CO_PRODUCTION_READY,
  CO_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CO_RECEIPT_KIND,
  CO_HONESTY_MODES,
  sha256Canonical,
  buildReleaseIntegrityReceipt,
  verifyReleaseIntegrityReceipt,
  canonicalReleaseIntegritySealBody,
  _resetReceiptSeqForTests
} from '../src/core/release/release-integrity-receipt.js';

import {
  ReleaseIntegrityPolicyGate,
  CO_CODES,
  CO_MAX_CLAIMS,
  CO_ID_PATTERN,
  CO_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsGheEnforcement,
  claimsArgoFlagger,
  claimsRealCanary,
  claimsProgressiveDeliverySaas,
  claimsProductionReadyFlip,
  isFundacionTarget,
  isTamperedDigest
} from '../src/core/release/release-integrity-policy-gate.js';

import {
  ReleaseIntegrityPort,
  CO_PORT_PRODUCTION_READY,
  CO_PORT_KIND,
  decisionForHonestyMode
} from '../src/core/release/release-integrity-port.js';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionReleaseIntegrity123456';
}

function goodDigest(seed = 'eos-co-release-integrity') {
  return sha256Canonical(seed);
}

function sampleHappyGovernPlan(overrides = {}) {
  return {
    planId: 'plan-l26-co-001',
    releaseId: 'release.rc.l26-co-001',
    integrityDigest: goodDigest('co-integrity-1'),
    attestDigest: goodDigest('cn-attest-prior'),
    bindDigest: goodDigest('cm-bind-prior'),
    linkDigest: goodDigest('cl-link-prior'),
    honestyMode: 'PROMOTE',
    claims: [
      {
        claimId: 'claim.integrity.core',
        claimType: 'release-integrity',
        digest: goodDigest('claim-1')
      }
    ],
    reasons: ['hermetic release-integrity govern'],
    label: 'happy pass govern',
    ...overrides
  };
}

describe('Mission CO — Release Integrity Receipt (SPEC-0098)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CO_PRODUCTION_READY, 'NO');
    assert.equal(CO_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CO_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CO_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CO-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildReleaseIntegrityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      releaseId: 'release.demo.1',
      decision: 'PASS',
      honestyMode: 'PROMOTE',
      integrityDigest: goodDigest('demo'),
      attestDigest: goodDigest('cn-prior'),
      bindDigest: goodDigest('cm-prior'),
      linkDigest: goodDigest('cl-prior'),
      claims: [
        {
          claimId: 'claim.demo.1',
          claimType: 'integrity',
          digest: goodDigest('c1')
        }
      ],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CO_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CO-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.releaseId, 'release.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.honestyMode, 'PROMOTE');
    assert.equal(receipt.claims.length, 1);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.argoFlagger, false);
    assert.equal(receipt.nonClaims.realCanary, false);
    assert.equal(receipt.nonClaims.progressiveDeliverySaas, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalReleaseIntegritySealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyReleaseIntegrityReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildReleaseIntegrityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      releaseId: 'release.t',
      decision: 'PASS',
      honestyMode: 'PROMOTE',
      integrityDigest: goodDigest('t')
    });

    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyReleaseIntegrityReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CO — Release Integrity Policy Gate (SPEC-0098)', () => {
  let gate;

  beforeEach(() => {
    gate = new ReleaseIntegrityPolicyGate();
  });

  it('validates a well-formed govern plan with releaseId↔integrityDigest (+ CN/CM/CL digests)', () => {
    const res = gate.evaluatePlan(sampleHappyGovernPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CO_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l26-co-001');
    assert.equal(res.releaseId, 'release.rc.l26-co-001');
    assert.equal(res.integrityDigest.length, 64);
    assert.equal(res.attestDigest.length, 64);
    assert.equal(res.bindDigest.length, 64);
    assert.equal(res.linkDigest.length, 64);
    assert.equal(res.honestyMode, 'PROMOTE');
    assert.ok(CO_ID_PATTERN.test('plan-l26-co-001'));
    assert.ok(CO_MAX_CLAIMS >= 1);
    assert.ok(CO_HONESTY_MODES.includes('HOLD'));
    assert.ok(CO_HONESTY_MODES.includes('PROMOTE'));
    assert.ok(CO_HONESTY_MODES.includes('ROLLBACK_HINT'));
  });

  it('rejects empty plan / missing planId / releaseId / honestyMode / integrity fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CO_CODES.EMPTY_PLAN_DENY);

    const noPlan = gate.evaluatePlan({
      releaseId: 'rel-1',
      integrityDigest: goodDigest('x'),
      honestyMode: 'HOLD'
    });
    assert.equal(noPlan.valid, false);
    assert.equal(noPlan.code, CO_CODES.MISSING_PLAN_ID_DENY);

    const noRelease = gate.evaluatePlan({
      planId: 'plan-1',
      integrityDigest: goodDigest('x'),
      honestyMode: 'HOLD'
    });
    assert.equal(noRelease.valid, false);
    assert.equal(noRelease.code, CO_CODES.MISSING_RELEASE_ID_DENY);

    const noMode = gate.evaluatePlan({
      planId: 'plan-1',
      releaseId: 'rel-1',
      integrityDigest: goodDigest('x')
    });
    assert.equal(noMode.valid, false);
    assert.equal(noMode.code, CO_CODES.MISSING_HONESTY_MODE_DENY);

    const noIntegrity = gate.evaluatePlan({
      planId: 'plan-1',
      releaseId: 'rel-1',
      honestyMode: 'HOLD'
    });
    assert.equal(noIntegrity.valid, false);
    assert.equal(noIntegrity.code, CO_CODES.MISSING_INTEGRITY_DIGEST_DENY);
  });

  it('rejects invalid honestyMode and oversized claim lists', () => {
    const badMode = gate.evaluatePlan({
      ...sampleHappyGovernPlan({ planId: 'plan-bad-mode' }),
      honestyMode: 'DEPLOY_LIVE'
    });
    assert.equal(badMode.valid, false);
    assert.equal(badMode.code, CO_CODES.INVALID_HONESTY_MODE_DENY);

    const tight = new ReleaseIntegrityPolicyGate({ maxClaims: 2 });
    const res = tight.evaluatePlan({
      planId: 'plan-over',
      releaseId: 'rel-over',
      honestyMode: 'HOLD',
      claims: [
        { claimId: 'c1', digest: goodDigest('1') },
        { claimId: 'c2', digest: goodDigest('2') },
        { claimId: 'c3', digest: goodDigest('3') }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CO_CODES.OVERSIZED_CLAIMS_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      ...sampleHappyGovernPlan(),
      label: `govern with key ${secret}`
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CO_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(
      isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'),
      true
    );

    const planLevel = gate.evaluatePlan({
      ...sampleHappyGovernPlan(),
      target: 'C:/Users/valen/Documents/Fundacion/out.json'
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CO_CODES.FUNDACION_ALWAYS_DENY);

    const releaseLevel = gate.evaluatePlan({
      planId: 'plan-fund-rel',
      releaseId: 'Fundacion/secret-release',
      integrityDigest: goodDigest('f'),
      honestyMode: 'HOLD'
    });
    assert.equal(releaseLevel.valid, false);
    assert.equal(releaseLevel.code, CO_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects Argo/Flagger, real canary, progressive-delivery SaaS, GHE, and PRODUCTION_READY flip claims', () => {
    assert.equal(claimsArgoFlagger('ships Argo/Flagger product'), true);
    assert.equal(claimsRealCanary('real canary deploy'), true);
    assert.equal(
      claimsProgressiveDeliverySaas('progressive delivery SaaS'),
      true
    );
    assert.equal(
      claimsGheEnforcement('claims GH Enterprise enforcement'),
      true
    );
    assert.equal(
      claimsProductionReadyFlip('flip PRODUCTION_READY=YES'),
      true
    );

    const argo = gate.evaluatePlan({
      ...sampleHappyGovernPlan({ planId: 'plan-argo' }),
      label: 'Argo/Flagger product surface'
    });
    assert.equal(argo.valid, false);
    assert.equal(argo.code, CO_CODES.ARGO_FLAGGER_CLAIM_DENY);

    const canary = gate.evaluatePlan({
      ...sampleHappyGovernPlan({ planId: 'plan-canary' }),
      label: 'real canary deploy guaranteed'
    });
    assert.equal(canary.valid, false);
    assert.equal(canary.code, CO_CODES.REAL_CANARY_CLAIM_DENY);

    const ghe = gate.evaluatePlan({
      ...sampleHappyGovernPlan({ planId: 'plan-ghe' }),
      label: 'verified via GitHub Enterprise enforcement'
    });
    assert.equal(ghe.valid, false);
    assert.equal(ghe.code, CO_CODES.GHE_ENFORCEMENT_CLAIM_DENY);

    const flip = gate.evaluatePlan({
      ...sampleHappyGovernPlan({ planId: 'plan-flip' }),
      label: 'claim PRODUCTION_READY=YES flip'
    });
    assert.equal(flip.valid, false);
    assert.equal(flip.code, CO_CODES.PRODUCTION_READY_FLIP_DENY);
  });

  it('rejects invalid and tampered digests fail-closed', () => {
    assert.equal(isTamperedDigest('TAMPERED_DIGEST_MARKER'), true);
    assert.equal(isTamperedDigest('0'.repeat(64)), true);

    const badHex = gate.evaluatePlan({
      planId: 'plan-bad-digest',
      releaseId: 'rel-bad',
      honestyMode: 'HOLD',
      integrityDigest: 'not-a-valid-sha256'
    });
    assert.equal(badHex.valid, false);
    assert.equal(badHex.code, CO_CODES.INVALID_INTEGRITY_DIGEST_DENY);

    const tampered = gate.evaluatePlan({
      planId: 'plan-tamper',
      releaseId: 'rel-tamper',
      honestyMode: 'HOLD',
      integrityDigest: '0'.repeat(64)
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.code, CO_CODES.TAMPERED_DIGEST_DENY);

    const badAttest = gate.evaluatePlan({
      planId: 'plan-bad-attest',
      releaseId: 'rel-attest',
      honestyMode: 'PROMOTE',
      integrityDigest: goodDigest('ok'),
      attestDigest: 'not-a-valid-sha256'
    });
    assert.equal(badAttest.valid, false);
    assert.equal(badAttest.code, CO_CODES.INVALID_ATTEST_DIGEST_DENY);

    const badBind = gate.evaluatePlan({
      planId: 'plan-bad-bind',
      releaseId: 'rel-bind',
      honestyMode: 'PROMOTE',
      integrityDigest: goodDigest('ok'),
      bindDigest: 'not-a-valid-sha256'
    });
    assert.equal(badBind.valid, false);
    assert.equal(badBind.code, CO_CODES.INVALID_BIND_DIGEST_DENY);

    const badLink = gate.evaluatePlan({
      planId: 'plan-bad-link',
      releaseId: 'rel-link',
      honestyMode: 'PROMOTE',
      integrityDigest: goodDigest('ok'),
      linkDigest: 'not-a-valid-sha256'
    });
    assert.equal(badLink.valid, false);
    assert.equal(badLink.code, CO_CODES.INVALID_LINK_DIGEST_DENY);
  });
});

describe('Mission CO — Release Integrity Port (SPEC-0098)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new ReleaseIntegrityPort();
  });

  it('govern happy path PROMOTE: releaseId↔integrityDigest (+ CN/CM/CL) → PASS + CO receipt', () => {
    const plan = sampleHappyGovernPlan();
    const res = port.govern(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CO_CODES.GOVERN_PASS);
    assert.equal(res.planId, 'plan-l26-co-001');
    assert.equal(res.honestyMode, 'PROMOTE');
    assert.equal(res.integrityDigest.length, 64);
    assert.equal(res.integrityPlanDigest.length, 64);

    assert.equal(res.receipt.kind, CO_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CO-RCPT-'));
    assert.equal(res.receipt.decision, 'PASS');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.nonClaims.argoFlagger, false);
    assert.equal(res.receipt.nonClaims.realCanary, false);
    assert.equal(res.receipt.nonClaims.ghEnterpriseEnforcement, false);

    const stored = port.getDecision(res.planId);
    assert.ok(stored);
    assert.equal(stored.decision, 'PASS');
  });

  it('govern HOLD and ROLLBACK_HINT → HOLD (hermetic labels — NOT real deploy)', () => {
    assert.equal(decisionForHonestyMode('PROMOTE'), 'PASS');
    assert.equal(decisionForHonestyMode('HOLD'), 'HOLD');
    assert.equal(decisionForHonestyMode('ROLLBACK_HINT'), 'HOLD');

    const hold = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-hold' }),
      honestyMode: 'HOLD'
    });
    assert.equal(hold.ok, true);
    assert.equal(hold.decision, 'HOLD');
    assert.equal(hold.code, CO_CODES.GOVERN_HOLD);
    assert.equal(hold.receipt.decision, 'HOLD');
    assert.ok(hold.receipt.receiptId.startsWith('CO-RCPT-'));

    const rollback = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-rollback' }),
      honestyMode: 'ROLLBACK_HINT'
    });
    assert.equal(rollback.ok, true);
    assert.equal(rollback.decision, 'HOLD');
    assert.equal(rollback.code, CO_CODES.GOVERN_HOLD);
    assert.equal(rollback.honestyMode, 'ROLLBACK_HINT');
  });

  it('evaluate() aliases govern(); integrityDigest-only plan (no prior digests/claims)', () => {
    const res = port.evaluate({
      planId: 'plan-digest-only',
      releaseId: 'release.digest.only',
      integrityDigest: goodDigest('solo'),
      honestyMode: 'PROMOTE'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CO_CODES.GOVERN_PASS);
    assert.equal(res.attestDigest, null);
    assert.equal(res.bindDigest, null);
    assert.equal(res.linkDigest, null);
    assert.ok(res.receipt.receiptId.startsWith('CO-RCPT-'));
  });

  it('deny empty / Fundacion / secrets / missing digest / claims emit sealed DENY', () => {
    const empty = port.govern({});
    assert.equal(empty.ok, false);
    assert.equal(empty.code, CO_CODES.EMPTY_PLAN_DENY);
    assert.equal(empty.receipt.decision, 'DENY');
    assert.ok(empty.receipt.receiptId.startsWith('CO-RCPT-'));

    const fund = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-fund' }),
      target: 'Documents/Fundacion/out'
    });
    assert.equal(fund.ok, false);
    assert.equal(fund.code, CO_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(verifyReleaseIntegrityReceipt(fund.receipt).ok, true);

    const secret = makeSyntheticSecret();
    const sec = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-secret' }),
      payload: { token: secret }
    });
    assert.equal(sec.ok, false);
    assert.equal(sec.code, CO_CODES.SECRET_DETECTED_DENY);

    const missing = port.govern({
      planId: 'plan-missing-digest',
      releaseId: 'rel-bare',
      honestyMode: 'HOLD'
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.code, CO_CODES.MISSING_INTEGRITY_DIGEST_DENY);

    const argo = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-argo-port' }),
      label: 'Argo/Flagger product guaranteed'
    });
    assert.equal(argo.ok, false);
    assert.equal(argo.code, CO_CODES.ARGO_FLAGGER_CLAIM_DENY);

    const flip = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-flip-port' }),
      label: 'PRODUCTION_READY=YES flip now'
    });
    assert.equal(flip.ok, false);
    assert.equal(flip.code, CO_CODES.PRODUCTION_READY_FLIP_DENY);

    const ghe = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-ghe-port' }),
      label: 'GHE enforcement guaranteed'
    });
    assert.equal(ghe.ok, false);
    assert.equal(ghe.code, CO_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('deny oversize claims and invalid honestyMode emit sealed DENY', () => {
    const tight = new ReleaseIntegrityPort({ maxClaims: 2 });
    const res = tight.govern({
      planId: 'plan-over-port',
      releaseId: 'rel-over',
      honestyMode: 'HOLD',
      claims: [
        { claimId: 'a', digest: goodDigest('a') },
        { claimId: 'b', digest: goodDigest('b') },
        { claimId: 'c', digest: goodDigest('c') }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CO_CODES.OVERSIZED_CLAIMS_DENY);
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CO-RCPT-'));

    const badMode = port.govern({
      ...sampleHappyGovernPlan({ planId: 'plan-bad-mode-port' }),
      honestyMode: 'LIVE_DEPLOY'
    });
    assert.equal(badMode.ok, false);
    assert.equal(badMode.code, CO_CODES.INVALID_HONESTY_MODE_DENY);
  });

  it('deny invalid / tampered digests emit sealed DENY', () => {
    const bad = port.govern({
      planId: 'plan-bad-hex',
      releaseId: 'rel-bad',
      honestyMode: 'HOLD',
      integrityDigest: 'not-a-valid-sha256'
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.decision, 'DENY');
    assert.equal(bad.code, CO_CODES.INVALID_INTEGRITY_DIGEST_DENY);
    assert.ok(bad.receipt.receiptId.startsWith('CO-RCPT-'));

    const tampered = port.govern({
      planId: 'plan-tamper-port',
      releaseId: 'rel-tamper',
      honestyMode: 'PROMOTE',
      integrityDigest: 'f'.repeat(64)
    });
    assert.equal(tampered.ok, false);
    assert.equal(tampered.code, CO_CODES.TAMPERED_DIGEST_DENY);
  });

  it('verifyTrail validates CO receipt chain; tamper breaks trail', () => {
    const a = port.govern(sampleHappyGovernPlan({ planId: 'trail-a' }));
    const b = port.govern({
      planId: 'trail-b',
      releaseId: 'release.trail.b',
      integrityDigest: goodDigest('trail-b'),
      honestyMode: 'HOLD',
      bindDigest: goodDigest('cm-trail-b')
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CO_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, planId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CO_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ Argo/Flagger / ≠ real canary / ≠ GHE / PRODUCTION_READY=NO', () => {
    assert.equal(CO_PORT_KIND, 'eos-release-integrity-port');
    const receipt = buildReleaseIntegrityReceipt({
      operation: 'GOVERN',
      planId: 'nonclaim',
      releaseId: 'rel-nc',
      decision: 'PASS',
      honestyMode: 'PROMOTE',
      integrityDigest: goodDigest('nc')
    });
    assert.equal(receipt.nonClaims.argoFlagger, false);
    assert.equal(receipt.nonClaims.realCanary, false);
    assert.equal(receipt.nonClaims.progressiveDeliverySaas, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CO_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CO_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');

    const claimsOnly = port.govern({
      planId: 'plan-claims-only',
      releaseId: 'release.claims.only',
      honestyMode: 'PROMOTE',
      claims: [
        {
          claimId: 'claim.multi.1',
          digest: goodDigest('m1'),
          claimType: 'integrity'
        },
        {
          claimId: 'claim.multi.2',
          digest: goodDigest('m2')
        }
      ],
      attestDigest: goodDigest('cn-m'),
      bindDigest: goodDigest('cm-m'),
      linkDigest: goodDigest('cl-m')
    });
    assert.equal(claimsOnly.ok, true);
    assert.equal(claimsOnly.decision, 'PASS');
    assert.equal(claimsOnly.claims.length, 2);
    assert.equal(claimsOnly.receipt.nonClaims.argoFlagger, false);
    assert.equal(claimsOnly.receipt.nonClaims.realCanary, false);
    assert.equal(claimsOnly.receipt.productionReady, 'NO');
  });
});
