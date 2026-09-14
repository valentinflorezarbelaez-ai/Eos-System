/**
 * @file eos-be-verification-replay-golden-receipt-port.test.js
 * @description SPEC-0062 / Mission BE — Verification Replay & Golden
 * Receipt Port. Hermetic TDD (~18):
 * kind + PRODUCTION_READY NO; happy-path match + sealed receipt;
 * digest mismatch / custody break / Fundacion / required seals /
 * malformed DENY; Law VI MODULE_DIR ONLY; secret scrub; injectable
 * aj/al/bc/bd compose; getState; deterministic hash; throwOnDeny;
 * NON-CLAIM; L17/L18 CLOSED never-reopen; not BF/BG + BC+BD MEASURED;
 * phases order; empty request DENY + multi-golden select by id.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: port ≠ SIEM product / ≠ billing accuracy SaaS /
 * ≠ PRODUCTION_READY verification product; not BF/BG; Fundacion Δ=0;
 * BE_PRODUCTION_READY=NO; Antigravity-first; L17 CLOSED never reopen;
 * L18 CLOSED never reopen (AX–BB MEASURED); L19 OPEN (BC+BD MEASURED;
 * BE in progress; BF–BG pending);
 * Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/delivery
 * (the BE modules). Do NOT scan the whole tests/ directory (forensic
 * fixtures may contain patterns). Prefer fake tokens like
 * env-fake-token-001 — never contiguous forbidden provider prefix in MODULE_DIR.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BE_PRODUCTION_READY,
  BE_KIND,
  BE_CODES,
  BE_PHASES,
  BE_PHASE_ORDER,
  BE_RECEIPT_KIND,
  BE_RECEIPT_PRODUCTION_READY,
  BE_POLICY_GATE_KIND,
  BE_BOUNDARY_KIND,
  VerificationReplayGoldenReceiptError,
  createVerificationReplayGoldenReceiptPort,
  replay,
  sanitizeBePayload,
  sha256Canonical,
  stableStringify,
  buildReplayReceipt,
  canonicalReplayBody,
  detectSecretLeakage,
  redactSecretSubstrings
} from '../src/core/delivery/verification-replay-golden-receipt-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/delivery');

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

function makeSealedPair(id, payload, extra = {}) {
  const kind = extra.kind || 'eos-verify-strict-receipt';
  const code = extra.code || 'OK';
  const canonical = { kind, code, payload };
  const digest = sha256Canonical(canonical);
  const golden = {
    id,
    kind,
    code,
    payload,
    digest,
    receiptDigest: digest,
    sealed: true,
    receiptId: `GOLD-${id}`
  };
  const candidate = {
    id,
    goldenId: id,
    kind,
    code,
    payload,
    digest,
    receiptDigest: digest,
    sealed: true,
    receiptId: `CAND-${id}`,
    ...('candidateExtra' in extra ? extra.candidateExtra : {})
  };
  return { golden, candidate, digest, canonical };
}

function makePort(opts = {}) {
  return createVerificationReplayGoldenReceiptPort({
    now: opts.now || (() => '2026-09-13T23:00:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    goldens: opts.goldens || {},
    ports: opts.ports || {},
    requireApplySeal: opts.requireApplySeal === true,
    requireDeliverySeal: opts.requireDeliverySeal === true,
    ...opts
  });
}

// ── BE1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BE1: kind eos-verification-replay-golden-receipt-port and PRODUCTION_READY NO', () => {
  const p = makePort();
  assert.equal(p.kind, BE_KIND);
  assert.equal(p.kind, 'eos-verification-replay-golden-receipt-port');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(BE_PRODUCTION_READY, 'NO');
  const health = p.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BE_KIND);
  assert.equal(health.siemProduct, false);
  assert.equal(health.billingAccuracySaas, false);
  assert.equal(health.productionReadyVerificationProduct, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'CLOSED');
  assert.equal(health.ladder19, 'OPEN');
  assert.equal(health.l17NeverReopen, true);
  assert.equal(health.l18NeverReopen, true);
  assert.equal(health.axisMeasured, 'AX–BB MEASURED');
  assert.equal(health.axis, 'Sovereign Delivery & Verification Fabric');
  assert.equal(health.bcMeasured, true);
  assert.equal(health.bdMeasured, true);
  assert.equal(health.bcStatus, 'BC MEASURED');
  assert.equal(health.bdStatus, 'BD MEASURED');
  assert.equal(health.notBf, true);
  assert.equal(health.notBg, true);
  assert.equal(BE_RECEIPT_KIND, 'eos-verification-replay-golden-receipt');
  assert.equal(BE_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(
    BE_POLICY_GATE_KIND,
    'eos-verification-replay-golden-receipt-policy-gate'
  );
  assert.equal(
    BE_BOUNDARY_KIND,
    'eos-verification-replay-golden-receipt-boundary'
  );
  assert.deepEqual([...BE_PHASE_ORDER], [
    'VALIDATE',
    'GATE',
    'REPLAY',
    'COMPARE',
    'SEAL'
  ]);
});

// ── BE2: happy-path match + sealed receipt ──────────────────────────────────
test('BE2: happy-path match + sealed receipt', () => {
  const pair = makeSealedPair('gold-vs', '/* hermetic-verify-strict */\n');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  const result = p.replay({
    candidate: pair.candidate,
    golden: 'gold-vs'
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, BE_CODES.MATCHED);
  assert.equal(result.match, true);
  assert.equal(result.hermetic, true);
  assert.equal(result.realVerifyStrict, false);
  assert.equal(result.siem, false);
  assert.equal(result.network, false);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.ok(result.receipt.receiptId.startsWith('BE-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.siemProduct, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.phases.includes(BE_PHASES.VALIDATE));
  assert.ok(result.phases.includes(BE_PHASES.GATE));
  assert.ok(result.phases.includes(BE_PHASES.REPLAY));
  assert.ok(result.phases.includes(BE_PHASES.COMPARE));
  assert.ok(result.phases.includes(BE_PHASES.SEAL));
  assert.equal(result.goldenId, 'gold-vs');
  assert.equal(result.fundacionDelta, 0);
});

