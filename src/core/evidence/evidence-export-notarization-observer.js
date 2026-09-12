/**
 * @module evidence-export-notarization-observer
 * SPEC-0048 / Mission AQ — Evidence Export & Notarization Observer.
 *
 * Injectable export observer over AJ EVD ledger (+ optional AL timeline):
 * exportRange → sealed pack (manifest hashes linked to AJ chain tip);
 * verifyPack → forensic FAIL on tamper/missing hash (no silent accept);
 * observeNotary → optional notary stub receipts WITHOUT claiming legal
 * compliance certification. Hermetic fakes only — no fetch/http/CloudAgent.
 *
 * NON-CLAIM:
 *   evidence export / notarization observer ≠ compliance certification product
 *   evidence export / notarization observer ≠ external audit platform
 *   evidence export / notarization observer ≠ legal notarization service
 *   not AR
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: detect provider secret material via runtime-synthesized
 * patterns — never embed a static vendor-key prefix literal in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  AQ_PACK_KIND,
  AQ_PACK_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildSealedEvdPack,
  recomputePackDigest,
  collectEntryDigests
} from './sealed-evd-pack.js';
import {
  AQ_NOTARY_KIND,
  AQ_NOTARY_PRODUCTION_READY,
  AQ_NOTARY_CODES,
  createNotaryStub
} from './notary-stub.js';

/** @type {'NO'} */
export const AQ_PRODUCTION_READY = 'NO';

export const AQ_KIND = 'eos-evidence-export-notarization-observer';

export const AQ_CODES = Object.freeze({
  OK: 'OK',
  EXPORT_OK: 'EXPORT_OK',
  VERIFY_FAIL: 'VERIFY_FAIL',
  TAMPER_DETECTED: 'TAMPER_DETECTED',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  LEDGER_RANGE_EMPTY: 'LEDGER_RANGE_EMPTY',
  NOTARY_OBSERVE_ONLY: 'NOTARY_OBSERVE_ONLY',
  PACK_SEAL_FAIL: 'PACK_SEAL_FAIL'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for AQ evidence export / notarization failures.
 */
export class EvidenceExportNotarizationError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AQ_CODES.VERIFY_FAIL, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'EvidenceExportNotarizationError';
    this.code = code;
    this.details = sanitizeAqPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / packs / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAqPayload(obj) {
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
    if (/^eos-[a-z0-9-]{8,}$/i.test(value)) return value;
    if (/^AQ-(PACK|NOTARY|EXP)-[a-z0-9]+$/i.test(value)) return value;
    if (LONG_B64_RE.test(value) && !value.includes('-')) return REDACTED;
    if (LONG_B64_RE.test(value) && /^[A-Za-z0-9+/=]{40,}$/.test(value)) {
      return REDACTED;
    }
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
      /^(entryCount|exportCount|verifyCount|notaryObserveCount|seq|fromSeq|toSeq|packId|chainTip|packDigest|receiptId|code|status|phase)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(digest|sha256|bodySha256|prevDigest|priorTip|tip|entryDigests)$/i.test(
        k
      )
    ) {
      out[k] =
        typeof v === 'string'
          ? redactSecretSubstrings(v)
          : sanitizeDeep(v, seen);
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
 * Detect secret-like fields that must not enter packs.
 * @param {unknown} obj
 * @returns {boolean}
 */
function containsSecretFields(obj, seen = new WeakSet()) {
  if (obj == null || typeof obj !== 'object') return false;
  if (seen.has(obj)) return false;
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.some((v) => containsSecretFields(v, seen));
  }
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) return true;
    if (typeof v === 'string') {
      const vendorPrefix = ['s', 'k', '-'].join('');
      if (v.startsWith(vendorPrefix) && v.length >= 12) return true;
      if (/^Bearer\s+[A-Za-z0-9._\-+=/]{8,}/i.test(v)) return true;
    }
    if (containsSecretFields(v, seen)) return true;
  }
  return false;
}

/**
 * Create a hermetic AJ-like ledger stub for export range + tip linkage.
 * @param {object} [options]
 * @param {object[]} [options.entries]
 * @param {string} [options.tip]
 * @param {(payload: unknown) => string} [options.hash]
 */
