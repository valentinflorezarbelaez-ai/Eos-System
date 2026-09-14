/**
 * @file eos-bd-multi-worktree-multi-target-delivery-port.test.js
 * @description SPEC-0061 / Mission BD — Multi-Worktree / Multi-Target
 * Delivery Port. Hermetic TDD (~18):
 * kind + PRODUCTION_READY NO; happy-path multi-target + sealed receipt;
 * Fundacion / allowlist / BA isolation / apply-seal / empty+malformed DENY;
 * Law VI MODULE_DIR ONLY; secret scrub; injectable an/ba/bc compose;
 * getState; deterministic hash; throwOnDeny; NON-CLAIM; L17/L18 CLOSED
 * never-reopen; not BE/BF/BG + BC MEASURED; phases order;
 * single-target + multi-target partial fail = DENY fail-closed.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: port ≠ multi-tenant cloud fleet / ≠ Kubernetes CD /
 * ≠ PRODUCTION_READY delivery product; not BE/BF/BG; Fundacion Δ=0;
 * BD_PRODUCTION_READY=NO; Antigravity-first; L17 CLOSED never reopen;
 * L18 CLOSED never reopen (AX–BB MEASURED); L19 OPEN (BC MEASURED;
 * BD in progress; BE–BG pending);
 * Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/delivery
 * (the BD modules). Do NOT scan the whole tests/ directory (forensic
 * fixtures may contain patterns). Prefer fake tokens like
 * env-fake-token-001 — never contiguous forbidden provider prefix in MODULE_DIR.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BD_PRODUCTION_READY,
  BD_KIND,
  BD_CODES,
  BD_PHASES,
  BD_PHASE_ORDER,
  BD_RECEIPT_KIND,
  BD_RECEIPT_PRODUCTION_READY,
  BD_POLICY_GATE_KIND,
  BD_BOUNDARY_KIND,
  DEFAULT_ALLOWLISTED_TARGETS,
  MultiWorktreeMultiTargetDeliveryError,
  createMultiWorktreeMultiTargetDeliveryPort,
  deliver,
  sanitizeBdPayload,
  sha256Canonical,
  stableStringify,
  buildDeliveryReceipt,
  checkTargetAllowlisted,
  detectSecretLeakage,
  redactSecretSubstrings
} from '../src/core/delivery/multi-worktree-multi-target-delivery-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/delivery');

const T_ALPHA = 'wt-alpha';
const T_BETA = 'wt-beta';

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

function makePort(opts = {}) {
  return createMultiWorktreeMultiTargetDeliveryPort({
    now: opts.now || (() => '2026-09-13T18:00:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    allowlistedTargets: opts.allowlistedTargets || [
      ...DEFAULT_ALLOWLISTED_TARGETS
    ],
    ports: opts.ports || {},
    requireApplySeal: opts.requireApplySeal === true,
    ...opts
  });
}

function sealedArtifact(extra = {}) {
  return {
    kind: 'sealed-artifact',
    id: 'art-001',
    digest: 'abc123def4567890abcdef12',
    payload: '/* hermetic-delivery */\n',
    ...extra
  };
}

// ── BD1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BD1: kind eos-multi-worktree-multi-target-delivery-port and PRODUCTION_READY NO', () => {
  const p = makePort();
  assert.equal(p.kind, BD_KIND);
  assert.equal(p.kind, 'eos-multi-worktree-multi-target-delivery-port');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(BD_PRODUCTION_READY, 'NO');
  const health = p.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BD_KIND);
  assert.equal(health.multiTenantCloudFleet, false);
  assert.equal(health.kubernetesCd, false);
  assert.equal(health.productionReadyDeliveryProduct, false);
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
  assert.equal(health.bcStatus, 'BC MEASURED');
  assert.equal(health.notBe, true);
  assert.equal(BD_RECEIPT_KIND, 'eos-multi-worktree-multi-target-delivery-receipt');
  assert.equal(BD_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(
    BD_POLICY_GATE_KIND,
    'eos-multi-worktree-multi-target-delivery-policy-gate'
  );
  assert.equal(
    BD_BOUNDARY_KIND,
    'eos-multi-worktree-multi-target-delivery-boundary'
  );
  assert.deepEqual([...BD_PHASE_ORDER], [
    'VALIDATE',
    'GATE',
    'DELIVER',
    'SEAL'
  ]);
});

