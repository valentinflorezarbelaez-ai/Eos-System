/**
 * @module ingress-quarantine-replay-deny-receipt
 * SPEC-0163 / Mission FA — External Event Ingress Quarantine & Replay-Deny Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     quarantineDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   quarantine,
 *   replayDenyDigest,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l38ReopenRefused,
 *                   l39AutoCloseRefused,
 *                   liveIngressMutationRefused, liveWebhookIngressEndpointRefused,
 *                   wallClockAuthorityRefused, tipRefreshAuthorityRefused,
 *                   rawWebhookSecretMaterialRefused, rawPayloadMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   quarantineHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveIngressMutationRefused: true, liveWebhookIngressEndpointRefused: true,
 *                wallClockAuthorityRefused: true, tipRewriteRefused: true,
 *                tipRefreshAuthorityRefused: true, rawWebhookSecretMaterialRefused: true,
 *                rawPayloadMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, webhookSecretMaterialRefused: true,
 *                quarantineSecretZeroHeld: true,
 *                distinctFromEyIngressRegistry: true,
 *                distinctFromEzWebhookAuthenticity: true,
 *                distinctFromEbDeadLetterQuarantine: true,
 *                distinctFromL36AdmissionBackpressure: true,
 *                distinctFromEuSecretZeroLeakDeny: true,
 *                distinctFromEvHandleLifecycle: true,
 *                distinctFromFbIngressHonesty: true }
 *
 * Freeze soft-observe pin is `3cbb32dc` (EZ merge #538 / tip-refresh #539 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EY ingress registry, EZ webhook authenticity, EB dead-letter quarantine (L34),
 * L36 admission/backpressure, EU secret-zero, EV handle lifecycle.
 * Soft-observe EY ingressId/sourceId + EZ authenticity refs as opaque ids only.
 * Stages (EV/EQ-adapted): QUARANTINE | HOLD | REPLAY_DENY | RELEASE_HOLD | ADMIT.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed ingress quarantine / replay-deny ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live ingress mutation ≠ wall-clock authority ≠ EY/EZ/EB/L36 ports
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FA_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FA_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FA_RECEIPT_KIND = 'eos-ingress-quarantine-replay-deny-receipt';
export const FA_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FA_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FA_OPERATION = 'INGRESS_QUARANTINE_REPLAY_DENY';
export const FA_STAGE_STATES = Object.freeze([
  'QUARANTINE',
  'HOLD',
  'REPLAY_DENY',
  'RELEASE_HOLD',
  'ADMIT'
]);

export const FA_FREEZE_PIN = '3cbb32dcddac5f233038d95f0f9b4c7218f379c2';
export const FA_FREEZE_PIN_SHORT = '3cbb32dc';

export const FA_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ingress Quarantine / Replay-Deny ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live ingress mutation',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 reopen refused',
  'NON-CLAIM: L38 reopen refused',
  'NON-CLAIM: L39 auto-close refused (FB–FC pending)',
  'NON-CLAIM: Live ingress mutation / live webhook ingress endpoint / wall-clock / tip-refresh authority refused',
  'NON-CLAIM: Raw webhook secret / raw payload material refused (Law VI — never seal secrets; opaque ingressId/sourceId + digests + stage only)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EY ingress registry (bind ≠ quarantine/replay-deny)',
  'NON-CLAIM: Distinct from EZ webhook authenticity (verify ≠ quarantine/replay-deny)',
  'NON-CLAIM: Distinct from EB dead-letter quarantine / L36 admission (fold concepts; do NOT reopen L34/L36)',
  'NON-CLAIM: Distinct from EU secret-zero / EV handle lifecycle / FB ingress honesty (FB next)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed ingress quarantine/replay-deny ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FA_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FA_QUARANTINE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveIngressMutationRefused: true,
  liveWebhookIngressEndpointRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawWebhookSecretMaterialRefused: true,
  rawPayloadMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  webhookSecretMaterialRefused: true,
  quarantineSecretZeroHeld: true,
  distinctFromEyIngressRegistry: true,
  distinctFromEzWebhookAuthenticity: true,
  distinctFromEbDeadLetterQuarantine: true,
  distinctFromL36AdmissionBackpressure: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEvHandleLifecycle: true,
  distinctFromFbIngressHonesty: true
});

let _receiptSeq = 0;

export function _resetReceiptSeqForTests() {
  _receiptSeq = 0;
}

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Digests opaque quarantine metadata only (ingressId/sourceId + stage + class) — never secret/raw payload bytes (Law VI).
 * @param {{ ingressId?: string, sourceId?: string, authenticityRef?: string, quarantineClass?: string, desiredStage?: string, observedStage?: string }} meta
 */
