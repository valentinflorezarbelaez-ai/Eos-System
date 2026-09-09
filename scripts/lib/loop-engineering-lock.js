/**
 * @module loop-engineering-lock
 * S3 — Loop Engineering + 4Q matrix verify lock (Ladder 7 K3).
 *
 * Fail-closed: docs/harness/LOOP_ENGINEERING_4Q.md must exist with required
 * cycle + 4Q section needles + NON-CLAIM / PRODUCTION_READY=NO.
 *
 * NON-CLAIM: Loop Engineering policy != productive autonomy; Loop != verify:strict.
 * This lock does not run an autonomous remediation loop.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const LOOP_ENGINEERING_INDEX = 'docs/harness/LOOP_ENGINEERING_4Q.md';

/** Sections / needles aligned with tests/eos-s3-loop-engineering-4q.test.js */
export const LOOP_ENGINEERING_REQUIRED_SECTIONS = Object.freeze([
  '## 1. Cycle',
  'guides',
  'act',
  'sensors',
  'feedback',
  '## 2. Four-quadrant matrix',
  'Feedforward × Computational',
  'Feedforward × Inferential',
  'Feedback × Computational',
  'Feedback × Inferential',
  'AGENTS.md',
  'Write Barrier',
  'verify:strict',
  'adversarial-review',
  'fusion-light',
  'HITL',
  'NON-CLAIM',
  'PRODUCTION_READY',
  'ADR-0014',
  'ADR-0017'
]);

export const LOOP_ENGINEERING_REQUIRED_PATHS = Object.freeze([
  LOOP_ENGINEERING_INDEX,
  'docs/architecture/adrs/ADR-0017-loop-engineering-4q.md',
  'scripts/lib/loop-engineering-lock.js',
  'tests/eos-s3-loop-engineering-4q.test.js',
  'docs/releases/EOS_S3_LOOP_ENGINEERING_4Q_2026-09-09.md',
  'openspec/changes/eos-s3-loop-engineering-4q/proposal.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.docText] override index markdown (temp fixtures)
 * @param {boolean} [options.skipPathChecks] when true, skip required companion path existence
 * @param {boolean} [options.docMissing] force missing-doc failure (temp fixtures)
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditLoopEngineeringLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: LOOP_ENGINEERING_INDEX,
      message: 'Loop Engineering 4Q index missing (fail-closed)',
      type: 'loop-engineering-lock'
    });
    return { ok: false, checks, failures };
  }

  let text = options.docText;
  if (text === undefined) {
    const full = path.join(rootDir, LOOP_ENGINEERING_INDEX);
    if (!fs.existsSync(full)) {
      failures.push({
        path: LOOP_ENGINEERING_INDEX,
        message: 'Loop Engineering 4Q index missing (fail-closed)',
        type: 'loop-engineering-lock'
      });
      return { ok: false, checks, failures };
    }
    text = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: LOOP_ENGINEERING_INDEX + ' exists',
    status: 'VERIFIED',
    type: 'loop-engineering-lock'
  });

  let sectionsOk = true;
  for (const needle of LOOP_ENGINEERING_REQUIRED_SECTIONS) {
    if (!text.includes(needle)) {
      sectionsOk = false;
      failures.push({
        path: LOOP_ENGINEERING_INDEX,
        message: 'Loop Engineering 4Q required section/needle missing: ' + needle,
        type: 'loop-engineering-lock'
      });
    }
  }
  if (sectionsOk) {
    checks.push({
      path: 'Loop Engineering 4Q required sections present',
      status: 'VERIFIED',
      type: 'loop-engineering-lock'
    });
  }

  const productionReadyNo =
    text.includes('PRODUCTION_READY:** NO') ||
    text.includes('PRODUCTION_READY: NO') ||
    text.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: LOOP_ENGINEERING_INDEX,
      message: 'Loop Engineering 4Q must keep PRODUCTION_READY: NO',
      type: 'loop-engineering-lock'
    });
  } else {
    checks.push({
      path: 'Loop Engineering 4Q PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'loop-engineering-lock'
    });
  }

  const nonClaimAutonomy =
    text.includes('NON-CLAIM') &&
    (/policy\s*[!=≠]+\s*productive\s*autonomy/i.test(text) ||
      /≠\s*productive\s*autonomy/i.test(text) ||
      /not\s+productive\s+autonomy/i.test(text) ||
      /policy != productive autonomy/i.test(text) ||
      /Loop\s*[!=≠]+\s*verify/i.test(text) ||
      /Loop Engineering\s*[!=≠]+\s*verify/i.test(text));
  if (!nonClaimAutonomy) {
    failures.push({
      path: LOOP_ENGINEERING_INDEX,
      message:
        'Loop Engineering 4Q must state NON-CLAIM policy!=productive autonomy / Loop!=verify (or equivalent)',
      type: 'loop-engineering-lock'
    });
  } else {
    checks.push({
      path: 'Loop Engineering 4Q NON-CLAIM policy!=autonomy / Loop!=verify',
      status: 'VERIFIED',
      type: 'loop-engineering-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of LOOP_ENGINEERING_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required Loop Engineering 4Q path missing',
          type: 'loop-engineering-lock'
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures
  };
}
