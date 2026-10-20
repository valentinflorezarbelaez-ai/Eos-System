/**
 * @module knowledge-integrity-lock
 * K1 — Knowledge graph referential integrity ratchet (docs/intelligence).
 *
 * Why: the research/pattern/anti-pattern/comparison records are worthless as
 * evidence if they cite sources or patterns that do not exist. Before this
 * lock nothing detected a dangling `SRC-00xx` citation, a duplicate id, or an
 * id that disagrees with its filename.
 *
 * Ratchet semantics (repo idiom): fail closed on NEW violations, while the
 * pre-existing gaps frozen in LEGACY_DANGLING_REFS are reported as warnings so
 * the gate is enforceable today instead of requiring a rewrite of history.
 *
 * NON-CLAIM: this lock validates graph *identity and references*, not truth.
 * A record that passes may still be wrong; that is what verification_status,
 * confidence and known_bias are for.
 */
import fs from 'node:fs';
import path from 'node:path';

export const INTELLIGENCE_ROOT = 'docs/intelligence';
export const SOURCES_FILE = 'docs/intelligence/sources/SOURCES.json';

/**
 * Frozen pre-existing dangling references. Removing an entry is allowed once a
 * matching file exists; adding one is a regression and must not happen.
 * PAT-0003 and ANT-0003 were authored in EVD-0077 and are no longer dangling.
 */
export const LEGACY_DANGLING_REFS = Object.freeze(['PAT-0004']);

/**
 * Frozen (file::id) pairs where a citation disagrees with the canonical record.
 * Scoped to the file on purpose: a per-id register would let a future
 * mis-citation of the same id slip through. Each entry is a decision waiting on
 * a human. Adding an entry is a regression.
 *
 * All four live in RSC-0001, which numbers patterns under its own scheme.
 */
export const LEGACY_ID_CONFLICTS = Object.freeze([
  'docs/intelligence/research/RSC-0001-gentleman-engram-study.json::PAT-0001',
  'docs/intelligence/research/RSC-0001-gentleman-engram-study.json::PAT-0002',
  'docs/intelligence/research/RSC-0001-gentleman-engram-study.json::PAT-0003'
]);

export const COLLECTIONS = Object.freeze([
  Object.freeze({ dir: 'research', prefix: 'RSC', id_field: 'research_id' }),
  Object.freeze({ dir: 'patterns', prefix: 'PAT', id_field: 'pattern_id' }),
  Object.freeze({ dir: 'anti-patterns', prefix: 'ANT', id_field: 'antipattern_id' }),
  Object.freeze({ dir: 'comparisons', prefix: 'CMP', id_field: 'comparison_id' })
]);

export const KNOWLEDGE_INTEGRITY_LOCK_FILE = 'scripts/lib/knowledge-integrity-lock.js';

export const KNOWLEDGE_INTEGRITY_REQUIRED_PATHS = Object.freeze([
  KNOWLEDGE_INTEGRITY_LOCK_FILE,
  'tests/knowledge-integrity.test.js',
  SOURCES_FILE,
  'docs/intelligence/sources/schema.json',
  'docs/intelligence/KNOWLEDGE_GRAPH_MODEL.md',
  'docs/intelligence/research/RSC-0021-ai-engineer-profile-and-typed-decision-models.json',
  'docs/intelligence/patterns/PAT-0001-spec-driven-development.json',
  'docs/intelligence/patterns/PAT-0003-local-first-control-plane.json',
  'docs/intelligence/anti-patterns/ANT-0003-claim-without-evidence.json',
  'docs/intelligence/patterns/PAT-0005-typed-decision-contracts.json',
  'docs/intelligence/anti-patterns/ANT-0004-llm-for-every-decision.json',
  'docs/intelligence/comparisons/CMP-0002-agent-browser-automation-options.json',
  'docs/harness/EXTERNAL_TOOL_ADOPTION_PROTOCOL.md'
]);

const ID_PATTERN = /^[A-Z]{3}-\d{4}$/;
const ID_PREFIX_PATTERN = /^[A-Z]{3}-\d{4}/;

/** Extract only the identifiers from a mixed array that also allows prose. */
export function extractRefs(values, { splitOnColon = true } = {}) {
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    if (typeof raw !== 'string') continue;
    const head = splitOnColon ? raw.split(':')[0] : raw;
    const candidate = head.trim();
    if (ID_PATTERN.test(candidate)) out.push(candidate);
  }
  return out;
}

