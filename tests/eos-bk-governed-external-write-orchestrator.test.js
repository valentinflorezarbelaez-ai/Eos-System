/**
 * @file eos-bk-governed-external-write-orchestrator.test.js
 * @description SPEC-0068 / Mission BK — Governed External Write Orchestrator.
 * Hermetic TDD (~16):
 * kind + PRODUCTION_READY NO; happy-path all 6 preconditions + sealed receipt;
 * missing precondition DENY; Fundacion ALWAYS_DENY; partial failure → rollback;
 * sealed BK-RCPT-* hash verification + chaining; Law VI MODULE_DIR CLEAN
 * (BK-owned governed-external-write-* only; siblings allowed); NON-CLAIM;
 * PR=NO; L17/L18/L19 never-reopen; empty/malformed; getState;
 * BH+BI+BJ MEASURED / not BL; ports composition; unauthorized path DENY;
 * deterministic hash.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: orchestrator ≠ unsupervised fleet deploy /
 * ≠ K8s/ArgoCD CD / ≠ PRODUCTION_READY=YES;
 * BH+BI+BJ MEASURED acknowledged; not BL; Fundacion Δ=0;
 * BK_PRODUCTION_READY=NO; Antigravity-first; L17/L18/L19 CLOSED never reopen;
 * L20 OPEN (BH+BI+BJ MEASURED; BK in progress; BL pending closeout);
 * Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI / CRITICAL: scan ONLY BK-owned governed-external-write-* files under
 * MODULE_DIR = src/core/orchestration. ALLOW pre-existing siblings
 * (lesson from BI/AT/BJ coexist). Do NOT scan the whole tests/ directory.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BK_PRODUCTION_READY,
  BK_KIND,
  BK_CODES,
  BK_PRECONDITIONS,
  BK_PRECONDITION_BITS,
  BK_PRECONDITION_ALL_MASK,
  BK_RECEIPT_KIND,
  BK_RECEIPT_PRODUCTION_READY,
  BK_POLICY_GATE_KIND,
  createGovernedExternalWriteOrchestrator,
  stableStringify,
  sha256Canonical,
  buildWriteReceipt,
  verifyWriteReceipt,
  hashWriteReceipt,
  canonicalWriteSealBody,
  _resetReceiptSeqForTests
} from '../src/core/orchestration/governed-external-write-orchestrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR — scan BK-owned governed-external-write-* only */
const MODULE_DIR = path.join(ROOT, 'src/core/orchestration');

const FIXED_NOW = () => '2026-09-14T19:45:00.000Z';

const ALL_PRE = {
  registry: true,
  intake: true,
  spec: true,
  audit: true,
  ownerApproval: true,
  level2Auth: true
};

function makeOrch(opts = {}) {
  _resetReceiptSeqForTests();
  return createGovernedExternalWriteOrchestrator({
    now: opts.now || FIXED_NOW,
    hash: opts.hash,
    ports: opts.ports,
    throwOnDeny: opts.throwOnDeny === true,
    allowlist: opts.allowlist,
    ...opts
  });
}

function okProject(id = 'eos-demo') {
  return {
    id,
    name: id,
    root: 'workspace',
    paths: ['workspace/allowlisted.js']
  };
}

// ── BK1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BK1: kind eos-governed-external-write-orchestrator and PRODUCTION_READY NO', () => {
  const orch = makeOrch();
  assert.equal(orch.kind, BK_KIND);
  assert.equal(orch.kind, 'eos-governed-external-write-orchestrator');
  assert.equal(orch.PRODUCTION_READY, 'NO');
  assert.equal(BK_PRODUCTION_READY, 'NO');
  const health = orch.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BK_KIND);
  assert.equal(health.unsupervisedFleetDeploy, false);
  assert.equal(health.k8sArgoCd, false);
  assert.equal(health.productionReadyYes, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'CLOSED');
  assert.equal(health.ladder19, 'CLOSED');
  assert.equal(health.ladder20, 'OPEN');
  assert.equal(health.l17NeverReopen, true);
  assert.equal(health.l18NeverReopen, true);
  assert.equal(health.l19NeverReopen, true);
  assert.equal(health.l17Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.l18Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.l19Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.axis, 'Sovereign Mission Continuity & Operator Fabric');
  assert.equal(health.bhMeasured, true);
  assert.equal(health.biMeasured, true);
  assert.equal(health.bjMeasured, true);
  assert.equal(health.bkInProgress, true);
  assert.equal(health.blPending, true);
  assert.equal(health.notBl, true);
  assert.equal(BK_RECEIPT_KIND, 'eos-governed-external-write-receipt');
  assert.equal(BK_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BK_POLICY_GATE_KIND, 'eos-governed-external-write-policy-gate');
  assert.equal(BK_PRECONDITIONS.REGISTRY, 'registry');
  assert.equal(BK_PRECONDITIONS.LEVEL2_AUTH, 'level2Auth');
  assert.ok(BK_PRECONDITION_ALL_MASK > 0);
  assert.equal(typeof BK_PRECONDITION_BITS.spec, 'number');
});

