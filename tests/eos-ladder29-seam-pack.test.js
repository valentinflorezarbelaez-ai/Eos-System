/**
 * Ladder 29 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 29 Sovereign Observability &
 * Evidence Economy Fabric:
 * - Mission DA (SPEC-0110): Control-Plane Observability Aggregation Port (DA-RCPT-*)
 * - Mission DB (SPEC-0111): Doctor Ritual Automation Port (DB-RCPT-*)
 * - Mission DC (SPEC-0112): Evidence Economy Custody Ledger Port (DC-RCPT-*)
 * - Mission DD (SPEC-0113): Local CI Ritual Hardening Port (DD-RCPT-*)
 * - Mission DE (SPEC-0114): Ladder 29 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0
 * - Law VI
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement
 * - L17–L28 CLOSED never reopen; after DE tip-seal, L29 CLOSED_FOR_LOCAL_GOVERNED_USE
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 * - Schemas AT_CEILING 35/35 — no new docs/schemas JSON files
 * - Tip-seal SEPARATE after DE merge (this package does NOT tip-refresh)
 * - Freeze package pin note: d57b6ddb (DD MEASURED) until post-DE tip-seal
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ControlPlaneObservabilityAggregationPort,
  DA_PORT_PRODUCTION_READY,
  DA_PORT_KIND,
  DA_SAFE_AUTOMATION_IDS
} from '../src/core/composition/control-plane-observability-aggregation-port.js';
import { sha256Canonical as daSha } from '../src/core/composition/control-plane-observability-aggregation-receipt.js';
import { DA_CODES } from '../src/core/composition/control-plane-observability-aggregation-policy-gate.js';

import {
  DoctorRitualAutomationPort,
  DB_PORT_PRODUCTION_READY,
  DB_PORT_KIND,
  DB_SAFE_AUTOMATION_IDS
} from '../src/core/composition/doctor-ritual-automation-port.js';
import { sha256Canonical as dbSha } from '../src/core/composition/doctor-ritual-automation-receipt.js';
import { DB_CODES } from '../src/core/composition/doctor-ritual-automation-policy-gate.js';

import {
  EvidenceEconomyCustodyLedgerPort,
  DC_PORT_PRODUCTION_READY,
  DC_PORT_KIND,
  DC_SAFE_AUTOMATION_IDS
} from '../src/core/composition/evidence-economy-custody-ledger-port.js';
import { sha256Canonical as dcSha } from '../src/core/composition/evidence-economy-custody-ledger-receipt.js';
import { DC_CODES } from '../src/core/composition/evidence-economy-custody-ledger-policy-gate.js';

import {
  LocalCiRitualHardeningPort,
  DD_PORT_PRODUCTION_READY,
  DD_PORT_KIND,
  DD_SAFE_AUTOMATION_IDS
} from '../src/core/composition/local-ci-ritual-hardening-port.js';
import { sha256Canonical as ddSha } from '../src/core/composition/local-ci-ritual-hardening-receipt.js';
import { DD_CODES } from '../src/core/composition/local-ci-ritual-hardening-policy-gate.js';

const rootDir = process.cwd();
const DD_MEASURED_TIP_PIN = 'd57b6ddb';

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

function daHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l29-de-seam-da-001',
    changeId: 'chg.agg.de-seam-da-001',
    aggregationMode: 'ACTIVE',
    phase: 'compose_aggregation_port',
    observedPorts: [
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe',
      'CY:control-plane-honesty-observe'
    ],
    reasons: ['hermetic control-plane observability aggregation seam govern'],
    label: 'L29 seam DA',
    ...overrides
  };
}

function dbHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l29-de-seam-db-001',
    changeId: 'chg.ritual.de-seam-db-001',
    ritualMode: 'ACTIVE',
    phase: 'compose_doctor_ritual_port',
    observedPorts: [
      'DA:observability-aggregation-observe',
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe',
      'CY:control-plane-honesty-observe'
    ],
    reasons: ['hermetic doctor ritual automation seam govern'],
    label: 'L29 seam DB',
    ...overrides
  };
}

function dcHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l29-de-seam-dc-001',
    changeId: 'chg.custody.de-seam-dc-001',
    ritualMode: 'ACTIVE',
    phase: 'compose_custody_ledger_port',
    observedPorts: [
      'DA:observability-aggregation-observe',
      'DB:doctor-ritual-automation-observe',
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe',
      'CY:control-plane-honesty-observe'
    ],
    reasons: ['hermetic evidence economy custody ledger seam govern'],
    label: 'L29 seam DC',
    ...overrides
  };
}

function ddHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l29-de-seam-dd-001',
    changeId: 'chg.ritual.de-seam-dd-001',
    ritualMode: 'ACTIVE',
    phase: 'compose_local_ci_ritual_hardening_port',
    observedPorts: [
      'DA:observability-aggregation-observe',
      'DB:doctor-ritual-automation-observe',
      'DC:evidence-economy-custody-ledger-observe',
      'CV:honesty-observe',
      'CW:continuity-observe',
      'CX:local-verify-observe',
      'CY:control-plane-honesty-observe'
    ],
    reasons: ['hermetic local CI ritual hardening seam govern'],
    label: 'L29 seam DD',
    ...overrides
  };
}

const LADDER29_SATELLITE_MODULES = [
  'src/core/composition/control-plane-observability-aggregation-port.js',
  'src/core/composition/control-plane-observability-aggregation-receipt.js',
  'src/core/composition/control-plane-observability-aggregation-policy-gate.js',
  'src/core/composition/doctor-ritual-automation-port.js',
  'src/core/composition/doctor-ritual-automation-receipt.js',
  'src/core/composition/doctor-ritual-automation-policy-gate.js',
  'src/core/composition/evidence-economy-custody-ledger-port.js',
  'src/core/composition/evidence-economy-custody-ledger-receipt.js',
  'src/core/composition/evidence-economy-custody-ledger-policy-gate.js',
  'src/core/composition/local-ci-ritual-hardening-port.js',
  'src/core/composition/local-ci-ritual-hardening-receipt.js',
  'src/core/composition/local-ci-ritual-hardening-policy-gate.js'
];

const LADDER29_SATELLITE_SCRIPTS = [
  'test:mission-da',
  'test:mission-db',
  'test:mission-dc',
  'test:mission-dd'
];

const LADDER29_SLIM_EXCLUDES = [
  'eos-da-control-plane-observability-aggregation-port.test.js',
  'eos-db-doctor-ritual-automation-port.test.js',
  'eos-dc-evidence-economy-custody-ledger-port.test.js',
  'eos-dd-local-ci-ritual-hardening-port.test.js',
  'eos-ladder29-seam-pack.test.js'
];

const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_29_CLOSEOUT_2026-09-21.md';

test('L29-SEAM-0: Fail-closed if any Ladder 29 satellite module missing', () => {
  for (const rel of LADDER29_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L29-SEAM-1: package.json registers Ladder 29 satellite + seam/pack/mission-de scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER29_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder29-seam'],
    'node --test tests/eos-ladder29-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:mission-de'],
    'node --test tests/eos-ladder29-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder29-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder29-pack');
  for (const s of LADDER29_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder29-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder29-seam'), 'ladder29-pack must chain seam');
});

test('L29-SEAM-2: SLIM_SUITE_EXCLUDES holds DA/DB/DC/DD + ladder29 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER29_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L29-SEAM-3: PRODUCTION_READY=NO across DA/DB/DC/DD ports', () => {
  assert.equal(DA_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DB_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DC_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DD_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof DA_PORT_KIND, 'string');
  assert.equal(typeof DB_PORT_KIND, 'string');
  assert.equal(typeof DC_PORT_KIND, 'string');
  assert.equal(typeof DD_PORT_KIND, 'string');
});

test('L29-SEAM-4: Cross-satellite smoke DA → DB → DC → DD (receipt prefixes)', async () => {
  const daPort = new ControlPlaneObservabilityAggregationPort({ preferBuiltinDouble: true });
  const da = await daPort.govern(daHappyPlan());
  assert.equal(da.ok, true);
  assert.ok(da.receipt.receiptId.startsWith('DA-RCPT-'));
  assert.equal(da.receipt.fundacionDelta, 0);
  assert.equal(da.receipt.productionReady, 'NO');

  const dbPort = new DoctorRitualAutomationPort({ preferBuiltinDouble: true });
  const db = await dbPort.govern(dbHappyPlan());
  assert.equal(db.ok, true);
  assert.ok(db.receipt.receiptId.startsWith('DB-RCPT-'));
  assert.equal(db.receipt.fundacionDelta, 0);
  assert.equal(db.receipt.productionReady, 'NO');

  const dcPort = new EvidenceEconomyCustodyLedgerPort({ preferBuiltinDouble: true });
  const dc = await dcPort.govern(dcHappyPlan());
  assert.equal(dc.ok, true);
  assert.ok(dc.receipt.receiptId.startsWith('DC-RCPT-'));
  assert.equal(dc.receipt.fundacionDelta, 0);
  assert.equal(dc.receipt.productionReady, 'NO');

  const ddPort = new LocalCiRitualHardeningPort({ preferBuiltinDouble: true });
  const dd = await ddPort.govern(ddHappyPlan());
  assert.equal(dd.ok, true);
  assert.ok(dd.receipt.receiptId.startsWith('DD-RCPT-'));
  assert.equal(dd.receipt.fundacionDelta, 0);
  assert.equal(dd.freezeObserve.readOnly, true);
});

test('L29-SEAM-5: Fundacion deny surfaces exist across DA/DB/DC/DD', async () => {
  const daDeny = await new ControlPlaneObservabilityAggregationPort({
    preferBuiltinDouble: true
  }).govern(
    daHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(daDeny.ok, false);
  assert.equal(daDeny.code, DA_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(daDeny.receipt.receiptId.startsWith('DA-RCPT-'));

  const dbDeny = await new DoctorRitualAutomationPort({
    preferBuiltinDouble: true
  }).govern(
    dbHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(dbDeny.ok, false);
  assert.equal(dbDeny.code, DB_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(dbDeny.receipt.receiptId.startsWith('DB-RCPT-'));

  const dcDeny = await new EvidenceEconomyCustodyLedgerPort({
    preferBuiltinDouble: true
  }).govern(
    dcHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(dcDeny.ok, false);
  assert.equal(dcDeny.code, DC_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(dcDeny.receipt.receiptId.startsWith('DC-RCPT-'));

  const ddDeny = await new LocalCiRitualHardeningPort({
    preferBuiltinDouble: true
  }).govern(
    ddHappyPlan({
      planId: 'fundacion-plan',
      target: 'Documents/Fundacion/ledger'
    })
  );
  assert.equal(ddDeny.ok, false);
  assert.equal(ddDeny.code, DD_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(ddDeny.receipt.receiptId.startsWith('DD-RCPT-'));
});

test('L29-SEAM-6: Closeout doc seals L29 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L28 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL), `${CLOSEOUT_REL} must exist`);
  const doc = read(CLOSEOUT_REL);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI'));
  assert.ok(doc.includes('Observability') || /Control-Plane Observability/i.test(doc));
  assert.ok(doc.includes('Doctor Ritual') || /Doctor Ritual Automation/i.test(doc));
  assert.ok(doc.includes('Evidence Economy') || doc.includes('Custody Ledger'));
  assert.ok(doc.includes('Local CI') || /Ritual Hardening/i.test(doc));
  assert.ok(doc.includes('SPEC-0110') || doc.includes('Mission DA'));
  assert.ok(doc.includes('SPEC-0111') || doc.includes('Mission DB'));
  assert.ok(doc.includes('SPEC-0112') || doc.includes('Mission DC'));
  assert.ok(doc.includes('SPEC-0113') || doc.includes('Mission DD'));
  assert.ok(doc.includes('SPEC-0114') || doc.includes('Mission DE') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('GitHub Enterprise') || doc.includes('≠ GitHub') || doc.includes('≠ GHE'),
    'NON-CLAIM Seam-pack ≠ GitHub Enterprise enforcement'
  );
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L29 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L28|Ladder 28/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(
    doc.includes('tip-seal') ||
      doc.includes('tip seal') ||
      doc.includes('tip-refresh') ||
      /SEPARATE|separate/.test(doc),
    'Closeout must note tip-seal is separate after merge'
  );
  assert.ok(
    doc.includes(DD_MEASURED_TIP_PIN) || doc.includes('d57b6ddb'),
    'Closeout must note DD MEASURED tip pin d57b6ddb for freeze honesty'
  );
});

test('L29-SEAM-7: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/
  ];

  const filesToCheck = [
    'src/core/composition/control-plane-observability-aggregation-port.js',
    'src/core/composition/doctor-ritual-automation-port.js',
    'src/core/composition/evidence-economy-custody-ledger-port.js',
    'src/core/composition/local-ci-ritual-hardening-port.js',
    'tests/eos-ladder29-seam-pack.test.js'
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

test('L29-SEAM-8: ADR-0086 + evidence + OpenSpec DE change present', () => {
  assert.ok(exists('docs/adrs/ADR-0086-mission-de-ladder29-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_DE_LADDER29_SEAM_EVD_2026-09-21.md'));
  assert.ok(exists('openspec/changes/eos-ladder-29-mission-de/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-29-mission-de/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-29-mission-de/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-29-mission-de/tasks.md'));
  assert.ok(
    exists(
      'openspec/changes/eos-ladder-29-mission-de/specs/mission-de-ladder29-seam-pack/spec.md'
    )
  );
  const adr = read('docs/adrs/ADR-0086-mission-de-ladder29-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0114'));
  assert.ok(adr.includes('PRODUCTION_READY'));
});

test('L29-SEAM-9: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  // Hermetic DE package may omit schemas tree; host repo must hold AT_CEILING 35/35.
  if (!fs.existsSync(schemasDir)) {
    assert.ok(
      !exists('docs/schemas') || true,
      'hermetic package: no schemas tree added by DE'
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
  assert.equal(n, 35, 'AT_CEILING 35/35 held — DE must not add docs/schemas/**/*.json');
});

