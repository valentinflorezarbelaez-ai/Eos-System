/**
 * @file tests/eos-df-complexity-inventory-remeasure-port.test.js
 * SPEC-0115 / Mission DF — Complexity Inventory Re-measure & Ceiling Hold Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: remeasure PASS ≠ delete auth ≠ tip-pin rewrite ≠ PRODUCTION_READY flip
 *   NON-CLAIM: Complexity Inventory Re-measure Port ≠ delete authorization ≠
 *              mass prune ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠
 *              GHE ≠ L30 auto-close ≠ L29 reopen ≠ unsupervised delete
 *   Inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A)
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 36c99107 (L30 audit #413) only
 *   Formal L29 CLOSED retained — NEVER reopen L29
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DF_PRODUCTION_READY,
  DF_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DF_RECEIPT_KIND,
  DF_DECISIONS,
  DF_REMEASURE_MODES,
  DF_REQUIRED_OBSERVE_SURFACES,
  DF_FREEZE_PIN,
  DF_FREEZE_PIN_SHORT,
  DF_FREEZE_NONCLAIM_LABELS,
  DF_CEILING_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  buildComplexityInventoryRemeasureReceipt,
  verifyComplexityInventoryRemeasureReceipt,
  canonicalComplexityInventoryRemeasureSealBody,
  normalizeObserveSurfaceLabel,
  _resetReceiptSeqForTests
} from '../src/core/composition/complexity-inventory-remeasure-receipt.js';

import {
  ComplexityInventoryRemeasurePolicyGate,
  DF_CODES,
  DF_MAX_REASONS,
  DF_ID_PATTERN,
  DF_POLICY_GATE_PRODUCTION_READY,
  DF_REMEASURE_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL29Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsDeleteAuth,
  claimsMassPrune,
  isFundacionTarget,
  isTamperedDigest,
  normalizeRemeasurePhase,
  evaluateRequiredObserveSet
} from '../src/core/composition/complexity-inventory-remeasure-policy-gate.js';

import {
  ComplexityInventoryRemeasurePort,
  DF_PORT_PRODUCTION_READY,
  DF_PORT_KIND,
  DF_SAFE_AUTOMATION_IDS,
  DF_REFUSE_CODES,
  decisionForRemeasure,
  builtinComplexityInventoryDouble,
  softImportCeilingSurfaces,
  softObserveFreezeNonClaims,
  softComposeCeilingSurfaces
} from '../src/core/composition/complexity-inventory-remeasure-port.js';

const FREEZE_PIN = '36c99107dfc6696aa8e54533a6a67622f1437fc8';
const FREEZE_PIN_SHORT = '36c99107';

function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45); // "sk-"
  return prefix + 'syntheticTestCredentialKeyForMissionDfRemeasure123';
}

function goodDigest(seed = 'eos-df-complexity-inventory-remeasure') {
  return sha256Canonical(seed);
}

function sampleHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l30-df-001',
    changeId: 'chg.inv.df-001',
    remeasureMode: 'ACTIVE',
    phase: 'compose_remeasure_port',
    observedSurfaces: [
      'POST_L26_INVENTORY:complexity-prune-inventory-observe',
      'ADR_0075_PRUNE_PLAN:po-gated-prune-plan-observe',
      'T6_CEILING_HOLD:complexity-ceiling-hold-observe'
    ],
    reasons: ['hermetic complexity inventory remeasure govern'],
    label: 'happy pass complexity inventory remeasure',
    ...overrides
  };
}

describe('Mission DF — Complexity Inventory Remeasure Receipt (SPEC-0115)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 36c99107', () => {
    assert.equal(DF_PRODUCTION_READY, 'NO');
    assert.equal(DF_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DF_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DF_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DF_FREEZE_PIN, FREEZE_PIN);
    assert.equal(DF_FREEZE_PIN_SHORT, FREEZE_PIN_SHORT);
    assert.ok(DF_FREEZE_PIN.startsWith(FREEZE_PIN_SHORT));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A8_REFUSE_L29_REOPEN'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_GHE_CLAIM'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A10_REFUSE_AUTO_CLOSE_L30'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_DELETE_AUTH'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_PRODUCTION_READY_FLIP'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_MASS_PRUNE'));
    assert.ok(DF_SAFE_AUTOMATION_IDS.includes('A14_HOLD_SCHEMAS_AT_CEILING'));
    assert.deepEqual(
      [...DF_REQUIRED_OBSERVE_SURFACES],
      ['POST_L26_INVENTORY', 'ADR_0075_PRUNE_PLAN', 'T6_CEILING_HOLD']
    );
    assert.ok(DF_FREEZE_NONCLAIM_LABELS.some((l) => /36c99107/.test(l)));
    assert.equal(DF_CEILING_HOLD_TEMPLATE.schemasAtCeiling, true);
  });

  it('builds canonical nine-field sealed DF-RCPT-* with freeze soft-observe + ceiling hold', () => {
    const receipt = buildComplexityInventoryRemeasureReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.demo.1',
      decision: 'PASS',
      remeasureMode: 'ACTIVE',
      phase: 'compose_remeasure_port',
      inventoryDigest: goodDigest('demo'),
      observedSurfaces: [
        'POST_L26_INVENTORY:o',
        'ADR_0075_PRUNE_PLAN:o',
        'T6_CEILING_HOLD:o'
      ],
      inventoryOk: true,
      ceilingHoldOk: true,
      honestyOk: true,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, DF_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('DF-RCPT-'));
    assert.match(receipt.receiptId, /^DF-RCPT-/);
    assert.equal(receipt.planId, 'plan-demo');
    assert.equal(receipt.changeId, 'chg.demo.1');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.remeasureMode, 'ACTIVE');
    assert.equal(receipt.inventoryOk, true);
    assert.equal(receipt.freezeObserve.readOnly, true);
    assert.equal(receipt.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(receipt.freezeObserve.pin, FREEZE_PIN);
    assert.equal(receipt.freezeObserve.deleteAuthRefused, true);
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
    assert.equal(receipt.nonClaims.inventoryIsDeleteAuth, false);

    const body = canonicalComplexityInventoryRemeasureSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);
    assert.ok('inventoryDigest' in body);

    const verifyRes = verifyComplexityInventoryRemeasureReceipt(receipt);
    assert.equal(verifyRes.ok, true);

    const forced = forceFreezeObserve({
      pin: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      readOnly: false,
      deleteAuth: true
    });
    assert.equal(forced.pin, FREEZE_PIN);
    assert.equal(forced.readOnly, true);
    assert.equal(forced.deleteAuthRefused, true);
    assert.ok(forced.refusal);

    const ceiling = forceCeilingHold({ schemasAtCeiling: false });
    assert.equal(ceiling.schemasAtCeiling, true);
  });

  it('detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildComplexityInventoryRemeasureReceipt({
      operation: 'GOVERN',
      planId: 'plan-demo',
      changeId: 'chg.t',
      decision: 'PASS',
      remeasureMode: 'ACTIVE',
      inventoryDigest: goodDigest('t')
    });
    const tampered = { ...receipt, planId: 'plan-tampered-hacked' };
    const verifyRes = verifyComplexityInventoryRemeasureReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission DF — Complexity Inventory Remeasure Policy Gate (SPEC-0115)', () => {
  let gate;

  beforeEach(() => {
    gate = new ComplexityInventoryRemeasurePolicyGate();
  });

  it('validates well-formed plan (planId+changeId+ACTIVE+phase+POST_L26/ADR_0075/T6 observe)', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, DF_CODES.PLAN_VALID_OK);
    assert.equal(res.planId, 'plan-l30-df-001');
    assert.equal(res.changeId, 'chg.inv.df-001');
    assert.equal(res.remeasureMode, 'ACTIVE');
    assert.equal(res.phase, 'compose_remeasure_port');
    assert.equal(res.observeOk, true);
    assert.deepEqual(res.observedSurfaceCodes, [
      'POST_L26_INVENTORY',
      'ADR_0075_PRUNE_PLAN',
      'T6_CEILING_HOLD'
    ]);
    assert.ok(DF_ID_PATTERN.test('plan-l30-df-001'));
    assert.ok(DF_MAX_REASONS >= 1);
    assert.ok(DF_REMEASURE_MODES.includes('ACTIVE'));
    assert.ok(DF_REMEASURE_MODES.includes('HOLD'));
    assert.ok(DF_REMEASURE_PHASES.includes('compose_remeasure_port'));
    assert.equal(normalizeRemeasurePhase('compose'), 'compose_remeasure_port');
    assert.equal(
      normalizeObserveSurfaceLabel('POST_L26_INVENTORY:observe'),
      'POST_L26_INVENTORY'
    );
    assert.equal(
      evaluateRequiredObserveSet([
        'POST_L26_INVENTORY',
        'ADR_0075_PRUNE_PLAN',
        'T6_CEILING_HOLD'
      ]).ok,
      true
    );
  });

  it('DENY secrets / Fundacion / tip rewrite / PRODUCTION_READY flip / L29 reopen / delete-auth / mass-prune', () => {
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
      DF_CODES.SECRET_DETECTED_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        target: 'Documents/Fundacion/notes'
      }).code,
      DF_CODES.FUNDACION_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        tipPinRewrite: true
      }).code,
      DF_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'claim PRODUCTION_READY=YES'
      }).code,
      DF_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        label: 'reopen ladder 29'
      }).code,
      DF_CODES.L29_REOPEN_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        deleteAuthorization: true
      }).code,
      DF_CODES.DELETE_AUTH_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        massPrune: true
      }).code,
      DF_CODES.MASS_PRUNE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoCloseL30: true
      }).code,
      DF_CODES.AUTO_CLOSE_L30_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      DF_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        FUNDACION_ALWAYS_DENY: false
      }).code,
      DF_CODES.WEAKEN_ALWAYS_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedSurfaces: undefined,
        inventoryDigest: '0'.repeat(64)
      }).code,
      DF_CODES.TAMPERED_DIGEST_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhe: true
      }).code,
      DF_CODES.GHE_CLAIM_DENY
    );
  });

  it('rejects empty / missing planId / changeId / remeasureMode / phase; missing required surfaces', () => {
    assert.equal(gate.evaluatePlan({}).code, DF_CODES.EMPTY_PLAN_DENY);
    assert.equal(
      gate.evaluatePlan({
        changeId: 'chg-1',
        inventoryDigest: goodDigest('x'),
        remeasureMode: 'HOLD',
        phase: 'hold_observe'
      }).code,
      DF_CODES.MISSING_PLAN_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        inventoryDigest: goodDigest('x'),
        remeasureMode: 'ACTIVE',
        phase: 'compose_remeasure_port',
        observedSurfaces: [
          'POST_L26_INVENTORY:o',
          'ADR_0075_PRUNE_PLAN:o',
          'T6_CEILING_HOLD:o'
        ]
      }).code,
      DF_CODES.MISSING_CHANGE_ID_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        planId: 'plan-1',
        changeId: 'chg-1',
        inventoryDigest: goodDigest('x'),
        phase: 'compose_remeasure_port',
        observedSurfaces: [
          'POST_L26_INVENTORY:o',
          'ADR_0075_PRUNE_PLAN:o',
          'T6_CEILING_HOLD:o'
        ]
      }).code,
      DF_CODES.MISSING_REMEASURE_MODE_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedSurfaces: ['DA:observe']
      }).code,
      DF_CODES.MISSING_REQUIRED_OBSERVE_SURFACES_DENY
    );
  });

  it('rejects PRODUCTION_READY flip / auto-seal / auto-close L30 / GHE / tip-pin freezeObserve / tampered digest', () => {
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
      DF_CODES.PRODUCTION_READY_FLIP_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoSeal: true
      }).code,
      DF_CODES.AUTO_SEAL_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        autoCloseL30: true
      }).code,
      DF_CODES.AUTO_CLOSE_L30_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        claimGhe: true
      }).code,
      DF_CODES.GHE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        freezeObserve: { pin: '00'.repeat(20), readOnly: false }
      }).code,
      DF_CODES.TIP_PIN_REWRITE_CLAIM_DENY
    );
    assert.equal(
      gate.evaluatePlan({
        ...sampleHappyPlan(),
        observedSurfaces: undefined,
        inventoryDigest: '0'.repeat(64)
      }).code,
      DF_CODES.TAMPERED_DIGEST_DENY
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

describe('Mission DF — Complexity Inventory Remeasure Port (SPEC-0115)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('govern happy path ACTIVE + POST_L26/ADR_0075/T6 observe → PASS + DF-RCPT-*', async () => {
    const port = new ComplexityInventoryRemeasurePort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(sampleHappyPlan());
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'PASS');
    assert.equal(out.code, DF_CODES.GOVERN_PASS);
    assert.equal(out.remeasureMode, 'ACTIVE');
    assert.equal(out.phase, 'compose_remeasure_port');
    assert.equal(out.inventoryOk, true);
    assert.equal(out.ceilingHoldOk, true);
    assert.equal(out.honestyOk, true);
    assert.ok(out.receipt.receiptId.startsWith('DF-RCPT-'));
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(out.freezeObserve.readOnly, true);
    assert.equal(out.freezeObserve.deleteAuthRefused, true);
    assert.equal(out.ceilingHold.schemasAtCeiling, true);
    assert.deepEqual(out.observedSurfaceCodes, [
      'POST_L26_INVENTORY',
      'ADR_0075_PRUNE_PLAN',
      'T6_CEILING_HOLD'
    ]);
    assert.ok(
      out.safeAutomationIds.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY')
    );
    assert.ok(out.safeAutomationIds.includes('A7_REFUSE_TIP_PIN_REWRITE'));
    assert.ok(out.safeAutomationIds.includes('A10_REFUSE_AUTO_CLOSE_L30'));
    assert.ok(out.safeAutomationIds.includes('A11_REFUSE_DELETE_AUTH'));
    assert.ok(out.safeAutomationIds.includes('A14_HOLD_SCHEMAS_AT_CEILING'));
    assert.equal(port.getDecision('plan-l30-df-001').decision, 'PASS');
  });

  it('HOLD remeasureMode → HOLD (observe; freeze soft-observe only — ≠ tip rewrite ≠ delete)', async () => {
    const port = new ComplexityInventoryRemeasurePort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-hold-1',
        remeasureMode: 'HOLD',
        observedSurfaces: undefined,
        inventoryDigest: goodDigest('hold-1'),
        phase: 'hold_observe'
      })
    );
    assert.equal(out.ok, true);
    assert.equal(out.decision, 'HOLD');
    assert.equal(out.code, DF_CODES.GOVERN_HOLD);
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(out.ceilingHold.schemasAtCeiling, true);
    assert.equal(
      decisionForRemeasure('HOLD', { observeOk: false, honestyOk: false }),
      'HOLD'
    );
  });

  it('DENY delete-auth / mass-prune / tip rewrite / PR flip / Fundacion / L29 reopen / secrets / L30 auto-close', async () => {
    const port = new ComplexityInventoryRemeasurePort({
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
    assert.equal(del.code, DF_CODES.DELETE_AUTH_CLAIM_DENY);
    assert.equal(del.deleteAuthRefused, true);
    assert.equal(del.humanGateHeld, true);

    const mass = await port.govern(
      sampleHappyPlan({
        planId: 'plan-mass',
        massPrune: true
      })
    );
    assert.equal(mass.decision, 'DENY');
    assert.equal(mass.code, DF_CODES.MASS_PRUNE_CLAIM_DENY);
    assert.equal(mass.massPruneRefused, true);

    const tip = await port.govern(
      sampleHappyPlan({
        planId: 'plan-tip',
        tipPinRewrite: true
      })
    );
    assert.equal(tip.decision, 'DENY');
    assert.equal(tip.code, DF_CODES.TIP_PIN_REWRITE_CLAIM_DENY);
    assert.equal(tip.tipPinRewriteRefused, true);

    const prod = await port.govern(
      sampleHappyPlan({
        planId: 'plan-prod',
        label: 'flip PRODUCTION_READY to YES'
      })
    );
    assert.equal(prod.decision, 'DENY');
    assert.equal(prod.code, DF_CODES.PRODUCTION_READY_FLIP_DENY);
    assert.equal(prod.autoProductionFlipRefused, true);
    assert.equal(prod.humanGateHeld, true);

    const fund = await port.govern(
      sampleHappyPlan({
        planId: 'plan-fund',
        target: 'Documents/Fundacion/ledger'
      })
    );
    assert.equal(fund.decision, 'DENY');
    assert.equal(fund.code, DF_CODES.FUNDACION_ALWAYS_DENY);

    const reopen = await port.govern(
      sampleHappyPlan({
        planId: 'plan-reopen',
        label: 'reopen L29'
      })
    );
    assert.equal(reopen.decision, 'DENY');
    assert.equal(reopen.code, DF_CODES.L29_REOPEN_CLAIM_DENY);
    assert.equal(reopen.l29ReopenRefused, true);

    const secret = await port.govern(
      sampleHappyPlan({
        planId: 'plan-secret',
        label: makeSyntheticSecret()
      })
    );
    assert.equal(secret.decision, 'DENY');
    assert.equal(secret.code, DF_CODES.SECRET_DETECTED_DENY);

    const l30 = await port.govern(
      sampleHappyPlan({
        planId: 'plan-l30',
        autoCloseL30: true
      })
    );
    assert.equal(l30.decision, 'DENY');
    assert.equal(l30.code, DF_CODES.AUTO_CLOSE_L30_CLAIM_DENY);
    assert.equal(l30.autoCloseL30Refused, true);

    const autoSeal = await port.govern(
      sampleHappyPlan({
        planId: 'plan-autoseal',
        autoSeal: true
      })
    );
    assert.equal(autoSeal.decision, 'DENY');
    assert.equal(autoSeal.code, DF_CODES.AUTO_SEAL_CLAIM_DENY);
    assert.equal(autoSeal.autoSealRefused, true);
  });

  it('freeze pin soft-observe 36c99107; ceiling hold schemas AT_CEILING; inventory≠delete', async () => {
    const port = new ComplexityInventoryRemeasurePort({
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
    assert.equal(out.receipt.nonClaims.inventoryIsDeleteAuth, false);
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.ok(out.freezeObserve.pin.startsWith(FREEZE_PIN_SHORT));
    assert.equal(out.ceilingHold.schemasAtCeiling, true);
    assert.equal(out.ceilingHold.slimHold, true);
    assert.ok(
      out.reasons.some((r) =>
        /≠ tip-pin|NON-CLAIM|36c99107|soft-observe|delete auth|AT_CEILING/i.test(
          r
        )
      )
    );

    const dbl = builtinComplexityInventoryDouble({
      observedSurfaces: [
        'POST_L26_INVENTORY:o',
        'ADR_0075_PRUNE_PLAN:o',
        'T6_CEILING_HOLD:o'
      ]
    });
    assert.equal(dbl.PRODUCTION_READY, 'NO');
    assert.equal(dbl.freeze_observe.pinShort, FREEZE_PIN_SHORT);
    assert.equal(dbl.ceiling_hold.schemasAtCeiling, true);
    assert.ok(Array.isArray(dbl.non_claim_chips));
    assert.ok(
      dbl.non_claim_chips.some((c) => /inventory.*≠.*delete|delete auth/i.test(c))
    );

    const softFreeze = softObserveFreezeNonClaims();
    assert.equal(softFreeze.readOnly, true);
    assert.equal(softFreeze.pinShort, FREEZE_PIN_SHORT);
    assert.equal(softFreeze.deleteAuthRefused, true);

    assert.equal(DF_PORT_KIND, 'eos-complexity-inventory-remeasure-port');
    assert.ok(DF_DECISIONS.includes('PASS'));
    assert.ok(DF_DECISIONS.includes('DENY'));
    assert.ok(DF_DECISIONS.includes('HOLD'));
  });

  it('soft-import ceiling surfaces fixtures when absent; evaluate aliases govern', async () => {
    const soft = await softImportCeilingSurfaces(
      '/workspace/eos-mission-da/src/core/composition/control-plane-observability-aggregation-port.js'
    );
    // soft-import may succeed if DA present, or null → fixture path
    if (soft) {
      assert.ok(
        soft.source === 'soft-import' ||
          soft.source === 'soft-import-da-receipt'
      );
      assert.equal(soft.INVENTORY_PRODUCTION_READY, 'NO');
    }

    const composed = softComposeCeilingSurfaces();
    assert.equal(composed.source, 'fixture-default');
    assert.ok(composed.labels.length >= 3);
    assert.ok(composed.fixtures.POST_L26_INVENTORY);
    assert.ok(composed.fixtures.ADR_0075_PRUNE_PLAN);
    assert.ok(composed.fixtures.T6_CEILING_HOLD);

    const port = new ComplexityInventoryRemeasurePort({
      preferBuiltinDouble: true
    });
    const out = await port.evaluate(
      sampleHappyPlan({ planId: 'plan-eval-1', changeId: 'chg-eval-1' })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.ok, true);
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(out.freezeObserve.pinShort, FREEZE_PIN_SHORT);
    assert.equal(out.inventoryOk, true);
  });

  it('verifyTrail validates DF receipt chain; tamper breaks trail', async () => {
    const port = new ComplexityInventoryRemeasurePort({
      preferBuiltinDouble: true
    });
    await port.govern(
      sampleHappyPlan({ planId: 'plan-t1', changeId: 'chg-t1' })
    );
    await port.govern(
      sampleHappyPlan({
        planId: 'plan-t2',
        changeId: 'chg-t2',
        remeasureMode: 'HOLD',
        observedSurfaces: undefined,
        inventoryDigest: goodDigest('t2'),
        phase: 'hold_observe'
      })
    );
    const ok = port.verifyTrail();
    assert.equal(ok.valid, true);
    assert.equal(ok.code, DF_CODES.TRAIL_OK);
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
    assert.equal(bad.code, DF_CODES.TRAIL_BREAK);
  });

  it('port green ≠ L30 auto-close; remeasure PASS ≠ tip rewrite ≠ delete auth; PRODUCTION_READY remains NO', async () => {
    const port = new ComplexityInventoryRemeasurePort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-nonclose',
        observedSurfaces: [
          'POST_L26_INVENTORY:MEASURED-label',
          'ADR_0075_PRUNE_PLAN:MEASURED-label',
          'T6_CEILING_HOLD:MEASURED-label',
          'DA:label'
        ]
      })
    );
    assert.equal(out.decision, 'PASS');
    assert.equal(out.receipt.productionReady, 'NO');
    assert.equal(DF_PRODUCTION_READY, 'NO');
    assert.equal(DF_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(out.receipt.fundacionDelta, 0);
    assert.equal(out.receipt.nonClaims.l30Closeout, false);
    assert.equal(out.receipt.nonClaims.l30AutoClose, false);
    assert.equal(out.receipt.nonClaims.l29Reopen, false);
    assert.equal(out.receipt.nonClaims.tipRefresh, false);
    assert.equal(out.receipt.nonClaims.tipPinRewrite, false);
    assert.equal(out.receipt.nonClaims.deleteAuthorization, false);
    assert.equal(out.receipt.meta.freezePin, FREEZE_PIN_SHORT);
    assert.equal(out.receipt.meta.schemasAtCeiling, true);

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
        DF_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES
      ) ||
        incomplete.code === DF_CODES.INVENTORY_REFUSE_DENY ||
        incomplete.code === DF_CODES.MISSING_REQUIRED_OBSERVE_SURFACES_DENY
    );
  });

  it('invalid phase / oversized reasons fail-closed at policy gate', () => {
    const gate = new ComplexityInventoryRemeasurePolicyGate();
    const badPhase = gate.evaluatePlan({
      ...sampleHappyPlan(),
      phase: 'not-a-real-phase'
    });
    assert.equal(badPhase.valid, false);
    assert.equal(badPhase.code, DF_CODES.INVALID_PHASE_DENY);

    const oversized = gate.evaluatePlan({
      ...sampleHappyPlan(),
      reasons: Array.from({ length: DF_MAX_REASONS + 1 }, (_, i) => `r${i}`)
    });
    assert.equal(oversized.valid, false);
    assert.equal(oversized.code, DF_CODES.OVERSIZED_REASONS_DENY);
  });

  it('DF-RCPT id pattern enforced; refuse auto-seal leaves humanGateHeld', async () => {
    const sealed = buildComplexityInventoryRemeasureReceipt({
      decision: 'PASS',
      remeasureMode: 'ACTIVE',
      inventoryDigest: goodDigest('id-pattern')
    });
    assert.match(sealed.receiptId, /^DF-RCPT-[0-9]{8}-[0-9]{4}$/);
    const v = verifyComplexityInventoryRemeasureReceipt(sealed);
    assert.equal(v.ok, true);

    const port = new ComplexityInventoryRemeasurePort({
      preferBuiltinDouble: true
    });
    const out = await port.govern(
      sampleHappyPlan({
        planId: 'plan-refuse-autoseal',
        autoSeal: true
      })
    );
    assert.equal(out.decision, 'DENY');
    assert.equal(out.code, DF_CODES.AUTO_SEAL_CLAIM_DENY);
    assert.equal(out.autoSealRefused, true);
    assert.equal(out.humanGateHeld, true);
    assert.ok(out.receipt.receiptId.startsWith('DF-RCPT-'));
  });
});
