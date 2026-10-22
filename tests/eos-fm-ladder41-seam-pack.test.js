/**
 * Ladder 41 CI Seam-Pack Consolidation & Closeout Governance Suite (SPEC-0175 / Mission FM).
 * Soft-import FI/FJ/FK/FL when present; soft-fail safe; present true|false.
 * Soft-observe pin: f5948926. Tip-seal SEPARATE after FM merge + tip-refresh.
 * PRODUCTION_READY=NO. Fundacion Delta=0. Law VI. L30-L40 never reopen.
 * L41 remains OPEN — Formal L41 CLOSED is tip-seal later (NOT this package).
 * Distinct from FH L40 seam / FC L39 seam / FI correlation / FJ round-trip / FK quarantine / FL honesty.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  Ladder41SeamPort,
  FM_PORT_PRODUCTION_READY,
  FM_PORT_KIND,
  FM_SAFE_AUTOMATION_IDS,
  softImportModule,
  softObserveFi,
  softObserveFj,
  softObserveFk,
  softObserveFl,
  verifyLadder41SeamReceipt,
  computeSeamDigest
} from '../src/core/composition/ladder41-seam-port.js';
import {
  sha256Canonical as fmSha,
  FM_PRODUCTION_READY,
  FM_RECEIPT_KIND,
  FM_OPERATION,
  FM_FREEZE_PIN,
  FM_FREEZE_PIN_SHORT,
  FM_CHAIN_ORDER,
  FM_SATELLITE_SPECS,
  canonicalLadder41SeamSealBody,
  computeSeamDigest as computeSeamDigestDirect,
  buildLadder41SeamReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/ladder41-seam-receipt.js';
import {
  Ladder41SeamPolicyGate,
  FM_CODES,
  claimsTipRewrite,
  claimsProductionReadyFlip,
  claimsL41AutoClose,
  claimsTipSealInProduct,
  claimsSchemaJsonAdd,
  claimsSatelliteAsSeam,
  claimsWallClockAuthority,
  claimsLiveHttpEgress,
  claimsRawSeamSecretMaterial,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/composition/ladder41-seam-policy-gate.js';

const rootDir = process.cwd();
const FM_MERGE_TIP_PIN = 'f5948926';
const FM_MERGE_TIP_PIN_FULL = 'f5948926b723167db78ffb08f46123810cd66444';

function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(rootDir, rel)); }
function gatePlan(overrides = {}) {
  return { planId: 'plan-fm-gate-001', changeId: 'eos-ladder-41-mission-fm', ...overrides };
}
function fmHappyPlan(overrides = {}) {
  return {
    planId: 'plan-l41-fm-seam-001',
    changeId: 'eos-ladder-41-mission-fm',
    ritualMode: 'ACTIVE',
    reasons: ['hermetic ladder 41 seam-pack consolidation govern'],
    label: 'L41 seam FM',
    humanGateHeld: true,
    observed: { fi: true, fj: true, fk: true, fl: true },
    ...overrides
  };
}
function validSeam(overrides = {}) {
  return {
    chain: { fi: true, fj: true, fk: true, fl: true },
    chainOrder: [...FM_CHAIN_ORDER],
    satelliteSpecs: [...FM_SATELLITE_SPECS],
    seamClass: 'SEAM_PACK',
    desiredSeal: 'SEAM_PACK',
    observedChainComplete: true,
    humanGateHeld: false,
    closeoutClaimed: false,
    ...overrides
  };
}

const LADDER41_SEAM_MODULES = [
  'src/core/composition/ladder41-seam-port.js',
  'src/core/composition/ladder41-seam-receipt.js',
  'src/core/composition/ladder41-seam-policy-gate.js'
];
const LADDER41_SATELLITE_SCRIPTS = ['test:mission-fi', 'test:mission-fj', 'test:mission-fk', 'test:mission-fl'];
const LADDER41_SLIM_EXCLUDES = [
  'eos-fi-bidirectional-delivery-correlation-registry.test.js',
  'eos-fj-round-trip-request-reply-integrity.test.js',
  'eos-fk-bidirectional-mismatch-quarantine-deny.test.js',
  'eos-fl-bidirectional-delivery-honesty-attestation.test.js',
  'eos-fm-ladder41-seam-pack.test.js'
];

test('FM1: Soft-observe FI/FJ/FK/FL (true|false accepted; soft-fail safe) + pin + NON-CLAIM posture', async () => {
  const fi = await softObserveFi();
  const fj = await softObserveFj();
  const fk = await softObserveFk();
  const fl = await softObserveFl();
  for (const s of [fi, fj, fk, fl]) {
    assert.equal(typeof s.present, 'boolean');
    assert.ok(s.present === true || s.present === false);
    if (s.present) assert.equal(s.productionReady, 'NO');
  }
  assert.equal(FM_PORT_PRODUCTION_READY, 'NO');
  assert.equal(FM_PRODUCTION_READY, 'NO');
  assert.equal(typeof FM_PORT_KIND, 'string');
  assert.equal(FM_FREEZE_PIN_SHORT, 'f5948926');
  assert.equal(FM_FREEZE_PIN, FM_MERGE_TIP_PIN_FULL);
  assert.ok(FM_SAFE_AUTOMATION_IDS.includes('A7_REFUSE_TIP_PIN_REWRITE'));
  assert.ok(FM_SAFE_AUTOMATION_IDS.includes('A9_REFUSE_UNSUPERVISED_L41_AUTO_CLOSE'));
  assert.ok(FM_SAFE_AUTOMATION_IDS.includes('A10_TIP_SEAL_SEPARATE_AFTER_FM_MERGE'));
  assert.ok(FM_SAFE_AUTOMATION_IDS.includes('A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM'));
});

test('FM2: Canonical nine-field seal shape + verifiable receiptHash', () => {
  _resetReceiptSeqForTests();
  const receipt = buildLadder41SeamReceipt({
    planId: 'plan-fm-seal-001',
    changeId: 'eos-ladder-41-mission-fm',
    decision: 'PASS',
    seam: validSeam()
  });
  assert.equal(receipt.kind, FM_RECEIPT_KIND);
  assert.equal(receipt.operation, FM_OPERATION);
  assert.ok(receipt.receiptId.startsWith('FM-RCPT-'));
  assert.equal(receipt.fundacionDelta, 0);
  assert.equal(receipt.productionReady, 'NO');
  assert.equal(typeof receipt.seamDigest, 'string');
  assert.equal(receipt.seamDigest.length, 64);
  const sealBody = canonicalLadder41SeamSealBody(receipt);
  assert.deepEqual(Object.keys(sealBody), [
    'receiptId', 'operation', 'planId', 'decision', 'changeId',
    'seamDigest', 'timestamp', 'fundacionDelta', 'prevReceiptHash'
  ]);
  assert.ok(receipt.freezeObserve && receipt.ceilingHold && receipt.seamHold);
  assert.deepEqual(verifyLadder41SeamReceipt(receipt), { ok: true });
});

test('FM3: OpenSpec FM envelope present (proposal/design/tasks/spec + ADR-0159)', () => {
  const base = 'openspec/changes/eos-ladder-41-mission-fm';
  for (const rel of [`${base}/.openspec.yaml`, `${base}/proposal.md`, `${base}/design.md`, `${base}/tasks.md`, `${base}/specs/mission-fm-ladder41-seam-pack/spec.md`]) {
    assert.ok(exists(rel), 'missing ' + rel);
  }
  const adr = 'docs/adrs/ADR-0159-mission-fm-ladder41-seam-pack-closeout.md';
  assert.ok(exists(adr));
  const adrText = read(adr);
  assert.ok(adrText.includes('SPEC-0175'));
  assert.ok(adrText.includes('PRODUCTION_READY'));
  assert.ok(/tip-seal.*SEPARATE|SEPARATE.*tip|separate/i.test(adrText));
  assert.ok(/L41.*OPEN|remains OPEN|still OPEN|OPEN/i.test(adrText));
});

test('FM4: seamDigest is opaque-only — secret pollution is ignored (Law VI)', () => {
  const meta = { chain: { fi: true, fj: true, fk: true, fl: true }, seamClass: 'SEAM_PACK', desiredSeal: 'SEAM_PACK', observedChainComplete: true };
  const clean = computeSeamDigestDirect(meta);
  const polluted = computeSeamDigestDirect({
    ...meta,
    password: 'hunter2',
    token: 'tok-abc',
    rawRequestPayload: 'eyJzZWNyZXQiOiJ4In0=',
    rawSeamSecret: 'deadbeef'
  });
  assert.equal(polluted, clean);
  assert.equal(computeSeamDigest(validSeam()), computeSeamDigestDirect(validSeam()));
});

test('FM5: Receipt chaining + trail integrity (verifiedCount 2)', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder41SeamPort();
  const first = await port.seam(fmHappyPlan({ planId: 'plan-fm-chain-100' }));
  const second = await port.seam(fmHappyPlan({ planId: 'plan-fm-chain-101' }));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.receipt.prevReceiptHash, first.receipt.receiptHash);
  const trail = port.verifyTrail();
  assert.equal(trail.ok, true);
  assert.equal(trail.verifiedCount, 2);
});

test('FM6: Happy path — four satellites observed + human gate seals FM-RCPT PASS', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder41SeamPort();
  const res = await port.seam(fmHappyPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.ok(res.receipt.receiptId.startsWith('FM-RCPT-'));
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(res.receipt.productionReady, 'NO');
  assert.equal(res.receipt.operation, FM_OPERATION);
  assert.equal(typeof res.satellites.fiPresent, 'boolean');
  assert.equal(typeof res.satellites.flPresent, 'boolean');
  assert.deepEqual(res.verify, { ok: true });
  assert.equal(port.verifyTrail().ok, true);
});

test('FM7: Invalid shape fail-closed (missing seam / non-object seam / missing changeId)', async () => {
  const port = new Ladder41SeamPort();
  const missing = await port.seam({ planId: 'p-fm-7', seam: null });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, FM_CODES.MISSING_SEAM);
  const invalid = await port.seam({ planId: 'p-fm-7b', seam: 'not-an-object' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, FM_CODES.INVALID_SEAM);
  const gate = new Ladder41SeamPolicyGate();
  assert.equal(gate.evaluatePreconditions({ planId: 'p-fm-7c' }).code, FM_CODES.MISSING_CHANGE_ID);
  assert.equal(gate.evaluatePreconditions(null).code, FM_CODES.DENY);
});

test('FM8: Required seam fields each DENY with a dedicated code', () => {
  const gate = new Ladder41SeamPolicyGate();
  const cases = [
    [{ ...validSeam(), chain: { fi: true, fj: true, fk: true } }, FM_CODES.INVALID_CHAIN_MEMBER],
    [{ ...validSeam(), chainOrder: undefined }, FM_CODES.MISSING_CHAIN_ORDER],
    [{ ...validSeam(), chainOrder: ['FI', 'FJ', 'FL', 'FK'] }, FM_CODES.INVALID_CHAIN_ORDER],
    [{ ...validSeam(), satelliteSpecs: undefined }, FM_CODES.MISSING_SATELLITE_SPECS],
    [{ ...validSeam(), seamClass: '' }, FM_CODES.MISSING_SEAM_CLASS],
    [{ ...validSeam(), desiredSeal: undefined }, FM_CODES.MISSING_DESIRED_SEAL],
    [{ ...validSeam(), desiredSeal: 'NOPE' }, FM_CODES.INVALID_DESIRED_SEAL],
    [{ ...validSeam(), observedChainComplete: undefined }, FM_CODES.MISSING_OBSERVED_CHAIN_COMPLETE],
    [{ ...validSeam(), observedChainComplete: 'yes' }, FM_CODES.INVALID_OBSERVED_CHAIN_COMPLETE]
  ];
  for (const [seam, code] of cases) {
    const res = gate.evaluatePreconditions(gatePlan({ seam }));
    assert.equal(res.ok, false, 'expected DENY for ' + code);
    assert.equal(res.code, code);
  }
});

test('FM9: Satellite spec ordinals pinned to SPEC-0171..SPEC-0174', () => {
  assert.deepEqual([...FM_SATELLITE_SPECS], ['SPEC-0171', 'SPEC-0172', 'SPEC-0173', 'SPEC-0174']);
  const gate = new Ladder41SeamPolicyGate();
  const tampered = gate.evaluatePreconditions(gatePlan({
    seam: validSeam({ satelliteSpecs: ['SPEC-0171', 'SPEC-0172', 'SPEC-0173', 'SPEC-0999'] })
  }));
  assert.equal(tampered.ok, false);
  assert.equal(tampered.code, FM_CODES.INVALID_SATELLITE_SPECS);
  const reordered = gate.evaluatePreconditions(gatePlan({
    seam: validSeam({ chainOrder: ['FI', 'FJ', 'FL', 'FK'] })
  }));
  assert.equal(reordered.code, FM_CODES.INVALID_CHAIN_ORDER);
});

test('FM10: Freeze observe + ceiling/seam hold flags are forced', () => {
  const receipt = buildLadder41SeamReceipt({ planId: 'plan-fm-flags', changeId: 'eos-ladder-41-mission-fm', decision: 'HOLD' });
  const fo = receipt.freezeObserve;
  assert.equal(fo.pinShort, FM_MERGE_TIP_PIN);
  assert.equal(fo.pin, FM_MERGE_TIP_PIN_FULL);
  assert.equal(fo.readOnly, true);
  assert.equal(fo.tipRewriteRefused, true);
  assert.equal(fo.tipSealInProductRefused, true);
  assert.equal(fo.productionReadyFlipRefused, true);
  assert.equal(fo.l41AutoCloseRefused, true);
  assert.equal(fo.l30ReopenRefused, true);
  assert.equal(fo.l40ReopenRefused, true);
  assert.equal(fo.liveHttpEgressRefused, true);
  assert.equal(fo.wallClockAuthorityRefused, true);
  assert.equal(fo.tipRefreshAuthorityRefused, true);
  assert.equal(fo.rawSeamSecretMaterialRefused, true);
  assert.equal(fo.schemaJsonAddRefused, true);
  assert.ok(fo.nonClaimLabels.length > 0);
  assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
  assert.equal(receipt.ceilingHold.slimHold, true);
  assert.equal(receipt.ceilingHold.tipSealSeparate, true);
  assert.equal(receipt.ceilingHold.formalL41Closeout, false);
  assert.equal(receipt.seamHold.humanGateRequired, true);
  assert.equal(receipt.seamHold.distinctFromFhLadder40SeamPack, true);
});

test('FM11: Tamper detection — mutating decision/hash/delta/PR fails closed', () => {
  const base = buildLadder41SeamReceipt({ planId: 'plan-fm-tamper', changeId: 'eos-ladder-41-mission-fm', decision: 'PASS' });
  assert.equal(verifyLadder41SeamReceipt({ ...base, decision: 'HOLD' }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...base, receiptHash: 'f'.repeat(64) }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...base, fundacionDelta: 1 }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...base, productionReady: 'YES' }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...base, kind: 'eos-other' }).ok, false);
});

test('FM12: Partial chain → no-op HOLD (never a false SEAM_PACK)', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder41SeamPort();
  const res = await port.seam(fmHappyPlan({ planId: 'plan-fm-partial', observed: { fi: true, fj: true, fk: true, fl: false } }));
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'HOLD');
  assert.equal(res.receipt.decision, 'HOLD');
  assert.ok(res.receipt.receiptId.startsWith('FM-RCPT-'));
  const explicitHold = await new Ladder41SeamPort().seam(fmHappyPlan({ planId: 'plan-fm-hold', ritualMode: 'HOLD' }));
  assert.equal(explicitHold.decision, 'HOLD');
});

test('FM13: Law VI + Fundacion write barrier posture (no secret patterns in FM files)', () => {
  const forbidden = [/AIzaSy[A-Za-z0-9_-]{33}/, /sk-[A-Za-z0-9]{32,}/, /ghp_[A-Za-z0-9]{36}/];
  const files = [...LADDER41_SEAM_MODULES, 'tests/eos-fm-ladder41-seam-pack.test.js'];
  for (const rel of files) {
    assert.ok(exists(rel), 'missing ' + rel);
    const content = read(rel);
    for (const pattern of forbidden) assert.equal(pattern.test(content), false, 'Forbidden secret pattern in ' + rel);
  }
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  assert.ok(read('src/core/write-barrier/authorize.js').includes('FUNDACION_ALWAYS_DENY'));
});

test('FM14: Governance refusals are absolute — each violation has its dedicated code', () => {
  const gate = new Ladder41SeamPolicyGate();
  const cases = [
    [{ target: 'Documents/Fundacion/ledger' }, FM_CODES.FUNDACION_DENIED],
    [{ password: 'hunter2' }, FM_CODES.SECRET_FIELD_FORBIDDEN],
    [{ note: 'ghp_' + 'a'.repeat(36) }, FM_CODES.SECRET_LEAK_FORBIDDEN],
    [{ forceDelete: true }, FM_CODES.HARD_DELETE_FORBIDDEN],
    [{ massPrune: true }, FM_CODES.MASS_PRUNE_FORBIDDEN],
    [{ productionReady: 'YES' }, FM_CODES.PRODUCTION_READY_FLIP_FORBIDDEN],
    [{ reopenL30: true }, FM_CODES.L30_REOPEN_FORBIDDEN],
    [{ reopenL35: true }, FM_CODES.L35_REOPEN_FORBIDDEN],
    [{ reopenL40: true }, FM_CODES.L40_REOPEN_FORBIDDEN],
    [{ tipRewrite: true }, FM_CODES.TIP_REWRITE_FORBIDDEN],
    [{ schemaJsonAdd: true }, FM_CODES.SCHEMA_JSON_ADD_FORBIDDEN],
    [{ networkWrite: true }, FM_CODES.NETWORK_WRITE_FORBIDDEN],
    [{ claimGhe: true }, FM_CODES.GHE_CLAIM_FORBIDDEN],
    [{ liveHttpEgress: true }, FM_CODES.LIVE_HTTP_EGRESS_FORBIDDEN],
    [{ wallClockAuthority: true }, FM_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN],
    [{ tipRefreshAuthority: true }, FM_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN],
    [{ fiAsSeam: true }, FM_CODES.SATELLITE_AS_SEAM_FORBIDDEN],
    [{ rawSecretMaterial: true }, FM_CODES.RAW_SEAM_SECRET_MATERIAL_FORBIDDEN]
  ];
  for (const [violation, code] of cases) {
    const res = gate.evaluatePreconditions(gatePlan(violation));
    assert.equal(res.ok, false, 'expected DENY for ' + code);
    assert.equal(res.code, code);
  }
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsTipRewrite('rewrite freeze tip pin now'), true);
  assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
  assert.equal(claimsSatelliteAsSeam('promote fi registry as the seam'), true);
  assert.equal(claimsWallClockAuthority('use Date.now as authority'), true);
  assert.equal(claimsLiveHttpEgress('bind live http egress'), true);
  assert.equal(claimsRawSeamSecretMaterial('seal the seam secret'), true);
  assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  assert.equal(scanForSecrets('ghp_' + 'a'.repeat(36)), true);
});

test('FM15: L41 auto-close is refused without humanGateHeld', async () => {
  const gate = new Ladder41SeamPolicyGate();
  assert.equal(claimsL41AutoClose('auto-close ladder 41 now'), true);
  const direct = gate.evaluatePreconditions(gatePlan({ autoCloseL41: true }));
  assert.equal(direct.ok, false);
  assert.equal(direct.code, FM_CODES.L41_AUTO_CLOSE_FORBIDDEN);
  const claimed = gate.evaluatePreconditions(gatePlan({
    seam: validSeam({ closeoutClaimed: true, humanGateHeld: false })
  }));
  assert.equal(claimed.ok, false);
  assert.equal(claimed.code, FM_CODES.L41_AUTO_CLOSE_FORBIDDEN);
  const held = gate.evaluatePreconditions(gatePlan({
    seam: validSeam({ closeoutClaimed: true, humanGateHeld: true })
  }));
  assert.equal(held.ok, true);
  assert.equal(held.decision, 'PASS');
  const port = new Ladder41SeamPort();
  const res = await port.seam(fmHappyPlan({ planId: 'plan-fm-autoclose', observed: null, humanGateHeld: false, seam: validSeam({ closeoutClaimed: true }) }));
  assert.equal(res.ok, false);
  assert.equal(res.code, FM_CODES.L41_AUTO_CLOSE_FORBIDDEN);
});

test('FM16: Tip-seal is refused inside the product package', async () => {
  const gate = new Ladder41SeamPolicyGate();
  assert.equal(claimsTipSealInProduct('tip-seal-in-product claim'), true);
  const flag = gate.evaluatePreconditions(gatePlan({ tipSealInProduct: true }));
  assert.equal(flag.ok, false);
  assert.equal(flag.code, FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const prose = gate.evaluatePreconditions(gatePlan({ claim: 'seal the tip and mark ladder 41 closed now' }));
  assert.equal(prose.ok, false);
  assert.equal(prose.code, FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  const port = new Ladder41SeamPort();
  const res = await port.seam(fmHappyPlan({ planId: 'plan-fm-tipseal', tipSealInProduct: true }));
  assert.equal(res.ok, false);
  assert.equal(res.code, FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  assert.equal(res.receipt.decision, 'DENY');
});

test('FM17: Slim checkout safe + fail-closed trail + wiring (no patcher, slim-excluded, pin intact)', async () => {
  const missing = await softImportModule('eos-fm-nonexistent-satellite.js');
  assert.equal(missing.observed, false);
  const fi = await softObserveFi();
  assert.equal(typeof fi.present, 'boolean');

  _resetReceiptSeqForTests();
  const port = new Ladder41SeamPort();
  await port.seam(fmHappyPlan({ planId: 'plan-fm-trail-0' }));
  await port.seam(fmHappyPlan({ planId: 'plan-fm-trail-1' }));
  port.trail[0].receiptHash = 'f'.repeat(64);
  const broken = port.verifyTrail();
  assert.equal(broken.ok, false);
  assert.equal(broken.verifiedCount, 0);
  assert.match(broken.error, /Invalid receipt at 0|Chain broken at 0/);

  assert.equal(exists('scripts/patch-mission-fm.mjs'), false, 'patcher pattern is abandoned after FI');
  const pkg = JSON.parse(read('package.json'));
  for (const s of LADDER41_SATELLITE_SCRIPTS) assert.equal(typeof pkg.scripts[s], 'string', 'Missing script: ' + s);
  assert.equal(pkg.scripts['test:ladder41-seam'], 'node --test tests/eos-fm-ladder41-seam-pack.test.js');
  assert.equal(pkg.scripts['test:mission-fm'], 'node --test tests/eos-fm-ladder41-seam-pack.test.js');
  const pack = pkg.scripts['test:ladder41-pack'];
  assert.equal(typeof pack, 'string');
  for (const s of LADDER41_SATELLITE_SCRIPTS) assert.ok(pack.includes(s), 'ladder41-pack missing ' + s);
  assert.ok(pack.includes('test:ladder41-seam'));
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'));
  for (const name of LADDER41_SLIM_EXCLUDES) assert.ok(runner.includes(name), 'SLIM exclude missing: ' + name);
  const freeze = read('docs/releases/EOS_FREEZE_GATE_STATUS.md');
  assert.ok(freeze.includes(FM_MERGE_TIP_PIN), 'freeze SSOT must remain on ' + FM_MERGE_TIP_PIN);
  assert.equal(fmSha('fm').length, 64);
});
