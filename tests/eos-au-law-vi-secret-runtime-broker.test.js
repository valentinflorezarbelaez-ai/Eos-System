/**
 * @file eos-au-law-vi-secret-runtime-broker.test.js
 * @description SPEC-0052 / Mission AU — Law VI Secret Runtime Broker / Env Gate.
 * Hermetic TDD: inject from env → adapter; MISSING_ENV; adapter/env
 * allowlist DENY; SECRET_LEAK_FORBIDDEN for EVD/federation/repo;
 * sanitize/redact; PRODUCTION_READY=NO; Fundacion ALWAYS_DENY; Law VI
 * source scan (no forbidden provider prefix contiguous in src).
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals — prefer fake env values like env-fake-token-001;
 * if redaction of vendor-shape is tested, build prefix via char codes.
 *
 * NON-CLAIM: broker ≠ vault/KMS/secret-manager SaaS/cloud IAM;
 * not AV/AW; Fundacion Δ=0; AU_PRODUCTION_READY=NO; Antigravity-first.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AU_PRODUCTION_READY,
  AU_KIND,
  AU_CODES,
  AU_RECEIPT_KIND,
  AU_RECEIPT_PRODUCTION_READY,
  AU_ENV_GATE_KIND,
  AU_LEAK_GUARD_KIND,
  SecretRuntimeBrokerError,
  createSecretRuntimeBroker,
  createEnvGate,
  createSecretLeakGuard,
  sanitizeAuPayload,
  defaultHash,
  stableStringify,
  buildBrokerReceipt,
  hashSecretPresence,
  vendorKeyPrefix,
  guardPersistAttempt,
  containsSecretMaterial
} from '../src/core/secrets/secret-runtime-broker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SECRETS_DIR = path.join(ROOT, 'src/core/secrets');

const FAKE_TOKEN = 'env-fake-token-001';
const FAKE_TOKEN_B = 'env-fake-token-002';

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 * Prefer not using this in happy-path fixtures; reserved for redaction tests.
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  return String.fromCharCode(115, 107, 45) + suffix;
}

function makeBroker(opts = {}) {
  return createSecretRuntimeBroker({
    env: opts.env || {
      EOS_PROVIDER_TOKEN_A: FAKE_TOKEN,
      EOS_FAKE_PROVIDER_ENV: FAKE_TOKEN_B
    },
    allowlistedEnvKeys: opts.allowlistedEnvKeys,
    allowlistedAdapters: opts.allowlistedAdapters,
    hash: opts.hash || defaultHash,
    now: opts.now || (() => '2026-09-12T09:40:00.000Z'),
    throwOnDeny: opts.throwOnDeny === true,
    requireEnv: opts.requireEnv !== false,
    envGate: opts.envGate
  });
}

function makeFakeAdapter() {
  /** @type {{ lastSecret: string|null, receiveSecret: Function }} */
  const adapter = {
    lastSecret: null,
    receiveSecret(value) {
      adapter.lastSecret = value;
    }
  };
  return adapter;
}

// ── AU1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AU1: kind eos-law-vi-secret-runtime-broker and PRODUCTION_READY NO', () => {
  const b = makeBroker();
  assert.equal(b.kind, AU_KIND);
  assert.equal(b.kind, 'eos-law-vi-secret-runtime-broker');
  assert.equal(b.PRODUCTION_READY, 'NO');
  assert.equal(AU_PRODUCTION_READY, 'NO');
  const health = b.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, AU_KIND);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.vaultClaim, false);
  assert.equal(health.kmsClaim, false);
  assert.equal(health.secretManagerClaim, false);
  assert.equal(health.cloudIamClaim, false);
  assert.equal(AU_RECEIPT_KIND, 'eos-law-vi-broker-receipt');
  assert.equal(AU_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(AU_ENV_GATE_KIND, 'eos-law-vi-env-gate');
  assert.equal(AU_LEAK_GUARD_KIND, 'eos-law-vi-secret-leak-guard');
});

