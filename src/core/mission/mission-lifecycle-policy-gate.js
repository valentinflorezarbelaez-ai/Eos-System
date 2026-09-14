/**
 * @module mission-lifecycle-policy-gate
 * SPEC-0065 / Mission BH — Fail-closed preconditions for Mission Lifecycle
 * State Machine: illegal transition, missing evidenceHash for MEASURED,
 * terminal CLOSED cannot leave, malformed payload, empty missionId.
 *
 * DENY codes: ILLEGAL_TRANSITION, MISSING_EVIDENCE_HASH, TERMINAL_CLOSED,
 * MALFORMED_PAYLOAD, EMPTY_MISSION_ID, INVALID_STATE, FUNDACION_DENY,
 * POLICY_DENY, DENY, OK.
 *
 * NON-CLAIM:
 *   policy-gate ≠ Jira/PM SaaS /
 *   ≠ distributed consensus/multi-region /
 *   ≠ PRODUCTION_READY=YES
 *   not BI–BL; Fundacion Δ=0 (ALWAYS DENY default); Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/mission.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BH_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BH_POLICY_GATE_KIND = 'eos-mission-lifecycle-policy-gate';

export const BH_STATES = Object.freeze({
  PROPOSED: 'PROPOSED',
  OPEN: 'OPEN',
  MEASURED: 'MEASURED',
  CLOSED_FOR_LOCAL_GOVERNED_USE: 'CLOSED_FOR_LOCAL_GOVERNED_USE'
});

export const BH_TERMINAL_STATE = BH_STATES.CLOSED_FOR_LOCAL_GOVERNED_USE;

/** Allowed directed edges (from → Set(to)). */
export const BH_ALLOWED_TRANSITIONS = Object.freeze({
  [BH_STATES.PROPOSED]: Object.freeze([BH_STATES.OPEN]),
  [BH_STATES.OPEN]: Object.freeze([BH_STATES.MEASURED]),
  [BH_STATES.MEASURED]: Object.freeze([
    BH_STATES.CLOSED_FOR_LOCAL_GOVERNED_USE
  ]),
  [BH_STATES.CLOSED_FOR_LOCAL_GOVERNED_USE]: Object.freeze([])
});

export const BH_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  ILLEGAL_TRANSITION: 'ILLEGAL_TRANSITION',
  MISSING_EVIDENCE_HASH: 'MISSING_EVIDENCE_HASH',
  TERMINAL_CLOSED: 'TERMINAL_CLOSED',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  EMPTY_MISSION_ID: 'EMPTY_MISSION_ID',
  INVALID_STATE: 'INVALID_STATE',
  FUNDACION_DENY: 'FUNDACION_DENY',
  POLICY_DENY: 'POLICY_DENY',
  STATE_MISMATCH: 'STATE_MISMATCH'
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
    code: code || BH_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyIllegalTransition(
  reason = 'illegal lifecycle transition',
  extra = {}
) {
  return deny(BH_POLICY_CODES.ILLEGAL_TRANSITION, reason, extra);
}

export function denyMissingEvidenceHash(
  reason = 'OPEN→MEASURED requires non-empty evidenceHash',
  extra = {}
) {
  return deny(BH_POLICY_CODES.MISSING_EVIDENCE_HASH, reason, extra);
}

export function denyTerminalClosed(
  reason = 'CLOSED_FOR_LOCAL_GOVERNED_USE is terminal; cannot transition',
  extra = {}
) {
  return deny(BH_POLICY_CODES.TERMINAL_CLOSED, reason, extra);
}