export function createMemoryExportLedger(options = {}) {
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  /** @type {object[]} */
  const entries = Array.isArray(options.entries)
    ? options.entries.map((e, i) => {
        const body = { seq: i, ...e };
        if (body.digest == null) {
          body.digest = hashFn({
            seq: body.seq,
            missionId: body.missionId,
            sessionId: body.sessionId,
            kind: body.kind,
            at: body.at,
            payload: body.payload
          });
        }
        return body;
      })
    : [];
  let tip =
    options.tip != null
      ? String(options.tip)
      : entries.length > 0
        ? String(entries[entries.length - 1].digest)
        : hashFn({ genesis: true, kind: 'aq-ledger-stub' });

  return {
    kind: 'eos-aq-aj-like-ledger-stub',
    PRODUCTION_READY: AQ_PRODUCTION_READY,
    tip() {
      return tip;
    },
    append(entry) {
      const seq = entries.length;
      const prevDigest = tip;
      const body = sanitizeAqPayload({
        seq,
        prevDigest,
        ...entry,
        at: entry && entry.at != null ? entry.at : new Date().toISOString()
      });
      const digest = hashFn(body);
      const record = { ...body, digest };
      entries.push(record);
      tip = digest;
      return sanitizeAqPayload({ ok: true, tip, digest, entry: record });
    },
    /**
     * AJ-like query by missionId / sessionId / seq range / time range.
     * @param {object} [filter]
     */
    query(filter = {}) {
      const f = filter && typeof filter === 'object' ? filter : {};
      const matched = entries.filter((e) => matchesRange(e, f));
      return sanitizeAqPayload({
        ok: true,
        code: 'OK',
        count: matched.length,
        entries: matched.map((e) => sanitizeAqPayload(e))
      });
    },
    getEntries() {
      return entries.map((e) => sanitizeAqPayload(e));
    },
    verify() {
      return { ok: true, code: 'OK', length: entries.length };
    }
  };
}

/**
 * @param {object} entry
 * @param {object} f
 * @returns {boolean}
 */
function matchesRange(entry, f) {
  if (!entry || typeof entry !== 'object') return false;
  if (f.missionId != null && entry.missionId !== f.missionId) return false;
  if (f.sessionId != null && entry.sessionId !== f.sessionId) return false;
  if (f.kind != null && entry.kind !== f.kind) return false;
  if (typeof f.fromSeq === 'number' && (entry.seq == null || entry.seq < f.fromSeq)) {
    return false;
  }
  if (typeof f.toSeq === 'number' && (entry.seq == null || entry.seq > f.toSeq)) {
    return false;
  }
  if (f.fromAt != null && entry.at != null && String(entry.at) < String(f.fromAt)) {
    return false;
  }
  if (f.toAt != null && entry.at != null && String(entry.at) > String(f.toAt)) {
    return false;
  }
  return true;
}

/**
 * Optional AL-like timeline exporter stub.
 * @param {object} [options]
 * @param {(opts: object) => object} [options.exportTimeline]
 */
export function createMemoryTimelineExporter(options = {}) {
  return {
    kind: 'eos-aq-al-like-timeline-stub',
    PRODUCTION_READY: AQ_PRODUCTION_READY,
    exportTimeline(opts = {}) {
      if (typeof options.exportTimeline === 'function') {
        return options.exportTimeline(opts);
      }
      const cycles = Array.isArray(opts.cycles) ? opts.cycles : [];
      return sanitizeAqPayload({
        kind: 'eos-forensic-timeline-export',
        PRODUCTION_READY: 'NO',
        timelineId: opts.timelineId != null ? String(opts.timelineId) : null,
        eventCount: cycles.length,
        events: cycles.map((c, i) => ({
          index: i,
          seq: c && c.seq != null ? c.seq : i,
          at: c && c.at != null ? String(c.at) : null,
          outcome: c && c.outcome != null ? String(c.outcome) : 'UNKNOWN'
        })),
        observeOnly: true,
        mutatesLiveState: false
      });
    }
  };
}

let _expSeq = 0;

/**
 * @param {object} [options]
 * @param {{ tip(): string, query?(filter: object): object, getEntries?(): object[], append?(entry: object): object, verify?(): object }} [options.ledger]
 * @param {{ exportTimeline?(opts: object): object }} [options.timeline]
 * @param {{ observe(pack: object, meta?: object): object, enabled?: boolean, getReceipts?(): object[] }} [options.notary]
 * @param {() => string|number} [options.now]
 * @param {(payload: unknown) => string} [options.hash]
 * @param {boolean} [options.notarizationObserve] — enable notary observe mode
 * @param {boolean} [options.requireLedger]
 * @param {boolean} [options.rejectSecretsInRequest]
 * @param {boolean} [options.throwOnFail]
 */