// ── BK2: Happy path all 6 preconditions → write executed → sealed receipt ───
test('BK2: happy path all 6 preconditions → write executed → sealed receipt', () => {
  const orch = makeOrch({
    ports: {
      tGate: () => ({ ok: true }),
      bcApply: () => ({ ok: true, applied: true }),
      bdDelivery: () => ({ ok: true, delivered: true }),
      writeBarrier: () => ({ ok: true })
    }
  });
  const result = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js', body: 'x=1' },
    context: ALL_PRE
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, BK_CODES.WRITE_OK);
  assert.equal(result.rollbackExecuted, false);
  assert.ok(result.receipt.sealed);
  assert.ok(result.receipt.receiptId.startsWith('BK-RCPT-'));
  assert.match(result.receipt.receiptHash, /^[a-f0-9]{64}$/);
  assert.equal(result.receipt.status, 'OK');
  assert.equal(result.receipt.rollbackExecuted, false);
  assert.ok(result.transactionId.startsWith('BK-TX-'));
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.hermetic, true);
  assert.ok(result.preconditionMask);
  assert.equal(result.preconditionMask.registry, true);
  assert.equal(result.preconditionMask.level2Auth, true);
});

// ── BK3: Missing precondition (Level 2 / Spec) → DENY ───────────────────────
test('BK3: missing precondition (Level 2 / Spec) → DENY', () => {
  const orch = makeOrch();
  // Missing Level 2 only
  const noL2 = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: {
      registry: true,
      intake: true,
      spec: true,
      audit: true,
      ownerApproval: true
      // level2Auth missing
    }
  });
  assert.equal(noL2.ok, false);
  assert.equal(noL2.deny, true);
  assert.ok(
    noL2.code === BK_CODES.LEVEL2_AUTH_DENY ||
      noL2.code === BK_CODES.PRECONDITION_DENY
  );
  assert.ok(noL2.receipt.sealed);
  assert.equal(noL2.receipt.status, 'DENY');
  assert.ok(noL2.receipt.receiptId.startsWith('BK-RCPT-'));

  // Missing Spec
  const noSpec = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: {
      registry: true,
      intake: true,
      // spec missing
      audit: true,
      ownerApproval: true,
      level2Auth: true
    }
  });
  assert.equal(noSpec.ok, false);
  assert.equal(noSpec.code, BK_CODES.PRECONDITION_DENY);
  assert.match(noSpec.reason, /spec/i);
  assert.ok(noSpec.receipt.sealed);

  // validatePreconditions direct
  const v = orch.validatePreconditions(okProject(), { registry: true });
  assert.equal(v.ok, false);
  assert.ok(v.missing.includes('intake') || v.missing.length >= 1);
});

// ── BK4: Fundacion target → immediate FUNDACION_ALWAYS_DENY ─────────────────
test('BK4: Fundacion target → immediate FUNDACION_ALWAYS_DENY', () => {
  const orch = makeOrch();
  const r = orch.executeGovernedWrite({
    targetProject: {
      id: 'fundacion',
      name: 'Fundacion',
      root: 'Documents/Fundacion',
      paths: ['Documents/Fundacion/secret.js']
    },
    diffPayload: { path: 'Documents/Fundacion/secret.js' },
    context: ALL_PRE
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BK_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(r.receipt.sealed);
  assert.equal(r.fundacionDelta, 0);
  assert.equal(r.receipt.status, 'DENY');

  const flag = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: ALL_PRE,
    writeFundacion: true
  });
  assert.equal(flag.ok, false);
  assert.equal(flag.code, BK_CODES.FUNDACION_ALWAYS_DENY);
});

