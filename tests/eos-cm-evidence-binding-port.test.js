/**
 * @file tests/eos-cm-evidence-binding-port.test.js
 * SPEC-0096 / Mission CM — Evidence Binding & Claim Custody Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; no network / no GH API
 *   NON-CLAIM: ≠ WORM SaaS / ≠ external audit product / ≠ GHE / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CM_PRODUCTION_READY,
  CM_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CM_RECEIPT_KIND,
  sha256Canonical,
  buildEvidenceBindingReceipt,
  verifyEvidenceBindingReceipt,
  canonicalEvidenceBindingSealBody,
  _resetReceiptSeqForTests
} from '../src/core/evidence/evidence-binding-receipt.js';

import {
  EvidenceBindingPolicyGate,
  CM_CODES,
  CM_MAX_CLAIMS,
  CM_ID_PATTERN,
  CM_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsGheEnforcement,
  claimsWormSaas,
  claimsExternalAuditProduct,
  claimsSiemProduct,
  claimsDataLake,
  isFundacionTarget,
  isTamperedDigest
} from '../src/core/evidence/evidence-binding-policy-gate.js';

import {
  EvidenceBindingPort,
  CM_PORT_PRODUCTION_READY,
  CM_PORT_KIND
} from '../src/core/evidence/evidence-binding-port.js';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionEvidenceBind123456';
}

function goodDigest(seed = 'eos-cm-evidence-binding') {
  return sha256Canonical(seed);
}

function sampleHappyBindPlan(overrides = {}) {
  return {
    planId: 'plan-l26-cm-001',
    claims: [
      {
        claimId: 'claim.measured.l26-cm-001',
        evidenceDigest: goodDigest('cm-claim-1'),
        linkDigest: goodDigest('cl-link-prior'),
        specId: 'SPEC-0096',
        codePath: 'src/core/evidence/evidence-binding-port.js'
      }
    ],
    reasons: ['hermetic claim↔evidence custody'],
    label: 'happy pass bind',
    ...overrides
  };
}

describe('Mission CM — Evidence Binding Receipt (SPEC-0096)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CM_PRODUCTION_READY, 'NO');
    assert.equal(CM_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CM_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CM_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CM-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildEvidenceBindingReceipt({
      operation: 'BIND',
      planId: 'plan-demo',
      decision: 'PASS',
      claims: [
        {
          claimId: 'claim.demo.1',
          evidenceDigest: goodDigest('demo'),
          linkDigest: goodDigest('cl-prior')
        }
      ],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CM_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CM-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.claimCount, 1);
    assert.equal(receipt.claims.length, 1);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.wormSaas, false);
    assert.equal(receipt.nonClaims.externalAuditProduct, false);
    assert.equal(receipt.nonClaims.siemRetentionSaas, false);
    assert.equal(receipt.nonClaims.productionDataLake, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalEvidenceBindingSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyEvidenceBindingReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildEvidenceBindingReceipt({
      operation: 'BIND',
      planId: 'plan-demo',
      decision: 'PASS',
      claims: [
        { claimId: 'claim.t', evidenceDigest: goodDigest('t') }
      ]
    });

    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyEvidenceBindingReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CM — Evidence Binding Policy Gate (SPEC-0096)', () => {
  let gate;

  beforeEach(() => {
    gate = new EvidenceBindingPolicyGate();
  });

  it('validates a well-formed bind plan with claimId↔evidenceDigest (+ optional CL linkDigest)', () => {
    const res = gate.evaluatePlan(sampleHappyBindPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CM_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l26-cm-001');
    assert.equal(res.claims.length, 1);
    assert.equal(res.claims[0].claimId, 'claim.measured.l26-cm-001');
    assert.equal(res.claims[0].evidenceDigest.length, 64);
    assert.equal(res.claims[0].linkDigest.length, 64);
    assert.ok(CM_ID_PATTERN.test('plan-l26-cm-001'));
    assert.ok(CM_MAX_CLAIMS >= 1);
  });

  it('rejects empty plan / missing planId / missing claims fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CM_CODES.EMPTY_PLAN_DENY);

    const noPlan = gate.evaluatePlan({
      claims: [{ claimId: 'c1', evidenceDigest: goodDigest('x') }]
    });
    assert.equal(noPlan.valid, false);
    assert.equal(noPlan.code, CM_CODES.MISSING_PLAN_ID_DENY);

    const noClaims = gate.evaluatePlan({ planId: 'plan-1' });
    assert.equal(noClaims.valid, false);
    assert.equal(noClaims.code, CM_CODES.MISSING_CLAIMS_DENY);
  });

  it('rejects claim missing evidenceDigest', () => {
    const res = gate.evaluatePlan({
      planId: 'plan-no-digest',
      claims: [{ claimId: 'claim.bare' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CM_CODES.MISSING_EVIDENCE_DIGEST_DENY);
  });

  it('rejects oversized claim sets beyond max bound', () => {
    const tight = new EvidenceBindingPolicyGate({ maxClaims: 2 });
    const res = tight.evaluatePlan({
      planId: 'plan-over',
      claims: [
        { claimId: 'c1', evidenceDigest: goodDigest('1') },
        { claimId: 'c2', evidenceDigest: goodDigest('2') },
        { claimId: 'c3', evidenceDigest: goodDigest('3') }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CM_CODES.OVERSIZED_CLAIMS_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      ...sampleHappyBindPlan(),
      label: `bind with key ${secret}`
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CM_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(
      isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'),
      true
    );

    const planLevel = gate.evaluatePlan({
      ...sampleHappyBindPlan(),
      target: 'C:/Users/valen/Documents/Fundacion/out.json'
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CM_CODES.FUNDACION_ALWAYS_DENY);

    const pathLevel = gate.evaluatePlan({
      planId: 'plan-fund-path',
      claims: [
        {
          claimId: 'claim.fund',
          evidenceDigest: goodDigest('f'),
          codePath: 'Documents/Fundacion/secret.js'
        }
      ]
    });
    assert.equal(pathLevel.valid, false);
    assert.equal(pathLevel.code, CM_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects WORM SaaS, external audit, SIEM, data lake, and GHE claim labels (NON-CLAIM)', () => {
    assert.equal(claimsWormSaas('ships WORM SaaS retention'), true);
    assert.equal(
      claimsExternalAuditProduct('external audit product surface'),
      true
    );
    assert.equal(claimsSiemProduct('SIEM retention SaaS'), true);
    assert.equal(claimsDataLake('production data lake'), true);
    assert.equal(
      claimsGheEnforcement('claims GH Enterprise enforcement'),
      true
    );

    const worm = gate.evaluatePlan({
      ...sampleHappyBindPlan({ planId: 'plan-worm' }),
      label: 'commercial WORM product'
    });
    assert.equal(worm.valid, false);
    assert.equal(worm.code, CM_CODES.WORM_SAAS_CLAIM_DENY);

    const audit = gate.evaluatePlan({
      ...sampleHappyBindPlan({ planId: 'plan-audit' }),
      label: 'powered by external audit SaaS'
    });
    assert.equal(audit.valid, false);
    assert.equal(audit.code, CM_CODES.EXTERNAL_AUDIT_CLAIM_DENY);

    const ghe = gate.evaluatePlan({
      ...sampleHappyBindPlan({ planId: 'plan-ghe' }),
      label: 'verified via GitHub Enterprise enforcement'
    });
    assert.equal(ghe.valid, false);
    assert.equal(ghe.code, CM_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('rejects invalid and tampered digests fail-closed', () => {
    assert.equal(isTamperedDigest('TAMPERED_DIGEST_MARKER'), true);
    assert.equal(isTamperedDigest('0'.repeat(64)), true);

    const badHex = gate.evaluatePlan({
      planId: 'plan-bad-digest',
      claims: [
        {
          claimId: 'claim.bad',
          evidenceDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(badHex.valid, false);
    assert.equal(badHex.code, CM_CODES.INVALID_EVIDENCE_DIGEST_DENY);

    const tampered = gate.evaluatePlan({
      planId: 'plan-tamper',
      claims: [
        {
          claimId: 'claim.tamper',
          evidenceDigest: '0'.repeat(64)
        }
      ]
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.code, CM_CODES.TAMPERED_DIGEST_DENY);

    const badLink = gate.evaluatePlan({
      planId: 'plan-bad-link',
      claims: [
        {
          claimId: 'claim.link',
          evidenceDigest: goodDigest('ok'),
          linkDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(badLink.valid, false);
    assert.equal(badLink.code, CM_CODES.INVALID_LINK_DIGEST_DENY);
  });
});

describe('Mission CM — Evidence Binding Port (SPEC-0096)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new EvidenceBindingPort();
  });

  it('bind happy path: claimId↔evidenceDigest (+ CL linkDigest) → PASS + CM receipt', () => {
    const plan = sampleHappyBindPlan();
    const res = port.bind(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CM_CODES.BIND_PASS);
    assert.equal(res.planId, 'plan-l26-cm-001');
    assert.equal(res.bindingDigest.length, 64);

    assert.equal(res.receipt.kind, CM_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CM-RCPT-'));
    assert.equal(res.receipt.decision, 'PASS');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.nonClaims.wormSaas, false);
    assert.equal(res.receipt.nonClaims.externalAuditProduct, false);
    assert.equal(res.receipt.nonClaims.ghEnterpriseEnforcement, false);

    const stored = port.getBinding(res.planId);
    assert.ok(stored);
    assert.equal(stored.decision, 'PASS');
  });

  it('claim alias equals bind for evidenceDigest-only claim (no linkDigest)', () => {
    const res = port.claim({
      planId: 'plan-digest-only',
      claims: [
        {
          claimId: 'claim.digest.only',
          evidenceDigest: goodDigest('solo'),
          specId: 'SPEC-0096'
        }
      ]
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CM_CODES.BIND_PASS);
    assert.equal(res.claims[0].linkDigest, null);
    assert.ok(res.receipt.receiptId.startsWith('CM-RCPT-'));
  });

  it('deny empty / Fundacion / secrets / missing digest / claims emit sealed DENY', () => {
    const empty = port.bind({});
    assert.equal(empty.ok, false);
    assert.equal(empty.code, CM_CODES.EMPTY_PLAN_DENY);
    assert.equal(empty.receipt.decision, 'DENY');
    assert.ok(empty.receipt.receiptId.startsWith('CM-RCPT-'));

    const fund = port.bind({
      ...sampleHappyBindPlan({ planId: 'plan-fund' }),
      target: 'Documents/Fundacion/out'
    });
    assert.equal(fund.ok, false);
    assert.equal(fund.code, CM_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(verifyEvidenceBindingReceipt(fund.receipt).ok, true);

    const secret = makeSyntheticSecret();
    const sec = port.bind({
      ...sampleHappyBindPlan({ planId: 'plan-secret' }),
      payload: { token: secret }
    });
    assert.equal(sec.ok, false);
    assert.equal(sec.code, CM_CODES.SECRET_DETECTED_DENY);

    const missing = port.bind({
      planId: 'plan-missing-digest',
      claims: [{ claimId: 'claim.bare' }]
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.code, CM_CODES.MISSING_EVIDENCE_DIGEST_DENY);

    const worm = port.bind({
      ...sampleHappyBindPlan({ planId: 'plan-worm-port' }),
      label: 'WORM SaaS retention guaranteed'
    });
    assert.equal(worm.ok, false);
    assert.equal(worm.code, CM_CODES.WORM_SAAS_CLAIM_DENY);

    const ghe = port.bind({
      ...sampleHappyBindPlan({ planId: 'plan-ghe-port' }),
      label: 'GHE enforcement guaranteed'
    });
    assert.equal(ghe.ok, false);
    assert.equal(ghe.code, CM_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('deny oversize claim set emits sealed DENY receipt', () => {
    const tight = new EvidenceBindingPort({ maxClaims: 2 });
    const res = tight.bind({
      planId: 'plan-over-port',
      claims: [
        { claimId: 'a', evidenceDigest: goodDigest('a') },
        { claimId: 'b', evidenceDigest: goodDigest('b') },
        { claimId: 'c', evidenceDigest: goodDigest('c') }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CM_CODES.OVERSIZED_CLAIMS_DENY);
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CM-RCPT-'));
  });

  it('deny invalid / tampered digests emit sealed DENY', () => {
    const bad = port.bind({
      planId: 'plan-bad-hex',
      claims: [
        {
          claimId: 'claim.bad',
          evidenceDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.decision, 'DENY');
    assert.equal(bad.code, CM_CODES.INVALID_EVIDENCE_DIGEST_DENY);
    assert.ok(bad.receipt.receiptId.startsWith('CM-RCPT-'));

    const tampered = port.bind({
      planId: 'plan-tamper-port',
      claims: [
        {
          claimId: 'claim.tamper',
          evidenceDigest: 'f'.repeat(64)
        }
      ]
    });
    assert.equal(tampered.ok, false);
    assert.equal(tampered.code, CM_CODES.TAMPERED_DIGEST_DENY);
  });

  it('verifyTrail validates CM receipt chain; tamper breaks trail', () => {
    const a = port.bind(sampleHappyBindPlan({ planId: 'trail-a' }));
    const b = port.bind({
      planId: 'trail-b',
      claims: [
        {
          claimId: 'claim.trail.b',
          evidenceDigest: goodDigest('trail-b'),
          linkDigest: goodDigest('cl-trail-b')
        }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CM_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, planId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CM_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ WORM SaaS / ≠ external audit / ≠ GHE / PRODUCTION_READY=NO', () => {
    assert.equal(CM_PORT_KIND, 'eos-evidence-binding-port');
    const receipt = buildEvidenceBindingReceipt({
      operation: 'BIND',
      planId: 'nonclaim',
      decision: 'PASS',
      claims: [
        { claimId: 'claim.nc', evidenceDigest: goodDigest('nc') }
      ]
    });
    assert.equal(receipt.nonClaims.wormSaas, false);
    assert.equal(receipt.nonClaims.externalAuditProduct, false);
    assert.equal(receipt.nonClaims.siemRetentionSaas, false);
    assert.equal(receipt.nonClaims.productionDataLake, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CM_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CM_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');

    const multi = port.bind({
      planId: 'plan-multi-claims',
      claims: [
        {
          claimId: 'claim.multi.1',
          evidenceDigest: goodDigest('m1'),
          linkDigest: goodDigest('cl-m1'),
          specId: 'SPEC-0096',
          codePath: 'src/core/evidence/evidence-binding-port.js'
        },
        {
          claimId: 'claim.multi.2',
          evidenceDigest: goodDigest('m2'),
          specId: 'SPEC-0095'
        }
      ]
    });
    assert.equal(multi.ok, true);
    assert.equal(multi.decision, 'PASS');
    assert.equal(multi.claims.length, 2);
    assert.equal(multi.receipt.nonClaims.wormSaas, false);
    assert.equal(multi.receipt.nonClaims.externalAuditProduct, false);
    assert.equal(multi.receipt.productionReady, 'NO');
  });
});

