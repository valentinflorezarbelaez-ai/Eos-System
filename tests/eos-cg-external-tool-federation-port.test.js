/**
 * @file tests/eos-cg-external-tool-federation-port.test.js
 * SPEC-0090 / Mission CG — External Tool / MCP Federation Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   Hermetic: no live MCP network calls.
 *   NON-CLAIM: ≠ unrestricted tool proxy / ≠ Fundacion writes / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CG_PRODUCTION_READY,
  CG_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CG_RECEIPT_KIND,
  sha256Canonical,
  buildExternalToolFederationReceipt,
  verifyExternalToolFederationReceipt,
  canonicalExternalToolFederationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/federation/external-tool-federation-receipt.js';

import {
  ExternalToolFederationPolicyGate,
  CG_CODES,
  CG_MAX_TOOLS,
  CG_TOOL_ID_PATTERN,
  CG_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  isFundacionTarget,
  isUnrestrictedAllowAll
} from '../src/core/federation/external-tool-federation-policy-gate.js';

import {
  ExternalToolFederationPort,
  CG_PORT_PRODUCTION_READY,
  CG_PORT_KIND
} from '../src/core/federation/external-tool-federation-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionExternalToolFed1234567890';
}

function sampleHappyPlan(overrides = {}) {
  return {
    federationId: 'eos-mcp-federation-demo',
    label: 'allowlisted MCP surface',
    toolIds: [
      'mcp.figma/get_screenshot',
      'mcp.notion/search',
      'gmail_search_threads'
    ],
    allowlist: [
      'mcp.figma/get_screenshot',
      'mcp.notion/search',
      'gmail_search_threads',
      'mcp.drive/list_recent'
    ],
    ...overrides
  };
}

describe('Mission CG — External Tool Federation Receipt (SPEC-0090)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CG_PRODUCTION_READY, 'NO');
    assert.equal(CG_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CG_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CG_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CG-RCPT-* with valid SHA-256 hash', () => {
    const toolIds = ['mcp.figma/get_screenshot', 'mcp.notion/search'];
    const allowlist = [...toolIds, 'mcp.drive/list_recent'];
    const toolCallDigest = sha256Canonical({
      toolIds,
      allowlist,
      decision: 'ALLOW'
    });
    const receipt = buildExternalToolFederationReceipt({
      operation: 'FEDERATE',
      federationId: 'eos-demo',
      decision: 'ALLOW',
      toolIds,
      allowlist,
      toolCallDigest,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CG_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CG-RCPT-'));
    assert.equal(receipt.federationId, 'eos-demo');
    assert.equal(receipt.decision, 'ALLOW');
    assert.equal(receipt.toolCount, 2);
    assert.equal(receipt.toolIds.length, 2);
    assert.equal(receipt.allowlist.length, 3);
    assert.equal(receipt.toolCallDigest, toolCallDigest);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.unrestrictedToolProxy, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalExternalToolFederationSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyExternalToolFederationReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildExternalToolFederationReceipt({
      operation: 'FEDERATE',
      federationId: 'eos-demo',
      decision: 'ALLOW',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['mcp.figma/get_screenshot']
    });

    const tampered = { ...receipt, federationId: 'eos-tampered-hacked' };
    const verifyRes = verifyExternalToolFederationReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CG — External Tool Federation Policy Gate (SPEC-0090)', () => {
  let gate;

  beforeEach(() => {
    gate = new ExternalToolFederationPolicyGate();
  });

  it('validates a well-formed allowlisted federation plan', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CG_CODES.PLAN_VALID_OK);
    assert.equal(res.toolIds.length, 3);
    assert.equal(res.allowlist.length, 4);
    assert.equal(res.federationId, 'eos-mcp-federation-demo');
    assert.ok(CG_TOOL_ID_PATTERN.test('mcp.figma/get_screenshot'));
    assert.ok(CG_MAX_TOOLS >= 2);
  });

  it('rejects empty plan / empty toolIds fail-closed', () => {
    const empty = gate.evaluatePlan({
      federationId: 'empty',
      toolIds: [],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CG_CODES.EMPTY_TOOLS_DENY);

    const missing = gate.evaluatePlan({
      federationId: 'missing'
    });
    assert.equal(missing.valid, false);
    assert.equal(missing.code, CG_CODES.EMPTY_PLAN_DENY);
  });

  it('rejects unrestricted * allow-all', () => {
    assert.equal(isUnrestrictedAllowAll('*'), true);

    const starAllow = gate.evaluatePlan({
      federationId: 'star',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['*']
    });
    assert.equal(starAllow.valid, false);
    assert.equal(starAllow.code, CG_CODES.UNRESTRICTED_ALLOWALL_DENY);

    const starTool = gate.evaluatePlan({
      federationId: 'star-tool',
      toolIds: ['*'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(starTool.valid, false);
    assert.equal(starTool.code, CG_CODES.UNRESTRICTED_ALLOWALL_DENY);
  });

  it('rejects unknown tool outside allowlist', () => {
    const res = gate.evaluatePlan({
      federationId: 'outside',
      toolIds: ['mcp.figma/get_screenshot', 'mcp.evil/exfil'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CG_CODES.UNKNOWN_TOOL_OUTSIDE_ALLOWLIST_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      federationId: 'leak',
      label: `federation with key ${secret}`,
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CG_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluatePlan({
      federationId: 'fundacion-plan',
      target: 'C:/Users/valen/Documents/Fundacion/tools.json',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CG_CODES.FUNDACION_ALWAYS_DENY);

    const idLevel = gate.evaluatePlan({
      federationId: 'fundacion/bleed',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(idLevel.valid, false);
    assert.equal(idLevel.code, CG_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects oversized tool lists beyond max tool bound', () => {
    const tight = new ExternalToolFederationPolicyGate({ maxTools: 2 });
    const tools = ['a_tool', 'b_tool', 'c_tool'];
    const res = tight.evaluatePlan({
      federationId: 'over',
      toolIds: tools,
      allowlist: tools
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CG_CODES.OVERSIZED_TOOLS_DENY);
  });
});

describe('Mission CG — External Tool Federation Port (SPEC-0090)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new ExternalToolFederationPort();
  });

  it('federate happy path: allowlisted tools → ALLOW + CG receipt', () => {
    const plan = sampleHappyPlan();
    const res = port.federate(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'ALLOW');
    assert.equal(res.code, CG_CODES.FEDERATE_ALLOW);
    assert.equal(res.federationId, 'eos-mcp-federation-demo');
    assert.equal(res.toolIds.length, 3);
    assert.equal(res.allowlist.length, 4);
    assert.equal(res.toolCallDigest.length, 64);

    assert.equal(res.receipt.kind, CG_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CG-RCPT-'));
    assert.equal(res.receipt.decision, 'ALLOW');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.deepEqual([...res.receipt.toolIds], res.toolIds);
    assert.deepEqual([...res.receipt.allowlist], res.allowlist);

    const stored = port.getFederation(res.federationId);
    assert.ok(stored);
    assert.equal(stored.toolCallDigest, res.toolCallDigest);
    assert.equal(stored.decision, 'ALLOW');
  });

  it('deny empty tools emits sealed DENY receipt', () => {
    const res = port.federate({
      federationId: 'deny-empty',
      toolIds: [],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CG_CODES.EMPTY_TOOLS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CG-RCPT-'));
  });

  it('deny unrestricted * emits sealed DENY receipt', () => {
    const res = port.federate({
      federationId: 'deny-star',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['*']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CG_CODES.UNRESTRICTED_ALLOWALL_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CG-RCPT-'));
  });

  it('deny Fundacion emits sealed DENY receipt', () => {
    const res = port.federate({
      federationId: 'deny-fundacion',
      target: 'Documents/Fundacion/out',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CG_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CG-RCPT-'));
    assert.equal(verifyExternalToolFederationReceipt(res.receipt).ok, true);
  });

  it('deny secrets emits sealed DENY receipt', () => {
    const secret = makeSyntheticSecret();
    const res = port.federate({
      federationId: 'deny-secret',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['mcp.figma/get_screenshot'],
      payload: { token: secret }
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CG_CODES.SECRET_DETECTED_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny unknown tool outside allowlist emits sealed DENY receipt', () => {
    const res = port.federate({
      federationId: 'deny-outside',
      toolIds: ['mcp.evil/exfil'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CG_CODES.UNKNOWN_TOOL_OUTSIDE_ALLOWLIST_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny oversize tools emits sealed DENY receipt', () => {
    const tight = new ExternalToolFederationPort({ maxTools: 2 });
    const res = tight.federate({
      federationId: 'deny-oversize',
      toolIds: ['a_tool', 'b_tool', 'c_tool'],
      allowlist: ['a_tool', 'b_tool', 'c_tool']
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CG_CODES.OVERSIZED_TOOLS_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('verifyTrail validates CG receipt chain; tamper breaks trail', () => {
    const a = port.federate(sampleHappyPlan({ federationId: 'trail-a' }));
    const b = port.federate({
      federationId: 'trail-b',
      toolIds: ['gmail_search_threads'],
      allowlist: ['gmail_search_threads', 'mcp.notion/search']
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CG_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, federationId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CG_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: not unrestricted proxy / not Fundacion / PRODUCTION_READY=NO', () => {
    assert.equal(CG_PORT_KIND, 'eos-external-tool-federation-port');
    const receipt = buildExternalToolFederationReceipt({
      operation: 'FEDERATE',
      federationId: 'nonclaim',
      decision: 'ALLOW',
      toolIds: ['mcp.figma/get_screenshot'],
      allowlist: ['mcp.figma/get_screenshot']
    });
    assert.equal(receipt.nonClaims.unrestrictedToolProxy, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CG_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CG_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
  });
});
