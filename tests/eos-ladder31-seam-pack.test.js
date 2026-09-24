/**
 * Ladder 31 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 31 Sovereign Autonomous Verification &
 * Epistemic Hardening Fabric:
 * - Mission DK (SPEC-0121): SpecBoot Mutation Testing Gatekeeper Port (DK-RCPT-*)
 * - Mission DL (SPEC-0122): Adversarial Invariant Refuter Port (DL-RCPT-*)
 * - Mission DM (SPEC-0123): Hexagonal Architecture Boundary Isolation Port (DM-RCPT-*)
 * - Mission DN (SPEC-0124): Sovereign Epistemic Knowledge Ledger Port (DN-RCPT-*)
 * - Mission DO (SPEC-0125): Ladder 31 CI Seam-Pack Consolidation & Closeout (DO-RCPT-*)
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement ≠ CloudAgent
 * - L17–L30 CLOSED never reopen; after DO, L31 CLOSED_FOR_LOCAL_GOVERNED_USE
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 * - Schemas AT_CEILING 35/35 — no new docs/schemas JSON files
 * - Soft-observe freeze pin 8a4db2c3
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  SpecbootMutationGatekeeperPort,
  DK_PORT_PRODUCTION_READY,
  DK_PORT_KIND
} from '../src/core/composition/specboot-mutation-gatekeeper-port.js';
import { DK_CODES } from '../src/core/composition/specboot-mutation-gatekeeper-policy-gate.js';

import {
  AdversarialInvariantRefuterPort,
  DL_PORT_PRODUCTION_READY,
  DL_PORT_KIND
} from '../src/core/composition/adversarial-invariant-refuter-port.js';
import { DL_CODES } from '../src/core/composition/adversarial-invariant-refuter-policy-gate.js';

import {
  HexagonalBoundaryIsolationPort,
  DM_PORT_PRODUCTION_READY,
  DM_PORT_KIND
} from '../src/core/composition/hexagonal-boundary-isolation-port.js';
import { DM_CODES } from '../src/core/composition/hexagonal-boundary-isolation-policy-gate.js';

import {
  SovereignEpistemicLedgerPort,
  DN_PORT_PRODUCTION_READY,
  DN_PORT_KIND
} from '../src/core/composition/sovereign-epistemic-ledger-port.js';
import { DN_CODES } from '../src/core/composition/sovereign-epistemic-ledger-policy-gate.js';

import {
  Ladder31SeamPort,
  DO_PORT_PRODUCTION_READY,
  DO_PORT_KIND
} from '../src/core/composition/ladder31-seam-port.js';
import { DO_CODES } from '../src/core/composition/ladder31-seam-policy-gate.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER31_SATELLITE_MODULES = [
  'src/core/composition/specboot-mutation-gatekeeper-port.js',
  'src/core/composition/specboot-mutation-gatekeeper-receipt.js',
  'src/core/composition/specboot-mutation-gatekeeper-policy-gate.js',
  'src/core/composition/adversarial-invariant-refuter-port.js',
  'src/core/composition/adversarial-invariant-refuter-receipt.js',
  'src/core/composition/adversarial-invariant-refuter-policy-gate.js',
  'src/core/composition/hexagonal-boundary-isolation-port.js',
  'src/core/composition/hexagonal-boundary-isolation-receipt.js',
  'src/core/composition/hexagonal-boundary-isolation-policy-gate.js',
  'src/core/composition/sovereign-epistemic-ledger-port.js',
  'src/core/composition/sovereign-epistemic-ledger-receipt.js',
  'src/core/composition/sovereign-epistemic-ledger-policy-gate.js',
  'src/core/composition/ladder31-seam-port.js',
  'src/core/composition/ladder31-seam-receipt.js',
  'src/core/composition/ladder31-seam-policy-gate.js'
];

const LADDER31_SATELLITE_SCRIPTS = [
  'test:mission-dk',
  'test:mission-dl',
  'test:mission-dm',
  'test:mission-dn'
];

const LADDER31_SLIM_EXCLUDES = [
  'eos-dk-specboot-mutation-gatekeeper-port.test.js',
  'eos-dl-adversarial-invariant-refuter-port.test.js',
  'eos-dm-hexagonal-boundary-isolation-port.test.js',
  'eos-dn-sovereign-epistemic-ledger-port.test.js',
  'eos-ladder31-seam-pack.test.js'
];

const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_31_CLOSEOUT_2026-09-24.md';

test('L31-SEAM-0: Fail-closed if any Ladder 31 satellite module missing', () => {
  for (const rel of LADDER31_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L31-SEAM-1: package.json registers Ladder 31 satellite + seam/pack/mission-do scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER31_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder31-seam'],
    'node --test tests/eos-ladder31-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:mission-do'],
    'node --test tests/eos-ladder31-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder31-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder31-pack');
  for (const s of LADDER31_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder31-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder31-seam'), 'ladder31-pack must chain seam');
});

test('L31-SEAM-2: SLIM_SUITE_EXCLUDES holds DK/DL/DM/DN + ladder31 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER31_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L31-SEAM-3: PRODUCTION_READY=NO across DK/DL/DM/DN/DO ports', () => {
  assert.equal(DK_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DL_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DM_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DN_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DO_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof DK_PORT_KIND, 'string');
  assert.equal(typeof DL_PORT_KIND, 'string');
  assert.equal(typeof DM_PORT_KIND, 'string');
  assert.equal(typeof DN_PORT_KIND, 'string');
  assert.equal(typeof DO_PORT_KIND, 'string');
});

test('L31-SEAM-4: Cross-satellite smoke DK → DL → DM → DN → DO (receipt prefixes & chaining)', async () => {
  // Stage 1: DK SpecBoot Mutation Testing Gatekeeper
  const dkPort = new SpecbootMutationGatekeeperPort();
  const dkResult = await dkPort.govern({
    planId: 'plan-seam-dk-01',
    changeId: 'chg.mut.dk-001',
    ritualMode: 'ACTIVE',
    phase: 'MUTATION_ANALYZE',
    mutationReport: {
      status: 'VERIFIED',
      totalMutants: 12,
      killedMutants: 12,
      survivedMutants: 0,
      mutationScore: 100
    },
    reasons: ['hermetic mutation gatekeeper govern'],
    label: 'happy pass mutation gatekeeper'
  });
  assert.equal(dkResult.ok, true);
  assert.ok(dkResult.receipt.receiptId.startsWith('DK-RCPT-'));
  assert.equal(dkResult.receipt.fundacionDelta, 0);
  assert.equal(dkResult.receipt.productionReady, 'NO');

  // Stage 2: DL Adversarial Invariant Refuter
  const dlPort = new AdversarialInvariantRefuterPort();
  const dlResult = await dlPort.govern({
    planId: 'plan-seam-dl-01',
    changeId: 'chg.adv.dl-001',
    ritualMode: 'ACTIVE',
    phase: 'ADVERSARIAL_ATTACK',
    refutationReport: {
      invariantsTested: 8,
      chaosVectorsApplied: 24,
      unhandledBreaches: 0,
      resilienceStatus: 'RESILIENT',
      warningsCount: 0
    },
    reasons: ['hermetic adversarial refuter govern'],
    label: 'happy pass adversarial refuter'
  });
  assert.equal(dlResult.ok, true);
  assert.ok(dlResult.receipt.receiptId.startsWith('DL-RCPT-'));
  assert.equal(dlResult.receipt.fundacionDelta, 0);
  assert.equal(dlResult.receipt.productionReady, 'NO');

  // Stage 3: DM Hexagonal Architecture Boundary Isolation
  const dmPort = new HexagonalBoundaryIsolationPort();
  const dmResult = await dmPort.govern({
    planId: 'plan-seam-dm-01',
    changeId: 'chg.hex.dm-001',
    ritualMode: 'ACTIVE',
    phase: 'BOUNDARY_AUDIT',
    boundaryReport: {
      modulesAnalyzed: 142,
      domainModulesCount: 88,
      adaptersCount: 54,
      violationsCount: 0,
      violations: [],
      nonBuiltinImportsCount: 0,
      boundaryIntegrityStatus: 'ISOLATED'
    },
    reasons: ['hermetic boundary isolation govern'],
    label: 'happy pass boundary isolation'
  });
  assert.equal(dmResult.ok, true);
  assert.ok(dmResult.receipt.receiptId.startsWith('DM-RCPT-'));
  assert.equal(dmResult.receipt.fundacionDelta, 0);
  assert.equal(dmResult.receipt.productionReady, 'NO');

  // Stage 4: DN Sovereign Epistemic Knowledge Ledger
  const dnPort = new SovereignEpistemicLedgerPort();
  const dnResult = await dnPort.govern({
    planId: 'plan-seam-dn-01',
    changeId: 'chg.epi.dn-001',
    ritualMode: 'ACTIVE',
    phase: 'LEDGER_ALIGN',
    epistemicReport: {
      fromState: 'AUDIT_EXECUTED',
      toState: 'VERIFIED',
      checksPassed: 914,
      evidenceHash: 'a'.repeat(64),
      epistemicClaims: ['All tests passing cleanly']
    },
    reasons: ['hermetic epistemic ledger govern'],
    label: 'happy pass epistemic ledger'
  });
  assert.equal(dnResult.ok, true);
  assert.ok(dnResult.receipt.receiptId.startsWith('DN-RCPT-'));
  assert.equal(dnResult.receipt.fundacionDelta, 0);
  assert.equal(dnResult.receipt.productionReady, 'NO');

  // Stage 5: DO Ladder 31 Seam-Pack Consolidation
  const doPort = new Ladder31SeamPort();
  const doResult = await doPort.govern({
    planId: 'plan-seam-do-01',
    changeId: 'eos-ladder-31-mission-do',
    seamMode: 'ACTIVE',
    dkReceipt: dkResult.receipt,
    dlReceipt: dlResult.receipt,
    dmReceipt: dmResult.receipt,
    dnReceipt: dnResult.receipt
  });
  assert.equal(doResult.ok, true);
  assert.ok(doResult.receipt.receiptId.startsWith('DO-RCPT-'));
  assert.equal(doResult.receipt.fundacionDelta, 0);
  assert.equal(doResult.receipt.productionReady, 'NO');
  assert.equal(doResult.receipt.dkReceiptLink, dkResult.receipt.receiptId);
  assert.equal(doResult.receipt.dlReceiptLink, dlResult.receipt.receiptId);
  assert.equal(doResult.receipt.dmReceiptLink, dmResult.receipt.receiptId);
  assert.equal(doResult.receipt.dnReceiptLink, dnResult.receipt.receiptId);
});

test('L31-SEAM-5: Fundacion deny surfaces exist across DK/DL/DM/DN/DO', async () => {
  const dkDeny = await new SpecbootMutationGatekeeperPort().govern({
    planId: 'fundacion-plan-dk',
    changeId: 'eos-ladder-31-mission-dk',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(dkDeny.ok, false);
  assert.equal(dkDeny.code, DK_CODES.FUNDACION_DENIED);

  const dlDeny = await new AdversarialInvariantRefuterPort().govern({
    planId: 'fundacion-plan-dl',
    changeId: 'eos-ladder-31-mission-dl',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(dlDeny.ok, false);
  assert.equal(dlDeny.code, DL_CODES.FUNDACION_DENIED);

  const dmDeny = await new HexagonalBoundaryIsolationPort().govern({
    planId: 'fundacion-plan-dm',
    changeId: 'eos-ladder-31-mission-dm',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(dmDeny.ok, false);
  assert.equal(dmDeny.code, DM_CODES.FUNDACION_DENIED);

  const dnDeny = await new SovereignEpistemicLedgerPort().govern({
    planId: 'fundacion-plan-dn',
    changeId: 'eos-ladder-31-mission-dn',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(dnDeny.ok, false);
  assert.equal(dnDeny.code, DN_CODES.FUNDACION_DENIED);

  const doDeny = await new Ladder31SeamPort().govern({
    planId: 'fundacion-plan-do',
    changeId: 'eos-ladder-31-mission-do',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(doDeny.ok, false);
  assert.equal(doDeny.code, DO_CODES.FUNDACION_DENIED);
});

test('L31-SEAM-6: Hard-delete deny surfaces exist across DK/DL/DM/DN/DO', async () => {
  const dkHard = await new SpecbootMutationGatekeeperPort().govern({
    planId: 'hard-del-dk',
    changeId: 'eos-ladder-31-mission-dk',
    forceDelete: true
  });
  assert.equal(dkHard.ok, false);
  assert.equal(dkHard.code, DK_CODES.HARD_DELETE_FORBIDDEN);

  const dlHard = await new AdversarialInvariantRefuterPort().govern({
    planId: 'hard-del-dl',
    changeId: 'eos-ladder-31-mission-dl',
    forceDelete: true
  });
  assert.equal(dlHard.ok, false);
  assert.equal(dlHard.code, DL_CODES.HARD_DELETE_FORBIDDEN);

  const dmHard = await new HexagonalBoundaryIsolationPort().govern({
    planId: 'hard-del-dm',
    changeId: 'eos-ladder-31-mission-dm',
    forceDelete: true
  });
  assert.equal(dmHard.ok, false);
  assert.equal(dmHard.code, DM_CODES.HARD_DELETE_FORBIDDEN);

  const dnHard = await new SovereignEpistemicLedgerPort().govern({
    planId: 'hard-del-dn',
    changeId: 'eos-ladder-31-mission-dn',
    forceDelete: true
  });
  assert.equal(dnHard.ok, false);
  assert.equal(dnHard.code, DN_CODES.HARD_DELETE_FORBIDDEN);

  const doHard = await new Ladder31SeamPort().govern({
    planId: 'hard-del-do',
    changeId: 'eos-ladder-31-mission-do',
    forceDelete: true
  });
  assert.equal(doHard.ok, false);
  assert.equal(doHard.code, DO_CODES.HARD_DELETE_FORBIDDEN);
});

test('L31-SEAM-7: Secret leak deny surfaces exist across DK/DL/DM/DN/DO (Law VI)', async () => {
  const syntheticSecret = String.fromCharCode(115, 107, 45) + 'fakeKey99999999999999999999';

  const dkSecret = await new SpecbootMutationGatekeeperPort().govern({
    planId: 'secret-dk',
    changeId: 'eos-ladder-31-mission-dk',
    token: syntheticSecret
  });
  assert.equal(dkSecret.ok, false);
  assert.equal(dkSecret.code, DK_CODES.SECRET_LEAK_FORBIDDEN);

  const dlSecret = await new AdversarialInvariantRefuterPort().govern({
    planId: 'secret-dl',
    changeId: 'eos-ladder-31-mission-dl',
    token: syntheticSecret
  });
  assert.equal(dlSecret.ok, false);
  assert.equal(dlSecret.code, DL_CODES.SECRET_LEAK_FORBIDDEN);

  const dmSecret = await new HexagonalBoundaryIsolationPort().govern({
    planId: 'secret-dm',
    changeId: 'eos-ladder-31-mission-dm',
    token: syntheticSecret
  });
  assert.equal(dmSecret.ok, false);
  assert.equal(dmSecret.code, DM_CODES.SECRET_LEAK_FORBIDDEN);

  const dnSecret = await new SovereignEpistemicLedgerPort().govern({
    planId: 'secret-dn',
    changeId: 'eos-ladder-31-mission-dn',
    token: syntheticSecret
  });
  assert.equal(dnSecret.ok, false);
  assert.equal(dnSecret.code, DN_CODES.SECRET_LEAK_FORBIDDEN);

  const doSecret = await new Ladder31SeamPort().govern({
    planId: 'secret-do',
    changeId: 'eos-ladder-31-mission-do',
    token: syntheticSecret
  });
  assert.equal(doSecret.ok, false);
  assert.equal(doSecret.code, DO_CODES.SECRET_LEAK_FORBIDDEN);
});

test('L31-SEAM-8: Refusal surfaces (PRODUCTION_READY flip, tip rewrite, L30 reopen, L31 reopen)', async () => {
  const doPort = new Ladder31SeamPort();

  const prFlip = await doPort.govern({
    planId: 'pr-flip-do',
    changeId: 'eos-ladder-31-mission-do',
    productionReady: 'YES'
  });
  assert.equal(prFlip.ok, false);
  assert.equal(prFlip.code, DO_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

  const l30Reopen = await doPort.govern({
    planId: 'l30-reopen-do',
    changeId: 'eos-ladder-31-mission-do',
    instruction: 'please reopen ladder-30 now'
  });
  assert.equal(l30Reopen.ok, false);
  assert.equal(l30Reopen.code, DO_CODES.L30_REOPEN_FORBIDDEN);

  const l31Reopen = await doPort.govern({
    planId: 'l31-reopen-do',
    changeId: 'eos-ladder-31-mission-do',
    instruction: 'please reopen ladder-31 now'
  });
  assert.equal(l31Reopen.ok, false);
  assert.equal(l31Reopen.code, DO_CODES.L31_REOPEN_FORBIDDEN);

  const tipRewrite = await doPort.govern({
    planId: 'tip-rewrite-do',
    changeId: 'eos-ladder-31-mission-do',
    action: 'force-push main to rewrite git tip'
  });
  assert.equal(tipRewrite.ok, false);
  assert.equal(tipRewrite.code, DO_CODES.TIP_REWRITE_FORBIDDEN);
});

test('L31-SEAM-9: Cryptographic trail verification and tamper detection', async () => {
  const doPort = new Ladder31SeamPort();

  const r1 = await doPort.govern({
    planId: 'plan-trail-01',
    changeId: 'eos-ladder-31-mission-do',
    seamMode: 'ACTIVE',
    dkReceiptLink: 'DK-RCPT-0001',
    dlReceiptLink: 'DL-RCPT-0001',
    dmReceiptLink: 'DM-RCPT-0001',
    dnReceiptLink: 'DN-RCPT-0001'
  });
  assert.equal(r1.ok, true);

  const r2 = await doPort.govern({
    planId: 'plan-trail-02',
    changeId: 'eos-ladder-31-mission-do',
    seamMode: 'HOLD'
  });
  assert.equal(r2.ok, true);

  const trailRes = doPort.verifyTrail();
  assert.equal(trailRes.ok, true);
  assert.equal(trailRes.verifiedCount, 2);

  // Tamper with receipt
  doPort.trail[1].receiptHash = 'deadbeef'.repeat(8);
  const tamperedRes = doPort.verifyTrail();
  assert.equal(tamperedRes.ok, false);
  assert.ok(tamperedRes.error.includes('receiptHash mismatch'));
});

test('L31-SEAM-10: Closeout doc seals L31 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L30 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL), `${CLOSEOUT_REL} must exist`);
  const doc = read(CLOSEOUT_REL);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI'));
  assert.ok(doc.includes('SPEC-0121') || doc.includes('Mission DK'));
  assert.ok(doc.includes('SPEC-0122') || doc.includes('Mission DL'));
  assert.ok(doc.includes('SPEC-0123') || doc.includes('Mission DM'));
  assert.ok(doc.includes('SPEC-0124') || doc.includes('Mission DN'));
  assert.ok(doc.includes('SPEC-0125') || doc.includes('Mission DO') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L31 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L31|Ladder 31/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
});
