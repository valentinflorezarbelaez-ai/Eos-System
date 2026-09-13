/**
 * @file eos-az-self-repair-fdir-bridge.test.js
 * @description SPEC-0057 / Mission AZ — Deterministic Self-Repair & FDIR
 * Remediation Bridge. Hermetic TDD (~18):
 * happy-path classify + plan + sealed receipt; syntax/dep remediation;
 * unbounded/Fundacion DENY; hermetic; Law VI MODULE_DIR ONLY; PRODUCTION_READY NO;
 * NON-CLAIM; deterministic plan stability; getState counters.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: bridge ≠ unbounded self-modifying AGI /
 * ≠ unsupervised internet remediator / ≠ CloudAgent self-heal fleet;
 * not BA/BB; Fundacion Δ=0; AZ_PRODUCTION_READY=NO; Antigravity-first;
 * L17 CLOSED; L18 OPEN; AX+AY MEASURED.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/developer-engine
 * (the AZ modules). Do NOT scan the whole tests/ directory (forensic
 * fixtures may contain patterns). Prefer fake tokens like
 * env-fake-token-001 — never contiguous forbidden provider prefix in MODULE_DIR.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AZ_PRODUCTION_READY,
  AZ_KIND,
  AZ_CODES,
  AZ_PHASES,
  AZ_PHASE_ORDER,
  AZ_RECEIPT_KIND,
  AZ_RECEIPT_PRODUCTION_READY,
  AZ_POLICY_GATE_KIND,
  AZ_PLAN_KIND,
  AZ_CLASSIFIER_KIND,
  FAULT_CLASSES,
  SelfRepairFdirBridgeError,
  createSelfRepairFdirBridge,
  proposeRepair,
  sanitizeAzPayload,
  sha256Canonical,
  stableStringify,
  buildRepairReceipt,
  buildRepairPlan,
  classifyFault,
  checkPathAllowlisted,
  DEFAULT_ALLOWLISTED_PATHS,
  planHash
} from '../src/core/developer-engine/self-repair-fdir-bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/developer-engine');

const ALLOWED = 'fixtures/broken-syntax.js';

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

function makeBridge(opts = {}) {
  return createSelfRepairFdirBridge({
    now: opts.now || (() => '2026-09-12T22:34:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    allowlistedPaths: opts.allowlistedPaths || [...DEFAULT_ALLOWLISTED_PATHS],
    ports: opts.ports || {},
    ...opts
  });
}

// ── AZ1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('AZ1: kind eos-deterministic-self-repair-fdir-bridge and PRODUCTION_READY NO', () => {
  const b = makeBridge();
  assert.equal(b.kind, AZ_KIND);
  assert.equal(b.kind, 'eos-deterministic-self-repair-fdir-bridge');
  assert.equal(b.PRODUCTION_READY, 'NO');
  assert.equal(AZ_PRODUCTION_READY, 'NO');
  const health = b.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, AZ_KIND);
  assert.equal(health.unboundedSelfModifyingAgi, false);
  assert.equal(health.unsupervisedInternetRemediator, false);
  assert.equal(health.cloudAgentSelfHealFleet, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'OPEN');
  assert.equal(health.axisMeasured, 'AX+AY');
  assert.equal(AZ_RECEIPT_KIND, 'eos-deterministic-self-repair-receipt');
  assert.equal(AZ_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(AZ_POLICY_GATE_KIND, 'eos-deterministic-self-repair-policy-gate');
  assert.equal(AZ_PLAN_KIND, 'eos-deterministic-repair-plan');
  assert.equal(AZ_CLASSIFIER_KIND, 'eos-deterministic-fault-classifier');
  assert.deepEqual([...AZ_PHASE_ORDER], [
    'CLASSIFY',
    'GATE',
    'PLAN',
    'BRIDGE',
    'SEAL'
  ]);
});

// ── AZ2: happy-path classify + deterministic FDIR plan + sealed receipt ─────
test('AZ2: happy-path classify + deterministic FDIR plan + sealed receipt', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      class: FAULT_CLASSES.SYNTAX_ERROR,
      message: 'Unexpected token',
      artifactPath: ALLOWED
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, AZ_CODES.COMPLETED);
  assert.equal(result.faultClass, FAULT_CLASSES.SYNTAX_ERROR);
  assert.ok(result.plan);
  assert.equal(result.plan.deterministic, true);
  assert.equal(result.plan.bounded, true);
  assert.equal(typeof result.plan.planHash, 'string');
  assert.equal(result.plan.planHash.length, 64);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.ok(result.receipt.receiptId.startsWith('AZ-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.unboundedSelfModifyingAgi, false);
  assert.equal(result.receipt.unsupervisedInternetRemediator, false);
  assert.equal(result.receipt.cloudAgentSelfHealFleet, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.phases.includes(AZ_PHASES.CLASSIFY));
  assert.ok(result.phases.includes(AZ_PHASES.PLAN));
  assert.ok(result.phases.includes(AZ_PHASES.SEAL));
});

// ── AZ3: syntax / import error remediation over allowlisted artifacts ───────
test('AZ3: syntax error remediation over allowlisted artifact', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      message: 'SyntaxError: Unexpected token }',
      code: 'SYNTAX_ERROR',
      artifactPath: ALLOWED
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.faultClass, FAULT_CLASSES.SYNTAX_ERROR);
  assert.equal(result.classification.remediable, true);
  assert.ok(result.plan.steps.some((s) => s.action === 'FIX_SYNTAX'));
  assert.equal(result.plan.steps.every((s) => s.bound === true), true);
});

// ── AZ4: missing dependency remediation ─────────────────────────────────────
test('AZ4: missing dependency classified remediable with RESOLVE_DEPENDENCY plan', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      message: 'Cannot find module ./helper.js',
      code: 'ERR_MODULE_NOT_FOUND',
      artifactPath: 'fixtures/missing-dep.js'
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.faultClass, FAULT_CLASSES.MISSING_DEPENDENCY);
  assert.ok(
    result.plan.steps.some((s) => s.action === 'RESOLVE_DEPENDENCY')
  );
});

// ── AZ5: unbounded self-mod → DENY + receipt ────────────────────────────────
test('AZ5: unbounded self-mod → UNBOUNDED_SELF_MOD_FORBIDDEN + sealed receipt', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      class: FAULT_CLASSES.UNBOUNDED_SELF_MOD,
      message: 'attempt unbounded rewrite of entire codebase'
    }
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.code, AZ_CODES.UNBOUNDED_SELF_MOD_FORBIDDEN);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.deny, true);
  assert.equal(result.unboundedSelfModifyingAgi, false);
  assert.equal(result.plan.denied, true);
});

// ── AZ6: Fundacion write → DENY + receipt ───────────────────────────────────
test('AZ6: Fundacion write → FUNDACION_DENY + sealed receipt', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      class: FAULT_CLASSES.FUNDACION_WRITE,
      message: 'write to Fundacion vault'
    },
    fundacion: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AZ_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.code, AZ_CODES.FUNDACION_DENY);
});

// ── AZ7: Law VI leak → LAW_VI_DENY ──────────────────────────────────────────
test('AZ7: Law VI leakage fault → LAW_VI_DENY + sealed receipt', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      class: FAULT_CLASSES.LAW_VI_LEAK,
      message: 'provider prefix leakage detected'
    }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AZ_CODES.LAW_VI_DENY);
  assert.equal(result.deny, true);
  assert.ok(result.receipt.sealed);
});

// ── AZ8: budget trip classify + HITL ────────────────────────────────────────
test('AZ8: budget trip classified; plan includes THROTTLE + HITL escalate', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      message: 'token budget trip — maxAttempts exhausted',
      code: 'BUDGET_TRIP'
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.faultClass, FAULT_CLASSES.BUDGET_TRIP);
  assert.equal(result.code, AZ_CODES.HITL_REQUIRED);
  assert.equal(result.hitlRequired, true);
  assert.ok(result.plan.steps.some((s) => s.action === 'THROTTLE_BUDGET'));
  assert.ok(result.plan.steps.some((s) => s.action === 'ESCALATE_HITL'));
});

// ── AZ9: schema deviation classify ──────────────────────────────────────────
test('AZ9: schema deviation classified remediable with ALIGN_SCHEMA plan', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      message: 'schema deviation: shape mismatch on receipt',
      artifactPath: 'fixtures/schema-dev.js'
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.faultClass, FAULT_CLASSES.SCHEMA_DEVIATION);
  assert.ok(result.plan.steps.some((s) => s.action === 'ALIGN_SCHEMA'));
});

// ── AZ10: UNKNOWN / not remediable → NOT_REMEDIABLE ─────────────────────────
test('AZ10: unknown fault → NOT_REMEDIABLE + sealed receipt', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: { message: 'something utterly mysterious happened' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AZ_CODES.NOT_REMEDIABLE);
  assert.equal(result.faultClass, FAULT_CLASSES.UNKNOWN);
  assert.ok(result.receipt.sealed);
});

// ── AZ11: invalid / missing fault → INVALID_FAULT ───────────────────────────
test('AZ11: missing fault → INVALID_FAULT', () => {
  const b = makeBridge();
  const result = b.proposeRepair({});
  assert.equal(result.ok, false);
  assert.equal(result.code, AZ_CODES.INVALID_FAULT);
});

// ── AZ12: deterministic plan stability (same fault → same plan hash) ────────
test('AZ12: deterministic plan stability — same fault → same planHash', () => {
  const b = makeBridge();
  const fault = {
    class: FAULT_CLASSES.SYNTAX_ERROR,
    message: 'Unexpected token',
    artifactPath: ALLOWED
  };
  const a = b.proposeRepair({ fault });
  const c = b.proposeRepair({ fault });
  assert.equal(a.plan.planHash, c.plan.planHash);
  assert.equal(a.plan.planId, c.plan.planId);
  // Direct builder also stable
  const p1 = buildRepairPlan({
    faultClass: FAULT_CLASSES.SYNTAX_ERROR,
    artifactPath: ALLOWED,
    allowlist: [...DEFAULT_ALLOWLISTED_PATHS]
  });
  const p2 = buildRepairPlan({
    faultClass: FAULT_CLASSES.SYNTAX_ERROR,
    artifactPath: ALLOWED,
    allowlist: [...DEFAULT_ALLOWLISTED_PATHS]
  });
  assert.equal(p1.planHash, p2.planHash);
  assert.equal(p1.planHash, a.plan.planHash);
});

// ── AZ13: hermetic only — no network / no external parser deps in MODULE_DIR
test('AZ13: hermetic only — MODULE_DIR has no acorn/babel/fetch/http', () => {
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

// ── AZ14: Law VI CLEAN — MODULE_DIR ONLY (CRITICAL — do NOT scan tests/) ────
test('AZ14: Law VI CLEAN scanning MODULE_DIR only (not tests/)', () => {
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
  assert.ok(files.length >= 4, 'expected AZ modules under MODULE_DIR');
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      re.test(src),
      false,
      `Law VI violation in MODULE_DIR/${f}: forbidden provider prefix contiguous literal`
    );
  }
});

// ── AZ15: PRODUCTION_READY NO + NON-CLAIM on receipt ────────────────────────
test('AZ15: PRODUCTION_READY NO and NON-CLAIM flags on receipt', () => {
  const b = makeBridge();
  const result = b.proposeRepair({
    fault: {
      class: FAULT_CLASSES.SYNTAX_ERROR,
      artifactPath: ALLOWED,
      message: 'parse error'
    }
  });
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.receipt.PRODUCTION_READY, 'NO');
  assert.equal(result.receipt.unboundedSelfModifyingAgi, false);
  assert.equal(result.receipt.unsupervisedInternetRemediator, false);
  assert.equal(result.receipt.cloudAgentSelfHealFleet, false);
  assert.equal(result.receipt.cloudAgent, false);
  assert.equal(result.unboundedSelfModifyingAgi, false);
  assert.equal(result.unsupervisedInternetRemediator, false);
  assert.equal(result.cloudAgentSelfHealFleet, false);
});

// ── AZ16: getState counters + injectable fdirPort fake ──────────────────────
test('AZ16: getState counters + optional fdirRemediator / axFault inject', () => {
  const fdirCalls = [];
  const b = makeBridge({
    ports: {
      fdirRemediator: {
        propose(ctx) {
          fdirCalls.push(ctx.plan?.planId || 'x');
          return { ok: true };
        }
      },
      axFault: {
        reportFault() {
          return { ok: true };
        }
      }
    }
  });
  b.proposeRepair({
    fault: {
      class: FAULT_CLASSES.SYNTAX_ERROR,
      artifactPath: ALLOWED,
      message: 'x'
    }
  });
  b.proposeRepair({
    fault: { class: FAULT_CLASSES.UNBOUNDED_SELF_MOD, message: 'nope' }
  });
  const st = b.getState();
  assert.equal(st.proposeCount, 2);
  assert.equal(st.completedCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.unboundedSelfModifyingAgi, false);
  assert.equal(fdirCalls.length, 1);
});

// ── AZ17: sanitizeAzPayload + writeOnDeny + AZ_CODES freeze ──────────────────
test('AZ17: sanitizeAzPayload redacts secrets; throwOnDeny; AZ_CODES freeze', () => {
  const digest = sha256Canonical({ a: 1 });
  const cleaned = sanitizeAzPayload({
    apiKey: FAKE_TOKEN,
    authorization: 'Bearer abcdefghijklmnop',
    receiptDigest: digest,
    planHash: digest,
    nested: { password: 'x', ok: true }
  });
  assert.equal(cleaned.apiKey, '[REDACTED]');
  assert.equal(cleaned.authorization, '[REDACTED]');
  assert.equal(cleaned.receiptDigest, digest);
  assert.equal(cleaned.planHash, digest);
  assert.equal(cleaned.nested.password, '[REDACTED]');
  assert.equal(cleaned.nested.ok, true);

  const strict = makeBridge({ throwOnDeny: true });
  assert.throws(
    () =>
      strict.proposeRepair({
        fault: {
          class: FAULT_CLASSES.UNBOUNDED_SELF_MOD,
          message: 'nope'
        }
      }),
    (err) => err instanceof SelfRepairFdirBridgeError
  );

  assert.equal(Object.isFrozen(AZ_CODES), true);
  assert.equal(AZ_CODES.COMPLETED, 'COMPLETED');
  assert.equal(AZ_CODES.UNBOUNDED_SELF_MOD_FORBIDDEN, 'UNBOUNDED_SELF_MOD_FORBIDDEN');
  assert.equal(AZ_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(AZ_CODES.LAW_VI_DENY, 'LAW_VI_DENY');

  // helpers smoke
  const cls = classifyFault({ message: 'SyntaxError: bad' });
  assert.equal(cls.class, FAULT_CLASSES.SYNTAX_ERROR);
  const plan = buildRepairPlan({ faultClass: FAULT_CLASSES.SYNTAX_ERROR });
  assert.equal(plan.deterministic, true);
  const rcpt = buildRepairReceipt({
    ok: true,
    code: 'COMPLETED',
    faultClass: FAULT_CLASSES.SYNTAX_ERROR,
    planHash: plan.planHash
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(typeof stableStringify({ z: 1, a: 2 }), 'string');
  assert.equal(typeof planHash(plan), 'string');
  const allow = checkPathAllowlisted(ALLOWED);
  assert.equal(allow.ok, true);

  const one = proposeRepair(
    {
      fault: {
        class: FAULT_CLASSES.SCHEMA_DEVIATION,
        artifactPath: 'fixtures/schema-dev.js',
        message: 'schema'
      }
    },
    { now: () => '2026-09-12T22:34:00.000Z' }
  );
  assert.equal(one.code, AZ_CODES.COMPLETED);
});

// ── AZ18: writeFundacion ALWAYS DENY + disallowed path ──────────────────────
test('AZ18: writeFundacion ALWAYS DENY; disallowed path → INVALID_REQUEST', () => {
  const b = makeBridge();
  const wf = b.writeFundacion({ path: '/Fundacion/secret' });
  assert.equal(wf.code, AZ_CODES.FUNDACION_DENY);
  assert.equal(wf.fundacionDelta, 0);
  assert.ok(wf.receipt.sealed);

  const badPath = b.proposeRepair({
    fault: {
      class: FAULT_CLASSES.SYNTAX_ERROR,
      message: 'x',
      artifactPath: '/etc/passwd'
    }
  });
  assert.equal(badPath.ok, false);
  assert.equal(badPath.code, AZ_CODES.INVALID_REQUEST);
});
