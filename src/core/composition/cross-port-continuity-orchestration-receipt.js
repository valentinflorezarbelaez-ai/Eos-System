/**
 * @module cross-port-continuity-orchestration-receipt
 * SPEC-0106 / Mission CW — Cross-Port Continuity Orchestration Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     continuityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * NON-CLAIM:
 *   Cross-Port Continuity Orchestration Port ≠ GHE / ≠ CU rewrite /
 *   ≠ L27 reopen / ≠ PRODUCTION_READY / ≠ L28 closeout /
 *   ≠ tip rewrite / ≠ tip-refresh / ≠ CX.
 *   L17–L27 CLOSED never reopen (NEVER reopen L27);
 *   L28 OPEN (Audit MEASURED · CV MEASURED · CW in progress · CX–CZ pending);
 *   Axis: Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CW_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const CW_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CW_RECEIPT_KIND = 'eos-cross-port-continuity-orchestration-receipt';
export const CW_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const CW_ORCHESTRATION_MODES = Object.freeze(['ACTIVE', 'HOLD']);
export const CW_REQUIRED_CONTINUITY_PORTS = Object.freeze(['CQ', 'CR', 'CS', 'CT']);
export const CW_OPTIONAL_OBSERVE_PORTS = Object.freeze(['CU', 'CV']);
export const CW_OBSERVE_PORT_LABELS = Object.freeze(['CQ', 'CR', 'CS', 'CT', 'CU', 'CV']);

/** Freeze honesty pin (CV MEASURED #390). Stays until post-CW tip-refresh. */
export const CW_FREEZE_PIN = 'd86d7525d2a2d4c87c27230b5349b9745bad3c23';
export const CW_FREEZE_PIN_SHORT = 'd86d7525';

export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(value[k]);
  }
  return out;
}

export function sha256Canonical(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
export function defaultHash(payload) {
  return sha256Canonical(payload);
}

let _rcptSeq = 0;
export function _resetReceiptSeqForTests() {
  _rcptSeq = 0;
}

export function normalizeObservePortLabel(label) {
  if (label == null) return null;
  const s = String(label).trim().toUpperCase();
  if (!s) return null;
  const head = s.split(/[:|/.\\s_-]/)[0];
  if (CW_OBSERVE_PORT_LABELS.includes(head)) return head;
  if (CW_OBSERVE_PORT_LABELS.includes(s)) return s;
  return null;
}

export function canonicalCrossPortContinuityOrchestrationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    continuityDigest:
      fields.continuityDigest != null && fields.continuityDigest !== ''
        ? String(fields.continuityDigest)
        : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

export function hashCrossPortContinuityOrchestrationReceipt(
  fields,
  hashFn = sha256Canonical
) {
  return hashFn(canonicalCrossPortContinuityOrchestrationSealBody(fields));
}

export function verifyCrossPortContinuityOrchestrationReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }
  if (receipt.kind !== CW_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CW_RECEIPT_KIND}, got ${receipt.kind}`
    };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }
  if (receipt.fundacionDelta !== 0) {
    return {
      ok: false,
      reason: `fundacionDelta must be 0, got ${receipt.fundacionDelta}`
    };
  }
  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CW-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CW-RCPT-' };
  }
  if (!CW_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CW_DECISIONS.join('|')}`
    };
  }
  const expected = hashCrossPortContinuityOrchestrationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expected) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expected}, got ${receipt.receiptHash}`
    };
  }
  return { ok: true };
}

export function buildCrossPortContinuityOrchestrationReceipt(
  fields = {},
  opts = {}
) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CW-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];
  const orchestrationMode =
    fields.orchestrationMode != null &&
    CW_ORCHESTRATION_MODES.includes(
      String(fields.orchestrationMode).toUpperCase()
    )
      ? String(fields.orchestrationMode).toUpperCase()
      : fields.orchestrationMode != null
        ? String(fields.orchestrationMode)
        : null;

  const refuseCodes = Array.isArray(fields.refuseCodes)
    ? fields.refuseCodes.map((c) => String(c))
    : [];
  const observedPorts = Array.isArray(fields.observedPorts)
    ? fields.observedPorts.map((p) => String(p))
    : [];
  const requiredContinuitySet = Array.isArray(fields.requiredContinuitySet)
    ? fields.requiredContinuitySet.map((p) => String(p))
    : [...CW_REQUIRED_CONTINUITY_PORTS];

  const continuityDigest =
    fields.continuityDigest != null && fields.continuityDigest !== ''
      ? String(fields.continuityDigest)
      : hashFn({
          changeId: fields.changeId || null,
          orchestrationMode,
          observedPorts,
          continuityOk: fields.continuityOk ?? null,
          refuseCodes
        });

  const continuityPlanDigest =
    fields.continuityPlanDigest != null && fields.continuityPlanDigest !== ''
      ? String(fields.continuityPlanDigest)
      : hashFn({
          planId: fields.planId || null,
          changeId: fields.changeId || null,
          continuityDigest,
          orchestrationMode,
          decision: fields.decision || null
        });

  const body = canonicalCrossPortContinuityOrchestrationSealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    changeId: fields.changeId || null,
    continuityDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });
  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CW_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    orchestrationMode,
    phase: fields.phase != null ? String(fields.phase) : null,
    observedPorts: Object.freeze([...observedPorts]),
    requiredContinuitySet: Object.freeze([...requiredContinuitySet]),
    continuityOk:
      fields.continuityOk === true
        ? true
        : fields.continuityOk === false
          ? false
          : null,
    honestyOk:
      fields.honestyOk === true
        ? true
        : fields.honestyOk === false
          ? false
          : null,
    refuseCodes: Object.freeze([...refuseCodes]),
    humanGateHeld: fields.humanGateHeld === true,
    autoSealRefused: fields.autoSealRefused === true,
    autoProductionFlipRefused: fields.autoProductionFlipRefused === true,
    cuRewriteRefused: fields.cuRewriteRefused === true,
    gheClaimRefused: fields.gheClaimRefused === true,
    reasons: Object.freeze([...reasons]),
    continuityPlanDigest,
    meta: Object.freeze({
      freezePin: CW_FREEZE_PIN_SHORT,
      freezePinFull: CW_FREEZE_PIN,
      ...(fields.meta || {})
    }),
    receiptHash,
    nonClaims: Object.freeze({
      productionReadyFlip: false,
      l27Reopen: false,
      tipRewrite: false,
      ghe: false,
      cuRewrite: false,
      fundacionWriteAuth: false,
      fundacionTouch: false,
      productionReady: false,
      l28Closeout: false,
      tipRefresh: false,
      startCX: false,
      autoSealL28: false
    })
  });
}

export default {
  CW_PRODUCTION_READY,
  CW_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CW_RECEIPT_KIND,
  CW_DECISIONS,
  CW_ORCHESTRATION_MODES,
  CW_REQUIRED_CONTINUITY_PORTS,
  CW_OPTIONAL_OBSERVE_PORTS,
  CW_OBSERVE_PORT_LABELS,
  CW_FREEZE_PIN,
  CW_FREEZE_PIN_SHORT,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeObservePortLabel,
  canonicalCrossPortContinuityOrchestrationSealBody,
  hashCrossPortContinuityOrchestrationReceipt,
  verifyCrossPortContinuityOrchestrationReceipt,
  buildCrossPortContinuityOrchestrationReceipt,
  _resetReceiptSeqForTests
};
