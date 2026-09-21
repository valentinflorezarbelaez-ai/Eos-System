/**
 * @file tests/eos-dd-local-ci-ritual-hardening-port.test.js
 * SPEC-0113 / Mission DD — Local CI Ritual Hardening Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: ritual PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip
 *   NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 *              ≠ GHE / ≠ GHA green / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 4d8c6c59 (DC MEASURED #407) only
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DD_PRODUCTION_READY,
  DD_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DD_RECEIPT_KIND,
  DD_DECISIONS,
  DD_RITUAL_MODES,
  DD_REQUIRED_OBSERVE_PORTS,
  DD_SOFT_OBSERVE_L28_PORTS,
  DD_FREEZE_PIN,
  DD_FREEZE_PIN_SHORT,
  DD_FREEZE_NONCLAIM_LABELS,
  sha256Canonical,
  forceFreezeObserve,
  buildLocalCiRitualHardeningReceipt,
  verifyLocalCiRitualHardeningReceipt,
  canonicalLocalCiRitualHardeningSealBody,
  normalizeObservePortLabel,
  _resetReceiptSeqForTests
} from '../src/core/composition/local-ci-ritual-hardening-receipt.js';

import {
  LocalCiRitualHardeningPolicyGate,
  DD_CODES,
  DD_MAX_REASONS,
  DD_ID_PATTERN,
  DD_POLICY_GATE_PRODUCTION_READY,
  DD_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL28Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsGhaGreen,
  claimsExternalApm,
  isFundacionTarget,
  isTamperedDigest,
  normalizeRitualPhase,
  evaluateRequiredObserveSet
} from '../src/core/composition/local-ci-ritual-hardening-policy-gate.js';

import {
  LocalCiRitualHardeningPort,
  DD_PORT_PRODUCTION_READY,
  DD_PORT_KIND,
  DD_SAFE_AUTOMATION_IDS,
  DD_REFUSE_CODES,
  decisionForRitual,
  builtinLocalCiRitualHardeningDouble,
  softImportDaObservability,
  softImportDbDoctorRitual,
  softObserveFreezeNonClaims,
  softObserveL28Honesty
} from '../src/core/composition/local-ci-ritual-hardening-port.js';

const FREEZE_PIN = '4d8c6c59';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionDdLocalCiRitualHardening123';
}

function goodDigest(seed = 'eos-dd-local-ci-ritual-hardening') {
  return sha256Canonical(seed);
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l29-dd-001',
    changeId: 'chg.ritual.dd-001',
    ritualMode: 'ACTIVE',
    phase: 'compose_local_ci_ritual_hardening_port',
    observedPorts: [
      'DA:observability-aggregation-observe',
      'DB:doctor-ritual-automation-observe',
      'DC:evidence-economy-custody-ledger-observe',
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe',
      'CY:control-plane-honesty-observe'
    ],
    reasons: ['hermetic local CI ritual hardening govern'],
    label: 'happy pass local CI ritual hardening',
    ...overrides
  };
}

describe('Mission DD — Local CI Ritual Hardening Receipt (SPEC-0113)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 4d8c6c59', () => {
    assert.equal(DD_PRODUCTION_READY, 'NO');
    assert.equal(DD_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DD_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DD_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DD_FREEZE_PIN, FREEZE_PIN);
    assert.equal(DD_FREEZE_PIN_SHORT, '4d8c6c59');
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_L28_REOPEN'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_GHE_CLAIM'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A10_REFUSE_AUTO_CLOSE_L29'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_EXTERNAL_APM'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_PRODUCTION_READY_FLIP'));
    assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
    assert.deepEqual([...DD_REQUIRED_OBSERVE_PORTS], ['DA', 'DB', 'DC']);
    assert.deepEqual([...DD_SOFT_OBSERVE_L28_PORTS], ['CV', 'CW', 'CX', 'CY']);
    assert.ok(DD_FREEZE_NONCLAIM_LABELS.some((l) => /4d8c6c59/.test(l)));
  });

  it('builds canonical nine-field sealed DD-RCPT-* with freeze soft-observe', () => {
    const receipt = buildLocalCiRitualHardeningReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      phase: 'compose_local_ci_ritual_hardening_port',
      ritualDigest: goodDigest('demo'),
      observedPorts: ['DA:observe', 'DB:observe', 'CV:observe', 'CW:observe', 'CX:observe', 'CY:observe'],
      ritualOk: true,
      honestyOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, DD_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('DD-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.ritualMode, 'ACTIVE');
    assert.equal(receipt.ritualOk, true);
    assert.equal(receipt.freezeObserve.readOnly, true);
    assert.equal(receipt.freezeObserve.pinShort, '4d8c6c59');
    assert.equal(receipt.freezeObserve.pin, FREEZE_PIN);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.l28Reopen, false);
    assert.equal(receipt.nonClaims.tipPinRewrite, false);
    assert.equal(receipt.nonClaims.ghe, false);
    assert.equal(receipt.nonClaims.l29AutoClose, false);
    assert.equal(receipt.nonClaims.externalApm, false);

    const body = canonicalLocalCiRitualHardeningSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyLocalCiRitualHardeningReceipt(receipt);
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
    const receipt = buildLocalCiRitualHardeningReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      ritualDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyLocalCiRitualHardeningReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission DD — Local CI Ritual Hardening Policy Gate (SPEC-0113)', () => {
  let gate;

  beforeEach(() => {
    gate = new LocalCiRitualHardeningPolicyGate();
  });

  it('validates well-formed plan (planId+changeId+ACTIVE+phase+DA+DB+DC observe)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, DD_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l29-dd-001');
    assert.equal(res.changeId, 'chg.ritual.dd-001');
    assert.equal(res.ritualMode, 'ACTIVE');
    assert.equal(res.phase, 'compose_local_ci_ritual_hardening_port');
    assert.equal(res.observeOk, true);
    assert.ok(res.observedPortCodes.includes('DA'));
    assert.ok(res.observedPortCodes.includes('DB'));
    assert.ok(DD_ID_PATTERN.test('plan-l29-dd-001'));
    assert.ok(DD_MAX_REASONS >= 1);
    assert.ok(DD_RITUAL_MODES.includes('ACTIVE'));
    assert.ok(DD_RITUAL_MODES.includes('HOLD'));
    assert.ok(DD_RITUAL_PHASES.includes('compose_local_ci_ritual_hardening_port'));
    assert.equal(normalizeRitualPhase('compose'), 'compose_local_ci_ritual_hardening_port');
    assert.equal(normalizeObservePortLabel('DA:observability-aggregation-observe'), 'DA');
    assert.equal(evaluateRequiredObserveSet(['DA', 'DB', 'DC']).ok, true);
    assert.equal(evaluateRequiredObserveSet(['DA']).ok, false);
  });

  it('rejects empty / missing planId / changeId / ritualMode / phase fail-closed', () => {
    assert.equal(gate.evaluatePlan({}).code, DD_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        ritualDigest: goodDigest('x'),
        ritualMode: 'HOLD',
        phase: 'hold_observe'
      }).code,
      DD_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        ritualDigest: goodDigest('x'),
        ritualMode: 'ACTIVE',
        phase: 'compose_local_ci_ritual_hardening_port',
        observedPorts: ['DA:o']
      }).code,
      DD_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualDigest: goodDigest('x'),
        phase: 'compose_local_ci_ritual_hardening_port',
        observedPorts: ['DA:o']
      }).code,
      DD_CODES.MISSING_RITUAL_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualMode: 'GREEN',
        ritualDigest: goodDigest('x'),
        phase: 'compose_local_ci_ritual_hardening_port',
        observedPorts: ['DA:o']
      }).code,
      DD_CODES.INVALID_RITUAL_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualMode: 'ACTIVE',
        ritualDigest: goodDigest('x'),
        observedPorts: ['DA:o']
      }).code,
      DD_CODES.MISSING_PHASE_DENY
    );
  });

  it('DENY missing required DA+DB+DC+DC observe labels without ack; GHE / external APM / tip-pin claims', () => {
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: ['CQ:observe']
      }).code,
      DD_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
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
      DD_CODES.GHE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhaGreen: true
      }).code,
      DD_CODES.GHA_GREEN_CLAIM_DENY
    );
    assert.equal(claimsGhaGreen({ label: 'claim GHA green from local' }), true);
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        externalApm: true
      }).code,
      DD_CODES.EXTERNAL_APM_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        freezeObserve: { pin: '00'.repeat(20), readOnly: false }
      }).code,
      DD_CODES.TIP_PIN_REWRITE_CLAIM_DENY
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
      DD_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      DD_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      DD_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 28'
      }).code,
      DD_CODES.L28_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        tipPinRewrite: true
      }).code,
      DD_CODES.TIP_PIN_REWRITE_CLAIM_DENY
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
      DD_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      DD_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoCloseL29: true
      }).code,
      DD_CODES.AUTO_CLOSE_L29_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: undefined,
        ritualDigest: '0'.repeat(64)
      }).code,
      DD_CODES.TAMPERED_DIGEST_DENY
    );
  });
});

describe('Mission DD — Local CI Ritual Hardening Port (SPEC-0113)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + DA+DB+DC observe → PASS + DD-RCPT-*', async () => {
    const port = new LocalCiRitualHardeningPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, DD_CODES.GOVERN_PASS);
    assert.equal(out.ritualMode, 'ACTIVE');
    assert.equal(out.phase, 'compose_local_ci_ritual_hardening_port');
    assert.equal(out.ritualOk, true);
    assert.equal(out.honestyOk, true);
    assert.ok(out.receipt.receiptId.startsWith('DD-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.freezeObserve.pinShort, '4d8c6c59');
    assert.equal(out.freezeObserve.readOnly, true);
    assert.ok(out.observedPortCodes.includes('DA'));
    assert.ok(out.observedPortCodes.includes('DB'));
    assert.ok(
      out.safeAutomationIds.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(out.safeAutomationIds.includes('A10_REFUSE_AUTO_CLOSE_L29'));
    assert.equal(port.getDecision('plan-l29-dd-001').decision, 'PASS');
  });

  it('HOLD ritualMode → HOLD (observe; freeze soft-observe only — ≠ tip rewrite)', async () => {
    const port = new LocalCiRitualHardeningPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        ritualMode: 'HOLD',
        observedPorts: undefined,
        ritualDigest: goodDigest('hold-1'),
        phase: 'hold_observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, DD_CODES.GOVERN_HOLD);
    assert.equal(out.freezeObserve.pinShort, '4d8c6c59');
    assert.equal(
      decisionForRitual('HOLD', { observeOk: false, honestyOk: false }),
      'HOLD'
    );
  });

  it('evaluate() aliases govern()', async () => {
    const port = new LocalCiRitualHardeningPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('DENY missing DA+DB+DC / Fundacion / secrets / PR flip / L28 / tip-pin / GHE / L29 auto-close', async () => {
    const port = new LocalCiRitualHardeningPort({
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
    assert.equal(missing.code, DD_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY);

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, DD_CODES.FUNDACION_ALWAYS_DENY);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, DD_CODES.SECRET_DETECTED_DENY);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, DD_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L28'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, DD_CODES.L28_REOPEN_CLAIM_DENY);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipPinRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, DD_CODES.TIP_PIN_REWRITE_CLAIM_DENY);
    assert.equal(tip.tipPinRewriteRefused, true);

    const ghe = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ghe',
        claimGhe: true
      })
    );
    assert.equal(ghe.decision, 'DENY');
    assert.equal(ghe.code, DD_CODES.GHE_CLAIM_DENY);
    assert.equal(ghe.gheClaimRefused, true);

    const l29 = await port.govern(
      sampleHappyPlan({
        planId: 'plan-l29',
        autoCloseL29: true
      })
    );
    assert.equal(l29.decision, 'DENY');
    assert.equal(l29.code, DD_CODES.AUTO_CLOSE_L29_CLAIM_DENY);
    assert.equal(l29.autoCloseL29Refused, true);
  });

  it('verifyTrail validates DC receipt chain; tamper breaks trail', async () => {
    const port = new LocalCiRitualHardeningPort({
      preferBuiltinDouble: true
    });
    await port.govern(
      sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' })
    );
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        ritualMode: 'HOLD',
        observedPorts: undefined,
        ritualDigest: goodDigest('t2'),
        phase: 'hold_observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, DD_CODES.TRAIL_OK);
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
    assert.equal(bad.code, DD_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIMs: ritual PASS ≠ tip-pin rewrite / ≠ PR flip / ≠ L29 auto-close / ≠ L28 reopen', async () => {
    const port = new LocalCiRitualHardeningPort({
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
    assert.equal(out.freezeObserve.pinShort, '4d8c6c59');
    assert.ok(
      out.reasons.some((r) => /≠ tip-pin|NON-CLAIM|4d8c6c59|soft-observe/i.test(r))
    );

    const dbl = builtinLocalCiRitualHardeningDouble({
      observedPorts: ['DA:o', 'DB:o', 'CV:o', 'CW:o', 'CX:o', 'CY:o']
    });
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.freeze_observe.pinShort, '4d8c6c59');
    assert.ok(Array.isArray(dbl.non_claim_chips));

    const softFreeze = softObserveFreezeNonClaims();
    assert.equal(softFreeze.readOnly, true);
    assert.equal(softFreeze.pinShort, '4d8c6c59');

    const softL28 = softObserveL28Honesty(['DA:o', 'CV:o', 'CW:o']);
    assert.equal(softL28.softObserve, true);
    assert.ok(softL28.present.includes('CV'));
    assert.ok(softL28.present.includes('CW'));

    assert.equal(DD_PORT_KIND, 'eos-local-ci-ritual-hardening-port');
    assert.ok(DD_DECISIONS.includes('PASS'));
    assert.ok(DD_DECISIONS.includes('DENY'));
    assert.ok(DD_DECISIONS.includes('HOLD'));
  });

  it('soft-import DA+DB+DC observe when path present (compose; fixture otherwise)', async () => {
    const softDa = await softImportDaObservability(
      '/workspace/eos-mission-da/src/core/composition/control-plane-observability-aggregation-port.js'
    );
    if (softDa) {
      assert.equal(softDa.source, 'soft-import-da');
      assert.equal(softDa.HONESTY_PRODUCTION_READY, 'NO');
    }
    const softDb = await softImportDbDoctorRitual(
      '/workspace/eos-mission-db/src/core/composition/doctor-ritual-automation-port.js'
    );
    if (softDb) {
      assert.equal(softDb.source, 'soft-import-db');
      assert.equal(softDb.HONESTY_PRODUCTION_READY, 'NO');
    }

    const port = new LocalCiRitualHardeningPort({
      daModulePath:
        '/workspace/eos-mission-da/src/core/composition/control-plane-observability-aggregation-port.js',
      dbModulePath:
        '/workspace/eos-mission-db/src/core/composition/doctor-ritual-automation-port.js'
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-soft-da-db',
        observedPorts: [
          'DA:MEASURED-label',
          'DB:MEASURED-label',
          'DC:MEASURED-label',
          'CV:MEASURED-label',
          'CW:MEASURED-label',
          'CX:MEASURED-label',
          'CY:MEASURED-label'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.freezeObserve.pinShort, '4d8c6c59');
    assert.equal(out.ritualOk, true);
    assert.ok(out.observedPortCodes.includes('DA'));
    assert.ok(out.observedPortCodes.includes('DB'));
  });

  it('port green ≠ L29 auto-close; ritual PASS ≠ tip rewrite; PRODUCTION_READY remains NO', async () => {
    const port = new LocalCiRitualHardeningPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-nonclose',
        observedPorts: [
          'DA:MEASURED-label',
          'DB:MEASURED-label',
          'DC:MEASURED-label',
          'CV:MEASURED-label',
          'CW:MEASURED-label',
          'CX:MEASURED-label',
          'CY:MEASURED-label'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(DD_PRODUCTION_READY, 'NO');
    assert.equal(DD_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l29Closeout, false);
    assert.equal(out.receipt.nonClaims.l29AutoClose, false);
    assert.equal(out.receipt.nonClaims.l28Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.meta.freezePin, '4d8c6c59');

    // Ack of incomplete DA set cannot promote to PASS
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
        DD_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
      ) ||
        incomplete.code === DD_CODES.RITUAL_REFUSE_DENY ||
        incomplete.code === DD_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );
  });

  it('invalid phase / oversized reasons fail-closed at policy gate', () => {
    const gate = new LocalCiRitualHardeningPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      phase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, DD_CODES.INVALID_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: DD_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, DD_CODES.OVERSIZED_REASONS_DENY);
  });
});
