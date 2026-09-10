/**
 * @module keep-po-prune-hold-lock
 * T5 — KEEP PO-named prune HOLD / gate verify lock (Ladder 8 K4).
 *
 * Fail-closed: docs/releases/EOS_T5_KEEP_PO_PRUNE_HOLD_2026-09-09.md +
 * docs/harness/KEEP_PO_PRUNE_RITUAL.md must exist with HOLD or PO_NAMED
 * language, catalog reconcile gate, and NON-CLAIM inventory!=silent delete.
 *
 * NON-CLAIM: gate/HOLD != executed prune. This lock does not delete/prune any
 * MCP tools. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { auditMcpCatalogLock } from './mcp-catalog-lock.js';

export const KEEP_PO_PRUNE_HOLD_DOC =
  'docs/releases/EOS_T5_KEEP_PO_PRUNE_HOLD_2026-09-09.md';

export const KEEP_PO_PRUNE_RITUAL_DOC = 'docs/harness/KEEP_PO_PRUNE_RITUAL.md';

/** Sections / needles aligned with tests/eos-t5-keep-po-prune-hold.test.js */
export const KEEP_PO_PRUNE_HOLD_REQUIRED_SECTIONS = Object.freeze([
  '## Objetivo (T5 / K4 DoD)',
  '## Decision HOLD (rationale)',
  '## Catalog reconcile (HOLD)',
  '## No-claims',
  'HOLD',
  'no prune this quarter',
  'PRODUCTION_READY',
  'NON-CLAIM',
  'silent delete'
]);

export const KEEP_PO_PRUNE_RITUAL_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Legal modes',
  '## 2.1 HOLD',
  '## 2.2 PO_NAMED',
  '## 3. Catalog reconcile gate',
  '## 5. Non-claims',
  'FORBIDDEN',
  'PO_NAMED',
  'HOLD',
  'NON-MUTATING'
]);

