/**
 * @module evidence-economy-ledger
 * SPEC-0041 / Mission AJ — Evidence Economy Ledger.
 *
 * Append-only hash-chained EVD aggregation + chain verify + sanitized
 * query SSOT at scale for AI / AK / AL consumers. Trans-session
 * integrity (sessionId + missionId + priorTip / custodyDigest on
 * entries; one chain, many sessions).
 *
 * This is a ledger LAYER over EVD receipts — NOT a second competing
 * custody core. ADR-0015 HashChainedLedger remains the custody SSOT.
 *
 * Law VI: sanitize / redact secrets from stored entries, query
 * results, and receipts. Vendor-key prefix is synthesized at runtime
 * — never a static vendor-key prefix literal in source.
 *
 * NON-CLAIM:
 *   EVD ledger ≠ external audit platform
 *   EVD ledger ≠ compliance certification
 *   EVD ledger ≠ PRODUCTION_READY
 *   multi-session cost tracking ≠ billing product
 *   not a second competing custody core (ADR-0015 HashChainedLedger)
 *   not AK / AL / AM
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createHash } from 'node:crypto';
import {
  createEvidenceCostTracker,
  extractEntryCost,
  sumCosts
} from './evidence-cost-tracker.js';

/** @type {'NO'} */
export const AJ_PRODUCTION_READY = 'NO';

export const AJ_KIND = 'eos-evidence-economy-ledger';

