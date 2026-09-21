/**
 * @file tests/eos-cy-mission-os-control-plane-honesty-port.test.js
 * SPEC-0108 / Mission CY — Mission OS / Control-Plane L0 Residual Honesty Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: residual PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip
 *   NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 *              ≠ GHE / ≠ L28 auto-close / ≠ CZ start / ≠ L27 reopen
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CY_PRODUCTION_READY,
  CY_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CY_RECEIPT_KIND,
  CY_DECISIONS,
  CY_HONESTY_MODES,
  CY_REQUIRED_OBSERVE_PORTS,
  CY_FREEZE_PIN,
  CY_FREEZE_PIN_SHORT,
  CY_FREEZE_NONCLAIM_LABELS,
  sha256Canonical,
  forceFreezeObserve,
  buildMissionOsControlPlaneHonestyReceipt,
  verifyMissionOsControlPlaneHonestyReceipt,
  canonicalMissionOsControlPlaneHonestySealBody,
  normalizeObservePortLabel,
  _resetReceiptSeqForTests
} from '../src/core/composition/mission-os-control-plane-honesty-receipt.js';

import {
  MissionOsControlPlaneHonestyPolicyGate,
  CY_CODES,
  CY_MAX_REASONS,
  CY_ID_PATTERN,
  CY_POLICY_GATE_PRODUCTION_READY,
  CY_HONESTY_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL27Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsStartCz,
  isFundacionTarget,
  isTamperedDigest,
  normalizeHonestyPhase,
  evaluateRequiredObserveSet
} from '../src/core/composition/mission-os-control-plane-honesty-policy-gate.js';

import {
  MissionOsControlPlaneHonestyPort,
  CY_PORT_PRODUCTION_READY,
  CY_PORT_KIND,
  CY_SAFE_AUTOMATION_IDS,
  CY_REFUSE_CODES,
  decisionForHonesty,
  builtinResidualHonestyDouble,
  softImportCvCwCxHonesty,
  softObserveFreezeNonClaims
} from '../src/core/composition/mission-os-control-plane-honesty-port.js';

const FREEZE_PIN = '487a38bfa6b174141171aa476e5b7b98cf4a0a4e';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionCyHonesty123';
}

function goodDigest(seed = 'eos-cy-mission-os-control-plane-honesty') {
  return sha256Canonical(seed);
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cy-001',
    changeId: 'chg.honesty.cy-001',
    honestyMode: 'ACTIVE',
    phase: 'compose_honesty_port',
    observedPorts: [
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe'
    ],
    reasons: ['hermetic mission-os control-plane residual honesty govern'],
    label: 'happy pass residual honesty',
    ...overrides
  };
}

describe('Mission CY — Mission OS Control-Plane Honesty Receipt (SPEC-0108)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 487a38bf', () => {
    assert.equal(CY_PRODUCTION_READY, 'NO');
    assert.equal(CY_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CY_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CY_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CY_FREEZE_PIN, FREEZE_PIN);
    assert.equal(CY_FREEZE_PIN_SHORT, '487a38bf');
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_L27_REOPEN'));
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_GHE_CLAIM'));
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A10_REFUSE_AUTO_CLOSE_L28'));
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_CZ_START'));
    assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_PRODUCTION_READY_FLIP'));
    assert.deepEqual([...CY_REQUIRED_OBSERVE_PORTS], ['CV', 'CW', 'CX']);
    assert.ok(CY_FREEZE_NONCLAIM_LABELS.some((l) => /487a38bf/.test(l)));
  });

  it('builds canonical nine-field sealed CY-RCPT-* with freeze soft-observe', () => {
    const receipt = buildMissionOsControlPlaneHonestyReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      honestyMode: 'ACTIVE',
      phase: 'compose_honesty_port',
      honestyDigest: goodDigest('demo'),
      observedPorts: ['CV:observe', 'CW:observe', 'CX:observe'],
      residualHonestyOk: true,
      honestyOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CY_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CY-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.honestyMode, 'ACTIVE');
    assert.equal(receipt.residualHonestyOk, true);
    assert.equal(receipt.freezeObserve.readOnly, true);
    assert.equal(receipt.freezeObserve.pinShort, '487a38bf');
    assert.equal(receipt.freezeObserve.pin, FREEZE_PIN);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.l27Reopen, false);
    assert.equal(receipt.nonClaims.tipPinRewrite, false);
    assert.equal(receipt.nonClaims.ghe, false);
    assert.equal(receipt.nonClaims.l28AutoClose, false);
    assert.equal(receipt.nonClaims.startCZ, false);

    const body = canonicalMissionOsControlPlaneHonestySealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyMissionOsControlPlaneHonestyReceipt(receipt);
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
    const receipt = buildMissionOsControlPlaneHonestyReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      honestyMode: 'ACTIVE',
      honestyDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyMissionOsControlPlaneHonestyReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CY — Mission OS Control-Plane Honesty Policy Gate (SPEC-0108)', () => {
  let gate;

  beforeEach(() => {
    gate = new MissionOsControlPlaneHonestyPolicyGate();
  });

  it('validates well-formed plan (planId+changeId+ACTIVE+phase+CV/CW/CX observe)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CY_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l28-cy-001');
    assert.equal(res.changeId, 'chg.honesty.cy-001');
    assert.equal(res.honestyMode, 'ACTIVE');
    assert.equal(res.phase, 'compose_honesty_port');
    assert.equal(res.observeOk, true);
    assert.deepEqual(res.observedPortCodes, ['CV', 'CW', 'CX']);
    assert.ok(CY_ID_PATTERN.test('plan-l28-cy-001'));
    assert.ok(CY_MAX_REASONS >= 1);
    assert.ok(CY_HONESTY_MODES.includes('ACTIVE'));
    assert.ok(CY_HONESTY_MODES.includes('HOLD'));
    assert.ok(CY_HONESTY_PHASES.includes('compose_honesty_port'));
    assert.equal(normalizeHonestyPhase('compose'), 'compose_honesty_port');
    assert.equal(normalizeObservePortLabel('CV:honesty-observe'), 'CV');
    assert.equal(evaluateRequiredObserveSet(['CV', 'CW', 'CX']).ok, true);
  });

  it('rejects empty / missing planId / changeId / honestyMode / phase fail-closed', () => {
    assert.equal(gate.evaluatePlan({}).code, CY_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        honestyDigest: goodDigest('x'),
        honestyMode: 'HOLD',
        phase: 'hold_observe'
      }).code,
      CY_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        honestyDigest: goodDigest('x'),
        honestyMode: 'ACTIVE',
        phase: 'compose_honesty_port',
        observedPorts: ['CV:o', 'CW:o', 'CX:o']
      }).code,
      CY_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        honestyDigest: goodDigest('x'),
        phase: 'compose_honesty_port',
        observedPorts: ['CV:o', 'CW:o', 'CX:o']
      }).code,
      CY_CODES.MISSING_HONESTY_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        honestyMode: 'GREEN',
        honestyDigest: goodDigest('x'),
        phase: 'compose_honesty_port',
        observedPorts: ['CV:o', 'CW:o', 'CX:o']
      }).code,
      CY_CODES.INVALID_HONESTY_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        honestyMode: 'ACTIVE',
        honestyDigest: goodDigest('x'),
        observedPorts: ['CV:o', 'CW:o', 'CX:o']
      }).code,
      CY_CODES.MISSING_PHASE_DENY
    );
  });

  it('DENY missing required CV/CW/CX observe labels without ack; GHE / CZ start claims', () => {
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: ['CQ:observe']
      }).code,
      CY_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );

    const acked = gate.evaluatePlan({
      ...sampleHappyPlan(),
      observedPorts: ['CQ:observe'],
      ackMissingObserveLabels: true
    });
    assert.equal(acked.valid, true);
    assert.equal(acked.observeOk, false);

    assert.equal(claimsGhe({ label: 'GHE enforcement enable' }), true);
    assert.equal(claimsStartCz({ label: 'start mission CZ' }), true);
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhe: true
      }).code,
      CY_CODES.GHE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        startCz: true
      }).code,
      CY_CODES.CZ_START_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        freezeObserve: { pin: '00'.repeat(20), readOnly: false }
      }).code,
      CY_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
  });

  it('detects secrets / Fundacion / weaken ALWAYS_DENY / L27 reopen / tip-pin rewrite', () => {
    assert.equal(scanForSecrets({ note: makeSyntheticSecret() }), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);
    assert.equal(isFundacionTarget('src/core/composition'), false);
    assert.equal(
      claimsWeakenAlwaysDeny({ label: 'FUNDACION_ALWAYS_DENY=false' }),
      true
    );
    assert.equal(claimsL27Reopen({ label: 'reopen L27' }), true);
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
      CY_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      CY_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      CY_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 27'
      }).code,
      CY_CODES.L27_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        tipPinRewrite: true
      }).code,
      CY_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
  });

  it('rejects PRODUCTION_READY flip / auto-seal / auto-close L28 / tampered digests', () => {
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
      CY_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      CY_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoCloseL28: true
      }).code,
      CY_CODES.AUTO_CLOSE_L28_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: undefined,
        honestyDigest: '0'.repeat(64)
      }).code,
      CY_CODES.TAMPERED_DIGEST_DENY
    );
  });
});

describe('Mission CY — Mission OS Control-Plane Honesty Port (SPEC-0108)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + CV/CW/CX observe → PASS + CY-RCPT-*', async () => {
    const port = new MissionOsControlPlaneHonestyPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, CY_CODES.GOVERN_PASS);
    assert.equal(out.honestyMode, 'ACTIVE');
    assert.equal(out.phase, 'compose_honesty_port');
    assert.equal(out.residualHonestyOk, true);
    assert.equal(out.honestyOk, true);
    assert.ok(out.receipt.receiptId.startsWith('CY-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.freezeObserve.pinShort, '487a38bf');
    assert.equal(out.freezeObserve.readOnly, true);
    assert.deepEqual(out.observedPortCodes, ['CV', 'CW', 'CX']);
    assert.ok(
      out.safeAutomationIds.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(out.safeAutomationIds.includes('A11_REFUSE_CZ_START'));
    assert.equal(port.getDecision('plan-l28-cy-001').decision, 'PASS');
  });

  it('HOLD honestyMode → HOLD (observe; freeze soft-observe only — ≠ tip rewrite)', async () => {
    const port = new MissionOsControlPlaneHonestyPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        honestyMode: 'HOLD',
        observedPorts: undefined,
        honestyDigest: goodDigest('hold-1'),
        phase: 'hold_observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, CY_CODES.GOVERN_HOLD);
    assert.equal(out.freezeObserve.pinShort, '487a38bf');
    assert.equal(
      decisionForHonesty('HOLD', { observeOk: false, honestyOk: false }),
      'HOLD'
    );
  });

  it('evaluate() aliases govern()', async () => {
    const port = new MissionOsControlPlaneHonestyPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('DENY missing CV/CW/CX / Fundacion / secrets / PR flip / L27 / tip-pin / GHE / CZ / L28 auto-close', async () => {
    const port = new MissionOsControlPlaneHonestyPort({
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
    assert.equal(missing.code, CY_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY);

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, CY_CODES.FUNDACION_ALWAYS_DENY);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, CY_CODES.SECRET_DETECTED_DENY);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, CY_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L27'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, CY_CODES.L27_REOPEN_CLAIM_DENY);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipPinRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, CY_CODES.TIP_PIN_REWRITE_CLAIM_DENY);
    assert.equal(tip.tipPinRewriteRefused, true);

    const ghe = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ghe',
        claimGhe: true
      })
    );
    assert.equal(ghe.decision, 'DENY');
    assert.equal(ghe.code, CY_CODES.GHE_CLAIM_DENY);
    assert.equal(ghe.gheClaimRefused, true);

    const cz = await port.govern(
      sampleHappyPlan({
        planId: 'plan-cz',
        startCz: true
      })
    );
    assert.equal(cz.decision, 'DENY');
    assert.equal(cz.code, CY_CODES.CZ_START_CLAIM_DENY);
    assert.equal(cz.startCzRefused, true);

    const l28 = await port.govern(
      sampleHappyPlan({
        planId: 'plan-l28',
        autoCloseL28: true
      })
    );
    assert.equal(l28.decision, 'DENY');
    assert.equal(l28.code, CY_CODES.AUTO_CLOSE_L28_CLAIM_DENY);
    assert.equal(l28.autoCloseL28Refused, true);
  });

  it('verifyTrail validates CY receipt chain; tamper breaks trail', async () => {
    const port = new MissionOsControlPlaneHonestyPort({
      preferBuiltinDouble: true
    });
    await port.govern(
      sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' })
    );
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        honestyMode: 'HOLD',
        observedPorts: undefined,
        honestyDigest: goodDigest('t2'),
        phase: 'hold_observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, CY_CODES.TRAIL_OK);
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
    assert.equal(bad.code, CY_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIMs: residual PASS ≠ tip-pin rewrite / ≠ PR flip / ≠ L28 auto-close / ≠ CZ', async () => {
    const port = new MissionOsControlPlaneHonestyPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.nonClaims.ghe, false);
    assert.equal(out.receipt.nonClaims.l28AutoClose, false);
    assert.equal(out.receipt.nonClaims.startCZ, false);
    assert.equal(out.freezeObserve.pinShort, '487a38bf');
    assert.ok(
      out.reasons.some((r) => /≠ tip-pin|NON-CLAIM|487a38bf|soft-observe/i.test(r))
    );

    const dbl = builtinResidualHonestyDouble({
      observedPorts: ['CV:o', 'CW:o', 'CX:o']
    });
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.freeze_observe.pinShort, '487a38bf');
    assert.ok(Array.isArray(dbl.non_claim_chips));

    const softFreeze = softObserveFreezeNonClaims();
    assert.equal(softFreeze.readOnly, true);
    assert.equal(softFreeze.pinShort, '487a38bf');

    assert.equal(CY_PORT_KIND, 'eos-mission-os-control-plane-honesty-port');
    assert.ok(CY_DECISIONS.includes('PASS'));
    assert.ok(CY_DECISIONS.includes('DENY'));
    assert.ok(CY_DECISIONS.includes('HOLD'));
  });

  it('soft-import CV/CW/CX honesty when path present (compose; fixture otherwise)', async () => {
    const soft = await softImportCvCwCxHonesty(
      '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    );
    if (soft) {
      assert.equal(soft.source, 'soft-import');
      assert.equal(soft.HONESTY_PRODUCTION_READY, 'NO');
    }

    const port = new MissionOsControlPlaneHonestyPort({
      honestyModulePath:
        '/workspace/eos-mission-cx/src/core/composition/billing-blocked-local-verify-ritual-port.js'
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-soft-cx',
        observedPorts: [
          'CV:MEASURED-label',
          'CW:MEASURED-label',
          'CX:MEASURED-label',
          'CQ:billing-blocked-observe'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.freezeObserve.pinShort, '487a38bf');
    assert.equal(out.residualHonestyOk, true);
    assert.ok(out.observedPortCodes.includes('CV'));
    assert.ok(out.observedPortCodes.includes('CW'));
    assert.ok(out.observedPortCodes.includes('CX'));
  });

  it('port green ≠ L28 auto-close; residual PASS ≠ tip rewrite; PRODUCTION_READY remains NO', async () => {
    const port = new MissionOsControlPlaneHonestyPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-nonclose',
        observedPorts: [
          'CV:MEASURED-label',
          'CW:MEASURED-label',
          'CX:MEASURED-label',
          'CQ:label'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(CY_PRODUCTION_READY, 'NO');
    assert.equal(CY_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l28Closeout, false);
    assert.equal(out.receipt.nonClaims.l28AutoClose, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCZ, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.meta.freezePin, '487a38bf');

    // Ack of incomplete CV/CW/CX set cannot promote to PASS
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
        CY_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
      ) ||
        incomplete.code === CY_CODES.RESIDUAL_HONESTY_REFUSE_DENY ||
        incomplete.code === CY_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );
  });

  it('invalid phase / oversized reasons fail-closed at policy gate', () => {
    const gate = new MissionOsControlPlaneHonestyPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      phase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, CY_CODES.INVALID_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: CY_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, CY_CODES.OVERSIZED_REASONS_DENY);
  });
});
