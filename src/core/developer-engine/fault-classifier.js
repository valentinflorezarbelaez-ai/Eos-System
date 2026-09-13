/**
 * @module fault-classifier
 * SPEC-0057 / Mission AZ — Deterministic fault classification for Self-Repair
 * & FDIR Remediation Bridge.
 *
 * Classes: SYNTAX_ERROR, MISSING_DEPENDENCY, BUDGET_TRIP, SCHEMA_DEVIATION,
 * UNBOUNDED_SELF_MOD, FUNDACION_WRITE, LAW_VI_LEAK, UNKNOWN.
 *
 * NON-CLAIM:
 *   classifier ≠ unbounded self-modifying AGI /
 *   ≠ unsupervised internet remediator /
 *   ≠ CloudAgent self-heal fleet
 *   not BA/BB; Fundacion Δ=0; Antigravity-first; L17 CLOSED; L18 OPEN;
 *   AX+AY MEASURED; compose/extend V FDIR + AX loop faults (inject only).
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AZ_CLASSIFIER_PRODUCTION_READY = 'NO';

export const AZ_CLASSIFIER_KIND = 'eos-deterministic-fault-classifier';

export const FAULT_CLASSES = Object.freeze({
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  MISSING_DEPENDENCY: 'MISSING_DEPENDENCY',
  BUDGET_TRIP: 'BUDGET_TRIP',
  SCHEMA_DEVIATION: 'SCHEMA_DEVIATION',
  UNBOUNDED_SELF_MOD: 'UNBOUNDED_SELF_MOD',
  FUNDACION_WRITE: 'FUNDACION_WRITE',
  LAW_VI_LEAK: 'LAW_VI_LEAK',
  UNKNOWN: 'UNKNOWN'
});

/** Faults that are remediable under the AZ bridge (bounded). */
export const REMEDIABLE_CLASSES = Object.freeze([
  FAULT_CLASSES.SYNTAX_ERROR,
  FAULT_CLASSES.MISSING_DEPENDENCY,
  FAULT_CLASSES.BUDGET_TRIP,
  FAULT_CLASSES.SCHEMA_DEVIATION
]);

/** Faults that MUST DENY (never auto-remediate). */
export const DENY_CLASSES = Object.freeze([
  FAULT_CLASSES.UNBOUNDED_SELF_MOD,
  FAULT_CLASSES.FUNDACION_WRITE,
  FAULT_CLASSES.LAW_VI_LEAK
]);

/**
 * Normalize fault input into a plain object.
 * @param {unknown} fault
 * @returns {object|null}
 */
export function normalizeFault(fault) {
  if (fault == null) return null;
  if (typeof fault === 'string') {
    return { message: fault, code: null, class: null };
  }
  if (typeof fault !== 'object') return null;
  return /** @type {object} */ (fault);
}

/**
 * Classify a governed developer-loop fault deterministically.
 * Priority: explicit class → code → message heuristics → UNKNOWN.
 *
 * @param {unknown} fault
 * @returns {{ class: string, remediable: boolean, deny: boolean, reason: string, fault: object|null }}
 */
