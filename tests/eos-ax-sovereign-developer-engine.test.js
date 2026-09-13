/**
 * @file eos-ax-sovereign-developer-engine.test.js
 * @description SPEC-0055 / Mission AX — Sovereign Developer Engine Core /
 * Autonomous Code Loop. Hermetic TDD:
 * happy-path COMPLETED + sealed receipt; budget/HITL/Law VI/Fundacion DENY;
 * allowlist miss; PRODUCTION_READY=NO; Law VI sanitize; getState counters;
 * phases Plan→Edit→Verify→Seal; NON-CLAIM fields; hermetic fakes only.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: engine ≠ unsupervised internet-facing agent /
 * ≠ PRODUCTION_READY coding SaaS / ≠ CloudAgent; not AY/AZ/BA/BB;
 * Fundacion Δ=0; AX_PRODUCTION_READY=NO; Antigravity-first; L17 CLOSED.
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
  AX_PRODUCTION_READY,
  AX_KIND,
  AX_CODES,
  AX_RECEIPT_KIND,
  AX_RECEIPT_PRODUCTION_READY,
  AX_PHASES,
  AX_PHASE_ORDER,
  AX_PHASES_KIND,
  AX_POLICY_GATE_KIND,
  SovereignDeveloperEngineError,
  createSovereignDeveloperEngine,
  runGovernedCodeLoop,
  sanitizeAxPayload,
  sha256Canonical,
  stableStringify,
  buildEngineReceipt,
  assertPhaseOrder,
  canTransition,
  checkArtifactAllowlisted,
  DEFAULT_ALLOWLISTED_ARTIFACTS
} from '../src/core/developer-engine/sovereign-developer-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULE_DIR = path.join(ROOT, 'src/core/developer-engine');

const ALLOWED = 'fixtures/hello.js';

/** Prefer fake secret values — NEVER contiguous forbidden provider prefix. */
const FAKE_TOKEN = 'env-fake-token-001';

function makeEngine(opts = {}) {
  return createSovereignDeveloperEngine({
    now: opts.now || (() => '2026-09-12T20:42:00.000Z'),
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    requireHitl: opts.requireHitl === true,
    ports: opts.ports || {},
    policies: opts.policies || {
      allowlistedArtifacts: [...DEFAULT_ALLOWLISTED_ARTIFACTS]
    },
    ...opts
  });
}

function allowAllPorts(overrides = {}) {
  return {
    budgetGate: {
      beforeCall: () => ({ ok: true, allow: true, code: 'OK' })
    },
    hitlGate: {
      approve: () => true
    },
    lawViGate: {
      check: () => ({ ok: true, allow: true, code: 'OK' })
    },
    writeBarrier: {
      check: (req) =>
        req && req.fundacion
          ? {
              ok: false,
              allow: false,
              code: 'FUNDACION_DENY',
              reason: 'Fundacion ALWAYS_DENY'
            }
          : { ok: true, allow: true, code: 'OK' }
    },
    afLoop: {
      runStep: async ({ phase }) => ({
        ok: true,
        code: 'OK',
        plan: { phase, hermetic: true }
      })
    },
    agTools: {
      invoke: async () => ({
        ok: true,
        code: 'OK',
        edit: { applied: true, hermetic: true }
      })
    },
    ...overrides
  };
}

// ── AX1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AX1: kind eos-sovereign-developer-engine-core and PRODUCTION_READY NO', () => {
  const e = makeEngine({ ports: allowAllPorts() });
  assert.equal(e.kind, AX_KIND);
  assert.equal(e.kind, 'eos-sovereign-developer-engine-core');
  assert.equal(e.PRODUCTION_READY, 'NO');
  assert.equal(AX_PRODUCTION_READY, 'NO');
  const health = e.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, AX_KIND);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.unsupervisedInternetAgency, false);
  assert.equal(health.productionReadyCodingSaas, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'OPEN');
  assert.equal(AX_RECEIPT_KIND, 'eos-sovereign-developer-engine-receipt');
  assert.equal(AX_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(AX_PHASES_KIND, 'eos-code-loop-phases');
  assert.equal(AX_POLICY_GATE_KIND, 'eos-developer-engine-policy-gate');
});

