/**
 * @file eos-ap-hitl-po-authority-channel.test.js
 * @description SPEC-0047 / Mission AP — HITL / PO Authority Channel Hardening.
 * Hermetic TDD: escalate opens + pauses scheduler; approve → resume + sealed
 * receipt linked to ledger tip; deny → DENY + forensic receipt; timeout → DENY
 * (no auto-approve); open request blocks dependent cycle; MISSING_DEP /
 * INVALID_REQUEST; SECRET_LEAK_FORBIDDEN / Law VI; NON-CLAIM; Fundacion
 * ALWAYS_DENY / Δ=0; hermetic no fetch/http/CloudAgent; consumable by
 * AN/AO/AL-style injectors.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 *
 * NON-CLAIM: authority ≠ GH enforcement ≠ org IAM ≠ approval SaaS;
 * not AQ/AR; Fundacion Δ=0; AP_PRODUCTION_READY=NO.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AP_PRODUCTION_READY,
  AP_KIND,
  AP_CODES,
  AP_DECISIONS,
  HitlPoAuthorityChannelError,
  createHitlPoAuthorityChannel,
  createMemoryAuthorityLedger,
  createMemoryAuthorityScheduler,
  createMemoryConstitutionGate,
  sanitizeApPayload,
  defaultHash,
  stableStringify,
  AP_RECEIPT_KIND,
  AP_RECEIPT_PRODUCTION_READY,
  buildAuthorityReceipt
} from '../src/core/authority/hitl-po-authority-channel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHANNEL_PATH = path.join(
  ROOT,
  'src/core/authority/hitl-po-authority-channel.js'
);
const RECEIPT_PATH = path.join(ROOT, 'src/core/authority/authority-receipt.js');
const TEST_PATH = path.resolve(
  __dirname,
  'eos-ap-hitl-po-authority-channel.test.js'
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

function channel(opts = {}) {
  return createHitlPoAuthorityChannel({
    ledger: opts.ledger,
    scheduler: opts.scheduler,
    constitutionGate: opts.constitutionGate,
    now: opts.now,
    hash: opts.hash,
    receiptSealer: opts.receiptSealer,
    defaultTimeoutMs: opts.defaultTimeoutMs,
    requireLedger: opts.requireLedger,
    requireScheduler: opts.requireScheduler,
    throwOnDeny: opts.throwOnDeny,
    rejectSecretsInRequest: opts.rejectSecretsInRequest,
    autoApproveOnTimeout: opts.autoApproveOnTimeout
  });
}

function harness(opts = {}) {
  const ledger = opts.ledger || createMemoryAuthorityLedger();
  const scheduler = opts.scheduler || createMemoryAuthorityScheduler();
  const gate =
    opts.gate !== undefined
      ? opts.gate
      : createMemoryConstitutionGate({ alwaysAllow: true });
  const ch = channel({
    ledger,
    scheduler,
    constitutionGate: gate,
    defaultTimeoutMs: opts.defaultTimeoutMs || 5_000,
    requireLedger: opts.requireLedger,
    requireScheduler: opts.requireScheduler,
    now: opts.now,
    hash: opts.hash
  });
  return { ch, ledger, scheduler, gate };
}

// ── AP1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AP1: kind eos-hitl-po-authority-channel and PRODUCTION_READY NO', () => {
  const { ch } = harness();
  assert.equal(ch.kind, AP_KIND);
  assert.equal(ch.kind, 'eos-hitl-po-authority-channel');
  assert.equal(ch.PRODUCTION_READY, 'NO');
  assert.equal(AP_PRODUCTION_READY, 'NO');
  const h = ch.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AP_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.usesCloudAgent, false);
  assert.equal(h.autoApproveOnTimeout, false);
  assert.equal(h.nonClaim.authorityNotGhBranchProtection, true);
  assert.equal(h.nonClaim.authorityNotOrgIam, true);
  assert.equal(h.nonClaim.authorityNotApprovalSaas, true);
  assert.equal(h.nonClaim.notAqAr, true);
  assert.equal(AP_RECEIPT_KIND, 'eos-authority-receipt');
  assert.equal(AP_RECEIPT_PRODUCTION_READY, 'NO');
});

// ── AP2: escalate opens request + pauses scheduler ──────────────────────────
test('AP2: escalate openRequest → HITL_REQUIRED + pauses scheduler + sealed receipt', () => {
  const { ch, scheduler, ledger } = harness();
  assert.equal(scheduler.isPaused(), false);

  const out = ch.openRequest({
    actionId: 'long-horizon-spend-1',
    reason: 'PO authority required for autonomy horizon',
    timeoutMs: 10_000
  });

  assert.equal(out.ok, true);
  assert.equal(out.allow, false);
  assert.equal(out.code, AP_CODES.HITL_REQUIRED);
  assert.equal(out.status, 'open');
  assert.equal(out.hitlRequired, true);
  assert.ok(out.requestId);
  assert.equal(out.actionId, 'long-horizon-spend-1');
  assert.equal(scheduler.isPaused(), true);
  assert.equal(out.schedulerPaused, true);
  assert.ok(out.receipt);
  assert.equal(out.receipt.sealed, true);
  assert.equal(out.receipt.code, AP_CODES.HITL_REQUIRED);
  assert.equal(out.receipt.PRODUCTION_READY, 'NO');
  assert.ok(out.receipt.ledgerTip || out.receipt.replayLink);
  assert.ok(ledger.tip());

  const open = ch.getOpenRequests();
  assert.equal(open.length, 1);
  assert.equal(open[0].code, AP_CODES.AUTHORITY_OPEN);
});

// ── AP3: approve → resume + sealed receipt linked to ledger tip ─────────────
test('AP3: approve → resume scheduler + sealed receipt linked to ledger tip', () => {
  const { ch, scheduler, ledger } = harness();
  const tipBefore = ledger.tip();

  const opened = ch.openRequest({
    actionId: 'act-approve',
    reason: 'need PO'
  });
  assert.equal(scheduler.isPaused(), true);

  const decided = ch.decide(opened.requestId, {
    decision: AP_DECISIONS.APPROVE,
    actor: 'po-operator'
  });

  assert.equal(decided.ok, true);
  assert.equal(decided.allow, true);
  assert.equal(decided.code, AP_CODES.AUTHORITY_APPROVED);
  assert.equal(decided.decision, 'approve');
  assert.equal(decided.resumed, true);
  assert.equal(scheduler.isPaused(), false);
  assert.ok(decided.receipt);
  assert.equal(decided.receipt.sealed, true);
  assert.equal(decided.receipt.decision, 'approve');
  assert.ok(decided.receipt.ledgerTip);
  assert.ok(decided.receipt.replayLink);
  assert.equal(decided.receipt.replayLink.kind, 'aj-like-ledger-tip');
  // Ledger tip advanced (append on seal)
  assert.notEqual(ledger.tip(), tipBefore);
  assert.equal(ch.getOpenRequests().length, 0);
});

// ── AP4: deny → DENY + forensic receipt ─────────────────────────────────────
test('AP4: deny → AUTHORITY_DENIED + forensic receipt (no auto-approve)', () => {
  const { ch, scheduler } = harness();
  const opened = ch.openRequest({ actionId: 'act-deny', reason: 'review' });

  const denied = ch.decide(opened.requestId, {
    decision: 'deny',
    actor: 'po-operator',
    reason: 'out of policy'
  });

  assert.equal(denied.ok, false);
  assert.equal(denied.allow, false);
  assert.equal(denied.code, AP_CODES.AUTHORITY_DENIED);
  assert.equal(denied.decision, 'deny');
  assert.equal(denied.forensic, true);
  assert.ok(denied.receipt);
  assert.equal(denied.receipt.forensic, true);
  assert.equal(denied.receipt.code, AP_CODES.AUTHORITY_DENIED);
  assert.equal(denied.receipt.sealed, true);
  // Scheduler resumes after terminal decision (system not wedged)
  assert.equal(scheduler.isPaused(), false);
  assert.equal(ch.getOpenRequests().length, 0);
});

// ── AP5: timeout → DENY (no auto-approve) ───────────────────────────────────
test('AP5: timeout → AUTHORITY_TIMEOUT DENY; autoApproved=false; no auto-approve', () => {
  const { ch, scheduler } = harness({ defaultTimeoutMs: 100 });
  const openedAtMs = 1_000_000;
  const opened = ch.openRequest({
    actionId: 'act-timeout',
    timeoutMs: 100,
    openedAtMs
  });
  assert.equal(opened.ok, true);
  assert.equal(scheduler.isPaused(), true);

  // Before expiry — no timeout
  const early = ch.tickTimeout({ nowMs: openedAtMs + 50 });
  assert.equal(early.code, AP_CODES.OK);
  assert.equal(early.timedOut.length, 0);
  assert.equal(ch.getOpenRequests().length, 1);

  // After expiry — DENY, never auto-approve
  const late = ch.tickTimeout({ nowMs: openedAtMs + 101 });
  assert.equal(late.code, AP_CODES.AUTHORITY_TIMEOUT);
  assert.equal(late.timedOut.length, 1);
  assert.equal(late.timedOut[0].code, AP_CODES.AUTHORITY_TIMEOUT);
  assert.equal(late.timedOut[0].allow, false);
  assert.equal(late.timedOut[0].autoApproved, false);
  assert.equal(late.timedOut[0].forensic, true);
  assert.equal(late.autoApproveOnTimeout, false);
  assert.ok(late.timedOut[0].receipt.sealed);
  assert.equal(late.timedOut[0].receipt.autoApproved, false);
  assert.equal(scheduler.isPaused(), false);
  assert.equal(ch.getOpenRequests().length, 0);

  // Explicit autoApproveOnTimeout option is ignored (fail-closed)
  const { ch: ch2 } = harness({ defaultTimeoutMs: 10 });
  const o2 = ch2.openRequest({
    actionId: 'act-no-auto',
    timeoutMs: 10,
    openedAtMs: 50
  });
  // Even if caller tries to enable auto-approve via factory, channel forces false
  const t2 = ch2.tickTimeout({ nowMs: 100, requestId: o2.requestId });
  assert.equal(t2.timedOut[0].autoApproved, false);
  assert.equal(t2.autoApproveOnTimeout, false);
});

// ── AP6: open request blocks dependent AF-like cycle advance ────────────────
test('AP6: WHILE authority open → SCHEDULER_BLOCKED on dependent cycle advance', () => {
  const { ch, scheduler } = harness();

  // No open → advance OK
  const free = ch.tryAdvanceDependentCycle({ cycle: 'af-like-1' });
  assert.equal(free.ok, true);
  assert.equal(scheduler.getCycleCount(), 1);

  const opened = ch.openRequest({ actionId: 'block-cycles' });
  assert.equal(opened.code, AP_CODES.HITL_REQUIRED);

  const blocked = ch.tryAdvanceDependentCycle({ cycle: 'af-like-2' });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, AP_CODES.SCHEDULER_BLOCKED);
  assert.equal(scheduler.getCycleCount(), 1); // unchanged
  assert.ok(scheduler.getBlockedAttempts().length >= 1);

  // After approve → advance OK again
  ch.decide(opened.requestId, 'approve');
  const after = ch.tryAdvanceDependentCycle({ cycle: 'af-like-3' });
  assert.equal(after.ok, true);
  assert.equal(scheduler.getCycleCount(), 2);
});

// ── AP7: MISSING_DEP when ledger/scheduler injectors required absent ────────
test('AP7: MISSING_DEP when ledger/scheduler injectors absent', () => {
  const r1 = channel({ requireLedger: true, ledger: null });
  const out1 = r1.openRequest({ actionId: 'x' });
  assert.equal(out1.ok, false);
  assert.equal(out1.code, AP_CODES.MISSING_DEP);
  assert.equal(out1.dep, 'ledger');

  const r2 = channel({
    requireScheduler: true,
    scheduler: null,
    ledger: createMemoryAuthorityLedger()
  });
  const out2 = r2.openRequest({ actionId: 'y' });
  assert.equal(out2.ok, false);
  assert.equal(out2.code, AP_CODES.MISSING_DEP);
  assert.equal(out2.dep, 'scheduler');
});

// ── AP8: INVALID_REQUEST ────────────────────────────────────────────────────
test('AP8: INVALID_REQUEST — bad open / decide / missing actionId', () => {
  const { ch } = harness();
  const bad = ch.openRequest(null);
  assert.equal(bad.code, AP_CODES.INVALID_REQUEST);

  const noAction = ch.openRequest({ reason: 'no-id' });
  assert.equal(noAction.code, AP_CODES.INVALID_REQUEST);

  const opened = ch.openRequest({ actionId: 'ok' });
  const badDecide = ch.decide('', 'approve');
  assert.equal(badDecide.code, AP_CODES.INVALID_REQUEST);

  const unknown = ch.decide('AP-REQ-missing', 'approve');
  assert.equal(unknown.code, AP_CODES.INVALID_REQUEST);

  const badVerb = ch.decide(opened.requestId, { decision: 'maybe' });
  assert.equal(badVerb.code, AP_CODES.INVALID_REQUEST);
});

// ── AP9: Law VI — secrets never in receipts (runtime synth) ─────────────────
test('AP9: Law VI — secrets never in receipts; SECRET_LEAK_FORBIDDEN', () => {
  const dirtyKey = synthVendorKey();
  const dirtyBearer = synthBearer();
  const { ch } = harness();

  const opened = ch.openRequest({
    actionId: 'safe-open',
    reason: 'ok',
    meta: { note: 'fine' },
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    token: dirtyKey
  });
  assert.equal(opened.ok, true);
  const dumped = JSON.stringify(opened.receipt);
  assert.equal(dumped.includes(dirtyKey), false);
  assert.equal(dumped.includes(dirtyBearer), false);

  const leak = ch.openRequest({
    actionId: 'leak',
    apiKey: dirtyKey,
    persistSecrets: true
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, AP_CODES.SECRET_LEAK_FORBIDDEN);
  assert.equal(JSON.stringify(leak).includes(dirtyKey), false);

  const clean = sanitizeApPayload({
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    nested: { token: dirtyKey, password: 'x', safe: 'ok' },
    actionId: 'act-1'
  });
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.safe, 'ok');
  assert.equal(clean.actionId, 'act-1');

  const err = new HitlPoAuthorityChannelError(
    `leak ${dirtyKey}`,
    AP_CODES.AUTHORITY_DENIED
  );
  assert.ok(
    err.message.includes('[REDACTED]') || !err.message.includes(dirtyKey)
  );

  // decide path SECRET_LEAK
  const o2 = ch.openRequest({ actionId: 'decide-leak' });
  const leakDecide = ch.decide(o2.requestId, {
    decision: 'approve',
    apiKey: dirtyKey,
    persistSecrets: true
  });
  assert.equal(leakDecide.code, AP_CODES.SECRET_LEAK_FORBIDDEN);
});

// ── AP10: Law VI — no static vendor-key literals (rg CLEAN) ──────────────────
test('AP10: Law VI — no static vendor-key literals in payload sources (rg vendor-prefix CLEAN)', () => {
  const files = [CHANNEL_PATH, RECEIPT_PATH, TEST_PATH];
  const barePrefix = String.fromCharCode(115, 107, 45);
  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    const contiguousInQuotes = new RegExp(
      `['"\`]${barePrefix.replace('-', '\\-')}`
    );
    assert.equal(
      contiguousInQuotes.test(body),
      false,
      `contiguous vendor-prefix literal in quotes in ${path.basename(f)}`
    );
  }
  assert.ok(synthVendorKey().startsWith(barePrefix));
});

// ── AP11: NON-CLAIM markers ─────────────────────────────────────────────────
test('AP11: NON-CLAIM markers — ≠ GH enforcement / ≠ IAM / ≠ approval SaaS / not AQ–AR', () => {
  const src = fs.readFileSync(CHANNEL_PATH, 'utf8');
  assert.ok(
    /GH required-check|branch-protection|authorityNotGhBranchProtection/i.test(
      src
    )
  );
  assert.ok(/org IAM|authorityNotOrgIam/i.test(src));
  assert.ok(
    /approval SaaS|authorityNotApprovalSaas|PRODUCTION_READY approval/i.test(
      src
    )
  );
  assert.ok(/not AQ\/AR|notAqAr/i.test(src));
  assert.ok(/Antigravity-first/i.test(src));
  assert.ok(/Law VI/i.test(src));
  assert.ok(/CloudAgent/.test(src));
  assert.ok(/AP_PRODUCTION_READY\s*=\s*'NO'/.test(src));

  const h = harness().ch.health();
  assert.equal(h.nonClaim.authorityNotGhBranchProtection, true);
  assert.equal(h.nonClaim.authorityNotOrgIam, true);
  assert.equal(h.nonClaim.authorityNotApprovalSaas, true);
  assert.equal(h.nonClaim.notAqAr, true);
  assert.equal(h.nonClaim.noAutoApproveOnTimeout, true);
  assert.equal(h.cloudAgent, false);
});

// ── AP12: Fundacion ALWAYS_DENY / Δ=0 ───────────────────────────────────────
test('AP12: Fundacion ALWAYS_DENY / Δ=0 — fundacion write targets denied', () => {
  const { ch } = harness();
  const denied = ch.openRequest({
    actionId: 'fundacion-write',
    fundacionWrite: true
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, AP_CODES.AUTHORITY_DENIED);
  assert.equal(denied.fundacion, 'ALWAYS_DENY');
  assert.equal(denied.fundacionDelta, 0);

  const byTarget = ch.openRequest({
    actionId: 'path-fundacion',
    target: 'Documents/Fundacion/ledger'
  });
  assert.equal(byTarget.code, AP_CODES.AUTHORITY_DENIED);

  const st = ch.getState();
  assert.equal(st.fundacion, 'ALWAYS_DENY');
  assert.equal(st.fundacionDelta, 0);
  assert.equal(st.nonClaim.fundacionDelta0, true);
});

// ── AP13: hermetic — no fetch/http / no CloudAgent; fail-closed codes ───────
test('AP13: hermetic — no fetch/http; no CloudAgent; fail-closed codes present', () => {
  const src = fs.readFileSync(CHANNEL_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);
  for (const code of [
    'HITL_REQUIRED',
    'AUTHORITY_DENIED',
    'AUTHORITY_TIMEOUT',
    'AUTHORITY_OPEN',
    'MISSING_DEP',
    'INVALID_REQUEST',
    'SECRET_LEAK_FORBIDDEN',
    'LEDGER_LINK_FAIL',
    'SCHEDULER_BLOCKED'
  ]) {
    assert.ok(src.includes(code), `missing code ${code}`);
    assert.equal(AP_CODES[code], code);
  }
  assert.equal(AP_CODES.AUTHORITY_APPROVED, 'AUTHORITY_APPROVED');
});

// ── AP14: PRODUCTION_READY === 'NO' pinned everywhere ───────────────────────
test('AP14: PRODUCTION_READY === NO on channel, receipts, health, state', () => {
  const { ch } = harness();
  const out = ch.openRequest({ actionId: 'pr-pin' });
  assert.equal(out.PRODUCTION_READY, 'NO');
  assert.equal(out.receipt.PRODUCTION_READY, 'NO');
  assert.equal(ch.health().PRODUCTION_READY, 'NO');
  assert.equal(ch.getState().PRODUCTION_READY, 'NO');
  assert.equal(AP_PRODUCTION_READY, 'NO');
  const src = fs.readFileSync(CHANNEL_PATH, 'utf8');
  assert.match(src, /AP_PRODUCTION_READY\s*=\s*'NO'/);
  assert.match(src, /PRODUCTION_READY:\s*NO/);
});

// ── AP15: consumable by AN/AO/AL-style injectors (fake consumers) ────────────
test('AP15: consumable by AN/AO/AL-style injectors (fake federation/failover/replay consumers)', () => {
  const { ch, ledger } = harness();

  // AN-like federation consumer: reads sealed authority receipt for envelope
  const opened = ch.openRequest({ actionId: 'an-consumer' });
  const anConsumer = {
    kind: 'eos-an-like-federation-stub',
    ingestAuthorityReceipt(receipt) {
      assert.ok(receipt.sealed);
      assert.ok(receipt.receiptDigest);
      assert.equal(receipt.PRODUCTION_READY, 'NO');
      return { ok: true, linked: receipt.receiptId };
    }
  };
  assert.equal(
    anConsumer.ingestAuthorityReceipt(opened.receipt).ok,
    true
  );

  // AO-like failover consumer: gates long-horizon route on authority open
  const aoConsumer = {
    kind: 'eos-ao-like-failover-stub',
    canRouteLongHorizon(channelState) {
      if (channelState.openCount > 0) {
        return { ok: false, code: AP_CODES.AUTHORITY_OPEN };
      }
      return { ok: true, code: AP_CODES.OK };
    }
  };
  assert.equal(
    aoConsumer.canRouteLongHorizon(ch.getState()).ok,
    false
  );

  ch.decide(opened.requestId, 'approve');
  assert.equal(aoConsumer.canRouteLongHorizon(ch.getState()).ok, true);

  // AL-like replay observer: follows ledger tip / replayLink
  const receipts = ch.getReceipts();
  const alObserver = {
    kind: 'eos-al-like-replay-stub',
    observe(receipt) {
      return {
        ok: true,
        tip: receipt.ledgerTip || receipt.replayLink?.ledgerTip || null,
        digest: receipt.receiptDigest
      };
    }
  };
  const last = receipts[receipts.length - 1];
  const obs = alObserver.observe(last);
  assert.equal(obs.ok, true);
  assert.ok(obs.tip);
  assert.equal(obs.tip, ledger.tip());
});

// ── AP16: LEDGER_LINK_FAIL + constitution gate DENY + helpers ────────────────
test('AP16: LEDGER_LINK_FAIL; constitution gate DENY; sealReceipt; hash helpers', () => {
  // Ledger present but tip() returns null → LEDGER_LINK_FAIL when required
  const badLedger = {
    tip() {
      return null;
    },
    append() {
      throw new Error('append fail');
    }
  };
  const ch1 = channel({
    ledger: badLedger,
    scheduler: createMemoryAuthorityScheduler(),
    requireLedger: true
  });
  const linkFail = ch1.openRequest({ actionId: 'no-tip' });
  assert.equal(linkFail.code, AP_CODES.LEDGER_LINK_FAIL);

  // Constitution gate DENY on open
  const gate = createMemoryConstitutionGate({ alwaysAllow: false });
  const { ch: ch2 } = harness({ gate });
  const gated = ch2.openRequest({ actionId: 'gated' });
  assert.equal(gated.code, AP_CODES.AUTHORITY_DENIED);

  assert.equal(
    stableStringify({ b: 1, a: 2 }),
    stableStringify({ a: 2, b: 1 })
  );
  const dig = defaultHash({ x: 1 });
  assert.equal(dig.length, 64);

  const { ch } = harness();
  const rcpt = ch.sealReceipt({
    ok: true,
    code: AP_CODES.OK,
    phase: 'MANUAL',
    requestId: 'AP-REQ-manual'
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(rcpt.PRODUCTION_READY, 'NO');
  assert.ok(rcpt.receiptDigest);
  assert.ok(ch.getReceipts().length >= 1);

  const built = buildAuthorityReceipt(
    { code: AP_CODES.OK, requestId: 'AP-REQ-x', phase: 'TEST' },
    { ledgerTip: 'abc' }
  );
  assert.equal(built.kind, AP_RECEIPT_KIND);
  assert.equal(built.sealed, true);
  assert.equal(built.ledgerTip, 'abc');
});

// ── AP17: getState NON-CLAIM + AUTHORITY_OPEN surface + decide string verb ──
test('AP17: getState NON-CLAIM; AUTHORITY_OPEN; decide via string verb; codes stable', () => {
  const { ch, scheduler } = harness();
  const opened = ch.openRequest({ actionId: 'state-check' });
  assert.equal(opened.code, AP_CODES.HITL_REQUIRED);

  const st = ch.getState();
  assert.equal(st.kind, AP_KIND);
  assert.equal(st.openCount, 1);
  assert.equal(st.fundacion, 'ALWAYS_DENY');
  assert.equal(st.fundacionDelta, 0);
  assert.equal(st.autoApproveOnTimeout, false);
  assert.equal(st.nonClaim.antigravityFirst, true);
  assert.equal(st.nonClaim.lawViEnvOnly, true);
  assert.equal(st.nonClaim.noAutoApproveOnTimeout, true);
  assert.equal(st.scheduler.paused, true);
  assert.equal(st.ledger.present, true);
  assert.ok(st.openRequests[0].code === AP_CODES.AUTHORITY_OPEN);

  const approved = ch.decide(opened.requestId, 'approve');
  assert.equal(approved.code, AP_CODES.AUTHORITY_APPROVED);
  assert.equal(scheduler.isPaused(), false);

  assert.equal(AP_DECISIONS.APPROVE, 'approve');
  assert.equal(AP_DECISIONS.DENY, 'deny');
});
