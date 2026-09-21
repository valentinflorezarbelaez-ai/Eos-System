/**
 * @file tests/eos-cx-billing-blocked-local-verify-ritual-port.test.js
 * SPEC-0107 / Mission CX — Billing-Blocked Local Verify Ritual Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-compose CQ BILLING_BLOCKED observe
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: local verify PASS ≠ GHA green ≠ GHE enforcement
 *   NON-CLAIM: ≠ GHA green / ≠ GHE / ≠ L27 reopen / ≠ PRODUCTION_READY /
 *              ≠ L28 closeout / ≠ tip rewrite / ≠ tip-refresh / ≠ CY /
 *              ≠ CQ rewrite
 *   Do NOT rewrite CQ product / Fundacion / freeze tip
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CX_PRODUCTION_READY,
  CX_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CX_RECEIPT_KIND,
  CX_DECISIONS,
  CX_RITUAL_MODES,
  CX_REQUIRED_OBSERVE_PORTS,
  CX_FREEZE_PIN,
  CX_FREEZE_PIN_SHORT,
  sha256Canonical,
  forceCiEnvironment,
  buildBillingBlockedLocalVerifyRitualReceipt,
  verifyBillingBlockedLocalVerifyRitualReceipt,
  canonicalBillingBlockedLocalVerifyRitualSealBody,
  normalizeObservePortLabel,
  _resetReceiptSeqForTests
} from '../src/core/composition/billing-blocked-local-verify-ritual-receipt.js';

import {
  BillingBlockedLocalVerifyRitualPolicyGate,
  CX_CODES,
  CX_MAX_REASONS,
  CX_ID_PATTERN,
  CX_POLICY_GATE_PRODUCTION_READY,
  CX_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL27Reopen,
  claimsTipRewrite,
  claimsWeakenAlwaysDeny,
  claimsCqRewrite,
  claimsGhe,
  claimsGhaGreen,
  isFundacionTarget,
  isTamperedDigest,
  normalizeRitualPhase,
  evaluateRequiredObserveSet
} from '../src/core/composition/billing-blocked-local-verify-ritual-policy-gate.js';

import {
  BillingBlockedLocalVerifyRitualPort,
  CX_PORT_PRODUCTION_READY,
  CX_PORT_KIND,
  CX_SAFE_AUTOMATION_IDS,
  CX_REFUSE_CODES,
  decisionForRitual,
  builtinLocalVerifyHonestyDouble,
  softImportCvCwHonesty
} from '../src/core/composition/billing-blocked-local-verify-ritual-port.js';

const FREEZE_PIN = '97d23ebcabbdaad50406c3ad834ee303710435a1';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionCxLocalVerify123';
}

function goodDigest(seed = 'eos-cx-billing-blocked-local-verify') {
  return sha256Canonical(seed);
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cx-001',
    changeId: 'chg.verify.cx-001',
    ritualMode: 'ACTIVE',
    phase: 'compose_verify_ritual',
    observedPorts: ['CQ:billing-blocked-observe'],
    reasons: ['hermetic billing-blocked local verify ritual govern'],
    label: 'happy pass local verify ritual',
    ...overrides
  };
}

describe('Mission CX — Billing-Blocked Local Verify Ritual Receipt (SPEC-0107)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin', () => {
    assert.equal(CX_PRODUCTION_READY, 'NO');
    assert.equal(CX_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CX_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CX_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CX_FREEZE_PIN, FREEZE_PIN);
    assert.equal(CX_FREEZE_PIN_SHORT, '97d23ebc');
    assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY'));
    assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_TIP_REWRITE'));
    assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_L27_REOPEN'));
    assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A10_REFUSE_GHA_GREEN_CLAIM'));
    assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_GHE_CLAIM'));
    assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_CQ_REWRITE'));
    assert.deepEqual([...CX_REQUIRED_OBSERVE_PORTS], ['CQ']);
  });

  it('builds canonical nine-field sealed CX-RCPT-* with BILLING_BLOCKED ciEnvironment', () => {
    const receipt = buildBillingBlockedLocalVerifyRitualReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      phase: 'compose_verify_ritual',
      ritualDigest: goodDigest('demo'),
      observedPorts: ['CQ:observe'],
      localVerifyOk: true,
      honestyOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CX_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CX-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.ritualMode, 'ACTIVE');
    assert.equal(receipt.localVerifyOk, true);
    assert.equal(receipt.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(receipt.ciEnvironment.local_surrogate, 'ACTIVE');
    assert.equal(receipt.ciEnvironment.github_actions_verdict, 'NOT_RUN');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.l27Reopen, false);
    assert.equal(receipt.nonClaims.tipRewrite, false);
    assert.equal(receipt.nonClaims.ghe, false);
    assert.equal(receipt.nonClaims.ghaGreen, false);
    assert.equal(receipt.nonClaims.cqRewrite, false);
    assert.equal(receipt.nonClaims.l28Closeout, false);
    assert.equal(receipt.nonClaims.startCY, false);

    const body = canonicalBillingBlockedLocalVerifyRitualSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyBillingBlockedLocalVerifyRitualReceipt(receipt);
    assert.equal(verifyRes.ok, true);

    const forced = forceCiEnvironment({ github_actions: 'GREEN' });
    assert.equal(forced.github_actions, 'BILLING_BLOCKED');
    assert.ok(forced.refusal);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildBillingBlockedLocalVerifyRitualReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      ritualDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyBillingBlockedLocalVerifyRitualReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CX — Billing-Blocked Local Verify Ritual Policy Gate (SPEC-0107)', () => {
  let gate;

  beforeEach(() => {
    gate = new BillingBlockedLocalVerifyRitualPolicyGate();
  });

  it('validates well-formed plan (planId+changeId+ACTIVE+phase+CQ observe)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CX_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l28-cx-001');
    assert.equal(res.changeId, 'chg.verify.cx-001');
    assert.equal(res.ritualMode, 'ACTIVE');
    assert.equal(res.phase, 'compose_verify_ritual');
    assert.equal(res.observeOk, true);
    assert.deepEqual(res.observedPortCodes, ['CQ']);
    assert.ok(CX_ID_PATTERN.test('plan-l28-cx-001'));
    assert.ok(CX_MAX_REASONS >= 1);
    assert.ok(CX_RITUAL_MODES.includes('ACTIVE'));
    assert.ok(CX_RITUAL_MODES.includes('HOLD'));
    assert.ok(CX_RITUAL_PHASES.includes('compose_verify_ritual'));
    assert.equal(normalizeRitualPhase('compose'), 'compose_verify_ritual');
    assert.equal(normalizeObservePortLabel('CQ:billing-blocked-observe'), 'CQ');
    assert.equal(evaluateRequiredObserveSet(['CQ']).ok, true);
  });

  it('rejects empty / missing planId / changeId / ritualMode / phase fail-closed', () => {
    assert.equal(gate.evaluatePlan({}).code, CX_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        ritualDigest: goodDigest('x'),
        ritualMode: 'HOLD',
        phase: 'hold_observe'
      }).code,
      CX_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        ritualDigest: goodDigest('x'),
        ritualMode: 'ACTIVE',
        phase: 'compose_verify_ritual',
        observedPorts: ['CQ:observe']
      }).code,
      CX_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualDigest: goodDigest('x'),
        phase: 'compose_verify_ritual',
        observedPorts: ['CQ:observe']
      }).code,
      CX_CODES.MISSING_RITUAL_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualMode: 'GREEN',
        ritualDigest: goodDigest('x'),
        phase: 'compose_verify_ritual',
        observedPorts: ['CQ:observe']
      }).code,
      CX_CODES.INVALID_RITUAL_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualMode: 'ACTIVE',
        ritualDigest: goodDigest('x'),
        observedPorts: ['CQ:observe']
      }).code,
      CX_CODES.MISSING_PHASE_DENY
    );
  });

  it('DENY missing required CQ observe labels without ack; GHA green / GHE claims', () => {
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: ['CR:observe']
      }).code,
      CX_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );

    const acked = gate.evaluatePlan({
      ...sampleHappyPlan(),
      observedPorts: ['CR:observe'],
      ackMissingObserveLabels: true
    });
    assert.equal(acked.valid, true);
    assert.equal(acked.observeOk, false);

    assert.equal(claimsGhaGreen({ label: 'claim github actions green' }), true);
    assert.equal(claimsGhe({ label: 'GHE enforcement enable' }), true);
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhaGreen: true
      }).code,
      CX_CODES.GHA_GREEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        gheEnforcement: true
      }).code,
      CX_CODES.GHE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        ciEnvironment: { github_actions: 'GREEN' }
      }).code,
      CX_CODES.GHA_GREEN_CLAIM_DENY
    );
  });

  it('detects secrets / Fundacion / weaken ALWAYS_DENY / L27 reopen / tip rewrite / CQ rewrite', () => {
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
    assert.equal(claimsCqRewrite({ label: 'rewrite CQ continuity' }), true);

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: makeSyntheticSecret()
      }).code,
      CX_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      CX_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      CX_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 27'
      }).code,
      CX_CODES.L27_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'rewrite freeze main_tip'
      }).code,
      CX_CODES.TIP_REWRITE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        cqRewrite: true
      }).code,
      CX_CODES.CQ_REWRITE_CLAIM_DENY
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
      CX_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      CX_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedPorts: undefined,
        ritualDigest: '0'.repeat(64)
      }).code,
      CX_CODES.TAMPERED_DIGEST_DENY
    );
  });
});

describe('Mission CX — Billing-Blocked Local Verify Ritual Port (SPEC-0107)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + CQ BILLING_BLOCKED observe → PASS + CX-RCPT-*', async () => {
    const port = new BillingBlockedLocalVerifyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, CX_CODES.GOVERN_PASS);
    assert.equal(out.ritualMode, 'ACTIVE');
    assert.equal(out.phase, 'compose_verify_ritual');
    assert.equal(out.localVerifyOk, true);
    assert.equal(out.honestyOk, true);
    assert.ok(out.receipt.receiptId.startsWith('CX-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(out.ciEnvironment.github_actions_verdict, 'NOT_RUN');
    assert.deepEqual(out.observedPortCodes, ['CQ']);
    assert.ok(
      out.safeAutomationIds.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A10_REFUSE_GHA_GREEN_CLAIM'));
    assert.ok(out.safeAutomationIds.includes('A11_REFUSE_GHE_CLAIM'));
    assert.equal(port.getDecision('plan-l28-cx-001').decision, 'PASS');
  });

  it('HOLD ritualMode → HOLD (observe; still BILLING_BLOCKED — ≠ GHA green)', async () => {
    const port = new BillingBlockedLocalVerifyRitualPort({
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
    assert.equal(out.code, CX_CODES.GOVERN_HOLD);
    assert.equal(out.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(
      decisionForRitual('HOLD', { observeOk: false, honestyOk: false }),
      'HOLD'
    );
  });

  it('evaluate() aliases govern()', async () => {
    const port = new BillingBlockedLocalVerifyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('DENY missing CQ / Fundacion / secrets / PR flip / L27 / tip / GHA / GHE / CQ rewrite', async () => {
    const port = new BillingBlockedLocalVerifyRitualPort({
      preferBuiltinDouble: true
    });

    const missing = await port.govern(
      sampleHappyPlan({
        planId: 'plan-missing',
        observedPorts: ['CR:observe']
      })
    );
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, CX_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY);

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, CX_CODES.FUNDACION_ALWAYS_DENY);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, CX_CODES.SECRET_DETECTED_DENY);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, CX_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L27'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, CX_CODES.L27_REOPEN_CLAIM_DENY);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, CX_CODES.TIP_REWRITE_CLAIM_DENY);

    const gha = await port.govern(
      sampleHappyPlan({
        planId: 'plan-gha',
        claimGhaGreen: true
      })
    );
    assert.equal(gha.decision, 'DENY');
    assert.equal(gha.code, CX_CODES.GHA_GREEN_CLAIM_DENY);
    assert.equal(gha.ghaGreenClaimRefused, true);

    const ghe = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ghe',
        claimGhe: true
      })
    );
    assert.equal(ghe.decision, 'DENY');
    assert.equal(ghe.code, CX_CODES.GHE_CLAIM_DENY);
    assert.equal(ghe.gheClaimRefused, true);

    const cq = await port.govern(
      sampleHappyPlan({
        planId: 'plan-cq',
        rewriteCq: true
      })
    );
    assert.equal(cq.decision, 'DENY');
    assert.equal(cq.code, CX_CODES.CQ_REWRITE_CLAIM_DENY);
  });

  it('verifyTrail validates CX receipt chain; tamper breaks trail', async () => {
    const port = new BillingBlockedLocalVerifyRitualPort({
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
    assert.equal(ok.code, CX_CODES.TRAIL_OK);
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
    assert.equal(bad.code, CX_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIMs: local PASS ≠ GHA green / ≠ GHE / ≠ PR flip / ≠ L28 closeout / ≠ CY', async () => {
    const port = new BillingBlockedLocalVerifyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRewrite, false);
    assert.equal(out.receipt.nonClaims.ghe, false);
    assert.equal(out.receipt.nonClaims.ghaGreen, false);
    assert.equal(out.receipt.nonClaims.cqRewrite, false);
    assert.equal(out.receipt.nonClaims.l28Closeout, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCY, false);
    assert.equal(out.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.ok(out.reasons.some((r) => /≠ GHA|NON-CLAIM|BILLING_BLOCKED/i.test(r)));

    const dbl = builtinLocalVerifyHonestyDouble({
      observedPorts: ['CQ:observe']
    });
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.ci_environment.github_actions, 'BILLING_BLOCKED');
    assert.ok(Array.isArray(dbl.non_claim_chips));

    assert.equal(CX_PORT_KIND, 'eos-billing-blocked-local-verify-ritual-port');
    assert.ok(CX_DECISIONS.includes('PASS'));
    assert.ok(CX_DECISIONS.includes('DENY'));
    assert.ok(CX_DECISIONS.includes('HOLD'));
  });

  it('soft-import CV/CW honesty when path present (compose; fixture otherwise)', async () => {
    const soft = await softImportCvCwHonesty(
      '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    );
    if (soft) {
      assert.equal(soft.source, 'soft-import');
      assert.equal(soft.HONESTY_PRODUCTION_READY, 'NO');
    }

    const port = new BillingBlockedLocalVerifyRitualPort({
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
          'CV:honesty-observe',
          'CW:continuity-observe'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(out.localVerifyOk, true);
    assert.ok(out.observedPortCodes.includes('CQ'));
    assert.ok(out.observedPortCodes.includes('CV'));
    assert.ok(out.observedPortCodes.includes('CW'));
  });

  it('port green ≠ L28 closeout; local PASS ≠ GHA green; PRODUCTION_READY remains NO', async () => {
    const port = new BillingBlockedLocalVerifyRitualPort({
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
          'CV:honesty-observe'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(CX_PRODUCTION_READY, 'NO');
    assert.equal(CX_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l28Closeout, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCY, false);
    assert.equal(out.receipt.nonClaims.ghe, false);
    assert.equal(out.receipt.nonClaims.ghaGreen, false);
    assert.equal(out.ciEnvironment.github_actions, 'BILLING_BLOCKED');
    assert.equal(out.receipt.meta.freezePin, '97d23ebc');

    // Ack of incomplete CQ set cannot promote to PASS
    const incomplete = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ack-incomplete',
        observedPorts: ['CR:observe'],
        ackMissingObserveLabels: true
      })
    );
    assert.equal(incomplete.decision, 'DENY');
    assert.ok(
      incomplete.refuseCodes.includes(
        CX_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
      ) ||
        incomplete.code === CX_CODES.LOCAL_VERIFY_REFUSE_DENY ||
        incomplete.code === CX_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY
    );
  });

  it('invalid phase / oversized reasons fail-closed at policy gate', () => {
    const gate = new BillingBlockedLocalVerifyRitualPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      phase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, CX_CODES.INVALID_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: CX_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, CX_CODES.OVERSIZED_REASONS_DENY);
  });
});