// ── AU2: inject from hermetic env → allowlisted adapter; secret not in receipt
test('AU2: inject from hermetic env to allowlisted adapter; secret never in receipt', () => {
  const b = makeBroker();
  const adapter = makeFakeAdapter();
  const result = b.injectToAdapter(
    'adapter-provider-a',
    'EOS_PROVIDER_TOKEN_A',
    adapter
  );
  assert.equal(result.ok, true);
  assert.equal(result.code, AU_CODES.OK);
  assert.equal(adapter.lastSecret, FAKE_TOKEN);
  assert.equal(result.present, true);
  assert.ok(result.envValueHash);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.ok, true);
  // Secret must never appear in receipt
  const dumped = JSON.stringify(result.receipt);
  assert.equal(dumped.includes(FAKE_TOKEN), false);
  assert.equal(result.receipt.value, undefined);
  assert.equal(result.value, undefined);
  assert.equal(result.receipt.envKeyPresent, true);
  assert.equal(result.receipt.secretPresent, true);
});

// ── AU3: missing env → MISSING_ENV DENY ─────────────────────────────────────
test('AU3: missing env value yields MISSING_ENV DENY with sealed receipt', () => {
  const b = makeBroker({
    env: {
      // allowlisted key absent
      EOS_PROVIDER_TOKEN_B: ''
    }
  });
  const result = b.injectToAdapter(
    'adapter-provider-b',
    'EOS_PROVIDER_TOKEN_B'
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, AU_CODES.MISSING_ENV);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.deny, true);
  assert.equal(result.receipt.code, AU_CODES.MISSING_ENV);
});

// ── AU4: unknown adapter → ADAPTER_NOT_ALLOWLISTED ──────────────────────────
test('AU4: unknown adapter yields ADAPTER_NOT_ALLOWLISTED', () => {
  const b = makeBroker();
  const result = b.injectToAdapter(
    'adapter-unknown-evil',
    'EOS_PROVIDER_TOKEN_A'
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, AU_CODES.ADAPTER_NOT_ALLOWLISTED);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AU_CODES.ADAPTER_NOT_ALLOWLISTED);
});

// ── AU5: unknown env key → ENV_KEY_NOT_ALLOWLISTED ──────────────────────────
test('AU5: unknown env key yields ENV_KEY_NOT_ALLOWLISTED', () => {
  const b = makeBroker({
    env: { NOT_ALLOWLISTED_SECRET: FAKE_TOKEN }
  });
  const result = b.resolveSecret('NOT_ALLOWLISTED_SECRET');
  assert.equal(result.ok, false);
  assert.equal(result.code, AU_CODES.ENV_KEY_NOT_ALLOWLISTED);
  assert.equal(result.receipt.sealed, true);
});

