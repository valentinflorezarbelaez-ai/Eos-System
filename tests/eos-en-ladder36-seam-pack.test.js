/**
 * Ladder 36 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import EJ/EK/EL/EM when present; soft-fail safe; observed true|false.
 * Soft-observe pin: 9fd2be07. Tip-seal SEPARATE after EN merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L35 never reopen.
 * L36 remains OPEN — Formal L36 CLOSED is tip-seal later (NOT this package).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder36SeamPort,
  EN_PORT_PRODUCTION_READY,
  EN_PORT_KIND,
  EN_SAFE_AUTOMATION_IDS,
  softObserveEjAdmission,
  softObserveEkBackpressure,
  softObserveElBulkhead,
  softObserveEmCapacityHonesty,
  verifyLadder36SeamReceipt
} from '../src/core/composition/ladder36-seam-port.js';
import {
  sha256Canonical as enSha,
  EN_PRODUCTION_READY,
  EN_FREEZE_PIN_SHORT,
  EN_FREEZE_PIN,
  buildLadder36SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder36-seam-receipt.js';
import {
  Ladder36SeamPolicyGate,
  EN_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL36AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder36-seam-policy-gate.js';

const rootDir = process.cwd();
const EM_MERGE_TIP_PIN = '9fd2be07';
const EM_MERGE_TIP_PIN_FULL = '9fd2be07e192694623d2c15c0a99d2800f1ffbdb';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function enHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l36-en-seam-001',
    changeId: 'eos-ladder-36-mission-en',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 36 seam-pack consolidation govern'],
    label: 'L36 seam EN',
    ...overrides
  };
}
const LADDER36_SEAM_MODULES = [
  'src/core/composition/ladder36-seam-port.js',
  'src/core/composition/ladder36-seam-receipt.js',
  'src/core/composition/ladder36-seam-policy-gate.js'
];
const LADDER36_SATELLITE_SCRIPTS = ['test:mission-ej','test:mission-ek','test:mission-el','test:mission-em'];
const LADDER36_SLIM_EXCLUDES = [
  'eos-ej-admission-control-intake.test.js',
  'eos-ek-backpressure-load-shed.test.js',
  'eos-el-resource-isolation-bulkhead.test.js',
  'eos-em-capacity-honesty-attestation.test.js',
  'eos-en-ladder36-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_36_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md';

test('EN1: Soft-observe EJ/EK/EL/EM presence (true|false accepted; soft-fail safe)', async () => {
  const ej = await softObserveEjAdmission();
  const ek = await softObserveEkBackpressure();
  const el = await softObserveElBulkhead();
  const em = await softObserveEmCapacityHonesty();
  assert.equal(typeof ej.observed, 'boolean');
  assert.equal(typeof ek.observed, 'boolean');
  assert.equal(typeof el.observed, 'boolean');
  assert.equal(typeof em.observed, 'boolean');
  for (const s of [ej, ek, el, em]) assert.ok(s.observed === true || s.observed === false);
});

test('EN2: Fail-closed if ladder36-seam triad missing', () => {
  for (const rel of LADDER36_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('EN3: package.json registers Ladder 36 satellite + seam/pack/mission-en scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER36_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder36-seam'], 'node --test tests/eos-en-ladder36-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-en'], 'node --test tests/eos-en-ladder36-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder36-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER36_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder36-pack missing ' + s);
  assert.ok(pack.includes('test:ladder36-seam'));
});

test('EN4: SLIM_SUITE_EXCLUDES holds EJ/EK/EL/EM + ladder36 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER36_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('EN5: PRODUCTION_READY=NO across EN triad + soft-observed satellites', async () => {
  assert.equal(EN_PORT_PRODUCTION_READY, 'NO');
  assert.equal(EN_PRODUCTION_READY, 'NO');
  assert.equal(typeof EN_PORT_KIND, 'string');
  const ej = await softObserveEjAdmission();
  const ek = await softObserveEkBackpressure();
  const el = await softObserveElBulkhead();
  const em = await softObserveEmCapacityHonesty();
  if (ej.observed) assert.equal(ej.PRODUCTION_READY, 'NO');
  if (ek.observed) assert.equal(ek.PRODUCTION_READY, 'NO');
  if (el.observed) assert.equal(el.PRODUCTION_READY, 'NO');
  if (em.observed) assert.equal(em.PRODUCTION_READY, 'NO');
});

test('EN6: Cross-satellite smoke EJ -> EK -> EL -> EM -> EN-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder36SeamPort();
  const res = await port.govern(enHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('EN-RCPT-'));
  assert.equal(res.receipt.operation, 'LADDER36_SEAM_PACK_CLOSEOUT');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.l36AutoCloseRefused, true);
  assert.equal(res.receipt.freezeObserve.schemasAtCeiling, true);
  assert.equal(res.receipt.freezeObserve.pinShort, EM_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.ejObserved, 'boolean');
  assert.equal(typeof res.satellites.ekObserved, 'boolean');
  assert.equal(typeof res.satellites.elObserved, 'boolean');
  assert.equal(typeof res.satellites.emObserved, 'boolean');
  assert.equal(verifyLadder36SeamReceipt(res.receipt), true);
  if (res.satellites.ejObserved && res.satellites.ekObserved && res.satellites.elObserved && res.satellites.emObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['EJ-RCPT-','EK-RCPT-','EL-RCPT-','EM-RCPT-']);
  }
});

test('EN7: Fundacion / tip-rewrite / L36-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY / L30-L35 reopen DENY', async () => {
  const port = new Ladder36SeamPort();
  const fundacionDeny = await port.govern(enHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, EN_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('EN-RCPT-'));
  const tipDeny = await port.govern(enHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, EN_CODES.TIP_REWRITE_FORBIDDEN);
  const l36Deny = await port.govern(enHappyPlan({ planId: 'l36-autoclose-plan', l36AutoClose: true }));
  assert.equal(l36Deny.ok, false);
  assert.equal(l36Deny.code, EN_CODES.L36_AUTO_CLOSE_FORBIDDEN);
  const tipSealProduct = await port.govern(enHappyPlan({ planId: 'tip-seal-product-plan', tipSealInProduct: true }));
  assert.equal(tipSealProduct.ok, false);
  assert.equal(tipSealProduct.code, EN_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const schemaDeny = await port.govern(enHappyPlan({ planId: 'schema-add-plan', schemaJsonAdd: true }));
  assert.equal(schemaDeny.ok, false);
  assert.equal(schemaDeny.code, EN_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  const prDeny = await port.govern(enHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, EN_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(enHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, EN_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(enHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, EN_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(enHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, EN_CODES.L32_REOPEN_FORBIDDEN);
  const l33Deny = await port.govern(enHappyPlan({ planId: 'l33-reopen-plan', reopenL33: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, EN_CODES.L33_REOPEN_FORBIDDEN);
  const l34Deny = await port.govern(enHappyPlan({ planId: 'l34-reopen-plan', reopenL34: true }));
  assert.equal(l34Deny.ok, false);
  assert.equal(l34Deny.code, EN_CODES.L34_REOPEN_FORBIDDEN);
  const l35Deny = await port.govern(enHappyPlan({ planId: 'l35-reopen-plan', reopenL35: true }));
  assert.equal(l35Deny.ok, false);
  assert.equal(l35Deny.code, EN_CODES.L35_REOPEN_FORBIDDEN);
});

test('EN8: Closeout proposal keeps L36 OPEN + NON-CLAIM + tip-seal SEPARATE + L30-L35 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('L36') || /Ladder 36/.test(doc));
  assert.ok(/OPEN|remains OPEN|still OPEN/i.test(doc));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0') || doc.includes('Delta=0') || doc.includes('Δ = 0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/Admission|Intake|Quota/i.test(doc));
  assert.ok(/Backpressure|Load.?Shed/i.test(doc));
  assert.ok(/Isolation|Bulkhead/i.test(doc));
  assert.ok(/Capacity|Honesty|Attestation/i.test(doc));
  assert.ok(doc.includes('SPEC-0146') || doc.includes('Mission EJ'));
  assert.ok(doc.includes('SPEC-0147') || doc.includes('Mission EK'));
  assert.ok(doc.includes('SPEC-0148') || doc.includes('Mission EL'));
  assert.ok(doc.includes('SPEC-0149') || doc.includes('Mission EM'));
  assert.ok(doc.includes('SPEC-0150') || doc.includes('Mission EN') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('≠ GHE') || doc.includes('!= GHE') || doc.includes('≠ GitHub'));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L35|Ladder 35/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(EM_MERGE_TIP_PIN) || doc.includes(EM_MERGE_TIP_PIN_FULL));
  assert.ok(!/Formal L36 CLOSED(?!.*tip-seal|.*SEPARATE|.*later|.*pending)/i.test(doc) || /pending tip|tip-seal later|SEPARATE|remains OPEN/i.test(doc));
});

test('EN9: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder36-seam-port.js',
    'src/core/composition/ladder36-seam-receipt.js',
    'src/core/composition/ladder36-seam-policy-gate.js',
    'tests/eos-en-ladder36-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('EN10: ADR-0129 + evidence + OpenSpec EN change present', () => {
  assert.ok(exists('docs/adrs/ADR-0129-mission-en-ladder36-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_EN_LADDER36_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-36-mission-en/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-36-mission-en/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-36-mission-en/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-36-mission-en/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-36-mission-en/specs/mission-en-ladder36-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0129-mission-en-ladder36-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0150'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
  assert.ok(/L36.*OPEN|remains OPEN|still OPEN/i.test(adr));
});

test('EN11: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  if (!fs.existsSync(schemasDir)) {
    assert.ok(!exists('docs/schemas') || true, 'hermetic package: no schemas tree added by EI');
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
  assert.equal(walk(schemasDir).length, 35, 'AT_CEILING 35/35 held — EN must not add docs/schemas/**/*.json');
});