export function denyMalformed(
  reason = 'malformed transition payload',
  extra = {}
) {
  return deny(BH_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyEmptyMissionId(
  reason = 'missionId is required (non-empty)',
  extra = {}
) {
  return deny(BH_POLICY_CODES.EMPTY_MISSION_ID, reason, extra);
}

export function denyInvalidState(
  reason = 'unknown or invalid lifecycle state',
  extra = {}
) {
  return deny(BH_POLICY_CODES.INVALID_STATE, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BH_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BH_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * @param {unknown} state
 * @returns {boolean}
 */
export function isKnownState(state) {
  if (state == null) return false;
  const s = String(state);
  return Object.values(BH_STATES).includes(s);
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function isAllowedEdge(from, to) {
  const edges = BH_ALLOWED_TRANSITIONS[from];
  if (!edges) return false;
  return edges.includes(to);
}

/**
 * Fail-closed gate for a transition request.
 * @param {object} req
 * @param {object} [opts]
 * @param {string|null} [opts.currentState] — tracked in-memory state if known
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateTransition(req, opts = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('transition() requires an object request');
  }

  if (req.fundacion === true || req.writeFundacion === true) {
    return denyFundacion();
  }

  const missionId =
    req.missionId != null ? String(req.missionId).trim() : '';
  if (!missionId) {
    return denyEmptyMissionId();
  }

  const fromState = req.fromState != null ? String(req.fromState) : '';
  const toState = req.toState != null ? String(req.toState) : '';

  if (!fromState || !toState) {
    return denyMalformed('fromState and toState are required');
  }

  if (!isKnownState(fromState) || !isKnownState(toState)) {
    return denyInvalidState(
      `unknown state(s): from=${fromState} to=${toState}`
    );
  }

  if (fromState === BH_TERMINAL_STATE) {
    return denyTerminalClosed(
      'CLOSED_FOR_LOCAL_GOVERNED_USE is terminal; cannot leave',
      { fromState, toState }
    );
  }

  if (opts.currentState != null) {
    const tracked = String(opts.currentState);
    if (tracked !== fromState) {
      return deny(BH_POLICY_CODES.STATE_MISMATCH, `tracked state is ${tracked}, request fromState is ${fromState}`, {
        trackedState: tracked,
        fromState,
        toState
      });
    }
  }

  if (!isAllowedEdge(fromState, toState)) {
    return denyIllegalTransition(
      `illegal transition ${fromState} → ${toState}`,
      { fromState, toState }
    );
  }

  // OPEN → MEASURED requires non-empty evidenceHash
  if (
    fromState === BH_STATES.OPEN &&
    toState === BH_STATES.MEASURED
  ) {
    const eh = req.evidenceHash;
    if (eh == null || String(eh).trim() === '') {
      return denyMissingEvidenceHash();
    }
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BH_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0
  };
}

/**
 * Create a policy-gate surface.
 * @param {object} [opts]
 * @returns {object}
 */
export function createMissionLifecyclePolicyGate(opts = {}) {
  return {
    kind: BH_POLICY_GATE_KIND,
    PRODUCTION_READY: BH_POLICY_GATE_PRODUCTION_READY,
    codes: BH_POLICY_CODES,
    states: BH_STATES,
    allowedTransitions: BH_ALLOWED_TRANSITIONS,
    terminalState: BH_TERMINAL_STATE,
    deny,
    denyIllegalTransition,
    denyMissingEvidenceHash,
    denyTerminalClosed,
    denyMalformed,
    denyEmptyMissionId,
    denyInvalidState,
    denyFundacion,
    denyPolicy,
    isKnownState,
    isAllowedEdge,
    gateTransition: (req, extra = {}) =>
      gateTransition(req, { ...opts, ...extra }),
    // NON-CLAIM surface
    jiraPmSaas: false,
    distributedConsensus: false,
    multiRegion: false,
    productionReadyYes: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  BH_POLICY_GATE_KIND,
  BH_POLICY_GATE_PRODUCTION_READY,
  BH_STATES,
  BH_TERMINAL_STATE,
  BH_ALLOWED_TRANSITIONS,
  BH_POLICY_CODES,
  deny,
  denyIllegalTransition,
  denyMissingEvidenceHash,
  denyTerminalClosed,
  denyMalformed,
  denyEmptyMissionId,
  denyInvalidState,
  denyFundacion,
  denyPolicy,
  isKnownState,
  isAllowedEdge,
  gateTransition,
  createMissionLifecyclePolicyGate
};
