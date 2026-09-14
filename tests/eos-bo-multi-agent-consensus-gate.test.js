/**
 * @file eos-bo-multi-agent-consensus-gate.test.js
 * @description SPEC-0072 / Mission BO — Multi-Agent Consensus & Two-Key
 * Handoff Gate. Hermetic TDD (~16):
 * kind + PRODUCTION_READY NO; happy CONSENSUS_GRANTED BO-RCPT-*;
 * self-verify DENY; REJECTED/missing evidence DENY; tamper DENY;
 * receipt chain; Law VI on BO-owned only; Layer 0; Fundacion; NON-CLAIM;
 * missing verifier; evidence mismatch; L17–L20 never-reopen;
 * injectable ports; getState.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: consensus ≠ BFT/PoS/blockchain/P2P gossip / ≠ heavy Raft /
 * ≠ PRODUCTION_READY=YES consensus product;
 * L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 * L21 OPEN (BM MEASURED; BN MEASURED; BO in progress; BP–BQ pending);
 * Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric;
 * Fundacion Δ=0; BO_PRODUCTION_READY=NO; Antigravity-first.
 *
 * Law VI / CRITICAL: scan ONLY BO-owned two-key-* /
 * multi-agent-consensus-gate.js under MODULE_DIR = src/core/consensus.
 * ALLOW sibling byzantine-consensus-engine.js (BI/BJ pattern — DO NOT rewrite).
 * Do NOT scan tests/.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BO_PRODUCTION_READY,
  BO_KIND,
  BO_CODES,
  BO_RECEIPT_KIND,
  BO_RECEIPT_PRODUCTION_READY,
  BO_POLICY_GATE_KIND,
  createMultiAgentConsensusGate,
  stableStringify,
  sha256Canonical,
  buildTwoKeyReceipt,
  verifyTwoKeyReceipt,
  hashTwoKeyReceipt,
  canonicalTwoKeySealBody,
  _resetReceiptSeqForTests
} from '../src/core/consensus/multi-agent-consensus-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR — scan BO-owned two-key-* / multi-agent-consensus-gate.js only */
const MODULE_DIR = path.join(ROOT, 'src/core/consensus');

const FIXED_NOW = () => '2026-09-14T22:30:00.000Z';

function makeGate(opts = {}) {
  _resetReceiptSeqForTests();
  return createMultiAgentConsensusGate({
    now: opts.now || FIXED_NOW,
    hash: opts.hash,
    custodyPort: opts.custodyPort,
    handoffEnvelope: opts.handoffEnvelope,
    throwOnDeny: opts.throwOnDeny === true,
    ...opts
  });
}

function boOwnedFiles() {
  return fs
    .readdirSync(MODULE_DIR)
    .filter(
      (f) =>
        f.endsWith('.js') &&
        (f.startsWith('two-key-') || f === 'multi-agent-consensus-gate.js')
    );
}

function happyFlow(gate, overrides = {}) {
  const proposalId = overrides.proposalId || 'PROP-BO-001';
  const builderAgentId = overrides.builderAgentId || 'agent-builder-alpha';
  const verifierAgentId = overrides.verifierAgentId || 'agent-verifier-beta';
  const evidenceHash =
    overrides.evidenceHash || sha256Canonical({ evd: 'fixture-v1' });
  const prop = gate.submitProposal({
    proposalId,
    builderAgentId,
    proposal: { change_id: proposalId, body: 'patch' },
    evidenceHash
  });
  assert.equal(prop.ok, true);
  const att = gate.submitAttestation({
    proposalId,
    verifierAgentId,
    decision: overrides.decision || 'APPROVE',
    evidenceHash: overrides.attestEvidenceHash || evidenceHash
  });
  if (overrides.expectAttestationDeny) {
    return { prop, att, eval: null };
  }
  assert.equal(att.ok, true);
  const ev = gate.evaluateConsensus({ proposalId });
  return { prop, att, eval: ev };
}

