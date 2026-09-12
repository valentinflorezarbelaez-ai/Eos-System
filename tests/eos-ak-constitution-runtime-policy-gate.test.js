/**
 * @file eos-ak-constitution-runtime-policy-gate.test.js
 * @description SPEC-0042 / Mission AK — Constitution Runtime Policy Gate.
 * Hermetic TDD: allow when checks pass; DENY Fundacion / PRODUCTION_READY
 * flip / CloudAgent / unmapped critical / unknown action; intercept;
 * receipts; PRODUCTION_READY NO; Law VI no static vendor-key prefix;
 * NON-CLAIM markers; MISSING_DEP.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as
 * static string literals in source/tests — build synthetic fixtures
 * at runtime (fromCharCode / join).
 *
 * NON-CLAIM: constitution runtime ≠ full legal interpreter /
 * ≠ auto-amend constitution / ≠ compliance certification product /
 * ≠ PRODUCTION_READY; not AL / AM; Fundacion Δ=0.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AK_PRODUCTION_READY,
  AK_KIND,
  AK_CODES,
  AK_ACTION_TYPES,
  ConstitutionRuntimePolicyGateError,
  createConstitutionRuntimePolicyGate,
  sanitizePayload,
  containsSecretMaterial,
  isFundacionTarget,
  BUILTIN_CHECKS
} from '../src/core/policy/constitution-runtime-policy-gate.js';
import {
  DEFAULT_CLAUSE_ALLOWLIST,
  defaultAllowlistIds,
  lookupAllowlistClause,
  allowlistHealth,
  AK_ALLOWLIST_KIND,
  AK_ALLOWLIST_PRODUCTION_READY
} from '../src/core/policy/constitution-clause-allowlist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GATE_PATH = path.join(
  ROOT,
  'src/core/policy/constitution-runtime-policy-gate.js'
);
const ALLOW_PATH = path.join(
  ROOT,
  'src/core/policy/constitution-clause-allowlist.js'
);
const TEST_PATH = path.resolve(
  __dirname,
  'eos-ak-constitution-runtime-policy-gate.test.js'
);

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  const prefix = String.fromCharCode(115, 107, 45); // s k dash
  return prefix + suffix;
}

/**
 * Build a Bearer token fixture at runtime.
 */
function synthBearer() {
  return 'Bearer ' + 'Z'.repeat(48);
}

function gate(opts = {}) {
  return createConstitutionRuntimePolicyGate(opts);
}

const FIXTURE_CONSTITUTION = [
  '# EOS CONSTITUTION (fixture — NOT live file IO)',
  '## Article II: Authority & Boundaries',
  '- EOS MUST require human PO authority for CONSTITUTION.md',
  '- Fundacion writes ALWAYS DENY without PO L2',
  '- PRODUCTION_READY remains NO until certified scope',
  '- CloudAgent OUT — Antigravity-first',
  '- Law VI — no provider secrets in repo or autonomous payloads',
  '- Write barrier required for external writes'
].join('\n');

// ── AK1: kind + PRODUCTION_READY NO + NON-CLAIM ─────────────────────────────
test('AK1: kind eos-constitution-runtime-policy-gate and PRODUCTION_READY NO', () => {
  const g = gate();
  assert.equal(g.kind, AK_KIND);
  assert.equal(g.kind, 'eos-constitution-runtime-policy-gate');
  assert.equal(g.PRODUCTION_READY, 'NO');
  assert.equal(AK_PRODUCTION_READY, 'NO');
  const h = g.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AK_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.nonClaim.notFullLegalInterpreter, true);
  assert.equal(h.nonClaim.notAutoAmendConstitution, true);
  assert.equal(h.nonClaim.notComplianceCertification, true);
  assert.equal(h.nonClaim.notProductionReady, true);
  assert.equal(h.nonClaim.notAlAm, true);
  assert.equal(AK_ALLOWLIST_KIND, 'eos-constitution-clause-allowlist');
  assert.equal(AK_ALLOWLIST_PRODUCTION_READY, 'NO');
  assert.ok(DEFAULT_CLAUSE_ALLOWLIST.length >= 5);
  assert.ok(defaultAllowlistIds().includes('LAW_FUNDACION_DELTA0'));
  assert.equal(lookupAllowlistClause('LAW_CLOUDAGENT_OUT').critical, true);
  assert.equal(allowlistHealth().nonClaim.notFullLegalInterpreter, true);
});