// ── BE3: digest mismatch DENY ───────────────────────────────────────────────
test('BE3: digest mismatch DENY + sealed receipt', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  const result = p.replay({
    candidate: { ...pair.candidate, payload: 'payload-DRIFTED', digest: undefined },
    golden: 'gold-vs'
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.denied, true);
  assert.equal(result.match, false);
  assert.equal(result.code, BE_CODES.DIGEST_MISMATCH);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BE_CODES.DIGEST_MISMATCH);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fundacionDelta, 0);
});

// ── BE4: custody break DENY ─────────────────────────────────────────────────
test('BE4: custody break DENY + sealed receipt', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  const missingSealed = p.replay({
    candidate: { ...pair.candidate, sealed: false },
    golden: 'gold-vs'
  });
  assert.equal(missingSealed.ok, false);
  assert.equal(missingSealed.deny, true);
  assert.equal(missingSealed.code, BE_CODES.CUSTODY_BREAK);
  assert.ok(missingSealed.receipt.sealed);

  const missingKind = p.replay({
    candidate: {
      id: 'gold-vs',
      sealed: true,
      payload: 'x',
      digest: pair.digest
    },
    golden: 'gold-vs'
  });
  assert.equal(missingKind.code, BE_CODES.CUSTODY_BREAK);
  assert.ok(missingKind.receipt.sealed);
});

// ── BE5: Fundacion DENY ─────────────────────────────────────────────────────
test('BE5: Fundacion path DENY + sealed receipt', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  const result = p.replay({
    candidate: pair.candidate,
    golden: 'gold-vs',
    fundacion: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.denied, true);
  assert.equal(result.code, BE_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BE_CODES.FUNDACION_DENY);

  const wf = p.writeFundacion({ path: '/Fundacion/secret' });
  assert.equal(wf.code, BE_CODES.FUNDACION_DENY);
  assert.equal(wf.fundacionDelta, 0);
});

