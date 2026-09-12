/**
 * @module forensic-timeline-export
 * SPEC-0043 / Mission AL — thin pure helpers for forensic timeline
 * export formatting. No I/O, no mutation, no network.
 *
 * NON-CLAIM:
 *   forensic export ≠ SIEM product
 *   forensic export ≠ billing accuracy
 *   forensic export ≠ PRODUCTION_READY
 *   observe-only; no live state mutation
 *   not AM
 *   Fundacion Δ=0
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AL_EXPORT_PRODUCTION_READY = 'NO';

export const AL_EXPORT_KIND = 'eos-forensic-timeline-export';

/**
 * Stable JSON stringify (sorted keys) for deterministic export digests.
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
 * Normalize a replay cycle into a forensic timeline event.
 * Pure — does not mutate input.
 * @param {object} cycle
 * @param {number} [index]
 * @returns {object}
 */
export function formatTimelineEvent(cycle, index = 0) {
  const c = cycle && typeof cycle === 'object' ? cycle : {};
  return {
    index,
    seq: c.seq != null ? c.seq : index,
    at: c.at != null ? String(c.at) : null,
    sessionId: c.sessionId != null ? String(c.sessionId) : null,
    missionId: c.missionId != null ? String(c.missionId) : null,
    cycleId: c.cycleId != null ? String(c.cycleId) : null,
    outcome: normalizeOutcome(c.outcome ?? c.allow ?? c.code),
    allow: c.allow === true || c.outcome === 'ALLOW' || c.code === 'OK',
    deny: c.deny === true || c.outcome === 'DENY' || (c.ok === false),
    code: c.code != null ? String(c.code) : null,
    kind: c.kind != null ? String(c.kind) : 'cycle',
    digest: c.digest != null ? String(c.digest) : null,
    prevDigest: c.prevDigest != null ? String(c.prevDigest) : null
  };
}

/**
 * @param {unknown} raw
 * @returns {'ALLOW'|'DENY'|'UNKNOWN'}
 */
function normalizeOutcome(raw) {
  if (raw === true || raw === 'ALLOW' || raw === 'OK' || raw === 'allow') {
    return 'ALLOW';
  }
  if (raw === false || raw === 'DENY' || raw === 'deny') {
    return 'DENY';
  }
  if (typeof raw === 'string') {
    const u = raw.toUpperCase();
    if (u === 'ALLOW' || u === 'OK') return 'ALLOW';
    if (u === 'DENY' || u.includes('DENY') || u.includes('ABORT')) return 'DENY';
  }
  return 'UNKNOWN';
}

/**
 * Build a forensic timeline export envelope from cycles.
 * Pure / observe-only — never mutates live autonomy state.
 * @param {object} opts
 * @param {string} [opts.timelineId]
 * @param {object[]} [opts.cycles]
 * @param {string} [opts.at]
 * @param {object} [opts.meta]
 * @returns {object}
 */
export function buildForensicTimelineExport(opts = {}) {
  const cycles = Array.isArray(opts.cycles) ? opts.cycles : [];
  const events = cycles.map((c, i) => formatTimelineEvent(c, i));
  return {
    kind: AL_EXPORT_KIND,
    PRODUCTION_READY: AL_EXPORT_PRODUCTION_READY,
    timelineId: opts.timelineId != null ? String(opts.timelineId) : null,
    at: opts.at != null ? String(opts.at) : null,
    eventCount: events.length,
    events,
    ordering: events.map((e) => e.seq),
    outcomes: events.map((e) => ({
      seq: e.seq,
      outcome: e.outcome,
      allow: e.allow,
      code: e.code
    })),
    observeOnly: true,
    mutatesLiveState: false,
    nonClaim: {
      notSiemProduct: true,
      notBillingAccuracy: true,
      notProductionReady: true,
      observeOnly: true,
      noLiveStateMutation: true,
      notAm: true,
      fundacionDelta0: true
    },
    meta: opts.meta && typeof opts.meta === 'object' ? { ...opts.meta } : {}
  };
}

/**
 * Compact summary line for forensic reports.
 * @param {object} exportEnvelope
 * @returns {string}
 */
export function summarizeForensicExport(exportEnvelope) {
  const e = exportEnvelope && typeof exportEnvelope === 'object' ? exportEnvelope : {};
  const n = typeof e.eventCount === 'number' ? e.eventCount : 0;
  const id = e.timelineId != null ? String(e.timelineId) : 'unknown';
  const allows = Array.isArray(e.outcomes)
    ? e.outcomes.filter((o) => o && o.allow === true).length
    : 0;
  const denys = Array.isArray(e.outcomes)
    ? e.outcomes.filter((o) => o && o.outcome === 'DENY').length
    : 0;
  return `timeline=${id} events=${n} allow=${allows} deny=${denys} PRODUCTION_READY=NO observe-only`;
}

export default {
  AL_EXPORT_KIND,
  AL_EXPORT_PRODUCTION_READY,
  stableStringify,
  formatTimelineEvent,
  buildForensicTimelineExport,
  summarizeForensicExport
};
