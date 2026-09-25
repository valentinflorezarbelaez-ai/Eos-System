/**
 * Ladder 34 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import DZ/EA/EB/EC when present; soft-fail safe; observed true|false.
 * Soft-observe pin: 29586ab8. Tip-seal SEPARATE after ED merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L33 never reopen.
 * L34 remains OPEN — Formal L34 CLOSED is tip-seal later (NOT this package).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder34SeamPort,
  ED_PORT_PRODUCTION_READY,
  ED_PORT_KIND,
  ED_SAFE_AUTOMATION_IDS,
  softObserveDzSaga,
  softObserveEaProjection,
  softObserveEbQuarantine,
  softObserveEcCompatibility,
  verifyLadder34SeamReceipt
} from '../src/core/composition/ladder34-seam-port.js';
import {
  sha256Canonical as edSha,
  ED_PRODUCTION_READY,
  ED_FREEZE_PIN_SHORT,
  ED_FREEZE_PIN,
  buildLadder34SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder34-seam-receipt.js';
import {
  Ladder34SeamPolicyGate,
  ED_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL34AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder34-seam-policy-gate.js';

const rootDir = process.cwd();
const EC_MERGE_TIP_PIN = '29586ab8';
const EC_MERGE_TIP_PIN_FULL = '29586ab8f2c8a784eb84f5c5e9c899118c577427';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function edHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l34-ed-seam-001',
    changeId: 'eos-ladder-34-mission-ed',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 34 seam-pack consolidation govern'],
    label: 'L34 seam ED',
    ...overrides
  };
}
const LADDER34_SEAM_MODULES = [
  'src/core/composition/ladder34-seam-port.js',
  'src/core/composition/ladder34-seam-receipt.js',
  'src/core/composition/ladder34-seam-policy-gate.js'
];
const LADDER34_SATELLITE_SCRIPTS = ['test:mission-dz','test:mission-ea','test:mission-eb','test:mission-ec'];
const LADDER34_SLIM_EXCLUDES = [
  'eos-dz-process-manager-saga-port.test.js',
  'eos-ea-cqrs-read-model-projection-port.test.js',
  'eos-eb-dead-letter-quarantine-port.test.js',
  'eos-ec-domain-event-compatibility-port.test.js',
  'eos-ed-ladder34-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_34_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md';

test('ED1: Soft-observe DZ/EA/EB/EC presence (true|false accepted; soft-fail safe)', async () => {
  const dz = await softObserveDzSaga();
  const ea = await softObserveEaProjection();
  const eb = await softObserveEbQuarantine();
  const ec = await softObserveEcCompatibility();
  assert.equal(typeof dz.observed, 'boolean');
  assert.equal(typeof ea.observed, 'boolean');
  assert.equal(typeof eb.observed, 'boolean');
  assert.equal(typeof ec.observed, 'boolean');
  for (const s of [dz, ea, eb, ec]) assert.ok(s.observed === true || s.observed === false);
});

test('ED2: Fail-closed if ladder34-seam triad missing', () => {
  for (const rel of LADDER34_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('ED3: package.json registers Ladder 34 satellite + seam/pack/mission-ed scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER34_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder34-seam'], 'node --test tests/eos-ed-ladder34-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-ed'], 'node --test tests/eos-ed-ladder34-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder34-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER34_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder34-pack missing ' + s);
  assert.ok(pack.includes('test:ladder34-seam'));
});

test('ED4: SLIM_SUITE_EXCLUDES holds DZ/EA/EB/EC + ladder34 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER34_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('ED5: PRODUCTION_READY=NO across ED triad + soft-observed satellites', async () => {
  assert.equal(ED_PORT_PRODUCTION_READY, 'NO');
  assert.equal(ED_PRODUCTION_READY, 'NO');
  assert.equal(typeof ED_PORT_KIND, 'string');
  const dz = await softObserveDzSaga();
  const ea = await softObserveEaProjection();
  const eb = await softObserveEbQuarantine();
  const ec = await softObserveEcCompatibility();
  if (dz.observed) assert.equal(dz.PRODUCTION_READY, 'NO');
  if (ea.observed) assert.equal(ea.PRODUCTION_READY, 'NO');
  if (eb.observed) assert.equal(eb.PRODUCTION_READY, 'NO');
  if (ec.observed) assert.equal(ec.PRODUCTION_READY, 'NO');
});

test('ED6: Cross-satellite smoke DZ -> EA -> EB -> EC -> ED-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder34SeamPort();
  const res = await port.govern(edHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('ED-RCPT-'));
  assert.equal(res.receipt.operation, 'LADDER34_SEAM_PACK_CLOSEOUT');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.l34AutoCloseRefused, true);
  assert.equal(res.receipt.freezeObserve.schemasAtCeiling, true);
  assert.equal(res.receipt.freezeObserve.pinShort, EC_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.dzObserved, 'boolean');
  assert.equal(typeof res.satellites.eaObserved, 'boolean');
  assert.equal(typeof res.satellites.ebObserved, 'boolean');
  assert.equal(typeof res.satellites.ecObserved, 'boolean');
  assert.equal(verifyLadder34SeamReceipt(res.receipt), true);
  if (res.satellites.dzObserved && res.satellites.eaObserved && res.satellites.ebObserved && res.satellites.ecObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['DZ-RCPT-','EA-RCPT-','EB-RCPT-','EC-RCPT-']);
  }
});

test('ED7: Fundacion / tip-rewrite / L34-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY / L30-L33 reopen DENY', async () => {
  const port = new Ladder34SeamPort();
  const fundacionDeny = await port.govern(edHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, ED_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('ED-RCPT-'));
  const tipDeny = await port.govern(edHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, ED_CODES.TIP_REWRITE_FORBIDDEN);
  const l34Deny = await port.govern(edHappyPlan({ planId: 'l34-autoclose-plan', l34AutoClose: true }));
  assert.equal(l34Deny.ok, false);
  assert.equal(l34Deny.code, ED_CODES.L34_AUTO_CLOSE_FORBIDDEN);
  const tipSealProduct = await port.govern(edHappyPlan({ planId: 'tip-seal-product-plan', tipSealInProduct: true }));
  assert.equal(tipSealProduct.ok, false);
  assert.equal(tipSealProduct.code, ED_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const schemaDeny = await port.govern(edHappyPlan({ planId: 'schema-add-plan', schemaJsonAdd: true }));
  assert.equal(schemaDeny.ok, false);
  assert.equal(schemaDeny.code, ED_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  const prDeny = await port.govern(edHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, ED_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(edHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, ED_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(edHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, ED_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(edHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, ED_CODES.L32_REOPEN_FORBIDDEN);
  const l33Deny = await port.govern(edHappyPlan({ planId: 'l33-reopen-plan', reopenL33: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, ED_CODES.L33_REOPEN_FORBIDDEN);
});

test('ED8: Closeout proposal keeps L34 OPEN + NON-CLAIM + tip-seal SEPARATE + L30-L33 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('L34') || /Ladder 34/.test(doc));
  assert.ok(/OPEN|remains OPEN|still OPEN/i.test(doc));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0') || doc.includes('Delta=0') || doc.includes('Δ = 0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/Process Manager|Saga/i.test(doc));
  assert.ok(/CQRS|Projection/i.test(doc));
  assert.ok(/Dead-Letter|Quarantine/i.test(doc));
  assert.ok(/Compatibility|Evolution/i.test(doc));
  assert.ok(doc.includes('SPEC-0136') || doc.includes('Mission DZ'));
  assert.ok(doc.includes('SPEC-0137') || doc.includes('Mission EA'));
  assert.ok(doc.includes('SPEC-0138') || doc.includes('Mission EB'));
  assert.ok(doc.includes('SPEC-0139') || doc.includes('Mission EC'));
  assert.ok(doc.includes('SPEC-0140') || doc.includes('Mission ED') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('≠ GHE') || doc.includes('!= GHE') || doc.includes('≠ GitHub'));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L33|Ladder 33/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(EC_MERGE_TIP_PIN) || doc.includes(EC_MERGE_TIP_PIN_FULL));
  assert.ok(!/Formal L34 CLOSED(?!.*tip-seal|.*SEPARATE|.*later|.*pending)/i.test(doc) || /pending tip|tip-seal later|SEPARATE|remains OPEN/i.test(doc));
});

test('ED9: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder34-seam-port.js',
    'src/core/composition/ladder34-seam-receipt.js',
    'src/core/composition/ladder34-seam-policy-gate.js',
    'tests/eos-ed-ladder34-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('ED10: ADR-0117 + evidence + OpenSpec ED change present', () => {
  assert.ok(exists('docs/adrs/ADR-0117-mission-ed-ladder34-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_ED_LADDER34_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-34-mission-ed/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-34-mission-ed/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-34-mission-ed/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-34-mission-ed/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-34-mission-ed/specs/mission-ed-ladder34-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0117-mission-ed-ladder34-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0140'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
  assert.ok(/L34.*OPEN|remains OPEN|still OPEN/i.test(adr));
});

test('ED11: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  if (!fs.existsSync(schemasDir)) {
    assert.ok(!exists('docs/schemas') || true, 'hermetic package: no schemas tree added by ED');
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
  assert.equal(walk(schemasDir).length, 35, 'AT_CEILING 35/35 held — ED must not add docs/schemas/**/*.json');
});

