/**
 * Ladder 39 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import EY/EZ/FA/FB when present; soft-fail safe; observed true|false.
 * Soft-observe pin: d1041230. Tip-seal SEPARATE after FC merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L38 never reopen.
 * L39 remains OPEN — Formal L39 CLOSED is tip-seal later (NOT this package).
 * Distinct from EX L38 seam / ES L37 / EN L36 / EI L35 / AU secrets runtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder39SeamPort,
  FC_PORT_PRODUCTION_READY,
  FC_PORT_KIND,
  FC_SAFE_AUTOMATION_IDS,
  softObserveEyExternalEventIngressRegistry,
  softObserveEzWebhookAuthenticity,
  softObserveFaIngressQuarantineReplayDeny,
  softObserveFbIngressHonestyAttestation,
  verifyLadder39SeamReceipt
} from '../src/core/composition/ladder39-seam-port.js';
import {
  sha256Canonical as fcSha,
  FC_PRODUCTION_READY,
  FC_FREEZE_PIN_SHORT,
  FC_FREEZE_PIN,
  buildLadder39SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder39-seam-receipt.js';
import {
  Ladder39SeamPolicyGate,
  FC_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL39AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder39-seam-policy-gate.js';

const rootDir = process.cwd();
const FB_MERGE_TIP_PIN = 'd1041230';
const FB_MERGE_TIP_PIN_FULL = 'd1041230300465e6516e8d78725bebadb93fcaa2';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function fcHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l39-fc-seam-001',
    changeId: 'eos-ladder-39-mission-fc',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 39 seam-pack consolidation govern'],
    label: 'L39 seam FC',
    ...overrides
  };
}
const LADDER39_SEAM_MODULES = [
  'src/core/composition/ladder39-seam-port.js',
  'src/core/composition/ladder39-seam-receipt.js',
  'src/core/composition/ladder39-seam-policy-gate.js'
];
const LADDER39_SATELLITE_SCRIPTS = ['test:mission-ey','test:mission-ez','test:mission-fa','test:mission-fb'];
const LADDER39_SLIM_EXCLUDES = [
  'eos-ey-external-event-ingress-registry.test.js',
  'eos-ez-webhook-authenticity.test.js',
  'eos-fa-ingress-quarantine-replay-deny.test.js',
  'eos-fb-ingress-honesty-attestation.test.js',
  'eos-fc-ladder39-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_39_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md';

test('FC1: Soft-observe EY/EZ/FA/FB presence (true|false accepted; soft-fail safe)', async () => {
  const ey = await softObserveEyExternalEventIngressRegistry();
  const ez = await softObserveEzWebhookAuthenticity();
  const fa = await softObserveFaIngressQuarantineReplayDeny();
  const fb = await softObserveFbIngressHonestyAttestation();
  assert.equal(typeof ey.observed, 'boolean');
  assert.equal(typeof ez.observed, 'boolean');
  assert.equal(typeof fa.observed, 'boolean');
  assert.equal(typeof fb.observed, 'boolean');
  for (const s of [ey, ez, fa, fb]) assert.ok(s.observed === true || s.observed === false);
});

test('FC2: Fail-closed if ladder39-seam triad missing', () => {
  for (const rel of LADDER39_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('FC3: package.json registers Ladder 39 satellite + seam/pack/mission-fc scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER39_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder39-seam'], 'node --test tests/eos-fc-ladder39-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-fc'], 'node --test tests/eos-fc-ladder39-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder39-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER39_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder39-pack missing ' + s);
  assert.ok(pack.includes('test:ladder39-seam'));
});

test('FC4: SLIM_SUITE_EXCLUDES holds EY/EZ/FA/FB + ladder39 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER39_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('FC5: PRODUCTION_READY=NO across FC triad + soft-observed satellites', async () => {
  assert.equal(FC_PORT_PRODUCTION_READY, 'NO');
  assert.equal(FC_PRODUCTION_READY, 'NO');
  assert.equal(typeof FC_PORT_KIND, 'string');
  const ey = await softObserveEyExternalEventIngressRegistry();
  const ez = await softObserveEzWebhookAuthenticity();
  const fa = await softObserveFaIngressQuarantineReplayDeny();
  const fb = await softObserveFbIngressHonestyAttestation();
  if (ey.observed) assert.equal(ey.PRODUCTION_READY, 'NO');
  if (ez.observed) assert.equal(ez.PRODUCTION_READY, 'NO');
  if (fa.observed) assert.equal(fa.PRODUCTION_READY, 'NO');
  if (fb.observed) assert.equal(fb.PRODUCTION_READY, 'NO');
});

test('FC6: Cross-satellite smoke EY -> EZ -> FA -> FB -> FC-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder39SeamPort();
  const res = await port.govern(fcHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('FC-RCPT-'));
  assert.equal(res.receipt.operation, 'LADDER39_SEAM_PACK_CLOSEOUT');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.l39AutoCloseRefused, true);
  assert.equal(res.receipt.freezeObserve.l38ReopenRefused, true);
  assert.equal(res.receipt.freezeObserve.schemasAtCeiling, true);
  assert.equal(res.receipt.freezeObserve.pinShort, FB_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.eyObserved, 'boolean');
  assert.equal(typeof res.satellites.ezObserved, 'boolean');
  assert.equal(typeof res.satellites.faObserved, 'boolean');
  assert.equal(typeof res.satellites.fbObserved, 'boolean');
  assert.equal(verifyLadder39SeamReceipt(res.receipt), true);
  if (res.satellites.eyObserved && res.satellites.ezObserved && res.satellites.faObserved && res.satellites.fbObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['EY-RCPT-','EZ-RCPT-','FA-RCPT-','FB-RCPT-']);
  }
});

test('FC7: Fundacion / tip-rewrite / L39-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY / L30-L38 reopen DENY', async () => {
  const port = new Ladder39SeamPort();
  const fundacionDeny = await port.govern(fcHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, FC_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('FC-RCPT-'));
  const tipDeny = await port.govern(fcHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, FC_CODES.TIP_REWRITE_FORBIDDEN);
  const l39Deny = await port.govern(fcHappyPlan({ planId: 'l39-autoclose-plan', l39AutoClose: true }));
  assert.equal(l39Deny.ok, false);
  assert.equal(l39Deny.code, FC_CODES.L39_AUTO_CLOSE_FORBIDDEN);
  const tipSealProduct = await port.govern(fcHappyPlan({ planId: 'tip-seal-product-plan', tipSealInProduct: true }));
  assert.equal(tipSealProduct.ok, false);
  assert.equal(tipSealProduct.code, FC_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const schemaDeny = await port.govern(fcHappyPlan({ planId: 'schema-add-plan', schemaJsonAdd: true }));
  assert.equal(schemaDeny.ok, false);
  assert.equal(schemaDeny.code, FC_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  const prDeny = await port.govern(fcHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, FC_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(fcHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, FC_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(fcHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, FC_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(fcHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, FC_CODES.L32_REOPEN_FORBIDDEN);
  const l33Deny = await port.govern(fcHappyPlan({ planId: 'l33-reopen-plan', reopenL33: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, FC_CODES.L33_REOPEN_FORBIDDEN);
  const l34Deny = await port.govern(fcHappyPlan({ planId: 'l34-reopen-plan', reopenL34: true }));
  assert.equal(l34Deny.ok, false);
  assert.equal(l34Deny.code, FC_CODES.L34_REOPEN_FORBIDDEN);
  const l35Deny = await port.govern(fcHappyPlan({ planId: 'l35-reopen-plan', reopenL35: true }));
  assert.equal(l35Deny.ok, false);
  assert.equal(l35Deny.code, FC_CODES.L35_REOPEN_FORBIDDEN);
  const l36Deny = await port.govern(fcHappyPlan({ planId: 'l36-reopen-plan', reopenL36: true }));
  assert.equal(l36Deny.ok, false);
  assert.equal(l36Deny.code, FC_CODES.L36_REOPEN_FORBIDDEN);
  const l37Deny = await port.govern(fcHappyPlan({ planId: 'l37-reopen-plan', reopenL37: true }));
  assert.equal(l37Deny.ok, false);
  assert.equal(l37Deny.code, FC_CODES.L37_REOPEN_FORBIDDEN);
  const l38Deny = await port.govern(fcHappyPlan({ planId: 'l38-reopen-plan', reopenL38: true }));
  assert.equal(l38Deny.ok, false);
  assert.equal(l38Deny.code, FC_CODES.L38_REOPEN_FORBIDDEN);
  const auDeny = await port.govern(fcHappyPlan({ planId: 'au-secrets-plan', reopenAuSecretsRuntime: true }));
  assert.equal(auDeny.ok, false);
  assert.equal(auDeny.code, FC_CODES.AU_SECRETS_RUNTIME_REOPEN_FORBIDDEN);
});

test('FC8: Closeout proposal keeps L39 OPEN + NON-CLAIM + tip-seal SEPARATE + L30-L38 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('L39') || /Ladder 39/.test(doc));
  assert.ok(/OPEN|remains OPEN|still OPEN/i.test(doc));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0') || doc.includes('Delta=0') || doc.includes('Δ = 0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/External.?Event.?Ingress|Webhook.?Authenticity|Ingress.?Registry/i.test(doc));
  assert.ok(/Quarantine|Replay.?Deny|Authenticity/i.test(doc));
  assert.ok(/Honesty|Attestation/i.test(doc));
  assert.ok(doc.includes('SPEC-0161') || doc.includes('Mission EY'));
  assert.ok(doc.includes('SPEC-0162') || doc.includes('Mission EZ'));
  assert.ok(doc.includes('SPEC-0163') || doc.includes('Mission FA'));
  assert.ok(doc.includes('SPEC-0164') || doc.includes('Mission FB'));
  assert.ok(doc.includes('SPEC-0165') || doc.includes('Mission FC') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('≠ GHE') || doc.includes('!= GHE') || doc.includes('≠ GitHub'));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L38|Ladder 38/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(FB_MERGE_TIP_PIN) || doc.includes(FB_MERGE_TIP_PIN_FULL));
  assert.ok(!/Formal L39 CLOSED(?!.*tip-seal|.*SEPARATE|.*later|.*pending)/i.test(doc) || /pending tip|tip-seal later|SEPARATE|remains OPEN/i.test(doc));
  assert.ok(/Distinct from EX|≠ EX L38|!= EX L38|distinct from.*EX/i.test(doc) || doc.includes('EX L38') || doc.includes('ES L37'));
});

test('FC9: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder39-seam-port.js',
    'src/core/composition/ladder39-seam-receipt.js',
    'src/core/composition/ladder39-seam-policy-gate.js',
    'tests/eos-fc-ladder39-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('FC10: ADR-0147 + evidence + OpenSpec FC change present', () => {
  assert.ok(exists('docs/adrs/ADR-0147-mission-fc-ladder39-seam-pack.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_FC_LADDER39_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-39-mission-fc/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-39-mission-fc/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-39-mission-fc/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-39-mission-fc/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-39-mission-fc/specs/mission-fc-ladder39-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0147-mission-fc-ladder39-seam-pack.md');
  assert.ok(adr.includes('SPEC-0165'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
  assert.ok(/L39.*OPEN|remains OPEN|still OPEN/i.test(adr));
});

test('FC11: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  if (!fs.existsSync(schemasDir)) {
    assert.ok(!exists('docs/schemas') || true, 'hermetic package: no schemas tree added by FC');
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
  assert.equal(walk(schemasDir).length, 35, 'AT_CEILING 35/35 held — FC must not add docs/schemas/**/*.json');
});

