/**
 * @file eos-af-autonomous-execution-loop.test.js
 * @description SPEC-0037 / Mission AF — Autonomous Execution Loop.
 * Hermetic TDD: happy path fake LLM + budget allow; budget trip DENY;
 * HITL deny; missing port fail-closed; PRODUCTION_READY NO; receipt;
 * Fundacion ALWAYS DENY; no network; optional swarm/flight flags.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-autonomous-execution-loop only.
 * live LLM loop ≠ PRODUCTION_READY; not AG/AH; Fundacion Δ=0.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AF_PRODUCTION_READY,
  AF_KIND,
  AF_CODES,
  AutonomousExecutionLoopError,
  createAutonomousExecutionLoop,
  sanitizeAfPayload
} from '../src/core/loop/autonomous-execution-loop.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../src/core/loop/autonomous-execution-loop.js'
);

// ── Inline hermetic fakes (no AD/AE import required on box) ─────────────────

function createFakeLlm(opts = {}) {
  let completeCount = 0;
  const shouldFail = opts.fail === true;
  return {
    kind: 'eos-fake-llm-provider',
    PRODUCTION_READY: 'NO',
    async complete(request = {}) {
      if (shouldFail) {
        const err = new Error('fake provider fail');
        err.code = 'PROVIDER_UNAVAILABLE';
        throw err;
      }
      completeCount += 1;
      const text = `fake:${request.intent || 'default'}:${String(request.prompt || '').slice(0, 24)}`;
      return {
        ok: true,
        code: 'COMPLETED',
        provider: 'fake',
        intent: request.intent || 'default',
        result: {
          ok: true,
          provider: 'fake',
          text,
          usage: {
            promptTokens: String(request.prompt || '').length,
            completionTokens: text.length,
            totalTokens:
              String(request.prompt || '').length + text.length
          }
        }
      };
    },
    getCompleteCount: () => completeCount
  };
}

function createFakeBudget(opts = {}) {
  let used = 0;
  let tripped = opts.tripped === true;
  const threshold = opts.tokenThreshold ?? 1000;
  return {
    kind: 'eos-ecr-budget-gate',
    PRODUCTION_READY: 'NO',
    beforeCall() {
      if (tripped || used > threshold) {
        return {
          ok: false,
          allow: false,
          code: tripped ? 'ECR_TRIPPED' : 'TOKEN_BUDGET_EXCEEDED',
          tripped: true,
          hitlRequired: true
        };
      }
      return { ok: true, allow: true, code: 'ALLOW', gate: 'beforeCall' };
    },
    afterCall(usage = {}) {
      const add =
        Number(usage.tokens || 0) ||
        Number(usage.tokensIn || 0) + Number(usage.tokensOut || 0) ||
        0;
      used += add;
      if (used > threshold) {
        tripped = true;
        return {
          ok: false,
          allow: false,
          code: 'TOKEN_BUDGET_EXCEEDED',
          tripped: true,
          hitlRequired: true,
          used: { tokens: used }
        };
      }
      return {
        ok: true,
        allow: true,
        code: 'ALLOW',
        gate: 'afterCall',
        used: { tokens: used }
      };
    },
    shouldAllow() {
      return !tripped && used <= threshold;
    },
    allow() {
      return this.shouldAllow();
    },
    check() {
      return this.beforeCall();
    },
    trip() {
      tripped = true;
    },
    getUsed: () => used
  };
}

function createHitl(approveValue) {
  return {
    approve: async () => approveValue
  };
}

function loop(opts = {}) {
  return createAutonomousExecutionLoop({
    llmPort: opts.llmPort ?? createFakeLlm(),
    budgetGate: opts.budgetGate ?? createFakeBudget(),
    hitl: opts.hitl,
    session: opts.session,
    shell: opts.shell,
    swarm: opts.swarm,
    flight: opts.flight,
    enableSwarm: opts.enableSwarm,
    enableFlight: opts.enableFlight,
    requireLlm: opts.requireLlm,
    requireBudget: opts.requireBudget,
    throwOnDeny: opts.throwOnDeny,
    now: opts.now || (() => '2026-09-12T06:50:00.000Z')
  });
}

// ── AF1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AF1: kind eos-autonomous-execution-loop and PRODUCTION_READY NO', () => {
  assert.equal(AF_PRODUCTION_READY, 'NO');
  assert.equal(AF_KIND, 'eos-autonomous-execution-loop');
  const l = loop();
  assert.equal(l.kind, AF_KIND);
  assert.equal(l.PRODUCTION_READY, 'NO');
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /PRODUCTION_READY:\s*NO/);
  assert.match(src, /live LLM loop ≠ PRODUCTION_READY|liveLlmLoopNotProductionReady|NON-CLAIM/i);
  assert.match(src, /Fundacion Δ=0|fundacionDelta0|ALWAYS_DENY/i);
});

// ── AF2: happy path fake LLM + budget allow ─────────────────────────────────
test('AF2: happy path — fake LLM + budget allow → COMPLETED + receipt', async () => {
  const llm = createFakeLlm();
  const budget = createFakeBudget({ tokenThreshold: 10000 });
  const l = loop({ llmPort: llm, budgetGate: budget });
  const r = await l.runCycle({
    intent: 'plan',
    prompt: 'summarize hermetic loop'
  });
  assert.equal(r.ok, true);
  assert.equal(r.allow, true);
  assert.equal(r.code, AF_CODES.COMPLETED);
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.kind, AF_KIND);
  assert.ok(r.receipt);
  assert.equal(r.receipt.code, AF_CODES.COMPLETED);
  assert.equal(r.receipt.PRODUCTION_READY, 'NO');
  assert.equal(r.receipt.fundacion, 'ALWAYS_DENY');
  assert.equal(llm.getCompleteCount(), 1);
  assert.ok(budget.getUsed() > 0);
});

// ── AF3: budget trip DENY before LLM ────────────────────────────────────────
test('AF3: budget already tripped → DENY ECR_TRIPPED / TOKEN_BUDGET_EXCEEDED (no LLM)', async () => {
  const llm = createFakeLlm();
  const budget = createFakeBudget({ tripped: true });
  const l = loop({ llmPort: llm, budgetGate: budget });
  const r = await l.runCycle({ intent: 'chat', prompt: 'x' });
  assert.equal(r.ok, false);
  assert.equal(r.allow, false);
  assert.ok(
    r.code === AF_CODES.ECR_TRIPPED ||
      r.code === AF_CODES.TOKEN_BUDGET_EXCEEDED
  );
  assert.equal(r.hitlRequired, true);
  assert.equal(llm.getCompleteCount(), 0);
  assert.ok(r.receipt);
  assert.equal(r.receipt.ok, false);
});

// ── AF4: HITL deny (default fail-closed) ────────────────────────────────────
test('AF4: requiresHitl + default HITL DENY → HITL_REQUIRED', async () => {
  const llm = createFakeLlm();
  const l = loop({ llmPort: llm }); // default hitl denies
  const r = await l.runCycle({
    intent: 'destructive',
    prompt: 'rm',
    requiresHitl: true
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, AF_CODES.HITL_REQUIRED);
  assert.equal(r.hitlRequired, true);
  assert.equal(r.approved, false);
  assert.equal(llm.getCompleteCount(), 0);
});

// ── AF5: HITL approve path ──────────────────────────────────────────────────
test('AF5: requiresHitl + approve true → COMPLETED', async () => {
  const llm = createFakeLlm();
  const l = loop({ llmPort: llm, hitl: createHitl(true) });
  const r = await l.runCycle({
    intent: 'gated',
    prompt: 'ok',
    requiresHitl: true
  });
  assert.equal(r.ok, true);
  assert.equal(r.code, AF_CODES.COMPLETED);
  assert.equal(llm.getCompleteCount(), 1);
});

// ── AF6: missing llmPort fail-closed ────────────────────────────────────────
test('AF6: missing llmPort → MISSING_DEP fail-closed', async () => {
  const l = createAutonomousExecutionLoop({
    budgetGate: createFakeBudget(),
    llmPort: undefined,
    requireLlm: true,
    now: () => '2026-09-12T06:50:00.000Z'
  });
  const r = await l.runCycle({ intent: 'x', prompt: 'y' });
  assert.equal(r.ok, false);
  assert.equal(r.code, AF_CODES.MISSING_DEP);
  assert.equal(r.dep, 'llmPort');
});

// ── AF7: missing budgetGate fail-closed ─────────────────────────────────────
test('AF7: missing budgetGate → MISSING_DEP fail-closed', async () => {
  const l = createAutonomousExecutionLoop({
    llmPort: createFakeLlm(),
    budgetGate: undefined,
    requireBudget: true,
    now: () => '2026-09-12T06:50:00.000Z'
  });
  const r = await l.runCycle({ intent: 'x', prompt: 'y' });
  assert.equal(r.ok, false);
  assert.equal(r.code, AF_CODES.MISSING_DEP);
  assert.equal(r.dep, 'budgetGate');
});

// ── AF8: provider fail after fallbacks ──────────────────────────────────────
test('AF8: llmPort.complete throws → PROVIDER_FAILED', async () => {
  const l = loop({ llmPort: createFakeLlm({ fail: true }) });
  const r = await l.runCycle({ intent: 'x', prompt: 'y' });
  assert.equal(r.ok, false);
  assert.equal(r.code, AF_CODES.PROVIDER_FAILED);
  assert.ok(r.receipt);
});

// ── AF9: health + getState + receipt history ────────────────────────────────
test('AF9: health / getState / receipts after cycle', async () => {
  const l = loop();
  await l.runCycle({ intent: 'a', prompt: 'p' });
  const h = await l.health();
  assert.equal(h.ok, true);
  assert.equal(h.kind, AF_KIND);
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.fundacion, 'ALWAYS_DENY');
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.nonClaim.liveLlmLoopNotProductionReady, true);
  assert.equal(h.nonClaim.notAgAh, true);
  const st = l.getState();
  assert.equal(st.cycles, 1);
  assert.equal(st.lastCode, AF_CODES.COMPLETED);
  assert.equal(st.lastOk, true);
  assert.equal(st.receiptCount, 1);
  assert.ok(st.lastReceiptId);
  assert.equal(st.PRODUCTION_READY, 'NO');
});

// ── AF10: Fundacion ALWAYS DENY ─────────────────────────────────────────────
test('AF10: fundacionWrite / Fundacion path → FUNDACION_DENY', async () => {
  const llm = createFakeLlm();
  const l = loop({ llmPort: llm });
  const r1 = await l.runCycle({
    intent: 'write',
    fundacionWrite: true,
    prompt: 'nope'
  });
  assert.equal(r1.code, AF_CODES.FUNDACION_DENY);
  assert.equal(r1.fundacion, 'ALWAYS_DENY');
  assert.equal(llm.getCompleteCount(), 0);

  const r2 = await l.runCycle({
    intent: 'write',
    path: 'Documents/Fundacion/secret.md',
    prompt: 'nope'
  });
  assert.equal(r2.code, AF_CODES.FUNDACION_DENY);
});

// ── AF11: Law VI sanitize ───────────────────────────────────────────────────
test('AF11: Law VI sanitizeAfPayload redacts secrets', () => {
  const dirty = {
    apiKey: 'synthetic-test-key-abcdefghijklmnopqrstuvwxyz012345',
    authorization: 'Bearer supersecrettokenvalue',
    promptTokens: 12,
    nested: { token: 'abc', tokens: 99 }
  };
  const clean = sanitizeAfPayload(dirty);
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.promptTokens, 12);
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.tokens, 99);
  assert.ok(AutonomousExecutionLoopError);
  const err = new AutonomousExecutionLoopError(
    'leak api_key=synthetic-leak-abcdefghijklmnopqrstuvwxyz',
    AF_CODES.DENY
  );
  assert.ok(!err.message.includes('synthetic-leak-abcdefghijklmnopqrstuvwxyz'));
});

// ── AF12: no network / hermetic source honesty ──────────────────────────────
test('AF12: no network — source has no live fetch/http to providers; hermetic', () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /https:\/\/api\.openai\.com/);
  assert.doesNotMatch(src, /https:\/\/api\.anthropic\.com/);
  assert.match(src, /fake in tests|Fake|hermetic/i);
  assert.match(src, /not AG\/AH|notAgAh|Do NOT implement AG/i);
  assert.match(src, /CloudAgent|notCloudAgent|Antigravity/i);
});

// ── AF13: optional swarm behind flag — missing → MISSING_DEP ────────────────
test('AF13: enableSwarm without swarm.dispatch → MISSING_DEP', async () => {
  const l = loop({ enableSwarm: true, swarm: null });
  const r = await l.runCycle({ intent: 'swarm', prompt: 'x' });
  assert.equal(r.ok, false);
  assert.equal(r.code, AF_CODES.MISSING_DEP);
  assert.equal(r.dep, 'swarm');
});

// ── AF14: optional swarm success ────────────────────────────────────────────
test('AF14: enableSwarm + fake dispatch → COMPLETED with swarmResult', async () => {
  const swarm = {
    async dispatch(change) {
      return { ok: true, role: 'architect', change: change?.id || 'c1' };
    }
  };
  const l = loop({ enableSwarm: true, swarm });
  const r = await l.runCycle({
    intent: 'swarm',
    prompt: 'plan',
    change: { id: 'chg-1' }
  });
  assert.equal(r.ok, true);
  assert.equal(r.swarmResult.ok, true);
  assert.equal(r.swarmResult.change, 'chg-1');
});

// ── AF15: optional flight + session/shell stubs ─────────────────────────────
test('AF15: enableFlight + session/shell stubs → COMPLETED', async () => {
  const flight = {
    async run(cfg) {
      return { ok: true, flight: 'target', cfg: cfg?.id || null };
    }
  };
  const session = {
    async step(intent) {
      return { ok: true, stepped: intent.intent };
    }
  };
  const shell = {
    async enqueueIntent(intent) {
      return { ok: true, queued: intent.intent };
    }
  };
  const l = loop({ enableFlight: true, flight, session, shell });
  const r = await l.runCycle({
    intent: 'fly',
    prompt: 'sandbox',
    flight: { id: 'f1' }
  });
  assert.equal(r.ok, true);
  assert.equal(r.flightResult.ok, true);
  assert.equal(r.sessionStep.stepped, 'fly');
  assert.equal(r.shellStep.queued, 'fly');
});

// ── AF16: invalid intent + afterCall trip ───────────────────────────────────
test('AF16: invalid intent DENY; afterCall trip surfaces TOKEN_BUDGET_EXCEEDED', async () => {
  const l = loop();
  const bad = await l.runCycle(null);
  assert.equal(bad.code, AF_CODES.INVALID_INTENT);

  // Tiny threshold so afterCall trips after first LLM usage
  const budget = createFakeBudget({ tokenThreshold: 1 });
  const l2 = loop({ budgetGate: budget });
  const r = await l2.runCycle({ intent: 'burn', prompt: 'long-enough-prompt' });
  assert.equal(r.ok, false);
  assert.ok(
    r.code === AF_CODES.TOKEN_BUDGET_EXCEEDED ||
      r.code === AF_CODES.ECR_TRIPPED
  );
  assert.equal(r.hitlRequired, true);
  assert.ok(r.llm); // LLM ran before afterCall trip
});
