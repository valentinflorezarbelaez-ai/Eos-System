/**
 * @module tip-pin-reader
 * SPEC-0053 / Mission AV — Tip pin reader for freeze/matrix fences.
 *
 * Hermetic string inputs only — no live git required in tests.
 * Parses `main_tip:` / `evaluated_tip:` patterns (40-hex SHA).
 *
 * NON-CLAIM:
 *   tip-pin-reader ≠ auto-merge bot
 *   tip-pin-reader ≠ GH required-check enforcement
 *   tip-pin-reader ≠ GH billing change
 *   not AW
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AV_TIP_READER_PRODUCTION_READY = 'NO';

export const AV_TIP_READER_KIND = 'eos-tip-pin-reader';

/** Full 40-hex SHA tip pattern (lowercase preferred; case-insensitive match). */
export const TIP_SHA_RE = /^[0-9a-f]{40}$/i;

/** Freeze fence: main_tip: <40-hex> */
export const MAIN_TIP_LINE_RE = /^main_tip:\s*([0-9a-f]{40})\b/im;

/** Matrix fence: evaluated_tip: <40-hex> */
export const EVALUATED_TIP_LINE_RE = /^evaluated_tip:\s*([0-9a-f]{40})\b/im;

/**
 * Normalize a tip string to lowercase 40-hex, or null if invalid.
 * Accepts optional short prefix (7–39) only when opts.allowShort is true
 * — default is full-SHA only (INVALID_TIP for short).
 * @param {unknown} tip
 * @param {object} [opts]
 * @param {boolean} [opts.allowShort=false]
 * @returns {{ ok: boolean, tip: string|null, code: string, reason?: string }}
 */
export function normalizeTip(tip, opts = {}) {
  if (tip == null || tip === '') {
    return {
      ok: false,
      tip: null,
      code: 'INVALID_TIP',
      reason: 'tip missing'
    };
  }
  const s = String(tip).trim().toLowerCase();
  if (TIP_SHA_RE.test(s)) {
    return { ok: true, tip: s, code: 'OK' };
  }
  if (opts.allowShort === true && /^[0-9a-f]{7,39}$/i.test(s)) {
    return { ok: true, tip: s, code: 'OK' };
  }
  return {
    ok: false,
    tip: null,
    code: 'INVALID_TIP',
    reason: 'tip must be 40-hex SHA'
  };
}

/**
 * Parse main_tip from freeze/gate text.
 * @param {string} text
 * @returns {{ ok: boolean, tip: string|null, code: string, reason?: string }}
 */
export function parseMainTip(text) {
  if (text == null || typeof text !== 'string') {
    return {
      ok: false,
      tip: null,
      code: 'INVALID_REQUEST',
      reason: 'freeze text required'
    };
  }
  const m = text.match(MAIN_TIP_LINE_RE);
  if (!m) {
    return {
      ok: false,
      tip: null,
      code: 'INVALID_TIP',
      reason: 'main_tip not found'
    };
  }
  return normalizeTip(m[1]);
}

/**
 * Parse evaluated_tip from capability-matrix text.
 * @param {string} text
 * @returns {{ ok: boolean, tip: string|null, code: string, reason?: string }}
 */
export function parseEvaluatedTip(text) {
  if (text == null || typeof text !== 'string') {
    return {
      ok: false,
      tip: null,
      code: 'INVALID_REQUEST',
      reason: 'matrix text required'
    };
  }
  const m = text.match(EVALUATED_TIP_LINE_RE);
  if (!m) {
    return {
      ok: false,
      tip: null,
      code: 'INVALID_TIP',
      reason: 'evaluated_tip not found'
    };
  }
  return normalizeTip(m[1]);
}

/**
 * Resolve tip from either a raw SHA string or fence text.
 * Prefer explicit tip; if tip looks like multi-line fence, parse.
 * @param {object} input
 * @param {string} [input.tip] - raw tip SHA
 * @param {string} [input.fenceText] - freeze or matrix text
 * @param {'main'|'evaluated'} [input.kind='main']
 * @returns {{ ok: boolean, tip: string|null, code: string, reason?: string, source?: string }}
 */
export function resolveTipPin(input = {}) {
  if (input == null || typeof input !== 'object') {
    return {
      ok: false,
      tip: null,
      code: 'INVALID_REQUEST',
      reason: 'input required'
    };
  }
  if (input.tip != null && String(input.tip).trim() !== '') {
    const n = normalizeTip(input.tip);
    return { ...n, source: 'tip' };
  }
  if (input.fenceText != null) {
    const kind = input.kind === 'evaluated' ? 'evaluated' : 'main';
    const parsed =
      kind === 'evaluated'
        ? parseEvaluatedTip(input.fenceText)
        : parseMainTip(input.fenceText);
    return { ...parsed, source: 'fence' };
  }
  return {
    ok: false,
    tip: null,
    code: 'MISSING_DEP',
    reason: 'tip or fenceText required'
  };
}

/**
 * Create tip-pin reader surface.
 * @returns {object}
 */
export function createTipPinReader() {
  return {
    kind: AV_TIP_READER_KIND,
    PRODUCTION_READY: AV_TIP_READER_PRODUCTION_READY,
    normalizeTip,
    parseMainTip,
    parseEvaluatedTip,
    resolveTipPin,
    MAIN_TIP_LINE_RE,
    EVALUATED_TIP_LINE_RE,
    TIP_SHA_RE
  };
}

export default {
  AV_TIP_READER_KIND,
  AV_TIP_READER_PRODUCTION_READY,
  TIP_SHA_RE,
  MAIN_TIP_LINE_RE,
  EVALUATED_TIP_LINE_RE,
  normalizeTip,
  parseMainTip,
  parseEvaluatedTip,
  resolveTipPin,
  createTipPinReader
};
