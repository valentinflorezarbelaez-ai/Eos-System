/**
 * @module mcp-catalog-lock
 * P5 — MCP catalog reconcile lock (Ladder 4 J5).
 *
 * Fail-closed: docs/mcp/EOS_MCP_TOOL_CATALOG.json total/names must equal
 * live CANONICAL_TOOLS from src/mcp-server.js.
 *
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_TOOLS } from '../../src/mcp-server.js';

export const MCP_CATALOG_PATH = 'docs/mcp/EOS_MCP_TOOL_CATALOG.json';

export const P5_ADDED_TOOLS = Object.freeze([
  'eos.doctor',
  'eos.audit.project',
  'eos.verify.strict',
  'eos.log.evidence',
  'eos.mission.loop.status',
  'eos.mission.loop.advance'
]);

export const MCP_CATALOG_REQUIRED_PATHS = Object.freeze([
  MCP_CATALOG_PATH,
  'scripts/lib/mcp-catalog-lock.js',
  'tests/eos-p5-mcp-catalog-reconcile.test.js',
  'docs/releases/EOS_P5_MCP_CATALOG_RECONCILE_2026-09-09.md',
  'docs/mcp/EOS_MCP_TOOL_GOVERNANCE_MATRIX.md',
  'docs/mcp/EOS_MCP_CAPABILITY_MODEL.json'
]);

function loadCatalog(rootDir) {
  const full = path.join(rootDir, MCP_CATALOG_PATH);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw);
}

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {object} [options.catalog]
 * @param {Array<{name:string}>} [options.canonicalTools]
 * @returns {{ ok: boolean, checks: object[], failures: object[], liveCount: number, catalogCount: number, onlyLive: string[], onlyCat: string[] }}
 */
export function auditMcpCatalogLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  const live = options.canonicalTools || CANONICAL_TOOLS;
  const liveNames = live.map((t) => t.name);
  const liveCount = liveNames.length;

  let catalog;
  try {
    catalog = options.catalog || loadCatalog(rootDir);
  } catch (err) {
    failures.push({
      path: MCP_CATALOG_PATH,
      message: 'Failed to load MCP catalog: ' + (err.message || err),
      type: 'mcp-catalog-lock'
    });
    return { ok: false, checks, failures, liveCount, catalogCount: 0, onlyLive: liveNames, onlyCat: [] };
  }

  const tools = Array.isArray(catalog.tools) ? catalog.tools : [];
  const catNames = tools.map((t) => t.name);
  const catalogCount = catNames.length;
  const metaTotal = catalog.metadata && catalog.metadata.total_tools;

  const onlyLive = liveNames.filter((n) => !catNames.includes(n));
  const onlyCat = catNames.filter((n) => !liveNames.includes(n));

  if (liveCount !== 80) {
    failures.push({
      path: 'src/mcp-server.js CANONICAL_TOOLS',
      message: 'Expected live CANONICAL_TOOLS length 80, got ' + liveCount,
      type: 'mcp-catalog-lock'
    });
  } else {
    checks.push({
      path: 'CANONICAL_TOOLS length=80',
      status: 'VERIFIED',
      type: 'mcp-catalog-lock'
    });
  }

  if (metaTotal !== liveCount || catalogCount !== liveCount) {
    failures.push({
      path: MCP_CATALOG_PATH,
      message:
        'Catalog count drift: metadata.total_tools=' +
        metaTotal +
        ' tools.length=' +
        catalogCount +
        ' live=' +
        liveCount,
      type: 'mcp-catalog-lock'
    });
  } else {
    checks.push({
      path: MCP_CATALOG_PATH + ' total=' + catalogCount,
      status: 'VERIFIED',
      type: 'mcp-catalog-lock'
    });
  }

  if (onlyLive.length || onlyCat.length) {
    failures.push({
      path: MCP_CATALOG_PATH,
      message:
        'Catalog name set mismatch only_live=' +
        JSON.stringify(onlyLive) +
        ' only_cat=' +
        JSON.stringify(onlyCat),
      type: 'mcp-catalog-lock'
    });
  } else {
    checks.push({
      path: 'catalog names == CANONICAL_TOOLS names',
      status: 'VERIFIED',
      type: 'mcp-catalog-lock'
    });
  }

  for (const name of P5_ADDED_TOOLS) {
    if (!catNames.includes(name) || !liveNames.includes(name)) {
      failures.push({
        path: name,
        message: 'P5 required tool missing from catalog or live CANONICAL_TOOLS',
        type: 'mcp-catalog-lock'
      });
    }
  }
  if (!failures.some((f) => P5_ADDED_TOOLS.includes(f.path))) {
    checks.push({
      path: 'P5 six tools present in catalog+live',
      status: 'VERIFIED',
      type: 'mcp-catalog-lock'
    });
  }

  for (const rel of MCP_CATALOG_REQUIRED_PATHS) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) {
      failures.push({
        path: rel,
        message: 'Required P5 path missing',
        type: 'mcp-catalog-lock'
      });
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
    liveCount,
    catalogCount,
    onlyLive,
    onlyCat
  };
}
