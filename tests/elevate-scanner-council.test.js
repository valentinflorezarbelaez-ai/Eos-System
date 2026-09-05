import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ScannerCouncil } from '../src/core/elevate/scanner-council.js';

test('EOS-ELEVATE: Scanner Council Multi-Vector Analysis', async (t) => {
  // Create temporary fixture directory
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-elevate-scanner-fixture-'));

  // Fixture 1: Security Risk (hardcoded secret & unsafe eval)
  const mockApiKey = ['sk-proj-', 'supersecret1234567890abcdef'].join('');
  const vulnerableFile = path.join(fixtureDir, 'auth-handler.js');
  fs.writeFileSync(vulnerableFile, `
    const API_KEY = "${mockApiKey}";
    function executeDynamicCode(userInput) {
      return eval(userInput);
    }
    module.exports = { executeDynamicCode };
  `, 'utf8');

  // Fixture 2: Architecture Boundary Violation (UI importing DB directly)
  const uiFile = path.join(fixtureDir, 'user-view.js');
  fs.writeFileSync(uiFile, `
    const db = require('../infra/database-pool.js');
    function renderUser(id) {
      const row = db.query("SELECT * FROM users WHERE id = " + id);
      return "<div>" + row.name + "</div>";
    }
  `, 'utf8');

  // Fixture 3: Quality Anti-pattern (empty catch block)
  const qualityFile = path.join(fixtureDir, 'payment-service.js');
  fs.writeFileSync(qualityFile, `
    async function processCharge() {
      try {
        await doPayment();
      } catch (err) {
        // empty catch block swallows error
      }
    }
  `, 'utf8');

  // Fixture 4: Performance Anti-pattern (sync file I/O in worker)
  const perfFile = path.join(fixtureDir, 'file-processor.js');
  fs.writeFileSync(perfFile, `
    const fs = require('fs');
    function handleRequest() {
      const data = fs.readFileSync('/tmp/large-data.bin');
      return data;
    }
  `, 'utf8');

  // Fixture 5: Accessibility Issue (img without alt, button without text)
  const htmlFile = path.join(fixtureDir, 'index.html');
  fs.writeFileSync(htmlFile, `
    <!DOCTYPE html>
    <html>
      <body>
        <img src="banner.jpg">
        <button></button>
      </body>
    </html>
  `, 'utf8');

  await t.test('SC-01: SecurityScanner flags hardcoded secrets and eval', async () => {
    const council = new ScannerCouncil({ targetPath: fixtureDir });
    const findings = await council.scanSecurity();
    
    assert(findings.length >= 2, `Expected at least 2 security findings, got ${findings.length}`);
    const secretFinding = findings.find(f => f.ruleId === 'SEC-HARDCODED-SECRET');
    const evalFinding = findings.find(f => f.ruleId === 'SEC-UNSAFE-EVAL');

    assert(secretFinding, 'Expected hardcoded secret finding');
    assert.equal(secretFinding.severity, 'CRITICAL');
    assert(evalFinding, 'Expected unsafe eval finding');
    assert.equal(evalFinding.severity, 'HIGH');
  });

  await t.test('SC-02: ArchitectureScanner flags direct infra/db imports in presentation layer', async () => {
    const council = new ScannerCouncil({ targetPath: fixtureDir });
    const findings = await council.scanArchitecture();

    assert(findings.length >= 1, `Expected architecture finding, got ${findings.length}`);
    const archFinding = findings.find(f => f.ruleId === 'ARCH-LAYER-LEAK');
    assert(archFinding, 'Expected ARCH-LAYER-LEAK finding');
    assert.equal(archFinding.severity, 'MEDIUM');
  });

  await t.test('SC-03: QualityScanner flags empty catch blocks', async () => {
    const council = new ScannerCouncil({ targetPath: fixtureDir });
    const findings = await council.scanQuality();

    assert(findings.length >= 1, `Expected quality finding, got ${findings.length}`);
    const emptyCatch = findings.find(f => f.ruleId === 'QUAL-SWALLOWED-ERROR');
    assert(emptyCatch, 'Expected QUAL-SWALLOWED-ERROR finding');
  });

  await t.test('SC-04: PerformanceScanner flags synchronous I/O in service files', async () => {
    const council = new ScannerCouncil({ targetPath: fixtureDir });
    const findings = await council.scanPerformance();

    assert(findings.length >= 1, `Expected performance finding, got ${findings.length}`);
    const syncIo = findings.find(f => f.ruleId === 'PERF-BLOCKING-SYNC-IO');
    assert(syncIo, 'Expected PERF-BLOCKING-SYNC-IO finding');
  });

  await t.test('SC-05: AccessibilityScanner flags missing alt attributes and empty buttons', async () => {
    const council = new ScannerCouncil({ targetPath: fixtureDir });
    const findings = await council.scanAccessibility();

    assert(findings.length >= 2, `Expected at least 2 a11y findings, got ${findings.length}`);
    const missingAlt = findings.find(f => f.ruleId === 'A11Y-MISSING-ALT');
    const emptyButton = findings.find(f => f.ruleId === 'A11Y-EMPTY-BUTTON');
    assert(missingAlt, 'Expected missing alt finding');
    assert(emptyButton, 'Expected empty button finding');
  });

  await t.test('SC-06: Full 360-degree parallel scan aggregates all dimensions', async () => {
    const council = new ScannerCouncil({ targetPath: fixtureDir });
    const report = await council.runFullScan();

    assert(report.summary.totalFindings >= 7, `Expected >= 7 total findings, got ${report.summary.totalFindings}`);
    assert(report.summary.byVector.security >= 2);
    assert(report.summary.byVector.architecture >= 1);
    assert(report.summary.byVector.quality >= 1);
    assert(report.summary.byVector.performance >= 1);
    assert(report.summary.byVector.accessibility >= 2);
    assert.equal(typeof report.digest, 'string');
    assert.equal(report.digest.length, 64); // Valid SHA-256
  });

  // Cleanup
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});
