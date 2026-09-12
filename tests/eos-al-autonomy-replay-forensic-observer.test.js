/**
 * @file eos-al-autonomy-replay-forensic-observer.test.js
 * @description SPEC-0043 / Mission AL — Autonomy Replay & Forensic Observer.
 * Hermetic TDD: multi-session replay ordering+deny/allow; abort on
 * chain-broken / incomplete (no silent gaps); forensic export shape;
 * attribution observe without billing claim; replay does NOT mutate
 * ledger/session; PRODUCTION_READY NO; Law VI no static vendor-key;
 * NON-CLAIM; Fundacion deny; MISSING_DEP.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as
 * static string literals in source/tests — build synthetic fixtures
 * at runtime (fromCharCode / join).
 *
 * NON-CLAIM: autonomy replay ≠ SIEM product / ≠ PRODUCTION_READY cost
 * billing / ≠ billing accuracy; observe-only; no live state mutation;
 * not AM; Fundacion Δ=0.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AL_PRODUCTION_READY,
  AL_KIND,
  AL_CODES,
  AutonomyReplayForensicObserverError,
  createAutonomyReplayForensicObserver,
  sanitizePayload,
  isFundacionTarget,
  defaultHash
} from '../src/core/observability/autonomy-replay-forensic-observer.js';
import {
  AL_EXPORT_KIND,
  AL_EXPORT_PRODUCTION_READY,
  buildForensicTimelineExport,
  formatTimelineEvent,
  summarizeForensicExport
} from '../src/core/observability/forensic-timeline-export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OBS_PATH = path.join(
  ROOT,
  'src/core/observability/autonomy-replay-forensic-observer.js'
);
const EXP_PATH = path.join(
  ROOT,
  'src/core/observability/forensic-timeline-export.js'
);
const TEST_PATH = path.resolve(
  __dirname,
  'eos-al-autonomy-replay-forensic-observer.test.js'
);

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  const prefix = String.fromCharCode(115, 107, 45); // s k dash
  return prefix + suffix;
}

/**
 * AJ-like hermetic ledger stub with mutation spy.
 */
function createLedgerFixture(entries, opts = {}) {
  const chain = entries.map((e) => ({ ...e }));
  let appendCalls = 0;
  let chainBroken = opts.chainBroken === true;
  return {
    _appendCalls: () => appendCalls,
    append(entry) {
      appendCalls += 1;
      chain.push({ ...entry, seq: chain.length });
      return { ok: true, code: 'APPENDED' };
    },
    verifyChain() {
      if (chainBroken) {
        return {
          ok: false,
          code: 'CHAIN_BROKEN',
          message: 'fixture chain broken'
        };
      }
      return { ok: true, code: 'OK', length: chain.length, tip: chain.at(-1)?.digest || null };
    },
    query(filter = {}) {
      const f = filter || {};
      const out = chain.filter((e) => {
        if (f.timelineId != null) {
          const match =
            String(e.timelineId || '') === String(f.timelineId) ||
            String(e.missionId || '') === String(f.timelineId);
          if (!match) return false;
        }
        if (f.missionId != null && String(e.missionId) !== String(f.missionId)) {
          return false;
        }
        if (f.sessionId != null && String(e.sessionId) !== String(f.sessionId)) {
          return false;
        }
        return true;
      });
      return { ok: true, code: 'OK', count: out.length, entries: out.map((e) => ({ ...e })) };
    },
    entries() {
      return chain.map((e) => ({ ...e }));
    },
    _break() {
      chainBroken = true;
    }
  };
}

/**
 * AI-like session store stub with save spy.
 */
function createSessionStoreFixture(records) {
  const map = new Map();
  for (const [id, rec] of Object.entries(records || {})) {
    map.set(String(id), { ...rec, sessionId: String(id) });
  }
  let saveCalls = 0;
  return {
    _saveCalls: () => saveCalls,
    load(id) {
      const r = map.get(String(id));
      return r ? { ...r } : null;
    },
    save(id, record) {
      saveCalls += 1;
      map.set(String(id), { ...record });
    },
    list() {
      return [...map.values()].map((r) => ({ ...r }));
    },
    getSession(id) {
      const r = map.get(String(id));
      return r
        ? { ok: true, session: { ...r } }
        : { ok: false, code: 'UNKNOWN_SESSION' };
    },
    _delete(id) {
      map.delete(String(id));
    }
  };
}

