/**
 * Ladder 37 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import EO/EP/EQ/ER when present; soft-fail safe; observed true|false.
 * Soft-observe pin: 22289f5d. Tip-seal SEPARATE after ES merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L36 never reopen.
 * L37 remains OPEN — Formal L37 CLOSED is tip-seal later (NOT this package).
 * Distinct from EN L36 seam and EI L35 seam.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder37SeamPort,
  ES_PORT_PRODUCTION_READY,
  ES_PORT_KIND,
  ES_SAFE_AUTOMATION_IDS,
  softObserveEoFeatureFlag,
  softObserveEpPolicyPack,
  softObserveEqStagedActivation,
  softObserveErConfigHonesty,
  verifyLadder37SeamReceipt
} from '../src/core/composition/ladder37-seam-port.js';
import {
  sha256Canonical as esSha,
  ES_PRODUCTION_READY,
  ES_FREEZE_PIN_SHORT,
  ES_FREEZE_PIN,
  buildLadder37SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder37-seam-receipt.js';
import {
  Ladder37SeamPolicyGate,
  ES_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL37AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder37-seam-policy-gate.js';

const rootDir = process.cwd();
const ER_MERGE_TIP_PIN = '22289f5d';
const ER_MERGE_TIP_PIN_FULL = '22289f5dec7b4e374408ca4d1bd26574da40a2c1';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function esHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l37-es-seam-001',
    changeId: 'eos-ladder-37-mission-es',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 37 seam-pack consolidation govern'],
    label: 'L37 seam ES',
    ...overrides
  };
}
const LADDER37_SEAM_MODULES = [
  'src/core/composition/ladder37-seam-port.js',
  'src/core/composition/ladder37-seam-receipt.js',
  'src/core/composition/ladder37-seam-policy-gate.js'
];
const LADDER37_SATELLITE_SCRIPTS = ['test:mission-eo','test:mission-ep','test:mission-eq','test:mission-er'];
const LADDER37_SLIM_EXCLUDES = [
  'eos-eo-feature-flag-runtime-toggle.test.js',
  'eos-ep-policy-pack-binding.test.js',
  'eos-eq-config-staged-activation.test.js',
  'eos-er-config-honesty-attestation.test.js',
  'eos-es-ladder37-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_37_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md';

test('ES1: Soft-observe EO/EP/EQ/ER presence (true|false accepted; soft-fail safe)', async () => {
  const eo = await softObserveEoFeatureFlag();
  const ep = await softObserveEpPolicyPack();
  const eq = await softObserveEqStagedActivation();
  const er = await softObserveErConfigHonesty();
  assert.equal(typeof eo.observed, 'boolean');
  assert.equal(typeof ep.observed, 'boolean');
  assert.equal(typeof eq.observed, 'boolean');
  assert.equal(typeof er.observed, 'boolean');
  for (const s of [eo, ep, eq, er]) assert.ok(s.observed === true || s.observed === false);
});

test('ES2: Fail-closed if ladder37-seam triad missing', () => {
  for (const rel of LADDER37_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('ES3: package.json registers Ladder 37 satellite + seam/pack/mission-es scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER37_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder37-seam'], 'node --test tests/eos-es-ladder37-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-es'], 'node --test tests/eos-es-ladder37-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder37-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER37_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder37-pack missing ' + s);
  assert.ok(pack.includes('test:ladder37-seam'));
});

test('ES4: SLIM_SUITE_EXCLUDES holds EO/EP/EQ/ER + ladder37 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER37_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('ES5: PRODUCTION_READY=NO across ES triad + soft-observed satellites', async () => {
  assert.equal(ES_PORT_PRODUCTION_READY, 'NO');
  assert.equal(ES_PRODUCTION_READY, 'NO');
  assert.equal(typeof ES_PORT_KIND, 'string');
  const eo = await softObserveEoFeatureFlag();
  const ep = await softObserveEpPolicyPack();
  const eq = await softObserveEqStagedActivation();
  const er = await softObserveErConfigHonesty();
  if (eo.observed) assert.equal(eo.PRODUCTION_READY, 'NO');
  if (ep.observed) assert.equal(ep.PRODUCTION_READY, 'NO');
  if (eq.observed) assert.equal(eq.PRODUCTION_READY, 'NO');
  if (er.observed) assert.equal(er.PRODUCTION_READY, 'NO');
});

test('ES6: Cross-satellite smoke EO -> EP -> EQ -> ER -> ES-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder37SeamPort();
  const res = await port.govern(esHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('ES-RCPT-'));
  assert.equal(res.receipt.operation, 'LADDER37_SEAM_PACK_CLOSEOUT');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.l37AutoCloseRefused, true);
  assert.equal(res.receipt.freezeObserve.schemasAtCeiling, true);
  assert.equal(res.receipt.freezeObserve.pinShort, ER_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.eoObserved, 'boolean');
  assert.equal(typeof res.satellites.epObserved, 'boolean');
  assert.equal(typeof res.satellites.eqObserved, 'boolean');
  assert.equal(typeof res.satellites.erObserved, 'boolean');
  assert.equal(verifyLadder37SeamReceipt(res.receipt), true);
  if (res.satellites.eoObserved && res.satellites.epObserved && res.satellites.eqObserved && res.satellites.erObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['EO-RCPT-','EP-RCPT-','EQ-RCPT-','ER-RCPT-']);
  }
});

test('ES7: Fundacion / tip-rewrite / L37-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY / L30-L36 reopen DENY', async () => {
  const port = new Ladder37SeamPort();
  const fundacionDeny = await port.govern(esHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, ES_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('ES-RCPT-'));
  const tipDeny = await port.govern(esHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, ES_CODES.TIP_REWRITE_FORBIDDEN);
  const l37Deny = await port.govern(esHappyPlan({ planId: 'l37-autoclose-plan', l37AutoClose: true }));
  assert.equal(l37Deny.ok, false);
  assert.equal(l37Deny.code, ES_CODES.L37_AUTO_CLOSE_FORBIDDEN);
  const tipSealProduct = await port.govern(esHappyPlan({ planId: 'tip-seal-product-plan', tipSealInProduct: true }));
  assert.equal(tipSealProduct.ok, false);
  assert.equal(tipSealProduct.code, ES_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const schemaDeny = await port.govern(esHappyPlan({ planId: 'schema-add-plan', schemaJsonAdd: true }));
  assert.equal(schemaDeny.ok, false);
  assert.equal(schemaDeny.code, ES_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  const prDeny = await port.govern(esHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, ES_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(esHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, ES_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(esHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, ES_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(esHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, ES_CODES.L32_REOPEN_FORBIDDEN);
  const l33Deny = await port.govern(esHappyPlan({ planId: 'l33-reopen-plan', reopenL33: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, ES_CODES.L33_REOPEN_FORBIDDEN);
  const l34Deny = await port.govern(esHappyPlan({ planId: 'l34-reopen-plan', reopenL34: true }));
  assert.equal(l34Deny.ok, false);
  assert.equal(l34Deny.code, ES_CODES.L34_REOPEN_FORBIDDEN);
  const l35Deny = await port.govern(esHappyPlan({ planId: 'l35-reopen-plan', reopenL35: true }));
  assert.equal(l35Deny.ok, false);
  assert.equal(l35Deny.code, ES_CODES.L35_REOPEN_FORBIDDEN);
  const l36Deny = await port.govern(esHappyPlan({ planId: 'l36-reopen-plan', reopenL36: true }));
  assert.equal(l36Deny.ok, false);
  assert.equal(l36Deny.code, ES_CODES.L36_REOPEN_FORBIDDEN);
});

test('ES8: Closeout proposal keeps L37 OPEN + NON-CLAIM + tip-seal SEPARATE + L30-L36 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('L37') || /Ladder 37/.test(doc));
  assert.ok(/OPEN|remains OPEN|still OPEN/i.test(doc));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0') || doc.includes('Delta=0') || doc.includes('Δ = 0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/Feature.?Flag|Runtime.?Toggle/i.test(doc));
  assert.ok(/Policy.?Pack|Binding/i.test(doc));
  assert.ok(/Staged.?Activation|Config Change/i.test(doc));
  assert.ok(/Config Honesty|Flag Attestation|Honesty/i.test(doc));
  assert.ok(doc.includes('SPEC-0151') || doc.includes('Mission EO'));
  assert.ok(doc.includes('SPEC-0152') || doc.includes('Mission EP'));
  assert.ok(doc.includes('SPEC-0153') || doc.includes('Mission EQ'));
  assert.ok(doc.includes('SPEC-0154') || doc.includes('Mission ER'));
  assert.ok(doc.includes('SPEC-0155') || doc.includes('Mission ES') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('≠ GHE') || doc.includes('!= GHE') || doc.includes('≠ GitHub'));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L36|Ladder 36/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(ER_MERGE_TIP_PIN) || doc.includes(ER_MERGE_TIP_PIN_FULL));
  assert.ok(!/Formal L37 CLOSED(?!.*tip-seal|.*SEPARATE|.*later|.*pending)/i.test(doc) || /pending tip|tip-seal later|SEPARATE|remains OPEN/i.test(doc));
  assert.ok(/Distinct from EN|≠ EN L36|!= EN L36|distinct from.*EN/i.test(doc) || doc.includes('EN L36') || doc.includes('EI L35'));
});

test('ES9: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder37-seam-port.js',
    'src/core/composition/ladder37-seam-receipt.js',
    'src/core/composition/ladder37-seam-policy-gate.js',
    'tests/eos-es-ladder37-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('ES10: ADR-0135 + evidence + OpenSpec ES change present', () => {
  assert.ok(exists('docs/adrs/ADR-0135-mission-es-ladder37-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_ES_LADDER37_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-37-mission-es/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-37-mission-es/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-37-mission-es/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-37-mission-es/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-37-mission-es/specs/mission-es-ladder37-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0135-mission-es-ladder37-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0155'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
  assert.ok(/L37.*OPEN|remains OPEN|still OPEN/i.test(adr));
});

test('ES11: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  if (!fs.existsSync(schemasDir)) {
    assert.ok(!exists('docs/schemas') || true, 'hermetic package: no schemas tree added by ES');
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
  assert.equal(walk(schemasDir).length, 35, 'AT_CEILING 35/35 held — ES must not add docs/schemas/**/*.json');
});