// ── BO1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BO1: kind eos-multi-agent-consensus-gate and PRODUCTION_READY NO', () => {
  const g = makeGate();
  assert.equal(g.kind, BO_KIND);
  assert.equal(g.kind, 'eos-multi-agent-consensus-gate');
  assert.equal(g.PRODUCTION_READY, 'NO');
  assert.equal(BO_PRODUCTION_READY, 'NO');
  const health = g.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BO_KIND);
  assert.equal(health.bftPosBlockchainP2pGossip, false);
  assert.equal(health.heavyRaftBlockchain, false);
  assert.equal(health.productionReadyYes, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.consensusProduct, false);
  assert.equal(health.singleAgentAutoApproval, false);
  assert.equal(health.unsignedAsyncHandoff, false);
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
  assert.equal(health.bmMeasured, true);
  assert.equal(health.bnMeasured, true);
  assert.equal(health.boInProgress, true);
  assert.equal(health.bpPending, true);
  assert.equal(health.notByzantineRewrite, true);
  assert.equal(health.twoKeyRule, true);
  assert.equal(BO_RECEIPT_KIND, 'eos-two-key-consensus-receipt');
  assert.equal(BO_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BO_POLICY_GATE_KIND, 'eos-two-key-consensus-policy-gate');
});

// ── BO2: Happy CONSENSUS_GRANTED → sealed BO-RCPT-* ─────────────────────────
test('BO2: happy path → CONSENSUS_GRANTED sealed BO-RCPT-* receipt', () => {
  const g = makeGate();
  const { eval: result } = happyFlow(g);
  assert.equal(result.ok, true);
  assert.equal(result.code, BO_CODES.CONSENSUS_GRANTED);
  assert.ok(result.receipt.sealed);
  assert.ok(result.receipt.receiptId.startsWith('BO-RCPT-'));
  assert.match(result.receipt.receiptHash, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.consensusStatus, 'CONSENSUS_GRANTED');
  assert.equal(result.receipt.builderAgentId, 'agent-builder-alpha');
  assert.equal(result.receipt.verifierAgentId, 'agent-verifier-beta');
  assert.notEqual(
    result.receipt.builderAgentId,
    result.receipt.verifierAgentId
  );
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.hermetic, true);
  assert.equal(result.bftPosBlockchainP2pGossip, false);
  assert.equal(result.consensusProduct, false);
});

// ── BO3: Self-verify DENY ───────────────────────────────────────────────────
test('BO3: self-verification DENY — builderAgentId === verifierAgentId', () => {
  const g = makeGate();
  const evidenceHash = sha256Canonical({ evd: 1 });
  g.submitProposal({
    proposalId: 'PROP-SELF',
    builderAgentId: 'same-agent',
    proposal: { change_id: 'PROP-SELF' },
    evidenceHash
  });
  const att = g.submitAttestation({
    proposalId: 'PROP-SELF',
    verifierAgentId: 'same-agent',
    decision: 'APPROVE',
    evidenceHash
  });
  assert.equal(att.ok, false);
  assert.equal(att.code, BO_CODES.SELF_VERIFY_DENY);
  assert.ok(att.receipt.sealed);
  assert.ok(att.receipt.receiptId.startsWith('BO-RCPT-'));

  // Also via evaluateConsensus inline
  const ev = g.evaluateConsensus({
    proposalId: 'PROP-INLINE-SELF',
    builderAgentId: 'solo',
    verifierAgentId: 'solo',
    decision: 'APPROVE',
    evidenceHash
  });
  assert.equal(ev.ok, false);
  assert.equal(ev.code, BO_CODES.SELF_VERIFY_DENY);
});

// ── BO4: REJECTED attestation DENY ──────────────────────────────────────────
test('BO4: REJECTED attestation → ATTESTATION_REJECTED DENY', () => {
  const g = makeGate();
  const evidenceHash = sha256Canonical({ evd: 2 });
  g.submitProposal({
    proposalId: 'PROP-REJ',
    builderAgentId: 'builder-1',
    proposal: { change_id: 'PROP-REJ' },
    evidenceHash
  });
  g.submitAttestation({
    proposalId: 'PROP-REJ',
    verifierAgentId: 'verifier-1',
    decision: 'REJECT',
    evidenceHash
  });
  const ev = g.evaluateConsensus({ proposalId: 'PROP-REJ' });
  assert.equal(ev.ok, false);
  assert.equal(ev.code, BO_CODES.ATTESTATION_REJECTED);
  assert.ok(ev.receipt.sealed);
  assert.equal(ev.receipt.consensusStatus, 'CONSENSUS_DENIED');
});

