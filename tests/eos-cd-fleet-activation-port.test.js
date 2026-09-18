/**
 * @file tests/eos-cd-fleet-activation-port.test.js
 * SPEC-0087 / Mission CD — Fleet Project Registry & Governed Activation Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   NON-CLAIM: ≠ Kubernetes multi-cluster control plane / ≠ Fundacion touch / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CD_PRODUCTION_READY,
  CD_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CD_RECEIPT_KIND,
  sha256Canonical,
  buildFleetActivationReceipt,
  verifyFleetActivationReceipt,
  canonicalFleetActivationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/projects/fleet-activation-receipt.js';

import {
  FleetActivationPolicyGate,
  CD_CODES,
  CD_MAX_MISSIONS,
  CD_MISSION_ID_PATTERN,
  CD_SSOT_DIGEST_PATTERN,
  CD_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/projects/fleet-activation-policy-gate.js';

import {
  FleetActivationPort,
  CD_PORT_PRODUCTION_READY,
  CD_PORT_KIND
} from '../src/core/projects/fleet-activation-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionFleetActivation1234567890';
}

function sampleSsotDigest(seed = 'fleet-activation-demo') {
  return sha256Canonical({ seed });
}

function sampleHappyPlan(overrides = {}) {
  return {
    projectId: 'eos-demo-project',
    projectSsotDigest: sampleSsotDigest(),
    label: 'governed activation under allowlist',
    allowlist: ['CB', 'CC', 'CD'],
    ...overrides
  };
}

describe('Mission CD — Fleet Activation Receipt (SPEC-0087)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CD_PRODUCTION_READY, 'NO');
    assert.equal(CD_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CD_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CD_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CD-RCPT-* with valid SHA-256 hash', () => {
    const digest = sampleSsotDigest();
    const receipt = buildFleetActivationReceipt({
      operation: 'ACTIVATE',
      projectId: 'eos-demo',
      decision: 'ALLOW',
      projectSsotDigest: digest,
      allowedMissions: ['CB', 'CC'],
      deniedMissions: [],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CD_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CD-RCPT-'));
    assert.equal(receipt.projectId, 'eos-demo');
    assert.equal(receipt.decision, 'ALLOW');
    assert.equal(receipt.projectSsotDigest, digest);
    assert.equal(receipt.allowedMissionCount, 2);
    assert.deepEqual([...receipt.allowedMissions], ['CB', 'CC']);
    assert.deepEqual([...receipt.deniedMissions], []);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.kubernetesMultiClusterControlPlane, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalFleetActivationSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyFleetActivationReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildFleetActivationReceipt({
      operation: 'ACTIVATE',
      projectId: 'eos-demo',
      decision: 'ALLOW',
      projectSsotDigest: sampleSsotDigest(),
      allowedMissions: ['CD']
    });

    const tampered = { ...receipt, projectId: 'eos-tampered-hacked' };
    const verifyRes = verifyFleetActivationReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CD — Fleet Activation Policy Gate (SPEC-0087)', () => {
  let gate;

  beforeEach(() => {
    gate = new FleetActivationPolicyGate();
  });

  it('validates a well-formed project SSOT → mission allowlist plan', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CD_CODES.PLAN_VALID_OK);
    assert.equal(res.allowlist.length, 3);
    assert.equal(res.projectId, 'eos-demo-project');
    assert.ok(CD_SSOT_DIGEST_PATTERN.test(res.projectSsotDigest));
    assert.ok(CD_MISSION_ID_PATTERN.test('CB'));
    assert.ok(CD_MISSION_ID_PATTERN.test('CD'));
    assert.ok(CD_MAX_MISSIONS >= 2);
  });

  it('rejects empty allowlist plans fail-closed', () => {
    const empty = gate.evaluatePlan({
      projectId: 'empty',
      projectSsotDigest: sampleSsotDigest('empty'),
      allowlist: []
    });
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CD_CODES.EMPTY_ALLOWLIST_DENY);

    const missing = gate.evaluatePlan({
      projectId: 'missing',
      projectSsotDigest: sampleSsotDigest('missing')
    });
    assert.equal(missing.valid, false);
    assert.equal(missing.code, CD_CODES.EMPTY_ALLOWLIST_DENY);
  });

  it('rejects missing projectId and bad SSOT digest', () => {
    const noId = gate.evaluatePlan({
      projectSsotDigest: sampleSsotDigest('noid'),
      allowlist: ['CB']
    });
    assert.equal(noId.valid, false);
    assert.equal(noId.code, CD_CODES.INVALID_PROJECT_ID_DENY);

    const badDigest = gate.evaluatePlan({
      projectId: 'bad-digest',
      projectSsotDigest: 'not-a-sha256',
      allowlist: ['CB']
    });
    assert.equal(badDigest.valid, false);
    assert.equal(badDigest.code, CD_CODES.INVALID_SSOT_DIGEST_DENY);

    const shortDigest = gate.evaluatePlan({
      projectId: 'short-digest',
      projectSsotDigest: 'abc123',
      allowlist: ['CB']
    });
    assert.equal(shortDigest.valid, false);
    assert.equal(shortDigest.code, CD_CODES.INVALID_SSOT_DIGEST_DENY);
  });

  it('rejects unknown mission ids', () => {
    const badId = gate.evaluatePlan({
      projectId: 'bad-id',
      projectSsotDigest: sampleSsotDigest('bad-id'),
      allowlist: ['!!!']
    });
    assert.equal(badId.valid, false);
    assert.equal(badId.code, CD_CODES.UNKNOWN_MISSION_ID_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      projectId: 'leak',
      label: `activation with key ${secret}`,
      projectSsotDigest: sampleSsotDigest('leak'),
      allowlist: ['CB']
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CD_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluatePlan({
      projectId: 'fundacion-plan',
      target: 'C:/Users/valen/Documents/Fundacion/activation.json',
      projectSsotDigest: sampleSsotDigest('fundacion-plan'),
      allowlist: ['CB']
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CD_CODES.FUNDACION_ALWAYS_DENY);

    const projectIdLevel = gate.evaluatePlan({
      projectId: 'fundacion/bleed',
      projectSsotDigest: sampleSsotDigest('fundacion-id'),
      allowlist: ['CB']
    });
    assert.equal(projectIdLevel.valid, false);
    assert.equal(projectIdLevel.code, CD_CODES.FUNDACION_ALWAYS_DENY);

    const rowLevel = gate.evaluatePlan({
      projectId: 'fundacion-row',
      projectSsotDigest: sampleSsotDigest('fundacion-row'),
      allowlist: [
        {
          missionId: 'CB',
          targetPath: '/fundacion/memory.json'
        }
      ]
    });
    assert.equal(rowLevel.valid, false);
    assert.equal(rowLevel.code, CD_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects oversized allowlists beyond max mission bound', () => {
    const tight = new FleetActivationPolicyGate({ maxMissions: 2 });
    const allowlist = ['CB', 'CC', 'CD'];
    const res = tight.evaluatePlan({
      projectId: 'over',
      projectSsotDigest: sampleSsotDigest('over'),
      allowlist
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CD_CODES.OVERSIZED_ALLOWLIST_DENY);
  });
});

describe('Mission CD — Fleet Activation Port (SPEC-0087)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new FleetActivationPort();
  });

  it('activate happy path: valid plan → ALLOW + CD receipt linking SSOT → missions', () => {
    const plan = sampleHappyPlan();
    const res = port.activate(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'ALLOW');
    assert.equal(res.code, CD_CODES.ACTIVATE_ALLOW);
    assert.equal(res.projectId, 'eos-demo-project');
    assert.equal(res.projectSsotDigest, plan.projectSsotDigest);
    assert.equal(res.rootDigest.length, 64);
    assert.deepEqual(res.allowedMissions, ['CB', 'CC', 'CD']);
    assert.deepEqual(res.deniedMissions, []);

    assert.equal(res.receipt.kind, CD_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CD-RCPT-'));
    assert.equal(res.receipt.decision, 'ALLOW');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.projectSsotDigest, plan.projectSsotDigest);
    assert.deepEqual([...res.receipt.allowedMissions], ['CB', 'CC', 'CD']);

    const stored = port.getActivation(res.projectId);
    assert.ok(stored);
    assert.equal(stored.rootDigest, res.rootDigest);
    assert.equal(stored.projectSsotDigest, plan.projectSsotDigest);
  });

  it('deny empty allowlist emits sealed DENY receipt', () => {
    const res = port.activate({
      projectId: 'deny-empty',
      projectSsotDigest: sampleSsotDigest('deny-empty'),
      allowlist: []
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CD_CODES.EMPTY_ALLOWLIST_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CD-RCPT-'));
  });

  it('deny Fundacion emits sealed DENY receipt', () => {
    const res = port.activate({
      projectId: 'deny-fundacion',
      target: 'Documents/Fundacion/out',
      projectSsotDigest: sampleSsotDigest('deny-fundacion'),
      allowlist: ['CB']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CD_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CD-RCPT-'));
    assert.equal(verifyFleetActivationReceipt(res.receipt).ok, true);
  });

  it('deny secrets emits sealed DENY receipt', () => {
    const secret = makeSyntheticSecret();
    const res = port.activate({
      projectId: 'deny-secret',
      projectSsotDigest: sampleSsotDigest('deny-secret'),
      allowlist: [
        {
          missionId: 'BY',
          payload: { token: secret }
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CD_CODES.SECRET_DETECTED_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny bad SSOT digest emits sealed DENY receipt', () => {
    const res = port.activate({
      projectId: 'deny-digest',
      projectSsotDigest: 'deadbeef',
      allowlist: ['CB', 'CC']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CD_CODES.INVALID_SSOT_DIGEST_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny oversize allowlist emits sealed DENY receipt', () => {
    const tight = new FleetActivationPort({ maxMissions: 2 });
    const res = tight.activate({
      projectId: 'deny-oversize',
      projectSsotDigest: sampleSsotDigest('deny-oversize'),
      allowlist: ['CB', 'CC', 'CD']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CD_CODES.OVERSIZED_ALLOWLIST_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('verifyTrail validates CD receipt chain; tamper breaks trail', () => {
    const a = port.activate(sampleHappyPlan({ projectId: 'trail-a' }));
    const b = port.activate({
      projectId: 'trail-b',
      projectSsotDigest: sampleSsotDigest('trail-b'),
      allowlist: ['BU', 'BX']
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CD_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, projectId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CD_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: not k8s multi-cluster CP and not Fundacion / PRODUCTION_READY=NO', () => {
    assert.equal(CD_PORT_KIND, 'eos-fleet-activation-port');
    const receipt = buildFleetActivationReceipt({
      operation: 'ACTIVATE',
      projectId: 'nonclaim',
      decision: 'ALLOW',
      projectSsotDigest: sampleSsotDigest('nonclaim'),
      allowedMissions: ['CD']
    });
    assert.equal(receipt.nonClaims.kubernetesMultiClusterControlPlane, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CD_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CD_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
  });
});
