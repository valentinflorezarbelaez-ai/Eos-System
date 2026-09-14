/**
 * @file eos-bj-operator-dashboard-hud-fabric.test.js
 * @description SPEC-0067 / Mission BJ — Operator Dashboard / HUD Fabric.
 * Hermetic TDD (~16):
 * kind + PRODUCTION_READY NO; happy-path snapshot freeze/matrix/evidence/replay
 * + sealed receipt; degraded when provider throws or reports drift; receipt
 * sealing SHA-256 + deterministic chaining BJ-RCPT-*; pure text/ANSI summary;
 * no network / no forbidden path writes (Fundacion DENY); Law VI MODULE_DIR
 * CLEAN (BJ-owned operator-dashboard-* only; siblings allowed); NON-CLAIM;
 * PR=NO; L17/L18/L19 never-reopen; empty/malformed DENY; getState;
 * BH+BI MEASURED / not BK–BL; deterministic hash.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: fabric ≠ observability SaaS (Grafana/Datadog/Prometheus) /
 * ≠ external web GUI/HTTP server / ≠ PRODUCTION_READY=YES;
 * BH+BI MEASURED acknowledged; not BK–BL; Fundacion Δ=0;
 * BJ_PRODUCTION_READY=NO; Antigravity-first; L17/L18/L19 CLOSED never reopen;
 * L20 OPEN (BH+BI MEASURED; BJ in progress; BK–BL pending);
 * Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI / CRITICAL: scan ONLY BJ-owned operator-dashboard-* files under
 * MODULE_DIR = src/core/observability. ALLOW pre-existing siblings
 * (lesson from BI/AT coexist). Do NOT scan the whole tests/ directory.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BJ_PRODUCTION_READY,
  BJ_KIND,
  BJ_CODES,
  BJ_HEALTH,
  BJ_RECEIPT_KIND,
  BJ_RECEIPT_PRODUCTION_READY,
  BJ_POLICY_GATE_KIND,
  createOperatorDashboardHudFabric,
  stableStringify,
  sha256Canonical,
  buildDashboardReceipt,
  verifyDashboardReceipt,
  hashDashboardReceipt,
  canonicalDashboardSealBody,
  _resetReceiptSeqForTests
} from '../src/core/observability/operator-dashboard-hud-fabric.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR — scan BJ-owned operator-dashboard-* only */
const MODULE_DIR = path.join(ROOT, 'src/core/observability');

const FIXED_NOW = () => '2026-09-14T19:30:00.000Z';

function makeFabric(opts = {}) {
  _resetReceiptSeqForTests();
  return createOperatorDashboardHudFabric({
    now: opts.now || FIXED_NOW,
    hash: opts.hash,
    ports: opts.ports,
    throwOnDeny: opts.throwOnDeny === true,
    maxAgeMs: opts.maxAgeMs,
    ...opts
  });
}

function okProvider(score = 1) {
  return () => ({ ok: true, health: 'OK', score, drift: false });
}

// ── BJ1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BJ1: kind eos-operator-dashboard-hud-fabric and PRODUCTION_READY NO', () => {
  const fab = makeFabric();
  assert.equal(fab.kind, BJ_KIND);
  assert.equal(fab.kind, 'eos-operator-dashboard-hud-fabric');
  assert.equal(fab.PRODUCTION_READY, 'NO');
  assert.equal(BJ_PRODUCTION_READY, 'NO');
  const health = fab.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BJ_KIND);
  assert.equal(health.observabilitySaas, false);
  assert.equal(health.grafanaDatadogPrometheus, false);
  assert.equal(health.externalWebGui, false);
  assert.equal(health.httpServer, false);
  assert.equal(health.productionReadyYes, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'CLOSED');
  assert.equal(health.ladder19, 'CLOSED');
  assert.equal(health.ladder20, 'OPEN');
  assert.equal(health.l17NeverReopen, true);
  assert.equal(health.l18NeverReopen, true);
  assert.equal(health.l19NeverReopen, true);
  assert.equal(health.l17Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.l18Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.l19Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.axis, 'Sovereign Mission Continuity & Operator Fabric');
  assert.equal(health.bhMeasured, true);
  assert.equal(health.biMeasured, true);
  assert.equal(health.bjInProgress, true);
  assert.equal(health.bkPending, true);
  assert.equal(health.blPending, true);
  assert.equal(health.notBk, true);
  assert.equal(health.notBl, true);
  assert.equal(BJ_RECEIPT_KIND, 'eos-operator-dashboard-receipt');
  assert.equal(BJ_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BJ_POLICY_GATE_KIND, 'eos-operator-dashboard-policy-gate');
  assert.equal(BJ_HEALTH.OK, 'OK');
  assert.equal(BJ_HEALTH.DEGRADED, 'DEGRADED');
  assert.equal(BJ_HEALTH.FAIL, 'FAIL');
});

