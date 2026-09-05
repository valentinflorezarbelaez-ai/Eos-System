/**
 * L8-W01 / L8-W02 — Write-barrier adversarial coverage (RED / fail-closed).
 *
 * L8-W01: McpMissionBridge.barrierCheck only protects in-repo
 *   `{baseDir}/Fundacion`. External Documents\\Fundacion must also DENY.
 * L8-W02: governance-gate.js exits 0 on malformed JSON (fail-open);
 *   preToolGuardrail honors params.authorized:true at authorizationLevel 0.
 *
 * Never create or write files under the real Documents\\Fundacion tree.
 * Do not mutate production in this PR.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { McpMissionBridge } from '../src/core/mcp/mcp-mission-bridge.js';
import { preToolGuardrail } from '../src/mcp/guardrail-sandwich.js';

const WINDOWS_EXTERNAL_FUNDACION = 'C:\\Users\\valen\\Documents\\Fundacion\\probe.md';
const POSIX_EXTERNAL_FUNDACION = path.posix.join(
  '/',
  'Users',
  'valen',
  'Documents',
  'Fundacion',
  'probe.md'
);
const HOMEDIR_EXTERNAL_FUNDACION = path.join(
  os.homedir(),
  'Documents',
  'Fundacion',
  'probe.md'
);

function makeTempBaseDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-l8-w01-'));
}

function makeIsolatedBridge(baseDir) {
  return new McpMissionBridge({
    baseDir,
    runtime: { missionsRoot: path.join(baseDir, '.missions') },
    integrationGate: { fdirSafeModeTripped: false },
    schemas: { loadSchema: () => ({}), validate: () => ({ valid: true, errors: [] }) },
    rules: { cite: () => [] }
  });
}

function assertDenied(check, label) {
  const allowed = check?.allowed;
  const reason = String(check?.reason || check?.status || check?.permissionDecision || '');
  assert.equal(
    allowed,
    false,
    `${label}: barrierCheck must DENY (allowed:false). Observed allowed=${allowed} reason=${reason}`
  );
  assert.match(
    reason,
    /PROTECTED|EXTERNAL|DENY|FUNDACION|BLOCKED/i,
    `${label}: deny reason must signal EXTERNAL/PROTECTED block (observed ${reason || '<empty>'})`
  );
}

describe('L8-W01 barrierCheck external Fundacion (fail-closed)', () => {
  it('control: in-repo Fundacion under temp baseDir is still DENY', () => {
    const baseDir = makeTempBaseDir();
    const bridge = makeIsolatedBridge(baseDir);
    const inRepo = path.join(baseDir, 'Fundacion', 'probe.md');

    const check = bridge.barrierCheck({ path: inRepo });
    assertDenied(check, 'L8-W01 control (in-repo Fundacion)');
  });

  it('must DENY absolute Windows Documents\\\\Fundacion path (not only baseDir/Fundacion)', () => {
    const baseDir = makeTempBaseDir();
    const bridge = makeIsolatedBridge(baseDir);

    const check = bridge.barrierCheck({ path: WINDOWS_EXTERNAL_FUNDACION });
    assertDenied(check, 'L8-W01 Windows external Fundacion');
  });

  it('must DENY POSIX / homedir Documents/Fundacion absolute paths', () => {
    const baseDir = makeTempBaseDir();
    const bridge = makeIsolatedBridge(baseDir);

    assertDenied(
      bridge.barrierCheck({ path: POSIX_EXTERNAL_FUNDACION }),
      'L8-W01 POSIX /Users/valen/Documents/Fundacion'
    );
    assertDenied(
      bridge.barrierCheck({ path: HOMEDIR_EXTERNAL_FUNDACION }),
      'L8-W01 homedir Documents/Fundacion'
    );
  });
});

describe('L8-W02 fail-closed hook + authorized:true bypass', () => {
  it('governance-gate.js must exit non-zero on malformed JSON stdin', () => {
    const hook = path.join(process.cwd(), 'scripts', 'hooks', 'governance-gate.js');
    const result = spawnSync(process.execPath, [hook], {
      input: '{not json',
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 10_000
    });

    assert.notEqual(
      result.status,
      0,
      `L8-W02: malformed JSON stdin must fail-closed (exit !== 0). Observed exitCode=${result.status} stderr=${(result.stderr || '').trim()}`
    );
  });

  it('preToolGuardrail must BLOCK Fundacion path even with params.authorized:true at authorizationLevel 0', () => {
    const verdict = preToolGuardrail(
      'write_to_file',
      {
        path: WINDOWS_EXTERNAL_FUNDACION,
        authorized: true
      },
      { authorizationLevel: 0 }
    );

    assert.equal(
      verdict.allowed,
      false,
      `L8-W02: authorized:true must not bypass Fundacion at authorizationLevel 0 (observed allowed=${verdict.allowed} status=${verdict.status})`
    );
    assert.match(
      String(verdict.status || ''),
      /BLOCKED/,
      `L8-W02: status must be BLOCKED (observed ${verdict.status || '<empty>'})`
    );
  });
});