// ── BK5: Partial write failure → automatic rollback → rollback receipt ──────
test('BK5: partial write failure → automatic rollback → rollback receipt sealed', () => {
  const orch = makeOrch({
    ports: {
      bcApply: (arg) => {
        if (arg && arg.op === 'apply') {
          return { ok: false, partial: true, reason: 'simulated partial apply' };
        }
        return { ok: true, rolledBack: true };
      },
      bdDelivery: () => ({ ok: true }),
      writeBarrier: () => ({ ok: true }),
      tGate: () => ({ ok: true })
    }
  });
  const result = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js', body: 'x=2' },
    context: ALL_PRE
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, BK_CODES.PARTIAL_FAILURE);
  assert.equal(result.rollbackExecuted, true);
  assert.ok(result.receipt.sealed);
  assert.equal(result.receipt.rollbackExecuted, true);
  assert.equal(result.receipt.status, 'ROLLBACK');
  assert.ok(result.receipt.receiptId.startsWith('BK-RCPT-'));
  assert.match(result.receipt.receiptHash, /^[a-f0-9]{64}$/);
  const v = verifyWriteReceipt(result.receipt);
  assert.equal(v.ok, true);
});

// ── BK6: Sealed BK-RCPT-* hash verification + chaining ───────────────────────
test('BK6: sealed BK-RCPT-* hash verification + chaining', () => {
  const orch = makeOrch({
    ports: {
      bcApply: () => ({ ok: true }),
      bdDelivery: () => ({ ok: true })
    }
  });
  const s1 = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: ALL_PRE
  });
  assert.ok(s1.receipt.receiptId.startsWith('BK-RCPT-'));
  assert.match(s1.receipt.receiptHash, /^[a-f0-9]{64}$/);
  const v1 = verifyWriteReceipt(s1.receipt);
  assert.equal(v1.ok, true);

  const s2 = orch.executeGovernedWrite({
    targetProject: okProject('eos-demo-2'),
    diffPayload: { path: 'workspace/patch-target.js' },
    context: ALL_PRE,
    prevReceiptHash: s1.receipt.receiptHash
  });
  assert.equal(s2.receipt.prevReceiptHash, s1.receipt.receiptHash);
  assert.ok(s2.receipt.receiptId.startsWith('BK-RCPT-'));
  assert.notEqual(s2.receipt.receiptHash, s1.receipt.receiptHash);

  // Tamper detection
  const forged = { ...s1.receipt, status: 'HACKED' };
  const v2 = verifyWriteReceipt(forged);
  assert.equal(v2.ok, false);
  assert.match(v2.reason, /tamper|mismatch/i);

  // Auto-chain when prev omitted
  const s3 = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: ALL_PRE
  });
  assert.equal(s3.receipt.prevReceiptHash, s2.receipt.receiptHash);
});

// ── BK7: Law VI MODULE_DIR CLEAN — BK-owned governed-external-write-* only ──
test('BK7: Law VI MODULE_DIR CLEAN — BK-owned governed-external-write-* files only', () => {
  assert.ok(fs.existsSync(MODULE_DIR), 'MODULE_DIR must exist');
  const allJs = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  const bkFiles = allJs.filter((f) => f.startsWith('governed-external-write-'));
  assert.ok(
    bkFiles.length >= 3,
    'expected ≥3 BK governed-external-write-* modules'
  );

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

  for (const f of bkFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    for (const pat of forbidden) {
      assert.equal(
        text.includes(pat),
        false,
        `Law VI leak in ${f}: found ${pat}`
      );
    }
    // No delivery/ or mission/ imports — Layer 0 orchestration only
    assert.equal(
      /from\s+['"].*delivery\//.test(text),
      false,
      `${f} must not import delivery/`
    );
    assert.equal(
      /from\s+['"].*\/mission\//.test(text),
      false,
      `${f} must not import mission/`
    );
    assert.match(f, /^governed-external-write-/);
    // Only native node:crypto allowed as runtime dep
    assert.equal(
      /from\s+['"](?!node:crypto|\.\/)[^'"]+['"]/.test(text),
      false,
      `${f} must not import non-native external runtime deps`
    );
  }

  // Pre-existing siblings in orchestration/ MAY coexist (BI/AT/BJ lesson).
  const siblings = allJs.filter(
    (f) => !f.startsWith('governed-external-write-')
  );
  assert.ok(Array.isArray(siblings));
});

// ── BK8: PRODUCTION_READY=NO + NON-CLAIM strings on modules ─────────────────
test('BK8: PRODUCTION_READY=NO and NON-CLAIM markers present in BK modules', () => {
  const bkFiles = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.startsWith('governed-external-write-') && f.endsWith('.js'));
  let sawPrNo = false;
  let sawNonClaim = false;
  let sawFleet = false;
  let sawK8s = false;
  for (const f of bkFiles) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    if (/PRODUCTION_READY:\s*NO|PRODUCTION_READY\s*=\s*['"]NO['"]/.test(text)) {
      sawPrNo = true;
    }
    if (/NON-CLAIM/.test(text)) sawNonClaim = true;
    if (/unsupervised fleet deploy|unsupervisedFleetDeploy/.test(text)) {
      sawFleet = true;
    }
    if (/K8s\/ArgoCD|k8sArgoCd/.test(text)) {
      sawK8s = true;
    }
  }
  assert.equal(sawPrNo, true);
  assert.equal(sawNonClaim, true);
  assert.equal(sawFleet, true);
  assert.equal(sawK8s, true);
  assert.equal(BK_PRODUCTION_READY, 'NO');
});

// ── BK9: L17/L18/L19 never-reopen markers ───────────────────────────────────
test('BK9: L17/L18/L19 CLOSED never-reopen markers on health + sources', () => {
  const orch = makeOrch();
  const h = orch.health();
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  assert.equal(h.l19NeverReopen, true);
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.ladder19, 'CLOSED');
  assert.equal(h.ladder20, 'OPEN');
  assert.equal(h.bhMeasured, true);
  assert.equal(h.biMeasured, true);
  assert.equal(h.bjMeasured, true);
  assert.equal(h.bkInProgress, true);
  assert.equal(h.blPending, true);
  assert.equal(h.notBl, true);

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'governed-external-write-orchestrator.js'),
    'utf8'
  );
  assert.match(facade, /L17 CLOSED never reopen/);
  assert.match(facade, /L18 CLOSED never reopen/);
  assert.match(facade, /L19 CLOSED never reopen/);
  assert.match(facade, /L20 OPEN/);
  assert.match(facade, /Sovereign Mission Continuity & Operator Fabric/);
  assert.match(facade, /BH\+BI\+BJ MEASURED/);
});