export function classifyFault(fault) {
  const f = normalizeFault(fault);
  if (!f) {
    return {
      class: FAULT_CLASSES.UNKNOWN,
      remediable: false,
      deny: false,
      reason: 'invalid or missing fault',
      fault: null
    };
  }

  const explicit =
    f.class != null
      ? String(f.class).toUpperCase()
      : f.faultClass != null
        ? String(f.faultClass).toUpperCase()
        : f.kind != null &&
            Object.values(FAULT_CLASSES).includes(String(f.kind).toUpperCase())
          ? String(f.kind).toUpperCase()
          : null;

  if (explicit && Object.values(FAULT_CLASSES).includes(explicit)) {
    return finalize(explicit, f);
  }

  const code = String(f.code || f.errorCode || f.name || '').toUpperCase();
  const msg = String(f.message || f.reason || f.detail || '').toUpperCase();
  const blob = `${code} ${msg} ${String(f.target || '')} ${String(f.action || '')}`.toUpperCase();

  // DENY classes first (fail-closed)
  if (
    /UNBOUNDED[_-]?SELF[_-]?MOD|SELF[_-]?MODIFYING[_-]?AGI|UNBOUNDED[_-]?REWRITE/.test(
      blob
    ) ||
    f.unboundedSelfMod === true ||
    f.selfModify === true
  ) {
    return finalize(FAULT_CLASSES.UNBOUNDED_SELF_MOD, f);
  }
  if (
    /FUNDACION/.test(blob) ||
    f.fundacion === true ||
    f.writeFundacion === true
  ) {
    return finalize(FAULT_CLASSES.FUNDACION_WRITE, f);
  }
  if (
    /LAW[_-]?VI|PROVIDER[_-]?PREFIX|SECRET[_-]?LEAK|LEAKAGE/.test(blob) ||
    f.lawViLeak === true
  ) {
    return finalize(FAULT_CLASSES.LAW_VI_LEAK, f);
  }

  // Remediable classes
  if (
    /SYNTAX|PARSE[_-]?ERROR|UNEXPECTED[_-]?TOKEN|UNTERMINATED|UNMATCHED/.test(
      blob
    )
  ) {
    return finalize(FAULT_CLASSES.SYNTAX_ERROR, f);
  }
  if (
    /MISSING[_-]?(DEP|DEPENDENCY|MODULE|IMPORT)|MODULE[_-]?NOT[_-]?FOUND|CANNOT[_-]?FIND[_-]?MODULE|ERR_MODULE_NOT_FOUND/.test(
      blob
    )
  ) {
    return finalize(FAULT_CLASSES.MISSING_DEPENDENCY, f);
  }
  if (
    /BUDGET|TOKEN[_-]?LIMIT|COST[_-]?TRIP|MAX[_-]?ATTEMPTS|ATTEMPT[_-]?BUDGET/.test(
      blob
    )
  ) {
    return finalize(FAULT_CLASSES.BUDGET_TRIP, f);
  }
  if (
    /SCHEMA|VALIDATION|DEVIATION|SHAPE[_-]?MISMATCH|INVALID[_-]?SCHEMA/.test(
      blob
    )
  ) {
    return finalize(FAULT_CLASSES.SCHEMA_DEVIATION, f);
  }

  return finalize(FAULT_CLASSES.UNKNOWN, f);
}

/**
 * @param {string} cls
 * @param {object} f
 */
function finalize(cls, f) {
  const deny = DENY_CLASSES.includes(cls);
  const remediable = !deny && REMEDIABLE_CLASSES.includes(cls);
  return {
    class: cls,
    remediable,
    deny,
    reason: remediable
      ? `classified remediable: ${cls}`
      : deny
        ? `classified deny: ${cls}`
        : `classified not remediable: ${cls}`,
    fault: {
      message: f.message != null ? String(f.message) : null,
      code: f.code != null ? String(f.code) : null,
      artifactPath: f.artifactPath != null ? String(f.artifactPath) : null,
      target: f.target != null ? String(f.target) : null
    }
  };
}

/**
 * @param {string} cls
 * @returns {boolean}
 */
export function isRemediableClass(cls) {
  return REMEDIABLE_CLASSES.includes(String(cls).toUpperCase());
}

/**
 * @param {string} cls
 * @returns {boolean}
 */
export function isDenyClass(cls) {
  return DENY_CLASSES.includes(String(cls).toUpperCase());
}

export default {
  AZ_CLASSIFIER_KIND,
  AZ_CLASSIFIER_PRODUCTION_READY,
  FAULT_CLASSES,
  REMEDIABLE_CLASSES,
  DENY_CLASSES,
  normalizeFault,
  classifyFault,
  isRemediableClass,
  isDenyClass
};
