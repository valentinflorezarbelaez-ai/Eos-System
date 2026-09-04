/**
 * Mission OS slim — advertised MCP surface is Tier A (14) by default.
 * SSOT: docs/rationalization/EOS_TOOL_SURFACE_FINAL.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mcp from '../src/mcp-server.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TIER_A_NAMES = [
  'eos.kernel.boot',
  'eos.authority.check',
  'eos.context.compile',
  'eos.workspace.barrier_check',
  'eos.intent.expand',
  'eos.orchestrator.init',
  'eos.scaffolder.clean',
  'eos.scaffolder.execute',
  'eos.core.triamazikamno.validate',
  'eos.verifier.run',
  'eos.drift.detect',
  'eos.evidence.record',
  'eos.orchestrator.advance',
  'eos.mission.status'
];

const QUARANTINED_ENGINE_FILES = [
  'scripts/engine/epistemic-evidence-engine.js',
  'scripts/engine/hitl-gatekeeper.js',
  'scripts/engine/sdd-fsm-engine.js'
];

function advertisedNames(env) {
  assert.equal(typeof mcp.listTools, 'function', 'mcp-server must export listTools');
  return mcp.listTools(env).map((tool) => tool.name);
}

function walkJsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(full, acc);
    } else if (entry.name.endsWith('.js')) {
      acc.push(full);
    }
  }
  return acc;
}

test('default MCP listTools is exactly the 14 Tier A names', () => {
  const previous = process.env.EOS_MCP_SURFACE;
  delete process.env.EOS_MCP_SURFACE;
  try {
    const names = advertisedNames({});
    assert.deepEqual([...names].sort(), [...TIER_A_NAMES].sort());
    assert.equal(names.length, 14);
    assert.ok(names.every((name) => !name.startsWith('eos.pleroma.')));
    assert.equal(names.includes('eos.provider.health'), false);
  } finally {
    if (previous === undefined) {
      delete process.env.EOS_MCP_SURFACE;
    } else {
      process.env.EOS_MCP_SURFACE = previous;
    }
  }
});

test('EOS_MCP_SURFACE=lab restores lab tools including pleroma', () => {
  const names = advertisedNames({ EOS_MCP_SURFACE: 'lab' });
  assert.ok(names.some((name) => name.startsWith('eos.pleroma.')), 'lab surface must restore eos.pleroma.*');
  assert.ok(names.length > 14, 'lab surface must advertise more than the 14 Tier A tools');
});

test('EOS_MCP_SURFACE=full restores lab tools including pleroma', () => {
  const names = advertisedNames({ EOS_MCP_SURFACE: 'full' });
  assert.ok(names.some((name) => name.startsWith('eos.pleroma.')), 'full surface must restore eos.pleroma.*');
  assert.ok(names.length > 14, 'full surface must advertise more than the 14 Tier A tools');
});

test('src/ does not import quarantined duplicate SDD engines', () => {
  const needles = [
    'scripts/engine/epistemic-evidence-engine',
    'scripts/engine/hitl-gatekeeper',
    'scripts/engine/sdd-fsm-engine'
  ];
  for (const file of walkJsFiles(path.join(ROOT, 'src'))) {
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

test('duplicate SDD engines are quarantined (moved, not deleted)', () => {
  for (const rel of QUARANTINED_ENGINE_FILES) {
    assert.equal(
      fs.existsSync(path.join(ROOT, rel)),
      false,
      `${rel} must leave scripts/engine`
    );
    const dest = path.join(ROOT, 'archive/quarantine', path.basename(rel));
    assert.equal(
      fs.existsSync(dest),
      true,
      `${path.basename(rel)} must exist under archive/quarantine/`
    );
  }
});
