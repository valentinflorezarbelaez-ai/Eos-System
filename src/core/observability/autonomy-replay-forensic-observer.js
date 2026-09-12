/**
 * @module autonomy-replay-forensic-observer
 * SPEC-0043 / Mission AL — Autonomy Replay & Forensic Observer.
 *
 * Hermetic, injectable, fail-closed replay observer over AJ-like EVD
 * ledger entries + AI-like session records. Deterministic re-walk of
 * sealed multi-session timelines; reproduces cycle ordering and
 * deny/allow outcomes. Optional AE ECR / cost attribution observe-only.
 *
 * OBSERVE-ONLY / NO LIVE STATE MUTATION:
 *   replay() MUST NOT call ledger.append / sessionStore.save (or any
 *   mutator). Inputs are read via query/load/list/verifyChain and
 *   cloned into a local walk buffer.
 *
 * NON-CLAIM:
 *   autonomy replay ≠ SIEM product
 *   autonomy replay ≠ PRODUCTION_READY cost billing
 *   autonomy replay ≠ billing accuracy
 *   observe-only; no live state mutation of autonomy
 *   not AM
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: detect provider secret material via runtime-synthesized
 * patterns — never embed a static vendor-key prefix literal in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createHash } from 'node:crypto';
import {
  buildForensicTimelineExport,
  formatTimelineEvent,
  stableStringify,
  summarizeForensicExport,
  AL_EXPORT_KIND
} from './forensic-timeline-export.js';

/** @type {'NO'} */
export const AL_PRODUCTION_READY = 'NO';

export const AL_KIND = 'eos-autonomy-replay-forensic-observer';

export const AL_CODES = Object.freeze({
  OK: 'OK',
  REPLAY_ABORT: 'REPLAY_ABORT',
  CHAIN_BROKEN: 'CHAIN_BROKEN',
  INCOMPLETE_INPUTS: 'INCOMPLETE_INPUTS',
  TIMELINE_NOT_FOUND: 'TIMELINE_NOT_FOUND',
  SILENT_GAP_FORBIDDEN: 'SILENT_GAP_FORBIDDEN',
  MISSING_DEP: 'MISSING_DEP',
  FUNDACION_DENY: 'FUNDACION_DENY',
  INVALID_TIMELINE: 'INVALID_TIMELINE'
});

const REDACTED = '[REDACTED]';

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key|provider[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

/**
 * Typed error for Autonomy Replay & Forensic Observer failures.
 */
export class AutonomyReplayForensicObserverError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AL_CODES.REPLAY_ABORT, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'AutonomyReplayForensicObserverError';
    this.code = code;
    this.details = sanitizePayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / exports.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizePayload(obj) {
  return sanitizeDeep(obj, new WeakSet());
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {unknown}
 */
function sanitizeDeep(value, seen) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/^[a-f0-9]{64}$/i.test(value)) return value;
    if (LONG_B64_RE.test(value)) return REDACTED;
    return redactSecretSubstrings(value);
  }
  if (typeof value !== 'object') return value;
  if (seen.has(/** @type {object} */ (value))) return '[Circular]';
  seen.add(/** @type {object} */ (value));

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v, seen));
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|seq|entryCount|totalCostUnits|eventCount|allows|denys|index)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(custodyDigest|snapshotHash|digest|sha256|bodySha256|expectedHash|recomputedHash|expectedDigest|actualDigest|prevDigest|priorTip|tip|replayDigest)$/i.test(
        k
      )
    ) {
      out[k] =
        typeof v === 'string' ? redactSecretSubstrings(v) : sanitizeDeep(v, seen);
      continue;
    }
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * Redact secret-looking substrings. Vendor-style key prefix built at
 * runtime (Law VI — never embed static vendor-key literals).
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(
    `\\b(${vendorPrefix}[A-Za-z0-9]{8,})\\b`,
    'g'
  );
  out = out.replace(vendorRe, REDACTED);
  out = out.replace(
    /\b(api[_-]?key|token|authorization|secret|password)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
    (_m, k) => `${k}=${REDACTED}`
  );
  return out;
}

/**
 * @param {string} message
 * @returns {string}
 */
function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

/**
 * @param {unknown} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const body =
    typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : stableStringify(payload);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {object} obj
 * @returns {boolean}
 */
