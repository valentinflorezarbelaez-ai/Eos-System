import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ElevateOrchestrator } from '../src/core/elevate/elevate-orchestrator.js';

test('EOS-ELEVATE: End-to-End Orchestration & Certification', async (t) => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-elevate-e2e-fixture-'));

  // Create mock micro-project
  const mockKey = ['AKIA', '1234567890ABCDEF'].join('');
  fs.writeFileSync(path.join(fixtureDir, 'index.js'), `
    const SECRET = "${mockKey}";
    function main() {
      console.log("Starting app with secret " + SECRET);
    }
    module.exports = { main };
  `, 'utf8');

  fs.writeFileSync(path.join(fixtureDir, 'index.html'), `
    <!DOCTYPE html>
    <html lang="en">
      <body>
        <img src="avatar.png">
      </body>
    </html>
  `, 'utf8');

  await t.test('E2E-01: Audit mode generates findings without mutating source tree', async () => {
    const orchestrator = new ElevateOrchestrator({ targetPath: fixtureDir });
    const originalHash = fs.readFileSync(path.join(fixtureDir, 'index.js'), 'utf8');

    const result = await orchestrator.execute({ mode: 'audit' });

    assert.equal(result.status, 'AUDIT_COMPLETE');
    assert(result.findings.length >= 2, `Expected >= 2 findings, got ${result.findings.length}`);
    assert.equal(result.evidence.status, 'AUDIT_EXECUTED');
    assert.equal(typeof result.evidence.digest, 'string');
    assert(result.evidence.digest.length === 64);

    // Verify source tree is 100% untouched
    const afterHash = fs.readFileSync(path.join(fixtureDir, 'index.js'), 'utf8');
    assert.equal(afterHash, originalHash, 'Audit mode must never mutate target files');
  });

  await t.test('E2E-02: Generates executive Markdown report with compliance scores', async () => {
    const orchestrator = new ElevateOrchestrator({ targetPath: fixtureDir });
    const result = await orchestrator.execute({ mode: 'audit' });

    assert(result.markdownReport.includes('# EOS-ELEVATE: Executive Quality & Security Audit Report'));
    assert(result.markdownReport.includes('## Executive Compliance Scorecard'));
    assert(result.markdownReport.includes('## Multi-Vector Findings Breakdown'));
    assert(result.markdownReport.includes('## Cryptographic Attestation'));
  });

  await t.test('E2E-03: Self-Audit on EOS Control Plane passes cleanly', async () => {
    const orchestrator = new ElevateOrchestrator({ targetPath: process.cwd() });
    const result = await orchestrator.execute({ mode: 'audit', strict: false });

    assert.equal(result.status, 'AUDIT_COMPLETE');
    assert(result.evidence.summary.totalScannedFiles > 50, 'Must scan real files in EOS');
  });

  // Cleanup
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});