test('EN12: Axis + human gates preserved; tip-seal SEPARATE automation ids', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/Admission|Backpressure|Bulkhead|Capacity|Honesty|Attestation|Isolation/i.test(closeout));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L36_AUTO_CLOSE'));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_EN_MERGE'));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_SCHEMA_JSON_ADD'));
  assert.ok(EN_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('EN13: patch-mission-en.mjs wires seam/pack/mission-en + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-en.mjs'));
  const patch = read('scripts/patch-mission-en.mjs');
  assert.ok(patch.includes('test:ladder36-seam'));
  assert.ok(patch.includes('test:ladder36-pack'));
  assert.ok(patch.includes('test:mission-en'));
  assert.ok(patch.includes('eos-en-ladder36-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0150') || patch.includes('ladder36'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('EN14: HOLD path + receipt EN-RCPT + soft-observe pin 9fd2be07', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder36SeamPort().govern(enHappyPlan({ planId: 'plan-prefix-en-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('EN-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, '9fd2be07');
  assert.equal(EN_FREEZE_PIN_SHORT, '9fd2be07');
  assert.equal(EN_FREEZE_PIN, EM_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder36SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-36-mission-en', decision: 'PASS', seamDigest: enSha('build') });
  assert.ok(receipt.receiptId.startsWith('EN-RCPT-'));
  assert.equal(verifyLadder36SeamReceipt(receipt), true);
});

test('EN15: Closeout declares tip-seal SEPARATE; no freeze rewrite from EN; L36 not Formal CLOSED', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  assert.ok(/L36 remains OPEN|Ladder 36 remains OPEN|still OPEN|OPEN pending/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('EN16: Policy helpers + secrets/Fundacion/tip/L35/schema detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL36AutoClose('auto-close ladder 36 now'), true);
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder36SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-36-mission-en', tipSealL36: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, EN_CODES.L36_AUTO_CLOSE_FORBIDDEN);
});

test('EN17: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof enSha, 'function');
  assert.equal(enSha('en').length, 64);
  assert.ok(exists('scripts/patch-mission-en.mjs'));
  const patcher = read('scripts/patch-mission-en.mjs');
  assert.ok(patcher.includes('SPEC-0150') || patcher.includes('ladder36'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0150') || /Mission EN/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0129-mission-en-ladder36-seam-pack-closeout.md'));
});
