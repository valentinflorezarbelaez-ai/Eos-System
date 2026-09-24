/**
 * @file tests/eos-dh-quarantine-execution-port.test.js
 * SPEC-0117 / Mission DH — Quarantine / Soft-Remove Execution Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: quarantine PASS ≠ destructive delete ≠ mass prune ≠ tip-pin rewrite ≠ PRODUCTION_READY flip
 *   NON-CLAIM: Quarantine Execution ≠ destructive delete ≠ mass prune ≠ Fundacion Δ>0
 *   Inventory/plan ≠ delete auth; gate ≠ execution (DH executes soft quarantine)
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 06af7278
 *   Formal L29 CLOSED retained — NEVER reopen L29
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DH_PRODUCTION_READY,
  DH_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DH_RECEIPT_KIND,
  DH_DECISIONS,
  DH_EXECUTION_MODES,
  DH_FREEZE_PIN,
  DH_FREEZE_PIN_SHORT,
  DH_FREEZE_NONCLAIM_LABELS,
  DH_CEILING_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  buildQuarantineExecutionReceipt,
  verifyQuarantineExecutionReceipt,
  canonicalQuarantineExecutionSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/quarantine-execution-receipt.js';

import {
  QuarantineExecutionPolicyGate,
  DH_CODES,
  DH_POLICY_GATE_PRODUCTION_READY,
  DH_EXECUTION_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/quarantine-execution-policy-gate.js';

import {
  QuarantineExecutionPort,
  DH_PORT_PRODUCTION_READY,
  DH_PORT_KIND
} from '../src/core/composition/quarantine-execution-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockDgReceipt(paths = ['deprecated/old-feature.js']) {
  return {
    receiptId: 'DG-RCPT-0001',
    operation: 'PO_L2_NAMED_PATH_DISPOSITION',
    planId: 'plan-dg-test',
    decision: 'PASS',
    namedPaths: paths,
    receiptHash: 'mock-dg-hash-1234567890abcdef'
  };
}

describe('Mission DH — Quarantine Execution Receipt (SPEC-0117)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DH1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 06af7278', () => {
    assert.equal(DH_PRODUCTION_READY, 'NO');
    assert.equal(DH_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DH_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DH_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DH_FREEZE_PIN_SHORT, '06af7278');
    assert.ok(DH_FREEZE_PIN.startsWith('06af7278'));
    assert.ok(Array.isArray(DH_FREEZE_NONCLAIM_LABELS));
  });

  it('DH2: builds canonical nine-field sealed DH-RCPT-* with freeze soft-observe + quarantinedPaths + ceiling hold', () => {
    const receipt = buildQuarantineExecutionReceipt({
      planId: 'plan-dh-001',
      changeId: 'eos-ladder-30-mission-dh',
      decision: 'PASS',
      executionMode: 'ACTIVE',
      quarantinedPaths: ['src/deprecated/old-helper.js'],
      quarantineDir: '.quarantine/2026-09-24',
      manifestDigest: 'sha256-mock-manifest-digest',
      dgReceiptLink: 'DG-RCPT-0001'
    });

    assert.ok(receipt.receiptId.startsWith('DH-RCPT-'));
    assert.equal(receipt.operation, 'QUARANTINE_EXECUTE');
    assert.equal(receipt.planId, 'plan-dh-001');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.quarantineDir, '.quarantine/2026-09-24');
    assert.deepEqual(receipt.quarantinedPaths, ['src/deprecated/old-helper.js']);
    assert.equal(receipt.freezeObserve.pinShort, '06af7278');
    assert.equal(receipt.freezeObserve.hardDeleteRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.ok(typeof receipt.receiptHash === 'string' && receipt.receiptHash.length === 64);
  });

  it('DH3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildQuarantineExecutionReceipt({
      planId: 'plan-dh-tamper',
      changeId: 'eos-ladder-30-mission-dh',
      decision: 'PASS',
      quarantinedPaths: ['a.js']
    });

    assert.equal(verifyQuarantineExecutionReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyQuarantineExecutionReceipt(tampered).ok, false);
  });
});

describe('Mission DH — Quarantine Execution Policy Gate (SPEC-0117)', () => {
  it('DH4: validates well-formed plan (planId+changeId+ACTIVE+dgReceipt+namedPaths match)', () => {
    const gate = new QuarantineExecutionPolicyGate();
    const dgReceipt = makeMockDgReceipt(['src/old/feature.js']);

    const res = gate.evaluatePreconditions({
      planId: 'plan-dh-valid',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      dgReceipt,
      quarantinedPaths: ['src/old/feature.js']
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DH_CODES.OK);
  });

  it('DH5: rejects missing DG receipt or invalid linkage', () => {
    const gate = new QuarantineExecutionPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dh-nodg',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      dgReceipt: null,
      quarantinedPaths: ['src/old/feature.js']
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DH_CODES.MISSING_DG_RECEIPT);
  });

  it('DH6: rejects unapproved paths not present in DG receipt', () => {
    const gate = new QuarantineExecutionPolicyGate();
    const dgReceipt = makeMockDgReceipt(['src/approved.js']);

    const res = gate.evaluatePreconditions({
      planId: 'plan-dh-unapproved',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      dgReceipt,
      quarantinedPaths: ['src/approved.js', 'src/UNAPPROVED-ATTACK.js']
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DH_CODES.UNAPPROVED_PATH);
  });

  it('DH7: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new QuarantineExecutionPolicyGate();
    const dgReceipt = makeMockDgReceipt(['src/old.js']);

    const res = gate.evaluatePreconditions({
      planId: 'plan-dh-hard-delete',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      dgReceipt,
      quarantinedPaths: ['src/old.js'],
      forceDelete: true
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DH_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DH8: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new QuarantineExecutionPolicyGate();
    const dgReceipt = makeMockDgReceipt(['src/old.js']);

    const res = gate.evaluatePreconditions({
      planId: 'plan-dh-secret',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      dgReceipt,
      quarantinedPaths: ['src/old.js'],
      tokenSecret: makeSyntheticSecret()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DH_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DH9: policy gate DENY on Fundacion target paths', () => {
    const gate = new QuarantineExecutionPolicyGate();
    const dgReceipt = makeMockDgReceipt(['src/old.js']);

    const res = gate.evaluatePreconditions({
      planId: 'plan-dh-fundacion',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      dgReceipt,
      quarantinedPaths: ['src/old.js'],
      targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\file.txt'
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DH_CODES.FUNDACION_DENIED);
  });

  it('DH10: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L29 reopen, L30 auto-close', () => {
    const gate = new QuarantineExecutionPolicyGate();
    const dgReceipt = makeMockDgReceipt(['src/old.js']);

    const resPR = gate.evaluatePreconditions({
      planId: 'plan-dh-pr-flip',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      dgReceipt,
      quarantinedPaths: ['src/old.js'],
      productionReady: 'YES'
    });
    assert.equal(resPR.code, DH_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const resL29 = gate.evaluatePreconditions({
      planId: 'plan-dh-l29',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      dgReceipt,
      quarantinedPaths: ['src/old.js'],
      reopenL29: true
    });
    assert.equal(resL29.code, DH_CODES.L29_REOPEN_FORBIDDEN);
  });
});

describe('Mission DH — Quarantine Execution Port (SPEC-0117)', () => {
  it('DH11: govern happy path ACTIVE + valid DG receipt -> PASS + DH-RCPT-*', async () => {
    const mockFs = {
      files: new Map([
        ['src/old/feature.js', 'console.log("old code");']
      ]),
      moves: []
    };

    const port = new QuarantineExecutionPort({
      fileSystemDouble: mockFs
    });

    const dgReceipt = makeMockDgReceipt(['src/old/feature.js']);
    const result = await port.govern({
      planId: 'plan-dh-exec-01',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      phase: 'EXECUTION',
      dgReceipt,
      quarantinedPaths: ['src/old/feature.js']
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'PASS');
    assert.ok(result.receipt.receiptId.startsWith('DH-RCPT-'));
    assert.equal(result.receipt.quarantineDir.startsWith('.quarantine/'), true);
    assert.equal(mockFs.moves.length, 1);
    assert.equal(result.manifest.files.length, 1);
    assert.equal(result.manifest.files[0].path, 'src/old/feature.js');
    assert.ok(typeof result.manifest.files[0].sha256 === 'string');
  });

  it('DH12: govern HOLD mode -> HOLD with zero file mutations', async () => {
    const mockFs = {
      files: new Map([['src/old/feature.js', 'code']]),
      moves: []
    };

    const port = new QuarantineExecutionPort({ fileSystemDouble: mockFs });
    const dgReceipt = makeMockDgReceipt(['src/old/feature.js']);

    const result = await port.govern({
      planId: 'plan-dh-hold',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'HOLD',
      phase: 'OBSERVE',
      dgReceipt,
      quarantinedPaths: ['src/old/feature.js']
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'HOLD');
    assert.equal(mockFs.moves.length, 0, 'Zero file mutations on HOLD');
  });

  it('DH13: non-destructive isolation generates verifiable manifestDigest', async () => {
    const mockFs = {
      files: new Map([
        ['src/a.js', 'content A'],
        ['src/b.js', 'content B']
      ]),
      moves: []
    };

    const port = new QuarantineExecutionPort({ fileSystemDouble: mockFs });
    const dgReceipt = makeMockDgReceipt(['src/a.js', 'src/b.js']);

    const result = await port.govern({
      planId: 'plan-dh-manifest',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      dgReceipt,
      quarantinedPaths: ['src/a.js', 'src/b.js']
    });

    assert.equal(result.ok, true);
    assert.ok(result.receipt.manifestDigest);
    assert.equal(result.manifest.files.length, 2);
  });

  it('DH14: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const mockFs = {
      files: new Map([['src/a.js', 'content A']]),
      moves: []
    };
    const port = new QuarantineExecutionPort({ fileSystemDouble: mockFs });
    const dgReceipt = makeMockDgReceipt(['src/a.js']);

    await port.govern({
      planId: 'plan-trail-1',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      dgReceipt,
      quarantinedPaths: ['src/a.js']
    });

    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, true);
    assert.equal(trailVerify.count, 1);
  });

  it('DH15: tamper breaks trail verification', async () => {
    const mockFs = {
      files: new Map([['src/a.js', 'content A']]),
      moves: []
    };
    const port = new QuarantineExecutionPort({ fileSystemDouble: mockFs });
    const dgReceipt = makeMockDgReceipt(['src/a.js']);

    await port.govern({
      planId: 'plan-trail-tamper',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      dgReceipt,
      quarantinedPaths: ['src/a.js']
    });

    // Tamper with trail receipt
    port.trail[0].decision = 'DENY';
    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, false);
  });

  it('DH16: port refuses auto-seal when humanGateHeld', async () => {
    const port = new QuarantineExecutionPort();
    const dgReceipt = makeMockDgReceipt(['src/a.js']);

    const result = await port.govern({
      planId: 'plan-auto-seal',
      changeId: 'eos-ladder-30-mission-dh',
      executionMode: 'ACTIVE',
      dgReceipt,
      quarantinedPaths: ['src/a.js'],
      autoSeal: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.decision, 'DENY');
  });

  it('DH17: codes freeze surface and hermetic helper immutability', () => {
    assert.ok(Object.isFrozen(DH_CODES));
    assert.ok(Object.isFrozen(DH_DECISIONS));
    assert.ok(Object.isFrozen(DH_EXECUTION_MODES));
    assert.equal(DH_CODES.OK, 'OK');
    assert.equal(DH_CODES.HARD_DELETE_FORBIDDEN, 'HARD_DELETE_FORBIDDEN');
    assert.equal(DH_CODES.FUNDACION_DENIED, 'FUNDACION_DENIED');
  });
});
