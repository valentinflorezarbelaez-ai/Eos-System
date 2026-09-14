/**
 * @file eos-bm-agent-identity-attestation-port.test.js
 * @description SPEC-0070 / Mission BM — Agent Identity Attestation & Action
 * Provenance Port. Hermetic TDD (~16):
 * kind + PRODUCTION_READY NO; happy-path BM-RCPT-*; unregistered/forged DENY;
 * prompt/payload tamper DENY; tool scope DENY; chain verification;
 * Law VI CLEAN on BM-owned files; Layer 0 purity; NON-CLAIM markers;
 * Fundacion ALWAYS_DENY; unsigned DENY; impersonation DENY; trail verify;
 * L17–L20 never-reopen; getState.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: attestation ≠ OAuth/OIDC/IAM / ≠ SAML IdP /
 * ≠ PRODUCTION_READY=YES identity product;
 * L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 * L21 OPEN (BM in progress; BN–BQ pending);
 * Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric;
 * Fundacion Δ=0; BM_PRODUCTION_READY=NO; Antigravity-first.
 *
 * Law VI / CRITICAL: scan ONLY BM-owned agent-* files under
 * MODULE_DIR = src/core/attestation. Do NOT require exclusive ownership of
 * sibling dirs (consensus/ may coexist — DO NOT rewrite). Do NOT scan tests/.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import {
  BM_PRODUCTION_READY,
  BM_KIND,
  BM_CODES,
  BM_RECEIPT_KIND,
  BM_RECEIPT_PRODUCTION_READY,
  BM_POLICY_GATE_KIND,
  createAgentIdentityAttestationPort,
  stableStringify,
  sha256Canonical,
  buildActionReceipt,
  verifyActionReceipt,
  hashActionReceipt,
  canonicalActionSealBody,
  hmacSha256,
  _resetReceiptSeqForTests
} from '../src/core/attestation/agent-identity-attestation-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR — scan BM-owned agent-* only */
const MODULE_DIR = path.join(ROOT, 'src/core/attestation');

const FIXED_NOW = () => '2026-09-14T21:00:00.000Z';

/** Hermetic injected secret — NEVER a vendor sk-/token prefix. */
function freshSecret() {
  return randomBytes(32).toString('hex');
}

function makePort(opts = {}) {
  _resetReceiptSeqForTests();
  return createAgentIdentityAttestationPort({
    now: opts.now || FIXED_NOW,
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    ...opts
  });
}

function registerDefault(port, agentId = 'agent-alpha', tools = ['read', 'write', 'plan', 'attest', 'observe']) {
  const secret = freshSecret();
  const reg = port.registerAgent({
    agentId,
    hmacSecret: secret,
    allowedTools: tools
  });
  assert.equal(reg.ok, true);
  return { secret, reg };
}

function signedSession(port, agentId, secret, sessionId = 'sess-bm-001') {
  // Use port.signSession which uses registry secret
  return port.signSession({ agentId, sessionId });
}

// ── BM1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BM1: kind eos-agent-identity-attestation-port and PRODUCTION_READY NO', () => {
  const port = makePort();
  assert.equal(port.kind, BM_KIND);
  assert.equal(port.kind, 'eos-agent-identity-attestation-port');
  assert.equal(port.PRODUCTION_READY, 'NO');
  assert.equal(BM_PRODUCTION_READY, 'NO');
  const health = port.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BM_KIND);
  assert.equal(health.oauthOidcIam, false);
  assert.equal(health.samlIdp, false);
  assert.equal(health.productionReadyYes, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.identityProduct, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'CLOSED');
  assert.equal(health.ladder19, 'CLOSED');
  assert.equal(health.ladder20, 'CLOSED');
  assert.equal(health.ladder21, 'OPEN');
  assert.equal(health.l17NeverReopen, true);
  assert.equal(health.l18NeverReopen, true);
  assert.equal(health.l19NeverReopen, true);
  assert.equal(health.l20NeverReopen, true);
  assert.equal(health.l20Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(
    health.axis,
    'Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric'
  );
  assert.equal(health.bmInProgress, true);
  assert.equal(health.bnPending, true);
  assert.equal(health.notConsensusRewrite, true);
  assert.equal(BM_RECEIPT_KIND, 'eos-agent-action-receipt');
  assert.equal(BM_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BM_POLICY_GATE_KIND, 'eos-agent-identity-policy-gate');
});

