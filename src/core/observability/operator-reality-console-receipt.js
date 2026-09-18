/**
 * @module operator-reality-console-receipt
 * SPEC-0088 / Mission CE — Sovereign Operator Reality Console Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, consoleId, decision, snapshotAt,
 *     entryCount, timestamp, fundacionDelta, prevReceiptHash }
 *
 * NON-CLAIM:
 *   Operator reality console ≠ full SIEM/APM /
 *   ≠ production ops center /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L23 CLOSED never reopen;
 *   L24 OPEN (Audit + CB+CC+CD MEASURED · CE in progress · CF pending);
 *   Axis: Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/observability.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CE_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CE_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CE_RECEIPT_KIND = 'eos-operator-reality-console-receipt';

/** Allowed epistemic statuses for console entries. */
export const CE_STATUS = Object.freeze({
  MEASURED: 'MEASURED',
  UNKNOWN: 'UNKNOWN',
  BLOCKED: 'BLOCKED'
});

/**
 * Stable JSON stringify (sorted keys) for deterministic digests.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(/** @type {Record<string, unknown>} */ (value)[k]);
  }
  return out;
}

/**
 * sha256 hex digest of canonical payload (node:crypto).
 * @param {unknown} payload
 * @returns {string}
 */
export function sha256Canonical(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Alias used by injectable hash opts. */
export function defaultHash(payload) {
  return sha256Canonical(payload);
}

let _rcptSeq = 0;

/**
 * Reset in-process receipt sequence (tests only).
 */
export function _resetReceiptSeqForTests() {
  _rcptSeq = 0;
}

/**
 * Normalize a console entry for sealing / display.
 * @param {object} entry
 * @returns {{ ladder: string, satellite: string|null, status: string, evidenceRef: string|null }}
 */
export function normalizeConsoleEntry(entry = {}) {
  return {
    ladder: entry.ladder != null ? String(entry.ladder) : '',
    satellite:
      entry.satellite != null && entry.satellite !== ''
        ? String(entry.satellite)
        : null,
    status: entry.status != null ? String(entry.status) : '',
    evidenceRef:
      entry.evidenceRef != null && entry.evidenceRef !== ''
        ? String(entry.evidenceRef)
        : null
  };
}

/**
 * Aggregate MEASURED / UNKNOWN / BLOCKED counts from entries.
 * @param {Array<object>} entries
 * @returns {{ measured: number, unknown: number, blocked: number, total: number }}
 */
export function aggregateStatusCounts(entries = []) {
  let measured = 0;
  let unknown = 0;
  let blocked = 0;
  for (const raw of entries) {
    const status = raw?.status != null ? String(raw.status) : '';
    if (status === CE_STATUS.MEASURED) measured += 1;
    else if (status === CE_STATUS.UNKNOWN) unknown += 1;
    else if (status === CE_STATUS.BLOCKED) blocked += 1;
  }
  return {
    measured,
    unknown,
    blocked,
    total: entries.length
  };
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalOperatorRealityConsoleSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    consoleId: fields.consoleId != null ? String(fields.consoleId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    snapshotAt: fields.snapshotAt != null ? String(fields.snapshotAt) : null,
    entryCount:
      fields.entryCount != null && Number.isFinite(Number(fields.entryCount))
        ? Number(fields.entryCount)
        : 0,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receiptHash over the canonical nine fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashOperatorRealityConsoleReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalOperatorRealityConsoleSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyOperatorRealityConsoleReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CE_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CE_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CE-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CE-RCPT-' };
  }

  const expectedHash = hashOperatorRealityConsoleReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CE-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildOperatorRealityConsoleReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const snapshotAt = fields.snapshotAt || ts;
  const receiptId =
    fields.receiptId ||
    `CE-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const entries = Array.isArray(fields.entries)
    ? fields.entries.map((e) => Object.freeze(normalizeConsoleEntry(e)))
    : [];
  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];
  const summary =
    fields.summary && typeof fields.summary === 'object'
      ? {
          measured: Number(fields.summary.measured) || 0,
          unknown: Number(fields.summary.unknown) || 0,
          blocked: Number(fields.summary.blocked) || 0,
          total:
            fields.summary.total != null
              ? Number(fields.summary.total) || 0
              : entries.length
        }
      : aggregateStatusCounts(entries);

  const body = canonicalOperatorRealityConsoleSealBody({
    receiptId,
    operation: fields.operation || 'SNAPSHOT',
    consoleId: fields.consoleId || null,
    decision: fields.decision || 'VIEW',
    snapshotAt,
    entryCount:
      fields.entryCount != null ? fields.entryCount : entries.length,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CE_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    entries: Object.freeze([...entries]),
    summary: Object.freeze({ ...summary }),
    reasons: Object.freeze([...reasons]),
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      fullSiemApm: false,
      productionOpsCenter: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CE_PRODUCTION_READY,
  CE_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CE_RECEIPT_KIND,
  CE_STATUS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeConsoleEntry,
  aggregateStatusCounts,
  canonicalOperatorRealityConsoleSealBody,
  hashOperatorRealityConsoleReceipt,
  verifyOperatorRealityConsoleReceipt,
  buildOperatorRealityConsoleReceipt,
  _resetReceiptSeqForTests
};