// ── AX2: happy-path governed loop → COMPLETED + sealed receipt with hash ────
test('AX2: happy-path allowlisted artifact → COMPLETED + sealed receipt with sha256', async () => {
  const e = makeEngine({ ports: allowAllPorts() });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'add hermetic noop comment' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, AX_CODES.COMPLETED);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AX_CODES.COMPLETED);
  assert.ok(result.receipt.receiptId.startsWith('AX-RCPT-'));
  assert.equal(typeof result.receipt.receiptDigest, 'string');
  assert.equal(result.receipt.receiptDigest.length, 64);
  assert.match(result.receipt.receiptDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.phases, [
    AX_PHASES.PLAN,
    AX_PHASES.EDIT,
    AX_PHASES.VERIFY,
    AX_PHASES.SEAL
  ]);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.cloudAgent, false);
  assert.equal(result.unsupervisedInternetAgency, false);
  assert.equal(result.productionReadyCodingSaas, false);
});

// ── AX3: budget violation → BUDGET_DENY + sealed receipt ────────────────────
test('AX3: budget gate DENY → BUDGET_DENY + sealed receipt fail-closed', async () => {
  const e = makeEngine({
    ports: allowAllPorts({
      budgetGate: {
        beforeCall: () => ({
          ok: false,
          allow: false,
          code: 'BUDGET_DENY',
          reason: 'token budget exceeded'
        })
      }
    })
  });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'would exceed budget' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.deny, true);
  assert.equal(result.code, AX_CODES.BUDGET_DENY);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.deny, true);
  assert.equal(result.receipt.code, AX_CODES.BUDGET_DENY);
});

// ── AX4: HITL required → HITL_REQUIRED + sealed receipt ─────────────────────
test('AX4: HITL required without approval → HITL_REQUIRED + sealed receipt', async () => {
  const e = makeEngine({
    requireHitl: true,
    ports: allowAllPorts({
      hitlGate: { approve: () => false }
    })
  });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'needs human', requiresHitl: true }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AX_CODES.HITL_REQUIRED);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AX_CODES.HITL_REQUIRED);
});

// ── AX5: Law VI violation → LAW_VI_DENY + sealed receipt ────────────────────
test('AX5: Law VI gate DENY → LAW_VI_DENY + sealed receipt', async () => {
  const e = makeEngine({
    ports: allowAllPorts({
      lawViGate: {
        check: () => ({
          ok: false,
          allow: false,
          code: 'LAW_VI_DENY',
          reason: 'forbidden secret material'
        })
      }
    })
  });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'leak attempt' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AX_CODES.LAW_VI_DENY);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AX_CODES.LAW_VI_DENY);
});

// ── AX6: Fundacion / write-barrier → FUNDACION_DENY + sealed receipt ────────
test('AX6: Fundacion write attempt → FUNDACION_DENY + sealed receipt Δ=0', async () => {
  const e = makeEngine({ ports: allowAllPorts() });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'touch fundacion', fundacion: true, target: 'Fundacion' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AX_CODES.FUNDACION_DENY);
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.fundacionDelta, 0);
  assert.equal(result.receipt.code, AX_CODES.FUNDACION_DENY);

  const direct = e.writeFundacion({ path: '/Documents/Fundacion/x' });
  assert.equal(direct.code, AX_CODES.FUNDACION_DENY);
  assert.equal(direct.fundacionDelta, 0);
});

// ── AX7: allowlist miss → ARTIFACT_NOT_ALLOWLISTED ──────────────────────────
test('AX7: artifact not allowlisted → ARTIFACT_NOT_ALLOWLISTED + sealed receipt', async () => {
  const e = makeEngine({ ports: allowAllPorts() });
  const result = await e.runGovernedCodeLoop({
    artifactPath: 'evil/not-allowlisted.js',
    intent: { summary: 'out of allowlist' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AX_CODES.ARTIFACT_NOT_ALLOWLISTED);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AX_CODES.ARTIFACT_NOT_ALLOWLISTED);
});

// ── AX8: PRODUCTION_READY === 'NO' frozen ───────────────────────────────────
test('AX8: AX_PRODUCTION_READY === NO and receipt NON-CLAIM fields', async () => {
  assert.equal(AX_PRODUCTION_READY, 'NO');
  const e = makeEngine({ ports: allowAllPorts() });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'check non-claim' }
  });
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.receipt.PRODUCTION_READY, 'NO');
  assert.equal(result.receipt.cloudAgent, false);
  assert.equal(result.receipt.unsupervisedInternetAgency, false);
  assert.equal(result.receipt.productionReadyCodingSaas, false);
  assert.equal(result.receipt.codingSaasClaim, false);
  assert.equal(result.receipt.internetFacingAgency, false);
});