// ── BM2: Happy path register + attest → sealed BM-RCPT-* ────────────────────
test('BM2: happy path register + attestAction → sealed BM-RCPT-* receipt', () => {
  const port = makePort();
  const { secret } = registerDefault(port);
  const sess = signedSession(port, 'agent-alpha', secret, 'sess-happy');
  assert.equal(sess.ok, true);
  assert.match(sess.sessionSignature, /^[a-f0-9]{64}$/);

  const result = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'plan the mission BM attestation scenario',
    actionPayload: { op: 'attest', target: 'workspace/fixture.js' },
    toolScope: ['plan', 'attest']
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, BM_CODES.ATTEST_OK);
  assert.ok(result.receipt.sealed);
  assert.ok(result.receipt.receiptId.startsWith('BM-RCPT-'));
  assert.match(result.receipt.receiptHash, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.status, 'OK');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.hermetic, true);
  assert.equal(result.oauthOidcIam, false);
  assert.ok(result.promptHash);
  assert.ok(result.actionPayloadHash);
  const v = verifyActionReceipt(result.receipt);
  assert.equal(v.ok, true);
});

// ── BM3: Unregistered agent DENY ────────────────────────────────────────────
test('BM3: unregistered agent → DENY UNREGISTERED_AGENT', () => {
  const port = makePort();
  const r = port.attestAction({
    agentId: 'ghost-agent',
    sessionId: 'sess-x',
    sessionSignature: 'deadbeef',
    prompt: 'do something',
    actionPayload: { op: 'x' },
    toolScope: ['read']
  });
  assert.equal(r.ok, false);
  assert.equal(r.deny, true);
  assert.equal(r.code, BM_CODES.UNREGISTERED_AGENT);
  assert.ok(r.receipt.sealed);
  assert.equal(r.receipt.status, 'DENY');
  assert.ok(r.receipt.receiptId.startsWith('BM-RCPT-'));
});

// ── BM4: Forged session signature DENY ──────────────────────────────────────
test('BM4: forged session signature → DENY FORGED_SIGNATURE', () => {
  const port = makePort();
  registerDefault(port);
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-forge' });
  const r = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: '0'.repeat(64), // forged
    prompt: 'legitimate looking prompt',
    actionPayload: { op: 'write' },
    toolScope: ['write']
  });
  assert.equal(r.ok, false);
  assert.equal(r.deny, true);
  assert.equal(r.code, BM_CODES.FORGED_SIGNATURE);
  assert.ok(r.receipt.sealed);
  assert.equal(r.receipt.status, 'DENY');
});

// ── BM5: Prompt / payload tamper DENY ───────────────────────────────────────
test('BM5: prompt/payload tamper → DENY PROMPT_MISMATCH', () => {
  const port = makePort();
  registerDefault(port);
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-tamper' });

  const promptMismatch = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'original prompt',
    expectedPromptHash: sha256Canonical('different prompt'),
    actionPayload: { op: 'read' },
    toolScope: ['read']
  });
  assert.equal(promptMismatch.ok, false);
  assert.equal(promptMismatch.code, BM_CODES.PROMPT_MISMATCH);

  const payloadMismatch = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'ok prompt',
    actionPayload: { op: 'read' },
    actionPayloadHash: sha256Canonical({ op: 'HACKED' }),
    toolScope: ['read']
  });
  assert.equal(payloadMismatch.ok, false);
  assert.equal(payloadMismatch.code, BM_CODES.PROMPT_MISMATCH);
  assert.ok(payloadMismatch.receipt.sealed);
});