export function computeQuarantineDigest(meta = {}) {
  const opaqueOnly = {
    ingressId: meta.ingressId || null,
    sourceId: meta.sourceId || null,
    authenticityRef: meta.authenticityRef || null,
    quarantineClass: meta.quarantineClass || null,
    desiredStage: meta.desiredStage || null,
    observedStage: meta.observedStage ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

/**
 * Digests opaque replay-deny metadata only — never secret/raw payload bytes (Law VI).
 * @param {{ ingressId?: string, sourceId?: string, authenticityRef?: string, desiredStage?: string, observedStage?: string }} meta
 */
export function computeReplayDenyDigest(meta = {}) {
  const opaqueOnly = {
    kind: 'replay-deny',
    ingressId: meta.ingressId || null,
    sourceId: meta.sourceId || null,
    authenticityRef: meta.authenticityRef || null,
    desiredStage: meta.desiredStage || null,
    observedStage: meta.observedStage ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FA_FREEZE_PIN,
    pinShort: FA_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36ReopenRefused: true,
    l37ReopenRefused: true,
    l38ReopenRefused: true,
    l39AutoCloseRefused: true,
    liveIngressMutationRefused: true,
    liveWebhookIngressEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawWebhookSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FA_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true,
    ...opts
  });
}

export function forceQuarantineHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveIngressMutationRefused: true,
    liveWebhookIngressEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawWebhookSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    webhookSecretMaterialRefused: true,
    quarantineSecretZeroHeld: true,
    distinctFromEyIngressRegistry: true,
    distinctFromEzWebhookAuthenticity: true,
    distinctFromEbDeadLetterQuarantine: true,
    distinctFromL36AdmissionBackpressure: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEvHandleLifecycle: true,
    distinctFromFbIngressHonesty: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalIngressQuarantineReplayDenySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    quarantineDigest: receipt.quarantineDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Ingress Quarantine / Replay-Deny Governance Receipt.
 * Never seals secret material — only opaque ingressId / sourceId / authenticityRef / digests / stage.
 * @param {object} input
 * @returns {object}
 */
export function buildIngressQuarantineReplayDenyReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FA-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fa-default');
  const changeId = String(input.changeId || 'eos-ladder-39-mission-fa');
  const decision = FA_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FA_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const quarantine = input.quarantine || null;
  const quarantineDigest =
    input.quarantineDigest ||
    computeQuarantineDigest({
      ingressId: quarantine?.ingressId,
      sourceId: quarantine?.sourceId,
      authenticityRef: quarantine?.authenticityRef,
      quarantineClass: quarantine?.quarantineClass,
      desiredStage: quarantine?.desiredStage,
      observedStage: quarantine?.observedStage
    });
  const replayDenyDigest =
    input.replayDenyDigest ||
    computeReplayDenyDigest({
      ingressId: quarantine?.ingressId,
      sourceId: quarantine?.sourceId,
      authenticityRef: quarantine?.authenticityRef,
      desiredStage: quarantine?.desiredStage,
      observedStage: quarantine?.observedStage
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FA_OPERATION,
    planId,
    decision,
    changeId,
    quarantineDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FA_RECEIPT_KIND,
    receiptId,
    operation: FA_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    quarantineDigest,
    replayDenyDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    quarantine,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    quarantineHold: forceQuarantineHold(input.quarantineHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyIngressQuarantineReplayDenyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FA_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FA_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FA_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalIngressQuarantineReplayDenySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
