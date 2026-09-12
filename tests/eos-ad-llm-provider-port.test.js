/**
 * @file eos-ad-llm-provider-port.test.js
 * @description SPEC-0035 / Mission AD — LLM Provider Port & Model Routing.
 * Hermetic TDD: fake provider + fail-closed stubs; no real network;
 * Law VI secret redaction; never touch real Fundacion.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-llm-provider-port only.
 * live LLM ≠ PRODUCTION_READY; keys never in repo; not AE/AF/AG/AH.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LLM_PRODUCTION_READY,
  LLM_KIND,
  LLM_CODES,
  LLM_PROVIDER_IDS,
  LLM_ENV_KEYS,
  LlmProviderPortError,
  createLlmProviderPort,
  createFakeLlmProvider,
  createModelRouter,
  sanitizeLlmPayload,
  ModelRouterError,
  ROUTING_CODES,
  parseRoutingYaml,
  loadRoutingSsot
} from '../src/core/llm/llm-provider-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAYLOAD_ROOT = path.resolve(__dirname, '..');
const ROUTING_PATH = path.join(
  PAYLOAD_ROOT,
  'docs',
  'model-routing',
  'MODEL_ROUTING.md'
);
const MODULE_PATH = path.resolve(
  __dirname,
  '../src/core/llm/llm-provider-port.js'
);

const MINIMAL_SSOT = `---
# inline
\`\`\`yaml
default: fake
fallbacks:
  - ollama
  - openai
intents:
  chat:
    - fake
    - openai
  codegen:
    - anthropic
    - fake
\`\`\`
`;

function port(opts = {}) {
  return createLlmProviderPort({
    routingMarkdown: MINIMAL_SSOT,
    env: {},
    allowNetwork: false,
    ...opts
  });
}

// ── AD1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AD1: kind eos-llm-provider-port and PRODUCTION_READY NO', () => {
  assert.equal(LLM_PRODUCTION_READY, 'NO');
  assert.equal(LLM_KIND, 'eos-llm-provider-port');
  const p = port();
  assert.equal(p.kind, LLM_KIND);
  assert.equal(p.PRODUCTION_READY, 'NO');
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /PRODUCTION_READY:\s*NO/);
  assert.match(src, /live LLM|liveLlmNotProductionReady|NON-CLAIM/i);
});

// ── AD2: fake complete OK ───────────────────────────────────────────────────
test('AD2: fake complete returns deterministic OK', async () => {
  const p = port();
  const out = await p.complete({
    intent: 'hermetic',
    prompt: 'hello-ad',
    preferred: 'fake'
  });
  assert.equal(out.ok, true);
  assert.equal(out.code, LLM_CODES.COMPLETED);
  assert.equal(out.provider, 'fake');
  assert.equal(out.result.ok, true);
  assert.match(String(out.result.text), /fake/);
  assert.equal(out.PRODUCTION_READY, 'NO');
});

// ── AD3: FakeLlmProvider standalone ─────────────────────────────────────────
test('AD3: createFakeLlmProvider hermetic health/state', async () => {
  const fake = createFakeLlmProvider({ defaultResponse: 'ping' });
  assert.equal(fake.id, 'fake');
  assert.equal(fake.PRODUCTION_READY, 'NO');
  const h = await fake.health();
  assert.equal(h.hermetic, true);
  assert.equal(h.network, false);
  const r = await fake.complete({ prompt: 'x', intent: 't' });
  assert.equal(r.ok, true);
  assert.equal(fake.getState().completeCount, 1);
});

// ── AD4: missing env fail-closed ────────────────────────────────────────────
test('AD4: missing env → MISSING_PROVIDER_CREDENTIAL fail-closed', async () => {
  const p = port({
    env: {},
    routingConfig: {
      default: 'openai',
      fallbacks: [],
      intents: {}
    }
  });
  await assert.rejects(
    () => p.complete({ provider: 'openai', prompt: 'x', fallback: false }),
    (err) => {
      assert.ok(err instanceof LlmProviderPortError);
      assert.equal(err.code, LLM_CODES.MISSING_PROVIDER_CREDENTIAL);
      return true;
    }
  );
});

// ── AD5: unknown provider DENY ──────────────────────────────────────────────
test('AD5: unknown provider → UNKNOWN_PROVIDER DENY', async () => {
  const p = port();
  await assert.rejects(
    () => p.complete({ provider: 'not-a-vendor', prompt: 'x' }),
    (err) => {
      assert.ok(err instanceof LlmProviderPortError);
      assert.equal(err.code, LLM_CODES.UNKNOWN_PROVIDER);
      return true;
    }
  );
  assert.throws(
    () => p.resolveRoute({ preferred: 'totally-unknown-xyz' }),
    (err) => err.code === LLM_CODES.UNKNOWN_PROVIDER
  );
});

// ── AD6: routing SSOT resolve from file ─────────────────────────────────────
test('AD6: MODEL_ROUTING.md SSOT loads and resolveRoute orders providers', () => {
  assert.ok(fs.existsSync(ROUTING_PATH), 'SSOT file must exist in payload');
  const loaded = loadRoutingSsot({ routingPath: ROUTING_PATH });
  assert.equal(loaded.config.default, 'fake');
  assert.ok(Array.isArray(loaded.config.fallbacks));
  assert.ok(loaded.config.fallbacks.length >= 1);

  const p = createLlmProviderPort({
    routingPath: ROUTING_PATH,
    env: {}
  });
  const route = p.resolveRoute({ intent: 'chat' });
  assert.equal(route.ok, true);
  assert.equal(route.providers[0], 'fake');
  assert.ok(route.providers.includes('openai'));
  assert.equal(route.PRODUCTION_READY, 'NO');
});

// ── AD7: preferred prepend + fallback chain ─────────────────────────────────
test('AD7: preferred prepends; fallback skips failed provider', async () => {
  const p = port({
    env: {},
    routingConfig: {
      default: 'openai',
      fallbacks: ['fake'],
      intents: {
        chat: ['openai', 'fake']
      }
    }
  });
  const route = p.resolveRoute({ intent: 'chat', preferred: 'fake' });
  assert.equal(route.providers[0], 'fake');
  assert.equal(route.preferredApplied, true);

  // openai missing creds → fallback to fake
  const out = await p.complete({ intent: 'chat', prompt: 'fb' });
  assert.equal(out.ok, true);
  assert.equal(out.provider, 'fake');
  assert.ok(out.failures?.some((f) => f.provider === 'openai'));
});

// ── AD8: ALL_PROVIDERS_FAILED when chain exhausts ───────────────────────────
test('AD8: exhaust chain → ALL_PROVIDERS_FAILED', async () => {
  const p = port({
    env: {},
    routingConfig: {
      default: 'openai',
      fallbacks: ['anthropic'],
      intents: {}
    }
  });
  await assert.rejects(
    () => p.complete({ intent: 'default', prompt: 'nope' }),
    (err) => {
      assert.equal(err.code, LLM_CODES.ALL_PROVIDERS_FAILED);
      assert.ok(Array.isArray(err.details.failures));
      assert.ok(err.details.failures.length >= 2);
      return true;
    }
  );
});

// ── AD9: Law VI redact secrets in sanitize + errors + getState ──────────────
test('AD9: sanitizeLlmPayload redacts apiKey/token/authorization', () => {
  // Build synthetic secret-shaped strings at runtime (no sk- literals in source).
  const synth = (n) => ['sk', 'X'.repeat(n)].join('-');
  const dirty = {
    apiKey: synth(32),
    token: 'super-secret-token-value-xxxxxx',
    authorization: 'Bearer ' + synth(28),
    nested: { password: 'hunter2-not-real', ok: true },
    prompt: 'safe text'
  };
  const clean = sanitizeLlmPayload(dirty);
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.token, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.ok, true);
  assert.equal(clean.prompt, 'safe text');
  // original untouched
  assert.ok(dirty.apiKey.startsWith('sk' + '-'));

  const err = new LlmProviderPortError(
    'failed ' + ['api', 'key'].join('_') + '=' + synth(16) + ' authorization=Bearer ZZZ',
    LLM_CODES.DENY,
    { apiKey: synth(24) }
  );
  assert.equal(err.message.includes(synth(16)), false);
  assert.equal(err.details.apiKey, '[REDACTED]');

  const p = port();
  const st = p.getState();
  const dumped = JSON.stringify(st);
  assert.doesNotMatch(dumped, /sk-[A-Za-z0-9]{8,}/);
  assert.ok(st.envKeyNames.openai.includes('OPENAI_API_KEY'));
});

// ── AD10: health / getState / listProviders ─────────────────────────────────
test('AD10: health, getState, listProviders surface', async () => {
  const p = port();
  const ids = p.listProviders().map((x) => x.id);
  for (const id of LLM_PROVIDER_IDS) {
    assert.ok(ids.includes(id), `missing provider ${id}`);
  }
  const h = await p.health();
  assert.equal(h.kind, LLM_KIND);
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.nonClaim.keysNeverInRepo, true);
  assert.equal(h.providers.fake.ok, true);

  const st = p.getState();
  assert.equal(st.kind, LLM_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.allowNetwork, false);
  assert.deepEqual(st.envKeyNames.anthropic, ['ANTHROPIC_API_KEY']);
});

// ── AD11: ROUTING_SSOT_INVALID fail-closed ──────────────────────────────────
test('AD11: malformed SSOT → ROUTING_SSOT_INVALID', () => {
  assert.throws(
    () =>
      createLlmProviderPort({
        routingMarkdown: '# no fence\n| nope |',
        env: {}
      }),
    (err) =>
      err instanceof LlmProviderPortError &&
      err.code === LLM_CODES.ROUTING_SSOT_INVALID
  );
  assert.throws(
    () => parseRoutingYaml('fallbacks:\n  - fake\n'),
    (err) =>
      err instanceof ModelRouterError &&
      err.code === ROUTING_CODES.ROUTING_SSOT_INVALID
  );
});

// ── AD12: stub with env still PROVIDER_UNAVAILABLE (no network) ─────────────
test('AD12: stub with env present still fail-closed (no network in AD)', async () => {
  const synthKey = ['sk', 'TESTONLY', 'NOT', 'A', 'REAL', 'KEY', '0000'].join('-');
  const p = port({
    env: { OPENAI_API_KEY: synthKey },
    routingConfig: { default: 'openai', fallbacks: [], intents: {} }
  });
  await assert.rejects(
    () => p.complete({ provider: 'openai', prompt: 'x', fallback: false }),
    (err) => err.code === LLM_CODES.PROVIDER_UNAVAILABLE
  );
  // ensure key never leaked into error message
  await assert.rejects(
    () => p.complete({ provider: 'openai', prompt: 'x', fallback: false }),
    (err) => {
      assert.equal(err.message.includes('TESTONLY'), false);
      assert.equal(err.message.includes(synthKey), false);
      return true;
    }
  );
});

// ── AD13: injectable custom adapter map ─────────────────────────────────────
test('AD13: injectable providers map overrides complete path', async () => {
  let hits = 0;
  const custom = {
    id: 'openai',
    kind: 'test-openai',
    PRODUCTION_READY: 'NO',
    async complete(req) {
      hits += 1;
      return {
        ok: true,
        text: `custom:${req.prompt}`,
        provider: 'openai'
      };
    },
    async health() {
      return { ok: true, provider: 'openai' };
    },
    getState() {
      return { provider: 'openai', hits };
    }
  };
  const p = port({
    providers: { openai: custom },
    routingConfig: {
      default: 'openai',
      fallbacks: ['fake'],
      intents: {}
    }
  });
  const out = await p.complete({ provider: 'openai', prompt: 'inject' });
  assert.equal(out.ok, true);
  assert.equal(out.provider, 'openai');
  assert.equal(out.result.text, 'custom:inject');
  assert.equal(hits, 1);
});

// ── AD14: model-router getConfig + env key docs ─────────────────────────────
test('AD14: model-router getConfig + LLM_ENV_KEYS documented names only', () => {
  const r = createModelRouter({ routingMarkdown: MINIMAL_SSOT });
  const cfg = r.getConfig();
  assert.equal(cfg.default, 'fake');
  assert.deepEqual(cfg.intents.chat.slice(0, 2), ['fake', 'openai']);
  assert.equal(cfg.PRODUCTION_READY, 'NO');

  assert.deepEqual(LLM_ENV_KEYS.openai, ['OPENAI_API_KEY']);
  assert.deepEqual(LLM_ENV_KEYS.gemini, ['GEMINI_API_KEY', 'GOOGLE_API_KEY']);
  assert.deepEqual(LLM_ENV_KEYS.ollama, ['OLLAMA_BASE_URL']);
  assert.deepEqual(LLM_ENV_KEYS.fake, []);

  // Source honesty: module must not hardcode sk- live secrets
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.doesNotMatch(src, /sk-[a-zA-Z0-9]{20,}/);
  assert.match(src, /OPENAI_API_KEY/);
  assert.match(src, /ANTHROPIC_API_KEY/);
});

// ── AD15: ollama missing URL → MISSING / unavailable ────────────────────────
test('AD15: ollama without OLLAMA_BASE_URL fail-closed', async () => {
  const p = port({
    env: {},
    routingConfig: { default: 'ollama', fallbacks: [], intents: {} }
  });
  await assert.rejects(
    () => p.complete({ provider: 'ollama', prompt: 'x', fallback: false }),
    (err) => err.code === LLM_CODES.MISSING_PROVIDER_CREDENTIAL
  );
});
