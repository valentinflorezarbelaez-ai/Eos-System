/**
 * @module ast-semantic-port
 * SPEC-0056 / Mission AY — AST & Semantic Graph Reasoning Port.
 *
 * Hermetic JS-oriented lightweight structural reasoner:
 *   reason({ sourceText, artifactPath, allowlist, query })
 * Phases: PARSE → BUILD_GRAPH → QUERY (fail-closed).
 *
 * Zero npm deps beyond node builtins. Minimal hermetic tokenizer /
 * regex-based extractor for: imports/exports, function/class declarations,
 * call sites, simple dependency edges. NO acorn/babel required.
 *
 * Optional injectable hooks (compose/extend AG + inject into AX) —
 * do NOT rewrite AX/AG modules into this payload.
 *
 * NON-CLAIM:
 *   AST & Semantic Graph Port ≠ full IDE /
 *   ≠ language-server marketplace /
 *   ≠ CloudAgent code intelligence SaaS
 *   not AZ/BA/BB
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *   L17 CLOSED never reopen; L18 OPEN; AX MEASURED
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AY_CEILING
 */

import {
  AY_GRAPH_KIND,
  AY_GRAPH_PRODUCTION_READY,
  NODE_KINDS,
  EDGE_KINDS,
  createGraph,
  addNode,
  addEdge,
  resolveSymbol,
  callHierarchy,
  listImports,
  listExports,
  listDependencies,
  isWellFormedGraph,
  graphSummary,
  findNodes
} from './semantic-graph.js';
import {
  AY_RECEIPT_KIND,
  AY_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildReasoningReceipt
} from './reasoning-receipt.js';
import {
  AY_POLICY_GATE_KIND,
  AY_POLICY_GATE_PRODUCTION_READY,
  AY_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyPathNotAllowlisted,
  denySyntaxError,
  denyMalformedGraph,
  denyUnsafeQuery,
  denyInvalidRequest,
  denyFundacion,
  denyQueryEmpty,
  checkPathAllowlisted,
  checkQuerySafe,
  createAstPolicyGate
} from './ast-policy-gate.js';

/** @type {'NO'} */
export const AY_PRODUCTION_READY = 'NO';

export const AY_KIND = 'eos-ast-semantic-graph-reasoning-port';

export const AY_CODES = Object.freeze({
  OK: 'OK',
  COMPLETED: 'COMPLETED',
  DENY: 'DENY',
  PATH_NOT_ALLOWLISTED: 'PATH_NOT_ALLOWLISTED',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  MALFORMED_GRAPH: 'MALFORMED_GRAPH',
  UNSAFE_QUERY: 'UNSAFE_QUERY',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_DEP: 'MISSING_DEP',
  FUNDACION_DENY: 'FUNDACION_DENY',
  QUERY_EMPTY: 'QUERY_EMPTY'
});

export const AY_PHASES = Object.freeze({
  PARSE: 'PARSE',
  BUILD_GRAPH: 'BUILD_GRAPH',
  QUERY: 'QUERY'
});

export const AY_PHASE_ORDER = Object.freeze([
  AY_PHASES.PARSE,
  AY_PHASES.BUILD_GRAPH,
  AY_PHASES.QUERY
]);

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for AST Semantic Port failures.
 */
export class AstSemanticPortError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AY_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'AstSemanticPortError';
    this.code = code;
    this.details = sanitizeAyPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAyPayload(obj) {
  return sanitizeDeep(obj, new WeakSet());
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {unknown}
 */
function sanitizeDeep(value, seen) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/^[a-f0-9]{64}$/i.test(value)) return value;
    if (LONG_B64_RE.test(value)) return REDACTED;
    return redactSecretSubstrings(value);
  }
  if (typeof value !== 'object') return value;
  if (seen.has(/** @type {object} */ (value))) return '[Circular]';
  seen.add(/** @type {object} */ (value));

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v, seen));
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|receiptDigest|sha256)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * Redact secret-looking substrings. Vendor-style key prefixes built at
 * runtime via concat (never as static contiguous literals — Law VI).
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(`\\b(${vendorPrefix}[A-Za-z0-9]{8,})\\b`, 'g');
  out = out.replace(vendorRe, REDACTED);
  out = out.replace(
    /\b(api[_-]?key|token|authorization|secret|password)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
    (_m, k) => `${k}=${REDACTED}`
  );
  return out;
}

