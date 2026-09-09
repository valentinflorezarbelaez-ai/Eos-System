/**
 * @module context-pack-lock
 * S2 — Context Pack TPC index verify lock (Ladder 7 K2).
 *
 * Fail-closed: docs/harness/CONTEXT_PACK_TPC.md must exist with required
 * Tool/Prompt/Context + lifecycle section needles + NON-CLAIM / PRODUCTION_READY=NO.
 *
 * NON-CLAIM: index != full runtime context engineering / orchestrator.
 * This lock does not inject/compact/discard/reset live context windows.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const CONTEXT_PACK_INDEX = 'docs/harness/CONTEXT_PACK_TPC.md';

/** Sections / needles aligned with tests/eos-s2-context-pack-tpc.test.js */
export const CONTEXT_PACK_REQUIRED_SECTIONS = Object.freeze([
  '## 1. Tool pillar',
  '## 2. Prompt pillar',
  '## 3. Context pillar',
  '## 4. Context lifecycle',
  'inject',
  'compact',
  'discard',
  'reset',
  'revisit-on-model-change',
  'NON-CLAIM',
  'PRODUCTION_READY',
  'EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md'
]);

export const CONTEXT_PACK_REQUIRED_PATHS = Object.freeze([
  CONTEXT_PACK_INDEX,
  'scripts/lib/context-pack-lock.js',
  'tests/eos-s2-context-pack-tpc.test.js',
  'docs/releases/EOS_S2_CONTEXT_PACK_TPC_2026-09-09.md',
  'openspec/changes/eos-s2-context-pack-tpc/proposal.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.docText] override index markdown (temp fixtures)
 * @param {boolean} [options.skipPathChecks] when true, skip required companion path existence
 * @param {boolean} [options.docMissing] force missing-doc failure (temp fixtures)
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditContextPackLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: CONTEXT_PACK_INDEX,
      message: 'Context Pack TPC index missing (fail-closed)',
      type: 'context-pack-lock'
    });
    return { ok: false, checks, failures };
  }

  let text = options.docText;
  if (text === undefined) {
    const full = path.join(rootDir, CONTEXT_PACK_INDEX);
    if (!fs.existsSync(full)) {
      failures.push({
        path: CONTEXT_PACK_INDEX,
        message: 'Context Pack TPC index missing (fail-closed)',
        type: 'context-pack-lock'
      });
      return { ok: false, checks, failures };
    }
    text = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: CONTEXT_PACK_INDEX + ' exists',
    status: 'VERIFIED',
    type: 'context-pack-lock'
  });

  let sectionsOk = true;
  for (const needle of CONTEXT_PACK_REQUIRED_SECTIONS) {
    if (!text.includes(needle)) {
      sectionsOk = false;
      failures.push({
        path: CONTEXT_PACK_INDEX,
        message: 'Context Pack TPC required section/needle missing: ' + needle,
        type: 'context-pack-lock'
      });
    }
  }
  if (sectionsOk) {
    checks.push({
      path: 'Context Pack TPC required sections present',
      status: 'VERIFIED',
      type: 'context-pack-lock'
    });
  }

  const productionReadyNo =
    text.includes('PRODUCTION_READY:** NO') ||
    text.includes('PRODUCTION_READY: NO') ||
    text.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: CONTEXT_PACK_INDEX,
      message: 'Context Pack TPC must keep PRODUCTION_READY: NO',
      type: 'context-pack-lock'
    });
  } else {
    checks.push({
      path: 'Context Pack TPC PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'context-pack-lock'
    });
  }

  const nonClaimRuntime =
    text.includes('NON-CLAIM') &&
    (/index\s*[!=≠]+\s*(full\s*)?runtime/i.test(text) ||
      /runtime context completo/i.test(text) ||
      /not a (full )?runtime/i.test(text) ||
      /≠\s*runtime/i.test(text) ||
      /index != full runtime/i.test(text) ||
      /index !== runtime/i.test(text));
  if (!nonClaimRuntime) {
    failures.push({
      path: CONTEXT_PACK_INDEX,
      message:
        'Context Pack TPC must state NON-CLAIM index!=runtime context completo (or equivalent)',
      type: 'context-pack-lock'
    });
  } else {
    checks.push({
      path: 'Context Pack TPC NON-CLAIM index!=runtime',
      status: 'VERIFIED',
      type: 'context-pack-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of CONTEXT_PACK_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required Context Pack TPC path missing',
          type: 'context-pack-lock'
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
