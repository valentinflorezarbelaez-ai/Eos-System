/**
 * Gentleman Programming + LIDR Academy ecosystem integration lock (fail-closed).
 *
 * The integration with both upstream ecosystems is prose spread over an ADR, Cursor
 * rules, skills and research records. Prose drifts silently: between 2026-09-04 and
 * 2026-10-01 upstream renamed a core acronym, archived a repository EOS still cited as
 * a live design source, and added a review-depth model EOS never recorded. This lock
 * turns the integration into checked invariants:
 *
 *   1. REGISTRY SHAPE — docs/governance/GENTLEMAN_ECOSYSTEM_REGISTRY.json parses and
 *      every component declares the full contract (upstream, license, upstreamStatus,
 *      eosStance, vendored, installedByEos, rationale, eosSurfaces).
 *   2. SURFACE EXISTENCE — every eosSurfaces path resolves on disk, so a stance can
 *      never point at a surface that was renamed or deleted.
 *   3. DEAD UPSTREAM — a component whose upstreamStatus is ARCHIVED or DEPRECATED may
 *      not carry an ADOPT or ADAPT stance. Citing an archived repository as a live
 *      source is how stale attribution survives review.
 *   4. VENDORING LICENSE — vendored: true requires a resolved SPDX license. NOASSERTION
 *      upstream may be referenced but never copied.
 *   5. VOCABULARY — each acronym's canonical expansion is attested in the surfaces that
 *      teach it, and its superseded expansions appear nowhere in the governed tree
 *      except in explicitly declared exempt paths, each of which must carry a marker
 *      pointing at the amending decision record.
 *   6. REQUIRED MARKERS — a component's declared markers must actually appear in one of
 *      its surfaces, so an ADOPT or ADAPT stance cannot be asserted by an empty file.
 *   7. ATTRIBUTION NOTICES — the non-endorsement notice, trademark notices and the
 *      no-vendoring statement must be present and non-empty.
 *
 * Pure Layer-0 Node.js built-ins (L0 purity). Read-only: never mutates the workspace.
 * PRODUCTION_READY: NO — local governed gate.
 *
 * NON-CLAIM: lock != integration. This lock audits recorded stances and surfaces. It
 * does not install, execute, vendor, or reach the network to validate any upstream
 * component, and it does not refresh the point-in-time license or status observations.
 */

import fs from 'node:fs';
import path from 'node:path';

export const GENTLEMAN_ECOSYSTEM_REGISTRY = 'docs/governance/GENTLEMAN_ECOSYSTEM_REGISTRY.json';

export const GENTLEMAN_ECOSYSTEM_REQUIRED_PATHS = Object.freeze([
  GENTLEMAN_ECOSYSTEM_REGISTRY,
  'scripts/lib/gentleman-ecosystem-lock.js',
  'docs/architecture/adrs/ADR-0019-gentleman-ecosystem-integration-registry.md',
  'docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md',
  '.cursor/rules/gentleman-ecosystem-bridge.mdc',
  '.cursor/rules/engram.mdc',
  'tests/gentleman-ecosystem-integration.test.js'
]);

export const VALID_STANCES = Object.freeze(['ADOPT', 'ADAPT', 'REFUSE', 'WATCH']);
export const VALID_UPSTREAM_STATUSES = Object.freeze(['ACTIVE', 'DEPRECATED', 'ARCHIVED']);
export const DEAD_UPSTREAM_STATUSES = Object.freeze(['DEPRECATED', 'ARCHIVED']);
export const LIVE_STANCES = Object.freeze(['ADOPT', 'ADAPT']);

export const REQUIRED_COMPONENT_FIELDS = Object.freeze([
  'id',
  'name',
  'owner',
  'upstream',
  'role',
  'license',
  'upstreamStatus',
  'eosStance',
  'rationale'
]);

export const REQUIRED_NOTICE_FIELDS = Object.freeze(['nonEndorsement', 'trademarks', 'vendoring']);

/**
 * Governed roots scanned for superseded vocabulary.
 *
 * tests/ is excluded on purpose: negative fixtures legitimately contain the superseded
 * strings. docs/evidence/ and archive/ are excluded because sealed receipts and archived
 * records are immutable, so a finding there would be unfixable by design.
 */
export const GOVERNED_SCAN_ROOTS = Object.freeze([
  '.agents',
  '.cursor',
  'ai-specs',
  'docs',
  'openspec',
  'scripts',
  'src'
]);

export const GOVERNED_ROOT_FILES = Object.freeze([
  '.cursorrules',
  'AGENTS.md',
  'CLAUDE.md',
  'CONSTITUTION.md',
  'GEMINI.md',
  'GOVERNANCE.md',
  'README.md',
  'codex.md'
]);

export const GOVERNED_EXCLUDED_PREFIXES = Object.freeze([
  'archive/',
  'docs/archive/',
  'docs/evidence/',
  'node_modules/'
]);

const SCANNED_EXTENSIONS = Object.freeze(['.md', '.mdc', '.json', '.js']);

/**
 * Reads and parses the ecosystem registry.
 * @param {string} rootDir
 * @returns {object}
 */
