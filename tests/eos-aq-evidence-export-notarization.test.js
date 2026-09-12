/**
 * @file eos-aq-evidence-export-notarization.test.js
 * @description SPEC-0048 / Mission AQ — Evidence Export & Notarization Observer.
 * Hermetic TDD: export sealed pack with manifest + chain tip; verifyPack OK;
 * verifyPack FAIL on tamper (forensic, no silent accept); notary stub observe
 * when enabled; notary OFF does not claim compliance; MISSING_DEP /
 * INVALID_REQUEST / LEDGER_RANGE_EMPTY; SECRET_LEAK_FORBIDDEN / Law VI;
 * NON-CLAIM ≠ compliance cert / ≠ external audit / ≠ legal notary;
 * AQ_PRODUCTION_READY=NO; Fundacion ALWAYS_DENY / Δ=0; hermetic no
 * fetch/http/CloudAgent; optional AL timeline inject.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 *
 * NON-CLAIM: export/notary ≠ compliance cert ≠ external audit ≠ legal notary;
 * not AR; Fundacion Δ=0; AQ_PRODUCTION_READY=NO.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AQ_PRODUCTION_READY,
  AQ_KIND,
  AQ_CODES,
  AQ_PACK_KIND,
  AQ_PACK_PRODUCTION_READY,
  AQ_NOTARY_KIND,
  AQ_NOTARY_PRODUCTION_READY,
  AQ_NOTARY_CODES,
  EvidenceExportNotarizationError,
  createEvidenceExportNotarizationObserver,
  createMemoryExportLedger,
  createMemoryTimelineExporter,
  createNotaryStub,
  sanitizeAqPayload,
  defaultHash,
  stableStringify,
  buildSealedEvdPack,
  recomputePackDigest
} from '../src/core/evidence/evidence-export-notarization-observer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OBSERVER_PATH = path.join(
  ROOT,
  'src/core/evidence/evidence-export-notarization-observer.js'
);
const PACK_PATH = path.join(ROOT, 'src/core/evidence/sealed-evd-pack.js');
const NOTARY_PATH = path.join(ROOT, 'src/core/evidence/notary-stub.js');
const TEST_PATH = path.resolve(
  __dirname,
  'eos-aq-evidence-export-notarization.test.js'
);

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  const prefix = String.fromCharCode(115, 107, 45); // s k -
  return prefix + suffix;
}

function synthBearer() {
  return 'Bearer ' + 'Z'.repeat(48);
}

function seedLedger(opts = {}) {
  const ledger = createMemoryExportLedger({ tip: opts.tip, hash: opts.hash });
  const rows = opts.entries || [
    {
      missionId: 'm-aq',
      sessionId: 's-1',
      kind: 'evd',
      at: '2026-09-12T01:00:00.000Z',
      payload: { event: 'a' }
    },
    {
      missionId: 'm-aq',
      sessionId: 's-1',
      kind: 'evd',
      at: '2026-09-12T02:00:00.000Z',
      payload: { event: 'b' }
    },
    {
      missionId: 'm-aq',
      sessionId: 's-2',
      kind: 'evd',
      at: '2026-09-12T03:00:00.000Z',
      payload: { event: 'c' }
    }
  ];
  for (const r of rows) ledger.append(r);
  return ledger;
}

function harness(opts = {}) {
  const ledger = opts.ledger !== undefined ? opts.ledger : seedLedger();
  const timeline =
    opts.timeline !== undefined
      ? opts.timeline
      : createMemoryTimelineExporter();
  const notary =
    opts.notary !== undefined
      ? opts.notary
      : opts.notarizationObserve
        ? createNotaryStub({ enabled: true })
        : null;
  const obs = createEvidenceExportNotarizationObserver({
    ledger,
    timeline,
    notary,
    notarizationObserve: opts.notarizationObserve === true,
    requireLedger: opts.requireLedger,
    rejectSecretsInRequest: opts.rejectSecretsInRequest,
    throwOnFail: opts.throwOnFail,
    now: opts.now,
    hash: opts.hash
  });
  return { obs, ledger, timeline, notary };
}

// ── AQ1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AQ1: kind eos-evidence-export-notarization-observer and PRODUCTION_READY NO', () => {
  const { obs } = harness();
  assert.equal(obs.kind, AQ_KIND);
  assert.equal(obs.kind, 'eos-evidence-export-notarization-observer');
  assert.equal(obs.PRODUCTION_READY, 'NO');
  assert.equal(AQ_PRODUCTION_READY, 'NO');
  const h = obs.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AQ_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.usesCloudAgent, false);
  assert.equal(h.complianceClaim, false);
  assert.equal(h.legalNotaryClaim, false);
  assert.equal(h.nonClaim.notComplianceCert, true);
  assert.equal(h.nonClaim.notExternalAuditPlatform, true);
  assert.equal(h.nonClaim.notLegalNotary, true);
  assert.equal(h.nonClaim.notAr, true);
  assert.equal(AQ_PACK_KIND, 'eos-sealed-evd-pack');
  assert.equal(AQ_PACK_PRODUCTION_READY, 'NO');
  assert.equal(AQ_NOTARY_KIND, 'eos-notary-stub');
  assert.equal(AQ_NOTARY_PRODUCTION_READY, 'NO');
});

// ── AQ2: export sealed pack with manifest + chain tip link ──────────────────
test('AQ2: exportRange → sealed pack with manifest hashes linked to AJ chain tip', () => {
  const { obs, ledger } = harness();
  const tip = ledger.tip();
  assert.ok(tip);

  const out = obs.exportRange({
    missionId: 'm-aq',
    fromSeq: 0,
    toSeq: 2
  });

  assert.equal(out.ok, true);
  assert.equal(out.code, AQ_CODES.EXPORT_OK);
  assert.ok(out.pack);
  assert.equal(out.pack.sealed, true);
  assert.equal(out.pack.kind, AQ_PACK_KIND);
  assert.equal(out.pack.PRODUCTION_READY, 'NO');
  assert.ok(out.pack.manifest);
  assert.ok(out.pack.manifest.packDigest);
  assert.ok(Array.isArray(out.pack.manifest.entryDigests));
  assert.ok(out.pack.manifest.entryDigests.length >= 1);
  assert.equal(out.pack.chainTip, tip);
  assert.equal(out.chainTip, tip);
  assert.ok(out.entryCount >= 1);
  assert.equal(out.pack.complianceClaim, false);
  assert.equal(out.nonClaim.notComplianceCert, true);
});

// ── AQ3: verifyPack OK on good pack ─────────────────────────────────────────
test('AQ3: verifyPack OK on good sealed pack', () => {
  const { obs } = harness();
  const exported = obs.exportRange({ missionId: 'm-aq' });
  assert.equal(exported.ok, true);

  const v = obs.verifyPack(exported.pack);
  assert.equal(v.ok, true);
  assert.equal(v.code, AQ_CODES.OK);
  assert.equal(v.verified, true);
  assert.equal(v.forensic, false);
  assert.equal(v.silentAccept, false);
  assert.equal(v.packDigest, exported.pack.packDigest);
  assert.ok(v.chainTip);
});

// ── AQ4: verifyPack FAIL on tamper / missing hash (forensic) ────────────────
test('AQ4: verifyPack FAIL on tamper/missing hash — forensic, no silent accept', () => {
  const { obs } = harness();
  const exported = obs.exportRange({ missionId: 'm-aq' });
  assert.equal(exported.ok, true);

  // Tamper entry digest in manifest
  const tampered = structuredClone(exported.pack);
  tampered.manifest.entryDigests[0] = '0'.repeat(64);

  const v1 = obs.verifyPack(tampered);
  assert.equal(v1.ok, false);
  assert.equal(v1.code, AQ_CODES.TAMPER_DETECTED);
  assert.equal(v1.forensic, true);
  assert.equal(v1.silentAccept, false);

  // Tamper packDigest
  const tampered2 = structuredClone(exported.pack);
  tampered2.manifest.packDigest = 'f'.repeat(64);
  tampered2.packDigest = 'f'.repeat(64);
  const v2 = obs.verifyPack(tampered2);
  assert.equal(v2.ok, false);
  assert.ok(
    v2.code === AQ_CODES.TAMPER_DETECTED || v2.code === AQ_CODES.VERIFY_FAIL
  );
  assert.equal(v2.forensic, true);
  assert.equal(v2.silentAccept, false);

  // Missing manifest digest
  const missing = structuredClone(exported.pack);
  delete missing.manifest.packDigest;
  const v3 = obs.verifyPack(missing);
  assert.equal(v3.ok, false);
  assert.equal(v3.code, AQ_CODES.VERIFY_FAIL);
  assert.equal(v3.forensic, true);
});

// ── AQ5: notary stub observe receipts when enabled ──────────────────────────
test('AQ5: WHILE notarization observe enabled → notary stub receipts (NOTARY_OBSERVE_ONLY)', () => {
  const { obs } = harness({ notarizationObserve: true });
  const exported = obs.exportRange({ missionId: 'm-aq' });
  assert.equal(exported.ok, true);
  // exportRange auto-observes when mode on
  assert.ok(exported.notary);
  assert.equal(exported.notary.code, AQ_CODES.NOTARY_OBSERVE_ONLY);
  assert.equal(exported.notary.complianceClaim, false);
  assert.equal(exported.notary.legalNotaryClaim, false);
  assert.equal(exported.notary.certified, false);

  const again = obs.observeNotary(exported.pack, { note: 'manual' });
  assert.equal(again.code, AQ_CODES.NOTARY_OBSERVE_ONLY);
  assert.equal(again.observeOnly, true);
  assert.equal(again.complianceClaim, false);
  assert.equal(again.notarizedLegally, false);
  assert.ok(again.receipt);
  assert.equal(again.receipt.code, AQ_NOTARY_CODES.NOTARY_OBSERVE_ONLY);

  const receipts = obs.getNotaryReceipts();
  assert.ok(receipts.length >= 1);
  for (const r of receipts) {
    assert.equal(r.complianceClaim, false);
    assert.equal(r.legalNotaryClaim, false);
  }
});

// ── AQ6: notary mode OFF does not claim compliance ──────────────────────────
test('AQ6: notarization observe OFF → no compliance / legal notary claim', () => {
  const { obs } = harness({ notarizationObserve: false });
  const exported = obs.exportRange({ missionId: 'm-aq' });
  assert.equal(exported.ok, true);
  assert.equal(exported.notary, null);

  const off = obs.observeNotary(exported.pack);
  assert.equal(off.ok, true);
  assert.equal(off.notarizationObserve, false);
  assert.equal(off.complianceClaim, false);
  assert.equal(off.legalNotaryClaim, false);
  assert.match(String(off.reason), /OFF/i);

  const st = obs.getState();
  assert.equal(st.notarizationObserve, false);
  assert.equal(st.complianceClaim, false);
  assert.equal(st.legalNotaryClaim, false);
  assert.equal(st.externalAuditClaim, false);
});

// ── AQ7: MISSING_DEP / INVALID_REQUEST / LEDGER_RANGE_EMPTY ─────────────────
test('AQ7: MISSING_DEP / INVALID_REQUEST / LEDGER_RANGE_EMPTY fail-closed', () => {
  const noLedger = createEvidenceExportNotarizationObserver({
    requireLedger: true
  });
  const missing = noLedger.exportRange({ missionId: 'x' });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, AQ_CODES.MISSING_DEP);
  assert.equal(missing.dep, 'ledger');

  const { obs } = harness();
  const bad = obs.exportRange(null);
  assert.equal(bad.ok, false);
  assert.equal(bad.code, AQ_CODES.INVALID_REQUEST);

  const empty = obs.exportRange({ missionId: 'does-not-exist' });
  assert.equal(empty.ok, false);
  assert.equal(empty.code, AQ_CODES.LEDGER_RANGE_EMPTY);

  const badVerify = obs.verifyPack(null);
  assert.equal(badVerify.ok, false);
  assert.equal(badVerify.code, AQ_CODES.INVALID_REQUEST);
});

// ── AQ8: SECRET_LEAK_FORBIDDEN / Law VI sanitize ────────────────────────────
test('AQ8: Law VI — secrets never in packs; SECRET_LEAK_FORBIDDEN', () => {
  const { obs } = harness();
  const vendor = synthVendorKey();
  const bearer = synthBearer();

  const denied = obs.exportRange({
    missionId: 'm-aq',
    apiKey: vendor,
    persistSecrets: true,
    includeSecretsInPack: true
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, AQ_CODES.SECRET_LEAK_FORBIDDEN);

  // Sanitized export still redacts secret-looking values in payloads
  const ledger = createMemoryExportLedger();
  ledger.append({
    missionId: 'm-sec',
    sessionId: 's',
    kind: 'evd',
    at: '2026-09-12T04:00:00.000Z',
    payload: { note: 'ok', authorization: bearer, hint: vendor }
  });
  const obs2 = createEvidenceExportNotarizationObserver({ ledger });
  const out = obs2.exportRange({ missionId: 'm-sec' });
  assert.equal(out.ok, true);
  const dumped = JSON.stringify(out.pack);
  assert.equal(dumped.includes(vendor), false);
  assert.equal(dumped.includes(bearer), false);
  assert.ok(dumped.includes('[REDACTED]') || !dumped.includes(vendor));

  const stateDump = JSON.stringify(obs2.getState());
  assert.equal(stateDump.includes(vendor), false);

  const sanitized = sanitizeAqPayload({
    apiKey: vendor,
    token: 'abc',
    password: 'x',
    okField: 'safe'
  });
  assert.equal(sanitized.apiKey, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.okField, 'safe');
});

// ── AQ9: Law VI — no static vendor-key literals (rg vendor-prefix CLEAN) ─────
test('AQ9: Law VI — no static vendor-key literals in payload sources (rg vendor-prefix CLEAN)', () => {
  const files = [OBSERVER_PATH, PACK_PATH, NOTARY_PATH, TEST_PATH];
  const barePrefix = String.fromCharCode(115, 107, 45);
  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    const contiguousInQuotes = new RegExp(
      `['"\`]${barePrefix.replace('-', '\\-')}`
    );
    assert.equal(
      contiguousInQuotes.test(body),
      false,
      `contiguous vendor-prefix literal in quotes in ${path.basename(f)}`
    );
  }
  assert.ok(synthVendorKey().startsWith(barePrefix));
});

// ── AQ10: NON-CLAIM markers ─────────────────────────────────────────────────
test('AQ10: NON-CLAIM ≠ compliance cert / ≠ external audit / ≠ legal notary / not AR', () => {
  const src = fs.readFileSync(OBSERVER_PATH, 'utf8');
  assert.match(src, /compliance certification/i);
  assert.match(src, /external audit platform/i);
  assert.match(src, /legal notarization/i);
  assert.match(src, /not AR/i);
  assert.match(src, /Fundacion/);
  assert.match(src, /Antigravity-first|CloudAgent/i);
  assert.match(src, /PRODUCTION_READY:\s*NO/);

  const { obs } = harness();
  const st = obs.getState();
  assert.equal(st.nonClaim.notComplianceCert, true);
  assert.equal(st.nonClaim.notExternalAuditPlatform, true);
  assert.equal(st.nonClaim.notLegalNotary, true);
  assert.equal(st.nonClaim.notAr, true);
  assert.equal(st.nonClaim.neverClaimsLegalCompliance, true);
  assert.equal(st.PRODUCTION_READY, 'NO');
});

// ── AQ11: Fundacion ALWAYS_DENY / Δ=0 ───────────────────────────────────────
test('AQ11: Fundacion ALWAYS_DENY / Δ=0 — fundacion write targets denied', () => {
  const { obs } = harness();
  const denied = obs.exportRange({
    missionId: 'm-aq',
    fundacion: true,
    fundacionWrite: true
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.fundacion, 'ALWAYS_DENY');
  assert.equal(denied.fundacionDelta, 0);

  const byTarget = obs.exportRange({
    missionId: 'm-aq',
    target: 'Documents/Fundacion/secret'
  });
  assert.equal(byTarget.ok, false);
  assert.equal(byTarget.fundacionDelta, 0);

  const st = obs.getState();
  assert.equal(st.fundacion, 'ALWAYS_DENY');
  assert.equal(st.fundacionDelta, 0);
});

// ── AQ12: hermetic — no fetch/http/CloudAgent; codes present ────────────────
test('AQ12: hermetic — no fetch/http; no CloudAgent; fail-closed codes present', () => {
  const src =
    fs.readFileSync(OBSERVER_PATH, 'utf8') +
    fs.readFileSync(PACK_PATH, 'utf8') +
    fs.readFileSync(NOTARY_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/\bhttps\.request\b/.test(src), false);
  assert.equal(/CloudAgent/.test(src) && /launch|createCloudAgent/.test(src), false);
  // Mentions of CloudAgent in NON-CLAIM comments are OK; no import/launch path
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);

  for (const code of [
    'OK',
    'EXPORT_OK',
    'VERIFY_FAIL',
    'TAMPER_DETECTED',
    'MISSING_DEP',
    'INVALID_REQUEST',
    'SECRET_LEAK_FORBIDDEN',
    'LEDGER_RANGE_EMPTY',
    'NOTARY_OBSERVE_ONLY',
    'PACK_SEAL_FAIL'
  ]) {
    assert.equal(AQ_CODES[code], code);
  }
});

// ── AQ13: PRODUCTION_READY === NO everywhere ────────────────────────────────
test('AQ13: PRODUCTION_READY === NO on observer, packs, health, state, notary', () => {
  const { obs } = harness({ notarizationObserve: true });
  assert.equal(obs.PRODUCTION_READY, 'NO');
  assert.equal(obs.health().PRODUCTION_READY, 'NO');
  assert.equal(obs.getState().PRODUCTION_READY, 'NO');
  const exported = obs.exportRange({ missionId: 'm-aq' });
  assert.equal(exported.PRODUCTION_READY, 'NO');
  assert.equal(exported.pack.PRODUCTION_READY, 'NO');
  if (exported.notary) {
    assert.equal(exported.notary.PRODUCTION_READY, 'NO');
  }
});

// ── AQ14: optional AL timeline inject observe ───────────────────────────────
test('AQ14: optional AL timeline inject observe on export', () => {
  const { obs } = harness();
  const out = obs.exportRange({
    missionId: 'm-aq',
    includeTimeline: true
  });
  assert.equal(out.ok, true);
  assert.ok(out.pack.timeline);
  assert.equal(out.pack.timeline.observeOnly, true);
  assert.equal(out.pack.timeline.mutatesLiveState, false);
  assert.ok(typeof out.pack.timeline.eventCount === 'number');
});

// ── AQ15: sealPack helpers + recompute + error class ────────────────────────
test('AQ15: sealPack helpers; recomputePackDigest; EvidenceExportNotarizationError', () => {
  const { obs, ledger } = harness();
  const sealed = obs.sealPack({
    entries: [{ seq: 0, digest: defaultHash({ a: 1 }), payload: { x: 1 } }],
    chainTip: ledger.tip()
  });
  assert.equal(sealed.ok, true);
  assert.ok(sealed.pack.sealed);
  assert.ok(sealed.pack.packDigest);

  const recomputed = recomputePackDigest(sealed.pack);
  assert.equal(recomputed, sealed.pack.manifest.packDigest);

  const err = new EvidenceExportNotarizationError('boom', AQ_CODES.VERIFY_FAIL, {
    apiKey: synthVendorKey()
  });
  assert.equal(err.code, AQ_CODES.VERIFY_FAIL);
  assert.equal(err.details.apiKey, '[REDACTED]');
  assert.ok(err instanceof Error);

  assert.equal(typeof stableStringify({ b: 1, a: 2 }), 'string');
  assert.ok(defaultHash({ z: 1 }).length === 64);
  assert.equal(buildSealedEvdPack({ entries: [] }).kind, AQ_PACK_KIND);
});

// ── AQ16: getState NON-CLAIM; codes stable; AR not implemented ──────────────
test('AQ16: getState NON-CLAIM; codes stable; AR not implemented in this mission', () => {
  const { obs } = harness({ notarizationObserve: true });
  obs.exportRange({ missionId: 'm-aq' });
  const st = obs.getState();
  assert.equal(st.kind, AQ_KIND);
  assert.equal(st.exportCount, 1);
  assert.equal(st.packCount, 1);
  assert.equal(st.ledger.present, true);
  assert.ok(st.ledger.tip);
  assert.equal(st.notary.present, true);
  assert.equal(st.fundacionDelta, 0);
  assert.equal(st.cloudAgent, false);
  assert.equal(st.nonClaim.notAr, true);
  assert.equal(st.nonClaim.observeOnly, true);

  // Freeze codes
  assert.deepEqual(
    { ...AQ_CODES },
    {
      OK: 'OK',
      EXPORT_OK: 'EXPORT_OK',
      VERIFY_FAIL: 'VERIFY_FAIL',
      TAMPER_DETECTED: 'TAMPER_DETECTED',
      MISSING_DEP: 'MISSING_DEP',
      INVALID_REQUEST: 'INVALID_REQUEST',
      SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
      LEDGER_RANGE_EMPTY: 'LEDGER_RANGE_EMPTY',
      NOTARY_OBSERVE_ONLY: 'NOTARY_OBSERVE_ONLY',
      PACK_SEAL_FAIL: 'PACK_SEAL_FAIL'
    }
  );

  // AR must not be implemented in this payload
  const arPath = path.join(ROOT, 'src/core/ci/ladder16-seam-pack.js');
  assert.equal(fs.existsSync(arPath), false);
});

// ── AQ17: unsealed pack / missing chainTip → VERIFY_FAIL forensic ───────────
test('AQ17: unsealed pack / missing chainTip → VERIFY_FAIL forensic (no silent accept)', () => {
  const { obs } = harness();
  const exported = obs.exportRange({ missionId: 'm-aq' });
  const unsealed = structuredClone(exported.pack);
  unsealed.sealed = false;
  const v = obs.verifyPack(unsealed);
  assert.equal(v.ok, false);
  assert.equal(v.code, AQ_CODES.VERIFY_FAIL);
  assert.equal(v.forensic, true);

  const noTip = structuredClone(exported.pack);
  noTip.chainTip = null;
  noTip.manifest.chainTip = null;
  // Re-seal digest would change; force verify path for missing tip after
  // fixing digests to still match by only nulling tip fields after we
  // accept that packDigest check may also fail — either VERIFY_FAIL or TAMPER.
  // Prefer direct missing-tip path: rebuild with empty tip via sealPack then null.
  const sealedNoTip = obs.sealPack({
    entries: exported.pack.entries,
    chainTip: 'temp'
  });
  const pack = sealedNoTip.pack;
  pack.chainTip = null;
  pack.manifest.chainTip = null;
  // packDigest still matches recomputation because recompute uses null tip
  pack.manifest.packDigest = recomputePackDigest(pack);
  pack.packDigest = pack.manifest.packDigest;
  const v2 = obs.verifyPack(pack);
  assert.equal(v2.ok, false);
  assert.equal(v2.code, AQ_CODES.VERIFY_FAIL);
  assert.equal(v2.forensic, true);
  assert.equal(v2.silentAccept, false);
});