// ── BM6: Tool scope violation DENY ──────────────────────────────────────────
test('BM6: tool scope violation → DENY TOOL_SCOPE_DENY', () => {
  const port = makePort();
  registerDefault(port, 'agent-alpha', ['read', 'observe']);
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-scope' });
  const r = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'try escalate',
    actionPayload: { op: 'shell' },
    toolScope: ['write', 'shell']
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BM_CODES.TOOL_SCOPE_DENY);
  assert.ok(r.receipt.sealed);
});

// ── BM7: Provenance trail chain verification ────────────────────────────────
test('BM7: verifyProvenanceTrail happy + chain break', () => {
  const port = makePort();
  registerDefault(port);
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-trail' });

  const a1 = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'step-1',
    actionPayload: { n: 1 },
    toolScope: ['plan']
  });
  const a2 = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'step-2',
    actionPayload: { n: 2 },
    toolScope: ['observe'],
    prevReceiptHash: a1.receipt.receiptHash
  });
  assert.equal(a1.ok, true);
  assert.equal(a2.ok, true);
  assert.equal(a2.receipt.prevReceiptHash, a1.receipt.receiptHash);

  const trailOk = port.verifyProvenanceTrail([a1.receipt, a2.receipt]);
  assert.equal(trailOk.ok, true);
  assert.equal(trailOk.code, BM_CODES.TRAIL_OK);
  assert.equal(trailOk.count, 2);

  // Tamper middle
  const forged = { ...a2.receipt, status: 'HACKED' };
  const trailBad = port.verifyProvenanceTrail([a1.receipt, forged]);
  assert.equal(trailBad.ok, false);
  assert.equal(trailBad.code, BM_CODES.TRAIL_BREAK);

  // Chain break
  const orphan = buildActionReceipt(
    {
      ok: true,
      status: 'OK',
      agentId: 'agent-alpha',
      sessionSignature: sess.sessionSignature,
      promptHash: sha256Canonical('x'),
      actionPayloadHash: sha256Canonical({}),
      toolScope: ['read'],
      timestamp: FIXED_NOW(),
      prevReceiptHash: 'not-the-previous-hash',
      receiptId: 'BM-RCPT-orphan0001'
    },
    { now: FIXED_NOW, hash: sha256Canonical }
  );
  const chainBreak = port.verifyProvenanceTrail([a1.receipt, orphan]);
  assert.equal(chainBreak.ok, false);
  assert.equal(chainBreak.code, BM_CODES.TRAIL_BREAK);
});