export function readGentlemanEcosystemRegistry(rootDir) {
  const abs = path.join(rootDir, GENTLEMAN_ECOSYSTEM_REGISTRY);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

/**
 * Lists every governed file (relative, slash-separated) eligible for a vocabulary scan.
 * @param {string} rootDir
 * @returns {string[]}
 */
export function collectGovernedFiles(rootDir) {
  const found = [];
  const isExcluded = (rel) => GOVERNED_EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix));

  const walk = (absDir) => {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, entry.name);
      const rel = path.relative(rootDir, abs).split(path.sep).join('/');
      if (isExcluded(`${rel}/`) || isExcluded(rel)) continue;
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(abs);
      } else if (entry.isFile() && SCANNED_EXTENSIONS.includes(path.extname(entry.name))) {
        found.push(rel);
      }
    }
  };

  for (const root of GOVERNED_SCAN_ROOTS) {
    const abs = path.join(rootDir, root);
    if (fs.existsSync(abs)) walk(abs);
  }
  for (const file of GOVERNED_ROOT_FILES) {
    const abs = path.join(rootDir, file);
    if (fs.existsSync(abs)) found.push(file);
  }

  return found.sort();
}

/**
 * Finds governed files containing a superseded expansion, minus the declared exemptions.
 * @param {string} rootDir
 * @param {string} phrase superseded expansion to hunt
 * @param {string[]} exemptPaths declared exempt relative paths
 * @returns {string[]} offending relative paths
 */
export function findVocabularyViolations(rootDir, phrase, exemptPaths = []) {
  const exempt = new Set(exemptPaths);
  const offenders = [];
  for (const rel of collectGovernedFiles(rootDir)) {
    if (exempt.has(rel)) continue;
    const content = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    if (content.includes(phrase)) offenders.push(rel);
  }
  return offenders;
}

/**
 * True when at least one of the candidate paths contains the marker. Directory
 * candidates are satisfied by any governed file beneath them.
 * @param {string} rootDir
 * @param {string[]} candidates
 * @param {string} marker
 * @returns {boolean}
 */
export function markerPresentIn(rootDir, candidates, marker) {
  for (const rel of candidates) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) {
      const nested = collectGovernedFiles(rootDir).filter((f) => f.startsWith(`${rel}/`));
      if (nested.some((f) => fs.readFileSync(path.join(rootDir, f), 'utf8').includes(marker))) {
        return true;
      }
      continue;
    }
    if (fs.readFileSync(abs, 'utf8').includes(marker)) return true;
  }
  return false;
}

/**
 * Audits the ecosystem integration invariants.
 * @param {string} rootDir
 * @returns {{ checks: object[], failures: object[], componentCount: number }}
 */