export const KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS = Object.freeze([
  KEEP_PO_PRUNE_HOLD_DOC,
  KEEP_PO_PRUNE_RITUAL_DOC,
  'scripts/lib/keep-po-prune-hold-lock.js',
  'scripts/ci/keep-po-prune-gate.js',
  'tests/eos-t5-keep-po-prune-hold.test.js',
  'docs/releases/EOS_S5_MCP_TOOL_KEEP_INVENTORY_2026-09-09.md',
  'scripts/lib/mcp-tool-keep-lock.js',
  'scripts/lib/mcp-catalog-lock.js',
  'openspec/changes/eos-t5-keep-po-prune-hold/proposal.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.holdDocText]
 * @param {string} [options.ritualDocText]
 * @param {boolean} [options.skipPathChecks]
 * @param {boolean} [options.skipCatalogReconcile]
 * @param {boolean} [options.docMissing]
 * @returns {{ ok: boolean, checks: object[], failures: object[], mode: string }}
 */
export function auditKeepPoPruneHoldLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  let mode = 'UNKNOWN';

  if (options.docMissing === true) {
    failures.push({
      path: KEEP_PO_PRUNE_HOLD_DOC,
      message: 'T5 KEEP PO prune HOLD evidence doc missing (fail-closed)',
      type: 'keep-po-prune-hold-lock'
    });
    return { ok: false, checks, failures, mode };
  }

  let holdText = options.holdDocText;
  if (holdText === undefined) {
    const full = path.join(rootDir, KEEP_PO_PRUNE_HOLD_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: KEEP_PO_PRUNE_HOLD_DOC,
        message: 'T5 KEEP PO prune HOLD evidence doc missing (fail-closed)',
        type: 'keep-po-prune-hold-lock'
      });
      return { ok: false, checks, failures, mode };
    }
    holdText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: KEEP_PO_PRUNE_HOLD_DOC + ' exists',
    status: 'VERIFIED',
    type: 'keep-po-prune-hold-lock'
  });

  let ritualText = options.ritualDocText;
  if (ritualText === undefined) {
    const full = path.join(rootDir, KEEP_PO_PRUNE_RITUAL_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: KEEP_PO_PRUNE_RITUAL_DOC,
        message: 'T5 KEEP PO prune ritual runbook missing (fail-closed)',
        type: 'keep-po-prune-hold-lock'
      });
      return { ok: false, checks, failures, mode };
    }
    ritualText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: KEEP_PO_PRUNE_RITUAL_DOC + ' exists',
    status: 'VERIFIED',
    type: 'keep-po-prune-hold-lock'
  });

  let holdSectionsOk = true;
  for (const needle of KEEP_PO_PRUNE_HOLD_REQUIRED_SECTIONS) {
    if (!holdText.includes(needle)) {
      holdSectionsOk = false;
      failures.push({
        path: KEEP_PO_PRUNE_HOLD_DOC,
        message: 'T5 HOLD evidence required section/needle missing: ' + needle,
        type: 'keep-po-prune-hold-lock'
      });
    }
  }
  if (holdSectionsOk) {
    checks.push({
      path: 'T5 HOLD evidence required sections present',
      status: 'VERIFIED',
      type: 'keep-po-prune-hold-lock'
    });
  }

  let ritualSectionsOk = true;
  for (const needle of KEEP_PO_PRUNE_RITUAL_REQUIRED_SECTIONS) {
    if (!ritualText.includes(needle)) {
      ritualSectionsOk = false;
      failures.push({
        path: KEEP_PO_PRUNE_RITUAL_DOC,
        message: 'T5 ritual runbook required section/needle missing: ' + needle,
        type: 'keep-po-prune-hold-lock'
      });
    }
  }
  if (ritualSectionsOk) {
    checks.push({
      path: 'T5 ritual runbook required sections present',
      status: 'VERIFIED',
      type: 'keep-po-prune-hold-lock'
    });
  }

  const productionReadyNo =
    holdText.includes('PRODUCTION_READY:** NO') ||
    holdText.includes('PRODUCTION_READY: NO') ||
    holdText.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: KEEP_PO_PRUNE_HOLD_DOC,
      message: 'T5 HOLD evidence must keep PRODUCTION_READY: NO',
      type: 'keep-po-prune-hold-lock'
    });
  } else {
    checks.push({
      path: 'T5 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'keep-po-prune-hold-lock'
    });
  }

  const hasHold = holdText.includes('no prune this quarter');
  const hasPoNamed =
    holdText.includes('PO_NAMED') &&
    (/PO names|PO_NAMED list|exact tool names/i.test(holdText));

  if (hasHold) {
    mode = 'HOLD';
    checks.push({
      path: 'T5 mode HOLD (no prune this quarter)',
      status: 'VERIFIED',
      type: 'keep-po-prune-hold-lock'
    });
  } else if (hasPoNamed) {
    mode = 'PO_NAMED';
    checks.push({
      path: 'T5 mode PO_NAMED (named list path)',
      status: 'VERIFIED',
      type: 'keep-po-prune-hold-lock'
    });
  } else {
    failures.push({
      path: KEEP_PO_PRUNE_HOLD_DOC,
      message:
        'T5 evidence must declare HOLD (no prune this quarter) OR PO_NAMED exact tool names',
      type: 'keep-po-prune-hold-lock'
    });
  }

  const noSilent =
    holdText.includes('silent delete') ||
    holdText.includes('NO silent') ||
    holdText.includes('no silent') ||
    ritualText.includes('FORBIDDEN');
  if (!noSilent) {
    failures.push({
      path: KEEP_PO_PRUNE_HOLD_DOC,
      message:
        'T5 must forbid silent delete (NON-CLAIM inventory!=silent delete)',
      type: 'keep-po-prune-hold-lock'
    });
  } else {
    checks.push({
      path: 'T5 NON-CLAIM no silent delete',
      status: 'VERIFIED',
      type: 'keep-po-prune-hold-lock'
    });
  }

  const nonClaim =
    holdText.includes('NON-CLAIM') ||
    holdText.includes('inventory') ||
    holdText.includes('HOLD');
  if (!nonClaim) {
    failures.push({
      path: KEEP_PO_PRUNE_HOLD_DOC,
      message: 'T5 must state NON-CLAIM inventory!=silent delete / HOLD!=executed prune',
      type: 'keep-po-prune-hold-lock'
    });
  } else {
    checks.push({
      path: 'T5 NON-CLAIM language present',
      status: 'VERIFIED',
      type: 'keep-po-prune-hold-lock'
    });
  }

  if (!options.skipCatalogReconcile) {
    try {
      const catalog = auditMcpCatalogLock(rootDir);
      if (catalog.ok) {
        checks.push({
          path: 'T5 catalog reconcile gate green (P5 under HOLD)',
          status: 'VERIFIED',
          type: 'keep-po-prune-hold-lock'
        });
      } else {
        for (const f of catalog.failures) {
          failures.push({
            path: f.path,
            message: 'T5 catalog reconcile gate failed: ' + f.message,
            type: 'keep-po-prune-hold-lock'
          });
        }
      }
    } catch (err) {
      failures.push({
        path: 'scripts/lib/mcp-catalog-lock.js',
        message: 'T5 catalog reconcile gate threw: ' + (err.message || err),
        type: 'keep-po-prune-hold-lock'
      });
    }
  }

  if (!options.skipPathChecks) {
    for (const rel of KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required T5 KEEP PO prune HOLD path missing',
          type: 'keep-po-prune-hold-lock'
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