// ── BM8: Law VI MODULE_DIR CLEAN — BM-owned agent-* only ─────────────────────
test('BM8: Law VI MODULE_DIR CLEAN — BM-owned agent-* files only', () => {
  assert.ok(fs.existsSync(MODULE_DIR), 'MODULE_DIR must exist');
  const allJs = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  const bmFiles = allJs.filter((f) => f.startsWith('agent-'));
  assert.ok(bmFiles.length >= 3, 'expected ≥3 BM agent-* modules');

  // Forbidden contiguous provider-prefix patterns (Law VI).
  // Split construction so this test file itself does not embed them.
  const forbidden = [
    'sk' + '-' + 'ant' + '-',
    'sk' + '-' + 'proj' + '-',
    'AKIA',
    'ghp' + '_',
    'xoxb' + '-',
    'xoxp' + '-'
  ];

  for (const f of bmFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    for (const pat of forbidden) {
      assert.equal(
        text.includes(pat),
        false,
        `Law VI leak in ${f}: found ${pat}`
      );
    }
    // Must not rewrite / import consensus/
    assert.equal(
      /from\s+['"].*consensus\//.test(text),
      false,
      `${f} must not import consensus/`
    );
    assert.match(f, /^agent-/);
    // Only native node:crypto + relative ./ siblings
    assert.equal(
      /from\s+['"](?!node:crypto|\.\/)[^'"]+['"]/.test(text),
      false,
      `${f} must not import non-native external runtime deps`
    );
  }

  // Sibling dirs (e.g. consensus/) MAY coexist — we only require BM dir purity
  assert.ok(Array.isArray(allJs));
});

// ── BM9: Layer 0 purity — no network / fs / child_process ───────────────────
test('BM9: Layer 0 purity — hermetic no-network / no fs / no Fundacion writes', () => {
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.startsWith('agent-') && f.endsWith('.js'));
  for (const f of files) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    assert.equal(
      /(?:import\s+.*from\s+['"]node:(?:net|http|https|child_process|fs)['"]|require\(\s*['"](?:net|http|https|child_process|fs)['"]|createServer\s*\(|\bfetch\s*\()/.test(
        text
      ),
      false,
      `${f} must stay hermetic (no network/http/fs/subprocess imports)`
    );
    assert.equal(
      /Documents[\\/]+Fundacion|writeFileSync\s*\(\s*['"]\//.test(text),
      false,
      `${f} must not write forbidden Fundacion paths`
    );
  }
});

// ── BM10: PRODUCTION_READY=NO + NON-CLAIM markers on modules ────────────────
test('BM10: PRODUCTION_READY=NO and NON-CLAIM markers present in BM modules', () => {
  const bmFiles = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.startsWith('agent-') && f.endsWith('.js'));
  let sawPrNo = false;
  let sawNonClaim = false;
  let sawOauth = false;
  let sawSaml = false;
  for (const f of bmFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    if (/PRODUCTION_READY:\s*NO|PRODUCTION_READY\s*=\s*['"]NO['"]/.test(text)) {
      sawPrNo = true;
    }
    if (/NON-CLAIM/.test(text)) sawNonClaim = true;
    if (/OAuth\/OIDC\/IAM|oauthOidcIam/.test(text)) sawOauth = true;
    if (/SAML IdP|samlIdp/.test(text)) sawSaml = true;
  }
  assert.equal(sawPrNo, true);
  assert.equal(sawNonClaim, true);
  assert.equal(sawOauth, true);
  assert.equal(sawSaml, true);
  assert.equal(BM_PRODUCTION_READY, 'NO');
});

// ── BM11: L17–L20 never-reopen markers ──────────────────────────────────────
test('BM11: L17–L20 CLOSED never-reopen markers on health + sources', () => {
  const port = makePort();
  const h = port.health();
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  assert.equal(h.l19NeverReopen, true);
  assert.equal(h.l20NeverReopen, true);
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.ladder19, 'CLOSED');
  assert.equal(h.ladder20, 'CLOSED');
  assert.equal(h.ladder21, 'OPEN');
  assert.equal(h.bmInProgress, true);
  assert.equal(h.bnPending, true);

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'agent-identity-attestation-port.js'),
    'utf8'
  );
  assert.match(facade, /L17 CLOSED never reopen/);
  assert.match(facade, /L18 CLOSED never reopen/);
  assert.match(facade, /L19 CLOSED never reopen/);
  assert.match(facade, /L20 CLOSED never reopen/);
  assert.match(facade, /L21 OPEN/);
  assert.match(
    facade,
    /Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric/
  );
  assert.match(facade, /DO NOT rewrite src\/core\/consensus/);
});

// ── BM12: Unsigned action DENY ──────────────────────────────────────────────
test('BM12: unsigned action → DENY UNSIGNED_DENY', () => {
  const port = makePort();
  registerDefault(port);
  const r = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: 'sess-unsigned',
    // no sessionSignature
    prompt: 'unsigned attempt',
    actionPayload: { op: 'read' },
    toolScope: ['read']
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BM_CODES.UNSIGNED_DENY);
  assert.ok(r.receipt.sealed);
});

