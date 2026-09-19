/**
 * @file tests/eos-cs-specboot-continuity-port.test.js
 * SPEC-0102 / Mission CS — SpecBoot Operator Continuity Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-import friction-gate (compose)
 *   Preserve A6 human seal gate + A7 PRODUCTION_READY gate (refuse auto)
 *   NON-CLAIM: ≠ automatic closure / ≠ PRODUCTION_READY flip /
 *              ≠ full SpecBoot CLI rewrite / ≠ reopen L26 / ≠ L27 closeout
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CS_PRODUCTION_READY,
  CS_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CS_RECEIPT_KIND,
  CS_DECISIONS,
  CS_CONTINUITY_MODES,
  sha256Canonical,
  buildSpecbootContinuityReceipt,
  verifySpecbootContinuityReceipt,
  canonicalSpecbootContinuitySealBody,
  _resetReceiptSeqForTests
} from '../src/core/specboot/specboot-continuity-receipt.js';

import {
  SpecbootContinuityPolicyGate,
  CS_CODES,
  CS_MAX_REASONS,
  CS_ID_PATTERN,
  CS_POLICY_GATE_PRODUCTION_READY,
  CS_LIDR_STEPS,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  isFundacionTarget,
  isTamperedDigest,
  normalizeLidrStep
} from '../src/core/specboot/specboot-continuity-policy-gate.js';

import {
  SpecbootContinuityPort,
  CS_PORT_PRODUCTION_READY,
  CS_PORT_KIND,
  CS_SAFE_AUTOMATION_IDS,
  CS_REFUSE_CODES,
  decisionForContinuity,
  builtinFrictionDouble,
  softImportFrictionGate
} from '../src/core/specboot/specboot-continuity-port.js';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionSpecbootContinuity123456';
}

function goodDigest(seed = 'eos-cs-specboot-continuity') {
  return sha256Canonical(seed);
}

function happyFrictionInput(overrides = {}) {
  return {
    step: 'apply',
    primaryOwner: 'Valentin Florez',
    owners: ['Valentin Florez'],
    dirty: false,
    stale: false,
    skipPrereqCheck: true,
    ...overrides
  };
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l27-cs-001',
    changeId: 'chg.specboot.cs-001',
    continuityMode: 'ACTIVE',
    lidrStep: 'apply',
    frictionInput: happyFrictionInput(),
    reasons: ['hermetic specboot continuity govern'],
    label: 'happy pass continuity',
    ...overrides
  };
}

describe('Mission CS — SpecBoot Continuity Receipt (SPEC-0102)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CS_PRODUCTION_READY, 'NO');
    assert.equal(CS_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CS_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CS_PORT_PRODUCTION_READY, 'NO');
    assert.ok(CS_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_SEAL_GATE'));
    assert.ok(CS_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
  });

  it('builds canonical nine-field sealed CS-RCPT-* receipt', () => {
    const receipt = buildSpecbootContinuityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      continuityMode: 'ACTIVE',
      lidrStep: 'apply',
      continuityDigest: goodDigest('demo'),
      frictionOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CS_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CS-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.continuityMode, 'ACTIVE');
    assert.equal(receipt.lidrStep, 'apply');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.automaticClosure, false);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.l26Reopen, false);
    assert.equal(receipt.nonClaims.l27Closeout, false);

    const body = canonicalSpecbootContinuitySealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifySpecbootContinuityReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildSpecbootContinuityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      continuityMode: 'ACTIVE',
      lidrStep: 'apply',
      continuityDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifySpecbootContinuityReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CS — SpecBoot Continuity Policy Gate (SPEC-0102)', () => {
  let gate;

  beforeEach(() => {
    gate = new SpecbootContinuityPolicyGate();
  });

  it('validates a well-formed continuity plan with planId+changeId+ACTIVE+lidrStep', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CS_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l27-cs-001');
    assert.equal(res.changeId, 'chg.specboot.cs-001');
    assert.equal(res.continuityMode, 'ACTIVE');
    assert.equal(res.lidrStep, 'apply');
    assert.ok(CS_ID_PATTERN.test('plan-l27-cs-001'));
    assert.ok(CS_MAX_REASONS >= 1);
    assert.ok(CS_CONTINUITY_MODES.includes('ACTIVE'));
    assert.ok(CS_CONTINUITY_MODES.includes('HOLD'));
    assert.ok(CS_LIDR_STEPS.includes('apply'));
    assert.equal(normalizeLidrStep('opsx-apply'), 'apply');
  });

  it('rejects empty plan / missing planId / changeId / continuityMode / lidrStep fail-closed', () => {
    const empty = gate.evaluatePlan({});
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CS_CODES.EMPTY_PLAN_DENY);

    const noPlan = gate.evaluatePlan({
      changeId: 'chg-1',
      continuityDigest: goodDigest('x'),
      continuityMode: 'HOLD',
      lidrStep: 'apply'
    });
    assert.equal(noPlan.valid, false);
    assert.equal(noPlan.code, CS_CODES.MISSING_PLAN_ID_DENY);

    const noChange = gate.evaluatePlan({
      planId: 'plan-1',
      continuityDigest: goodDigest('x'),
      continuityMode: 'ACTIVE',
      lidrStep: 'apply'
    });
    assert.equal(noChange.valid, false);
    assert.equal(noChange.code, CS_CODES.MISSING_CHANGE_ID_DENY);

    const noMode = gate.evaluatePlan({
      planId: 'plan-1',
      changeId: 'chg-1',
      continuityDigest: goodDigest('x'),
      lidrStep: 'apply'
    });
    assert.equal(noMode.valid, false);
    assert.equal(noMode.code, CS_CODES.MISSING_CONTINUITY_MODE_DENY);

    const badMode = gate.evaluatePlan({
      planId: 'plan-1',
      changeId: 'chg-1',
      continuityMode: 'GREEN',
      continuityDigest: goodDigest('x'),
      lidrStep: 'apply'
    });
    assert.equal(badMode.valid, false);
    assert.equal(badMode.code, CS_CODES.INVALID_CONTINUITY_MODE_DENY);

    const noStep = gate.evaluatePlan({
      planId: 'plan-1',
      changeId: 'chg-1',
      continuityMode: 'ACTIVE',
      continuityDigest: goodDigest('x')
    });
    assert.equal(noStep.valid, false);
    assert.equal(noStep.code, CS_CODES.MISSING_LIDR_STEP_DENY);
  });

  it('detects secrets (Law VI) and blocks Fundacion ALWAYS_DENY', () => {
    assert.equal(scanForSecrets({ note: makeSyntheticSecret() }), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);
    assert.equal(isFundacionTarget('src/core/specboot'), false);

    const secretPlan = gate.evaluatePlan({
      ...sampleHappyPlan(),
      label: makeSyntheticSecret()
    });
    assert.equal(secretPlan.valid, false);
    assert.equal(secretPlan.code, CS_CODES.SECRET_DETECTED_DENY);

    const fundacionPlan = gate.evaluatePlan({
      ...sampleHappyPlan(),
      target: 'Documents/Fundacion/notes'
    });
    assert.equal(fundacionPlan.valid, false);
    assert.equal(fundacionPlan.code, CS_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects PRODUCTION_READY flip / auto-seal claim labels (A6/A7)', () => {
    assert.equal(
      claimsProductionReadyFlip({ label: 'flip PRODUCTION_READY to YES' }),
      true
    );
    assert.equal(claimsAutoSeal({ label: 'auto-seal without human' }), true);

    const prodFlip = gate.evaluatePlan({
      ...sampleHappyPlan(),
      label: 'claim PRODUCTION_READY=YES'
    });
    assert.equal(prodFlip.valid, false);
    assert.equal(prodFlip.code, CS_CODES.PRODUCTION_READY_FLIP_DENY);

    const autoSeal = gate.evaluatePlan({
      ...sampleHappyPlan(),
      autoSeal: true
    });
    assert.equal(autoSeal.valid, false);
    assert.equal(autoSeal.code, CS_CODES.AUTO_SEAL_CLAIM_DENY);

    assert.equal(isTamperedDigest('0'.repeat(64)), true);
    const tampered = gate.evaluatePlan({
      ...sampleHappyPlan(),
      frictionInput: undefined,
      continuityDigest: '0'.repeat(64)
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.code, CS_CODES.TAMPERED_DIGEST_DENY);
  });
});

describe('Mission CS — SpecBoot Continuity Port (SPEC-0102)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + friction ok → PASS + CS-RCPT-*', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, CS_CODES.GOVERN_PASS);
    assert.equal(out.continuityMode, 'ACTIVE');
    assert.equal(out.lidrStep, 'apply');
    assert.equal(out.frictionOk, true);
    assert.ok(out.receipt.receiptId.startsWith('CS-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.ok(out.safeAutomationIds.includes('A6_PRESERVE_HUMAN_SEAL_GATE'));
    assert.ok(out.safeAutomationIds.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
    assert.equal(port.getDecision('plan-l27-cs-001').decision, 'PASS');
  });

  it('HOLD continuityMode → HOLD (observe; ≠ automatic closure)', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        continuityMode: 'HOLD',
        frictionInput: undefined,
        continuityDigest: goodDigest('hold-1')
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, CS_CODES.GOVERN_HOLD);
    assert.equal(decisionForContinuity('HOLD', { ok: false }), 'HOLD');
  });

  it('evaluate() aliases govern()', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('deny dirty / stale / ambiguous ownership / missing prereqs fail-closed', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });

    const dirty = await port.govern(
      sampleHappyPlan({
        planId: 'plan-dirty',
        frictionInput: happyFrictionInput({ dirty: true })
      })
    );
    assert.equal(dirty.ok, false);
    assert.equal(dirty.decision, 'DENY');
    assert.equal(dirty.code, CS_CODES.FRICTION_REFUSE_DENY);
    assert.ok(
      dirty.refuseCodes.includes(CS_REFUSE_CODES.DIRTY_STATE) ||
        dirty.primaryRefuse === CS_REFUSE_CODES.DIRTY_STATE ||
        (dirty.receipt.refuseCodes || []).includes(CS_REFUSE_CODES.DIRTY_STATE)
    );

    const stale = await port.govern(
      sampleHappyPlan({
        planId: 'plan-stale',
        frictionInput: happyFrictionInput({ stale: true })
      })
    );
    assert.equal(stale.decision, 'DENY');

    const owner = await port.govern(
      sampleHappyPlan({
        planId: 'plan-owner',
        frictionInput: happyFrictionInput({
          primaryOwner: undefined,
          owners: []
        })
      })
    );
    assert.equal(owner.decision, 'DENY');

    const missing = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prereq',
        frictionInput: happyFrictionInput({
          skipPrereqCheck: false,
          missingPrereqs: true
        })
      })
    );
    assert.equal(missing.decision, 'DENY');
  });

  it('A6 refuse auto-seal: seal without humanSealAck → DENY + autoSealRefused', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-seal',
        lidrStep: 'seal',
        frictionInput: happyFrictionInput({
          step: 'seal',
          autoSeal: true,
          skipDirtyCheck: true,
          skipStaleCheck: true,
          skipOwnershipCheck: true
        })
      })
    );
    assert.equal(out.ok, false);
    assert.equal(out.decision, 'DENY');
    assert.equal(out.autoSealRefused, true);
    assert.equal(out.humanGateHeld, true);
    assert.ok(
      out.refuseCodes.includes(CS_REFUSE_CODES.AUTO_SEAL_REFUSED) ||
        out.receipt.autoSealRefused === true
    );
  });

  it('A7 refuse auto PRODUCTION_READY flip → DENY + autoProductionFlipRefused', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });

    // Policy-level claim
    const claim = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod-claim',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(claim.decision, 'DENY');
    assert.equal(claim.code, CS_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(claim.autoProductionFlipRefused, true);

    // Friction-level auto flip
    const flip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod-flip',
        lidrStep: 'production_ready_flip',
        frictionInput: happyFrictionInput({
          step: 'production_ready_flip',
          autoProductionReady: true,
          skipDirtyCheck: true,
          skipStaleCheck: true,
          skipOwnershipCheck: true
        })
      })
    );
    assert.equal(flip.decision, 'DENY');
    assert.equal(flip.autoProductionFlipRefused, true);
    assert.equal(flip.humanGateHeld, true);
  });

  it('verifyTrail validates CS receipt chain; tamper breaks trail', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });
    await port.govern(sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' }));
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        continuityMode: 'HOLD',
        frictionInput: undefined,
        continuityDigest: goodDigest('t2')
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, CS_CODES.TRAIL_OK);
    assert.equal(ok.receiptCount, 2);

    // Tamper second receipt
    const broken = port.receipts[1];
    Object.defineProperty(port, 'receipts', {
      value: [
        port.receipts[0],
        { ...broken, planId: 'tampered', receiptHash: broken.receiptHash }
      ]
    });
    const bad = port.verifyTrail();
    assert.equal(bad.valid, false);
    assert.equal(bad.code, CS_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ automatic closure / ≠ PRODUCTION_READY flip; soft-import optional', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.automaticClosure, false);
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.fullSpecbootRewrite, false);
    assert.equal(out.receipt.nonClaims.l27Closeout, false);
    assert.ok(
      out.reasons.some((r) => /≠ automatic closure|NON-CLAIM/i.test(r))
    );

    const soft = await softImportFrictionGate(
      '/workspace/eos-post-l26-e-specboot-friction/src/core/specboot/specboot-friction-gate.js'
    );
    // Soft-import may succeed on box when post-L26 E is present — both OK
    if (soft) {
      assert.equal(typeof soft.runSpecbootFrictionGate, 'function');
      assert.equal(soft.source, 'soft-import');
    }

    const dbl = builtinFrictionDouble(happyFrictionInput());
    assert.equal(dbl.ok, true);
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.auto_seal, false);
    assert.equal(dbl.auto_production_ready_flip, false);

    assert.equal(CS_PORT_KIND, 'eos-specboot-continuity-port');
    assert.ok(CS_DECISIONS.includes('PASS'));
    assert.ok(CS_DECISIONS.includes('DENY'));
    assert.ok(CS_DECISIONS.includes('HOLD'));
  });

  it('invalid lidrStep / oversized reasons fail-closed at policy gate', () => {
    const gate = new SpecbootContinuityPolicyGate();
    const badStep = gate.evaluatePlan({
      ...sampleHappyPlan(),
      lidrStep: 'not-a-real-step'
    });
    assert.equal(badStep.valid, false);
    assert.equal(badStep.code, CS_CODES.INVALID_LIDR_STEP_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: CS_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, CS_CODES.OVERSIZED_REASONS_DENY);
  });

  it('soft-import real post-L26-E friction gate when co-located (compose)', async () => {
    const soft = await softImportFrictionGate(
      '/workspace/eos-post-l26-e-specboot-friction/src/core/specboot/specboot-friction-gate.js'
    );
    assert.ok(soft, 'expected soft-import of post-L26-E friction gate on box');
    assert.equal(typeof soft.runSpecbootFrictionGate, 'function');
    assert.equal(soft.source, 'soft-import');
    assert.ok(
      Array.isArray(soft.SAFE_AUTOMATION_IDS) ||
        Array.isArray(soft.safeAutomationIds)
    );
    const ids = soft.SAFE_AUTOMATION_IDS || soft.safeAutomationIds;
    assert.ok(
      ids.some((id) => /A6.*SEAL|PRESERVE_HUMAN_SEAL/i.test(id)),
      'A6 seal gate preserved'
    );
    assert.ok(
      ids.some((id) => /A7.*PROD|PRESERVE_HUMAN_PROD/i.test(id)),
      'A7 prod gate preserved'
    );
  });

  it('port green ≠ L27 closeout; PRODUCTION_READY remains NO after PASS', async () => {
    const port = new SpecbootContinuityPort({ preferBuiltinDouble: true });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nonclose' }));
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(CS_PRODUCTION_READY, 'NO');
    assert.equal(CS_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l27Closeout, false);
    assert.equal(out.receipt.nonClaims.l26Reopen, false);
  });
});
