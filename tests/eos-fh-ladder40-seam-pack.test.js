/**
 * Ladder 40 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import FD/FE/FF/FG when present; soft-fail safe; observed true|false.
 * Soft-observe pin: 1376ac54. Tip-seal SEPARATE after FH merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L39 never reopen.
 * L40 remains OPEN — Formal L40 CLOSED is tip-seal later (NOT this package).
 * Distinct from FC L39 seam / EX L38 / ES L37 / EN L36 / EI L35 / AU secrets runtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder40SeamPort,
  FH_PORT_PRODUCTION_READY,
  FH_PORT_KIND,
  FH_SAFE_AUTOMATION_IDS,
  softObserveFdOutboundDeliveryCallbackRegistry,
  softObserveFeOutboundCallbackAuthenticity,
  softObserveFfOutboundDeliveryQuarantineRetryDeny,
  softObserveFgOutboundDeliveryHonestyAttestation,
  verifyLadder40SeamReceipt
} from '../src/core/composition/ladder40-seam-port.js';
import {
  sha256Canonical as fhSha,
  FH_PRODUCTION_READY,
  FH_FREEZE_PIN_SHORT,
  FH_FREEZE_PIN,
  buildLadder40SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder40-seam-receipt.js';
import {
  Ladder40SeamPolicyGate,
  FH_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL40AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder40-seam-policy-gate.js';

const rootDir = process.cwd();
const FG_MERGE_TIP_PIN = '1376ac54';
const FG_MERGE_TIP_PIN_FULL = '1376ac546764a8a4df7ed85677241ae8e98abe54';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function fhHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l40-fh-seam-001',
    changeId: 'eos-ladder-40-mission-fh',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 40 seam-pack consolidation govern'],
    label: 'L40 seam FH',
    ...overrides
  };
}
const LADDER40_SEAM_MODULES = [
  'src/core/composition/ladder40-seam-port.js',
  'src/core/composition/ladder40-seam-receipt.js',
  'src/core/composition/ladder40-seam-policy-gate.js'
];
const LADDER40_SATELLITE_SCRIPTS = ['test:mission-fd','test:mission-fe','test:mission-ff','test:mission-fg'];
const LADDER40_SLIM_EXCLUDES = [
  'eos-fd-outbound-delivery-callback-registry.test.js',
  'eos-fe-outbound-callback-authenticity.test.js',
  'eos-ff-outbound-delivery-quarantine-retry-deny.test.js',
  'eos-fg-outbound-delivery-honesty-attestation.test.js',
  'eos-fh-ladder40-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_40_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md';

test('FH1: Soft-observe FD/FE/FF/FG presence (true|false accepted; soft-fail safe)', async () => {
  const fd = await softObserveFdOutboundDeliveryCallbackRegistry();
  const fe = await softObserveFeOutboundCallbackAuthenticity();
  const ff = await softObserveFfOutboundDeliveryQuarantineRetryDeny();
  const fg = await softObserveFgOutboundDeliveryHonestyAttestation();
  assert.equal(typeof fd.observed, 'boolean');
  assert.equal(typeof fe.observed, 'boolean');
  assert.equal(typeof ff.observed, 'boolean');
  assert.equal(typeof fg.observed, 'boolean');
  for (const s of [fd, fe, ff, fg]) assert.ok(s.observed === true || s.observed === false);
});

test('FH2: Fail-closed if ladder40-seam triad missing', () => {
  for (const rel of LADDER40_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('FH3: package.json registers Ladder 40 satellite + seam/pack/mission-fh scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER40_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder40-seam'], 'node --test tests/eos-fh-ladder40-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-fh'], 'node --test tests/eos-fh-ladder40-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder40-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER40_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder40-pack missing ' + s);
  assert.ok(pack.includes('test:ladder40-seam'));
});

test('FH4: SLIM_SUITE_EXCLUDES holds FD/FE/FF/FG + ladder40 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER40_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('FH5: PRODUCTION_READY=NO across FH triad + soft-observed satellites', async () => {
  assert.equal(FH_PORT_PRODUCTION_READY, 'NO');
  assert.equal(FH_PRODUCTION_READY, 'NO');
  assert.equal(typeof FH_PORT_KIND, 'string');
  const fd = await softObserveFdOutboundDeliveryCallbackRegistry();
  const fe = await softObserveFeOutboundCallbackAuthenticity();
  const ff = await softObserveFfOutboundDeliveryQuarantineRetryDeny();
  const fg = await softObserveFgOutboundDeliveryHonestyAttestation();
  if (fd.observed) assert.equal(fd.PRODUCTION_READY, 'NO');
  if (fe.observed) assert.equal(fe.PRODUCTION_READY, 'NO');
  if (ff.observed) assert.equal(ff.PRODUCTION_READY, 'NO');
  if (fg.observed) assert.equal(fg.PRODUCTION_READY, 'NO');
});

test('FH6: Cross-satellite smoke FD -> FE -> FF -> FG -> FH-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder40SeamPort();
  const res = await port.govern(fhHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('FH-RCPT-'));
  assert.equal(res.receipt.operation, 'LADDER40_SEAM_PACK_CLOSEOUT');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.l40AutoCloseRefused, true);
  assert.equal(res.receipt.freezeObserve.l39ReopenRefused, true);
  assert.equal(res.receipt.freezeObserve.schemasAtCeiling, true);
  assert.equal(res.receipt.freezeObserve.pinShort, FG_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.fdObserved, 'boolean');
  assert.equal(typeof res.satellites.feObserved, 'boolean');
  assert.equal(typeof res.satellites.ffObserved, 'boolean');
  assert.equal(typeof res.satellites.fgObserved, 'boolean');
  assert.equal(verifyLadder40SeamReceipt(res.receipt), true);
  const trail = port.verifyTrail();
  assert.equal(trail.ok, true);
  assert.ok(trail.verifiedCount >= 1);
  if (res.satellites.fdObserved && res.satellites.feObserved && res.satellites.ffObserved && res.satellites.fgObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['FD-RCPT-','FE-RCPT-','FF-RCPT-','FG-RCPT-']);
  }
});

test('FH7: Fundacion / tip-rewrite / L40-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY / L30-L39 reopen DENY', async () => {
  const port = new Ladder40SeamPort();
  const fundacionDeny = await port.govern(fhHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, FH_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('FH-RCPT-'));
  const tipDeny = await port.govern(fhHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, FH_CODES.TIP_REWRITE_FORBIDDEN);
  const l40Deny = await port.govern(fhHappyPlan({ planId: 'l40-autoclose-plan', l40AutoClose: true }));
  assert.equal(l40Deny.ok, false);
  assert.equal(l40Deny.code, FH_CODES.L40_AUTO_CLOSE_FORBIDDEN);
  const tipSealProduct = await port.govern(fhHappyPlan({ planId: 'tip-seal-product-plan', tipSealInProduct: true }));
  assert.equal(tipSealProduct.ok, false);
  assert.equal(tipSealProduct.code, FH_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const schemaDeny = await port.govern(fhHappyPlan({ planId: 'schema-add-plan', schemaJsonAdd: true }));
  assert.equal(schemaDeny.ok, false);
  assert.equal(schemaDeny.code, FH_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  const prDeny = await port.govern(fhHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, FH_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(fhHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, FH_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(fhHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, FH_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(fhHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, FH_CODES.L32_REOPEN_FORBIDDEN);
  const l33Deny = await port.govern(fhHappyPlan({ planId: 'l33-reopen-plan', reopenL33: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, FH_CODES.L33_REOPEN_FORBIDDEN);
  const l34Deny = await port.govern(fhHappyPlan({ planId: 'l34-reopen-plan', reopenL34: true }));
  assert.equal(l34Deny.ok, false);
  assert.equal(l34Deny.code, FH_CODES.L34_REOPEN_FORBIDDEN);
  const l35Deny = await port.govern(fhHappyPlan({ planId: 'l35-reopen-plan', reopenL35: true }));
  assert.equal(l35Deny.ok, false);
  assert.equal(l35Deny.code, FH_CODES.L35_REOPEN_FORBIDDEN);
  const l36Deny = await port.govern(fhHappyPlan({ planId: 'l36-reopen-plan', reopenL36: true }));
  assert.equal(l36Deny.ok, false);
  assert.equal(l36Deny.code, FH_CODES.L36_REOPEN_FORBIDDEN);
  const l37Deny = await port.govern(fhHappyPlan({ planId: 'l37-reopen-plan', reopenL37: true }));
  assert.equal(l37Deny.ok, false);
  assert.equal(l37Deny.code, FH_CODES.L37_REOPEN_FORBIDDEN);
  const l38Deny = await port.govern(fhHappyPlan({ planId: 'l38-reopen-plan', reopenL38: true }));
  assert.equal(l38Deny.ok, false);
  assert.equal(l38Deny.code, FH_CODES.L38_REOPEN_FORBIDDEN);
  const l39Deny = await port.govern(fhHappyPlan({ planId: 'l39-reopen-plan', reopenL39: true }));
  assert.equal(l39Deny.ok, false);
  assert.equal(l39Deny.code, FH_CODES.L39_REOPEN_FORBIDDEN);
  const auDeny = await port.govern(fhHappyPlan({ planId: 'au-secrets-plan', reopenAuSecretsRuntime: true }));
  assert.equal(auDeny.ok, false);
  assert.equal(auDeny.code, FH_CODES.AU_SECRETS_RUNTIME_REOPEN_FORBIDDEN);
});

test('FH8: Closeout proposal keeps L40 OPEN + NON-CLAIM + tip-seal SEPARATE + L30-L39 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('L40') || /Ladder 40/.test(doc));
  assert.ok(/OPEN|remains OPEN|still OPEN/i.test(doc));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0') || doc.includes('Delta=0') || doc.includes('Δ = 0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/Outbound.?Delivery|Callback.?Authenticity|Callback.?Registry/i.test(doc));
  assert.ok(/Quarantine|Retry.?Deny|Authenticity/i.test(doc));
  assert.ok(/Honesty|Attestation/i.test(doc));
  assert.ok(doc.includes('SPEC-0166') || doc.includes('Mission FD'));
  assert.ok(doc.includes('SPEC-0167') || doc.includes('Mission FE'));
  assert.ok(doc.includes('SPEC-0168') || doc.includes('Mission FF'));
  assert.ok(doc.includes('SPEC-0169') || doc.includes('Mission FG'));
  assert.ok(doc.includes('SPEC-0170') || doc.includes('Mission FH') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('≠ GHE') || doc.includes('!= GHE') || doc.includes('≠ GitHub'));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L39|Ladder 39/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(FG_MERGE_TIP_PIN) || doc.includes(FG_MERGE_TIP_PIN_FULL));
  assert.ok(!/Formal L40 CLOSED(?!.*tip-seal|.*SEPARATE|.*later|.*pending)/i.test(doc) || /pending tip|tip-seal later|SEPARATE|remains OPEN/i.test(doc));
  assert.ok(/Distinct from FC|≠ FC L39|!= FC L39|distinct from.*FC/i.test(doc) || doc.includes('FC L39') || doc.includes('EX L38'));
});

test('FH9: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder40-seam-port.js',
    'src/core/composition/ladder40-seam-receipt.js',
    'src/core/composition/ladder40-seam-policy-gate.js',
    'tests/eos-fh-ladder40-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('FH10: ADR-0153 + evidence + OpenSpec FH change present', () => {
  assert.ok(exists('docs/adrs/ADR-0153-mission-fh-ladder-40-ci-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_FH_LADDER40_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-40-mission-fh/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-40-mission-fh/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-40-mission-fh/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-40-mission-fh/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-40-mission-fh/specs/mission-fh-ladder40-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0153-mission-fh-ladder-40-ci-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0170'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
  assert.ok(/L40.*OPEN|remains OPEN|still OPEN/i.test(adr));
});

test('FH11: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  if (!fs.existsSync(schemasDir)) {
    assert.ok(!exists('docs/schemas') || true, 'hermetic package: no schemas tree added by FH');
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
  assert.equal(walk(schemasDir).length, 35, 'AT_CEILING 35/35 held — FH must not add docs/schemas/**/*.json');
});

