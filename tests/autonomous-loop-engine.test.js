import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AutonomousLoopEngine } from '../src/core/runtime/autonomous-loop-engine.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

test('AutonomousLoopEngine - Unit & Integration Test Suite', async (t) => {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-loop-test-'));
  const controlPlaneRoot = path.join(tmpBase, 'control-plane');

  // Setup synthetic fixture structure
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'projects', 'registrations'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'intake', 'synth'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'specs', 'synth'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'src', 'synth'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'tests', 'synth'), { recursive: true });

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'projects', 'registrations', 'synth.json'),
    JSON.stringify({
      project_id: 'PRJ-SYNTH',
      name: 'Synth Project',
      path: controlPlaneRoot,
      documentation: ['docs/intake/synth/PROJECT_CONTEXT.md']
    }),
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'intake', 'synth', 'PROJECT_CONTEXT.md'),
    '# Context for Synth',
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'src', 'synth', 'calculator.js'),
    'export function add(a, b) { return a + b; }\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'tests', 'synth', 'calculator.test.js'),
    `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../../src/synth/calculator.js';

test('adds numbers correctly', () => {
  assert.equal(add(2, 3), 5);
});
`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'src', 'synth', 'standalone-orphan.js'),
    'export const ANSWER = 42;\n',
    'utf8'
  );

  const loop = new AutonomousLoopEngine({ controlPlaneRoot });

  await t.test('instantiates with options and sub-engines', () => {
    assert.equal(loop.controlPlaneRoot, controlPlaneRoot);
    assert.equal(loop.maxHealingAttempts, 3);
    assert.ok(loop.rtm);
    assert.ok(loop.healer);
  });

  await t.test('surgical pass on covered code executes targeted test and passes', () => {
    const result = loop.runSurgicalPass('src/synth/calculator.js', { projectId: 'PRJ-SYNTH' });
    assert.equal(result.status, 'VERIFIED');
    assert.equal(result.result, 'PASS');
    assert.ok(result.tests_executed.some(t => t.includes('calculator.test.js')));
    assert.ok(result.duration_ms >= 0);
    assert.ok(result.sha256);

    const report = loop.formatLoopReport(result);
    assert.ok(report.includes('VERIFIED'));
    assert.ok(report.includes('src/synth/calculator.js'));
  });

  await t.test('surgical pass on untested file falls back to syntax check', () => {
    const result = loop.runSurgicalPass('src/synth/standalone-orphan.js', { projectId: 'PRJ-SYNTH' });
    assert.equal(result.status, 'VERIFIED');
    assert.equal(result.result, 'PASS');
    assert.equal(result.tests_executed.length, 0);
    assert.ok(result.execution_logs.some(l => l.check === 'syntax' && l.output === 'SYNTAX_OK'));
  });

  await t.test('surgical pass on regression captures structured failure diagnosis', () => {
    // Write failing test
    fs.writeFileSync(
      path.join(controlPlaneRoot, 'tests', 'synth', 'failing.test.js'),
      `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../../src/synth/calculator.js';

test('failing expectation', () => {
  assert.equal(add(2, 2), 999);
});
`,
      'utf8'
    );

    const result = loop.runSurgicalPass('tests/synth/failing.test.js', {
      projectId: 'PRJ-SYNTH',
      heal: true
    });

    assert.equal(result.status, 'REGRESSION_DETECTED');
    assert.equal(result.result, 'FAIL');
    assert.ok(result.failure_diagnostic);
    assert.equal(result.failure_diagnostic.hasFailure, true);

    const report = loop.formatLoopReport(result);
    assert.ok(report.includes('REGRESSION DETECTED'));
    assert.ok(report.includes('DIAGNOSTIC ROOT CAUSE'));

    // Clean up failing test fixture
    fs.unlinkSync(path.join(controlPlaneRoot, 'tests', 'synth', 'failing.test.js'));
  });

  await t.test('watcher correctly registers and stops cleanly', () => {
    const watcher = loop.startWatcher(controlPlaneRoot, { projectId: 'PRJ-SYNTH' });
    assert.ok(watcher);
    assert.equal(loop.watchers.size, 1);

    loop.stopWatcher();
    assert.equal(loop.watchers.size, 0);
    assert.equal(loop.debounceTimers.size, 0);
  });

  await t.test('CLI integration: runs eos loop --file --once', async () => {
    const cli = new MissionCLI({
      baseDir: controlPlaneRoot,
      controlPlaneRoot
    });

    // 1. Text formatted output
    const textRes = await cli.run([
      'loop',
      '--file',
      'src/synth/calculator.js',
      '--project',
      'PRJ-SYNTH',
      '--once'
    ]);
    assert.equal(textRes.success, true);
    assert.ok(textRes.output.includes('EOS AUTONOMOUS LOOP: 🟢 VERIFIED'));

    // 2. JSON formatted output
    const jsonRes = await cli.run([
      'loop',
      '--file',
      'src/synth/calculator.js',
      '--project',
      'PRJ-SYNTH',
      '--once',
      '--json'
    ]);
    assert.equal(jsonRes.success, true);
    const parsed = JSON.parse(jsonRes.output);
    assert.equal(parsed.status, 'VERIFIED');
    assert.equal(parsed.result, 'PASS');
    assert.ok(parsed.tests_executed.length > 0);
  });
});