// ── AK2: allow proceed when all allowlisted checks pass ─────────────────────
test('AK2: allow proceed when all allowlisted checks pass', () => {
  const g = gate({ constitutionText: FIXTURE_CONSTITUTION });
  const r = g.evaluate({
    type: 'session.resume',
    payload: { sessionId: 'S1', missionId: 'SPEC-0042' }
  });
  assert.equal(r.ok, true);
  assert.equal(r.allow, true);
  assert.equal(r.code, AK_CODES.OK);
  assert.ok(r.receipt);
  assert.equal(r.receipt.PRODUCTION_READY, 'NO');
  assert.equal(r.receipt.ok, true);
  assert.ok(Array.isArray(r.checksRun));
  assert.ok(r.checksRun.length >= 4);

  const tool = g.evaluate({
    type: 'tool.dispatch',
    payload: { tool: 'Shell', command: 'node --test' }
  });
  assert.equal(tool.ok, true);

  const write = g.evaluate({
    type: 'external.write',
    payload: {
      path: 'src/core/policy/example.js',
      barrier: true,
      envelope: { barrier: true, kind: 'write-barrier' }
    }
  });
  assert.equal(write.ok, true);
  assert.ok(AK_ACTION_TYPES.includes('session.resume'));
});

// ── AK3: DENY + receipt on Fundacion write intent ───────────────────────────
test('AK3: DENY+receipt on Fundacion write intent → FUNDACION_DENY', () => {
  const g = gate();
  const bad = g.evaluate({
    type: 'external.write',
    payload: {
      path: 'Documents/Fundacion/secret',
      barrier: true
    }
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.allow, false);
  assert.equal(bad.code, AK_CODES.FUNDACION_DENY);
  assert.equal(bad.denyCode, AK_CODES.FUNDACION_DENY);
  assert.ok(bad.receipt);
  assert.equal(bad.receipt.code, AK_CODES.FUNDACION_DENY);
  assert.equal(bad.receipt.PRODUCTION_READY, 'NO');

  const flag = g.evaluate({
    type: 'tool.dispatch',
    payload: { fundacionWrite: true, tool: 'Write' }
  });
  assert.equal(flag.code, AK_CODES.FUNDACION_DENY);

  const nested = g.evaluate({
    type: 'autonomy.propose',
    payload: { target: 'fundacion' }
  });
  assert.equal(nested.code, AK_CODES.FUNDACION_DENY);
  assert.equal(isFundacionTarget({ path: 'Documents/Fundacion' }), true);
});

// ── AK4: DENY on PRODUCTION_READY flip claim ────────────────────────────────
test('AK4: DENY on PRODUCTION_READY flip claim → POLICY_DENY', () => {
  const g = gate();
  const flip = g.evaluate({
    type: 'tool.dispatch',
    payload: { PRODUCTION_READY: 'YES', tool: 'flip' }
  });
  assert.equal(flip.ok, false);
  assert.equal(flip.allow, false);
  assert.equal(flip.code, AK_CODES.POLICY_DENY);
  assert.equal(flip.clauseId, 'LAW_PRODUCTION_READY_NO');
  assert.ok(flip.receipt);

  const claim = g.evaluate({
    type: 'session.resume',
    claim: 'PRODUCTION_READY=YES',
    payload: { sessionId: 'S' }
  });
  assert.equal(claim.ok, false);
  assert.equal(claim.code, AK_CODES.POLICY_DENY);
});

// ── AK5: DENY on CloudAgent intent ──────────────────────────────────────────
test('AK5: DENY on CloudAgent intent → POLICY_DENY', () => {
  const g = gate();
  const ca = g.evaluate({
    type: 'tool.dispatch',
    payload: { tool: 'CloudAgent', prompt: 'build something' }
  });
  assert.equal(ca.ok, false);
  assert.equal(ca.allow, false);
  assert.equal(ca.code, AK_CODES.POLICY_DENY);
  assert.equal(ca.clauseId, 'LAW_CLOUDAGENT_OUT');
  assert.ok(ca.receipt);

  const flag = g.evaluate({
    type: 'autonomy.propose',
    payload: { cloudAgent: true }
  });
  assert.equal(flag.code, AK_CODES.POLICY_DENY);
  assert.equal(flag.clauseId, 'LAW_CLOUDAGENT_OUT');
});

// ── AK6: DENY on unmapped critical clause (fail-closed, no skip) ────────────
test('AK6: DENY unmapped critical clause → CRITICAL_UNMAPPED (no skip)', () => {
  const g = gate();
  const unmapped = g.evaluate({
    type: 'session.resume',
    payload: { sessionId: 'S1' },
    requiredClauses: ['LAW_NEVER_MAPPED_CRITICAL_XYZ']
  });
  assert.equal(unmapped.ok, false);
  assert.equal(unmapped.allow, false);
  assert.ok(
    unmapped.code === AK_CODES.CRITICAL_UNMAPPED ||
      unmapped.code === AK_CODES.CLAUSE_UNMAPPED
  );
  assert.equal(unmapped.denyCode, unmapped.code);
  assert.ok(unmapped.receipt);
  assert.ok(
    /fail-closed|no skip/i.test(unmapped.message || unmapped.receipt.message || '')
  );

  // Allowlist without a registered check for a critical id
  const thin = createConstitutionRuntimePolicyGate({
    clauseAllowlist: ['LAW_FUNDACION_DELTA0'],
    checks: {
      // deliberately omit LAW_FUNDACION_DELTA0 checker despite allowlist
    },
    includeBuiltins: false
  });
  const missingCheck = thin.evaluate({
    type: 'tool.dispatch',
    payload: { tool: 'Shell' },
    requiredClauses: ['LAW_FUNDACION_DELTA0']
  });
  assert.equal(missingCheck.ok, false);
  assert.ok(
    missingCheck.code === AK_CODES.CRITICAL_UNMAPPED ||
      missingCheck.code === AK_CODES.CLAUSE_UNMAPPED
  );
});

// ── AK7: DENY unknown action type ───────────────────────────────────────────
test('AK7: DENY unknown action type → UNKNOWN_ACTION', () => {
  const g = gate();
  const u = g.evaluate({
    type: 'quantum.teleport',
    payload: {}
  });
  assert.equal(u.ok, false);
  assert.equal(u.allow, false);
  assert.equal(u.code, AK_CODES.UNKNOWN_ACTION);
  assert.equal(u.denyCode, AK_CODES.UNKNOWN_ACTION);
  assert.ok(u.receipt);
});

// ── AK8: intercept unauthorized tool.dispatch / session.resume ──────────────
test('AK8: intercept unauthorized tool.dispatch / session.resume fixtures', () => {
  const g = gate();
  const denied = g.intercept({
    type: 'tool.dispatch',
    payload: { tool: 'CloudAgent' }
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.clauseId, 'LAW_CLOUDAGENT_OUT');

  const throwGate = gate({ throwOnDeny: true });
  assert.throws(
    () =>
      throwGate.intercept({
        type: 'session.resume',
        payload: { fundacionWrite: true }
      }),
    (err) => {
      assert.ok(err instanceof ConstitutionRuntimePolicyGateError);
      assert.equal(err.code, AK_CODES.FUNDACION_DENY);
      return true;
    }
  );

  const ok = g.intercept({
    type: 'session.resume',
    payload: { sessionId: 'S-ok' }
  });
  assert.equal(ok.ok, true);
});

// ── AK9: receipt sealed on deny and allow ───────────────────────────────────
test('AK9: receipt sealed on deny and allow + sealReceipt / getReceipts', () => {
  const seen = [];
  const ledger = [];
  const g = gate({
    onReceipt: (r) => seen.push(r),
    ledgerAppend: (e) => ledger.push(e),
    receiptSealer: (r) => {
      assert.equal(r.kind, AK_KIND);
    }
  });

  const allowR = g.evaluate({
    type: 'policy.evaluate',
    payload: { ping: true }
  });
  assert.equal(allowR.ok, true);
  assert.ok(allowR.receipt.id.startsWith('AK-RCPT-'));
  assert.equal(allowR.receipt.PRODUCTION_READY, 'NO');

  const denyR = g.evaluate({
    type: 'external.write',
    payload: { path: '/tmp/out.txt' } // no barrier
  });
  assert.equal(denyR.ok, false);
  assert.equal(denyR.code, AK_CODES.POLICY_DENY);
  assert.equal(denyR.clauseId, 'LAW_WRITE_BARRIER');
  assert.ok(denyR.receipt);

  const manual = g.sealReceipt({
    ok: true,
    allow: true,
    code: AK_CODES.OK,
    phase: 'MANUAL_ALLOW'
  });
  assert.equal(manual.ok, true);
  assert.equal(manual.kind, AK_KIND);

  const receipts = g.getReceipts();
  assert.ok(receipts.length >= 3);
  for (const r of receipts) {
    assert.equal(r.PRODUCTION_READY, 'NO');
    assert.equal(r.kind, AK_KIND);
    assert.ok(r.id);
    assert.ok(r.at);
  }
  assert.ok(seen.length >= 3);
  assert.ok(ledger.length >= 3);
});

// ── AK10: PRODUCTION_READY === 'NO' locked ──────────────────────────────────
test('AK10: PRODUCTION_READY === NO on gate, health, state, receipts', () => {
  const g = gate();
  assert.equal(g.PRODUCTION_READY, 'NO');
  assert.equal(g.health().PRODUCTION_READY, 'NO');
  assert.equal(g.getState().PRODUCTION_READY, 'NO');
  const r = g.evaluate({ type: 'session.resume', payload: { sessionId: 'x' } });
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.receipt.PRODUCTION_READY, 'NO');
});

// ── AK11: Law VI — DENY secret material; no static vendor-key in src/tests ──
test('AK11: Law VI — DENY secret material (runtime synth); rg-clean src+tests', () => {
  const dirtyKey = synthVendorKey();
  const dirtyBearer = synthBearer();
  const g = gate();

  const secretDeny = g.evaluate({
    type: 'tool.dispatch',
    payload: { tool: 'Shell', apiKey: dirtyKey }
  });
  assert.equal(secretDeny.ok, false);
  assert.equal(secretDeny.code, AK_CODES.POLICY_DENY);
  assert.equal(secretDeny.clauseId, 'LAW_VI_NO_SECRET_LITERAL');
  const dumped = JSON.stringify(secretDeny);
  assert.equal(dumped.includes(dirtyKey), false);

  const bearerDeny = g.evaluate({
    type: 'session.resume',
    payload: { authorization: dirtyBearer, sessionId: 'S' }
  });
  assert.equal(bearerDeny.ok, false);
  assert.equal(bearerDeny.clauseId, 'LAW_VI_NO_SECRET_LITERAL');

  assert.equal(containsSecretMaterial({ apiKey: dirtyKey }), true);
  assert.equal(containsSecretMaterial({ note: 'safe' }), false);

  const clean = sanitizePayload({
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    nested: { token: dirtyKey, safe: 'ok' }
  });
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.safe, 'ok');

  const files = [GATE_PATH, ALLOW_PATH, TEST_PATH];
  const banned = String.fromCharCode(115, 107, 45); // s k dash
  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    assert.equal(
      body.includes(banned),
      false,
      `banned vendor-key prefix substring found in ${path.basename(f)}`
    );
  }
  assert.ok(synthVendorKey().startsWith(banned));
});

