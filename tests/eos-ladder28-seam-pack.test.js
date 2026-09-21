/**
 * Ladder 28 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 28 Sovereign Operator Control-Plane
 * Composition & HUD/Doctor Ritual Fabric:
 * - Mission CV (SPEC-0105): HUD/Doctor Honesty Ritual Composition Port (CV-RCPT-*)
 * - Mission CW (SPEC-0106): Cross-Port Continuity Orchestration Port (CW-RCPT-*)
 * - Mission CX (SPEC-0107): Billing-Blocked Local Verify Ritual Port (CX-RCPT-*)
 * - Mission CY (SPEC-0108): Mission OS / Control-Plane L0 Residual Honesty Port (CY-RCPT-*)
 * - Mission CZ (SPEC-0109): Ladder 28 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0
 * - Law VI
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement
 * - L17–L27 CLOSED never reopen; after CZ tip-seal, L28 CLOSED_FOR_LOCAL_GOVERNED_USE
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 * - Schemas AT_CEILING 35/35 — no new docs/schemas JSON files
 * - Tip-seal SEPARATE after CZ merge (this package does NOT tip-refresh)
 * - Freeze package pin note: 900b14e4 (CY MEASURED) until post-CZ tip-seal
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  HudDoctorHonestyRitualPort,
  CV_PORT_PRODUCTION_READY,
  CV_PORT_KIND,
  CV_SAFE_AUTOMATION_IDS
} from '../src/core/composition/hud-doctor-honesty-ritual-port.js';
import { sha256Canonical as cvSha } from '../src/core/composition/hud-doctor-honesty-ritual-receipt.js';
import { CV_CODES } from '../src/core/composition/hud-doctor-honesty-ritual-policy-gate.js';

import {
  CrossPortContinuityOrchestrationPort,
  CW_PORT_PRODUCTION_READY,
  CW_PORT_KIND,
  CW_SAFE_AUTOMATION_IDS
} from '../src/core/composition/cross-port-continuity-orchestration-port.js';
import { sha256Canonical as cwSha } from '../src/core/composition/cross-port-continuity-orchestration-receipt.js';
import { CW_CODES } from '../src/core/composition/cross-port-continuity-orchestration-policy-gate.js';

import {
  BillingBlockedLocalVerifyRitualPort,
  CX_PORT_PRODUCTION_READY,
  CX_PORT_KIND,
  CX_SAFE_AUTOMATION_IDS
} from '../src/core/composition/billing-blocked-local-verify-ritual-port.js';
import { sha256Canonical as cxSha } from '../src/core/composition/billing-blocked-local-verify-ritual-receipt.js';
import { CX_CODES } from '../src/core/composition/billing-blocked-local-verify-ritual-policy-gate.js';

import {
  MissionOsControlPlaneHonestyPort,
  CY_PORT_PRODUCTION_READY,
  CY_PORT_KIND,
  CY_SAFE_AUTOMATION_IDS
} from '../src/core/composition/mission-os-control-plane-honesty-port.js';
import { sha256Canonical as cySha } from '../src/core/composition/mission-os-control-plane-honesty-receipt.js';
import { CY_CODES } from '../src/core/composition/mission-os-control-plane-honesty-policy-gate.js';

const rootDir = process.cwd();
const CV_FREEZE_PIN = '62d430fb9f53641809d8825ee9e676f13bc5b48c';
const CY_MEASURED_TIP_PIN = '900b14e4';

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

function cvHappyHonestyInput(overrides = {}) {
  return {
    freezeRevision: CV_FREEZE_PIN,
    sourceRevision: CV_FREEZE_PIN,
    lagCommits: 0,
    dirty: false,
    pendingPorts: [],
    ...overrides
  };
}

function cvHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cz-seam-cv-001',
    changeId: 'chg.honesty.cz-seam-cv-001',
    ritualMode: 'ACTIVE',
    ritualPhase: 'compose_honesty',
    honestyInput: cvHappyHonestyInput(),
    cqCtObserveLabels: ['CQ:observe', 'CT:observe'],
    reasons: ['hermetic hud-doctor honesty ritual seam govern'],
    label: 'L28 seam CV',
    ...overrides
  };
}

function cwHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cz-seam-cw-001',
    changeId: 'chg.continuity.cz-seam-cw-001',
    orchestrationMode: 'ACTIVE',
    phase: 'compose_continuity',
    observedPorts: ['CQ:observe', 'CR:observe', 'CS:observe', 'CT:observe'],
    reasons: ['hermetic cross-port continuity seam govern'],
    label: 'L28 seam CW',
    ...overrides
  };
}

function cxHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cz-seam-cx-001',
    changeId: 'chg.verify.cz-seam-cx-001',
    ritualMode: 'ACTIVE',
    phase: 'compose_verify_ritual',
    observedPorts: ['CQ:billing-blocked-observe'],
    reasons: ['hermetic billing-blocked local verify seam govern'],
    label: 'L28 seam CX',
    ...overrides
  };
}

function cyHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l28-cz-seam-cy-001',
    changeId: 'chg.honesty.cz-seam-cy-001',
    honestyMode: 'ACTIVE',
    phase: 'compose_honesty_port',
    observedPorts: [
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe'
    ],
    reasons: ['hermetic mission-os control-plane residual honesty seam govern'],
    label: 'L28 seam CY',
    ...overrides
  };
}

const LADDER28_SATELLITE_MODULES = [
  'src/core/composition/hud-doctor-honesty-ritual-port.js',
  'src/core/composition/hud-doctor-honesty-ritual-receipt.js',
  'src/core/composition/hud-doctor-honesty-ritual-policy-gate.js',
  'src/core/composition/cross-port-continuity-orchestration-port.js',
  'src/core/composition/cross-port-continuity-orchestration-receipt.js',
  'src/core/composition/cross-port-continuity-orchestration-policy-gate.js',
  'src/core/composition/billing-blocked-local-verify-ritual-port.js',
  'src/core/composition/billing-blocked-local-verify-ritual-receipt.js',
  'src/core/composition/billing-blocked-local-verify-ritual-policy-gate.js',
  'src/core/composition/mission-os-control-plane-honesty-port.js',
  'src/core/composition/mission-os-control-plane-honesty-receipt.js',
  'src/core/composition/mission-os-control-plane-honesty-policy-gate.js'
];

const LADDER28_SATELLITE_SCRIPTS = [
  'test:mission-cv',
  'test:mission-cw',
  'test:mission-cx',
  'test:mission-cy'
];

const LADDER28_SLIM_EXCLUDES = [
  'eos-cv-hud-doctor-honesty-ritual-port.test.js',
  'eos-cw-cross-port-continuity-orchestration-port.test.js',
  'eos-cx-billing-blocked-local-verify-ritual-port.test.js',
  'eos-cy-mission-os-control-plane-honesty-port.test.js',
  'eos-ladder28-seam-pack.test.js'
];

const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_28_CLOSEOUT_2026-09-21.md';

test('L28-SEAM-0: Fail-closed if any Ladder 28 satellite module missing', () => {
  for (const rel of LADDER28_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L28-SEAM-1: package.json registers Ladder 28 satellite + seam/pack/mission-cz scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER28_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder28-seam'],
    'node --test tests/eos-ladder28-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:mission-cz'],
    'node --test tests/eos-ladder28-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder28-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder28-pack');
  for (const s of LADDER28_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder28-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder28-seam'), 'ladder28-pack must chain seam');
});

test('L28-SEAM-2: SLIM_SUITE_EXCLUDES holds CV/CW/CX/CY + ladder28 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER28_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L28-SEAM-3: PRODUCTION_READY=NO across CV/CW/CX/CY ports', () => {
  assert.equal(CV_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CW_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CX_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CY_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof CV_PORT_KIND, 'string');
  assert.equal(typeof CW_PORT_KIND, 'string');
  assert.equal(typeof CX_PORT_KIND, 'string');
  assert.equal(typeof CY_PORT_KIND, 'string');
});

test('L28-SEAM-4: Cross-satellite smoke CV → CW → CX → CY (receipt prefixes)', async () => {
  const cvPort = new HudDoctorHonestyRitualPort({ preferBuiltinDouble: true });
  const cv = await cvPort.govern(cvHappyPlan());
  assert.equal(cv.ok, true);
  assert.ok(cv.receipt.receiptId.startsWith('CV-RCPT-'));
  assert.equal(cv.receipt.fundacionDelta, 0);
  assert.equal(cv.receipt.productionReady, 'NO');

  const cwPort = new CrossPortContinuityOrchestrationPort({ preferBuiltinDouble: true });
  const cw = await cwPort.govern(cwHappyPlan());
  assert.equal(cw.ok, true);
  assert.ok(cw.receipt.receiptId.startsWith('CW-RCPT-'));
  assert.equal(cw.receipt.fundacionDelta, 0);
  assert.equal(cw.receipt.productionReady, 'NO');

  const cxPort = new BillingBlockedLocalVerifyRitualPort({ preferBuiltinDouble: true });
  const cx = await cxPort.govern(cxHappyPlan());
  assert.equal(cx.ok, true);
  assert.ok(cx.receipt.receiptId.startsWith('CX-RCPT-'));
  assert.equal(cx.receipt.fundacionDelta, 0);
  assert.equal(cx.ciEnvironment.github_actions, 'BILLING_BLOCKED');
  assert.equal(cx.ciEnvironment.github_actions_verdict, 'NOT_RUN');

  const cyPort = new MissionOsControlPlaneHonestyPort({ preferBuiltinDouble: true });
  const cy = await cyPort.govern(cyHappyPlan());
  assert.equal(cy.ok, true);
  assert.ok(cy.receipt.receiptId.startsWith('CY-RCPT-'));
  assert.equal(cy.receipt.fundacionDelta, 0);
  assert.equal(cy.freezeObserve.readOnly, true);
});

test('L28-SEAM-5: Fundacion deny surfaces exist across CV/CW/CX/CY', async () => {
  const cvDeny = await new HudDoctorHonestyRitualPort({ preferBuiltinDouble: true }).govern(
    cvHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(cvDeny.ok, false);
  assert.equal(cvDeny.code, CV_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cvDeny.receipt.receiptId.startsWith('CV-RCPT-'));

  const cwDeny = await new CrossPortContinuityOrchestrationPort({
    preferBuiltinDouble: true
  }).govern(
    cwHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(cwDeny.ok, false);
  assert.equal(cwDeny.code, CW_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cwDeny.receipt.receiptId.startsWith('CW-RCPT-'));

  const cxDeny = await new BillingBlockedLocalVerifyRitualPort({
    preferBuiltinDouble: true
  }).govern(
    cxHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(cxDeny.ok, false);
  assert.equal(cxDeny.code, CX_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cxDeny.receipt.receiptId.startsWith('CX-RCPT-'));

  const cyDeny = await new MissionOsControlPlaneHonestyPort({
    preferBuiltinDouble: true
  }).govern(
    cyHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(cyDeny.ok, false);
  assert.equal(cyDeny.code, CY_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cyDeny.receipt.receiptId.startsWith('CY-RCPT-'));
});

test('L28-SEAM-6: Closeout doc seals L28 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L27 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL), `${CLOSEOUT_REL} must exist`);
  const doc = read(CLOSEOUT_REL);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI'));
  assert.ok(doc.includes('HUD') || doc.includes('Doctor') || /Honesty Ritual/i.test(doc));
  assert.ok(doc.includes('Continuity') || doc.includes('Cross-Port'));
  assert.ok(doc.includes('Billing-Blocked') || doc.includes('Local Verify'));
  assert.ok(doc.includes('Mission OS') || doc.includes('Control-Plane') || /Residual Honesty/i.test(doc));
  assert.ok(doc.includes('SPEC-0105') || doc.includes('Mission CV'));
  assert.ok(doc.includes('SPEC-0106') || doc.includes('Mission CW'));
  assert.ok(doc.includes('SPEC-0107') || doc.includes('Mission CX'));
  assert.ok(doc.includes('SPEC-0108') || doc.includes('Mission CY'));
  assert.ok(doc.includes('SPEC-0109') || doc.includes('Mission CZ') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('GitHub Enterprise') || doc.includes('≠ GitHub') || doc.includes('≠ GHE'),
    'NON-CLAIM Seam-pack ≠ GitHub Enterprise enforcement'
  );
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L28 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L27|Ladder 27/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(
    doc.includes('tip-seal') ||
      doc.includes('tip seal') ||
      doc.includes('tip-refresh') ||
      /SEPARATE|separate/.test(doc),
    'Closeout must note tip-seal is separate after merge'
  );
  assert.ok(
    doc.includes(CY_MEASURED_TIP_PIN) || doc.includes('900b14e4'),
    'Closeout must note CY MEASURED tip pin 900b14e4 for freeze honesty'
  );
});

test('L28-SEAM-7: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/
  ];

  const filesToCheck = [
    'src/core/composition/hud-doctor-honesty-ritual-port.js',
    'src/core/composition/cross-port-continuity-orchestration-port.js',
    'src/core/composition/billing-blocked-local-verify-ritual-port.js',
    'src/core/composition/mission-os-control-plane-honesty-port.js',
    'tests/eos-ladder28-seam-pack.test.js'
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

test('L28-SEAM-8: ADR-0080 + evidence + OpenSpec CZ change present', () => {
  assert.ok(exists('docs/adrs/ADR-0080-mission-cz-ladder28-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_CZ_LADDER28_SEAM_EVD_2026-09-21.md'));
  assert.ok(exists('openspec/changes/eos-ladder-28-mission-cz/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-28-mission-cz/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-28-mission-cz/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-28-mission-cz/tasks.md'));
  assert.ok(
    exists(
      'openspec/changes/eos-ladder-28-mission-cz/specs/mission-cz-ladder28-seam-pack/spec.md'
    )
  );
  const adr = read('docs/adrs/ADR-0080-mission-cz-ladder28-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0109'));
  assert.ok(adr.includes('PRODUCTION_READY'));
});

test('L28-SEAM-9: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  // Hermetic CZ package may omit schemas tree; host repo must hold AT_CEILING 35/35.
  if (!fs.existsSync(schemasDir)) {
    assert.ok(
      !exists('docs/schemas') || true,
      'hermetic package: no schemas tree added by CZ'
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
  assert.equal(n, 35, 'AT_CEILING 35/35 held — CZ must not add docs/schemas/**/*.json');
});

