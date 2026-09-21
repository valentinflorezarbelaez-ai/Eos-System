/**
 * @module billing-blocked-local-verify-ritual-receipt
 * SPEC-0107 / Mission CX — Billing-Blocked Local Verify Ritual Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     ritualDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   ritualMode (ACTIVE|HOLD),
 *   ciEnvironment { github_actions: BILLING_BLOCKED, local_surrogate: ACTIVE,
 *                   github_actions_verdict: NOT_RUN },
 *   observedPorts[], requiredObserveSet[], localVerifyOk?, honestyOk?,
 *   refuseCodes[], humanGateHeld?, autoSealRefused?, autoProductionFlipRefused?,
 *   ghaGreenClaimRefused?, gheClaimRefused?, reasons[], ritualPlanDigest?, meta?
 *
 * NON-CLAIM:
 *   Billing-Blocked Local Verify Ritual Port ≠ GHA green /
 *   ≠ GHE required-check enforcement /
 *   ≠ PRODUCTION_READY / ≠ L28 closeout /
 *   ≠ tip rewrite / ≠ tip-refresh / ≠ CY /
 *   ≠ L27 reopen / ≠ CQ rewrite.
 *   L17–L27 CLOSED never reopen (NEVER reopen L27);
 *   L28 OPEN (Audit MEASURED · CV MEASURED · CW MEASURED · CX in progress · CY–CZ pending);
 *   Axis: Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Freeze honesty pin stays `97d23ebc` (CW #392 MEASURED) until post-CX tip-refresh.
 * HEAD may be `7e3a9144` (tip-refresh #393) — do NOT tip-refresh from this package.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CX_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const CX_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CX_RECEIPT_KIND = 'eos-billing-blocked-local-verify-ritual-receipt';
export const CX_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const CX_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD']);
export const CX_REQUIRED_OBSERVE_PORTS = Object.freeze(['CQ']);
export const CX_OPTIONAL_OBSERVE_PORTS = Object.freeze([
  'CR',
  'CS',
  'CT',
  'CV',
  'CW'
]);
export const CX_OBSERVE_PORT_LABELS = Object.freeze([
  'CQ',
  'CR',
  'CS',
  'CT',
  'CV',
  'CW'
]);

/** Freeze honesty pin (CW MEASURED #392). Stays until post-CX tip-refresh. */
export const CX_FREEZE_PIN = '97d23ebcabbdaad50406c3ad834ee303710435a1';
export const CX_FREEZE_PIN_SHORT = '97d23ebc';

/**
 * Forced CI environment encoding — never claim GH green.
 * Soft-compose CQ BILLING_BLOCKED honesty (observe labels; do NOT rewrite CQ).
 */
export const CX_CI_ENVIRONMENT_TEMPLATE = Object.freeze({
  github_actions: 'BILLING_BLOCKED',
  local_surrogate: 'ACTIVE',
  github_actions_verdict: 'NOT_RUN',
  note:
    'NON-CLAIM: local verify ritual PASS ≠ GitHub Actions green ≠ GHE ≠ PRODUCTION_READY'
});

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

