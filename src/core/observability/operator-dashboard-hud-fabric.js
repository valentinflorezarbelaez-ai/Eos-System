/**
 * @module operator-dashboard-hud-fabric
 * SPEC-0067 / Mission BJ — Operator Dashboard / HUD Fabric.
 *
 * Facade: createOperatorDashboardHudFabric({ now, hash, ports })
 *   .registerSurface(surfaceId, providerFn)
 *   .generateSnapshot({ prevReceiptHash, ports }) — evaluate registered
 *     surfaces (freeze, matrix, evidence, replay); aggregate health
 *     OK/DEGRADED/FAIL; seal receipt
 *   .renderTextSummary(snapshot) — pure terminal-safe ASCII/ANSI string
 *
 * Injectable ports stubs (compose AV/AJ/BF/BE + existing HUD — DO NOT rewrite):
 *   ports.avFreezeDrift, ports.ajEvidence, ports.bfPackaging,
 *   ports.beReplay, ports.hud (optional)
 *
 * Fail-closed: stale/missing/mismatched surface → DEGRADED/FAIL + sealed
 * diagnostic receipt.
 * Zero external runtime deps except native node:crypto (via receipt module).
 * NO CloudAgent / NO network / NO real fs writes outside in-memory /
 * NO subprocess spawning / NO HTTP server.
 * Hermetic: in-memory only.
 *
 * NON-CLAIM:
 *   fabric ≠ observability SaaS (Grafana/Datadog/Prometheus) /
 *   ≠ external web GUI/HTTP server /
 *   ≠ PRODUCTION_READY=YES
 *   BH+BI MEASURED acknowledged; not BK–BL; Fundacion Δ=0; Antigravity-first.
 *   L17 CLOSED never reopen; L18 CLOSED never reopen; L19 CLOSED never reopen;
 *   L20 OPEN (BH+BI MEASURED; BJ in progress; BK–BL pending);
 *   Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/observability — BJ owns operator-dashboard-* only;
 * pre-existing siblings (operator-hud, terminal-hud-engine, etc.) may coexist.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BJ_CEILING
 */

import {
  BJ_PRODUCTION_READY as BJ_RECEIPT_PR,
  BJ_RECEIPT_KIND,
  BJ_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalDashboardSealBody,
  hashDashboardReceipt,
  verifyDashboardReceipt,
  buildDashboardReceipt,
  _resetReceiptSeqForTests
} from './operator-dashboard-receipt.js';

import {
  BJ_POLICY_GATE_KIND,
  BJ_POLICY_GATE_PRODUCTION_READY,
  BJ_HEALTH,
  BJ_POLICY_CODES,
  deny,
  denyMalformed,
  denyEmptySurfaceId,
  denyMissingSurface,
  denyStaleSurface,
  denyMismatchedSurface,
  denyProviderThrow,
  denyFundacion,
  denyPolicy,
  gateRegister,
  gateSnapshot,
  evaluateSurfaceReport,
  aggregateOverallHealth,
  createOperatorDashboardPolicyGate
} from './operator-dashboard-policy-gate.js';

/** @type {'NO'} */
export const BJ_PRODUCTION_READY = 'NO';

export const BJ_KIND = 'eos-operator-dashboard-hud-fabric';

export const BJ_CODES = Object.freeze({
  ...BJ_POLICY_CODES,
  SNAPSHOT_OK: 'SNAPSHOT_OK',
  SNAPSHOT_DEGRADED: 'SNAPSHOT_DEGRADED',
  SNAPSHOT_FAIL: 'SNAPSHOT_FAIL'
});

export {
  BJ_HEALTH,
  BJ_POLICY_CODES,
  BJ_POLICY_GATE_KIND,
  BJ_POLICY_GATE_PRODUCTION_READY,
  BJ_RECEIPT_KIND,
  BJ_RECEIPT_PRODUCTION_READY,
  BJ_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalDashboardSealBody,
  hashDashboardReceipt,
  verifyDashboardReceipt,
  buildDashboardReceipt,
  deny,
  denyMalformed,
  denyEmptySurfaceId,
  denyMissingSurface,
  denyStaleSurface,
  denyMismatchedSurface,
  denyProviderThrow,
  denyFundacion,
  denyPolicy,
  gateRegister,
  gateSnapshot,
  evaluateSurfaceReport,
  aggregateOverallHealth,
  createOperatorDashboardPolicyGate,
  _resetReceiptSeqForTests
};

/** ANSI helpers (pure strings — no display deps). */
const ANSI = Object.freeze({
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  cyan: '\u001b[36m',
  dim: '\u001b[2m'
});