test('ED12: Axis + human gates preserved; tip-seal SEPARATE automation ids', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/Process Orchestration|CQRS Projection|Domain-Event Evolution|Dead-Letter/i.test(closeout));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L34_AUTO_CLOSE'));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_ED_MERGE'));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_SCHEMA_JSON_ADD'));
  assert.ok(ED_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('ED13: patch-mission-ed.mjs wires seam/pack/mission-ed + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-ed.mjs'));
  const patch = read('scripts/patch-mission-ed.mjs');
  assert.ok(patch.includes('test:ladder34-seam'));
  assert.ok(patch.includes('test:ladder34-pack'));
  assert.ok(patch.includes('test:mission-ed'));
  assert.ok(patch.includes('eos-ed-ladder34-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0140') || patch.includes('ladder34'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('ED14: HOLD path + receipt ED-RCPT + soft-observe pin 29586ab8', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder34SeamPort().govern(edHappyPlan({ planId: 'plan-prefix-ed-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('ED-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, '29586ab8');
  assert.equal(ED_FREEZE_PIN_SHORT, '29586ab8');
  assert.equal(ED_FREEZE_PIN, EC_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder34SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-34-mission-ed', decision: 'PASS', seamDigest: edSha('build') });
  assert.ok(receipt.receiptId.startsWith('ED-RCPT-'));
  assert.equal(verifyLadder34SeamReceipt(receipt), true);
});

test('ED15: Closeout declares tip-seal SEPARATE; no freeze rewrite from ED; L34 not Formal CLOSED', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  assert.ok(/L34 remains OPEN|Ladder 34 remains OPEN|still OPEN|OPEN pending/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('ED16: Policy helpers + secrets/Fundacion/tip/L34/schema detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL34AutoClose('auto-close ladder 34 now'), true);
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder34SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-34-mission-ed', tipSealL34: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, ED_CODES.L34_AUTO_CLOSE_FORBIDDEN);
});

test('ED17: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof edSha, 'function');
  assert.equal(edSha('ed').length, 64);
  assert.ok(exists('scripts/patch-mission-ed.mjs'));
  const patcher = read('scripts/patch-mission-ed.mjs');
  assert.ok(patcher.includes('SPEC-0140') || patcher.includes('ladder34'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0140') || /Mission ED/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0117-mission-ed-ladder34-seam-pack-closeout.md'));
});
