/**
 * @file tests/eos-ci-hitl-escalation-federation-port.test.js
 * SPEC-0092 / Mission CI — Human Authority Escalation Federation Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   Hermetic: does NOT auto-approve irreversible; human remains authority.
 *   NON-CLAIM: ≠ autonomous approval of irreversible actions / human remains authority / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CI_PRODUCTION_READY,
  CI_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CI_RECEIPT_KIND,
  sha256Canonical,
  buildHitlEscalationFederationReceipt,
  verifyHitlEscalationFederationReceipt,
  canonicalHitlEscalationFederationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/authority/hitl-escalation-federation-receipt.js';

import {
  HitlEscalationFederationPolicyGate,
  CI_CODES,
  CI_MAX_REASONS,
  CI_ID_PATTERN,
  CI_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/authority/hitl-escalation-federation-policy-gate.js';

import {
  HitlEscalationFederationPort,
  CI_PORT_PRODUCTION_READY,
  CI_PORT_KIND
} from '../src/core/authority/hitl-escalation-federation-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionHitlEscalation1234567890';
}

function sampleHappyEscalatePlan(overrides = {}) {
  return {
    escalationId: 'esc-l25-ci-001',
    projectId: 'eos-project-demo',
    missionId: 'CI',
    operatorDecision: 'APPROVE',
    irreversibilityClass: 'REVERSIBLE',
    reasons: ['operator approved reversible gate'],
    label: 'happy escalate',
    ...overrides
  };
}

describe('Mission CI — HITL Escalation Federation Receipt (SPEC-0092)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CI_PRODUCTION_READY, 'NO');
    assert.equal(CI_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CI_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CI_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CI-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildHitlEscalationFederationReceipt({
      operation: 'ESCALATE',
      escalationId: 'esc-demo',
      projectId: 'proj-demo',
      missionId: 'CI',
      operatorDecision: 'APPROVE',
      irreversibilityClass: 'REVERSIBLE',
      decision: 'ESCALATE',
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CI_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CI-RCPT-'));
    assert.equal(receipt.escalationId, 'esc-demo');
    assert.equal(receipt.projectId, 'proj-demo');
    assert.equal(receipt.missionId, 'CI');
    assert.equal(receipt.operatorDecision, 'APPROVE');
    assert.equal(receipt.irreversibilityClass, 'REVERSIBLE');
    assert.equal(receipt.decision, 'ESCALATE');
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.autonomousApprovalOfIrreversible, false);
    assert.equal(receipt.nonClaims.humanRemainsAuthority, true);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalHitlEscalationFederationSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyHitlEscalationFederationReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildHitlEscalationFederationReceipt({
      operation: 'ESCALATE',
      escalationId: 'esc-demo',
      projectId: 'proj-demo',
      missionId: 'CI',
      operatorDecision: 'APPROVE',
      irreversibilityClass: 'REVERSIBLE',
      decision: 'ESCALATE'
    });

    const tampered = { ...receipt, escalationId: 'esc-tampered-hacked' };
    const verifyRes = verifyHitlEscalationFederationReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CI — HITL Escalation Federation Policy Gate (SPEC-0092)', () => {
  let gate;

  beforeEach(() => {
    gate = new HitlEscalationFederationPolicyGate();
  });

  it('validates a well-formed escalate plan with APPROVE reversible', () => {
    const res = gate.evaluatePlan(sampleHappyEscalatePlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CI_CODES.PLAN_VALID_OK);
    assert.equal(res.escalationId, 'esc-l25-ci-001');
    assert.equal(res.projectId, 'eos-project-demo');
    assert.equal(res.missionId, 'CI');
    assert.equal(res.operatorDecision, 'APPROVE');
    assert.equal(res.irreversibilityClass, 'REVERSIBLE');
    assert.equal(res.mappedDecision, 'ESCALATE');
    assert.ok(CI_ID_PATTERN.test('esc-l25-ci-001'));
    assert.ok(CI_MAX_REASONS >= 2);
  });

  it('rejects empty plan / missing required ids fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CI_CODES.EMPTY_PLAN_DENY);

    const noEsc = gate.evaluatePlan({
      projectId: 'p1',
      missionId: 'CI',
      irreversibilityClass: 'REVERSIBLE',
      operatorDecision: 'APPROVE'
    });
    assert.equal(noEsc.valid, false);
    assert.equal(noEsc.code, CI_CODES.MISSING_ESCALATION_ID_DENY);

    const noProj = gate.evaluatePlan({
      escalationId: 'e1',
      missionId: 'CI',
      irreversibilityClass: 'REVERSIBLE',
      operatorDecision: 'APPROVE'
    });
    assert.equal(noProj.valid, false);
    assert.equal(noProj.code, CI_CODES.MISSING_PROJECT_ID_DENY);

    const noMission = gate.evaluatePlan({
      escalationId: 'e1',
      projectId: 'p1',
      irreversibilityClass: 'REVERSIBLE',
      operatorDecision: 'APPROVE'
    });
    assert.equal(noMission.valid, false);
    assert.equal(noMission.code, CI_CODES.MISSING_MISSION_ID_DENY);
  });

  it('rejects missing operatorDecision on IRREVERSIBLE', () => {
    const res = gate.evaluatePlan({
      escalationId: 'esc-irr-1',
      projectId: 'proj-1',
      missionId: 'CI',
      irreversibilityClass: 'IRREVERSIBLE'
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CI_CODES.MISSING_OPERATOR_FOR_IRREVERSIBLE_DENY);
  });

  it('rejects auto-APPROVE on IRREVERSIBLE (human remains authority)', () => {
    const res = gate.evaluatePlan({
      escalationId: 'esc-auto-1',
      projectId: 'proj-1',
      missionId: 'CI',
      irreversibilityClass: 'IRREVERSIBLE',
      operatorDecision: 'APPROVE',
      autoApprove: true
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CI_CODES.AUTO_APPROVE_IRREVERSIBLE_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      ...sampleHappyEscalatePlan(),
      label: `escalate with key ${secret}`
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CI_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluatePlan({
      ...sampleHappyEscalatePlan(),
      target: 'C:/Users/valen/Documents/Fundacion/out.json'
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CI_CODES.FUNDACION_ALWAYS_DENY);

    const idLevel = gate.evaluatePlan({
      ...sampleHappyEscalatePlan({ escalationId: 'fundacion/bleed' })
    });
    assert.equal(idLevel.valid, false);
    assert.equal(idLevel.code, CI_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects oversized reasons beyond max bound', () => {
    const tight = new HitlEscalationFederationPolicyGate({ maxReasons: 2 });
    const res = tight.evaluatePlan({
      ...sampleHappyEscalatePlan({
        reasons: ['a', 'b', 'c']
      })
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CI_CODES.OVERSIZED_REASONS_DENY);
  });
});

describe('Mission CI — HITL Escalation Federation Port (SPEC-0092)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new HitlEscalationFederationPort();
  });

  it('escalate happy path: APPROVE reversible → ESCALATE + CI receipt', () => {
    const plan = sampleHappyEscalatePlan();
    const res = port.escalate(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'ESCALATE');
    assert.equal(res.code, CI_CODES.ESCALATE_ALLOW);
    assert.equal(res.escalationId, 'esc-l25-ci-001');
    assert.equal(res.projectId, 'eos-project-demo');
    assert.equal(res.missionId, 'CI');
    assert.equal(res.operatorDecision, 'APPROVE');
    assert.equal(res.irreversibilityClass, 'REVERSIBLE');
    assert.equal(res.escalationDigest.length, 64);

    assert.equal(res.receipt.kind, CI_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CI-RCPT-'));
    assert.equal(res.receipt.decision, 'ESCALATE');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.nonClaims.humanRemainsAuthority, true);
    assert.equal(res.receipt.nonClaims.autonomousApprovalOfIrreversible, false);

    const stored = port.getEscalation(res.escalationId);
    assert.ok(stored);
    assert.equal(stored.decision, 'ESCALATE');
  });

  it('HOLD path: DEFER → HOLD + CI receipt (human deferred)', () => {
    const res = port.escalate(
      sampleHappyEscalatePlan({
        escalationId: 'esc-defer-1',
        operatorDecision: 'DEFER',
        irreversibilityClass: 'PARTIALLY_REVERSIBLE'
      })
    );
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, CI_CODES.HOLD_ALLOW);
    assert.ok(res.receipt.receiptId.startsWith('CI-RCPT-'));
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.productionReady, 'NO');
  });

  it('deny missing operator on irreversible emits sealed DENY receipt', () => {
    const res = port.escalate({
      escalationId: 'esc-miss-op',
      projectId: 'proj-1',
      missionId: 'CI',
      irreversibilityClass: 'IRREVERSIBLE'
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CI_CODES.MISSING_OPERATOR_FOR_IRREVERSIBLE_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CI-RCPT-'));
  });

  it('deny auto-approve irreversible without human emits sealed DENY', () => {
    const res = port.escalate({
      escalationId: 'esc-auto-irr',
      projectId: 'proj-1',
      missionId: 'CI',
      irreversibilityClass: 'IRREVERSIBLE',
      operatorDecision: 'APPROVE',
      autoApprove: true
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CI_CODES.AUTO_APPROVE_IRREVERSIBLE_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CI-RCPT-'));
  });

  it('deny Fundacion emits sealed DENY receipt', () => {
    const res = port.escalate({
      ...sampleHappyEscalatePlan({ escalationId: 'esc-fundacion' }),
      target: 'Documents/Fundacion/out'
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CI_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CI-RCPT-'));
    assert.equal(verifyHitlEscalationFederationReceipt(res.receipt).ok, true);
  });

  it('deny secrets emits sealed DENY receipt', () => {
    const secret = makeSyntheticSecret();
    const res = port.escalate({
      ...sampleHappyEscalatePlan({ escalationId: 'esc-secret' }),
      payload: { token: secret }
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CI_CODES.SECRET_DETECTED_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny oversize reasons emits sealed DENY receipt', () => {
    const tight = new HitlEscalationFederationPort({ maxReasons: 2 });
    const res = tight.escalate({
      ...sampleHappyEscalatePlan({
        escalationId: 'esc-over',
        reasons: ['r1', 'r2', 'r3']
      })
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CI_CODES.OVERSIZED_REASONS_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('verifyTrail validates CI receipt chain; tamper breaks trail', () => {
    const a = port.escalate(
      sampleHappyEscalatePlan({ escalationId: 'trail-a' })
    );
    const b = port.escalate(
      sampleHappyEscalatePlan({
        escalationId: 'trail-b',
        operatorDecision: 'DEFER'
      })
    );
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CI_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, escalationId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CI_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: human remains authority / ≠ autonomous irreversible / PRODUCTION_READY=NO', () => {
    assert.equal(CI_PORT_KIND, 'eos-hitl-escalation-federation-port');
    const receipt = buildHitlEscalationFederationReceipt({
      operation: 'ESCALATE',
      escalationId: 'nonclaim',
      projectId: 'p',
      missionId: 'CI',
      operatorDecision: 'APPROVE',
      irreversibilityClass: 'REVERSIBLE',
      decision: 'ESCALATE'
    });
    assert.equal(receipt.nonClaims.autonomousApprovalOfIrreversible, false);
    assert.equal(receipt.nonClaims.humanRemainsAuthority, true);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CI_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CI_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');

    // Explicit human APPROVE of irreversible is allowed (human authority)
    const humanIrr = port.escalate({
      escalationId: 'esc-human-irr',
      projectId: 'proj-1',
      missionId: 'CI',
      irreversibilityClass: 'IRREVERSIBLE',
      operatorDecision: 'APPROVE'
    });
    assert.equal(humanIrr.ok, true);
    assert.equal(humanIrr.decision, 'ESCALATE');
    assert.equal(humanIrr.receipt.nonClaims.humanRemainsAuthority, true);
    assert.equal(
      humanIrr.receipt.nonClaims.autonomousApprovalOfIrreversible,
      false
    );
  });
});
