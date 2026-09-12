/**
 * @module agent-handoff-validator
 * SPEC-0032 / Mission AA — AgentHandoffEnvelope V3 validator.
 *
 * Fail-closed schema gate for Architect → Builder → Verifier handoffs.
 * BUILDER != VERIFIER is enforced at the dispatcher; this module validates
 * envelope shape, roles (with alias normalization), and custody fields.
 *
 * NON-CLAIM:
 *   not PRODUCTION_READY
 *   not CloudAgent fleet
 *   not unbounded swarm
 *   envelope validation ≠ production multi-agent autonomy
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const HANDOFF_VALIDATOR_PRODUCTION_READY = 'NO';

export const HANDOFF_VALIDATOR_KIND = 'eos-agent-handoff-validator';

/** Canonical roles after alias normalization. */
export const CANONICAL_ROLES = Object.freeze([
  'ARCHITECT',
  'BUILDER',
  'VERIFIER'
]);

/** Accepted input roles (including aliases). */
export const ACCEPTED_ROLES = Object.freeze([
  'ARCHITECT',
  'PLANNER',
  'BUILDER',
  'CODER',
  'VERIFIER',
  'QA'
]);

/** Alias → canonical. PLANNER→ARCHITECT, CODER→BUILDER, QA→VERIFIER. */
export const ROLE_ALIASES = Object.freeze({
  PLANNER: 'ARCHITECT',
  CODER: 'BUILDER',
  QA: 'VERIFIER',
  ARCHITECT: 'ARCHITECT',
  BUILDER: 'BUILDER',
  VERIFIER: 'VERIFIER'
});

export const HANDOFF_SCHEMA_VERSION = '3';

export const HANDOFF_CODES = Object.freeze({
  INVALID_ENVELOPE: 'INVALID_ENVELOPE',
  SCHEMA_VERSION_REQUIRED: 'SCHEMA_VERSION_REQUIRED',
  SCHEMA_VERSION_UNSUPPORTED: 'SCHEMA_VERSION_UNSUPPORTED',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_ISSUED_AT: 'INVALID_ISSUED_AT',
  INVALID_CUSTODY: 'INVALID_CUSTODY',
  INVALID_TYPE: 'INVALID_TYPE'
});

/**
 * Typed fail-closed error for AgentHandoffEnvelope validation.
 */
export class AgentHandoffValidationError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = HANDOFF_CODES.INVALID_ENVELOPE, details = {}) {
    super(message);
    this.name = 'AgentHandoffValidationError';
    this.code = code;
    Object.assign(this, details);
  }
}

/**
 * Normalize a role string to canonical ARCHITECT | BUILDER | VERIFIER.
 * Accepts aliases PLANNER, CODER, QA (case-insensitive).
 * @param {unknown} raw
 * @returns {string|null} canonical role or null if unrecognized
 */
export function normalizeRole(raw) {
  if (raw == null) return null;
  const key = String(raw).trim().toUpperCase();
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(ROLE_ALIASES, key)) {
    return ROLE_ALIASES[key];
  }
  return null;
}

/**
 * True when schemaVersion is V3 ('3' | 3).
 * @param {unknown} v
 * @returns {boolean}
 */
export function isSchemaV3(v) {
  return v === 3 || v === '3';
}

/**
 * Loose ISO-8601 check (must parse to a valid Date and look like ISO).
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isIsoIssuedAt(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  const s = raw.trim();
  // Require YYYY-MM-DD… shape; reject bare numbers / locale strings
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return false;
  }
  const t = Date.parse(s);
  return Number.isFinite(t);
}

/**
 * Validate optional custody block: { prevHash?, sha256? } — each if present
 * must be a non-empty string (typically 64-hex, but we only require string).
 * @param {unknown} custody
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateCustody(custody) {
  const errors = [];
  if (custody == null) return { ok: true, errors };
  if (typeof custody !== 'object' || Array.isArray(custody)) {
    errors.push('custody must be an object when present');
    return { ok: false, errors };
  }
  for (const key of ['prevHash', 'sha256']) {
    if (custody[key] != null && typeof custody[key] !== 'string') {
      errors.push(`custody.${key} must be a string when present`);
    } else if (typeof custody[key] === 'string' && custody[key].length === 0) {
      errors.push(`custody.${key} must be non-empty when present`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Validate AgentHandoffEnvelope V3 (fail-closed).
 *
 * Frozen required fields:
 *   schemaVersion: '3' | 3
 *   handoffId, fromRole, toRole, fromAgentId, toAgentId
 *   payload (object)
 *   issuedAt (ISO string)
 * Optional: taskRef, changeId, custody: { prevHash?, sha256? }
 *
 * Roles normalized: PLANNER→ARCHITECT, CODER→BUILDER, QA→VERIFIER.
 *
 * @param {unknown} envelope
 * @returns {{ ok: boolean, errors: string[], normalized?: object, PRODUCTION_READY: 'NO' }}
 */
