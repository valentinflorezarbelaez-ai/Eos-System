/**
 * @file eos-bn-continuous-integrity-sentinel.test.js
 * @description SPEC-0071 / Mission BN — Continuous Integrity Sentinel & FDIR
 * Heartbeat Daemon. Hermetic TDD (~16):
 * kind + PRODUCTION_READY NO; happy pulse BN-RCPT-*; drift DENY/DRIFT_DETECTED;
 * quarantine isolateDrift; start/stop no leak; receipt chain; Law VI;
 * Layer 0; Fundacion; NON-CLAIM; DEGRADED; L17–L20 never-reopen;
 * injectable ports; getState; trail verify.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: sentinel ≠ Datadog/Prometheus/K8s daemonset / ≠ heavy APM /
 * ≠ PRODUCTION_READY=YES monitoring product;
 * L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 * L21 OPEN (BM MEASURED; BN in progress; BO–BQ pending);
 * Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric;
 * Fundacion Δ=0; BN_PRODUCTION_READY=NO; Antigravity-first.
 *
 * Law VI / CRITICAL: scan ONLY BN-owned sentinel-* / continuous-* files under
 * MODULE_DIR = src/core/sentinel. Do NOT require exclusive ownership of
 * sibling dirs (freeze-drift/ fdir/ governance/ may coexist — DO NOT rewrite).
 * Do NOT scan tests/.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BN_PRODUCTION_READY,
  BN_KIND,
  BN_CODES,
  BN_RECEIPT_KIND,
  BN_RECEIPT_PRODUCTION_READY,
  BN_POLICY_GATE_KIND,
  createContinuousIntegritySentinelDaemon,
  stableStringify,
  sha256Canonical,
  buildHeartbeatReceipt,
  verifyHeartbeatReceipt,
  hashHeartbeatReceipt,
  canonicalHeartbeatSealBody,
  _resetReceiptSeqForTests
} from '../src/core/sentinel/continuous-integrity-sentinel-daemon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR — scan BN-owned sentinel-* / continuous-* only */
const MODULE_DIR = path.join(ROOT, 'src/core/sentinel');

const FIXED_NOW = () => '2026-09-14T22:00:00.000Z';

function makeDaemon(opts = {}) {
  _resetReceiptSeqForTests();
  return createContinuousIntegritySentinelDaemon({
    now: opts.now || FIXED_NOW,
    hash: opts.hash,
    intervalMs: opts.intervalMs != null ? opts.intervalMs : 0,
    freezeDriftObserver: opts.freezeDriftObserver,
    contractDriftMonitor: opts.contractDriftMonitor,
    fdirSentinel: opts.fdirSentinel,
    throwOnDeny: opts.throwOnDeny === true,
    ...opts
  });
}

function bnOwnedFiles() {
  return fs
    .readdirSync(MODULE_DIR)
    .filter(
      (f) =>
        f.endsWith('.js') &&
        (f.startsWith('sentinel-') || f.startsWith('continuous-'))
    );
}

// ── BN1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BN1: kind eos-continuous-integrity-sentinel-daemon and PRODUCTION_READY NO', () => {
  const d = makeDaemon();
  assert.equal(d.kind, BN_KIND);
  assert.equal(d.kind, 'eos-continuous-integrity-sentinel-daemon');
  assert.equal(d.PRODUCTION_READY, 'NO');
  assert.equal(BN_PRODUCTION_READY, 'NO');
  const health = d.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BN_KIND);
  assert.equal(health.datadogPrometheusK8sDaemonset, false);
  assert.equal(health.heavyApm, false);
  assert.equal(health.productionReadyYes, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.monitoringProduct, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'CLOSED');
  assert.equal(health.ladder19, 'CLOSED');
  assert.equal(health.ladder20, 'CLOSED');
  assert.equal(health.ladder21, 'OPEN');
  assert.equal(health.l17NeverReopen, true);
  assert.equal(health.l18NeverReopen, true);
  assert.equal(health.l19NeverReopen, true);
  assert.equal(health.l20NeverReopen, true);
  assert.equal(health.l20Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(
    health.axis,
    'Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric'
  );
  assert.equal(health.bmMeasured, true);
  assert.equal(health.bnInProgress, true);
  assert.equal(health.boPending, true);
  assert.equal(health.notFreezeDriftRewrite, true);
  assert.equal(health.notFdirRewrite, true);
  assert.equal(BN_RECEIPT_KIND, 'eos-sentinel-heartbeat-receipt');
  assert.equal(BN_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BN_POLICY_GATE_KIND, 'eos-sentinel-integrity-policy-gate');
});