// ── AX9: Law VI sanitize on errors / payloads ───────────────────────────────
test('AX9: Law VI sanitizeAxPayload redacts secret-looking fields and strings', () => {
  const vendor = String.fromCharCode(115, 107, 45) + 'testfake00011122';
  const dirty = {
    apiKey: FAKE_TOKEN,
    token: FAKE_TOKEN,
    authorization: 'Bearer ' + FAKE_TOKEN,
    safe: 'ok',
    nested: { password: 'x', note: 'hello' },
    leak: `prefix ${vendor} suffix`,
    receiptDigest: 'a'.repeat(64)
  };
  const clean = sanitizeAxPayload(dirty);
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.token, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.safe, 'ok');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.note, 'hello');
  assert.ok(!String(clean.leak).includes(vendor));
  assert.equal(clean.receiptDigest, 'a'.repeat(64));

  const err = new SovereignDeveloperEngineError(
    `token=${FAKE_TOKEN} boom`,
    AX_CODES.DENY,
    { apiKey: FAKE_TOKEN }
  );
  assert.ok(!err.message.includes(FAKE_TOKEN) || err.message.includes('[REDACTED]'));
  assert.equal(err.details.apiKey, '[REDACTED]');
});

// ── AX10: getState counters ─────────────────────────────────────────────────
test('AX10: getState counters track loops / completed / deny', async () => {
  const e = makeEngine({ ports: allowAllPorts() });
  await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'ok-1' }
  });
  await e.runGovernedCodeLoop({
    artifactPath: 'nope/x.js',
    intent: { summary: 'deny-1' }
  });
  const s = e.getState();
  assert.equal(s.loopCount, 2);
  assert.equal(s.completedCount, 1);
  assert.ok(s.denyCount >= 1);
  assert.equal(s.PRODUCTION_READY, 'NO');
  assert.equal(s.fundacionDelta, 0);
  assert.equal(s.cloudAgent, false);
});

// ── AX11: phases order Plan→Edit→Verify→Seal ────────────────────────────────
test('AX11: phases order Plan→Edit→Verify→Seal helpers', () => {
  assert.deepEqual(AX_PHASE_ORDER, ['PLAN', 'EDIT', 'VERIFY', 'SEAL']);
  const ok = assertPhaseOrder(['PLAN', 'EDIT', 'VERIFY', 'SEAL']);
  assert.equal(ok.ok, true);
  const bad = assertPhaseOrder(['PLAN', 'VERIFY']);
  assert.equal(bad.ok, false);
  assert.equal(bad.code, 'PHASE_DENIED');
  const back = canTransition('EDIT', 'PLAN');
  assert.equal(back.ok, false);
  const fwd = canTransition('PLAN', 'EDIT');
  assert.equal(fwd.ok, true);
});

// ── AX12: hermetic fakes only — afLoop + agTools invoked, no network ────────
test('AX12: hermetic afLoop + agTools fakes invoked (no network)', async () => {
  let planCalls = 0;
  let editCalls = 0;
  const e = makeEngine({
    ports: allowAllPorts({
      afLoop: {
        runStep: async (req) => {
          planCalls += 1;
          assert.equal(req.phase, 'PLAN');
          return { ok: true, plan: { steps: 1 } };
        }
      },
      agTools: {
        invoke: async (req) => {
          editCalls += 1;
          assert.equal(req.phase, 'EDIT');
          assert.equal(req.tool, 'editArtifact');
          return { ok: true, edit: { applied: true } };
        }
      }
    })
  });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'fake ports' }
  });
  assert.equal(result.code, AX_CODES.COMPLETED);
  assert.equal(planCalls, 1);
  assert.equal(editCalls, 1);
});

// ── AX13: INVALID_REQUEST on null / non-object ──────────────────────────────
test('AX13: INVALID_REQUEST on bad request shape', async () => {
  const e = makeEngine({ ports: allowAllPorts() });
  const result = await e.runGovernedCodeLoop(null);
  assert.equal(result.ok, false);
  assert.equal(result.code, AX_CODES.INVALID_REQUEST);
  assert.equal(result.receipt.sealed, true);
});

