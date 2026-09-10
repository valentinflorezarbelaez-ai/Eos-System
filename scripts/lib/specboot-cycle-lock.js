/**
 * @module specboot-cycle-lock
 * SpecBoot cycle + Antigravity-first verify lock.
 *
 * Fail-closed: docs/harness/SPECBOOT_CYCLE.md + ANTIGRAVITY_FIRST.md must exist
 * with required cycle / AGY / CloudAgent-out / NON-CLAIM needles, plus AGY skill
 * mirrors and companion paths.
 *
 * NON-CLAIM: demotes CloudAgent launches; does not ban local Cursor IDE editing.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const SPECBOOT_CYCLE_INDEX = 'docs/harness/SPECBOOT_CYCLE.md';
export const ANTIGRAVITY_FIRST_INDEX = 'docs/harness/ANTIGRAVITY_FIRST.md';

export const SPECBOOT_CYCLE_REQUIRED_SECTIONS = Object.freeze([
  '## 1. SpecBoot cycle',
  'enrich-us',
  'propose',
  'apply',
  'verify',
  'adversarial-review',
  'archive',
  'commit',
  'Antigravity-first',
  '.agents/skills',
  'AGY loads',
  'PRODUCTION_READY',
  'NON-CLAIM'
]);

export const ANTIGRAVITY_FIRST_REQUIRED_SECTIONS = Object.freeze([
  '## 1. Primary runtime',
  'Antigravity',
  'eos-workstation',
  'CloudAgent',
  'out of the default',
  'NON-CLAIM',
  'local Cursor IDE',
  'ANTIGRAVITY_REMOTE_CONTROL_AND_DAEMON_OPS.md',
  'EOS_PHASE_0_CONTROL_PLANE_ANTIGRAVITY_FUSION_GROUND_TRUTH',
  'PRODUCTION_READY'
]);

export const SPECBOOT_AGY_SKILL_STEPS = Object.freeze([
  'ff',
  'propose',
  'apply',
  'verify',
  'archive',
  'commit'
]);

export const SPECBOOT_CYCLE_REQUIRED_PATHS = Object.freeze([
  SPECBOOT_CYCLE_INDEX,
  ANTIGRAVITY_FIRST_INDEX,
  'scripts/lib/specboot-cycle-lock.js',
  'tests/eos-specboot-antigravity-first.test.js',
  'docs/releases/EOS_SPECBOOT_ANTIGRAVITY_FIRST_2026-09-09.md',
  'openspec/changes/eos-specboot-antigravity-first/proposal.md',
  '.agents/skills/ff/SKILL.md',
  '.agents/skills/propose/SKILL.md',
  '.agents/skills/apply/SKILL.md',
  '.agents/skills/verify/SKILL.md',
  '.agents/skills/archive/SKILL.md',
  '.agents/skills/commit/SKILL.md',
  '.cursor/commands/ff.md',
  '.cursor/commands/propose.md',
  '.cursor/commands/apply.md',
  '.cursor/commands/verify.md',
  '.cursor/commands/archive.md',
  '.cursor/commands/commit.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.cycleText]
 * @param {string} [options.agyText]
 * @param {boolean} [options.skipPathChecks]
 * @param {boolean} [options.docMissing]
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditSpecbootCycleLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: SPECBOOT_CYCLE_INDEX,
      message: 'SpecBoot cycle SSOT missing (fail-closed)',
      type: 'specboot-cycle-lock'
    });
    return { ok: false, checks, failures };
  }

  let cycleText = options.cycleText;
  if (cycleText === undefined) {
    const full = path.join(rootDir, SPECBOOT_CYCLE_INDEX);
    if (!fs.existsSync(full)) {
      failures.push({
        path: SPECBOOT_CYCLE_INDEX,
        message: 'SpecBoot cycle SSOT missing (fail-closed)',
        type: 'specboot-cycle-lock'
      });
      return { ok: false, checks, failures };
    }
    cycleText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: SPECBOOT_CYCLE_INDEX + ' exists',
    status: 'VERIFIED',
    type: 'specboot-cycle-lock'
  });

  for (const needle of SPECBOOT_CYCLE_REQUIRED_SECTIONS) {
    if (!cycleText.includes(needle)) {
      failures.push({
        path: SPECBOOT_CYCLE_INDEX,
        message: 'SpecBoot cycle required section/needle missing: ' + needle,
        type: 'specboot-cycle-lock'
      });
    }
  }

  let agyText = options.agyText;
  if (agyText === undefined) {
    const full = path.join(rootDir, ANTIGRAVITY_FIRST_INDEX);
    if (!fs.existsSync(full)) {
      failures.push({
        path: ANTIGRAVITY_FIRST_INDEX,
        message: 'Antigravity-first policy missing (fail-closed)',
        type: 'specboot-cycle-lock'
      });
    } else {
      agyText = fs.readFileSync(full, 'utf8');
    }
  }

  if (typeof agyText === 'string') {
    checks.push({
      path: ANTIGRAVITY_FIRST_INDEX + ' exists',
      status: 'VERIFIED',
      type: 'specboot-cycle-lock'
    });
    for (const needle of ANTIGRAVITY_FIRST_REQUIRED_SECTIONS) {
      if (!agyText.includes(needle)) {
        failures.push({
          path: ANTIGRAVITY_FIRST_INDEX,
          message: 'Antigravity-first required section/needle missing: ' + needle,
          type: 'specboot-cycle-lock'
        });
      }
    }

    const productionReadyNo =
      agyText.includes('PRODUCTION_READY:** NO') ||
      agyText.includes('PRODUCTION_READY: NO') ||
      agyText.includes('**PRODUCTION_READY:** NO');
    if (!productionReadyNo) {
      failures.push({
        path: ANTIGRAVITY_FIRST_INDEX,
        message: 'Antigravity-first must keep PRODUCTION_READY: NO',
        type: 'specboot-cycle-lock'
      });
    } else {
      checks.push({
        path: 'Antigravity-first PRODUCTION_READY=NO',
        status: 'VERIFIED',
        type: 'specboot-cycle-lock'
      });
    }

    const nonClaimIde =
      agyText.includes('NON-CLAIM') &&
      (/local Cursor IDE/i.test(agyText) || /not ban local Cursor/i.test(agyText));
    if (!nonClaimIde) {
      failures.push({
        path: ANTIGRAVITY_FIRST_INDEX,
        message:
          'Antigravity-first must state NON-CLAIM not banning local Cursor IDE editing',
        type: 'specboot-cycle-lock'
      });
    } else {
      checks.push({
        path: 'Antigravity-first NON-CLAIM Cursor IDE allowed',
        status: 'VERIFIED',
        type: 'specboot-cycle-lock'
      });
    }
  }

  const cyclePrNo =
    cycleText.includes('PRODUCTION_READY:** NO') ||
    cycleText.includes('PRODUCTION_READY: NO') ||
    cycleText.includes('**PRODUCTION_READY:** NO');
  if (!cyclePrNo) {
    failures.push({
      path: SPECBOOT_CYCLE_INDEX,
      message: 'SpecBoot cycle must keep PRODUCTION_READY: NO',
      type: 'specboot-cycle-lock'
    });
  } else {
    checks.push({
      path: 'SpecBoot cycle PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'specboot-cycle-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of SPECBOOT_CYCLE_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required SpecBoot / Antigravity-first path missing',
          type: 'specboot-cycle-lock'
        });
      }
    }

    for (const step of SPECBOOT_AGY_SKILL_STEPS) {
      const skillRel = '.agents/skills/' + step + '/SKILL.md';
      const cmdRel = '.cursor/commands/' + step + '.md';
      const skillFull = path.join(rootDir, skillRel);
      if (!fs.existsSync(skillFull)) {
        failures.push({
          path: skillRel,
          message: 'AGY SpecBoot skill mirror missing',
          type: 'specboot-cycle-lock'
        });
        continue;
      }
      const skillText = fs.readFileSync(skillFull, 'utf8');
      if (!skillText.includes(cmdRel) && !skillText.includes('.cursor/commands/' + step + '.md')) {
        failures.push({
          path: skillRel,
          message: 'AGY skill mirror must point at ' + cmdRel,
          type: 'specboot-cycle-lock'
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
