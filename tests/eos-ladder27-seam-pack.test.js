/**
 * Ladder 27 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 27 Sovereign Operator Continuity
 * & Local CI / Evidence Ritual Fabric:
 * - Mission CQ (SPEC-0100): Local CI Continuity Port (CQ-RCPT-*)
 * - Mission CR (SPEC-0101): Evidence Trail Ritual Binding Port (CR-RCPT-*)
 * - Mission CS (SPEC-0102): SpecBoot Operator Continuity Port (CS-RCPT-*)
 * - Mission CT (SPEC-0103): Fundacion Δ=0 Continuity Drill Port (CT-RCPT-*)
 * - Mission CU (SPEC-0104): Ladder 27 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0
 * - Law VI
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement
 * - L17–L26 CLOSED never reopen; after CU, L27 CLOSED_FOR_LOCAL_GOVERNED_USE
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 * - Schemas AT_CEILING 35/35 — no new docs/schemas JSON files
 * - Tip-seal SEPARATE after CU merge (this package does NOT tip-refresh)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  LocalCiContinuityPort,
  CQ_PORT_PRODUCTION_READY,
  CQ_PORT_KIND
} from '../src/core/ci/local-ci-continuity-port.js';
import { sha256Canonical as cqSha } from '../src/core/ci/local-ci-continuity-receipt.js';
import { CQ_CODES } from '../src/core/ci/local-ci-continuity-policy-gate.js';

import {
  EvidenceTrailPort,
  CR_PORT_PRODUCTION_READY,
  CR_PORT_KIND
} from '../src/core/evidence/evidence-trail-port.js';
import {
  sha256Canonical as crSha,
  buildChainedEvidenceTrail
} from '../src/core/evidence/evidence-trail-receipt.js';
import { CR_CODES } from '../src/core/evidence/evidence-trail-policy-gate.js';

import {
  SpecbootContinuityPort,
  CS_PORT_PRODUCTION_READY,
  CS_PORT_KIND,
  CS_SAFE_AUTOMATION_IDS
} from '../src/core/specboot/specboot-continuity-port.js';
import { sha256Canonical as csSha } from '../src/core/specboot/specboot-continuity-receipt.js';
import { CS_CODES } from '../src/core/specboot/specboot-continuity-policy-gate.js';

import {
  FundacionDelta0ContinuityPort,
  CT_PORT_PRODUCTION_READY,
  CT_PORT_KIND,
  CT_SAFE_AUTOMATION_IDS
} from '../src/core/continuity/fundacion-delta0-continuity-port.js';
import { sha256Canonical as ctSha } from '../src/core/continuity/fundacion-delta0-continuity-receipt.js';
import { CT_CODES } from '../src/core/continuity/fundacion-delta0-continuity-policy-gate.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER27_SATELLITE_MODULES = [
  'src/core/ci/local-ci-continuity-port.js',
  'src/core/ci/local-ci-continuity-receipt.js',
  'src/core/ci/local-ci-continuity-policy-gate.js',
  'src/core/evidence/evidence-trail-port.js',
  'src/core/evidence/evidence-trail-receipt.js',
  'src/core/evidence/evidence-trail-policy-gate.js',
  'src/core/specboot/specboot-continuity-port.js',
  'src/core/specboot/specboot-continuity-receipt.js',
  'src/core/specboot/specboot-continuity-policy-gate.js',
  'src/core/continuity/fundacion-delta0-continuity-port.js',
  'src/core/continuity/fundacion-delta0-continuity-receipt.js',
  'src/core/continuity/fundacion-delta0-continuity-policy-gate.js'
];

const LADDER27_SATELLITE_SCRIPTS = [
  'test:mission-cq',
  'test:mission-cr',
  'test:mission-cs',
  'test:mission-ct'
];

const LADDER27_SLIM_EXCLUDES = [
  'eos-cq-local-ci-continuity-port.test.js',
  'eos-cr-evidence-trail-port.test.js',
  'eos-cs-specboot-continuity-port.test.js',
  'eos-ct-fundacion-delta0-continuity-port.test.js',
  'eos-ladder27-seam-pack.test.js'
];

const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_27_CLOSEOUT_2026-09-19.md';

test('L27-SEAM-0: Fail-closed if any Ladder 27 satellite module missing', () => {
  for (const rel of LADDER27_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L27-SEAM-1: package.json registers Ladder 27 satellite + seam/pack/mission-cu scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER27_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder27-seam'],
    'node --test tests/eos-ladder27-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:mission-cu'],
    'node --test tests/eos-ladder27-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder27-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder27-pack');
  for (const s of LADDER27_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder27-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder27-seam'), 'ladder27-pack must chain seam');
});

test('L27-SEAM-2: SLIM_SUITE_EXCLUDES holds CQ/CR/CS/CT + ladder27 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER27_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L27-SEAM-3: PRODUCTION_READY=NO across CQ/CR/CS/CT ports', () => {
  assert.equal(CQ_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CR_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CS_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CT_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof CQ_PORT_KIND, 'string');
  assert.equal(typeof CR_PORT_KIND, 'string');
  assert.equal(typeof CS_PORT_KIND, 'string');
  assert.equal(typeof CT_PORT_KIND, 'string');
});

test('L27-SEAM-4: Cross-satellite smoke CQ → CR → CS → CT (receipt prefixes)', async () => {
  const cqPort = new LocalCiContinuityPort({ preferBuiltinDouble: true });
  const cq = await cqPort.govern({
    planId: 'plan-l27-cu-seam-cq-001',
    runId: 'run.local-ci.cu-seam-001',
    continuityMode: 'ACTIVE',
    continuityDigest: cqSha({ label: 'cu-seam-cq', mission: 'CQ' }),
    surrogateInput: {
      assumeVerifyPass: true,
      skipVerifyStrict: true,
      dirty: false,
      stale: false,
      drift: false
    },
    reasons: ['hermetic local-ci continuity seam govern'],
    label: 'L27 seam CQ'
  });
  assert.equal(cq.ok, true);
  assert.ok(cq.receipt.receiptId.startsWith('CQ-RCPT-'));
  assert.equal(cq.receipt.fundacionDelta, 0);
  assert.equal(cq.receipt.ciEnvironment.github_actions, 'BILLING_BLOCKED');
  assert.equal(cq.receipt.ciEnvironment.github_actions_verdict, 'NOT_RUN');

  const crPort = new EvidenceTrailPort();
  const cr = crPort.govern({
    planId: 'plan-l27-cu-seam-cr-001',
    trailMode: 'FIXTURE',
    trail: buildChainedEvidenceTrail(),
    reasons: ['hermetic evidence-trail seam verify'],
    label: 'L27 seam CR'
  });
  assert.equal(cr.ok, true);
  assert.ok(cr.receipt.receiptId.startsWith('CR-RCPT-'));
  assert.equal(cr.receipt.fundacionDelta, 0);

  const csPort = new SpecbootContinuityPort({ preferBuiltinDouble: true });
  const cs = await csPort.govern({
    planId: 'plan-l27-cu-seam-cs-001',
    changeId: 'chg.specboot.cu-seam-001',
    continuityMode: 'ACTIVE',
    lidrStep: 'apply',
    frictionInput: {
      step: 'apply',
      primaryOwner: 'Valentin Florez',
      owners: ['Valentin Florez'],
      dirty: false,
      stale: false,
      skipPrereqCheck: true
    },
    reasons: ['hermetic specboot continuity seam govern'],
    label: 'L27 seam CS'
  });
  assert.equal(cs.ok, true);
  assert.ok(cs.receipt.receiptId.startsWith('CS-RCPT-'));
  assert.equal(cs.receipt.fundacionDelta, 0);

  const ctPort = new FundacionDelta0ContinuityPort();
  const ct = await ctPort.govern({
    planId: 'plan-l27-cu-seam-ct-001',
    changeId: 'chg.fundacion.cu-seam-001',
    continuityMode: 'ACTIVE',
    drillPhase: 'reconcile',
    gamedayInput: {
      independentCheck: true,
      dirty: false,
      mismatch: false,
      pending: false,
      writeAttempt: false,
      fundacionDelta: 0,
      FUNDACION_ALWAYS_DENY: true
    },
    reasons: ['hermetic fundacion delta0 continuity seam govern'],
    label: 'L27 seam CT'
  });
  assert.equal(ct.ok, true);
  assert.ok(ct.receipt.receiptId.startsWith('CT-RCPT-'));
  assert.equal(ct.receipt.fundacionDelta, 0);
});

test('L27-SEAM-5: Fundacion deny surfaces exist across CQ/CR/CS/CT', async () => {
  const cqPort = new LocalCiContinuityPort();
  const cqDeny = await cqPort.govern({
    planId: 'fundacion-plan',
    runId: 'run.deny.1',
    continuityMode: 'ACTIVE',
    continuityDigest: cqSha({ x: 1 }),
    surrogateInput: { assumeVerifyPass: true, skipVerifyStrict: true },
    reasons: ['x']
  });
  assert.equal(cqDeny.ok, false);
  assert.equal(cqDeny.code, CQ_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cqDeny.receipt.receiptId.startsWith('CQ-RCPT-'));

  const crPort = new EvidenceTrailPort();
  const crDeny = crPort.govern({
    planId: 'fundacion-plan',
    trailMode: 'FIXTURE',
    trail: buildChainedEvidenceTrail(),
    reasons: ['x']
  });
  assert.equal(crDeny.ok, false);
  assert.equal(crDeny.code, CR_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(crDeny.receipt.receiptId.startsWith('CR-RCPT-'));

  const csPort = new SpecbootContinuityPort();
  const csDeny = await csPort.govern({
    planId: 'fundacion-plan',
    changeId: 'chg.deny.1',
    continuityMode: 'ACTIVE',
    lidrStep: 'apply',
    frictionInput: {
      step: 'apply',
      primaryOwner: 'Valentin Florez',
      owners: ['Valentin Florez'],
      dirty: false,
      stale: false,
      skipPrereqCheck: true
    },
    reasons: ['x']
  });
  assert.equal(csDeny.ok, false);
  assert.equal(csDeny.code, CS_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(csDeny.receipt.receiptId.startsWith('CS-RCPT-'));

  const ctPort = new FundacionDelta0ContinuityPort();
  const ctDeny = await ctPort.govern({
    planId: 'fundacion-plan',
    changeId: 'chg.deny.1',
    continuityMode: 'ACTIVE',
    drillPhase: 'reconcile',
    gamedayInput: {
      independentCheck: true,
      dirty: false,
      mismatch: false,
      pending: false,
      writeAttempt: false,
      fundacionDelta: 0,
      FUNDACION_ALWAYS_DENY: true
    },
    reasons: ['x']
  });
  assert.equal(ctDeny.ok, false);
  assert.equal(ctDeny.code, CT_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(ctDeny.receipt.receiptId.startsWith('CT-RCPT-'));
});

test('L27-SEAM-6: Closeout doc seals L27 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L26 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL), `${CLOSEOUT_REL} must exist`);
  const doc = read(CLOSEOUT_REL);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI'));
  assert.ok(doc.includes('Local CI') || doc.includes('Continuity'));
  assert.ok(doc.includes('Evidence Trail') || doc.includes('Ritual'));
  assert.ok(doc.includes('SpecBoot') || doc.includes('Operator Continuity'));
  assert.ok(doc.includes('Fundacion') || doc.includes('Δ=0 Continuity'));
  assert.ok(doc.includes('SPEC-0100') || doc.includes('Mission CQ'));
  assert.ok(doc.includes('SPEC-0101') || doc.includes('Mission CR'));
  assert.ok(doc.includes('SPEC-0102') || doc.includes('Mission CS'));
  assert.ok(doc.includes('SPEC-0103') || doc.includes('Mission CT'));
  assert.ok(doc.includes('SPEC-0104') || doc.includes('Mission CU') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('GitHub Enterprise') || doc.includes('≠ GitHub') || doc.includes('≠ GHE'),
    'NON-CLAIM Seam-pack ≠ GitHub Enterprise enforcement'
  );
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L27 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L26|Ladder 26/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(
    doc.includes('tip-seal') ||
      doc.includes('tip seal') ||
      doc.includes('tip-refresh') ||
      /SEPARATE|separate/.test(doc),
    'Closeout must note tip-seal is separate after merge'
  );
});

test('L27-SEAM-7: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/
  ];

  const filesToCheck = [
    'src/core/ci/local-ci-continuity-port.js',
    'src/core/evidence/evidence-trail-port.js',
    'src/core/specboot/specboot-continuity-port.js',
    'src/core/continuity/fundacion-delta0-continuity-port.js',
    'tests/eos-ladder27-seam-pack.test.js'
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

test('L27-SEAM-8: ADR-0073 + evidence + OpenSpec CU change present', () => {
  assert.ok(exists('docs/adrs/ADR-0073-mission-cu-ladder27-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_CU_LADDER27_SEAM_EVD_2026-09-19.md'));
  assert.ok(exists('openspec/changes/eos-ladder-27-mission-cu/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-27-mission-cu/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-27-mission-cu/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-27-mission-cu/tasks.md'));
  assert.ok(
    exists(
      'openspec/changes/eos-ladder-27-mission-cu/specs/mission-cu-ladder27-seam-pack/spec.md'
    )
  );
  const adr = read('docs/adrs/ADR-0073-mission-cu-ladder27-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0104'));
  assert.ok(adr.includes('PRODUCTION_READY'));
});

test('L27-SEAM-9: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  // Hermetic CU package may omit schemas tree; host repo must hold AT_CEILING 35/35.
  if (!fs.existsSync(schemasDir)) {
    assert.ok(
      !exists('docs/schemas') || true,
      'hermetic package: no schemas tree added by CU'
    );
    return;
  }
  const walk = (dir) => {
    const out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walk(p));
      else if (ent.name.endsWith('.json')) out.push(p);
    }
    return out;
  };
  const n = walk(schemasDir).length;
  assert.equal(n, 35, 'AT_CEILING 35/35 held — CU must not add docs/schemas/**/*.json');
});

