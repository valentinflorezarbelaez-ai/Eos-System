/**
 * @module mcp-tool-keep-lock
 * S5 — MCP/tool KEEP inventory verify lock (Ladder 7 K5).
 *
 * Fail-closed: docs/releases/EOS_S5_MCP_TOOL_KEEP_INVENTORY_2026-09-09.md
 * must exist with required inventory sections + NON-CLAIM / inventory-only language.
 *
 * NON-CLAIM: inventory != executed prune. This lock does not delete/prune any
 * MCP tools. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const MCP_TOOL_KEEP_INVENTORY_DOC =
  'docs/releases/EOS_S5_MCP_TOOL_KEEP_INVENTORY_2026-09-09.md';

/** Sections / needles aligned with tests/eos-s5-mcp-tool-keep-inventory.test.js */
export const MCP_TOOL_KEEP_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Inventory method (evidence)',
  '## 3. KEEP set (do not prune) — evidence',
  '## 4. Ranked prune CANDIDATES (inventory only)',
  '## 7. NON-CLAIM / Non-claims',
  'PRODUCTION_READY',
  'NON-CLAIM',
  '¿Qué puedo dejar de hacer?'
]);

export const MCP_TOOL_KEEP_REQUIRED_PATHS = Object.freeze([
  MCP_TOOL_KEEP_INVENTORY_DOC,
  'scripts/lib/mcp-tool-keep-lock.js',
  'tests/eos-s5-mcp-tool-keep-inventory.test.js',
  'docs/mcp/EOS_MCP_TOOL_CATALOG.json',
  'docs/mcp/EOS_MCP_DEAD_OR_ORPHAN_REGISTER.json',
  'scripts/lib/mcp-catalog-lock.js'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.docText] override inventory markdown (temp fixtures)
 * @param {boolean} [options.skipPathChecks] when true, skip required companion path existence
 * @param {boolean} [options.docMissing] force missing-doc failure (temp fixtures)
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditMcpToolKeepLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: MCP_TOOL_KEEP_INVENTORY_DOC,
      message: 'S5 MCP/tool KEEP inventory doc missing (fail-closed)',
      type: 'mcp-tool-keep-lock'
    });
    return { ok: false, checks, failures };
  }

  let text = options.docText;
  if (text === undefined) {
    const full = path.join(rootDir, MCP_TOOL_KEEP_INVENTORY_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: MCP_TOOL_KEEP_INVENTORY_DOC,
        message: 'S5 MCP/tool KEEP inventory doc missing (fail-closed)',
        type: 'mcp-tool-keep-lock'
      });
      return { ok: false, checks, failures };
    }
    text = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: MCP_TOOL_KEEP_INVENTORY_DOC + ' exists',
    status: 'VERIFIED',
    type: 'mcp-tool-keep-lock'
  });

  let sectionsOk = true;
  for (const needle of MCP_TOOL_KEEP_REQUIRED_SECTIONS) {
    if (!text.includes(needle)) {
      sectionsOk = false;
      failures.push({
        path: MCP_TOOL_KEEP_INVENTORY_DOC,
        message: 'S5 MCP/tool KEEP inventory required section/needle missing: ' + needle,
        type: 'mcp-tool-keep-lock'
      });
    }
  }
  if (sectionsOk) {
    checks.push({
      path: 'S5 MCP/tool KEEP required sections present',
      status: 'VERIFIED',
      type: 'mcp-tool-keep-lock'
    });
  }

  const productionReadyNo =
    text.includes('PRODUCTION_READY:** NO') ||
    text.includes('PRODUCTION_READY: NO') ||
    text.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: MCP_TOOL_KEEP_INVENTORY_DOC,
      message: 'S5 MCP/tool KEEP inventory must keep PRODUCTION_READY: NO',
      type: 'mcp-tool-keep-lock'
    });
  } else {
    checks.push({
      path: 'S5 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'mcp-tool-keep-lock'
    });
  }

  const inventoryOnly =
    text.includes('do not delete') ||
    text.includes('FORBIDDEN') ||
    text.includes('inventory only') ||
    text.includes('inventory-only') ||
    text.includes('inventory ≠ executed prune') ||
    text.includes('inventory != executed prune');
  if (!inventoryOnly) {
    failures.push({
      path: MCP_TOOL_KEEP_INVENTORY_DOC,
      message:
        'S5 MCP/tool KEEP inventory must state inventory-only / do not delete (NON-CLAIM inventory!=executed prune)',
      type: 'mcp-tool-keep-lock'
    });
  } else {
    checks.push({
      path: 'S5 NON-CLAIM inventory-only (!= executed prune)',
      status: 'VERIFIED',
      type: 'mcp-tool-keep-lock'
    });
  }

  const hasCandidateCount = /Candidate count[^\n]*:\s*\d+/i.test(text);
  const hasKeepCount = /KEEP count:\s*\d+/i.test(text);
  if (!hasCandidateCount || !hasKeepCount) {
    failures.push({
      path: MCP_TOOL_KEEP_INVENTORY_DOC,
      message: 'S5 inventory must declare KEEP count and Candidate count',
      type: 'mcp-tool-keep-lock'
    });
  } else {
    checks.push({
      path: 'S5 KEEP + Candidate counts present',
      status: 'VERIFIED',
      type: 'mcp-tool-keep-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of MCP_TOOL_KEEP_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required S5 MCP/tool KEEP path missing',
          type: 'mcp-tool-keep-lock'
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures
  };
}
