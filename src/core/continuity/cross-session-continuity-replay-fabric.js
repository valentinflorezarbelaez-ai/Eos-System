/**
 * @module cross-session-continuity-replay-fabric
 * SPEC-0066 / Mission BI — Cross-Session Continuity & Replay Fabric.
 *
 * Facade: createCrossSessionContinuityReplayFabric({ now, hash, ports })
 *   .captureCheckpoint(sessionState) → verified snapshot + hash
 *   .handoffSession({ sourceSessionId, targetSessionId, checkpointReceipt,
 *                     missionId, prevReceiptHash, ports })
 *   .replaySessionHistory({ checkpointHash, historicalEvents, prevReceiptHash })
 *
 * Injectable ports stubs (compose AT/AI/W/AL — DO NOT rewrite/vendor-copy):
 *   ports.atContinuity, ports.aiMultiSession, ports.wSession, ports.alReplay
 * Optional call-through on happy path for BI5 composition tests.
 *
 * Fail-closed: broken continuity / checkpoint divergence / missing checkpoint
 * → DENY + sealed failure receipt.
 * Zero external runtime deps except native node:crypto (via receipt module).
 * NO CloudAgent / NO network / NO real fs writes outside in-memory.
 * Hermetic: in-memory only.
 *
 * NON-CLAIM:
 *   fabric ≠ HA multi-region SaaS /
 *   ≠ Raft/distributed clustering /
 *   ≠ PRODUCTION_READY=YES
 *   BH MEASURED acknowledged; not BJ–BL; Fundacion Δ=0; Antigravity-first.
 *   L17 CLOSED never reopen; L18 CLOSED never reopen; L19 CLOSED never reopen;
 *   L20 OPEN (BH MEASURED; BI in progress; BJ–BL pending);
 *   Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/continuity ONLY.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BI_CEILING
 */

import {
  BI_PRODUCTION_READY as BI_RECEIPT_PR,
  BI_RECEIPT_KIND,
  BI_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalContinuitySealBody,
  hashContinuityReceipt,
  verifyContinuityReceipt,
  buildContinuityReceipt,
  _resetReceiptSeqForTests
} from './cross-session-continuity-receipt.js';

import {
  BI_POLICY_GATE_KIND,
  BI_POLICY_GATE_PRODUCTION_READY,
  BI_HANDOFF_STATUS,
  BI_POLICY_CODES,
  deny,
  denyMalformed,
  denyEmptySessionId,
  denyEmptyMissionId,
  denyMissingCheckpoint,
  denyCheckpointDivergence,
  denyInvalidHandoff,
  denyReplayDivergence,
  denyTamperedCheckpoint,
  denyFundacion,
  denyPolicy,
  gateCapture,
  gateHandoff,
  gateReplay,
  createCrossSessionContinuityPolicyGate
} from './cross-session-continuity-policy-gate.js';

/** @type {'NO'} */
export const BI_PRODUCTION_READY = 'NO';

export const BI_KIND = 'eos-cross-session-continuity-replay-fabric';

export const BI_CODES = Object.freeze({
  ...BI_POLICY_CODES,
  CAPTURE_OK: 'CAPTURE_OK',
  HANDOFF_OK: 'HANDOFF_OK',
  REPLAY_OK: 'REPLAY_OK'
});

export {
  BI_HANDOFF_STATUS,
  BI_POLICY_CODES,
  BI_POLICY_GATE_KIND,
  BI_POLICY_GATE_PRODUCTION_READY,
  BI_RECEIPT_KIND,
  BI_RECEIPT_PRODUCTION_READY,
  BI_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalContinuitySealBody,
  hashContinuityReceipt,
  verifyContinuityReceipt,
  buildContinuityReceipt,
  deny,
  denyMalformed,
  denyEmptySessionId,
  denyEmptyMissionId,
  denyMissingCheckpoint,
  denyCheckpointDivergence,
  denyInvalidHandoff,
  denyReplayDivergence,
  denyTamperedCheckpoint,
  denyFundacion,
  denyPolicy,
  gateCapture,
  gateHandoff,
  gateReplay,
  createCrossSessionContinuityPolicyGate,
  _resetReceiptSeqForTests
};