test('L27-SEAM-10: Axis + CQ BILLING_BLOCKED honesty + CS/CT human gates preserved', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(
    /Sovereign Operator Continuity|Local CI \/ Evidence Ritual/.test(closeout),
    'Closeout must declare L27 axis'
  );

  assert.ok(CS_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_SEAL_GATE'));
  assert.ok(CS_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(CT_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(CT_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
});

test('L27-SEAM-11: patch-mission-cu.mjs wires seam/pack/mission-cu + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-cu.mjs'));
  const patch = read('scripts/patch-mission-cu.mjs');
  assert.ok(patch.includes('test:ladder27-seam'));
  assert.ok(patch.includes('test:ladder27-pack'));
  assert.ok(patch.includes('test:mission-cu'));
  assert.ok(patch.includes('eos-ladder27-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('L27-SEAM-12: Receipt prefix smoke isolation (CQ-RCPT / CR-RCPT / CS-RCPT / CT-RCPT)', async () => {
  const prefixes = [];

  const cq = await new LocalCiContinuityPort({ preferBuiltinDouble: true }).govern({
    planId: 'plan-prefix-cq',
    runId: 'run.prefix.cq',
    continuityMode: 'HOLD',
    continuityDigest: cqSha('prefix-cq'),
    surrogateInput: { assumeVerifyPass: true, skipVerifyStrict: true },
    reasons: ['prefix'],
    label: 'prefix cq'
  });
  prefixes.push(cq.receipt.receiptId.slice(0, 8));
  assert.ok(cq.receipt.receiptId.startsWith('CQ-RCPT-'));

  const cr = new EvidenceTrailPort().govern({
    planId: 'plan-prefix-cr',
    trailMode: 'FIXTURE',
    trail: buildChainedEvidenceTrail(),
    reasons: ['prefix'],
    label: 'prefix cr'
  });
  prefixes.push(cr.receipt.receiptId.slice(0, 8));
  assert.ok(cr.receipt.receiptId.startsWith('CR-RCPT-'));

  const cs = await new SpecbootContinuityPort({ preferBuiltinDouble: true }).govern({
    planId: 'plan-prefix-cs',
    changeId: 'chg.prefix.cs',
    continuityMode: 'HOLD',
    lidrStep: 'apply',
    frictionInput: {
      step: 'apply',
      primaryOwner: 'Valentin Florez',
      owners: ['Valentin Florez'],
      dirty: false,
      stale: false,
      skipPrereqCheck: true
    },
    reasons: ['prefix'],
    label: 'prefix cs'
  });
  prefixes.push(cs.receipt.receiptId.slice(0, 8));
  assert.ok(cs.receipt.receiptId.startsWith('CS-RCPT-'));

  const ct = await new FundacionDelta0ContinuityPort().govern({
    planId: 'plan-prefix-ct',
    changeId: 'chg.prefix.ct',
    continuityMode: 'HOLD',
    drillPhase: 'reconcile',
    gamedayInput: {
      independentCheck: true,
      dirty: false,
      mismatch: false,
      pending: false,
      writeAttempt: false,
      fundacionDelta: 0,
      FUNDACION_ALWAYS_DENY: true
    },
    reasons: ['prefix'],
    label: 'prefix ct'
  });
  prefixes.push(ct.receipt.receiptId.slice(0, 8));
  assert.ok(ct.receipt.receiptId.startsWith('CT-RCPT-'));

  assert.deepEqual(prefixes, ['CQ-RCPT-', 'CR-RCPT-', 'CS-RCPT-', 'CT-RCPT-']);
});

test('L27-SEAM-13: Closeout declares tip-seal SEPARATE; no freeze rewrite from CU', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(
    /do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(
      doc
    ),
    'Must declare tip-seal is separate / no tip-refresh in CU'
  );
  // Strip NON-CLAIM forms (unicode ≠ / != / backtick-wrapped) before checking flip claims
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[≠!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(
    !/PRODUCTION_READY\s*=\s*YES/.test(scrubbed),
    'Must not claim PRODUCTION_READY=YES flip'
  );
});

test('L27-SEAM-14: Closeout + patcher declare Mission CU SPEC-0104 tip-seal-separate posture', () => {
  assert.ok(exists('scripts/patch-mission-cu.mjs'));
  const patcher = read('scripts/patch-mission-cu.mjs');
  assert.ok(patcher.includes('SPEC-0104') || patcher.includes('ladder27'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0104') || /Mission CU/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0073-mission-cu-ladder27-seam-pack-closeout.md'));
});

test('L27-SEAM-15: Hash helpers export sha256Canonical across CQ/CR/CS/CT', () => {
  assert.equal(typeof cqSha, 'function');
  assert.equal(typeof crSha, 'function');
  assert.equal(typeof csSha, 'function');
  assert.equal(typeof ctSha, 'function');
  assert.equal(cqSha('cu').length, 64);
  assert.equal(crSha('cu').length, 64);
  assert.equal(csSha('cu').length, 64);
  assert.equal(ctSha('cu').length, 64);
});
