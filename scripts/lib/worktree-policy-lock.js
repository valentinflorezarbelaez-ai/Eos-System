/**
 * @module worktree-policy-lock
 * S4 — Worktree isolation policy verify lock (Ladder 7 K4).
 *
 * Fail-closed: docs/harness/WORKTREE_ISOLATION_POLICY.md must exist with required
 * isolation / Spec-Boot map / limits / CI-safe smoke / NON-CLAIM no swarm /
 * PRODUCTION_READY=NO needles, plus companion skill+CLI paths.
 *
 * NON-CLAIM: policy != swarm orchestration; CI smoke != real worktree churn.
 * This lock does not create or remove git worktrees.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const WORKTREE_POLICY_INDEX = 'docs/harness/WORKTREE_ISOLATION_POLICY.md';

/** Sections / needles aligned with tests/eos-s4-worktree-isolation.test.js */
export const WORKTREE_POLICY_REQUIRED_SECTIONS = Object.freeze([
  '## 1. Isolation rule',
  'one agent/session',
  'shared dirty',
  '## 2. Spec-Boot map',
  'using-git-worktrees',
  '.agents/skills/using-git-worktrees/SKILL.md',
  'ai-specs/skills/using-git-worktrees/SKILL.md',
  'no fork',
  'bin/eos-worktree.js',
  '## 3. Limits',
  '.env',
  'node_modules',
  'DB',
  'ports',
  '## 4. CI-safe smoke',
  'worktree add',
  '## 5. Non-claims',
  'NON-CLAIM',
  'no swarm',
  'PRODUCTION_READY'
]);

export const WORKTREE_POLICY_REQUIRED_PATHS = Object.freeze([
  WORKTREE_POLICY_INDEX,
  'scripts/lib/worktree-policy-lock.js',
  'tests/eos-s4-worktree-isolation.test.js',
  'bin/eos-worktree.js',
  '.agents/skills/using-git-worktrees/SKILL.md',
  'ai-specs/skills/using-git-worktrees/SKILL.md',
  'docs/releases/EOS_S4_WORKTREE_ISOLATION_2026-09-09.md',
  'openspec/changes/eos-s4-worktree-isolation/proposal.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.docText] override index markdown (temp fixtures)
 * @param {boolean} [options.skipPathChecks] when true, skip required companion path existence
 * @param {boolean} [options.docMissing] force missing-doc failure (temp fixtures)
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditWorktreePolicyLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: WORKTREE_POLICY_INDEX,
      message: 'Worktree isolation policy missing (fail-closed)',
      type: 'worktree-policy-lock'
    });
    return { ok: false, checks, failures };
  }

  let text = options.docText;
  if (text === undefined) {
    const full = path.join(rootDir, WORKTREE_POLICY_INDEX);
    if (!fs.existsSync(full)) {
      failures.push({
        path: WORKTREE_POLICY_INDEX,
        message: 'Worktree isolation policy missing (fail-closed)',
        type: 'worktree-policy-lock'
      });
      return { ok: false, checks, failures };
    }
    text = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: WORKTREE_POLICY_INDEX + ' exists',
    status: 'VERIFIED',
    type: 'worktree-policy-lock'
  });

  let sectionsOk = true;
  for (const needle of WORKTREE_POLICY_REQUIRED_SECTIONS) {
    if (!text.includes(needle)) {
      sectionsOk = false;
      failures.push({
        path: WORKTREE_POLICY_INDEX,
        message: 'Worktree isolation policy required section/needle missing: ' + needle,
        type: 'worktree-policy-lock'
      });
    }
  }
  if (sectionsOk) {
    checks.push({
      path: 'Worktree isolation policy required sections present',
      status: 'VERIFIED',
      type: 'worktree-policy-lock'
    });
  }

  const productionReadyNo =
    text.includes('PRODUCTION_READY:** NO') ||
    text.includes('PRODUCTION_READY: NO') ||
    text.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: WORKTREE_POLICY_INDEX,
      message: 'Worktree isolation policy must keep PRODUCTION_READY: NO',
      type: 'worktree-policy-lock'
    });
  } else {
    checks.push({
      path: 'Worktree isolation policy PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'worktree-policy-lock'
    });
  }

  const nonClaimNoSwarm =
    text.includes('NON-CLAIM') &&
    (/no swarm/i.test(text) ||
      /policy\s*[!=≠]+\s*swarm/i.test(text) ||
      /≠\s*swarm/i.test(text) ||
      /not\s+swarm/i.test(text));
  if (!nonClaimNoSwarm) {
    failures.push({
      path: WORKTREE_POLICY_INDEX,
      message:
        'Worktree isolation policy must state NON-CLAIM no swarm / policy!=swarm (or equivalent)',
      type: 'worktree-policy-lock'
    });
  } else {
    checks.push({
      path: 'Worktree isolation policy NON-CLAIM no swarm',
      status: 'VERIFIED',
      type: 'worktree-policy-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of WORKTREE_POLICY_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required worktree isolation path missing',
          type: 'worktree-policy-lock'
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