// ── BE6: missing/invalid required delivery/apply seal DENY ───────────────────
test('BE6: missing/invalid required delivery/apply seal DENY when policy requires', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const pApply = makePort({
    goldens: { 'gold-vs': pair.golden },
    requireApplySeal: true
  });
  const missingApply = pApply.replay({
    candidate: pair.candidate,
    golden: 'gold-vs'
  });
  assert.equal(missingApply.ok, false);
  assert.equal(missingApply.code, BE_CODES.APPLY_SEAL_DENY);
  assert.ok(missingApply.receipt.sealed);

  const invalidApply = pApply.replay({
    candidate: pair.candidate,
    golden: 'gold-vs',
    applySeal: { ok: false, sealed: false }
  });
  assert.equal(invalidApply.code, BE_CODES.APPLY_SEAL_DENY);

  const okApply = pApply.replay({
    candidate: pair.candidate,
    golden: 'gold-vs',
    applySeal: { ok: true, sealed: true, digest: 'abc123def4567890' }
  });
  assert.equal(okApply.ok, true);
  assert.equal(okApply.code, BE_CODES.MATCHED);

  const pDel = makePort({
    goldens: { 'gold-vs': pair.golden },
    requireDeliverySeal: true
  });
  const missingDel = pDel.replay({
    candidate: pair.candidate,
    golden: 'gold-vs'
  });
  assert.equal(missingDel.code, BE_CODES.DELIVERY_SEAL_DENY);
  assert.ok(missingDel.receipt.sealed);

  const okDel = pDel.replay({
    candidate: pair.candidate,
    golden: 'gold-vs',
    deliverySeal: { ok: true, sealed: true, digest: 'def456abc1237890' }
  });
  assert.equal(okDel.ok, true);
  assert.equal(okDel.code, BE_CODES.MATCHED);
});

// ── BE7: malformed candidate/golden DENY ────────────────────────────────────
test('BE7: malformed candidate/golden DENY + sealed receipt', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  const malformedC = p.replay({
    candidate: { malformed: true },
    golden: 'gold-vs'
  });
  assert.equal(malformedC.ok, false);
  assert.equal(malformedC.code, BE_CODES.MALFORMED_CANDIDATE);
  assert.ok(malformedC.receipt.sealed);

  const emptyC = p.replay({
    candidate: {},
    golden: 'gold-vs'
  });
  assert.equal(emptyC.code, BE_CODES.MALFORMED_CANDIDATE);

  const malformedG = p.replay({
    candidate: pair.candidate,
    golden: { malformed: true }
  });
  assert.equal(malformedG.ok, false);
  assert.equal(malformedG.code, BE_CODES.MALFORMED_GOLDEN);
  assert.ok(malformedG.receipt.sealed);
});

// ── BE8: Law VI MODULE_DIR ONLY scan CLEAN ──────────────────────────────────
test('BE8: Law VI CLEAN scanning MODULE_DIR only (not tests/)', () => {
  const forbidden = ['s', 'k', '-'].join('');
  const re = new RegExp(forbidden.replace(/-/g, '\\-') + '[A-Za-z0-9]');
  assert.equal(
    path.basename(MODULE_DIR),
    'delivery',
    'Law VI must target MODULE_DIR = src/core/delivery only'
  );
  const files = fs.readdirSync(MODULE_DIR).filter((f) => /\.(js|mjs)$/.test(f));
  const beFiles = files.filter(
    (f) =>
      f.startsWith('verification-replay-') ||
      f.startsWith('replay-') ||
      f.startsWith('golden-receipt-')
  );
  assert.ok(beFiles.length >= 4, 'expected BE modules under MODULE_DIR');
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      re.test(src),
      false,
      `Law VI violation in MODULE_DIR/${f}: forbidden provider prefix contiguous literal`
    );
  }
});

// ── BE9: secret scrub / no leakage in receipt ───────────────────────────────
test('BE9: secret scrub / no leakage in receipt', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  const result = p.replay({
    candidate: {
      ...pair.candidate,
      meta: { note: 'safe', apiKey: FAKE_TOKEN }
    },
    golden: 'gold-vs'
  });
  assert.equal(result.ok, true);
  const blob = JSON.stringify(result.receipt);
  assert.equal(blob.includes(FAKE_TOKEN), false);
  const cleaned = sanitizeBePayload({
    apiKey: FAKE_TOKEN,
    authorization: 'Bearer abcdefghijklmnop',
    receiptDigest: sha256Canonical({ a: 1 })
  });
  assert.equal(cleaned.apiKey, '[REDACTED]');
  assert.equal(cleaned.authorization, '[REDACTED]');
  assert.equal(typeof cleaned.receiptDigest, 'string');
  const vendor = ['s', 'k', '-'].join('') + 'testkey99abcdef';
  const leak = p.replay({
    candidate: {
      kind: 'eos-verify-strict-receipt',
      id: 'gold-leak',
      sealed: true,
      payload: `token=${vendor}`
    },
    golden: pair.golden
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, BE_CODES.LAW_VI_DENY);
  assert.ok(leak.receipt.sealed);
  const leakBlob = JSON.stringify(leak.receipt);
  assert.equal(leakBlob.includes(vendor), false);
});