/** Extract `{ id, title }` pairs so the cited label can be compared to the record. */
export function extractRefsWithTitles(values) {
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    if (typeof raw !== 'string') continue;
    const idx = raw.indexOf(':');
    const head = (idx === -1 ? raw : raw.slice(0, idx)).trim();
    if (!ID_PATTERN.test(head)) continue;
    const title = idx === -1 ? '' : raw.slice(idx + 1).trim();
    out.push({ id: head, title });
  }
  return out;
}

/** Lowercase, drop parentheticals and punctuation, collapse whitespace. */
export function normalizeTitle(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}


/**
 * Resolve the declared identifier of a record, tolerating the three dialects
 * that exist in the repo: the canonical schema field, `id`, and `document_id`
 * (which carries a slug suffix). Drift is reported as a warning by the caller.
 */
export function resolveDeclaredId(record, idField) {
  if (typeof record?.[idField] === 'string') {
    return { id: record[idField], field: idField, canonical: true };
  }
  for (const alt of ['id', 'document_id']) {
    const value = record?.[alt];
    if (typeof value !== 'string') continue;
    const match = value.match(ID_PREFIX_PATTERN);
    if (match) return { id: match[0], field: alt, canonical: false };
  }
  return { id: undefined, field: null, canonical: false };
}

/**
 * Pure integrity evaluation over already-loaded data.
 * @param {object} input
 * @param {string[]} input.source_ids
 * @param {Record<string, Array<{file:string, id_field:string, record:object}>>} input.collections keyed by prefix
 * @param {string[]} [input.legacy_allowlist]
 */
export function evaluateIntegrity(input) {
  const { source_ids = [], collections = {}, legacy_allowlist = [], conflict_allowlist = [] } = input;
  const checks = [];
  const failures = [];
  const warnings = [];
  const known = new Set(source_ids);
  const legacy = new Set(legacy_allowlist);

  // 1. Source identifiers must be unique.
  const seenSources = new Set();
  for (const id of source_ids) {
    if (seenSources.has(id)) {
      failures.push({ path: SOURCES_FILE, message: `Duplicate source_id ${id}`, type: 'knowledge-integrity' });
    }
    seenSources.add(id);
  }
  if (seenSources.size === source_ids.length) {
    checks.push({ path: `${SOURCES_FILE} (${seenSources.size} unique ids)`, status: 'VERIFIED', type: 'knowledge-integrity' });
  }

  const allIds = new Set();
  for (const [prefix, entries] of Object.entries(collections)) {
    const seen = new Set();
    for (const entry of entries) {
      const { file, id_field: idField, record } = entry;
      const resolved = resolveDeclaredId(record, idField);
      const declared = resolved.id;
      const fromFilename = file.split('/').pop().slice(0, 8);

      // 2. Declared id must exist and be well formed.
      if (typeof declared !== 'string' || !ID_PATTERN.test(declared)) {
        failures.push({ path: `${INTELLIGENCE_ROOT}/${prefix}`, message: `${file}: missing or malformed ${idField}`, type: 'knowledge-integrity' });
        continue;
      }
      // 2b. Non-canonical id field is drift, not breakage: warn and keep going.
      if (!resolved.canonical) {
        warnings.push({
          path: file,
          message: `Declares non-canonical id field '${resolved.field}' instead of '${idField}'`,
          type: 'knowledge-integrity'
        });
      }
      // 3. Declared id must agree with the filename.
      if (declared !== fromFilename) {
        failures.push({ path: file, message: `id ${declared} does not match filename prefix ${fromFilename}`, type: 'knowledge-integrity' });
      }
      // 4. Ids must be unique across the whole graph.
      if (seen.has(declared) || allIds.has(declared)) {
        failures.push({ path: file, message: `Duplicate or conflicting id ${declared}`, type: 'knowledge-integrity' });
      }
      seen.add(declared);
      allIds.add(declared);

      // 5. Every cited source must exist.
      for (const ref of extractRefs(record?.sources, { splitOnColon: false })) {
        if (!known.has(ref)) {
          failures.push({ path: file, message: `Dangling source reference ${ref}`, type: 'knowledge-integrity' });
        }
      }
    }
  }

  // 6. Cross-record references must resolve, and the cited title must agree with
  // the record that carries the id. A reused id is corruption, not a typo.
  const patternNames = new Map((collections.PAT || []).map((e) => [e.record?.pattern_id, e.record?.name]).filter(([id]) => Boolean(id)));
  const antiNames = new Map((collections.ANT || []).map((e) => [e.record?.antipattern_id, e.record?.name]).filter(([id]) => Boolean(id)));
  const conflictIds = new Set(conflict_allowlist);

  const refChecks = [
    { entries: collections.RSC || [], field: 'patterns', target: patternNames, label: 'pattern' },
    { entries: collections.PAT || [], field: 'anti_patterns', target: antiNames, label: 'anti-pattern' }
  ];

  for (const { entries, field, target, label } of refChecks) {
    for (const entry of entries) {
      for (const { id: ref, title } of extractRefsWithTitles(entry.record?.[field])) {
        if (!target.has(ref)) {
          const payload = { path: entry.file, message: `Dangling ${label} reference ${ref}`, type: 'knowledge-integrity' };
          if (legacy.has(ref)) warnings.push({ ...payload, message: `${payload.message} (frozen legacy gap)` });
          else failures.push(payload);
          continue;
        }
        if (!title) continue;
        const declared = target.get(ref);
        if (normalizeTitle(title) === normalizeTitle(declared)) continue;
        const payload = {
          path: entry.file,
          message: `Id ${ref} cited as '${title}' but ${label} record is named '${declared}'`,
          type: 'knowledge-integrity'
        };
        if (conflictIds.has(`${entry.file}::${ref}`)) warnings.push({ ...payload, message: `${payload.message} (frozen id conflict)` });
        else failures.push(payload);
      }
    }
  }

  if (failures.length === 0) {
    checks.push({ path: 'docs/intelligence knowledge graph referential integrity', status: 'VERIFIED', type: 'knowledge-integrity' });
  }

  return { ok: failures.length === 0, checks, failures, warnings };
}