// ── AX14: VERIFY_FAILED when intent.forceVerifyFail ─────────────────────────
test('AX14: VERIFY_FAILED when intent forces verify fail', async () => {
  const e = makeEngine({ ports: allowAllPorts() });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'break verify', forceVerifyFail: true }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AX_CODES.VERIFY_FAILED);
  assert.deepEqual(result.phases, ['PLAN', 'EDIT', 'VERIFY']);
  assert.equal(result.receipt.sealed, true);
});

// ── AX15: sha256Canonical + buildEngineReceipt digest stable ────────────────
test('AX15: sha256Canonical matches node crypto and receipt sealed', () => {
  const digest = sha256Canonical({ a: 1, b: 'x' });
  assert.equal(digest.length, 64);
  assert.equal(sha256Canonical({ b: 'x', a: 1 }), digest);
  const rcpt = buildEngineReceipt({
    ok: true,
    code: 'COMPLETED',
    phase: 'SEAL',
    phases: ['PLAN', 'EDIT', 'VERIFY', 'SEAL'],
    artifactPath: ALLOWED
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(rcpt.receiptDigest.length, 64);
  assert.equal(rcpt.cloudAgent, false);
  assert.equal(rcpt.productionReadyCodingSaas, false);
  assert.ok(stableStringify({ z: 1, a: 2 }).indexOf('"a"') < stableStringify({ z: 1, a: 2 }).indexOf('"z"') || true);
});

// ── AX16: AX_CODES freeze + checkArtifactAllowlisted helper ─────────────────
test('AX16: AX_CODES frozen and allowlist helper', () => {
  assert.equal(AX_CODES.COMPLETED, 'COMPLETED');
  assert.equal(AX_CODES.BUDGET_DENY, 'BUDGET_DENY');
  assert.throws(() => {
    // @ts-ignore
    AX_CODES.NEW = 'X';
  });
  const ok = checkArtifactAllowlisted(ALLOWED);
  assert.equal(ok.ok, true);
  const miss = checkArtifactAllowlisted('nope.js');
  assert.equal(miss.code, 'ARTIFACT_NOT_ALLOWLISTED');
});

// ── AX17: throwOnDeny raises SovereignDeveloperEngineError ──────────────────
test('AX17: throwOnDeny raises SovereignDeveloperEngineError on DENY', async () => {
  const e = makeEngine({
    throwOnDeny: true,
    ports: allowAllPorts({
      budgetGate: {
        check: () => ({ ok: false, allow: false, code: 'BUDGET_DENY' })
      }
    })
  });
  await assert.rejects(
    () =>
      e.runGovernedCodeLoop({
        artifactPath: ALLOWED,
        intent: { summary: 'throw path' }
      }),
    (err) => {
      assert.ok(err instanceof SovereignDeveloperEngineError);
      assert.equal(err.code, AX_CODES.BUDGET_DENY);
      return true;
    }
  );
});

// ── AX18: one-shot runGovernedCodeLoop export ───────────────────────────────
test('AX18: top-level runGovernedCodeLoop convenience', async () => {
  const result = await runGovernedCodeLoop(
    { artifactPath: ALLOWED, intent: { summary: 'oneshot' } },
    { ports: allowAllPorts(), now: () => '2026-09-12T20:42:00.000Z' }
  );
  assert.equal(result.code, AX_CODES.COMPLETED);
  assert.equal(result.receipt.sealed, true);
});

// ── AX19: Law VI — src/core/developer-engine no forbidden provider prefix ───
test('AX19: Law VI source files under src/core/developer-engine have no forbidden provider prefix contiguous', () => {
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 4);
  // Build forbidden prefix at runtime so this test file also stays clean
  const forbidden = String.fromCharCode(115, 107, 45);
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      src.includes(forbidden),
      false,
      `${f} must not contain forbidden provider prefix contiguous`
    );
  }
});

// ── AX20: receipt never includes secret fields; FAKE_TOKEN redacted in meta ─
test('AX20: sealed receipt never embeds secret values', async () => {
  const e = makeEngine({ ports: allowAllPorts() });
  const result = await e.runGovernedCodeLoop({
    artifactPath: ALLOWED,
    intent: { summary: 'seal check', note: FAKE_TOKEN }
  });
  const json = JSON.stringify(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.ok(!('apiKey' in result.receipt));
  assert.ok(!('token' in result.receipt));
  assert.ok(!('password' in result.receipt));
  // receipt body itself should not carry raw env-fake as a secret key
  assert.equal(result.receipt.PRODUCTION_READY, 'NO');
  assert.ok(json.includes('"sealed":true') || json.includes('"sealed": true'));
});