// ── BJ2: Happy-path snapshot combining freeze/matrix/evidence/replay ─────────
test('BJ2: happy-path snapshot combining freeze/matrix/evidence/replay + sealed receipt', () => {
  const fab = makeFabric();
  assert.equal(fab.registerSurface('freeze', okProvider(1)).ok, true);
  assert.equal(fab.registerSurface('matrix', okProvider(1)).ok, true);
  assert.equal(fab.registerSurface('evidence', okProvider(1)).ok, true);
  assert.equal(fab.registerSurface('replay', okProvider(1)).ok, true);

  const snap = fab.generateSnapshot({});
  assert.equal(snap.ok, true);
  assert.equal(snap.code, BJ_CODES.SNAPSHOT_OK);
  assert.equal(snap.overallHealth, BJ_HEALTH.OK);
  assert.equal(snap.surfaceCount, 4);
  assert.ok(snap.surfaceScores.freeze);
  assert.ok(snap.surfaceScores.matrix);
  assert.ok(snap.surfaceScores.evidence);
  assert.ok(snap.surfaceScores.replay);
  assert.equal(snap.surfaceScores.freeze.health, 'OK');
  assert.ok(snap.receipt.sealed);
  assert.ok(snap.receipt.receiptId.startsWith('BJ-RCPT-'));
  assert.match(snap.receipt.receiptHash, /^[a-f0-9]{64}$/);
  assert.equal(snap.receipt.overallHealth, 'OK');
  assert.equal(snap.PRODUCTION_READY, 'NO');
  assert.equal(snap.fundacionDelta, 0);
  assert.equal(snap.hermetic, true);
});

// ── BJ3: Degraded when provider throws or reports drift ──────────────────────
test('BJ3: degraded when provider throws or reports drift', () => {
  const fab = makeFabric();
  fab.registerSurface('freeze', okProvider(1));
  fab.registerSurface('matrix', () => {
    throw new Error('matrix boom');
  });
  fab.registerSurface('evidence', () => ({
    ok: true,
    health: 'DEGRADED',
    score: 0.4,
    drift: true,
    reason: 'evidence drift'
  }));
  fab.registerSurface('replay', okProvider(1));

  const snap = fab.generateSnapshot({});
  assert.equal(snap.ok, false);
  assert.equal(snap.overallHealth, BJ_HEALTH.DEGRADED);
  assert.equal(snap.code, BJ_CODES.SNAPSHOT_DEGRADED);
  assert.equal(snap.surfaceScores.matrix.health, 'DEGRADED');
  assert.match(snap.surfaceScores.matrix.reason, /matrix boom/);
  assert.equal(snap.surfaceScores.evidence.health, 'DEGRADED');
  assert.ok(snap.receipt.sealed);
  assert.equal(snap.receipt.status, 'DEGRADED');
  assert.ok(snap.receipt.receiptId.startsWith('BJ-RCPT-'));
  assert.equal(snap.PRODUCTION_READY, 'NO');
  assert.equal(snap.fundacionDelta, 0);
});

