/**
 * READ-ONLY additional collectors. Imports only pure modules (no MissionRuntime).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { SDD_STATES, AUTHORITY_RANKS, CANONICAL_TRANSITIONS } from '/workspace/src/core/sdd/sdd-fsm-engine.js';
import { AUTONOMY_MODES, DECISION_CLASSES, HUMAN_ONLY_ACTIONS, APPROVAL_REQUIRED_ACTIONS } from '/workspace/src/core/sdd/hitl-gatekeeper.js';
import { INTEGRATION_STATES, FORBIDDEN_SSRF_HOSTS } from '/workspace/src/core/governance/integration-gatekeeper.js';

const ROOT = '/workspace';
const OUT = path.join(ROOT, 'docs/reports/eos/master/raw');
const ts = new Date().toISOString();

function run(cmd) {
  const started = new Date().toISOString();
  const t0 = Date.now();
  try {
    const stdout = execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    return { command: cmd, started_utc: started, duration_ms: Date.now() - t0, exit_code: 0, stdout, classification: 'MEASURED' };
  } catch (e) {
    return {
      command: cmd,
      started_utc: started,
      duration_ms: Date.now() - t0,
      exit_code: e.status ?? 1,
      stdout: (e.stdout || '') + (e.stderr || ''),
      classification: 'MEASURED',
    };
  }
}

function walk(dir, acc = [], skip = new Set(['.git', 'node_modules'])) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc, skip);
    else if (e.isFile()) acc.push(p);
  }
  return acc;
}

function locOf(abs) {
  const txt = fs.readFileSync(abs, 'utf8');
  const lines = txt.split(/\r?\n/);
  const blank = lines.filter((l) => l.trim() === '').length;
  const comment = lines.filter((l) => /^\s*(\/\/|\*|\/\*)/.test(l)).length;
  const fn = [...txt.matchAll(/\b(function|async function)\b|\bclass\s+\w+|=>\s*\{/g)].length;
  return { lines: lines.length, blank, comment, code: lines.length - blank, fn_like: fn, bytes: Buffer.byteLength(txt), sha256: crypto.createHash('sha256').update(txt).digest('hex') };
}

const srcFiles = walk(path.join(ROOT, 'src')).filter((p) => p.endsWith('.js'));
const scriptFiles = walk(path.join(ROOT, 'scripts')).filter((p) => p.endsWith('.js'));
const testFiles = walk(path.join(ROOT, 'tests')).filter((p) => p.endsWith('.js'));

const srcLoc = srcFiles.map((p) => ({ path: path.relative(ROOT, p), ...locOf(p) }));
const scriptLoc = scriptFiles.map((p) => ({ path: path.relative(ROOT, p), ...locOf(p) }));
const testLoc = testFiles.map((p) => ({ path: path.relative(ROOT, p), ...locOf(p) }));

const sum = (arr, k) => arr.reduce((s, r) => s + r[k], 0);

const loc = {
  collected_at: ts,
  method: 'line split; comment heuristic // or leading *; fn_like is regex not cyclomatic',
  src: { files: srcLoc.length, lines: sum(srcLoc, 'lines'), code: sum(srcLoc, 'code'), fn_like: sum(srcLoc, 'fn_like'), bytes: sum(srcLoc, 'bytes') },
  scripts: { files: scriptLoc.length, lines: sum(scriptLoc, 'lines'), code: sum(scriptLoc, 'code'), fn_like: sum(scriptLoc, 'fn_like'), bytes: sum(scriptLoc, 'bytes') },
  tests: { files: testLoc.length, lines: sum(testLoc, 'lines'), code: sum(testLoc, 'code'), fn_like: sum(testLoc, 'fn_like'), bytes: sum(testLoc, 'bytes') },
  src_files: srcLoc,
};

fs.writeFileSync(path.join(OUT, 'loc_inventory.json'), JSON.stringify(loc, null, 2));

// Duplicate basenames between src/core and scripts/engine
const srcNames = new Map(srcFiles.map((p) => [path.basename(p), path.relative(ROOT, p)]));
const dups = [];
for (const p of scriptFiles) {
  const b = path.basename(p);
  if (srcNames.has(b)) dups.push({ basename: b, src: srcNames.get(b), scripts: path.relative(ROOT, p) });
}
fs.writeFileSync(path.join(OUT, 'duplicate_module_basenames.json'), JSON.stringify({ collected_at: ts, count: dups.length, dups }, null, 2));

// Verify check count
const vjson = JSON.parse(fs.readFileSync(path.join(OUT, 'cmd_verify_strict.stdout.json'), 'utf8'));
const verifySummary = {
  collected_at: ts,
  status: vjson.status,
  timestamp_in_output: vjson.timestamp,
  check_count: vjson.checks.length,
  by_type: {},
  by_status: {},
};
for (const c of vjson.checks) {
  verifySummary.by_type[c.type] = (verifySummary.by_type[c.type] || 0) + 1;
  verifySummary.by_status[c.status] = (verifySummary.by_status[c.status] || 0) + 1;
}
fs.writeFileSync(path.join(OUT, 'verify_strict_summary.json'), JSON.stringify(verifySummary, null, 2));

// Evidence files
const evFiles = walk(path.join(ROOT, 'docs/evidence')).filter((p) => p.endsWith('.json'));
const evMeta = evFiles.map((p) => {
  const rel = path.relative(ROOT, p);
  let verdict = null;
  let keys = [];
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    keys = Object.keys(j);
    verdict = j.verdict || j.status || j.dictamen || null;
  } catch {
    verdict = 'JSON_PARSE_FAIL';
  }
  return { path: rel, bytes: fs.statSync(p).size, verdict, key_count: keys.length };
});
fs.writeFileSync(path.join(OUT, 'evidence_files.json'), JSON.stringify({ collected_at: ts, count: evMeta.length, files: evMeta }, null, 2));

// Docs counts
const docs = walk(path.join(ROOT, 'docs'));
const docsByExt = {};
for (const p of docs) {
  const ext = path.extname(p) || '(none)';
  docsByExt[ext] = (docsByExt[ext] || 0) + 1;
}

// Kernel exports
const kernel = {
  collected_at: ts,
  method: 'ESM import of pure modules (no MissionRuntime / MCP server constructors)',
  classification: 'OBSERVED',
  SDD_STATES,
  AUTHORITY_RANKS,
  CANONICAL_TRANSITIONS_COUNT: CANONICAL_TRANSITIONS.length,
  CANONICAL_TRANSITIONS: CANONICAL_TRANSITIONS.map((t) => ({
    from: t.from,
    event: t.event,
    to: t.to,
    minAuthority: t.minAuthority,
    requiresHitlReceipt: !!t.requiresHitlReceipt,
    requiredGate: t.requiredGate || null,
    requiredArtifacts: t.requiredArtifacts || [],
  })),
  AUTONOMY_MODES,
  DECISION_CLASSES,
  HUMAN_ONLY_ACTIONS: [...HUMAN_ONLY_ACTIONS],
  APPROVAL_REQUIRED_ACTIONS: [...APPROVAL_REQUIRED_ACTIONS],
  INTEGRATION_STATES,
  FORBIDDEN_SSRF_HOSTS,
};

fs.writeFileSync(path.join(OUT, 'kernel_exports.json'), JSON.stringify(kernel, null, 2));

// Git
const gitCmds = [
  'git rev-parse HEAD',
  'git rev-parse --abbrev-ref HEAD',
  'git status --porcelain',
  'git status -sb',
  'git rev-list --count HEAD',
  'git log -1 --format=%H%n%an%n%ae%n%ad%n%s',
  'git log --reverse --format=%H%x09%ad%x09%s --date=iso-strict | head -1',
  'git shortlog -sn HEAD',
  'git tag -l',
  'git ls-files | wc -l',
  'git log --format=%ad --date=short | sort | uniq -c',
];
const gitResults = gitCmds.map(run);
fs.writeFileSync(path.join(OUT, 'git_commands.json'), JSON.stringify({ collected_at: ts, results: gitResults }, null, 2));

// MCP tools from source (static parse, no construct)
const mcpSrc = fs.readFileSync(path.join(ROOT, 'src/mcp-server.js'), 'utf8');
const toolRe = /\{\s*name:\s*'([^']+)'[^}]*requiredAuthority:\s*'([^']+)'/g;
const tools = [];
let m;
while ((m = toolRe.exec(mcpSrc))) tools.push({ name: m[1], requiredAuthority: m[2] });
// better parse: extract CANONICAL_TOOLS block
const block = mcpSrc.match(/const CANONICAL_TOOLS = \[([\s\S]*?)\];/);
const toolsFull = [];
if (block) {
  const itemRe = /\{\s*name:\s*'([^']+)',\s*description:\s*'([^']+)',\s*category:\s*'([^']+)',\s*sideEffects:\s*'([^']+)',\s*requiredAuthority:\s*'([^']+)'\s*\}/g;
  let t;
  while ((t = itemRe.exec(block[1]))) {
    toolsFull.push({ name: t[1], description: t[2], category: t[3], sideEffects: t[4], requiredAuthority: t[5] });
  }
}
fs.writeFileSync(path.join(OUT, 'mcp_canonical_tools.json'), JSON.stringify({ collected_at: ts, count: toolsFull.length, tools: toolsFull }, null, 2));

// MissionRuntime methods (static)
const rt = fs.readFileSync(path.join(ROOT, 'src/core/runtime/mission-runtime.js'), 'utf8');
const methods = [...rt.matchAll(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm)].map((x) => x[1]);
fs.writeFileSync(path.join(OUT, 'mission_runtime_methods.json'), JSON.stringify({ collected_at: ts, methods: [...new Set(methods)] }, null, 2));

// Secrets heuristic (does not print secret values)
const secretHits = [];
const secretRe = [
  { name: 'aws_akia', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'pem_begin', re: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/g },
  { name: 'generic_api_key_assign', re: /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]/gi },
];
for (const p of walk(ROOT).filter((p) => /\.(js|ts|json|md|env|toml|yml|yaml)$/i.test(p))) {
  if (p.includes('/docs/reports/')) continue;
  let txt;
  try {
    txt = fs.readFileSync(p, 'utf8');
  } catch {
    continue;
  }
  for (const s of secretRe) {
    const n = (txt.match(s.re) || []).length;
    if (n) secretHits.push({ path: path.relative(ROOT, p), pattern: s.name, count: n });
  }
}
fs.writeFileSync(path.join(OUT, 'secrets_heuristic.json'), JSON.stringify({ collected_at: ts, method: 'regex heuristic; values not stored', hits: secretHits }, null, 2));

// Test claim strings
const claims = {
  collected_at: ts,
  method: 'literal string search in first-party text',
  strings: {},
};
for (const s of ['726/726', '615/615', '663 / 663', '663/663', '608 / 608', '608/608', '472/472', '471 / 471', '471/471', '308/308', '287/287', '20/20', 'PRODUCTION_READY']) {
  claims.strings[s] = { files: [] };
}
for (const p of walk(ROOT).filter((p) => /\.(md|json|js)$/i.test(p) && !p.includes('/docs/reports/'))) {
  const txt = fs.readFileSync(p, 'utf8');
  for (const s of Object.keys(claims.strings)) {
    if (txt.includes(s)) claims.strings[s].files.push(path.relative(ROOT, p));
  }
}
fs.writeFileSync(path.join(OUT, 'claim_string_hits.json'), JSON.stringify(claims, null, 2));

// Path existence of claimed modules
const claimed = [
  'src/core/synthesisEngine.js',
  'src/core/executionOrchestrator.js',
  'scripts/engine/core',
  'src/core/runtime/mission-runtime.js',
  'scripts/engine/sdd-fsm-engine.js',
  'src/core/sdd/sdd-fsm-engine.js',
  'package-lock.json',
  'node_modules',
  '.missions',
  'Fundacion',
  'C:\\Users\\valen\\Documents\\Fundacion',
];
const existence = claimed.map((p) => {
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  return { path: p, exists: fs.existsSync(abs), classification: 'OBSERVED' };
});
fs.writeFileSync(path.join(OUT, 'claimed_path_existence.json'), JSON.stringify({ collected_at: ts, existence }, null, 2));

console.log(JSON.stringify({
  ok: true,
  src_lines: loc.src.lines,
  script_lines: loc.scripts.lines,
  test_lines: loc.tests.lines,
  dups: dups.length,
  verify_checks: verifySummary.check_count,
  evidence_json: evMeta.length,
  mcp_tools: toolsFull.length,
  secret_hit_files: secretHits.length,
}, null, 2));