export const AJ_CODES = Object.freeze({
  OK: 'OK',
  APPENDED: 'APPENDED',
  DENY: 'DENY',
  CHAIN_BROKEN: 'CHAIN_BROKEN',
  TAMPER_DETECTED: 'TAMPER_DETECTED',
  INVALID_ENTRY: 'INVALID_ENTRY',
  MISSING_DEP: 'MISSING_DEP',
  FUNDACION_DENY: 'FUNDACION_DENY'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key|provider[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

const CHAIN_KEY = '__aj_chain__';

/**
 * Typed error for Evidence Economy Ledger failures.
 */
export class EvidenceEconomyLedgerError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AJ_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'EvidenceEconomyLedgerError';
    this.code = code;
    this.details = sanitizeLedgerPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / query.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeLedgerPayload(obj) {
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
    // Preserve SHA-256 hex digests (64 hex) used by the chain
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
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|seq|entryCount|totalTokens|totalCostUnits)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(custodyDigest|snapshotHash|digest|sha256|bodySha256|expectedHash|recomputedHash|expectedDigest|actualDigest|prevDigest|priorTip|tip)$/i.test(
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
 * runtime (Law VI / AF11 — never embed static vendor-key literals).
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
 * Stable JSON stringify (sorted keys) for chain hashing.
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
 * Default in-memory store port { load, save, list }.
 * @returns {{ load(): object[], save(entries: object[]): void, list(): object[] }}
 */
export function createMemoryStore() {
  /** @type {object[]} */
  let entries = [];
  return {
    load() {
      return entries.map((e) => cloneJson(e));
    },
    save(next) {
      entries = Array.isArray(next) ? next.map((e) => cloneJson(e)) : [];
    },
    list() {
      return entries.map((e) => cloneJson(e));
    },
    _entries: () => entries
  };
}

/**
 * @param {unknown} value
 * @returns {any}
 */
function cloneJson(value) {
  if (value == null) return value;
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
  if (typeof obj.custodyTarget === 'string' && /fundacion/i.test(obj.custodyTarget)) {
    return true;
  }
  if (obj.payload && typeof obj.payload === 'object') {
    return isFundacionTarget(obj.payload);
  }
  return false;
}

/**
 * Create the Evidence Economy Ledger.
 *
 * @param {object} [options]
 * @param {Map<string, object>} [options.map] — injectable backing map
 * @param {{ load(): object[], save(entries: object[]): void, list?(): object[] }} [options.store]
 * @param {(payload: any) => string} [options.hash]
 * @param {() => string} [options.now]
 * @param {{ record(item: object): any, totals?(filter?: object): object }} [options.costMeter]
 * @param {boolean} [options.requireCostMeter=false]
 * @param {boolean} [options.throwOnDeny=false]
 * @param {(receipt: object) => void} [options.onReceipt]
 */
export function createEvidenceEconomyLedger(options = {}) {
  const depError = resolveDepError(options);
  const backing = depError ? null : resolveBacking(options);

  const hashMissing =
    options.hash !== undefined &&
    typeof options.hash !== 'function';
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;

  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const costMeter =
    options.costMeter && typeof options.costMeter === 'object'
      ? options.costMeter
      : null;
  const requireCostMeter = options.requireCostMeter === true;
  const throwOnDeny = options.throwOnDeny === true;
  const onReceipt =
    typeof options.onReceipt === 'function' ? options.onReceipt : null;

  const localMeter = createEvidenceCostTracker();

  /** @type {object[]} */
  const receipts = [];
  let seqReceipt = 0;

  const metrics = {
    appends: 0,
    denials: 0,
    queries: 0,
    verifies: 0,
    lastCode: null
  };

  /**
   * @returns {object[]}
   */
  function loadEntries() {
    if (!backing) return [];
    if (backing.type === 'map') {
      const raw = backing.map.get(CHAIN_KEY);
      return Array.isArray(raw) ? raw.map((e) => cloneJson(e)) : [];
    }
    if (backing.type === 'store') {
      const raw = backing.store.load();
      return Array.isArray(raw) ? raw.map((e) => cloneJson(e)) : [];
    }
    return backing.entries.map((e) => cloneJson(e));
  }

  /**
   * @param {object[]} next
   */
  function saveEntries(next) {
    if (!backing) return;
    const cloned = next.map((e) => cloneJson(e));
    if (backing.type === 'map') {
      backing.map.set(CHAIN_KEY, cloned);
      return;
    }
    if (backing.type === 'store') {
      backing.store.save(cloned);
      return;
    }
    backing.entries.splice(0, backing.entries.length, ...cloned);
  }

  /**
   * @param {object} partial
   */
  function emitReceipt(partial) {
    seqReceipt += 1;
    const stamped = partial && partial.at != null ? partial.at : now();
    const receipt = sanitizeLedgerPayload({
      id: `AJ-RCPT-${String(seqReceipt).padStart(4, '0')}`,
      at: stamped,
      kind: AJ_KIND,
      PRODUCTION_READY: AJ_PRODUCTION_READY,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      ...partial
    });
    receipts.push(receipt);
    if (receipts.length > 200) receipts.shift();
    if (onReceipt) {
      try {
        onReceipt(receipt);
      } catch {
        /* observer faults must not crash ledger */
      }
    }
    return receipt;
  }

  /**
   * Seal a deny/allow forensic receipt (public).
   * @param {object} outcome
   */
  function sealReceipt(outcome = {}) {
    const ok = outcome.ok !== false && outcome.allow !== false;
    const code = outcome.code || (ok ? AJ_CODES.OK : AJ_CODES.DENY);
    return emitReceipt({
      ok,
      allow: ok,
      code,
      phase: outcome.phase || (ok ? 'ALLOW' : 'DENY'),
      ...outcome
    });
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function deny(code, extra = {}) {
    metrics.denials += 1;
    metrics.lastCode = code;
    const receipt = emitReceipt({
      ok: false,
      allow: false,
      code,
      phase: extra.phase || 'DENY',
      ...extra
    });
    const result = sanitizeLedgerPayload({
      ok: false,
      allow: false,
      code,
      kind: AJ_KIND,
      PRODUCTION_READY: AJ_PRODUCTION_READY,
      receipt,
      ...extra
    });
    if (throwOnDeny) {
      throw new EvidenceEconomyLedgerError(
        extra.message || `DENY: ${code}`,
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
  function allow(code, extra = {}) {
    metrics.lastCode = code;
    const receipt = extra.seal === false
      ? null
      : emitReceipt({
          ok: true,
          allow: true,
          code,
          phase: extra.phase || 'ALLOW',
          ...omit(extra, ['seal', 'entries', 'entry'])
        });
    return sanitizeLedgerPayload({
      ok: true,
      allow: true,
      code,
      kind: AJ_KIND,
      PRODUCTION_READY: AJ_PRODUCTION_READY,
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
      return deny(AJ_CODES.MISSING_DEP, {
        phase,
        dep: depError.dep,
        message: depError.message
      });
    }
    if (hashMissing) {
      return deny(AJ_CODES.MISSING_DEP, {
        phase,
        dep: 'hash',
        message: 'hash injectable is present but not a function'
      });
    }
    return null;
  }

  /**
   * Append-only hash-chained EVD entry. Links prevDigest.
   * Sanitizes fields (secrets / vendor-key prefix / Fundacion paths).
   * @param {object} entry
   */
  function append(entry) {
    const blocked = checkDeps('APPEND');
    if (blocked) return blocked;

    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      return deny(AJ_CODES.INVALID_ENTRY, {
        phase: 'APPEND',
        message: 'append requires a non-null object entry'
      });
    }

    if (isFundacionTarget(entry)) {
      return deny(AJ_CODES.FUNDACION_DENY, {
        phase: 'APPEND',
        message:
          'Fundacion ALWAYS DENY — no Fundacion write target as custody / ledger path',
        missionId: entry.missionId ?? null,
        sessionId: entry.sessionId ?? null
      });
    }

    let safe;
    try {
      safe = sanitizeLedgerPayload(cloneJson(entry));
    } catch (err) {
      return deny(AJ_CODES.INVALID_ENTRY, {
        phase: 'APPEND',
        message: sanitizeErrorMessage(err?.message || 'entry not serializable')
      });
    }

    if (safe && typeof safe === 'object') {
      delete safe.digest;
      delete safe.prevDigest;
      delete safe.seq;
    }

    const chain = loadEntries();
    const prevDigest =
      chain.length > 0 ? chain[chain.length - 1].digest : null;
    const at = now();
    const seq = chain.length;

    const cost = normalizeCost(safe);

    const body = {
      seq,
      at,
      prevDigest,
      missionId: safe.missionId != null ? String(safe.missionId) : null,
      sessionId: safe.sessionId != null ? String(safe.sessionId) : null,
      kind: safe.kind != null ? String(safe.kind) : 'evd',
      priorTip: safe.priorTip != null ? String(safe.priorTip) : null,
      custodyDigest:
        safe.custodyDigest != null ? String(safe.custodyDigest) : null,
      cost,
      payload: extractPayload(safe),
      ledgerKind: AJ_KIND,
      PRODUCTION_READY: AJ_PRODUCTION_READY
    };

    const digest = hashFn(body);
    const stored = { ...body, digest };
    chain.push(stored);
    saveEntries(chain);

    metrics.appends += 1;
    metrics.lastCode = AJ_CODES.APPENDED;

    try {
      localMeter.record({
        ...body,
        tokens: cost.tokens,
        costUnits: cost.costUnits
      });
      if (costMeter && typeof costMeter.record === 'function') {
        costMeter.record({
          missionId: body.missionId,
          sessionId: body.sessionId,
          kind: body.kind,
          tokens: cost.tokens,
          costUnits: cost.costUnits,
          at
        });
      }
    } catch {
      /* meter faults must not crash append */
    }

    return allow(AJ_CODES.APPENDED, {
      phase: 'APPEND',
      seq,
      digest,
      prevDigest,
      at,
      missionId: body.missionId,
      sessionId: body.sessionId,
      entryKind: body.kind,
      entry: publicEntryView(stored)
    });
  }

  /**
   * Verify hash-chain integrity. Genesis (empty) PASSes.
   * Fail-closed on break → DENY + forensic receipt.
   */
  function verifyChain() {
    const blocked = checkDeps('VERIFY');
    if (blocked) return blocked;

    metrics.verifies += 1;
    const chain = loadEntries();

    if (chain.length === 0) {
      return allow(AJ_CODES.OK, {
        phase: 'VERIFY',
        length: 0,
        genesis: true,
        tip: null,
        message: 'empty genesis chain PASS'
      });
    }

    let prev = null;
    for (let i = 0; i < chain.length; i += 1) {
      const entry = chain[i];
      if (!entry || typeof entry !== 'object' || !entry.digest) {
        return deny(AJ_CODES.CHAIN_BROKEN, {
          phase: 'VERIFY',
          index: i,
          message: 'entry missing digest — chain broken'
        });
      }
      if (entry.prevDigest !== prev) {
        return deny(AJ_CODES.CHAIN_BROKEN, {
          phase: 'VERIFY',
          index: i,
          expectedPrev: prev,
          actualPrev: entry.prevDigest,
          message: 'prevDigest mismatch — chain broken'
        });
      }
      const { digest, ...body } = entry;
      let expected;
      try {
        expected = hashFn(body);
      } catch (err) {
        return deny(AJ_CODES.TAMPER_DETECTED, {
          phase: 'VERIFY',
          index: i,
          message: sanitizeErrorMessage(err?.message || 'hash threw')
        });
      }
      if (expected !== digest) {
        return deny(AJ_CODES.TAMPER_DETECTED, {
          phase: 'VERIFY',
          index: i,
          expectedDigest: expected,
          actualDigest: digest,
          message: 'digest mismatch — tamper detected'
        });
      }
      prev = digest;
    }

    return allow(AJ_CODES.OK, {
      phase: 'VERIFY',
      length: chain.length,
      genesis: false,
      tip: prev
    });
  }

  /**
   * Alias of verifyChain (fail-closed).
   */
  function verify() {
    return verifyChain();
  }

  /**
   * Sanitized query by missionId / sessionId / kind / time range.
   * Never returns secrets.
   * @param {object} [filter]
   */
  function query(filter = {}) {
    const blocked = checkDeps('QUERY');
    if (blocked) return blocked;

    metrics.queries += 1;
    const f = filter && typeof filter === 'object' ? filter : {};
    const chain = loadEntries();
    const entries = [];
    for (const entry of chain) {
      if (!matchesQuery(entry, f)) continue;
      entries.push(publicEntryView(entry));
    }
    return sanitizeLedgerPayload({
      ok: true,
      allow: true,
      code: AJ_CODES.OK,
      kind: AJ_KIND,
      PRODUCTION_READY: AJ_PRODUCTION_READY,
      count: entries.length,
      entries
    });
  }

  /**
   * Cost-per-evidence / attribution counters. Observe-only.
   * ≠ billing product.
   * @param {object} [filter]
   */
  function aggregateCosts(filter) {
    const blocked = checkDeps('AGGREGATE');
    if (blocked) return blocked;

    if (requireCostMeter) {
      if (!costMeter || typeof costMeter.record !== 'function') {
        return deny(AJ_CODES.MISSING_DEP, {
          phase: 'AGGREGATE',
          dep: 'costMeter',
          message: 'costMeter required but missing / invalid'
        });
      }
    }

    const f = filter && typeof filter === 'object' ? filter : {};
    const chain = loadEntries().filter((e) => matchesQuery(e, f));
    const fromEntries = sumCosts(chain, null);

    let fromMeter = null;
    if (costMeter && typeof costMeter.totals === 'function') {
      try {
        fromMeter = costMeter.totals(f);
      } catch {
        fromMeter = null;
      }
    }

    return sanitizeLedgerPayload({
      ok: true,
      allow: true,
      code: AJ_CODES.OK,
      kind: AJ_KIND,
      PRODUCTION_READY: AJ_PRODUCTION_READY,
      observeOnly: true,
      entryCount: fromEntries.entryCount,
      totalTokens: fromEntries.totalTokens,
      totalCostUnits: fromEntries.totalCostUnits,
      bySession: fromEntries.bySession,
      byMission: fromEntries.byMission,
      byKind: fromEntries.byKind,
      meter: fromMeter,
      localMeter: localMeter.totals(f),
      nonClaim: {
        costTrackingNotBillingProduct: true,
        evdLedgerNotAuditPlatform: true,
        evdLedgerNotComplianceCertification: true,
        evdLedgerNotProductionReady: true
      }
    });
  }

  function getTip() {
    const chain = loadEntries();
    if (chain.length === 0) {
      return sanitizeLedgerPayload({
        ok: true,
        genesis: true,
        tip: null,
        length: 0,
        PRODUCTION_READY: AJ_PRODUCTION_READY
      });
    }
    const last = chain[chain.length - 1];
    return sanitizeLedgerPayload({
      ok: true,
      genesis: false,
      tip: last.digest,
      seq: last.seq,
      length: chain.length,
      PRODUCTION_READY: AJ_PRODUCTION_READY
    });
  }

  function getChain() {
    return loadEntries().map((e) => publicEntryView(e));
  }

  function health() {
    const chain = loadEntries();
    const tip = chain.length > 0 ? chain[chain.length - 1].digest : null;
    return sanitizeLedgerPayload({
      ok: true,
      kind: AJ_KIND,
      PRODUCTION_READY: AJ_PRODUCTION_READY,
      length: chain.length,
      tip,
      metrics: { ...metrics },
      deps: {
        hash: !hashMissing && typeof hashFn === 'function',
        store: !!backing,
        costMeter: !!(costMeter && typeof costMeter.record === 'function')
      },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      nonClaim: {
        evdLedgerNotAuditPlatform: true,
        evdLedgerNotComplianceCertification: true,
        evdLedgerNotProductionReady: true,
        costTrackingNotBillingProduct: true,
        notSecondCustodyCore: true,
        notAkAlAm: true,
        fundacionDelta0: true,
        notCloudAgent: true
      }
    });
  }

  function getState() {
    const h = health();
    return sanitizeLedgerPayload({
      ...h,
      receiptCount: receipts.length,
      recentReceipts: receipts.slice(-5),
      requireCostMeter
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizeLedgerPayload({ ...r }));
  }

  /**
   * Hermetic test hook — mutate a stored entry to simulate tamper.
   * Not part of the public product API.
   * @param {number} index
   * @param {(entry: object) => void} mutator
   */
  function _tamperForTest(index, mutator) {
    const chain = loadEntries();
    if (index < 0 || index >= chain.length) return false;
    mutator(chain[index]);
    saveEntries(chain);
    return true;
  }

  return {
    kind: AJ_KIND,
    PRODUCTION_READY: AJ_PRODUCTION_READY,
    append,
    verifyChain,
    verify,
    query,
    aggregateCosts,
    sealReceipt,
    getTip,
    getChain,
    health,
    getState,
    getReceipts,
    sanitizeLedgerPayload,
    /** @internal hermetic test hook */
    _tamperForTest
  };
}

/**
 * @param {object} options
 * @returns {{ dep: string, message: string }|null}
 */
function resolveDepError(options) {
  if (
    Object.prototype.hasOwnProperty.call(options, 'map') &&
    options.map != null &&
    !(options.map instanceof Map)
  ) {
    return { dep: 'map', message: 'map injectable must be a Map' };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'store') &&
    options.store != null &&
    (typeof options.store.load !== 'function' ||
      typeof options.store.save !== 'function')
  ) {
    return {
      dep: 'store',
      message: 'store injectable must expose load() and save()'
    };
  }
  return null;
}

/**
 * @param {object} options
 */
function resolveBacking(options) {
  if (options.map instanceof Map) {
    return { type: 'map', map: options.map };
  }
  if (
    options.store &&
    typeof options.store.load === 'function' &&
    typeof options.store.save === 'function'
  ) {
    return { type: 'store', store: options.store };
  }
  return { type: 'memory', entries: [] };
}

/**
 * @param {object} safe
 */
function normalizeCost(safe) {
  const extracted = extractEntryCost(safe);
  return {
    tokens: extracted.tokens,
    costUnits: extracted.costUnits
  };
}

/**
 * Strip ledger-owned fields; remainder is sanitized payload.
 * @param {object} safe
 */
function extractPayload(safe) {
  if (!safe || typeof safe !== 'object') return {};
  const skip = new Set([
    'missionId',
    'sessionId',
    'kind',
    'priorTip',
    'custodyDigest',
    'cost',
    'tokens',
    'costUnits',
    'digest',
    'prevDigest',
    'seq',
    'at',
    'ledgerKind',
    'PRODUCTION_READY',
    'payload'
  ]);
  /** @type {Record<string, unknown>} */
  const out = {};
  if (safe.payload && typeof safe.payload === 'object') {
    Object.assign(out, safe.payload);
  }
  for (const [k, v] of Object.entries(safe)) {
    if (skip.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * @param {object} entry
 */
function publicEntryView(entry) {
  if (!entry) return null;
  return sanitizeLedgerPayload({
    seq: entry.seq,
    at: entry.at,
    prevDigest: entry.prevDigest,
    digest: entry.digest,
    missionId: entry.missionId,
    sessionId: entry.sessionId,
    kind: entry.kind,
    priorTip: entry.priorTip,
    custodyDigest: entry.custodyDigest,
    cost: entry.cost,
    payload: entry.payload,
    ledgerKind: AJ_KIND,
    PRODUCTION_READY: AJ_PRODUCTION_READY
  });
}

/**
 * @param {object} entry
 * @param {object} filter
 */
function matchesQuery(entry, filter) {
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
  if (filter.from != null && entry.at != null && String(entry.at) < String(filter.from)) {
    return false;
  }
  if (filter.to != null && entry.at != null && String(entry.at) > String(filter.to)) {
    return false;
  }
  return true;
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

export default createEvidenceEconomyLedger;