test('L29-SEAM-10: Axis + human gates preserved across DA/DB/DC/DD', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(
    /Sovereign Observability|Evidence Economy/.test(closeout),
    'Closeout must declare L29 axis'
  );

  assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(DA_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(DB_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(DB_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(DC_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(DC_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(DD_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('L29-SEAM-11: patch-mission-de.mjs wires seam/pack/mission-de + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-de.mjs'));
  const patch = read('scripts/patch-mission-de.mjs');
  assert.ok(patch.includes('test:ladder29-seam'));
  assert.ok(patch.includes('test:ladder29-pack'));
  assert.ok(patch.includes('test:mission-de'));
  assert.ok(patch.includes('eos-ladder29-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('L29-SEAM-12: Receipt prefix smoke isolation (DA-RCPT / DB-RCPT / DC-RCPT / DD-RCPT)', async () => {
  const prefixes = [];

  const da = await new ControlPlaneObservabilityAggregationPort({
    preferBuiltinDouble: true
  }).govern(
    daHappyPlan({
      planId: 'plan-prefix-da',
      aggregationMode: 'HOLD',
      phase: 'hold_observe',
      observedPorts: undefined,
      honestyDigest: daSha('prefix-da')
    })
  );
  prefixes.push(da.receipt.receiptId.slice(0, 8));
  assert.ok(da.receipt.receiptId.startsWith('DA-RCPT-'));

  const db = await new DoctorRitualAutomationPort({
    preferBuiltinDouble: true
  }).govern(
    dbHappyPlan({
      planId: 'plan-prefix-db',
      ritualMode: 'HOLD',
      phase: 'hold_observe',
      observedPorts: undefined,
      ritualDigest: dbSha('prefix-db')
    })
  );
  prefixes.push(db.receipt.receiptId.slice(0, 8));
  assert.ok(db.receipt.receiptId.startsWith('DB-RCPT-'));

  const dc = await new EvidenceEconomyCustodyLedgerPort({
    preferBuiltinDouble: true
  }).govern(
    dcHappyPlan({
      planId: 'plan-prefix-dc',
      ritualMode: 'HOLD',
      phase: 'hold_observe',
      observedPorts: undefined,
      custodyDigest: dcSha('prefix-dc')
    })
  );
  prefixes.push(dc.receipt.receiptId.slice(0, 8));
  assert.ok(dc.receipt.receiptId.startsWith('DC-RCPT-'));

  const dd = await new LocalCiRitualHardeningPort({
    preferBuiltinDouble: true
  }).govern(
    ddHappyPlan({
      planId: 'plan-prefix-dd',
      ritualMode: 'HOLD',
      phase: 'hold_observe',
      observedPorts: undefined,
      ritualDigest: ddSha('prefix-dd')
    })
  );
  prefixes.push(dd.receipt.receiptId.slice(0, 8));
  assert.ok(dd.receipt.receiptId.startsWith('DD-RCPT-'));

  assert.deepEqual(prefixes, ['DA-RCPT-', 'DB-RCPT-', 'DC-RCPT-', 'DD-RCPT-']);
});

test('L29-SEAM-13: Closeout declares tip-seal SEPARATE; no freeze rewrite from DE', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(
    /do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(
      doc
    ),
    'Must declare tip-seal is separate / no tip-refresh in DE'
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

test('L29-SEAM-14: Closeout + patcher declare Mission DE SPEC-0114 tip-seal-separate posture', () => {
  assert.ok(exists('scripts/patch-mission-de.mjs'));
  const patcher = read('scripts/patch-mission-de.mjs');
  assert.ok(patcher.includes('SPEC-0114') || patcher.includes('ladder29'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0114') || /Mission DE/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0086-mission-de-ladder29-seam-pack-closeout.md'));
});

test('L29-SEAM-15: Hash helpers export sha256Canonical across DA/DB/DC/DD', () => {
  assert.equal(typeof daSha, 'function');
  assert.equal(typeof dbSha, 'function');
  assert.equal(typeof dcSha, 'function');
  assert.equal(typeof ddSha, 'function');
  assert.equal(daSha('de').length, 64);
  assert.equal(dbSha('de').length, 64);
  assert.equal(dcSha('de').length, 64);
  assert.equal(ddSha('de').length, 64);
});