export function validateAgentHandoffEnvelope(envelope) {
  /** @type {string[]} */
  const errors = [];

  if (envelope == null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return {
      ok: false,
      errors: ['envelope must be a non-null object'],
      PRODUCTION_READY: HANDOFF_VALIDATOR_PRODUCTION_READY
    };
  }

  const e = /** @type {Record<string, unknown>} */ (envelope);

  // schemaVersion — V3 required
  if (e.schemaVersion === undefined || e.schemaVersion === null || e.schemaVersion === '') {
    errors.push('schemaVersion is required (V3)');
  } else if (!isSchemaV3(e.schemaVersion)) {
    errors.push(`schemaVersion must be V3 ('3'|3), got ${JSON.stringify(e.schemaVersion)}`);
  }

  // Required string ids
  for (const field of ['handoffId', 'fromAgentId', 'toAgentId']) {
    if (typeof e[field] !== 'string' || !String(e[field]).trim()) {
      errors.push(`${field} is required (non-empty string)`);
    }
  }

  // Roles
  const fromCanon = normalizeRole(e.fromRole);
  const toCanon = normalizeRole(e.toRole);
  if (!fromCanon) {
    errors.push(
      `fromRole invalid; accepted: ${ACCEPTED_ROLES.join('|')} (aliases PLANNER→ARCHITECT, CODER→BUILDER, QA→VERIFIER)`
    );
  }
  if (!toCanon) {
    errors.push(
      `toRole invalid; accepted: ${ACCEPTED_ROLES.join('|')} (aliases PLANNER→ARCHITECT, CODER→BUILDER, QA→VERIFIER)`
    );
  }

  // payload must be a plain object
  if (e.payload == null || typeof e.payload !== 'object' || Array.isArray(e.payload)) {
    errors.push('payload is required and must be an object');
  }

  // issuedAt ISO
  if (!isIsoIssuedAt(e.issuedAt)) {
    errors.push('issuedAt is required (ISO-8601 string)');
  }

  // Optional taskRef / changeId — if present, must be string
  for (const opt of ['taskRef', 'changeId']) {
    if (e[opt] != null && typeof e[opt] !== 'string') {
      errors.push(`${opt} must be a string when present`);
    }
  }

  const custodyCheck = validateCustody(e.custody);
  if (!custodyCheck.ok) {
    errors.push(...custodyCheck.errors);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      PRODUCTION_READY: HANDOFF_VALIDATOR_PRODUCTION_READY
    };
  }

  /** @type {Record<string, unknown>} */
  const normalized = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    handoffId: String(e.handoffId).trim(),
    fromRole: fromCanon,
    toRole: toCanon,
    fromAgentId: String(e.fromAgentId).trim(),
    toAgentId: String(e.toAgentId).trim(),
    payload: { ...(/** @type {object} */ (e.payload)) },
    issuedAt: String(e.issuedAt).trim()
  };
  if (typeof e.taskRef === 'string') normalized.taskRef = e.taskRef;
  if (typeof e.changeId === 'string') normalized.changeId = e.changeId;
  if (e.custody && typeof e.custody === 'object') {
    const c = /** @type {Record<string, unknown>} */ (e.custody);
    normalized.custody = {};
    if (typeof c.prevHash === 'string') normalized.custody.prevHash = c.prevHash;
    if (typeof c.sha256 === 'string') normalized.custody.sha256 = c.sha256;
  }

  return {
    ok: true,
    errors: [],
    normalized,
    PRODUCTION_READY: HANDOFF_VALIDATOR_PRODUCTION_READY
  };
}

/**
 * Assert variant — throws AgentHandoffValidationError on failure.
 * @param {unknown} envelope
 * @returns {object} normalized envelope
 */
export function assertAgentHandoffEnvelope(envelope) {
  const result = validateAgentHandoffEnvelope(envelope);
  if (!result.ok) {
    throw new AgentHandoffValidationError(
      `AgentHandoffEnvelope invalid: ${result.errors.join('; ')}`,
      result.errors.some((x) => x.includes('schemaVersion'))
        ? HANDOFF_CODES.SCHEMA_VERSION_REQUIRED
        : HANDOFF_CODES.INVALID_ENVELOPE,
      { errors: result.errors }
    );
  }
  return result.normalized;
}

export default validateAgentHandoffEnvelope;