function multiSessionFixture() {
  const d0 = defaultHash({ seq: 0, body: 'genesis-allow' });
  const d1 = defaultHash({ seq: 1, body: 'cycle-deny', prev: d0 });
  const d2 = defaultHash({ seq: 2, body: 'cycle-allow', prev: d1 });
  const d3 = defaultHash({ seq: 3, body: 'cycle-allow-s2', prev: d2 });
  const entries = [
    {
      seq: 0,
      at: '2026-09-12T08:00:00.000Z',
      prevDigest: null,
      digest: d0,
      missionId: 'SPEC-0043',
      timelineId: 'TL-MULTI-1',
      sessionId: 'S1',
      kind: 'cycle',
      outcome: 'ALLOW',
      allow: true,
      code: 'OK',
      sealed: true,
      cost: { tokens: 10, costUnits: 1 },
      payload: { cycleId: 'C0', allow: true }
    },
    {
      seq: 1,
      at: '2026-09-12T08:01:00.000Z',
      prevDigest: d0,
      digest: d1,
      missionId: 'SPEC-0043',
      timelineId: 'TL-MULTI-1',
      sessionId: 'S1',
      kind: 'cycle',
      outcome: 'DENY',
      deny: true,
      code: 'CYCLE_DENIED',
      sealed: true,
      cost: { tokens: 5, costUnits: 1 },
      payload: { cycleId: 'C1', deny: true }
    },
    {
      seq: 2,
      at: '2026-09-12T08:02:00.000Z',
      prevDigest: d1,
      digest: d2,
      missionId: 'SPEC-0043',
      timelineId: 'TL-MULTI-1',
      sessionId: 'S1',
      kind: 'cycle',
      outcome: 'ALLOW',
      allow: true,
      code: 'CYCLE_COMPLETED',
      sealed: true,
      cost: { tokens: 20, costUnits: 2 },
      payload: { cycleId: 'C2', allow: true }
    },
    {
      seq: 3,
      at: '2026-09-12T08:03:00.000Z',
      prevDigest: d2,
      digest: d3,
      missionId: 'SPEC-0043',
      timelineId: 'TL-MULTI-1',
      sessionId: 'S2',
      kind: 'cycle',
      outcome: 'ALLOW',
      allow: true,
      code: 'OK',
      sealed: true,
      cost: { tokens: 7, costUnits: 1 },
      payload: { cycleId: 'C3', allow: true }
    }
  ];
  const sessions = {
    S1: {
      sessionId: 'S1',
      state: 'SUSPENDED',
      custodyDigest: d0,
      generation: 2
    },
    S2: {
      sessionId: 'S2',
      state: 'ACTIVE',
      custodyDigest: d3,
      generation: 1
    }
  };
  return { entries, sessions, timelineId: 'TL-MULTI-1' };
}

function observer(opts = {}) {
  const fix = multiSessionFixture();
  const ledger = opts.ledger || createLedgerFixture(fix.entries);
  const sessionStore =
    opts.sessionStore || createSessionStoreFixture(fix.sessions);
  return {
    obs: createAutonomyReplayForensicObserver({
      ledger,
      sessionStore,
      now: () => '2026-09-12T09:00:00.000Z',
      ...opts
    }),
    ledger,
    sessionStore,
    fix
  };
}

// ── AL1: kind + PRODUCTION_READY NO + NON-CLAIM ─────────────────────────────
test('AL1: kind eos-autonomy-replay-forensic-observer and PRODUCTION_READY NO', () => {
  const { obs } = observer();
  assert.equal(obs.kind, AL_KIND);
  assert.equal(obs.kind, 'eos-autonomy-replay-forensic-observer');
  assert.equal(obs.PRODUCTION_READY, 'NO');
  assert.equal(AL_PRODUCTION_READY, 'NO');
  const h = obs.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AL_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.observeOnly, true);
  assert.equal(h.mutatesLiveState, false);
  assert.equal(h.nonClaim.notSiemProduct, true);
  assert.equal(h.nonClaim.notBillingAccuracy, true);
  assert.equal(h.nonClaim.notProductionReadyCostBilling, true);
  assert.equal(h.nonClaim.observeOnly, true);
  assert.equal(h.nonClaim.noLiveStateMutation, true);
  assert.equal(h.nonClaim.notAm, true);
  assert.equal(AL_EXPORT_KIND, 'eos-forensic-timeline-export');
  assert.equal(AL_EXPORT_PRODUCTION_READY, 'NO');
});