// ── BJ4: Receipt sealing SHA-256 + deterministic chaining BJ-RCPT-* ──────────
test('BJ4: receipt sealing SHA-256 + deterministic chaining BJ-RCPT-*', () => {
  const fab = makeFabric();
  fab.registerSurface('freeze', okProvider(1));
  fab.registerSurface('matrix', okProvider(1));

  const s1 = fab.generateSnapshot({});
  assert.ok(s1.receipt.receiptId.startsWith('BJ-RCPT-'));
  assert.match(s1.receipt.receiptHash, /^[a-f0-9]{64}$/);
  const v1 = verifyDashboardReceipt(s1.receipt);
  assert.equal(v1.ok, true);

  const s2 = fab.generateSnapshot({
    prevReceiptHash: s1.receipt.receiptHash
  });
  assert.equal(s2.receipt.prevReceiptHash, s1.receipt.receiptHash);
  assert.ok(s2.receipt.receiptId.startsWith('BJ-RCPT-'));
  assert.notEqual(s2.receipt.receiptHash, s1.receipt.receiptHash);

  // Tamper detection
  const forged = { ...s1.receipt, overallHealth: 'HACKED' };
  const v2 = verifyDashboardReceipt(forged);
  assert.equal(v2.ok, false);
  assert.match(v2.reason, /tamper|mismatch/i);

  // Auto-chain when prev omitted
  const s3 = fab.generateSnapshot({});
  assert.equal(s3.receipt.prevReceiptHash, s2.receipt.receiptHash);
});

// ── BJ5: Pure text/ANSI summary formatting ───────────────────────────────────
test('BJ5: pure text/ANSI summary formatting', () => {
  const fab = makeFabric();
  fab.registerSurface('freeze', okProvider(1));
  fab.registerSurface('evidence', okProvider(0.9));
  const snap = fab.generateSnapshot({});
  const text = fab.renderTextSummary(snap);
  assert.equal(typeof text, 'string');
  assert.match(text, /EOS Operator Dashboard/);
  assert.match(text, /BJ-RCPT-/);
  assert.match(text, /overall:/);
  assert.match(text, /freeze/);
  assert.match(text, /evidence/);
  assert.match(text, /\[BJ-HUD\]/);
  assert.match(text, /NON-CLAIM/);
  // Contains ANSI escape or at least ASCII fallback
  assert.ok(
    text.includes('\u001b[') || text.includes('[BJ-HUD]'),
    'expected ANSI or ASCII summary markers'
  );
  // No display deps — function is pure
  const empty = fab.renderTextSummary(null);
  assert.match(empty, /no snapshot/);
});