/**
 * @param {string} message
 * @returns {string}
 */
function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

// ── Hermetic JS extractor (no acorn/babel) ───────────────────────────────────

/**
 * Strip // and /* * / comments for extraction (naive hermetic).
 * @param {string} src
 * @returns {string}
 */
function stripComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => `${p1}${' '.repeat(m.length - p1.length)}`);
  return out;
}

/**
 * Soft syntax sanity check — unmatched braces / obvious garbage.
 * @param {string} src
 * @returns {{ ok: boolean, reason?: string }}
 */
function softSyntaxCheck(src) {
  if (typeof src !== 'string') {
    return { ok: false, reason: 'sourceText must be string' };
  }
  // Hard fail on null bytes / extreme control garbage
  if (/\0/.test(src)) {
    return { ok: false, reason: 'null byte in source' };
  }
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  let inStr = null;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === '\\') {
        escaped = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') braces++;
    else if (c === '}') braces--;
    else if (c === '(') parens++;
    else if (c === ')') parens--;
    else if (c === '[') brackets++;
    else if (c === ']') brackets--;
    if (braces < 0 || parens < 0 || brackets < 0) {
      return { ok: false, reason: 'unmatched closing delimiter' };
    }
  }
  if (inStr) return { ok: false, reason: 'unterminated string' };
  if (braces !== 0 || parens !== 0 || brackets !== 0) {
    return { ok: false, reason: 'unbalanced braces/parens/brackets' };
  }
  return { ok: true };
}

/**
 * Parse JS-oriented source into extracted facts (hermetic regex).
 * @param {string} sourceText
 * @param {string} [moduleName]
 * @returns {{ ok: boolean, facts?: object, reason?: string, code?: string }}
 */
export function parseSource(sourceText, moduleName = 'module') {
  const syn = softSyntaxCheck(sourceText);
  if (!syn.ok) {
    return {
      ok: false,
      code: AY_CODES.SYNTAX_ERROR,
      reason: syn.reason || 'syntax error'
    };
  }
  const src = stripComments(sourceText);
  const lines = src.split(/\r?\n/);

  /** @type {object[]} */
  const imports = [];
  /** @type {object[]} */
  const exports = [];
  /** @type {object[]} */
  const functions = [];
  /** @type {object[]} */
  const classes = [];
  /** @type {object[]} */
  const calls = [];
  /** @type {string[]} */
  const dependencies = [];

  const importRe =
    /^\s*import\s+(?:(?:type\s+)?(?:(\w+)|\{([^}]+)\}|\*\s+as\s+(\w+))\s+from\s+)?['"]([^'"]+)['"]/;
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const exportNamedRe =
    /^\s*export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/;
  const exportDefaultRe = /^\s*export\s+default\s+/;
  const exportListRe = /^\s*export\s+\{([^}]+)\}/;
  const fnRe =
    /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/;
  const classRe = /^\s*(?:export\s+)?class\s+(\w+)\b/;
  const arrowRe =
    /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/;
  // Call sites: identifier(  — exclude keywords
  const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  const KEYWORDS = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'function',
    'class',
    'return',
    'typeof',
    'new',
    'await',
    'import',
    'export',
    'const',
    'let',
    'var'
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const im = line.match(importRe);
    if (im) {
      const mod = im[4];
      const names = [];
      if (im[1]) names.push(im[1]);
      if (im[3]) names.push(im[3]);
      if (im[2]) {
        for (const part of im[2].split(',')) {
          const n = part.trim().split(/\s+as\s+/).pop().trim();
          if (n) names.push(n);
        }
      }
      imports.push({ module: mod, names, line: lineNo });
      if (!dependencies.includes(mod)) dependencies.push(mod);
    }

    let rm;
    requireRe.lastIndex = 0;
    while ((rm = requireRe.exec(line)) !== null) {
      const mod = rm[1];
      imports.push({ module: mod, names: [], line: lineNo, commonjs: true });
      if (!dependencies.includes(mod)) dependencies.push(mod);
    }

    const en = line.match(exportNamedRe);
    if (en) {
      exports.push({ name: en[1], line: lineNo, kind: 'named' });
    }
    if (exportDefaultRe.test(line)) {
      exports.push({ name: 'default', line: lineNo, kind: 'default' });
    }
    const el = line.match(exportListRe);
    if (el) {
      for (const part of el[1].split(',')) {
        const n = part.trim().split(/\s+as\s+/).pop().trim();
        if (n) exports.push({ name: n, line: lineNo, kind: 'named' });
      }
    }

    const fn = line.match(fnRe);
    if (fn) {
      functions.push({ name: fn[1], line: lineNo });
    }
    const ar = line.match(arrowRe);
    if (ar) {
      functions.push({ name: ar[1], line: lineNo, arrow: true });
    }
    const cl = line.match(classRe);
    if (cl) {
      classes.push({ name: cl[1], line: lineNo });
    }

    callRe.lastIndex = 0;
    let cm;
    while ((cm = callRe.exec(line)) !== null) {
      const name = cm[1];
      if (KEYWORDS.has(name)) continue;
      calls.push({ name, line: lineNo });
    }
  }

  return {
    ok: true,
    facts: {
      moduleName,
      imports,
      exports,
      functions,
      classes,
      calls,
      dependencies
    }
  };
}