// ── BM13: Impersonation DENY ────────────────────────────────────────────────
test('BM13: impersonation → DENY IMPERSONATION_DENY', () => {
  const port = makePort();
  registerDefault(port, 'agent-alpha');
  registerDefault(port, 'agent-beta');
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-imp' });
  const r = port.attestAction({
    agentId: 'agent-alpha',
    claimedAgentId: 'agent-beta',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'impersonate',
    actionPayload: { op: 'write' },
    toolScope: ['write']
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BM_CODES.IMPERSONATION_DENY);
  assert.ok(r.receipt.sealed);
});

// ── BM14: Fundacion ALWAYS_DENY ─────────────────────────────────────────────
test('BM14: Fundacion target / agentId ALWAYS_DENY', () => {
  const port = makePort();
  const badReg = port.registerAgent({
    agentId: 'fundacion',
    hmacSecret: freshSecret(),
    allowedTools: ['read']
  });
  assert.equal(badReg.ok, false);
  assert.equal(badReg.code, BM_CODES.FUNDACION_ALWAYS_DENY);

  registerDefault(port);
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-fund' });
  const r = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'write fundacion',
    actionPayload: { op: 'write' },
    toolScope: ['write'],
    fundacion: true
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BM_CODES.FUNDACION_ALWAYS_DENY);
  assert.equal(r.fundacionDelta, 0);
});

// ── BM15: Deterministic receipt hash + getState ─────────────────────────────
test('BM15: deterministic receipt hash + getState counters', () => {
  _resetReceiptSeqForTests();
  const body = {
    ok: true,
    status: 'OK',
    agentId: 'agent-alpha',
    sessionSignature: 'a'.repeat(64),
    promptHash: sha256Canonical('p'),
    actionPayloadHash: sha256Canonical({}),
    toolScope: ['read'],
    timestamp: '2026-09-14T21:00:00.000Z',
    prevReceiptHash: null,
    receiptId: 'BM-RCPT-fixed0001'
  };
  const a = buildActionReceipt(body, { now: FIXED_NOW, hash: sha256Canonical });
  _resetReceiptSeqForTests();
  const b = buildActionReceipt(body, { now: FIXED_NOW, hash: sha256Canonical });
  assert.equal(a.receiptHash, b.receiptHash);
  assert.equal(
    hashActionReceipt(canonicalActionSealBody(a)),
    a.receiptHash
  );
  assert.equal(stableStringify({ z: 1, a: 2 }), stableStringify({ a: 2, z: 1 }));

  const port = makePort();
  registerDefault(port);
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-state' });
  port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'ok',
    actionPayload: {},
    toolScope: ['read']
  });
  port.attestAction({
    agentId: 'ghost',
    sessionSignature: 'x',
    prompt: 'x',
    toolScope: ['read']
  });
  const st = port.getState();
  assert.equal(st.kind, BM_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.ok(st.registerCount >= 1);
  assert.ok(st.attestCount >= 2);
  assert.ok(st.okCount >= 1);
  assert.ok(st.denyCount >= 1);
  assert.ok(st.historyCount >= 2);
});

// ── BM16: Auto-chain prevReceiptHash + hmac helper honesty ──────────────────
test('BM16: auto-chain prevReceiptHash when omitted + hmac helper', () => {
  const port = makePort();
  const { secret } = registerDefault(port);
  const sess = port.signSession({ agentId: 'agent-alpha', sessionId: 'sess-chain' });
  const s1 = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'first',
    actionPayload: { n: 1 },
    toolScope: ['plan']
  });
  const s2 = port.attestAction({
    agentId: 'agent-alpha',
    sessionId: sess.sessionId,
    sessionSignature: sess.sessionSignature,
    prompt: 'second',
    actionPayload: { n: 2 },
    toolScope: ['observe']
    // prev omitted — auto-chain
  });
  assert.equal(s1.ok, true);
  assert.equal(s2.ok, true);
  assert.equal(s2.receipt.prevReceiptHash, s1.receipt.receiptHash);

  // hmac helper matches signSession binding
  const expected = hmacSha256(secret, {
    agentId: 'agent-alpha',
    sessionId: 'sess-chain',
    purpose: 'eos-bm-session'
  });
  assert.equal(sess.sessionSignature, expected);

  // Tamper detection on single receipt
  const forged = { ...s1.receipt, status: 'HACKED' };
  const v2 = verifyActionReceipt(forged);
  assert.equal(v2.ok, false);
  assert.match(v2.reason, /tamper|mismatch/i);
});
