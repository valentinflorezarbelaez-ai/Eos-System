/**
 * @file tests/eos-cv-hud-doctor-honesty-ritual-port.test.js
 * SPEC-0105 / Mission CV — HUD/Doctor Honesty Ritual Composition Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-import doctor-hud-honesty (compose)
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ L27 reopen / ≠ tip rewrite /
 *              ≠ L28 closeout / ≠ tip-refresh / ≠ CW
 *   Do NOT wholesale-replace operator-doctor.js / operator-hud.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CV_PRODUCTION_READY,
  CV_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CV_RECEIPT_KIND,
  CV_DECISIONS,
  CV_RITUAL_MODES,
  sha256Canonical,
  buildHudDoctorHonestyRitualReceipt,
  verifyHudDoctorHonestyRitualReceipt,
  canonicalHudDoctorHonestyRitualSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/hud-doctor-honesty-ritual-receipt.js';

import {
  HudDoctorHonestyRitualPolicyGate,
  CV_CODES,
  CV_MAX_REASONS,
  CV_ID_PATTERN,
  CV_POLICY_GATE_PRODUCTION_READY,
  CV_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL27Reopen,
  claimsTipRewrite,
  claimsWeakenAlwaysDeny,
  isFundacionTarget,
  isTamperedDigest,
  normalizeRitualPhase
} from '../src/core/composition/hud-doctor-honesty-ritual-policy-gate.js';

import {
  HudDoctorHonestyRitualPort,
  CV_PORT_PRODUCTION_READY,
  CV_PORT_KIND,
  CV_SAFE_AUTOMATION_IDS,
  CV_REFUSE_CODES,
  decisionForRitual,
  builtinHonestyDouble,
  softImportHonesty,
  evaluateHonestyOk
} from '../src/core/composition/hud-doctor-honesty-ritual-port.js';

const SOFT_HONESTY_PATH = '/workspace/eos-cv-refs/doctor-hud-honesty.js';
const FREEZE_PIN = '62d430fb9f53641809d8825ee9e676f13bc5b48c';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionHudDoctorHonestyRitual123';
}

function goodDigest(seed = 'eos-cv-hud-doctor-honesty-ritual') {
  return sha256Canonical(seed);
}

function happyHonestyInput(overrides = {}) {
  return {
    freezeRevision: FREEZE_PIN,
    sourceRevision: FREEZE_PIN,
    lagCommits: 0,
    dirty: false,
    pendingPorts: [],
    ...overrides
  };
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cv-001',
    changeId: 'chg.honesty.cv-001',
    ritualMode: 'ACTIVE',
    ritualPhase: 'compose_honesty',
    honestyInput: happyHonestyInput(),
    cqCtObserveLabels: ['CQ:observe', 'CT:observe'],
    reasons: ['hermetic hud-doctor honesty ritual govern'],
    label: 'happy pass honesty ritual',
    ...overrides
  };
}

describe('Mission CV — HUD/Doctor Honesty Ritual Receipt (SPEC-0105)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CV_PRODUCTION_READY, 'NO');
    assert.equal(CV_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CV_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CV_PORT_PRODUCTION_READY, 'NO');
    assert.ok(
      CV_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(CV_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(CV_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_TIP_REWRITE'));
    assert.ok(CV_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_L27_REOPEN'));
  });

  it('builds canonical nine-field sealed CV-RCPT-* receipt', () => {
    const receipt = buildHudDoctorHonestyRitualReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      ritualDigest: goodDigest('demo'),
      honestyOk: true,
      freezeLagMeasured: true,
      dirtyDeferred: false,
      nonClaimChips: ['NON-CLAIM: demo'],
      pendingPorts: ['CW pending'],
      cqCtObserveLabels: ['CQ:observe'],
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CV_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CV-RCPT-'));
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.ritualMode, 'ACTIVE');
    assert.equal(receipt.honestyOk, true);
    assert.equal(receipt.freezeLagMeasured, true);
    assert.deepEqual([...receipt.pendingPorts], ['CW pending']);
    assert.deepEqual([...receipt.cqCtObserveLabels], ['CQ:observe']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.l27Reopen, false);
    assert.equal(receipt.nonClaims.tipRewrite, false);
    assert.equal(receipt.nonClaims.l28Closeout, false);

    const body = canonicalHudDoctorHonestyRitualSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyHudDoctorHonestyRitualReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildHudDoctorHonestyRitualReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      ritualDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyHudDoctorHonestyRitualReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CV — HUD/Doctor Honesty Ritual Policy Gate (SPEC-0105)', () => {
  let gate;

  beforeEach(() => {
    gate = new HudDoctorHonestyRitualPolicyGate();
  });

  it('validates well-formed honesty ritual plan (planId+changeId+ACTIVE+phase)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CV_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l28-cv-001');
    assert.equal(res.changeId, 'chg.honesty.cv-001');
    assert.equal(res.ritualMode, 'ACTIVE');
    assert.equal(res.ritualPhase, 'compose_honesty');
    assert.ok(CV_ID_PATTERN.test('plan-l28-cv-001'));
    assert.ok(CV_MAX_REASONS >= 1);
    assert.ok(CV_RITUAL_MODES.includes('ACTIVE'));
    assert.ok(CV_RITUAL_MODES.includes('HOLD'));
    assert.ok(CV_RITUAL_PHASES.includes('compose_honesty'));
    assert.equal(normalizeRitualPhase('compose'), 'compose_honesty');
  });

  it('rejects empty / missing planId / changeId / ritualMode / phase fail-closed', () => {
    assert.equal(gate.evaluatePlan({}).code, CV_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        ritualDigest: goodDigest('x'),
        ritualMode: 'HOLD',
        ritualPhase: 'hold_observe'
      }).code,
      CV_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        ritualDigest: goodDigest('x'),
        ritualMode: 'ACTIVE',
        ritualPhase: 'compose_honesty'
      }).code,
      CV_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualDigest: goodDigest('x'),
        ritualPhase: 'compose_honesty'
      }).code,
      CV_CODES.MISSING_RITUAL_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualMode: 'GREEN',
        ritualDigest: goodDigest('x'),
        ritualPhase: 'compose_honesty'
      }).code,
      CV_CODES.INVALID_RITUAL_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        ritualMode: 'ACTIVE',
        ritualDigest: goodDigest('x')
      }).code,
      CV_CODES.MISSING_RITUAL_PHASE_DENY
    );
  });

  it('DENY dirty-without-ack / freeze-lag-unmeasured-without-ack at gate', () => {
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        honestyInput: happyHonestyInput({ dirty: true })
      }).code,
      CV_CODES.DIRTY_WITHOUT_ACK_DENY
    );

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        honestyInput: happyHonestyInput({
          dirty: true,
          allowOptimisticWhenDirty: true
        })
      }).valid,
      true
    );

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        honestyInput: happyHonestyInput({
          freezeRevision: FREEZE_PIN,
          sourceRevision: 'a83ece6700000000000000000000000000000000',
          lagCommits: undefined
        })
      }).code,
      CV_CODES.FREEZE_LAG_UNMEASURED_WITHOUT_ACK_DENY
    );

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        ackFreezeLagUnmeasured: true,
        honestyInput: happyHonestyInput({
          freezeRevision: FREEZE_PIN,
          sourceRevision: 'a83ece6700000000000000000000000000000000'
        })
      }).valid,
      true
    );
  });

  it('detects secrets / Fundacion / weaken ALWAYS_DENY / L27 reopen / tip rewrite', () => {
    assert.equal(scanForSecrets({ note: makeSyntheticSecret() }), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);
    assert.equal(isFundacionTarget('src/core/composition'), false);
    assert.equal(
      claimsWeakenAlwaysDeny({ label: 'FUNDACION_ALWAYS_DENY=false' }),
      true
    );
    assert.equal(claimsL27Reopen({ label: 'reopen L27' }), true);
    assert.equal(claimsTipRewrite({ label: 'tip rewrite freeze main_tip' }), true);

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: makeSyntheticSecret()
      }).code,
      CV_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      CV_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      CV_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 27'
      }).code,
      CV_CODES.L27_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'rewrite freeze main_tip'
      }).code,
      CV_CODES.TIP_REWRITE_CLAIM_DENY
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
      CV_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      CV_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        honestyInput: undefined,
        ritualDigest: '0'.repeat(64)
      }).code,
      CV_CODES.TAMPERED_DIGEST_DENY
    );
  });
});

describe('Mission CV — HUD/Doctor Honesty Ritual Port (SPEC-0105)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + honesty ok → PASS + CV-RCPT-*', async () => {
    const port = new HudDoctorHonestyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, CV_CODES.GOVERN_PASS);
    assert.equal(out.ritualMode, 'ACTIVE');
    assert.equal(out.ritualPhase, 'compose_honesty');
    assert.equal(out.honestyOk, true);
    assert.equal(out.freezeLagMeasured, true);
    assert.equal(out.dirtyDeferred, false);
    assert.ok(out.receipt.receiptId.startsWith('CV-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.ok(out.nonClaimChips.length >= 1);
    assert.deepEqual(out.cqCtObserveLabels, ['CQ:observe', 'CT:observe']);
    assert.ok(
      out.safeAutomationIds.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
    assert.equal(port.getDecision('plan-l28-cv-001').decision, 'PASS');
  });

  it('HOLD ritualMode → HOLD (observe; ≠ automatic closure)', async () => {
    const port = new HudDoctorHonestyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        ritualMode: 'HOLD',
        honestyInput: undefined,
        ritualDigest: goodDigest('hold-1'),
        ritualPhase: 'hold_observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, CV_CODES.GOVERN_HOLD);
    assert.equal(decisionForRitual('HOLD', { ok: false }), 'HOLD');
  });

  it('evaluate() aliases govern()', async () => {
    const port = new HudDoctorHonestyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
  });

  it('DENY dirty-without-ack / freeze-lag-unmeasured-without-ack via port', async () => {
    const port = new HudDoctorHonestyRitualPort({
      preferBuiltinDouble: true
    });

    const dirty = await port.govern(
      sampleHappyPlan({
        planId: 'plan-dirty',
        honestyInput: happyHonestyInput({ dirty: true })
      })
    );
    assert.equal(dirty.ok, false);
    assert.equal(dirty.decision, 'DENY');
    assert.equal(dirty.code, CV_CODES.DIRTY_WITHOUT_ACK_DENY);

    const lag = await port.govern(
      sampleHappyPlan({
        planId: 'plan-lag',
        honestyInput: {
          freezeRevision: FREEZE_PIN,
          sourceRevision: 'a83ece6700000000000000000000000000000000',
          dirty: false,
          pendingPorts: []
          // lagCommits intentionally omitted → unmeasured diverge
        }
      })
    );
    assert.equal(lag.decision, 'DENY');
    assert.equal(lag.code, CV_CODES.FREEZE_LAG_UNMEASURED_WITHOUT_ACK_DENY);
  });

  it('DENY Fundacion / secrets / PRODUCTION_READY flip / L27 reopen / tip rewrite', async () => {
    const port = new HudDoctorHonestyRitualPort({
      preferBuiltinDouble: true
    });

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, CV_CODES.FUNDACION_ALWAYS_DENY);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, CV_CODES.SECRET_DETECTED_DENY);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, CV_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L27'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, CV_CODES.L27_REOPEN_CLAIM_DENY);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, CV_CODES.TIP_REWRITE_CLAIM_DENY);
  });

  it('verifyTrail validates CV receipt chain; tamper breaks trail', async () => {
    const port = new HudDoctorHonestyRitualPort({
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
        honestyInput: undefined,
        ritualDigest: goodDigest('t2'),
        ritualPhase: 'hold_observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, CV_CODES.TRAIL_OK);
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
    assert.equal(bad.code, CV_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIMs: ≠ PRODUCTION_READY flip / ≠ L27 reopen / ≠ tip rewrite / ≠ L28 closeout', async () => {
    const port = new HudDoctorHonestyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRewrite, false);
    assert.equal(out.receipt.nonClaims.l28Closeout, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCW, false);
    assert.ok(
      out.reasons.some((r) => /≠ PRODUCTION_READY|NON-CLAIM/i.test(r))
    );

    const dbl = builtinHonestyDouble(happyHonestyInput());
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.revision.match, true);
    assert.ok(Array.isArray(dbl.non_claim_chips));

    assert.equal(CV_PORT_KIND, 'eos-hud-doctor-honesty-ritual-port');
    assert.ok(CV_DECISIONS.includes('PASS'));
    assert.ok(CV_DECISIONS.includes('DENY'));
    assert.ok(CV_DECISIONS.includes('HOLD'));
  });

  it('soft-import real post-L26-B doctor-hud-honesty when path present (compose)', async () => {
    const soft = await softImportHonesty(SOFT_HONESTY_PATH);
    assert.ok(soft, 'expected soft-import of doctor-hud-honesty on box');
    assert.equal(typeof soft.buildHonestySurface, 'function');
    assert.equal(soft.source, 'soft-import');
    assert.equal(soft.HONESTY_PRODUCTION_READY, 'NO');

    const port = new HudDoctorHonestyRitualPort({
      honestyModulePath: SOFT_HONESTY_PATH
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-soft-b',
        honestyInput: happyHonestyInput()
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.honestyOk, true);
    assert.ok(out.honesty?.schema);
  });

  it('port green ≠ L28 closeout; PRODUCTION_READY remains NO; compose CQ–CT labels only', async () => {
    const port = new HudDoctorHonestyRitualPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-nonclose',
        cqCtObserveLabels: ['CQ:MEASURED-label', 'CR:MEASURED-label', 'CS:label', 'CT:label']
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(CV_PRODUCTION_READY, 'NO');
    assert.equal(CV_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l28Closeout, false);
    assert.equal(out.receipt.nonClaims.l27Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.startCW, false);
    assert.equal(out.cqCtObserveLabels.length, 4);
    assert.ok(out.receipt.cqCtObserveLabels.includes('CQ:MEASURED-label'));

    // evaluateHonestyOk helper sanity
    const surface = builtinHonestyDouble(
      happyHonestyInput({ dirty: true })
    );
    const evalDirty = evaluateHonestyOk(surface, {});
    assert.equal(evalDirty.ok, false);
    assert.ok(
      evalDirty.refuseCodes.includes(CV_REFUSE_CODES.DIRTY_WITHOUT_ACK)
    );
  });

  it('invalid ritualPhase / oversized reasons fail-closed at policy gate', () => {
    const gate = new HudDoctorHonestyRitualPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      ritualPhase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, CV_CODES.INVALID_RITUAL_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: CV_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, CV_CODES.OVERSIZED_REASONS_DENY);
  });
});
