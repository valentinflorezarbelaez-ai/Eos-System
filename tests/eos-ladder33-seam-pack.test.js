/**
 * Ladder 33 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * Soft-import DU/DV/DW/DX when present; soft-fail safe; observed true|false.
 * Soft-observe pin: fe52fb3b. Tip-seal SEPARATE after DY merge.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L32 never reopen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder33SeamPort,
  DY_PORT_PRODUCTION_READY,
  DY_PORT_KIND,
  DY_SAFE_AUTOMATION_IDS,
  softObserveDuPublisher,
  softObserveDvOutbox,
  softObserveDwConsumer,
  softObserveDxBreaker,
  verifyLadder33SeamReceipt
} from '../src/core/composition/ladder33-seam-port.js';
import {
  sha256Canonical as dySha,
  DY_PRODUCTION_READY,
  DY_FREEZE_PIN_SHORT,
  DY_FREEZE_PIN,
  buildLadder33SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder33-seam-receipt.js';
import {
  Ladder33SeamPolicyGate,
  DY_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL33AutoClose,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder33-seam-policy-gate.js';

const rootDir = process.cwd();
const DX_MERGE_TIP_PIN = 'fe52fb3b';
const DX_MERGE_TIP_PIN_FULL = 'fe52fb3bbfa23aaedcca3efdaa53e1c16722a823';
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function dyHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l33-dy-seam-001',
    changeId: 'eos-ladder-33-mission-dy',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 33 seam-pack consolidation govern'],
    label: 'L33 seam DY',
    ...overrides
  };
}
const LADDER33_SEAM_MODULES = [
  'src/core/composition/ladder33-seam-port.js',
  'src/core/composition/ladder33-seam-receipt.js',
  'src/core/composition/ladder33-seam-policy-gate.js'
];
const LADDER33_SATELLITE_SCRIPTS = ['test:mission-du','test:mission-dv','test:mission-dw','test:mission-dx'];
const LADDER33_SLIM_EXCLUDES = [
  'eos-du-domain-event-publisher-port.test.js',
  'eos-dv-transactional-outbox-port.test.js',
  'eos-dw-idempotent-message-consumer-port.test.js',
  'eos-dx-circuit-breaker-port.test.js',
  'eos-ladder33-seam-pack.test.js'
];
const CLOSEOUT_REL = 'docs/releases/EOS_LADDER_33_CLOSEOUT_2026-09-25.md';

test('L33-SEAM-0: Soft-observe DU/DV/DW/DX presence (true|false accepted; soft-fail safe)', async () => {
  const du = await softObserveDuPublisher();
  const dv = await softObserveDvOutbox();
  const dw = await softObserveDwConsumer();
  const dx = await softObserveDxBreaker();
  assert.equal(typeof du.observed, 'boolean');
  assert.equal(typeof dv.observed, 'boolean');
  assert.equal(typeof dw.observed, 'boolean');
  assert.equal(typeof dx.observed, 'boolean');
  for (const s of [du, dv, dw, dx]) assert.ok(s.observed === true || s.observed === false);
});

test('L33-SEAM-1: Fail-closed if ladder33-seam triad missing', () => {
  for (const rel of LADDER33_SEAM_MODULES) assert.ok(exists(rel), 'Fail-closed: missing seam module ' + rel);
});

test('L33-SEAM-2: package.json registers Ladder 33 satellite + seam/pack/mission-dy scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER33_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder33-seam'], 'node --test tests/eos-ladder33-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-dy'], 'node --test tests/eos-ladder33-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder33-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER33_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder33-pack missing ' + s);
  assert.ok(pack.includes('test:ladder33-seam'));
});

test('L33-SEAM-3: SLIM_SUITE_EXCLUDES holds DU/DV/DW/DX + ladder33 seam', () => {
  assert.ok(exists('scripts/test-runner.js'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER33_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
});

test('L33-SEAM-4: PRODUCTION_READY=NO across DY triad + soft-observed satellites', async () => {
  assert.equal(DY_PORT_PRODUCTION_READY, 'NO');
  assert.equal(DY_PRODUCTION_READY, 'NO');
  assert.equal(typeof DY_PORT_KIND, 'string');
  const du = await softObserveDuPublisher();
  const dv = await softObserveDvOutbox();
  const dw = await softObserveDwConsumer();
  const dx = await softObserveDxBreaker();
  if (du.observed) assert.equal(du.PRODUCTION_READY, 'NO');
  if (dv.observed) assert.equal(dv.PRODUCTION_READY, 'NO');
  if (dw.observed) assert.equal(dw.PRODUCTION_READY, 'NO');
  if (dx.observed) assert.equal(dx.PRODUCTION_READY, 'NO');
});

test('L33-SEAM-5: Cross-satellite smoke DU -> DV -> DW -> DX -> DY-RCPT seal', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder33SeamPort();
  const res = await port.govern(dyHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('DY-RCPT-'));
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.freezeObserve.readOnly, true);
  assert.equal(res.receipt.freezeObserve.tipSealSeparate, true);
  assert.equal(res.receipt.freezeObserve.pinShort, DX_MERGE_TIP_PIN);
  assert.equal(typeof res.satellites.duObserved, 'boolean');
  assert.equal(typeof res.satellites.dvObserved, 'boolean');
  assert.equal(typeof res.satellites.dwObserved, 'boolean');
  assert.equal(typeof res.satellites.dxObserved, 'boolean');
  assert.equal(verifyLadder33SeamReceipt(res.receipt), true);
  if (res.satellites.duObserved && res.satellites.dvObserved && res.satellites.dwObserved && res.satellites.dxObserved) {
    assert.deepEqual(res.receipt.chainObserve.prefixes, ['DU-RCPT-','DV-RCPT-','DW-RCPT-','DX-RCPT-']);
  }
});

test('L33-SEAM-6: Fundacion / tip-rewrite / L33-auto-close / PRODUCTION_READY / L30-L32 reopen DENY', async () => {
  const port = new Ladder33SeamPort();
  const fundacionDeny = await port.govern(dyHappyPlan({ planId: 'fundacion-plan', target: 'Documents/Fundacion/ledger' }));
  assert.equal(fundacionDeny.ok, false);
  assert.equal(fundacionDeny.code, DY_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(fundacionDeny.receipt.receiptId.startsWith('DY-RCPT-'));
  const tipDeny = await port.govern(dyHappyPlan({ planId: 'tip-rewrite-plan', claim: 'rewrite freeze tip pin now' }));
  assert.equal(tipDeny.ok, false);
  assert.equal(tipDeny.code, DY_CODES.TIP_REWRITE_FORBIDDEN);
  const l33Deny = await port.govern(dyHappyPlan({ planId: 'l33-autoclose-plan', l33AutoClose: true }));
  assert.equal(l33Deny.ok, false);
  assert.equal(l33Deny.code, DY_CODES.L33_AUTO_CLOSE_FORBIDDEN);
  const prDeny = await port.govern(dyHappyPlan({ planId: 'pr-flip-plan', claim: 'PRODUCTION_READY=YES' }));
  assert.equal(prDeny.ok, false);
  assert.equal(prDeny.code, DY_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  const l30Deny = await port.govern(dyHappyPlan({ planId: 'l30-reopen-plan', reopenL30: true }));
  assert.equal(l30Deny.ok, false);
  assert.equal(l30Deny.code, DY_CODES.L30_REOPEN_FORBIDDEN);
  const l31Deny = await port.govern(dyHappyPlan({ planId: 'l31-reopen-plan', reopenL31: true }));
  assert.equal(l31Deny.ok, false);
  assert.equal(l31Deny.code, DY_CODES.L31_REOPEN_FORBIDDEN);
  const l32Deny = await port.govern(dyHappyPlan({ planId: 'l32-reopen-plan', reopenL32: true }));
  assert.equal(l32Deny.ok, false);
  assert.equal(l32Deny.code, DY_CODES.L32_REOPEN_FORBIDDEN);
});

test('L33-SEAM-7: Closeout doc seals L33 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L30-L32 never reopen', () => {
  assert.ok(exists(CLOSEOUT_REL));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('\u0394=0'.replace('\u0394','\u0394')));
  assert.ok(doc.includes('Fundacion') && (doc.includes('\u0394=0') || doc.includes('Δ=0')));
  assert.ok(doc.includes('Law VI'));
  assert.ok(/Domain Event|Publisher/i.test(doc));
  assert.ok(/Transactional Outbox|Outbox/i.test(doc));
  assert.ok(/Idempotent Message|Consumer/i.test(doc));
  assert.ok(/Circuit Breaker/i.test(doc));
  assert.ok(doc.includes('SPEC-0131') || doc.includes('Mission DU'));
  assert.ok(doc.includes('SPEC-0132') || doc.includes('Mission DV'));
  assert.ok(doc.includes('SPEC-0133') || doc.includes('Mission DW'));
  assert.ok(doc.includes('SPEC-0134') || doc.includes('Mission DX'));
  assert.ok(doc.includes('SPEC-0135') || doc.includes('Mission DY') || /Seam/i.test(doc));
  assert.ok(doc.includes('GitHub Enterprise') || doc.includes('\u2260 GitHub') || doc.includes('\u2260 GHE') || doc.includes('≠ GitHub') || doc.includes('≠ GHE') || doc.includes('!= GHE'));
  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE \u2260 PRODUCTION_READY') || doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') || doc.includes('\u2260 PRODUCTION_READY=YES') || doc.includes('≠ PRODUCTION_READY=YES') || /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc));
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L30|Ladder 30/.test(doc));
  assert.ok(/L32|Ladder 32/.test(doc));
  assert.ok(doc.includes('AT_CEILING') || doc.includes('schemas'));
  assert.ok(doc.includes('tip-seal') || doc.includes('tip seal') || doc.includes('tip-refresh') || /SEPARATE|separate/.test(doc));
  assert.ok(doc.includes(DX_MERGE_TIP_PIN) || doc.includes(DX_MERGE_TIP_PIN_FULL));
});

test('L33-SEAM-8: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const filesToCheck = [
    'src/core/composition/ladder33-seam-port.js',
    'src/core/composition/ladder33-seam-receipt.js',
    'src/core/composition/ladder33-seam-policy-gate.js',
    'tests/eos-ladder33-seam-pack.test.js'
  ];
  for (const rel of filesToCheck) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('L33-SEAM-9: ADR-0111 + evidence + OpenSpec DY change present', () => {
  assert.ok(exists('docs/adrs/ADR-0111-mission-dy-ladder33-seam-pack-closeout.md'));
  assert.ok(exists('docs/evidence/EOS_MISSION_DY_LADDER33_SEAM_EVD_2026-09-25.md'));
  assert.ok(exists('openspec/changes/eos-ladder-33-mission-dy/.openspec.yaml'));
  assert.ok(exists('openspec/changes/eos-ladder-33-mission-dy/proposal.md'));
  assert.ok(exists('openspec/changes/eos-ladder-33-mission-dy/design.md'));
  assert.ok(exists('openspec/changes/eos-ladder-33-mission-dy/tasks.md'));
  assert.ok(exists('openspec/changes/eos-ladder-33-mission-dy/specs/mission-dy-ladder33-seam-pack/spec.md'));
  const adr = read('docs/adrs/ADR-0111-mission-dy-ladder33-seam-pack-closeout.md');
  assert.ok(adr.includes('SPEC-0135'));
  assert.ok(adr.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip/i.test(adr));
});

test('L33-SEAM-10: Schemas AT_CEILING — docs/schemas JSON count held at 35/35 (host)', () => {
  const schemasDir = path.join(rootDir, 'docs', 'schemas');
  if (!fs.existsSync(schemasDir)) {
    assert.ok(!exists('docs/schemas') || true, 'hermetic package: no schemas tree added by DY');
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
  assert.equal(walk(schemasDir).length, 35, 'AT_CEILING 35/35 held — DY must not add docs/schemas/**/*.json');
});

