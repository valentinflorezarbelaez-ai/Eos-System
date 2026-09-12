/**
 * @file eos-an-multi-workstation-session-federation.test.js
 * @description SPEC-0045 / Mission AN — Multi-Workstation Session Federation Port.
 * Hermetic TDD: export/import across ≥2 fake workstations; DENY on tamper /
 * tip mismatch / custody conflict; sync fail-closed no partial apply;
 * Fundacion DENY; PRODUCTION_READY NO; Law VI no static vendor-key literals;
 * NON-CLAIM markers; MISSING_DEP when injectors absent.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 *
 * NON-CLAIM: federation ≠ cloud fleet ≠ multi-tenant SaaS ≠ CloudAgent;
 * not AO/AP/AQ/AR; Fundacion Δ=0.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AN_PRODUCTION_READY,
  AN_KIND,
  AN_CODES,
  MultiWorkstationFederationError,
  createMultiWorkstationSessionFederationPort,
  createMemorySessionStore,
  createMemoryPeerTransport,
  sanitizeAnPayload,
  defaultHash,
  stableStringify,
  sealEnvelope,
  verifyEnvelopeDigest
} from '../src/core/federation/multi-workstation-session-federation-port.js';
import {
  AN_ENVELOPE_KIND,
  AN_ENVELOPE_PRODUCTION_READY
} from '../src/core/federation/federation-custody-envelope.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT_PATH = path.join(
  ROOT,
  'src/core/federation/multi-workstation-session-federation-port.js'
);
const ENV_PATH = path.join(
  ROOT,
  'src/core/federation/federation-custody-envelope.js'
);
const TEST_PATH = path.resolve(
  __dirname,
  'eos-an-multi-workstation-session-federation.test.js'
);

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  const prefix = String.fromCharCode(115, 107, 45); // s k -
  return prefix + suffix;
}

function synthBearer() {
  return 'Bearer ' + 'Z'.repeat(48);
}

function port(opts = {}) {
  return createMultiWorkstationSessionFederationPort({
    workstationId: opts.workstationId,
    sessionStore: opts.sessionStore,
    peerTransport: opts.peerTransport,
    hash: opts.hash,
    now: opts.now,
    ledgerAppend: opts.ledgerAppend,
    throwOnDeny: opts.throwOnDeny,
    requireSessionStore: opts.requireSessionStore
  });
}

// ── AN1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AN1: kind eos-multi-workstation-session-federation-port and PRODUCTION_READY NO', async () => {
  const p = port({ workstationId: 'WS-A' });
  assert.equal(p.kind, AN_KIND);
  assert.equal(p.kind, 'eos-multi-workstation-session-federation-port');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(AN_PRODUCTION_READY, 'NO');
  const h = p.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AN_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.usesCloudAgent, false);
  assert.equal(h.nonClaim.federationNotCloudFleet, true);
  assert.equal(h.nonClaim.federationNotMultiTenantSaas, true);
  assert.equal(h.nonClaim.federationNotCloudAgent, true);
  assert.equal(h.nonClaim.federationNotProductionReady, true);
  assert.equal(h.nonClaim.notAoApAqAr, true);
  assert.equal(AN_ENVELOPE_KIND, 'eos-federation-custody-envelope');
  assert.equal(AN_ENVELOPE_PRODUCTION_READY, 'NO');
});

// ── AN2: export/import handoff across 2 fake workstations PASS ──────────────
test('AN2: export/import handoff across 2 fake workstations PASS', () => {
  const storeA = createMemorySessionStore();
  const storeB = createMemorySessionStore();
  const transport = createMemoryPeerTransport();

  const wsA = port({
    workstationId: 'WS-A',
    sessionStore: storeA,
    peerTransport: transport
  });
  const wsB = port({
    workstationId: 'WS-B',
    sessionStore: storeB,
    peerTransport: transport
  });

  wsA._seedSessionForTest('SESS-001', {
    generation: 2,
    meta: { label: 'alpha' },
    state: 'ACTIVE'
  });

  const exported = wsA.exportHandoff('SESS-001');
  assert.equal(exported.ok, true);
  assert.equal(exported.code, AN_CODES.EXPORTED);
  assert.ok(exported.envelope);
  assert.equal(exported.envelope.fromWorkstation, 'WS-A');
  assert.equal(exported.envelope.sessionId, 'SESS-001');
  assert.ok(exported.envelope.digest);
  assert.ok(exported.envelope.custodyDigest);
  assert.ok(exported.envelope.sealedAt);
  assert.equal(exported.receipt.PRODUCTION_READY, 'NO');

  const imported = wsB.importHandoff(exported.envelope);
  assert.equal(imported.ok, true);
  assert.equal(imported.code, AN_CODES.IMPORTED);
  assert.equal(imported.sessionId, 'SESS-001');
  assert.equal(imported.record.importedFrom, 'WS-A');
  assert.ok(imported.receipt);

  const loaded = storeB.load('SESS-001');
  assert.ok(loaded);
  assert.equal(loaded.custodyDigest, exported.envelope.custodyDigest);
  assert.equal(loaded.importedFrom, 'WS-A');
});

// ── AN3: DENY on tamper ─────────────────────────────────────────────────────
test('AN3: tampered envelope digest → DENY TAMPER_DETECTED', () => {
  const wsA = port({ workstationId: 'WS-A' });
  const wsB = port({ workstationId: 'WS-B' });
  wsA._seedSessionForTest('SESS-TAMPER', { generation: 1 });

  const exported = wsA.exportHandoff('SESS-TAMPER');
  assert.equal(exported.ok, true);

  const tampered = {
    ...exported.envelope,
    payload: {
      ...exported.envelope.payload,
      session: {
        ...exported.envelope.payload.session,
        meta: { evil: true }
      }
    }
    // digest left stale → tamper
  };

  const denied = wsB.importHandoff(tampered);
  assert.equal(denied.ok, false);
  assert.equal(denied.allow, false);
  assert.equal(denied.code, AN_CODES.TAMPER_DETECTED);
  assert.ok(denied.receipt);
  assert.equal(denied.receipt.code, AN_CODES.TAMPER_DETECTED);

  // verifyEnvelope also reports tamper
  const v = wsB.verifyEnvelope(tampered);
  assert.equal(v.ok, false);
  assert.equal(v.code, AN_CODES.TAMPER_DETECTED);
});

// ── AN4: DENY on tip mismatch ───────────────────────────────────────────────
test('AN4: tip pin mismatch → DENY TIP_MISMATCH', () => {
  const wsA = port({ workstationId: 'WS-A' });
  const wsB = port({ workstationId: 'WS-B' });
  wsA._seedSessionForTest('SESS-TIP', {
    generation: 3,
    tipPin: 'tip-expected-aaa'
  });

  const exported = wsA.exportHandoff('SESS-TIP');
  assert.equal(exported.ok, true);
  assert.equal(exported.envelope.tipPin, 'tip-expected-aaa');

  const denied = wsB.importHandoff(exported.envelope, {
    expectedTip: 'tip-other-bbb'
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, AN_CODES.TIP_MISMATCH);
  assert.equal(denied.expectedTip, 'tip-other-bbb');
  assert.equal(denied.actualTip, 'tip-expected-aaa');
});

// ── AN5: DENY on conflicting custody heads ──────────────────────────────────
test('AN5: conflicting custody heads → DENY CUSTODY_CONFLICT', () => {
  const storeB = createMemorySessionStore();
  const wsA = port({ workstationId: 'WS-A' });
  const wsB = port({ workstationId: 'WS-B', sessionStore: storeB });

  wsA._seedSessionForTest('SESS-CONFLICT', { generation: 1 });
  const exported = wsA.exportHandoff('SESS-CONFLICT');
  assert.equal(exported.ok, true);

  // Seed B with divergent custody head for same session
  wsB._seedSessionForTest('SESS-CONFLICT', {
    generation: 9,
    custodyDigest: defaultHash({ divergent: true, session: 'SESS-CONFLICT' }),
    tipPin: 'local-divergent-tip'
  });

  const denied = wsB.importHandoff(exported.envelope);
  assert.equal(denied.ok, false);
  assert.equal(denied.code, AN_CODES.CUSTODY_CONFLICT);
  assert.ok(denied.localCustodyDigest);
  assert.ok(denied.remoteCustodyDigest);
  assert.notEqual(denied.localCustodyDigest, denied.remoteCustodyDigest);
});

// ── AN6: sync fail-closed — no partial apply / no silent merge ──────────────
test('AN6: syncPeer fail-closed — no partial apply when one envelope tampers', () => {
  const storeB = createMemorySessionStore();
  const wsA = port({ workstationId: 'WS-A' });
  const wsB = port({ workstationId: 'WS-B', sessionStore: storeB });

  wsA._seedSessionForTest('SESS-S1', { generation: 1 });
  wsA._seedSessionForTest('SESS-S2', { generation: 1 });
  const e1 = wsA.exportHandoff('SESS-S1');
  const e2 = wsA.exportHandoff('SESS-S2');
  assert.equal(e1.ok, true);
  assert.equal(e2.ok, true);

  const bad = {
    ...e2.envelope,
    payload: { ...e2.envelope.payload, hijacked: true }
    // stale digest
  };

  const sync = wsB.syncPeer('WS-A', [e1.envelope, bad]);
  assert.equal(sync.ok, false);
  assert.equal(sync.code, AN_CODES.PARTIAL_APPLY_FORBIDDEN);
  assert.equal(sync.applied, 0);
  assert.ok(sync.denied >= 1);
  assert.ok(sync.receipt);

  // Neither session applied
  assert.equal(storeB.load('SESS-S1'), null);
  assert.equal(storeB.load('SESS-S2'), null);

  // Clean sync of both succeeds
  const syncOk = wsB.syncPeer('WS-A', {
    envelopes: [e1.envelope, e2.envelope]
  });
  assert.equal(syncOk.ok, true);
  assert.equal(syncOk.code, AN_CODES.SYNCED);
  assert.equal(syncOk.applied, 2);
  assert.ok(storeB.load('SESS-S1'));
  assert.ok(storeB.load('SESS-S2'));
});

// ── AN7: Fundacion DENY ─────────────────────────────────────────────────────
test('AN7: Fundacion path / target → FUNDACION_DENY', () => {
  const wsA = port({ workstationId: 'WS-A' });
  const wsB = port({ workstationId: 'WS-B' });

  wsA._seedSessionForTest('SESS-FUND', {
    generation: 1,
    path: 'Documents/Fundacion/secret',
    target: 'fundacion'
  });
  const deniedExport = wsA.exportHandoff('SESS-FUND');
  assert.equal(deniedExport.code, AN_CODES.FUNDACION_DENY);
  assert.equal(deniedExport.ok, false);

  // Clean export then mutate envelope payload to Fundacion → import DENY
  wsA._seedSessionForTest('SESS-CLEAN', { generation: 1 });
  const exported = wsA.exportHandoff('SESS-CLEAN');
  assert.equal(exported.ok, true);

  // Re-seal with fundacion target in payload (valid digest but Fundacion)
  const evil = sealEnvelope(
    {
      envelopeId: 'AN-ENV-EVIL',
      fromWorkstation: 'WS-A',
      sessionId: 'SESS-CLEAN',
      tipPin: exported.envelope.tipPin,
      custodyDigest: exported.envelope.custodyDigest,
      payload: {
        session: exported.envelope.payload.session,
        target: 'fundacion',
        fundacionWrite: true
      },
      sealedAt: exported.envelope.sealedAt
    },
    defaultHash
  );
  const deniedImport = wsB.importHandoff(evil);
  assert.equal(deniedImport.code, AN_CODES.FUNDACION_DENY);

  const v = wsB.verifyEnvelope(evil);
  assert.equal(v.code, AN_CODES.FUNDACION_DENY);
});

// ── AN8: PRODUCTION_READY === 'NO' pinned everywhere ────────────────────────
test('AN8: PRODUCTION_READY === NO on port, receipts, health, state', () => {
  const seen = [];
  const p = port({
    workstationId: 'WS-PR',
    ledgerAppend: (r) => seen.push(r)
  });
  p._seedSessionForTest('SESS-PR', { generation: 1 });
  const ex = p.exportHandoff('SESS-PR');
  assert.equal(ex.PRODUCTION_READY, 'NO');
  assert.equal(ex.envelope.PRODUCTION_READY, 'NO');
  assert.equal(ex.receipt.PRODUCTION_READY, 'NO');
  assert.equal(p.health().PRODUCTION_READY, 'NO');
  assert.equal(p.getState().PRODUCTION_READY, 'NO');
  assert.ok(seen.length >= 1);
  for (const r of seen) {
    assert.equal(r.PRODUCTION_READY, 'NO');
  }
});

// ── AN9: Law VI — no static vendor-key literals (rg CLEAN) ──────────────────
test('AN9: Law VI — no static vendor-key literals in payload sources', () => {
  const files = [PORT_PATH, ENV_PATH, TEST_PATH];
  const vendorLiteralRe = new RegExp(
    `['"]${String.fromCharCode(115, 107, 45)}[A-Za-z0-9]{8,}['"]`
  );
  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    assert.equal(
      vendorLiteralRe.test(body),
      false,
      `static vendor-key literal found in ${path.basename(f)}`
    );
  }
  assert.ok(synthVendorKey().startsWith(String.fromCharCode(115, 107, 45)));
});

// ── AN10: Law VI sanitize redacts runtime-synth secrets ─────────────────────
test('AN10: Law VI sanitize — redacts secrets (runtime synth); getState clean', () => {
  const dirtyKey = synthVendorKey();
  const dirtyBearer = synthBearer();

  const p = port({ workstationId: 'WS-SEC' });
  p._seedSessionForTest('SESS-SEC', {
    generation: 1,
    meta: {
      apiKey: dirtyKey,
      authorization: dirtyBearer,
      password: 'hunter2-not-a-product-secret',
      token: dirtyKey
    }
  });
  const exported = p.exportHandoff('SESS-SEC');
  assert.equal(exported.ok, true);
  const dumped = JSON.stringify(exported);
  assert.equal(dumped.includes(dirtyKey), false);

  const state = p.getState();
  const stateDump = JSON.stringify(state);
  assert.equal(stateDump.includes(dirtyKey), false);

  const clean = sanitizeAnPayload({
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    nested: { token: dirtyKey, password: 'x', safe: 'ok' },
    generation: 3
  });
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.safe, 'ok');
  assert.equal(clean.generation, 3);

  const err = new MultiWorkstationFederationError(
    `leak ${dirtyKey}`,
    AN_CODES.DENY
  );
  assert.ok(
    err.message.includes('[REDACTED]') || !err.message.includes(dirtyKey)
  );
});

// ── AN11: NON-CLAIM markers present in source + health ──────────────────────
test('AN11: NON-CLAIM markers — not cloud fleet / SaaS / CloudAgent / AO–AR', () => {
  const src = fs.readFileSync(PORT_PATH, 'utf8');
  assert.ok(/cloud agent fleet/i.test(src) || /federationNotCloudFleet/.test(src));
  assert.ok(/multi-tenant SaaS/i.test(src) || /federationNotMultiTenantSaas/.test(src));
  assert.ok(/CloudAgent/.test(src));
  assert.ok(/not AO\/AP\/AQ\/AR/i.test(src) || /notAoApAqAr/.test(src));
  assert.ok(/Antigravity-first/i.test(src));
  assert.ok(/PRODUCTION_READY/.test(src));

  const h = port({ workstationId: 'WS-NC' }).health();
  assert.equal(h.nonClaim.federationNotCloudFleet, true);
  assert.equal(h.nonClaim.federationNotMultiTenantSaas, true);
  assert.equal(h.nonClaim.federationNotCloudAgent, true);
  assert.equal(h.nonClaim.notAoApAqAr, true);
  assert.equal(h.cloudAgent, false);
});

// ── AN12: MISSING_DEP when sessionStore injector absent ─────────────────────
test('AN12: MISSING_DEP when requireSessionStore and injectors absent', () => {
  const p = port({
    workstationId: 'WS-MISS',
    requireSessionStore: true,
    sessionStore: null
  });
  const ex = p.exportHandoff('SESS-X');
  assert.equal(ex.ok, false);
  assert.equal(ex.code, AN_CODES.MISSING_DEP);
  assert.equal(ex.dep, 'sessionStore');

  const imp = p.importHandoff({
    envelopeId: 'x',
    fromWorkstation: 'WS-A',
    sessionId: 'SESS-X',
    tipPin: 't',
    custodyDigest: 'c',
    payload: {},
    sealedAt: new Date().toISOString(),
    digest: 'd'
  });
  assert.equal(imp.code, AN_CODES.MISSING_DEP);

  const sync = p.syncPeer('WS-A', []);
  assert.equal(sync.code, AN_CODES.MISSING_DEP);
});

// ── AN13: UNKNOWN_SESSION + INVALID_ENVELOPE ────────────────────────────────
test('AN13: UNKNOWN_SESSION on export; INVALID_ENVELOPE on bad import', () => {
  const p = port({ workstationId: 'WS-UNK' });
  const unk = p.exportHandoff('SESS-DOES-NOT-EXIST');
  assert.equal(unk.code, AN_CODES.UNKNOWN_SESSION);
  assert.equal(unk.ok, false);

  const bad = p.importHandoff(null);
  assert.equal(bad.code, AN_CODES.INVALID_ENVELOPE);

  const bad2 = p.importHandoff({ notAnEnvelope: true });
  assert.equal(bad2.code, AN_CODES.INVALID_ENVELOPE);
});

// ── AN14: hermetic — no fetch/http / no CloudAgent import path ──────────────
test('AN14: hermetic — no fetch/http client; no cloud-agent import path', () => {
  const src = fs.readFileSync(PORT_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);
  assert.ok(src.includes('usesCloudAgent'));
  assert.ok(src.includes('TAMPER_DETECTED'));
  assert.ok(src.includes('CUSTODY_CONFLICT'));
  assert.ok(src.includes('PARTIAL_APPLY_FORBIDDEN'));
  assert.ok(src.includes('SYNC_IN_PROGRESS'));
  assert.ok(src.includes('FUNDACION_DENY'));
});

// ── AN15: SYNC_IN_PROGRESS + custody conflict on sync ───────────────────────
test('AN15: sync custody conflict → PARTIAL_APPLY_FORBIDDEN; SYNC_IN_PROGRESS code present', () => {
  const storeB = createMemorySessionStore();
  const wsA = port({ workstationId: 'WS-A' });
  const wsB = port({ workstationId: 'WS-B', sessionStore: storeB });

  wsA._seedSessionForTest('SESS-SC', { generation: 1 });
  const e = wsA.exportHandoff('SESS-SC');
  assert.equal(e.ok, true);

  // Divergent local head on B
  wsB._seedSessionForTest('SESS-SC', {
    generation: 5,
    custodyDigest: defaultHash({ other: 'head' })
  });

  const sync = wsB.syncPeer('WS-A', [e.envelope]);
  assert.equal(sync.ok, false);
  assert.equal(sync.code, AN_CODES.PARTIAL_APPLY_FORBIDDEN);
  assert.equal(sync.applied, 0);
  assert.ok(
    sync.denials.some((d) => d.code === AN_CODES.CUSTODY_CONFLICT)
  );

  // Codes surface
  assert.equal(AN_CODES.SYNC_IN_PROGRESS, 'SYNC_IN_PROGRESS');
  assert.equal(wsB._isSyncInProgress(), false);
});

// ── AN16: envelope helpers + stableStringify + verify ok path ───────────────
test('AN16: seal/verify helpers; stableStringify; empty sync OK; metrics', () => {
  assert.equal(
    stableStringify({ b: 1, a: 2 }),
    stableStringify({ a: 2, b: 1 })
  );

  const sealed = sealEnvelope(
    {
      envelopeId: 'AN-ENV-T',
      fromWorkstation: 'WS-T',
      sessionId: 'SESS-T',
      tipPin: 'tip-t',
      custodyDigest: defaultHash({ x: 1 }),
      payload: { session: { sessionId: 'SESS-T' } },
      sealedAt: '2026-09-12T00:00:00.000Z'
    },
    defaultHash
  );
  assert.ok(sealed.digest);
  const ok = verifyEnvelopeDigest(sealed, defaultHash);
  assert.equal(ok.ok, true);

  const p = port({ workstationId: 'WS-T' });
  const empty = p.syncPeer('WS-PEER', { diff: [] });
  assert.equal(empty.ok, true);
  assert.equal(empty.code, AN_CODES.SYNCED);
  assert.equal(empty.applied, 0);

  const state = p.getState();
  assert.equal(state.metrics.syncs, 1);
  assert.equal(state.fundacion, 'ALWAYS_DENY');
  assert.equal(state.nonClaim.fundacionDelta0, true);

  const rcpt = p.sealReceipt({
    ok: true,
    code: AN_CODES.OK,
    phase: 'MANUAL'
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(rcpt.PRODUCTION_READY, 'NO');
  assert.ok(p.getReceipts().length >= 2);
});