// ── AL2: hermetic multi-session replay — ordering + deny/allow ──────────────
test('AL2: hermetic replay of multi-session fixture reproduces ordering + deny/allow', () => {
  const { obs, fix } = observer();
  const r = obs.replay({ timelineId: fix.timelineId });
  assert.equal(r.ok, true);
  assert.equal(r.code, AL_CODES.OK);
  assert.equal(r.cycleCount, 4);
  assert.deepEqual(r.ordering, [0, 1, 2, 3]);
  assert.equal(r.outcomes[0].outcome, 'ALLOW');
  assert.equal(r.outcomes[1].outcome, 'DENY');
  assert.equal(r.outcomes[1].code, 'CYCLE_DENIED');
  assert.equal(r.outcomes[2].allow, true);
  assert.equal(r.outcomes[3].sessionId, 'S2');
  assert.ok(r.sessions.S1);
  assert.ok(r.sessions.S2);
  assert.equal(r.mutatesLiveState, false);
  assert.equal(r.observeOnly, true);
  assert.ok(r.replayDigest);
  assert.equal(r.PRODUCTION_READY, 'NO');
});

// ── AL3: abort on chain-broken (no silent gaps) ─────────────────────────────
test('AL3: abort replay on chain-broken → CHAIN_BROKEN forensic failure', () => {
  const fix = multiSessionFixture();
  const ledger = createLedgerFixture(fix.entries, { chainBroken: true });
  const sessionStore = createSessionStoreFixture(fix.sessions);
  const obs = createAutonomyReplayForensicObserver({ ledger, sessionStore });
  const r = obs.replay({ timelineId: fix.timelineId });
  assert.equal(r.ok, false);
  assert.equal(r.code, AL_CODES.CHAIN_BROKEN);
  assert.equal(r.forensicFailure, true);
  assert.equal(r.silentGap, false);
  assert.ok(r.receipt);
  assert.equal(r.receipt.PRODUCTION_READY, 'NO');
});

// ── AL4: abort on incomplete inputs / missing session ───────────────────────
test('AL4: abort on incomplete inputs (missing session) → INCOMPLETE_INPUTS', () => {
  const fix = multiSessionFixture();
  const ledger = createLedgerFixture(fix.entries);
  const sessionStore = createSessionStoreFixture({ S1: fix.sessions.S1 }); // S2 missing
  const obs = createAutonomyReplayForensicObserver({ ledger, sessionStore });
  const r = obs.replay({ timelineId: fix.timelineId });
  assert.equal(r.ok, false);
  assert.equal(r.code, AL_CODES.INCOMPLETE_INPUTS);
  assert.equal(r.forensicFailure, true);
  assert.ok(Array.isArray(r.missingSessions));
  assert.ok(r.missingSessions.includes('S2'));
  assert.ok(
    /no silent gaps|incomplete/i.test(r.message || r.receipt?.message || '')
  );
});

// ── AL5: silent gap forbidden ───────────────────────────────────────────────
test('AL5: silent seq gap → SILENT_GAP_FORBIDDEN abort', () => {
  const fix = multiSessionFixture();
  const gapped = fix.entries.filter((e) => e.seq !== 1); // remove seq 1
  // Fix prevDigest chain artificially broken by gap
  const ledger = createLedgerFixture(gapped);
  const sessionStore = createSessionStoreFixture(fix.sessions);
  const obs = createAutonomyReplayForensicObserver({ ledger, sessionStore });
  const r = obs.verifyReplayInputs({ timelineId: fix.timelineId });
  assert.equal(r.ok, false);
  assert.ok(
    r.code === AL_CODES.SILENT_GAP_FORBIDDEN ||
      r.code === AL_CODES.CHAIN_BROKEN
  );
  assert.equal(r.forensicFailure, true);
});

