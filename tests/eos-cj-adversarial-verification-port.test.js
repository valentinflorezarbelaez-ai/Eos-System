/**
 * @file tests/eos-cj-adversarial-verification-port.test.js
 * SPEC-0093 / Mission CJ — Continuous Adversarial Verification Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   Hermetic: no network / no GH API; challenges MEASURED claims via digests.
 *   NON-CLAIM: ≠ red-team consulting product / ≠ claims GH Enterprise enforcement / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CJ_PRODUCTION_READY,
  CJ_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CJ_RECEIPT_KIND,
  sha256Canonical,
  buildAdversarialVerificationReceipt,
  verifyAdversarialVerificationReceipt,
  canonicalAdversarialVerificationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/verification/adversarial-verification-receipt.js';

import {
  AdversarialVerificationPolicyGate,
  CJ_CODES,
  CJ_MAX_TARGETS,
  CJ_ID_PATTERN,
  CJ_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsGheEnforcement,
  isFundacionTarget
} from '../src/core/verification/adversarial-verification-policy-gate.js';

import {
  AdversarialVerificationPort,
  CJ_PORT_PRODUCTION_READY,
  CJ_PORT_KIND
} from '../src/core/verification/adversarial-verification-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionAdversarialVerify123456';
}

function goodDigest(seed = 'eos-cj-measured-evidence') {
  return sha256Canonical(seed);
}

function sampleHappyProbePlan(overrides = {}) {
  const digest = goodDigest('cg-measured-ok');
  return {
    probeId: 'probe-l25-cj-001',
    targets: [
      {
        claimId: 'claim-cg-measured',
        claimedStatus: 'MEASURED',
        evidenceDigest: digest,
        expectedDigest: digest
      }
    ],
    reasons: ['hermetic MEASURED probe'],
    label: 'happy pass probe',
    ...overrides
  };
}

describe('Mission CJ — Adversarial Verification Receipt (SPEC-0093)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CJ_PRODUCTION_READY, 'NO');
    assert.equal(CJ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CJ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CJ_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CJ-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildAdversarialVerificationReceipt({
      operation: 'PROBE',
      probeId: 'probe-demo',
      decision: 'PASS',
      targets: [
        { claimId: 'c1', claimedStatus: 'MEASURED' }
      ],
      findings: [
        { severity: 'INFO', message: 'ok' }
      ],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CJ_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CJ-RCPT-'));
    assert.equal(receipt.probeId, 'probe-demo');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.targetCount, 1);
    assert.equal(receipt.targets.length, 1);
    assert.equal(receipt.findings.length, 1);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.redTeamConsultingProduct, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalAdversarialVerificationSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyAdversarialVerificationReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildAdversarialVerificationReceipt({
      operation: 'PROBE',
      probeId: 'probe-demo',
      decision: 'PASS',
      targets: [{ claimId: 'c1', claimedStatus: 'MEASURED' }]
    });

    const tampered = { ...receipt, probeId: 'probe-tampered-hacked' };
    const verifyRes = verifyAdversarialVerificationReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CJ — Adversarial Verification Policy Gate (SPEC-0093)', () => {
  let gate;

  beforeEach(() => {
    gate = new AdversarialVerificationPolicyGate();
  });

  it('validates a well-formed probe plan with MEASURED target', () => {
    const digest = goodDigest();
    const res = gate.evaluatePlan(
      sampleHappyProbePlan({
        targets: [
          {
            claimId: 'claim-cg-measured',
            claimedStatus: 'MEASURED',
            evidenceDigest: digest,
            expectedDigest: digest
          }
        ]
      })
    );
    assert.equal(res.valid, true);
    assert.equal(res.code, CJ_CODES.PLAN_VALID_OK);
    assert.equal(res.probeId, 'probe-l25-cj-001');
    assert.equal(res.targets.length, 1);
    assert.equal(res.targets[0].claimedStatus, 'MEASURED');
    assert.ok(CJ_ID_PATTERN.test('probe-l25-cj-001'));
    assert.ok(CJ_MAX_TARGETS >= 1);
  });

  it('rejects empty probe / missing probeId / missing targets fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CJ_CODES.EMPTY_PROBE_DENY);

    const noProbe = gate.evaluatePlan({
      targets: [{ claimId: 'c1', claimedStatus: 'MEASURED' }]
    });
    assert.equal(noProbe.valid, false);
    assert.equal(noProbe.code, CJ_CODES.MISSING_PROBE_ID_DENY);

    const noTargets = gate.evaluatePlan({ probeId: 'probe-1' });
    assert.equal(noTargets.valid, false);
    assert.equal(noTargets.code, CJ_CODES.MISSING_TARGETS_DENY);
  });

  it('rejects invalid claim status', () => {
    const res = gate.evaluatePlan({
      probeId: 'probe-bad-status',
      targets: [{ claimId: 'c1', claimedStatus: 'GREEN' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CJ_CODES.INVALID_CLAIM_STATUS_DENY);
  });

  it('rejects oversized targets beyond max bound', () => {
    const tight = new AdversarialVerificationPolicyGate({ maxTargets: 2 });
    const res = tight.evaluatePlan({
      probeId: 'probe-over',
      targets: [
        { claimId: 'a', claimedStatus: 'UNKNOWN' },
        { claimId: 'b', claimedStatus: 'UNKNOWN' },
        { claimId: 'c', claimedStatus: 'UNKNOWN' }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CJ_CODES.OVERSIZED_TARGETS_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      ...sampleHappyProbePlan(),
      label: `probe with key ${secret}`
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CJ_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluatePlan({
      ...sampleHappyProbePlan(),
      target: 'C:/Users/valen/Documents/Fundacion/out.json'
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CJ_CODES.FUNDACION_ALWAYS_DENY);

    const idLevel = gate.evaluatePlan({
      ...sampleHappyProbePlan({ probeId: 'fundacion/bleed' })
    });
    assert.equal(idLevel.valid, false);
    assert.equal(idLevel.code, CJ_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects claiming GHE enforcement in labels (NON-CLAIM)', () => {
    assert.equal(
      claimsGheEnforcement('claims GH Enterprise enforcement'),
      true
    );

    const res = gate.evaluatePlan({
      ...sampleHappyProbePlan(),
      label: 'verified via GitHub Enterprise enforcement'
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CJ_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });
});

describe('Mission CJ — Adversarial Verification Port (SPEC-0093)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new AdversarialVerificationPort();
  });

  it('probe happy path: consistent MEASURED → PASS + CJ receipt', () => {
    const plan = sampleHappyProbePlan();
    const res = port.probe(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CJ_CODES.PROBE_PASS);
    assert.equal(res.probeId, 'probe-l25-cj-001');
    assert.equal(res.probeDigest.length, 64);
    assert.ok(res.findings.some((f) => f.severity === 'INFO'));

    assert.equal(res.receipt.kind, CJ_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CJ-RCPT-'));
    assert.equal(res.receipt.decision, 'PASS');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.nonClaims.redTeamConsultingProduct, false);
    assert.equal(res.receipt.nonClaims.ghEnterpriseEnforcement, false);

    const stored = port.getProbe(res.probeId);
    assert.ok(stored);
    assert.equal(stored.decision, 'PASS');
  });

  it('CHALLENGE on weak evidence (WARN finding)', () => {
    const digest = goodDigest('weak-evidence');
    const res = port.probe({
      probeId: 'probe-weak-1',
      targets: [
        {
          claimId: 'claim-weak',
          claimedStatus: 'MEASURED',
          evidenceDigest: digest,
          expectedDigest: digest,
          evidenceQuality: 'weak'
        }
      ]
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'CHALLENGE');
    assert.equal(res.code, CJ_CODES.PROBE_CHALLENGE);
    assert.ok(res.findings.some((f) => f.severity === 'WARN'));
    assert.ok(res.receipt.receiptId.startsWith('CJ-RCPT-'));
    assert.equal(res.receipt.decision, 'CHALLENGE');
    assert.equal(res.receipt.productionReady, 'NO');
  });

  it('DENY when MEASURED claim lacks evidenceDigest', () => {
    const res = port.probe({
      probeId: 'probe-miss-evd',
      targets: [
        { claimId: 'claim-no-digest', claimedStatus: 'MEASURED' }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, CJ_CODES.PROBE_DENY);
    assert.ok(
      res.findings.some(
        (f) => f.severity === 'FAIL' && /evidenceDigest missing/.test(f.message)
      )
    );
    assert.ok(res.receipt.receiptId.startsWith('CJ-RCPT-'));
  });

  it('DENY when evidenceDigest tampered vs expectedDigest', () => {
    const res = port.probe({
      probeId: 'probe-tamper-evd',
      targets: [
        {
          claimId: 'claim-tampered',
          claimedStatus: 'MEASURED',
          evidenceDigest: goodDigest('actual'),
          expectedDigest: goodDigest('expected-other')
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, CJ_CODES.PROBE_DENY);
    assert.ok(
      res.findings.some(
        (f) => f.severity === 'FAIL' && /tampered/.test(f.message)
      )
    );
  });

  it('deny empty / Fundacion / secrets / bad claim / GHE emit sealed DENY', () => {
    const empty = port.probe({});
    assert.equal(empty.ok, false);
    assert.equal(empty.code, CJ_CODES.EMPTY_PROBE_DENY);
    assert.equal(empty.receipt.decision, 'DENY');
    assert.ok(empty.receipt.receiptId.startsWith('CJ-RCPT-'));

    const fund = port.probe({
      ...sampleHappyProbePlan({ probeId: 'probe-fund' }),
      target: 'Documents/Fundacion/out'
    });
    assert.equal(fund.ok, false);
    assert.equal(fund.code, CJ_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(verifyAdversarialVerificationReceipt(fund.receipt).ok, true);

    const secret = makeSyntheticSecret();
    const sec = port.probe({
      ...sampleHappyProbePlan({ probeId: 'probe-secret' }),
      payload: { token: secret }
    });
    assert.equal(sec.ok, false);
    assert.equal(sec.code, CJ_CODES.SECRET_DETECTED_DENY);

    const bad = port.probe({
      probeId: 'probe-bad-claim',
      targets: [{ claimId: 'c1', claimedStatus: 'READY' }]
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.code, CJ_CODES.INVALID_CLAIM_STATUS_DENY);

    const ghe = port.probe({
      ...sampleHappyProbePlan({ probeId: 'probe-ghe' }),
      label: 'GHE enforcement guaranteed'
    });
    assert.equal(ghe.ok, false);
    assert.equal(ghe.code, CJ_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('deny oversize targets emits sealed DENY receipt', () => {
    const tight = new AdversarialVerificationPort({ maxTargets: 2 });
    const res = tight.probe({
      probeId: 'probe-over-port',
      targets: [
        { claimId: 'a', claimedStatus: 'UNKNOWN' },
        { claimId: 'b', claimedStatus: 'UNKNOWN' },
        { claimId: 'c', claimedStatus: 'UNKNOWN' }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CJ_CODES.OVERSIZED_TARGETS_DENY);
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CJ-RCPT-'));
  });

  it('DENY when MEASURED evidenceDigest is not sha256 hex', () => {
    const res = port.probe({
      probeId: 'probe-bad-hex',
      targets: [
        {
          claimId: 'claim-bad-hex',
          claimedStatus: 'MEASURED',
          evidenceDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, CJ_CODES.PROBE_DENY);
    assert.ok(
      res.findings.some(
        (f) => f.severity === 'FAIL' && /not sha256 hex|tampered/.test(f.message)
      )
    );
  });

  it('verifyTrail validates CJ receipt chain; tamper breaks trail', () => {
    const a = port.probe(sampleHappyProbePlan({ probeId: 'trail-a' }));
    const digest = goodDigest('trail-b-weak');
    const b = port.probe({
      probeId: 'trail-b',
      targets: [
        {
          claimId: 'claim-b',
          claimedStatus: 'MEASURED',
          evidenceDigest: digest,
          expectedDigest: digest,
          evidenceQuality: 'weak'
        }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CJ_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, probeId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CJ_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ red-team product / ≠ GHE / PRODUCTION_READY=NO', () => {
    assert.equal(CJ_PORT_KIND, 'eos-adversarial-verification-port');
    const receipt = buildAdversarialVerificationReceipt({
      operation: 'PROBE',
      probeId: 'nonclaim',
      decision: 'PASS',
      targets: [{ claimId: 'c', claimedStatus: 'UNKNOWN' }]
    });
    assert.equal(receipt.nonClaims.redTeamConsultingProduct, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CJ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CJ_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');

    // UNKNOWN/BLOCKED claims are acknowledged without asserting MEASURED
    const mixed = port.probe({
      probeId: 'probe-mixed-status',
      targets: [
        { claimId: 'u1', claimedStatus: 'UNKNOWN' },
        { claimId: 'b1', claimedStatus: 'BLOCKED' }
      ]
    });
    assert.equal(mixed.ok, true);
    assert.equal(mixed.decision, 'PASS');
    assert.equal(mixed.receipt.nonClaims.redTeamConsultingProduct, false);
    assert.equal(mixed.receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(mixed.receipt.productionReady, 'NO');
  });
});
