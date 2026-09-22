/**
 * @file tests/eos-dg-po-l2-named-path-disposition-port.test.js
 * SPEC-0116 / Mission DG — PO Level-2 Named-Path Disposition Gate Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: disposition PASS ≠ delete execution ≠ tip-pin rewrite ≠ PRODUCTION_READY flip
 *   NON-CLAIM: PO L2 Named-Path Disposition Gate ≠ unsupervised delete ≠
 *              mass prune ≠ auto-approve deletes ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠
 *              Fundacion write ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent
 *   Inventory/plan ≠ delete auth; gate ≠ execution (DH executes later)
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 31f811ca (Mission DF #415) only
 *   Formal L29 CLOSED retained — NEVER reopen L29
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DG_PRODUCTION_READY,
  DG_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DG_RECEIPT_KIND,
  DG_DECISIONS,
  DG_DISPOSITION_MODES,
  DG_REQUIRED_OBSERVE_SURFACES,
  DG_FREEZE_PIN,
  DG_FREEZE_PIN_SHORT,
  DG_FREEZE_NONCLAIM_LABELS,
  DG_CEILING_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  buildPoL2NamedPathDispositionReceipt,
  verifyPoL2NamedPathDispositionReceipt,
  canonicalPoL2NamedPathDispositionSealBody,
  normalizeObserveSurfaceLabel,
  normalizeNamedPaths,
  _resetReceiptSeqForTests
} from '../src/core/composition/po-l2-named-path-disposition-receipt.js';

import {
  PoL2NamedPathDispositionPolicyGate,
  DG_CODES,
  DG_MAX_REASONS,
  DG_ID_PATTERN,
  DG_POLICY_GATE_PRODUCTION_READY,
  DG_DISPOSITION_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsAutoApprove,
  claimsL29Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsDeleteAuth,
  claimsMassPrune,
  isFundacionTarget,
  isTamperedDigest,
  normalizeDispositionPhase,
  evaluateRequiredObserveSet
} from '../src/core/composition/po-l2-named-path-disposition-policy-gate.js';

import {
  PoL2NamedPathDispositionPort,
  DG_PORT_PRODUCTION_READY,
  DG_PORT_KIND,
  DG_SAFE_AUTOMATION_IDS,
  DG_REFUSE_CODES,
  decisionForDisposition,
  builtinPoL2NamedPathDispositionDouble,
  softImportDfHitlSurfaces,
  softObserveFreezeNonClaims,
  softComposeHitlSurfaces
} from '../src/core/composition/po-l2-named-path-disposition-port.js';

const FREEZE_PIN = '31f811caf7ff28cc25aa9ac87add0e45f4abf650';
const FREEZE_PIN_SHORT = '31f811ca';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionDgDisposition123';
}

function goodDigest(seed = 'eos-dg-po-l2-named-path-disposition') {
  return sha256Canonical(seed);
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l30-dg-001',
    changeId: 'chg.disp.dg-001',
    dispositionMode: 'ACTIVE',
    phase: 'compose_disposition_port',
    namedPaths: [
      'src/core/composition/obsolete-helper.js',
      'tests/legacy/obsolete-helper.test.js'
    ],
    observedSurfaces: [
      'DF_REMEASURE:complexity-inventory-remeasure-observe',
      'ADR_0075_HITL:po-gated-prune-plan-hitl-observe',
      'AP_HITL:antigravity-hitl-observe'
    ],
    humanGateHeld: true,
    reasons: ['hermetic po-l2 named-path disposition govern'],
    label: 'happy pass po-l2 named-path disposition',
    ...overrides
  };
}

describe('Mission DG — PO L2 Named-Path Disposition Receipt (SPEC-0116)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 31f811ca', () => {
    assert.equal(DG_PRODUCTION_READY, 'NO');
    assert.equal(DG_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DG_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DG_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DG_FREEZE_PIN, FREEZE_PIN);
    assert.equal(DG_FREEZE_PIN_SHORT, FREEZE_PIN_SHORT);
    assert.ok(DG_FREEZE_PIN.startsWith(FREEZE_PIN_SHORT));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_L29_REOPEN'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_GHE_CLAIM'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A10_REFUSE_AUTO_CLOSE_L30'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_DELETE_AUTH'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_PRODUCTION_READY_FLIP'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_MASS_PRUNE'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A14_HOLD_SCHEMAS_AT_CEILING'));
    assert.ok(
      DG_SAFE_AUTOMATION_IDS.includes('A15_REFUSE_AUTO_APPROVE_WITHOUT_NAMED_PATHS')
    );
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A16_REQUIRE_NAMED_PATHS_FOR_ACTIVE'));
    assert.ok(DG_SAFE_AUTOMATION_IDS.includes('A17_GATE_NOT_EXECUTION'));
    assert.deepEqual(
      [...DG_REQUIRED_OBSERVE_SURFACES],
      ['DF_REMEASURE', 'ADR_0075_HITL', 'AP_HITL']
    );
    assert.ok(DG_FREEZE_NONCLAIM_LABELS.some((l) => /31f811ca/.test(l)));
    assert.equal(DG_CEILING_HOLD_TEMPLATE.schemasAtCeiling, true);
  });

  it('builds canonical nine-field sealed DG-RCPT-* with freeze soft-observe + namedPaths + ceiling hold', () => {
    const receipt = buildPoL2NamedPathDispositionReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      dispositionMode: 'ACTIVE',
      phase: 'compose_disposition_port',
      dispositionDigest: goodDigest('demo'),
      namedPaths: ['src/a.js', 'tests/a.test.js'],
      observedSurfaces: [
        'DF_REMEASURE:o',
        'ADR_0075_HITL:o',
        'AP_HITL:o'
      ],
      dispositionOk: true,
      ceilingHoldOk: true,
      honestyOk: true,
      humanGateHeld: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, DG_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('DG-RCPT-'));
    assert.match(receipt.receiptId, /^DG-RCPT-/);
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.dispositionMode, 'ACTIVE');
    assert.equal(receipt.dispositionOk, true);
    assert.deepEqual([...receipt.namedPaths], ['src/a.js', 'tests/a.test.js']);
    assert.equal(receipt.freezeObserve.readOnly, true);
    assert.equal(receipt.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(receipt.freezeObserve.pin, FREEZE_PIN);
    assert.equal(receipt.freezeObserve.deleteAuthRefused, true);
    assert.equal(receipt.freezeObserve.autoApproveRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.ceilingHold.slimHold, true);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionReadyFlip, false);
    assert.equal(receipt.nonClaims.l29Reopen, false);
    assert.equal(receipt.nonClaims.tipPinRewrite, false);
    assert.equal(receipt.nonClaims.ghe, false);
    assert.equal(receipt.nonClaims.l30AutoClose, false);
    assert.equal(receipt.nonClaims.deleteAuthorization, false);
    assert.equal(receipt.nonClaims.massPrune, false);
    assert.equal(receipt.nonClaims.autoApproveDeletes, false);
    assert.equal(receipt.nonClaims.gateIsExecution, false);
    assert.equal(receipt.nonClaims.inventoryIsDeleteAuth, false);
    assert.equal(receipt.humanGateHeld, true);

    const body = canonicalPoL2NamedPathDispositionSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);
    assert.ok('dispositionDigest' in body);

    const verifyRes = verifyPoL2NamedPathDispositionReceipt(receipt);
    assert.equal(verifyRes.ok, true);

    const forced = forceFreezeObserve({
      pin: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      readOnly: false,
      deleteAuth: true,
      autoApprove: true
    });
    assert.equal(forced.pin, FREEZE_PIN);
    assert.equal(forced.readOnly, true);
    assert.equal(forced.deleteAuthRefused, true);
    assert.equal(forced.autoApproveRefused, true);
    assert.ok(forced.refusal);

    const ceiling = forceCeilingHold({ schemasAtCeiling: false });
    assert.equal(ceiling.schemasAtCeiling, true);

    const np = normalizeNamedPaths(['src/a.js', 'src/a.js', 'Documents/Fundacion/x']);
    assert.deepEqual(np.normalized, ['src/a.js']);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildPoL2NamedPathDispositionReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      dispositionMode: 'ACTIVE',
      namedPaths: ['src/t.js'],
      dispositionDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyPoL2NamedPathDispositionReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch|receiptHash/);
  });
});

describe('Mission DG — PO L2 Named-Path Disposition Policy Gate (SPEC-0116)', () => {
  let gate;

  beforeEach(() => {
    gate = new PoL2NamedPathDispositionPolicyGate();
  });

  it('validates well-formed plan (planId+changeId+ACTIVE+phase+namedPaths+DF/ADR_0075/AP observe)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, DG_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l30-dg-001');
    assert.equal(res.changeId, 'chg.disp.dg-001');
    assert.equal(res.dispositionMode, 'ACTIVE');
    assert.equal(res.phase, 'compose_disposition_port');
    assert.equal(res.observeOk, true);
    assert.ok(res.namedPaths.length >= 2);
    assert.deepEqual(res.observedSurfaceCodes, [
      'DF_REMEASURE',
      'ADR_0075_HITL',
      'AP_HITL'
    ]);
    assert.ok(DG_ID_PATTERN.test('plan-l30-dg-001'));
    assert.ok(DG_MAX_REASONS >= 1);
    assert.ok(DG_DISPOSITION_MODES.includes('ACTIVE'));
    assert.ok(DG_DISPOSITION_MODES.includes('HOLD'));
    assert.ok(DG_DISPOSITION_PHASES.includes('compose_disposition_port'));
    assert.equal(normalizeDispositionPhase('compose'), 'compose_disposition_port');
    assert.equal(
      normalizeObserveSurfaceLabel('DF_REMEASURE:observe'),
      'DF_REMEASURE'
    );
    assert.equal(
      evaluateRequiredObserveSet([
        'DF_REMEASURE',
        'ADR_0075_HITL',
        'AP_HITL'
      ]).ok,
      true
    );
  });

  it('DENY secrets / Fundacion / tip rewrite / PRODUCTION_READY flip / L29 reopen / delete-auth / mass-prune / auto-approve / empty namedPaths ACTIVE', () => {
    assert.equal(scanForSecrets({ note: makeSyntheticSecret() }), true);
    assert.equal(isFundacionTarget('Documents/Fundacion/ledger'), true);
    assert.equal(isFundacionTarget('src/core/composition'), false);
    assert.equal(
      claimsWeakenAlwaysDeny({ label: 'FUNDACION_ALWAYS_DENY=false' }),
      true
    );
    assert.equal(claimsL29Reopen({ label: 'reopen L29' }), true);
    assert.equal(
      claimsTipPinRewrite({ label: 'tip pin rewrite freeze main_tip' }),
      true
    );
    assert.equal(claimsTipRewrite({ label: 'rewrite freeze tip pin' }), true);
    assert.equal(claimsDeleteAuth({ label: 'grant delete authorization' }), true);
    assert.equal(claimsMassPrune({ label: 'execute mass prune now' }), true);
    assert.equal(claimsAutoApprove({ label: 'auto-approve deletes' }), true);
    assert.equal(
      claimsProductionReadyFlip({ label: 'flip PRODUCTION_READY to YES' }),
      true
    );
    assert.equal(claimsAutoSeal({ label: 'auto-seal without human' }), true);
    assert.equal(claimsGhe({ label: 'GHE enforcement enable' }), true);
    assert.equal(isTamperedDigest('0'.repeat(64)), true);

    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: makeSyntheticSecret()
      }).code,
      DG_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      DG_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        tipPinRewrite: true
      }).code,
      DG_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'claim PRODUCTION_READY=YES'
      }).code,
      DG_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 29'
      }).code,
      DG_CODES.L29_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        deleteAuthorization: true
      }).code,
      DG_CODES.DELETE_AUTH_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        massPrune: true
      }).code,
      DG_CODES.MASS_PRUNE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoCloseL30: true
      }).code,
      DG_CODES.AUTO_CLOSE_L30_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      DG_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoApprove: true
      }).code,
      DG_CODES.AUTO_APPROVE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        namedPaths: []
      }).code,
      DG_CODES.EMPTY_NAMED_PATHS_ACTIVE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      DG_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedSurfaces: undefined,
        namedPaths: ['src/a.js'],
        dispositionDigest: '0'.repeat(64)
      }).code,
      DG_CODES.TAMPERED_DIGEST_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhe: true
      }).code,
      DG_CODES.GHE_CLAIM_DENY
    );
  });

  it('rejects empty / missing planId / changeId / dispositionMode / phase; missing required surfaces', () => {
    assert.equal(gate.evaluatePlan({}).code, DG_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        dispositionDigest: goodDigest('x'),
        dispositionMode: 'HOLD',
        phase: 'hold_observe'
      }).code,
      DG_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        dispositionDigest: goodDigest('x'),
        dispositionMode: 'ACTIVE',
        phase: 'compose_disposition_port',
        namedPaths: ['src/a.js'],
        observedSurfaces: [
          'DF_REMEASURE:o',
          'ADR_0075_HITL:o',
          'AP_HITL:o'
        ]
      }).code,
      DG_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        dispositionDigest: goodDigest('x'),
        phase: 'compose_disposition_port',
        namedPaths: ['src/a.js'],
        observedSurfaces: [
          'DF_REMEASURE:o',
          'ADR_0075_HITL:o',
          'AP_HITL:o'
        ]
      }).code,
      DG_CODES.MISSING_DISPOSITION_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedSurfaces: ['DA:observe']
      }).code,
      DG_CODES.MISSING_REQUIRED_OBSERVE_SURFACES_DENY
    );
  });

  it('rejects PRODUCTION_READY flip / auto-seal / auto-close L30 / GHE / tip-pin freezeObserve / tampered digest / auto-approve without namedPaths', () => {
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
      DG_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      DG_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoCloseL30: true
      }).code,
      DG_CODES.AUTO_CLOSE_L30_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhe: true
      }).code,
      DG_CODES.GHE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        freezeObserve: { pin: '00'.repeat(20), readOnly: false }
      }).code,
      DG_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedSurfaces: undefined,
        dispositionDigest: '0'.repeat(64)
      }).code,
      DG_CODES.TAMPERED_DIGEST_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        namedPaths: [],
        autoApprove: true,
        dispositionDigest: goodDigest('aa'),
        observedSurfaces: undefined
      }).code,
      DG_CODES.AUTO_APPROVE_WITHOUT_NAMED_PATHS_DENY
    );
  });

  it('ackMissingObserveSurfaces allows incomplete set at gate but observeOk stays false', () => {
    const acked = gate.evaluatePlan({
      ...sampleHappyPlan(),
      observedSurfaces: ['DA:observe'],
      ackMissingObserveSurfaces: true
    });
    assert.equal(acked.valid, true);
    assert.equal(acked.observeOk, false);
    assert.ok(acked.missingObserveSurfaces.length >= 1);
  });
});

describe('Mission DG — PO L2 Named-Path Disposition Port (SPEC-0116)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + namedPaths + DF/ADR_0075/AP observe → PASS + DG-RCPT-* (≠ delete execution)', async () => {
    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, DG_CODES.GOVERN_PASS);
    assert.equal(out.dispositionMode, 'ACTIVE');
    assert.equal(out.phase, 'compose_disposition_port');
    assert.equal(out.dispositionOk, true);
    assert.equal(out.ceilingHoldOk, true);
    assert.equal(out.honestyOk, true);
    assert.ok(out.namedPaths.length >= 2);
    assert.ok(out.receipt.receiptId.startsWith('DG-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(out.freezeObserve.readOnly, true);
    assert.equal(out.freezeObserve.deleteAuthRefused, true);
    assert.equal(out.freezeObserve.autoApproveRefused, true);
    assert.equal(out.ceilingHold.schemasAtCeiling, true);
    assert.equal(out.humanGateHeld, true);
    assert.deepEqual(out.observedSurfaceCodes, [
      'DF_REMEASURE',
      'ADR_0075_HITL',
      'AP_HITL'
    ]);
    assert.ok(
      out.safeAutomationIds.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(out.safeAutomationIds.includes('A10_REFUSE_AUTO_CLOSE_L30'));
    assert.ok(out.safeAutomationIds.includes('A11_REFUSE_DELETE_AUTH'));
    assert.ok(out.safeAutomationIds.includes('A14_HOLD_SCHEMAS_AT_CEILING'));
    assert.ok(out.safeAutomationIds.includes('A17_GATE_NOT_EXECUTION'));
    assert.equal(out.receipt.nonClaims.gateIsExecution, false);
    assert.equal(port.getDecision('plan-l30-dg-001').decision, 'PASS');
  });

  it('HOLD dispositionMode → HOLD (observe; freeze soft-observe only — ≠ tip rewrite ≠ delete)', async () => {
    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        dispositionMode: 'HOLD',
        namedPaths: undefined,
        observedSurfaces: undefined,
        dispositionDigest: goodDigest('hold-1'),
        phase: 'hold_observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, DG_CODES.GOVERN_HOLD);
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(out.ceilingHold.schemasAtCeiling, true);
    assert.equal(
      decisionForDisposition('HOLD', { ok: false }, []),
      'HOLD'
    );
  });

  it('DENY delete-auth / mass-prune / tip rewrite / PR flip / Fundacion / L29 reopen / secrets / L30 auto-close / auto-approve / empty namedPaths', async () => {
    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });

    const del = await port.govern(
      sampleHappyPlan({
        planId: 'plan-del',
        deleteAuthorization: true
      })
    );
    assert.equal(del.ok, false);
    assert.equal(del.decision, 'DENY');
    assert.equal(del.code, DG_CODES.DELETE_AUTH_CLAIM_DENY);
    assert.equal(del.deleteAuthRefused, true);
    assert.equal(del.humanGateHeld, true);

    const mass = await port.govern(
      sampleHappyPlan({
        planId: 'plan-mass',
        massPrune: true
      })
    );
    assert.equal(mass.decision, 'DENY');
    assert.equal(mass.code, DG_CODES.MASS_PRUNE_CLAIM_DENY);
    assert.equal(mass.massPruneRefused, true);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipPinRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, DG_CODES.TIP_PIN_REWRITE_CLAIM_DENY);
    assert.equal(tip.tipPinRewriteRefused, true);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, DG_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, DG_CODES.FUNDACION_ALWAYS_DENY);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L29'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, DG_CODES.L29_REOPEN_CLAIM_DENY);
    assert.equal(reopen.l29ReopenRefused, true);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, DG_CODES.SECRET_DETECTED_DENY);

    const l30 = await port.govern(
      sampleHappyPlan({
        planId: 'plan-l30',
        autoCloseL30: true
      })
    );
    assert.equal(l30.decision, 'DENY');
    assert.equal(l30.code, DG_CODES.AUTO_CLOSE_L30_CLAIM_DENY);
    assert.equal(l30.autoCloseL30Refused, true);

    const autoSeal = await port.govern(
      sampleHappyPlan({
        planId: 'plan-autoseal',
        autoSeal: true
      })
    );
    assert.equal(autoSeal.decision, 'DENY');
    assert.equal(autoSeal.code, DG_CODES.AUTO_SEAL_CLAIM_DENY);
    assert.equal(autoSeal.autoSealRefused, true);

    const autoApprove = await port.govern(
      sampleHappyPlan({
        planId: 'plan-autoapprove',
        autoApprove: true
      })
    );
    assert.equal(autoApprove.decision, 'DENY');
    assert.equal(autoApprove.code, DG_CODES.AUTO_APPROVE_CLAIM_DENY);
    assert.equal(autoApprove.autoApproveRefused, true);
    assert.equal(autoApprove.humanGateHeld, true);

    const emptyNamed = await port.govern(
      sampleHappyPlan({
        planId: 'plan-empty-named',
        namedPaths: []
      })
    );
    assert.equal(emptyNamed.decision, 'DENY');
    assert.equal(emptyNamed.code, DG_CODES.EMPTY_NAMED_PATHS_ACTIVE_DENY);
  });

  it('freeze pin soft-observe 31f811ca; ceiling hold schemas AT_CEILING; gate≠execution; namedPaths sealed', async () => {
    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan({ planId: 'plan-nc' }));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.nonClaims.productionReadyFlip, false);
    assert.equal(out.receipt.nonClaims.l29Reopen, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.nonClaims.ghe, false);
    assert.equal(out.receipt.nonClaims.l30AutoClose, false);
    assert.equal(out.receipt.nonClaims.deleteAuthorization, false);
    assert.equal(out.receipt.nonClaims.massPrune, false);
    assert.equal(out.receipt.nonClaims.autoApproveDeletes, false);
    assert.equal(out.receipt.nonClaims.gateIsExecution, false);
    assert.equal(out.receipt.nonClaims.inventoryIsDeleteAuth, false);
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.ok(out.freezeObserve.pin.startsWith(FREEZE_PIN_SHORT));
    assert.equal(out.ceilingHold.schemasAtCeiling, true);
    assert.equal(out.ceilingHold.slimHold, true);
    assert.ok(out.namedPaths.length >= 1);
    assert.ok(
      out.reasons.some((r) =>
        /≠ tip-pin|NON-CLAIM|31f811ca|soft-observe|delete|AT_CEILING|gate|execution/i.test(
          r
        )
      )
    );

    const dbl = builtinPoL2NamedPathDispositionDouble({
      observedSurfaces: [
        'DF_REMEASURE:o',
        'ADR_0075_HITL:o',
        'AP_HITL:o'
      ],
      namedPaths: ['src/x.js']
    });
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.freeze_observe.pinShort, FREEZE_PIN_SHORT);
    assert.equal(dbl.ceiling_hold.schemasAtCeiling, true);
    assert.ok(Array.isArray(dbl.non_claim_chips));
    assert.ok(
      dbl.non_claim_chips.some((c) =>
        /gate.*≠.*execution|delete execution|namedPaths/i.test(c)
      )
    );

    const softFreeze = softObserveFreezeNonClaims();
    assert.equal(softFreeze.readOnly, true);
    assert.equal(softFreeze.pinShort, FREEZE_PIN_SHORT);
    assert.equal(softFreeze.deleteAuthRefused, true);
    assert.equal(softFreeze.autoApproveRefused, true);

    assert.equal(DG_PORT_KIND, 'eos-po-l2-named-path-disposition-port');
    assert.ok(DG_DECISIONS.includes('PASS'));
    assert.ok(DG_DECISIONS.includes('DENY'));
    assert.ok(DG_DECISIONS.includes('HOLD'));
  });

  it('soft-import DF/HITL surfaces fixtures when absent; evaluate aliases govern; soft-observe DF inventoryDigest', async () => {
    const soft = await softImportDfHitlSurfaces(
      '/workspace/eos-mission-df/src/core/composition/complexity-inventory-remeasure-port.js'
    );
    if (soft) {
      assert.ok(
        soft.source === 'soft-import-df' ||
          soft.source === 'soft-import-df-receipt' ||
          soft.source === 'soft-import-da' ||
          soft.source === 'soft-import'
      );
      assert.equal(soft.DISPOSITION_PRODUCTION_READY, 'NO');
    }

    const composed = softComposeHitlSurfaces();
    assert.equal(composed.source, 'fixture-default');
    assert.ok(composed.labels.length >= 3);
    assert.ok(composed.fixtures.DF_REMEASURE);
    assert.ok(composed.fixtures.ADR_0075_HITL);
    assert.ok(composed.fixtures.AP_HITL);

    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({
        planId: 'plan-eval-1',
        changeId: 'chg-eval-1',
        dfInventoryDigest: goodDigest('df-inventory-observe')
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(out.dispositionOk, true);
    assert.equal(out.dfInventoryDigest, goodDigest('df-inventory-observe'));
  });

  it('verifyTrail validates DG receipt chain; tamper breaks trail', async () => {
    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });
    await port.govern(
      sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' })
    );
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        dispositionMode: 'HOLD',
        namedPaths: undefined,
        observedSurfaces: undefined,
        dispositionDigest: goodDigest('t2'),
        phase: 'hold_observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, DG_CODES.TRAIL_OK);
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
    assert.equal(bad.code, DG_CODES.TRAIL_BREAK);
  });

  it('port green ≠ L30 auto-close; disposition PASS ≠ tip rewrite ≠ delete execution; PRODUCTION_READY remains NO', async () => {
    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-nonclose',
        observedSurfaces: [
          'DF_REMEASURE:MEASURED-label',
          'ADR_0075_HITL:MEASURED-label',
          'AP_HITL:MEASURED-label',
          'DA:label'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(DG_PRODUCTION_READY, 'NO');
    assert.equal(DG_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l30Closeout, false);
    assert.equal(out.receipt.nonClaims.l30AutoClose, false);
    assert.equal(out.receipt.nonClaims.l29Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.nonClaims.deleteAuthorization, false);
    assert.equal(out.receipt.nonClaims.gateIsExecution, false);
    assert.equal(out.receipt.meta.freezePin, FREEZE_PIN_SHORT);
    assert.equal(out.receipt.meta.schemasAtCeiling, true);
    assert.equal(out.receipt.meta.gateNotExecution, true);

    // Ack of incomplete required set cannot promote to PASS
    const incomplete = await port.govern(
      sampleHappyPlan({
        planId: 'plan-ack-incomplete',
        observedSurfaces: ['DA:observe'],
        ackMissingObserveSurfaces: true
      })
    );
    assert.equal(incomplete.decision, 'DENY');
    assert.ok(
      incomplete.refuseCodes.includes(
        DG_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES
      ) ||
        incomplete.code === DG_CODES.DISPOSITION_REFUSE_DENY ||
        incomplete.code === DG_CODES.MISSING_REQUIRED_OBSERVE_SURFACES_DENY
    );
  });

  it('invalid phase / oversized reasons fail-closed at policy gate', () => {
    const gate = new PoL2NamedPathDispositionPolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      phase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, DG_CODES.INVALID_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: DG_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, DG_CODES.OVERSIZED_REASONS_DENY);
  });

  it('DG-RCPT id pattern enforced; refuse auto-approve leaves humanGateHeld; gate≠execution', async () => {
    const sealed = buildPoL2NamedPathDispositionReceipt({
      decision: 'PASS',
      dispositionMode: 'ACTIVE',
      namedPaths: ['src/id.js'],
      dispositionDigest: goodDigest('id-pattern'),
      humanGateHeld: true
    });
    assert.match(sealed.receiptId, /^DG-RCPT-[0-9]{8}-[0-9]{4}$/);
    const v = verifyPoL2NamedPathDispositionReceipt(sealed);
    assert.equal(v.ok, true);

    const port = new PoL2NamedPathDispositionPort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-refuse-autoapprove',
        autoApprove: true
      })
    );
    assert.equal(out.decision, 'DENY');
    assert.equal(out.code, DG_CODES.AUTO_APPROVE_CLAIM_DENY);
    assert.equal(out.autoApproveRefused, true);
    assert.equal(out.humanGateHeld, true);
    assert.ok(out.receipt.receiptId.startsWith('DG-RCPT-'));
    assert.equal(out.receipt.nonClaims.gateIsExecution, false);
  });
});
