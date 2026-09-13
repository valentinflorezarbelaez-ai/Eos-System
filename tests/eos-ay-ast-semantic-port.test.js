/**
 * @file eos-ay-ast-semantic-port.test.js
 * @description SPEC-0056 / Mission AY — AST & Semantic Graph Reasoning Port.
 * Hermetic TDD (~18):
 * happy-path parse + graph query; symbol/deps/import/export; DENY paths;
 * hermetic only; Law VI CLEAN; PRODUCTION_READY NO; NON-CLAIM; Fundacion DENY.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: port ≠ full IDE / ≠ language-server marketplace /
 * ≠ CloudAgent code intelligence SaaS; not AZ/BA/BB;
 * Fundacion Δ=0; AY_PRODUCTION_READY=NO; Antigravity-first; L17 CLOSED.
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * contiguous strings — synthesize at runtime for fixtures.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AY_PRODUCTION_READY,
  AY_KIND,
  AY_CODES,
  AY_PHASES,
  AY_PHASE_ORDER,
  AY_RECEIPT_KIND,
  AY_RECEIPT_PRODUCTION_READY,
  AY_POLICY_GATE_KIND,
  AY_GRAPH_KIND,
  AstSemanticPortError,
  createAstSemanticPort,
  reason,
  sanitizeAyPayload,
  sha256Canonical,
  stableStringify,
  buildReasoningReceipt,
  parseSource,
  buildGraphFromFacts,
  runQuery,
  checkPathAllowlisted,
  DEFAULT_ALLOWLISTED_PATHS,
  NODE_KINDS,
  EDGE_KINDS
} from '../src/core/developer-engine/ast-semantic-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULE_DIR = path.join(ROOT, 'src/core/developer-engine');

const ALLOWED = 'fixtures/hello.js';

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

const SAMPLE_SRC = `
import { helper } from './helper.js';
import util from 'node:util';

export function greet(name) {
  return helper(name);
}

export class Greeter {
  say(n) { return greet(n); }
}

export const add = (a, b) => a + b;

export default greet;

function internal() {
  greet('x');
  add(1, 2);
}
`.trim();

function makePort(opts = {}) {
  return createAstSemanticPort({
    now: opts.now || (() => '2026-09-12T20:42:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    allowlistedPaths: opts.allowlistedPaths || [...DEFAULT_ALLOWLISTED_PATHS],
    ports: opts.ports || {},
    ...opts
  });
}

// ── AY1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('AY1: kind eos-ast-semantic-graph-reasoning-port and PRODUCTION_READY NO', () => {
  const p = makePort();
  assert.equal(p.kind, AY_KIND);
  assert.equal(p.kind, 'eos-ast-semantic-graph-reasoning-port');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(AY_PRODUCTION_READY, 'NO');
  const health = p.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, AY_KIND);
  assert.equal(health.fullIde, false);
  assert.equal(health.languageServerMarketplace, false);
  assert.equal(health.cloudAgentCodeIntelligence, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'OPEN');
  assert.equal(health.axisMeasured, 'AX');
  assert.equal(AY_RECEIPT_KIND, 'eos-ast-semantic-reasoning-receipt');
  assert.equal(AY_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(AY_POLICY_GATE_KIND, 'eos-ast-semantic-policy-gate');
  assert.equal(AY_GRAPH_KIND, 'eos-ast-semantic-graph');
  assert.deepEqual([...AY_PHASE_ORDER], ['PARSE', 'BUILD_GRAPH', 'QUERY']);
});

// ── AY2: happy-path parse + graph query → COMPLETED + sealed receipt ────────
test('AY2: happy-path allowlisted hermetic source → COMPLETED + sealed receipt', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'summary' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, AY_CODES.COMPLETED);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AY_CODES.COMPLETED);
  assert.ok(result.receipt.receiptId.startsWith('AY-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.phases, [
    AY_PHASES.PARSE,
    AY_PHASES.BUILD_GRAPH,
    AY_PHASES.QUERY
  ]);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fullIde, false);
  assert.equal(result.languageServerMarketplace, false);
  assert.equal(result.cloudAgentCodeIntelligence, false);
  assert.equal(result.cloudAgent, false);
  assert.ok(result.graph);
  assert.ok(result.result.nodeCount > 0);
});

// ── AY3: symbol resolution ──────────────────────────────────────────────────
test('AY3: symbol resolution query returns declared functions/classes', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'symbols' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.queryKind, 'symbols');
  const names = result.result.symbols.map((s) => s.name);
  assert.ok(names.includes('greet'));
  assert.ok(names.includes('Greeter'));
  assert.ok(names.includes('add'));
  assert.ok(names.includes('internal'));
});

// ── AY4: import / export extraction ─────────────────────────────────────────
test('AY4: imports and exports extracted into graph', () => {
  const p = makePort();
  const imports = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'imports' }
  });
  assert.equal(imports.ok, true);
  assert.ok(imports.result.count >= 2);
  const modNames = imports.result.imports.map((i) => i.name);
  assert.ok(modNames.includes('./helper.js'));
  assert.ok(modNames.includes('node:util'));

  const exports = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'exports' }
  });
  assert.equal(exports.ok, true);
  assert.ok(exports.result.count >= 3);
  const exNames = exports.result.exports.map((e) => e.name);
  assert.ok(exNames.includes('greet'));
  assert.ok(exNames.includes('default'));
});

// ── AY5: dependency edges ───────────────────────────────────────────────────
test('AY5: dependency edges present for imported modules', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'dependencies' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.queryKind, 'dependencies');
  assert.ok(result.result.count >= 2);
  for (const e of result.result.dependencies) {
    assert.equal(e.kind, EDGE_KINDS.DEPENDENCY);
  }
});

// ── AY6: call hierarchy stub ────────────────────────────────────────────────
test('AY6: call hierarchy stub / calls query', () => {
  const p = makePort();
  const calls = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'calls' }
  });
  assert.equal(calls.ok, true);
  assert.ok(calls.result.count >= 1);
  const callNames = calls.result.calls.map((c) => c.name);
  assert.ok(callNames.includes('greet') || callNames.includes('helper'));

  const hierarchy = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'call_hierarchy', name: 'greet' }
  });
  assert.equal(hierarchy.ok, true);
  assert.equal(hierarchy.queryKind, 'call_hierarchy');
  assert.equal(hierarchy.result.symbol, 'greet');
});

// ── AY7: resolve symbol ─────────────────────────────────────────────────────
test('AY7: resolve symbol by name', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'resolve', name: 'Greeter' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.result.resolved, true);
  assert.equal(result.result.symbols[0].kind, NODE_KINDS.SYMBOL);
  assert.equal(result.result.symbols[0].name, 'Greeter');
});

// ── AY8: disallowed path → PATH_NOT_ALLOWLISTED + receipt ───────────────────
test('AY8: disallowed path → PATH_NOT_ALLOWLISTED + sealed receipt', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: '/etc/passwd',
    query: { kind: 'symbols' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.code, AY_CODES.PATH_NOT_ALLOWLISTED);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.deny, true);
  assert.equal(result.receipt.code, AY_CODES.PATH_NOT_ALLOWLISTED);
});

// ── AY9: syntax error → SYNTAX_ERROR + receipt ──────────────────────────────
test('AY9: unbalanced source → SYNTAX_ERROR + sealed receipt', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: 'function broken( { return 1; ',
    artifactPath: ALLOWED,
    query: { kind: 'symbols' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AY_CODES.SYNTAX_ERROR);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AY_CODES.SYNTAX_ERROR);
  assert.deepEqual(result.phases, [AY_PHASES.PARSE]);
});

// ── AY10: unsafe query → UNSAFE_QUERY ───────────────────────────────────────
test('AY10: unsafe query pattern → UNSAFE_QUERY + sealed receipt', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'symbols', filter: 'eval(process.env)' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AY_CODES.UNSAFE_QUERY);
  assert.equal(result.receipt.sealed, true);
});

// ── AY11: empty query → QUERY_EMPTY ─────────────────────────────────────────
test('AY11: empty query → QUERY_EMPTY + sealed receipt', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: '   '
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AY_CODES.QUERY_EMPTY);
  assert.equal(result.receipt.sealed, true);
});

// ── AY12: invalid request (no source) → INVALID_REQUEST ─────────────────────
test('AY12: missing sourceText → INVALID_REQUEST + sealed receipt', () => {
  const p = makePort();
  const result = p.reason({
    artifactPath: ALLOWED,
    query: { kind: 'symbols' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AY_CODES.INVALID_REQUEST);
  assert.equal(result.receipt.sealed, true);
});

// ── AY13: Fundacion write attempt DENY ──────────────────────────────────────
test('AY13: Fundacion write attempt → FUNDACION_DENY + receipt', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'symbols' },
    fundacion: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AY_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.receipt.sealed, true);

  const w = p.writeFundacion({ path: 'Fundacion/x' });
  assert.equal(w.code, AY_CODES.FUNDACION_DENY);
  assert.equal(w.fundacionDelta, 0);
});

// ── AY14: NON-CLAIM + PRODUCTION_READY NO on receipt ────────────────────────
test('AY14: receipt NON-CLAIM flags and PRODUCTION_READY NO', () => {
  const p = makePort();
  const result = p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'summary' }
  });
  assert.equal(result.receipt.PRODUCTION_READY, 'NO');
  assert.equal(result.receipt.fullIde, false);
  assert.equal(result.receipt.languageServerMarketplace, false);
  assert.equal(result.receipt.cloudAgentCodeIntelligence, false);
  assert.equal(result.receipt.cloudAgent, false);
  assert.equal(result.receipt.fundacionDelta, 0);
  assert.equal(result.receipt.fundacion, 'ALWAYS_DENY');
});

// ── AY15: hermetic only — no network imports in modules ─────────────────────
test('AY15: hermetic modules use only node builtins (no acorn/babel/http)', () => {
  const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 4);
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.doesNotMatch(src, /\bfrom\s+['"]acorn['"]/);
    assert.doesNotMatch(src, /\bfrom\s+['"]@babel\//);
    assert.doesNotMatch(src, /\bfrom\s+['"]babel-/);
    assert.doesNotMatch(src, /\brequire\s*\(\s*['"]https?['"]/);
    assert.doesNotMatch(src, /\bfetch\s*\(/);
  }
});

// ── AY16: Law VI CLEAN — no forbidden provider prefix contiguous literals ───
test('AY16: Law VI CLEAN — no forbidden provider secret prefix contiguous literals', () => {
  // Build forbidden prefix at runtime so this test file stays CLEAN too
  const forbidden = ['s', 'k', '-'].join('');
  const scanRoots = [MODULE_DIR];
  const re = new RegExp(forbidden.replace(/-/g, '\\-') + '[A-Za-z0-9]');
  for (const dir of scanRoots) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(js|mjs|md|json|yaml|yml|ps1)$/.test(f)) continue;
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      assert.equal(
        re.test(src),
        false,
        `Law VI violation in ${f}: forbidden provider prefix contiguous literal`
      );
    }
  }
});

// ── AY17: sanitizeAyPayload redacts secret-looking keys ─────────────────────
test('AY17: sanitizeAyPayload redacts secret-looking keys; preserves digests', () => {
  const digest = sha256Canonical({ a: 1 });
  const cleaned = sanitizeAyPayload({
    apiKey: FAKE_TOKEN,
    authorization: 'Bearer abcdefghijklmnop',
    receiptDigest: digest,
    nested: { password: 'x', ok: true }
  });
  assert.equal(cleaned.apiKey, '[REDACTED]');
  assert.equal(cleaned.authorization, '[REDACTED]');
  assert.equal(cleaned.receiptDigest, digest);
  assert.equal(cleaned.nested.password, '[REDACTED]');
  assert.equal(cleaned.nested.ok, true);
});

// ── AY18: getState counters + one-shot reason + throwOnDeny ─────────────────
test('AY18: getState counters, one-shot reason(), throwOnDeny, AY_CODES freeze', () => {
  const p = makePort();
  p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: ALLOWED,
    query: { kind: 'symbols' }
  });
  p.reason({
    sourceText: SAMPLE_SRC,
    artifactPath: '/nope/secret.js',
    query: { kind: 'symbols' }
  });
  const st = p.getState();
  assert.equal(st.reasonCount, 2);
  assert.equal(st.completedCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.fullIde, false);

  const one = reason(
    {
      sourceText: 'export function x() { return 1; }',
      artifactPath: ALLOWED,
      query: { kind: 'symbols' }
    },
    { now: () => '2026-09-12T20:42:00.000Z' }
  );
  assert.equal(one.code, AY_CODES.COMPLETED);

  const strict = makePort({ throwOnDeny: true });
  assert.throws(
    () =>
      strict.reason({
        sourceText: SAMPLE_SRC,
        artifactPath: '/disallowed.js',
        query: { kind: 'symbols' }
      }),
    (err) => err instanceof AstSemanticPortError
  );

  assert.equal(Object.isFrozen(AY_CODES), true);
  assert.equal(AY_CODES.COMPLETED, 'COMPLETED');
  assert.equal(AY_CODES.PATH_NOT_ALLOWLISTED, 'PATH_NOT_ALLOWLISTED');

  // helpers smoke
  const parsed = parseSource(SAMPLE_SRC, 'hello.js');
  assert.equal(parsed.ok, true);
  const built = buildGraphFromFacts(parsed.facts);
  assert.equal(built.ok, true);
  const q = runQuery(built.graph, { kind: 'summary' });
  assert.equal(q.ok, true);
  const allow = checkPathAllowlisted(ALLOWED);
  assert.equal(allow.ok, true);
  const rcpt = buildReasoningReceipt({
    ok: true,
    code: 'COMPLETED',
    phases: ['PARSE', 'BUILD_GRAPH', 'QUERY']
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(typeof stableStringify({ z: 1, a: 2 }), 'string');
});