// ── AL6: forensic timeline export shape ─────────────────────────────────────
test('AL6: forensic timeline export shape + summary', () => {
  const { obs, fix } = observer();
  const r = obs.exportForensicTimeline({ timelineId: fix.timelineId });
  assert.equal(r.ok, true);
  assert.equal(r.phase, 'EXPORT');
  assert.ok(r.export);
  assert.equal(r.export.kind, AL_EXPORT_KIND);
  assert.equal(r.export.PRODUCTION_READY, 'NO');
  assert.equal(r.export.eventCount, 4);
  assert.equal(r.export.observeOnly, true);
  assert.equal(r.export.mutatesLiveState, false);
  assert.equal(r.export.nonClaim.notSiemProduct, true);
  assert.ok(Array.isArray(r.export.events));
  assert.equal(r.export.events[1].outcome, 'DENY');
  assert.ok(typeof r.summary === 'string');
  assert.ok(r.summary.includes('PRODUCTION_READY=NO'));
  assert.ok(r.summary.includes('observe-only'));
  const built = buildForensicTimelineExport({
    timelineId: 'T',
    cycles: [{ seq: 0, outcome: 'ALLOW', allow: true }],
    at: 't0'
  });
  assert.equal(built.eventCount, 1);
  assert.ok(summarizeForensicExport(built).includes('events=1'));
  assert.equal(formatTimelineEvent({ outcome: 'DENY' }, 0).outcome, 'DENY');
});

// ── AL7: attribution observe aggregates without billing claim ───────────────
test('AL7: observeAttribution aggregates ECR without billing claim', () => {
  const ecr = {
    tokens: 100,
    costUnits: 10,
    entryCount: 1,
    bySession: { S1: { tokens: 100, costUnits: 10, count: 1 } }
  };
  const { obs, fix } = observer({ ecrCounters: ecr });
  const r = obs.observeAttribution({ timelineId: fix.timelineId });
  assert.equal(r.ok, true);
  assert.equal(r.enabled, true);
  assert.equal(r.billingClaim, false);
  assert.equal(r.billingAccuracy, false);
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.observeOnly, true);
  assert.ok(r.aggregates.tokens >= 100 + 10); // ecr + ledger costs
  assert.equal(r.nonClaim.notBillingAccuracy, true);
  assert.equal(r.nonClaim.notProductionReady, true);
  assert.ok(/NOT billing|NOT PRODUCTION_READY/i.test(r.message));
});

// ── AL8: replay does NOT mutate ledger/session (spy on append/save) ─────────
test('AL8: replay does NOT call ledger.append or sessionStore.save', () => {
  const fix = multiSessionFixture();
  const ledger = createLedgerFixture(fix.entries);
  const sessionStore = createSessionStoreFixture(fix.sessions);
  const obs = createAutonomyReplayForensicObserver({ ledger, sessionStore });
  assert.equal(ledger._appendCalls(), 0);
  assert.equal(sessionStore._saveCalls(), 0);
  const r = obs.replay({ timelineId: fix.timelineId });
  assert.equal(r.ok, true);
  assert.equal(ledger._appendCalls(), 0, 'append must not be called during replay');
  assert.equal(sessionStore._saveCalls(), 0, 'save must not be called during replay');
  const ex = obs.exportForensicTimeline({ timelineId: fix.timelineId });
  assert.equal(ex.ok, true);
  assert.equal(ledger._appendCalls(), 0);
  assert.equal(sessionStore._saveCalls(), 0);
  const attr = obs.observeAttribution({ timelineId: fix.timelineId });
  assert.equal(attr.ok, true);
  assert.equal(ledger._appendCalls(), 0);
  assert.equal(sessionStore._saveCalls(), 0);
  // Explicit documentation markers in source
  const src = fs.readFileSync(OBS_PATH, 'utf8');
  assert.ok(src.includes('MUST NOT call ledger.append'));
  assert.ok(src.includes('NO LIVE STATE MUTATION') || src.includes('no live state mutation'));
});