// ── BD2: happy-path multi-target deliver + sealed receipt ───────────────────
test('BD2: happy-path multi-target deliver + sealed receipt', () => {
  const p = makePort();
  const result = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA, T_BETA]
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, BD_CODES.DELIVERED);
  assert.equal(result.hermetic, true);
  assert.equal(result.realGitWorktree, false);
  assert.equal(result.remoteCd, false);
  assert.equal(result.delivered, true);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.ok(result.receipt.receiptId.startsWith('BD-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.multiTenantCloudFleet, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.phases.includes(BD_PHASES.VALIDATE));
  assert.ok(result.phases.includes(BD_PHASES.GATE));
  assert.ok(result.phases.includes(BD_PHASES.DELIVER));
  assert.ok(result.phases.includes(BD_PHASES.SEAL));
  assert.deepEqual(result.deliveredTargets, [T_ALPHA, T_BETA]);
  assert.ok(result.roots[T_ALPHA]);
  assert.ok(result.roots[T_BETA]);
  assert.equal(result.roots[T_ALPHA].placed, true);
});

// ── BD3: Fundacion path DENY + sealed receipt ───────────────────────────────
test('BD3: Fundacion path DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.deliver({
    artifact: sealedArtifact(),
    targets: ['Fundacion/secret-wt'],
    fundacion: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.denied, true);
  assert.equal(result.code, BD_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BD_CODES.FUNDACION_DENY);
});

// ── BD4: outside allowlist DENY ─────────────────────────────────────────────
test('BD4: outside allowlist DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.deliver({
    artifact: sealedArtifact(),
    targets: ['evil/not-listed']
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.code, BD_CODES.ALLOWLIST_DENY);
  assert.ok(result.receipt.sealed);
});

// ── BD5: BA isolation violation DENY (fake port) ────────────────────────────
test('BD5: BA isolation violation DENY (fake port)', () => {
  const p = makePort({
    ports: {
      baIsolation: {
        observe() {
          return { ok: false, violation: true, reason: 'escape' };
        }
      }
    }
  });
  const result = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA]
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.code, BD_CODES.ISOLATION_DENY);
  assert.ok(result.receipt.sealed);

  const okPort = makePort({
    ports: {
      baIsolation: {
        observe() {
          return { ok: true, violation: false };
        }
      }
    }
  });
  const ok = okPort.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA]
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.code, BD_CODES.DELIVERED);
});

// ── BD6: missing/invalid apply seal DENY when required ──────────────────────
test('BD6: missing/invalid apply seal DENY when required', () => {
  const p = makePort({ requireApplySeal: true });
  const missing = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA]
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, BD_CODES.APPLY_SEAL_DENY);
  assert.ok(missing.receipt.sealed);

  const invalid = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA],
    applySeal: { ok: false, sealed: false }
  });
  assert.equal(invalid.code, BD_CODES.APPLY_SEAL_DENY);

  const ok = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA],
    applySeal: { ok: true, sealed: true, digest: 'abc123def4567890' }
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.code, BD_CODES.DELIVERED);
});

// ── BD7: empty targets / malformed artifact DENY ────────────────────────────
test('BD7: empty targets / malformed artifact DENY + sealed receipt', () => {
  const p = makePort();
  const emptyTargets = p.deliver({
    artifact: sealedArtifact(),
    targets: []
  });
  assert.equal(emptyTargets.ok, false);
  assert.equal(emptyTargets.code, BD_CODES.INVALID_REQUEST);
  assert.ok(emptyTargets.receipt.sealed);

  const malformed = p.deliver({
    artifact: { malformed: true },
    targets: [T_ALPHA]
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, BD_CODES.MALFORMED_ARTIFACT);
  assert.ok(malformed.receipt.sealed);

  const emptyArt = p.deliver({
    artifact: {},
    targets: [T_ALPHA]
  });
  assert.equal(emptyArt.code, BD_CODES.MALFORMED_ARTIFACT);
});

// ── BD8: Law VI MODULE_DIR ONLY scan CLEAN ──────────────────────────────────
test('BD8: Law VI CLEAN scanning MODULE_DIR only (not tests/)', () => {
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
  assert.ok(files.length >= 4, 'expected BD modules under MODULE_DIR');
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      re.test(src),
      false,
      `Law VI violation in MODULE_DIR/${f}: forbidden provider prefix contiguous literal`
    );
  }
});

