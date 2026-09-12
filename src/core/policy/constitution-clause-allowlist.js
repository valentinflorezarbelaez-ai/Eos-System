/**
 * @module constitution-clause-allowlist
 * SPEC-0042 / Mission AK — default allowlist ids + metadata only.
 *
 * Selected CONSTITUTION MUST/SHALL clause ids that the runtime policy
 * gate MAY enforce. This is NOT a full legal interpreter and does NOT
 * auto-amend the constitution. Incomplete mapping for a critical
 * clause → fail-closed DENY (never skip).
 *
 * NON-CLAIM:
 *   constitution runtime ≠ full legal interpreter
 *   constitution runtime ≠ auto-amend constitution
 *   constitution runtime ≠ compliance certification product
 *   constitution runtime ≠ PRODUCTION_READY
 *   not AL / AM
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const AK_ALLOWLIST_PRODUCTION_READY = 'NO';

export const AK_ALLOWLIST_KIND = 'eos-constitution-clause-allowlist';

/**
 * Default allowlisted clause ids with metadata.
 * critical=true → unmapped reference MUST DENY (CRITICAL_UNMAPPED).
 */
export const DEFAULT_CLAUSE_ALLOWLIST = Object.freeze([
  Object.freeze({
    id: 'LAW_FUNDACION_DELTA0',
    title: 'Fundacion Δ=0 — always deny external Fundacion write intents',
    critical: true,
    source: 'CONSTITUTION / ADR-0013 Write Barrier'
  }),
  Object.freeze({
    id: 'LAW_PRODUCTION_READY_NO',
    title: 'Deny actions that claim PRODUCTION_READY=YES flip',
    critical: true,
    source: 'CONSTITUTION Article I / epistemic honesty'
  }),
  Object.freeze({
    id: 'LAW_VI_NO_SECRET_LITERAL',
    title: 'Deny action payloads carrying provider secret material',
    critical: true,
    source: 'Law VI — secrets never in repo / never in autonomous payloads'
  }),
  Object.freeze({
    id: 'LAW_CLOUDAGENT_OUT',
    title: 'Deny CloudAgent / cloud-coding-agent dispatch on autonomous path',
    critical: true,
    source: 'Antigravity-first / CloudAgent OUT'
  }),
  Object.freeze({
    id: 'LAW_WRITE_BARRIER',
    title: 'Deny unbounded external writes without barrier envelope',
    critical: true,
    source: 'ADR-0013 Write Barrier'
  })
]);

/**
 * @returns {string[]}
 */
export function defaultAllowlistIds() {
  return DEFAULT_CLAUSE_ALLOWLIST.map((c) => c.id);
}

/**
 * @param {string} id
 * @returns {{ id: string, title: string, critical: boolean, source: string }|null}
 */
export function lookupAllowlistClause(id) {
  const hit = DEFAULT_CLAUSE_ALLOWLIST.find((c) => c.id === id);
  return hit ? { ...hit } : null;
}

/**
 * @returns {object}
 */
export function allowlistHealth() {
  return {
    kind: AK_ALLOWLIST_KIND,
    PRODUCTION_READY: AK_ALLOWLIST_PRODUCTION_READY,
    count: DEFAULT_CLAUSE_ALLOWLIST.length,
    ids: defaultAllowlistIds(),
    nonClaim: {
      notFullLegalInterpreter: true,
      notAutoAmendConstitution: true,
      notComplianceCertification: true,
      notProductionReady: true,
      notAlAm: true,
      fundacionDelta0: true,
      notCloudAgent: true
    }
  };
}

export default {
  DEFAULT_CLAUSE_ALLOWLIST,
  defaultAllowlistIds,
  lookupAllowlistClause,
  allowlistHealth,
  AK_ALLOWLIST_KIND,
  AK_ALLOWLIST_PRODUCTION_READY
};