// ── AL9: PRODUCTION_READY === 'NO' locked ───────────────────────────────────
test('AL9: PRODUCTION_READY === NO on observer, health, state, receipts', () => {
  const { obs, fix } = observer();
  assert.equal(obs.PRODUCTION_READY, 'NO');
  assert.equal(obs.health().PRODUCTION_READY, 'NO');
  assert.equal(obs.getState().PRODUCTION_READY, 'NO');
  const r = obs.replay({ timelineId: fix.timelineId });
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.receipt.PRODUCTION_READY, 'NO');
  const sealed = obs.sealReceipt({ ok: true, code: AL_CODES.OK, phase: 'MANUAL' });
  assert.equal(sealed.PRODUCTION_READY, 'NO');
  assert.equal(sealed.kind, AL_KIND);
});

// ── AL10: Law VI — no static vendor-key; sanitize; runtime synth ────────────
test('AL10: Law VI — runtime synth secrets; rg-clean src+tests', () => {
  const dirtyKey = synthVendorKey();
  const clean = sanitizePayload({
    apiKey: dirtyKey,
    nested: { token: dirtyKey, safe: 'ok' },
    note: 'Bearer ' + 'Z'.repeat(48)
  });
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.safe, 'ok');

  const files = [OBS_PATH, EXP_PATH, TEST_PATH];
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

// ── AL11: NON-CLAIM markers in module comments ──────────────────────────────
test('AL11: NON-CLAIM markers present in module comments', () => {
  const src = fs.readFileSync(OBS_PATH, 'utf8');
  const exp = fs.readFileSync(EXP_PATH, 'utf8');
  const suite = fs.readFileSync(TEST_PATH, 'utf8');
  for (const body of [src, exp, suite]) {
    assert.ok(body.includes('NON-CLAIM'));
    assert.ok(body.includes('SIEM') || body.includes('siem') || body.includes('notSiem'));
    assert.ok(body.includes('PRODUCTION_READY'));
    assert.ok(/billing/i.test(body));
  }
  assert.ok(src.includes('observe-only') || src.includes('OBSERVE-ONLY'));
  assert.ok(src.includes('not AM') || src.includes('notAm'));
  assert.ok(src.includes('Fundacion'));
  assert.ok(src.includes('Antigravity') || src.includes('cloud-agent'));
});

// ── AL12: Fundacion deny on export/replay target ────────────────────────────
test('AL12: Fundacion path export/replay → FUNDACION_DENY', () => {
  const { obs } = observer();
  const badExport = obs.exportForensicTimeline({
    timelineId: 'TL-MULTI-1',
    exportPath: 'Documents/Fundacion/audit.json'
  });
  assert.equal(badExport.ok, false);
  assert.equal(badExport.code, AL_CODES.FUNDACION_DENY);

  const badReplay = obs.replay({
    timelineId: 'TL-MULTI-1',
    path: 'Documents/Fundacion'
  });
  assert.equal(badReplay.ok, false);
  assert.equal(badReplay.code, AL_CODES.FUNDACION_DENY);

  const badOpts = obs.exportForensicTimeline(
    { timelineId: 'TL-MULTI-1' },
    { path: '/tmp/Fundacion/out' }
  );
  assert.equal(badOpts.ok, false);
  assert.equal(badOpts.code, AL_CODES.FUNDACION_DENY);

  assert.equal(isFundacionTarget({ path: 'Documents/Fundacion' }), true);
  assert.equal(isFundacionTarget({ exportPath: 'x/Fundacion/y' }), true);
});

// ── AL13: MISSING_DEP when ledger/session injectors absent ──────────────────
test('AL13: MISSING_DEP when ledger/sessionStore injectors absent', () => {
  const noLedger = createAutonomyReplayForensicObserver({
    sessionStore: createSessionStoreFixture({ S1: { sessionId: 'S1' } })
  });
  const d1 = noLedger.replay('TL-X');
  assert.equal(d1.ok, false);
  assert.equal(d1.code, AL_CODES.MISSING_DEP);
  assert.equal(d1.dep, 'ledger');

  const noStore = createAutonomyReplayForensicObserver({
    ledger: createLedgerFixture([])
  });
  const d2 = noStore.replay('TL-X');
  assert.equal(d2.ok, false);
  assert.equal(d2.code, AL_CODES.MISSING_DEP);
  assert.equal(d2.dep, 'sessionStore');

  const badNow = createAutonomyReplayForensicObserver({
    now: 'not-a-fn',
    ledger: createLedgerFixture([]),
    sessionStore: createSessionStoreFixture({})
  });
  const d3 = badNow.verifyReplayInputs({});
  assert.equal(d3.code, AL_CODES.MISSING_DEP);

  const badLedgerType = createAutonomyReplayForensicObserver({
    ledger: 'nope',
    sessionStore: createSessionStoreFixture({})
  });
  const d4 = badLedgerType.replay({});
  assert.equal(d4.code, AL_CODES.MISSING_DEP);
});

// ── AL14: TIMELINE_NOT_FOUND + INVALID_TIMELINE ─────────────────────────────
test('AL14: TIMELINE_NOT_FOUND and INVALID_TIMELINE fail-closed', () => {
  const { obs } = observer();
  const missing = obs.replay({ timelineId: 'DOES-NOT-EXIST' });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, AL_CODES.TIMELINE_NOT_FOUND);

  const invalid = obs.replay(42);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, AL_CODES.INVALID_TIMELINE);
});

