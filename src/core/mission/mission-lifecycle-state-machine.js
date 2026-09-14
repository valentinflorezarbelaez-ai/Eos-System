/**
 * @module mission-lifecycle-state-machine
 * SPEC-0065 / Mission BH — Mission Lifecycle State Machine (pure FSM).
 *
 * States: PROPOSED | OPEN | MEASURED | CLOSED_FOR_LOCAL_GOVERNED_USE
 * Allowed: PROPOSED→OPEN; OPEN→MEASURED (requires non-empty evidenceHash);
 *          MEASURED→CLOSED_FOR_LOCAL_GOVERNED_USE
 * Terminal: CLOSED_FOR_LOCAL_GOVERNED_USE cannot transition
 *
 * API: createMissionLifecycleStateMachine({ now, hash })
 *      .transition({ missionId, fromState, toState, evidenceHash, prevReceiptHash })
 *      → { ok, code, receipt, denied?, reason?, state? }
 *      .getHistory(missionId) / replay inspection of sealed receipts in-memory
 *
 * Fail-closed: invalid transitions → DENY + sealed failure receipt.
 * Zero external runtime deps except native node:crypto (via receipt module).
 * NO CloudAgent / NO network / NO real fs writes outside in-memory.
 *
 * NON-CLAIM:
 *   FSM ≠ Jira/PM SaaS /
 *   ≠ distributed consensus/multi-region /
 *   ≠ PRODUCTION_READY=YES
 *   not BI–BL; Fundacion Δ=0; Antigravity-first.
 *   L17 CLOSED never reopen; L18 CLOSED never reopen; L19 CLOSED never reopen;
 *   L20 OPEN (BH in progress; BI–BL pending);
 *   Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/mission ONLY.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BH_CEILING
 */

import {
  BH_PRODUCTION_READY as BH_RECEIPT_PR,
  BH_RECEIPT_KIND,
  BH_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalTransitionSealBody,
  hashTransitionReceipt,
  verifyTransitionReceipt,
  buildTransitionReceipt,
  _resetReceiptSeqForTests
} from './mission-transition-receipt.js';

import {
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
} from './mission-lifecycle-policy-gate.js';

/** @type {'NO'} */
export const BH_PRODUCTION_READY = 'NO';

export const BH_KIND = 'eos-mission-lifecycle-state-machine';

export const BH_CODES = Object.freeze({
  ...BH_POLICY_CODES,
  TRANSITION_OK: 'TRANSITION_OK'
});

export {
  BH_STATES,
  BH_TERMINAL_STATE,
  BH_ALLOWED_TRANSITIONS,
  BH_POLICY_CODES,
  BH_POLICY_GATE_KIND,
  BH_POLICY_GATE_PRODUCTION_READY,
  BH_RECEIPT_KIND,
  BH_RECEIPT_PRODUCTION_READY,
  BH_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalTransitionSealBody,
  hashTransitionReceipt,
  verifyTransitionReceipt,
  buildTransitionReceipt,
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
  createMissionLifecyclePolicyGate,
  _resetReceiptSeqForTests
};

/**
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {boolean} [opts.throwOnDeny]
 * @returns {object}
 */