// ── BE10: injectable aj/al/bc/bd compose fakes called ───────────────────────
test('BE10: injectable aj/al/bc/bd compose fakes called; no AJ/AL vendored', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const ajCalls = [];
  const alCalls = [];
  const bcCalls = [];
  const bdCalls = [];
  const p = makePort({
    goldens: { 'gold-vs': pair.golden },
    ports: {
      ajLedger: {
        observe(ctx) {
          ajCalls.push(ctx.kind || 'x');
          return { ok: true };
        }
      },
      alReplay: {
        observe(ctx) {
          alCalls.push(ctx.kind || 'x');
          return { ok: true };
        }
      },
      bcApply: {
        observe(ctx) {
          bcCalls.push(ctx.kind || 'x');
          return { ok: true, sealed: true };
        }
      },
      bdDelivery: {
        observe(ctx) {
          bdCalls.push(ctx.kind || 'x');
          return { ok: true, sealed: true };
        }
      }
    }
  });
  const result = p.replay({
    candidate: pair.candidate,
    golden: 'gold-vs'
  });
  assert.equal(result.ok, true);
  assert.equal(result.ajInjected, true);
  assert.equal(result.alInjected, true);
  assert.equal(result.bcInjected, true);
  assert.equal(result.bdInjected, true);
  assert.equal(result.ajObserved, true);
  assert.equal(result.alObserved, true);
  assert.equal(result.bcObserved, true);
  assert.equal(result.bdObserved, true);
  assert.ok(ajCalls.length >= 1);
  assert.ok(alCalls.length >= 1);
  assert.ok(bcCalls.length >= 1);
  assert.ok(bdCalls.length >= 1);
  assert.equal(ajCalls[0], BE_KIND);
  // MODULE_DIR is src/core/delivery — BC/BD siblings may coexist on main.
  // Forbid vendoring AJ/AL/AN/AX/BA (wrong packages) into delivery/.
  const files = fs.readdirSync(MODULE_DIR);
  assert.equal(files.includes('evidence-economy-ledger.js'), false);
  assert.equal(files.includes('evidence-cost-tracker.js'), false);
  assert.equal(files.includes('autonomy-replay-forensic-observer.js'), false);
  assert.equal(files.includes('forensic-timeline-export.js'), false);
  assert.equal(files.includes('multi-workstation-session-federation-port.js'), false);
  assert.equal(files.includes('local-sandbox-container-port.js'), false);
  assert.equal(files.includes('sovereign-developer-engine.js'), false);
  assert.equal(files.includes('sandbox-boundary.js'), false);
  assert.equal(files.includes('isolation-receipt.js'), false);
  const beSources = files.filter(
    (f) =>
      f.startsWith('verification-replay-') ||
      f.startsWith('replay-') ||
      f.startsWith('golden-receipt-')
  );
  for (const f of beSources) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(src.includes('evidence-economy-ledger'), false);
    assert.equal(src.includes('autonomy-replay-forensic-observer'), false);
    assert.equal(/from\s+['"].*developer-engine\//.test(src), false);
    assert.equal(/from\s+['"].*\/evidence\//.test(src), false);
    assert.equal(/from\s+['"].*governed-patch-diff-apply-port/.test(src), false);
    assert.equal(/from\s+['"].*multi-worktree-multi-target-delivery-port/.test(src), false);
  }
});

// ── BE11: getState counters (ok/deny) ───────────────────────────────────────
test('BE11: getState counters (ok/deny)', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  p.replay({ candidate: pair.candidate, golden: 'gold-vs' });
  p.replay({
    candidate: { ...pair.candidate, payload: 'nope', digest: undefined },
    golden: 'gold-vs'
  });
  const st = p.getState();
  assert.equal(st.replayCount, 2);
  assert.equal(st.okCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.matchCount, 1);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.siemProduct, false);
  assert.equal(st.kind, BE_KIND);
});

// ── BE12: deterministic receipt hash for same input ─────────────────────────
test('BE12: deterministic receipt hash for same input', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const fixedNow = () => '2026-09-13T23:00:00.000Z';
  const digests = [];
  for (let i = 0; i < 2; i++) {
    const p = makePort({
      now: fixedNow,
      goldens: { 'gold-vs': pair.golden },
      hash: (payload) => {
        const { seq: _s, at: _a, ...rest } =
          typeof payload === 'object' && payload ? payload : { v: payload };
        return sha256Canonical(rest);
      }
    });
    const r = p.replay({ candidate: pair.candidate, golden: 'gold-vs' });
    digests.push(r.receipt.receiptDigest);
  }
  assert.equal(digests[0], digests[1]);
  assert.match(digests[0], /^[a-f0-9]{64}$/);
  assert.equal(
    stableStringify({ b: 2, a: 1 }),
    stableStringify({ a: 1, b: 2 })
  );
});

// ── BE13: throwOnDeny optional ──────────────────────────────────────────────
test('BE13: throwOnDeny optional throws VerificationReplayGoldenReceiptError', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const strict = makePort({
    throwOnDeny: true,
    goldens: { 'gold-vs': pair.golden }
  });
  assert.throws(
    () =>
      strict.replay({
        candidate: { ...pair.candidate, payload: 'nope', digest: undefined },
        golden: 'gold-vs'
      }),
    (err) => err instanceof VerificationReplayGoldenReceiptError
  );
  assert.equal(Object.isFrozen(BE_CODES), true);
  assert.equal(BE_CODES.MATCHED, 'MATCHED');
  assert.equal(BE_CODES.DIGEST_MISMATCH, 'DIGEST_MISMATCH');
  assert.equal(BE_CODES.CUSTODY_BREAK, 'CUSTODY_BREAK');
  assert.equal(BE_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(BE_CODES.HITL_DENY, 'HITL_DENY');
  assert.equal(BE_CODES.APPLY_SEAL_DENY, 'APPLY_SEAL_DENY');
  assert.equal(BE_CODES.DELIVERY_SEAL_DENY, 'DELIVERY_SEAL_DENY');
  assert.equal(BE_CODES.LAW_VI_DENY, 'LAW_VI_DENY');
  assert.equal(BE_CODES.MALFORMED_CANDIDATE, 'MALFORMED_CANDIDATE');
  assert.equal(BE_CODES.EMPTY_REQUEST, 'EMPTY_REQUEST');
});

// ── BE14: NON-CLAIM strings present ─────────────────────────────────────────
test('BE14: NON-CLAIM strings present (SIEM / billing / PRODUCTION_READY verification)', () => {
  const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  const beSources = files.filter(
    (f) =>
      f.startsWith('verification-replay-') ||
      f.startsWith('replay-') ||
      f.startsWith('golden-receipt-')
  );
  let blob = '';
  for (const f of beSources) {
    blob += fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
  }
  assert.match(blob, /SIEM product/);
  assert.match(blob, /billing accuracy SaaS/);
  assert.match(blob, /PRODUCTION_READY verification product/);
  assert.match(blob, /not BF\/BG/);
  const p = makePort();
  const h = p.health();
  assert.equal(h.siemProduct, false);
  assert.equal(h.billingAccuracySaas, false);
  assert.equal(h.productionReadyVerificationProduct, false);
  assert.equal(h.PRODUCTION_READY, 'NO');
});

// ── BE15: L17/L18 CLOSED never-reopen markers ───────────────────────────────
test('BE15: L17/L18 CLOSED never-reopen markers in module comments or health', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  const main = fs.readFileSync(
    path.join(MODULE_DIR, 'verification-replay-golden-receipt-port.js'),
    'utf8'
  );
  assert.match(main, /L17 CLOSED never reopen/);
  assert.match(main, /L18 CLOSED never reopen/);
  assert.match(main, /L19 OPEN/);
});

// ── BE16: not BF/BG claim; BC+BD MEASURED acknowledged ──────────────────────
test('BE16: not BF/BG claim; BC+BD MEASURED acknowledged', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.notBf, true);
  assert.equal(h.notBg, true);
  assert.equal(h.bfPending, true);
  assert.equal(h.bgPending, true);
  assert.equal(h.bcMeasured, true);
  assert.equal(h.bdMeasured, true);
  assert.equal(h.bcStatus, 'BC MEASURED');
  assert.equal(h.bdStatus, 'BD MEASURED');
  const st = p.getState();
  assert.equal(st.notBf, true);
  assert.equal(st.notBg, true);
  assert.equal(st.bcMeasured, true);
  assert.equal(st.bdMeasured, true);
  const main = fs.readFileSync(
    path.join(MODULE_DIR, 'verification-replay-golden-receipt-port.js'),
    'utf8'
  );
  assert.match(main, /BC\+BD MEASURED/);
  assert.match(main, /not BF\/BG/);
});