/**
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.ports]
 * @param {boolean} [opts.throwOnDeny]
 * @param {number} [opts.maxAgeMs]
 * @returns {object}
 */
export function createOperatorDashboardHudFabric(opts = {}) {
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const throwOnDeny = opts.throwOnDeny === true;
  const defaultPorts =
    opts.ports != null && typeof opts.ports === 'object' ? opts.ports : {};
  const maxAgeMs =
    typeof opts.maxAgeMs === 'number' ? opts.maxAgeMs : null;

  /** @type {Map<string, Function>} surfaceId → providerFn */
  const surfaces = new Map();
  /** @type {object[]} sealed snapshot receipts */
  const history = [];
  /** @type {string|null} */
  let lastReceiptHash = null;
  /** @type {object|null} */
  let lastSnapshot = null;

  let registerCount = 0;
  let snapshotCount = 0;
  let okCount = 0;
  let degradedCount = 0;
  let failCount = 0;
  let denyCount = 0;

  const gate = createOperatorDashboardPolicyGate({ maxAgeMs });

  /**
   * Call optional injectable port if present (happy-path composition).
   * @param {object} ports
   * @param {string} name
   * @param {unknown} arg
   */
  function callPort(ports, name, arg) {
    const p = ports && ports[name];
    if (typeof p === 'function') {
      try {
        return p(arg);
      } catch {
        return undefined;
      }
    }
    if (p != null && typeof p === 'object') {
      const method =
        typeof p.invoke === 'function'
          ? p.invoke
          : typeof p.call === 'function'
            ? p.call
            : typeof p.notify === 'function'
              ? p.notify
              : typeof p.getReport === 'function'
                ? p.getReport
                : null;
      if (method) {
        try {
          return method.call(p, arg);
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  }

  /**
   * @param {object} decision
   * @param {object} fields
   * @returns {object}
   */
  function sealDeny(decision, fields) {
    denyCount += 1;
    const receipt = buildDashboardReceipt(
      {
        ok: false,
        deny: true,
        denied: true,
        code: decision.code,
        status: 'DENY',
        overallHealth: BJ_HEALTH.FAIL,
        surfaceScores: fields.surfaceScores || {},
        surfaceCount: fields.surfaceCount != null ? fields.surfaceCount : 0,
        prevReceiptHash: fields.prevReceiptHash ?? lastReceiptHash,
        reason: decision.reason
      },
      { now: nowFn, hash: hashFn }
    );

    history.push(receipt);
    lastReceiptHash = receipt.receiptHash;

    const result = {
      ok: false,
      allow: false,
      deny: true,
      denied: true,
      code: decision.code,
      reason: decision.reason,
      receipt,
      overallHealth: BJ_HEALTH.FAIL,
      PRODUCTION_READY: BJ_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BJ_KIND
    };

    if (throwOnDeny) {
      throw new OperatorDashboardError(
        decision.reason || decision.code,
        result
      );
    }
    return result;
  }

  /**
   * Register a surface provider.
   * @param {string} surfaceId
   * @param {Function} providerFn
   * @param {object} [req]
   * @returns {object}
   */
  function registerSurface(surfaceId, providerFn, req = {}) {
    registerCount += 1;
    const decision = gateRegister(surfaceId, providerFn, req);
    if (!decision.ok) {
      return sealDeny(decision, {
        surfaceScores: {},
        surfaceCount: 0,
        prevReceiptHash: lastReceiptHash
      });
    }
    const id = String(surfaceId).trim();
    surfaces.set(id, providerFn);
    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BJ_CODES.OK,
      reason: null,
      surfaceId: id,
      surfaceCount: surfaces.size,
      PRODUCTION_READY: BJ_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BJ_KIND
    };
  }

  /**
   * Evaluate all registered surfaces, aggregate health, seal receipt.
   * @param {object} [req]
   * @returns {object}
   */
  function generateSnapshot(req = {}) {
    snapshotCount += 1;
    const ports = {
      ...defaultPorts,
      ...(req.ports != null && typeof req.ports === 'object' ? req.ports : {})
    };

    let prevReceiptHash =
      req.prevReceiptHash != null && String(req.prevReceiptHash).length > 0
        ? String(req.prevReceiptHash)
        : lastReceiptHash;

    const decision = gateSnapshot(req, {
      registeredCount: surfaces.size
    });
    if (!decision.ok) {
      return sealDeny(decision, {
        surfaceScores: {},
        surfaceCount: surfaces.size,
        prevReceiptHash
      });
    }

    const snapshotTimestamp = String(nowFn());
    const nowMs = Date.parse(snapshotTimestamp);
    /** @type {Record<string, { health: string, score: number|null, reason: string|null, code: string }>} */
    const surfaceScores = {};

    // Optional port call-throughs for composition (AV/AJ/BF/BE/HUD)
    callPort(ports, 'avFreezeDrift', { op: 'snapshot', at: snapshotTimestamp });
    callPort(ports, 'ajEvidence', { op: 'snapshot', at: snapshotTimestamp });
    callPort(ports, 'bfPackaging', { op: 'snapshot', at: snapshotTimestamp });
    callPort(ports, 'beReplay', { op: 'snapshot', at: snapshotTimestamp });
    callPort(ports, 'hud', { op: 'snapshot', at: snapshotTimestamp });

    for (const [surfaceId, providerFn] of surfaces.entries()) {
      let report = null;
      /** @type {Error|null} */
      let thrown = null;
      try {
        report = providerFn({
          surfaceId,
          ports,
          now: snapshotTimestamp
        });
      } catch (err) {
        thrown = err instanceof Error ? err : new Error(String(err));
      }
      const evaluated = evaluateSurfaceReport(surfaceId, report, thrown, {
        maxAgeMs,
        nowMs: Number.isNaN(nowMs) ? null : nowMs
      });
      surfaceScores[surfaceId] = {
        health: evaluated.health,
        score: evaluated.score,
        reason: evaluated.reason,
        code: evaluated.code
      };
    }

    const overallHealth = aggregateOverallHealth(surfaceScores);
    const surfaceCount = Object.keys(surfaceScores).length;

    let code;
    let status;
    let ok;
    if (overallHealth === BJ_HEALTH.OK) {
      code = BJ_CODES.SNAPSHOT_OK;
      status = 'OK';
      ok = true;
      okCount += 1;
    } else if (overallHealth === BJ_HEALTH.DEGRADED) {
      code = BJ_CODES.SNAPSHOT_DEGRADED;
      status = 'DEGRADED';
      ok = false;
      degradedCount += 1;
    } else {
      code = BJ_CODES.SNAPSHOT_FAIL;
      status = 'FAIL';
      ok = false;
      failCount += 1;
    }

    const receipt = buildDashboardReceipt(
      {
        ok,
        deny: false,
        denied: false,
        code,
        status,
        overallHealth,
        surfaceScores,
        surfaceCount,
        snapshotTimestamp,
        prevReceiptHash,
        reason:
          overallHealth === BJ_HEALTH.OK
            ? null
            : `overallHealth=${overallHealth}`
      },
      { now: () => snapshotTimestamp, hash: hashFn }
    );

    history.push(receipt);
    lastReceiptHash = receipt.receiptHash;

    const snapshot = {
      ok,
      allow: ok,
      deny: false,
      denied: false,
      code,
      reason: receipt.reason,
      receipt,
      snapshotTimestamp,
      overallHealth,
      surfaceScores,
      surfaceCount,
      PRODUCTION_READY: BJ_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BJ_KIND,
      sealed: true
    };
    lastSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Pure terminal-safe ASCII/ANSI summary (no display deps).
   * @param {object} [snapshot]
   * @returns {string}
   */
  function renderTextSummary(snapshot) {
    // undefined → lastSnapshot; explicit null → empty summary
    const snap = snapshot === undefined ? lastSnapshot : snapshot;
    if (snap == null || typeof snap !== 'object') {
      return `${ANSI.dim}[EOS BJ HUD]${ANSI.reset} (no snapshot)`;
    }
    const health = snap.overallHealth != null ? String(snap.overallHealth) : '?';
    const color =
      health === BJ_HEALTH.OK
        ? ANSI.green
        : health === BJ_HEALTH.DEGRADED
          ? ANSI.yellow
          : ANSI.red;
    const ts =
      snap.snapshotTimestamp != null
        ? String(snap.snapshotTimestamp)
        : snap.receipt && snap.receipt.snapshotTimestamp != null
          ? String(snap.receipt.snapshotTimestamp)
          : '?';
    const receiptId =
      snap.receipt && snap.receipt.receiptId != null
        ? String(snap.receipt.receiptId)
        : '?';
    const scores =
      snap.surfaceScores != null && typeof snap.surfaceScores === 'object'
        ? snap.surfaceScores
        : {};
    const lines = [];
    lines.push(
      `${ANSI.bold}${ANSI.cyan}┌─ EOS Operator Dashboard / HUD Fabric (BJ) ─┐${ANSI.reset}`
    );
    lines.push(
      `${ANSI.cyan}│${ANSI.reset} overall: ${color}${ANSI.bold}${health}${ANSI.reset}  ts: ${ANSI.dim}${ts}${ANSI.reset}`
    );
    lines.push(
      `${ANSI.cyan}│${ANSI.reset} receipt: ${receiptId}  PR=${BJ_PRODUCTION_READY}  fundacionΔ=0`
    );
    lines.push(`${ANSI.cyan}│${ANSI.reset} surfaces (${Object.keys(scores).length}):`);
    for (const sid of Object.keys(scores).sort()) {
      const s = scores[sid];
      const h = s && s.health != null ? String(s.health) : '?';
      const hc =
        h === BJ_HEALTH.OK
          ? ANSI.green
          : h === BJ_HEALTH.DEGRADED
            ? ANSI.yellow
            : ANSI.red;
      const sc =
        s && typeof s.score === 'number' ? String(s.score) : '-';
      const reason =
        s && s.reason != null && String(s.reason).length > 0
          ? ` — ${String(s.reason).slice(0, 60)}`
          : '';
      lines.push(
        `${ANSI.cyan}│${ANSI.reset}   ${hc}${h.padEnd(8)}${ANSI.reset} ${sid} score=${sc}${ANSI.dim}${reason}${ANSI.reset}`
      );
    }
    lines.push(
      `${ANSI.bold}${ANSI.cyan}└─ NON-CLAIM ≠ Grafana/Datadog/Prometheus / ≠ HTTP GUI ─┘${ANSI.reset}`
    );
    // Also provide a pure-ASCII fallback line (no ANSI) for scanners
    lines.push(
      `[BJ-HUD] health=${health} surfaces=${Object.keys(scores).length} receipt=${receiptId}`
    );
    return lines.join('\n');
  }

  function getHistory() {
    return history.slice();
  }

  function getLastReceiptHash() {
    return lastReceiptHash;
  }

  function getLastSnapshot() {
    return lastSnapshot ? { ...lastSnapshot } : null;
  }

  function listSurfaces() {
    return Array.from(surfaces.keys()).sort();
  }

  function health() {
    return {
      kind: BJ_KIND,
      PRODUCTION_READY: BJ_PRODUCTION_READY,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      observabilitySaas: false,
      grafanaDatadogPrometheus: false,
      externalWebGui: false,
      httpServer: false,
      productionReadyYes: false,
      cloudAgent: false,
      usesCloudAgent: false,
      notBk: true,
      notBl: true,
      bhMeasured: true,
      biMeasured: true,
      bhAcknowledged: true,
      biAcknowledged: true,
      bjInProgress: true,
      bkPending: true,
      blPending: true,
      ladder17: 'CLOSED',
      ladder18: 'CLOSED',
      ladder19: 'CLOSED',
      ladder20: 'OPEN',
      l17NeverReopen: true,
      l18NeverReopen: true,
      l19NeverReopen: true,
      l17Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      l18Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      l19Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      axis: 'Sovereign Mission Continuity & Operator Fabric',
      hermetic: true
    };
  }

  function getState() {
    return {
      kind: BJ_KIND,
      PRODUCTION_READY: BJ_PRODUCTION_READY,
      registerCount,
      snapshotCount,
      okCount,
      degradedCount,
      failCount,
      denyCount,
      surfaceCount: surfaces.size,
      historyCount: history.length,
      lastReceiptHash,
      surfaces: listSurfaces()
    };
  }

  return {
    kind: BJ_KIND,
    PRODUCTION_READY: BJ_PRODUCTION_READY,
    codes: BJ_CODES,
    healthCodes: BJ_HEALTH,
    registerSurface,
    generateSnapshot,
    renderTextSummary,
    getHistory,
    getLastReceiptHash,
    getLastSnapshot,
    listSurfaces,
    health,
    getState,
    gate,
    // NON-CLAIM surface
    observabilitySaas: false,
    grafanaDatadogPrometheus: false,
    externalWebGui: false,
    httpServer: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    fundacionDelta: 0
  };
}

export class OperatorDashboardError extends Error {
  /**
   * @param {string} message
   * @param {object} [result]
   */
  constructor(message, result = {}) {
    super(message);
    this.name = 'OperatorDashboardError';
    this.result = result;
    this.code = result.code || BJ_CODES.DENY;
  }
}

export default {
  BJ_KIND,
  BJ_PRODUCTION_READY,
  BJ_CODES,
  BJ_HEALTH,
  OperatorDashboardError,
  createOperatorDashboardHudFabric,
  stableStringify,
  sha256Canonical,
  buildDashboardReceipt,
  verifyDashboardReceipt,
  gateRegister,
  gateSnapshot,
  evaluateSurfaceReport,
  aggregateOverallHealth
};