/**
 * Build semantic graph from parse facts.
 * @param {object} facts
 * @returns {{ ok: boolean, graph?: object, reason?: string, code?: string }}
 */
export function buildGraphFromFacts(facts) {
  if (!facts || typeof facts !== 'object') {
    return {
      ok: false,
      code: AY_CODES.MALFORMED_GRAPH,
      reason: 'facts missing'
    };
  }
  try {
    const moduleName = facts.moduleName || 'module';
    const graph = createGraph({ moduleName });
    const modNode = addNode(graph, {
      kind: NODE_KINDS.MODULE,
      name: moduleName,
      id: `module:${moduleName}`
    });

    for (const fn of facts.functions || []) {
      const n = addNode(graph, {
        kind: NODE_KINDS.SYMBOL,
        name: fn.name,
        line: fn.line,
        meta: { symbolKind: fn.arrow ? 'arrow' : 'function' }
      });
      addEdge(graph, {
        kind: EDGE_KINDS.DECLARES,
        from: modNode.id,
        to: n.id
      });
      addEdge(graph, {
        kind: EDGE_KINDS.MEMBER_OF,
        from: n.id,
        to: modNode.id
      });
    }

    for (const cl of facts.classes || []) {
      const n = addNode(graph, {
        kind: NODE_KINDS.SYMBOL,
        name: cl.name,
        line: cl.line,
        meta: { symbolKind: 'class' }
      });
      addEdge(graph, {
        kind: EDGE_KINDS.DECLARES,
        from: modNode.id,
        to: n.id
      });
    }

    for (const im of facts.imports || []) {
      const n = addNode(graph, {
        kind: NODE_KINDS.IMPORT,
        name: im.module,
        line: im.line,
        meta: { names: im.names || [], commonjs: !!im.commonjs }
      });
      addEdge(graph, {
        kind: EDGE_KINDS.IMPORTS,
        from: modNode.id,
        to: n.id
      });
      const depMod = addNode(graph, {
        kind: NODE_KINDS.MODULE,
        name: im.module,
        id: `module:${im.module}`
      });
      addEdge(graph, {
        kind: EDGE_KINDS.DEPENDENCY,
        from: modNode.id,
        to: depMod.id
      });
    }

    for (const ex of facts.exports || []) {
      const n = addNode(graph, {
        kind: NODE_KINDS.EXPORT,
        name: ex.name,
        line: ex.line,
        meta: { exportKind: ex.kind }
      });
      addEdge(graph, {
        kind: EDGE_KINDS.EXPORTS,
        from: modNode.id,
        to: n.id
      });
    }

    // Call sites → CALL nodes + CALLS edges from nearest enclosing symbol or module
    const symbolByName = new Map();
    for (const n of graph.nodes) {
      if (n.kind === NODE_KINDS.SYMBOL) symbolByName.set(n.name, n);
    }
    for (const c of facts.calls || []) {
      const callNode = addNode(graph, {
        kind: NODE_KINDS.CALL,
        name: c.name,
        line: c.line
      });
      const caller =
        // Prefer a declared symbol that shares the call name's "context" —
        // hermetic stub: edge from module, and if callee is a known symbol link CALLS
        modNode;
      addEdge(graph, {
        kind: EDGE_KINDS.CALLS,
        from: caller.id,
        to: callNode.id
      });
      const calleeSym = symbolByName.get(c.name);
      if (calleeSym) {
        addEdge(graph, {
          kind: EDGE_KINDS.CALLS,
          from: callNode.id,
          to: calleeSym.id
        });
      }
    }

    if (!isWellFormedGraph(graph)) {
      return {
        ok: false,
        code: AY_CODES.MALFORMED_GRAPH,
        reason: 'built graph failed validation'
      };
    }
    return { ok: true, graph };
  } catch (err) {
    return {
      ok: false,
      code: AY_CODES.MALFORMED_GRAPH,
      reason: sanitizeErrorMessage(err?.message || 'malformed graph')
    };
  }
}