// ── BE17: phases order enforced ─────────────────────────────────────────────
test('BE17: phases order enforced VALIDATE → GATE → REPLAY → COMPARE → SEAL', () => {
  const pair = makeSealedPair('gold-vs', 'payload-ok');
  const p = makePort({ goldens: { 'gold-vs': pair.golden } });
  const result = p.replay({ candidate: pair.candidate, golden: 'gold-vs' });
  assert.deepEqual(result.phases, [
    BE_PHASES.VALIDATE,
    BE_PHASES.GATE,
    BE_PHASES.REPLAY,
    BE_PHASES.COMPARE,
    BE_PHASES.SEAL
  ]);
  const deny = p.replay({
    candidate: { ...pair.candidate, sealed: false },
    golden: 'gold-vs'
  });
  assert.ok(deny.phases.includes(BE_PHASES.VALIDATE));
  assert.ok(deny.phases.includes(BE_PHASES.GATE));
  assert.ok(deny.phases.includes(BE_PHASES.SEAL));
  assert.equal(deny.phases[deny.phases.length - 1], BE_PHASES.SEAL);
  assert.equal(deny.phases.includes(BE_PHASES.REPLAY), false);
  assert.equal(deny.phases.includes(BE_PHASES.COMPARE), false);
});

// ── BE18: empty request DENY; multi-golden select by id ─────────────────────
test('BE18: empty request DENY; multi-golden select by id works', () => {
  const vs = makeSealedPair('gold-vs', 'verify-strict-ok');
  const sat = makeSealedPair('gold-sat', 'satellite-ok', {
    kind: 'eos-satellite-receipt'
  });
  const p = makePort({
    goldens: {
      'gold-vs': vs.golden,
      'gold-sat': sat.golden
    }
  });

  const empty = p.replay({});
  assert.equal(empty.ok, false);
  assert.equal(empty.deny, true);
  assert.equal(empty.code, BE_CODES.EMPTY_REQUEST);
  assert.ok(empty.receipt.sealed);
  assert.equal(empty.PRODUCTION_READY, 'NO');
  assert.equal(empty.fundacionDelta, 0);

  const selected = p.replay({
    candidate: sat.candidate,
    golden: 'gold-sat'
  });
  assert.equal(selected.ok, true);
  assert.equal(selected.code, BE_CODES.MATCHED);
  assert.equal(selected.match, true);
  assert.equal(selected.goldenId, 'gold-sat');
  assert.ok(selected.receipt.sealed);

  const vsSel = p.replay({
    candidate: vs.candidate,
    golden: 'gold-vs'
  });
  assert.equal(vsSel.ok, true);
  assert.equal(vsSel.goldenId, 'gold-vs');

  const one = replay(
    { candidate: vs.candidate, golden: vs.golden },
    { now: () => '2026-09-13T23:00:00.000Z' }
  );
  assert.equal(one.code, BE_CODES.MATCHED);
  assert.equal(one.receipt.sealed, true);

  const rcpt = buildReplayReceipt({
    ok: true,
    code: 'MATCHED',
    match: true,
    goldenId: 'gold-vs'
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(typeof redactSecretSubstrings('x'), 'string');
  assert.equal(detectSecretLeakage('safe text').leak, false);
  assert.equal(typeof canonicalReplayBody(vs.candidate).kind, 'string');
});
