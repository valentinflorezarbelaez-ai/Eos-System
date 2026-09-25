/**
 * Ladder 32 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 32 Sovereign Screaming Architecture &
 * Deterministic Agentic Execution Fabric:
 * - Mission DP (SPEC-0126): Sovereign Vertical Slice & Screaming Architecture Port (DP-RCPT-*)
 * - Mission DQ (SPEC-0127): Autonomous Property-Based Generative Fuzzing Port (DQ-RCPT-*)
 * - Mission DR (SPEC-0128): Deterministic Autonomous Execution Loop Controller Port (DR-RCPT-*)
 * - Mission DS (SPEC-0129): Contract-First Formal Data Contract Notary Port (DS-RCPT-*)
 * - Mission DT (SPEC-0130): Ladder 32 CI Seam-Pack Consolidation & Closeout (DT-RCPT-*)
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement ≠ CloudAgent
 * - L17–L31 CLOSED never reopen; after DT, L32 CLOSED_FOR_LOCAL_GOVERNED_USE
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 * - Schemas AT_CEILING 35/35 — no new docs/schemas JSON files
 * - Soft-observe freeze pin fce84743
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  VerticalSlicePort,
  DP_PORT_PRODUCTION_READY,
  DP_PORT_KIND
} from '../src/core/composition/vertical-slice-port.js';
import { DP_CODES } from '../src/core/composition/vertical-slice-policy-gate.js';

import {
  PropertyFuzzingPort,
  DQ_PORT_PRODUCTION_READY,
  DQ_PORT_KIND
} from '../src/core/composition/property-fuzzing-port.js';
import { DQ_CODES } from '../src/core/composition/property-fuzzing-policy-gate.js';

import {
  ExecutionLoopControllerPort,
  DR_PORT_PRODUCTION_READY,
  DR_PORT_KIND
} from '../src/core/composition/execution-loop-controller-port.js';
import { DR_CODES } from '../src/core/composition/execution-loop-controller-policy-gate.js';

import {
  DataContractNotaryPort,
  DS_PORT_PRODUCTION_READY,
  DS_PORT_KIND
} from '../src/core/composition/data-contract-notary-port.js';
import { DS_CODES } from '../src/core/composition/data-contract-notary-policy-gate.js';

import {
  Ladder32SeamPort,
  DT_PORT_PRODUCTION_READY,
  DT_PORT_KIND
} from '../src/core/composition/ladder32-seam-port.js';
import { DT_CODES } from '../src/core/composition/ladder32-seam-policy-gate.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER32_SATELLITE_MODULES = [
  'src/core/composition/vertical-slice-port.js',
  'src/core/composition/vertical-slice-receipt.js',
  'src/core/composition/vertical-slice-policy-gate.js',
  'src/core/composition/property-fuzzing-port.js',
  'src/core/composition/property-fuzzing-receipt.js',
  'src/core/composition/property-fuzzing-policy-gate.js',
  'src/core/composition/execution-loop-controller-port.js',
  'src/core/composition/execution-loop-controller-receipt.js',
  'src/core/composition/execution-loop-controller-policy-gate.js',
  'src/core/composition/data-contract-notary-port.js',
  'src/core/composition/data-contract-notary-receipt.js',
  'src/core/composition/data-contract-notary-policy-gate.js',
  'src/core/composition/ladder32-seam-port.js',
  'src/core/composition/ladder32-seam-receipt.js',
  'src/core/composition/ladder32-seam-policy-gate.js'
];

const LADDER32_SATELLITE_SCRIPTS = [
  'test:mission-dp',
  'test:mission-dq',
  'test:mission-dr',
  'test:mission-ds'
];

const LADDER32_SLIM_EXCLUDES = [
  'eos-dp-vertical-slice-port.test.js',
  'eos-dq-property-fuzzing-port.test.js',
  'eos-dr-execution-loop-controller-port.test.js',
  'eos-ds-data-contract-notary-port.test.js',
  'eos-ladder32-seam-pack.test.js'
];

const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_32_CLOSEOUT_2026-09-24.md';

test('L32-SEAM-0: Fail-closed if any Ladder 32 satellite module missing', () => {
  for (const rel of LADDER32_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L32-SEAM-1: package.json registers Ladder 32 satellite + seam/pack/mission-dt scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER32_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder32-seam'],
    'node --test tests/eos-ladder32-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:mission-dt'],
    'node --test tests/eos-ladder32-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder32-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder32-pack');
  for (const s of LADDER32_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder32-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder32-seam'), 'ladder32-pack must chain seam');
});

test('L32-SEAM-2: SLIM_SUITE_EXCLUDES holds DP/DQ/DR/DS + ladder32 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER32_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L32-SEAM-3: PRODUCTION_READY=NO across DP/DQ/DR/DS/DT ports', () => {
  assert.equal(DP_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DQ_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DR_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DS_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DT_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof DP_PORT_KIND, 'string');
  assert.equal(typeof DQ_PORT_KIND, 'string');
  assert.equal(typeof DR_PORT_KIND, 'string');
  assert.equal(typeof DS_PORT_KIND, 'string');
  assert.equal(typeof DT_PORT_KIND, 'string');
});

test('L32-SEAM-4: Cross-satellite smoke DP → DQ → DR → DS → DT (receipt prefixes & chaining)', async () => {
  // Stage 1: DP Vertical Slice Screaming Architecture Port
  const dpPort = new VerticalSlicePort();
  const dpResult = await dpPort.govern({
    planId: 'plan-seam-dp-01',
    changeId: 'eos-ladder-32-mission-dp',
    ritualMode: 'ACTIVE',
    sliceReport: {
      sliceName: 'BillingSlice',
      publicPorts: ['IBillingService'],
      internalModules: ['billing-calculator.js'],
      leakageCount: 0,
      timestamp: new Date().toISOString()
    }
  });
  assert.equal(dpResult.ok, true);
  assert.equal(dpResult.decision, 'PASS');
  assert.ok(dpResult.receipt.receiptId.startsWith('DP-RCPT-'));

  // Stage 2: DQ Generative Property Fuzzing Port
  const dqPort = new PropertyFuzzingPort();
  const dqResult = await dqPort.govern({
    planId: 'plan-seam-dq-01',
    changeId: 'eos-ladder-32-mission-dq',
    ritualMode: 'ACTIVE',
    fuzzReport: {
      propertiesTested: 10,
      iterationsCount: 150,
      counterexamplesCount: 0,
      counterexamples: [],
      propertyStatus: 'VERIFIED',
      timestamp: new Date().toISOString()
    }
  });
  assert.equal(dqResult.ok, true);
  assert.equal(dqResult.decision, 'PASS');
  assert.ok(dqResult.receipt.receiptId.startsWith('DQ-RCPT-'));

  // Stage 3: DR Execution Loop Controller Port
  const drPort = new ExecutionLoopControllerPort();
  const drResult = await drPort.govern({
    planId: 'plan-seam-dr-01',
    changeId: 'eos-ladder-32-mission-dr',
    ritualMode: 'ACTIVE',
    loopReport: {
      loopIteration: 1,
      fromState: 'QUALITY_AUDIT',
      toState: 'VERIFIED',
      allChecksPassed: true,
      timestamp: new Date().toISOString()
    }
  });
  assert.equal(drResult.ok, true);
  assert.equal(drResult.decision, 'PASS');
  assert.ok(drResult.receipt.receiptId.startsWith('DR-RCPT-'));

  // Stage 4: DS Data Contract Notary Port
  const dsPort = new DataContractNotaryPort();
  const dsResult = await dsPort.govern({
    planId: 'plan-seam-ds-01',
    changeId: 'eos-ladder-32-mission-ds',
    ritualMode: 'ACTIVE',
    contractReport: {
      contractName: 'UserOrderContract',
      schemaVersion: '1.2.0',
      status: 'VALIDATED',
      schemaDriftDetected: false,
      uncontractedFieldsCount: 0,
      hasUncontractedFields: false,
      validationErrors: [],
      timestamp: new Date().toISOString()
    }
  });
  assert.equal(dsResult.ok, true);
  assert.equal(dsResult.decision, 'PASS');
  assert.ok(dsResult.receipt.receiptId.startsWith('DS-RCPT-'));

  // Stage 5: DT Ladder 32 Seam-Pack Consolidation
  const dtPort = new Ladder32SeamPort();
  const dtResult = await dtPort.govern({
    planId: 'plan-seam-dt-01',
    changeId: 'eos-ladder-32-mission-dt',
    seamMode: 'ACTIVE',
    dpReceiptLink: dpResult.receipt,
    dqReceiptLink: dqResult.receipt,
    drReceiptLink: drResult.receipt,
    dsReceiptLink: dsResult.receipt
  });

  assert.equal(dtResult.ok, true);
  assert.equal(dtResult.decision, 'PASS');
  assert.ok(dtResult.receipt.receiptId.startsWith('DT-RCPT-'));
  assert.equal(dtResult.receipt.fundacionDelta, 0);
  assert.equal(dtResult.receipt.productionReady, 'NO');
  assert.equal(dtResult.receipt.seamHold.ladder32Consolidated, true);
  assert.equal(dtResult.receipt.seamHold.closedForLocalGovernedUse, true);
  assert.equal(dtPort.verifyTrail().ok, true);
});

test('L32-SEAM-5: Seam port rejects missing upstream receipts', async () => {
  const dtPort = new Ladder32SeamPort();
  const res = await dtPort.govern({
    planId: 'plan-dt-missing',
    changeId: 'eos-ladder-32-mission-dt',
    seamMode: 'ACTIVE'
  });
  assert.equal(res.ok, false);
  assert.equal(res.decision, 'DENY');
  assert.equal(res.code, DT_CODES.MISSING_UPSTREAM_RECEIPTS);
});

test('L32-SEAM-6: Seam port rejects failing upstream receipt', async () => {
  const dtPort = new Ladder32SeamPort();
  const res = await dtPort.govern({
    planId: 'plan-dt-bad-upstream',
    changeId: 'eos-ladder-32-mission-dt',
    seamMode: 'ACTIVE',
    dpReceiptLink: { receiptId: 'DP-RCPT-0001', decision: 'DENY', productionReady: 'NO', fundacionDelta: 0 },
    dqReceiptLink: { receiptId: 'DQ-RCPT-0001', decision: 'PASS', productionReady: 'NO', fundacionDelta: 0 },
    drReceiptLink: { receiptId: 'DR-RCPT-0001', decision: 'PASS', productionReady: 'NO', fundacionDelta: 0 },
    dsReceiptLink: { receiptId: 'DS-RCPT-0001', decision: 'PASS', productionReady: 'NO', fundacionDelta: 0 }
  });
  assert.equal(res.ok, false);
  assert.equal(res.decision, 'DENY');
  assert.equal(res.code, DT_CODES.INVALID_UPSTREAM_RECEIPT);
});

test('L32-SEAM-7: Seam port supports HOLD mode without mutations', async () => {
  const dtPort = new Ladder32SeamPort();
  const res = await dtPort.govern({
    planId: 'plan-dt-hold',
    changeId: 'eos-ladder-32-mission-dt',
    seamMode: 'HOLD'
  });
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'HOLD');
  assert.equal(res.receipt.decision, 'HOLD');
});

test('L32-SEAM-8: Policy gate rejects Fundacion write target', async () => {
  const dtPort = new Ladder32SeamPort();
  const res = await dtPort.govern({
    planId: 'plan-dt-fundacion',
    changeId: 'eos-ladder-32-mission-dt',
    target: 'c:\\Users\\valen\\Documents\\Fundacion\\src'
  });
  assert.equal(res.ok, false);
  assert.equal(res.decision, 'DENY');
  assert.equal(res.code, DT_CODES.FUNDACION_DENIED);
});

test('L32-SEAM-9: Policy gate rejects plain secret tokens (Law VI)', async () => {
  const dtPort = new Ladder32SeamPort();
  const secret = String.fromCharCode(115, 107, 45) + 'fake-token-12345678901234567890';
  const res = await dtPort.govern({
    planId: 'plan-dt-secret',
    changeId: 'eos-ladder-32-mission-dt',
    apiKey: secret
  });
  assert.equal(res.ok, false);
  assert.equal(res.decision, 'DENY');
  assert.equal(res.code, DT_CODES.SECRET_LEAK_FORBIDDEN);
});

test('L32-SEAM-10: Policy gate rejects hard delete & mass prune', async () => {
  const dtPort = new Ladder32SeamPort();
  const resDel = await dtPort.govern({
    planId: 'plan-dt-del',
    changeId: 'eos-ladder-32-mission-dt',
    forceDelete: true
  });
  assert.equal(resDel.ok, false);
  assert.equal(resDel.code, DT_CODES.HARD_DELETE_FORBIDDEN);

  const resPrune = await dtPort.govern({
    planId: 'plan-dt-prune',
    changeId: 'eos-ladder-32-mission-dt',
    massPrune: true
  });
  assert.equal(resPrune.ok, false);
  assert.equal(resPrune.code, DT_CODES.MASS_PRUNE_FORBIDDEN);
});

test('L32-SEAM-11: Policy gate rejects PRODUCTION_READY flip, tip rewrite, L30/L31/L32 reopen', async () => {
  const dtPort = new Ladder32SeamPort();

  const resPR = await dtPort.govern({
    planId: 'plan-dt-pr',
    changeId: 'eos-ladder-32-mission-dt',
    productionReady: 'YES'
  });
  assert.equal(resPR.ok, false);
  assert.equal(resPR.code, DT_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

  const resTip = await dtPort.govern({
    planId: 'plan-dt-tip',
    changeId: 'eos-ladder-32-mission-dt',
    action: 'rewrite git tip force push'
  });
  assert.equal(resTip.ok, false);
  assert.equal(resTip.code, DT_CODES.TIP_REWRITE_FORBIDDEN);

  const resL30 = await dtPort.govern({
    planId: 'plan-dt-l30',
    changeId: 'eos-ladder-32-mission-dt',
    note: 'reopen ladder-30'
  });
  assert.equal(resL30.ok, false);
  assert.equal(resL30.code, DT_CODES.L30_REOPEN_FORBIDDEN);

  const resL31 = await dtPort.govern({
    planId: 'plan-dt-l31',
    changeId: 'eos-ladder-32-mission-dt',
    note: 'reopen ladder-31'
  });
  assert.equal(resL31.ok, false);
  assert.equal(resL31.code, DT_CODES.L31_REOPEN_FORBIDDEN);

  const resL32 = await dtPort.govern({
    planId: 'plan-dt-l32',
    changeId: 'eos-ladder-32-mission-dt',
    note: 'reopen ladder-32 after closeout'
  });
  assert.equal(resL32.ok, false);
  assert.equal(resL32.code, DT_CODES.L32_REOPEN_FORBIDDEN);
});

test('L32-SEAM-12: Closeout documentation exists and locks Ladder 32 as CLOSED_FOR_LOCAL_GOVERNED_USE', () => {
  assert.ok(exists(CLOSEOUT_REL), `Closeout doc missing: ${CLOSEOUT_REL}`);
  const content = read(CLOSEOUT_REL);
  assert.ok(content.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'), 'Must declare CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.ok(content.includes('PRODUCTION_READY'), 'Must declare PRODUCTION_READY');
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(content), 'Must preserve PRODUCTION_READY: NO');
  assert.ok(content.includes('Fundacion') && content.includes('Δ=0'), 'Must preserve Fundacion Δ=0');
  assert.ok(content.includes('AT_CEILING') || content.includes('35/35'), 'Must preserve AT_CEILING 35/35');
});