// ── AK12: NON-CLAIM markers in module comments ──────────────────────────────
test('AK12: NON-CLAIM markers present in module comments', () => {
  const src = fs.readFileSync(GATE_PATH, 'utf8');
  const allow = fs.readFileSync(ALLOW_PATH, 'utf8');
  const suite = fs.readFileSync(TEST_PATH, 'utf8');
  for (const body of [src, allow, suite]) {
    assert.ok(body.includes('NON-CLAIM'));
    assert.ok(body.includes('full legal interpreter'));
    assert.ok(body.includes('auto-amend'));
    assert.ok(body.includes('compliance'));
    assert.ok(body.includes('PRODUCTION_READY'));
  }
  assert.ok(src.includes('not AL / AM') || src.includes('not AL'));
  assert.ok(src.includes('Fundacion'));
  assert.ok(src.includes('Antigravity') || src.includes('cloud-agent'));
});

// ── AK13: MISSING_DEP when required injector absent / invalid ───────────────
test('AK13: MISSING_DEP when required injector absent / invalid', () => {
  const badNow = createConstitutionRuntimePolicyGate({ now: 'not-a-fn' });
  const d1 = badNow.evaluate({ type: 'session.resume', payload: {} });
  assert.equal(d1.ok, false);
  assert.equal(d1.code, AK_CODES.MISSING_DEP);
  assert.equal(d1.allow, false);

  const badSealer = createConstitutionRuntimePolicyGate({
    receiptSealer: 42
  });
  const d2 = badSealer.evaluate({ type: 'tool.dispatch', payload: { tool: 'x' } });
  assert.equal(d2.code, AK_CODES.MISSING_DEP);

  const badLedger = createConstitutionRuntimePolicyGate({
    ledgerAppend: 'nope'
  });
  const d3 = badLedger.evaluate({ type: 'session.resume', payload: {} });
  assert.equal(d3.code, AK_CODES.MISSING_DEP);

  const needLedger = createConstitutionRuntimePolicyGate({
    requireLedgerAppend: true
  });
  const d4 = needLedger.evaluate({
    type: 'session.resume',
    payload: { sessionId: 'S' }
  });
  assert.equal(d4.code, AK_CODES.MISSING_DEP);
  assert.equal(d4.dep, 'ledgerAppend');
});

