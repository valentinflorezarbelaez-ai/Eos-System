import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { AuditVerifierHandler } from '../../src/mcp/handlers/audit-verifier-handler.js';
import { ContextCompiler, EOSContextCompiler } from '../../src/core/runtime/context-compiler.js';
import { ParallelAuditorDAG } from '../../src/core/runtime/parallel-auditor-dag.js';

describe('AuditVerifierHandler', () => {
  it('constructor sets default options correctly', () => {
    const handler = new AuditVerifierHandler();
    assert.strictEqual(handler.controlPlaneRoot, process.cwd());
    assert.ok(handler.contextCompiler instanceof EOSContextCompiler);
  });

  it('constructor accepts custom options', () => {
    const customRoot = '/custom/root/path';
    const handler = new AuditVerifierHandler({ controlPlaneRoot: customRoot });
    assert.strictEqual(handler.controlPlaneRoot, customRoot);
  });

  it('runVerifier returns VERIFIED status and correct properties', async () => {
    const handler = new AuditVerifierHandler();
    const result = await handler.runVerifier();

    assert.strictEqual(result.status, 'VERIFIED');
    assert.strictEqual(result.checksTotal, 482);
    assert.strictEqual(result.checksPassed, 482);
    assert.strictEqual(result.failures, 0);
    assert.ok(result.timestamp, 'Timestamp should be present');
    assert.ok(!isNaN(Date.parse(result.timestamp)), 'Timestamp should be a valid date string');
  });

  it('compileContext (mission context) returns mission payload', async () => {
    const handler = new AuditVerifierHandler();
    const result = await handler.compileContext({ mission: { id: 'TEST-MISSION' } });

    assert.ok(result.sha256);
    assert.ok(result.timestamp);
    assert.ok(result.tokenBudget);
    assert.strictEqual(result.epistemic_class, 'MEASURED');
  });

  it('compileContext (surgical context) triggers SurgicalCompiler with valid files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-surgical-test-'));
    const dummyFile = path.join(tmpDir, 'test-file.js');
    fs.writeFileSync(dummyFile, 'export function hello() { return "world"; }', 'utf8');

    const handler = new AuditVerifierHandler();
    const args = {
      surgical: true,
      filePaths: [dummyFile]
    };

    const result = await handler.compileContext(args);

    // Based on ContextCompiler.compileSurgicalContext signature
    assert.ok(result.compiledText.includes('--- SURGICAL INTERFACE:'));
    assert.ok(result.compiledText.includes('hello()'));
    assert.ok(result.metrics);
    assert.strictEqual(result.metrics.filesCount, 1);
    assert.ok(result.provenanceReceipt);
    assert.strictEqual(result.provenanceReceipt.mode, 'SURGICAL_AST_PRUNING');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runParallelAudits triggers DAG and returns execution results', async () => {
    // Note: To avoid running actual complex audits which take time and depend on cwd files,
    // we instantiate it with a temporary empty directory.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-dag-test-'));

    const handler = new AuditVerifierHandler({ controlPlaneRoot: tmpDir });

    // We overwrite customRunners in ParallelAuditorDAG temporarily to mock the DAG execution
    // However, since we cannot easily intercept the instantiation inside runParallelAudits
    // without a global mock, we let it run on an empty directory.

    const result = await handler.runParallelAudits();

    // Check for standard DAG execution result shape
    assert.ok(result.overallStatus === 'VERIFIED' || result.overallStatus === 'REMEDIATION_REQUIRED');
    assert.ok(typeof result.totalAuditsExecuted === 'number');
    assert.ok(result.evidenceReceipt);
    assert.ok(result.waves);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
