/**
 * @module complexity-budget-lock
 * R4 — AT_CEILING schema pressure / complexity budget honesty gate (Ladder 6 K4).
 *
 * Fail-closed while COMPLEXITY_BUDGET is AT_CEILING (or when filesystem count
 * would exceed max_schemas). New schemas under docs/schemas are forbidden at
 * ceiling unless PO raises max_schemas or prunes.
 *
 * NON-CLAIM: gate != executed prune. Does not delete/move/quarantine schemas.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const COMPLEXITY_BUDGET_PATH = 'docs/governance/COMPLEXITY_BUDGET.json';
export const LOCKED_COUNTING_RULE_ID = 'recursive_docs_schemas_json';
export const R4_EVIDENCE_DOC = 'docs/releases/EOS_R4_AT_CEILING_SCHEMA_GATE_2026-09-09.md';

export const COMPLEXITY_BUDGET_REQUIRED_PATHS = Object.freeze([
  COMPLEXITY_BUDGET_PATH,
  'scripts/lib/complexity-budget-lock.js',
  'tests/eos-r4-at-ceiling-schema-gate.test.js',
  R4_EVIDENCE_DOC
]);

function walkJsonFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsonFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.json')) acc.push(full);
  }
  return acc;
}

export function countSchemasRecursive(schemasAbsDir) {
  return walkJsonFiles(schemasAbsDir).length;
}

export function derivedStatus(count, max) {
  if (count > max) return 'OVER';
  if (count === max) return 'AT_CEILING';
  return 'WITHIN_BUDGET';
}

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {object} [options.budgetObject] override parsed budget
 * @param {string} [options.budgetPath] relative budget path
 * @param {string} [options.schemasDir] relative schemas dir (default docs/schemas)
 * @param {boolean} [options.skipPathChecks]
 * @param {boolean} [options.budgetMissing] force missing-budget failure
 * @returns {{ ok: boolean, checks: object[], failures: object[], meta?: object }}
 */