/**
 * Run a query against a well-formed graph.
 * @param {object} graph
 * @param {object|string} query
 * @returns {{ ok: boolean, result?: object, reason?: string, code?: string, queryKind?: string }}
 */
export function runQuery(graph, query) {
  if (!isWellFormedGraph(graph)) {
    return {
      ok: false,
      code: AY_CODES.MALFORMED_GRAPH,
      reason: 'graph not well-formed'
    };
  }
  const q =
    typeof query === 'string'
      ? { kind: query.trim() || 'symbols' }
      : query && typeof query === 'object'
        ? query
        : null;
  if (!q) {
    return {
      ok: false,
      code: AY_CODES.QUERY_EMPTY,
      reason: 'query empty'
    };
  }
  const kind = String(q.kind || q.type || q.query || 'symbols').toLowerCase();

  if (kind === 'symbols' || kind === 'symbol') {
    const name = q.name || q.symbol;
    const symbols = name
      ? resolveSymbol(graph, String(name))
      : findNodes(graph, NODE_KINDS.SYMBOL);
    return {
      ok: true,
      queryKind: 'symbols',
      result: { symbols, count: symbols.length }
    };
  }
  if (kind === 'imports' || kind === 'import') {
    const r = listImports(graph);
    return {
      ok: true,
      queryKind: 'imports',
      result: { ...r, count: r.imports.length }
    };
  }
  if (kind === 'exports' || kind === 'export') {
    const r = listExports(graph);
    return {
      ok: true,
      queryKind: 'exports',
      result: { ...r, count: r.exports.length }
    };
  }
  if (kind === 'dependencies' || kind === 'deps' || kind === 'dependency') {
    const deps = listDependencies(graph);
    return {
      ok: true,
      queryKind: 'dependencies',
      result: { dependencies: deps, count: deps.length }
    };
  }
  if (
    kind === 'calls' ||
    kind === 'call' ||
    kind === 'call_hierarchy' ||
    kind === 'call-hierarchy'
  ) {
    const name = q.name || q.symbol;
    if (name) {
      const h = callHierarchy(graph, String(name));
      return {
        ok: true,
        queryKind: 'call_hierarchy',
        result: { ...h, symbol: String(name) }
      };
    }
    const calls = findNodes(graph, NODE_KINDS.CALL);
    return {
      ok: true,
      queryKind: 'calls',
      result: { calls, count: calls.length }
    };
  }
  if (kind === 'summary' || kind === 'graph') {
    return {
      ok: true,
      queryKind: 'summary',
      result: graphSummary(graph)
    };
  }
  if (kind === 'resolve' || kind === 'resolve_symbol') {
    const name = q.name || q.symbol;
    if (!name) {
      return {
        ok: false,
        code: AY_CODES.INVALID_REQUEST,
        reason: 'resolve requires name'
      };
    }
    const symbols = resolveSymbol(graph, String(name));
    return {
      ok: true,
      queryKind: 'resolve',
      result: { symbols, resolved: symbols.length > 0, name: String(name) }
    };
  }

  return {
    ok: false,
    code: AY_CODES.UNSAFE_QUERY,
    reason: `unknown query kind: ${kind}`,
    queryKind: kind
  };
}

