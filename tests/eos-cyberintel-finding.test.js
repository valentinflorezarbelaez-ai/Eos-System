import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  formatDoctorBoundaryBlock,
  recordIntelligenceFinding
} from '../src/shield/intelligence-finding.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const valid = {
  source: 'https://github.com/jofpin',
  observedOn: '2026-10-03',
  confidence: 'HIGH',
  humanGate: 'REQUIRED',
  repo: 'trape',
  impact: 'Covert people-tracking kit. EOS records the name and refuses the tool.'
};

test('non-objects and unknown fields are untrusted input', () => {
  for (const input of [null, [], 'trape', 1, { ...valid, procedure: 'omit' }]) {
    const result = recordIntelligenceFinding(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'UNTRUSTED_INPUT');
    assert.equal(Object.hasOwn(result, 'finding'), false);
  }
});

test('a finding without the human gate is not recorded', () => {
  const result = recordIntelligenceFinding({ ...valid, humanGate: 'SKIP' });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'HUMAN_GATE_REQUIRED');
  assert.equal(Object.hasOwn(result, 'finding'), false);
});

test('malformed fields and multiline impact are schema violations', () => {
  const cases = [
    { ...valid, source: 'http://github.com/jofpin' },
    { ...valid, observedOn: '03-10-2026' },
    { ...valid, confidence: 'CERTAIN' },
    { ...valid, repo: '../trape' },
    { ...valid, impact: 'line one\nline two' }
  ];
  for (const input of cases) {
    const result = recordIntelligenceFinding(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.equal(result.code, 'SCHEMA_VIOLATION');
  }
});

test('secret material is refused and not echoed', () => {
  const secret = 'api_key=super-secret-value';
  const result = recordIntelligenceFinding({ ...valid, impact: secret });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'SECRET_HANDLING');
  assert.equal(JSON.stringify(result).includes('super-secret-value'), false);
});

test('a complete finding keeps source, date, confidence, and the human gate', () => {
  const result = recordIntelligenceFinding(valid);
  assert.equal(result.ok, true);
  assert.deepEqual(result.finding, valid);
});

test('the kernel doctor does not own the new boundary sentences', () => {
  const source = fs.readFileSync(
    path.join(rootDir, 'src/core/runtime/operator-doctor.js'),
    'utf8'
  );
  assert.equal(source.includes('SECRET_HANDLING'), false);
  assert.equal(source.includes('UNTRUSTED_INPUT'), false);
});

test('doctor text states the boundary and json mode stays kernel output', () => {
  const block = formatDoctorBoundaryBlock();
  assert.match(block, /SECRET_HANDLING/);
  assert.match(block, /UNTRUSTED_INPUT/);
  assert.match(block, /HUMAN_GATE/);
  assert.match(block, /NON-CLAIM/);

  const help = spawnSync(process.execPath, ['bin/eos-doctor.js', '--help'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /SECRET_HANDLING/);
  assert.match(help.stdout, /UNTRUSTED_INPUT/);

  const jsonHelp = spawnSync(process.execPath, ['bin/eos-doctor.js', '--json', '--help'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.equal(jsonHelp.status, 0);
  assert.equal(jsonHelp.stdout.includes('SECRET_HANDLING'), false);
  assert.match(jsonHelp.stdout, /eos-doctor read-only local check/);
});