// ── AK14: INVALID_ACTION on bad evaluate inputs ─────────────────────────────
test('AK14: invalid action inputs → INVALID_ACTION fail-closed', () => {
  const g = gate();
  assert.equal(g.evaluate(null).code, AK_CODES.INVALID_ACTION);
  assert.equal(g.evaluate(undefined).code, AK_CODES.INVALID_ACTION);
  assert.equal(g.evaluate('nope').code, AK_CODES.INVALID_ACTION);
  assert.equal(g.evaluate(42).code, AK_CODES.INVALID_ACTION);
  assert.equal(g.evaluate(['arr']).code, AK_CODES.INVALID_ACTION);
  assert.equal(g.evaluate({ payload: {} }).code, AK_CODES.INVALID_ACTION); // no type
  assert.equal(g.evaluate(null).allow, false);
});

// ── AK15: hermetic — no network / no cloud-agent import; registerCheck ──────
test('AK15: hermetic — no fetch/http; registerCheck + listAllowlistedClauses', () => {
  const src = fs.readFileSync(GATE_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);
  assert.ok(src.includes('CRITICAL_UNMAPPED'));
  assert.ok(src.includes('CLAUSE_UNMAPPED'));
  assert.ok(src.includes('UNKNOWN_ACTION'));
  assert.ok(src.includes('FUNDACION_DENY'));
  assert.ok(src.includes('POLICY_DENY'));
  assert.ok(src.includes('MISSING_DEP'));
  assert.ok(src.includes('INVALID_ACTION'));
  assert.ok(typeof BUILTIN_CHECKS.LAW_WRITE_BARRIER === 'function');

  const g = gate();
  const listed = g.listAllowlistedClauses();
  assert.ok(listed.includes('LAW_FUNDACION_DELTA0'));
  assert.ok(listed.includes('LAW_CLOUDAGENT_OUT'));

  g.registerCheck('LAW_CUSTOM_HERMETIC', (action) => {
    if (action?.payload?.customDeny === true) {
      return {
        ok: false,
        denyCode: AK_CODES.POLICY_DENY,
        clauseId: 'LAW_CUSTOM_HERMETIC',
        message: 'custom deny'
      };
    }
    return { ok: true, clauseId: 'LAW_CUSTOM_HERMETIC' };
  });
  assert.ok(g.listAllowlistedClauses().includes('LAW_CUSTOM_HERMETIC'));
  const custom = g.evaluate({
    type: 'tool.dispatch',
    payload: { tool: 'Shell', customDeny: true },
    requiredClauses: ['LAW_CUSTOM_HERMETIC']
  });
  assert.equal(custom.ok, false);
  assert.equal(custom.clauseId, 'LAW_CUSTOM_HERMETIC');
});

