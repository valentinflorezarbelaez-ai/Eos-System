/**
 * @file eos-bc-governed-patch-diff-apply-port.test.js
 * @description SPEC-0060 / Mission BC — Governed Patch / Diff Apply Port.
 * Hermetic TDD (~18):
 * happy-path allowlisted patch apply + sealed receipt; Fundacion / allowlist /
 * engine-seal / HITL / malformed DENY; Law VI MODULE_DIR ONLY; secret scrub;
 * injectable axSeal/aqObserve; getState; idempotent hash; throwOnDeny;
 * NON-CLAIM; L17/L18 CLOSED never-reopen; not BD/BE/BF/BG; phases order;
 * empty targets DENY.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: port ≠ unsupervised auto-merge SaaS / ≠ GH Actions replacement /
 * ≠ PRODUCTION_READY delivery product; not BD/BE/BF/BG; Fundacion Δ=0;
 * BC_PRODUCTION_READY=NO; Antigravity-first; L17 CLOSED never reopen;
 * L18 CLOSED never reopen (AX–BB MEASURED); L19 OPEN;
 * Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/delivery
 * (the BC modules). Do NOT scan the whole tests/ directory (forensic
 * fixtures may contain patterns). Prefer fake tokens like
 * env-fake-token-001 — never contiguous forbidden provider prefix in MODULE_DIR.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BC_PRODUCTION_READY,
  BC_KIND,
  BC_CODES,
  BC_PHASES,
  BC_PHASE_ORDER,
  BC_RECEIPT_KIND,
  BC_RECEIPT_PRODUCTION_READY,
  BC_POLICY_GATE_KIND,
  BC_BOUNDARY_KIND,
  DEFAULT_ALLOWLISTED_PATHS,
  GovernedPatchDiffApplyError,
  createGovernedPatchDiffApplyPort,
  applyPatch,
  sanitizeBcPayload,
  sha256Canonical,
  stableStringify,
  buildApplyReceipt,
  checkPathAllowlisted,
  detectSecretLeakage,
  redactSecretSubstrings
} from '../src/core/delivery/governed-patch-diff-apply-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/delivery');

const ALLOWED = 'workspace/allowlisted.js';

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

function makePort(opts = {}) {
  return createGovernedPatchDiffApplyPort({
    now: opts.now || (() => '2026-09-13T18:00:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    allowlistedPaths: opts.allowlistedPaths || [...DEFAULT_ALLOWLISTED_PATHS],
    ports: opts.ports || {},
    requireEngineSeal: opts.requireEngineSeal === true,
    requireHitl: opts.requireHitl === true,
    ...opts
  });
}

function structuredPatch(targets = [ALLOWED], extra = {}) {
  return {
    kind: 'structured',
    targets,
    ops: targets.map((p) => ({
      op: 'set',
      path: p,
      content: `/* patched:${p} */\n`
    })),
    ...extra
  };
}

// ── BC1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BC1: kind eos-governed-patch-diff-apply-port and PRODUCTION_READY NO', () => {
  const p = makePort();
  assert.equal(p.kind, BC_KIND);
  assert.equal(p.kind, 'eos-governed-patch-diff-apply-port');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(BC_PRODUCTION_READY, 'NO');
  const health = p.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BC_KIND);
  assert.equal(health.unsupervisedAutoMergeSaas, false);
  assert.equal(health.ghActionsReplacement, false);
  assert.equal(health.productionReadyDeliveryProduct, false);
  assert.equal(health.autoMerge, false);
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
  assert.equal(health.notBd, true);
  assert.equal(health.bdPending, true);
  assert.equal(BC_RECEIPT_KIND, 'eos-governed-patch-diff-apply-receipt');
  assert.equal(BC_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BC_POLICY_GATE_KIND, 'eos-governed-patch-diff-policy-gate');
  assert.equal(BC_BOUNDARY_KIND, 'eos-governed-patch-diff-boundary');
  assert.deepEqual([...BC_PHASE_ORDER], [
    'VALIDATE',
    'GATE',
    'APPLY',
    'SEAL'
  ]);
});

// ── BC2: happy-path allowlisted patch apply + sealed receipt ────────────────
test('BC2: happy-path allowlisted patch apply + sealed receipt', () => {
  const p = makePort();
  const result = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED]
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, BC_CODES.APPLIED);
  assert.equal(result.hermetic, true);
  assert.equal(result.realGitApply, false);
  assert.equal(result.ghApi, false);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.ok(result.receipt.receiptId.startsWith('BC-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.unsupervisedAutoMergeSaas, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.phases.includes(BC_PHASES.VALIDATE));
  assert.ok(result.phases.includes(BC_PHASES.GATE));
  assert.ok(result.phases.includes(BC_PHASES.APPLY));
  assert.ok(result.phases.includes(BC_PHASES.SEAL));
  assert.deepEqual(result.appliedPaths, [ALLOWED]);
  assert.ok(String(result.fs[ALLOWED]).includes('BC-APPLIED') || String(result.fs[ALLOWED]).includes('patched'));
});

// ── BC3: Fundacion path DENY + sealed receipt ───────────────────────────────
test('BC3: Fundacion path DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.applyPatch({
    patch: structuredPatch(['Fundacion/secret.js']),
    targets: ['Fundacion/secret.js'],
    fundacion: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.denied, true);
  assert.equal(result.code, BC_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BC_CODES.FUNDACION_DENY);
});

// ── BC4: outside allowlist DENY ─────────────────────────────────────────────
test('BC4: outside allowlist DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.applyPatch({
    patch: structuredPatch(['src/evil/not-listed.js']),
    targets: ['src/evil/not-listed.js']
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.code, BC_CODES.ALLOWLIST_DENY);
  assert.ok(result.receipt.sealed);
});

// ── BC5: missing/invalid engine seal DENY (when required) ───────────────────
test('BC5: missing/invalid engine seal DENY when required', () => {
  const p = makePort({ requireEngineSeal: true });
  const missing = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED]
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, BC_CODES.ENGINE_SEAL_DENY);
  assert.ok(missing.receipt.sealed);

  const invalid = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED],
    engineSeal: { ok: false, sealed: false }
  });
  assert.equal(invalid.code, BC_CODES.ENGINE_SEAL_DENY);

  const ok = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED],
    engineSeal: { ok: true, sealed: true, digest: 'abc123def4567890' }
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.code, BC_CODES.APPLIED);
});

// ── BC6: HITL required DENY ─────────────────────────────────────────────────
test('BC6: HITL required DENY + sealed receipt', () => {
  const p = makePort({ requireHitl: true });
  const result = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED]
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BC_CODES.HITL_REQUIRED);
  assert.ok(result.receipt.sealed);

  const granted = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED],
    hitlGranted: true
  });
  assert.equal(granted.ok, true);
  assert.equal(granted.code, BC_CODES.APPLIED);
});

// ── BC7: malformed patch DENY ───────────────────────────────────────────────
test('BC7: malformed patch DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.applyPatch({
    patch: { malformed: true },
    targets: [ALLOWED]
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BC_CODES.MALFORMED_PATCH);
  assert.ok(result.receipt.sealed);

  const empty = p.applyPatch({
    patch: 'not-a-diff-at-all',
    targets: [ALLOWED]
  });
  assert.equal(empty.code, BC_CODES.MALFORMED_PATCH);
});

// ── BC8: Law VI MODULE_DIR ONLY scan CLEAN ──────────────────────────────────
test('BC8: Law VI CLEAN scanning MODULE_DIR only (not tests/)', () => {
  // Build forbidden prefix at runtime so this test file can mention patterns
  // in comments without being scanned (we only scan MODULE_DIR).
  const forbidden = ['s', 'k', '-'].join('');
  const re = new RegExp(forbidden.replace(/-/g, '\\-') + '[A-Za-z0-9]');
  assert.equal(
    path.basename(MODULE_DIR),
    'delivery',
    'Law VI must target MODULE_DIR = src/core/delivery only'
  );
  // CRITICAL: do NOT scan tests/ — forensic fixtures may contain patterns
  const files = fs.readdirSync(MODULE_DIR).filter((f) => /\.(js|mjs)$/.test(f));
  assert.ok(files.length >= 4, 'expected BC modules under MODULE_DIR');
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      re.test(src),
      false,
      `Law VI violation in MODULE_DIR/${f}: forbidden provider prefix contiguous literal`
    );
  }
});

// ── BC9: secret scrub / no leakage in receipt ───────────────────────────────
test('BC9: secret scrub / no leakage in receipt', () => {
  const p = makePort();
  const result = p.applyPatch({
    patch: structuredPatch([ALLOWED], {
      meta: { note: 'safe', apiKey: FAKE_TOKEN }
    }),
    targets: [ALLOWED]
  });
  assert.equal(result.ok, true);
  const blob = JSON.stringify(result.receipt);
  assert.equal(blob.includes(FAKE_TOKEN), false);
  assert.ok(!/'apiKey'\s*:\s*'env-fake/.test(blob));
  const cleaned = sanitizeBcPayload({
    apiKey: FAKE_TOKEN,
    authorization: 'Bearer abcdefghijklmnop',
    receiptDigest: sha256Canonical({ a: 1 })
  });
  assert.equal(cleaned.apiKey, '[REDACTED]');
  assert.equal(cleaned.authorization, '[REDACTED]');
  assert.equal(typeof cleaned.receiptDigest, 'string');
  // Law VI DENY when reconstructed forbidden prefix appears in patch body
  const vendor = ['s', 'k', '-'].join('') + 'testkey99abcdef';
  const leak = p.applyPatch({
    patch: {
      kind: 'structured',
      targets: [ALLOWED],
      text: `token=${vendor}`,
      ops: [{ op: 'set', path: ALLOWED, content: `x=${vendor}` }]
    },
    targets: [ALLOWED]
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, BC_CODES.LAW_VI_DENY);
  assert.ok(leak.receipt.sealed);
  const leakBlob = JSON.stringify(leak.receipt);
  assert.equal(leakBlob.includes(vendor), false);
});

// ── BC10: injectable axSeal / aqObserve compose ─────────────────────────────
test('BC10: injectable axSeal / aqObserve compose (fake ports called)', () => {
  const axCalls = [];
  const aqCalls = [];
  const p = makePort({
    ports: {
      axSeal: {
        observe(ctx) {
          axCalls.push(ctx.kind || 'x');
          return { ok: true, sealed: true };
        }
      },
      aqObserve: {
        observe(ctx) {
          aqCalls.push(ctx.kind || 'x');
          return { ok: true };
        }
      }
    }
  });
  const result = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED]
  });
  assert.equal(result.ok, true);
  assert.equal(result.axInjected, true);
  assert.equal(result.aqInjected, true);
  assert.equal(result.axObserved, true);
  assert.equal(result.aqObserved, true);
  assert.equal(axCalls.length, 1);
  assert.equal(aqCalls.length, 1);
  assert.equal(axCalls[0], BC_KIND);
  // Ensure MODULE_DIR does not vendor-copy AX/AQ source filenames
  const files = fs.readdirSync(MODULE_DIR);
  assert.equal(files.includes('sovereign-developer-engine.js'), false);
  assert.equal(files.includes('evidence-export-notarization-observer.js'), false);
});

// ── BC11: getState counters (ok/deny) ───────────────────────────────────────
test('BC11: getState counters (ok/deny)', () => {
  const p = makePort();
  p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED]
  });
  p.applyPatch({
    patch: structuredPatch(['evil/nope.js']),
    targets: ['evil/nope.js']
  });
  const st = p.getState();
  assert.equal(st.applyCount, 2);
  assert.equal(st.okCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.unsupervisedAutoMergeSaas, false);
  assert.equal(st.kind, BC_KIND);
});

// ── BC12: idempotent / deterministic receipt hash for same input ────────────
test('BC12: deterministic receipt hash for same input', () => {
  const fixedNow = () => '2026-09-13T18:00:00.000Z';
  let seq = 0;
  // Use custom hash that ignores seq volatility by hashing stable fields only —
  // buildApplyReceipt includes seq; so compare canonical fields via same now
  // and verify identical inputs → identical digest when seq is controlled via
  // hashing only the logical payload through injectable hash.
  const digests = [];
  for (let i = 0; i < 2; i++) {
    const p = makePort({
      now: fixedNow,
      hash: (payload) => {
        // strip seq for determinism check of logical content
        const { seq: _s, at: _a, ...rest } =
          typeof payload === 'object' && payload ? payload : { v: payload };
        return sha256Canonical(rest);
      }
    });
    const r = p.applyPatch({
      patch: structuredPatch([ALLOWED]),
      targets: [ALLOWED]
    });
    digests.push(r.receipt.receiptDigest);
  }
  assert.equal(digests[0], digests[1]);
  assert.match(digests[0], /^[a-f0-9]{64}$/);
  // Also: same stableStringify for identical objects
  assert.equal(
    stableStringify({ b: 2, a: 1 }),
    stableStringify({ a: 1, b: 2 })
  );
  void seq;
});

// ── BC13: throwOnDeny optional ──────────────────────────────────────────────
test('BC13: throwOnDeny optional throws GovernedPatchDiffApplyError', () => {
  const strict = makePort({ throwOnDeny: true });
  assert.throws(
    () =>
      strict.applyPatch({
        patch: structuredPatch(['evil/nope.js']),
        targets: ['evil/nope.js']
      }),
    (err) => err instanceof GovernedPatchDiffApplyError
  );
  assert.equal(Object.isFrozen(BC_CODES), true);
  assert.equal(BC_CODES.APPLIED, 'APPLIED');
  assert.equal(BC_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(BC_CODES.ALLOWLIST_DENY, 'ALLOWLIST_DENY');
  assert.equal(BC_CODES.HITL_REQUIRED, 'HITL_REQUIRED');
  assert.equal(BC_CODES.ENGINE_SEAL_DENY, 'ENGINE_SEAL_DENY');
  assert.equal(BC_CODES.LAW_VI_DENY, 'LAW_VI_DENY');
  assert.equal(BC_CODES.MALFORMED_PATCH, 'MALFORMED_PATCH');
});

// ── BC14: NON-CLAIM strings present ─────────────────────────────────────────
test('BC14: NON-CLAIM strings present (auto-merge / GH Actions / PRODUCTION_READY)', () => {
  const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  let blob = '';
  for (const f of files) {
    blob += fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
  }
  assert.match(blob, /auto-merge/i);
  assert.match(blob, /GH Actions/i);
  assert.match(blob, /PRODUCTION_READY delivery product/i);
  assert.match(blob, /not BD\/BE\/BF\/BG/);
  const p = makePort();
  const h = p.health();
  assert.equal(h.unsupervisedAutoMergeSaas, false);
  assert.equal(h.ghActionsReplacement, false);
  assert.equal(h.productionReadyDeliveryProduct, false);
  assert.equal(h.PRODUCTION_READY, 'NO');
});

// ── BC15: L17/L18 CLOSED never-reopen markers ───────────────────────────────
test('BC15: L17/L18 CLOSED never-reopen markers in module comments or health', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  const main = fs.readFileSync(
    path.join(MODULE_DIR, 'governed-patch-diff-apply-port.js'),
    'utf8'
  );
  assert.match(main, /L17 CLOSED never reopen/);
  assert.match(main, /L18 CLOSED never reopen/);
  assert.match(main, /L19 OPEN/);
});

// ── BC16: not BD/BE/BF/BG claim ─────────────────────────────────────────────
test('BC16: not BD/BE/BF/BG claim', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.notBd, true);
  assert.equal(h.notBe, true);
  assert.equal(h.notBf, true);
  assert.equal(h.notBg, true);
  assert.equal(h.bdPending, true);
  assert.equal(h.bePending, true);
  assert.equal(h.bfPending, true);
  assert.equal(h.bgPending, true);
  const st = p.getState();
  assert.equal(st.notBd, true);
  assert.equal(st.notBe, true);
  assert.equal(st.notBf, true);
  assert.equal(st.notBg, true);
});

// ── BC17: phases order enforced ─────────────────────────────────────────────
test('BC17: phases order enforced VALIDATE → GATE → APPLY → SEAL', () => {
  const p = makePort();
  const result = p.applyPatch({
    patch: structuredPatch([ALLOWED]),
    targets: [ALLOWED]
  });
  assert.deepEqual(result.phases, [
    BC_PHASES.VALIDATE,
    BC_PHASES.GATE,
    BC_PHASES.APPLY,
    BC_PHASES.SEAL
  ]);
  // Deny still ends with SEAL and preserves order prefix
  const deny = p.applyPatch({
    patch: structuredPatch(['evil/x.js']),
    targets: ['evil/x.js']
  });
  assert.ok(deny.phases.includes(BC_PHASES.VALIDATE));
  assert.ok(deny.phases.includes(BC_PHASES.GATE));
  assert.ok(deny.phases.includes(BC_PHASES.SEAL));
  assert.equal(deny.phases[deny.phases.length - 1], BC_PHASES.SEAL);
  // APPLY must not run on allowlist deny
  assert.equal(deny.phases.includes(BC_PHASES.APPLY), false);
});

// ── BC18: empty targets / invalid request DENY ──────────────────────────────
test('BC18: empty targets / invalid request DENY', () => {
  const p = makePort();
  const emptyTargets = p.applyPatch({
    patch: { kind: 'structured', targets: [], ops: [] },
    targets: []
  });
  assert.equal(emptyTargets.ok, false);
  assert.equal(emptyTargets.code, BC_CODES.INVALID_REQUEST);
  assert.ok(emptyTargets.receipt.sealed);

  const noPatch = p.applyPatch({
    targets: [ALLOWED]
  });
  assert.equal(noPatch.code, BC_CODES.MALFORMED_PATCH);

  const wf = p.writeFundacion({ path: '/Fundacion/secret' });
  assert.equal(wf.code, BC_CODES.FUNDACION_DENY);
  assert.equal(wf.fundacionDelta, 0);

  const mem = p.applyPatch({
    patch: structuredPatch(['memory://fixture/x']),
    targets: ['memory://fixture/x']
  });
  assert.equal(mem.ok, true);
  assert.equal(mem.code, BC_CODES.APPLIED);

  const one = applyPatch(
    {
      patch: structuredPatch(['fixtures/patch-target.js']),
      targets: ['fixtures/patch-target.js']
    },
    { now: () => '2026-09-13T18:00:00.000Z' }
  );
  assert.equal(one.code, BC_CODES.APPLIED);

  const allow = checkPathAllowlisted(ALLOWED);
  assert.equal(allow.ok, true);
  const rcpt = buildApplyReceipt({
    ok: true,
    code: 'APPLIED',
    targets: [ALLOWED]
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(typeof redactSecretSubstrings('x'), 'string');
  assert.equal(detectSecretLeakage('safe text').leak, false);
});
