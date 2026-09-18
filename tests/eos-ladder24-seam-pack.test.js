/**
 * Ladder 24 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 24 Sovereign Cross-Ladder Composition,
 * Mission Economics & Fleet Operator Fabric:
 * - Mission CB (SPEC-0085): Cross-Ladder Composition Orchestrator Port (CB-RCPT-*)
 * - Mission CC (SPEC-0086): Mission Economics & Portfolio Budget Governor Port (CC-RCPT-*)
 * - Mission CD (SPEC-0087): Fleet Project Registry & Governed Activation Port (CD-RCPT-*)
 * - Mission CE (SPEC-0088): Sovereign Operator Reality Console Port (CE-RCPT-*)
 * - Mission CF (SPEC-0089): Ladder 24 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO (strict, honest non-claim held)
 * - Fundacion Δ=0 (write barrier preserved)
 * - Law VI: Zero plain secrets in repository or payloads
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement
 * - L17–L23 CLOSED never reopen; after CF, L24 CLOSED_FOR_LOCAL_GOVERNED_USE never reopen
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  CrossLadderCompositionPort,
  CB_PORT_PRODUCTION_READY,
  CB_PORT_KIND
} from '../src/core/composition/cross-ladder-composition-port.js';
import { sha256Canonical as cbSha } from '../src/core/composition/cross-ladder-composition-receipt.js';
import { CB_CODES } from '../src/core/composition/cross-ladder-composition-policy-gate.js';

import {
  MissionPortfolioBudgetPort,
  CC_PORT_PRODUCTION_READY,
  CC_PORT_KIND
} from '../src/core/economics/mission-portfolio-budget-port.js';
import { CC_CODES } from '../src/core/economics/mission-portfolio-budget-policy-gate.js';

import {
  FleetActivationPort,
  CD_PORT_PRODUCTION_READY,
  CD_PORT_KIND
} from '../src/core/projects/fleet-activation-port.js';
import { sha256Canonical as cdSha } from '../src/core/projects/fleet-activation-receipt.js';
import { CD_CODES } from '../src/core/projects/fleet-activation-policy-gate.js';

import {
  OperatorRealityConsolePort,
  CE_PORT_PRODUCTION_READY,
  CE_PORT_KIND
} from '../src/core/observability/operator-reality-console-port.js';
import { CE_CODES } from '../src/core/observability/operator-reality-console-policy-gate.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER24_SATELLITE_MODULES = [
  'src/core/composition/cross-ladder-composition-port.js',
  'src/core/composition/cross-ladder-composition-receipt.js',
  'src/core/composition/cross-ladder-composition-policy-gate.js',
  'src/core/economics/mission-portfolio-budget-port.js',
  'src/core/economics/mission-portfolio-budget-receipt.js',
  'src/core/economics/mission-portfolio-budget-policy-gate.js',
  'src/core/projects/fleet-activation-port.js',
  'src/core/projects/fleet-activation-receipt.js',
  'src/core/projects/fleet-activation-policy-gate.js',
  'src/core/observability/operator-reality-console-port.js',
  'src/core/observability/operator-reality-console-receipt.js',
  'src/core/observability/operator-reality-console-policy-gate.js'
];

const LADDER24_SATELLITE_SCRIPTS = [
  'test:mission-cb',
  'test:mission-cc',
  'test:mission-cd',
  'test:mission-ce'
];

const LADDER24_SLIM_EXCLUDES = [
  'eos-cb-cross-ladder-composition-port.test.js',
  'eos-cc-mission-portfolio-budget-port.test.js',
  'eos-cd-fleet-activation-port.test.js',
  'eos-ce-operator-reality-console-port.test.js',
  'eos-ladder24-seam-pack.test.js'
];

test('L24-SEAM-0: Fail-closed if any Ladder 24 satellite module missing', () => {
  for (const rel of LADDER24_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L24-SEAM-1: package.json registers Ladder 24 satellite + seam/pack scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER24_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder24-seam'],
    'node --test tests/eos-ladder24-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder24-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder24-pack');
  for (const s of LADDER24_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder24-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder24-seam'), 'ladder24-pack must chain seam');
});

test('L24-SEAM-2: SLIM_SUITE_EXCLUDES holds CB/CC/CD/CE + ladder24 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER24_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L24-SEAM-3: PRODUCTION_READY=NO across CB/CC/CD/CE ports', () => {
  assert.equal(CB_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CC_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CD_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CE_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof CB_PORT_KIND, 'string');
  assert.equal(typeof CC_PORT_KIND, 'string');
  assert.equal(typeof CD_PORT_KIND, 'string');
  assert.equal(typeof CE_PORT_KIND, 'string');
});

test('L24-SEAM-4: Cross-satellite smoke CB → CC → CD → CE (receipt prefixes)', () => {
  // 1. CB — compose L22×L23 hermetic stages
  const composer = new CrossLadderCompositionPort();
  const composed = composer.compose({
    compositionId: 'cf-seam-l22-l23',
    label: 'L24 seam compose',
    stages: [
      { id: 's1', ladder: 'L22', satellite: 'BR', inputDigest: cbSha({ intent: 'seam' }) },
      { id: 's2', ladder: 'L22', satellite: 'BT' },
      { id: 's3', ladder: 'L23', satellite: 'BW' },
      { id: 's4', ladder: 'L23', satellite: 'BZ' }
    ]
  });
  assert.equal(composed.ok, true);
  assert.ok(composed.receipt.receiptId.startsWith('CB-RCPT-'));
  assert.equal(composed.receipt.fundacionDelta, 0);

  // 2. CC — evaluate portfolio envelope under budget
  const budget = new MissionPortfolioBudgetPort();
  const evaluated = budget.evaluate({
    portfolioId: 'cf-seam-portfolio',
    label: 'L24 seam budget',
    envelope: {
      latencyMsBudget: 1000,
      costUnitsBudget: 100,
      riskScoreBudget: 50
    },
    allocations: [
      { missionId: 'CB', latencyMs: 200, costUnits: 20, riskScore: 10 },
      { missionId: 'CE', latencyMs: 100, costUnits: 10, riskScore: 5 }
    ]
  });
  assert.equal(evaluated.ok, true);
  assert.ok(evaluated.receipt.receiptId.startsWith('CC-RCPT-'));
  assert.equal(evaluated.receipt.fundacionDelta, 0);

  // 3. CD — activate project SSOT → mission allowlist
  const fleet = new FleetActivationPort();
  const activated = fleet.activate({
    projectId: 'cf-seam-project',
    projectSsotDigest: cdSha({ seed: 'cf-seam' }),
    label: 'L24 seam activation',
    allowlist: ['CB', 'CC', 'CD', 'CE']
  });
  assert.equal(activated.ok, true);
  assert.ok(activated.receipt.receiptId.startsWith('CD-RCPT-'));
  assert.equal(activated.receipt.fundacionDelta, 0);

  // 4. CE — snapshot epistemic console
  const consolePort = new OperatorRealityConsolePort();
  const snapped = consolePort.snapshot({
    consoleId: 'cf-seam-reality',
    label: 'L24 seam console',
    snapshotAt: '2026-09-18T20:50:00.000Z',
    entries: [
      { ladder: 'L22', satellite: 'BR', status: 'MEASURED', evidenceRef: 'EVD-BR' },
      { ladder: 'L23', satellite: 'BW', status: 'MEASURED', evidenceRef: 'EVD-BW' },
      { ladder: 'L24', satellite: 'CB', status: 'MEASURED', evidenceRef: 'EVD-CB' },
      { ladder: 'L24', satellite: 'CC', status: 'MEASURED', evidenceRef: 'EVD-CC' },
      { ladder: 'L24', satellite: 'CD', status: 'MEASURED', evidenceRef: 'EVD-CD' },
      { ladder: 'L24', satellite: 'CE', status: 'MEASURED', evidenceRef: 'EVD-CE' }
    ]
  });
  assert.equal(snapped.ok, true);
  assert.ok(snapped.receipt.receiptId.startsWith('CE-RCPT-'));
  assert.equal(snapped.receipt.fundacionDelta, 0);
});

test('L24-SEAM-5: Fundacion deny surfaces exist across CB/CC/CD/CE', () => {
  const composer = new CrossLadderCompositionPort();
  const cbDeny = composer.compose({
    compositionId: 'fundacion-plan',
    stages: [{ id: 's1', ladder: 'L22', satellite: 'BR' }]
  });
  assert.equal(cbDeny.ok, false);
  assert.equal(cbDeny.code, CB_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cbDeny.receipt.receiptId.startsWith('CB-RCPT-'));

  const budget = new MissionPortfolioBudgetPort();
  const ccDeny = budget.evaluate({
    portfolioId: 'fundacion-plan',
    envelope: { latencyMsBudget: 100, costUnitsBudget: 10, riskScoreBudget: 5 },
    allocations: [{ missionId: 'CB', latencyMs: 10, costUnits: 1, riskScore: 1 }]
  });
  assert.equal(ccDeny.ok, false);
  assert.equal(ccDeny.code, CC_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(ccDeny.receipt.receiptId.startsWith('CC-RCPT-'));

  const fleet = new FleetActivationPort();
  const cdDeny = fleet.activate({
    projectId: 'fundacion-plan',
    projectSsotDigest: cdSha({ seed: 'deny' }),
    allowlist: ['CB']
  });
  assert.equal(cdDeny.ok, false);
  assert.equal(cdDeny.code, CD_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cdDeny.receipt.receiptId.startsWith('CD-RCPT-'));

  const consolePort = new OperatorRealityConsolePort();
  const ceDeny = consolePort.snapshot({
    consoleId: 'fundacion-plan',
    entries: [{ ladder: 'L24', status: 'MEASURED' }]
  });
  assert.equal(ceDeny.ok, false);
  assert.equal(ceDeny.code, CE_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(ceDeny.receipt.receiptId.startsWith('CE-RCPT-'));
});

test('L24-SEAM-6: Closeout doc seals L24 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L23 never reopen', () => {
  const closeoutRel = 'docs/releases/EOS_LADDER_24_CLOSEOUT_2026-09-18.md';
  assert.ok(exists(closeoutRel), `${closeoutRel} must exist`);
  const doc = read(closeoutRel);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI') || doc.includes('Law VI'));
  assert.ok(doc.includes('Sovereign Cross-Ladder Composition'));
  assert.ok(doc.includes('Mission Economics'));
  assert.ok(doc.includes('Fleet Operator Fabric'));
  assert.ok(doc.includes('SPEC-0085') || doc.includes('Mission CB'));
  assert.ok(doc.includes('SPEC-0086') || doc.includes('Mission CC'));
  assert.ok(doc.includes('SPEC-0087') || doc.includes('Mission CD'));
  assert.ok(doc.includes('SPEC-0088') || doc.includes('Mission CE'));
  assert.ok(doc.includes('SPEC-0089') || doc.includes('Mission CF') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('GitHub Enterprise') || doc.includes('≠ GitHub'),
    'NON-CLAIM Seam-pack ≠ GitHub Enterprise enforcement'
  );
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L24 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L23|Ladder 23/.test(doc));
});

test('L24-SEAM-7: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/
  ];

  const filesToCheck = [
    'src/core/composition/cross-ladder-composition-port.js',
    'src/core/economics/mission-portfolio-budget-port.js',
    'src/core/projects/fleet-activation-port.js',
    'src/core/observability/operator-reality-console-port.js',
    'tests/eos-ladder24-seam-pack.test.js'
  ];

  for (const rel of filesToCheck) {
    assert.ok(exists(rel), `missing ${rel}`);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(content), false, `Forbidden secret pattern in ${rel}`);
    }
  }

  assert.ok(exists('src/core/write-barrier/authorize.js'));
  const wb = read('src/core/write-barrier/authorize.js');
  assert.ok(wb.includes('FUNDACION_ALWAYS_DENY'));
});