// ── AL15: hermetic — no network / no cloud-agent; fail-closed codes ─────────
test('AL15: hermetic — no fetch/http/cloudagent; all fail-closed codes exported', () => {
  const src = fs.readFileSync(OBS_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);

  assert.equal(AL_CODES.REPLAY_ABORT, 'REPLAY_ABORT');
  assert.equal(AL_CODES.CHAIN_BROKEN, 'CHAIN_BROKEN');
  assert.equal(AL_CODES.INCOMPLETE_INPUTS, 'INCOMPLETE_INPUTS');
  assert.equal(AL_CODES.TIMELINE_NOT_FOUND, 'TIMELINE_NOT_FOUND');
  assert.equal(AL_CODES.SILENT_GAP_FORBIDDEN, 'SILENT_GAP_FORBIDDEN');
  assert.equal(AL_CODES.MISSING_DEP, 'MISSING_DEP');
  assert.equal(AL_CODES.FUNDACION_DENY, 'FUNDACION_DENY');
  assert.equal(AL_CODES.INVALID_TIMELINE, 'INVALID_TIMELINE');

  for (const code of [
    'REPLAY_ABORT',
    'CHAIN_BROKEN',
    'INCOMPLETE_INPUTS',
    'TIMELINE_NOT_FOUND',
    'SILENT_GAP_FORBIDDEN',
    'MISSING_DEP',
    'FUNDACION_DENY',
    'INVALID_TIMELINE'
  ]) {
    assert.ok(src.includes(code), `src missing code ${code}`);
  }
});

// ── AL16: verifyReplayInputs PASS + throwOnAbort + getReceipts ──────────────
test('AL16: verifyReplayInputs PASS; throwOnAbort; getReceipts; AM not implemented', () => {
  const { obs, fix } = observer();
  const v = obs.verifyReplayInputs({ timelineId: fix.timelineId });
  assert.equal(v.ok, true);
  assert.equal(v.entryCount, 4);
  assert.equal(v.sessionCount, 2);

  const throwObs = createAutonomyReplayForensicObserver({
    ledger: createLedgerFixture(fix.entries, { chainBroken: true }),
    sessionStore: createSessionStoreFixture(fix.sessions),
    throwOnAbort: true
  });
  assert.throws(
    () => throwObs.replay({ timelineId: fix.timelineId }),
    (err) => {
      assert.ok(err instanceof AutonomyReplayForensicObserverError);
      assert.equal(err.code, AL_CODES.CHAIN_BROKEN);
      return true;
    }
  );

  const receipts = obs.getReceipts();
  assert.ok(receipts.length >= 1);
  for (const r of receipts) {
    assert.equal(r.PRODUCTION_READY, 'NO');
    assert.equal(r.kind, AL_KIND);
    assert.equal(r.mutatesLiveState, false);
  }

  const src = fs.readFileSync(OBS_PATH, 'utf8');
  assert.ok(src.includes('not AM'));
  assert.equal(src.includes('createMissionAm'), false);
});
