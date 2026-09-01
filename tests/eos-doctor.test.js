/**
 * eos doctor — clean-clone preflight tests.
 *
 * The failure modes exercised here are the ones that actually broke a fresh clone of this
 * repository: an operator-specific absolute path in the runtime, and canonical files that
 * exist locally but are not committed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

import { DoctorEngine, CANONICAL_ENTRYPOINTS } from '../src/core/diagnostics/doctor-engine.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function fakeRepo({ leak = false, omit = [], gitInit = true, gitignoreMissions = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-doctor-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'doctor-fixture', type: 'module' }, null, 2)
  );
  if (gitignoreMissions) {
    fs.writeFileSync(path.join(root, '.gitignore'), '.missions/\n');
  }

  for (const rel of CANONICAL_ENTRYPOINTS) {
    if (omit.includes(rel)) continue;
    fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    const body = leak && rel === 'src/mcp-server.js'
      ? "const target = 'C:\\\\Users\\\\someone\\\\Documents\\\\Fundacion';\nexport default target;\n"
      : 'export default null;\n';
    fs.writeFileSync(path.join(root, rel), body);
  }

  fs.mkdirSync(path.join(root, 'Fundacion'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'governance'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'governance', 'POLICY.md'), '# policy\n');

  if (gitInit) {
    const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    git('init', '-q');
    git('config', 'user.email', 'doctor@test.local');
    git('config', 'user.name', 'Doctor Test');
    git('add', '-A');
    git('commit', '-qm', 'fixture');
  }
  return root;
}

test('DOCTOR-01: a healthy checkout returns PASS with no homedir leak', () => {
  const doctor = new DoctorEngine({ baseDir: REPO_ROOT });
  const result = doctor.run();

  assert.equal(result.verdict, 'PASS');
  assert.equal(result.homedir_leak, 'NO');
  assert.equal(result.summary.failed, 0);
  assert.equal(result.epistemic_class, 'MEASURED');
  assert.equal(result.checks.find((c) => c.id === 'CANONICAL_ENTRYPOINTS').status, 'PASS');
  assert.equal(result.checks.find((c) => c.id === 'SCHEMA_CATALOG').status, 'PASS');
});

test('DOCTOR-02: an operator-specific path in the runtime fails the leak check', () => {
  const root = fakeRepo({ leak: true });
  const result = new DoctorEngine({ baseDir: root }).run();

  assert.equal(result.homedir_leak, 'YES');
  assert.equal(result.verdict, 'FAIL');
  const leak = result.checks.find((c) => c.id === 'HOMEDIR_LEAK');
  assert.equal(leak.status, 'FAIL');
  assert.ok(leak.offenders.some((o) => o.startsWith('src/mcp-server.js')));
});

test('DOCTOR-03: a missing canonical entrypoint fails', () => {
  const root = fakeRepo({ omit: ['src/core/runtime/mission-runtime.js'] });
  const result = new DoctorEngine({ baseDir: root }).run();

  const check = result.checks.find((c) => c.id === 'CANONICAL_ENTRYPOINTS');
  assert.equal(check.status, 'FAIL');
  assert.deepEqual(check.missing, ['src/core/runtime/mission-runtime.js']);
  assert.equal(result.verdict, 'FAIL');
});

test('DOCTOR-04: canonical files present locally but uncommitted are reported as absent from a clean clone', () => {
  const root = fakeRepo();
  // Recreate the reported P1 condition: the file is on disk but never staged.
  fs.writeFileSync(path.join(root, 'bin', 'eos.js'), 'export default null;\n');
  execFileSync('git', ['rm', '--cached', '-q', 'bin/eos.js'], { cwd: root, stdio: 'ignore' });

  const result = new DoctorEngine({ baseDir: root }).run();
  const check = result.checks.find((c) => c.id === 'CANONICAL_TRACKED');
  assert.equal(check.status, 'FAIL');
  assert.deepEqual(check.untracked, ['bin/eos.js']);
  assert.equal(result.verdict, 'FAIL');
});

test('DOCTOR-05: a non-git directory warns instead of claiming tracked', () => {
  const root = fakeRepo({ gitInit: false });
  const result = new DoctorEngine({ baseDir: root }).run();
  const check = result.checks.find((c) => c.id === 'CANONICAL_TRACKED');

  assert.equal(check.status, 'WARN');
  assert.match(check.observed, /tracking cannot be verified/);
});

test('DOCTOR-06: unignored mission state warns', () => {
  const root = fakeRepo({ gitignoreMissions: false });
  const result = new DoctorEngine({ baseDir: root }).run();
  const check = result.checks.find((c) => c.id === 'MISSION_STATE_IGNORED');

  assert.equal(check.status, 'WARN');
  assert.match(check.observed, /can leak into commits/);
});

test('DOCTOR-07: an empty protected target is reported as a vacuous zero-delta claim', () => {
  const result = new DoctorEngine({ baseDir: REPO_ROOT }).run();
  const check = result.checks.find((c) => c.id === 'PROTECTED_SURFACES');

  // Fundacion is a dangling gitlink, so a clean clone gets it empty.
  assert.ok(['PASS', 'WARN'].includes(check.status));
  if (check.status === 'WARN') {
    assert.match(check.observed, /vacuous|absent/);
  }
});

test('DOCTOR-08: the CLI exposes doctor in text and json form', async () => {
  const cli = new MissionCLI({ baseDir: REPO_ROOT });

  const text = await cli.run(['doctor']);
  assert.equal(text.success, true);
  assert.match(text.output, /EOS DOCTOR — CLEAN-CLONE PREFLIGHT/);
  assert.match(text.output, /HOMEDIR_LEAK: NO/);
  assert.match(text.output, /VERDICT: PASS/);

  const json = await cli.run(['doctor', '--json']);
  const parsed = JSON.parse(json.output);
  assert.equal(parsed.verdict, 'PASS');
  assert.equal(parsed.checks.length, 8);
});

test('DOCTOR-09: doctor reports failure through the CLI exit contract', async () => {
  const root = fakeRepo({ leak: true });
  const cli = new MissionCLI({ baseDir: root });
  const res = await cli.run(['doctor']);

  assert.equal(res.success, false);
  assert.match(res.output, /HOMEDIR_LEAK: YES/);
  assert.match(res.output, /VERDICT: FAIL/);
});

test('DOCTOR-10: doctor is listed in CLI help', async () => {
  const cli = new MissionCLI({ baseDir: REPO_ROOT });
  const help = await cli.run(['--help']);
  assert.match(help.output, /eos doctor \[--json\]/);
});