// ── BD9: secret scrub / no leakage in receipt ───────────────────────────────
test('BD9: secret scrub / no leakage in receipt', () => {
  const p = makePort();
  const result = p.deliver({
    artifact: sealedArtifact({
      meta: { note: 'safe', apiKey: FAKE_TOKEN }
    }),
    targets: [T_ALPHA]
  });
  assert.equal(result.ok, true);
  const blob = JSON.stringify(result.receipt);
  assert.equal(blob.includes(FAKE_TOKEN), false);
  assert.ok(!/'apiKey'\s*:\s*'env-fake/.test(blob));
  const cleaned = sanitizeBdPayload({
    apiKey: FAKE_TOKEN,
    authorization: 'Bearer abcdefghijklmnop',
    receiptDigest: sha256Canonical({ a: 1 })
  });
  assert.equal(cleaned.apiKey, '[REDACTED]');
  assert.equal(cleaned.authorization, '[REDACTED]');
  assert.equal(typeof cleaned.receiptDigest, 'string');
  // Law VI DENY when reconstructed forbidden prefix appears in artifact body
  const vendor = ['s', 'k', '-'].join('') + 'testkey99abcdef';
  const leak = p.deliver({
    artifact: {
      kind: 'sealed-artifact',
      id: 'art-leak',
      payload: `token=${vendor}`
    },
    targets: [T_ALPHA]
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, BD_CODES.LAW_VI_DENY);
  assert.ok(leak.receipt.sealed);
  const leakBlob = JSON.stringify(leak.receipt);
  assert.equal(leakBlob.includes(vendor), false);
});

// ── BD10: injectable an/ba/bc compose fakes called ──────────────────────────
test('BD10: injectable an/ba/bc compose fakes called', () => {
  const anCalls = [];
  const baCalls = [];
  const bcCalls = [];
  const p = makePort({
    ports: {
      anFederation: {
        observe(ctx) {
          anCalls.push(ctx.kind || 'x');
          return { ok: true };
        }
      },
      baIsolation: {
        observe(ctx) {
          baCalls.push(ctx.kind || 'x');
          return { ok: true, violation: false };
        }
      },
      bcApply: {
        observe(ctx) {
          bcCalls.push(ctx.kind || 'x');
          return { ok: true, sealed: true };
        }
      }
    }
  });
  const result = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA, T_BETA]
  });
  assert.equal(result.ok, true);
  assert.equal(result.anInjected, true);
  assert.equal(result.baInjected, true);
  assert.equal(result.bcInjected, true);
  assert.equal(result.anObserved, true);
  assert.equal(result.baObserved, true);
  assert.equal(result.bcObserved, true);
  assert.ok(anCalls.length >= 1);
  assert.ok(baCalls.length >= 1);
  assert.ok(bcCalls.length >= 1);
  assert.equal(anCalls[0], BD_KIND);
  // MODULE_DIR is src/core/delivery — BC siblings may coexist on main.
  // Forbid vendoring AN/AX/BA (wrong packages) into delivery/.
  const files = fs.readdirSync(MODULE_DIR);
  assert.equal(files.includes('multi-workstation-session-federation-port.js'), false);
  assert.equal(files.includes('local-sandbox-container-port.js'), false);
  assert.equal(files.includes('sovereign-developer-engine.js'), false);
  assert.equal(files.includes('sandbox-boundary.js'), false);
  assert.equal(files.includes('isolation-receipt.js'), false);
  // BD modules must not import AN/AX/BA source paths (compose via ports only)
  const bdSources = files.filter((f) => f.startsWith('delivery-') || f.startsWith('multi-worktree-'));
  for (const f of bdSources) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(src.includes('multi-workstation-session-federation-port'), false);
    assert.equal(src.includes('local-sandbox-container-port'), false);
    assert.equal(src.includes('sovereign-developer-engine'), false);
    assert.equal(/from\s+['\"].*developer-engine\//.test(src), false);
  }
});