/** Read the graph from disk and evaluate it. */
export function auditKnowledgeIntegrity(rootDir, options = {}) {
  const sourcesAbs = path.join(rootDir, SOURCES_FILE);
  const failures = [];
  const checks = [];

  if (!fs.existsSync(sourcesAbs)) {
    return {
      ok: false,
      checks,
      warnings: [],
      failures: [{ path: SOURCES_FILE, message: 'Sources registry missing', type: 'knowledge-integrity' }]
    };
  }

  let sourceIds = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(sourcesAbs, 'utf8'));
    sourceIds = (parsed.sources || []).map((s) => s.source_id).filter(Boolean);
  } catch (err) {
    return {
      ok: false,
      checks,
      warnings: [],
      failures: [{ path: SOURCES_FILE, message: `Sources registry is not valid JSON: ${err.message}`, type: 'knowledge-integrity' }]
    };
  }

  const collections = {};
  for (const { dir, prefix, id_field: idField } of COLLECTIONS) {
    const abs = path.join(rootDir, INTELLIGENCE_ROOT, dir);
    const entries = [];
    if (fs.existsSync(abs)) {
      for (const file of fs.readdirSync(abs).sort()) {
        if (!file.endsWith('.json') || !file.startsWith(prefix)) continue;
        const rel = `${INTELLIGENCE_ROOT}/${dir}/${file}`;
        try {
          entries.push({ file: rel, id_field: idField, record: JSON.parse(fs.readFileSync(path.join(abs, file), 'utf8')) });
        } catch (err) {
          failures.push({ path: rel, message: `Unparseable record: ${err.message}`, type: 'knowledge-integrity' });
        }
      }
    }
    collections[prefix] = entries;
  }

  const result = evaluateIntegrity({
    source_ids: sourceIds,
    collections,
    legacy_allowlist: options.legacyAllowlist || LEGACY_DANGLING_REFS,
    conflict_allowlist: options.conflictAllowlist || LEGACY_ID_CONFLICTS
  });

  return {
    ok: result.ok && failures.length === 0,
    checks: [...checks, ...result.checks],
    failures: [...failures, ...result.failures],
    warnings: result.warnings
  };
}