// ── BK10: Empty / malformed DENY ────────────────────────────────────────────
test('BK10: empty/malformed payload DENY', () => {
  const orch = makeOrch();
  const noProj = orch.executeGovernedWrite({
    context: ALL_PRE,
    diffPayload: { path: 'workspace/allowlisted.js' }
  });
  assert.equal(noProj.ok, false);
  assert.equal(noProj.code, BK_CODES.MALFORMED_PAYLOAD);
  assert.ok(noProj.receipt.sealed);

  const forced = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: ALL_PRE,
    forceMalformed: true
  });
  assert.equal(forced.ok, false);
  assert.equal(forced.code, BK_CODES.MALFORMED_PAYLOAD);

  const noPaths = orch.executeGovernedWrite({
    targetProject: { id: 'x', root: 'workspace' },
    context: ALL_PRE
  });
  assert.equal(noPaths.ok, false);
  assert.equal(noPaths.code, BK_CODES.MALFORMED_PAYLOAD);

  const badRb = orch.rollbackWrite({});
  assert.equal(badRb.ok, false);
  assert.equal(badRb.code, BK_CODES.MALFORMED_PAYLOAD);
});

// ── BK11: Deterministic hash ────────────────────────────────────────────────
test('BK11: deterministic receipt hash for identical inputs', () => {
  _resetReceiptSeqForTests();
  const body = {
    ok: true,
    status: 'OK',
    targetProjectId: 'eos-demo',
    targetPaths: ['workspace/allowlisted.js'],
    preconditionMask: ALL_PRE,
    rollbackExecuted: false,
    timestamp: '2026-09-14T19:45:00.000Z',
    prevReceiptHash: null,
    receiptId: 'BK-RCPT-fixed0001'
  };
  const a = buildWriteReceipt(body, { now: FIXED_NOW, hash: sha256Canonical });
  _resetReceiptSeqForTests();
  const b = buildWriteReceipt(body, { now: FIXED_NOW, hash: sha256Canonical });
  assert.equal(a.receiptHash, b.receiptHash);
  assert.equal(
    hashWriteReceipt(canonicalWriteSealBody(a)),
    a.receiptHash
  );
  assert.equal(stableStringify({ z: 1, a: 2 }), stableStringify({ a: 2, z: 1 }));
});

// ── BK12: getState counters ─────────────────────────────────────────────────
test('BK12: getState reflects write/deny/rollback counters', () => {
  const orch = makeOrch({
    ports: {
      bcApply: () => ({ ok: true }),
      bdDelivery: () => ({ ok: true })
    }
  });
  orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: ALL_PRE
  });
  orch.executeGovernedWrite({
    targetProject: { id: 'fundacion' },
    diffPayload: { path: 'x' },
    context: ALL_PRE
  });
  const st = orch.getState();
  assert.equal(st.kind, BK_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.ok(st.writeCount >= 2);
  assert.ok(st.okCount >= 1);
  assert.ok(st.denyCount >= 1);
  assert.ok(st.historyCount >= 2);
  assert.ok(typeof st.lastReceiptHash === 'string');
  assert.equal(st.allMask, BK_PRECONDITION_ALL_MASK);
});