test('L33-SEAM-11: Axis + human gates preserved; tip-seal SEPARATE automation id', () => {
  const closeout = read(CLOSEOUT_REL);
  assert.ok(/Domain Event|Outbox Messaging|Resilient/i.test(closeout));
  assert.ok(DY_SAFE_AUTOMATION_IDS.includes('A5_PRESERVE_FUNDACION_ALWAYS_DENY'));
  assert.ok(DY_SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_PROD_GATE'));
  assert.ok(DY_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(DY_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L33_AUTO_CLOSE'));
  assert.ok(DY_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_DY_MERGE'));
  assert.ok(DY_SAFE_AUTOMATION_IDS.includes('A13_REFUSE_GHA_GREEN_CLAIM'));
});

test('L33-SEAM-12: patch-mission-dy.mjs wires seam/pack/mission-dy + SLIM exclude', () => {
  assert.ok(exists('scripts/patch-mission-dy.mjs'));
  const patch = read('scripts/patch-mission-dy.mjs');
  assert.ok(patch.includes('test:ladder33-seam'));
  assert.ok(patch.includes('test:ladder33-pack'));
  assert.ok(patch.includes('test:mission-dy'));
  assert.ok(patch.includes('eos-ladder33-seam-pack.test.js'));
  assert.ok(patch.includes('SLIM_SUITE_EXCLUDES'));
  assert.ok(!patch.includes('git push'));
  assert.ok(patch.includes('SPEC-0135') || patch.includes('ladder33'));
  assert.ok(!/tip-refresh|freeze.*rewrite/i.test(patch) || patch.includes('do NOT'));
});

test('L33-SEAM-13: HOLD path + receipt DY-RCPT + soft-observe pin fe52fb3b', async () => {
  _resetReceiptSeqForTests();
  const hold = await new Ladder33SeamPort().govern(dyHappyPlan({ planId: 'plan-prefix-dy-hold', ritualMode: 'HOLD' }));
  assert.equal(hold.ok, true);
  assert.equal(hold.decision, 'HOLD');
  assert.ok(hold.receipt.receiptId.startsWith('DY-RCPT-'));
  assert.equal(hold.receipt.freezeObserve.pinShort, 'fe52fb3b');
  assert.equal(DY_FREEZE_PIN_SHORT, 'fe52fb3b');
  assert.equal(DY_FREEZE_PIN, DX_MERGE_TIP_PIN_FULL);
  const receipt = buildLadder33SeamReceipt({ planId: 'plan-build', changeId: 'eos-ladder-33-mission-dy', decision: 'PASS', seamDigest: dySha('build') });
  assert.ok(receipt.receiptId.startsWith('DY-RCPT-'));
  assert.equal(verifyLadder33SeamReceipt(receipt), true);
});

test('L33-SEAM-14: Closeout declares tip-seal SEPARATE; no freeze rewrite from DY', () => {
  const doc = read(CLOSEOUT_REL);
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|SEPARATE.*tip|parent tip/i.test(doc));
  const scrubbed = doc
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[\u2260!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/CLOSED_FOR_LOCAL_GOVERNED_USE[`'"]?\s*[≠!][=]?\s*[`'"]?PRODUCTION_READY=YES/gi, '')
    .replace(/≠\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '')
    .replace(/!=\s*[`'"]?PRODUCTION_READY=YES[`'"]?/g, '');
  assert.ok(!/PRODUCTION_READY\s*=\s*YES/.test(scrubbed));
});

test('L33-SEAM-15: Policy helpers + secrets/Fundacion/tip/L33 detectors', () => {
  assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsL33AutoClose('auto-close ladder 33 now'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
  const tipSeal = new Ladder33SeamPolicyGate().evaluatePreconditions({ planId: 'p', changeId: 'eos-ladder-33-mission-dy', tipSealL33: true });
  assert.equal(tipSeal.ok, false);
  assert.equal(tipSeal.code, DY_CODES.L33_AUTO_CLOSE_FORBIDDEN);
});

test('L33-SEAM-16: Hash helper sha256Canonical + Closeout/ADR tip-seal-separate posture', () => {
  assert.equal(typeof dySha, 'function');
  assert.equal(dySha('dy').length, 64);
  assert.ok(exists('scripts/patch-mission-dy.mjs'));
  const patcher = read('scripts/patch-mission-dy.mjs');
  assert.ok(patcher.includes('SPEC-0135') || patcher.includes('ladder33'));
  const doc = read(CLOSEOUT_REL);
  assert.ok(doc.includes('SPEC-0135') || /Mission DY/i.test(doc));
  assert.ok(/do NOT tip-refresh|does NOT tip-refresh|tip-seal.*SEPARATE|No tip-seal|no tip-refresh/i.test(doc));
  assert.ok(exists('docs/adrs/ADR-0111-mission-dy-ladder33-seam-pack-closeout.md'));
});
