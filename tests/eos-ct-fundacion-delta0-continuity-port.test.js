/**
 * @file tests/eos-ct-fundacion-delta0-continuity-port.test.js
 * SPEC-0103 / Mission CT — Fundacion Δ=0 Continuity Drill & Reconciliation Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-import fundacion-delta0-gameday (compose)
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   NON-CLAIM: ≠ Fundacion write auth / ≠ PRODUCTION_READY flip /
 *              ≠ weaken ALWAYS_DENY / ≠ reopen L26 / ≠ L27 closeout
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CT_PRODUCTION_READY,
  CT_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CT_RECEIPT_KIND,
  CT_DECISIONS,
  CT_CONTINUITY_MODES,
  sha256Canonical,
  buildFundacionDelta0ContinuityReceipt,
  verifyFundacionDelta0ContinuityReceipt,
  canonicalFundacionDelta0ContinuitySealBody,
  _resetReceiptSeqForTests
} from '../src/core/continuity/fundacion-delta0-continuity-receipt.js';

import {
  FundacionDelta0ContinuityPolicyGate,
  CT_CODES,
  CT_MAX_REASONS,
  CT_ID_PATTERN,
  CT_POLICY_GATE_PRODUCTION_READY,
  CT_DRILL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL26Reopen,
  claimsWeakenAlwaysDeny,
  isFundacionTarget,
  isTamperedDigest,
  normalizeDrillPhase
} from '../src/core/continuity/fundacion-delta0-continuity-policy-gate.js';

import {
  FundacionDelta0ContinuityPort,
  CT_PORT_PRODUCTION_READY,
  CT_PORT_KIND,
  CT_SAFE_AUTOMATION_IDS,
  CT_REFUSE_CODES,
  decisionForContinuity,
  builtinGamedayDouble,
  softImportGameday
} from '../src/core/continuity/fundacion-delta0-continuity-port.js';

const SOFT_GAMEDAY_PATH =
  '/workspace/eos-post-l26-f-fundacion-gameday/src/core/fundacion/fundacion-delta0-gameday.js';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionFundacionDelta0Continuity123';
}

function goodDigest(seed = 'eos-ct-fundacion-delta0-continuity') {
  return sha256Canonical(seed);
}

function happyGamedayInput(overrides = {}) {
  return {
    independentCheck: true,
    dirty: false,
    mismatch: false,
    pending: false,
    writeAttempt: false,
    fundacionDelta: 0,
    FUNDACION_ALWAYS_DENY: true,
    ...overrides
  };
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l27-ct-001',
    changeId: 'chg.fundacion.ct-001',
    continuityMode: 'ACTIVE',
    drillPhase: 'reconcile',
    gamedayInput: happyGamedayInput(),
    reasons: ['hermetic fundacion delta0 continuity govern'],
    label: 'happy pass continuity drill',
    ...overrides
  };
}

describe('Mission CT — Fundacion Δ=0 Continuity Receipt (SPEC-0103)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CT_PRODUCTION_READY, 'NO');
    assert.equal(CT_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CT_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CT_PORT_PRODUCTION_READY, 'NO');
    assert.ok(
      CT_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(CT_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
  });

  it('builds canonical nine-field sealed CT-RCPT-* receipt', () => {
    const receipt = buildFundacionDelta0ContinuityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      continuityMode: 'ACTIVE',
      drillPhase: 'reconcile',
      continuityDigest: goodDigest('demo'),
      reconciliationOk: true,
      independentCheckOk: true,
      delta0Recorded: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CT_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CT-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.continuityMode, 'ACTIVE');
    assert.equal(receipt.drillPhase, 'reconcile');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.fundacionWriteAuth, false);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.weakenAlwaysDeny, false);
    assert.equal(receipt.nonClaims.l26Reopen, false);
    assert.equal(receipt.nonClaims.l27Closeout, false);

    const body = canonicalFundacionDelta0ContinuitySealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyFundacionDelta0ContinuityReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildFundacionDelta0ContinuityReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      continuityMode: 'ACTIVE',
      drillPhase: 'reconcile',
      continuityDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyFundacionDelta0ContinuityReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CT — Fundacion Δ=0 Continuity Policy Gate (SPEC-0103)', () => {
  let gate;

  beforeEach(() => {
    gate = new FundacionDelta0ContinuityPolicyGate();
  });

  it('validates well-formed continuity drill plan (planId+changeId+ACTIVE+drillPhase)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CT_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l27-ct-001');
    assert.equal(res.changeId, 'chg.fundacion.ct-001');
    assert.equal(res.continuityMode, 'ACTIVE');
    assert.equal(res.drillPhase, 'reconcile');
    assert.ok(CT_ID_PATTERN.test('plan-l27-ct-001'));
    assert.ok(CT_MAX_REASONS >= 1);
    assert.ok(CT_CONTINUITY_MODES.includes('ACTIVE'));
    assert.ok(CT_CONTINUITY_MODES.includes('HOLD'));
    assert.ok(CT_DRILL_PHASES.includes('reconcile'));
    assert.equal(normalizeDrillPhase('p3'), 'reconcile');
  });

  it('rejects empty / missing planId / changeId / continuityMode / drillPhase fail-closed', () => {
    assert.equal(gate.evaluatePlan({}).code, CT_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        continuityDigest: goodDigest('x'),
        continuityMode: 'HOLD',
        drillPhase: 'reconcile'
      }).code,
      CT_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        continuityDigest: goodDigest('x'),
        continuityMode: 'ACTIVE',
        drillPhase: 'reconcile'
      }).code,
      CT_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        continuityDigest: goodDigest('x'),
        drillPhase: 'reconcile'
      }).code,
      CT_CODES.MISSING_CONTINUITY_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        continuityMode: 'GREEN',
        continuityDigest: goodDigest('x'),
        drillPhase: 'reconcile'
      }).code,
      CT_CODES.INVALID_CONTINUITY_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        continuityMode: 'ACTIVE',
        continuityDigest: goodDigest('x')
      }).code,
      CT_CODES.MISSING_DRILL_PHASE_DENY
    );
  });

  it('detects secrets (Law VI), Fundacion ALWAYS_DENY, weaken ALWAYS_DENY, L26 reopen', () => {
    assert.equal(scanForSecrets({ note: makeSyntheticSecret() }), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);
    assert.equal(isFundacionTarget('src/core/continuity'), false);
    assert.equal(
      claimsWeakenAlwaysDeny({ label: 'FUNDACION_ALWAYS_DENY=false' }),
      true
    );
    assert.equal(claimsL26Reopen({ label: 'reopen L26' }), true);

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: makeSyntheticSecret()
      }).code,
      CT_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      CT_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      CT_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 26'
      }).code,
      CT_CODES.L26_REOPEN_CLAIM_DENY
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
      CT_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      CT_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        gamedayInput: undefined,
        continuityDigest: '0'.repeat(64)
      }).code,
      CT_CODES.TAMPERED_DIGEST_DENY
    );
  });
});

describe('Mission CT — Fundacion Δ=0 Continuity Port (SPEC-0103)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + Δ=0 independently checked → PASS + CT-RCPT-*', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, CT_CODES.GOVERN_PASS);
    assert.equal(out.continuityMode, 'ACTIVE');
    assert.equal(out.drillPhase, 'reconcile');
    assert.equal(out.reconciliationOk, true);
    assert.equal(out.delta0Recorded, true);
    assert.ok(out.receipt.receiptId.startsWith('CT-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.ok(
      out.safeAutomationIds.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
    assert.equal(port.getDecision('plan-l27-ct-001').decision, 'PASS');
  });

  it('HOLD continuityMode → HOLD (observe; ≠ automatic closure)', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        continuityMode: 'HOLD',
        gamedayInput: undefined,
        continuityDigest: goodDigest('hold-1'),
        drillPhase: 'observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, CT_CODES.GOVERN_HOLD);
    assert.equal(decisionForContinuity('HOLD', { ok: false }), 'HOLD');
  });

  it('evaluate() aliases govern()', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('deny dirty / mismatch / pending / missing artifact fail-closed', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });

    const dirty = await port.govern(
      sampleHappyPlan({
        planId: 'plan-dirty',
        gamedayInput: happyGamedayInput({ dirty: true })
      })
    );
    assert.equal(dirty.ok, false);
    assert.equal(dirty.decision, 'DENY');
    assert.equal(dirty.code, CT_CODES.GAMEDAY_REFUSE_DENY);
    assert.ok(dirty.refuseCodes.includes(CT_REFUSE_CODES.DIRTY_INPUT));

    const mismatch = await port.govern(
      sampleHappyPlan({
        planId: 'plan-mismatch',
        gamedayInput: happyGamedayInput({ mismatch: true })
      })
    );
    assert.equal(mismatch.decision, 'DENY');
    assert.ok(mismatch.refuseCodes.includes(CT_REFUSE_CODES.MISMATCH));

    const pending = await port.govern(
      sampleHappyPlan({
        planId: 'plan-pending',
        gamedayInput: happyGamedayInput({ pending: true })
      })
    );
    assert.equal(pending.decision, 'DENY');
    assert.ok(pending.refuseCodes.includes(CT_REFUSE_CODES.PENDING_STATUS));

    const missing = await port.govern(
      sampleHappyPlan({
        planId: 'plan-missing',
        gamedayInput: happyGamedayInput({ missingArtifact: true })
      })
    );
    assert.equal(missing.decision, 'DENY');
    assert.ok(missing.refuseCodes.includes(CT_REFUSE_CODES.MISSING_ARTIFACT));
  });

  it('DENY Fundacion write / weaken ALWAYS_DENY / L26 reopen', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });

    const write = await port.govern(
      sampleHappyPlan({
        planId: 'plan-write',
        gamedayInput: happyGamedayInput({ writeAttempt: true })
      })
    );
    assert.equal(write.decision, 'DENY');
    assert.ok(
      write.refuseCodes.includes(CT_REFUSE_CODES.WRITE_ATTEMPT_DENIED) ||
        write.refuseCodes.includes(CT_REFUSE_CODES.FUNDACION_ALWAYS_DENY)
    );

    const target = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund-target',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(target.decision, 'DENY');
    assert.equal(target.code, CT_CODES.FUNDACION_ALWAYS_DENY);

    const weaken = await port.govern(
      sampleHappyPlan({
        planId: 'plan-weaken',
        FUNDACION_ALWAYS_DENY: false
      })
    );
    assert.equal(weaken.decision, 'DENY');
    assert.equal(weaken.code, CT_CODES.WEAKEN_ALWAYS_DENY);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L26'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, CT_CODES.L26_REOPEN_CLAIM_DENY);
  });

  it('A7 refuse auto PRODUCTION_READY flip → DENY + autoProductionFlipRefused', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });

    const claim = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod-claim',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(claim.decision, 'DENY');
    assert.equal(claim.code, CT_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(claim.autoProductionFlipRefused, true);
    assert.equal(claim.humanGateHeld, true);

    const flip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod-flip',
        gamedayInput: happyGamedayInput({ autoProductionReady: true })
      })
    );
    assert.equal(flip.decision, 'DENY');
    assert.equal(flip.autoProductionFlipRefused, true);
  });

  it('DENY when independent check missing (Δ=0 not recordable)', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-no-indep',
        gamedayInput: happyGamedayInput({ independentCheck: false })
      })
    );
    assert.equal(out.decision, 'DENY');
    assert.equal(out.delta0Recorded, false);
    assert.ok(
      out.refuseCodes.includes(CT_REFUSE_CODES.INDEPENDENT_CHECK_REQUIRED)
    );
  });

  it('verifyTrail validates CT receipt chain; tamper breaks trail', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });
    await port.govern(
      sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' })
    );
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        continuityMode: 'HOLD',
        gamedayInput: undefined,
        continuityDigest: goodDigest('t2'),
        drillPhase: 'observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, CT_CODES.TRAIL_OK);
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
    assert.equal(bad.code, CT_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: ≠ Fundacion write auth / ≠ PRODUCTION_READY flip / ≠ weaken ALWAYS_DENY', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.fundacionWriteAuth, false);
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.weakenAlwaysDeny, false);
    assert.equal(out.receipt.nonClaims.l27Closeout, false);
    assert.ok(
      out.reasons.some((r) => /≠ Fundacion write|NON-CLAIM/i.test(r))
    );

    const dbl = builtinGamedayDouble(happyGamedayInput());
    assert.equal(dbl.ok, true);
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.FUNDACION_ALWAYS_DENY, true);
    assert.equal(dbl.auto_seal, false);
    assert.equal(dbl.auto_production_ready_flip, false);

    assert.equal(CT_PORT_KIND, 'eos-fundacion-delta0-continuity-port');
    assert.ok(CT_DECISIONS.includes('PASS'));
    assert.ok(CT_DECISIONS.includes('DENY'));
    assert.ok(CT_DECISIONS.includes('HOLD'));
  });

  it('soft-import real post-L26-F gameday when co-located (compose)', async () => {
    const soft = await softImportGameday(SOFT_GAMEDAY_PATH);
    assert.ok(soft, 'expected soft-import of post-L26-F gameday on box');
    assert.equal(typeof soft.runFundacionDelta0Gameday, 'function');
    assert.equal(soft.source, 'soft-import');
    assert.equal(soft.FUNDACION_ALWAYS_DENY, true);

    const port = new FundacionDelta0ContinuityPort({
      gamedayModulePath: SOFT_GAMEDAY_PATH
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-soft-f',
        gamedayInput: {
          independentCheck: true,
          requireIndependentCheck: true
        }
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
  });

  it('invalid drillPhase / oversized reasons fail-closed at policy gate', () => {
    const gate = new FundacionDelta0ContinuityPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      drillPhase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, CT_CODES.INVALID_DRILL_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: CT_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, CT_CODES.OVERSIZED_REASONS_DENY);
  });

  it('port green ≠ L27 closeout; PRODUCTION_READY remains NO; Law VI secrets denied', async () => {
    const port = new FundacionDelta0ContinuityPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nonclose' }));
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(CT_PRODUCTION_READY, 'NO');
    assert.equal(CT_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l27Closeout, false);
    assert.equal(out.receipt.nonClaims.l26Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCU, false);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, CT_CODES.SECRET_DETECTED_DENY);
  });
});
