/**
 * Ladder 23 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 23 Sovereign Autonomous Synthesis,
 * Distributed Invariant Consensus & Self-Reification Fabric:
 * - Mission BW (SPEC-0080): Sovereign Agentic Knowledge Graph & Associative Memory Port (BW-RCPT-*)
 * - Mission BX (SPEC-0081): Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port (BX-RCPT-*)
 * - Mission BY (SPEC-0082): Autonomous EARS/BDD Spec Synthesizer & Verification Compiler Port (BY-RCPT-*)
 * - Mission BZ (SPEC-0083): Continuous Cryptographic Ledger Merkle Notarization Port (BZ-RCPT-*)
 * - Mission CA (SPEC-0084): Ladder 23 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO (strict, honest non-claim held)
 * - Fundacion Δ=0 (write barrier preserved)
 * - Law VI: Zero plain secrets in repository or payloads
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement
 * - L17–L22 CLOSED never reopen; after CA, L23 CLOSED_FOR_LOCAL_GOVERNED_USE never reopen
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  createSovereignAgenticMemoryPort,
  BW_PRODUCTION_READY,
  BW_KIND
} from '../src/core/memory/sovereign-agentic-memory-port.js';

import {
  AutonomousSelfHealingPort,
  BX_PORT_PRODUCTION_READY,
  BX_PORT_KIND
} from '../src/core/sentinel/autonomous-self-healing-port.js';

import {
  SpecSynthesisCompilerPort,
  BY_PORT_PRODUCTION_READY,
  BY_PORT_KIND
} from '../src/core/sdd/spec-synthesis-compiler-port.js';

import {
  MerkleLedgerNotarizationPort,
  BZ_PORT_PRODUCTION_READY,
  BZ_PORT_KIND,
  buildMerkleTree,
  verifyInclusion,
  generateInclusionProof
} from '../src/core/audit/merkle-ledger-notarization-port.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER23_SATELLITE_SCRIPTS = [
  'test:mission-bw',
  'test:mission-bx',
  'test:mission-by',
  'test:mission-bz'
];

const LADDER23_SLIM_EXCLUDES = [
  'eos-bw-sovereign-agentic-memory-port.test.js',
  'eos-bx-autonomous-self-healing-port.test.js',
  'eos-by-spec-synthesis-compiler-port.test.js',
  'eos-bz-merkle-ledger-notarization-port.test.js',
  'eos-ladder23-seam-pack.test.js'
];

test('L23-SEAM-1: package.json registers Ladder 23 satellite + seam/pack scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER23_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder23-seam'],
    'node --test tests/eos-ladder23-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder23-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder23-pack');
  for (const s of LADDER23_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder23-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder23-seam'), 'ladder23-pack must chain seam');
});

test('L23-SEAM-2: SLIM_SUITE_EXCLUDES holds BW/BX/BY/BZ + ladder23 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER23_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L23-SEAM-3: PRODUCTION_READY=NO across BW/BX/BY/BZ ports', () => {
  assert.equal(BW_PRODUCTION_READY, 'NO');
  assert.equal(BX_PORT_PRODUCTION_READY, 'NO');
  assert.equal(BY_PORT_PRODUCTION_READY, 'NO');
  assert.equal(BZ_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof BW_KIND, 'string');
  assert.equal(typeof BX_PORT_KIND, 'string');
  assert.equal(typeof BY_PORT_KIND, 'string');
  assert.equal(typeof BZ_PORT_KIND, 'string');
});

test('L23-SEAM-4: Cross-satellite smoke BW → BX → BY → BZ (receipts + merkle inclusion)', () => {
  // 1. BW — store associative memory nodes
  const memory = createSovereignAgenticMemoryPort();
  const n1 = memory.storeNode({
    id: 'ent-l23-goal',
    entityType: 'GOAL',
    label: 'Ladder23 synthesis goal'
  });
  assert.equal(n1.ok, true);
  assert.ok(n1.receipt.receiptId.startsWith('BW-RCPT-'));
  assert.equal(n1.fundacionDelta, 0);

  const n2 = memory.storeNode({
    id: 'ent-l23-component',
    entityType: 'COMPONENT',
    label: 'runtime-sentinel-core'
  });
  assert.equal(n2.ok, true);

  const edge = memory.linkEdge({
    sourceId: 'ent-l23-goal',
    targetId: 'ent-l23-component',
    relationType: 'GOVERNS',
    weight: 1.0
  });
  assert.equal(edge.ok, true);
  assert.ok(edge.receipt.receiptId.startsWith('BW-RCPT-'));

  // 2. BX — detect incident on remembered component + remediate
  const healer = new AutonomousSelfHealingPort({ maxRetries: 3 });
  const incident = healer.registerIncident({
    incidentId: 'INC-L23-SEAM-001',
    componentId: 'runtime-sentinel-core',
    severity: 'HIGH',
    anomalyType: 'INVARIANT_DRIFT',
    details: 'Associative memory flagged degraded component health'
  });
  assert.equal(incident.ok, true);
  assert.ok(incident.receipt.receiptId.startsWith('BX-RCPT-'));

  const rem = healer.executeRemediation({
    componentId: 'runtime-sentinel-core',
    incidentId: 'INC-L23-SEAM-001',
    remediationType: 'STATE_RESET',
    actionFn: () => undefined
  });
  assert.equal(rem.ok, true);
  assert.ok(rem.receipt.receiptId.startsWith('BX-RCPT-'));

  const trail = healer.verifyHealingTrail();
  assert.equal(trail.valid, true);

  // 3. BY — compile tiny formal goal
  const compiler = new SpecSynthesisCompilerPort();
  const compiled = compiler.compileGoalToSpec({
    goalId: 'L23-SEAM-GOAL',
    title: 'ladder23 seam closeout',
    objective: 'unify BW through BZ into fail-closed CI seam-pack'
  });
  assert.equal(compiled.ok, true);
  assert.ok(compiled.specId.startsWith('SPEC-BY-'));
  assert.ok(compiled.receipt.receiptId.startsWith('BY-RCPT-'));
  assert.ok(Array.isArray(compiled.spec.requirements));
  assert.ok(compiled.spec.requirements.length >= 4);

  // 4. BZ — notarize digests from prior receipts + verify inclusion
  const digests = [
    n1.receipt.receiptHash,
    incident.receipt.receiptHash,
    rem.receipt.receiptHash,
    compiled.receipt.receiptHash
  ];

  const notary = new MerkleLedgerNotarizationPort();
  const notarized = notary.notarize(digests, { label: 'L23-SEAM-BATCH' });
  assert.equal(notarized.ok, true);
  assert.ok(notarized.receipt.receiptId.startsWith('BZ-RCPT-'));
  assert.ok(typeof notarized.root === 'string' && notarized.root.length === 64);

  // Independent Merkle helpers also verify
  const tree = buildMerkleTree(digests);
  assert.equal(tree.root, notarized.root);
  const proof = generateInclusionProof(tree, 0);
  assert.ok(proof);
  assert.equal(verifyInclusion(digests[0], proof, tree.root), true);

  const inclusion = notary.proveInclusion(notarized.notarizationId, 2);
  assert.equal(inclusion.ok, true);
  assert.ok(inclusion.proof);
  assert.equal(
    notary.verifyInclusion(inclusion.proof.leafDigest, inclusion.proof, notarized.root),
    true
  );
});

test('L23-SEAM-5: Fail-closed denials across satellites', () => {
  const memory = createSovereignAgenticMemoryPort();
  const badNode = memory.storeNode({ id: '', entityType: 'X', label: 'y' });
  assert.equal(badNode.ok, false);

  const healer = new AutonomousSelfHealingPort();
  const badIncident = healer.registerIncident({
    incidentId: 'INC-BAD',
    componentId: 'c1',
    severity: 'NOT_A_SEVERITY',
    anomalyType: 'X'
  });
  assert.equal(badIncident.ok, false);

  const compiler = new SpecSynthesisCompilerPort();
  const badGoal = compiler.compileGoalToSpec({ goalId: '', title: '', objective: '' });
  assert.equal(badGoal.ok, false);

  const notary = new MerkleLedgerNotarizationPort();
  const empty = notary.notarize([]);
  assert.equal(empty.ok, false);
});

test('L23-SEAM-6: Closeout doc seals L23 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM', () => {
  const closeoutRel = 'docs/releases/EOS_LADDER_23_CLOSEOUT_2026-09-18.md';
  assert.ok(exists(closeoutRel), `${closeoutRel} must exist`);
  const doc = read(closeoutRel);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI') || doc.includes('Law VI'));
  assert.ok(doc.includes('Sovereign Autonomous Synthesis'));
  assert.ok(doc.includes('Distributed Invariant Consensus'));
  assert.ok(doc.includes('Self-Reification Fabric'));
  assert.ok(doc.includes('SPEC-0080') || doc.includes('Mission BW'));
  assert.ok(doc.includes('SPEC-0081') || doc.includes('Mission BX'));
  assert.ok(doc.includes('SPEC-0082') || doc.includes('Mission BY'));
  assert.ok(doc.includes('SPEC-0083') || doc.includes('Mission BZ'));
  assert.ok(doc.includes('SPEC-0084') || doc.includes('Mission CA') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('GitHub Enterprise') || doc.includes('≠ GitHub'),
    'NON-CLAIM Seam-pack ≠ GitHub Enterprise enforcement'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L22|Ladder 22/.test(doc));
});

test('L23-SEAM-7: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/
  ];

  const filesToCheck = [
    'src/core/memory/sovereign-agentic-memory-port.js',
    'src/core/sentinel/autonomous-self-healing-port.js',
    'src/core/sdd/spec-synthesis-compiler-port.js',
    'src/core/audit/merkle-ledger-notarization-port.js',
    'tests/eos-ladder23-seam-pack.test.js'
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
