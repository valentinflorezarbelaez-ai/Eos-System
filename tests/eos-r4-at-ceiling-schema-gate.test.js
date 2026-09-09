import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditComplexityBudgetLock,
  COMPLEXITY_BUDGET_PATH,
  LOCKED_COUNTING_RULE_ID,
  COMPLEXITY_BUDGET_REQUIRED_PATHS
} from '../scripts/lib/complexity-budget-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const DOC = 'docs/releases/EOS_R4_AT_CEILING_SCHEMA_GATE_2026-09-09.md';

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function baseBudget(overrides = {}) {
  return {
    version: '1.1.0',
    budgets: { max_schemas: 35, max_engines: 15, max_state_machines: 10, max_governance_layers: 10 },
    current_usage: { schemas: 35, engines: 13, state_machines: 7, governance_layers: 7 },
    counting_rule: {
      schemas: {
        id: LOCKED_COUNTING_RULE_ID,
        glob: 'docs/schemas/**/*.json',
        description: 'recursive'
      },
      status_rule: {
        WITHIN_BUDGET: 'current_usage.schemas < budgets.max_schemas',
        AT_CEILING: 'current_usage.schemas === budgets.max_schemas',
        OVER: 'current_usage.schemas > budgets.max_schemas'
      }
    },
    status: 'AT_CEILING',
    ...overrides
  };
}

function makeSchemasTree(tmpRoot, count) {
  const schemasDir = path.join(tmpRoot, 'docs', 'schemas');
  fs.mkdirSync(schemasDir, { recursive: true });
  for (let i = 0; i < count; i++) {
    writeJson(path.join(schemasDir, `fixture-${i}.schema.json`), { id: i });
  }
  return schemasDir;
}

test('R4: honest AT_CEILING exact on real repo allows', () => {
  const audit = auditComplexityBudgetLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.meta);
  assert.equal(audit.meta.schemaCount, 35);
  assert.equal(audit.meta.maxSchemas, 35);
  assert.equal(audit.meta.status, 'AT_CEILING');
});

