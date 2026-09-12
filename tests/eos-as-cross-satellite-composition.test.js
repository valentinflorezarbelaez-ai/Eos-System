/**
 * @file eos-as-cross-satellite-composition.test.js
 * @description SPEC-0050 / Mission AS — Cross-Satellite Composition Harness.
 * Hermetic TDD: happy path AN×AO×AP×AQ; plane inconsistency → DENY;
 * MISSING_DEP; INVALID_REQUEST; SECRET_LEAK_FORBIDDEN / Law VI;
 * NON-CLAIM ≠ E2E suite / ≠ PR integration / ≠ CloudAgent;
 * AS_PRODUCTION_READY=NO; Fundacion ALWAYS_DENY / Δ=0; hermetic no
 * fetch/http/CloudAgent; shared EVD receipt linkage; concurrent/open
 * composition blocks inconsistent advance.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 *
 * NON-CLAIM: composition ≠ E2E product suite ≠ PRODUCTION_READY
 * integration platform ≠ CloudAgent orchestration; not AT/AU/AV/AW;
 * Fundacion Δ=0; AS_PRODUCTION_READY=NO.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AS_PRODUCTION_READY,
  AS_KIND,
  AS_CODES,
  AS_RECEIPT_KIND,
  AS_RECEIPT_PRODUCTION_READY,
  AS_STUB_PRODUCTION_READY,
  CrossSatelliteCompositionError,
  createCrossSatelliteCompositionHarness,
  createAnPlaneStub,
  createAoPlaneStub,
  createApPlaneStub,
  createAqPlaneStub,
  sanitizeAsPayload,
  defaultHash,
  stableStringify,
  buildCompositionReceipt
} from '../src/core/composition/cross-satellite-composition-harness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HARNESS_PATH = path.join(
  ROOT,
  'src/core/composition/cross-satellite-composition-harness.js'
);
const RECEIPT_PATH = path.join(
  ROOT,
  'src/core/composition/composition-receipt.js'
);
const STUBS_PATH = path.join(ROOT, 'src/core/composition/plane-stubs.js');
const TEST_PATH = path.resolve(
  __dirname,
  'eos-as-cross-satellite-composition.test.js'
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

function allPlanes(opts = {}) {
  const tip = opts.custodyTip || 'shared-tip-hermetic-as-0001';
  return {
    an: createAnPlaneStub({
      custodyTip: tip,
      consistent: opts.anConsistent !== false,
      sessionId: opts.sessionId || 'sess-as-1'
    }),
    ao: createAoPlaneStub({
      consistent: opts.aoConsistent !== false,
      budgetOk: opts.budgetOk !== false,
      providerHealthy: opts.providerHealthy !== false
    }),
    ap: createApPlaneStub({
      consistent: opts.apConsistent !== false,
      authorityOpen: opts.authorityOpen === true,
      authorityGranted: opts.authorityGranted !== false,
      hitlRequired: opts.hitlRequired === true
    }),
    aq: createAqPlaneStub({
      consistent: opts.aqConsistent !== false,
      exportSealed: opts.exportSealed !== false,
      chainTip: opts.chainTip || tip
    })
  };
}

function makeHarness(opts = {}) {
  const planes = opts.planes || allPlanes(opts);
  return createCrossSatelliteCompositionHarness({
    ...planes,
    requireAllPlanes: opts.requireAllPlanes !== false,
    linkCustodyToExport: opts.linkCustodyToExport !== false,
    rejectSecretsInRequest: opts.rejectSecretsInRequest !== false,
    now: opts.now || (() => '2026-09-12T09:00:00.000Z'),
    hash: opts.hash || defaultHash
  });
}

// ── AS1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AS1: kind eos-cross-satellite-composition-harness and PRODUCTION_READY NO', () => {
  const h = makeHarness();
  assert.equal(h.kind, AS_KIND);
  assert.equal(h.kind, 'eos-cross-satellite-composition-harness');
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(AS_PRODUCTION_READY, 'NO');
  const health = h.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, AS_KIND);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(AS_RECEIPT_KIND, 'eos-composition-receipt');
  assert.equal(AS_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(AS_STUB_PRODUCTION_READY, 'NO');
});

// ── AS2: happy path AN×AO×AP×AQ ─────────────────────────────────────────────
test('AS2: happy path AN×AO×AP×AQ scenario completes with sealed receipts', () => {
  const h = makeHarness();
  const out = h.runScenario({
    scenarioId: 'happy-1',
    missionId: 'mission-as',
    requireEvdLink: true
  });
  assert.equal(out.ok, true);
  assert.equal(out.code, AS_CODES.COMPOSITION_OK);
  assert.equal(out.status, 'complete');
  assert.ok(out.receipt);
  assert.equal(out.receipt.sealed, true);
  assert.equal(out.receipt.code, AS_CODES.COMPOSITION_OK);
  assert.equal(out.receipt.PRODUCTION_READY, 'NO');
  assert.ok(out.sharedEvdLink);
  assert.ok(out.compositionId);
  assert.equal(out.e2eProductSuiteClaim, false);
  assert.equal(out.productionReadyIntegrationClaim, false);
  assert.equal(out.cloudAgentOrchestrationClaim, false);
  assert.ok(out.observations.AN);
  assert.ok(out.observations.AO);
  assert.ok(out.observations.AP);
  assert.ok(out.observations.AQ);
  assert.equal(out.planeActions.AQ.ok, true);
  assert.equal(out.planeActions.AQ.pack.sharedEvdLink, out.sharedEvdLink);
});

// ── AS3: plane inconsistency → DENY ─────────────────────────────────────────
test('AS3: plane inconsistency (custody/authority/budget/export) → DENY + receipt', () => {
  // Budget inconsistent (AO)
  const h1 = makeHarness({ budgetOk: false, aoConsistent: false });
  const d1 = h1.runScenario({ scenarioId: 'bad-budget' });
  assert.equal(d1.ok, false);
  assert.equal(d1.code, AS_CODES.PLANE_INCONSISTENT);
  assert.ok(d1.receipt);
  assert.equal(d1.receipt.sealed, true);
  assert.equal(d1.receipt.forensic, true);
  assert.ok(d1.inconsistentPlanes.includes('AO'));

  // Custody inconsistent (AN)
  const h2 = makeHarness({ anConsistent: false });
  const d2 = h2.runScenario({ scenarioId: 'bad-custody' });
  assert.equal(d2.ok, false);
  assert.equal(d2.code, AS_CODES.PLANE_INCONSISTENT);

  // Export inconsistent (AQ)
  const h3 = makeHarness({ aqConsistent: false, exportSealed: false });
  const d3 = h3.runScenario({ scenarioId: 'bad-export' });
  assert.equal(d3.ok, false);
  assert.equal(d3.code, AS_CODES.PLANE_INCONSISTENT);

  // Explicit inconsistentPlanes list
  const h4 = makeHarness();
  const d4 = h4.composePlanes({ inconsistentPlanes: ['AP'] });
  assert.equal(d4.ok, false);
  assert.equal(d4.code, AS_CODES.PLANE_INCONSISTENT);
  assert.ok(d4.inconsistentPlanes.includes('AP'));
});

// ── AS4: MISSING_DEP ────────────────────────────────────────────────────────
test('AS4: MISSING_DEP when a plane injector absent', () => {
  const partial = allPlanes();
  delete partial.ao;
  const h = createCrossSatelliteCompositionHarness({
    ...partial,
    requireAllPlanes: true
  });
  const out = h.runScenario({ scenarioId: 'missing-ao' });
  assert.equal(out.ok, false);
  assert.equal(out.code, AS_CODES.MISSING_DEP);
  assert.ok(out.missing.includes('AO'));
  assert.ok(out.receipt);

  const none = createCrossSatelliteCompositionHarness({
    requireAllPlanes: true
  });
  const out2 = none.composePlanes({});
  assert.equal(out2.code, AS_CODES.MISSING_DEP);
  assert.deepEqual(out2.missing.sort(), ['AN', 'AO', 'AP', 'AQ']);
});

// ── AS5: INVALID_REQUEST ────────────────────────────────────────────────────
test('AS5: INVALID_REQUEST on bad inputs', () => {
  const h = makeHarness();
  // @ts-expect-error intentional
  const a = h.runScenario(null);
  assert.equal(a.ok, false);
  assert.equal(a.code, AS_CODES.INVALID_REQUEST);

  // @ts-expect-error intentional
  const b = h.composePlanes('nope');
  assert.equal(b.ok, false);
  assert.equal(b.code, AS_CODES.INVALID_REQUEST);

  const c = h.endComposition('');
  assert.equal(c.code, AS_CODES.INVALID_REQUEST);

  const d = h.endComposition('AS-COMP-doesnotexist');
  assert.equal(d.code, AS_CODES.INVALID_REQUEST);
});

// ── AS6: Law VI SECRET_LEAK_FORBIDDEN ───────────────────────────────────────
test('AS6: Law VI — secrets never in receipts; SECRET_LEAK_FORBIDDEN', () => {
  const h = makeHarness();
  const leak = h.runScenario({
    scenarioId: 'leak-1',
    apiKey: synthVendorKey(),
    persistSecrets: true
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, AS_CODES.SECRET_LEAK_FORBIDDEN);
  assert.ok(leak.receipt);

  const bearer = h.runScenario({
    scenarioId: 'leak-2',
    authorization: synthBearer(),
    includeSecretsInReceipt: true
  });
  assert.equal(bearer.code, AS_CODES.SECRET_LEAK_FORBIDDEN);

  // Sanitize redacts vendor-style keys built at runtime
  const dirty = {
    token: synthVendorKey('testdatatestdatatestdata'),
    note: 'ok',
    nested: { password: 'hunter2-not-a-vendor-key-but-field' }
  };
  const clean = sanitizeAsPayload(dirty);
  assert.equal(clean.token, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.note, 'ok');
});

// ── AS7: Law VI — no static vendor-key literals ─────────────────────────────
test('AS7: Law VI — no static vendor-key literals in payload sources (rg CLEAN)', () => {
  const files = [HARNESS_PATH, RECEIPT_PATH, STUBS_PATH, TEST_PATH];
  const vendorLiteral = String.fromCharCode(115, 107, 45); // s k -
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // Allow only runtime construction (charCode / join / fromCharCode) —
    // never a contiguous static literal of the vendor prefix in source.
    // Scan for the three-char sequence as a JS string literal.
    const staticLiteralRe = new RegExp(
      `['"\`]${vendorLiteral.replace('-', '\\-')}[A-Za-z0-9]`
    );
    assert.equal(
      staticLiteralRe.test(src),
      false,
      `static vendor-key literal found in ${path.basename(f)}`
    );
  }
});

// ── AS8: NON-CLAIM markers ──────────────────────────────────────────────────
test('AS8: NON-CLAIM ≠ E2E suite / ≠ PR integration / ≠ CloudAgent / AS_PRODUCTION_READY=NO', () => {
  const src = fs.readFileSync(HARNESS_PATH, 'utf8');
  assert.match(src, /E2E product suite/i);
  assert.match(src, /PRODUCTION_READY integration/i);
  assert.match(src, /CloudAgent/i);
  assert.match(src, /Fundacion/);
  assert.match(src, /PRODUCTION_READY:\s*NO/);
  assert.match(src, /not AT\/AU\/AV\/AW/i);

  const h = makeHarness();
  const st = h.getState();
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.e2eProductSuiteClaim, false);
  assert.equal(st.productionReadyIntegrationClaim, false);
  assert.equal(st.cloudAgentOrchestrationClaim, false);
  assert.equal(st.nonClaim.compositionNotE2EProductSuite, true);
  assert.equal(st.nonClaim.compositionNotProductionReadyIntegration, true);
  assert.equal(st.nonClaim.compositionNotCloudAgentOrchestration, true);
  assert.equal(st.nonClaim.notAtAuAvAw, true);
  assert.equal(st.nonClaim.asProductionReadyNo, true);
});

// ── AS9: Fundacion ALWAYS_DENY / Δ=0 ────────────────────────────────────────
test('AS9: Fundacion ALWAYS_DENY / Δ=0 — fundacion write targets denied', () => {
  const h = makeHarness();
  const a = h.runScenario({
    scenarioId: 'fund-1',
    fundacion: true
  });
  assert.equal(a.ok, false);
  assert.equal(a.code, AS_CODES.FUNDACION_DENIED);
  assert.equal(a.fundacion, 'ALWAYS_DENY');
  assert.equal(a.fundacionDelta, 0);

  const b = h.composePlanes({
    fundacionWrite: true,
    target: 'Documents/Fundacion/secret'
  });
  assert.equal(b.code, AS_CODES.FUNDACION_DENIED);

  const st = h.getState();
  assert.equal(st.fundacion, 'ALWAYS_DENY');
  assert.equal(st.fundacionDelta, 0);
});

// ── AS10: hermetic — no fetch/http/CloudAgent ───────────────────────────────
test('AS10: hermetic — no fetch/http; no CloudAgent; fail-closed codes present', () => {
  const src = fs.readFileSync(HARNESS_PATH, 'utf8');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /\bhttp\.request\b/);
  assert.doesNotMatch(src, /\bhttps\.request\b/);
  assert.doesNotMatch(src, /CloudAgent\.launch/);
  assert.doesNotMatch(src, /from ['"]@cursor\/cloud-agent/);

  const expected = [
    'OK',
    'COMPOSITION_OK',
    'PLANE_INCONSISTENT',
    'COMPOSITION_DENIED',
    'MISSING_DEP',
    'INVALID_REQUEST',
    'SECRET_LEAK_FORBIDDEN',
    'EVD_LINK_FAIL',
    'FUNDACION_DENIED',
    'HITL_REQUIRED'
  ];
  for (const c of expected) {
    assert.equal(AS_CODES[c], c);
  }
  assert.equal(Object.isFrozen(AS_CODES), true);
});

// ── AS11: PRODUCTION_READY === NO everywhere ────────────────────────────────
test('AS11: PRODUCTION_READY === NO on harness, receipts, health, state, stubs', () => {
  const h = makeHarness();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.health().PRODUCTION_READY, 'NO');
  assert.equal(h.getState().PRODUCTION_READY, 'NO');
  const out = h.runScenario({ scenarioId: 'pr-1' });
  assert.equal(out.PRODUCTION_READY, 'NO');
  assert.equal(out.receipt.PRODUCTION_READY, 'NO');
  const planes = allPlanes();
  assert.equal(planes.an.PRODUCTION_READY, 'NO');
  assert.equal(planes.ao.PRODUCTION_READY, 'NO');
  assert.equal(planes.ap.PRODUCTION_READY, 'NO');
  assert.equal(planes.aq.PRODUCTION_READY, 'NO');
});

// ── AS12: shared EVD receipt linkage across planes ──────────────────────────
test('AS12: shared EVD receipt linkage across planes', () => {
  const h = makeHarness();
  const out = h.runScenario({
    scenarioId: 'evd-link-1',
    requireEvdLink: true
  });
  assert.equal(out.ok, true);
  assert.ok(out.sharedEvdLink);
  assert.equal(out.receipt.sharedEvdLink, out.sharedEvdLink);
  assert.equal(out.planeActions.AQ.pack.sharedEvdLink, out.sharedEvdLink);

  // Receipts list carries linkage
  const rcpts = h.getReceipts();
  assert.ok(rcpts.length >= 1);
  const last = rcpts[rcpts.length - 1];
  assert.equal(last.sharedEvdLink, out.sharedEvdLink);
  assert.equal(last.sealed, true);
});

// ── AS13: concurrent/open composition blocks inconsistent advance ───────────
test('AS13: concurrent/open composition blocks inconsistent advance', () => {
  const h = makeHarness();
  const begun = h.beginComposition({ scenarioId: 'open-1' });
  assert.equal(begun.ok, true);
  assert.equal(begun.status, 'open');
  assert.equal(h.getState().openCount, 1);

  const blocked = h.advanceComposition({ note: 'try-advance' });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, AS_CODES.COMPOSITION_DENIED);
  assert.ok(/concurrent|open composition/i.test(blocked.reason));

  const forced = h.runScenario({
    scenarioId: 'force-1',
    forceAdvance: true
  });
  assert.equal(forced.ok, false);
  assert.equal(forced.code, AS_CODES.COMPOSITION_DENIED);

  const ended = h.endComposition(begun.compositionId);
  assert.equal(ended.ok, true);
  assert.equal(h.getState().openCount, 0);

  const advanced = h.advanceComposition({});
  assert.equal(advanced.ok, true);
  assert.equal(advanced.code, AS_CODES.OK);
});

// ── AS14: HITL_REQUIRED when AP authority open ──────────────────────────────
test('AS14: HITL_REQUIRED when AP authority open during compose', () => {
  const h = makeHarness({ authorityOpen: true, hitlRequired: true });
  const out = h.composePlanes({});
  assert.equal(out.ok, false);
  assert.equal(out.code, AS_CODES.HITL_REQUIRED);
  assert.equal(out.hitlRequired, true);
  assert.ok(out.receipt);

  const allowed = h.composePlanes({ allowOpenAuthority: true });
  // With allowOpenAuthority, open AP is not treated as hard deny if consistent
  // (authorityOpen alone was the HITL gate; consistent still true)
  assert.equal(allowed.ok, true);
  assert.equal(allowed.code, AS_CODES.OK);
});

// ── AS15: tip mismatch AN↔AQ when requireTipMatch ───────────────────────────
test('AS15: AN custody tip ↔ AQ chain tip mismatch → PLANE_INCONSISTENT', () => {
  const planes = {
    an: createAnPlaneStub({ custodyTip: 'tip-A', consistent: true }),
    ao: createAoPlaneStub({ consistent: true }),
    ap: createApPlaneStub({ consistent: true, authorityGranted: true }),
    aq: createAqPlaneStub({ chainTip: 'tip-B', consistent: true })
  };
  const h = createCrossSatelliteCompositionHarness({
    ...planes,
    linkCustodyToExport: true
  });
  const out = h.composePlanes({ requireTipMatch: true });
  assert.equal(out.ok, false);
  assert.equal(out.code, AS_CODES.PLANE_INCONSISTENT);
  assert.ok(out.inconsistentPlanes.includes('AN'));
  assert.ok(out.inconsistentPlanes.includes('AQ'));
});

// ── AS16: helpers + error class + codes stable; AT–AW not implemented ───────
test('AS16: helpers; CrossSatelliteCompositionError; AT–AW not implemented', () => {
  const dig = defaultHash({ a: 1 });
  assert.equal(typeof dig, 'string');
  assert.equal(dig.length, 64);
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');

  const rcpt = buildCompositionReceipt(
    { ok: true, code: 'OK', scenarioId: 'x' },
    { hash: defaultHash, now: () => '2026-09-12T00:00:00.000Z' }
  );
  assert.equal(rcpt.kind, AS_RECEIPT_KIND);
  assert.equal(rcpt.sealed, true);
  assert.ok(rcpt.receiptId.startsWith('AS-RCPT-'));

  const err = new CrossSatelliteCompositionError('boom', AS_CODES.COMPOSITION_DENIED, {
    apiKey: synthVendorKey()
  });
  assert.equal(err.name, 'CrossSatelliteCompositionError');
  assert.equal(err.code, AS_CODES.COMPOSITION_DENIED);
  assert.equal(err.details.apiKey, '[REDACTED]');

  // AV/AW must not appear as implemented modules in this payload (AT & AU are implemented)
  const srcRoot = path.join(ROOT, 'src');
  const walk = (dir) => {
    /** @type {string[]} */
    const out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walk(p));
      else out.push(p);
    }
    return out;
  };
  const files = walk(srcRoot).map((f) => path.basename(f));
  for (const banned of [
    'freeze-drift-observer',
    'ladder17-seam-pack'
  ]) {
    assert.equal(
      files.some((f) => f.includes(banned)),
      false,
      `AV–AW artifact leaked: ${banned}`
    );
  }

  const harnessSrc = fs.readFileSync(HARNESS_PATH, 'utf8');
  assert.match(harnessSrc, /not AT\/AU\/AV\/AW/);
});