// ── BO5: Missing evidence DENY ──────────────────────────────────────────────
test('BO5: missing evidenceHash → MISSING_EVIDENCE DENY', () => {
  const g = makeGate();
  const ev = g.evaluateConsensus({
    proposalId: 'PROP-NO-EVD',
    builderAgentId: 'builder-a',
    verifierAgentId: 'verifier-b',
    decision: 'APPROVE'
    // no evidenceHash
  });
  assert.equal(ev.ok, false);
  assert.equal(ev.code, BO_CODES.MISSING_EVIDENCE);
  assert.ok(ev.receipt.sealed);
});

// ── BO6: Tamper DENY / trail break ──────────────────────────────────────────
test('BO6: tamper DENY — verifyReceiptTrail detects forged receipt', () => {
  const g = makeGate();
  const { eval: a } = happyFlow(g, { proposalId: 'PROP-T1' });
  const { eval: b } = happyFlow(g, {
    proposalId: 'PROP-T2',
    builderAgentId: 'builder-x',
    verifierAgentId: 'verifier-y',
    evidenceHash: sha256Canonical({ evd: 't2' })
  });
  assert.equal(g.verifyReceiptTrail([a.receipt, b.receipt]).ok, true);

  const forged = { ...b.receipt, consensusStatus: 'HACKED' };
  const trailBad = g.verifyReceiptTrail([a.receipt, forged]);
  assert.equal(trailBad.ok, false);
  assert.equal(trailBad.code, BO_CODES.TRAIL_BREAK);

  const v = verifyTwoKeyReceipt(forged);
  assert.equal(v.ok, false);
  assert.match(v.reason, /tamper|mismatch/i);
});

// ── BO7: Receipt chain prevReceiptHash ──────────────────────────────────────
test('BO7: receipt chain — prevReceiptHash links successive grants', () => {
  const g = makeGate();
  const { eval: a } = happyFlow(g, { proposalId: 'PROP-C1' });
  const { eval: b } = happyFlow(g, {
    proposalId: 'PROP-C2',
    builderAgentId: 'b2',
    verifierAgentId: 'v2',
    evidenceHash: sha256Canonical({ n: 2 })
  });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(b.receipt.prevReceiptHash, a.receipt.receiptHash);
  const trail = g.verifyReceiptTrail([a.receipt, b.receipt]);
  assert.equal(trail.ok, true);
  assert.equal(trail.code, BO_CODES.TRAIL_OK);
});

// ── BO8: Law VI MODULE_DIR CLEAN — BO-owned only ─────────────────────────────
test('BO8: Law VI MODULE_DIR CLEAN — BO-owned two-key/multi-agent files only', () => {
  assert.ok(fs.existsSync(MODULE_DIR), 'MODULE_DIR must exist');
  const boFiles = boOwnedFiles();
  assert.ok(boFiles.length >= 3, 'expected ≥3 BO modules');

  // Sibling byzantine engine MAY exist (BI/BJ pattern) — do not fail if present
  const allJs = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  // We only scan BO-owned; sibling byzantine is ALLOWED
  assert.ok(
    !boFiles.includes('byzantine-consensus-engine.js'),
    'byzantine sibling must not be in BO-owned scan set'
  );

  const forbidden = [
    'sk' + '-' + 'ant' + '-',
    'sk' + '-' + 'proj' + '-',
    'AKIA',
    'ghp' + '_',
    'xoxb' + '-',
    'xoxp' + '-'
  ];

  for (const f of boFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    for (const pat of forbidden) {
      assert.equal(
        text.includes(pat),
        false,
        `Law VI leak in ${f}: found ${pat}`
      );
    }
    assert.equal(
      /from\s+['"].*(?:governance|orchestration|freeze-drift|fdir)\//.test(
        text
      ),
      false,
      `${f} must not import sibling governance/orchestration/freeze-drift/fdir/`
    );
    // Only native node:crypto + relative ./ siblings
    assert.equal(
      /from\s+['"](?!node:crypto|\.\/)[^'"]+['"]/.test(text),
      false,
      `${f} must not import non-native external runtime deps`
    );
  }

  // Document that sibling may coexist
  void allJs;
});

