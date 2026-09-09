/**
 * @module p6-inventory-lock
 * Q6 — P6 complexity prune inventory verify lock (Ladder 5 K6).
 *
 * Fail-closed: docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md
 * must exist with required inventory sections + NON-CLAIM / inventory-only language.
 *
 * NON-CLAIM: inventory != executed prune. This lock does not delete/move/quarantine
 * any candidates. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const P6_INVENTORY_DOC =
  'docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md';

/** Sections / needles aligned with tests/eos-p6-complexity-prune-inventory.test.js */
export const P6_INVENTORY_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Inventory method (evidence)',
  '## 4. Ranked prune CANDIDATES (inventory only)',
  '## 9. Non-claims',
  'PRODUCTION_READY',
  'NON-CLAIM'
]);

export const P6_INVENTORY_REQUIRED_PATHS = Object.freeze([
  P6_INVENTORY_DOC,
  'scripts/lib/p6-inventory-lock.js',
  'tests/eos-p6-complexity-prune-inventory.test.js',
  'tests/eos-q6-p6-inventory-verify-lock.test.js',
  'docs/releases/EOS_Q6_P6_INVENTORY_VERIFY_LOCK_2026-09-09.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.docText] override inventory markdown (temp fixtures)
 * @param {boolean} [options.skipPathChecks] when true, skip required companion path existence
 * @param {boolean} [options.docMissing] force missing-doc failure (temp fixtures)
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditP6InventoryLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: P6_INVENTORY_DOC,
      message: 'P6 inventory doc missing (fail-closed)',
      type: 'p6-inventory-lock'
    });
    return { ok: false, checks, failures };
  }

  let text = options.docText;
  if (text === undefined) {
    const full = path.join(rootDir, P6_INVENTORY_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: P6_INVENTORY_DOC,
        message: 'P6 inventory doc missing (fail-closed)',
        type: 'p6-inventory-lock'
      });
      return { ok: false, checks, failures };
    }
    text = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: P6_INVENTORY_DOC + ' exists',
    status: 'VERIFIED',
    type: 'p6-inventory-lock'
  });

  let sectionsOk = true;
  for (const needle of P6_INVENTORY_REQUIRED_SECTIONS) {
    if (!text.includes(needle)) {
      sectionsOk = false;
      failures.push({
        path: P6_INVENTORY_DOC,
        message: 'P6 inventory required section/needle missing: ' + needle,
        type: 'p6-inventory-lock'
      });
    }
  }
  if (sectionsOk) {
    checks.push({
      path: 'P6 inventory required sections present',
      status: 'VERIFIED',
      type: 'p6-inventory-lock'
    });
  }

  const productionReadyNo =
    text.includes('PRODUCTION_READY:** NO') ||
    text.includes('PRODUCTION_READY: NO') ||
    text.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: P6_INVENTORY_DOC,
      message: 'P6 inventory must keep PRODUCTION_READY: NO',
      type: 'p6-inventory-lock'
    });
  } else {
    checks.push({
      path: 'P6 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'p6-inventory-lock'
    });
  }

  const inventoryOnly =
    text.includes('do not delete') ||
    text.includes('FORBIDDEN') ||
    text.includes('inventory only') ||
    text.includes('inventory-only') ||
    text.includes('No code quarantine/delete/move');
  if (!inventoryOnly) {
    failures.push({
      path: P6_INVENTORY_DOC,
      message: 'P6 inventory must state inventory-only / do not delete (NON-CLAIM inventory!=executed prune)',
      type: 'p6-inventory-lock'
    });
  } else {
    checks.push({
      path: 'P6 NON-CLAIM inventory-only (!= executed prune)',
      status: 'VERIFIED',
      type: 'p6-inventory-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of P6_INVENTORY_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required P6/Q6 path missing',
          type: 'p6-inventory-lock'
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