#!/usr/bin/env node
/**
 * T5 KEEP PO-named prune gate (NON-MUTATING).
 *
 * Modes:
 *   default / --hold     → audit HOLD evidence + catalog reconcile
 *   --names a,b,c        → validate PO_NAMED list ⊆ S5 CANDIDATE set (no delete)
 *
 * Exit 0 on PASS; exit 1 on fail-closed. Never mutates catalog or MCP server.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditKeepPoPruneHoldLock,
  KEEP_PO_PRUNE_HOLD_DOC
} from '../lib/keep-po-prune-hold-lock.js';
import { auditMcpCatalogLock } from '../lib/mcp-catalog-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const S5_INVENTORY = 'docs/releases/EOS_S5_MCP_TOOL_KEEP_INVENTORY_2026-09-09.md';

/** Parse S5 CANDIDATE tool names from inventory markdown table rows. */
export function parseS5CandidateTools(text) {
  const names = [];
  const re = /^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    names.push(m[1]);
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
      failures.push('PO_NAMED tool not in S5 CANDIDATE set: ' + n);
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

export function runKeepPoPruneGate(options = {}) {
  const report = {
    schema: 'eos.keep_po_prune_gate.v1',
    ok: false,
    mode: 'HOLD',
    PRODUCTION_READY: 'NO',
    mutating: false,
    checks: [],
    failures: []
  };

  const holdAudit = auditKeepPoPruneHoldLock(rootDir, {
    skipCatalogReconcile: options.skipCatalogReconcile === true
  });
  report.checks.push(...holdAudit.checks);
  report.failures.push(...holdAudit.failures.map((f) => f.message || JSON.stringify(f)));
  report.mode = holdAudit.mode;

  const catalog = auditMcpCatalogLock(rootDir);
  if (catalog.ok) {
    report.checks.push({
      path: 'catalog reconcile (gate)',
      status: 'VERIFIED',
      type: 'keep-po-prune-gate'
    });
  } else {
    report.failures.push(
      ...catalog.failures.map((f) => 'catalog: ' + (f.message || f.path))
    );
  }

  if (Array.isArray(options.names)) {
    report.mode = 'PO_NAMED';
    const invPath = path.join(rootDir, S5_INVENTORY);
    const invText = fs.readFileSync(invPath, 'utf8');
    const candidates = parseS5CandidateTools(invText);
    const named = validatePoNamedList(options.names, candidates);
    if (named.ok) {
      report.checks.push({
        path: 'PO_NAMED list ⊆ S5 CANDIDATE (' + options.names.length + ')',
        status: 'VERIFIED',
        type: 'keep-po-prune-gate'
      });
      report.checks.push({
        path: 'NON-MUTATING: gate does not delete tools',
        status: 'VERIFIED',
        type: 'keep-po-prune-gate'
      });
    } else {
      report.failures.push(...named.failures);
    }
  }

  report.ok = report.failures.length === 0 && holdAudit.ok && catalog.ok;
  if (Array.isArray(options.names) && options.names.length > 0) {
    // PO_NAMED validation may add failures even if hold audit ok
    report.ok = report.failures.length === 0 && catalog.ok;
  }
  return report;
}

function formatReport(report) {
  const lines = [
    '====================================================',
    '   EOS T5 — KEEP PO PRUNE GATE (NON-MUTATING)',
    '====================================================',
    'mode: ' + report.mode,
    'ok: ' + report.ok,
    'PRODUCTION_READY=' + report.PRODUCTION_READY,
    'mutating: false',
    'evidence: ' + KEEP_PO_PRUNE_HOLD_DOC,
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
  lines.push('NON-CLAIMS: gate != executed prune; inventory != silent delete');
  return lines.join('\n');
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Usage: node scripts/ci/keep-po-prune-gate.js [--hold] [--names tool.a,tool.b]\n' +
        'NON-MUTATING. PRODUCTION_READY=NO.'
    );
    process.exit(0);
  }
  const report = runKeepPoPruneGate({
    names: args.names,
    hold: args.hold || !args.names
  });
  console.log(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}