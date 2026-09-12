/**
 * @module evidence-cost-tracker
 * SPEC-0041 / Mission AJ — thin cost-attribution helper for the
 * Evidence Economy Ledger. Observe-only counters (tokens / cost units).
 *
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM:
 *   multi-session cost tracking ≠ billing product
 *   EVD ledger ≠ external audit platform
 *   EVD ledger ≠ compliance certification
 *   EVD ledger ≠ PRODUCTION_READY
 *   not a second competing custody core (ADR-0015 HashChainedLedger)
 *   not AK / AL / AM
 *   Fundacion Δ=0
 */

/** @type {'NO'} */
export const AJ_COST_PRODUCTION_READY = 'NO';

export const AJ_COST_KIND = 'eos-evidence-cost-tracker';

/**
 * Pull numeric cost fields from an EVD entry or meter sample.
 * @param {object|null|undefined} entry
 * @returns {{ tokens: number, costUnits: number }}
 */
export function extractEntryCost(entry) {
  if (entry == null || typeof entry !== 'object') {
    return { tokens: 0, costUnits: 0 };
  }
  const c = entry.cost && typeof entry.cost === 'object' ? entry.cost : entry;
  const tokens = toNonNegNumber(
    c.tokens ?? c.totalTokens ?? c.tokensUsed ?? entry.tokens
  );
  const costUnits = toNonNegNumber(
    c.costUnits ?? c.costUsed ?? c.units ?? entry.costUnits
  );
  return { tokens, costUnits };
}

/**
 * @param {unknown} n
 * @returns {number}
 */
function toNonNegNumber(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

/**
 * @param {object} [filter]
 * @param {object} entry
 * @returns {boolean}
 */
export function matchesCostFilter(entry, filter) {
  if (!filter || typeof filter !== 'object') return true;
  if (filter.missionId != null && entry.missionId !== filter.missionId) {
    return false;
  }
  if (filter.sessionId != null && entry.sessionId !== filter.sessionId) {
    return false;
  }
  if (filter.kind != null && entry.kind !== filter.kind) {
    return false;
  }
  return true;
}

/**
 * Sum costs over a list of entries (observe-only).
 * @param {object[]} entries
 * @param {object} [filter]
 */
export function sumCosts(entries, filter) {
  const list = Array.isArray(entries) ? entries : [];
  const bySession = Object.create(null);
  const byMission = Object.create(null);
  const byKind = Object.create(null);
  let totalTokens = 0;
  let totalCostUnits = 0;
  let entryCount = 0;

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    if (!matchesCostFilter(entry, filter)) continue;
    const { tokens, costUnits } = extractEntryCost(entry);
    totalTokens += tokens;
    totalCostUnits += costUnits;
    entryCount += 1;

    const sid = entry.sessionId == null ? '_none' : String(entry.sessionId);
    const mid = entry.missionId == null ? '_none' : String(entry.missionId);
    const k = entry.kind == null ? '_none' : String(entry.kind);

    bump(bySession, sid, tokens, costUnits);
    bump(byMission, mid, tokens, costUnits);
    bump(byKind, k, tokens, costUnits);
  }

  return {
    ok: true,
    observeOnly: true,
    PRODUCTION_READY: AJ_COST_PRODUCTION_READY,
    kind: AJ_COST_KIND,
    entryCount,
    totalTokens,
    totalCostUnits,
    bySession,
    byMission,
    byKind,
    nonClaim: {
      costTrackingNotBillingProduct: true,
      evdLedgerNotProductionReady: true
    }
  };
}

/**
 * @param {Record<string, { tokens: number, costUnits: number, count: number }>} bag
 * @param {string} key
 * @param {number} tokens
 * @param {number} costUnits
 */
function bump(bag, key, tokens, costUnits) {
  if (!bag[key]) {
    bag[key] = { tokens: 0, costUnits: 0, count: 0 };
  }
  bag[key].tokens += tokens;
  bag[key].costUnits += costUnits;
  bag[key].count += 1;
}

/**
 * Create a thin observe-only cost attribution tracker.
 *
 * @param {object} [options]
 * @param {object[]} [options.records] — injectable backing list
 */
export function createEvidenceCostTracker(options = {}) {
  /** @type {object[]} */
  const records = Array.isArray(options.records) ? options.records : [];

  /**
   * @param {object} item
   */
  function record(item) {
    if (item == null || typeof item !== 'object') {
      return {
        ok: false,
        allow: false,
        code: 'INVALID_ENTRY',
        PRODUCTION_READY: AJ_COST_PRODUCTION_READY
      };
    }
    const { tokens, costUnits } = extractEntryCost(item);
    const row = {
      at: item.at || null,
      missionId: item.missionId != null ? String(item.missionId) : null,
      sessionId: item.sessionId != null ? String(item.sessionId) : null,
      kind: item.kind != null ? String(item.kind) : null,
      tokens,
      costUnits,
      PRODUCTION_READY: AJ_COST_PRODUCTION_READY
    };
    records.push(row);
    return { ok: true, allow: true, recorded: row };
  }

  /**
   * @param {object} [filter]
   */
  function totals(filter) {
    return sumCosts(records, filter);
  }

  return {
    kind: AJ_COST_KIND,
    PRODUCTION_READY: AJ_COST_PRODUCTION_READY,
    observeOnly: true,
    record,
    totals,
    /** @internal */
    _records: records
  };
}

export default createEvidenceCostTracker;
