/**
 * Defensive intelligence finding.
 * Node built-ins only. Does not fetch, clone, or store a procedure.
 */

const FIELDS = new Set(['source', 'observedOn', 'confidence', 'humanGate', 'repo', 'impact']);
const CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH']);
const SECRET = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+)/i;

export const BOUNDARY_LINES = Object.freeze([
  'SECRET_HANDLING: do not store, print, or commit secrets; a finding keeps source, date, confidence, and a human gate',
  'UNTRUSTED_INPUT: reject non-objects and unknown fields before a value is treated as a finding',
  'HUMAN_GATE: adoption stays denied until humanGate is REQUIRED',
  'NON-CLAIM: this check does not certify that EOS surpassed any security lab'
]);

export function formatDoctorBoundaryBlock() {
  return `${BOUNDARY_LINES.join('\n')}\n`;
}

function reject(code, field) {
  return field ? { ok: false, code, field } : { ok: false, code };
}

/**
 * @param {unknown} input
 * @returns {{ ok: true, finding: object } | { ok: false, code: string, field?: string }}
 */
export function recordIntelligenceFinding(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return reject('UNTRUSTED_INPUT');
  }
  for (const key of Object.keys(input)) {
    if (!FIELDS.has(key)) return reject('UNTRUSTED_INPUT', key);
  }

  const { source, observedOn, confidence, humanGate, repo, impact } = input;
  if (humanGate !== 'REQUIRED') return reject('HUMAN_GATE_REQUIRED');
  if (typeof source !== 'string' || !/^https:\/\/\S+$/.test(source) || source.length > 300) {
    return reject('SCHEMA_VIOLATION', 'source');
  }
  if (typeof observedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(observedOn)) {
    return reject('SCHEMA_VIOLATION', 'observedOn');
  }
  if (!CONFIDENCE.has(confidence)) return reject('SCHEMA_VIOLATION', 'confidence');
  if (repo !== undefined && (typeof repo !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(repo))) {
    return reject('SCHEMA_VIOLATION', 'repo');
  }
  if (impact !== undefined && (typeof impact !== 'string' || impact.length > 240 || /[\r\n]/.test(impact))) {
    return reject('SCHEMA_VIOLATION', 'impact');
  }

  const blob = [source, repo, impact].filter((value) => typeof value === 'string').join('\n');
  if (SECRET.test(blob)) return reject('SECRET_HANDLING');

  return {
    ok: true,
    finding: {
      source,
      observedOn,
      confidence,
      humanGate,
      ...(repo !== undefined ? { repo } : {}),
      ...(impact !== undefined ? { impact } : {})
    }
  };
}