export function auditGentlemanEcosystemLock(rootDir) {
  const checks = [];
  const failures = [];
  const type = 'gentleman-ecosystem-lock';

  for (const rel of GENTLEMAN_ECOSYSTEM_REQUIRED_PATHS) {
    if (fs.existsSync(path.join(rootDir, rel))) {
      checks.push({ path: `${rel} exists`, status: 'VERIFIED', type });
    } else {
      failures.push({ path: rel, message: 'required path missing (fail-closed)', type });
      return { checks, failures, componentCount: 0 };
    }
  }

  let registry;
  try {
    registry = readGentlemanEcosystemRegistry(rootDir);
  } catch (err) {
    failures.push({
      path: GENTLEMAN_ECOSYSTEM_REGISTRY,
      message: `registry does not parse: ${err.message}`,
      type
    });
    return { checks, failures, componentCount: 0 };
  }

  for (const field of REQUIRED_NOTICE_FIELDS) {
    const value = registry.notices?.[field];
    const filled = Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
    if (filled) {
      checks.push({ path: `registry notices.${field} present`, status: 'VERIFIED', type });
    } else {
      failures.push({
        path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} notices.${field}`,
        message: 'attribution notice missing or empty (upstream marks require attribution)',
        type
      });
    }
  }

  if (typeof registry.notices?.nonEndorsement === 'string' && registry.notices.nonEndorsement.includes('endorsement')) {
    checks.push({ path: 'registry states non-endorsement explicitly', status: 'VERIFIED', type });
  } else {
    failures.push({
      path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} notices.nonEndorsement`,
      message: 'non-endorsement notice must state that integration implies no endorsement',
      type
    });
  }

  const components = Array.isArray(registry.components) ? registry.components : [];
  if (components.length === 0) {
    failures.push({
      path: GENTLEMAN_ECOSYSTEM_REGISTRY,
      message: 'registry declares no components (fail-closed)',
      type
    });
    return { checks, failures, componentCount: 0 };
  }

  for (const component of components) {
    const label = component.id || '<unnamed>';

    for (const field of REQUIRED_COMPONENT_FIELDS) {
      const value = component[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        failures.push({
          path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}].${field}`,
          message: 'required field missing or empty',
          type
        });
      }
    }

    for (const field of ['vendored', 'installedByEos']) {
      if (typeof component[field] !== 'boolean') {
        failures.push({
          path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}].${field}`,
          message: 'must be an explicit boolean',
          type
        });
      }
    }

    if (!VALID_STANCES.includes(component.eosStance)) {
      failures.push({
        path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}].eosStance`,
        message: `invalid stance "${component.eosStance}" (expected one of ${VALID_STANCES.join(', ')})`,
        type
      });
    }

    if (!VALID_UPSTREAM_STATUSES.includes(component.upstreamStatus)) {
      failures.push({
        path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}].upstreamStatus`,
        message: `invalid status "${component.upstreamStatus}" (expected one of ${VALID_UPSTREAM_STATUSES.join(', ')})`,
        type
      });
    }

    if (DEAD_UPSTREAM_STATUSES.includes(component.upstreamStatus) && LIVE_STANCES.includes(component.eosStance)) {
      failures.push({
        path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}]`,
        message:
          `upstreamStatus ${component.upstreamStatus} cannot carry stance ${component.eosStance} — ` +
          'an archived or deprecated upstream must not be cited as a live source',
        type
      });
    }

    if (component.vendored === true && component.license === 'NOASSERTION') {
      failures.push({
        path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}]`,
        message: 'vendored: true requires a resolved SPDX license (NOASSERTION upstream must not be copied)',
        type
      });
    }

    const surfaces = Array.isArray(component.eosSurfaces) ? component.eosSurfaces : [];
    if (surfaces.length === 0) {
      failures.push({
        path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}].eosSurfaces`,
        message: 'at least one EOS surface must be declared',
        type
      });
    }
    for (const surface of surfaces) {
      if (!fs.existsSync(path.join(rootDir, surface))) {
        failures.push({
          path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}].eosSurfaces`,
          message: `declared surface does not exist: ${surface}`,
          type
        });
      }
    }

    for (const marker of component.requiredMarkers || []) {
      if (!markerPresentIn(rootDir, surfaces, marker)) {
        failures.push({
          path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} components[${label}].requiredMarkers`,
          message: `marker "${marker}" absent from every declared surface`,
          type
        });
      }
    }
  }

  checks.push({
    path: `${components.length} ecosystem components declare a complete stance contract`,
    status: 'VERIFIED',
    type
  });

  const vocabulary = Array.isArray(registry.vocabulary) ? registry.vocabulary : [];
  if (vocabulary.length === 0) {
    failures.push({
      path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} vocabulary`,
      message: 'registry declares no vocabulary entries (fail-closed)',
      type
    });
  }

  for (const entry of vocabulary) {
    const label = entry.acronym || '<unnamed>';
    const exemptEntries = Array.isArray(entry.exemptPaths) ? entry.exemptPaths : [];
    const exemptPaths = exemptEntries.map((e) => e.path);

    for (const attested of entry.attestedIn || []) {
      if (!markerPresentIn(rootDir, [attested], entry.expansion)) {
        failures.push({
          path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} vocabulary[${label}].attestedIn`,
          message: `canonical expansion "${entry.expansion}" absent from ${attested}`,
          type
        });
      }
    }

    for (const exempt of exemptEntries) {
      const abs = path.join(rootDir, exempt.path);
      if (!fs.existsSync(abs)) {
        failures.push({
          path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} vocabulary[${label}].exemptPaths`,
          message: `exempt path does not exist: ${exempt.path}`,
          type
        });
        continue;
      }
      if (typeof exempt.reason !== 'string' || exempt.reason.trim().length === 0) {
        failures.push({
          path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} vocabulary[${label}].exemptPaths`,
          message: `exemption for ${exempt.path} has no reason`,
          type
        });
      }
      if (exempt.requiresMarker && !fs.readFileSync(abs, 'utf8').includes(exempt.requiresMarker)) {
        failures.push({
          path: exempt.path,
          message:
            `exempt from the ${label} vocabulary rule but missing marker "${exempt.requiresMarker}" — ` +
            'an exemption must point at the amending decision record',
          type
        });
      }
    }

    for (const phrase of entry.forbiddenExpansions || []) {
      const offenders = findVocabularyViolations(rootDir, phrase, exemptPaths);
      if (offenders.length === 0) {
        checks.push({
          path: `${label} superseded expansion absent from the governed tree`,
          status: 'VERIFIED',
          type
        });
      } else {
        failures.push({
          path: offenders.slice(0, 5).join(', '),
          message:
            `superseded ${label} expansion "${phrase}" found in ${offenders.length} governed file(s); ` +
            `canonical expansion is "${entry.expansion}"`,
          type
        });
      }
    }
  }

  const nonClaims = Array.isArray(registry.nonClaims) ? registry.nonClaims : [];
  if (nonClaims.length > 0) {
    checks.push({ path: `registry records ${nonClaims.length} non-claims`, status: 'VERIFIED', type });
  } else {
    failures.push({
      path: `${GENTLEMAN_ECOSYSTEM_REGISTRY} nonClaims`,
      message: 'registry must record its non-claims (epistemic honesty)',
      type
    });
  }

  return { checks, failures, componentCount: components.length };
}