// ── BD11: getState counters (ok/deny) ───────────────────────────────────────
test('BD11: getState counters (ok/deny)', () => {
  const p = makePort();
  p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA]
  });
  p.deliver({
    artifact: sealedArtifact(),
    targets: ['evil/nope']
  });
  const st = p.getState();
  assert.equal(st.deliverCount, 2);
  assert.equal(st.okCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.multiTenantCloudFleet, false);
  assert.equal(st.kind, BD_KIND);
});

// ── BD12: deterministic receipt hash for same input ─────────────────────────
test('BD12: deterministic receipt hash for same input', () => {
  const fixedNow = () => '2026-09-13T18:00:00.000Z';
  const digests = [];
  for (let i = 0; i < 2; i++) {
    const p = makePort({
      now: fixedNow,
      hash: (payload) => {
        const { seq: _s, at: _a, ...rest } =
          typeof payload === 'object' && payload ? payload : { v: payload };
        return sha256Canonical(rest);
      }
    });
    const r = p.deliver({
      artifact: sealedArtifact(),
      targets: [T_ALPHA, T_BETA]
    });
    digests.push(r.receipt.receiptDigest);
  }
  assert.equal(digests[0], digests[1]);
  assert.match(digests[0], /^[a-f0-9]{64}$/);
  assert.equal(
    stableStringify({ b: 2, a: 1 }),
    stableStringify({ a: 1, b: 2 })
  );
});

// ── BD13: throwOnDeny optional ──────────────────────────────────────────────
test('BD13: throwOnDeny optional throws MultiWorktreeMultiTargetDeliveryError', () => {
  const strict = makePort({ throwOnDeny: true });
  assert.throws(
    () =>
      strict.deliver({
        artifact: sealedArtifact(),
        targets: ['evil/nope']
      }),
    (err) => err instanceof MultiWorktreeMultiTargetDeliveryError
  );
  assert.equal(Object.isFrozen(BD_CODES), true);
  assert.equal(BD_CODES.DELIVERED, 'DELIVERED');
  assert.equal(BD_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(BD_CODES.ALLOWLIST_DENY, 'ALLOWLIST_DENY');
  assert.equal(BD_CODES.ISOLATION_DENY, 'ISOLATION_DENY');
  assert.equal(BD_CODES.APPLY_SEAL_DENY, 'APPLY_SEAL_DENY');
  assert.equal(BD_CODES.LAW_VI_DENY, 'LAW_VI_DENY');
  assert.equal(BD_CODES.MALFORMED_ARTIFACT, 'MALFORMED_ARTIFACT');
});

// ── BD14: NON-CLAIM strings present ─────────────────────────────────────────
test('BD14: NON-CLAIM strings present (cloud fleet / K8s CD / PRODUCTION_READY delivery)', () => {
  const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  let blob = '';
  for (const f of files) {
    blob += fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
  }
  assert.match(blob, /cloud fleet/i);
  assert.match(blob, /Kubernetes CD/i);
  assert.match(blob, /PRODUCTION_READY delivery product/i);
  assert.match(blob, /not BE\/BF\/BG/);
  const p = makePort();
  const h = p.health();
  assert.equal(h.multiTenantCloudFleet, false);
  assert.equal(h.kubernetesCd, false);
  assert.equal(h.productionReadyDeliveryProduct, false);
  assert.equal(h.PRODUCTION_READY, 'NO');
});

// ── BD15: L17/L18 CLOSED never-reopen markers ───────────────────────────────
test('BD15: L17/L18 CLOSED never-reopen markers in module comments or health', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  const main = fs.readFileSync(
    path.join(MODULE_DIR, 'multi-worktree-multi-target-delivery-port.js'),
    'utf8'
  );
  assert.match(main, /L17 CLOSED never reopen/);
  assert.match(main, /L18 CLOSED never reopen/);
  assert.match(main, /L19 OPEN/);
});

