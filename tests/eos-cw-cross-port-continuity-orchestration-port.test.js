/**
 * @file tests/eos-cw-cross-port-continuity-orchestration-port.test.js
 * SPEC-0106 / Mission CW — Cross-Port Continuity Orchestration Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-import CV honesty (compose)
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   NON-CLAIM: ≠ GHE / ≠ CU rewrite / ≠ L27 reopen / ≠ PRODUCTION_READY /
 *              ≠ L28 closeout / ≠ tip rewrite / ≠ CX start
 *   Do NOT rewrite CU seam-pack / operator-doctor.js / operator-hud.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CW_PRODUCTION_READY,
  CW_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CW_RECEIPT_KIND,
  CW_DECISIONS,
  CW_ORCHESTRATION_MODES,
  CW_REQUIRED_CONTINUITY_PORTS,
  sha256Canonical,
  buildCrossPortContinuityOrchestrationReceipt,
  verifyCrossPortContinuityOrchestrationReceipt,
  canonicalCrossPortContinuityOrchestrationSealBody,
  normalizeObservePortLabel,
  _resetReceiptSeqForTests
} from '../src/core/composition/cross-port-continuity-orchestration-receipt.js';

import {
  CrossPortContinuityOrchestrationPolicyGate,
  CW_CODES,
  CW_MAX_REASONS,
  CW_ID_PATTERN,
  CW_POLICY_GATE_PRODUCTION_READY,
  CW_ORCHESTRATION_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL27Reopen,
  claimsTipRewrite,
  claimsWeakenAlwaysDeny,
  claimsCuRewrite,
  claimsGhe,
  isFundacionTarget,
  isTamperedDigest,
  normalizeOrchestrationPhase,
  evaluateContinuitySet
} from '../src/core/composition/cross-port-continuity-orchestration-policy-gate.js';

import {
  CrossPortContinuityOrchestrationPort,
  CW_PORT_PRODUCTION_READY,
  CW_PORT_KIND,
  CW_SAFE_AUTOMATION_IDS,
  CW_REFUSE_CODES,
  CW_FREEZE_PIN,
  decisionForOrchestration,
  builtinContinuityHonestyDouble,
  softImportCvHonesty
} from '../src/core/composition/cross-port-continuity-orchestration-port.js';

const FREEZE_PIN = 'd86d7525d2a2d4c87c27230b5349b9745bad3c23';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionCwContinuityOrch123';
}

function goodDigest(seed = 'eos-cw-cross-port-continuity-orchestration') {
  return sha256Canonical(seed);
}

function fullObservedPorts() {
  return ['CQ:observe', 'CR:observe', 'CS:observe', 'CT:observe'];
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cw-001',
    changeId: 'chg.continuity.cw-001',
    orchestrationMode: 'ACTIVE',
    phase: 'compose_continuity',
    observedPorts: fullObservedPorts(),
    reasons: ['hermetic cross-port continuity orchestration govern'],
    label: 'happy pass continuity orchestration',
    ...overrides
  };
}

describe('Mission CW — Cross-Port Continuity Orchestration Receipt (SPEC-0106)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CW_PRODUCTION_READY, 'NO');
    assert.equal(CW_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CW_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CW_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CW_FREEZE_PIN, FREEZE_PIN);
    assert.ok(
      CW_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(CW_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(CW_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_TIP_REWRITE'));
    assert.ok(CW_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_L27_REOPEN'));
    assert.ok(CW_SAFE_AUTOMATION_IDS.includes('A10_REFUSE_CU_REWRITE'));
    assert.ok(CW_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_GHE_CLAIM'));
    assert.deepEqual([...CW_REQUIRED_CONTINUITY_PORTS], [
      'CQ',
      'CR',
      'CS',
      'CT'
    ]);
  });

  it('builds canonical nine-field sealed CW-RCPT-* receipt', () => {
    const receipt = buildCrossPortContinuityOrchestrationReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      orchestrationMode: 'ACTIVE',
      phase: 'compose_continuity',
      continuityDigest: goodDigest('demo'),
      observedPorts: fullObservedPorts(),
      continuityOk: true,
      honestyOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CW_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CW-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.orchestrationMode, 'ACTIVE');
    assert.equal(receipt.continuityOk, true);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.l27Reopen, false);
    assert.equal(receipt.nonClaims.tipRewrite, false);
    assert.equal(receipt.nonClaims.ghe, false);
    assert.equal(receipt.nonClaims.cuRewrite, false);
    assert.equal(receipt.nonClaims.l28Closeout, false);
    assert.equal(receipt.nonClaims.startCX, false);

    const body = canonicalCrossPortContinuityOrchestrationSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyCrossPortContinuityOrchestrationReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildCrossPortContinuityOrchestrationReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      orchestrationMode: 'ACTIVE',
      continuityDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyCrossPortContinuityOrchestrationReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CW — Cross-Port Continuity Orchestration Policy Gate (SPEC-0106)', () => {
  let gate;

  beforeEach(() => {
    gate = new CrossPortContinuityOrchestrationPolicyGate();
  });

  it('validates well-formed plan (planId+changeId+ACTIVE+phase+CQ↔CR↔CS↔CT)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CW_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l28-cw-001');
    assert.equal(res.changeId, 'chg.continuity.cw-001');
    assert.equal(res.orchestrationMode, 'ACTIVE');
    assert.equal(res.phase, 'compose_continuity');
    assert.equal(res.continuityOk, true);
    assert.deepEqual(res.observedPortCodes, ['CQ', 'CR', 'CS', 'CT']);
    assert.ok(CW_ID_PATTERN.test('plan-l28-cw-001'));
    assert.ok(CW_MAX_REASONS >= 1);
    assert.ok(CW_ORCHESTRATION_MODES.includes('ACTIVE'));
    assert.ok(CW_ORCHESTRATION_MODES.includes('HOLD'));
    assert.ok(CW_ORCHESTRATION_PHASES.includes('compose_continuity'));
    assert.equal(normalizeOrchestrationPhase('compose'), 'compose_continuity');
    assert.equal(normalizeObservePortLabel('CQ:observe'), 'CQ');
    assert.equal(evaluateContinuitySet(['CQ', 'CR', 'CS', 'CT']).ok, true);
  });

  it('rejects empty / missing planId / changeId / orchestrationMode / phase fail-closed', () => {
    assert.equal(gate.evaluatePlan({}).code, CW_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        continuityDigest: goodDigest('x'),
        orchestrationMode: 'HOLD',
        phase: 'hold_observe'
      }).code,
      CW_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        continuityDigest: goodDigest('x'),
        orchestrationMode: 'ACTIVE',
        phase: 'compose_continuity',
        observedPorts: fullObservedPorts()
      }).code,
      CW_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        continuityDigest: goodDigest('x'),
        phase: 'compose_continuity',
        observedPorts: fullObservedPorts()
      }).code,
      CW_CODES.MISSING_ORCHESTRATION_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        orchestrationMode: 'GREEN',
        continuityDigest: goodDigest('x'),
        phase: 'compose_continuity',
        observedPorts: fullObservedPorts()
      }).code,
      CW_CODES.INVALID_ORCHESTRATION_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        orchestrationMode: 'ACTIVE',
        continuityDigest: goodDigest('x'),
        observedPorts: fullObservedPorts()
      }).code,
      CW_CODES.MISSING_PHASE_DENY
    );
  });

  it('DENY missing required CQ↔CR↔CS↔CT observe labels without ack', () => {
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: ['CQ:observe', 'CR:observe']
      }).code,
      CW_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );

    // With ack — gate allows through (port still refuses PASS for incomplete)
    const acked = gate.evaluatePlan({
      ...sampleHappyPlan(),
      observedPorts: ['CQ:observe', 'CR:observe'],
      ackMissingObserveLabels: true
    });
    assert.equal(acked.valid, true);
    assert.equal(acked.continuityOk, false);
  });

  it('detects secrets / Fundacion / weaken ALWAYS_DENY / L27 reopen / tip rewrite / CU rewrite / GHE', () => {
    assert.equal(scanForSecrets({ note: makeSyntheticSecret() }), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);
    assert.equal(isFundacionTarget('src/core/composition'), false);
    assert.equal(
      claimsWeakenAlwaysDeny({ label: 'FUNDACION_ALWAYS_DENY=false' }),
      true
    );
    assert.equal(claimsL27Reopen({ label: 'reopen L27' }), true);
    assert.equal(
      claimsTipRewrite({ label: 'tip rewrite freeze main_tip' }),
      true
    );
    assert.equal(claimsCuRewrite({ label: 'rewrite CU seam-pack' }), true);
    assert.equal(claimsGhe({ label: 'GHE enforcement enable' }), true);

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: makeSyntheticSecret()
      }).code,
      CW_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      CW_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      CW_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 27'
      }).code,
      CW_CODES.L27_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'rewrite freeze main_tip'
      }).code,
      CW_CODES.TIP_REWRITE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        cuRewrite: true
      }).code,
      CW_CODES.CU_REWRITE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        gheEnforcement: true
      }).code,
      CW_CODES.GHE_CLAIM_DENY
    );
  });

  it('rejects PRODUCTION_READY flip / auto-seal claims / tampered digests', () => {
    assert.equal(
      claimsProductionReadyFlip({ label: 'flip PRODUCTION_READY to YES' }),
      true
    );
    assert.equal(claimsAutoSeal({ label: 'auto-seal without human' }), true);
    assert.equal(isTamperedDigest('0'.repeat(64)), true);

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'claim PRODUCTION_READY=YES'
      }).code,
      CW_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      CW_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: undefined,
        continuityDigest: '0'.repeat(64)
      }).code,
      CW_CODES.TAMPERED_DIGEST_DENY
    );
  });
});

describe('Mission CW — Cross-Port Continuity Orchestration Port (SPEC-0106)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + CQ↔CR↔CS↔CT observe → PASS + CW-RCPT-*', async () => {
    const port = new CrossPortContinuityOrchestrationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, CW_CODES.GOVERN_PASS);
    assert.equal(out.orchestrationMode, 'ACTIVE');
    assert.equal(out.phase, 'compose_continuity');
    assert.equal(out.continuityOk, true);
    assert.equal(out.honestyOk, true);
    assert.ok(out.receipt.receiptId.startsWith('CW-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.deepEqual(out.observedPortCodes, ['CQ', 'CR', 'CS', 'CT']);
    assert.ok(
      out.safeAutomationIds.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A10_REFUSE_CU_REWRITE'));
    assert.ok(out.safeAutomationIds.includes('A11_REFUSE_GHE_CLAIM'));
    assert.equal(port.getDecision('plan-l28-cw-001').decision, 'PASS');
  });

  it('HOLD orchestrationMode → HOLD (observe; ≠ automatic L28 close / ≠ CU rewrite)', async () => {
    const port = new CrossPortContinuityOrchestrationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        orchestrationMode: 'HOLD',
        observedPorts: undefined,
        continuityDigest: goodDigest('hold-1'),
        phase: 'hold_observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, CW_CODES.GOVERN_HOLD);
    assert.equal(
      decisionForOrchestration('HOLD', { continuityOk: false, honestyOk: false }),
      'HOLD'
    );
  });

  it('evaluate() aliases govern()', async () => {
    const port = new CrossPortContinuityOrchestrationPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('DENY missing required observe labels / Fundacion / secrets / PR flip / L27 / tip / CU / GHE', async () => {
    const port = new CrossPortContinuityOrchestrationPort({
      preferBuiltinDouble: true
    });

    const missing = await port.govern(
      sampleHappyPlan({
        planId: 'plan-missing',
        observedPorts: ['CQ:observe']
      })
    );
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, CW_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY);

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, CW_CODES.FUNDACION_ALWAYS_DENY);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, CW_CODES.SECRET_DETECTED_DENY);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, CW_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L27'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, CW_CODES.L27_REOPEN_CLAIM_DENY);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, CW_CODES.TIP_REWRITE_CLAIM_DENY);

    const cu = await port.govern(
      sampleHappyPlan({
        planId: 'plan-cu',
        rewriteCuSeamPack: true
      })
    );
    assert.equal(cu.decision, 'DENY');
    assert.equal(cu.code, CW_CODES.CU_REWRITE_CLAIM_DENY);
    assert.equal(cu.cuRewriteRefused, true);

    const ghe = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ghe',
        claimGhe: true
      })
    );
    assert.equal(ghe.decision, 'DENY');
    assert.equal(ghe.code, CW_CODES.GHE_CLAIM_DENY);
    assert.equal(ghe.gheClaimRefused, true);
  });

  it('verifyTrail validates CW receipt chain; tamper breaks trail', async () => {
    const port = new CrossPortContinuityOrchestrationPort({
      preferBuiltinDouble: true
    });
    await port.govern(
      sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' })
    );
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        orchestrationMode: 'HOLD',
        observedPorts: undefined,
        continuityDigest: goodDigest('t2'),
        phase: 'hold_observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, CW_CODES.TRAIL_OK);
    assert.equal(ok.receiptCount, 2);

    const broken = port.receipts[1];
    Object.defineProperty(port, 'receipts', {
      value: [
        port.receipts[0],
        { ...broken, planId: 'tampered', receiptHash: broken.receiptHash }
      ]
    });
    const bad = port.verifyTrail();
    assert.equal(bad.valid, false);
    assert.equal(bad.code, CW_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIMs: ≠ GHE / ≠ CU rewrite / ≠ L27 reopen / ≠ PR flip / ≠ L28 closeout / ≠ CX', async () => {
    const port = new CrossPortContinuityOrchestrationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRewrite, false);
    assert.equal(out.receipt.nonClaims.ghe, false);
    assert.equal(out.receipt.nonClaims.cuRewrite, false);
    assert.equal(out.receipt.nonClaims.l28Closeout, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCX, false);
    assert.ok(
      out.reasons.some((r) => /≠ GHE|NON-CLAIM/i.test(r))
    );

    const dbl = builtinContinuityHonestyDouble({
      observedPorts: fullObservedPorts()
    });
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.continuity.ok, true);
    assert.ok(Array.isArray(dbl.non_claim_chips));

    assert.equal(CW_PORT_KIND, 'eos-cross-port-continuity-orchestration-port');
    assert.ok(CW_DECISIONS.includes('PASS'));
    assert.ok(CW_DECISIONS.includes('DENY'));
    assert.ok(CW_DECISIONS.includes('HOLD'));
  });

  it('soft-import CV honesty port when path present (compose; fixture otherwise)', async () => {
    const soft = await softImportCvHonesty(
      '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    );
    // Soft-import may succeed on box (CV mold present) or fall back — either OK
    if (soft) {
      assert.equal(soft.source, 'soft-import');
      assert.equal(soft.HONESTY_PRODUCTION_READY, 'NO');
    }

    const port = new CrossPortContinuityOrchestrationPort({
      honestyModulePath:
        '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-soft-cv',
        observedPorts: [
          'CQ:MEASURED-label',
          'CR:MEASURED-label',
          'CS:MEASURED-label',
          'CT:MEASURED-label',
          'CU:seam-observe',
          'CV:honesty-observe'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.continuityOk, true);
    assert.ok(out.observedPortCodes.includes('CU'));
    assert.ok(out.observedPortCodes.includes('CV'));
  });

  it('port green ≠ L28 closeout; PRODUCTION_READY remains NO; CU/CV observe optional', async () => {
    const port = new CrossPortContinuityOrchestrationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-nonclose',
        observedPorts: [
          'CQ:MEASURED-label',
          'CR:MEASURED-label',
          'CS:label',
          'CT:label',
          'CU:seam-observe'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(CW_PRODUCTION_READY, 'NO');
    assert.equal(CW_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l28Closeout, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCX, false);
    assert.equal(out.receipt.nonClaims.ghe, false);
    assert.equal(out.receipt.nonClaims.cuRewrite, false);
    assert.ok(out.observedPortCodes.includes('CU'));
    assert.equal(out.receipt.meta.freezePin, 'd86d7525');

    // Ack of incomplete set cannot promote to PASS
    const incomplete = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ack-incomplete',
        observedPorts: ['CQ:observe', 'CR:observe'],
        ackMissingObserveLabels: true
      })
    );
    assert.equal(incomplete.decision, 'DENY');
    assert.ok(
      incomplete.refuseCodes.includes(
        CW_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
      ) ||
        incomplete.code === CW_CODES.CONTINUITY_REFUSE_DENY
    );
  });

  it('invalid phase / oversized reasons fail-closed at policy gate', () => {
    const gate = new CrossPortContinuityOrchestrationPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      phase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, CW_CODES.INVALID_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: CW_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, CW_CODES.OVERSIZED_REASONS_DENY);
  });
});
