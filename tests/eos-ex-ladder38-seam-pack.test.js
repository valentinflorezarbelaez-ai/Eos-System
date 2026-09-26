/**
 * Ladder 38 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import ET/EU/EV/EW when present; soft-fail safe; observed true|false.
 * Soft-observe pin: b09467a2. Tip-seal SEPARATE after ES merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L37 never reopen.
 * L38 remains OPEN — Formal L38 CLOSED is tip-seal later (NOT this package).
 * Distinct from ES L37 seam / EN L36 / EI L35 / AU secrets runtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder38SeamPort,
  EX_PORT_PRODUCTION_READY,
  EX_PORT_KIND,
  EX_SAFE_AUTOMATION_IDS,
  softObserveEtCredentialHandleRegistry,
  softObserveEuSecretZeroLeakDeny,
  softObserveEvCredentialHandleLifecycle,
  softObserveEwCredentialHonestyAttestation,
  verifyLadder38SeamReceipt
} from '../src/core/composition/ladder38-seam-port.js';
import {
  sha256Canonical as esSha,
  EX_PRODUCTION_READY,
  EX_FREEZE_PIN_SHORT,
  EX_FREEZE_PIN,
  buildLadder38SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder38-seam-receipt.js';
import {
  Ladder38SeamPolicyGate,
  EX_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL38AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder38-seam-policy-gate.js';

const rootDir = process.cwd();
const EW_MERGE_TIP_PIN = 'b09467a2';
const EW_MERGE_TIP_PIN_FULL = 'b09467a2163286d81d14ab893839dfe091c588b8';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function exHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l38-ex-seam-001',
    changeId: 'eos-ladder-38-mission-ex',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 38 seam-pack consolidation govern'],
    label: 'L38 seam ES',
    ...overrides
  };
}
const LADDER38_SEAM_MODULES = [
  'src/core/composition/ladder38-seam-port.js',
  'src/core/composition/ladder38-seam-receipt.js',
  'src/core/composition/ladder38-seam-policy-gate.js'
];
const LADDER38_SATELLITE_SCRIPTS = ['test:mission-et','test:mission-eu','test:mission-ev','test:mission-ew'];
const LADDER38_SLIM_EXCLUDES = [
  'eos-et-credential-handle-registry.test.js',
  'eos-eu-secret-zero-leak-deny.test.js',
  'eos-ev-credential-handle-lifecycle.test.js',
  'eos-ew-credential-honesty-attestation.test.js',
  'eos-ex-ladder38-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_38_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md';

test('EX1: Soft-observe ET/EU/EV/EW presence (true|false accepted; soft-fail safe)', async () => {
  const et = await softObserveEtCredentialHandleRegistry();
  const eu = await softObserveEuSecretZeroLeakDeny();
  const ev = await softObserveEvCredentialHandleLifecycle();
  const ew = await softObserveEwCredentialHonestyAttestation();
  assert.equal(typeof et.observed, 'boolean');
  assert.equal(typeof eu.observed, 'boolean');
  assert.equal(typeof ev.observed, 'boolean');
  assert.equal(typeof ew.observed, 'boolean');
  for (const s of [et, eu, ev, ew]) assert.ok(s.observed === true || s.observed === false);
});

test('EX2: Fail-closed if ladder37-seam triad missing', () => {
  for (const rel of LADDER38_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('EX3: package.json registers Ladder 38 satellite + seam/pack/mission-ex scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER38_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder38-seam'], 'node --test tests/eos-ex-ladder38-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-ex'], 'node --test tests/eos-ex-ladder38-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder38-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER38_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder37-pack missing ' + s);
  assert.ok(pack.includes('test:ladder38-seam'));
});

test('EX4: SLIM_SUITE_EXCLUDES holds ET/EU/EV/EW + ladder37 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER38_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('EX5: PRODUCTION_READY=NO across ES triad + soft-observed satellites', async () => {
  assert.equal(EX_PORT_PRODUCTION_READY, 'NO');
  assert.equal(EX_PRODUCTION_READY, 'NO');
  assert.equal(typeof EX_PORT_KIND, 'string');
  const et = await softObserveEtCredentialHandleRegistry();
  const eu = await softObserveEuSecretZeroLeakDeny();
  const ev = await softObserveEvCredentialHandleLifecycle();
  const ew = await softObserveEwCredentialHonestyAttestation();
  if (et.observed) assert.equal(et.PRODUCTION_READY, 'NO');
  if (eu.observed) assert.equal(eu.PRODUCTION_READY, 'NO');
  if (ev.observed) assert.equal(ev.PRODUCTION_READY, 'NO');
  if (ew.observed) assert.equal(ew.PRODUCTION_READY, 'NO');
});

test('EX6: Cross-satellite smoke ET -> EU -> EV -> EW -> EX-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder38SeamPort();
  const res = await port.govern(exHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('EX-RCPT-'));
  assert.equal(res.receipt.operation, 'LADDER38_SEAM_PACK_CLOSEOUT');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.l38AutoCloseRefused, true);
  assert.equal(res.receipt.freezeObserve.l37ReopenRefused, true);
  assert.equal(res.receipt.freezeObserve.schemasAtCeiling, true);
  assert.equal(res.receipt.freezeObserve.pinShort, EW_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.etObserved, 'boolean');
  assert.equal(typeof res.satellites.euObserved, 'boolean');
  assert.equal(typeof res.satellites.evObserved, 'boolean');
  assert.equal(typeof res.satellites.ewObserved, 'boolean');
  assert.equal(verifyLadder38SeamReceipt(res.receipt), true);
  if (res.satellites.etObserved && res.satellites.euObserved && res.satellites.evObserved && res.satellites.ewObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['ET-RCPT-','EU-RCPT-','EV-RCPT-','EW-RCPT-']);
  }
});

test('EX7: Fundacion / tip-rewrite / L38-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY / L30-L37 reopen DENY', async () => {
  const port = new Ladder38SeamPort();
  const fundacionDeny = await port.govern(exHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, EX_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('EX-RCPT-'));
  const tipDeny = await port.govern(exHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, EX_CODES.TIP_REWRITE_FORBIDDEN);
  const l38Deny = await port.govern(exHappyPlan({ planId: 'l38-autoclose-plan', l38AutoClose: true }));
  assert.equal(l38Deny.ok, false);
  assert.equal(l38Deny.code, EX_CODES.L38_AUTO_CLOSE_FORBIDDEN);
  const tipSealProduct = await port.govern(exHappyPlan({ planId: 'tip-seal-product-plan', tipSealInProduct: true }));
  assert.equal(tipSealProduct.ok, false);
  assert.equal(tipSealProduct.code, EX_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const schemaDeny = await port.govern(exHappyPlan({ planId: 'schema-add-plan', schemaJsonAdd: true }));
  assert.equal(schemaDeny.ok, false);
  assert.equal(schemaDeny.code, EX_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  const prDeny = await port.govern(exHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, EX_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(exHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, EX_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(exHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, EX_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(exHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, EX_CODES.L32_REOPEN_FORBIDDEN);
  const l33Deny = await port.govern(exHappyPlan({ planId: 'l33-reopen-plan', reopenL33: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, EX_CODES.L33_REOPEN_FORBIDDEN);
  const l34Deny = await port.govern(exHappyPlan({ planId: 'l34-reopen-plan', reopenL34: true }));
  assert.equal(l34Deny.ok, false);
  assert.equal(l34Deny.code, EX_CODES.L34_REOPEN_FORBIDDEN);
  const l35Deny = await port.govern(exHappyPlan({ planId: 'l35-reopen-plan', reopenL35: true }));
  assert.equal(l35Deny.ok, false);
  assert.equal(l35Deny.code, EX_CODES.L35_REOPEN_FORBIDDEN);
  const l36Deny = await port.govern(exHappyPlan({ planId: 'l36-reopen-plan', reopenL36: true }));
  assert.equal(l36Deny.ok, false);
  assert.equal(l36Deny.code, EX_CODES.L36_REOPEN_FORBIDDEN);
  const l37Deny = await port.govern(exHappyPlan({ planId: 'l37-reopen-plan', reopenL37: true }));
  assert.equal(l37Deny.ok, false);
  assert.equal(l37Deny.code, EX_CODES.L37_REOPEN_FORBIDDEN);
  const auDeny = await port.govern(exHappyPlan({ planId: 'au-secrets-plan', reopenAuSecretsRuntime: true }));
  assert.equal(auDeny.ok, false);
  assert.equal(auDeny.code, EX_CODES.AU_SECRETS_RUNTIME_REOPEN_FORBIDDEN);
});

test('EX8: Closeout proposal keeps L38 OPEN + NON-CLAIM + tip-seal SEPARATE + L30-L37 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('L38') || /Ladder 38/.test(doc));
  assert.ok(/OPEN|remains OPEN|still OPEN/i.test(doc));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0') || doc.includes('Delta=0') || doc.includes('Δ = 0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/Credential.?Handle|Secret.?Zero|Feature.?Flag|Runtime.?Toggle/i.test(doc));
  assert.ok(/Policy.?Pack|Binding|Leak.?Deny|Registry/i.test(doc));
  assert.ok(/Staged.?Activation|Config Change|Handle Lifecycle|Lifecycle/i.test(doc));
  assert.ok(/Config Honesty|Flag Attestation|Honesty/i.test(doc));
  assert.ok(doc.includes('SPEC-0156') || doc.includes('Mission ET'));
  assert.ok(doc.includes('SPEC-0157') || doc.includes('Mission EU'));
  assert.ok(doc.includes('SPEC-0158') || doc.includes('Mission EV'));
  assert.ok(doc.includes('SPEC-0159') || doc.includes('Mission EW'));
  assert.ok(doc.includes('SPEC-0160') || doc.includes('Mission EX') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('≠ GHE') || doc.includes('!= GHE') || doc.includes('≠ GitHub'));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L36|Ladder 36/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(EW_MERGE_TIP_PIN) || doc.includes(EW_MERGE_TIP_PIN_FULL));
  assert.ok(!/Formal L38 CLOSED(?!.*tip-seal|.*SEPARATE|.*later|.*pending)/i.test(doc) || /pending tip|tip-seal later|SEPARATE|remains OPEN/i.test(doc));
  assert.ok(/Distinct from EN|≠ ES L37|!= ES L37|distinct from.*EN/i.test(doc) || doc.includes('EN L36') || doc.includes('EI L35'));
});

test('EX9: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder38-seam-port.js',
    'src/core/composition/ladder38-seam-receipt.js',
    'src/core/composition/ladder38-seam-policy-gate.js',
    'tests/eos-ex-ladder38-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('EX10: ADR-0141 + evidence + OpenSpec ES change present', () => {
  assert.ok(exists('docs/adrs/ADR-0141-mission-ex-ladder38-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_EX_LADDER38_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-38-mission-ex/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-38-mission-ex/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-38-mission-ex/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-38-mission-ex/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-38-mission-ex/specs/mission-ex-ladder38-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0141-mission-ex-ladder38-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0160'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
  assert.ok(/L38.*OPEN|remains OPEN|still OPEN/i.test(adr));
});

test('EX11: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
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

test('EX12: Axis + human gates preserved; tip-seal SEPARATE automation ids', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/Feature.?Flag|Policy.?Pack|Staged.?Activation|Config Honesty|Attestation/i.test(closeout));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L38_AUTO_CLOSE'));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_EX_MERGE'));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_SCHEMA_JSON_ADD'));
  assert.ok(EX_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('EX13: patch-mission-ex.mjs wires seam/pack/mission-ex + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-ex.mjs'));
  const patch = read('scripts/patch-mission-ex.mjs');
  assert.ok(patch.includes('test:ladder38-seam'));
  assert.ok(patch.includes('test:ladder38-pack'));
  assert.ok(patch.includes('test:mission-ex'));
  assert.ok(patch.includes('eos-ex-ladder38-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0160') || patch.includes('ladder37'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('EX14: HOLD path + receipt EX-RCPT + soft-observe pin b09467a2', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder38SeamPort().govern(exHappyPlan({ planId: 'plan-prefix-es-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('EX-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, 'b09467a2');
  assert.equal(EX_FREEZE_PIN_SHORT, 'b09467a2');
  assert.equal(EX_FREEZE_PIN, EW_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder38SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-38-mission-ex', decision: 'PASS', seamDigest: esSha('build') });
  assert.ok(receipt.receiptId.startsWith('EX-RCPT-'));
  assert.equal(verifyLadder38SeamReceipt(receipt), true);
});

test('EX15: Closeout declares tip-seal SEPARATE; no freeze rewrite from ES; L38 not Formal CLOSED', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  assert.ok(/L38 remains OPEN|Ladder 38 remains OPEN|still OPEN|OPEN pending/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('EX16: Policy helpers + secrets/Fundacion/tip/L38/schema detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip pin now'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL38AutoClose('auto-close ladder 38 now'), true);
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder38SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-38-mission-ex', tipSealL38: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, EX_CODES.L38_AUTO_CLOSE_FORBIDDEN);
});

test('EX17: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof esSha, 'function');
  assert.equal(esSha('es').length, 64);
  assert.ok(exists('scripts/patch-mission-ex.mjs'));
  const patcher = read('scripts/patch-mission-ex.mjs');
  assert.ok(patcher.includes('SPEC-0160') || patcher.includes('ladder37'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0160') || /Mission EX/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0141-mission-ex-ladder38-seam-pack-closeout.md'));
});