export function createMissionLifecycleStateMachine(opts = {}) {
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const throwOnDeny = opts.throwOnDeny === true;

  /** @type {Map<string, string>} missionId → current state */
  const states = new Map();
  /** @type {Map<string, object[]>} missionId → sealed receipts (chronological) */
  const histories = new Map();
  /** @type {Map<string, string|null>} missionId → last receiptHash */
  const lastHashes = new Map();

  let transitionCount = 0;
  let denyCount = 0;
  let okCount = 0;

  const gate = createMissionLifecyclePolicyGate();

  /**
   * Ensure a mission exists in-memory (defaults to PROPOSED if first seen
   * without fromState tracking conflict — caller still must pass fromState).
   * @param {string} missionId
   * @param {string} [initial]
   */
  function ensureMission(missionId, initial = BH_STATES.PROPOSED) {
    if (!states.has(missionId)) {
      states.set(missionId, initial);
      histories.set(missionId, []);
      lastHashes.set(missionId, null);
    }
  }

  /**
   * @param {string} missionId
   * @returns {object[]}
   */
  function getHistory(missionId) {
    if (missionId == null || String(missionId).trim() === '') return [];
    const id = String(missionId);
    const h = histories.get(id);
    return h ? h.slice() : [];
  }

  /**
   * @param {string} missionId
   * @returns {string|null}
   */
  function getMissionState(missionId) {
    if (missionId == null || String(missionId).trim() === '') return null;
    return states.get(String(missionId)) ?? null;
  }

  /**
   * @param {string} missionId
   * @returns {string|null}
   */
  function getLastReceiptHash(missionId) {
    if (missionId == null || String(missionId).trim() === '') return null;
    return lastHashes.get(String(missionId)) ?? null;
  }

  /**
   * Seed / register a mission at a given state without a transition
   * (hermetic test helper / bootstrap). Does not emit a receipt.
   * @param {string} missionId
   * @param {string} [state]
   */
  function registerMission(missionId, state = BH_STATES.PROPOSED) {
    const id = String(missionId || '').trim();
    if (!id) return { ok: false, code: BH_CODES.EMPTY_MISSION_ID };
    if (!isKnownState(state)) {
      return { ok: false, code: BH_CODES.INVALID_STATE };
    }
    states.set(id, String(state));
    if (!histories.has(id)) histories.set(id, []);
    if (!lastHashes.has(id)) lastHashes.set(id, null);
    return { ok: true, code: BH_CODES.OK, state: String(state) };
  }

  /**
   * Append a sealed receipt to history (both OK and DENY).
   * @param {string} missionId
   * @param {object} receipt
   * @param {boolean} advanced — whether state advanced
   */
  function recordReceipt(missionId, receipt, advanced) {
    ensureMission(missionId);
    const hist = histories.get(missionId) || [];
    hist.push(receipt);
    histories.set(missionId, hist);
    if (advanced && receipt.ok && receipt.receiptHash) {
      lastHashes.set(missionId, receipt.receiptHash);
      states.set(missionId, receipt.toState);
    }
  }

  /**
   * @param {object} req
   * @returns {object}
   */
  function transition(req = {}) {
    transitionCount += 1;

    const missionIdRaw =
      req && req.missionId != null ? String(req.missionId).trim() : '';

    // Tracked state (if any) for STATE_MISMATCH / chain hints
    const tracked =
      missionIdRaw && states.has(missionIdRaw)
        ? states.get(missionIdRaw)
        : null;

    const decision = gateTransition(req, { currentState: tracked });

    const fromState =
      req && req.fromState != null ? String(req.fromState) : null;
    const toState =
      req && req.toState != null ? String(req.toState) : null;
    const evidenceHash =
      req && req.evidenceHash != null && String(req.evidenceHash).length > 0
        ? String(req.evidenceHash)
        : null;

    // Chain: prefer explicit prevReceiptHash; else last known for mission
    let prevReceiptHash =
      req && req.prevReceiptHash != null && String(req.prevReceiptHash).length > 0
        ? String(req.prevReceiptHash)
        : null;
    if (
      prevReceiptHash == null &&
      missionIdRaw &&
      lastHashes.has(missionIdRaw)
    ) {
      prevReceiptHash = lastHashes.get(missionIdRaw) || null;
    }

    if (!decision.ok) {
      denyCount += 1;
      const receipt = buildTransitionReceipt(
        {
          ok: false,
          deny: true,
          denied: true,
          code: decision.code,
          status: 'DENY',
          missionId: missionIdRaw || null,
          fromState,
          toState,
          evidenceHash,
          prevReceiptHash,
          reason: decision.reason
        },
        { now: nowFn, hash: hashFn }
      );

      if (missionIdRaw) {
        // Ensure history exists even on DENY for empty-id we skip
        ensureMission(
          missionIdRaw,
          fromState && isKnownState(fromState)
            ? fromState
            : BH_STATES.PROPOSED
        );
        // Do NOT advance state on DENY
        const hist = histories.get(missionIdRaw) || [];
        hist.push(receipt);
        histories.set(missionIdRaw, hist);
      }

      const result = {
        ok: false,
        allow: false,
        deny: true,
        denied: true,
        code: decision.code,
        reason: decision.reason,
        receipt,
        state: missionIdRaw ? states.get(missionIdRaw) ?? null : null,
        PRODUCTION_READY: BH_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true,
        kind: BH_KIND
      };

      if (throwOnDeny) {
        const err = new MissionLifecycleError(decision.reason || decision.code, result);
        throw err;
      }
      return result;
    }

    // ALLOW path
    okCount += 1;
    const id = missionIdRaw;
    ensureMission(
      id,
      fromState && isKnownState(fromState) ? fromState : BH_STATES.PROPOSED
    );

    const receipt = buildTransitionReceipt(
      {
        ok: true,
        deny: false,
        denied: false,
        code: BH_CODES.TRANSITION_OK,
        status: 'OK',
        missionId: id,
        fromState,
        toState,
        evidenceHash,
        prevReceiptHash,
        reason: null
      },
      { now: nowFn, hash: hashFn }
    );

    recordReceipt(id, receipt, true);

    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BH_CODES.TRANSITION_OK,
      reason: null,
      receipt,
      state: toState,
      PRODUCTION_READY: BH_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BH_KIND
    };
  }

  function health() {
    return {
      kind: BH_KIND,
      PRODUCTION_READY: BH_PRODUCTION_READY,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      jiraPmSaas: false,
      distributedConsensus: false,
      multiRegion: false,
      productionReadyYes: false,
      cloudAgent: false,
      usesCloudAgent: false,
      notBi: true,
      notBj: true,
      notBk: true,
      notBl: true,
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
      bhInProgress: true,
      biPending: true,
      bjPending: true,
      bkPending: true,
      blPending: true,
      states: { ...BH_STATES },
      terminalState: BH_TERMINAL_STATE,
      hermetic: true
    };
  }

  function getState() {
    return {
      kind: BH_KIND,
      PRODUCTION_READY: BH_PRODUCTION_READY,
      transitionCount,
      okCount,
      denyCount,
      missionCount: states.size,
      missions: Object.fromEntries(states.entries())
    };
  }

  return {
    kind: BH_KIND,
    PRODUCTION_READY: BH_PRODUCTION_READY,
    codes: BH_CODES,
    states: BH_STATES,
    allowedTransitions: BH_ALLOWED_TRANSITIONS,
    terminalState: BH_TERMINAL_STATE,
    transition,
    getHistory,
    getMissionState,
    getLastReceiptHash,
    registerMission,
    health,
    getState,
    gate,
    // NON-CLAIM surface
    jiraPmSaas: false,
    distributedConsensus: false,
    multiRegion: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    fundacionDelta: 0
  };
}

export class MissionLifecycleError extends Error {
  /**
   * @param {string} message
   * @param {object} [result]
   */
  constructor(message, result = {}) {
    super(message);
    this.name = 'MissionLifecycleError';
    this.result = result;
    this.code = result.code || BH_CODES.DENY;
  }
}

/**
 * Convenience one-shot (stateless factory + transition).
 * @param {object} req
 * @param {object} [opts]
 */
export function transition(req, opts = {}) {
  const sm = createMissionLifecycleStateMachine(opts);
  if (req && req.missionId && req.fromState) {
    sm.registerMission(String(req.missionId), String(req.fromState));
  }
  return sm.transition(req);
}

export default {
  BH_KIND,
  BH_PRODUCTION_READY,
  BH_CODES,
  BH_STATES,
  BH_TERMINAL_STATE,
  BH_ALLOWED_TRANSITIONS,
  MissionLifecycleError,
  createMissionLifecycleStateMachine,
  transition,
  stableStringify,
  sha256Canonical,
  buildTransitionReceipt,
  verifyTransitionReceipt,
  gateTransition
};
