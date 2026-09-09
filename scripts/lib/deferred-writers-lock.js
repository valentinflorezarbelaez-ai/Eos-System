/**
 * @module deferred-writers-lock
 * R5 — Deferred post-Q5 writers governance verify lock (Ladder 6 K5 / Choice B).
 *
 * Fail-closed: docs/releases/EOS_R5_DEFERRED_WRITERS_INVENTORY_2026-09-09.md
 * must exist with ranked inventory + NON-CLAIM sections stating deferred writers
 * remain internal by design (no fake Write Barrier route; no parallel EVD ledger).
 *
 * NON-CLAIM: inventory != routed rewrite of HashChainedLedger / ledger-recovery.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const DEFERRED_WRITERS_INVENTORY_DOC =
  'docs/releases/EOS_R5_DEFERRED_WRITERS_INVENTORY_2026-09-09.md';

/** Sections / needles aligned with tests/eos-r5-deferred-writers-governance.test.js */
export const DEFERRED_WRITERS_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Investigation (Choice A vs B)',
  '## 3. Ranked deferred writers inventory',
  '## 4. Decision: Choice B',
  '## 9. Non-claims',
  'NON-CLAIM',
  'internal by design',
  'HashChainedLedger',
  'ledger-recovery',
  'PRODUCTION_READY'
]);

export const DEFERRED_WRITERS_REQUIRED_PATHS = Object.freeze([
  DEFERRED_WRITERS_INVENTORY_DOC,
  'scripts/lib/deferred-writers-lock.js',
  'tests/eos-r5-deferred-writers-governance.test.js',
  'docs/releases/EOS_R5_DEFERRED_WRITERS_GOVERNANCE_2026-09-09.md',
  'src/core/runtime/mission-artifact-write.js',
  'src/core/sdd/epistemic-evidence-engine.js',
  'src/core/runtime/ledger-recovery.js',
  'openspec/changes/eos-r5-deferred-writers-governance/design.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.docText] override inventory markdown (temp fixtures)
 * @param {boolean} [options.skipPathChecks] when true, skip required companion path existence
 * @param {boolean} [options.docMissing] force missing-doc failure (temp fixtures)
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditDeferredWritersLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: DEFERRED_WRITERS_INVENTORY_DOC,
      message: 'R5 deferred writers inventory doc missing (fail-closed)',
      type: 'deferred-writers-lock'
    });
    return { ok: false, checks, failures };
  }

  let text = options.docText;
  if (text === undefined) {
    const full = path.join(rootDir, DEFERRED_WRITERS_INVENTORY_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: DEFERRED_WRITERS_INVENTORY_DOC,
        message: 'R5 deferred writers inventory doc missing (fail-closed)',
        type: 'deferred-writers-lock'
      });
      return { ok: false, checks, failures };
    }
    text = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: DEFERRED_WRITERS_INVENTORY_DOC + ' exists',
    status: 'VERIFIED',
    type: 'deferred-writers-lock'
  });

  let sectionsOk = true;
  for (const needle of DEFERRED_WRITERS_REQUIRED_SECTIONS) {
    if (!text.includes(needle)) {
      sectionsOk = false;
      failures.push({
        path: DEFERRED_WRITERS_INVENTORY_DOC,
        message: 'R5 deferred writers required section/needle missing: ' + needle,
        type: 'deferred-writers-lock'
      });
    }
  }
  if (sectionsOk) {
    checks.push({
      path: 'R5 deferred writers required sections present',
      status: 'VERIFIED',
      type: 'deferred-writers-lock'
    });
  }

  const productionReadyNo =
    text.includes('PRODUCTION_READY:** NO') ||
    text.includes('PRODUCTION_READY: NO') ||
    text.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: DEFERRED_WRITERS_INVENTORY_DOC,
      message: 'R5 inventory must keep PRODUCTION_READY: NO',
      type: 'deferred-writers-lock'
    });
  } else {
    checks.push({
      path: 'R5 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'deferred-writers-lock'
    });
  }

  const choiceB =
    text.includes('Choice B') ||
    /decision:\s*B/i.test(text) ||
    text.includes('Decision: **B**') ||
    text.includes('Decision: Choice B');
  if (!choiceB) {
    failures.push({
      path: DEFERRED_WRITERS_INVENTORY_DOC,
      message: 'R5 inventory must document Choice B decision',
      type: 'deferred-writers-lock'
    });
  } else {
    checks.push({
      path: 'R5 Choice B documented',
      status: 'VERIFIED',
      type: 'deferred-writers-lock'
    });
  }

  const internalByDesign = /internal by design/i.test(text);
  const noParallel =
    /no parallel EVD/i.test(text) ||
    /parallel EVD ledger/i.test(text) ||
    text.includes('sin ledger EVD paralelo');
  const noFakeRoute =
    /do not (force )?route/i.test(text) ||
    /fake route/i.test(text) ||
    /not routed through/i.test(text) ||
    /remain internal/i.test(text) ||
    text.includes('no fake Write Barrier route');

  if (!internalByDesign || !text.includes('NON-CLAIM')) {
    failures.push({
      path: DEFERRED_WRITERS_INVENTORY_DOC,
      message: 'R5 inventory must state NON-CLAIM deferred remain internal by design',
      type: 'deferred-writers-lock'
    });
  } else {
    checks.push({
      path: 'R5 NON-CLAIM internal by design',
      status: 'VERIFIED',
      type: 'deferred-writers-lock'
    });
  }

  if (!noParallel) {
    failures.push({
      path: DEFERRED_WRITERS_INVENTORY_DOC,
      message: 'R5 inventory must NON-CLAIM no parallel EVD ledger',
      type: 'deferred-writers-lock'
    });
  } else {
    checks.push({
      path: 'R5 NON-CLAIM no parallel EVD ledger',
      status: 'VERIFIED',
      type: 'deferred-writers-lock'
    });
  }

  if (!noFakeRoute) {
    failures.push({
      path: DEFERRED_WRITERS_INVENTORY_DOC,
      message: 'R5 inventory must state deferred not fake-routed through Write Barrier',
      type: 'deferred-writers-lock'
    });
  } else {
    checks.push({
      path: 'R5 NON-CLAIM no fake Write Barrier route',
      status: 'VERIFIED',
      type: 'deferred-writers-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of DEFERRED_WRITERS_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required R5 deferred-writers path missing',
          type: 'deferred-writers-lock'
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