export function isFundacionTarget(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.fundacionWrite === true) return true;
  if (obj.target === 'fundacion') return true;
  if (obj.path === 'Documents/Fundacion') return true;
  if (typeof obj.path === 'string' && /fundacion/i.test(obj.path)) return true;
  if (typeof obj.targetPath === 'string' && /fundacion/i.test(obj.targetPath)) {
    return true;
  }
  if (typeof obj.exportPath === 'string' && /fundacion/i.test(obj.exportPath)) {
    return true;
  }
  if (typeof obj.custodyTarget === 'string' && /fundacion/i.test(obj.custodyTarget)) {
    return true;
  }
  if (obj.payload && typeof obj.payload === 'object') {
    return isFundacionTarget(obj.payload);
  }
  return false;
}

/**
 * Create the Autonomy Replay & Forensic Observer.
 *
 * @param {object} [options]
 * @param {object} [options.ledger] — AJ-like: { query?, verifyChain?, entries?, append? }
 * @param {object} [options.sessionStore] — AI-like: { load?, list?, getSession?, save? }
 * @param {(payload: any) => string} [options.hash]
 * @param {() => string} [options.now]
 * @param {object|Function} [options.ecrCounters] — AE ECR aggregates (observe-only)
 * @param {object|Function} [options.attributionSource] — alias / extra attribution source
 * @param {boolean} [options.requireLedger=true]
 * @param {boolean} [options.requireSessionStore=true]
 * @param {boolean} [options.attributionObserve=true]
 * @param {(receipt: object) => void} [options.receiptSealer]
 * @param {(receipt: object) => void} [options.onReceipt]
 * @param {boolean} [options.throwOnAbort=false]
 */
