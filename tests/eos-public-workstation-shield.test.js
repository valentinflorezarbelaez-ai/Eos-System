import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readJsonState, writeJsonState } from '../src/shield/atomic-state.js';
import { acceptContractPayload, acceptMcpToolPayload } from '../src/shield/payload-gate.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('missing state file is an empty ENOENT result', () => {
  const missing = path.join(os.tmpdir(), `eos-shield-missing-${process.pid}-${Date.now()}.json`);
  const result = readJsonState(missing);
  assert.equal(result.ok, true);
  assert.equal(result.state, null);
  assert.equal(result.reason, 'ENOENT');
});

test('writeJsonState round-trips through a temp file and rename', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-shield-'));
  const target = path.join(dir, 'state.json');
  const calls = [];
  const mem = new Map();
  const fakeFs = {
    mkdirSync() {},
    writeFileSync(file, data) {
      calls.push(['write', file]);
      mem.set(file, String(data));
    },
    renameSync(from, to) {
      calls.push(['rename', from, to]);
      assert.equal(mem.has(from), true);
      mem.set(to, mem.get(from));
      mem.delete(from);
    },
    readFileSync(file) {
      if (!mem.has(file)) {
        const err = new Error('missing');
        err.code = 'ENOENT';
        throw err;
      }
      return mem.get(file);
    },
    unlinkSync(file) {
      mem.delete(file);
    }
  };

  const written = writeJsonState(target, { gate: 'human' }, fakeFs);
  assert.equal(written.ok, true);
  assert.equal(calls.some((c) => c[0] === 'write' && c[1] !== target), true);
  assert.equal(calls.some((c) => c[0] === 'rename' && c[2] === target), true);
  const read = readJsonState(target, fakeFs);
  assert.deepEqual(read.state, { gate: 'human' });
});

test('invalid JSON is not an empty success', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-shield-bad-'));
  const target = path.join(dir, 'state.json');
  fs.writeFileSync(target, '{', 'utf8');
  const result = readJsonState(target);
  assert.equal(result.ok, false);
  assert.equal(result.state, null);
});

test('shield source does not probe existence or lock a file handle', () => {
  const source = fs.readFileSync(path.join(rootDir, 'src/shield/atomic-state.js'), 'utf8');
  assert.equal(source.includes('existsSync'), false);
  assert.equal(source.includes('fileHandle.lock'), false);
  assert.equal(source.includes('.lock('), false);
});

test('malformed payloads are rejected before they become contracts', () => {
  const schema = {
    type: 'object',
    properties: {
      method: { type: 'string' },
      limit: { type: 'number' }
    },
    required: ['method'],
    additionalProperties: false
  };

  const cases = [
    null,
    [],
    'method',
    { limit: 1 },
    { method: 1 },
    { method: 'eos.mission.status', extra: true }
  ];

  for (const payload of cases) {
    const result = acceptContractPayload(payload, schema);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'SCHEMA_VIOLATION');
    assert.equal(Object.hasOwn(result, 'contract'), false);
  }
});

test('a matching payload is returned as the contract', () => {
  const schema = {
    type: 'object',
    properties: { method: { type: 'string' } },
    required: ['method']
  };
  const payload = { method: 'eos.mission.status' };
  const result = acceptContractPayload(payload, schema);
  assert.equal(result.ok, true);
  assert.deepEqual(result.contract, payload);
});

test('omitted additionalProperties still rejects unknown keys', () => {
  const result = acceptContractPayload(
    { method: 'eos.mission.status', sneak: 1 },
    { type: 'object', properties: { method: { type: 'string' } }, required: ['method'] }
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, 'SCHEMA_VIOLATION');
});

test('MCP tool payload rejects a bad envelope and does not invent a dispatch', () => {
  const schema = {
    type: 'object',
    properties: { missionId: { type: 'string' } },
    required: ['missionId']
  };
  const bad = [
    null,
    { method: '', params: { missionId: 'm1' } },
    { params: { missionId: 'm1' } },
    { method: 'eos.mission.status', params: {} },
    { method: 'eos.mission.status', params: { missionId: 4 } }
  ];
  for (const message of bad) {
    const result = acceptMcpToolPayload(message, schema);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'SCHEMA_VIOLATION');
    assert.equal(Object.hasOwn(result, 'contract'), false);
  }

  const good = acceptMcpToolPayload(
    { method: 'eos.mission.status', params: { missionId: 'm1' } },
    schema
  );
  assert.equal(good.ok, true);
  assert.equal(good.contract.method, 'eos.mission.status');
  assert.deepEqual(good.contract.params, { missionId: 'm1' });
});

test('kernel modules do not import the shield in this slice', () => {
  const memory = fs.readFileSync(path.join(rootDir, 'src/core/memory.js'), 'utf8');
  const mcp = fs.readFileSync(path.join(rootDir, 'src/core/runtime/mcp-schema-validator.js'), 'utf8');
  assert.equal(memory.includes('src/shield'), false);
  assert.equal(memory.includes('../shield'), false);
  assert.equal(mcp.includes('payload-gate'), false);
  assert.equal(mcp.includes('src/shield'), false);
});

test('promotion note forbids unsupervised repair and cites verify', () => {
  const note = fs.readFileSync(
    path.join(rootDir, 'docs/releases/VERIFY_FAILS_BLOCK_PROMOTION.md'),
    'utf8'
  );
  assert.match(note, /verify-eos\.js --strict/);
  assert.match(note, /npm test/);
  assert.match(note, /auto-merge/i);
  assert.match(note, /LEVEL_2/);
  assert.match(note, /production_deploy: false/);
  assert.match(note, /NOT VERIFIED/);
});

test('public site states the contract and stays clear of hype and PTG', () => {
  const html = fs.readFileSync(path.join(rootDir, 'site/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(rootDir, 'site/styles.css'), 'utf8');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<h1[\s>]/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /skip/i);
  assert.match(html, /<main[\s>]/);
  for (const name of [
    'Cursor',
    'Windsurf',
    'Antigravity',
    'Zed',
    'Trae',
    'PearAI',
    'Kiro',
    'Claude Code',
    'Aider',
    'Manus',
    'Replit Agent'
  ]) {
    assert.ok(html.includes(name), name);
  }
  assert.match(html, /marca|trademark/i);
  assert.match(html, /LEVEL_2/);
  assert.match(html, /verify:strict|verify-eos\.js --strict/);
  assert.match(html, /especificaci[oó]n/i);
  assert.match(html, /aprobaci[oó]n humana/i);
  assert.doesNotMatch(html, /Performance Talent|9019705444|Samuel Quiceno|superior a Devin|superior to Devin/i);
  assert.doesNotMatch(html, /PRODUCTION_READY:\s*(YES|S[IÍ]|true)/i);
  assert.match(html, /PRODUCTION_READY/);
  assert.match(css, /prefers-reduced-motion/);
});

test('PTG pipeline spec keeps user assertions unlabeled as verified measurements', () => {
  const spec = fs.readFileSync(
    path.join(rootDir, 'openspec/changes/ptg-instagram-pipeline/specs/instagram-pipeline/spec.md'),
    'utf8'
  );
  assert.match(spec, /USER_ASSERTED/);
  assert.match(spec, /9019705444/);
  assert.match(spec, /1080×1350|1080x1350/);
  assert.match(spec, /no token template|Do not invent/i);
  assert.match(spec, /minor/i);
  assert.doesNotMatch(spec, /roster figures are VERIFIED|USER_ASSERTED`\s*=\s*`VERIFIED/);
});