// ── BO9: Layer 0 purity ─────────────────────────────────────────────────────
test('BO9: Layer 0 purity — hermetic no-network / no fs writes', () => {
  for (const f of boOwnedFiles()) {
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

// ── BO10: Fundacion ALWAYS_DENY ─────────────────────────────────────────────
test('BO10: Fundacion target ALWAYS_DENY on proposal/attest/evaluate', () => {
  const g = makeGate();
  const r = g.submitProposal({
    proposalId: 'PROP-FUND',
    builderAgentId: 'builder-1',
    fundacion: true
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BO_CODES.FUNDACION_ALWAYS_DENY);
  assert.equal(r.fundacionDelta, 0);
  assert.ok(r.receipt.sealed);

  const att = g.submitAttestation({
    proposalId: 'PROP-FUND',
    verifierAgentId: 'verifier-1',
    fundacion: true
  });
  assert.equal(att.ok, false);
  assert.equal(att.code, BO_CODES.FUNDACION_ALWAYS_DENY);

  const ev = g.evaluateConsensus({
    proposalId: 'PROP-FUND',
    builderAgentId: 'b',
    verifierAgentId: 'v',
    evidenceHash: sha256Canonical('x'),
    fundacion: true
  });
  assert.equal(ev.ok, false);
  assert.equal(ev.code, BO_CODES.FUNDACION_ALWAYS_DENY);
});

// ── BO11: PRODUCTION_READY=NO + NON-CLAIM markers ───────────────────────────
test('BO11: PRODUCTION_READY=NO and NON-CLAIM markers present in BO modules', () => {
  let sawPrNo = false;
  let sawNonClaim = false;
  for (const f of boOwnedFiles()) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    if (/PRODUCTION_READY:\s*NO|BO_PRODUCTION_READY\s*=\s*'NO'/.test(text)) {
      sawPrNo = true;
    }
    if (
      /NON-CLAIM|BFT|PoS|blockchain|P2P gossip|Raft|consensus product/i.test(
        text
      )
    ) {
      sawNonClaim = true;
    }
  }
  assert.equal(sawPrNo, true);
  assert.equal(sawNonClaim, true);
});

// ── BO12: Missing verifier DENY ─────────────────────────────────────────────
test('BO12: missing verifierAgentId → MISSING_VERIFIER DENY', () => {
  const g = makeGate();
  const ev = g.evaluateConsensus({
    proposalId: 'PROP-NO-V',
    builderAgentId: 'builder-only',
    decision: 'APPROVE',
    evidenceHash: sha256Canonical({ e: 1 })
  });
  assert.equal(ev.ok, false);
  assert.equal(ev.code, BO_CODES.MISSING_VERIFIER);
  assert.ok(ev.receipt.sealed);
});

// ── BO13: Evidence mismatch DENY ────────────────────────────────────────────
test('BO13: evidenceHash mismatch → EVIDENCE_MISMATCH DENY', () => {
  const g = makeGate();
  const evidenceHash = sha256Canonical({ expected: true });
  g.submitProposal({
    proposalId: 'PROP-MISMATCH',
    builderAgentId: 'builder-m',
    proposal: { change_id: 'PROP-MISMATCH' },
    evidenceHash
  });
  g.submitAttestation({
    proposalId: 'PROP-MISMATCH',
    verifierAgentId: 'verifier-m',
    decision: 'APPROVE',
    evidenceHash: sha256Canonical({ expected: false })
  });
  const ev = g.evaluateConsensus({ proposalId: 'PROP-MISMATCH' });
  assert.equal(ev.ok, false);
  assert.equal(ev.code, BO_CODES.EVIDENCE_MISMATCH);
  assert.ok(ev.receipt.sealed);
});

// ── BO14: L17–L20 never-reopen markers ──────────────────────────────────────
test('BO14: L17–L20 CLOSED never reopen; L21 OPEN markers', () => {
  const g = makeGate();
  const h = g.health();
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  assert.equal(h.l19NeverReopen, true);
  assert.equal(h.l20NeverReopen, true);
  assert.equal(h.ladder21, 'OPEN');

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'multi-agent-consensus-gate.js'),
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
  assert.match(facade, /DO NOT rewrite byzantine-consensus-engine/);
});

// ── BO15: Injectable custodyPort / handoffEnvelope compose ──────────────────
test('BO15: injectable custodyPort / handoffEnvelope compose without rewrite', () => {
  let custodyCalled = false;
  let handoffCalled = false;
  const g = makeGate({
    custodyPort: {
      validateVerificationReceiptCustody: ({ builder_id, verifier_id }) => {
        custodyCalled = true;
        if (builder_id === verifier_id) {
          return { valid: false, code: 'BUILDER_EQUALS_VERIFIER_VIOLATION' };
        }
        return { valid: true, code: 'CUSTODY_DISJUNCTION_VERIFIED' };
      }
    },
    handoffEnvelope: {
      validate: (params) => {
        handoffCalled = true;
        if (params.sender_agent_id === params.receiver_agent_id) {
          return {
            valid: false,
            errors: ['BUILDER_EQUALS_VERIFIER_VIOLATION']
          };
        }
        return { valid: true, errors: [] };
      }
    }
  });
  const { eval: result } = happyFlow(g, { proposalId: 'PROP-PORTS' });
  assert.equal(result.ok, true);
  assert.equal(result.code, BO_CODES.CONSENSUS_GRANTED);
  assert.equal(custodyCalled, true);
  assert.equal(handoffCalled, true);
  const st = g.getState();
  assert.equal(st.ports.custodyPort, true);
  assert.equal(st.ports.handoffEnvelope, true);

  // Port that DENYs self-verify
  const g2 = makeGate({
    custodyPort: {
      assertBuilderVerifierDisjunction: () => {
        const err = new Error('BUILDER_EQUALS_VERIFIER_VIOLATION');
        err.code = 'BUILDER_EQUALS_VERIFIER_VIOLATION';
        throw err;
      }
    }
  });
  const bad = g2.evaluateConsensus({
    proposalId: 'PROP-PORT-DENY',
    builderAgentId: 'a',
    verifierAgentId: 'b',
    decision: 'APPROVE',
    evidenceHash: sha256Canonical({ x: 1 })
  });
  assert.equal(bad.ok, false);
});

// ── BO16: Deterministic hash + getState + NON-CLAIM honesty ─────────────────
test('BO16: deterministic receipt hash + getState + NON-CLAIM honesty', () => {
  _resetReceiptSeqForTests();
  const body = {
    ok: true,
    consensusStatus: 'CONSENSUS_GRANTED',
    proposalId: 'PROP-DET',
    builderAgentId: 'b-det',
    verifierAgentId: 'v-det',
    proposalHash: sha256Canonical('p'),
    evidenceHash: sha256Canonical('e'),
    timestamp: '2026-09-14T22:30:00.000Z',
    prevReceiptHash: null,
    receiptId: 'BO-RCPT-fixed0001'
  };
  const a = buildTwoKeyReceipt(body, {
    now: FIXED_NOW,
    hash: sha256Canonical
  });
  _resetReceiptSeqForTests();
  const b = buildTwoKeyReceipt(body, {
    now: FIXED_NOW,
    hash: sha256Canonical
  });
  assert.equal(a.receiptHash, b.receiptHash);
  assert.equal(
    hashTwoKeyReceipt(canonicalTwoKeySealBody(a)),
    a.receiptHash
  );
  assert.equal(stableStringify({ z: 1, a: 2 }), stableStringify({ a: 2, z: 1 }));

  const g = makeGate();
  happyFlow(g, { proposalId: 'PROP-ST1' });
  g.evaluateConsensus({
    proposalId: 'PROP-ST-DENY',
    builderAgentId: 'same',
    verifierAgentId: 'same',
    evidenceHash: sha256Canonical('x')
  });
  const st = g.getState();
  assert.equal(st.kind, BO_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.ok(st.proposalCount >= 1);
  assert.ok(st.evaluateCount >= 1);
  assert.ok(st.grantCount >= 1);
  assert.ok(st.denyCount >= 1);
  assert.ok(st.historyCount >= 2);

  const h = g.health();
  assert.equal(h.bftPosBlockchainP2pGossip, false);
  assert.equal(h.heavyRaftBlockchain, false);
  assert.equal(h.consensusProduct, false);
  assert.equal(h.productionReadyYes, false);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.singleAgentAutoApproval, false);
  assert.equal(h.unsignedAsyncHandoff, false);
});