/**
 * Create the AST & Semantic Graph Reasoning Port.
 *
 * Optional injectable hooks (do NOT rewrite AX/AG):
 *   ports.axEngine — optional AX-like surface (health/getState only used)
 *   ports.agTools  — optional AG-like tool invoke for compose/extend
 *
 * @param {object} [options]
 * @returns {object}
 */
export function createAstSemanticPort(options = {}) {
  const portsIn =
    options.ports && typeof options.ports === 'object' ? options.ports : {};
  const axEngine = portsIn.axEngine || options.axEngine || null;
  const agTools = portsIn.agTools || options.agTools || null;

  const allowlisted =
    options.allowlistedPaths ||
    options.allowlist ||
    (options.policies && options.policies.allowlistedPaths) ||
    DEFAULT_ALLOWLISTED_PATHS;

  const throwOnDeny = options.throwOnDeny === true;
  const hashFn =
    typeof options.hash === 'function' ? options.hash : sha256Canonical;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const policyGate = createAstPolicyGate({
    allowlistedPaths: [...allowlisted]
  });

  let reasonCount = 0;
  let completedCount = 0;
  let denyCount = 0;
  let lastCode = null;
  let lastOk = null;
  let lastReceiptId = null;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  let lastPhases = [];

  function sealReceipt(body) {
    const receipt = buildReasoningReceipt(body, { hash: hashFn, now: nowFn });
    const safe = /** @type {object} */ (sanitizeAyPayload(receipt));
    receipts.push(safe);
    if (receipts.length > 50) receipts.shift();
    lastReceiptId = safe.receiptId;
    return safe;
  }

  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new AstSemanticPortError(
        result.reason || result.code || 'DENY',
        result.code || AY_CODES.DENY,
        { receipt: result.receipt, phases: result.phases }
      );
    }
    return result;
  }

  /**
   * Main API: structural reasoning over allowlisted source.
   *
   * @param {object} req
   * @param {string} [req.sourceText] — in-memory source (preferred for hermetic)
   * @param {string} [req.artifactPath]
   * @param {string[]} [req.allowlist]
   * @param {object|string} [req.query]
   * @param {boolean} [req.fundacion]
   * @returns {object}
   */
  function reason(req = {}) {
    reasonCount += 1;
    lastPhases = [];

    if (req == null || typeof req !== 'object') {
      denyCount += 1;
      lastCode = AY_CODES.INVALID_REQUEST;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AY_CODES.INVALID_REQUEST,
        status: 'DENY',
        phase: AY_PHASES.QUERY,
        phases: [],
        reason: 'reason() requires an object request',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AY_CODES.INVALID_REQUEST,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: 'reason() requires an object request',
          phases: [],
          receipt
        })
      );
    }

    // Fundacion write attempt — ALWAYS DENY
    if (
      req.fundacion === true ||
      req.writeFundacion === true ||
      /fundacion/i.test(String(req.target || ''))
    ) {
      denyCount += 1;
      lastCode = AY_CODES.FUNDACION_DENY;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AY_CODES.FUNDACION_DENY,
        status: 'DENY',
        phase: AY_PHASES.QUERY,
        phases: [],
        artifactPath: req.artifactPath || null,
        reason: 'Fundacion ALWAYS_DENY',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AY_CODES.FUNDACION_DENY,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: 'Fundacion ALWAYS_DENY',
          fundacionDelta: 0,
          phases: [],
          receipt
        })
      );
    }

    const effectiveAllow = req.allowlist || req.allowlistedPaths || allowlisted;
    const artifactPath = req.artifactPath;
    const sourceText = req.sourceText;
    const hasSource = typeof sourceText === 'string';
    const hasPath =
      artifactPath != null && String(artifactPath).trim().length > 0;

    // Path gate: if path provided, must be allowlisted
    if (hasPath) {
      const art = checkPathAllowlisted(artifactPath, effectiveAllow);
      if (!art.ok) {
        denyCount += 1;
        const code =
          art.code === AY_POLICY_CODES.INVALID_REQUEST
            ? AY_CODES.INVALID_REQUEST
            : AY_CODES.PATH_NOT_ALLOWLISTED;
        lastCode = code;
        lastOk = false;
        const receipt = sealReceipt({
          ok: false,
          code,
          status: 'DENY',
          phase: AY_PHASES.PARSE,
          phases: [],
          artifactPath: art.artifactPath || artifactPath,
          reason: art.reason,
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAyPayload({
            ok: false,
            allow: false,
            deny: true,
            code,
            kind: AY_KIND,
            PRODUCTION_READY: AY_PRODUCTION_READY,
            reason: art.reason,
            artifactPath: art.artifactPath || artifactPath,
            phases: [],
            receipt
          })
        );
      }
    } else if (!hasSource) {
      denyCount += 1;
      lastCode = AY_CODES.INVALID_REQUEST;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AY_CODES.INVALID_REQUEST,
        status: 'DENY',
        phase: AY_PHASES.PARSE,
        phases: [],
        reason: 'sourceText or allowlisted artifactPath required',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AY_CODES.INVALID_REQUEST,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: 'sourceText or allowlisted artifactPath required',
          phases: [],
          receipt
        })
      );
    }

    // In-memory source required for hermetic (no fs read of real repo)
    if (!hasSource) {
      denyCount += 1;
      lastCode = AY_CODES.INVALID_REQUEST;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AY_CODES.INVALID_REQUEST,
        status: 'DENY',
        phase: AY_PHASES.PARSE,
        phases: [],
        artifactPath: hasPath ? String(artifactPath) : null,
        reason: 'hermetic port requires sourceText (in-memory fixture)',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AY_CODES.INVALID_REQUEST,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: 'hermetic port requires sourceText (in-memory fixture)',
          artifactPath: hasPath ? String(artifactPath) : null,
          phases: [],
          receipt
        })
      );
    }

    // Query safety
    const qCheck = checkQuerySafe(req.query);
    if (!qCheck.ok) {
      denyCount += 1;
      lastCode = qCheck.code;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: qCheck.code,
        status: 'DENY',
        phase: AY_PHASES.QUERY,
        phases: [],
        artifactPath: hasPath ? String(artifactPath).replace(/\\/g, '/') : null,
        reason: qCheck.reason,
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: qCheck.code,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: qCheck.reason,
          phases: [],
          receipt
        })
      );
    }

    const resolvedPath = hasPath
      ? String(artifactPath).replace(/\\/g, '/')
      : 'memory://fixture';
    const moduleName = resolvedPath.includes('/')
      ? resolvedPath.slice(resolvedPath.lastIndexOf('/') + 1)
      : resolvedPath;

    // Optional AG compose hook (non-blocking metadata only)
    let agMeta = null;
    if (agTools && typeof agTools === 'object') {
      const inv =
        typeof agTools.invoke === 'function'
          ? agTools.invoke
          : typeof agTools.annotate === 'function'
            ? agTools.annotate
            : null;
      if (inv) {
        try {
          const agResult = inv.call(agTools, {
            tool: 'astSemanticAnnotate',
            artifactPath: resolvedPath
          });
          if (agResult && agResult.ok === false) {
            // Do not fail the port on AG annotate failure — compose only
            agMeta = { agOk: false, code: agResult.code || 'DENY' };
          } else {
            agMeta = { agOk: true };
          }
        } catch {
          agMeta = { agOk: false };
        }
      }
    }

    // ── PARSE ──────────────────────────────────────────────────────────────
    lastPhases.push(AY_PHASES.PARSE);
    const parsed = parseSource(sourceText, moduleName);
    if (!parsed.ok) {
      denyCount += 1;
      lastCode = AY_CODES.SYNTAX_ERROR;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AY_CODES.SYNTAX_ERROR,
        status: 'DENY',
        phase: AY_PHASES.PARSE,
        phases: [...lastPhases],
        artifactPath: resolvedPath,
        reason: parsed.reason || 'syntax error',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AY_CODES.SYNTAX_ERROR,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: parsed.reason || 'syntax error',
          artifactPath: resolvedPath,
          phases: [...lastPhases],
          receipt
        })
      );
    }

    // ── BUILD_GRAPH ────────────────────────────────────────────────────────
    lastPhases.push(AY_PHASES.BUILD_GRAPH);
    const built = buildGraphFromFacts(parsed.facts);
    if (!built.ok || !isWellFormedGraph(built.graph)) {
      denyCount += 1;
      lastCode = AY_CODES.MALFORMED_GRAPH;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AY_CODES.MALFORMED_GRAPH,
        status: 'DENY',
        phase: AY_PHASES.BUILD_GRAPH,
        phases: [...lastPhases],
        artifactPath: resolvedPath,
        reason: built.reason || 'malformed graph',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AY_CODES.MALFORMED_GRAPH,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: built.reason || 'malformed graph',
          artifactPath: resolvedPath,
          phases: [...lastPhases],
          receipt
        })
      );
    }

    // ── QUERY ──────────────────────────────────────────────────────────────
    lastPhases.push(AY_PHASES.QUERY);
    const queried = runQuery(built.graph, req.query ?? { kind: 'summary' });
    if (!queried.ok) {
      denyCount += 1;
      lastCode = queried.code || AY_CODES.DENY;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: lastCode,
        status: 'DENY',
        phase: AY_PHASES.QUERY,
        phases: [...lastPhases],
        artifactPath: resolvedPath,
        queryKind: queried.queryKind || null,
        reason: queried.reason || 'query failed',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAyPayload({
          ok: false,
          allow: false,
          deny: true,
          code: lastCode,
          kind: AY_KIND,
          PRODUCTION_READY: AY_PRODUCTION_READY,
          reason: queried.reason || 'query failed',
          artifactPath: resolvedPath,
          phases: [...lastPhases],
          receipt
        })
      );
    }

    completedCount += 1;
    lastCode = AY_CODES.COMPLETED;
    lastOk = true;
    const summary = graphSummary(built.graph);
    const receipt = sealReceipt({
      ok: true,
      code: AY_CODES.COMPLETED,
      status: 'COMPLETED',
      phase: AY_PHASES.QUERY,
      phases: [...lastPhases],
      artifactPath: resolvedPath,
      queryKind: queried.queryKind,
      reason: null,
      deny: false,
      decision: 'COMPLETED',
      meta: {
        graph: summary,
        hermetic: true,
        agMeta,
        axInjected: !!(axEngine && typeof axEngine === 'object')
      }
    });

    return sanitizeAyPayload({
      ok: true,
      allow: true,
      deny: false,
      code: AY_CODES.COMPLETED,
      kind: AY_KIND,
      PRODUCTION_READY: AY_PRODUCTION_READY,
      artifactPath: resolvedPath,
      phases: [...lastPhases],
      queryKind: queried.queryKind,
      result: queried.result,
      graph: built.graph,
      facts: parsed.facts,
      fundacionDelta: 0,
      fullIde: false,
      languageServerMarketplace: false,
      cloudAgentCodeIntelligence: false,
      cloudAgent: false,
      receipt
    });
  }

  function getState() {
    return sanitizeAyPayload({
      kind: AY_KIND,
      PRODUCTION_READY: AY_PRODUCTION_READY,
      reasonCount,
      completedCount,
      denyCount,
      lastCode,
      lastOk,
      lastReceiptId,
      lastPhases: [...lastPhases],
      receiptCount: receipts.length,
      fundacionDelta: 0,
      fullIde: false,
      languageServerMarketplace: false,
      cloudAgentCodeIntelligence: false,
      cloudAgent: false
    });
  }

  function health() {
    return {
      kind: AY_KIND,
      PRODUCTION_READY: AY_PRODUCTION_READY,
      ok: true,
      fullIde: false,
      languageServerMarketplace: false,
      cloudAgentCodeIntelligence: false,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      antigravityFirst: true,
      ladder17: 'CLOSED',
      ladder18: 'OPEN',
      axisMeasured: 'AX',
      axis: 'AST & Semantic Graph Reasoning Port'
    };
  }

  /**
   * Fundacion write surface — ALWAYS DENY.
   */
  function writeFundacion(_req = {}) {
    denyCount += 1;
    lastCode = AY_CODES.FUNDACION_DENY;
    lastOk = false;
    const receipt = sealReceipt({
      ok: false,
      code: AY_CODES.FUNDACION_DENY,
      status: 'DENY',
      phase: AY_PHASES.QUERY,
      phases: [],
      reason: 'Fundacion ALWAYS_DENY',
      deny: true,
      decision: 'DENY'
    });
    return sanitizeAyPayload({
      ok: false,
      allow: false,
      deny: true,
      code: AY_CODES.FUNDACION_DENY,
      fundacionDelta: 0,
      reason: 'Fundacion ALWAYS_DENY',
      receipt
    });
  }

  return {
    kind: AY_KIND,
    PRODUCTION_READY: AY_PRODUCTION_READY,
    codes: AY_CODES,
    reason,
    getState,
    health,
    writeFundacion,
    sealReceipt,
    policyGate,
    parseSource,
    buildGraphFromFacts,
    runQuery,
    sanitizeAyPayload,
    // NON-CLAIM
    fullIde: false,
    languageServerMarketplace: false,
    cloudAgentCodeIntelligence: false,
    cloudAgent: false
  };
}

