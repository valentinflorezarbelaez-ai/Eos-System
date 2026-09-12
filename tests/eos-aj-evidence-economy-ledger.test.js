/**
 * @file eos-aj-evidence-economy-ledger.test.js
 * @description SPEC-0041 / Mission AJ — Evidence Economy Ledger.
 * Hermetic TDD: append + chain continuity; verify PASS/FAIL; query
 * filters + sanitization; aggregateCosts; trans-session integrity;
 * fail-closed missing deps; Fundacion deny; PRODUCTION_READY NO;
 * Law VI no static vendor-key prefix substring; NON-CLAIM markers.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as
 * static string literals in source/tests — build synthetic fixtures
 * at runtime (fromCharCode / join).
 *
 * NON-CLAIM: EVD ledger ≠ external audit platform / ≠ compliance
 * certification / ≠ PRODUCTION_READY; multi-session cost tracking
 * ≠ billing product; not a second custody core; not AK / AL / AM;
 * Fundacion Δ=0.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AJ_PRODUCTION_READY,
  AJ_KIND,
  AJ_CODES,
  EvidenceEconomyLedgerError,
  createEvidenceEconomyLedger,
  createMemoryStore,
  sanitizeLedgerPayload,
  defaultHash,
  stableStringify,
  isFundacionTarget
} from '../src/core/evidence/evidence-economy-ledger.js';
import {
  createEvidenceCostTracker,
  extractEntryCost,
  AJ_COST_KIND,
  AJ_COST_PRODUCTION_READY
} from '../src/core/evidence/evidence-cost-tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(
  ROOT,
  'src/core/evidence/evidence-economy-ledger.js'
);
const COST_PATH = path.join(
  ROOT,
  'src/core/evidence/evidence-cost-tracker.js'
);
const TEST_PATH = path.resolve(
  __dirname,
  'eos-aj-evidence-economy-ledger.test.js'
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

function ledger(opts = {}) {
  return createEvidenceEconomyLedger(opts);
}

// ── AJ1: kind + PRODUCTION_READY NO + NON-CLAIM ─────────────────────────────
test('AJ1: kind eos-evidence-economy-ledger and PRODUCTION_READY NO', () => {
  const l = ledger();
  assert.equal(l.kind, AJ_KIND);
  assert.equal(l.kind, 'eos-evidence-economy-ledger');
  assert.equal(l.PRODUCTION_READY, 'NO');
  assert.equal(AJ_PRODUCTION_READY, 'NO');
  const h = l.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AJ_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.nonClaim.evdLedgerNotAuditPlatform, true);
  assert.equal(h.nonClaim.evdLedgerNotComplianceCertification, true);
  assert.equal(h.nonClaim.evdLedgerNotProductionReady, true);
  assert.equal(h.nonClaim.costTrackingNotBillingProduct, true);
  assert.equal(h.nonClaim.notSecondCustodyCore, true);
  assert.equal(h.nonClaim.notAkAlAm, true);
});

// ── AJ2: append + chain continuity ──────────────────────────────────────────
test('AJ2: append + chain continuity (prevDigest links tip)', () => {
  const l = ledger();
  const a1 = l.append({
    missionId: 'SPEC-0041',
    sessionId: 'S1',
    kind: 'evd-receipt',
    payload: { event: 'seal' }
  });
  assert.equal(a1.ok, true);
  assert.equal(a1.allow, true);
  assert.equal(a1.code, AJ_CODES.APPENDED);
  assert.equal(a1.seq, 0);
  assert.equal(a1.prevDigest, null);
  assert.ok(a1.digest);
  assert.equal(a1.receipt.PRODUCTION_READY, 'NO');

  const a2 = l.append({
    missionId: 'SPEC-0041',
    sessionId: 'S1',
    kind: 'evd-receipt',
    payload: { event: 'next' }
  });
  assert.equal(a2.ok, true);
  assert.equal(a2.prevDigest, a1.digest);
  assert.equal(a2.seq, 1);
  assert.notEqual(a2.digest, a1.digest);

  const tip = l.getTip();
  assert.equal(tip.tip, a2.digest);
  assert.equal(tip.length, 2);
});

// ── AJ3: verify PASS on intact + genesis empty PASS ─────────────────────────
test('AJ3: verify PASS on intact chain; genesis empty chain PASS', () => {
  const empty = ledger();
  const g = empty.verifyChain();
  assert.equal(g.ok, true);
  assert.equal(g.allow, true);
  assert.equal(g.genesis, true);
  assert.equal(g.length, 0);
  assert.equal(g.code, AJ_CODES.OK);

  const vAlias = empty.verify();
  assert.equal(vAlias.ok, true);
  assert.equal(vAlias.genesis, true);

  const l = ledger();
  l.append({ missionId: 'M', sessionId: 'S', kind: 'evd' });
  l.append({ missionId: 'M', sessionId: 'S', kind: 'evd' });
  const v = l.verify();
  assert.equal(v.ok, true);
  assert.equal(v.allow, true);
  assert.equal(v.length, 2);
  assert.equal(v.genesis, false);
  assert.ok(v.tip);
});

// ── AJ4: tamper → DENY TAMPER_DETECTED / CHAIN_BROKEN ───────────────────────
test('AJ4: tamper payload/digest → DENY TAMPER_DETECTED; broken prev → CHAIN_BROKEN', () => {
  const l = ledger();
  l.append({ missionId: 'M', sessionId: 'S', kind: 'evd', payload: { n: 1 } });
  l.append({ missionId: 'M', sessionId: 'S', kind: 'evd', payload: { n: 2 } });

  l._tamperForTest(0, (e) => {
    e.payload = { n: 99, tampered: true };
  });
  const tampered = l.verifyChain();
  assert.equal(tampered.ok, false);
  assert.equal(tampered.allow, false);
  assert.equal(tampered.code, AJ_CODES.TAMPER_DETECTED);
  assert.ok(tampered.receipt);
  assert.equal(tampered.receipt.code, AJ_CODES.TAMPER_DETECTED);

  const l2 = ledger();
  l2.append({ missionId: 'M', sessionId: 'S', kind: 'evd' });
  l2.append({ missionId: 'M', sessionId: 'S', kind: 'evd' });
  l2._tamperForTest(1, (e) => {
    e.prevDigest = defaultHash({ evil: true });
  });
  const broken = l2.verify();
  assert.equal(broken.ok, false);
  assert.equal(broken.allow, false);
  assert.equal(broken.code, AJ_CODES.CHAIN_BROKEN);
  assert.equal(broken.receipt.code, AJ_CODES.CHAIN_BROKEN);
});

// ── AJ5: query filters ──────────────────────────────────────────────────────
test('AJ5: query filters by missionId / sessionId / kind / time range', () => {
  let t = 0;
  const l = ledger({
    now: () => {
      t += 1;
      return `2026-09-12T00:00:0${t}.000Z`;
    }
  });
  l.append({ missionId: 'AJ', sessionId: 'S1', kind: 'evd-a' });
  l.append({ missionId: 'AJ', sessionId: 'S2', kind: 'evd-b' });
  l.append({ missionId: 'AI', sessionId: 'S1', kind: 'evd-a' });

  const byMission = l.query({ missionId: 'AJ' });
  assert.equal(byMission.ok, true);
  assert.equal(byMission.count, 2);

  const bySession = l.query({ sessionId: 'S1' });
  assert.equal(bySession.count, 2);

  const byKind = l.query({ kind: 'evd-b' });
  assert.equal(byKind.count, 1);
  assert.equal(byKind.entries[0].sessionId, 'S2');

  const byTime = l.query({
    from: '2026-09-12T00:00:02.000Z',
    to: '2026-09-12T00:00:03.000Z'
  });
  assert.equal(byTime.count, 2);

  const none = l.query({ missionId: 'NOPE' });
  assert.equal(none.count, 0);
  assert.equal(none.PRODUCTION_READY, 'NO');
});

// ── AJ6: query sanitization — no secrets leaked ─────────────────────────────
test('AJ6: query + receipts sanitize secrets (runtime synth); no leak', () => {
  const dirtyKey = synthVendorKey();
  const dirtyBearer = synthBearer();
  const l = ledger();
  const appended = l.append({
    missionId: 'AJ',
    sessionId: 'S-sec',
    kind: 'evd',
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    password: 'hunter2-not-a-product-secret',
    token: dirtyKey,
    payload: { note: 'ok', apiKey: dirtyKey }
  });
  assert.equal(appended.ok, true);

  const q = l.query({ sessionId: 'S-sec' });
  assert.equal(q.count, 1);
  const dumped = JSON.stringify(q);
  assert.equal(dumped.includes(dirtyKey), false);
  assert.equal(q.entries[0].payload.apiKey, '[REDACTED]');

  const state = l.getState();
  const stateDump = JSON.stringify(state);
  assert.equal(stateDump.includes(dirtyKey), false);

  const clean = sanitizeLedgerPayload({
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    nested: { token: dirtyKey, password: 'x', safe: 'ok' },
    tokens: 12
  });
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.safe, 'ok');
  assert.equal(clean.tokens, 12);

  const err = new EvidenceEconomyLedgerError(
    `leak ${dirtyKey}`,
    AJ_CODES.DENY
  );
  assert.ok(
    err.message.includes('[REDACTED]') || !err.message.includes(dirtyKey)
  );
});

// ── AJ7: aggregateCosts across entries / sessions ───────────────────────────
test('AJ7: aggregateCosts across entries and sessions (observe-only)', () => {
  const l = ledger();
  l.append({
    missionId: 'AJ',
    sessionId: 'S1',
    kind: 'evd',
    cost: { tokens: 10, costUnits: 2 }
  });
  l.append({
    missionId: 'AJ',
    sessionId: 'S2',
    kind: 'evd',
    tokens: 5,
    costUnits: 1
  });
  l.append({
    missionId: 'AI',
    sessionId: 'S1',
    kind: 'evd',
    cost: { tokens: 7, costUnits: 3 }
  });

  const all = l.aggregateCosts();
  assert.equal(all.ok, true);
  assert.equal(all.observeOnly, true);
  assert.equal(all.totalTokens, 22);
  assert.equal(all.totalCostUnits, 6);
  assert.equal(all.entryCount, 3);
  assert.equal(all.bySession.S1.tokens, 17);
  assert.equal(all.bySession.S2.tokens, 5);
  assert.equal(all.byMission.AJ.tokens, 15);
  assert.equal(all.nonClaim.costTrackingNotBillingProduct, true);
  assert.equal(all.PRODUCTION_READY, 'NO');

  const onlyS1 = l.aggregateCosts({ sessionId: 'S1' });
  assert.equal(onlyS1.totalTokens, 17);
  assert.equal(onlyS1.entryCount, 2);
});

// ── AJ8: trans-session integrity (two sessionIds, one chain) ────────────────
test('AJ8: trans-session integrity — two sessionIds, one chain verify', () => {
  const l = ledger();
  const a = l.append({
    missionId: 'AJ',
    sessionId: 'sess-alpha',
    kind: 'evd',
    priorTip: null,
    custodyDigest: defaultHash({ custody: 'alpha-0' })
  });
  const b = l.append({
    missionId: 'AJ',
    sessionId: 'sess-beta',
    kind: 'evd',
    priorTip: a.digest,
    custodyDigest: defaultHash({ custody: 'beta-0' })
  });
  assert.equal(b.prevDigest, a.digest);
  assert.equal(b.entry.priorTip, a.digest);
  assert.notEqual(a.entry.sessionId, b.entry.sessionId);

  const v = l.verifyChain();
  assert.equal(v.ok, true);
  assert.equal(v.length, 2);

  const qA = l.query({ sessionId: 'sess-alpha' });
  const qB = l.query({ sessionId: 'sess-beta' });
  assert.equal(qA.count, 1);
  assert.equal(qB.count, 1);
  assert.equal(qB.entries[0].prevDigest, qA.entries[0].digest);
});

// ── AJ9: fail-closed unknown / missing deps ─────────────────────────────────
test('AJ9: fail-closed missing/invalid deps → MISSING_DEP', () => {
  const badHash = createEvidenceEconomyLedger({ hash: null });
  const d1 = badHash.append({ missionId: 'M', kind: 'evd' });
  assert.equal(d1.ok, false);
  assert.equal(d1.allow, false);
  assert.equal(d1.code, AJ_CODES.MISSING_DEP);

  const d1v = badHash.verify();
  assert.equal(d1v.code, AJ_CODES.MISSING_DEP);

  const badStore = createEvidenceEconomyLedger({ store: { broken: true } });
  const d2 = badStore.append({ missionId: 'M', kind: 'evd' });
  assert.equal(d2.code, AJ_CODES.MISSING_DEP);

  const badMap = createEvidenceEconomyLedger({ map: { not: 'a-map' } });
  const d3 = badMap.query({});
  assert.equal(d3.code, AJ_CODES.MISSING_DEP);

  const needMeter = createEvidenceEconomyLedger({ requireCostMeter: true });
  const d4 = needMeter.aggregateCosts();
  assert.equal(d4.code, AJ_CODES.MISSING_DEP);
  assert.equal(d4.allow, false);
});

// ── AJ10: Fundacion path deny ───────────────────────────────────────────────
test('AJ10: Fundacion write target on append → FUNDACION_DENY', () => {
  const l = ledger();
  const badPath = l.append({
    missionId: 'AJ',
    sessionId: 'S',
    kind: 'evd',
    path: 'Documents/Fundacion/secret'
  });
  assert.equal(badPath.ok, false);
  assert.equal(badPath.allow, false);
  assert.equal(badPath.code, AJ_CODES.FUNDACION_DENY);
  assert.equal(badPath.receipt.code, AJ_CODES.FUNDACION_DENY);

  const badFlag = l.append({
    missionId: 'AJ',
    fundacionWrite: true,
    kind: 'evd'
  });
  assert.equal(badFlag.code, AJ_CODES.FUNDACION_DENY);

  const badNested = l.append({
    missionId: 'AJ',
    kind: 'evd',
    payload: { target: 'fundacion' }
  });
  assert.equal(badNested.code, AJ_CODES.FUNDACION_DENY);

  // Chain remains empty (nothing appended)
  assert.equal(l.verify().length, 0);
  assert.equal(l.verify().genesis, true);
  assert.equal(isFundacionTarget({ path: 'Documents/Fundacion' }), true);
});

// ── AJ11: INVALID_ENTRY on bad append ───────────────────────────────────────
test('AJ11: invalid append inputs → INVALID_ENTRY fail-closed', () => {
  const l = ledger();
  assert.equal(l.append(null).code, AJ_CODES.INVALID_ENTRY);
  assert.equal(l.append(undefined).code, AJ_CODES.INVALID_ENTRY);
  assert.equal(l.append('not-an-object').code, AJ_CODES.INVALID_ENTRY);
  assert.equal(l.append(42).code, AJ_CODES.INVALID_ENTRY);
  assert.equal(l.append(['arr']).code, AJ_CODES.INVALID_ENTRY);
  assert.equal(l.append(null).allow, false);
});

// ── AJ12: sealReceipt deny / allow ──────────────────────────────────────────
test('AJ12: sealReceipt for deny/allow outcomes + getReceipts', () => {
  const seen = [];
  const l = ledger({ onReceipt: (r) => seen.push(r) });
  const allowRcpt = l.sealReceipt({
    ok: true,
    allow: true,
    code: AJ_CODES.OK,
    phase: 'MANUAL_ALLOW',
    note: 'operator allow'
  });
  assert.equal(allowRcpt.ok, true);
  assert.equal(allowRcpt.allow, true);
  assert.equal(allowRcpt.PRODUCTION_READY, 'NO');
  assert.equal(allowRcpt.kind, AJ_KIND);
  assert.ok(allowRcpt.id);

  const denyRcpt = l.sealReceipt({
    ok: false,
    allow: false,
    code: AJ_CODES.DENY,
    phase: 'MANUAL_DENY'
  });
  assert.equal(denyRcpt.ok, false);
  assert.equal(denyRcpt.allow, false);
  assert.equal(denyRcpt.code, AJ_CODES.DENY);

  l.append({ missionId: 'AJ', kind: 'evd' });
  const receipts = l.getReceipts();
  assert.ok(receipts.length >= 3);
  for (const r of receipts) {
    assert.equal(r.PRODUCTION_READY, 'NO');
    assert.equal(r.kind, AJ_KIND);
    assert.ok(r.id);
    assert.ok(r.at);
  }
  assert.ok(seen.length >= 3);
});

// ── AJ13: hermetic — no network / no cloud-agent ────────────────────────────
test('AJ13: hermetic — no fetch/http client; no cloud-agent import path', () => {
  const src = fs.readFileSync(LEDGER_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);
  assert.ok(src.includes('usesCloudAgent'));
  assert.ok(src.includes('PRODUCTION_READY'));
  assert.ok(src.includes("'NO'") || src.includes('"NO"'));
  assert.ok(src.includes('CHAIN_BROKEN'));
  assert.ok(src.includes('TAMPER_DETECTED'));
  assert.ok(src.includes('FUNDACION_DENY'));
  assert.ok(src.includes('MISSING_DEP'));
  assert.ok(src.includes('INVALID_ENTRY'));
});

// ── AJ14: Law VI — no literal vendor-key prefix substring (rg-style) ────────
test('AJ14: Law VI — rg-style: src+tests have no vendor-key prefix substring', () => {
  const files = [LEDGER_PATH, COST_PATH, TEST_PATH];
  const banned = String.fromCharCode(115, 107, 45); // s k dash
  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    assert.equal(
      body.includes(banned),
      false,
      `banned vendor-key prefix substring found in ${path.basename(f)}`
    );
  }
  // Runtime synth still works
  assert.ok(synthVendorKey().startsWith(banned));
});

// ── AJ15: NON-CLAIM markers present in module comments ──────────────────────
test('AJ15: NON-CLAIM markers present in module comments', () => {
  const src = fs.readFileSync(LEDGER_PATH, 'utf8');
  const cost = fs.readFileSync(COST_PATH, 'utf8');
  const suite = fs.readFileSync(TEST_PATH, 'utf8');
  for (const body of [src, cost, suite]) {
    assert.ok(body.includes('NON-CLAIM'));
    assert.ok(body.includes('external audit platform'));
    assert.ok(body.includes('compliance'));
    assert.ok(body.includes('PRODUCTION_READY'));
    assert.ok(body.includes('billing product'));
  }
  assert.ok(src.includes('HashChainedLedger') || src.includes('custody core'));
  assert.ok(src.includes('not AK / AL / AM') || src.includes('not AK'));
});

// ── AJ16: cost tracker helper + injectable map persistence ──────────────────
test('AJ16: cost tracker helper + injectable map persistence across instances', () => {
  assert.equal(AJ_COST_KIND, 'eos-evidence-cost-tracker');
  assert.equal(AJ_COST_PRODUCTION_READY, 'NO');
  const meter = createEvidenceCostTracker();
  meter.record({
    missionId: 'AJ',
    sessionId: 'S1',
    kind: 'evd',
    tokens: 3,
    costUnits: 1
  });
  const tot = meter.totals();
  assert.equal(tot.totalTokens, 3);
  assert.equal(tot.observeOnly, true);
  assert.equal(extractEntryCost({ cost: { tokens: 4, costUnits: 2 } }).tokens, 4);

  assert.equal(
    stableStringify({ b: 1, a: 2 }),
    stableStringify({ a: 2, b: 1 })
  );

  const map = new Map();
  const l1 = ledger({ map, costMeter: meter });
  const a = l1.append({
    missionId: 'AJ',
    sessionId: 'S-map',
    kind: 'evd',
    cost: { tokens: 8, costUnits: 2 }
  });
  assert.equal(a.ok, true);

  const l2 = ledger({ map });
  const q = l2.query({ sessionId: 'S-map' });
  assert.equal(q.count, 1);
  assert.equal(q.entries[0].digest, a.digest);
  const v = l2.verifyChain();
  assert.equal(v.ok, true);
  assert.equal(v.length, 1);

  const store = createMemoryStore();
  const l3 = ledger({ store });
  l3.append({ missionId: 'AJ', kind: 'evd' });
  const l4 = ledger({ store });
  assert.equal(l4.query({}).count, 1);
  assert.equal(l4.verify().ok, true);
});