/**
 * Force BILLING_BLOCKED / ACTIVE / NOT_RUN — refuse GH green overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
export function forceCiEnvironment(overrides = {}) {
  const env = {
    ...CX_CI_ENVIRONMENT_TEMPLATE,
    ...overrides,
    github_actions: 'BILLING_BLOCKED',
    local_surrogate:
      overrides.local_surrogate != null
        ? String(overrides.local_surrogate)
        : 'ACTIVE',
    github_actions_verdict: 'NOT_RUN'
  };

  if (
    overrides.github_actions === 'PASS' ||
    overrides.github_actions === 'GREEN' ||
    overrides.github_actions === 'SUCCESS' ||
    overrides.github_actions_verdict === 'PASS' ||
    overrides.github_actions_verdict === 'GREEN'
  ) {
    env.refusal =
      'REFUSED claim of GitHub Actions green while billing-blocked; forced NOT_RUN';
  }

  return Object.freeze(env);
}

export function normalizeObservePortLabel(label) {
  if (label == null) return null;
  const s = String(label).trim().toUpperCase();
  if (!s) return null;
  const head = s.split(/[:|/.\\s_-]/)[0];
  if (CX_OBSERVE_PORT_LABELS.includes(head)) return head;
  if (CX_OBSERVE_PORT_LABELS.includes(s)) return s;
  return null;
}

export function canonicalBillingBlockedLocalVerifyRitualSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    ritualDigest:
      fields.ritualDigest != null && fields.ritualDigest !== ''
        ? String(fields.ritualDigest)
        : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

export function hashBillingBlockedLocalVerifyRitualReceipt(
  fields,
  hashFn = sha256Canonical
) {
  return hashFn(canonicalBillingBlockedLocalVerifyRitualSealBody(fields));
}

export function verifyBillingBlockedLocalVerifyRitualReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }
  if (receipt.kind !== CX_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CX_RECEIPT_KIND}, got ${receipt.kind}`
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
  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CX-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CX-RCPT-' };
  }
  if (!CX_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CX_DECISIONS.join('|')}`
    };
  }
  const ci = receipt.ciEnvironment;
  if (!ci || typeof ci !== 'object') {
    return { ok: false, reason: 'ciEnvironment must be present' };
  }
  if (ci.github_actions !== 'BILLING_BLOCKED') {
    return {
      ok: false,
      reason: 'ciEnvironment.github_actions must be BILLING_BLOCKED'
    };
  }
  if (ci.github_actions_verdict !== 'NOT_RUN') {
    return {
      ok: false,
      reason: 'ciEnvironment.github_actions_verdict must be NOT_RUN'
    };
  }
  const expected = hashBillingBlockedLocalVerifyRitualReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expected) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expected}, got ${receipt.receiptHash}`
    };
  }
  return { ok: true };
}

export function buildBillingBlockedLocalVerifyRitualReceipt(
  fields = {},
  opts = {}
) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CX-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];
  const ritualMode =
    fields.ritualMode != null &&
    CX_RITUAL_MODES.includes(String(fields.ritualMode).toUpperCase())
      ? String(fields.ritualMode).toUpperCase()
      : fields.ritualMode != null
        ? String(fields.ritualMode)
        : null;

  const refuseCodes = Array.isArray(fields.refuseCodes)
    ? fields.refuseCodes.map((c) => String(c))
    : [];
  const observedPorts = Array.isArray(fields.observedPorts)
    ? fields.observedPorts.map((p) => String(p))
    : [];
  const requiredObserveSet = Array.isArray(fields.requiredObserveSet)
    ? fields.requiredObserveSet.map((p) => String(p))
    : [...CX_REQUIRED_OBSERVE_PORTS];

  const ciEnvironment = forceCiEnvironment(fields.ciEnvironment || {});

  const ritualDigest =
    fields.ritualDigest != null && fields.ritualDigest !== ''
      ? String(fields.ritualDigest)
      : hashFn({
          changeId: fields.changeId || null,
          ritualMode,
          observedPorts,
          localVerifyOk: fields.localVerifyOk ?? null,
          refuseCodes,
          ciEnvironment: {
            github_actions: ciEnvironment.github_actions,
            local_surrogate: ciEnvironment.local_surrogate,
            github_actions_verdict: ciEnvironment.github_actions_verdict
          }
        });

  const ritualPlanDigest =
    fields.ritualPlanDigest != null && fields.ritualPlanDigest !== ''
      ? String(fields.ritualPlanDigest)
      : hashFn({
          planId: fields.planId || null,
          changeId: fields.changeId || null,
          ritualDigest,
          ritualMode,
          decision: fields.decision || null
        });

  const body = canonicalBillingBlockedLocalVerifyRitualSealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    changeId: fields.changeId || null,
    ritualDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });
  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CX_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    ritualMode,
    phase: fields.phase != null ? String(fields.phase) : null,
    ciEnvironment,
    observedPorts: Object.freeze([...observedPorts]),
    requiredObserveSet: Object.freeze([...requiredObserveSet]),
    localVerifyOk:
      fields.localVerifyOk === true
        ? true
        : fields.localVerifyOk === false
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
    ghaGreenClaimRefused: fields.ghaGreenClaimRefused === true,
    gheClaimRefused: fields.gheClaimRefused === true,
    reasons: Object.freeze([...reasons]),
    ritualPlanDigest,
    meta: Object.freeze({
      freezePin: CX_FREEZE_PIN_SHORT,
      freezePinFull: CX_FREEZE_PIN,
      ...(fields.meta || {})
    }),
    receiptHash,
    nonClaims: Object.freeze({
      productionReadyFlip: false,
      l27Reopen: false,
      tipRewrite: false,
      ghe: false,
      ghaGreen: false,
      cqRewrite: false,
      fundacionWriteAuth: false,
      fundacionTouch: false,
      productionReady: false,
      l28Closeout: false,
      tipRefresh: false,
      startCY: false,
      autoSealL28: false
    })
  });
}

export default {
  CX_PRODUCTION_READY,
  CX_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CX_RECEIPT_KIND,
  CX_DECISIONS,
  CX_RITUAL_MODES,
  CX_REQUIRED_OBSERVE_PORTS,
  CX_OPTIONAL_OBSERVE_PORTS,
  CX_OBSERVE_PORT_LABELS,
  CX_CI_ENVIRONMENT_TEMPLATE,
  CX_FREEZE_PIN,
  CX_FREEZE_PIN_SHORT,
  stableStringify,
  sha256Canonical,
  defaultHash,
  forceCiEnvironment,
  normalizeObservePortLabel,
  canonicalBillingBlockedLocalVerifyRitualSealBody,
  hashBillingBlockedLocalVerifyRitualReceipt,
  verifyBillingBlockedLocalVerifyRitualReceipt,
  buildBillingBlockedLocalVerifyRitualReceipt,
  _resetReceiptSeqForTests
};