test('R4: WITHIN_BUDGET under ceiling allows (temp fixture)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r4-under-'));
  try {
    makeSchemasTree(tmp, 3);
    const budget = baseBudget({
      budgets: { max_schemas: 10, max_engines: 15, max_state_machines: 10, max_governance_layers: 10 },
      current_usage: { schemas: 3, engines: 1, state_machines: 1, governance_layers: 1 },
      status: 'WITHIN_BUDGET'
    });
    writeJson(path.join(tmp, COMPLEXITY_BUDGET_PATH), budget);
    const audit = auditComplexityBudgetLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('R4: OVER deny when recursive count > max_schemas (temp fixture)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r4-over-'));
  try {
    makeSchemasTree(tmp, 5);
    const budget = baseBudget({
      budgets: { max_schemas: 4, max_engines: 15, max_state_machines: 10, max_governance_layers: 10 },
      current_usage: { schemas: 5, engines: 1, state_machines: 1, governance_layers: 1 },
      status: 'OVER'
    });
    writeJson(path.join(tmp, COMPLEXITY_BUDGET_PATH), budget);
    const audit = auditComplexityBudgetLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(
      audit.failures.some((f) => /OVER|exceed|max_schemas|pressure/i.test(f.message)),
      JSON.stringify(audit.failures)
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('R4: AT_CEILING + additional schema file beyond budget denies (temp fixture)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r4-extra-'));
  try {
    // Ceiling exact: 4/4 AT_CEILING declared, then introduce one more schema file on disk
    makeSchemasTree(tmp, 5);
    const budget = baseBudget({
      budgets: { max_schemas: 4, max_engines: 15, max_state_machines: 10, max_governance_layers: 10 },
      current_usage: { schemas: 4, engines: 1, state_machines: 1, governance_layers: 1 },
      status: 'AT_CEILING'
    });
    writeJson(path.join(tmp, COMPLEXITY_BUDGET_PATH), budget);
    const audit = auditComplexityBudgetLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false, 'extra schema beyond AT_CEILING must deny');
    assert.ok(
      audit.failures.some((f) => /OVER|exceed|additional|beyond|pressure|max_schemas/i.test(f.message)),
      JSON.stringify(audit.failures)
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('R4: dishonest WITHIN_BUDGET while at ceiling denies', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r4-dishonest-'));
  try {
    makeSchemasTree(tmp, 4);
    const budget = baseBudget({
      budgets: { max_schemas: 4, max_engines: 15, max_state_machines: 10, max_governance_layers: 10 },
      current_usage: { schemas: 4, engines: 1, state_machines: 1, governance_layers: 1 },
      status: 'WITHIN_BUDGET'
    });
    writeJson(path.join(tmp, COMPLEXITY_BUDGET_PATH), budget);
    const audit = auditComplexityBudgetLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(
      audit.failures.some((f) => /dishonest|WITHIN_BUDGET|AT_CEILING|status/i.test(f.message)),
      JSON.stringify(audit.failures)
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('R4: missing counting_rule denies', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r4-norule-'));
  try {
    makeSchemasTree(tmp, 2);
    const budget = baseBudget({
      budgets: { max_schemas: 10, max_engines: 15, max_state_machines: 10, max_governance_layers: 10 },
      current_usage: { schemas: 2, engines: 1, state_machines: 1, governance_layers: 1 },
      status: 'WITHIN_BUDGET'
    });
    delete budget.counting_rule;
    writeJson(path.join(tmp, COMPLEXITY_BUDGET_PATH), budget);
    const audit = auditComplexityBudgetLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(
      audit.failures.some((f) => /counting_rule/i.test(f.message)),
      JSON.stringify(audit.failures)
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('R4: evidence doc exists with policy + NON-CLAIM needles', () => {
  const abs = path.join(rootDir, DOC);
  assert.ok(fs.existsSync(abs), 'missing ' + DOC);
  const text = fs.readFileSync(abs, 'utf8');
  for (const needle of [
    'AT_CEILING',
    'recursive_docs_schemas_json',
    'PRODUCTION_READY',
    'NON-CLAIM',
    'forbidden',
    'max_schemas',
    'Gate'
  ]) {
    assert.ok(text.includes(needle) || (needle === 'forbidden' && /prohibid/i.test(text)), 'missing needle: ' + needle);
  }
  assert.ok(
    text.includes('PRODUCTION_READY:** NO') || text.includes('PRODUCTION_READY: NO'),
    'PRODUCTION_READY must remain NO'
  );
  assert.ok(
    /gate\s*[!=≠]+\s*(executed\s*)?prune/i.test(text) ||
      text.includes('Gate ≠') ||
      text.includes('Gate !=') ||
      text.includes('gate!=prune') ||
      text.includes('gate != prune'),
    'must NON-CLAIM gate!=executed prune'
  );
});

test('R4: package.json has test:r4', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:r4'],
    'node --test tests/eos-r4-at-ceiling-schema-gate.test.js'
  );
});

test('R4: verify-eos imports complexity-budget-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('complexity-budget-lock'));
  assert.ok(src.includes('auditComplexityBudgetLock'));
  assert.ok(src.includes('COMPLEXITY_BUDGET_REQUIRED_PATHS') || src.includes('eos-r4-at-ceiling-schema-gate.test.js'));
});

test('R4: required paths exist', () => {
  for (const rel of COMPLEXITY_BUDGET_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('R4: freeze gate mentions R4 AT_CEILING schema gate', () => {
  const freeze = fs.readFileSync(
    path.join(rootDir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md'),
    'utf8'
  );
  assert.ok(
    /R4.*AT_CEILING|AT_CEILING.*schema.?gate/i.test(freeze),
    'freeze gate must note R4 AT_CEILING schema gate'
  );
  assert.ok(
    freeze.includes('PRODUCTION_READY: NO') || freeze.includes('PRODUCTION_READY:** NO'),
    'freeze must keep PRODUCTION_READY NO'
  );
});