// ── BJ6: No network / no forbidden path writes (Fundacion DENY) ──────────────
test('BJ6: no network / no forbidden path writes (Fundacion DENY)', () => {
  const fab = makeFabric();
  const r = fab.registerSurface('freeze', okProvider(1), { fundacion: true });
  assert.equal(r.ok, false);
  assert.equal(r.code, BJ_CODES.FUNDACION_DENY);
  assert.ok(r.receipt.sealed);
  assert.equal(r.fundacionDelta, 0);

  fab.registerSurface('freeze', okProvider(1));
  const s = fab.generateSnapshot({ writeFundacion: true });
  assert.equal(s.ok, false);
  assert.equal(s.code, BJ_CODES.FUNDACION_DENY);
  assert.ok(s.receipt.sealed);
  assert.equal(s.fundacionDelta, 0);

  // Sources stay hermetic — no network / child_process / http
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.startsWith('operator-dashboard-') && f.endsWith('.js'));
  for (const f of files) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    // Detect real imports/calls — not prose bans in header comments.
    assert.equal(
      /(?:import\s+.*from\s+['"]node:(?:net|http|https|child_process)['"]|require\(\s*['"](?:net|http|https|child_process)['"]|createServer\s*\(|\bfetch\s*\()/.test(
        text
      ),
      false,
      `${f} must stay hermetic (no network/http/subprocess imports)`
    );
    assert.equal(
      /Documents[\\/]+Fundacion|writeFileSync\s*\(\s*['"]\//.test(text),
      false,
      `${f} must not write forbidden Fundacion paths`
    );
  }
});

// ── BJ7: Law VI MODULE_DIR CLEAN — BJ-owned operator-dashboard-* only ────────
test('BJ7: Law VI MODULE_DIR CLEAN — BJ-owned operator-dashboard-* files only', () => {
  assert.ok(fs.existsSync(MODULE_DIR), 'MODULE_DIR must exist');
  const allJs = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith('.js'));
  const bjFiles = allJs.filter((f) => f.startsWith('operator-dashboard-'));
  assert.ok(bjFiles.length >= 3, 'expected ≥3 BJ operator-dashboard-* modules');

  // Forbidden contiguous provider-prefix patterns (Law VI).
  // Split construction so this test file itself does not embed them.
  const forbidden = [
    'sk' + '-' + 'ant' + '-',
    'sk' + '-' + 'proj' + '-',
    'AKIA',
    'ghp' + '_',
    'xoxb' + '-',
    'xoxp' + '-'
  ];

  for (const f of bjFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    for (const pat of forbidden) {
      assert.equal(
        text.includes(pat),
        false,
        `Law VI leak in ${f}: found ${pat}`
      );
    }
    // No delivery/ or mission/ imports — Layer 0 observability only
    assert.equal(
      /from\s+['"].*delivery\//.test(text),
      false,
      `${f} must not import delivery/`
    );
    assert.equal(
      /from\s+['"].*\/mission\//.test(text),
      false,
      `${f} must not import mission/`
    );
    assert.match(f, /^operator-dashboard-/);
  }

  // Pre-existing siblings in observability/ MAY coexist (BI/AT lesson).
  // We do NOT require exclusive dir ownership — only BJ-owned files scanned.
  // Simulate a sibling file presence check: if any non-BJ sibling exists, OK.
  const siblings = allJs.filter((f) => !f.startsWith('operator-dashboard-'));
  // In payload-only box, siblings may be absent; either way is fine.
  assert.ok(Array.isArray(siblings));
});

// ── BJ8: PRODUCTION_READY=NO + NON-CLAIM strings on modules ──────────────────
test('BJ8: PRODUCTION_READY=NO and NON-CLAIM markers present in BJ modules', () => {
  const bjFiles = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.startsWith('operator-dashboard-') && f.endsWith('.js'));
  let sawPrNo = false;
  let sawNonClaim = false;
  let sawGrafana = false;
  let sawHttp = false;
  for (const f of bjFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    if (/PRODUCTION_READY:\s*NO|PRODUCTION_READY\s*=\s*['"]NO['"]/.test(text)) {
      sawPrNo = true;
    }
    if (/NON-CLAIM/.test(text)) sawNonClaim = true;
    if (/Grafana|grafanaDatadogPrometheus|observability SaaS/.test(text)) {
      sawGrafana = true;
    }
    if (/external web GUI|httpServer|HTTP server/.test(text)) {
      sawHttp = true;
    }
  }
  assert.equal(sawPrNo, true);
  assert.equal(sawNonClaim, true);
  assert.equal(sawGrafana, true);
  assert.equal(sawHttp, true);
  assert.equal(BJ_PRODUCTION_READY, 'NO');
});

// ── BJ9: L17/L18/L19 never-reopen markers ────────────────────────────────────
test('BJ9: L17/L18/L19 CLOSED never-reopen markers on health + sources', () => {
  const fab = makeFabric();
  const h = fab.health();
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  assert.equal(h.l19NeverReopen, true);
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.ladder19, 'CLOSED');
  assert.equal(h.ladder20, 'OPEN');
  assert.equal(h.bhMeasured, true);
  assert.equal(h.biMeasured, true);
  assert.equal(h.bjInProgress, true);

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'operator-dashboard-hud-fabric.js'),
    'utf8'
  );
  assert.match(facade, /L17 CLOSED never reopen/);
  assert.match(facade, /L18 CLOSED never reopen/);
  assert.match(facade, /L19 CLOSED never reopen/);
  assert.match(facade, /L20 OPEN/);
  assert.match(facade, /Sovereign Mission Continuity & Operator Fabric/);
  assert.match(facade, /BH\+BI MEASURED|BH\+BI MEASURED acknowledged/);
});

