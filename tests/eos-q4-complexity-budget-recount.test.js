import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const BUDGET_PATH = 'docs/governance/COMPLEXITY_BUDGET.json';
const DOC = 'docs/releases/EOS_Q4_COMPLEXITY_BUDGET_RECOUNT_2026-09-09.md';
const SCHEMAS_DIR = 'docs/schemas';

// Locked Q4 counting rule: recursive docs/schemas/**/*.json
const COUNTING_RULE_ID = 'recursive_docs_schemas_json';

function walkJsonFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsonFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.json')) acc.push(full);
  }
  return acc;
}

function countSchemasByRule(ruleId) {
  const abs = path.join(rootDir, SCHEMAS_DIR);
  if (ruleId === 'recursive_docs_schemas_json') {
    return walkJsonFiles(abs).length;
  }
  if (ruleId === 'top_level_only') {
    return fs.readdirSync(abs).filter((f) => f.endsWith('.json')).length;
  }
  throw new Error('unknown counting rule: ' + ruleId);
}

function expectedStatus(current, max) {
  if (current > max) return 'OVER';
  if (current === max) return 'AT_CEILING';
  return 'WITHIN_BUDGET';
}

const REQUIRED_DOC_NEEDLES = [
  '## 1. Goal (Q4 / K4 DoD)',
  '## 2. Counting rule (locked)',
  '## 3. Before / after',
  '## 4. NON-CLAIM — PO quarantine',
  '## 5. Freeze note',
  '## 9. Non-claims',
  'PRODUCTION_READY',
  'NON-CLAIM',
  'recursive_docs_schemas_json',
  'AT_CEILING',
];

test('Q4: COMPLEXITY_BUDGET.json exists and declares locked counting rule', () => {
  const abs = path.join(rootDir, BUDGET_PATH);
  assert.ok(fs.existsSync(abs), 'missing ' + BUDGET_PATH);
  const budget = JSON.parse(fs.readFileSync(abs, 'utf8'));
  assert.ok(budget.counting_rule, 'counting_rule must be documented');
  assert.equal(
    budget.counting_rule.schemas.id,
    COUNTING_RULE_ID,
    'schemas counting_rule.id must be recursive_docs_schemas_json'
  );
  assert.ok(
    budget.counting_rule.schemas.glob === 'docs/schemas/**/*.json' ||
      String(budget.counting_rule.schemas.description || '').includes('recursive'),
    'counting rule must describe recursive docs/schemas/**/*.json'
  );
  assert.ok(budget.counting_rule.status_rule, 'status_rule must be documented');
  for (const key of ['WITHIN_BUDGET', 'AT_CEILING', 'OVER']) {
    assert.ok(budget.counting_rule.status_rule[key], 'missing status_rule.' + key);
  }
});

test('Q4: current_usage.schemas matches recursive filesystem count', () => {
  const budget = JSON.parse(fs.readFileSync(path.join(rootDir, BUDGET_PATH), 'utf8'));
  const actual = countSchemasByRule(COUNTING_RULE_ID);
  assert.equal(
    budget.current_usage.schemas,
    actual,
    `current_usage.schemas (${budget.current_usage.schemas}) must equal recursive docs/schemas/**/*.json count (${actual})`
  );
  assert.equal(typeof budget.budgets.max_schemas, 'number');
  assert.ok(budget.budgets.max_schemas >= 1, 'max_schemas must be positive');
});

test('Q4: status matches WITHIN_BUDGET / AT_CEILING / OVER vs count', () => {
  const budget = JSON.parse(fs.readFileSync(path.join(rootDir, BUDGET_PATH), 'utf8'));
  const current = budget.current_usage.schemas;
  const max = budget.budgets.max_schemas;
  const expected = expectedStatus(current, max);
  assert.equal(
    budget.status,
    expected,
    `status must be ${expected} when schemas=${current} max=${max}`
  );
});

test('Q4: evidence doc exists with required honesty + NON-CLAIM sections', () => {
  const abs = path.join(rootDir, DOC);
  assert.ok(fs.existsSync(abs), 'missing ' + DOC);
  const text = fs.readFileSync(abs, 'utf8');
  for (const needle of REQUIRED_DOC_NEEDLES) {
    assert.ok(text.includes(needle), 'missing section/needle: ' + needle);
  }
  assert.ok(
    text.includes('PRODUCTION_READY:** NO') || text.includes('PRODUCTION_READY: NO'),
    'PRODUCTION_READY must remain NO'
  );
  assert.ok(
    /no (paths?|rutas?).{0,40}(named|nombrad)/i.test(text) ||
      text.includes('PO no nombró') ||
      text.includes('PO has not named') ||
      text.includes('quarantine NOT executed') ||
      text.includes('cuarentena NO ejecutada'),
    'must explicitly NON-CLAIM that PO quarantine was not executed'
  );
});

test('Q4: package.json has test:q4', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:q4'],
    'node --test tests/eos-q4-complexity-budget-recount.test.js'
  );
});

test('Q4: freeze gate mentions Q4 complexity budget recount', () => {
  const freeze = fs.readFileSync(
    path.join(rootDir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md'),
    'utf8'
  );
  assert.ok(
    /Q4.*[Cc]omplexity|[Cc]omplexity budget recount/i.test(freeze),
    'freeze gate must note Q4 complexity budget recount'
  );
  assert.ok(
    freeze.includes('PRODUCTION_READY: NO') || freeze.includes('PRODUCTION_READY:** NO'),
    'freeze must keep PRODUCTION_READY NO'
  );
});
