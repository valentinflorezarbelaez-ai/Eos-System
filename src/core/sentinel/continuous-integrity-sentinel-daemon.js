/**
 * @module continuous-integrity-sentinel-daemon
 * SPEC-0071 / Mission BN — Continuous Integrity Sentinel & FDIR Heartbeat Daemon.
 *
 * Facade: createContinuousIntegritySentinelDaemon({ now, hash, intervalMs,
 *   freezeDriftObserver, contractDriftMonitor, fdirSentinel })
 *   .startHeartbeat({ intervalMs? })
 *   .stopHeartbeat()
 *   .pulseCheck({ targetManifestHash, anomaliesDetected?, drift?, ... })
 *   .isolateDrift({ reason?, anomaliesDetected? })
 *   .verifyReceiptTrail(receipts)
 *   .health() / .getState()
 *
 * Deterministic scheduler via node:timers setInterval; no hanging timers —
 * Timeout.unref() on start; stopHeartbeat clears interval.
 * Pure Node.js: crypto + timers/events only; no net/fs writes outside
 * hermetic fixtures; Fundacion ALWAYS_DENY.
 *
 * Optional injectable ports (compose without rewriting siblings):
 *   freezeDriftObserver — { observe(req) => { drift?, anomalies? } }
 *   contractDriftMonitor — { check|detectDrift(req) => { drift?, anomalies? } }
 *   fdirSentinel — { pulse|evaluate|getState(req) => { ok?, anomalies? } }
 *
 * NON-CLAIM:
 *   continuous integrity sentinel ≠ Datadog/Prometheus/K8s daemonset /
 *   ≠ heavy APM product /
 *   ≠ PRODUCTION_READY=YES monitoring product
 *   L17 CLOSED never reopen; L18 CLOSED never reopen; L19 CLOSED never reopen;
 *   L20 CLOSED never reopen; L21 OPEN (BM MEASURED; BN in progress; BO–BQ pending);
 *   Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric.
 *   DO NOT rewrite src/core/freeze-drift / fdir / governance —
 *   BN lives in NEW src/core/sentinel/.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/sentinel — BN owns sentinel-* / continuous-* only.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BN_CEILING
 */

import { EventEmitter } from 'node:events';

import {
  BN_PRODUCTION_READY as BN_RECEIPT_PR,
  BN_RECEIPT_KIND,
  BN_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalHeartbeatSealBody,
  hashHeartbeatReceipt,
  verifyHeartbeatReceipt,
  buildHeartbeatReceipt,
  _resetReceiptSeqForTests
} from './sentinel-heartbeat-receipt.js';

import {
  BN_POLICY_GATE_KIND,
  BN_POLICY_GATE_PRODUCTION_READY,
  BN_POLICY_CODES,
  deny,
  denyMalformed,
  denyFundacion,
  denyDrift,
  denyDegraded,
  denyQuarantined,
  denyPolicy,
  isFundacionTarget,
  normalizeAnomalies,
  gatePulseCheck,
  gateIsolateDrift,
  createSentinelIntegrityPolicyGate
} from './sentinel-integrity-policy-gate.js';

/** @type {'NO'} */
export const BN_PRODUCTION_READY = 'NO';

export const BN_KIND = 'eos-continuous-integrity-sentinel-daemon';

