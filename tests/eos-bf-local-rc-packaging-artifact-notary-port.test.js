/**
 * @file eos-bf-local-rc-packaging-artifact-notary-port.test.js
 * @description SPEC-0063 / Mission BF — Local Release Candidate Packaging
 * & Artifact Notary Port. Hermetic TDD (~18):
 * kind + PRODUCTION_READY NO; happy-path package+notary + sealed receipt;
 * PRODUCTION_READY=YES / registry / GH Releases / Fundacion / empty /
 * missing seals DENY; Law VI MODULE_DIR ONLY; secret scrub; injectable
 * aq/bc/bd/be compose; getState; deterministic hash; throwOnDeny;
 * NON-CLAIM; L17/L18 CLOSED never-reopen; not BG + BC+BD+BE MEASURED;
 * phases order; custody break + multi-artifact manifest digests stable.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: port ≠ PRODUCTION_READY=YES flip / ≠ public registry publish /
 * ≠ GH Releases product; not BG; Fundacion Δ=0;
 * BF_PRODUCTION_READY=NO; Antigravity-first; L17 CLOSED never reopen;
 * L18 CLOSED never reopen (AX–BB MEASURED); L19 OPEN (BC+BD+BE MEASURED;
 * BF in progress; BG pending);
 * Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/delivery
 * (the BF modules). Do NOT scan the whole tests/ directory (forensic
 * fixtures may contain patterns). Prefer fake tokens like
 * env-fake-token-001 — never contiguous forbidden provider prefix in MODULE_DIR.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BF_PRODUCTION_READY,
  BF_KIND,
  BF_CODES,
  BF_PHASES,
  BF_PHASE_ORDER,
  BF_RECEIPT_KIND,
  BF_RECEIPT_PRODUCTION_READY,
  BF_POLICY_GATE_KIND,
  BF_BOUNDARY_KIND,
  LocalRcPackagingArtifactNotaryError,
  createLocalRcPackagingArtifactNotaryPort,
  packageAndNotarize,
  sanitizeBfPayload,
  sha256Canonical,
  stableStringify,
  buildNotaryReceipt,
  canonicalManifestBody,
  detectSecretLeakage,
  redactSecretSubstrings
} from '../src/core/delivery/local-rc-packaging-artifact-notary-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/delivery');

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

function makeArtifact(id, payload = 'hermetic-rc-artifact') {
  const digest = sha256Canonical({ id, payload });
  return {
    id,
    digest,
    path: `dist/${id}.js`,
    sealed: true,
    kind: 'rc-artifact'
  };
}

function makePort(opts = {}) {
  return createLocalRcPackagingArtifactNotaryPort({
    now: opts.now || (() => '2026-09-14T05:00:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    ports: opts.ports || {},
    requireApplySeal: opts.requireApplySeal === true,
    requireDeliverySeal: opts.requireDeliverySeal === true,
    requireReplaySeal: opts.requireReplaySeal === true,
    requireCustody: opts.requireCustody === true,
    ...opts
  });
}

// ── BF1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BF1: kind eos-local-rc-packaging-artifact-notary-port and PRODUCTION_READY NO', () => {
  const p = makePort();
  assert.equal(p.kind, BF_KIND);
  assert.equal(p.kind, 'eos-local-rc-packaging-artifact-notary-port');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(BF_PRODUCTION_READY, 'NO');
  const health = p.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BF_KIND);
  assert.equal(health.productionReadyYesFlip, false);
  assert.equal(health.publicRegistryPublish, false);
  assert.equal(health.ghReleasesProduct, false);
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
  assert.equal(health.beMeasured, true);
  assert.equal(health.bcStatus, 'BC MEASURED');
  assert.equal(health.bdStatus, 'BD MEASURED');
  assert.equal(health.beStatus, 'BE MEASURED');
  assert.equal(health.notBg, true);
  assert.equal(health.bgPending, true);
  assert.equal(health.bfInProgress, true);
  assert.equal(BF_RECEIPT_KIND, 'eos-local-rc-packaging-artifact-notary-receipt');
  assert.equal(BF_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(
    BF_POLICY_GATE_KIND,
    'eos-local-rc-packaging-artifact-notary-policy-gate'
  );
  assert.equal(
    BF_BOUNDARY_KIND,
    'eos-local-rc-packaging-artifact-notary-boundary'
  );
  assert.deepEqual([...BF_PHASE_ORDER], [
    'VALIDATE',
    'GATE',
    'PACKAGE',
    'NOTARIZE',
    'SEAL'
  ]);
});

// ── BF2: happy-path package+notary + sealed receipt ─────────────────────────
test('BF2: happy-path package+notary + sealed receipt', () => {
  const a1 = makeArtifact('art-a');
  const a2 = makeArtifact('art-b');
  const p = makePort();
  const result = p.packageAndNotarize({ artifacts: [a1, a2] });
  assert.equal(result.ok, true);
  assert.equal(result.code, BF_CODES.PACKAGED);
  assert.equal(result.hermetic, true);
  assert.equal(result.realTarball, false);
  assert.equal(result.registry, false);
  assert.equal(result.ghReleases, false);
  assert.equal(result.network, false);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.ok(result.receipt.receiptId.startsWith('BF-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.productionReadyYesFlip, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.phases.includes(BF_PHASES.VALIDATE));
  assert.ok(result.phases.includes(BF_PHASES.GATE));
  assert.ok(result.phases.includes(BF_PHASES.PACKAGE));
  assert.ok(result.phases.includes(BF_PHASES.NOTARIZE));
  assert.ok(result.phases.includes(BF_PHASES.SEAL));
  assert.equal(result.artifactCount, 2);
  assert.ok(result.manifest);
  assert.equal(typeof result.manifestDigest, 'string');
  assert.match(result.manifestDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.fundacionDelta, 0);
});

// ── BF3: PRODUCTION_READY=YES implication DENY ──────────────────────────────
test('BF3: PRODUCTION_READY=YES implication DENY + sealed receipt', () => {
  const a1 = makeArtifact('art-a');
  const p = makePort();
  const result = p.packageAndNotarize({
    artifacts: [a1],
    policy: { PRODUCTION_READY: 'YES' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.denied, true);
  assert.equal(result.code, BF_CODES.PRODUCTION_READY_YES_DENY);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BF_CODES.PRODUCTION_READY_YES_DENY);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fundacionDelta, 0);

  const flip = p.packageAndNotarize({
    artifacts: [a1],
    flipProductionReady: true
  });
  assert.equal(flip.code, BF_CODES.PRODUCTION_READY_YES_DENY);
});

// ── BF4: public registry / GH Releases intent DENY ──────────────────────────
test('BF4: public registry / GH Releases intent DENY + sealed receipt', () => {
  const a1 = makeArtifact('art-a');
  const p = makePort();
  const reg = p.packageAndNotarize({
    artifacts: [a1],
    publishRegistry: true
  });
  assert.equal(reg.ok, false);
  assert.equal(reg.deny, true);
  assert.equal(reg.code, BF_CODES.REGISTRY_PUBLISH_DENY);
  assert.ok(reg.receipt.sealed);
  assert.equal(reg.PRODUCTION_READY, 'NO');

  const gh = p.packageAndNotarize({
    artifacts: [a1],
    ghReleases: true
  });
  assert.equal(gh.ok, false);
  assert.equal(gh.code, BF_CODES.GH_RELEASES_DENY);
  assert.ok(gh.receipt.sealed);

  const npm = p.packageAndNotarize({
    artifacts: [a1],
    policy: { npmPublish: true }
  });
  assert.equal(npm.ok, false);
  assert.equal(npm.code, BF_CODES.REGISTRY_PUBLISH_DENY);
});

// ── BF5: Fundacion DENY ─────────────────────────────────────────────────────
test('BF5: Fundacion path DENY + sealed receipt', () => {
  const a1 = makeArtifact('art-a');
  const p = makePort();
  const result = p.packageAndNotarize({
    artifacts: [a1],
    fundacion: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.denied, true);
  assert.equal(result.code, BF_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BF_CODES.FUNDACION_DENY);

  const wf = p.writeFundacion({ path: '/Fundacion/secret' });
  assert.equal(wf.code, BF_CODES.FUNDACION_DENY);
  assert.equal(wf.fundacionDelta, 0);
});

// ── BF6: empty/malformed artifacts DENY ─────────────────────────────────────
test('BF6: empty/malformed artifacts DENY + sealed receipt', () => {
  const p = makePort();
  const empty = p.packageAndNotarize({ artifacts: [] });
  assert.equal(empty.ok, false);
  assert.equal(empty.code, BF_CODES.EMPTY_ARTIFACTS);
  assert.ok(empty.receipt.sealed);

  const malformed = p.packageAndNotarize({
    artifacts: [{ malformed: true }]
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, BF_CODES.MALFORMED_ARTIFACTS);
  assert.ok(malformed.receipt.sealed);

  const noDigest = p.packageAndNotarize({
    artifacts: [{ id: 'x' }]
  });
  assert.equal(noDigest.code, BF_CODES.MALFORMED_ARTIFACTS);

  const emptyReq = p.packageAndNotarize({});
  assert.equal(emptyReq.code, BF_CODES.EMPTY_REQUEST);
  assert.ok(emptyReq.receipt.sealed);
});

// ── BF7: missing required delivery/apply/replay seal DENY ───────────────────
test('BF7: missing required delivery/apply/replay seal DENY when policy requires', () => {
  const a1 = makeArtifact('art-a');
  const pApply = makePort({ requireApplySeal: true });
  const missingApply = pApply.packageAndNotarize({ artifacts: [a1] });
  assert.equal(missingApply.ok, false);
  assert.equal(missingApply.code, BF_CODES.APPLY_SEAL_DENY);
  assert.ok(missingApply.receipt.sealed);

  const invalidApply = pApply.packageAndNotarize({
    artifacts: [a1],
    applySeal: { ok: false, sealed: false }
  });
  // broken seal with sealed:false hits CUSTODY_BREAK before APPLY check
  assert.ok(
    invalidApply.code === BF_CODES.APPLY_SEAL_DENY ||
      invalidApply.code === BF_CODES.CUSTODY_BREAK
  );

  const okApply = pApply.packageAndNotarize({
    artifacts: [a1],
    applySeal: { ok: true, sealed: true, digest: 'abc123def4567890' }
  });
  assert.equal(okApply.ok, true);
  assert.equal(okApply.code, BF_CODES.PACKAGED);

  const pDel = makePort({ requireDeliverySeal: true });
  const missingDel = pDel.packageAndNotarize({ artifacts: [a1] });
  assert.equal(missingDel.code, BF_CODES.DELIVERY_SEAL_DENY);
  assert.ok(missingDel.receipt.sealed);

  const okDel = pDel.packageAndNotarize({
    artifacts: [a1],
    deliverySeal: { ok: true, sealed: true, digest: 'def456abc1237890' }
  });
  assert.equal(okDel.ok, true);
  assert.equal(okDel.code, BF_CODES.PACKAGED);

  const pRep = makePort({ requireReplaySeal: true });
  const missingRep = pRep.packageAndNotarize({ artifacts: [a1] });
  assert.equal(missingRep.code, BF_CODES.REPLAY_SEAL_DENY);
  assert.ok(missingRep.receipt.sealed);

  const okRep = pRep.packageAndNotarize({
    artifacts: [a1],
    replaySeal: { ok: true, sealed: true, digest: 'aaaabbbbccccdddd' }
  });
  assert.equal(okRep.ok, true);
  assert.equal(okRep.code, BF_CODES.PACKAGED);
});

// ── BF8: Law VI MODULE_DIR ONLY scan CLEAN ──────────────────────────────────
test('BF8: Law VI CLEAN scanning MODULE_DIR only (not tests/)', () => {
  const forbidden = ['s', 'k', '-'].join('');
  const re = new RegExp(forbidden.replace(/-/g, '\\-') + '[A-Za-z0-9]');
  assert.equal(
    path.basename(MODULE_DIR),
    'delivery',
    'Law VI must target MODULE_DIR = src/core/delivery only'
  );
  const files = fs.readdirSync(MODULE_DIR).filter((f) => /\.(js|mjs)$/.test(f));
  const bfFiles = files.filter(
    (f) =>
      f.startsWith('local-rc-packaging-') ||
      f.startsWith('rc-packaging-') ||
      f.startsWith('rc-package-') ||
      f.startsWith('notary-receipt')
  );
  assert.ok(bfFiles.length >= 4, 'expected BF modules under MODULE_DIR');
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      re.test(src),
      false,
      `Law VI violation in MODULE_DIR/${f}: forbidden provider prefix contiguous literal`
    );
  }
});

// ── BF9: secret scrub / no leakage in receipt ───────────────────────────────
test('BF9: secret scrub / no leakage in receipt', () => {
  const a1 = makeArtifact('art-a');
  const p = makePort();
  const result = p.packageAndNotarize({
    artifacts: [
      {
        ...a1,
        meta: { note: 'safe', apiKey: FAKE_TOKEN }
      }
    ]
  });
  assert.equal(result.ok, true);
  const blob = JSON.stringify(result.receipt);
  assert.equal(blob.includes(FAKE_TOKEN), false);
  const cleaned = sanitizeBfPayload({
    apiKey: FAKE_TOKEN,
    authorization: 'Bearer abcdefghijklmnop',
    receiptDigest: sha256Canonical({ a: 1 })
  });
  assert.equal(cleaned.apiKey, '[REDACTED]');
  assert.equal(cleaned.authorization, '[REDACTED]');
  assert.equal(typeof cleaned.receiptDigest, 'string');
  const vendor = ['s', 'k', '-'].join('') + 'testkey99abcdef';
  const leak = p.packageAndNotarize({
    artifacts: [
      {
        id: 'art-leak',
        digest: sha256Canonical('x'),
        path: `token=${vendor}`
      }
    ]
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, BF_CODES.LAW_VI_DENY);
  assert.ok(leak.receipt.sealed);
  const leakBlob = JSON.stringify(leak.receipt);
  assert.equal(leakBlob.includes(vendor), false);
});

// ── BF10: injectable aq/bc/bd/be compose fakes; no AQ/AJ/AL vendored ─────────
test('BF10: injectable aq/bc/bd/be compose fakes; no AQ/AJ/AL vendored into BF', () => {
  const a1 = makeArtifact('art-a');
  const aqCalls = [];
  const bcCalls = [];
  const bdCalls = [];
  const beCalls = [];
  const p = makePort({
    ports: {
      aqNotary: {
        observe(ctx) {
          aqCalls.push(ctx.kind || 'x');
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
      },
      beReplay: {
        observe(ctx) {
          beCalls.push(ctx.kind || 'x');
          return { ok: true, sealed: true };
        }
      }
    }
  });
  const result = p.packageAndNotarize({ artifacts: [a1] });
  assert.equal(result.ok, true);
  assert.equal(result.aqInjected, true);
  assert.equal(result.bcInjected, true);
  assert.equal(result.bdInjected, true);
  assert.equal(result.beInjected, true);
  assert.equal(result.aqObserved, true);
  assert.equal(result.bcObserved, true);
  assert.equal(result.bdObserved, true);
  assert.equal(result.beObserved, true);
  assert.ok(aqCalls.length >= 1);
  assert.ok(bcCalls.length >= 1);
  assert.ok(bdCalls.length >= 1);
  assert.ok(beCalls.length >= 1);
  assert.equal(aqCalls[0], BF_KIND);
  // MODULE_DIR is src/core/delivery — BC/BD/BE siblings may coexist on main.
  // Forbid vendoring AQ/AJ/AL (wrong packages) into delivery/.
  const files = fs.readdirSync(MODULE_DIR);
  assert.equal(files.includes('evidence-export-notarization-observer.js'), false);
  assert.equal(files.includes('evidence-economy-ledger.js'), false);
  assert.equal(files.includes('evidence-cost-tracker.js'), false);
  assert.equal(files.includes('autonomy-replay-forensic-observer.js'), false);
  assert.equal(files.includes('forensic-timeline-export.js'), false);
  assert.equal(files.includes('multi-workstation-session-federation-port.js'), false);
  assert.equal(files.includes('local-sandbox-container-port.js'), false);
  assert.equal(files.includes('sovereign-developer-engine.js'), false);
  const bfSources = files.filter(
    (f) =>
      f.startsWith('local-rc-packaging-') ||
      f.startsWith('rc-packaging-') ||
      f.startsWith('rc-package-') ||
      f.startsWith('notary-receipt')
  );
  for (const f of bfSources) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(src.includes('evidence-export-notarization'), false);
    assert.equal(src.includes('evidence-economy-ledger'), false);
    assert.equal(src.includes('autonomy-replay-forensic-observer'), false);
    assert.equal(/from\s+['"].*developer-engine\//.test(src), false);
    assert.equal(/from\s+['"].*\/evidence\//.test(src), false);
    assert.equal(/from\s+['"].*governed-patch-diff-apply-port/.test(src), false);
    assert.equal(/from\s+['"].*multi-worktree-multi-target-delivery-port/.test(src), false);
    assert.equal(/from\s+['"].*verification-replay-golden-receipt-port/.test(src), false);
  }
});

// ── BF11: getState counters ─────────────────────────────────────────────────
test('BF11: getState counters (ok/deny)', () => {
  const a1 = makeArtifact('art-a');
  const p = makePort();
  p.packageAndNotarize({ artifacts: [a1] });
  p.packageAndNotarize({
    artifacts: [a1],
    policy: { PRODUCTION_READY: 'YES' }
  });
  const st = p.getState();
  assert.equal(st.packageCount, 2);
  assert.equal(st.okCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.productionReadyYesFlip, false);
  assert.equal(st.kind, BF_KIND);
});

// ── BF12: deterministic receipt hash for same input ─────────────────────────
test('BF12: deterministic receipt hash for same input', () => {
  const a1 = makeArtifact('art-a');
  const fixedNow = () => '2026-09-14T05:00:00.000Z';
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
    const r = p.packageAndNotarize({ artifacts: [a1] });
    digests.push(r.receipt.receiptDigest);
  }
  assert.equal(digests[0], digests[1]);
  assert.match(digests[0], /^[a-f0-9]{64}$/);
  assert.equal(
    stableStringify({ b: 2, a: 1 }),
    stableStringify({ a: 1, b: 2 })
  );
});

// ── BF13: throwOnDeny optional ──────────────────────────────────────────────
test('BF13: throwOnDeny optional throws LocalRcPackagingArtifactNotaryError', () => {
  const a1 = makeArtifact('art-a');
  const strict = makePort({ throwOnDeny: true });
  assert.throws(
    () =>
      strict.packageAndNotarize({
        artifacts: [a1],
        policy: { PRODUCTION_READY: 'YES' }
      }),
    (err) => err instanceof LocalRcPackagingArtifactNotaryError
  );
  assert.equal(Object.isFrozen(BF_CODES), true);
  assert.equal(BF_CODES.PACKAGED, 'PACKAGED');
  assert.equal(BF_CODES.PRODUCTION_READY_YES_DENY, 'PRODUCTION_READY_YES_DENY');
  assert.equal(BF_CODES.REGISTRY_PUBLISH_DENY, 'REGISTRY_PUBLISH_DENY');
  assert.equal(BF_CODES.GH_RELEASES_DENY, 'GH_RELEASES_DENY');
  assert.equal(BF_CODES.CUSTODY_BREAK, 'CUSTODY_BREAK');
  assert.equal(BF_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(BF_CODES.HITL_DENY, 'HITL_DENY');
  assert.equal(BF_CODES.APPLY_SEAL_DENY, 'APPLY_SEAL_DENY');
  assert.equal(BF_CODES.DELIVERY_SEAL_DENY, 'DELIVERY_SEAL_DENY');
  assert.equal(BF_CODES.REPLAY_SEAL_DENY, 'REPLAY_SEAL_DENY');
  assert.equal(BF_CODES.LAW_VI_DENY, 'LAW_VI_DENY');
  assert.equal(BF_CODES.MALFORMED_ARTIFACTS, 'MALFORMED_ARTIFACTS');
  assert.equal(BF_CODES.EMPTY_ARTIFACTS, 'EMPTY_ARTIFACTS');
  assert.equal(BF_CODES.EMPTY_REQUEST, 'EMPTY_REQUEST');
});

// ── BF14: NON-CLAIM strings present ─────────────────────────────────────────
test('BF14: NON-CLAIM strings present (PRODUCTION_READY YES / registry / GH Releases)', () => {
  const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  const bfSources = files.filter(
    (f) =>
      f.startsWith('local-rc-packaging-') ||
      f.startsWith('rc-packaging-') ||
      f.startsWith('rc-package-') ||
      f.startsWith('notary-receipt')
  );
  let blob = '';
  for (const f of bfSources) {
    blob += fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
  }
  assert.match(blob, /PRODUCTION_READY=YES/);
  assert.match(blob, /public registry publish/);
  assert.match(blob, /GH Releases product/);
  assert.match(blob, /not BG/);
  const p = makePort();
  const h = p.health();
  assert.equal(h.productionReadyYesFlip, false);
  assert.equal(h.publicRegistryPublish, false);
  assert.equal(h.ghReleasesProduct, false);
  assert.equal(h.PRODUCTION_READY, 'NO');
});

// ── BF15: L17/L18 CLOSED never-reopen markers ───────────────────────────────
test('BF15: L17/L18 CLOSED never-reopen markers in module comments or health', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  const main = fs.readFileSync(
    path.join(MODULE_DIR, 'local-rc-packaging-artifact-notary-port.js'),
    'utf8'
  );
  assert.match(main, /L17 CLOSED never reopen/);
  assert.match(main, /L18 CLOSED never reopen/);
  assert.match(main, /L19 OPEN/);
});

// ── BF16: not BG claim; BC+BD+BE MEASURED acknowledged ──────────────────────
test('BF16: not BG claim; BC+BD+BE MEASURED acknowledged', () => {
  const p = makePort();
  const h = p.health();
  assert.equal(h.notBg, true);
  assert.equal(h.bgPending, true);
  assert.equal(h.bcMeasured, true);
  assert.equal(h.bdMeasured, true);
  assert.equal(h.beMeasured, true);
  assert.equal(h.bcStatus, 'BC MEASURED');
  assert.equal(h.bdStatus, 'BD MEASURED');
  assert.equal(h.beStatus, 'BE MEASURED');
  const st = p.getState();
  assert.equal(st.notBg, true);
  assert.equal(st.bcMeasured, true);
  assert.equal(st.bdMeasured, true);
  assert.equal(st.beMeasured, true);
  const main = fs.readFileSync(
    path.join(MODULE_DIR, 'local-rc-packaging-artifact-notary-port.js'),
    'utf8'
  );
  assert.match(main, /BC\+BD\+BE MEASURED/);
  assert.match(main, /not BG/);
});

// ── BF17: phases order enforced ─────────────────────────────────────────────
test('BF17: phases order enforced VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL', () => {
  const a1 = makeArtifact('art-a');
  const p = makePort();
  const result = p.packageAndNotarize({ artifacts: [a1] });
  assert.deepEqual(result.phases, [
    BF_PHASES.VALIDATE,
    BF_PHASES.GATE,
    BF_PHASES.PACKAGE,
    BF_PHASES.NOTARIZE,
    BF_PHASES.SEAL
  ]);
  const deny = p.packageAndNotarize({
    artifacts: [a1],
    fundacion: true
  });
  assert.ok(deny.phases.includes(BF_PHASES.VALIDATE));
  assert.ok(deny.phases.includes(BF_PHASES.GATE));
  assert.ok(deny.phases.includes(BF_PHASES.SEAL));
  assert.equal(deny.phases[deny.phases.length - 1], BF_PHASES.SEAL);
  assert.equal(deny.phases.includes(BF_PHASES.PACKAGE), false);
  assert.equal(deny.phases.includes(BF_PHASES.NOTARIZE), false);
});

// ── BF18: custody break DENY; multi-artifact manifest digests stable ────────
test('BF18: custody break DENY; multi-artifact manifest digests stable', () => {
  const a1 = makeArtifact('art-z');
  const a2 = makeArtifact('art-a');
  const a3 = makeArtifact('art-m');
  const p = makePort();

  const broken = p.packageAndNotarize({
    artifacts: [a1],
    applySeal: { sealed: false, ok: false, custodyBreak: true }
  });
  assert.equal(broken.ok, false);
  assert.equal(broken.deny, true);
  assert.equal(broken.code, BF_CODES.CUSTODY_BREAK);
  assert.ok(broken.receipt.sealed);
  assert.equal(broken.PRODUCTION_READY, 'NO');
  assert.equal(broken.fundacionDelta, 0);

  // Multi-artifact: order-independent stable manifest digest
  const r1 = p.packageAndNotarize({ artifacts: [a1, a2, a3] });
  const r2 = p.packageAndNotarize({ artifacts: [a3, a1, a2] });
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r1.code, BF_CODES.PACKAGED);
  assert.equal(r1.manifestDigest, r2.manifestDigest);
  assert.deepEqual(r1.artifactIds, r2.artifactIds);
  assert.deepEqual(r1.artifactIds, ['art-a', 'art-m', 'art-z']);
  assert.ok(r1.receipt.sealed);

  const one = packageAndNotarize(
    { artifacts: [a2] },
    { now: () => '2026-09-14T05:00:00.000Z' }
  );
  assert.equal(one.code, BF_CODES.PACKAGED);
  assert.equal(one.receipt.sealed, true);

  const rcpt = buildNotaryReceipt({
    ok: true,
    code: 'PACKAGED',
    manifestDigest: r1.manifestDigest,
    artifactCount: 3,
    artifactIds: ['art-a', 'art-m', 'art-z']
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(typeof redactSecretSubstrings('x'), 'string');
  assert.equal(detectSecretLeakage('safe text').leak, false);
  assert.equal(
    typeof canonicalManifestBody([a2]).kind,
    'string'
  );
});
