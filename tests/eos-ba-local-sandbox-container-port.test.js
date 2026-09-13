/**
 * @file eos-ba-local-sandbox-container-port.test.js
 * @description SPEC-0058 / Mission BA — Local Sandboxed Container / Worker
 * Isolation Port. Hermetic TDD (~18):
 * happy-path isolated allowlisted step + sealed receipt; path escape;
 * network / Fundacion DENY; hermetic fakes (zero Docker / cloud API);
 * Law VI MODULE_DIR ONLY; env scrubbing; timeout DENY; PRODUCTION_READY NO;
 * NON-CLAIM; getState counters.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: port ≠ K8s multi-tenant cloud / ≠ managed container SaaS /
 * ≠ CloudAgent remote fleet; not BB; Fundacion Δ=0; BA_PRODUCTION_READY=NO;
 * Antigravity-first; L17 CLOSED; L18 OPEN; AX+AY+AZ MEASURED.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/developer-engine
 * (the BA modules). Do NOT scan the whole tests/ directory (forensic
 * fixtures may contain patterns). Prefer fake tokens like
 * env-fake-token-001 — never contiguous forbidden provider prefix in MODULE_DIR.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BA_PRODUCTION_READY,
  BA_KIND,
  BA_CODES,
  BA_PHASES,
  BA_PHASE_ORDER,
  BA_RECEIPT_KIND,
  BA_RECEIPT_PRODUCTION_READY,
  BA_POLICY_GATE_KIND,
  BA_BOUNDARY_KIND,
  DEFAULT_ROOT_PRISON,
  DEFAULT_ALLOWLISTED_PATHS,
  LocalSandboxIsolationError,
  createLocalSandboxContainerPort,
  runIsolated,
  sanitizeBaPayload,
  sha256Canonical,
  stableStringify,
  buildIsolationReceipt,
  checkPathAllowlisted,
  detectEscape,
  scrubEnv,
  isEnvScrubbed
} from '../src/core/developer-engine/local-sandbox-container-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/developer-engine');

const ALLOWED = 'workspace/allowlisted-step.js';

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

function makePort(opts = {}) {
  return createLocalSandboxContainerPort({
    now: opts.now || (() => '2026-09-12T22:34:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    allowlistedPaths: opts.allowlistedPaths || [...DEFAULT_ALLOWLISTED_PATHS],
    rootPrison: opts.rootPrison || DEFAULT_ROOT_PRISON,
    ports: opts.ports || {},
    ...opts
  });
}

// ── BA1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BA1: kind eos-local-sandboxed-container-worker-isolation and PRODUCTION_READY NO', () => {
  const p = makePort();
  assert.equal(p.kind, BA_KIND);
  assert.equal(p.kind, 'eos-local-sandboxed-container-worker-isolation');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(BA_PRODUCTION_READY, 'NO');
  const health = p.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BA_KIND);
  assert.equal(health.k8sMultiTenantCloud, false);
  assert.equal(health.managedContainerSaas, false);
  assert.equal(health.cloudAgentRemoteFleet, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesDockerDaemon, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'OPEN');
  assert.equal(health.axisMeasured, 'AX+AY+AZ');
  assert.equal(health.bbPending, true);
  assert.equal(BA_RECEIPT_KIND, 'eos-local-sandbox-isolation-receipt');
  assert.equal(BA_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BA_POLICY_GATE_KIND, 'eos-local-sandbox-policy-gate');
  assert.equal(BA_BOUNDARY_KIND, 'eos-local-sandbox-boundary');
  assert.deepEqual([...BA_PHASE_ORDER], [
    'VALIDATE',
    'GATE',
    'BOUNDARY',
    'ISOLATE',
    'SEAL'
  ]);
});

// ── BA2: happy-path isolated allowlisted step + sealed receipt ──────────────
test('BA2: happy-path isolated allowlisted step + sealed receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      id: 's1',
      kind: 'developer-engine',
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace',
      env: { PATH: '/usr/bin', NODE_ENV: 'test' },
      durationMs: 10
    },
    rootPrison: '/prison',
    timeoutMs: 5000,
    networkPolicy: 'deny-all'
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, BA_CODES.COMPLETED);
  assert.equal(result.isolated, true);
  assert.equal(result.hermetic, true);
  assert.equal(result.dockerDaemon, false);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.ok(result.receipt.receiptId.startsWith('BA-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.k8sMultiTenantCloud, false);
  assert.equal(result.receipt.managedContainerSaas, false);
  assert.equal(result.receipt.cloudAgentRemoteFleet, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.phases.includes(BA_PHASES.VALIDATE));
  assert.ok(result.phases.includes(BA_PHASES.ISOLATE));
  assert.ok(result.phases.includes(BA_PHASES.SEAL));
  assert.equal(result.rootPrison, '/prison');
  assert.equal(result.isolation.filesystem, 'root-prison');
  assert.equal(result.isolation.network, 'deny-all');
});

// ── BA3: path escape outside prison → ESCAPE_DENY ───────────────────────────
test('BA3: path escape outside prison → ESCAPE_DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'read',
      artifactPath: '../../../etc/passwd',
      targetPath: '/etc/passwd'
    },
    rootPrison: '/prison'
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.code, BA_CODES.ESCAPE_DENY);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.deny, true);
  assert.equal(result.isolated, false);
  const d = detectEscape('/etc/passwd', '/prison');
  assert.equal(d.escape, true);
});

// ── BA4: network egress → NETWORK_DENY ──────────────────────────────────────
test('BA4: network egress → NETWORK_DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'fetch',
      url: 'https://example.com/egress',
      artifactPath: ALLOWED
    },
    networkPolicy: 'deny-all'
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BA_CODES.NETWORK_DENY);
  assert.equal(result.deny, true);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BA_CODES.NETWORK_DENY);
});

// ── BA5: Fundacion write → FUNDACION_DENY ───────────────────────────────────
test('BA5: Fundacion write → FUNDACION_DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'write',
      artifactPath: '/Fundacion/secret',
      fundacion: true
    },
    fundacion: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BA_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BA_CODES.FUNDACION_DENY);
});

// ── BA6: policy escape → POLICY_DENY ────────────────────────────────────────
test('BA6: privileged / policy escape → POLICY_DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      privileged: true,
      policyEscape: true
    }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BA_CODES.POLICY_DENY);
  assert.equal(result.deny, true);
  assert.ok(result.receipt.sealed);
});

// ── BA7: timeout DENY ───────────────────────────────────────────────────────
test('BA7: process timeout → TIMEOUT_DENY + sealed receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace',
      durationMs: 10_000
    },
    timeoutMs: 50
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BA_CODES.TIMEOUT_DENY);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, BA_CODES.TIMEOUT_DENY);
});

// ── BA8: env scrubbing verified ─────────────────────────────────────────────
test('BA8: env scrubbing verified on isolated step', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace',
      env: {
        PATH: '/usr/bin',
        NODE_ENV: 'test',
        API_KEY: FAKE_TOKEN,
        SECRET: 'x',
        authorization: 'Bearer abcdefghijklmnop'
      }
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.env.API_KEY, '[REDACTED]');
  assert.equal(result.env.SECRET, '[REDACTED]');
  assert.equal(result.env.authorization, '[REDACTED]');
  assert.equal(result.env.PATH, '/usr/bin');
  assert.equal(result.env.NODE_ENV, 'test');
  assert.equal(result.isolation.envScrubbed, true);
  const scrubbed = scrubEnv({ API_KEY: FAKE_TOKEN, PATH: '/bin' });
  assert.equal(scrubbed.API_KEY, '[REDACTED]');
  assert.equal(isEnvScrubbed(scrubbed), true);
});

// ── BA9: hermetic fakes — zero Docker daemon / cloud API ────────────────────
test('BA9: hermetic only — MODULE_DIR has no dockerode/k8s-client/fetch', () => {
  const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 4);
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.doesNotMatch(src, /\bfrom\s+['"]dockerode['"]/);
    assert.doesNotMatch(src, /\bfrom\s+['"]@kubernetes\//);
    assert.doesNotMatch(src, /\bfrom\s+['"]k8s['"]/);
    assert.doesNotMatch(src, /\bfrom\s+['"]https?['"]/);
    assert.doesNotMatch(src, /\brequire\s*\(\s*['"]child_process['"]/);
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bspawn\s*\(/);
    assert.doesNotMatch(src, /\bexecFile\s*\(/);
  }
  const p = makePort();
  const r = p.runIsolated({
    step: { action: 'exec', artifactPath: ALLOWED, cwd: '/prison/workspace' }
  });
  assert.equal(r.dockerDaemon, false);
  assert.equal(r.hermetic, true);
  assert.equal(r.k8sMultiTenantCloud, false);
  assert.equal(r.managedContainerSaas, false);
  assert.equal(r.cloudAgentRemoteFleet, false);
});

// ── BA10: Law VI CLEAN — MODULE_DIR ONLY (CRITICAL — do NOT scan tests/) ────
test('BA10: Law VI CLEAN scanning MODULE_DIR only (not tests/)', () => {
  // Build forbidden prefix at runtime so this test file can mention patterns
  // in comments without being scanned (we only scan MODULE_DIR).
  const forbidden = ['s', 'k', '-'].join('');
  const re = new RegExp(forbidden.replace(/-/g, '\\-') + '[A-Za-z0-9]');
  assert.equal(
    path.basename(MODULE_DIR),
    'developer-engine',
    'Law VI must target MODULE_DIR = src/core/developer-engine only'
  );
  // CRITICAL: do NOT scan tests/ — forensic fixtures may contain patterns
  const files = fs.readdirSync(MODULE_DIR).filter((f) => /\.(js|mjs)$/.test(f));
  assert.ok(files.length >= 4, 'expected BA modules under MODULE_DIR');
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      re.test(src),
      false,
      `Law VI violation in MODULE_DIR/${f}: forbidden provider prefix contiguous literal`
    );
  }
});

// ── BA11: PRODUCTION_READY NO + NON-CLAIM on receipt ────────────────────────
test('BA11: PRODUCTION_READY NO and NON-CLAIM flags on receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace'
    }
  });
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.receipt.PRODUCTION_READY, 'NO');
  assert.equal(result.receipt.k8sMultiTenantCloud, false);
  assert.equal(result.receipt.managedContainerSaas, false);
  assert.equal(result.receipt.cloudAgentRemoteFleet, false);
  assert.equal(result.receipt.cloudAgent, false);
  assert.equal(result.receipt.usesDockerDaemon, false);
  assert.equal(result.k8sMultiTenantCloud, false);
  assert.equal(result.managedContainerSaas, false);
  assert.equal(result.cloudAgentRemoteFleet, false);
});

// ── BA12: getState counters + injectable L9/L10 compute-worker ──────────────
test('BA12: getState counters + optional computeWorker / l9Worker inject', () => {
  const workerCalls = [];
  const p = makePort({
    ports: {
      computeWorker: {
        run(ctx) {
          workerCalls.push(ctx.rootPrison || 'x');
          return { ok: true };
        }
      },
      axEngine: { kind: 'ax-fake' },
      ayPort: { kind: 'ay-fake' },
      azRepair: { kind: 'az-fake' }
    }
  });
  p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace'
    }
  });
  p.runIsolated({
    step: { action: 'read', targetPath: '/etc/passwd' }
  });
  const st = p.getState();
  assert.equal(st.runCount, 2);
  assert.equal(st.completedCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.k8sMultiTenantCloud, false);
  assert.equal(st.isolationActive, false);
  assert.equal(workerCalls.length, 1);
});

// ── BA13: ARTIFACT_NOT_ALLOWLISTED (inside prison, not listed) ──────────────
test('BA13: inside-prison but not allowlisted → ARTIFACT_NOT_ALLOWLISTED', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: '/prison/not-listed.js',
      cwd: '/prison/workspace'
    },
    rootPrison: '/prison'
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BA_CODES.ARTIFACT_NOT_ALLOWLISTED);
  assert.ok(result.receipt.sealed);
});

// ── BA14: INVALID_REQUEST ───────────────────────────────────────────────────
test('BA14: missing step / empty prison → INVALID_REQUEST', () => {
  const p = makePort();
  const missing = p.runIsolated({});
  assert.equal(missing.ok, false);
  assert.equal(missing.code, BA_CODES.INVALID_REQUEST);
  const empty = p.runIsolated({
    step: { action: 'exec', artifactPath: ALLOWED },
    rootPrison: '   '
  });
  assert.equal(empty.code, BA_CODES.INVALID_REQUEST);
});

// ── BA15: MISSING_DEP ───────────────────────────────────────────────────────
test('BA15: missing dependency → MISSING_DEP + sealed receipt', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace',
      missingDep: true
    }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BA_CODES.MISSING_DEP);
  assert.ok(result.receipt.sealed);
});

// ── BA16: WHILE isolation — no K8s / managed SaaS claim ─────────────────────
test('BA16: WHILE isolation active → no K8s multi-tenant / managed SaaS claim', () => {
  const p = makePort();
  const result = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace'
    }
  });
  assert.equal(result.isolationActive, true);
  assert.equal(result.k8sMultiTenantCloud, false);
  assert.equal(result.managedContainerSaas, false);
  assert.equal(result.cloudAgentRemoteFleet, false);
  const h = p.health();
  assert.equal(h.k8sMultiTenantCloud, false);
  assert.equal(h.managedContainerSaas, false);
  assert.equal(h.cloudAgentRemoteFleet, false);
  assert.equal(h.isolationActive, false);
});

// ── BA17: sanitizeBaPayload + throwOnDeny + BA_CODES freeze ─────────────────
test('BA17: sanitizeBaPayload redacts secrets; throwOnDeny; BA_CODES freeze', () => {
  const digest = sha256Canonical({ a: 1 });
  const cleaned = sanitizeBaPayload({
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

  const strict = makePort({ throwOnDeny: true });
  assert.throws(
    () =>
      strict.runIsolated({
        step: { action: 'read', targetPath: '/etc/passwd' }
      }),
    (err) => err instanceof LocalSandboxIsolationError
  );

  assert.equal(Object.isFrozen(BA_CODES), true);
  assert.equal(BA_CODES.COMPLETED, 'COMPLETED');
  assert.equal(BA_CODES.ESCAPE_DENY, 'ESCAPE_DENY');
  assert.equal(BA_CODES.NETWORK_DENY, 'NETWORK_DENY');
  assert.equal(BA_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(BA_CODES.POLICY_DENY, 'POLICY_DENY');
  assert.equal(BA_CODES.TIMEOUT_DENY, 'TIMEOUT_DENY');
  assert.equal(BA_CODES.ARTIFACT_NOT_ALLOWLISTED, 'ARTIFACT_NOT_ALLOWLISTED');

  const rcpt = buildIsolationReceipt({
    ok: true,
    code: 'COMPLETED',
    artifactPath: ALLOWED,
    rootPrison: '/prison'
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(typeof stableStringify({ z: 1, a: 2 }), 'string');
  const allow = checkPathAllowlisted(ALLOWED);
  assert.equal(allow.ok, true);

  const one = runIsolated(
    {
      step: {
        action: 'exec',
        artifactPath: 'fixtures/sandbox-step.js',
        cwd: '/prison/workspace'
      }
    },
    { now: () => '2026-09-12T22:34:00.000Z' }
  );
  assert.equal(one.code, BA_CODES.COMPLETED);
});

// ── BA18: writeFundacion ALWAYS DENY + curl network + memory:// ─────────────
test('BA18: writeFundacion ALWAYS DENY; curl network DENY; memory:// ok', () => {
  const p = makePort();
  const wf = p.writeFundacion({ path: '/Fundacion/secret' });
  assert.equal(wf.code, BA_CODES.FUNDACION_DENY);
  assert.equal(wf.fundacionDelta, 0);
  assert.ok(wf.receipt.sealed);

  const curl = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: ALLOWED,
      cwd: '/prison/workspace',
      cmd: 'curl https://evil.example'
    }
  });
  assert.equal(curl.code, BA_CODES.NETWORK_DENY);

  const mem = p.runIsolated({
    step: {
      action: 'exec',
      artifactPath: 'memory://fixture/step',
      cwd: '/prison/workspace'
    }
  });
  assert.equal(mem.ok, true);
  assert.equal(mem.code, BA_CODES.COMPLETED);
});