export function createAutonomyReplayForensicObserver(options = {}) {
  const depError = resolveDepError(options);

  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;

  const requireLedger = options.requireLedger !== false;
  const requireSessionStore = options.requireSessionStore !== false;
  const attributionObserve = options.attributionObserve !== false;
  const throwOnAbort = options.throwOnAbort === true;

  const ledger = options.ledger != null ? options.ledger : null;
  const sessionStore =
    options.sessionStore != null ? options.sessionStore : null;
  const ecrCounters =
    options.ecrCounters != null ? options.ecrCounters : null;
  const attributionSource =
    options.attributionSource != null ? options.attributionSource : null;

  const onReceipt =
    typeof options.onReceipt === 'function' ? options.onReceipt : null;
  const receiptSealer =
    typeof options.receiptSealer === 'function' ? options.receiptSealer : null;

  /** @type {object[]} */
  const receipts = [];
  let seqReceipt = 0;

  const metrics = {
    replays: 0,
    aborts: 0,
    exports: 0,
    attributions: 0,
    lastCode: null
  };

  /**
   * @param {object} partial
   */
  function emitReceipt(partial) {
    seqReceipt += 1;
    const stamped = partial && partial.at != null ? partial.at : now();
    const receipt = sanitizePayload({
      id: `AL-RCPT-${String(seqReceipt).padStart(4, '0')}`,
      at: stamped,
      kind: AL_KIND,
      PRODUCTION_READY: AL_PRODUCTION_READY,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      observeOnly: true,
      mutatesLiveState: false,
      ...partial
    });
    receipts.push(receipt);
    if (receipts.length > 200) receipts.shift();
    if (receiptSealer) {
      try {
        receiptSealer(receipt);
      } catch {
        /* sealer faults must not crash observer */
      }
    }
    if (onReceipt) {
      try {
        onReceipt(receipt);
      } catch {
        /* observer faults must not crash */
      }
    }
    return receipt;
  }

  /**
   * Seal a forensic receipt (public).
   * @param {object} outcome
   */
  function sealReceipt(outcome = {}) {
    const okFlag = outcome.ok !== false;
    const code = outcome.code || (okFlag ? AL_CODES.OK : AL_CODES.REPLAY_ABORT);
    return emitReceipt({
      ok: okFlag,
      code,
      phase: outcome.phase || (okFlag ? 'SEAL' : 'ABORT'),
      ...outcome
    });
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function abort(code, extra = {}) {
    metrics.aborts += 1;
    metrics.lastCode = code;
    const receipt = emitReceipt({
      ok: false,
      code,
      phase: extra.phase || 'REPLAY_ABORT',
      forensicFailure: true,
      silentGap: false,
      ...omit(extra, ['throw'])
    });
    const result = sanitizePayload({
      ok: false,
      code,
      kind: AL_KIND,
      PRODUCTION_READY: AL_PRODUCTION_READY,
      forensicFailure: true,
      silentGap: false,
      observeOnly: true,
      mutatesLiveState: false,
      receipt,
      ...extra
    });
    if (throwOnAbort || extra.throw === true) {
      throw new AutonomyReplayForensicObserverError(
        extra.message || `REPLAY_ABORT: ${code}`,
        code,
        { receipt, ...extra }
      );
    }
    return result;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function succeed(code, extra = {}) {
    metrics.lastCode = code;
    const receipt =
      extra.seal === false
        ? null
        : emitReceipt({
            ok: true,
            code,
            phase: extra.phase || 'OK',
            ...omit(extra, [
              'seal',
              'cycles',
              'events',
              'timeline',
              'export',
              'sessions',
              'aggregates',
              'outcomes',
              'ordering'
            ])
          });
    return sanitizePayload({
      ok: true,
      code,
      kind: AL_KIND,
      PRODUCTION_READY: AL_PRODUCTION_READY,
      observeOnly: true,
      mutatesLiveState: false,
      receipt,
      ...extra
    });
  }

  /**
   * Guard injectable deps — fail-closed.
   * @param {string} phase
   */
  function checkDeps(phase) {
    if (depError) {
      return abort(AL_CODES.MISSING_DEP, {
        phase,
        dep: depError.dep,
        message: depError.message
      });
    }
    if (requireLedger && !isUsableLedger(ledger)) {
      return abort(AL_CODES.MISSING_DEP, {
        phase,
        dep: 'ledger',
        message: 'ledger injectable required (AJ-like query/verifyChain/entries)'
      });
    }
    if (requireSessionStore && !isUsableSessionStore(sessionStore)) {
      return abort(AL_CODES.MISSING_DEP, {
        phase,
        dep: 'sessionStore',
        message:
          'sessionStore injectable required (AI-like load/list/getSession)'
      });
    }
    return null;
  }

  /**
   * Read ledger entries WITHOUT mutation (query / entries / list only).
   * Never calls append.
   * @param {object} filter
   * @returns {object[]|null}
   */
  function readLedgerEntries(filter) {
    if (!ledger) return null;
    try {
      if (typeof ledger.query === 'function') {
        const q = ledger.query(filter || {});
        if (q && Array.isArray(q.entries)) return q.entries.map((e) => cloneJson(e));
        if (Array.isArray(q)) return q.map((e) => cloneJson(e));
      }
      if (typeof ledger.entries === 'function') {
        const list = ledger.entries();
        if (Array.isArray(list)) return filterEntries(list.map((e) => cloneJson(e)), filter);
      }
      if (Array.isArray(ledger.entries)) {
        return filterEntries(ledger.entries.map((e) => cloneJson(e)), filter);
      }
      if (typeof ledger.list === 'function') {
        const list = ledger.list();
        if (Array.isArray(list)) return filterEntries(list.map((e) => cloneJson(e)), filter);
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Load a session record read-only (load / getSession). Never save.
   * @param {string} sid
   * @returns {object|null}
   */
  function loadSessionRecord(sid) {
    if (!sessionStore || sid == null) return null;
    try {
      if (typeof sessionStore.load === 'function') {
        const r = sessionStore.load(String(sid));
        if (r && typeof r === 'object') return cloneJson(r);
      }
      if (typeof sessionStore.getSession === 'function') {
        const r = sessionStore.getSession(String(sid));
        if (r && r.ok === false) return null;
        if (r && r.session) return cloneJson(r.session);
        if (r && typeof r === 'object' && r.sessionId) return cloneJson(r);
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Fail-closed input verification before replay.
   * IF incomplete or chain-broken → abort (no silent gaps).
   * @param {string|object} [timelineIdOrFilter]
   */
  function verifyReplayInputs(timelineIdOrFilter) {
    const blocked = checkDeps('VERIFY_INPUTS');
    if (blocked) return blocked;

    const filter = normalizeFilter(timelineIdOrFilter);

    if (filter.invalid === true) {
      return abort(AL_CODES.INVALID_TIMELINE, {
        phase: 'VERIFY_INPUTS',
        message: 'invalid timeline filter'
      });
    }

    if (isFundacionTarget(filter)) {
      return abort(AL_CODES.FUNDACION_DENY, {
        phase: 'VERIFY_INPUTS',
        message:
          'Fundacion ALWAYS DENY — export/replay target must not be Fundacion path'
      });
    }

    if (ledger && typeof ledger.verifyChain === 'function') {
      let chainResult;
      try {
        chainResult = ledger.verifyChain();
      } catch (err) {
        return abort(AL_CODES.CHAIN_BROKEN, {
          phase: 'VERIFY_INPUTS',
          message: sanitizeErrorMessage(
            err?.message || 'verifyChain threw — chain broken'
          )
        });
      }
      if (!chainResult || chainResult.ok !== true) {
        return abort(AL_CODES.CHAIN_BROKEN, {
          phase: 'VERIFY_INPUTS',
          chainCode: (chainResult && (chainResult.code || chainResult.denyCode)) || null,
          message:
            (chainResult && chainResult.message) ||
            'ledger chain broken — abort replay (no silent gaps)',
          silentGapForbidden: true
        });
      }
    }

    const entries = readLedgerEntries(filter);
    if (entries == null) {
      return abort(AL_CODES.INCOMPLETE_INPUTS, {
        phase: 'VERIFY_INPUTS',
        message: 'unable to read ledger entries — incomplete inputs',
        silentGapForbidden: true
      });
    }

    if (filter.timelineId || filter.missionId || filter.sessionId) {
      if (entries.length === 0) {
        return abort(AL_CODES.TIMELINE_NOT_FOUND, {
          phase: 'VERIFY_INPUTS',
          timelineId: filter.timelineId || null,
          missionId: filter.missionId || null,
          sessionId: filter.sessionId || null,
          message: 'sealed timeline not found for filter'
        });
      }
    }

    const gap = detectSilentGap(entries);
    if (gap) {
      return abort(AL_CODES.SILENT_GAP_FORBIDDEN, {
        phase: 'VERIFY_INPUTS',
        ...gap,
        message:
          gap.message ||
          'silent gap detected in sealed timeline — abort (no silent gaps)'
      });
    }

    const sessionIds = collectSessionIds(entries, filter);
    const missingSessions = [];
    for (const sid of sessionIds) {
      const rec = loadSessionRecord(sid);
      if (!rec) missingSessions.push(sid);
    }
    if (missingSessions.length > 0) {
      return abort(AL_CODES.INCOMPLETE_INPUTS, {
        phase: 'VERIFY_INPUTS',
        missingSessions,
        message:
          'session records incomplete for sealed timeline — abort (no silent gaps)',
        silentGapForbidden: true
      });
    }

    if (filter.requireSealed === true) {
      const unsealed = entries.filter(
        (e) => e && e.sealed !== true && e.seal !== true && !e.digest
      );
      if (unsealed.length > 0) {
        return abort(AL_CODES.INCOMPLETE_INPUTS, {
          phase: 'VERIFY_INPUTS',
          message: 'timeline entries not sealed — incomplete inputs',
          unsealedCount: unsealed.length
        });
      }
    }

    return succeed(AL_CODES.OK, {
      phase: 'VERIFY_INPUTS',
      entryCount: entries.length,
      sessionCount: sessionIds.length,
      timelineId: filter.timelineId || null,
      message: 'replay inputs verified — chain intact, no silent gaps'
    });
  }

  /**
   * Deterministic hermetic replay of a sealed multi-session timeline.
   * Reproduces cycle ordering + allow/deny outcomes.
   * MUST NOT mutate ledger / sessionStore live state.
   * @param {string|object} [timelineIdOrFilter]
   */
  function replay(timelineIdOrFilter) {
    metrics.replays += 1;

    const blocked = checkDeps('REPLAY');
    if (blocked) return blocked;

    const filter = normalizeFilter(timelineIdOrFilter);

    if (filter.invalid === true) {
      return abort(AL_CODES.INVALID_TIMELINE, {
        phase: 'REPLAY',
        message: 'invalid timeline filter'
      });
    }

    if (isFundacionTarget(filter)) {
      return abort(AL_CODES.FUNDACION_DENY, {
        phase: 'REPLAY',
        message: 'Fundacion ALWAYS DENY — replay target must not be Fundacion'
      });
    }

    const verified = verifyReplayInputs(filter);
    if (!verified.ok) {
      return sanitizePayload({
        ...verified,
        replayAborted: true,
        phase: verified.phase || 'REPLAY',
        abortCode: AL_CODES.REPLAY_ABORT
      });
    }

    const entries = readLedgerEntries(filter);
    if (!entries || entries.length === 0) {
      return abort(AL_CODES.TIMELINE_NOT_FOUND, {
        phase: 'REPLAY',
        message: 'no sealed timeline entries to replay'
      });
    }

    /** @type {object[]} */
    const walk = [];
    try {
      for (let i = 0; i < entries.length; i += 1) {
        const entry = cloneJson(entries[i]);
        const cycle = entryToCycle(entry, i);
        if (i > 0) {
          const prev = walk[i - 1];
          if (
            typeof cycle.seq === 'number' &&
            typeof prev.seq === 'number' &&
            cycle.seq < prev.seq
          ) {
            return abort(AL_CODES.SILENT_GAP_FORBIDDEN, {
              phase: 'REPLAY',
              index: i,
              message: 'cycle ordering regression during re-walk — abort'
            });
          }
          if (
            cycle.prevDigest != null &&
            prev.digest != null &&
            cycle.prevDigest !== prev.digest
          ) {
            return abort(AL_CODES.CHAIN_BROKEN, {
              phase: 'REPLAY',
              index: i,
              message: 'prevDigest mismatch during re-walk — chain broken'
            });
          }
        }
        walk.push(cycle);
      }
    } catch (err) {
      return abort(AL_CODES.REPLAY_ABORT, {
        phase: 'REPLAY',
        message: sanitizeErrorMessage(err?.message || 'replay walk failed')
      });
    }

    /** @type {Record<string, object>} */
    const sessions = {};
    for (const sid of collectSessionIds(entries, filter)) {
      const rec = loadSessionRecord(sid);
      if (rec) sessions[sid] = cloneJson(rec);
    }

    const ordering = walk.map((c) => c.seq);
    const outcomes = walk.map((c) => ({
      seq: c.seq,
      outcome: c.outcome,
      allow: c.allow,
      deny: c.deny,
      code: c.code,
      sessionId: c.sessionId
    }));

    const replayDigest = hashFn({
      timelineId: filter.timelineId || null,
      ordering,
      outcomes: outcomes.map((o) => ({
        seq: o.seq,
        outcome: o.outcome,
        code: o.code
      }))
    });

    return succeed(AL_CODES.OK, {
      phase: 'REPLAY',
      timelineId: filter.timelineId || deriveTimelineId(filter, walk),
      cycleCount: walk.length,
      ordering,
      outcomes,
      cycles: walk,
      sessions,
      replayDigest,
      mutatesLiveState: false,
      observeOnly: true,
      message: 'hermetic replay reproduced cycle ordering and deny/allow outcomes'
    });
  }

  /**
   * Post-mortem forensic timeline export (observe-only).
   * @param {string|object} [timelineIdOrFilter]
   * @param {object} [exportOpts]
   */
  function exportForensicTimeline(timelineIdOrFilter, exportOpts = {}) {
    metrics.exports += 1;

    const blocked = checkDeps('EXPORT');
    if (blocked) return blocked;

    const filter = normalizeFilter(timelineIdOrFilter);
    const opts =
      exportOpts && typeof exportOpts === 'object' ? exportOpts : {};

    if (isFundacionTarget(filter) || isFundacionTarget(opts)) {
      return abort(AL_CODES.FUNDACION_DENY, {
        phase: 'EXPORT',
        message:
          'Fundacion ALWAYS DENY — forensic export target must not be Fundacion path'
      });
    }

    const replayed = replay(filter);
    if (!replayed.ok) {
      return sanitizePayload({
        ...replayed,
        phase: 'EXPORT',
        exportAborted: true
      });
    }

    const envelope = buildForensicTimelineExport({
      timelineId: replayed.timelineId,
      cycles: replayed.cycles || [],
      at: now(),
      meta: {
        replayDigest: replayed.replayDigest,
        sessionIds: Object.keys(replayed.sessions || {}),
        exportKind: AL_EXPORT_KIND,
        ...((opts.meta && typeof opts.meta === 'object') ? opts.meta : {})
      }
    });

    const summary = summarizeForensicExport(envelope);

    return succeed(AL_CODES.OK, {
      phase: 'EXPORT',
      timelineId: envelope.timelineId,
      export: envelope,
      summary,
      eventCount: envelope.eventCount,
      mutatesLiveState: false,
      observeOnly: true,
      message: 'forensic timeline export sealed (observe-only)'
    });
  }

  /**
   * Optional AE ECR / cost attribution aggregation — observe-only.
   * Does NOT claim billing accuracy or PRODUCTION_READY.
   * @param {object} [filter]
   */
  function observeAttribution(filter = {}) {
    metrics.attributions += 1;

    const blocked = checkDeps('ATTRIBUTION');
    if (blocked) return blocked;

    if (!attributionObserve) {
      return succeed(AL_CODES.OK, {
        phase: 'ATTRIBUTION',
        enabled: false,
        aggregates: null,
        billingClaim: false,
        PRODUCTION_READY: AL_PRODUCTION_READY,
        message: 'attribution observe mode disabled'
      });
    }

    const f = filter && typeof filter === 'object' ? filter : {};
    if (isFundacionTarget(f)) {
      return abort(AL_CODES.FUNDACION_DENY, {
        phase: 'ATTRIBUTION',
        message: 'Fundacion ALWAYS DENY on attribution observe target'
      });
    }

    /** @type {object} */
    let aggregates = {
      tokens: 0,
      costUnits: 0,
      bySession: {},
      byMission: {},
      byKind: {},
      entryCount: 0
    };

    const fromEcr = readEcrAggregates(ecrCounters, f);
    const fromAttr = readEcrAggregates(attributionSource, f);
    if (fromEcr) aggregates = mergeAggregates(aggregates, fromEcr);
    if (fromAttr) aggregates = mergeAggregates(aggregates, fromAttr);

    const entries = readLedgerEntries(f) || [];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const cost =
        entry.cost && typeof entry.cost === 'object' ? entry.cost : entry;
      const tokens = Number(cost.tokens || cost.totalTokens || 0) || 0;
      const costUnits = Number(cost.costUnits || cost.totalCostUnits || 0) || 0;
      aggregates.tokens += tokens;
      aggregates.costUnits += costUnits;
      aggregates.entryCount += 1;
      const sid = entry.sessionId != null ? String(entry.sessionId) : '_none';
      const mid = entry.missionId != null ? String(entry.missionId) : '_none';
      const kind = entry.kind != null ? String(entry.kind) : 'evd';
      aggregates.bySession[sid] = aggregates.bySession[sid] || {
        tokens: 0,
        costUnits: 0,
        count: 0
      };
      aggregates.bySession[sid].tokens += tokens;
      aggregates.bySession[sid].costUnits += costUnits;
      aggregates.bySession[sid].count += 1;
      aggregates.byMission[mid] = aggregates.byMission[mid] || {
        tokens: 0,
        costUnits: 0,
        count: 0
      };
      aggregates.byMission[mid].tokens += tokens;
      aggregates.byMission[mid].costUnits += costUnits;
      aggregates.byMission[mid].count += 1;
      aggregates.byKind[kind] = aggregates.byKind[kind] || {
        tokens: 0,
        costUnits: 0,
        count: 0
      };
      aggregates.byKind[kind].tokens += tokens;
      aggregates.byKind[kind].costUnits += costUnits;
      aggregates.byKind[kind].count += 1;
    }

    return succeed(AL_CODES.OK, {
      phase: 'ATTRIBUTION',
      enabled: true,
      aggregates: sanitizePayload(aggregates),
      billingClaim: false,
      billingAccuracy: false,
      PRODUCTION_READY: AL_PRODUCTION_READY,
      observeOnly: true,
      mutatesLiveState: false,
      nonClaim: {
        notBillingAccuracy: true,
        notProductionReady: true,
        notSiemProduct: true,
        observeOnly: true
      },
      message:
        'attribution observe aggregates (AE ECR style) — NOT billing accuracy / NOT PRODUCTION_READY'
    });
  }

  function health() {
    return sanitizePayload({
      ok: true,
      kind: AL_KIND,
      PRODUCTION_READY: AL_PRODUCTION_READY,
      metrics: { ...metrics },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      observeOnly: true,
      mutatesLiveState: false,
      hasLedger: isUsableLedger(ledger),
      hasSessionStore: isUsableSessionStore(sessionStore),
      attributionObserve,
      nonClaim: {
        notSiemProduct: true,
        notBillingAccuracy: true,
        notProductionReadyCostBilling: true,
        notProductionReady: true,
        observeOnly: true,
        noLiveStateMutation: true,
        notAm: true,
        fundacionDelta0: true,
        notCloudAgent: true
      }
    });
  }

  function getState() {
    const h = health();
    return sanitizePayload({
      ...h,
      receiptCount: receipts.length,
      recentReceipts: receipts.slice(-5),
      requireLedger,
      requireSessionStore
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizePayload({ ...r }));
  }

  return {
    kind: AL_KIND,
    PRODUCTION_READY: AL_PRODUCTION_READY,
    replay,
    exportForensicTimeline,
    observeAttribution,
    verifyReplayInputs,
    sealReceipt,
    health,
    getState,
    getReceipts,
    sanitizePayload,
    isFundacionTarget,
    formatTimelineEvent
  };
}

/**
 * @param {object} options
 * @returns {{ dep: string, message: string }|null}
 */
function resolveDepError(options) {
  if (
    Object.prototype.hasOwnProperty.call(options, 'now') &&
    options.now != null &&
    typeof options.now !== 'function'
  ) {
    return { dep: 'now', message: 'now injectable must be a function' };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'hash') &&
    options.hash != null &&
    typeof options.hash !== 'function'
  ) {
    return { dep: 'hash', message: 'hash injectable must be a function' };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'receiptSealer') &&
    options.receiptSealer != null &&
    typeof options.receiptSealer !== 'function'
  ) {
    return {
      dep: 'receiptSealer',
      message: 'receiptSealer injectable must be a function'
    };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'ledger') &&
    options.ledger != null &&
    typeof options.ledger !== 'object'
  ) {
    return { dep: 'ledger', message: 'ledger injectable must be an object' };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'sessionStore') &&
    options.sessionStore != null &&
    typeof options.sessionStore !== 'object'
  ) {
    return {
      dep: 'sessionStore',
      message: 'sessionStore injectable must be an object'
    };
  }
  return null;
}

/**
 * @param {unknown} ledger
 * @returns {boolean}
 */
function isUsableLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') return false;
  return (
    typeof ledger.query === 'function' ||
    typeof ledger.verifyChain === 'function' ||
    typeof ledger.entries === 'function' ||
    Array.isArray(ledger.entries) ||
    typeof ledger.list === 'function'
  );
}

/**
 * @param {unknown} store
 * @returns {boolean}
 */
function isUsableSessionStore(store) {
  if (!store || typeof store !== 'object') return false;
  return (
    typeof store.load === 'function' ||
    typeof store.list === 'function' ||
    typeof store.getSession === 'function' ||
    typeof store.listSessions === 'function'
  );
}

/**
 * @param {string|object|undefined|null} raw
 * @returns {object}
 */
function normalizeFilter(raw) {
  if (raw == null) return {};
  if (typeof raw === 'string') return { timelineId: raw };
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  return { invalid: true };
}

/**
 * @param {object[]} entries
 * @param {object} filter
 * @returns {object[]}
 */
function filterEntries(entries, filter) {
  const f = filter && typeof filter === 'object' ? filter : {};
  return entries.filter((e) => {
    if (!e || typeof e !== 'object') return false;
    if (f.timelineId != null) {
      const tid = e.timelineId != null ? String(e.timelineId) : e.missionId;
      if (String(tid) !== String(f.timelineId) && String(e.missionId) !== String(f.timelineId)) {
        // Also allow timelineId matching a dedicated field only
        if (e.timelineId == null || String(e.timelineId) !== String(f.timelineId)) {
          return false;
        }
      }
    }
    if (f.missionId != null && String(e.missionId) !== String(f.missionId)) {
      return false;
    }
    if (f.sessionId != null && String(e.sessionId) !== String(f.sessionId)) {
      return false;
    }
    if (f.kind != null && String(e.kind) !== String(f.kind)) {
      return false;
    }
    return true;
  });
}

/**
 * @param {object[]} entries
 * @returns {object|null}
 */
function detectSilentGap(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let prevDigest = null;
  let prevSeq = null;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    if (!e || typeof e !== 'object') {
      return {
        index: i,
        message: 'null/invalid entry — silent gap forbidden'
      };
    }
    if (e.seq != null && prevSeq != null) {
      const seq = Number(e.seq);
      if (Number.isFinite(seq) && seq !== prevSeq + 1 && seq > prevSeq + 1) {
        return {
          index: i,
          expectedSeq: prevSeq + 1,
          actualSeq: seq,
          message: `seq gap ${prevSeq} → ${seq} — silent gap forbidden`
        };
      }
    }
    if (e.prevDigest != null || prevDigest != null) {
      if (e.prevDigest !== prevDigest && !(prevDigest == null && e.prevDigest == null)) {
        // Only enforce when both sides participate in a chain
        if (prevDigest != null || e.prevDigest != null) {
          if (i === 0 && e.prevDigest == null) {
            // genesis ok
          } else if (e.prevDigest !== prevDigest) {
            return {
              index: i,
              expectedPrev: prevDigest,
              actualPrev: e.prevDigest,
              message: 'prevDigest gap — silent gap / chain break forbidden'
            };
          }
        }
      }
    }
    if (e.digest != null) prevDigest = e.digest;
    if (e.seq != null && Number.isFinite(Number(e.seq))) prevSeq = Number(e.seq);
  }
  return null;
}

/**
 * @param {object[]} entries
 * @param {object} filter
 * @returns {string[]}
 */
function collectSessionIds(entries, filter) {
  const ids = new Set();
  if (filter && filter.sessionId != null) ids.add(String(filter.sessionId));
  for (const e of entries || []) {
    if (e && e.sessionId != null) ids.add(String(e.sessionId));
  }
  return [...ids];
}

/**
 * @param {object} entry
 * @param {number} index
 * @returns {object}
 */
function entryToCycle(entry, index) {
  const payload =
    entry.payload && typeof entry.payload === 'object' ? entry.payload : {};
  const allow =
    entry.allow === true ||
    payload.allow === true ||
    entry.outcome === 'ALLOW' ||
    payload.outcome === 'ALLOW' ||
    entry.code === 'OK' ||
    entry.code === 'APPENDED' ||
    entry.code === 'CYCLE_COMPLETED';
  const deny =
    entry.deny === true ||
    payload.deny === true ||
    entry.outcome === 'DENY' ||
    payload.outcome === 'DENY' ||
    entry.ok === false ||
    (typeof entry.code === 'string' &&
      /DENY|ABORT|BROKEN|FORBIDDEN/i.test(entry.code));
  let outcome = 'UNKNOWN';
  if (allow && !deny) outcome = 'ALLOW';
  else if (deny) outcome = 'DENY';
  else if (entry.outcome) outcome = String(entry.outcome).toUpperCase();

  return formatTimelineEvent(
    {
      seq: entry.seq != null ? entry.seq : index,
      at: entry.at,
      sessionId: entry.sessionId,
      missionId: entry.missionId,
      cycleId: payload.cycleId || entry.cycleId || `C-${index}`,
      outcome,
      allow: outcome === 'ALLOW',
      deny: outcome === 'DENY',
      code: entry.code || payload.code || (outcome === 'ALLOW' ? 'OK' : outcome),
      kind: entry.kind || 'cycle',
      digest: entry.digest,
      prevDigest: entry.prevDigest
    },
    index
  );
}

/**
 * @param {object} filter
 * @param {object[]} walk
 * @returns {string}
 */
function deriveTimelineId(filter, walk) {
  if (filter.timelineId) return String(filter.timelineId);
  if (filter.missionId) return String(filter.missionId);
  if (walk.length > 0 && walk[0].missionId) return String(walk[0].missionId);
  return 'timeline-anonymous';
}

/**
 * @param {unknown} source
 * @param {object} filter
 * @returns {object|null}
 */
function readEcrAggregates(source, filter) {
  if (source == null) return null;
  try {
    if (typeof source === 'function') {
      const r = source(filter);
      return r && typeof r === 'object' ? r : null;
    }
    if (typeof source.aggregate === 'function') {
      const r = source.aggregate(filter);
      return r && typeof r === 'object' ? r : null;
    }
    if (typeof source.getCounters === 'function') {
      const r = source.getCounters(filter);
      return r && typeof r === 'object' ? r : null;
    }
    if (typeof source === 'object') {
      return {
        tokens: Number(source.tokens || 0) || 0,
        costUnits: Number(source.costUnits || 0) || 0,
        bySession: source.bySession || {},
        byMission: source.byMission || {},
        byKind: source.byKind || {},
        entryCount: Number(source.entryCount || 0) || 0
      };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {object}
 */
function mergeAggregates(a, b) {
  const out = {
    tokens: (a.tokens || 0) + (b.tokens || 0),
    costUnits: (a.costUnits || 0) + (b.costUnits || 0),
    entryCount: (a.entryCount || 0) + (b.entryCount || 0),
    bySession: { ...(a.bySession || {}) },
    byMission: { ...(a.byMission || {}) },
    byKind: { ...(a.byKind || {}) }
  };
  for (const [k, v] of Object.entries(b.bySession || {})) {
    out.bySession[k] = out.bySession[k] || { tokens: 0, costUnits: 0, count: 0 };
    out.bySession[k].tokens += (v && v.tokens) || 0;
    out.bySession[k].costUnits += (v && v.costUnits) || 0;
    out.bySession[k].count += (v && v.count) || 0;
  }
  for (const [k, v] of Object.entries(b.byMission || {})) {
    out.byMission[k] = out.byMission[k] || { tokens: 0, costUnits: 0, count: 0 };
    out.byMission[k].tokens += (v && v.tokens) || 0;
    out.byMission[k].costUnits += (v && v.costUnits) || 0;
    out.byMission[k].count += (v && v.count) || 0;
  }
  for (const [k, v] of Object.entries(b.byKind || {})) {
    out.byKind[k] = out.byKind[k] || { tokens: 0, costUnits: 0, count: 0 };
    out.byKind[k].tokens += (v && v.tokens) || 0;
    out.byKind[k].costUnits += (v && v.costUnits) || 0;
    out.byKind[k].count += (v && v.count) || 0;
  }
  return out;
}

/**
 * @param {object} obj
 * @param {string[]} keys
 */
function omit(obj, keys) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (keys.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

export default createAutonomyReplayForensicObserver;