export const BN_CODES = Object.freeze({
  ...BN_POLICY_CODES,
  PULSE_OK: 'PULSE_OK',
  HEARTBEAT_STARTED: 'HEARTBEAT_STARTED',
  HEARTBEAT_STOPPED: 'HEARTBEAT_STOPPED',
  ISOLATE_OK: 'ISOLATE_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

export {
  BN_POLICY_CODES,
  BN_POLICY_GATE_KIND,
  BN_POLICY_GATE_PRODUCTION_READY,
  BN_RECEIPT_KIND,
  BN_RECEIPT_PRODUCTION_READY,
  BN_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalHeartbeatSealBody,
  hashHeartbeatReceipt,
  verifyHeartbeatReceipt,
  buildHeartbeatReceipt,
  deny,
  denyMalformed,
  denyFundacion,
  denyDrift,
  denyDegraded,
  denyQuarantined,
  denyPolicy,
  isFundacionTarget,
  normalizeAnomalies,
  gatePulseCheck,
  gateIsolateDrift,
  createSentinelIntegrityPolicyGate,
  _resetReceiptSeqForTests
};

const AXIS =
  'Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric';

/**
 * Collect anomalies from optional injectable sibling ports.
 * @param {object} ports
 * @param {object} req
 * @returns {{ drift: boolean, degraded: boolean, anomalies: string[] }}
 */
function collectPortSignals(ports, req) {
  const anomalies = [];
  let drift = false;
  let degraded = false;

  const freeze = ports.freezeDriftObserver;
  if (freeze && typeof freeze.observe === 'function') {
    try {
      const r = freeze.observe({
        observedTip: req.observedTip,
        freezeTip: req.freezeTip,
        matrixTip: req.matrixTip,
        mode: req.mode || 'observe',
        ...req
      });
      if (r && r.drift === true) {
        drift = true;
        anomalies.push('freeze-drift');
      }
      if (r && Array.isArray(r.anomalies)) {
        for (const a of r.anomalies) anomalies.push(String(a));
      }
    } catch {
      degraded = true;
      anomalies.push('freeze-drift-port-error');
    }
  }

  const cdm = ports.contractDriftMonitor;
  if (cdm) {
    const fn =
      typeof cdm.check === 'function'
        ? cdm.check.bind(cdm)
        : typeof cdm.detectDrift === 'function'
          ? cdm.detectDrift.bind(cdm)
          : null;
    if (fn) {
      try {
        const r = fn(req);
        if (r && (r.drift === true || r.hasDrift === true)) {
          drift = true;
          anomalies.push('contract-drift');
        }
        if (r && Array.isArray(r.anomalies)) {
          for (const a of r.anomalies) anomalies.push(String(a));
        }
      } catch {
        degraded = true;
        anomalies.push('contract-drift-port-error');
      }
    }
  }

  const fdir = ports.fdirSentinel;
  if (fdir) {
    const fn =
      typeof fdir.pulse === 'function'
        ? fdir.pulse.bind(fdir)
        : typeof fdir.evaluate === 'function'
          ? fdir.evaluate.bind(fdir)
          : typeof fdir.getState === 'function'
            ? fdir.getState.bind(fdir)
            : null;
    if (fn) {
      try {
        const r = fn(req);
        if (r && (r.ok === false || r.drift === true || r.degraded === true)) {
          if (r.drift === true) {
            drift = true;
            anomalies.push('fdir-drift');
          }
          if (r.degraded === true || r.ok === false) {
            degraded = true;
            anomalies.push('fdir-degraded');
          }
        }
        if (r && Array.isArray(r.anomalies)) {
          for (const a of r.anomalies) anomalies.push(String(a));
        }
      } catch {
        degraded = true;
        anomalies.push('fdir-sentinel-port-error');
      }
    }
  }

  return {
    drift,
    degraded,
    anomalies: [...new Set(anomalies)].sort()
  };
}

/**
 * Create Continuous Integrity Sentinel & FDIR Heartbeat Daemon.
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {number} [opts.intervalMs=0] — 0 means manual-only (no auto timer)
 * @param {object} [opts.freezeDriftObserver]
 * @param {object} [opts.contractDriftMonitor]
 * @param {object} [opts.fdirSentinel]
 * @param {boolean} [opts.throwOnDeny=false]
 * @returns {object}
 */
export function createContinuousIntegritySentinelDaemon(opts = {}) {
  const now =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const defaultInterval =
    opts.intervalMs != null && Number.isFinite(Number(opts.intervalMs))
      ? Math.max(0, Number(opts.intervalMs))
      : 0;

  const ports = {
    freezeDriftObserver: opts.freezeDriftObserver || null,
    contractDriftMonitor: opts.contractDriftMonitor || null,
    fdirSentinel: opts.fdirSentinel || null
  };

  const emitter = new EventEmitter();
  // Prevent MaxListeners warning in long hermetic runs; callers may attach
  emitter.setMaxListeners(32);

  let timer = null;
  let running = false;
  let pulseIndex = 0;
  let lastReceiptHash = null;
  let quarantined = false;
  let quarantineReason = null;
  /** @type {object[]} */
  const history = [];
  let pulseCount = 0;
  let okCount = 0;
  let denyCount = 0;
  let isolateCount = 0;
  let startCount = 0;
  let stopCount = 0;

  function clearTimer() {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
    running = false;
  }

  function sealOutcome(body) {
    const receipt = buildHeartbeatReceipt(
      {
        ...body,
        prevReceiptHash:
          body.prevReceiptHash != null
            ? body.prevReceiptHash
            : lastReceiptHash,
        pulseIndex: body.pulseIndex != null ? body.pulseIndex : pulseIndex
      },
      { now, hash: hashFn }
    );
    lastReceiptHash = receipt.receiptHash;
    history.push(receipt);
    if (history.length > 256) history.shift();
    return receipt;
  }

  /**
   * Single integrity pulse — deterministic, hermetic.
   * @param {object} [req]
   * @returns {object}
   */
  function pulseCheck(req = {}) {
    pulseCount += 1;
    pulseIndex += 1;

    if (isFundacionTarget(req) || req.fundacion === true) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: BN_CODES.FUNDACION_ALWAYS_DENY,
        integrityStatus: 'DRIFT_DETECTED',
        anomaliesDetected: ['fundacion'],
        targetManifestHash: req.targetManifestHash || req.manifestHash || null,
        reason: 'Fundacion ALWAYS_DENY',
        pulseIndex
      });
      const out = {
        ok: false,
        deny: true,
        denied: true,
        code: BN_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Fundacion ALWAYS_DENY',
        receipt,
        PRODUCTION_READY: BN_PRODUCTION_READY,
        fundacionDelta: 0,
        fundacion: 'ALWAYS_DENY',
        hermetic: true,
        datadogPrometheusK8sDaemonset: false,
        heavyApm: false,
        productionReadyYes: false,
        cloudAgent: false,
        monitoringProduct: false
      };
      emitter.emit('pulse', out);
      if (opts.throwOnDeny) {
        const err = new Error('FUNDACION_ALWAYS_DENY');
        err.code = BN_CODES.FUNDACION_ALWAYS_DENY;
        throw err;
      }
      return out;
    }

    if (quarantined) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: BN_CODES.QUARANTINED,
        integrityStatus: 'QUARANTINED',
        anomaliesDetected: normalizeAnomalies(req.anomaliesDetected).concat([
          'quarantined'
        ]),
        targetManifestHash: req.targetManifestHash || req.manifestHash || null,
        reason: quarantineReason || 'target quarantined',
        quarantined: true,
        pulseIndex
      });
      const out = {
        ok: false,
        deny: true,
        denied: true,
        code: BN_CODES.QUARANTINED,
        reason: quarantineReason || 'target quarantined',
        receipt,
        quarantined: true,
        PRODUCTION_READY: BN_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true,
        datadogPrometheusK8sDaemonset: false,
        heavyApm: false,
        productionReadyYes: false,
        cloudAgent: false,
        monitoringProduct: false
      };
      emitter.emit('pulse', out);
      return out;
    }

    const portSignals = collectPortSignals(ports, req);
    const mergedAnomalies = [
      ...normalizeAnomalies(req.anomaliesDetected || req.anomalies),
      ...portSignals.anomalies
    ];
    const drift =
      req.drift === true ||
      portSignals.drift ||
      req.integrityStatus === 'DRIFT_DETECTED';
    const degraded =
      req.degraded === true ||
      portSignals.degraded ||
      req.integrityStatus === 'DEGRADED';

    const gate = gatePulseCheck(
      {
        ...req,
        anomaliesDetected: mergedAnomalies,
        drift,
        degraded,
        integrityStatus: drift
          ? 'DRIFT_DETECTED'
          : degraded
            ? 'DEGRADED'
            : req.integrityStatus
      },
      { quarantined, requireManifest: false }
    );

    if (!gate.ok) {
      denyCount += 1;
      const status =
        gate.integrityStatus ||
        (gate.code === BN_CODES.DRIFT_DETECTED
          ? 'DRIFT_DETECTED'
          : gate.code === BN_CODES.DEGRADED
            ? 'DEGRADED'
            : gate.code === BN_CODES.QUARANTINED
              ? 'QUARANTINED'
              : 'DRIFT_DETECTED');
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: gate.code,
        integrityStatus: status,
        anomaliesDetected: gate.anomalies || mergedAnomalies,
        targetManifestHash: req.targetManifestHash || req.manifestHash || null,
        reason: gate.reason,
        quarantined: status === 'QUARANTINED',
        pulseIndex
      });
      const out = {
        ok: false,
        deny: true,
        denied: true,
        code: gate.code,
        reason: gate.reason,
        receipt,
        anomalies: gate.anomalies || mergedAnomalies,
        PRODUCTION_READY: BN_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true,
        datadogPrometheusK8sDaemonset: false,
        heavyApm: false,
        productionReadyYes: false,
        cloudAgent: false,
        monitoringProduct: false
      };
      emitter.emit('pulse', out);
      emitter.emit('drift', out);
      if (opts.throwOnDeny) {
        const err = new Error(String(gate.reason || gate.code));
        err.code = gate.code;
        throw err;
      }
      return out;
    }

    okCount += 1;
    const targetManifestHash =
      req.targetManifestHash != null
        ? String(req.targetManifestHash)
        : req.manifestHash != null
          ? String(req.manifestHash)
          : hashFn({
              pulseIndex,
              ts: String(now()),
              kind: 'hermetic-manifest'
            });

    const receipt = sealOutcome({
      ok: true,
      code: BN_CODES.PULSE_OK,
      integrityStatus: 'OK',
      anomaliesDetected: [],
      targetManifestHash,
      reason: null,
      pulseIndex
    });

    const out = {
      ok: true,
      deny: false,
      denied: false,
      code: BN_CODES.PULSE_OK,
      reason: null,
      receipt,
      PRODUCTION_READY: BN_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      datadogPrometheusK8sDaemonset: false,
      heavyApm: false,
      productionReadyYes: false,
      cloudAgent: false,
      monitoringProduct: false
    };
    emitter.emit('pulse', out);
    return out;
  }

  /**
   * Isolate drift — quarantine fail-closed.
   * @param {object} [req]
   * @returns {object}
   */
  function isolateDrift(req = {}) {
    isolateCount += 1;

    if (isFundacionTarget(req) || req.fundacion === true) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: BN_CODES.FUNDACION_ALWAYS_DENY,
        integrityStatus: 'DRIFT_DETECTED',
        anomaliesDetected: ['fundacion'],
        targetManifestHash: req.targetManifestHash || null,
        reason: 'Fundacion ALWAYS_DENY',
        pulseIndex: pulseIndex + 1
      });
      pulseIndex += 1;
      return {
        ok: false,
        deny: true,
        denied: true,
        code: BN_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Fundacion ALWAYS_DENY',
        receipt,
        fundacionDelta: 0,
        PRODUCTION_READY: BN_PRODUCTION_READY,
        hermetic: true
      };
    }

    const gate = gateIsolateDrift(req);
    quarantined = true;
    quarantineReason =
      req.reason != null
        ? String(req.reason)
        : gate.reason || 'isolateDrift quarantine applied';
    pulseIndex += 1;

    const anomalies = normalizeAnomalies(req.anomaliesDetected).concat([
      'isolated'
    ]);
    const receipt = sealOutcome({
      ok: false,
      deny: true,
      code: BN_CODES.QUARANTINED,
      integrityStatus: 'QUARANTINED',
      anomaliesDetected: anomalies,
      targetManifestHash: req.targetManifestHash || null,
      reason: quarantineReason,
      quarantined: true,
      pulseIndex
    });
    denyCount += 1;

    const out = {
      ok: true, // isolate action succeeded (quarantine applied)
      isolateOk: true,
      deny: true,
      denied: true,
      code: BN_CODES.QUARANTINED,
      reason: quarantineReason,
      receipt,
      quarantined: true,
      PRODUCTION_READY: BN_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      datadogPrometheusK8sDaemonset: false,
      heavyApm: false,
      productionReadyYes: false,
      cloudAgent: false,
      monitoringProduct: false
    };
    emitter.emit('quarantine', out);
    // Stop heartbeat on quarantine to avoid hanging pulses against bad target
    clearTimer();
    return out;
  }

  /**
   * Start deterministic heartbeat scheduler.
   * intervalMs=0 → no timer (manual pulse only); still marks running.
   * @param {object} [req]
   * @returns {object}
   */
  function startHeartbeat(req = {}) {
    clearTimer();
    startCount += 1;
    const interval =
      req.intervalMs != null && Number.isFinite(Number(req.intervalMs))
        ? Math.max(0, Number(req.intervalMs))
        : defaultInterval;

    running = true;
    if (interval > 0) {
      timer = setInterval(() => {
        try {
          pulseCheck({ ...(req.pulseDefaults || {}), scheduled: true });
        } catch {
          // swallow — hermetic; throwOnDeny handled inside pulseCheck
        }
      }, interval);
      // Prevent process hang — unref so Node can exit; stopHeartbeat also clears
      if (timer && typeof timer.unref === 'function') {
        timer.unref();
      }
    }

    emitter.emit('start', { intervalMs: interval });
    return {
      ok: true,
      code: BN_CODES.HEARTBEAT_STARTED,
      running: true,
      intervalMs: interval,
      PRODUCTION_READY: BN_PRODUCTION_READY,
      hermetic: true
    };
  }

  /**
   * Stop heartbeat — clears interval; no hanging timers.
   * @returns {object}
   */
  function stopHeartbeat() {
    const wasRunning = running;
    clearTimer();
    stopCount += 1;
    emitter.emit('stop', { wasRunning });
    return {
      ok: true,
      code: BN_CODES.HEARTBEAT_STOPPED,
      running: false,
      wasRunning,
      PRODUCTION_READY: BN_PRODUCTION_READY,
      hermetic: true
    };
  }

  /**
   * Verify sealed BN receipt trail (hash + prevReceiptHash chain).
   * @param {object[]} receipts
   * @returns {object}
   */
  function verifyReceiptTrail(receipts) {
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return {
        ok: false,
        code: BN_CODES.TRAIL_BREAK,
        reason: 'empty trail',
        PRODUCTION_READY: BN_PRODUCTION_READY
      };
    }
    let prev = null;
    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i];
      const v = verifyHeartbeatReceipt(r, hashFn);
      if (!v.ok) {
        return {
          ok: false,
          code: BN_CODES.TRAIL_BREAK,
          reason: v.reason || 'receipt tamper',
          index: i,
          PRODUCTION_READY: BN_PRODUCTION_READY
        };
      }
      if (i > 0) {
        const expectedPrev = prev.receiptHash || prev.receiptDigest;
        if (
          r.prevReceiptHash != null &&
          String(r.prevReceiptHash) !== String(expectedPrev)
        ) {
          return {
            ok: false,
            code: BN_CODES.TRAIL_BREAK,
            reason: 'prevReceiptHash chain break',
            index: i,
            PRODUCTION_READY: BN_PRODUCTION_READY
          };
        }
      }
      prev = r;
    }
    return {
      ok: true,
      code: BN_CODES.TRAIL_OK,
      length: receipts.length,
      PRODUCTION_READY: BN_PRODUCTION_READY
    };
  }

  function health() {
    return {
      kind: BN_KIND,
      PRODUCTION_READY: BN_PRODUCTION_READY,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      axis: AXIS,
      ladder17: 'CLOSED',
      ladder18: 'CLOSED',
      ladder19: 'CLOSED',
      ladder20: 'CLOSED',
      ladder21: 'OPEN',
      l17NeverReopen: true,
      l18NeverReopen: true,
      l19NeverReopen: true,
      l20NeverReopen: true,
      l20Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      bmMeasured: true,
      bnInProgress: true,
      boPending: true,
      bpPending: true,
      bqPending: true,
      datadogPrometheusK8sDaemonset: false,
      heavyApm: false,
      productionReadyYes: false,
      cloudAgent: false,
      usesCloudAgent: false,
      monitoringProduct: false,
      notFreezeDriftRewrite: true,
      notFdirRewrite: true,
      notGovernanceRewrite: true,
      running,
      quarantined,
      pulseIndex,
      hermetic: true
    };
  }

  function getState() {
    return {
      kind: BN_KIND,
      PRODUCTION_READY: BN_PRODUCTION_READY,
      running,
      quarantined,
      quarantineReason,
      pulseIndex,
      pulseCount,
      okCount,
      denyCount,
      isolateCount,
      startCount,
      stopCount,
      historyCount: history.length,
      lastReceiptHash,
      hasTimer: timer != null,
      ports: {
        freezeDriftObserver: ports.freezeDriftObserver != null,
        contractDriftMonitor: ports.contractDriftMonitor != null,
        fdirSentinel: ports.fdirSentinel != null
      }
    };
  }

  return {
    kind: BN_KIND,
    PRODUCTION_READY: BN_PRODUCTION_READY,
    codes: BN_CODES,
    startHeartbeat,
    stopHeartbeat,
    pulseCheck,
    isolateDrift,
    verifyReceiptTrail,
    health,
    getState,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    once: emitter.once.bind(emitter),
    // expose clear for tests
    _clearTimerForTests: clearTimer
  };
}

export default {
  BN_PRODUCTION_READY,
  BN_KIND,
  BN_CODES,
  createContinuousIntegritySentinelDaemon
};
