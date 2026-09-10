#!/usr/bin/env node
/**
 * T6 Complexity ceiling HOLD gate (NON-MUTATING).
 *
 * Modes:
 *   default / --hold     → audit HOLD evidence + R4 complexity-budget-lock
 *   --names a,b,c        → validate PO_NAMED list ⊆ P6 CANDIDATE paths (no prune)
 *
 * Exit 0 on PASS; exit 1 on fail-closed. Never mutates schemas, engines, or budget.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditComplexityCeilingHoldLock,
  COMPLEXITY_CEILING_HOLD_DOC
} from '../lib/complexity-ceiling-hold-lock.js';
import { auditComplexityBudgetLock } from '../lib/complexity-budget-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const P6_INVENTORY = 'docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md';

/** Parse P6 CANDIDATE paths from inventory markdown table rows (backticked paths). */
export function parseP6CandidatePaths(text) {
  const names = [];
  // Capture ranked table path cell (may contain multiple `path` tokens).
  const rowRe = /^\|\s*\d+\s*\|\s*([^|]+)\|/gm;
  let m;
  while ((m = rowRe.exec(text)) !== null) {
    const cell = m[1];
    const pathRe = /`([^`]+)`/g;
    let pm;
    while ((pm = pathRe.exec(cell)) !== null) {
      const p = pm[1].trim();
      if (p && (p.startsWith('src/') || p.startsWith('docs/'))) names.push(p);
    }
  }
  return names;
}

export function validatePoNamedList(names, candidates) {
  const failures = [];
  if (!Array.isArray(names) || names.length === 0) {
    failures.push('PO_NAMED list empty — refuse silent/unnamed prune');
    return { ok: false, failures };
  }
  const set = new Set(candidates);
  for (const n of names) {
    if (!set.has(n)) {
      failures.push('PO_NAMED path not in P6 CANDIDATE set: ' + n);
    }
  }
  return { ok: failures.length === 0, failures };
}

function parseArgs(argv) {
  const out = { names: null, hold: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--hold') out.hold = true;
    else if (a === '--names') {
      const raw = argv[++i] || '';
      out.names = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

export function runComplexityCeilingHoldGate(options = {}) {
  const report = {
    schema: 'eos.complexity_ceiling_hold_gate.v1',
    ok: false,
    mode: 'HOLD',
    PRODUCTION_READY: 'NO',
    mutating: false,
    checks: [],
    failures: []
  };

  const holdAudit = auditComplexityCeilingHoldLock(rootDir, {
    skipBudgetReconcile: options.skipBudgetReconcile === true
  });
  report.checks.push(...holdAudit.checks);
  report.failures.push(...holdAudit.failures.map((f) => f.message || JSON.stringify(f)));
  report.mode = holdAudit.mode;

  const budget = auditComplexityBudgetLock(rootDir);
  if (budget.ok) {
    report.checks.push({
      path: 'R4 complexity-budget lock (gate)',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-gate'
    });
  } else {
    report.failures.push(
      ...budget.failures.map((f) => 'budget: ' + (f.message || f.path))
    );
  }

  if (Array.isArray(options.names)) {
    report.mode = 'PO_NAMED';
    const invPath = path.join(rootDir, P6_INVENTORY);
    const invText = fs.readFileSync(invPath, 'utf8');
    const candidates = parseP6CandidatePaths(invText);
    const named = validatePoNamedList(options.names, candidates);
    if (named.ok) {
      report.checks.push({
        path: 'PO_NAMED list ⊆ P6 CANDIDATE (' + options.names.length + ')',
        status: 'VERIFIED',
        type: 'complexity-ceiling-hold-gate'
      });
      report.checks.push({
        path: 'NON-MUTATING: gate does not prune schemas/engines',
        status: 'VERIFIED',
        type: 'complexity-ceiling-hold-gate'
      });
    } else {
      report.failures.push(...named.failures);
    }
  }

  report.ok = report.failures.length === 0 && holdAudit.ok && budget.ok;
  if (Array.isArray(options.names) && options.names.length > 0) {
    report.ok = report.failures.length === 0 && budget.ok;
  }
  return report;
}

function formatReport(report) {
  const lines = [
    '====================================================',
    '   EOS T6 — COMPLEXITY CEILING HOLD GATE (NON-MUTATING)',
    '====================================================',
    'mode: ' + report.mode,
    'ok: ' + report.ok,
    'PRODUCTION_READY=' + report.PRODUCTION_READY,
    'mutating: false',
    'evidence: ' + COMPLEXITY_CEILING_HOLD_DOC,
    ''
  ];
  for (const c of report.checks) {
    lines.push('[VERIFIED] ' + (c.path || c));
  }
  if (report.failures.length) {
    lines.push('');
    lines.push('FAILURES:');
    for (const f of report.failures) lines.push(' - ' + f);
  }
  lines.push('');
  lines.push('NON-CLAIMS: gate != executed prune; HOLD != quarantine; no vibe schemas');
  return lines.join('\n');
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Usage: node scripts/ci/complexity-ceiling-hold-gate.js [--hold] [--names path.a,path.b]\n' +
        'NON-MUTATING. PRODUCTION_READY=NO.'
    );
    process.exit(0);
  }
  const report = runComplexityCeilingHoldGate({
    names: args.names,
    hold: args.hold || !args.names
  });
  console.log(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}
