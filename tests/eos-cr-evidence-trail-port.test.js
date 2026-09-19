/**
 * @file tests/eos-cr-evidence-trail-port.test.js
 * SPEC-0101 / Mission CR — Evidence Trail Ritual Binding Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; no network / no GH API
 *   Append-only CL→CM→CN; does not mutate CL/CM/CN state
 *   NON-CLAIM: ≠ SIEM / ≠ production data lake / ≠ auto-close L26 /
 *              ≠ new schemas JSON / ≠ PRODUCTION_READY=YES / ≠ L27 closeout
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CR_PRODUCTION_READY,
  CR_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CR_RECEIPT_KIND,
  CR_TRAIL_MODES,
  CR_TRAIL_KIND,
  CR_PORT_ORDER,
  sha256Canonical,
  buildEvidenceTrailReceipt,
  verifyEvidenceTrailReceipt,
  canonicalEvidenceTrailSealBody,
  buildChainedEvidenceTrail,
  hashLinkSeal,
  hashTrailSeal,
  _resetReceiptSeqForTests
} from '../src/core/evidence/evidence-trail-receipt.js';

import {
  EvidenceTrailPolicyGate,
  CR_CODES,
  CR_MAX_REASONS,
  CR_ID_PATTERN,
  CR_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsGheEnforcement,
  claimsSiemProduct,
  claimsDataLake,
  claimsWormSaas,
  claimsProductionReadyFlip,
  isFundacionTarget
} from '../src/core/evidence/evidence-trail-policy-gate.js';

import {
  EvidenceTrailPort,
  CR_PORT_PRODUCTION_READY,
  CR_PORT_KIND,
  validateEvidenceTrail
} from '../src/core/evidence/evidence-trail-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = path.join(
  __dirname,
  'fixtures',
  'evidence-trail-cl-cm-cn.sample.json'
);

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionEvidenceTrail123456';
}

function sampleHappyPlan(overrides = {}) {
  const trail =
    overrides.trail != null
      ? overrides.trail
      : buildChainedEvidenceTrail(overrides.trailOverrides || {});
  const { trail: _t, trailOverrides: _to, ...rest } = overrides;
  return {
    planId: 'plan-l27-cr-001',
    trailMode: 'FIXTURE',
    trail,
    reasons: ['hermetic evidence-trail verify'],
    label: 'happy pass trail',
    ...rest
  };
}

describe('Mission CR — Evidence Trail Receipt (SPEC-0101)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CR_PRODUCTION_READY, 'NO');
    assert.equal(CR_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CR_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CR_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CR_PORT_KIND, 'eos-evidence-trail-port');
    assert.deepEqual([...CR_PORT_ORDER], ['CL', 'CM', 'CN']);
    assert.deepEqual([...CR_TRAIL_MODES], ['FIXTURE', 'LIVE']);
  });

  it('builds canonical nine-field sealed CR-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildEvidenceTrailReceipt({
      operation: 'VERIFY',
      planId: 'plan-demo',
      trailId: 'EVD-TRAIL-DEMO-001',
      decision: 'PASS',
      trailMode: 'FIXTURE',
      trailDigest: sha256Canonical('demo'),
      linkCount: 3,
      linksSummary: [
        { seq: 1, port: 'CL', receiptId: 'CL-RCPT-1', decision: 'PASS' },
        { seq: 2, port: 'CM', receiptId: 'CM-RCPT-1', decision: 'PASS' },
        { seq: 3, port: 'CN', receiptId: 'CN-RCPT-1', decision: 'PASS' }
      ],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CR_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CR-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.trailId, 'EVD-TRAIL-DEMO-001');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.trailMode, 'FIXTURE');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.siem, false);
    assert.equal(receipt.nonClaims.productionDataLake, false);
    assert.equal(receipt.nonClaims.autoCloseL26, false);
    assert.equal(receipt.nonClaims.l27Closeout, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalEvidenceTrailSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyEvidenceTrailReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildEvidenceTrailReceipt({
      operation: 'VERIFY',
      planId: 'plan-tamper',
      trailId: 'EVD-TRAIL-TAMPER',
      decision: 'PASS',
      trailMode: 'FIXTURE',
      trailDigest: sha256Canonical('t')
    });
    const tampered = { ...receipt, decision: 'DENY' };
    const verifyRes = verifyEvidenceTrailReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CR — Evidence Trail Policy Gate (SPEC-0101)', () => {
  it('validates a well-formed trail plan with planId + FIXTURE mode + trail', () => {
    const gate = new EvidenceTrailPolicyGate();
    const plan = sampleHappyPlan();
    const ev = gate.evaluatePlan(plan);
    assert.equal(ev.valid, true);
    assert.equal(ev.code, CR_CODES.PLAN_VALID_OK);
    assert.equal(ev.planId, 'plan-l27-cr-001');
    assert.equal(ev.trailMode, 'FIXTURE');
    assert.equal(ev.trail.kind, CR_TRAIL_KIND);
    assert.ok(CR_ID_PATTERN.test(ev.planId));
    assert.equal(CR_MAX_REASONS, 64);
  });

  it('rejects empty plan / missing planId / trailMode / trail fail-closed', () => {
    const gate = new EvidenceTrailPolicyGate();
    assert.equal(gate.evaluatePlan({}).code, CR_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({ trail: buildChainedEvidenceTrail(), trailMode: 'FIXTURE' })
        .code,
      CR_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-x',
        trail: buildChainedEvidenceTrail()
      }).code,
      CR_CODES.MISSING_TRAIL_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-x',
        trailMode: 'FIXTURE'
      }).code,
      CR_CODES.MISSING_TRAIL_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-x',
        trailMode: 'SOFT',
        trail: buildChainedEvidenceTrail()
      }).code,
      CR_CODES.INVALID_TRAIL_MODE_DENY
    );
  });

  it('detects secrets (Law VI) and blocks Fundacion ALWAYS_DENY', () => {
    const gate = new EvidenceTrailPolicyGate();
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(secret), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);

    const secretPlan = sampleHappyPlan({
      label: `inject ${secret}`
    });
    assert.equal(
      gate.evaluatePlan(secretPlan).code,
      CR_CODES.SECRET_DETECTED_DENY
    );

    const fundPlan = sampleHappyPlan({
      planId: 'fundacion-leak-plan'
    });
    assert.equal(
      gate.evaluatePlan(fundPlan).code,
      CR_CODES.FUNDACION_ALWAYS_DENY
    );
  });

  it('rejects SIEM / data lake / WORM / GHE / PRODUCTION_READY flip claims', () => {
    const gate = new EvidenceTrailPolicyGate();
    assert.equal(claimsSiemProduct({ label: 'SIEM product rollout' }), true);
    assert.equal(
      claimsDataLake({ label: 'production data lake sync' }),
      true
    );
    assert.equal(claimsWormSaas({ label: 'WORM SaaS retention' }), true);
    assert.equal(
      claimsGheEnforcement({ label: 'GHE enforcement required' }),
      true
    );
    assert.equal(
      claimsProductionReadyFlip({ label: 'PRODUCTION_READY=YES flip' }),
      true
    );

    assert.equal(
      gate.evaluatePlan(sampleHappyPlan({ label: 'SIEM product claim' })).code,
      CR_CODES.SIEM_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan(
        sampleHappyPlan({ label: 'production data lake claim' })
      ).code,
      CR_CODES.DATA_LAKE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan(sampleHappyPlan({ label: 'WORM SaaS claim' })).code,
      CR_CODES.WORM_SAAS_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan(
        sampleHappyPlan({ label: 'GHE enforcement claim' })
      ).code,
      CR_CODES.GHE_ENFORCEMENT_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan(
        sampleHappyPlan({ label: 'PRODUCTION_READY=YES flip' })
      ).code,
      CR_CODES.PRODUCTION_READY_FLIP_DENY
    );
  });
});

describe('Mission CR — Evidence Trail Port (SPEC-0101)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path FIXTURE: well-formed CL→CM→CN chain → PASS + CR receipt', () => {
    const port = new EvidenceTrailPort();
    const plan = sampleHappyPlan();
    const originalLinks = structuredClone(plan.trail.links);
    const result = port.govern(plan);

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'PASS');
    assert.equal(result.code, CR_CODES.GOVERN_PASS);
    assert.equal(result.trailMode, 'FIXTURE');
    assert.ok(result.receipt.receiptId.startsWith('CR-RCPT-'));
    assert.equal(result.receipt.kind, CR_RECEIPT_KIND);
    assert.equal(result.receipt.productionReady, 'NO');
    assert.equal(result.receipt.fundacionDelta, 0);
    assert.equal(result.linksSummary.length, 3);
    assert.equal(result.verifyResult.ok, true);
    assert.equal(result.trailSealHash.length, 64);

    // Does not mutate caller's trail / CL/CM/CN state
    assert.deepEqual(plan.trail.links, originalLinks);
    assert.equal(port.getDecision('plan-l27-cr-001').decision, 'PASS');
  });

  it('evaluate() and verify() alias govern()', () => {
    const port = new EvidenceTrailPort();
    const a = port.evaluate(
      sampleHappyPlan({ planId: 'plan-alias-eval', trailOverrides: { trailId: 'EVD-TRAIL-ALIAS-EVAL' } })
    );
    const b = port.verify(
      sampleHappyPlan({ planId: 'plan-alias-verify', trailOverrides: { trailId: 'EVD-TRAIL-ALIAS-VERIFY' } })
    );
    assert.equal(a.decision, 'PASS');
    assert.equal(b.decision, 'PASS');
  });

  it('deny missing links / wrong order fail-closed', () => {
    const port = new EvidenceTrailPort();

    const missing = buildChainedEvidenceTrail({
      trailId: 'EVD-TRAIL-MISSING',
      links: buildChainedEvidenceTrail().links.slice(0, 2)
    });
    const r1 = port.govern(
      sampleHappyPlan({ planId: 'plan-missing', trail: missing })
    );
    assert.equal(r1.ok, false);
    assert.equal(r1.decision, 'DENY');
    assert.equal(r1.code, CR_CODES.MISSING_LINKS_DENY);
    assert.ok(r1.receipt.receiptId.startsWith('CR-RCPT-'));

    const ordered = buildChainedEvidenceTrail({ trailId: 'EVD-TRAIL-ORDER' });
    // Swap CM and CN ports (keep length 3) — order violation
    const badOrder = structuredClone(ordered);
    badOrder.links = [ordered.links[0], ordered.links[2], ordered.links[1]];
    const r2 = port.govern(
      sampleHappyPlan({ planId: 'plan-order', trail: badOrder })
    );
    assert.equal(r2.ok, false);
    assert.equal(r2.code, CR_CODES.ORDER_VIOLATION_DENY);
  });

  it('deny chain break / mismatched trailSealHash fail-closed', () => {
    const port = new EvidenceTrailPort();
    const trail = buildChainedEvidenceTrail({ trailId: 'EVD-TRAIL-CHAIN' });
    trail.links[1].prevLinkHash = 'a'.repeat(64);
    const r1 = port.govern(
      sampleHappyPlan({ planId: 'plan-chain', trail })
    );
    assert.equal(r1.ok, false);
    assert.equal(r1.code, CR_CODES.CHAIN_BREAK_DENY);
    assert.equal(r1.failedAt, 'CHAIN');

    const trail2 = buildChainedEvidenceTrail({ trailId: 'EVD-TRAIL-SEAL' });
    trail2.trailSealHash = 'b'.repeat(64);
    const r2 = port.govern(
      sampleHappyPlan({ planId: 'plan-seal', trail: trail2 })
    );
    assert.equal(r2.ok, false);
    assert.equal(r2.code, CR_CODES.MISMATCHED_HASH_DENY);
  });

  it('deny dirty tree / freeze lag / sample-as-live on LIVE mode', () => {
    const port = new EvidenceTrailPort();

    const dirty = buildChainedEvidenceTrail({
      trailId: 'EVD-TRAIL-DIRTY',
      sampleOnly: false,
      revisionFreezeIdentity: {
        dirtyTree: true,
        headSha: sha256Canonical('head'),
        headFreezeLag: 'ALIGNED'
      }
    });
    dirty.trailSealHash = hashTrailSeal(dirty);
    const r1 = port.govern({
      planId: 'plan-dirty',
      trailMode: 'LIVE',
      trail: dirty
    });
    assert.equal(r1.ok, false);
    assert.equal(r1.code, CR_CODES.DIRTY_TREE_DENY);

    const lag = buildChainedEvidenceTrail({
      trailId: 'EVD-TRAIL-LAG',
      sampleOnly: false,
      revisionFreezeIdentity: {
        dirtyTree: false,
        headSha: null,
        headFreezeLag: 'UNMEASURED'
      }
    });
    lag.trailSealHash = hashTrailSeal(lag);
    const r2 = port.govern({
      planId: 'plan-lag',
      trailMode: 'LIVE',
      trail: lag
    });
    assert.equal(r2.ok, false);
    assert.equal(r2.code, CR_CODES.FREEZE_LAG_DENY);

    const sample = buildChainedEvidenceTrail({
      trailId: 'EVD-TRAIL-SAMPLE-LIVE',
      sampleOnly: true,
      revisionFreezeIdentity: {
        dirtyTree: false,
        headSha: sha256Canonical('aligned-head'),
        headFreezeLag: 'ALIGNED'
      }
    });
    sample.trailSealHash = hashTrailSeal(sample);
    const r3 = port.govern({
      planId: 'plan-sample-live',
      trailMode: 'LIVE',
      trail: sample
    });
    assert.equal(r3.ok, false);
    assert.equal(r3.code, CR_CODES.SAMPLE_AS_LIVE_DENY);
  });

  it('deny cross-port mismatch / hop DENY / unverifiable receipt prefix', () => {
    const port = new EvidenceTrailPort();

    const cross = buildChainedEvidenceTrail({ trailId: 'EVD-TRAIL-CROSS' });
    cross.links[1].crossPortRefs.clLinkDigest = 'c'.repeat(64);
    cross.trailSealHash = hashTrailSeal(cross);
    const r1 = port.govern(
      sampleHappyPlan({ planId: 'plan-cross', trail: cross })
    );
    assert.equal(r1.ok, false);
    assert.equal(r1.code, CR_CODES.CROSS_PORT_MISMATCH_DENY);

    const hopDeny = buildChainedEvidenceTrail({ trailId: 'EVD-TRAIL-HOP' });
    hopDeny.links[2].decision = 'DENY';
    // recompute chain hashes after decision change (seal body includes decision)
    hopDeny.links[1].prevLinkHash = hashLinkSeal(hopDeny.links[0]);
    hopDeny.links[2].prevLinkHash = hashLinkSeal(hopDeny.links[1]);
    hopDeny.trailSealHash = hashTrailSeal(hopDeny);
    const r2 = port.govern(
      sampleHappyPlan({ planId: 'plan-hop', trail: hopDeny })
    );
    assert.equal(r2.ok, false);
    assert.equal(r2.code, CR_CODES.PORT_DECISION_DENY);

    const badPrefix = buildChainedEvidenceTrail({ trailId: 'EVD-TRAIL-PREFIX' });
    badPrefix.links[0].receiptId = 'XX-RCPT-BAD';
    badPrefix.links[1].prevLinkHash = hashLinkSeal(badPrefix.links[0]);
    badPrefix.links[2].prevLinkHash = hashLinkSeal(badPrefix.links[1]);
    badPrefix.trailSealHash = hashTrailSeal(badPrefix);
    const r3 = port.govern(
      sampleHappyPlan({ planId: 'plan-prefix', trail: badPrefix })
    );
    assert.equal(r3.ok, false);
    assert.equal(r3.code, CR_CODES.UNVERIFIABLE_DENY);
  });

  it('deny empty / Fundacion / secrets / SIEM emit sealed DENY; design sample FAIL as LIVE', () => {
    const port = new EvidenceTrailPort();

    assert.equal(port.govern({}).decision, 'DENY');
    assert.equal(
      port.govern(
        sampleHappyPlan({ planId: 'fundacion-path-plan' })
      ).code,
      CR_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      port.govern(
        sampleHappyPlan({
          planId: 'plan-secret',
          label: makeSyntheticSecret()
        })
      ).code,
      CR_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      port.govern(
        sampleHappyPlan({
          planId: 'plan-siem',
          label: 'SIEM product claim'
        })
      ).code,
      CR_CODES.SIEM_CLAIM_DENY
    );

    // Post-L26-D design sample has placeholder prevLinkHashes → chain DENY even in FIXTURE
    assert.ok(fs.existsSync(SAMPLE_PATH));
    const sampleDoc = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
    const sampleLive = port.govern({
      planId: 'plan-design-sample-live',
      trailMode: 'LIVE',
      trail: sampleDoc
    });
    assert.equal(sampleLive.ok, false);
    assert.ok(
      [
        CR_CODES.SAMPLE_AS_LIVE_DENY,
        CR_CODES.CHAIN_BREAK_DENY,
        CR_CODES.FREEZE_LAG_DENY
      ].includes(sampleLive.code)
    );
  });

  it('verifyTrail validates CR receipt chain; tamper breaks trail', () => {
    const port = new EvidenceTrailPort();
    port.govern(
      sampleHappyPlan({
        planId: 'plan-trail-1',
        trailOverrides: { trailId: 'EVD-TRAIL-VT-1' }
      })
    );
    port.govern(
      sampleHappyPlan({
        planId: 'plan-trail-2',
        trailOverrides: { trailId: 'EVD-TRAIL-VT-2' }
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, CR_CODES.TRAIL_OK);
    assert.equal(ok.receiptCount, 2);

    // Tamper second receipt in place
    const broken = port.receipts[1];
    Object.defineProperty(port, 'receipts', {
      value: [
        port.receipts[0],
        { ...broken, receiptHash: '0'.repeat(64) }
      ],
      writable: true
    });
    const bad = port.verifyTrail();
    assert.equal(bad.valid, false);
    assert.equal(bad.code, CR_CODES.TRAIL_BREAK);
  });

  it('deny trailId seal mutation (replay) and oversized reasons fail-closed', () => {
    const port = new EvidenceTrailPort();
    const base = buildChainedEvidenceTrail({ trailId: 'EVD-TRAIL-REPLAY-A' });
    const r1 = port.govern(
      sampleHappyPlan({ planId: 'plan-replay-a', trail: base })
    );
    assert.equal(r1.decision, 'PASS');

    // Same trailId with mutated receiptHash (in seal body) → different seal → REPLAY
    const mutated = structuredClone(base);
    mutated.links[2].receiptHash = sha256Canonical('mutated-cn-receipt');
    mutated.links[1].prevLinkHash = hashLinkSeal(mutated.links[0]);
    mutated.links[2].prevLinkHash = hashLinkSeal(mutated.links[1]);
    mutated.trailSealHash = hashTrailSeal(mutated);
    const r2 = port.govern(
      sampleHappyPlan({ planId: 'plan-replay-b', trail: mutated })
    );
    assert.equal(r2.ok, false);
    assert.equal(r2.code, CR_CODES.REPLAY_DENY);

    const gate = new EvidenceTrailPolicyGate({ maxReasons: 2 });
    const oversized = sampleHappyPlan({
      planId: 'plan-oversize',
      reasons: ['a', 'b', 'c']
    });
    assert.equal(
      gate.evaluatePlan(oversized).code,
      CR_CODES.OVERSIZED_REASONS_DENY
    );
  });

  it('NON-CLAIM: ≠ SIEM / ≠ data lake / PRODUCTION_READY=NO; validateEvidenceTrail helper; no CL/CM/CN mutation', () => {
    const trail = buildChainedEvidenceTrail();
    const frozen = structuredClone(trail);
    const v = validateEvidenceTrail(trail, 'FIXTURE');
    assert.equal(v.ok, true);
    assert.deepEqual(trail, frozen);

    const port = new EvidenceTrailPort();
    const result = port.govern(sampleHappyPlan({ planId: 'plan-nonclaim' }));
    assert.equal(result.receipt.nonClaims.siem, false);
    assert.equal(result.receipt.nonClaims.productionDataLake, false);
    assert.equal(result.receipt.nonClaims.wormSaas, false);
    assert.equal(result.receipt.nonClaims.gheEnforcement, false);
    assert.equal(result.receipt.nonClaims.autoCloseL26, false);
    assert.equal(result.receipt.nonClaims.newSchemasJson, false);
    assert.equal(result.receipt.nonClaims.l27Closeout, false);
    assert.equal(result.receipt.productionReady, 'NO');
    assert.ok(
      result.reasons.some((r) => /≠ SIEM/.test(r) || /NON-CLAIM/.test(r))
    );
  });
});
