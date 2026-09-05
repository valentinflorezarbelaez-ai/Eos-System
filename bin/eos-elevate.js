#!/usr/bin/env node

/**
 * @file bin/eos-elevate.js
 * @description Executable CLI tool for EOS-ELEVATE: Elite Autonomous Remediation & Elevation Engine.
 */

import path from 'node:path';
import { ElevateOrchestrator } from '../src/core/elevate/elevate-orchestrator.js';

const args = process.argv.slice(2);
const targetArg = args.find(a => !a.startsWith('--')) || '.';
const targetPath = path.resolve(process.cwd(), targetArg);

const modeArg = args.find(a => a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'audit';

const formatArg = args.find(a => a.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'table';

const isStrict = args.includes('--strict');

console.log('================================================================================');
console.log('🏆 EOS-ELEVATE — Elite Autonomous Remediation & Code Elevation Engine');
console.log('================================================================================');
console.log(`Target:    ${targetPath}`);
console.log(`Mode:      ${mode.toUpperCase()}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('--------------------------------------------------------------------------------');

const orchestrator = new ElevateOrchestrator({ targetPath });

orchestrator.execute({ mode, strict: isStrict }).then(res => {
  if (format === 'json') {
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }

  if (format === 'markdown') {
    console.log(res.markdownReport);
    process.exit(0);
  }

  // Default: Formatted Terminal Summary
  console.log(`\n🔍 MULTI-VECTOR AUDIT RESULTS:`);
  console.log(`   Scanned Files: ${res.summary.totalScannedFiles}`);
  console.log(`   Total Findings: ${res.summary.totalFindings}`);
  console.log(`   - Security:      ${res.summary.byVector.security} (Critical: ${res.summary.bySeverity.critical}, High: ${res.summary.bySeverity.high})`);
  console.log(`   - Architecture:  ${res.summary.byVector.architecture}`);
  console.log(`   - Quality:       ${res.summary.byVector.quality}`);
  console.log(`   - Performance:   ${res.summary.byVector.performance}`);
  console.log(`   - Accessibility: ${res.summary.byVector.accessibility}`);
  console.log(`\n🔑 Cryptographic Root Digest (SHA-256):`);
  console.log(`   ${res.evidence.digest}`);

  if (res.findings.length > 0) {
    console.log('\n📋 TOP ACTIONABLE FINDINGS:');
    res.findings.slice(0, 5).forEach((f, idx) => {
      console.log(`   ${idx + 1}. [${f.severity}] ${f.ruleId} @ ${f.file}:${f.line}`);
      console.log(`      ${f.message}`);
    });
    if (res.findings.length > 5) {
      console.log(`   ... and ${res.findings.length - 5} additional finding(s). Run with --format=markdown for full breakdown.`);
    }
  } else {
    console.log('\n✨ ZERO DEFECTS: Target codebase meets elite Tier-1 engineering standards.');
  }

  console.log('\n================================================================================');
  console.log(`STATUS: ${res.status} · Epistemic: AUDIT_EXECUTED · Exit Code: 0`);
  console.log('================================================================================');
  process.exit(0);
}).catch(err => {
  console.error(`\n🚨 ELEVATE FATAL ERROR: ${err.message}`);
  process.exit(1);
});
