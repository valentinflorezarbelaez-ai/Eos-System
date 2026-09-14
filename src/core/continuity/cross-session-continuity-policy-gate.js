/**
 * @module cross-session-continuity-policy-gate
 * SPEC-0066 / Mission BI — Fail-closed preconditions for Cross-Session
 * Continuity & Replay Fabric: schema, checkpoint integrity, handoff
 * validity, Fundacion DENY, malformed/empty DENY, missing checkpoint,
 * checkpoint divergence, replay divergence.
 *
 * DENY codes: MALFORMED_PAYLOAD, EMPTY_SESSION_ID, EMPTY_MISSION_ID,
 * MISSING_CHECKPOINT, CHECKPOINT_DIVERGENCE, INVALID_HANDOFF,
 * REPLAY_DIVERGENCE, TAMPERED_CHECKPOINT, FUNDACION_DENY, POLICY_DENY,
 * DENY, OK.
 *
 * NON-CLAIM:
 *   policy-gate ≠ HA multi-region SaaS /
 *   ≠ Raft/distributed clustering /
 *   ≠ PRODUCTION_READY=YES
 *   BH MEASURED acknowledged; not BJ–BL; Fundacion Δ=0 (ALWAYS DENY default);
 *   Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/continuity.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BI_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BI_POLICY_GATE_KIND = 'eos-cross-session-continuity-policy-gate';

export const BI_HANDOFF_STATUS = Object.freeze({
  PENDING: 'PENDING',
  HANDOFF_OK: 'HANDOFF_OK',
  HANDOFF_DENY: 'HANDOFF_DENY',
  REPLAY_OK: 'REPLAY_OK',
  REPLAY_DENY: 'REPLAY_DENY',
  CAPTURED: 'CAPTURED'
});

export const BI_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  EMPTY_SESSION_ID: 'EMPTY_SESSION_ID',
  EMPTY_MISSION_ID: 'EMPTY_MISSION_ID',
  MISSING_CHECKPOINT: 'MISSING_CHECKPOINT',
  CHECKPOINT_DIVERGENCE: 'CHECKPOINT_DIVERGENCE',
  INVALID_HANDOFF: 'INVALID_HANDOFF',
  REPLAY_DIVERGENCE: 'REPLAY_DIVERGENCE',
  TAMPERED_CHECKPOINT: 'TAMPERED_CHECKPOINT',
  FUNDACION_DENY: 'FUNDACION_DENY',
  POLICY_DENY: 'POLICY_DENY'
});

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BI_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyMalformed(
  reason = 'malformed continuity payload',
  extra = {}
) {
  return deny(BI_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyEmptySessionId(
  reason = 'sessionId is required (non-empty)',
  extra = {}
) {
  return deny(BI_POLICY_CODES.EMPTY_SESSION_ID, reason, extra);
}

export function denyEmptyMissionId(
  reason = 'missionId is required (non-empty)',
  extra = {}
) {
  return deny(BI_POLICY_CODES.EMPTY_MISSION_ID, reason, extra);
}

export function denyMissingCheckpoint(
  reason = 'checkpoint is required (non-empty hash/snapshot)',
  extra = {}
) {
  return deny(BI_POLICY_CODES.MISSING_CHECKPOINT, reason, extra);
}

export function denyCheckpointDivergence(
  reason = 'checkpoint hash divergence / tamper',
  extra = {}
) {
  return deny(BI_POLICY_CODES.CHECKPOINT_DIVERGENCE, reason, extra);
}

export function denyInvalidHandoff(
  reason = 'invalid handoff (source/target/checkpoint)',
  extra = {}
) {
  return deny(BI_POLICY_CODES.INVALID_HANDOFF, reason, extra);
}

export function denyReplayDivergence(
  reason = 'replay divergence from sealed checkpoint',
  extra = {}
) {
  return deny(BI_POLICY_CODES.REPLAY_DIVERGENCE, reason, extra);
}

export function denyTamperedCheckpoint(
  reason = 'tampered or divergent checkpoint receipt',
  extra = {}
) {
  return deny(BI_POLICY_CODES.TAMPERED_CHECKPOINT, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BI_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BI_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * Fail-closed gate for checkpoint capture request.
 * @param {object} req
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateCapture(req) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('captureCheckpoint() requires an object sessionState');
  }
  if (req.fundacion === true || req.writeFundacion === true) {
    return denyFundacion();
  }
  const sessionId =
    req.sessionId != null ? String(req.sessionId).trim() : '';
  if (!sessionId) {
    return denyEmptySessionId();
  }
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BI_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0
  };
}

/**
 * Fail-closed gate for handoff request.
 * @param {object} req
 * @param {object} [opts]
 * @param {string|null} [opts.expectedCheckpointHash]
 * @param {boolean} [opts.checkpointVerified]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateHandoff(req, opts = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('handoffSession() requires an object request');
  }
  if (req.fundacion === true || req.writeFundacion === true) {
    return denyFundacion();
  }

  const sourceSessionId =
    req.sourceSessionId != null ? String(req.sourceSessionId).trim() : '';
  const targetSessionId =
    req.targetSessionId != null ? String(req.targetSessionId).trim() : '';
  const missionId =
    req.missionId != null ? String(req.missionId).trim() : '';

  if (!sourceSessionId) {
    return denyEmptySessionId('sourceSessionId is required (non-empty)');
  }
  if (!targetSessionId) {
    return denyEmptySessionId('targetSessionId is required (non-empty)');
  }
  if (sourceSessionId === targetSessionId) {
    return denyInvalidHandoff(
      'sourceSessionId and targetSessionId must differ',
      { sourceSessionId, targetSessionId }
    );
  }
  if (!missionId) {
    return denyEmptyMissionId();
  }

  const checkpointReceipt = req.checkpointReceipt;
  if (checkpointReceipt == null || typeof checkpointReceipt !== 'object') {
    return denyMissingCheckpoint('checkpointReceipt is required');
  }

  const cpHash =
    checkpointReceipt.checkpointHash != null
      ? String(checkpointReceipt.checkpointHash).trim()
      : checkpointReceipt.receiptHash != null
        ? String(checkpointReceipt.receiptHash).trim()
        : '';
  if (!cpHash) {
    return denyMissingCheckpoint('checkpointReceipt.checkpointHash is empty');
  }

  if (opts.checkpointVerified === false) {
    return denyTamperedCheckpoint(
      'checkpoint receipt failed verification',
      { checkpointHash: cpHash }
    );
  }

  if (
    opts.expectedCheckpointHash != null &&
    String(opts.expectedCheckpointHash) !== cpHash
  ) {
    return denyCheckpointDivergence(
      `checkpoint hash divergence: expected=${opts.expectedCheckpointHash} actual=${cpHash}`,
      {
        expected: String(opts.expectedCheckpointHash),
        actual: cpHash
      }
    );
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BI_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0,
    checkpointHash: cpHash
  };
}

/**
 * Fail-closed gate for replay request.
 * @param {object} req
 * @param {object} [opts]
 * @param {string|null} [opts.computedReplayHash]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateReplay(req, opts = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('replaySessionHistory() requires an object request');
  }
  if (req.fundacion === true || req.writeFundacion === true) {
    return denyFundacion();
  }

  const checkpointHash =
    req.checkpointHash != null ? String(req.checkpointHash).trim() : '';
  if (!checkpointHash) {
    return denyMissingCheckpoint('checkpointHash is required for replay');
  }

  if (!Array.isArray(req.historicalEvents)) {
    return denyMalformed('historicalEvents must be an array');
  }

  if (
    opts.computedReplayHash != null &&
    String(opts.computedReplayHash) !== checkpointHash
  ) {
    return denyReplayDivergence(
      `replay divergence: checkpoint=${checkpointHash} computed=${opts.computedReplayHash}`,
      {
        checkpointHash,
        computedReplayHash: String(opts.computedReplayHash)
      }
    );
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BI_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0,
    checkpointHash
  };
}

/**
 * Create a policy-gate surface.
 * @param {object} [opts]
 * @returns {object}
 */
export function createCrossSessionContinuityPolicyGate(opts = {}) {
  return {
    kind: BI_POLICY_GATE_KIND,
    PRODUCTION_READY: BI_POLICY_GATE_PRODUCTION_READY,
    codes: BI_POLICY_CODES,
    handoffStatus: BI_HANDOFF_STATUS,
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
    gateCapture: (req) => gateCapture(req),
    gateHandoff: (req, extra = {}) => gateHandoff(req, { ...opts, ...extra }),
    gateReplay: (req, extra = {}) => gateReplay(req, { ...opts, ...extra }),
    // NON-CLAIM surface
    haMultiRegionSaas: false,
    raftDistributedClustering: false,
    productionReadyYes: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
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
};