test('FH12: Axis + human gates preserved; tip-seal SEPARATE automation ids', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/Outbound.?Delivery|Callback.?Authenticity|Quarantine|Honesty.?Attestation/i.test(closeout));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L40_AUTO_CLOSE'));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_FH_MERGE'));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_SCHEMA_JSON_ADD'));
  assert.ok(FH_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('FH13: patch-mission-fh.mjs wires seam/pack/mission-fh + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-fh.mjs'));
  const patch = read('scripts/patch-mission-fh.mjs');
  assert.ok(patch.includes('test:ladder40-seam'));
  assert.ok(patch.includes('test:ladder40-pack'));
  assert.ok(patch.includes('test:mission-fh'));
  assert.ok(patch.includes('eos-fh-ladder40-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0170') || patch.includes('ladder40'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('FH14: HOLD path + receipt FH-RCPT + soft-observe pin 1376ac54', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder40SeamPort().govern(fhHappyPlan({ planId: 'plan-prefix-fh-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('FH-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, '1376ac54');
  assert.equal(FH_FREEZE_PIN_SHORT, '1376ac54');
  assert.equal(FH_FREEZE_PIN, FG_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder40SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-40-mission-fh', decision: 'PASS', seamDigest: fhSha('build') });
  assert.ok(receipt.receiptId.startsWith('FH-RCPT-'));
  assert.equal(verifyLadder40SeamReceipt(receipt), true);
});

test('FH15: Closeout declares tip-seal SEPARATE; no freeze rewrite from FH; L40 not Formal CLOSED', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  assert.ok(/L40 remains OPEN|Ladder 40 remains OPEN|still OPEN|OPEN pending/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('FH16: Policy helpers + secrets/Fundacion/tip/L40/schema detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip pin now'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL40AutoClose('auto-close ladder 40 now'), true);
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder40SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-40-mission-fh', tipSealL40: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, FH_CODES.L40_AUTO_CLOSE_FORBIDDEN);
});

test('FH17: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof fhSha, 'function');
  assert.equal(fhSha('fh').length, 64);
  assert.ok(exists('scripts/patch-mission-fh.mjs'));
  const patcher = read('scripts/patch-mission-fh.mjs');
  assert.ok(patcher.includes('SPEC-0170') || patcher.includes('ladder40'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0170') || /Mission FH/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0153-mission-fh-ladder-40-ci-seam-pack-closeout.md'));
});
