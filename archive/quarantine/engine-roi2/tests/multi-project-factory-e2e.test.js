import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectBootstrapEngine } from '../scripts/engine/project-bootstrap-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sandboxBase = path.resolve(__dirname, 'fixtures/multi-project-sandbox');

// ====================================================
// PHASE 16: MULTI-PROJECT FACTORY E2E TESTS
// ====================================================

const engine = new ProjectBootstrapEngine(sandboxBase);

test('Multi-Project Factory initializes 4 distinct project archetypes in isolation', () => {
  const projects = [
    { projectId: 'PRJ-ARCH-ECOMMERCE', name: 'Luxe Registry E-Commerce', type: 'E_COMMERCE_PLATFORM' },
    { projectId: 'PRJ-ARCH-HOSPITALITY', name: 'Andes Retreat Portal', type: 'WEB_APPLICATION' },
    { projectId: 'PRJ-ARCH-MULTIMODAL', name: 'Creative Pipeline Engine', type: 'MULTIMODAL_PIPELINE' },
    { projectId: 'PRJ-ARCH-NONPROFIT', name: 'Fundación Non-Profit Portal', type: 'WEBSITE' }
  ];

  const results = projects.map(p => engine.generateScaffold(p));

  assert.equal(results.length, 4);
  results.forEach(res => {
    assert.equal(res.status, 'BOOTSTRAPPED');
    assert.ok(fs.existsSync(path.join(res.projectDir, 'project.json')));
    assert.ok(fs.existsSync(path.join(res.projectDir, 'intake/DISCOVERY.md')));
    assert.ok(fs.existsSync(path.join(res.projectDir, 'governance')));
    assert.ok(fs.existsSync(path.join(res.projectDir, 'evidence')));
  });

  // Zero cross-project contamination test
  const p1Manifest = JSON.parse(fs.readFileSync(path.join(results[0].projectDir, 'project.json'), 'utf-8'));
  const p2Manifest = JSON.parse(fs.readFileSync(path.join(results[1].projectDir, 'project.json'), 'utf-8'));

  assert.notEqual(p1Manifest.project_id, p2Manifest.project_id);
  assert.equal(p1Manifest.governance.isolation_model, 'ZERO_UNAUTHORIZED_DELTA');
  assert.equal(p2Manifest.governance.isolation_model, 'ZERO_UNAUTHORIZED_DELTA');
});

// Teardown
test.after(() => {
  engine.cleanupSandbox();
});
