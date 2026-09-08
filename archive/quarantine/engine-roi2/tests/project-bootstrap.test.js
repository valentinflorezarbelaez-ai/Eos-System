import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectBootstrapEngine } from '../scripts/engine/project-bootstrap-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sandboxDir = path.resolve(__dirname, 'fixtures/bootstrap-test-sandbox');

// ====================================================
// WS-03: MULTI-PROJECT BOOTSTRAP ENGINE TESTS
// ====================================================

const engine = new ProjectBootstrapEngine(sandboxDir);

test('WS-03.1: Generate standardized scaffold for PRJ-ANDES-RETREAT', () => {
  const result = engine.generateScaffold({
    projectId: 'PRJ-ANDES-RETREAT',
    name: 'Andes Retreat Resort Portal',
    description: 'Eco-hospitality booking & guest platform'
  });

  assert.equal(result.projectId, 'PRJ-ANDES-RETREAT');
  assert.equal(result.status, 'BOOTSTRAPPED');
  assert.ok(fs.existsSync(path.join(result.projectDir, 'project.json')));
  assert.ok(fs.existsSync(path.join(result.projectDir, 'intake/DISCOVERY.md')));
  assert.ok(fs.existsSync(path.join(result.projectDir, 'specs')));
  assert.ok(fs.existsSync(path.join(result.projectDir, 'governance')));
  assert.ok(fs.existsSync(path.join(result.projectDir, 'evidence')));
  assert.ok(fs.existsSync(path.join(result.projectDir, 'audits')));

  const manifest = JSON.parse(fs.readFileSync(path.join(result.projectDir, 'project.json'), 'utf-8'));
  assert.equal(manifest.governance.isolation_model, 'ZERO_UNAUTHORIZED_DELTA');
  assert.equal(manifest.governance.external_write_barrier, 'ENFORCED');
});

test('WS-03.2: Generate standardized scaffold for PRJ-LUXE-REGISTRY (demonstrating multi-project repeatability)', () => {
  const result = engine.generateScaffold({
    projectId: 'PRJ-LUXE-REGISTRY',
    name: 'Luxe Event & Registry Platform',
    projectType: 'E_COMMERCE_PLATFORM'
  });

  assert.equal(result.projectId, 'PRJ-LUXE-REGISTRY');
  assert.ok(fs.existsSync(path.join(result.projectDir, 'project.json')));
});

test('WS-03.3: Reject bootstrap missing required fields', () => {
  assert.throws(() => engine.generateScaffold({ name: 'No ID' }), /INVALID_CONFIG/);
  assert.throws(() => engine.generateScaffold({ projectId: 'PRJ-NO-NAME' }), /INVALID_CONFIG/);
});

// Teardown
test.after(() => {
  engine.cleanupSandbox();
});