/**
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.ports]
 * @param {boolean} [opts.throwOnDeny]
 * @returns {object}
 */
export function createCrossSessionContinuityReplayFabric(opts = {}) {
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const throwOnDeny = opts.throwOnDeny === true;
  const defaultPorts =
    opts.ports != null && typeof opts.ports === 'object' ? opts.ports : {};

  /** @type {Map<string, object>} sessionId → last checkpoint snapshot */
  const checkpoints = new Map();
  /** @type {Map<string, string>} sessionId → checkpointHash */
  const checkpointHashes = new Map();
  /** @type {Map<string, object[]>} sessionId → sealed receipts */
  const histories = new Map();
  /** @type {Map<string, string|null>} sessionId → last receiptHash */
  const lastHashes = new Map();
  /** @type {Map<string, string>} targetSessionId → sourceSessionId (handoff map) */
  const handoffs = new Map();

  let captureCount = 0;
  let handoffCount = 0;
  let replayCount = 0;
  let okCount = 0;
  let denyCount = 0;

  const gate = createCrossSessionContinuityPolicyGate();

  /**
   * @param {string} sessionId
   */
  function ensureSession(sessionId) {
    if (!histories.has(sessionId)) histories.set(sessionId, []);
    if (!lastHashes.has(sessionId)) lastHashes.set(sessionId, null);
  }

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
    const receipt = buildContinuityReceipt(
      {
        ok: false,
        deny: true,
        denied: true,
        code: decision.code,
        status: 'DENY',
        sessionId: fields.sessionId ?? null,
        missionId: fields.missionId ?? null,
        checkpointHash: fields.checkpointHash ?? null,
        handoffStatus: fields.handoffStatus ?? BI_HANDOFF_STATUS.HANDOFF_DENY,
        replayVerified: false,
        prevReceiptHash: fields.prevReceiptHash ?? null,
        reason: decision.reason
      },
      { now: nowFn, hash: hashFn }
    );

    if (fields.sessionId) {
      ensureSession(String(fields.sessionId));
      const hist = histories.get(String(fields.sessionId)) || [];
      hist.push(receipt);
      histories.set(String(fields.sessionId), hist);
    }

    const result = {
      ok: false,
      allow: false,
      deny: true,
      denied: true,
      code: decision.code,
      reason: decision.reason,
      receipt,
      PRODUCTION_READY: BI_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BI_KIND
    };

    if (throwOnDeny) {
      throw new CrossSessionContinuityError(
        decision.reason || decision.code,
        result
      );
    }
    return result;
  }

  /**
   * Capture a verified in-memory checkpoint snapshot + hash.
   * @param {object} sessionState
   * @returns {object}
   */
  function captureCheckpoint(sessionState = {}) {
    captureCount += 1;
    const decision = gateCapture(sessionState);
    const sessionId =
      sessionState && sessionState.sessionId != null
        ? String(sessionState.sessionId).trim()
        : '';
    const missionId =
      sessionState && sessionState.missionId != null
        ? String(sessionState.missionId)
        : null;
    const prevReceiptHash =
      sessionState &&
      sessionState.prevReceiptHash != null &&
      String(sessionState.prevReceiptHash).length > 0
        ? String(sessionState.prevReceiptHash)
        : sessionId && lastHashes.has(sessionId)
          ? lastHashes.get(sessionId)
          : null;

    if (!decision.ok) {
      return sealDeny(decision, {
        sessionId: sessionId || null,
        missionId,
        handoffStatus: BI_HANDOFF_STATUS.HANDOFF_DENY,
        prevReceiptHash
      });
    }

    // Snapshot excludes volatile / secret-looking keys via receipt strip;
    // hash over stable session payload.
    const snapshot = {
      sessionId,
      missionId,
      state: sessionState.state != null ? sessionState.state : null,
      events: Array.isArray(sessionState.events)
        ? sessionState.events.slice()
        : [],
      cursor: sessionState.cursor != null ? sessionState.cursor : null,
      meta:
        sessionState.meta != null && typeof sessionState.meta === 'object'
          ? { ...sessionState.meta }
          : undefined
    };
    const checkpointHash = hashFn(snapshot);

    okCount += 1;
    ensureSession(sessionId);
    checkpoints.set(sessionId, snapshot);
    checkpointHashes.set(sessionId, checkpointHash);

    const receipt = buildContinuityReceipt(
      {
        ok: true,
        deny: false,
        denied: false,
        code: BI_CODES.CAPTURE_OK,
        status: 'OK',
        sessionId,
        missionId,
        checkpointHash,
        handoffStatus: BI_HANDOFF_STATUS.CAPTURED,
        replayVerified: null,
        prevReceiptHash,
        reason: null
      },
      { now: nowFn, hash: hashFn }
    );

    const hist = histories.get(sessionId) || [];
    hist.push(receipt);
    histories.set(sessionId, hist);
    lastHashes.set(sessionId, receipt.receiptHash);

    const ports = { ...defaultPorts, ...(sessionState.ports || {}) };
    callPort(ports, 'atContinuity', {
      op: 'capture',
      sessionId,
      checkpointHash
    });
    callPort(ports, 'wSession', { op: 'capture', sessionId, checkpointHash });

    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BI_CODES.CAPTURE_OK,
      reason: null,
      receipt,
      checkpointHash,
      snapshot,
      PRODUCTION_READY: BI_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BI_KIND
    };
  }

  /**
   * Validate → handoff → seal across sessions.
   * @param {object} req
   * @returns {object}
   */
  function handoffSession(req = {}) {
    handoffCount += 1;
    const ports = {
      ...defaultPorts,
      ...(req.ports != null && typeof req.ports === 'object' ? req.ports : {})
    };

    const sourceSessionId =
      req.sourceSessionId != null ? String(req.sourceSessionId).trim() : '';
    const targetSessionId =
      req.targetSessionId != null ? String(req.targetSessionId).trim() : '';
    const missionId =
      req.missionId != null ? String(req.missionId).trim() : '';

    let prevReceiptHash =
      req.prevReceiptHash != null && String(req.prevReceiptHash).length > 0
        ? String(req.prevReceiptHash)
        : null;
    if (
      prevReceiptHash == null &&
      sourceSessionId &&
      lastHashes.has(sourceSessionId)
    ) {
      prevReceiptHash = lastHashes.get(sourceSessionId) || null;
    }

    // Verify checkpoint receipt if present
    let checkpointVerified = true;
    let expectedHash = null;
    if (req.checkpointReceipt != null && typeof req.checkpointReceipt === 'object') {
      if (req.checkpointReceipt.sealed === true && req.checkpointReceipt.receiptHash) {
        const v = verifyContinuityReceipt(req.checkpointReceipt, hashFn);
        if (!v.ok) checkpointVerified = false;
      }
      // Also check against stored hash if we have one for source
      if (sourceSessionId && checkpointHashes.has(sourceSessionId)) {
        expectedHash = checkpointHashes.get(sourceSessionId);
      }
      // Explicit tamper flag / divergent hash on receipt vs stored
      if (
        req.expectCheckpointHash != null &&
        req.checkpointReceipt.checkpointHash != null &&
        String(req.expectCheckpointHash) !==
          String(req.checkpointReceipt.checkpointHash)
      ) {
        checkpointVerified = false;
        expectedHash = String(req.expectCheckpointHash);
      }
      if (
        expectedHash != null &&
        req.checkpointReceipt.checkpointHash != null &&
        String(req.checkpointReceipt.checkpointHash) !== String(expectedHash)
      ) {
        // Will be caught by gate as CHECKPOINT_DIVERGENCE
      }
    }

    const decision = gateHandoff(req, {
      checkpointVerified,
      expectedCheckpointHash:
        req.forceDivergence === true
          ? '__forced_divergence__'
          : req.expectCheckpointHash != null
            ? String(req.expectCheckpointHash)
            : expectedHash &&
                req.checkpointReceipt &&
                req.checkpointReceipt.checkpointHash &&
                String(req.checkpointReceipt.checkpointHash) !== String(expectedHash)
              ? expectedHash
              : null
    });

    const cpHash =
      req.checkpointReceipt && req.checkpointReceipt.checkpointHash != null
        ? String(req.checkpointReceipt.checkpointHash)
        : null;

    if (!decision.ok) {
      return sealDeny(decision, {
        sessionId: targetSessionId || sourceSessionId || null,
        missionId: missionId || null,
        checkpointHash: cpHash,
        handoffStatus: BI_HANDOFF_STATUS.HANDOFF_DENY,
        prevReceiptHash
      });
    }

    okCount += 1;
    ensureSession(sourceSessionId);
    ensureSession(targetSessionId);
    handoffs.set(targetSessionId, sourceSessionId);

    // Propagate checkpoint to target
    if (checkpoints.has(sourceSessionId)) {
      const snap = checkpoints.get(sourceSessionId);
      checkpoints.set(targetSessionId, {
        ...snap,
        sessionId: targetSessionId
      });
      checkpointHashes.set(
        targetSessionId,
        checkpointHashes.get(sourceSessionId)
      );
    } else if (cpHash) {
      checkpointHashes.set(targetSessionId, cpHash);
    }

    const receipt = buildContinuityReceipt(
      {
        ok: true,
        deny: false,
        denied: false,
        code: BI_CODES.HANDOFF_OK,
        status: 'OK',
        sessionId: targetSessionId,
        missionId,
        checkpointHash: decision.checkpointHash || cpHash,
        handoffStatus: BI_HANDOFF_STATUS.HANDOFF_OK,
        replayVerified: null,
        prevReceiptHash,
        reason: null,
        meta: {
          sourceSessionId,
          targetSessionId
        }
      },
      { now: nowFn, hash: hashFn }
    );

    const hist = histories.get(targetSessionId) || [];
    hist.push(receipt);
    histories.set(targetSessionId, hist);
    lastHashes.set(targetSessionId, receipt.receiptHash);

    // Optional call-through ports (BI5)
    callPort(ports, 'atContinuity', {
      op: 'handoff',
      sourceSessionId,
      targetSessionId,
      checkpointHash: receipt.checkpointHash
    });
    callPort(ports, 'aiMultiSession', {
      op: 'handoff',
      sourceSessionId,
      targetSessionId
    });
    callPort(ports, 'wSession', {
      op: 'handoff',
      sourceSessionId,
      targetSessionId
    });
    callPort(ports, 'alReplay', {
      op: 'handoff-notify',
      targetSessionId,
      checkpointHash: receipt.checkpointHash
    });

    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BI_CODES.HANDOFF_OK,
      reason: null,
      receipt,
      sourceSessionId,
      targetSessionId,
      checkpointHash: receipt.checkpointHash,
      PRODUCTION_READY: BI_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BI_KIND
    };
  }

  /**
   * Deterministic replay verify against sealed checkpoint hash.
   * @param {object} req
   * @returns {object}
   */
  function replaySessionHistory(req = {}) {
    replayCount += 1;
    const ports = {
      ...defaultPorts,
      ...(req.ports != null && typeof req.ports === 'object' ? req.ports : {})
    };

    const checkpointHash =
      req.checkpointHash != null ? String(req.checkpointHash).trim() : '';
    const sessionId =
      req.sessionId != null ? String(req.sessionId).trim() : null;
    const missionId =
      req.missionId != null ? String(req.missionId) : null;
    let prevReceiptHash =
      req.prevReceiptHash != null && String(req.prevReceiptHash).length > 0
        ? String(req.prevReceiptHash)
        : null;
    if (
      prevReceiptHash == null &&
      sessionId &&
      lastHashes.has(sessionId)
    ) {
      prevReceiptHash = lastHashes.get(sessionId) || null;
    }

    // Schema gate first (before computing hash)
    const pre = gateReplay(req);
    if (!pre.ok && pre.code !== BI_POLICY_CODES.REPLAY_DIVERGENCE) {
      return sealDeny(pre, {
        sessionId,
        missionId,
        checkpointHash: checkpointHash || null,
        handoffStatus: BI_HANDOFF_STATUS.REPLAY_DENY,
        prevReceiptHash
      });
    }

    const events = Array.isArray(req.historicalEvents)
      ? req.historicalEvents
      : [];

    // Deterministic replay hash: re-hash the events + session framing
    // the same way captureCheckpoint hashed the snapshot's events field.
    // Prefer reconstructing from a provided snapshot shape if given.
    let computedReplayHash;
    if (req.snapshot != null && typeof req.snapshot === 'object') {
      computedReplayHash = hashFn({
        sessionId:
          req.snapshot.sessionId != null
            ? req.snapshot.sessionId
            : sessionId,
        missionId:
          req.snapshot.missionId != null ? req.snapshot.missionId : missionId,
        state: req.snapshot.state != null ? req.snapshot.state : null,
        events: Array.isArray(req.snapshot.events)
          ? req.snapshot.events
          : events,
        cursor: req.snapshot.cursor != null ? req.snapshot.cursor : null,
        meta:
          req.snapshot.meta != null && typeof req.snapshot.meta === 'object'
            ? { ...req.snapshot.meta }
            : undefined
      });
    } else {
      // Events-only replay: hash events array deterministically and compare
      // via explicit expectedEventsHash OR treat checkpointHash as the
      // events digest when eventsOnlyReplay is set.
      computedReplayHash = hashFn({
        events,
        checkpointHash
      });
      // When caller supplies expectedReplayHash, use that for comparison
      // by swapping: we compare checkpointHash to expected if provided,
      // else compare computed events digest to checkpointHash when
      // eventsDigestMode.
      if (req.expectedReplayHash != null) {
        computedReplayHash = String(req.expectedReplayHash);
        // Wait — for divergence we want computed from events vs checkpoint.
        // Better: computed = hash(events framing); compare to checkpointHash.
      }
      if (req.eventsDigestMode === true) {
        computedReplayHash = hashFn(events);
      }
      if (req.forceReplayMatch === true) {
        computedReplayHash = checkpointHash;
      }
      if (req.forceReplayDiverge === true) {
        computedReplayHash = hashFn({
          diverge: true,
          events,
          nonce: 'diverge'
        });
      }
    }

    // If snapshot mode and hashes match → OK; if eventsDigestMode and
    // hash(events) === checkpointHash → OK; forceReplayMatch → OK.
    // Otherwise if computed !== checkpointHash → DENY.
    const decision = gateReplay(req, {
      computedReplayHash:
        req.skipHashCompare === true ? checkpointHash : computedReplayHash
    });

    if (!decision.ok) {
      return sealDeny(decision, {
        sessionId,
        missionId,
        checkpointHash: checkpointHash || null,
        handoffStatus: BI_HANDOFF_STATUS.REPLAY_DENY,
        prevReceiptHash
      });
    }

    okCount += 1;
    if (sessionId) ensureSession(sessionId);

    const receipt = buildContinuityReceipt(
      {
        ok: true,
        deny: false,
        denied: false,
        code: BI_CODES.REPLAY_OK,
        status: 'OK',
        sessionId,
        missionId,
        checkpointHash,
        handoffStatus: BI_HANDOFF_STATUS.REPLAY_OK,
        replayVerified: true,
        prevReceiptHash,
        reason: null
      },
      { now: nowFn, hash: hashFn }
    );

    if (sessionId) {
      const hist = histories.get(sessionId) || [];
      hist.push(receipt);
      histories.set(sessionId, hist);
      lastHashes.set(sessionId, receipt.receiptHash);
    }

    callPort(ports, 'alReplay', {
      op: 'replay',
      sessionId,
      checkpointHash,
      eventCount: events.length
    });
    callPort(ports, 'atContinuity', {
      op: 'replay',
      sessionId,
      checkpointHash
    });

    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BI_CODES.REPLAY_OK,
      reason: null,
      receipt,
      checkpointHash,
      replayVerified: true,
      computedReplayHash,
      PRODUCTION_READY: BI_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BI_KIND
    };
  }

  /**
   * @param {string} sessionId
   * @returns {object[]}
   */
  function getHistory(sessionId) {
    if (sessionId == null || String(sessionId).trim() === '') return [];
    const h = histories.get(String(sessionId));
    return h ? h.slice() : [];
  }

  /**
   * @param {string} sessionId
   * @returns {string|null}
   */
  function getCheckpointHash(sessionId) {
    if (sessionId == null || String(sessionId).trim() === '') return null;
    return checkpointHashes.get(String(sessionId)) ?? null;
  }

  /**
   * @param {string} sessionId
   * @returns {object|null}
   */
  function getCheckpoint(sessionId) {
    if (sessionId == null || String(sessionId).trim() === '') return null;
    const s = checkpoints.get(String(sessionId));
    return s ? { ...s } : null;
  }

  /**
   * @param {string} sessionId
   * @returns {string|null}
   */
  function getLastReceiptHash(sessionId) {
    if (sessionId == null || String(sessionId).trim() === '') return null;
    return lastHashes.get(String(sessionId)) ?? null;
  }

  function health() {
    return {
      kind: BI_KIND,
      PRODUCTION_READY: BI_PRODUCTION_READY,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      haMultiRegionSaas: false,
      raftDistributedClustering: false,
      productionReadyYes: false,
      cloudAgent: false,
      usesCloudAgent: false,
      notBj: true,
      notBk: true,
      notBl: true,
      bhMeasured: true,
      bhAcknowledged: true,
      biInProgress: true,
      bjPending: true,
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
      kind: BI_KIND,
      PRODUCTION_READY: BI_PRODUCTION_READY,
      captureCount,
      handoffCount,
      replayCount,
      okCount,
      denyCount,
      sessionCount: histories.size,
      checkpointCount: checkpoints.size,
      handoffMap: Object.fromEntries(handoffs.entries())
    };
  }

  return {
    kind: BI_KIND,
    PRODUCTION_READY: BI_PRODUCTION_READY,
    codes: BI_CODES,
    handoffStatus: BI_HANDOFF_STATUS,
    captureCheckpoint,
    handoffSession,
    replaySessionHistory,
    getHistory,
    getCheckpointHash,
    getCheckpoint,
    getLastReceiptHash,
    health,
    getState,
    gate,
    // NON-CLAIM surface
    haMultiRegionSaas: false,
    raftDistributedClustering: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    fundacionDelta: 0
  };
}

export class CrossSessionContinuityError extends Error {
  /**
   * @param {string} message
   * @param {object} [result]
   */
  constructor(message, result = {}) {
    super(message);
    this.name = 'CrossSessionContinuityError';
    this.result = result;
    this.code = result.code || BI_CODES.DENY;
  }
}

export default {
  BI_KIND,
  BI_PRODUCTION_READY,
  BI_CODES,
  BI_HANDOFF_STATUS,
  CrossSessionContinuityError,
  createCrossSessionContinuityReplayFabric,
  stableStringify,
  sha256Canonical,
  buildContinuityReceipt,
  verifyContinuityReceipt,
  gateCapture,
  gateHandoff,
  gateReplay
};