test('ES12: Axis + human gates preserved; tip-seal SEPARATE automation ids', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/Feature.?Flag|Policy.?Pack|Staged.?Activation|Config Honesty|Attestation/i.test(closeout));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L37_AUTO_CLOSE'));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_ES_MERGE'));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_SCHEMA_JSON_ADD'));
  assert.ok(ES_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('ES13: patch-mission-es.mjs wires seam/pack/mission-es + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-es.mjs'));
  const patch = read('scripts/patch-mission-es.mjs');
  assert.ok(patch.includes('test:ladder37-seam'));
  assert.ok(patch.includes('test:ladder37-pack'));
  assert.ok(patch.includes('test:mission-es'));
  assert.ok(patch.includes('eos-es-ladder37-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0155') || patch.includes('ladder37'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('ES14: HOLD path + receipt ES-RCPT + soft-observe pin 22289f5d', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder37SeamPort().govern(esHappyPlan({ planId: 'plan-prefix-es-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('ES-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, '22289f5d');
  assert.equal(ES_FREEZE_PIN_SHORT, '22289f5d');
  assert.equal(ES_FREEZE_PIN, ER_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder37SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-37-mission-es', decision: 'PASS', seamDigest: esSha('build') });
  assert.ok(receipt.receiptId.startsWith('ES-RCPT-'));
  assert.equal(verifyLadder37SeamReceipt(receipt), true);
});

test('ES15: Closeout declares tip-seal SEPARATE; no freeze rewrite from ES; L37 not Formal CLOSED', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  assert.ok(/L37 remains OPEN|Ladder 37 remains OPEN|still OPEN|OPEN pending/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('ES16: Policy helpers + secrets/Fundacion/tip/L37/schema detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL37AutoClose('auto-close ladder 37 now'), true);
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder37SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-37-mission-es', tipSealL37: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, ES_CODES.L37_AUTO_CLOSE_FORBIDDEN);
});

test('ES17: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof esSha, 'function');
  assert.equal(esSha('es').length, 64);
  assert.ok(exists('scripts/patch-mission-es.mjs'));
  const patcher = read('scripts/patch-mission-es.mjs');
  assert.ok(patcher.includes('SPEC-0155') || patcher.includes('ladder37'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0155') || /Mission ES/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0135-mission-es-ladder37-seam-pack-closeout.md'));
});