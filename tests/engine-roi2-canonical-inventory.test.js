/**
 * ROI2 engine prune — locks the canonical scripts/engine keep set.
 * Evidence: archive/quarantine/engine-roi2/INVENTORY.json
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE_DIR = path.join(ROOT, 'scripts', 'engine');
const INVENTORY_PATH = path.join(ROOT, 'archive', 'quarantine', 'engine-roi2', 'INVENTORY.json');

const CANONICAL_ENGINE_FILES = [
  'adversarial-laboratory-engine.js',
  'autonomous-engineering-factory.js',
  'autonomous-engineering-mission-engine.js',
  'autonomous-engineering-operating-loop.js',
  'autonomous-execution-runtime.js',
  'autonomous-self-evolution-engine.js',
  'capability-intelligence-engine.js',
  'independent-verification-harness.js',
  'mission-ledger.js',
  'production-readiness-review.js',
  'real-project-discovery-engine.js',
  'release-decision-engine.js',
  'simulate-strategies.js',
  'spec-driven-product-loop.js',
  'strategy-engine.js',
  'strategy-selection-engine.js',
  'strategy-simulator.js',
  'system-wide-integrity-audit.js',
  'x-learning-watch.js',
].sort();

test('ROI2 inventory exists and matches canonical keep set', () => {
  assert.equal(fs.existsSync(INVENTORY_PATH), true, 'INVENTORY.json must exist');
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  assert.equal(inventory.action, 'REVERSIBLE_QUARANTINE');
  assert.deepEqual([...inventory.keep_canonical].sort(), CANONICAL_ENGINE_FILES);
});

test('scripts/engine contains exactly the canonical keep set', () => {
  const onDisk = fs
    .readdirSync(ENGINE_DIR)
    .filter((name) => name.endsWith('.js'))
    .sort();
  assert.deepEqual(onDisk, CANONICAL_ENGINE_FILES);
});

test('archived ROI2 engines are present under archive/quarantine/engine-roi2', () => {
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (const name of inventory.archived_engines) {
    const dest = path.join(ROOT, 'archive', 'quarantine', 'engine-roi2', 'scripts-engine', name);
    assert.equal(fs.existsSync(dest), true, `${name} must exist in quarantine`);
    assert.equal(
      fs.existsSync(path.join(ENGINE_DIR, name)),
      false,
      `${name} must leave scripts/engine`
    );
  }
});

test('live src/ does not import quarantined ROI2 engine paths', () => {
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const needles = inventory.archived_engines.map((f) => `scripts/engine/${f}`);

  function walk(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, acc);
      else if (entry.name.endsWith('.js')) acc.push(full);
    }
    return acc;
  }

  for (const file of walk(path.join(ROOT, 'src'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const needle of needles) {
      assert.equal(
        text.includes(needle),
        false,
        `${path.relative(ROOT, file)} must not import ${needle}`
      );
    }
  }
});