// ── BJ10: Empty / malformed DENY ─────────────────────────────────────────────
test('BJ10: empty surfaceId and malformed payload DENY', () => {
  const fab = makeFabric();
  const empty = fab.registerSurface('', okProvider(1));
  assert.equal(empty.ok, false);
  assert.equal(empty.code, BJ_CODES.EMPTY_SURFACE_ID);
  assert.ok(empty.receipt.sealed);

  const badFn = fab.registerSurface('freeze', null);
  assert.equal(badFn.ok, false);
  assert.equal(badFn.code, BJ_CODES.MALFORMED_PAYLOAD);

  // Snapshot with no surfaces → MISSING_SURFACE
  const fab2 = makeFabric();
  const noSurf = fab2.generateSnapshot({});
  assert.equal(noSurf.ok, false);
  assert.equal(noSurf.code, BJ_CODES.MISSING_SURFACE);
  assert.ok(noSurf.receipt.sealed);

  const forced = fab2.generateSnapshot({ forceMalformed: true });
  assert.equal(forced.ok, false);
  assert.equal(forced.code, BJ_CODES.MALFORMED_PAYLOAD);
});

// ── BJ11: Deterministic hash ─────────────────────────────────────────────────
test('BJ11: deterministic receipt hash for identical inputs', () => {
  _resetReceiptSeqForTests();
  const a = buildDashboardReceipt(
    {
      ok: true,
      code: 'SNAPSHOT_OK',
      overallHealth: 'OK',
      surfaceScores: {
        freeze: { health: 'OK', score: 1, reason: null }
      },
      surfaceCount: 1,
      status: 'OK',
      prevReceiptHash: null
    },
    { now: FIXED_NOW }
  );
  _resetReceiptSeqForTests();
  const b = buildDashboardReceipt(
    {
      ok: true,
      code: 'SNAPSHOT_OK',
      overallHealth: 'OK',
      surfaceScores: {
        freeze: { health: 'OK', score: 1, reason: null }
      },
      surfaceCount: 1,
      status: 'OK',
      prevReceiptHash: null
    },
    { now: FIXED_NOW }
  );
  assert.equal(a.receiptHash, b.receiptHash);
  assert.equal(a.receiptId, b.receiptId);
  assert.equal(
    stableStringify({ b: 2, a: 1 }),
    stableStringify({ a: 1, b: 2 })
  );
  assert.equal(sha256Canonical({ a: 1 }), sha256Canonical({ a: 1 }));
  assert.equal(typeof a.receiptHash, 'string');
  assert.equal(a.receiptHash.length, 64);

  const recomputed = hashDashboardReceipt(canonicalDashboardSealBody(a));
  assert.equal(recomputed, a.receiptHash);
});

// ── BJ12: getState counters ──────────────────────────────────────────────────
test('BJ12: getState counters after register/snapshot/deny', () => {
  const fab = makeFabric();
  fab.registerSurface('freeze', okProvider(1));
  fab.registerSurface('matrix', () => ({
    ok: false,
    health: 'FAIL',
    mismatched: true,
    reason: 'integrity fail'
  }));
  fab.generateSnapshot({});
  fab.generateSnapshot({ fundacion: true });
  const st = fab.getState();
  assert.equal(st.kind, BJ_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.registerCount, 2);
  assert.equal(st.snapshotCount, 2);
  assert.ok(st.failCount >= 1 || st.denyCount >= 1);
  assert.equal(st.surfaceCount, 2);
  assert.ok(st.historyCount >= 2);
  assert.deepEqual(st.surfaces, ['freeze', 'matrix']);
});

// ── BJ13: BH+BI MEASURED / not BK–BL ─────────────────────────────────────────
test('BJ13: BH+BI MEASURED acknowledged; not BK–BL; L20 OPEN', () => {
  const fab = makeFabric();
  const h = fab.health();
  assert.equal(h.bhMeasured, true);
  assert.equal(h.biMeasured, true);
  assert.equal(h.bhAcknowledged, true);
  assert.equal(h.biAcknowledged, true);
  assert.equal(h.bjInProgress, true);
  assert.equal(h.bkPending, true);
  assert.equal(h.blPending, true);
  assert.equal(h.notBk, true);
  assert.equal(h.notBl, true);
  assert.equal(h.ladder20, 'OPEN');

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'operator-dashboard-hud-fabric.js'),
    'utf8'
  );
  assert.match(facade, /BH\+BI MEASURED/);
  assert.match(facade, /BK–BL pending|not BK–BL|bkPending/);
});