/**
 * One-shot convenience.
 * @param {object} req
 * @param {object} [portOpts]
 */
export function reason(req, portOpts = {}) {
  const port = createAstSemanticPort(portOpts);
  return port.reason(req);
}

export {
  AY_GRAPH_KIND,
  AY_GRAPH_PRODUCTION_READY,
  NODE_KINDS,
  EDGE_KINDS,
  createGraph,
  addNode,
  addEdge,
  resolveSymbol,
  callHierarchy,
  listImports,
  listExports,
  listDependencies,
  isWellFormedGraph,
  graphSummary,
  AY_RECEIPT_KIND,
  AY_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildReasoningReceipt,
  AY_POLICY_GATE_KIND,
  AY_POLICY_GATE_PRODUCTION_READY,
  AY_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyPathNotAllowlisted,
  denySyntaxError,
  denyMalformedGraph,
  denyUnsafeQuery,
  denyInvalidRequest,
  denyFundacion,
  denyQueryEmpty,
  checkPathAllowlisted,
  checkQuerySafe,
  createAstPolicyGate
};

export default {
  AY_KIND,
  AY_PRODUCTION_READY,
  AY_CODES,
  AY_PHASES,
  createAstSemanticPort,
  reason,
  sanitizeAyPayload,
  AstSemanticPortError
};