// ── BN2: Happy pulse → sealed BN-RCPT-* ─────────────────────────────────────
test('BN2: happy pulseCheck → sealed BN-RCPT-* receipt', () => {
  const d = makeDaemon();
  const result = d.pulseCheck({
    targetManifestHash: sha256Canonical({ fixture: 'manifest-v1' })
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, BN_CODES.PULSE_OK);
  assert.ok(result.receipt.sealed);
  assert.ok(result.receipt.receiptId.startsWith('BN-RCPT-'));
  assert.match(result.receipt.receiptHash, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.integrityStatus, 'OK');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.hermetic, true);
  assert.equal(result.datadogPrometheusK8sDaemonset, false);
  assert.equal(result.monitoringProduct, false);
});

// ── BN3: Drift DENY / DRIFT_DETECTED ────────────────────────────────────────
test('BN3: drift → DENY DRIFT_DETECTED sealed receipt', () => {
  const d = makeDaemon();
  const r = d.pulseCheck({
    targetManifestHash: sha256Canonical({ m: 1 }),
    drift: true,
    anomaliesDetected: ['tip-drift']
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BN_CODES.DRIFT_DETECTED);
  assert.ok(r.receipt.sealed);
  assert.ok(r.receipt.receiptId.startsWith('BN-RCPT-'));
  assert.equal(r.receipt.integrityStatus, 'DRIFT_DETECTED');
  assert.ok(r.receipt.anomaliesDetected.includes('tip-drift'));
});

// ── BN4: Quarantine isolateDrift ────────────────────────────────────────────
test('BN4: isolateDrift quarantines; subsequent pulse QUARANTINED', () => {
  const d = makeDaemon();
  const iso = d.isolateDrift({
    reason: 'confirmed drift',
    anomaliesDetected: ['freeze-mismatch'],
    targetManifestHash: sha256Canonical({ m: 2 })
  });
  assert.equal(iso.isolateOk, true);
  assert.equal(iso.quarantined, true);
  assert.equal(iso.code, BN_CODES.QUARANTINED);
  assert.ok(iso.receipt.sealed);
  assert.equal(iso.receipt.integrityStatus, 'QUARANTINED');

  const next = d.pulseCheck({
    targetManifestHash: sha256Canonical({ m: 3 })
  });
  assert.equal(next.ok, false);
  assert.equal(next.code, BN_CODES.QUARANTINED);
  assert.equal(next.quarantined, true);
});

// ── BN5: start/stop no hanging timer leak ───────────────────────────────────
test('BN5: startHeartbeat / stopHeartbeat — no hanging timer leak', async () => {
  const d = makeDaemon({ intervalMs: 50 });
  const started = d.startHeartbeat({ intervalMs: 50 });
  assert.equal(started.ok, true);
  assert.equal(started.code, BN_CODES.HEARTBEAT_STARTED);
  assert.equal(started.running, true);
  assert.equal(d.getState().running, true);
  assert.equal(d.getState().hasTimer, true);

  // Allow one scheduled pulse
  await new Promise((r) => setTimeout(r, 120));
  assert.ok(d.getState().pulseCount >= 1);

  const stopped = d.stopHeartbeat();
  assert.equal(stopped.ok, true);
  assert.equal(stopped.code, BN_CODES.HEARTBEAT_STOPPED);
  assert.equal(stopped.running, false);
  assert.equal(d.getState().running, false);
  assert.equal(d.getState().hasTimer, false);

  const countAfterStop = d.getState().pulseCount;
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(
    d.getState().pulseCount,
    countAfterStop,
    'no pulses after stopHeartbeat'
  );
});

// ── BN6: Receipt chain prevReceiptHash ──────────────────────────────────────
test('BN6: receipt chain — prevReceiptHash links successive pulses', () => {
  const d = makeDaemon();
  const a = d.pulseCheck({
    targetManifestHash: sha256Canonical({ n: 1 })
  });
  const b = d.pulseCheck({
    targetManifestHash: sha256Canonical({ n: 2 })
  });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(b.receipt.prevReceiptHash, a.receipt.receiptHash);
  const trail = d.verifyReceiptTrail([a.receipt, b.receipt]);
  assert.equal(trail.ok, true);
  assert.equal(trail.code, BN_CODES.TRAIL_OK);
});

// ── BN7: Law VI MODULE_DIR CLEAN — BN-owned only ────────────────────────────
test('BN7: Law VI MODULE_DIR CLEAN — BN-owned sentinel/continuous files only', () => {
  assert.ok(fs.existsSync(MODULE_DIR), 'MODULE_DIR must exist');
  const bnFiles = bnOwnedFiles();
  assert.ok(bnFiles.length >= 3, 'expected ≥3 BN modules');

  const forbidden = [
    'sk' + '-' + 'ant' + '-',
    'sk' + '-' + 'proj' + '-',
    'AKIA',
    'ghp' + '_',
    'xoxb' + '-',
    'xoxp' + '-'
  ];

  for (const f of bnFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    for (const pat of forbidden) {
      assert.equal(
        text.includes(pat),
        false,
        `Law VI leak in ${f}: found ${pat}`
      );
    }
    assert.equal(
      /from\s+['"].*(?:freeze-drift|fdir|governance)\//.test(text),
      false,
      `${f} must not import sibling freeze-drift/fdir/governance/`
    );
    // Only native node:crypto|events|timers + relative ./ siblings
    assert.equal(
      /from\s+['"](?!node:(?:crypto|events|timers)|\.\/)[^'"]+['"]/.test(text),
      false,
      `${f} must not import non-native external runtime deps`
    );
  }
});

// ── BN8: Layer 0 purity ─────────────────────────────────────────────────────
test('BN8: Layer 0 purity — hermetic no-network / no fs writes', () => {
  for (const f of bnOwnedFiles()) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      /(?:import\s+.*from\s+['"]node:(?:net|http|https|child_process|fs)['"]|require\(\s*['"](?:net|http|https|child_process|fs)['"]|createServer\s*\(|\bfetch\s*\()/.test(
        text
      ),
      false,
      `${f} must stay hermetic (no network/http/fs/subprocess imports)`
    );
    assert.equal(
      /Documents[\\/]+Fundacion|writeFileSync\s*\(\s*['"]\//.test(text),
      false,
      `${f} must not write forbidden Fundacion paths`
    );
  }
});

// ── BN9: PRODUCTION_READY=NO + NON-CLAIM markers ────────────────────────────
test('BN9: PRODUCTION_READY=NO and NON-CLAIM markers present in BN modules', () => {
  let sawPrNo = false;
  let sawNonClaim = false;
  for (const f of bnOwnedFiles()) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    if (/PRODUCTION_READY:\s*NO|BN_PRODUCTION_READY\s*=\s*'NO'/.test(text)) {
      sawPrNo = true;
    }
    if (/NON-CLAIM|Datadog|Prometheus|K8s daemonset|monitoring product/i.test(text)) {
      sawNonClaim = true;
    }
  }
  assert.equal(sawPrNo, true);
  assert.equal(sawNonClaim, true);
});

// ── BN10: Fundacion ALWAYS_DENY ─────────────────────────────────────────────
test('BN10: Fundacion target ALWAYS_DENY on pulse and isolate', () => {
  const d = makeDaemon();
  const r = d.pulseCheck({
    targetManifestHash: sha256Canonical({ m: 1 }),
    fundacion: true
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BN_CODES.FUNDACION_ALWAYS_DENY);
  assert.equal(r.fundacionDelta, 0);
  assert.ok(r.receipt.sealed);

  const iso = d.isolateDrift({ fundacion: true, reason: 'nope' });
  assert.equal(iso.ok, false);
  assert.equal(iso.code, BN_CODES.FUNDACION_ALWAYS_DENY);
});

// ── BN11: DEGRADED fail-closed ──────────────────────────────────────────────
test('BN11: degraded → DENY DEGRADED', () => {
  const d = makeDaemon();
  const r = d.pulseCheck({
    targetManifestHash: sha256Canonical({ m: 1 }),
    degraded: true,
    anomaliesDetected: ['sensor-degraded']
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BN_CODES.DEGRADED);
  assert.equal(r.receipt.integrityStatus, 'DEGRADED');
});

// ── BN12: L17–L20 never-reopen markers ──────────────────────────────────────
test('BN12: L17–L20 CLOSED never reopen; L21 OPEN markers', () => {
  const d = makeDaemon();
  const h = d.health();
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  assert.equal(h.l19NeverReopen, true);
  assert.equal(h.l20NeverReopen, true);
  assert.equal(h.ladder21, 'OPEN');

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'continuous-integrity-sentinel-daemon.js'),
    'utf8'
  );
  assert.match(facade, /L17 CLOSED never reopen/);
  assert.match(facade, /L18 CLOSED never reopen/);
  assert.match(facade, /L19 CLOSED never reopen/);
  assert.match(facade, /L20 CLOSED never reopen/);
  assert.match(facade, /L21 OPEN/);
  assert.match(
    facade,
    /Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric/
  );
  assert.match(facade, /DO NOT rewrite src\/core\/freeze-drift/);
});

// ── BN13: Deterministic receipt hash + getState ─────────────────────────────
test('BN13: deterministic receipt hash + getState counters', () => {
  _resetReceiptSeqForTests();
  const body = {
    ok: true,
    integrityStatus: 'OK',
    pulseIndex: 1,
    targetManifestHash: sha256Canonical('m'),
    anomaliesDetected: [],
    timestamp: '2026-09-14T22:00:00.000Z',
    prevReceiptHash: null,
    receiptId: 'BN-RCPT-fixed0001'
  };
  const a = buildHeartbeatReceipt(body, {
    now: FIXED_NOW,
    hash: sha256Canonical
  });
  _resetReceiptSeqForTests();
  const b = buildHeartbeatReceipt(body, {
    now: FIXED_NOW,
    hash: sha256Canonical
  });
  assert.equal(a.receiptHash, b.receiptHash);
  assert.equal(
    hashHeartbeatReceipt(canonicalHeartbeatSealBody(a)),
    a.receiptHash
  );
  assert.equal(stableStringify({ z: 1, a: 2 }), stableStringify({ a: 2, z: 1 }));

  const d = makeDaemon();
  d.pulseCheck({ targetManifestHash: sha256Canonical({ ok: 1 }) });
  d.pulseCheck({ drift: true, anomaliesDetected: ['x'] });
  const st = d.getState();
  assert.equal(st.kind, BN_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.ok(st.pulseCount >= 2);
  assert.ok(st.okCount >= 1);
  assert.ok(st.denyCount >= 1);
  assert.ok(st.historyCount >= 2);
});

// ── BN14: Injectable ports compose without sibling rewrite ──────────────────
test('BN14: injectable freezeDrift / contractDrift / fdir ports compose', () => {
  const d = makeDaemon({
    freezeDriftObserver: {
      observe: () => ({ drift: true, anomalies: ['freeze-port'] })
    },
    contractDriftMonitor: {
      check: () => ({ drift: false })
    },
    fdirSentinel: {
      pulse: () => ({ ok: true })
    }
  });
  const r = d.pulseCheck({
    targetManifestHash: sha256Canonical({ m: 9 })
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BN_CODES.DRIFT_DETECTED);
  assert.ok(
    r.receipt.anomaliesDetected.includes('freeze-drift') ||
      r.receipt.anomaliesDetected.includes('freeze-port')
  );
  const st = d.getState();
  assert.equal(st.ports.freezeDriftObserver, true);
  assert.equal(st.ports.contractDriftMonitor, true);
  assert.equal(st.ports.fdirSentinel, true);
});

// ── BN15: Trail break / tamper detection ────────────────────────────────────
test('BN15: verifyReceiptTrail detects tamper and chain break', () => {
  const d = makeDaemon();
  const a1 = d.pulseCheck({
    targetManifestHash: sha256Canonical({ t: 1 })
  });
  const a2 = d.pulseCheck({
    targetManifestHash: sha256Canonical({ t: 2 })
  });
  assert.equal(d.verifyReceiptTrail([a1.receipt, a2.receipt]).ok, true);

  const forged = { ...a2.receipt, integrityStatus: 'HACKED' };
  const trailBad = d.verifyReceiptTrail([a1.receipt, forged]);
  assert.equal(trailBad.ok, false);
  assert.equal(trailBad.code, BN_CODES.TRAIL_BREAK);

  const orphan = buildHeartbeatReceipt(
    {
      ok: true,
      integrityStatus: 'OK',
      pulseIndex: 99,
      targetManifestHash: sha256Canonical('x'),
      anomaliesDetected: [],
      timestamp: FIXED_NOW(),
      prevReceiptHash: 'not-the-previous-hash',
      receiptId: 'BN-RCPT-orphan0001'
    },
    { now: FIXED_NOW, hash: sha256Canonical }
  );
  const chainBreak = d.verifyReceiptTrail([a1.receipt, orphan]);
  assert.equal(chainBreak.ok, false);
  assert.equal(chainBreak.code, BN_CODES.TRAIL_BREAK);

  const v = verifyHeartbeatReceipt(forged);
  assert.equal(v.ok, false);
  assert.match(v.reason, /tamper|mismatch/i);
});

// ── BN16: NON-CLAIM + intervalMs=0 manual-only + isolate clears timer ────────
test('BN16: NON-CLAIM honesty; intervalMs=0 manual; isolate clears timer', async () => {
  const d = makeDaemon({ intervalMs: 0 });
  const started = d.startHeartbeat({ intervalMs: 0 });
  assert.equal(started.running, true);
  assert.equal(started.intervalMs, 0);
  assert.equal(d.getState().hasTimer, false, 'intervalMs=0 must not set timer');

  d.pulseCheck({ targetManifestHash: sha256Canonical({ m: 1 }) });
  const before = d.getState().pulseCount;

  // start with timer then isolate must clear
  d.startHeartbeat({ intervalMs: 40 });
  assert.equal(d.getState().hasTimer, true);
  d.isolateDrift({ reason: 'auto-clear' });
  assert.equal(d.getState().hasTimer, false);
  assert.equal(d.getState().running, false);

  await new Promise((r) => setTimeout(r, 100));
  assert.ok(d.getState().pulseCount >= before);

  // NON-CLAIM on health
  const h = d.health();
  assert.equal(h.datadogPrometheusK8sDaemonset, false);
  assert.equal(h.heavyApm, false);
  assert.equal(h.monitoringProduct, false);
  assert.equal(h.productionReadyYes, false);
  assert.equal(h.cloudAgent, false);
});