// ── BJ14: Composition with AV/AJ/BF/BE/HUD mocks via ports ───────────────────
test('BJ14: composition with AV/AJ/BF/BE/HUD mocks called via ports', () => {
  const calls = [];
  const ports = {
    avFreezeDrift: (arg) => {
      calls.push(['avFreezeDrift', arg.op]);
      return { ok: true };
    },
    ajEvidence: (arg) => {
      calls.push(['ajEvidence', arg.op]);
      return { ok: true };
    },
    bfPackaging: (arg) => {
      calls.push(['bfPackaging', arg.op]);
      return { ok: true };
    },
    beReplay: (arg) => {
      calls.push(['beReplay', arg.op]);
      return { ok: true };
    },
    hud: (arg) => {
      calls.push(['hud', arg.op]);
      return { ok: true };
    }
  };
  const fab = makeFabric({ ports });
  fab.registerSurface('freeze', okProvider(1));
  fab.registerSurface('matrix', okProvider(1));
  fab.registerSurface('evidence', okProvider(1));
  fab.registerSurface('replay', okProvider(1));
  const snap = fab.generateSnapshot({ ports });
  assert.equal(snap.ok, true);
  assert.ok(calls.some(([n, op]) => n === 'avFreezeDrift' && op === 'snapshot'));
  assert.ok(calls.some(([n]) => n === 'ajEvidence'));
  assert.ok(calls.some(([n]) => n === 'bfPackaging'));
  assert.ok(calls.some(([n]) => n === 'beReplay'));
  assert.ok(calls.some(([n]) => n === 'hud'));
});

// ── BJ15: Mismatched / FAIL surface → overall FAIL + sealed receipt ──────────
test('BJ15: mismatched surface → overall FAIL + sealed diagnostic receipt', () => {
  const fab = makeFabric();
  fab.registerSurface('freeze', okProvider(1));
  fab.registerSurface('matrix', () => ({
    ok: false,
    health: 'FAIL',
    mismatched: true,
    integrity: false,
    reason: 'matrix integrity mismatch'
  }));
  const snap = fab.generateSnapshot({});
  assert.equal(snap.ok, false);
  assert.equal(snap.overallHealth, BJ_HEALTH.FAIL);
  assert.equal(snap.code, BJ_CODES.SNAPSHOT_FAIL);
  assert.equal(snap.surfaceScores.matrix.health, 'FAIL');
  assert.equal(snap.surfaceScores.matrix.code, BJ_CODES.MISMATCHED_SURFACE);
  assert.ok(snap.receipt.sealed);
  assert.equal(snap.receipt.status, 'FAIL');
  assert.ok(snap.receipt.receiptId.startsWith('BJ-RCPT-'));
  assert.equal(snap.PRODUCTION_READY, 'NO');
});

// ── BJ16: listSurfaces / getHistory / codes frozen ───────────────────────────
test('BJ16: listSurfaces getHistory getLastSnapshot; BJ_CODES frozen', () => {
  const fab = makeFabric();
  fab.registerSurface('replay', okProvider(1));
  fab.registerSurface('freeze', okProvider(1));
  assert.deepEqual(fab.listSurfaces(), ['freeze', 'replay']);
  const snap = fab.generateSnapshot({});
  assert.equal(fab.getLastReceiptHash(), snap.receipt.receiptHash);
  assert.ok(fab.getLastSnapshot());
  assert.equal(fab.getHistory().length, 1);
  assert.equal(fab.getHistory()[0].status, 'OK');
  assert.equal(BJ_CODES.SNAPSHOT_OK, 'SNAPSHOT_OK');
  assert.equal(BJ_CODES.SNAPSHOT_DEGRADED, 'SNAPSHOT_DEGRADED');
  assert.equal(BJ_CODES.SNAPSHOT_FAIL, 'SNAPSHOT_FAIL');
  assert.throws(() => {
    // @ts-ignore
    BJ_CODES.SNAPSHOT_OK = 'HACKED';
  });
  assert.throws(() => {
    // @ts-ignore
    BJ_HEALTH.OK = 'HACKED';
  });
});
