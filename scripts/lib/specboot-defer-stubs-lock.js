import fs from 'node:fs';
import path from 'node:path';

/**
 * @module specboot-defer-stubs-lock
 * U7 — SpecBoot DEFER stubs INDEX lock (Ladder 9 K7).
 *
 * Fail-closed: three INDEX stubs + ritual + evidence must exist with
 * INDEX/DEFER/SSOT/no-Gentleman-invent language, PRODUCTION_READY=NO,
 * Fundacion Delta=0. Mode INDEX_STUBS. Not part of src/core.
 *
 * NON-CLAIM: INDEX stub != Gentleman standards complete. PRODUCTION_READY: NO
 */

export const SPECBOOT_DEFER_STUBS_EVIDENCE_DOC =
  'docs/releases/EOS_U7_SPECBOOT_DEFER_STUBS_2026-09-09.md';

export const SPECBOOT_DEFER_STUBS_RITUAL_DOC =
  'docs/harness/SPECBOOT_DEFER_STUBS_RITUAL.md';

export const SPECBOOT_DEFER_STUB_PATHS = Object.freeze([
  'docs/development_guide.md',
  'docs/documentation-standards.md',
  'docs/frontend-standards.md'
]);

export const SPECBOOT_DEFER_STUBS_EVIDENCE_REQUIRED_SECTIONS = Object.freeze([
  '## Objetivo (U7 / K7 DoD)',
  '## Disposition',
  '## No-claims',
  'INDEX_STUBS',
  'DEFER',
  'Gentleman',
  'PRODUCTION_READY',
  'NON-CLAIM',
  'CloudAgent',
  'ai-specs'
]);

export const SPECBOOT_DEFER_STUBS_RITUAL_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Legal modes',
  '## 2.1 INDEX_STUBS',
  '## 2.2 IGNORE',
  '## 5. FORBIDDEN',
  '## 6. Non-claims',
  'FORBIDDEN',
  'Gentleman invent',
  'INDEX_STUBS',
  'CloudAgent out of'
]);

export const SPECBOOT_DEFER_STUB_REQUIRED_NEEDLES = Object.freeze([
  'INDEX',
  'DEFER',
  'PRODUCTION_READY',
  'base-standards',
  'Gentleman'
]);

export const SPECBOOT_DEFER_STUBS_REQUIRED_PATHS = Object.freeze([
  SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
  SPECBOOT_DEFER_STUBS_RITUAL_DOC,
  ...SPECBOOT_DEFER_STUB_PATHS,
  'scripts/lib/specboot-defer-stubs-lock.js',
  'scripts/ci/specboot-defer-stubs-gate.js',
  'tests/eos-u7-specboot-defer-stubs.test.js',
  'openspec/changes/eos-u7-specboot-defer-stubs/proposal.md'
]);

export const SPECBOOT_DEFER_STUBS_NON_CLAIMS = Object.freeze([
  'INDEX stub != Gentleman / LIDR standards complete',
  'FORBIDDEN Gentleman invent / mass invent content',
  'triage / PROMOTE != PRODUCTION_READY flip',
  'ai-specs foreign remain DEFER unstaged',
  'PRODUCTION_READY remains NO',
  'IGNORE not used for SpecBoot-named checklist paths in U7'
]);

function inferModeFromEvidence(text) {
  if (text.includes('INDEX_STUBS')) return 'INDEX_STUBS';
  if (text.includes('IGNORE') && text.includes('Disposition')) return 'IGNORE';
  return 'UNKNOWN';
}

/**
 * @param {string} rootDir
 * @param {object} [options]
 */
export function auditSpecbootDeferStubsLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  let mode = 'UNKNOWN';
  const type = 'specboot-defer-stubs-lock';

  if (options.docMissing === true) {
    failures.push({
      path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
      message: 'U7 SpecBoot DEFER stubs evidence doc missing (fail-closed)',
      type
    });
    return { ok: false, checks, failures, mode };
  }

  let evidenceText = options.evidenceDocText;
  if (evidenceText === undefined) {
    const full = path.join(rootDir, SPECBOOT_DEFER_STUBS_EVIDENCE_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
        message: 'U7 SpecBoot DEFER stubs evidence doc missing (fail-closed)',
        type
      });
      return { ok: false, checks, failures, mode };
    }
    evidenceText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC + ' exists',
    status: 'VERIFIED',
    type
  });

  let ritualText = options.ritualDocText;
  if (ritualText === undefined) {
    const full = path.join(rootDir, SPECBOOT_DEFER_STUBS_RITUAL_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: SPECBOOT_DEFER_STUBS_RITUAL_DOC,
        message: 'U7 SpecBoot DEFER stubs ritual missing (fail-closed)',
        type
      });
      return { ok: false, checks, failures, mode };
    }
    ritualText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: SPECBOOT_DEFER_STUBS_RITUAL_DOC + ' exists',
    status: 'VERIFIED',
    type
  });

  for (const needle of SPECBOOT_DEFER_STUBS_EVIDENCE_REQUIRED_SECTIONS) {
    if (!evidenceText.includes(needle)) {
      failures.push({
        path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
        message: 'U7 evidence required section/needle missing: ' + needle,
        type
      });
    }
  }
  if (
    failures.filter(
      (f) =>
        f.path === SPECBOOT_DEFER_STUBS_EVIDENCE_DOC &&
        /required section/.test(f.message)
    ).length === 0
  ) {
    checks.push({
      path: 'U7 evidence required sections present',
      status: 'VERIFIED',
      type
    });
  }

  for (const needle of SPECBOOT_DEFER_STUBS_RITUAL_REQUIRED_SECTIONS) {
    if (!ritualText.includes(needle)) {
      failures.push({
        path: SPECBOOT_DEFER_STUBS_RITUAL_DOC,
        message: 'U7 ritual required section/needle missing: ' + needle,
        type
      });
    }
  }
  if (
    failures.filter(
      (f) =>
        f.path === SPECBOOT_DEFER_STUBS_RITUAL_DOC &&
        /required section/.test(f.message)
    ).length === 0
  ) {
    checks.push({
      path: 'U7 ritual required sections present',
      status: 'VERIFIED',
      type
    });
  }

  const productionReadyNo =
    evidenceText.includes('PRODUCTION_READY:** NO') ||
    evidenceText.includes('PRODUCTION_READY: NO') ||
    evidenceText.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
      message: 'U7 evidence must keep PRODUCTION_READY: NO',
      type
    });
  } else {
    checks.push({
      path: 'U7 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type
    });
  }

  mode = inferModeFromEvidence(evidenceText);
  if (mode !== 'INDEX_STUBS') {
    failures.push({
      path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
      message: 'U7 evidence must declare disposition mode INDEX_STUBS',
      type
    });
  } else {
    checks.push({
      path: 'U7 mode INDEX_STUBS',
      status: 'VERIFIED',
      type
    });
  }

  const inventBan =
    evidenceText.includes('no Gentleman invent') ||
    evidenceText.includes('No Gentleman invent') ||
    evidenceText.includes('Gentleman invent') ||
    ritualText.includes('Gentleman invent');
  if (!inventBan) {
    failures.push({
      path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
      message: 'U7 must forbid Gentleman invent / mass invent',
      type
    });
  } else {
    checks.push({
      path: 'U7 NON-CLAIM no Gentleman invent',
      status: 'VERIFIED',
      type
    });
  }

  const aiSpecsDefer =
    evidenceText.includes('ai-specs') && evidenceText.includes('DEFER');
  if (!aiSpecsDefer) {
    failures.push({
      path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
      message: 'U7 evidence must keep foreign ai-specs DEFER',
      type
    });
  } else {
    checks.push({
      path: 'U7 ai-specs remain DEFER',
      status: 'VERIFIED',
      type
    });
  }

  // Affirmative COMPLETE claim only — ignore FORBIDDEN / pretend / must-not lines
  const affirmativeGentlemanComplete = evidenceText
    .split(/\r?\n/)
    .some((line) => {
      if (/FORBIDDEN|pretend|must not|must not claim|NON-CLAIM|≠|!=/i.test(line)) {
        return false;
      }
      return /Gentleman standards (COMPLETE|complete|DONE)/.test(line);
    });
  if (affirmativeGentlemanComplete) {
    failures.push({
      path: SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
      message:
        'U7 fail-closed: evidence must not claim Gentleman standards complete/wholesale fill',
      type
    });
  }

  if (!options.skipStubChecks) {
    const stubTexts = options.stubTexts || {};
    for (const rel of SPECBOOT_DEFER_STUB_PATHS) {
      let text = stubTexts[rel];
      if (text === undefined) {
        const full = path.join(rootDir, rel);
        if (!fs.existsSync(full)) {
          failures.push({
            path: rel,
            message: 'Required U7 INDEX stub missing',
            type
          });
          continue;
        }
        text = fs.readFileSync(full, 'utf8');
      }
      for (const needle of SPECBOOT_DEFER_STUB_REQUIRED_NEEDLES) {
        if (!text.includes(needle)) {
          failures.push({
            path: rel,
            message: 'INDEX stub missing required needle: ' + needle,
            type
          });
        }
      }
      if (
        /theme-kit|Gentleman Design System|LIDR frontend kit imported wholesale/i.test(
          text
        )
      ) {
        failures.push({
          path: rel,
          message: 'INDEX stub must not invent Gentleman/theme-kit wholesale',
          type
        });
      }
    }
    if (
      failures.filter((f) => SPECBOOT_DEFER_STUB_PATHS.includes(f.path))
        .length === 0
    ) {
      checks.push({
        path: 'U7 three INDEX stubs present with required needles',
        status: 'VERIFIED',
        type
      });
    }
  }

  if (!options.skipPathChecks) {
    for (const rel of SPECBOOT_DEFER_STUBS_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required U7 SpecBoot DEFER stubs path missing',
          type
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
    mode
  };
}