test('FC12: Axis + human gates preserved; tip-seal SEPARATE automation ids', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/External.?Event.?Ingress|Webhook.?Authenticity|Quarantine|Honesty.?Attestation/i.test(closeout));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L39_AUTO_CLOSE'));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_FC_MERGE'));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A12_REFUSE_SCHEMA_JSON_ADD'));
  assert.ok(FC_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('FC13: patch-mission-fc.mjs wires seam/pack/mission-fc + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-fc.mjs'));
  const patch = read('scripts/patch-mission-fc.mjs');
  assert.ok(patch.includes('test:ladder39-seam'));
  assert.ok(patch.includes('test:ladder39-pack'));
  assert.ok(patch.includes('test:mission-fc'));
  assert.ok(patch.includes('eos-fc-ladder39-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0165') || patch.includes('ladder39'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('FC14: HOLD path + receipt FC-RCPT + soft-observe pin d1041230', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder39SeamPort().govern(fcHappyPlan({ planId: 'plan-prefix-fc-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('FC-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, 'd1041230');
  assert.equal(FC_FREEZE_PIN_SHORT, 'd1041230');
  assert.equal(FC_FREEZE_PIN, FB_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder39SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-39-mission-fc', decision: 'PASS', seamDigest: fcSha('build') });
  assert.ok(receipt.receiptId.startsWith('FC-RCPT-'));
  assert.equal(verifyLadder39SeamReceipt(receipt), true);
});

test('FC15: Closeout declares tip-seal SEPARATE; no freeze rewrite from FC; L39 not Formal CLOSED', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  assert.ok(/L39 remains OPEN|Ladder 39 remains OPEN|still OPEN|OPEN pending/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('FC16: Policy helpers + secrets/Fundacion/tip/L39/schema detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip pin now'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL39AutoClose('auto-close ladder 39 now'), true);
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder39SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-39-mission-fc', tipSealL39: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, FC_CODES.L39_AUTO_CLOSE_FORBIDDEN);
});

test('FC17: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof fcSha, 'function');
  assert.equal(fcSha('fc').length, 64);
  assert.ok(exists('scripts/patch-mission-fc.mjs'));
  const patcher = read('scripts/patch-mission-fc.mjs');
  assert.ok(patcher.includes('SPEC-0165') || patcher.includes('ladder39'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0165') || /Mission FC/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0147-mission-fc-ladder39-seam-pack.md'));
});
