/**
 * @module sealed-evd-pack
 * SPEC-0048 / Mission AQ — Sealed EVD pack helpers.
 *
 * Thin hermetic helpers for building / hashing sealed evidence export
 * packs with AJ chain-tip linkage. Injectable hash only. No I/O.
 *
 * NON-CLAIM:
 *   sealed EVD pack ≠ compliance certification product
 *   sealed EVD pack ≠ external audit platform
 *   sealed EVD pack ≠ legal notarization service
 *   not AR
 *   Fundacion Δ=0
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AQ_PACK_PRODUCTION_READY = 'NO';

export const AQ_PACK_KIND = 'eos-sealed-evd-pack';

/**
 * Stable JSON stringify (sorted keys) for digests.
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
 * Default FNV-1a style hex digest (hermetic; no crypto dep required).
 * @param {unknown} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let out = (h >>> 0).toString(16).padStart(8, '0');
  let h2 = h ^ 0xdeadbeef;
  for (let i = 0; i < s.length; i++) {
    h2 ^= s.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  out += (h2 >>> 0).toString(16).padStart(8, '0');
  let h3 = h2 ^ 0xcafebabe;
  for (let i = 0; i < s.length; i++) {
    h3 ^= s.charCodeAt(i);
    h3 = Math.imul(h3, 0x01000193);
  }
  out += (h3 >>> 0).toString(16).padStart(8, '0');
  let h4 = h3 ^ 0x0ddba11;
  for (let i = 0; i < s.length; i++) {
    h4 ^= s.charCodeAt(i);
    h4 = Math.imul(h4, 0x01000193);
  }
  out += (h4 >>> 0).toString(16).padStart(8, '0');
  while (out.length < 64) out += out;
  return out.slice(0, 64);
}

/**
 * Compute per-entry digests for a manifest (uses entry.digest if present).
 * @param {object[]} entries
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string[]}
 */
export function collectEntryDigests(entries, hashFn = defaultHash) {
  const list = Array.isArray(entries) ? entries : [];
  return list.map((e, i) => {
    if (e && typeof e === 'object' && e.digest != null) {
      return String(e.digest);
    }
    return hashFn({ index: i, entry: e });
  });
}

/**
 * Build a sealed EVD pack envelope (caller still runs Law VI sanitize).
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @param {string|null} [opts.chainTip]
 * @returns {object}
 */
export function buildSealedEvdPack(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const at = String(nowFn());
  const chainTip =
    opts.chainTip != null
      ? String(opts.chainTip)
      : body.chainTip != null
        ? String(body.chainTip)
        : null;
  const entries = Array.isArray(body.entries) ? body.entries : [];
  const entryDigests = collectEntryDigests(entries, hashFn);
  const range =
    body.range && typeof body.range === 'object' ? { ...body.range } : {};
  const manifestSource = {
    entryCount: entries.length,
    entryDigests,
    chainTip,
    range,
    at
  };
  const packDigest = hashFn(manifestSource);
  const packId =
    body.packId != null
      ? String(body.packId)
      : `AQ-PACK-${packDigest.slice(0, 12)}`;

  return {
    ...body,
    kind: AQ_PACK_KIND,
    PRODUCTION_READY: AQ_PACK_PRODUCTION_READY,
    packId,
    at,
    sealed: true,
    chainTip,
    entries,
    manifest: {
      entryCount: entries.length,
      entryDigests,
      packDigest,
      range,
      chainTip
    },
    packDigest,
    observeOnly: true,
    complianceClaim: false,
    legalNotaryClaim: false,
    externalAuditClaim: false,
    nonClaim: {
      notComplianceCert: true,
      notExternalAuditPlatform: true,
      notLegalNotary: true,
      notAr: true,
      fundacionDelta0: true,
      antigravityFirst: true,
      cloudAgentOut: true,
      observeOnly: true
    }
  };
}

/**
 * Recompute expected packDigest from a pack's manifest fields.
 * @param {object} pack
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string|null}
 */
export function recomputePackDigest(pack, hashFn = defaultHash) {
  if (!pack || typeof pack !== 'object') return null;
  const manifest = pack.manifest && typeof pack.manifest === 'object'
    ? pack.manifest
    : {};
  const entryDigests = Array.isArray(manifest.entryDigests)
    ? manifest.entryDigests
    : collectEntryDigests(pack.entries || [], hashFn);
  const source = {
    entryCount:
      typeof manifest.entryCount === 'number'
        ? manifest.entryCount
        : Array.isArray(pack.entries)
          ? pack.entries.length
          : entryDigests.length,
    entryDigests,
    chainTip:
      manifest.chainTip != null
        ? manifest.chainTip
        : pack.chainTip != null
          ? pack.chainTip
          : null,
    range:
      manifest.range && typeof manifest.range === 'object'
        ? { ...manifest.range }
        : {},
    at: pack.at != null ? String(pack.at) : null
  };
  return hashFn(source);
}

export default {
  AQ_PACK_KIND,
  AQ_PACK_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  collectEntryDigests,
  buildSealedEvdPack,
  recomputePackDigest
};
