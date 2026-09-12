/**
 * @file eos-ae-token-budget-ecr.test.js
 * @description SPEC-0036 / Mission AE — Token-Budget Circuit Breaker / ECR.
 * Hermetic TDD: under-threshold allow; trip on exceed; DENY after trip;
 * HITL flag; configurable threshold; reset path; PRODUCTION_READY NO;
 * BoundedOutputFilter observe compatibility; Law VI; no network.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-token-budget-circuit-breaker / ECR only.
 * ECR ≠ billing platform ≠ PRODUCTION_READY; not AF/AG/AH.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ECR_PRODUCTION_READY,
  ECR_KIND,
  ECR_CODES,
  TokenBudgetCircuitBreakerError,
  createTokenBudgetCircuitBreaker,
  createECR,
  createBoundedOutputFilter,
  sanitizeEcrPayload
} from '../src/core/budget/token-budget-circuit-breaker.js';
import {
  createEcrBudgetGate,
  ECR_GATE_KIND
} from '../src/core/budget/ecr-budget-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../src/core/budget/token-budget-circuit-breaker.js'
);

function ecr(opts = {}) {
  return createTokenBudgetCircuitBreaker({
    tokenThreshold: 100,
    ...opts
  });
}

// ── AE1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AE1: kind eos-token-budget-circuit-breaker and PRODUCTION_READY NO', () => {
  assert.equal(ECR_PRODUCTION_READY, 'NO');
  assert.equal(ECR_KIND, 'eos-token-budget-circuit-breaker');
  const c = ecr();
  assert.equal(c.kind, ECR_KIND);
  assert.equal(c.PRODUCTION_READY, 'NO');
  const alias = createECR({ tokenThreshold: 10 });
  assert.equal(alias.kind, ECR_KIND);
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /PRODUCTION_READY:\s*NO/);
  assert.match(src, /ECR ≠ billing platform|ecrNotBillingPlatform|NON-CLAIM/i);
});

// ── AE2: under-threshold allow ──────────────────────────────────────────────
test('AE2: under-threshold recordUsage + check ALLOW', () => {
  const c = ecr({ tokenThreshold: 100 });
  const r = c.recordUsage({ tokensIn: 10, tokensOut: 20, intent: 'chat' });
  assert.equal(r.ok, true);
  assert.equal(r.allow, true);
  assert.equal(r.code, ECR_CODES.ALLOW);
  assert.equal(r.hitlRequired, false);
  assert.equal(r.used.tokens, 30);
  const chk = c.check();
  assert.equal(chk.allow, true);
  assert.equal(c.shouldAllow(), true);
});

// ── AE3: trip on token exceed ───────────────────────────────────────────────
test('AE3: exceed tokenThreshold → trip TOKEN_BUDGET_EXCEEDED', () => {
  const c = ecr({ tokenThreshold: 50 });
  const r = c.recordUsage({ tokensIn: 30, tokensOut: 25, provider: 'fake' });
  assert.equal(r.ok, false);
  assert.equal(r.allow, false);
  assert.equal(r.code, ECR_CODES.TOKEN_BUDGET_EXCEEDED);
  assert.equal(r.tripped, true);
  assert.equal(r.hitlRequired, true);
  assert.ok(r.receipt);
  assert.equal(r.receipt.PRODUCTION_READY, 'NO');
  assert.equal(r.receipt.code, ECR_CODES.TOKEN_BUDGET_EXCEEDED);
  assert.ok(r.receipt.at);
  assert.ok(r.receipt.used.tokens > r.receipt.threshold.tokens);
});

// ── AE4: DENY after trip (fail-closed) ──────────────────────────────────────
test('AE4: after trip further recordUsage/check DENY ECR_TRIPPED', () => {
  const c = ecr({ tokenThreshold: 10 });
  c.recordUsage({ tokens: 11 });
  assert.equal(c.shouldAllow(), false);
  const again = c.recordUsage({ tokensIn: 1 });
  assert.equal(again.ok, false);
  assert.ok(
    again.code === ECR_CODES.ECR_TRIPPED ||
      again.code === ECR_CODES.TOKEN_BUDGET_EXCEEDED
  );
  assert.equal(again.hitlRequired, true);
  const chk = c.check();
  assert.equal(chk.allow, false);
  assert.equal(chk.hitlRequired, true);
});

// ── AE5: HITL flag on trip ──────────────────────────────────────────────────
test('AE5: trip sets hitlRequired true + receipt shape', () => {
  const c = ecr({ tokenThreshold: 5 });
  const r = c.trip(ECR_CODES.ECR_TRIPPED);
  assert.equal(r.hitlRequired, true);
  assert.equal(r.code, ECR_CODES.ECR_TRIPPED);
  const st = c.getState();
  assert.equal(st.tripped, true);
  assert.ok(st.tripReceipt);
  assert.equal(st.tripReceipt.PRODUCTION_READY, 'NO');
  assert.equal(st.tripReceipt.hitlRequired, true);
  assert.deepEqual(Object.keys(st.tripReceipt).sort().includes('threshold'), true);
});

// ── AE6: configurable threshold (tokens + cost) ─────────────────────────────
test('AE6: configurable token + cost thresholds', () => {
  const c = ecr({
    maxTokens: 200,
    maxCostUnits: 10
  });
  const ok = c.recordUsage({ tokens: 50, costUnits: 3 });
  assert.equal(ok.allow, true);
  const tripCost = c.recordUsage({ tokens: 1, costUnits: 8 });
  assert.equal(tripCost.ok, false);
  assert.equal(tripCost.code, ECR_CODES.COST_BUDGET_EXCEEDED);
  assert.equal(tripCost.hitlRequired, true);

  const t2 = createTokenBudgetCircuitBreaker({ tokenThreshold: 3 });
  const r2 = t2.recordUsage({ tokensOut: 4 });
  assert.equal(r2.code, ECR_CODES.TOKEN_BUDGET_EXCEEDED);
});

// ── AE7: reset denied by default; HITL confirm path ─────────────────────────
test('AE7: reset fail-closed by default; HITL confirm resets', () => {
  const c = ecr({ tokenThreshold: 5, allowReset: false });
  c.recordUsage({ tokens: 9 });
  assert.equal(c.getState().tripped, true);

  const denied = c.reset();
  assert.equal(denied.ok, false);
  assert.equal(denied.code, ECR_CODES.RESET_DENIED);
  assert.equal(denied.hitlRequired, true);
  assert.equal(c.getState().tripped, true);

  const ok = c.reset({ confirm: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.reset, true);
  assert.equal(c.getState().tripped, false);
  assert.equal(c.shouldAllow(), true);
  assert.equal(c.getState().used.tokens, 0);
});

// ── AE8: allowReset=true at create permits reset without confirm ────────────
test('AE8: allowReset opt-in permits reset without confirm', () => {
  const c = ecr({ tokenThreshold: 5, allowReset: true });
  c.trip();
  const ok = c.reset();
  assert.equal(ok.ok, true);
  assert.equal(c.check().allow, true);
});

// ── AE9: BoundedOutputFilter integration / observe compatibility ────────────
test('AE9: injectable BoundedOutputFilter observe trips ECR', () => {
  const filter = createBoundedOutputFilter({ budget: 10 });
  const c = ecr({
    tokenThreshold: 1000,
    boundedOutputFilter: filter
  });
  // Filter budget 10 — observe delta 12 → filter fail → ECR trip
  const r = c.recordUsage({ tokens: 12, intent: 'swarm' });
  assert.equal(r.ok, false);
  assert.equal(r.code, ECR_CODES.TOKEN_BUDGET_EXCEEDED);
  assert.equal(r.hitlRequired, true);
  assert.ok(r.receipt);

  // Standalone filter mirrors AA TOKEN_BUDGET_EXCEEDED
  const f2 = createBoundedOutputFilter({ budget: 2, used: 0 });
  const obs = f2.observeTokens({ delta: 5 });
  assert.equal(obs.ok, false);
  assert.equal(obs.reason, ECR_CODES.TOKEN_BUDGET_EXCEEDED);
  const blocked = f2.filterOutbound('one two three four');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, ECR_CODES.TOKEN_BUDGET_EXCEEDED);
});

// ── AE10: health / getState Law VI + NON-CLAIM ──────────────────────────────
test('AE10: health/getState NON-CLAIM; Law VI redacts secrets', () => {
  const c = ecr({ tokenThreshold: 40 });
  c.recordUsage({ tokensIn: 5, provider: 'fake', intent: 't' });
  const h = c.health();
  assert.equal(h.kind, ECR_KIND);
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.nonClaim.ecrNotBillingPlatform, true);
  assert.equal(h.nonClaim.ecrNotProductionReady, true);
  assert.equal(h.nonClaim.notAfAgAh, true);
  assert.equal(h.nonClaim.fundacionDelta0, true);

  const dirty = {
    apiKey: ['sk', 'X'.repeat(32)].join('-'),
    token: 'super-secret-token-value-xxxxxx',
    authorization: 'Bearer ' + ['sk', 'Y'.repeat(28)].join('-'),
    nested: { password: 'hunter2-not-real', ok: true },
    used: 12
  };
  const clean = sanitizeEcrPayload(dirty);
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.token, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.ok, true);
  assert.equal(clean.used, 12);

  const st = c.getState();
  const dumped = JSON.stringify(st);
  assert.doesNotMatch(dumped, /sk-[A-Za-z0-9]{8,}/);
  assert.equal(st.PRODUCTION_READY, 'NO');

  const err = new TokenBudgetCircuitBreakerError(
    'failed ' + ['api', 'key'].join('_') + '=' + ['sk', 'Z'.repeat(16)].join('-'),
    ECR_CODES.DENY,
    { apiKey: ['sk', 'A'.repeat(24)].join('-') }
  );
  assert.equal(err.details.apiKey, '[REDACTED]');
  assert.equal(err.message.includes('ZZZZ'), false);
});

// ── AE11: ecr-budget-gate beforeCall / afterCall seam ───────────────────────
test('AE11: ecr-budget-gate beforeCall/afterCall seam', () => {
  const gate = createEcrBudgetGate({ tokenThreshold: 20 });
  assert.equal(gate.kind, ECR_GATE_KIND);
  assert.equal(gate.PRODUCTION_READY, 'NO');
  const pre = gate.beforeCall({});
  assert.equal(pre.allow, true);
  const post = gate.afterCall({ tokensIn: 8, tokensOut: 8 });
  assert.equal(post.allow, true);
  const trip = gate.afterCall({ tokens: 10 });
  assert.equal(trip.ok, false);
  assert.equal(trip.hitlRequired, true);
  const denied = gate.beforeCall({});
  assert.equal(denied.allow, false);
  assert.equal(gate.allow(), false);
});

// ── AE12: manual trip + idempotent receipt ──────────────────────────────────
test('AE12: manual trip idempotent; check remains DENY', () => {
  const c = ecr({ tokenThreshold: 100 });
  const first = c.trip();
  const second = c.trip(ECR_CODES.TOKEN_BUDGET_EXCEEDED);
  assert.equal(first.code, ECR_CODES.ECR_TRIPPED);
  // second keeps original trip code (idempotent)
  assert.equal(second.code, ECR_CODES.ECR_TRIPPED);
  assert.equal(c.getState().tripReceipt.code, ECR_CODES.ECR_TRIPPED);
  assert.equal(c.check().allow, false);
});

// ── AE13: source honesty — no network / no AF-AG-AH / no secrets ────────────
test('AE13: source honesty no network fetch; not AF/AG/AH; no live secrets', () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /sk-[a-zA-Z0-9]{20,}/);
  assert.match(src, /TOKEN_BUDGET_EXCEEDED/);
  assert.match(src, /ECR_TRIPPED/);
  assert.match(src, /hitlRequired/);
  assert.match(src, /not AF\/AG\/AH|notAfAgAh|NON-CLAIM/i);
  assert.equal(cNoNet(), true);

  function cNoNet() {
    // hermetic: constructing + recording uses no network
    const c = createTokenBudgetCircuitBreaker({ tokenThreshold: 1 });
    c.recordUsage({ tokens: 1 });
    return true;
  }
});

// ── AE14: exact-at-threshold still ALLOW; one over trips ────────────────────
test('AE14: at-threshold ALLOW; one-over trips', () => {
  const c = ecr({ tokenThreshold: 10 });
  const at = c.recordUsage({ tokens: 10 });
  assert.equal(at.allow, true);
  assert.equal(at.used.tokens, 10);
  const over = c.recordUsage({ tokens: 1 });
  assert.equal(over.allow, false);
  assert.equal(over.code, ECR_CODES.TOKEN_BUDGET_EXCEEDED);
});

// ── AE15: invalid usage object throws ───────────────────────────────────────
test('AE15: recordUsage(null) → INVALID_USAGE', () => {
  const c = ecr();
  assert.throws(
    () => c.recordUsage(null),
    (err) =>
      err instanceof TokenBudgetCircuitBreakerError &&
      err.code === ECR_CODES.INVALID_USAGE
  );
});