// ── BK13: BH+BI+BJ MEASURED / not BL ────────────────────────────────────────
test('BK13: BH+BI+BJ MEASURED acknowledged / not BL', () => {
  const orch = makeOrch();
  const h = orch.health();
  assert.equal(h.bhMeasured, true);
  assert.equal(h.biMeasured, true);
  assert.equal(h.bjMeasured, true);
  assert.equal(h.bkInProgress, true);
  assert.equal(h.blPending, true);
  assert.equal(h.notBl, true);
  assert.equal(h.bhAcknowledged, true);
  assert.equal(h.biAcknowledged, true);
  assert.equal(h.bjAcknowledged, true);
});

// ── BK14: Ports composition (tGate / bcApply / bdDelivery / writeBarrier) ───
test('BK14: ports composition tGate/bcApply/bdDelivery/writeBarrier called', () => {
  const calls = [];
  const orch = makeOrch({
    ports: {
      tGate: (a) => {
        calls.push(['tGate', a.op]);
        return { ok: true };
      },
      bcApply: (a) => {
        calls.push(['bcApply', a.op]);
        return { ok: true, applied: true };
      },
      bdDelivery: (a) => {
        calls.push(['bdDelivery', a.op]);
        return { ok: true, delivered: true };
      },
      writeBarrier: (a) => {
        calls.push(['writeBarrier', a.op]);
        return { ok: true };
      }
    }
  });
  const r = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: ALL_PRE
  });
  assert.equal(r.ok, true);
  assert.ok(calls.some((c) => c[0] === 'tGate'));
  assert.ok(calls.some((c) => c[0] === 'bcApply' && c[1] === 'apply'));
  assert.ok(calls.some((c) => c[0] === 'bdDelivery' && c[1] === 'deliver'));
  assert.ok(calls.some((c) => c[0] === 'writeBarrier'));
});

// ── BK15: Unauthorized path DENY ────────────────────────────────────────────
test('BK15: unauthorized path outside allowlist → DENY', () => {
  const orch = makeOrch();
  const r = orch.executeGovernedWrite({
    targetProject: {
      id: 'eos-demo',
      root: 'workspace',
      paths: ['../../etc/passwd']
    },
    diffPayload: { path: '../../etc/passwd' },
    context: ALL_PRE
  });
  assert.equal(r.ok, false);
  assert.ok(
    r.code === BK_CODES.PATH_CONTAINMENT_DENY ||
      r.code === BK_CODES.UNAUTHORIZED_PATH ||
      r.code === BK_CODES.ALLOWLIST_DENY
  );
  assert.ok(r.receipt.sealed);

  const outside = orch.executeGovernedWrite({
    targetProject: {
      id: 'eos-demo',
      root: 'workspace',
      paths: ['secrets/not-allowlisted.js']
    },
    diffPayload: { path: 'secrets/not-allowlisted.js' },
    context: ALL_PRE
  });
  assert.equal(outside.ok, false);
  assert.ok(
    outside.code === BK_CODES.UNAUTHORIZED_PATH ||
      outside.code === BK_CODES.ALLOWLIST_DENY
  );
});

// ── BK16: Explicit rollbackWrite + hermetic no-network scan ─────────────────
test('BK16: explicit rollbackWrite + hermetic no-network / no Fundacion writes', () => {
  const orch = makeOrch({
    ports: {
      bcApply: () => ({ ok: true }),
      bdDelivery: () => ({ ok: true }),
      writeBarrier: () => ({ ok: true }),
      tGate: () => ({ ok: true })
    }
  });
  const w = orch.executeGovernedWrite({
    targetProject: okProject(),
    diffPayload: { path: 'workspace/allowlisted.js' },
    context: ALL_PRE
  });
  assert.equal(w.ok, true);
  const rb = orch.rollbackWrite({
    targetProject: okProject(),
    transactionId: w.transactionId,
    prevReceiptHash: w.receipt.receiptHash
  });
  assert.equal(rb.ok, true);
  assert.equal(rb.code, BK_CODES.ROLLBACK_OK);
  assert.equal(rb.rollbackExecuted, true);
  assert.ok(rb.receipt.sealed);
  assert.equal(rb.receipt.rollbackExecuted, true);
  assert.equal(rb.receipt.prevReceiptHash, w.receipt.receiptHash);

  // Sources stay hermetic — no network / child_process / http
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.startsWith('governed-external-write-') && f.endsWith('.js'));
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
