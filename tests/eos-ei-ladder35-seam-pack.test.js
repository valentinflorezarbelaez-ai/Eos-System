/**
 * Ladder 35 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import EE/EF/EG/EH when present; soft-fail safe; observed true|false.
 * Soft-observe pin: bdd53e30. Tip-seal SEPARATE after EI merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L34 never reopen.
 * L35 remains OPEN — Formal L35 CLOSED is tip-seal later (NOT this package).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder35SeamPort,
  EI_PORT_PRODUCTION_READY,
  EI_PORT_KIND,
  EI_SAFE_AUTOMATION_IDS,
  softObserveEeDeadline,
  softObserveEfSchedule,
  softObserveEgCompensation,
  softObserveEhAttestation,
  verifyLadder35SeamReceipt
} from '../src/core/composition/ladder35-seam-port.js';
import {
  sha256Canonical as eiSha,
  EI_PRODUCTION_READY,
  EI_FREEZE_PIN_SHORT,
  EI_FREEZE_PIN,
  buildLadder35SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder35-seam-receipt.js';
import {
  Ladder35SeamPolicyGate,
  EI_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL35AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder35-seam-policy-gate.js';

const rootDir = process.cwd();
const EH_MERGE_TIP_PIN = 'bdd53e30';
const EH_MERGE_TIP_PIN_FULL = 'bdd53e30015040223267146ef551064473d771d1';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function eiHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l35-ei-seam-001',
    changeId: 'eos-ladder-35-mission-ei',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 35 seam-pack consolidation govern'],
    label: 'L35 seam EI',
    ...overrides
  };
}
const LADDER35_SEAM_MODULES = [
  'src/core/composition/ladder35-seam-port.js',
  'src/core/composition/ladder35-seam-receipt.js',
  'src/core/composition/ladder35-seam-policy-gate.js'
];
const LADDER35_SATELLITE_SCRIPTS = ['test:mission-ee','test:mission-ef','test:mission-eg','test:mission-eh'];
const LADDER35_SLIM_EXCLUDES = [
  'eos-ee-temporal-deadline-ttl-port.test.js',
  'eos-ef-schedule-wake-deferred-port.test.js',
  'eos-eg-process-timeout-compensation-port.test.js',
  'eos-eh-temporal-honesty-attestation-port.test.js',
  'eos-ei-ladder35-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_35_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md';

test('EI1: Soft-observe EE/EF/EG/EH presence (true|false accepted; soft-fail safe)', async () => {
  const ee = await softObserveEeDeadline();
  const ef = await softObserveEfSchedule();
  const eg = await softObserveEgCompensation();
  const eh = await softObserveEhAttestation();
  assert.equal(typeof ee.observed, 'boolean');
  assert.equal(typeof ef.observed, 'boolean');
  assert.equal(typeof eg.observed, 'boolean');
  assert.equal(typeof eh.observed, 'boolean');
  for (const s of [ee, ef, eg, eh]) assert.ok(s.observed === true || s.observed === false);
});

test('EI2: Fail-closed if ladder35-seam triad missing', () => {
  for (const rel of LADDER35_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('EI3: package.json registers Ladder 35 satellite + seam/pack/mission-ei scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER35_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder35-seam'], 'node --test tests/eos-ei-ladder35-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-ei'], 'node --test tests/eos-ei-ladder35-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder35-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER35_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder35-pack missing ' + s);
  assert.ok(pack.includes('test:ladder35-seam'));
});

test('EI4: SLIM_SUITE_EXCLUDES holds EE/EF/EG/EH + ladder35 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER35_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('EI5: PRODUCTION_READY=NO across EI triad + soft-observed satellites', async () => {
  assert.equal(EI_PORT_PRODUCTION_READY, 'NO');
  assert.equal(EI_PRODUCTION_READY, 'NO');
  assert.equal(typeof EI_PORT_KIND, 'string');
  const ee = await softObserveEeDeadline();
  const ef = await softObserveEfSchedule();
  const eg = await softObserveEgCompensation();
  const eh = await softObserveEhAttestation();
  if (ee.observed) assert.equal(ee.PRODUCTION_READY, 'NO');
  if (ef.observed) assert.equal(ef.PRODUCTION_READY, 'NO');
  if (eg.observed) assert.equal(eg.PRODUCTION_READY, 'NO');
  if (eh.observed) assert.equal(eh.PRODUCTION_READY, 'NO');
});

test('EI6: Cross-satellite smoke EE -> EF -> EG -> EH -> EI-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder35SeamPort();
  const res = await port.govern(eiHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('EI-RCPT-'));
  assert.equal(res.receipt.operation, 'LADDER35_SEAM_PACK_CLOSEOUT');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.l35AutoCloseRefused, true);
  assert.equal(res.receipt.freezeObserve.schemasAtCeiling, true);
  assert.equal(res.receipt.freezeObserve.pinShort, EH_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.eeObserved, 'boolean');
  assert.equal(typeof res.satellites.efObserved, 'boolean');
  assert.equal(typeof res.satellites.egObserved, 'boolean');
  assert.equal(typeof res.satellites.ehObserved, 'boolean');
  assert.equal(verifyLadder35SeamReceipt(res.receipt), true);
  if (res.satellites.eeObserved && res.satellites.efObserved && res.satellites.egObserved && res.satellites.ehObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['EE-RCPT-','EF-RCPT-','EG-RCPT-','EH-RCPT-']);
  }
});

test('EI7: Fundacion / tip-rewrite / L35-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY / L30-L34 reopen DENY', async () => {
  const port = new Ladder35SeamPort();
  const fundacionDeny = await port.govern(eiHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, EI_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('EI-RCPT-'));
  const tipDeny = await port.govern(eiHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, EI_CODES.TIP_REWRITE_FORBIDDEN);
  const l35Deny = await port.govern(eiHappyPlan({ planId: 'l35-autoclose-plan', l35AutoClose: true }));
  assert.equal(l35Deny.ok, false);
  assert.equal(l35Deny.code, EI_CODES.L35_AUTO_CLOSE_FORBIDDEN);
  const tipSealProduct = await port.govern(eiHappyPlan({ planId: 'tip-seal-product-plan', tipSealInProduct: true }));
  assert.equal(tipSealProduct.ok, false);
  assert.equal(tipSealProduct.code, EI_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const schemaDeny = await port.govern(eiHappyPlan({ planId: 'schema-add-plan', schemaJsonAdd: true }));
  assert.equal(schemaDeny.ok, false);
  assert.equal(schemaDeny.code, EI_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  const prDeny = await port.govern(eiHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, EI_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(eiHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, EI_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(eiHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, EI_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(eiHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, EI_CODES.L32_REOPEN_FORBIDDEN);
  const l33Deny = await port.govern(eiHappyPlan({ planId: 'l33-reopen-plan', reopenL33: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, EI_CODES.L33_REOPEN_FORBIDDEN);
  const l34Deny = await port.govern(eiHappyPlan({ planId: 'l34-reopen-plan', reopenL34: true }));
  assert.equal(l34Deny.ok, false);
  assert.equal(l34Deny.code, EI_CODES.L34_REOPEN_FORBIDDEN);
});

test('EI8: Closeout proposal keeps L35 OPEN + NON-CLAIM + tip-seal SEPARATE + L30-L34 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('L35') || /Ladder 35/.test(doc));
  assert.ok(/OPEN|remains OPEN|still OPEN/i.test(doc));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0') || doc.includes('Delta=0') || doc.includes('Δ = 0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/Deadline|TTL/i.test(doc));
  assert.ok(/Schedule|Deferred|Wake/i.test(doc));
  assert.ok(/Timeout|Compensation/i.test(doc));
  assert.ok(/Honesty|Attestation/i.test(doc));
  assert.ok(doc.includes('SPEC-0141') || doc.includes('Mission EE'));
  assert.ok(doc.includes('SPEC-0142') || doc.includes('Mission EF'));
  assert.ok(doc.includes('SPEC-0143') || doc.includes('Mission EG'));
  assert.ok(doc.includes('SPEC-0144') || doc.includes('Mission EH'));
  assert.ok(doc.includes('SPEC-0145') || doc.includes('Mission EI') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('≠ GHE') || doc.includes('!= GHE') || doc.includes('≠ GitHub'));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L34|Ladder 34/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(EH_MERGE_TIP_PIN) || doc.includes(EH_MERGE_TIP_PIN_FULL));
  assert.ok(!/Formal L35 CLOSED(?!.*tip-seal|.*SEPARATE|.*later|.*pending)/i.test(doc) || /pending tip|tip-seal later|SEPARATE|remains OPEN/i.test(doc));
});

test('EI9: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder35-seam-port.js',
    'src/core/composition/ladder35-seam-receipt.js',
    'src/core/composition/ladder35-seam-policy-gate.js',
    'tests/eos-ei-ladder35-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('EI10: ADR-0123 + evidence + OpenSpec EI change present', () => {
  assert.ok(exists('docs/adrs/ADR-0123-mission-ei-ladder35-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_EI_LADDER35_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-35-mission-ei/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-35-mission-ei/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-35-mission-ei/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-35-mission-ei/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-35-mission-ei/specs/mission-ei-ladder35-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0123-mission-ei-ladder35-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0145'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
  assert.ok(/L35.*OPEN|remains OPEN|still OPEN/i.test(adr));
});

test('EI11: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
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
  assert.equal(walk(schemasDir).length, 35, 'AT_CEILING 35/35 held — EI must not add docs/schemas/**/*.json');
});

