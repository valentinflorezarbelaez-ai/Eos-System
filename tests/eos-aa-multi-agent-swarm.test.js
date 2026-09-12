/**
 * @file eos-aa-multi-agent-swarm.test.js
 * @description SPEC-0032 / Mission AA — Multi-Agent Swarm Dispatcher
 *              & AgentHandoffEnvelope V3 validator.
 * Hermetic TDD: injectable personas only; never touch real Fundacion;
 * not CloudAgent fleet; not unbounded swarm.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-multi-agent-swarm-dispatcher only.
 * not CloudAgent fleet; not unbounded swarm; not PRODUCTION_READY.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HANDOFF_VALIDATOR_PRODUCTION_READY,
  HANDOFF_VALIDATOR_KIND,
  HANDOFF_SCHEMA_VERSION,
  CANONICAL_ROLES,
  ACCEPTED_ROLES,
  ROLE_ALIASES,
  AgentHandoffValidationError,
  validateAgentHandoffEnvelope,
  assertAgentHandoffEnvelope,
  normalizeRole,
  isSchemaV3
} from '../src/core/swarm/agent-handoff-validator.js';
import {
  DISPATCHER_PRODUCTION_READY,
  DISPATCHER_KIND,
  DISPATCHER_STATES,
  DISPATCHER_CODES,
  MultiAgentDispatcherError,
  createMultiAgentDispatcher,
  createBoundedOutputFilter,
  clampMaxRounds,
  clampMaxConcurrent,
  defaultHash
} from '../src/core/swarm/multi-agent-dispatcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISPATCHER_MODULE = path.resolve(
  __dirname,
  '../src/core/swarm/multi-agent-dispatcher.js'
);
const VALIDATOR_MODULE = path.resolve(
  __dirname,
  '../src/core/swarm/agent-handoff-validator.js'
);

function personas(overrides = {}) {
  const base = {
    architect: {
      id: 'arch-1',
      async run({ change }) {
        return { ok: true, plan: { steps: ['a', 'b'], changeId: change?.changeId || 'c1' } };
      }
    },
    builder: {
      id: 'build-1',
      async run({ plan, round }) {
        return {
          ok: true,
          artifact: { code: `export const n = ${round || 1};`, planSteps: plan?.steps }
        };
      }
    },
    verifier: {
      id: 'verify-1',
      async run() {
        return { ok: true, passed: true };
      }
    },
    ...overrides
  };
  return base;
}

function dispatcherFor(extra = {}) {
  return createMultiAgentDispatcher({
    ...personas(),
    ...extra
  });
}

function validEnvelope(overrides = {}) {
  return {
    schemaVersion: '3',
    handoffId: 'ho-1',
    fromRole: 'ARCHITECT',
    toRole: 'BUILDER',
    fromAgentId: 'arch-1',
    toAgentId: 'build-1',
    payload: { plan: { steps: ['x'] } },
    issuedAt: '2026-09-12T05:00:00.000Z',
    ...overrides
  };
}

// ─── AA1 ──────────────────────────────────────────────────────────────────────
test('AA1 kind + PRODUCTION_READY NO', () => {
  assert.equal(DISPATCHER_PRODUCTION_READY, 'NO');
  assert.equal(DISPATCHER_KIND, 'eos-multi-agent-swarm-dispatcher');
  assert.equal(HANDOFF_VALIDATOR_PRODUCTION_READY, 'NO');
  assert.equal(HANDOFF_VALIDATOR_KIND, 'eos-agent-handoff-validator');
  assert.equal(HANDOFF_SCHEMA_VERSION, '3');
  const d = createMultiAgentDispatcher(personas());
  assert.equal(d.kind, 'eos-multi-agent-swarm-dispatcher');
  assert.equal(d.PRODUCTION_READY, 'NO');
  assert.equal(d.health().PRODUCTION_READY, 'NO');
  assert.equal(d.health().kind, 'eos-multi-agent-swarm-dispatcher');
  assert.equal(d.getState().PRODUCTION_READY, 'NO');
  assert.equal(d.health().notProductionReady, true);
  assert.equal(d.health().cloudAgent, false);
  assert.equal(d.health().unboundedSwarm, false);
});

// ─── AA2 ──────────────────────────────────────────────────────────────────────
test('AA2 happy path architect→builder→verifier', async () => {
  const d = dispatcherFor();
  const result = await d.dispatch({ changeId: 'eos-mission-aa-demo' });
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'DISPATCH_OK');
  assert.equal(result.state, DISPATCHER_STATES.COMPLETED);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.cloudAgent, false);
  assert.equal(result.unboundedSwarm, false);
  assert.ok(result.plan);
  assert.ok(result.artifact);
  assert.equal(result.roundsUsed, 1);
  assert.equal(result.recovered, false);
  const hos = d.getHandoffs();
  assert.ok(hos.length >= 2, `expected ≥2 handoffs, got ${hos.length}`);
  assert.equal(hos[0].fromRole, 'ARCHITECT');
  assert.equal(hos[0].toRole, 'BUILDER');
  assert.equal(hos[1].fromRole, 'BUILDER');
  assert.equal(hos[1].toRole, 'VERIFIER');
  assert.equal(d.getState().state, 'COMPLETED');
});

// ─── AA3 ──────────────────────────────────────────────────────────────────────
test('AA3 BUILDER == VERIFIER same id → fail-closed', async () => {
  const d = createMultiAgentDispatcher(
    personas({
      builder: {
        id: 'same-agent',
        async run() {
          return { ok: true, artifact: { x: 1 } };
        }
      },
      verifier: {
        id: 'same-agent',
        async run() {
          return { ok: true };
        }
      }
    })
  );
  const result = await d.dispatch({ changeId: 'same-id-deny' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'BUILDER_EQUALS_VERIFIER');
  assert.equal(result.allowed, false);
  assert.equal(result.state, DISPATCHER_STATES.DENIED);
  assert.equal(result.escalated, true);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(d.getHandoffs().length, 0);
  assert.ok(
    d.getReceipts().some((r) => r.type === 'BUILDER_EQUALS_VERIFIER')
  );
});

// ─── AA4 ──────────────────────────────────────────────────────────────────────
test('AA4 invalid envelope rejected by validator', () => {
  const bad = validateAgentHandoffEnvelope(null);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.length >= 1);

  const missing = validateAgentHandoffEnvelope({
    schemaVersion: '3',
    handoffId: 'x'
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((e) => e.includes('fromRole')));
  assert.ok(missing.errors.some((e) => e.includes('payload')));
  assert.ok(missing.errors.some((e) => e.includes('issuedAt')));

  assert.throws(
    () => assertAgentHandoffEnvelope({ schemaVersion: '3' }),
    (err) => err instanceof AgentHandoffValidationError
  );

  const badRole = validateAgentHandoffEnvelope(
    validEnvelope({ fromRole: 'HACKER', toRole: 'BUILDER' })
  );
  assert.equal(badRole.ok, false);
  assert.ok(badRole.errors.some((e) => e.includes('fromRole')));
});

// ─── AA5 ──────────────────────────────────────────────────────────────────────
test('AA5 schema V3 required', () => {
  assert.equal(isSchemaV3('3'), true);
  assert.equal(isSchemaV3(3), true);
  assert.equal(isSchemaV3('2'), false);
  assert.equal(isSchemaV3(2), false);
  assert.equal(isSchemaV3('4'), false);

  const noVer = validateAgentHandoffEnvelope(
    validEnvelope({ schemaVersion: undefined })
  );
  // spreading undefined still leaves key missing if we delete
  const bare = { ...validEnvelope() };
  delete bare.schemaVersion;
  const r = validateAgentHandoffEnvelope(bare);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /schemaVersion/i.test(e)));

  const v2 = validateAgentHandoffEnvelope(validEnvelope({ schemaVersion: '2' }));
  assert.equal(v2.ok, false);
  assert.ok(v2.errors.some((e) => /schemaVersion/i.test(e) && /V3/i.test(e)));

  const ok3 = validateAgentHandoffEnvelope(validEnvelope({ schemaVersion: 3 }));
  assert.equal(ok3.ok, true);
  assert.equal(ok3.normalized.schemaVersion, '3');
});

// ─── AA6 ──────────────────────────────────────────────────────────────────────
test('AA6 verify fail then recover within budget', async () => {
  let calls = 0;
  const d = createMultiAgentDispatcher({
    ...personas({
      verifier: {
        id: 'verify-recover',
        async run() {
          calls += 1;
          if (calls === 1) return { ok: false, reason: 'first fail' };
          return { ok: true, passed: true };
        }
      }
    }),
    maxRounds: 2
  });
  const result = await d.dispatch({ changeId: 'recover-demo' });
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'DISPATCH_OK');
  assert.equal(result.recovered, true);
  assert.equal(result.roundsUsed, 2);
  assert.equal(calls, 2);
  assert.ok(d.getReceipts().some((r) => r.type === 'VERIFY_FAILED'));
  assert.ok(d.getReceipts().some((r) => r.type === 'VERIFY_RECOVERED'));
});

// ─── AA7 ──────────────────────────────────────────────────────────────────────
test('AA7 exhaust rounds → ESCALATED_HITL', async () => {
  const d = createMultiAgentDispatcher({
    ...personas({
      verifier: {
        id: 'verify-always-fail',
        async run() {
          return { ok: false, reason: 'never passes' };
        }
      }
    }),
    maxRounds: 2
  });
  const result = await d.dispatch({ changeId: 'exhaust' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'ESCALATED_HITL');
  assert.equal(result.state, DISPATCHER_STATES.ESCALATED_HITL);
  assert.equal(result.roundsUsed, 2);
  assert.equal(result.maxRounds, 2);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(d.getReceipts().filter((r) => r.type === 'VERIFY_FAILED').length >= 2);
  assert.ok(d.getReceipts().some((r) => r.type === 'ESCALATED_HITL'));
});

// ─── AA8 ──────────────────────────────────────────────────────────────────────
test('AA8 token budget exceeded via BoundedOutputFilter', async () => {
  const filter = createBoundedOutputFilter({ budget: 5 });
  const d = createMultiAgentDispatcher({
    ...personas({
      architect: {
        id: 'arch-verbose',
        async run() {
          return {
            ok: true,
            plan: {
              steps: [
                'one',
                'two',
                'three',
                'four',
                'five',
                'six',
                'seven',
                'eight'
              ]
            }
          };
        }
      }
    }),
    boundedOutputFilter: filter
  });
  const result = await d.dispatch({ changeId: 'token-blow' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'TOKEN_BUDGET_EXCEEDED');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.used > result.budget || result.used >= 5);
  assert.ok(
    d.getReceipts().some((r) => r.type === 'TOKEN_BUDGET_EXCEEDED')
  );

  // Unit: filterOutbound alone
  const f2 = createBoundedOutputFilter({ budget: 2 });
  const a = f2.filterOutbound('alpha beta');
  assert.equal(a.ok, true);
  const b = f2.filterOutbound('gamma delta epsilon');
  assert.equal(b.ok, false);
  assert.equal(b.reason, 'TOKEN_BUDGET_EXCEEDED');
});

// ─── AA9 ──────────────────────────────────────────────────────────────────────
test('AA9 role alias normalization', () => {
  assert.equal(normalizeRole('PLANNER'), 'ARCHITECT');
  assert.equal(normalizeRole('CODER'), 'BUILDER');
  assert.equal(normalizeRole('QA'), 'VERIFIER');
  assert.equal(normalizeRole('architect'), 'ARCHITECT');
  assert.equal(normalizeRole('builder'), 'BUILDER');
  assert.equal(normalizeRole('verifier'), 'VERIFIER');
  assert.equal(normalizeRole('HACKER'), null);
  assert.deepEqual([...CANONICAL_ROLES], ['ARCHITECT', 'BUILDER', 'VERIFIER']);
  assert.equal(ROLE_ALIASES.PLANNER, 'ARCHITECT');
  assert.equal(ROLE_ALIASES.CODER, 'BUILDER');
  assert.equal(ROLE_ALIASES.QA, 'VERIFIER');

  const r = validateAgentHandoffEnvelope(
    validEnvelope({ fromRole: 'PLANNER', toRole: 'CODER' })
  );
  assert.equal(r.ok, true);
  assert.equal(r.normalized.fromRole, 'ARCHITECT');
  assert.equal(r.normalized.toRole, 'BUILDER');

  const r2 = validateAgentHandoffEnvelope(
    validEnvelope({ fromRole: 'BUILDER', toRole: 'QA' })
  );
  assert.equal(r2.ok, true);
  assert.equal(r2.normalized.toRole, 'VERIFIER');

  // Persona alias injection: planner/coder/qa keys
  const d = createMultiAgentDispatcher({
    planner: {
      id: 'p1',
      async plan() {
        return { ok: true, plan: { via: 'planner' } };
      }
    },
    coder: {
      id: 'c1',
      async build() {
        return { ok: true, artifact: { via: 'coder' } };
      }
    },
    qa: {
      id: 'q1',
      async verify() {
        return { ok: true };
      }
    }
  });
  assert.equal(d.health().personas.architectId, 'p1');
  assert.equal(d.health().personas.builderId, 'c1');
  assert.equal(d.health().personas.verifierId, 'q1');
});

// ─── AA10 ─────────────────────────────────────────────────────────────────────
test('AA10 maxConcurrent / busy fail-closed', async () => {
  assert.equal(clampMaxConcurrent(99), 3);
  assert.equal(clampMaxConcurrent(0), 1);
  assert.equal(clampMaxConcurrent(-5), 1);
  assert.equal(clampMaxConcurrent(undefined), 1);
  assert.equal(clampMaxRounds(0), 1);
  assert.equal(clampMaxRounds(5), 5);

  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const d = createMultiAgentDispatcher({
    maxConcurrent: 1,
    architect: {
      id: 'arch-slow',
      async run() {
        await gate;
        return { ok: true, plan: { steps: ['x'] } };
      }
    },
    builder: {
      id: 'build-slow',
      async run() {
        return { ok: true, artifact: { y: 1 } };
      }
    },
    verifier: {
      id: 'verify-slow',
      async run() {
        return { ok: true };
      }
    }
  });

  const first = d.dispatch({ changeId: 'first' });
  // Allow first to enter planning / hold the slot
  await new Promise((r) => setTimeout(r, 10));
  const busy = await d.dispatch({ changeId: 'second' });
  assert.equal(busy.ok, false);
  assert.equal(busy.reason, 'MAX_CONCURRENT_EXCEEDED');
  assert.equal(busy.state, 'BUSY');
  assert.equal(busy.PRODUCTION_READY, 'NO');
  release();
  const done = await first;
  assert.equal(done.ok, true);
});

// ─── AA11 ─────────────────────────────────────────────────────────────────────
test('AA11 handoff receipt chain / custody', async () => {
  const d = dispatcherFor();
  const result = await d.dispatch({ changeId: 'custody-demo' });
  assert.equal(result.ok, true);
  const receipts = d.getReceipts();
  assert.ok(receipts.length >= 3);
  assert.equal(receipts[0].prevHash, '0'.repeat(64));
  for (let i = 1; i < receipts.length; i += 1) {
    assert.equal(receipts[i].prevHash, receipts[i - 1].sha256, `link ${i}`);
    assert.match(receipts[i].sha256, /^[0-9a-f]{64}$/);
  }
  const hos = d.getHandoffs();
  for (const h of hos) {
    assert.equal(h.schemaVersion, '3');
    assert.ok(h.custody);
    assert.match(h.custody.sha256, /^[0-9a-f]{64}$/);
    assert.ok(typeof h.custody.prevHash === 'string');
    assert.match(h.issuedAt, /^\d{4}-\d{2}-\d{2}T/);
  }
  assert.equal(defaultHash('abc').length, 64);
});

// ─── AA12 ─────────────────────────────────────────────────────────────────────
test('AA12 NON-CLAIM source strings', () => {
  const src = fs.readFileSync(DISPATCHER_MODULE, 'utf8');
  assert.match(src, /NON-CLAIM/);
  assert.match(src, /not CloudAgent fleet/);
  assert.match(src, /not unbounded swarm/);
  assert.match(src, /not PRODUCTION_READY/);
  assert.match(src, /eos-multi-agent-swarm-dispatcher/);
  assert.match(src, /BUILDER != VERIFIER|BUILDER_EQUALS_VERIFIER/);
  assert.match(src, /TOKEN_BUDGET_EXCEEDED/);
  assert.match(src, /PRODUCTION_READY: 'NO'|PRODUCTION_READY: NO/);

  const vsrc = fs.readFileSync(VALIDATOR_MODULE, 'utf8');
  assert.match(vsrc, /NON-CLAIM/);
  assert.match(vsrc, /not PRODUCTION_READY/);

  const h = dispatcherFor().health();
  assert.equal(h.notCloudAgentFleet, true);
  assert.equal(h.notUnboundedSwarm, true);
  assert.equal(h.notProductionReady, true);
  assert.equal(h.builderEqualsVerifierForbidden, true);
  assert.equal(h.fundacionDeltaOpened, false);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.unboundedSwarm, false);
  const blob = JSON.stringify(h);
  assert.equal(/PRODUCTION_READY["']?\s*:\s*["']?YES/i.test(blob), false);
});

// ─── AA13 ─────────────────────────────────────────────────────────────────────
test('AA13 missing persona fail-closed', async () => {
  const d = createMultiAgentDispatcher({
    architect: {
      id: 'a',
      async run() {
        return { ok: true, plan: {} };
      }
    }
    // no builder / verifier
  });
  const result = await d.dispatch({ changeId: 'missing' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'MISSING_PERSONA');
  assert.ok(result.missing.includes('builder'));
  assert.ok(result.missing.includes('verifier'));
});

// ─── AA14 ─────────────────────────────────────────────────────────────────────
test('AA14 planner/coder/qa alias dispatch happy path', async () => {
  const d = createMultiAgentDispatcher({
    planner: {
      id: 'planner-x',
      async plan({ change }) {
        return { ok: true, plan: { from: 'planner', id: change.changeId } };
      }
    },
    coder: {
      id: 'coder-x',
      async build({ plan }) {
        return { ok: true, artifact: { built: plan.from } };
      }
    },
    qa: {
      id: 'qa-x',
      async verify({ artifact }) {
        return { ok: artifact?.built === 'planner' };
      }
    }
  });
  const result = await d.run({ changeId: 'alias-run' });
  assert.equal(result.ok, true);
  assert.equal(result.artifact.built, 'planner');
  assert.equal(d.getState().architectId, 'planner-x');
  assert.equal(d.getState().builderId, 'coder-x');
  assert.equal(d.getState().verifierId, 'qa-x');
});

// ─── AA15 ─────────────────────────────────────────────────────────────────────
test('AA15 custody optional + invalid custody rejected', () => {
  const ok = validateAgentHandoffEnvelope(
    validEnvelope({ custody: { prevHash: '0'.repeat(64), sha256: 'a'.repeat(64) } })
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.normalized.custody.prevHash.length, 64);

  const bad = validateAgentHandoffEnvelope(
    validEnvelope({ custody: { prevHash: 123 } })
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes('custody.prevHash')));

  const arr = validateAgentHandoffEnvelope(validEnvelope({ custody: [] }));
  assert.equal(arr.ok, false);
});

// ─── AA16 ─────────────────────────────────────────────────────────────────────
test('AA16 BoundedOutputFilter observeTokens + clamp helpers', () => {
  const f = createBoundedOutputFilter({ budget: 10, used: 8 });
  assert.equal(f.kind, 'eos-bounded-output-filter');
  assert.equal(f.PRODUCTION_READY, 'NO');
  const obs = f.observeTokens({ delta: 3 });
  assert.equal(obs.ok, false);
  assert.equal(obs.reason, 'TOKEN_BUDGET_EXCEEDED');
  f.reset();
  assert.deepEqual(f.getUsage(), { used: 0, budget: 10, remaining: 10 });
  assert.equal(f.estimateTokens('one two three'), 3);
  assert.equal(DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED, 'TOKEN_BUDGET_EXCEEDED');
  assert.equal(DISPATCHER_STATES.IDLE, 'IDLE');
  assert.ok(ACCEPTED_ROLES.includes('PLANNER'));
});