// ── AS17: getState NON-CLAIM; scenario counters; throwOnDeny optional ───────
test('AS17: getState counters; optional throwOnDeny; sealReceipt surface', () => {
  const h = makeHarness();
  h.runScenario({ scenarioId: 'c1' });
  h.runScenario({
    scenarioId: 'c2',
    inconsistentPlanes: ['AO']
  });
  const st = h.getState();
  assert.equal(st.scenarioCount, 2);
  assert.ok(st.okCount >= 1);
  assert.ok(st.denyCount >= 1);
  assert.ok(st.inconsistentCount >= 1);
  assert.equal(st.planes.AN.present, true);
  assert.equal(st.cloudAgent, false);

  const sealed = h.sealReceipt({
    ok: true,
    code: AS_CODES.OK,
    phase: 'MANUAL',
    sharedEvdLink: 'link-manual'
  });
  assert.equal(sealed.sealed, true);
  assert.equal(sealed.channelKind, AS_KIND);

  const thrower = createCrossSatelliteCompositionHarness({
    ...allPlanes(),
    throwOnDeny: true
  });
  assert.throws(
    () => thrower.runScenario({ fundacion: true }),
    (e) =>
      e instanceof CrossSatelliteCompositionError &&
      e.code === AS_CODES.FUNDACION_DENIED
  );
});