// ── AU6: put secret into EVD body → SECRET_LEAK_FORBIDDEN ───────────────────
test('AU6: attempt put secret into EVD body → SECRET_LEAK_FORBIDDEN + sealed receipt', () => {
  const b = makeBroker();
  const result = b.attemptPersist({
    intent: 'persist',
    target: { kind: 'evd-body', evdBody: {} },
    payload: { apiKey: FAKE_TOKEN, note: 'leak attempt' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AU_CODES.SECRET_LEAK_FORBIDDEN);
  assert.equal(result.targetClass, 'evd');
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AU_CODES.SECRET_LEAK_FORBIDDEN);
  assert.equal(JSON.stringify(result.receipt).includes(FAKE_TOKEN), false);
});

// ── AU7: put secret into federation envelope → DENY ─────────────────────────
test('AU7: attempt put secret into federation envelope → DENY', () => {
  const b = makeBroker();
  const result = b.attemptPersist({
    intent: 'persist',
    target: { kind: 'federation-envelope', federationEnvelope: {} },
    payload: { token: FAKE_TOKEN }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AU_CODES.SECRET_LEAK_FORBIDDEN);
  assert.equal(result.targetClass, 'federation');
  assert.equal(result.receipt.deny, true);
});

// ── AU8: write secret to repo-path shaped target → DENY ──────────────────────
test('AU8: attempt write secret to repo-path shaped target → DENY', () => {
  const b = makeBroker();
  const result = b.attemptPersist({
    intent: 'persist',
    target: 'src/core/secrets/leaked-secret.json',
    payload: { secret: FAKE_TOKEN }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AU_CODES.SECRET_LEAK_FORBIDDEN);
  assert.equal(result.targetClass, 'repo');
});

// ── AU9: sanitize/redact on getState / errors ────────────────────────────────
test('AU9: sanitize/redact on getState and error details', () => {
  const b = makeBroker();
  b.injectToAdapter('adapter-hermetic-fake', 'EOS_FAKE_PROVIDER_ENV', makeFakeAdapter());
  const state = b.getState();
  assert.equal(state.PRODUCTION_READY, 'NO');
  assert.equal(state.fundacionDelta, 0);
  const dumped = JSON.stringify(state);
  assert.equal(dumped.includes(FAKE_TOKEN), false);
  assert.equal(dumped.includes(FAKE_TOKEN_B), false);
  // presence flags ok
  assert.equal(state.envPresence.EOS_PROVIDER_TOKEN_A, true);

  const dirty = {
    apiKey: FAKE_TOKEN,
    authorization: 'Bearer ' + 'Z'.repeat(48),
    nested: { password: 'hunter2-not-real' }
  };
  const clean = sanitizeAuPayload(dirty);
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(JSON.stringify(clean).includes(FAKE_TOKEN), false);

  const err = new SecretRuntimeBrokerError('boom token=' + FAKE_TOKEN, AU_CODES.DENY, {
    secret: FAKE_TOKEN
  });
  assert.equal(err.details.secret, '[REDACTED]');
  assert.equal(err.message.includes(FAKE_TOKEN), false);
});

// ── AU10: PRODUCTION_READY === 'NO' constant freeze ─────────────────────────
test('AU10: PRODUCTION_READY === NO across surface', () => {
  assert.equal(AU_PRODUCTION_READY, 'NO');
  assert.equal(AU_RECEIPT_PRODUCTION_READY, 'NO');
  const b = makeBroker();
  assert.equal(b.PRODUCTION_READY, 'NO');
  assert.equal(b.health().PRODUCTION_READY, 'NO');
  const rcpt = buildBrokerReceipt({ ok: true, code: 'OK' });
  assert.equal(rcpt.PRODUCTION_READY, 'NO');
});

// ── AU11: Fundacion always deny / no Fundacion writes ───────────────────────
test('AU11: Fundacion always deny; fundacionDelta 0', () => {
  const b = makeBroker();
  const result = b.writeFundacion({ anything: true });
  assert.equal(result.ok, false);
  assert.equal(result.code, AU_CODES.FUNDACION_DENIED);
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.receipt.fundacionDelta, 0);
  assert.equal(result.receipt.code, AU_CODES.FUNDACION_DENIED);

  const persist = b.attemptPersist({
    intent: 'persist',
    target: { kind: 'fundacion-write', path: '/Documents/Fundacion/x' },
    payload: { note: 'no secrets even' }
  });
  assert.equal(persist.ok, false);
  assert.equal(persist.code, AU_CODES.FUNDACION_DENIED);
});

// ── AU12: resolveSecret public API never returns raw value ──────────────────
test('AU12: resolveSecret returns presence/hash only — no raw value', () => {
  const b = makeBroker();
  const result = b.resolveSecret('EOS_PROVIDER_TOKEN_A');
  assert.equal(result.ok, true);
  assert.equal(result.present, true);
  assert.ok(result.envValueHash);
  assert.equal(result.value, undefined);
  assert.equal(JSON.stringify(result).includes(FAKE_TOKEN), false);
});

// ── AU13: INVALID_REQUEST on empty envKey / adapterId ───────────────────────
test('AU13: INVALID_REQUEST on empty envKey or adapterId', () => {
  const b = makeBroker();
  const r1 = b.resolveSecret('');
  assert.equal(r1.ok, false);
  assert.equal(r1.code, AU_CODES.INVALID_REQUEST);
  const r2 = b.injectToAdapter('', 'EOS_PROVIDER_TOKEN_A');
  assert.equal(r2.ok, false);
  assert.equal(r2.code, AU_CODES.INVALID_REQUEST);
});

// ── AU14: throwOnDeny raises SecretRuntimeBrokerError ───────────────────────
test('AU14: throwOnDeny raises SecretRuntimeBrokerError', () => {
  const b = makeBroker({ throwOnDeny: true });
  assert.throws(
    () => b.injectToAdapter('adapter-unknown-evil', 'EOS_PROVIDER_TOKEN_A'),
    (err) =>
      err instanceof SecretRuntimeBrokerError &&
      err.code === AU_CODES.ADAPTER_NOT_ALLOWLISTED
  );
});

// ── AU15: receipt presence hash stable; NON-CLAIM flags ─────────────────────
test('AU15: broker receipt has presence hash and NON-CLAIM flags', () => {
  const h = hashSecretPresence(FAKE_TOKEN, defaultHash);
  assert.equal(typeof h, 'string');
  assert.equal(h.length, 64);
  const rcpt = buildBrokerReceipt({
    ok: true,
    code: 'OK',
    envKey: 'EOS_PROVIDER_TOKEN_A',
    envValueHash: h,
    envKeyPresent: true,
    adapterId: 'adapter-provider-a'
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(rcpt.vaultClaim, false);
  assert.equal(rcpt.kmsClaim, false);
  assert.equal(rcpt.secretManagerClaim, false);
  assert.equal(rcpt.cloudIamClaim, false);
  assert.equal(rcpt.cloudAgent, false);
  assert.equal(rcpt.fundacionDelta, 0);
  assert.ok(rcpt.receiptId.startsWith('AU-RCPT-'));
});

// ── AU16: redact vendor-shaped strings built at runtime (no static literal) ─
test('AU16: redact runtime-synthesized vendor-shaped strings', () => {
  const vendor = synthVendorKey();
  assert.equal(vendorKeyPrefix(), String.fromCharCode(115, 107, 45));
  const clean = sanitizeAuPayload({ msg: 'key=' + vendor });
  assert.equal(String(clean.msg).includes(vendor), false);
  assert.ok(containsSecretMaterial({ api_key: vendor }));
  const guard = guardPersistAttempt({
    intent: 'persist',
    target: { kind: 'evidence-pack', evdBody: {} },
    payload: { credential: vendor }
  });
  assert.equal(guard.ok, false);
  assert.equal(guard.code, 'SECRET_LEAK_FORBIDDEN');
});

// ── AU17: Law VI — src/core/secrets must not contain forbidden prefix ───────
test('AU17: Law VI source files under src/core/secrets have no forbidden provider prefix contiguous', () => {
  const files = fs.readdirSync(SECRETS_DIR).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 4, 'expected ≥4 secret modules');
  // Build forbidden prefix at runtime so this test file also stays clean
  const forbidden = String.fromCharCode(115, 107, 45);
  for (const f of files) {
    const src = fs.readFileSync(path.join(SECRETS_DIR, f), 'utf8');
    assert.equal(
      src.includes(forbidden),
      false,
      `${f} must not contain forbidden provider prefix contiguous`
    );
  }
});

// ── AU18: env-gate list + hermetic custom allowlists ────────────────────────
test('AU18: env-gate custom allowlists and list helpers', () => {
  const gate = createEnvGate({
    allowlistedEnvKeys: ['CUSTOM_ENV_X'],
    allowlistedAdapters: ['adapter-custom-1']
  });
  assert.deepEqual(gate.listAllowlistedEnvKeys(), ['CUSTOM_ENV_X']);
  assert.deepEqual(gate.listAllowlistedAdapters(), ['adapter-custom-1']);
  assert.equal(gate.checkEnvKey('CUSTOM_ENV_X').ok, true);
  assert.equal(gate.checkEnvKey('EOS_PROVIDER_TOKEN_A').ok, false);
  const b = makeBroker({
    env: { CUSTOM_ENV_X: FAKE_TOKEN },
    allowlistedEnvKeys: ['CUSTOM_ENV_X'],
    allowlistedAdapters: ['adapter-custom-1']
  });
  const r = b.injectToAdapter('adapter-custom-1', 'CUSTOM_ENV_X', makeFakeAdapter());
  assert.equal(r.ok, true);
  assert.equal(JSON.stringify(r.receipt).includes(FAKE_TOKEN), false);
});

// ── AU19: stableStringify + defaultHash hermetic ────────────────────────────
test('AU19: stableStringify and defaultHash are hermetic and stable', () => {
  const a = stableStringify({ b: 1, a: 2 });
  const c = stableStringify({ a: 2, b: 1 });
  assert.equal(a, c);
  const h1 = defaultHash({ x: 1 });
  const h2 = defaultHash({ x: 1 });
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
  const guard = createSecretLeakGuard();
  assert.equal(guard.PRODUCTION_READY, 'NO');
});

// ── AU20: codes freeze surface ──────────────────────────────────────────────
test('AU20: AU_CODES freeze includes required DENY codes', () => {
  for (const k of [
    'OK',
    'DENY',
    'MISSING_ENV',
    'ADAPTER_NOT_ALLOWLISTED',
    'ENV_KEY_NOT_ALLOWLISTED',
    'SECRET_LEAK_FORBIDDEN',
    'INVALID_REQUEST',
    'MISSING_DEP',
    'FUNDACION_DENIED'
  ]) {
    assert.equal(AU_CODES[k], k);
  }
  assert.ok(Object.isFrozen(AU_CODES));
});