test('EI12: Axis + human gates preserved; tip-seal SEPARATE automation ids', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/Temporal|Deadline|Schedule|Compensation|Honesty|Attestation/i.test(closeout));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L35_AUTO_CLOSE'));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_EI_MERGE'));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_SCHEMA_JSON_ADD'));
  assert.ok(EI_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('EI13: patch-mission-ei.mjs wires seam/pack/mission-ei + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-ei.mjs'));
  const patch = read('scripts/patch-mission-ei.mjs');
  assert.ok(patch.includes('test:ladder35-seam'));
  assert.ok(patch.includes('test:ladder35-pack'));
  assert.ok(patch.includes('test:mission-ei'));
  assert.ok(patch.includes('eos-ei-ladder35-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0145') || patch.includes('ladder35'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('EI14: HOLD path + receipt EI-RCPT + soft-observe pin bdd53e30', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder35SeamPort().govern(eiHappyPlan({ planId: 'plan-prefix-ei-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('EI-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, 'bdd53e30');
  assert.equal(EI_FREEZE_PIN_SHORT, 'bdd53e30');
  assert.equal(EI_FREEZE_PIN, EH_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder35SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-35-mission-ei', decision: 'PASS', seamDigest: eiSha('build') });
  assert.ok(receipt.receiptId.startsWith('EI-RCPT-'));
  assert.equal(verifyLadder35SeamReceipt(receipt), true);
});

test('EI15: Closeout declares tip-seal SEPARATE; no freeze rewrite from EI; L35 not Formal CLOSED', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  assert.ok(/L35 remains OPEN|Ladder 35 remains OPEN|still OPEN|OPEN pending/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('EI16: Policy helpers + secrets/Fundacion/tip/L35/schema detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL35AutoClose('auto-close ladder 35 now'), true);
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder35SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-35-mission-ei', tipSealL35: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, EI_CODES.L35_AUTO_CLOSE_FORBIDDEN);
});

test('EI17: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof eiSha, 'function');
  assert.equal(eiSha('ei').length, 64);
  assert.ok(exists('scripts/patch-mission-ei.mjs'));
  const patcher = read('scripts/patch-mission-ei.mjs');
  assert.ok(patcher.includes('SPEC-0145') || patcher.includes('ladder35'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0145') || /Mission EI/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0123-mission-ei-ladder35-seam-pack-closeout.md'));
});
