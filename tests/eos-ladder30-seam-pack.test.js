/**
 * Ladder 30 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 30 Sovereign Complexity Ceiling Governance &
 * Maturity Hardening Fabric:
 * - Mission DF (SPEC-0115): Complexity Inventory Re-measure & Ceiling Hold Port (DF-RCPT-*)
 * - Mission DG (SPEC-0116): PO Level-2 Named-Path Disposition Gate Port (DG-RCPT-*)
 * - Mission DH (SPEC-0117): Quarantine / Soft-Remove Execution Port (DH-RCPT-*)
 * - Mission DI (SPEC-0118): Post-Disposition Integrity & Docs SSOT Hold Ritual Port (DI-RCPT-*)
 * - Mission DJ (SPEC-0119): Ladder 30 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement ≠ CloudAgent
 * - L17–L29 CLOSED never reopen; after DJ, L30 CLOSED_FOR_LOCAL_GOVERNED_USE
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 * - Schemas AT_CEILING 35/35 — no new docs/schemas JSON files
 * - Soft-observe freeze pin fb778aa0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ComplexityInventoryRemeasurePort,
  DF_PORT_PRODUCTION_READY,
  DF_PORT_KIND
} from '../src/core/composition/complexity-inventory-remeasure-port.js';
import { DF_CODES } from '../src/core/composition/complexity-inventory-remeasure-policy-gate.js';

import {
  PoL2NamedPathDispositionPort,
  DG_PORT_PRODUCTION_READY,
  DG_PORT_KIND
} from '../src/core/composition/po-l2-named-path-disposition-port.js';
import { DG_CODES } from '../src/core/composition/po-l2-named-path-disposition-policy-gate.js';

import {
  QuarantineExecutionPort,
  DH_PORT_PRODUCTION_READY,
  DH_PORT_KIND
} from '../src/core/composition/quarantine-execution-port.js';
import { DH_CODES } from '../src/core/composition/quarantine-execution-policy-gate.js';

import {
  PostDispositionIntegrityHoldPort,
  DI_PORT_PRODUCTION_READY,
  DI_PORT_KIND
} from '../src/core/composition/post-disposition-integrity-hold-port.js';
import { DI_CODES } from '../src/core/composition/post-disposition-integrity-hold-policy-gate.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER30_SATELLITE_MODULES = [
  'src/core/composition/complexity-inventory-remeasure-port.js',
  'src/core/composition/complexity-inventory-remeasure-receipt.js',
  'src/core/composition/complexity-inventory-remeasure-policy-gate.js',
  'src/core/composition/po-l2-named-path-disposition-port.js',
  'src/core/composition/po-l2-named-path-disposition-receipt.js',
  'src/core/composition/po-l2-named-path-disposition-policy-gate.js',
  'src/core/composition/quarantine-execution-port.js',
  'src/core/composition/quarantine-execution-receipt.js',
  'src/core/composition/quarantine-execution-policy-gate.js',
  'src/core/composition/post-disposition-integrity-hold-port.js',
  'src/core/composition/post-disposition-integrity-hold-receipt.js',
  'src/core/composition/post-disposition-integrity-hold-policy-gate.js'
];

const LADDER30_SATELLITE_SCRIPTS = [
  'test:mission-df',
  'test:mission-dg',
  'test:mission-dh',
  'test:mission-di'
];

const LADDER30_SLIM_EXCLUDES = [
  'eos-df-complexity-inventory-remeasure-port.test.js',
  'eos-dg-po-l2-named-path-disposition-port.test.js',
  'eos-dh-quarantine-execution-port.test.js',
  'eos-di-post-disposition-integrity-hold-port.test.js',
  'eos-ladder30-seam-pack.test.js'
];

const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_30_CLOSEOUT_2026-09-24.md';

test('L30-SEAM-0: Fail-closed if any Ladder 30 satellite module missing', () => {
  for (const rel of LADDER30_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L30-SEAM-1: package.json registers Ladder 30 satellite + seam/pack/mission-dj scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER30_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder30-seam'],
    'node --test tests/eos-ladder30-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:mission-dj'],
    'node --test tests/eos-ladder30-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder30-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder30-pack');
  for (const s of LADDER30_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder30-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder30-seam'), 'ladder30-pack must chain seam');
});

test('L30-SEAM-2: SLIM_SUITE_EXCLUDES holds DF/DG/DH/DI + ladder30 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER30_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L30-SEAM-3: PRODUCTION_READY=NO across DF/DG/DH/DI ports', () => {
  assert.equal(DF_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DG_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DH_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DI_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof DF_PORT_KIND, 'string');
  assert.equal(typeof DG_PORT_KIND, 'string');
  assert.equal(typeof DH_PORT_KIND, 'string');
  assert.equal(typeof DI_PORT_KIND, 'string');
});

test('L30-SEAM-4: Cross-satellite smoke DF → DG → DH → DI (receipt prefixes & chaining)', async () => {
  // Stage 1: DF Complexity Inventory Remeasure
  const dfPort = new ComplexityInventoryRemeasurePort({ preferBuiltinDouble: true });
  const dfResult = await dfPort.govern({
    planId: 'plan-seam-df-01',
    changeId: 'chg.inv.df-001',
    remeasureMode: 'ACTIVE',
    phase: 'compose_remeasure_port',
    observedSurfaces: [
      'POST_L26_INVENTORY:complexity-prune-inventory-observe',
      'ADR_0075_PRUNE_PLAN:po-gated-prune-plan-observe',
      'T6_CEILING_HOLD:complexity-ceiling-hold-observe'
    ],
    reasons: ['hermetic complexity inventory remeasure govern'],
    label: 'happy pass complexity inventory remeasure'
  });
  assert.equal(dfResult.ok, true);
  assert.ok(dfResult.receipt.receiptId.startsWith('DF-RCPT-'));
  assert.equal(dfResult.receipt.fundacionDelta, 0);
  assert.equal(dfResult.receipt.productionReady, 'NO');

  // Stage 2: DG PO Level-2 Named-Path Disposition Gate
  const dgPort = new PoL2NamedPathDispositionPort({ preferBuiltinDouble: true });
  const dgResult = await dgPort.govern({
    planId: 'plan-seam-dg-01',
    changeId: 'chg.disp.dg-001',
    dispositionMode: 'ACTIVE',
    phase: 'compose_disposition_port',
    namedPaths: [
      'src/core/composition/obsolete-helper.js'
    ],
    observedSurfaces: [
      'DF_REMEASURE:complexity-inventory-remeasure-observe',
      'ADR_0075_HITL:po-gated-prune-plan-hitl-observe',
      'AP_HITL:antigravity-hitl-observe'
    ],
    humanGateHeld: true,
    reasons: ['hermetic po-l2 named-path disposition govern'],
    label: 'happy pass po-l2 named-path disposition'
  });
  assert.equal(dgResult.ok, true);
  assert.ok(dgResult.receipt.receiptId.startsWith('DG-RCPT-'));
  assert.equal(dgResult.receipt.fundacionDelta, 0);
  assert.equal(dgResult.receipt.productionReady, 'NO');

  // Stage 3: DH Quarantine / Soft-Remove Execution Port
  const mockFs = {
    files: new Map([['src/core/composition/obsolete-helper.js', 'console.log("sample");']]),
    moves: []
  };
  const dhPort = new QuarantineExecutionPort({ fileSystemDouble: mockFs });
  const dhResult = await dhPort.govern({
    planId: 'plan-seam-dh-01',
    changeId: 'eos-ladder-30-mission-dh',
    executionMode: 'ACTIVE',
    phase: 'EXECUTION',
    dgReceipt: dgResult.receipt,
    quarantinedPaths: ['src/core/composition/obsolete-helper.js']
  });
  assert.equal(dhResult.ok, true);
  assert.ok(dhResult.receipt.receiptId.startsWith('DH-RCPT-'));
  assert.equal(dhResult.receipt.fundacionDelta, 0);
  assert.equal(dhResult.receipt.productionReady, 'NO');
  assert.equal(mockFs.moves.length, 1);

  // Stage 4: DI Post-Disposition Integrity & Docs SSOT Hold Port
  const diPort = new PostDispositionIntegrityHoldPort();
  const diResult = await diPort.govern({
    planId: 'plan-seam-di-01',
    changeId: 'eos-ladder-30-mission-di',
    ritualMode: 'ACTIVE',
    phase: 'EXECUTION',
    dhReceipt: dhResult.receipt,
    integrity: {
      status: 'VERIFIED',
      checksPassed: 914,
      failures: 0
    }
  });
  assert.equal(diResult.ok, true);
  assert.ok(diResult.receipt.receiptId.startsWith('DI-RCPT-'));
  assert.equal(diResult.receipt.fundacionDelta, 0);
  assert.equal(diResult.receipt.productionReady, 'NO');
  assert.equal(diResult.receipt.dhReceiptLink, dhResult.receipt.receiptId);
});

test('L30-SEAM-5: Fundacion deny surfaces exist across DF/DG/DH/DI', async () => {
  const dfDeny = await new ComplexityInventoryRemeasurePort().govern({
    planId: 'fundacion-plan-df',
    changeId: 'eos-ladder-30-mission-df',
    remeasureMode: 'ACTIVE',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(dfDeny.ok, false);
  assert.equal(dfDeny.code, DF_CODES.FUNDACION_ALWAYS_DENY);

  const dgDeny = await new PoL2NamedPathDispositionPort().govern({
    planId: 'fundacion-plan-dg',
    changeId: 'eos-ladder-30-mission-dg',
    dispositionMode: 'ACTIVE',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(dgDeny.ok, false);
  assert.equal(dgDeny.code, DG_CODES.FUNDACION_ALWAYS_DENY);

  const dhDeny = await new QuarantineExecutionPort().govern({
    planId: 'fundacion-plan-dh',
    changeId: 'eos-ladder-30-mission-dh',
    executionMode: 'ACTIVE',
    dgReceipt: { receiptId: 'DG-RCPT-0001', decision: 'PASS', namedPaths: ['Documents/Fundacion/test.js'] },
    quarantinedPaths: ['Documents/Fundacion/test.js']
  });
  assert.equal(dhDeny.ok, false);
  assert.equal(dhDeny.code, DH_CODES.FUNDACION_DENIED);

  const diDeny = await new PostDispositionIntegrityHoldPort().govern({
    planId: 'fundacion-plan-di',
    changeId: 'eos-ladder-30-mission-di',
    ritualMode: 'ACTIVE',
    dhReceipt: { receiptId: 'DH-RCPT-0001', decision: 'PASS' },
    targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\report.txt'
  });
  assert.equal(diDeny.ok, false);
  assert.equal(diDeny.code, DI_CODES.FUNDACION_DENIED);
});

test('L30-SEAM-6: Hard-delete deny surfaces exist across DH and DI', async () => {
  const dhHardDelete = await new QuarantineExecutionPort().govern({
    planId: 'hard-delete-dh',
    changeId: 'eos-ladder-30-mission-dh',
    executionMode: 'ACTIVE',
    dgReceipt: { receiptId: 'DG-RCPT-0001', decision: 'PASS', namedPaths: ['a.js'] },
    quarantinedPaths: ['a.js'],
    forceDelete: true
  });
  assert.equal(dhHardDelete.ok, false);
  assert.equal(dhHardDelete.code, DH_CODES.HARD_DELETE_FORBIDDEN);

  const diHardDelete = await new PostDispositionIntegrityHoldPort().govern({
    planId: 'hard-delete-di',
    changeId: 'eos-ladder-30-mission-di',
    ritualMode: 'ACTIVE',
    dhReceipt: { receiptId: 'DH-RCPT-0001', decision: 'PASS' },
    forceDelete: true
  });
  assert.equal(diHardDelete.ok, false);
  assert.equal(diHardDelete.code, DI_CODES.HARD_DELETE_FORBIDDEN);
});

test('L30-SEAM-7: Closeout doc seals L30 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L29 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL), `${CLOSEOUT_REL} must exist`);
  const doc = read(CLOSEOUT_REL);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI'));
  assert.ok(doc.includes('SPEC-0115') || doc.includes('Mission DF'));
  assert.ok(doc.includes('SPEC-0116') || doc.includes('Mission DG'));
  assert.ok(doc.includes('SPEC-0117') || doc.includes('Mission DH'));
  assert.ok(doc.includes('SPEC-0118') || doc.includes('Mission DI'));
  assert.ok(doc.includes('SPEC-0119') || doc.includes('Mission DJ') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L30 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L29|Ladder 29/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
});
