import test from 'node:test';
import assert from 'node:assert/strict';
import { RealProviderAdapterEngine } from '../scripts/engine/real-provider-adapter-engine.js';

test('GAP-PRV-001: Provider Engine executes successfully with primary provider (Anthropic)', async () => {
  const engine = new RealProviderAdapterEngine();

  const res = await engine.executeWithFallback({
    preferredProvider: 'ANTHROPIC',
    payload: { prompt: 'Design an accessible modal architecture' }
  });

  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.providerUsed, 'ANTHROPIC');
  assert.equal(res.attemptNumber, 1);
  assert.ok(res.evidencePayload.evidenceHash.length === 64);
  assert.ok(res.evidencePayload.costUsd >= 0);
});

test('GAP-PRV-001: Automatic fallback to Secondary (Gemini) when Primary (Anthropic) rate limits (429)', async () => {
  const engine = new RealProviderAdapterEngine();

  // Simulate Anthropic failing with rate limit
  const simulatedExecutor = async (provider, payload, attempt) => {
    if (provider === 'ANTHROPIC') {
      const err = new Error('Rate limit exceeded');
      err.code = 'RATE_LIMIT';
      throw err;
    }
    return {
      response: 'Gemini synthesis response',
      tokensUsed: { input: 200, output: 600 }
    };
  };

  const res = await engine.executeWithFallback({
    preferredProvider: 'ANTHROPIC',
    maxRetries: 1,
    payload: { prompt: 'Analyze system boundaries' }
  }, simulatedExecutor);

  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.providerUsed, 'GEMINI');
  assert.equal(res.fallbackLog.length, 1);
  assert.equal(res.fallbackLog[0].provider, 'ANTHROPIC');
  assert.equal(res.fallbackLog[0].code, 'RATE_LIMIT');
});

test('GAP-PRV-001: Auth failure trips Circuit Breaker to OPEN immediately and bypasses retries', async () => {
  const engine = new RealProviderAdapterEngine();

  const simulatedExecutor = async (provider, payload, attempt) => {
    if (provider === 'ANTHROPIC') {
      const err = new Error('Invalid API key');
      err.code = 'AUTH_FAILURE';
      throw err;
    }
    return { response: 'Fallback success' };
  };

  const res = await engine.executeWithFallback({
    preferredProvider: 'ANTHROPIC',
    maxRetries: 3
  }, simulatedExecutor);

  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.providerUsed, 'GEMINI');

  // Verify Anthropic circuit is now OPEN
  const status = engine.getCircuitStatus('ANTHROPIC');
  assert.equal(status.state, 'OPEN');
});

test('GAP-PRV-001: Secret Scrubbing boundary redacts API tokens and passwords from payload', () => {
  const engine = new RealProviderAdapterEngine();

  const payload = {
    task: 'Deploy agent',
    apiKey: 'sk-ant-live-secret-123456',
    nested: {
      authorization: 'Bearer secret_token_xyz',
      user: 'admin',
      password: 'SuperSecretPassword'
    }
  };

  const scrubbed = engine.scrubSecrets(payload);

  assert.equal(scrubbed.apiKey, '[REDACTED_BY_EOS_SECRET_BOUNDARY]');
  assert.equal(scrubbed.nested.authorization, '[REDACTED_BY_EOS_SECRET_BOUNDARY]');
  assert.equal(scrubbed.nested.password, '[REDACTED_BY_EOS_SECRET_BOUNDARY]');
  assert.equal(scrubbed.nested.user, 'admin');
  assert.equal(scrubbed.task, 'Deploy agent');
});

test('GAP-PRV-001: All providers failing emits structured CIRCUIT_EXHAUSTED verdict with audit trail', async () => {
  const engine = new RealProviderAdapterEngine();

  const simulatedFailAll = async () => {
    const err = new Error('Service Unavailable');
    err.code = 'SERVICE_UNAVAILABLE';
    throw err;
  };

  const res = await engine.executeWithFallback({
    preferredProvider: 'ANTHROPIC',
    maxRetries: 1
  }, simulatedFailAll);

  assert.equal(res.status, 'ALL_PROVIDERS_FAILED');
  assert.equal(res.error.code, 'CIRCUIT_EXHAUSTED');
  assert.equal(res.fallbackLog.length, 4); // Anthropic, Gemini, OpenAI, Local
});