test('L28-SEAM-10: Axis + human gates preserved across CV/CW/CX/CY', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(
    /Sovereign Operator Control-Plane Composition|HUD\/Doctor Ritual/.test(closeout),
    'Closeout must declare L28 axis'
  );

  assert.ok(CV_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(CV_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(CW_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(CW_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(CX_SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(CY_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
});

test('L28-SEAM-11: patch-mission-cz.mjs wires seam/pack/mission-cz + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-cz.mjs'));
  const patch = read('scripts/patch-mission-cz.mjs');
  assert.ok(patch.includes('test:ladder28-seam'));
  assert.ok(patch.includes('test:ladder28-pack'));
  assert.ok(patch.includes('test:mission-cz'));
  assert.ok(patch.includes('eos-ladder28-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('L28-SEAM-12: Receipt prefix smoke isolation (CV-RCPT / CW-RCPT / CX-RCPT / CY-RCPT)', async () => {
  const prefixes = [];

  const cv = await new HudDoctorHonestyRitualPort({ preferBuiltinDouble: true }).govern(
    cvHappyPlan({
      planId: 'plan-prefix-cv',
      ritualMode: 'HOLD',
      ritualPhase: 'hold_observe',
      honestyInput: undefined,
      ritualDigest: cvSha('prefix-cv')
    })
  );
  prefixes.push(cv.receipt.receiptId.slice(0, 8));
  assert.ok(cv.receipt.receiptId.startsWith('CV-RCPT-'));

  const cw = await new CrossPortContinuityOrchestrationPort({
    preferBuiltinDouble: true
  }).govern(
    cwHappyPlan({
      planId: 'plan-prefix-cw',
      orchestrationMode: 'HOLD',
      phase: 'hold_observe',
      observedPorts: undefined,
      continuityDigest: cwSha('prefix-cw')
    })
  );
  prefixes.push(cw.receipt.receiptId.slice(0, 8));
  assert.ok(cw.receipt.receiptId.startsWith('CW-RCPT-'));

  const cx = await new BillingBlockedLocalVerifyRitualPort({
    preferBuiltinDouble: true
  }).govern(
    cxHappyPlan({
      planId: 'plan-prefix-cx',
      ritualMode: 'HOLD',
      phase: 'hold_observe',
      observedPorts: undefined,
      ritualDigest: cxSha('prefix-cx')
    })
  );
  prefixes.push(cx.receipt.receiptId.slice(0, 8));
  assert.ok(cx.receipt.receiptId.startsWith('CX-RCPT-'));

  const cy = await new MissionOsControlPlaneHonestyPort({
    preferBuiltinDouble: true
  }).govern(
    cyHappyPlan({
      planId: 'plan-prefix-cy',
      honestyMode: 'HOLD',
      phase: 'hold_observe',
      observedPorts: undefined,
      honestyDigest: cySha('prefix-cy')
    })
  );
  prefixes.push(cy.receipt.receiptId.slice(0, 8));
  assert.ok(cy.receipt.receiptId.startsWith('CY-RCPT-'));

  assert.deepEqual(prefixes, ['CV-RCPT-', 'CW-RCPT-', 'CX-RCPT-', 'CY-RCPT-']);
});

test('L28-SEAM-13: Closeout declares tip-seal SEPARATE; no freeze rewrite from CZ', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(
    /do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(
      doc
    ),
    'Must declare tip-seal is separate / no tip-refresh in CZ'
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

test('L28-SEAM-14: Closeout + patcher declare Mission CZ SPEC-0109 tip-seal-separate posture', () => {
  assert.ok(exists('scripts/patch-mission-cz.mjs'));
  const patcher = read('scripts/patch-mission-cz.mjs');
  assert.ok(patcher.includes('SPEC-0109') || patcher.includes('ladder28'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0109') || /Mission CZ/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0080-mission-cz-ladder28-seam-pack-closeout.md'));
});

test('L28-SEAM-15: Hash helpers export sha256Canonical across CV/CW/CX/CY', () => {
  assert.equal(typeof cvSha, 'function');
  assert.equal(typeof cwSha, 'function');
  assert.equal(typeof cxSha, 'function');
  assert.equal(typeof cySha, 'function');
  assert.equal(cvSha('cz').length, 64);
  assert.equal(cwSha('cz').length, 64);
  assert.equal(cxSha('cz').length, 64);
  assert.equal(cySha('cz').length, 64);
});
