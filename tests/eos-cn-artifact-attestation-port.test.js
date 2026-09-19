/**
 * @file tests/eos-cn-artifact-attestation-port.test.js
 * SPEC-0097 / Mission CN — Governed Artifact / SBOM Attestation Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; no network / no GH API / digests only
 *   NON-CLAIM: ≠ commercial SBOM SaaS / ≠ Sigstore / ≠ GHE / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CN_PRODUCTION_READY,
  CN_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CN_RECEIPT_KIND,
  sha256Canonical,
  buildArtifactAttestationReceipt,
  verifyArtifactAttestationReceipt,
  canonicalArtifactAttestationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/artifacts/artifact-attestation-receipt.js';

import {
  ArtifactAttestationPolicyGate,
  CN_CODES,
  CN_MAX_ARTIFACTS,
  CN_MAX_COMPONENTS,
  CN_ID_PATTERN,
  CN_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsGheEnforcement,
  claimsCommercialSbom,
  claimsSigstoreProduct,
  claimsPublicRegistry,
  claimsSlsaCommercial,
  isFundacionTarget,
  isTamperedDigest
} from '../src/core/artifacts/artifact-attestation-policy-gate.js';

import {
  ArtifactAttestationPort,
  CN_PORT_PRODUCTION_READY,
  CN_PORT_KIND
} from '../src/core/artifacts/artifact-attestation-port.js';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionArtifactAttest123456';
}

function goodDigest(seed = 'eos-cn-artifact-attestation') {
  return sha256Canonical(seed);
}

function sampleHappyAttestPlan(overrides = {}) {
  return {
    planId: 'plan-l26-cn-001',
    artifacts: [
      {
        artifactId: 'artifact.rc.l26-cn-001',
        sbomDigest: goodDigest('cn-sbom-1'),
        packagePath: 'dist/eos-rc-l26-cn.tgz',
        bindDigest: goodDigest('cm-bind-prior'),
        linkDigest: goodDigest('cl-link-prior'),
        components: [
          { name: 'eos-core', version: '0.0.0-local', digest: goodDigest('comp-1') }
        ]
      }
    ],
    reasons: ['hermetic artifact/SBOM attestation'],
    label: 'happy pass attest',
    ...overrides
  };
}

describe('Mission CN — Artifact Attestation Receipt (SPEC-0097)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CN_PRODUCTION_READY, 'NO');
    assert.equal(CN_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CN_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CN_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CN-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildArtifactAttestationReceipt({
      operation: 'ATTEST',
      planId: 'plan-demo',
      decision: 'PASS',
      artifacts: [
        {
          artifactId: 'artifact.demo.1',
          sbomDigest: goodDigest('demo'),
          bindDigest: goodDigest('cm-prior'),
          linkDigest: goodDigest('cl-prior')
        }
      ],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CN_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CN-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.artifactCount, 1);
    assert.equal(receipt.artifacts.length, 1);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.commercialSbomSaas, false);
    assert.equal(receipt.nonClaims.sigstoreProduct, false);
    assert.equal(receipt.nonClaims.publicPackageRegistry, false);
    assert.equal(receipt.nonClaims.slsaCommercialProduct, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalArtifactAttestationSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyArtifactAttestationReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildArtifactAttestationReceipt({
      operation: 'ATTEST',
      planId: 'plan-demo',
      decision: 'PASS',
      artifacts: [
        { artifactId: 'artifact.t', sbomDigest: goodDigest('t') }
      ]
    });

    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyArtifactAttestationReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CN — Artifact Attestation Policy Gate (SPEC-0097)', () => {
  let gate;

  beforeEach(() => {
    gate = new ArtifactAttestationPolicyGate();
  });

  it('validates a well-formed attest plan with artifactId↔sbomDigest (+ CM/CL digests)', () => {
    const res = gate.evaluatePlan(sampleHappyAttestPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CN_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l26-cn-001');
    assert.equal(res.artifacts.length, 1);
    assert.equal(res.artifacts[0].artifactId, 'artifact.rc.l26-cn-001');
    assert.equal(res.artifacts[0].sbomDigest.length, 64);
    assert.equal(res.artifacts[0].bindDigest.length, 64);
    assert.equal(res.artifacts[0].linkDigest.length, 64);
    assert.ok(CN_ID_PATTERN.test('plan-l26-cn-001'));
    assert.ok(CN_MAX_ARTIFACTS >= 1);
    assert.ok(CN_MAX_COMPONENTS >= 1);
  });

  it('rejects empty plan / missing planId / missing artifacts fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CN_CODES.EMPTY_PLAN_DENY);

    const noPlan = gate.evaluatePlan({
      artifacts: [{ artifactId: 'a1', sbomDigest: goodDigest('x') }]
    });
    assert.equal(noPlan.valid, false);
    assert.equal(noPlan.code, CN_CODES.MISSING_PLAN_ID_DENY);

    const noArtifacts = gate.evaluatePlan({ planId: 'plan-1' });
    assert.equal(noArtifacts.valid, false);
    assert.equal(noArtifacts.code, CN_CODES.MISSING_ARTIFACTS_DENY);
  });

  it('rejects artifact missing sbomDigest', () => {
    const res = gate.evaluatePlan({
      planId: 'plan-no-digest',
      artifacts: [{ artifactId: 'artifact.bare' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CN_CODES.MISSING_SBOM_DIGEST_DENY);
  });

  it('rejects oversized artifact sets and oversize component lists', () => {
    const tight = new ArtifactAttestationPolicyGate({ maxArtifacts: 2 });
    const res = tight.evaluatePlan({
      planId: 'plan-over',
      artifacts: [
        { artifactId: 'a1', sbomDigest: goodDigest('1') },
        { artifactId: 'a2', sbomDigest: goodDigest('2') },
        { artifactId: 'a3', sbomDigest: goodDigest('3') }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CN_CODES.OVERSIZED_ARTIFACTS_DENY);

    const tightComp = new ArtifactAttestationPolicyGate({ maxComponents: 2 });
    const overComp = tightComp.evaluatePlan({
      planId: 'plan-over-comp',
      artifacts: [
        {
          artifactId: 'a1',
          sbomDigest: goodDigest('1'),
          components: [
            { name: 'c1' },
            { name: 'c2' },
            { name: 'c3' }
          ]
        }
      ]
    });
    assert.equal(overComp.valid, false);
    assert.equal(overComp.code, CN_CODES.OVERSIZED_COMPONENTS_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      ...sampleHappyAttestPlan(),
      label: `attest with key ${secret}`
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CN_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(
      isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'),
      true
    );

    const planLevel = gate.evaluatePlan({
      ...sampleHappyAttestPlan(),
      target: 'C:/Users/valen/Documents/Fundacion/out.json'
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CN_CODES.FUNDACION_ALWAYS_DENY);

    const pathLevel = gate.evaluatePlan({
      planId: 'plan-fund-path',
      artifacts: [
        {
          artifactId: 'artifact.fund',
          sbomDigest: goodDigest('f'),
          packagePath: 'Documents/Fundacion/secret.tgz'
        }
      ]
    });
    assert.equal(pathLevel.valid, false);
    assert.equal(pathLevel.code, CN_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects commercial SBOM, Sigstore, public registry, SLSA, and GHE claim labels', () => {
    assert.equal(claimsCommercialSbom('ships commercial SBOM SaaS'), true);
    assert.equal(claimsSigstoreProduct('Sigstore product surface'), true);
    assert.equal(claimsPublicRegistry('public package registry'), true);
    assert.equal(claimsSlsaCommercial('SLSA commercial product'), true);
    assert.equal(
      claimsGheEnforcement('claims GH Enterprise enforcement'),
      true
    );

    const sbom = gate.evaluatePlan({
      ...sampleHappyAttestPlan({ planId: 'plan-sbom' }),
      label: 'commercial SBOM SaaS'
    });
    assert.equal(sbom.valid, false);
    assert.equal(sbom.code, CN_CODES.COMMERCIAL_SBOM_CLAIM_DENY);

    const sig = gate.evaluatePlan({
      ...sampleHappyAttestPlan({ planId: 'plan-sig' }),
      label: 'powered by Sigstore product'
    });
    assert.equal(sig.valid, false);
    assert.equal(sig.code, CN_CODES.SIGSTORE_CLAIM_DENY);

    const ghe = gate.evaluatePlan({
      ...sampleHappyAttestPlan({ planId: 'plan-ghe' }),
      label: 'verified via GitHub Enterprise enforcement'
    });
    assert.equal(ghe.valid, false);
    assert.equal(ghe.code, CN_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('rejects invalid and tampered digests fail-closed', () => {
    assert.equal(isTamperedDigest('TAMPERED_DIGEST_MARKER'), true);
    assert.equal(isTamperedDigest('0'.repeat(64)), true);

    const badHex = gate.evaluatePlan({
      planId: 'plan-bad-digest',
      artifacts: [
        {
          artifactId: 'artifact.bad',
          sbomDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(badHex.valid, false);
    assert.equal(badHex.code, CN_CODES.INVALID_SBOM_DIGEST_DENY);

    const tampered = gate.evaluatePlan({
      planId: 'plan-tamper',
      artifacts: [
        {
          artifactId: 'artifact.tamper',
          sbomDigest: '0'.repeat(64)
        }
      ]
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.code, CN_CODES.TAMPERED_DIGEST_DENY);

    const badBind = gate.evaluatePlan({
      planId: 'plan-bad-bind',
      artifacts: [
        {
          artifactId: 'artifact.bind',
          sbomDigest: goodDigest('ok'),
          bindDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(badBind.valid, false);
    assert.equal(badBind.code, CN_CODES.INVALID_BIND_DIGEST_DENY);

    const badLink = gate.evaluatePlan({
      planId: 'plan-bad-link',
      artifacts: [
        {
          artifactId: 'artifact.link',
          sbomDigest: goodDigest('ok'),
          linkDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(badLink.valid, false);
    assert.equal(badLink.code, CN_CODES.INVALID_LINK_DIGEST_DENY);
  });
});

describe('Mission CN — Artifact Attestation Port (SPEC-0097)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new ArtifactAttestationPort();
  });

  it('attest happy path: artifactId↔sbomDigest (+ CM/CL digests) → PASS + CN receipt', () => {
    const plan = sampleHappyAttestPlan();
    const res = port.attest(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CN_CODES.ATTEST_PASS);
    assert.equal(res.planId, 'plan-l26-cn-001');
    assert.equal(res.attestationDigest.length, 64);

    assert.equal(res.receipt.kind, CN_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CN-RCPT-'));
    assert.equal(res.receipt.decision, 'PASS');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.nonClaims.commercialSbomSaas, false);
    assert.equal(res.receipt.nonClaims.sigstoreProduct, false);
    assert.equal(res.receipt.nonClaims.ghEnterpriseEnforcement, false);

    const stored = port.getAttestation(res.planId);
    assert.ok(stored);
    assert.equal(stored.decision, 'PASS');
  });

  it('attest sbomDigest-only artifact (no bindDigest/linkDigest/components)', () => {
    const res = port.attest({
      planId: 'plan-digest-only',
      artifacts: [
        {
          artifactId: 'artifact.digest.only',
          sbomDigest: goodDigest('solo'),
          packagePath: 'dist/solo.tgz'
        }
      ]
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CN_CODES.ATTEST_PASS);
    assert.equal(res.artifacts[0].bindDigest, null);
    assert.equal(res.artifacts[0].linkDigest, null);
    assert.ok(res.receipt.receiptId.startsWith('CN-RCPT-'));
  });

  it('deny empty / Fundacion / secrets / missing digest / claims emit sealed DENY', () => {
    const empty = port.attest({});
    assert.equal(empty.ok, false);
    assert.equal(empty.code, CN_CODES.EMPTY_PLAN_DENY);
    assert.equal(empty.receipt.decision, 'DENY');
    assert.ok(empty.receipt.receiptId.startsWith('CN-RCPT-'));

    const fund = port.attest({
      ...sampleHappyAttestPlan({ planId: 'plan-fund' }),
      target: 'Documents/Fundacion/out'
    });
    assert.equal(fund.ok, false);
    assert.equal(fund.code, CN_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(verifyArtifactAttestationReceipt(fund.receipt).ok, true);

    const secret = makeSyntheticSecret();
    const sec = port.attest({
      ...sampleHappyAttestPlan({ planId: 'plan-secret' }),
      payload: { token: secret }
    });
    assert.equal(sec.ok, false);
    assert.equal(sec.code, CN_CODES.SECRET_DETECTED_DENY);

    const missing = port.attest({
      planId: 'plan-missing-digest',
      artifacts: [{ artifactId: 'artifact.bare' }]
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.code, CN_CODES.MISSING_SBOM_DIGEST_DENY);

    const sbom = port.attest({
      ...sampleHappyAttestPlan({ planId: 'plan-sbom-port' }),
      label: 'commercial SBOM SaaS guaranteed'
    });
    assert.equal(sbom.ok, false);
    assert.equal(sbom.code, CN_CODES.COMMERCIAL_SBOM_CLAIM_DENY);

    const ghe = port.attest({
      ...sampleHappyAttestPlan({ planId: 'plan-ghe-port' }),
      label: 'GHE enforcement guaranteed'
    });
    assert.equal(ghe.ok, false);
    assert.equal(ghe.code, CN_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('deny oversize artifact set and oversize components emit sealed DENY', () => {
    const tight = new ArtifactAttestationPort({ maxArtifacts: 2 });
    const res = tight.attest({
      planId: 'plan-over-port',
      artifacts: [
        { artifactId: 'a', sbomDigest: goodDigest('a') },
        { artifactId: 'b', sbomDigest: goodDigest('b') },
        { artifactId: 'c', sbomDigest: goodDigest('c') }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CN_CODES.OVERSIZED_ARTIFACTS_DENY);
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CN-RCPT-'));

    const tightComp = new ArtifactAttestationPort({ maxComponents: 1 });
    const overComp = tightComp.attest({
      planId: 'plan-over-comp-port',
      artifacts: [
        {
          artifactId: 'a',
          sbomDigest: goodDigest('a'),
          components: [{ name: 'c1' }, { name: 'c2' }]
        }
      ]
    });
    assert.equal(overComp.ok, false);
    assert.equal(overComp.code, CN_CODES.OVERSIZED_COMPONENTS_DENY);
  });

  it('deny invalid / tampered digests emit sealed DENY', () => {
    const bad = port.attest({
      planId: 'plan-bad-hex',
      artifacts: [
        {
          artifactId: 'artifact.bad',
          sbomDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.decision, 'DENY');
    assert.equal(bad.code, CN_CODES.INVALID_SBOM_DIGEST_DENY);
    assert.ok(bad.receipt.receiptId.startsWith('CN-RCPT-'));

    const tampered = port.attest({
      planId: 'plan-tamper-port',
      artifacts: [
        {
          artifactId: 'artifact.tamper',
          sbomDigest: 'f'.repeat(64)
        }
      ]
    });
    assert.equal(tampered.ok, false);
    assert.equal(tampered.code, CN_CODES.TAMPERED_DIGEST_DENY);
  });

  it('verifyTrail validates CN receipt chain; tamper breaks trail', () => {
    const a = port.attest(sampleHappyAttestPlan({ planId: 'trail-a' }));
    const b = port.attest({
      planId: 'trail-b',
      artifacts: [
        {
          artifactId: 'artifact.trail.b',
          sbomDigest: goodDigest('trail-b'),
          bindDigest: goodDigest('cm-trail-b')
        }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CN_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, planId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CN_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ commercial SBOM SaaS / ≠ Sigstore / ≠ GHE / PRODUCTION_READY=NO', () => {
    assert.equal(CN_PORT_KIND, 'eos-artifact-attestation-port');
    const receipt = buildArtifactAttestationReceipt({
      operation: 'ATTEST',
      planId: 'nonclaim',
      decision: 'PASS',
      artifacts: [
        { artifactId: 'artifact.nc', sbomDigest: goodDigest('nc') }
      ]
    });
    assert.equal(receipt.nonClaims.commercialSbomSaas, false);
    assert.equal(receipt.nonClaims.sigstoreProduct, false);
    assert.equal(receipt.nonClaims.publicPackageRegistry, false);
    assert.equal(receipt.nonClaims.slsaCommercialProduct, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CN_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CN_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');

    const multi = port.attest({
      planId: 'plan-multi-artifacts',
      artifacts: [
        {
          artifactId: 'artifact.multi.1',
          sbomDigest: goodDigest('m1'),
          bindDigest: goodDigest('cm-m1'),
          linkDigest: goodDigest('cl-m1'),
          packagePath: 'dist/m1.tgz'
        },
        {
          artifactId: 'artifact.multi.2',
          sbomDigest: goodDigest('m2')
        }
      ]
    });
    assert.equal(multi.ok, true);
    assert.equal(multi.decision, 'PASS');
    assert.equal(multi.artifacts.length, 2);
    assert.equal(multi.receipt.nonClaims.commercialSbomSaas, false);
    assert.equal(multi.receipt.nonClaims.sigstoreProduct, false);
    assert.equal(multi.receipt.productionReady, 'NO');
  });
});