// ── BD16: not BE/BF/BG claim; BC MEASURED acknowledged ──────────────────────
test('BD16: not BE/BF/BG claim; BC MEASURED acknowledged', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.notBe, true);
  assert.equal(h.notBf, true);
  assert.equal(h.notBg, true);
  assert.equal(h.bePending, true);
  assert.equal(h.bfPending, true);
  assert.equal(h.bgPending, true);
  assert.equal(h.bcMeasured, true);
  assert.equal(h.bcStatus, 'BC MEASURED');
  const st = p.getState();
  assert.equal(st.notBe, true);
  assert.equal(st.notBf, true);
  assert.equal(st.notBg, true);
  assert.equal(st.bcMeasured, true);
  const main = fs.readFileSync(
    path.join(MODULE_DIR, 'multi-worktree-multi-target-delivery-port.js'),
    'utf8'
  );
  assert.match(main, /BC MEASURED/);
  assert.match(main, /not BE\/BF\/BG/);
});

// ── BD17: phases order enforced ─────────────────────────────────────────────
test('BD17: phases order enforced VALIDATE → GATE → DELIVER → SEAL', () => {
  const p = makePort();
  const result = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA, T_BETA]
  });
  assert.deepEqual(result.phases, [
    BD_PHASES.VALIDATE,
    BD_PHASES.GATE,
    BD_PHASES.DELIVER,
    BD_PHASES.SEAL
  ]);
  // Deny still ends with SEAL and preserves order prefix
  const deny = p.deliver({
    artifact: sealedArtifact(),
    targets: ['evil/x']
  });
  assert.ok(deny.phases.includes(BD_PHASES.VALIDATE));
  assert.ok(deny.phases.includes(BD_PHASES.GATE));
  assert.ok(deny.phases.includes(BD_PHASES.SEAL));
  assert.equal(deny.phases[deny.phases.length - 1], BD_PHASES.SEAL);
  // DELIVER must not run on allowlist deny
  assert.equal(deny.phases.includes(BD_PHASES.DELIVER), false);
});

// ── BD18: single-target works; multi-target partial fail = DENY fail-closed ─
test('BD18: single-target still works; multi-target partial fail = DENY fail-closed', () => {
  const p = makePort();
  const single = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA]
  });
  assert.equal(single.ok, true);
  assert.equal(single.code, BD_CODES.DELIVERED);
  assert.equal(single.delivered, true);
  assert.deepEqual(single.deliveredTargets, [T_ALPHA]);

  const partial = p.deliver({
    artifact: sealedArtifact(),
    targets: [T_ALPHA, 'evil/not-listed']
  });
  assert.equal(partial.ok, false);
  assert.equal(partial.deny, true);
  assert.equal(partial.denied, true);
  assert.equal(partial.code, BD_CODES.ALLOWLIST_DENY);
  assert.equal(partial.delivered, false);
  assert.equal(partial.partial, false);
  assert.ok(partial.receipt.sealed);
  // no partial success claim — deliveredTargets on deny receipt is empty
  assert.deepEqual(partial.receipt.deliveredTargets, []);

  const wf = p.writeFundacion({ path: '/Fundacion/secret' });
  assert.equal(wf.code, BD_CODES.FUNDACION_DENY);
  assert.equal(wf.fundacionDelta, 0);

  const mem = p.deliver({
    artifact: sealedArtifact(),
    targets: ['memory://fixture/x']
  });
  assert.equal(mem.ok, true);
  assert.equal(mem.code, BD_CODES.DELIVERED);

  const one = deliver(
    {
      artifact: sealedArtifact(),
      targets: ['worktree/alpha']
    },
    { now: () => '2026-09-13T18:00:00.000Z' }
  );
  assert.equal(one.code, BD_CODES.DELIVERED);

  const allow = checkTargetAllowlisted(T_ALPHA);
  assert.equal(allow.ok, true);
  const rcpt = buildDeliveryReceipt({
    ok: true,
    code: 'DELIVERED',
    targets: [T_ALPHA]
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(typeof redactSecretSubstrings('x'), 'string');
  assert.equal(detectSecretLeakage('safe text').leak, false);
});
