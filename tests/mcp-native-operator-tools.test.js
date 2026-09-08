import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';

describe('EOS native operator MCP tools (v0.6)', () => {
  test('catalog exposes eos.doctor / audit.project / verify.strict / log.evidence', () => {
    const names = CANONICAL_TOOLS.map((t) => t.name);
    assert.ok(names.includes('eos.doctor'));
    assert.ok(names.includes('eos.audit.project'));
    assert.ok(names.includes('eos.verify.strict'));
    assert.ok(names.includes('eos.log.evidence'));
    assert.equal(CANONICAL_TOOLS.length, 80);
  });

  test('eos_doctor underscore alias reports VERDICT PASS without homedir leak', async () => {
    const server = new EosMcpServer();
    const res = await server.handleToolCall('eos_doctor', {});
    assert.equal(res.status, 'SUCCESS');
    assert.equal(res.VERDICT, 'PASS');
    assert.equal(res.HOMEDIR_LEAK, 'NO');
    assert.equal(res.doctor.ok, true);
  });

  test('eos_audit_project runs audit phase for registered project', async () => {
    const server = new EosMcpServer();
    const res = await server.handleToolCall('eos_audit_project', {
      projectId: 'PRJ-APP-FUERZA',
      phase: 'audit'
    });
    assert.equal(res.status, 'SUCCESS');
    assert.equal(res.audit_project.projectId, 'PRJ-APP-FUERZA');
    assert.equal(res.audit_project.phase, 'audit');
    assert.ok(res.audit_project.sha256.startsWith('sha256-'));
  });

  test('eos_log_evidence seals SHA-256 receipt under docs/evidence', async () => {
    const server = new EosMcpServer();
    const evidenceId = 'EVD-TMP-MCP-LOG';
    const res = await server.handleToolCall(
      'eos_log_evidence',
      {
        evidenceId,
        claim: 'Native MCP evidence seal smoke test',
        payload: { ok: true }
      },
      {
        EOS_MODE: 'read-write',
        EOS_AUTONOMY_LEVEL: 'LEVEL_2',
        EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
      }
    );
    assert.equal(res.status, 'SUCCESS');
    assert.ok(res.sha256.startsWith('sha256-'));
    assert.ok(fs.existsSync(res.path));

    // cleanup ephemeral evidence
    try {
      fs.unlinkSync(res.path);
    } catch {
      /* ignore */
    }
  });
});
