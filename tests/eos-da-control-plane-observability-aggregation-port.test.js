/**
 * @file tests/eos-da-control-plane-observability-aggregation-port.test.js
 * SPEC-0110 / Mission DA — Control-Plane Observability Aggregation Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: aggregation PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip
 *   NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 *              ≠ GHE / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 2d6ab2d2 (L29 audit #401) only
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DA_PRODUCTION_READY,
  DA_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DA_RECEIPT_KIND,
  DA_DECISIONS,
  DA_AGGREGATION_MODES,
  DA_REQUIRED_OBSERVE_PORTS,
  DA_FREEZE_PIN,
  DA_FREEZE_PIN_SHORT,
  DA_FREEZE_NONCLAIM_LABELS,
  sha256Canonical,
  forceFreezeObserve,
  buildControlPlaneObservabilityAggregationReceipt,
  verifyControlPlaneObservabilityAggregationReceipt,
  canonicalControlPlaneObservabilityAggregationSealBody,
  normalizeObservePortLabel,
  _resetReceiptSeqForTests
} from '../src/core/composition/control-plane-observability-aggregation-receipt.js';

import {
  ControlPlaneObservabilityAggregationPolicyGate,
  DA_CODES,
  DA_MAX_REASONS,
  DA_ID_PATTERN,
  DA_POLICY_GATE_PRODUCTION_READY,
  DA_AGGREGATION_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL28Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsExternalApm,
  isFundacionTarget,
  isTamperedDigest,
  normalizeAggregationPhase,
  evaluateRequiredObserveSet
} from '../src/core/composition/control-plane-observability-aggregation-policy-gate.js';

import {
  ControlPlaneObservabilityAggregationPort,
  DA_PORT_PRODUCTION_READY,
  DA_PORT_KIND,
  DA_SAFE_AUTOMATION_IDS,
  DA_REFUSE_CODES,
  decisionForAggregation,
  builtinObservabilityAggregationDouble,
  softImportCvCwCxCyHonesty,
  softObserveFreezeNonClaims
} from '../src/core/composition/control-plane-observability-aggregation-port.js';

const FREEZE_PIN = '2d6ab2d2';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionDaAggregation123';
}

function goodDigest(seed = 'eos-da-control-plane-observability-aggregation') {
  return sha256Canonical(seed);
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l29-da-001',
    changeId: 'chg.agg.da-001',
    aggregationMode: 'ACTIVE',
    phase: 'compose_aggregation_port',
    observedPorts: [
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe',
      'CY:control-plane-honesty-observe'
    ],
    reasons: ['hermetic control-plane observability aggregation govern'],
    label: 'happy pass observability aggregation',
    ...overrides
  };
}

describe('Mission DA — Control-Plane Observability Aggregation Receipt (SPEC-0110)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 2d6ab2d2', () => {
    assert.equal(DA_PRODUCTION_READY, 'NO');
    assert.equal(DA_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DA_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DA_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DA_FREEZE_PIN, FREEZE_PIN);
    assert.equal(DA_FREEZE_PIN_SHORT, '2d6ab2d2');
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_L28_REOPEN'));
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_GHE_CLAIM'));
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A10_REFUSE_AUTO_CLOSE_L29'));
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_EXTERNAL_APM'));
    assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_PRODUCTION_READY_FLIP'));
    assert.deepEqual([...DA_REQUIRED_OBSERVE_PORTS], ['CV', 'CW', 'CX', 'CY']);
    assert.ok(DA_FREEZE_NONCLAIM_LABELS.some((l) => /2d6ab2d2/.test(l)));
  });

  it('builds canonical nine-field sealed DA-RCPT-* with freeze soft-observe', () => {
    const receipt = buildControlPlaneObservabilityAggregationReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      aggregationMode: 'ACTIVE',
      phase: 'compose_aggregation_port',
      observabilityDigest: goodDigest('demo'),
      observedPorts: ['CV:observe', 'CW:observe', 'CX:observe', 'CY:observe'],
      aggregationOk: true,
      honestyOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, DA_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('DA-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.aggregationMode, 'ACTIVE');
    assert.equal(receipt.aggregationOk, true);
    assert.equal(receipt.freezeObserve.readOnly, true);
    assert.equal(receipt.freezeObserve.pinShort, '2d6ab2d2');
    assert.equal(receipt.freezeObserve.pin, FREEZE_PIN);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.l28Reopen, false);
    assert.equal(receipt.nonClaims.tipPinRewrite, false);
    assert.equal(receipt.nonClaims.ghe, false);
    assert.equal(receipt.nonClaims.l29AutoClose, false);
    assert.equal(receipt.nonClaims.externalApm, false);

    const body = canonicalControlPlaneObservabilityAggregationSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyControlPlaneObservabilityAggregationReceipt(receipt);
    assert.equal(verifyRes.ok, true);

    const forced = forceFreezeObserve({
      pin: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      readOnly: false
    });
    assert.equal(forced.pin, FREEZE_PIN);
    assert.equal(forced.readOnly, true);
    assert.ok(forced.refusal);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildControlPlaneObservabilityAggregationReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      aggregationMode: 'ACTIVE',
      observabilityDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyControlPlaneObservabilityAggregationReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission DA — Control-Plane Observability Aggregation Policy Gate (SPEC-0110)', () => {
  let gate;

  beforeEach(() => {
    gate = new ControlPlaneObservabilityAggregationPolicyGate();
  });

  it('validates well-formed plan (planId+changeId+ACTIVE+phase+CV/CW/CX/CY observe)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, DA_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l29-da-001');
    assert.equal(res.changeId, 'chg.agg.da-001');
    assert.equal(res.aggregationMode, 'ACTIVE');
    assert.equal(res.phase, 'compose_aggregation_port');
    assert.equal(res.observeOk, true);
    assert.deepEqual(res.observedPortCodes, ['CV', 'CW', 'CX', 'CY']);
    assert.ok(DA_ID_PATTERN.test('plan-l29-da-001'));
    assert.ok(DA_MAX_REASONS >= 1);
    assert.ok(DA_AGGREGATION_MODES.includes('ACTIVE'));
    assert.ok(DA_AGGREGATION_MODES.includes('HOLD'));
    assert.ok(DA_AGGREGATION_PHASES.includes('compose_aggregation_port'));
    assert.equal(normalizeAggregationPhase('compose'), 'compose_aggregation_port');
    assert.equal(normalizeObservePortLabel('CV:honesty-observe'), 'CV');
    assert.equal(evaluateRequiredObserveSet(['CV', 'CW', 'CX', 'CY']).ok, true);
  });

  it('rejects empty / missing planId / changeId / aggregationMode / phase fail-closed', () => {
    assert.equal(gate.evaluatePlan({}).code, DA_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        observabilityDigest: goodDigest('x'),
        aggregationMode: 'HOLD',
        phase: 'hold_observe'
      }).code,
      DA_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        observabilityDigest: goodDigest('x'),
        aggregationMode: 'ACTIVE',
        phase: 'compose_aggregation_port',
        observedPorts: ['CV:o', 'CW:o', 'CX:o', 'CY:o']
      }).code,
      DA_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        observabilityDigest: goodDigest('x'),
        phase: 'compose_aggregation_port',
        observedPorts: ['CV:o', 'CW:o', 'CX:o', 'CY:o']
      }).code,
      DA_CODES.MISSING_AGGREGATION_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        aggregationMode: 'GREEN',
        observabilityDigest: goodDigest('x'),
        phase: 'compose_aggregation_port',
        observedPorts: ['CV:o', 'CW:o', 'CX:o', 'CY:o']
      }).code,
      DA_CODES.INVALID_AGGREGATION_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        aggregationMode: 'ACTIVE',
        observabilityDigest: goodDigest('x'),
        observedPorts: ['CV:o', 'CW:o', 'CX:o', 'CY:o']
      }).code,
      DA_CODES.MISSING_PHASE_DENY
    );
  });

  it('DENY missing required CV/CW/CX/CY observe labels without ack; GHE / external APM / tip-pin claims', () => {
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: ['CQ:observe']
      }).code,
      DA_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );

    const acked = gate.evaluatePlan({
      ...sampleHappyPlan(),
      observedPorts: ['CQ:observe'],
      ackMissingObserveLabels: true
    });
    assert.equal(acked.valid, true);
    assert.equal(acked.observeOk, false);

    assert.equal(claimsGhe({ label: 'GHE enforcement enable' }), true);
    assert.equal(claimsExternalApm({ label: 'enable external APM' }), true);
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhe: true
      }).code,
      DA_CODES.GHE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        externalApm: true
      }).code,
      DA_CODES.EXTERNAL_APM_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        freezeObserve: { pin: '00'.repeat(20), readOnly: false }
      }).code,
      DA_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
  });

  it('detects secrets / Fundacion / weaken ALWAYS_DENY / L28 reopen / tip-pin rewrite', () => {
    assert.equal(scanForSecrets({ note: makeSyntheticSecret() }), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);
    assert.equal(isFundacionTarget('src/core/composition'), false);
    assert.equal(
      claimsWeakenAlwaysDeny({ label: 'FUNDACION_ALWAYS_DENY=false' }),
      true
    );
    assert.equal(claimsL28Reopen({ label: 'reopen L28' }), true);
    assert.equal(
      claimsTipPinRewrite({ label: 'tip pin rewrite freeze main_tip' }),
      true
    );
    assert.equal(claimsTipRewrite({ label: 'rewrite freeze tip pin' }), true);

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: makeSyntheticSecret()
      }).code,
      DA_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      DA_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      DA_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 28'
      }).code,
      DA_CODES.L28_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        tipPinRewrite: true
      }).code,
      DA_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
  });

  it('rejects PRODUCTION_READY flip / auto-seal / auto-close L29 / tampered digests', () => {
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
      DA_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      DA_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoCloseL29: true
      }).code,
      DA_CODES.AUTO_CLOSE_L29_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: undefined,
        observabilityDigest: '0'.repeat(64)
      }).code,
      DA_CODES.TAMPERED_DIGEST_DENY
    );
  });
});

describe('Mission DA — Control-Plane Observability Aggregation Port (SPEC-0110)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + CV/CW/CX/CY observe → PASS + DA-RCPT-*', async () => {
    const port = new ControlPlaneObservabilityAggregationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, DA_CODES.GOVERN_PASS);
    assert.equal(out.aggregationMode, 'ACTIVE');
    assert.equal(out.phase, 'compose_aggregation_port');
    assert.equal(out.aggregationOk, true);
    assert.equal(out.honestyOk, true);
    assert.ok(out.receipt.receiptId.startsWith('DA-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.freezeObserve.pinShort, '2d6ab2d2');
    assert.equal(out.freezeObserve.readOnly, true);
    assert.deepEqual(out.observedPortCodes, ['CV', 'CW', 'CX', 'CY']);
    assert.ok(
      out.safeAutomationIds.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(out.safeAutomationIds.includes('A10_REFUSE_AUTO_CLOSE_L29'));
    assert.equal(port.getDecision('plan-l29-da-001').decision, 'PASS');
  });

  it('HOLD aggregationMode → HOLD (observe; freeze soft-observe only — ≠ tip rewrite)', async () => {
    const port = new ControlPlaneObservabilityAggregationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        aggregationMode: 'HOLD',
        observedPorts: undefined,
        observabilityDigest: goodDigest('hold-1'),
        phase: 'hold_observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, DA_CODES.GOVERN_HOLD);
    assert.equal(out.freezeObserve.pinShort, '2d6ab2d2');
    assert.equal(
      decisionForAggregation('HOLD', { observeOk: false, honestyOk: false }),
      'HOLD'
    );
  });

  it('evaluate() aliases govern()', async () => {
    const port = new ControlPlaneObservabilityAggregationPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('DENY missing CV/CW/CX/CY / Fundacion / secrets / PR flip / L28 / tip-pin / GHE / L29 auto-close', async () => {
    const port = new ControlPlaneObservabilityAggregationPort({
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
    assert.equal(missing.code, DA_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY);

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, DA_CODES.FUNDACION_ALWAYS_DENY);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, DA_CODES.SECRET_DETECTED_DENY);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, DA_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L28'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, DA_CODES.L28_REOPEN_CLAIM_DENY);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipPinRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, DA_CODES.TIP_PIN_REWRITE_CLAIM_DENY);
    assert.equal(tip.tipPinRewriteRefused, true);

    const ghe = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ghe',
        claimGhe: true
      })
    );
    assert.equal(ghe.decision, 'DENY');
    assert.equal(ghe.code, DA_CODES.GHE_CLAIM_DENY);
    assert.equal(ghe.gheClaimRefused, true);

    const l29 = await port.govern(
      sampleHappyPlan({
        planId: 'plan-l29',
        autoCloseL29: true
      })
    );
    assert.equal(l29.decision, 'DENY');
    assert.equal(l29.code, DA_CODES.AUTO_CLOSE_L29_CLAIM_DENY);
    assert.equal(l29.autoCloseL29Refused, true);
  });

  it('verifyTrail validates DA receipt chain; tamper breaks trail', async () => {
    const port = new ControlPlaneObservabilityAggregationPort({
      preferBuiltinDouble: true
    });
    await port.govern(
      sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' })
    );
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        aggregationMode: 'HOLD',
        observedPorts: undefined,
        observabilityDigest: goodDigest('t2'),
        phase: 'hold_observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, DA_CODES.TRAIL_OK);
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
    assert.equal(bad.code, DA_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIMs: aggregation PASS ≠ tip-pin rewrite / ≠ PR flip / ≠ L29 auto-close / ≠ L28 reopen', async () => {
    const port = new ControlPlaneObservabilityAggregationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.l28Reopen, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.nonClaims.ghe, false);
    assert.equal(out.receipt.nonClaims.l29AutoClose, false);
    assert.equal(out.receipt.nonClaims.externalApm, false);
    assert.equal(out.freezeObserve.pinShort, '2d6ab2d2');
    assert.ok(
      out.reasons.some((r) => /≠ tip-pin|NON-CLAIM|2d6ab2d2|soft-observe/i.test(r))
    );

    const dbl = builtinObservabilityAggregationDouble({
      observedPorts: ['CV:o', 'CW:o', 'CX:o', 'CY:o']
    });
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.freeze_observe.pinShort, '2d6ab2d2');
    assert.ok(Array.isArray(dbl.non_claim_chips));

    const softFreeze = softObserveFreezeNonClaims();
    assert.equal(softFreeze.readOnly, true);
    assert.equal(softFreeze.pinShort, '2d6ab2d2');

    assert.equal(DA_PORT_KIND, 'eos-control-plane-observability-aggregation-port');
    assert.ok(DA_DECISIONS.includes('PASS'));
    assert.ok(DA_DECISIONS.includes('DENY'));
    assert.ok(DA_DECISIONS.includes('HOLD'));
  });

  it('soft-import CV/CW/CX/CY honesty when path present (compose; fixture otherwise)', async () => {
    const soft = await softImportCvCwCxCyHonesty(
      '/workspace/eos-mission-cy/src/core/composition/mission-os-control-plane-honesty-port.js'
    );
    if (soft) {
      assert.equal(soft.source, 'soft-import');
      assert.equal(soft.HONESTY_PRODUCTION_READY, 'NO');
    }

    const port = new ControlPlaneObservabilityAggregationPort({
      honestyModulePath:
        '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-soft-cv',
        observedPorts: [
          'CV:MEASURED-label',
          'CW:MEASURED-label',
          'CX:MEASURED-label',
          'CY:MEASURED-label',
          'CQ:billing-blocked-observe'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.freezeObserve.pinShort, '2d6ab2d2');
    assert.equal(out.aggregationOk, true);
    assert.ok(out.observedPortCodes.includes('CV'));
    assert.ok(out.observedPortCodes.includes('CW'));
    assert.ok(out.observedPortCodes.includes('CX'));
    assert.ok(out.observedPortCodes.includes('CY'));
  });

  it('port green ≠ L29 auto-close; aggregation PASS ≠ tip rewrite; PRODUCTION_READY remains NO', async () => {
    const port = new ControlPlaneObservabilityAggregationPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-nonclose',
        observedPorts: [
          'CV:MEASURED-label',
          'CW:MEASURED-label',
          'CX:MEASURED-label',
          'CY:MEASURED-label',
          'CQ:label'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(DA_PRODUCTION_READY, 'NO');
    assert.equal(DA_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l29Closeout, false);
    assert.equal(out.receipt.nonClaims.l29AutoClose, false);
    assert.equal(out.receipt.nonClaims.l28Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.meta.freezePin, '2d6ab2d2');

    // Ack of incomplete CV/CW/CX/CY set cannot promote to PASS
    const incomplete = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ack-incomplete',
        observedPorts: ['CQ:observe'],
        ackMissingObserveLabels: true
      })
    );
    assert.equal(incomplete.decision, 'DENY');
    assert.ok(
      incomplete.refuseCodes.includes(
        DA_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
      ) ||
        incomplete.code === DA_CODES.AGGREGATION_REFUSE_DENY ||
        incomplete.code === DA_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );
  });

  it('invalid phase / oversized reasons fail-closed at policy gate', () => {
    const gate = new ControlPlaneObservabilityAggregationPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      phase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, DA_CODES.INVALID_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: DA_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, DA_CODES.OVERSIZED_REASONS_DENY);
  });
});