// ── AK16: write barrier + state + fail-closed codes surface ─────────────────
test('AK16: write barrier DENY; getState; all fail-closed codes exported', () => {
  const g = gate({ constitutionText: FIXTURE_CONSTITUTION });
  const noBarrier = g.evaluate({
    type: 'external.write',
    payload: { path: 'src/out.js' }
  });
  assert.equal(noBarrier.ok, false);
  assert.equal(noBarrier.clauseId, 'LAW_WRITE_BARRIER');

  const withBarrier = g.evaluate({
    type: 'external.write',
    payload: {
      path: 'src/out.js',
      writeBarrier: true
    }
  });
  assert.equal(withBarrier.ok, true);

  const state = g.getState();
  assert.equal(state.kind, AK_KIND);
  assert.equal(state.PRODUCTION_READY, 'NO');
  assert.ok(state.allowlistedClauses.length >= 5);
  assert.equal(state.hasConstitutionText, true);
  assert.equal(state.nonClaim.notFullLegalInterpreter, true);

  assert.equal(AK_CODES.POLICY_DENY, 'POLICY_DENY');
  assert.equal(AK_CODES.CLAUSE_UNMAPPED, 'CLAUSE_UNMAPPED');
  assert.equal(AK_CODES.UNKNOWN_ACTION, 'UNKNOWN_ACTION');
  assert.equal(AK_CODES.CRITICAL_UNMAPPED, 'CRITICAL_UNMAPPED');
  assert.equal(AK_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(AK_CODES.MISSING_DEP, 'MISSING_DEP');
  assert.equal(AK_CODES.INVALID_ACTION, 'INVALID_ACTION');
});
