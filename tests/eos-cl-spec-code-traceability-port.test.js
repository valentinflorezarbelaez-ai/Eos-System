/**
 * @file tests/eos-cl-spec-code-traceability-port.test.js
 * SPEC-0095 / Mission CL — Spec↔Code Traceability Graph Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; no network / no GH API
 *   NON-CLAIM: ≠ full LSP/IDE product / ≠ GitHub code search / ≠ GHE / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CL_PRODUCTION_READY,
  CL_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CL_RECEIPT_KIND,
  sha256Canonical,
  buildSpecCodeTraceabilityReceipt,
  verifySpecCodeTraceabilityReceipt,
  canonicalSpecCodeTraceabilitySealBody,
  _resetReceiptSeqForTests
} from '../src/core/traceability/spec-code-traceability-receipt.js';

import {
  SpecCodeTraceabilityPolicyGate,
  CL_CODES,
  CL_MAX_NODES,
  CL_ID_PATTERN,
  CL_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsGheEnforcement,
  claimsLspIdeProduct,
  claimsGithubCodeSearch,
  isFundacionTarget
} from '../src/core/traceability/spec-code-traceability-policy-gate.js';

import {
  SpecCodeTraceabilityPort,
  CL_PORT_PRODUCTION_READY,
  CL_PORT_KIND
} from '../src/core/traceability/spec-code-traceability-port.js';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionSpecCodeTrace123456';
}

function goodDigest(seed = 'eos-cl-spec-code-evidence') {
  return sha256Canonical(seed);
}

function sampleHappyLinkPlan(overrides = {}) {
  return {
    planId: 'plan-l26-cl-001',
    nodes: [
      {
        specId: 'SPEC-0095',
        codePath: 'src/core/traceability/spec-code-traceability-port.js',
        evidenceDigest: goodDigest('cl-node-1')
      }
    ],
    reasons: ['hermetic Spec↔Code binding'],
    label: 'happy pass link',
    ...overrides
  };
}

describe('Mission CL — Spec↔Code Traceability Receipt (SPEC-0095)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CL_PRODUCTION_READY, 'NO');
    assert.equal(CL_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CL_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CL_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CL-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildSpecCodeTraceabilityReceipt({
      operation: 'LINK',
      planId: 'plan-demo',
      decision: 'PASS',
      nodes: [
        {
          specId: 'SPEC-0095',
          codePath: 'src/core/traceability/spec-code-traceability-port.js'
        }
      ],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CL_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CL-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.nodeCount, 1);
    assert.equal(receipt.nodes.length, 1);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.lspIdeProduct, false);
    assert.equal(receipt.nonClaims.githubCodeSearch, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalSpecCodeTraceabilitySealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifySpecCodeTraceabilityReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildSpecCodeTraceabilityReceipt({
      operation: 'LINK',
      planId: 'plan-demo',
      decision: 'PASS',
      nodes: [{ specId: 'SPEC-0095', moduleId: 'eos.traceability.port' }]
    });

    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifySpecCodeTraceabilityReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CL — Spec↔Code Traceability Policy Gate (SPEC-0095)', () => {
  let gate;

  beforeEach(() => {
    gate = new SpecCodeTraceabilityPolicyGate();
  });

  it('validates a well-formed link plan with SPEC↔codePath node', () => {
    const res = gate.evaluatePlan(sampleHappyLinkPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CL_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l26-cl-001');
    assert.equal(res.nodes.length, 1);
    assert.equal(res.nodes[0].specId, 'SPEC-0095');
    assert.ok(CL_ID_PATTERN.test('plan-l26-cl-001'));
    assert.ok(CL_MAX_NODES >= 1);
  });

  it('rejects empty plan / missing planId / missing nodes fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CL_CODES.EMPTY_PLAN_DENY);

    const noPlan = gate.evaluatePlan({
      nodes: [{ specId: 'SPEC-0095', codePath: 'src/x.js' }]
    });
    assert.equal(noPlan.valid, false);
    assert.equal(noPlan.code, CL_CODES.MISSING_PLAN_ID_DENY);

    const noNodes = gate.evaluatePlan({ planId: 'plan-1' });
    assert.equal(noNodes.valid, false);
    assert.equal(noNodes.code, CL_CODES.MISSING_NODES_DENY);
  });

  it('rejects node missing codePath and moduleId', () => {
    const res = gate.evaluatePlan({
      planId: 'plan-no-surface',
      nodes: [{ specId: 'SPEC-0095' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CL_CODES.INVALID_CODE_SURFACE_DENY);
  });

  it('rejects oversized graphs beyond max bound', () => {
    const tight = new SpecCodeTraceabilityPolicyGate({ maxNodes: 2 });
    const res = tight.evaluatePlan({
      planId: 'plan-over',
      nodes: [
        { specId: 'S1', moduleId: 'a' },
        { specId: 'S2', moduleId: 'b' },
        { specId: 'S3', moduleId: 'c' }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CL_CODES.OVERSIZED_GRAPH_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      ...sampleHappyLinkPlan(),
      label: `link with key ${secret}`
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CL_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(
      isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'),
      true
    );

    const planLevel = gate.evaluatePlan({
      ...sampleHappyLinkPlan(),
      target: 'C:/Users/valen/Documents/Fundacion/out.json'
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CL_CODES.FUNDACION_ALWAYS_DENY);

    const pathLevel = gate.evaluatePlan({
      planId: 'plan-fund-path',
      nodes: [
        {
          specId: 'SPEC-0095',
          codePath: 'Documents/Fundacion/secret.js'
        }
      ]
    });
    assert.equal(pathLevel.valid, false);
    assert.equal(pathLevel.code, CL_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects LSP/IDE, GitHub code search, and GHE claim labels (NON-CLAIM)', () => {
    assert.equal(claimsLspIdeProduct('full LSP product surface'), true);
    assert.equal(claimsGithubCodeSearch('via GitHub code search'), true);
    assert.equal(
      claimsGheEnforcement('claims GH Enterprise enforcement'),
      true
    );

    const lsp = gate.evaluatePlan({
      ...sampleHappyLinkPlan({ planId: 'plan-lsp' }),
      label: 'ships language-server SaaS'
    });
    assert.equal(lsp.valid, false);
    assert.equal(lsp.code, CL_CODES.LSP_IDE_CLAIM_DENY);

    const gcs = gate.evaluatePlan({
      ...sampleHappyLinkPlan({ planId: 'plan-gcs' }),
      label: 'powered by GitHub code search'
    });
    assert.equal(gcs.valid, false);
    assert.equal(gcs.code, CL_CODES.GITHUB_CODE_SEARCH_CLAIM_DENY);

    const ghe = gate.evaluatePlan({
      ...sampleHappyLinkPlan({ planId: 'plan-ghe' }),
      label: 'verified via GitHub Enterprise enforcement'
    });
    assert.equal(ghe.valid, false);
    assert.equal(ghe.code, CL_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('rejects invalid evidenceDigest when present', () => {
    const res = gate.evaluatePlan({
      planId: 'plan-bad-digest',
      nodes: [
        {
          specId: 'SPEC-0095',
          codePath: 'src/x.js',
          evidenceDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CL_CODES.INVALID_EVIDENCE_DIGEST_DENY);
  });
});

describe('Mission CL — Spec↔Code Traceability Port (SPEC-0095)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new SpecCodeTraceabilityPort();
  });

  it('link happy path: SPEC↔codePath → PASS + CL receipt', () => {
    const plan = sampleHappyLinkPlan();
    const res = port.link(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CL_CODES.LINK_PASS);
    assert.equal(res.planId, 'plan-l26-cl-001');
    assert.equal(res.graphDigest.length, 64);

    assert.equal(res.receipt.kind, CL_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CL-RCPT-'));
    assert.equal(res.receipt.decision, 'PASS');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.nonClaims.lspIdeProduct, false);
    assert.equal(res.receipt.nonClaims.githubCodeSearch, false);
    assert.equal(res.receipt.nonClaims.ghEnterpriseEnforcement, false);

    const stored = port.getGraph(res.planId);
    assert.ok(stored);
    assert.equal(stored.decision, 'PASS');
  });

  it('trace alias equals link for moduleId-only node', () => {
    const res = port.trace({
      planId: 'plan-module-only',
      nodes: [{ specId: 'SPEC-0095', moduleId: 'eos.traceability.port' }]
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, CL_CODES.LINK_PASS);
    assert.equal(res.nodes[0].moduleId, 'eos.traceability.port');
    assert.equal(res.nodes[0].codePath, null);
    assert.ok(res.receipt.receiptId.startsWith('CL-RCPT-'));
  });

  it('deny empty / Fundacion / secrets / bad surface / claims emit sealed DENY', () => {
    const empty = port.link({});
    assert.equal(empty.ok, false);
    assert.equal(empty.code, CL_CODES.EMPTY_PLAN_DENY);
    assert.equal(empty.receipt.decision, 'DENY');
    assert.ok(empty.receipt.receiptId.startsWith('CL-RCPT-'));

    const fund = port.link({
      ...sampleHappyLinkPlan({ planId: 'plan-fund' }),
      target: 'Documents/Fundacion/out'
    });
    assert.equal(fund.ok, false);
    assert.equal(fund.code, CL_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(verifySpecCodeTraceabilityReceipt(fund.receipt).ok, true);

    const secret = makeSyntheticSecret();
    const sec = port.link({
      ...sampleHappyLinkPlan({ planId: 'plan-secret' }),
      payload: { token: secret }
    });
    assert.equal(sec.ok, false);
    assert.equal(sec.code, CL_CODES.SECRET_DETECTED_DENY);

    const bad = port.link({
      planId: 'plan-bad-surface',
      nodes: [{ specId: 'SPEC-0095' }]
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.code, CL_CODES.INVALID_CODE_SURFACE_DENY);

    const lsp = port.link({
      ...sampleHappyLinkPlan({ planId: 'plan-lsp-port' }),
      label: 'IDE marketplace plugin'
    });
    assert.equal(lsp.ok, false);
    assert.equal(lsp.code, CL_CODES.LSP_IDE_CLAIM_DENY);

    const ghe = port.link({
      ...sampleHappyLinkPlan({ planId: 'plan-ghe-port' }),
      label: 'GHE enforcement guaranteed'
    });
    assert.equal(ghe.ok, false);
    assert.equal(ghe.code, CL_CODES.GHE_ENFORCEMENT_CLAIM_DENY);
  });

  it('deny oversize graph emits sealed DENY receipt', () => {
    const tight = new SpecCodeTraceabilityPort({ maxNodes: 2 });
    const res = tight.link({
      planId: 'plan-over-port',
      nodes: [
        { specId: 'a', moduleId: 'm1' },
        { specId: 'b', moduleId: 'm2' },
        { specId: 'c', moduleId: 'm3' }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CL_CODES.OVERSIZED_GRAPH_DENY);
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CL-RCPT-'));
  });

  it('deny invalid evidenceDigest emits sealed DENY', () => {
    const res = port.link({
      planId: 'plan-bad-hex',
      nodes: [
        {
          specId: 'SPEC-0095',
          codePath: 'src/x.js',
          evidenceDigest: 'not-a-valid-sha256'
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, CL_CODES.INVALID_EVIDENCE_DIGEST_DENY);
    assert.ok(res.receipt.receiptId.startsWith('CL-RCPT-'));
  });

  it('verifyTrail validates CL receipt chain; tamper breaks trail', () => {
    const a = port.link(sampleHappyLinkPlan({ planId: 'trail-a' }));
    const b = port.link({
      planId: 'trail-b',
      nodes: [
        {
          specId: 'SPEC-0095',
          moduleId: 'eos.traceability.receipt',
          evidenceDigest: goodDigest('trail-b')
        }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CL_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, planId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CL_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ LSP/IDE / ≠ GitHub code search / ≠ GHE / PRODUCTION_READY=NO', () => {
    assert.equal(CL_PORT_KIND, 'eos-spec-code-traceability-port');
    const receipt = buildSpecCodeTraceabilityReceipt({
      operation: 'LINK',
      planId: 'nonclaim',
      decision: 'PASS',
      nodes: [{ specId: 'SPEC-0095', moduleId: 'eos.cl' }]
    });
    assert.equal(receipt.nonClaims.lspIdeProduct, false);
    assert.equal(receipt.nonClaims.githubCodeSearch, false);
    assert.equal(receipt.nonClaims.ghEnterpriseEnforcement, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CL_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CL_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');

    const multi = port.link({
      planId: 'plan-multi-nodes',
      nodes: [
        {
          specId: 'SPEC-0095',
          codePath: 'src/core/traceability/spec-code-traceability-port.js'
        },
        {
          specId: 'SPEC-0095',
          moduleId: 'eos.traceability.gate',
          evidenceDigest: goodDigest('multi-2')
        }
      ]
    });
    assert.equal(multi.ok, true);
    assert.equal(multi.decision, 'PASS');
    assert.equal(multi.nodes.length, 2);
    assert.equal(multi.receipt.nonClaims.lspIdeProduct, false);
    assert.equal(multi.receipt.nonClaims.githubCodeSearch, false);
    assert.equal(multi.receipt.productionReady, 'NO');
  });
});