export function createEvidenceExportNotarizationObserver(options = {}) {
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const throwOnFail = options.throwOnFail === true;
  const rejectSecretsInRequest = options.rejectSecretsInRequest !== false;
  const requireLedger = options.requireLedger === true;
  const notarizationObserve = options.notarizationObserve === true;

  const ledger =
    options.ledger && typeof options.ledger === 'object'
      ? options.ledger
      : null;
  const timeline =
    options.timeline && typeof options.timeline === 'object'
      ? options.timeline
      : null;
  const notary =
    options.notary && typeof options.notary === 'object'
      ? options.notary
      : notarizationObserve
        ? createNotaryStub({ enabled: true, hash: hashFn, now: nowFn })
        : null;

  /** @type {object[]} */
  const packs = [];
  /** @type {object[]} */
  const verifyLog = [];
  /** @type {object[]} */
  const notaryReceipts = [];

  let exportCount = 0;
  let verifyCount = 0;
  let notaryObserveCount = 0;
  let verifyFailCount = 0;

  function nonClaimFlags() {
    return {
      notComplianceCert: true,
      notExternalAuditPlatform: true,
      notLegalNotary: true,
      notAr: true,
      fundacionDelta0: true,
      antigravityFirst: true,
      cloudAgentOut: true,
      observeOnly: true,
      neverClaimsLegalCompliance: true
    };
  }

  function currentLedgerTip() {
    if (!ledger) return null;
    if (typeof ledger.tip === 'function') {
      try {
        return ledger.tip();
      } catch {
        return null;
      }
    }
    if (ledger.tip != null) return String(ledger.tip);
    return null;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function failResult(code, extra = {}) {
    const result = sanitizeAqPayload({
      ok: false,
      code,
      forensic: true,
      PRODUCTION_READY: AQ_PRODUCTION_READY,
      kind: AQ_KIND,
      nonClaim: nonClaimFlags(),
      ...extra
    });
    if (throwOnFail) {
      throw new EvidenceExportNotarizationError(
        `AQ fail: ${code}`,
        code,
        extra
      );
    }
    return result;
  }

  /**
   * WHEN operator requests evidence export for a ledger range → sealed pack
   * with manifest hashes linked to AJ chain tip.
   * @param {object} [request]
   */
  function exportRange(request = {}) {
    if (request == null || typeof request !== 'object') {
      return failResult(AQ_CODES.INVALID_REQUEST, {
        reason: 'exportRange requires an object'
      });
    }

    if (requireLedger && !ledger) {
      return failResult(AQ_CODES.MISSING_DEP, { dep: 'ledger' });
    }
    if (!ledger) {
      return failResult(AQ_CODES.MISSING_DEP, { dep: 'ledger' });
    }

    // Fundacion ALWAYS DENY / Δ=0
    if (
      request.fundacion === true ||
      request.fundacionWrite === true ||
      (typeof request.target === 'string' &&
        /fundacion/i.test(request.target))
    ) {
      return failResult(AQ_CODES.INVALID_REQUEST, {
        reason: 'Fundacion ALWAYS DENY — no Fundacion write via AQ export',
        fundacion: 'ALWAYS_DENY',
        fundacionDelta: 0
      });
    }

    if (
      rejectSecretsInRequest &&
      containsSecretFields(request) &&
      (request.persistSecrets === true ||
        request.includeSecretsInPack === true ||
        request.sealSecrets === true)
    ) {
      return failResult(AQ_CODES.SECRET_LEAK_FORBIDDEN, {
        reason:
          'export secrets must not enter sealed packs / receipts (Law VI)'
      });
    }

    const filter = {
      missionId: request.missionId,
      sessionId: request.sessionId,
      kind: request.kind,
      fromSeq: request.fromSeq,
      toSeq: request.toSeq,
      fromAt: request.fromAt,
      toAt: request.toAt
    };

    let entries = [];
    if (typeof ledger.query === 'function') {
      const q = ledger.query(filter);
      if (q && q.ok === false) {
        return failResult(q.code || AQ_CODES.MISSING_DEP, {
          reason: 'ledger.query failed',
          ledger: sanitizeAqPayload(q)
        });
      }
      entries = Array.isArray(q && q.entries) ? q.entries : [];
    } else if (typeof ledger.getEntries === 'function') {
      entries = (ledger.getEntries() || []).filter((e) =>
        matchesRange(e, filter)
      );
    } else {
      return failResult(AQ_CODES.MISSING_DEP, {
        dep: 'ledger.query|getEntries'
      });
    }

    // Sanitize entries (Law VI) — strip secret fields even if present
    entries = entries.map((e) => sanitizeAqPayload(e));

    if (entries.length === 0) {
      return failResult(AQ_CODES.LEDGER_RANGE_EMPTY, {
        reason: 'no ledger entries match export range',
        range: filter
      });
    }

    const chainTip = currentLedgerTip();
    _expSeq += 1;
    const at = String(nowFn());

    let timelineExport = null;
    if (
      request.includeTimeline === true &&
      timeline &&
      typeof timeline.exportTimeline === 'function'
    ) {
      try {
        timelineExport = sanitizeAqPayload(
          timeline.exportTimeline({
            timelineId: `aq-timeline-${_expSeq}`,
            cycles: entries,
            at
          })
        );
      } catch (err) {
        timelineExport = {
          error: sanitizeErrorMessage(err?.message || 'timeline export failed')
        };
      }
    }

    let pack;
    try {
      pack = buildSealedEvdPack(
        sanitizeAqPayload({
          entries,
          range: filter,
          chainTip,
          timeline: timelineExport,
          exportSeq: _expSeq,
          missionId: request.missionId || null,
          sessionId: request.sessionId || null
        }),
        { hash: hashFn, now: () => at, chainTip }
      );
      pack = sanitizeAqPayload({
        ...pack,
        channelKind: AQ_KIND,
        PRODUCTION_READY: AQ_PRODUCTION_READY,
        fundacionDelta: 0,
        cloudAgent: false,
        usesCloudAgent: false,
        complianceClaim: false,
        legalNotaryClaim: false,
        externalAuditClaim: false,
        nonClaim: nonClaimFlags()
      });
    } catch (err) {
      return failResult(AQ_CODES.PACK_SEAL_FAIL, {
        reason: sanitizeErrorMessage(err?.message || 'pack seal failed')
      });
    }

    if (!pack || !pack.sealed || !pack.packDigest) {
      return failResult(AQ_CODES.PACK_SEAL_FAIL, {
        reason: 'sealed pack missing digest / sealed flag'
      });
    }

    exportCount += 1;
    packs.push(pack);

    // Optional notary observe on export when mode enabled
    let notaryResult = null;
    if (notarizationObserve && notary && typeof notary.observe === 'function') {
      notaryResult = observeNotary(pack, { source: 'exportRange' });
    }

    return sanitizeAqPayload({
      ok: true,
      code: AQ_CODES.EXPORT_OK,
      pack,
      packId: pack.packId,
      chainTip,
      entryCount: entries.length,
      notary: notaryResult,
      PRODUCTION_READY: AQ_PRODUCTION_READY,
      kind: AQ_KIND,
      nonClaim: nonClaimFlags()
    });
  }

  /**
   * IF pack verification fails on re-check → forensic failure (no silent accept).
   * @param {object} pack
   */
  function verifyPack(pack) {
    verifyCount += 1;
    if (pack == null || typeof pack !== 'object') {
      verifyFailCount += 1;
      const fail = failResult(AQ_CODES.INVALID_REQUEST, {
        reason: 'verifyPack requires a sealed pack object',
        forensic: true
      });
      verifyLog.push({ at: String(nowFn()), ok: false, code: fail.code });
      return fail;
    }

    if (pack.sealed !== true) {
      verifyFailCount += 1;
      const fail = failResult(AQ_CODES.VERIFY_FAIL, {
        reason: 'pack is not sealed',
        forensic: true,
        packId: pack.packId || null
      });
      verifyLog.push({ at: String(nowFn()), ok: false, code: fail.code });
      return fail;
    }

    const manifest =
      pack.manifest && typeof pack.manifest === 'object' ? pack.manifest : null;
    if (!manifest || manifest.packDigest == null) {
      verifyFailCount += 1;
      const fail = failResult(AQ_CODES.VERIFY_FAIL, {
        reason: 'pack missing manifest.packDigest',
        forensic: true,
        packId: pack.packId || null
      });
      verifyLog.push({ at: String(nowFn()), ok: false, code: fail.code });
      return fail;
    }

    const entries = Array.isArray(pack.entries) ? pack.entries : [];
    const expectedDigests = Array.isArray(manifest.entryDigests)
      ? manifest.entryDigests.map(String)
      : [];
    const recomputedDigests = collectEntryDigests(entries, hashFn);

    // Tamper: entry digest mismatch or missing hash
    if (expectedDigests.length !== recomputedDigests.length) {
      verifyFailCount += 1;
      const fail = failResult(AQ_CODES.TAMPER_DETECTED, {
        reason: 'entry digest count mismatch',
        forensic: true,
        expectedCount: expectedDigests.length,
        actualCount: recomputedDigests.length,
        packId: pack.packId || null,
        silentAccept: false
      });
      verifyLog.push({ at: String(nowFn()), ok: false, code: fail.code });
      return fail;
    }

    for (let i = 0; i < expectedDigests.length; i++) {
      if (
        !expectedDigests[i] ||
        expectedDigests[i] !== recomputedDigests[i]
      ) {
        verifyFailCount += 1;
        const fail = failResult(AQ_CODES.TAMPER_DETECTED, {
          reason: 'entry digest mismatch / missing hash',
          forensic: true,
          index: i,
          expected: expectedDigests[i] || null,
          actual: recomputedDigests[i] || null,
          packId: pack.packId || null,
          silentAccept: false
        });
        verifyLog.push({ at: String(nowFn()), ok: false, code: fail.code });
        return fail;
      }
    }

    // Recompute pack digest
    const expectedPackDigest = String(manifest.packDigest);
    const actualPackDigest = recomputePackDigest(pack, hashFn);
    if (
      !actualPackDigest ||
      actualPackDigest !== expectedPackDigest ||
      (pack.packDigest != null &&
        String(pack.packDigest) !== expectedPackDigest)
    ) {
      verifyFailCount += 1;
      const fail = failResult(AQ_CODES.TAMPER_DETECTED, {
        reason: 'packDigest mismatch — forensic failure (no silent accept)',
        forensic: true,
        expected: expectedPackDigest,
        actual: actualPackDigest,
        packId: pack.packId || null,
        silentAccept: false
      });
      verifyLog.push({ at: String(nowFn()), ok: false, code: fail.code });
      return fail;
    }

    // Chain tip presence (linked to AJ tip at export)
    if (pack.chainTip == null && manifest.chainTip == null) {
      verifyFailCount += 1;
      const fail = failResult(AQ_CODES.VERIFY_FAIL, {
        reason: 'pack missing chainTip link to AJ ledger',
        forensic: true,
        packId: pack.packId || null,
        silentAccept: false
      });
      verifyLog.push({ at: String(nowFn()), ok: false, code: fail.code });
      return fail;
    }

    const ok = sanitizeAqPayload({
      ok: true,
      code: AQ_CODES.OK,
      verified: true,
      forensic: false,
      packId: pack.packId || null,
      packDigest: expectedPackDigest,
      chainTip: pack.chainTip || manifest.chainTip,
      entryCount: entries.length,
      PRODUCTION_READY: AQ_PRODUCTION_READY,
      kind: AQ_KIND,
      silentAccept: false,
      nonClaim: nonClaimFlags()
    });
    verifyLog.push({
      at: String(nowFn()),
      ok: true,
      code: AQ_CODES.OK,
      packId: pack.packId || null
    });
    return ok;
  }

  /**
   * WHILE notarization observe mode is enabled → record notary stub
   * receipts WITHOUT claiming legal compliance certification.
   * @param {object} pack
   * @param {object} [meta]
   */
  function observeNotary(pack, meta = {}) {
    if (!notarizationObserve) {
      return sanitizeAqPayload({
        ok: true,
        code: AQ_CODES.OK,
        notarizationObserve: false,
        complianceClaim: false,
        legalNotaryClaim: false,
        reason: 'notarization observe mode OFF — no notary claim',
        PRODUCTION_READY: AQ_PRODUCTION_READY,
        kind: AQ_KIND,
        nonClaim: nonClaimFlags()
      });
    }

    if (!notary || typeof notary.observe !== 'function') {
      return failResult(AQ_CODES.MISSING_DEP, { dep: 'notary' });
    }

    if (pack == null || typeof pack !== 'object') {
      return failResult(AQ_CODES.INVALID_REQUEST, {
        reason: 'observeNotary requires a sealed pack object'
      });
    }

    const out = notary.observe(sanitizeAqPayload(pack), meta);
    notaryObserveCount += 1;
    if (out && out.receipt) {
      notaryReceipts.push(sanitizeAqPayload(out.receipt));
    }

    return sanitizeAqPayload({
      ok: out && out.ok !== false,
      code: AQ_CODES.NOTARY_OBSERVE_ONLY,
      observeOnly: true,
      complianceClaim: false,
      legalNotaryClaim: false,
      certified: false,
      notarizedLegally: false,
      receipt: out && out.receipt ? sanitizeAqPayload(out.receipt) : null,
      PRODUCTION_READY: AQ_PRODUCTION_READY,
      kind: AQ_KIND,
      notaryKind: AQ_NOTARY_KIND,
      nonClaim: nonClaimFlags()
    });
  }

  /**
   * Seal helper — build a pack from entries without ledger query.
   * @param {object} body
   */
  function sealPack(body = {}) {
    try {
      const tip =
        body.chainTip != null ? String(body.chainTip) : currentLedgerTip();
      const pack = sanitizeAqPayload(
        buildSealedEvdPack(sanitizeAqPayload(body), {
          hash: hashFn,
          now: nowFn,
          chainTip: tip
        })
      );
      return sanitizeAqPayload({
        ok: true,
        code: AQ_CODES.OK,
        pack,
        PRODUCTION_READY: AQ_PRODUCTION_READY,
        kind: AQ_KIND
      });
    } catch (err) {
      return failResult(AQ_CODES.PACK_SEAL_FAIL, {
        reason: sanitizeErrorMessage(err?.message || 'sealPack failed')
      });
    }
  }

  function getPacks() {
    return packs.map((p) => sanitizeAqPayload(p));
  }

  function getNotaryReceipts() {
    const fromStub =
      notary && typeof notary.getReceipts === 'function'
        ? notary.getReceipts()
        : [];
    const merged = [...notaryReceipts, ...fromStub];
    // de-dupe by receiptId
    const seen = new Set();
    const out = [];
    for (const r of merged) {
      const id = r && r.receiptId != null ? String(r.receiptId) : null;
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      out.push(sanitizeAqPayload(r));
    }
    return out;
  }

  function getState() {
    return sanitizeAqPayload({
      kind: AQ_KIND,
      PRODUCTION_READY: AQ_PRODUCTION_READY,
      exportCount,
      verifyCount,
      verifyFailCount,
      notaryObserveCount,
      packCount: packs.length,
      notarizationObserve,
      ledger: ledger
        ? { present: true, tip: currentLedgerTip() }
        : { present: false },
      timeline: { present: !!timeline },
      notary: notary
        ? {
            present: true,
            kind: notary.kind || AQ_NOTARY_KIND,
            enabled: notarizationObserve
          }
        : { present: false, enabled: false },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      complianceClaim: false,
      legalNotaryClaim: false,
      externalAuditClaim: false,
      packHelperKind: AQ_PACK_KIND,
      packHelperProductionReady: AQ_PACK_PRODUCTION_READY,
      notaryHelperKind: AQ_NOTARY_KIND,
      notaryHelperProductionReady: AQ_NOTARY_PRODUCTION_READY,
      verifyLog: verifyLog.slice(-20),
      nonClaim: nonClaimFlags()
    });
  }

  function health() {
    return sanitizeAqPayload({
      ok: true,
      kind: AQ_KIND,
      PRODUCTION_READY: AQ_PRODUCTION_READY,
      exportCount,
      verifyCount,
      notarizationObserve,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      complianceClaim: false,
      legalNotaryClaim: false,
      nonClaim: nonClaimFlags()
    });
  }

  return {
    kind: AQ_KIND,
    PRODUCTION_READY: AQ_PRODUCTION_READY,
    exportRange,
    verifyPack,
    observeNotary,
    sealPack,
    getState,
    getPacks,
    getNotaryReceipts,
    health,
    sanitizeAqPayload,
    /** @internal */
    _codes: AQ_CODES
  };
}

export {
  AQ_PACK_KIND,
  AQ_PACK_PRODUCTION_READY,
  AQ_NOTARY_KIND,
  AQ_NOTARY_PRODUCTION_READY,
  AQ_NOTARY_CODES,
  stableStringify,
  defaultHash,
  buildSealedEvdPack,
  recomputePackDigest,
  createNotaryStub
};

export default createEvidenceExportNotarizationObserver;