export function auditComplexityBudgetLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  const budgetRel = options.budgetPath || COMPLEXITY_BUDGET_PATH;
  const schemasRel = options.schemasDir || 'docs/schemas';

  if (options.budgetMissing === true) {
    failures.push({
      path: budgetRel,
      message: 'COMPLEXITY_BUDGET missing (fail-closed)',
      type: 'complexity-budget-lock'
    });
    return { ok: false, checks, failures };
  }

  let budget = options.budgetObject;
  if (budget === undefined) {
    const full = path.join(rootDir, budgetRel);
    if (!fs.existsSync(full)) {
      failures.push({
        path: budgetRel,
        message: 'COMPLEXITY_BUDGET missing (fail-closed)',
        type: 'complexity-budget-lock'
      });
      return { ok: false, checks, failures };
    }
    try {
      budget = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      failures.push({
        path: budgetRel,
        message: 'COMPLEXITY_BUDGET unreadable/invalid JSON: ' + err.message,
        type: 'complexity-budget-lock'
      });
      return { ok: false, checks, failures };
    }
  }

  checks.push({
    path: budgetRel + ' loaded',
    status: 'VERIFIED',
    type: 'complexity-budget-lock'
  });

  const ruleId = budget?.counting_rule?.schemas?.id;
  if (!budget.counting_rule || !ruleId) {
    failures.push({
      path: budgetRel,
      message: 'counting_rule missing (fail-closed) — required counting_rule.schemas.id',
      type: 'complexity-budget-lock'
    });
  } else if (ruleId !== LOCKED_COUNTING_RULE_ID) {
    failures.push({
      path: budgetRel,
      message:
        'counting_rule.schemas.id must be ' +
        LOCKED_COUNTING_RULE_ID +
        ' (got ' +
        ruleId +
        ')',
      type: 'complexity-budget-lock'
    });
  } else {
    checks.push({
      path: 'counting_rule locked recursive_docs_schemas_json',
      status: 'VERIFIED',
      type: 'complexity-budget-lock'
    });
  }

  const max = budget?.budgets?.max_schemas;
  if (typeof max !== 'number' || !(max >= 1)) {
    failures.push({
      path: budgetRel,
      message: 'budgets.max_schemas must be a positive number',
      type: 'complexity-budget-lock'
    });
  }

  const schemasAbs = path.join(rootDir, schemasRel);
  const schemaCount = countSchemasRecursive(schemasAbs);
  const declaredStatus = budget?.status;
  const expected = typeof max === 'number' ? derivedStatus(schemaCount, max) : null;

  const meta = {
    schemaCount,
    maxSchemas: max,
    status: declaredStatus,
    expectedStatus: expected,
    countingRuleId: ruleId || null
  };

  // OVER / additional schema pressure beyond max
  if (typeof max === 'number' && schemaCount > max) {
    failures.push({
      path: schemasRel,
      message:
        'OVER schema pressure: recursive count ' +
        schemaCount +
        ' exceeds max_schemas ' +
        max +
        ' (additional schema beyond budget forbidden while at/over ceiling)',
      type: 'complexity-budget-lock'
    });
  } else if (typeof max === 'number') {
    checks.push({
      path: 'schema count within max (' + schemaCount + '/' + max + ')',
      status: 'VERIFIED',
      type: 'complexity-budget-lock'
    });
  }

  // Dishonest WITHIN_BUDGET while at ceiling (count === max) or over
  if (
    declaredStatus === 'WITHIN_BUDGET' &&
    typeof max === 'number' &&
    schemaCount >= max
  ) {
    failures.push({
      path: budgetRel,
      message:
        'dishonest WITHIN_BUDGET while at ceiling: count ' +
        schemaCount +
        ' >= max_schemas ' +
        max +
        ' (expected AT_CEILING or OVER)',
      type: 'complexity-budget-lock'
    });
  }

  // Status must match derived honesty when counting_rule is locked
  if (ruleId === LOCKED_COUNTING_RULE_ID && expected && declaredStatus !== expected) {
    // Avoid duplicate noise if dishonest WITHIN_BUDGET already recorded for same mismatch
    const already =
      declaredStatus === 'WITHIN_BUDGET' &&
      schemaCount >= max &&
      failures.some((f) => /dishonest WITHIN_BUDGET/i.test(f.message));
    if (!already) {
      failures.push({
        path: budgetRel,
        message:
          'status mismatch: declared ' +
          declaredStatus +
          ' but count ' +
          schemaCount +
          '/' +
          max +
          ' requires ' +
          expected,
        type: 'complexity-budget-lock'
      });
    }
  } else if (ruleId === LOCKED_COUNTING_RULE_ID && expected && declaredStatus === expected) {
    checks.push({
      path: 'status honesty ' + declaredStatus,
      status: 'VERIFIED',
      type: 'complexity-budget-lock'
    });
  }

  // current_usage.schemas should match filesystem when rule locked
  const declaredUsage = budget?.current_usage?.schemas;
  if (
    ruleId === LOCKED_COUNTING_RULE_ID &&
    typeof declaredUsage === 'number' &&
    declaredUsage !== schemaCount
  ) {
    failures.push({
      path: budgetRel,
      message:
        'current_usage.schemas (' +
        declaredUsage +
        ') != recursive filesystem count (' +
        schemaCount +
        ')',
      type: 'complexity-budget-lock'
    });
  } else if (ruleId === LOCKED_COUNTING_RULE_ID && typeof declaredUsage === 'number') {
    checks.push({
      path: 'current_usage.schemas matches filesystem',
      status: 'VERIFIED',
      type: 'complexity-budget-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of COMPLEXITY_BUDGET_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required R4 complexity-budget path missing',
          type: 'complexity-budget-lock'
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
    meta
  };
}
