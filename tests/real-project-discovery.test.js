import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RealProjectDiscoveryEngine } from '../scripts/engine/real-project-discovery-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Capture baselines for delta-based isolation verification
const FUNDACION_PATH = 'C:\\Users\\valen\\Documents\\Fundacion';
const ANDES_PATH = 'C:\\Users\\valen\\Documents\\EOS-Lab\\Andes-Retreat';
const fundacionBaseline = fs.existsSync(FUNDACION_PATH) ? fs.readdirSync(FUNDACION_PATH).sort() : [];
const andesBaseline = fs.existsSync(ANDES_PATH) ? fs.readdirSync(ANDES_PATH).sort() : [];

// ====================================================
// REAL PROJECT DISCOVERY & TARGET INDEPENDENCE TESTS
// ====================================================
test('RealProjectDiscoveryEngine operates strictly in READ_ONLY mode', () => {
  const engine = new RealProjectDiscoveryEngine();
  assert.equal(engine.mode, 'EMPIRICAL_LEVEL_1_READ_ONLY');
  assert.doesNotThrow(() => engine.assertReadOnlyAccess('READ'));
  assert.throws(() => engine.assertReadOnlyAccess('WRITE'), /DENY/);
  assert.throws(() => engine.assertReadOnlyAccess('CREATE'), /DENY/);
  assert.throws(() => engine.assertReadOnlyAccess('DELETE'), /DENY/);
});

test('RealProjectDiscoveryEngine rejects self-analysis of EOS Control Plane for security isolation', () => {
  assert.throws(() => new RealProjectDiscoveryEngine(rootDir), /SECURITY_DENY/);
});

test('RealProjectDiscoveryEngine analyzes target project (Fundacion) and reports observed state', () => {
  const engine = new RealProjectDiscoveryEngine('C:\\Users\\valen\\Documents\\Fundacion');
  const discovery = engine.runDiscoveryMission();
  assert.equal(discovery.projectId, 'fundacion');
  // Engine must accurately report what it observes — populated or unpopulated
  const observedItemCount = discovery.state.observedFacts.find(f => f.key === 'ITEM_COUNT').value;
  const actualItemCount = fs.existsSync(FUNDACION_PATH) ? fs.readdirSync(FUNDACION_PATH).length : 0;
  assert.equal(observedItemCount, actualItemCount, 'Discovery engine must report actual observed item count');
  // Architecture pattern must match observed reality
  const expectedPattern = actualItemCount > 0 ? 'POPULATED_REAL_PROJECT' : 'UNPOPULATED_TARGET';
  assert.equal(discovery.architectureAssessment.pattern, expectedPattern,
    'Architecture pattern must reflect actual target state, not a hardcoded assumption');
});

test('RealProjectDiscoveryEngine analyzes populated real target project (Andes-Retreat)', () => {
  if (!fs.existsSync(ANDES_PATH)) return; // Guard if run in isolated environment

  const engine = new RealProjectDiscoveryEngine(ANDES_PATH);
  const discovery = engine.runDiscoveryMission();
  assert.equal(discovery.projectId, 'andes-retreat');
  assert.equal(discovery.architectureAssessment.pattern, 'POPULATED_REAL_PROJECT');
  assert.equal(discovery.state.observedFacts.find(f => f.key === 'HAS_GIT').value, true);
  assert.equal(discovery.state.observedFacts.find(f => f.key === 'PACKAGE_NAME').value, 'andes-retreat');
  assert.ok(discovery.state.derivedFacts.find(f => f.key === 'FILE_TREE_COUNT').value > 0);
});

test('Negative Protection Test: saveArtifacts refuses to clobber intelligence when the target is unobserved', () => {
  const engine = new RealProjectDiscoveryEngine('C:\\Users\\valen\\Documents\\Fundacion');
  if (fs.existsSync(engine.targetPath)) {
    return;
  }

  const discovery = engine.runDiscoveryMission();
  const statePath = path.join(rootDir, 'docs/intelligence/real_projects/fundacion/REAL_PROJECT_STATE.json');
  const before = fs.readFileSync(statePath, 'utf8');
  assert.throws(() => engine.saveArtifacts(discovery), /DENY: Refusing to persist discovery artifacts/);
  assert.equal(fs.readFileSync(statePath, 'utf8'), before);
});

test('Negative Protection Test: Target directories remain immutable during discovery (Δ=0)', () => {
  if (fs.existsSync(FUNDACION_PATH)) {
    const currentItems = fs.readdirSync(FUNDACION_PATH).sort();
    assert.deepEqual(currentItems, fundacionBaseline,
      'Fundacion must remain immutable during READ_ONLY discovery');
  }
  if (fs.existsSync(ANDES_PATH)) {
    const currentItems = fs.readdirSync(ANDES_PATH).sort();
    assert.deepEqual(currentItems, andesBaseline,
      'Andes-Retreat must remain immutable during READ_ONLY discovery');
  }
});
