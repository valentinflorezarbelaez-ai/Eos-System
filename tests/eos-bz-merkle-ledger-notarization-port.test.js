/**
 * @file tests/eos-bz-merkle-ledger-notarization-port.test.js
 * SPEC-0083 / Mission BZ — Continuous Cryptographic Ledger Merkle Notarization Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   NON-CLAIM: Merkle ledger ≠ public blockchain / ≠ cryptocurrency.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  BZ_PRODUCTION_READY,
  BZ_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  BZ_RECEIPT_KIND,
  sha256Canonical,
  buildMerkleLedgerReceipt,
  verifyMerkleLedgerReceipt,
  _resetReceiptSeqForTests
} from '../src/core/audit/merkle-ledger-receipt.js';

import {
  MerkleLedgerPolicyGate,
  BZ_CODES,
  BZ_MAX_BATCH_SIZE,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/audit/merkle-ledger-policy-gate.js';

import {
  MerkleLedgerNotarizationPort,
  BZ_PORT_PRODUCTION_READY,
  BZ_PORT_KIND,
  BZ_ODD_NODE_STRATEGY,
  buildMerkleTree,
  generateInclusionProof,
  verifyInclusion
} from '../src/core/audit/merkle-ledger-notarization-port.js';

// Dynamic synthetic secret builder (Law VI compliance)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMerkleLedgerVerification1234567890';
}

describe('Mission BZ — Merkle Ledger Receipt (SPEC-0083)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/port/constant', () => {
    assert.equal(BZ_PRODUCTION_READY, 'NO');
    assert.equal(BZ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(BZ_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed BZ-RCPT-* receipt with valid SHA-256 hash', () => {
    const receipt = buildMerkleLedgerReceipt({
      operation: 'MERKLE_NOTARIZE',
      notarizationId: 'BZ-NOTARY-0001',
      rootHash: sha256Canonical({ sample: 'root' }),
      status: 'OK',
      leafCount: 4
    });

    assert.equal(receipt.kind, BZ_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('BZ-RCPT-'));
    assert.equal(receipt.notarizationId, 'BZ-NOTARY-0001');
    assert.equal(receipt.leafCount, 4);
    assert.ok(receipt.receiptHash.length === 64);
    assert.equal(receipt.nonClaims.publicBlockchain, false);
    assert.equal(receipt.nonClaims.cryptocurrency, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const verifyRes = verifyMerkleLedgerReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content', () => {
    const receipt = buildMerkleLedgerReceipt({
      operation: 'MERKLE_NOTARIZE',
      notarizationId: 'BZ-NOTARY-0001',
      status: 'OK',
      leafCount: 2
    });

    const tampered = { ...receipt, notarizationId: 'BZ-NOTARY-TAMPERED' };
    const verifyRes = verifyMerkleLedgerReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission BZ — Merkle Ledger Policy Gate (SPEC-0083)', () => {
  let gate;

  beforeEach(() => {
    gate = new MerkleLedgerPolicyGate();
  });

  it('validates a well-formed non-empty leaf batch', () => {
    const res = gate.evaluateBatch([
      { digest: sha256Canonical('event-1') },
      { payload: { eventId: 'e2', type: 'COMMIT' } },
      sha256Canonical('event-3')
    ]);

    assert.equal(res.valid, true);
    assert.equal(res.code, BZ_CODES.BATCH_VALID_OK);
    assert.equal(res.digests.length, 3);
  });

  it('rejects empty batches / empty trees fail-closed', () => {
    const res = gate.evaluateBatch([]);
    assert.equal(res.valid, false);
    assert.equal(res.code, BZ_CODES.EMPTY_BATCH_DENY);
  });

  it('rejects oversized batches beyond max bound', () => {
    const huge = new Array(BZ_MAX_BATCH_SIZE + 1).fill(null).map((_, i) => ({
      digest: sha256Canonical(`leaf-${i}`)
    }));
    const res = gate.evaluateBatch(huge);
    assert.equal(res.valid, false);
    assert.equal(res.code, BZ_CODES.OVERSIZED_BATCH_DENY);
  });

  it('rejects malformed leaves missing digest and payload', () => {
    const res = gate.evaluateBatch([null]);
    assert.equal(res.valid, false);
    assert.equal(res.code, BZ_CODES.MALFORMED_LEAF_DENY);
  });

  it('detects secrets in leaf payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    const res = gate.evaluateBatch([
      { payload: { note: `apiKey: ${secret}` } }
    ]);
    assert.equal(res.valid, false);
    assert.equal(res.code, BZ_CODES.SECRET_DETECTED_DENY);
    assert.equal(scanForSecrets(`apiKey: ${secret}`), true);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    const byContext = gate.evaluateBatch(
      [{ digest: sha256Canonical('ok') }],
      { target: 'C:/Users/valen/Documents/Fundacion/ledger.json' }
    );
    assert.equal(byContext.valid, false);
    assert.equal(byContext.code, BZ_CODES.FUNDACION_ALWAYS_DENY);

    const byLeaf = gate.evaluateBatch([
      {
        digest: sha256Canonical('x'),
        path: '/fundacion/secrets.db'
      }
    ]);
    assert.equal(byLeaf.valid, false);
    assert.equal(byLeaf.code, BZ_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(isFundacionTarget('Documents/Fundacion/x'), true);
  });
});

describe('Mission BZ — Merkle Tree & Inclusion Proofs (SPEC-0083)', () => {
  it('builds binary Merkle tree with Bitcoin-style odd-node duplication', () => {
    const leaves = [
      sha256Canonical('a'),
      sha256Canonical('b'),
      sha256Canonical('c')
    ];
    const tree = buildMerkleTree(leaves);
    assert.equal(tree.strategy, BZ_ODD_NODE_STRATEGY);
    assert.equal(tree.leafCount, 3);
    assert.ok(tree.root.length === 64);
    // Level 0 has 3 leaves; level 1 has 2 (pair ab + duplicate c); level 2 root
    assert.equal(tree.levels[0].length, 3);
    assert.equal(tree.levels[1].length, 2);
    assert.equal(tree.levels[2].length, 1);
  });

  it('proves and verifies true inclusion for a leaf index (O(log N) path)', () => {
    const leaves = ['L0', 'L1', 'L2', 'L3'].map((x) => sha256Canonical(x));
    const tree = buildMerkleTree(leaves);
    const proof = generateInclusionProof(tree, 2);
    assert.ok(proof);
    assert.equal(proof.leafDigest, leaves[2]);
    assert.ok(proof.siblings.length >= 1);
    assert.equal(verifyInclusion(leaves[2], proof, tree.root), true);
  });

  it('rejects false inclusion when leaf digest does not match proof path', () => {
    const leaves = ['A', 'B', 'C', 'D'].map((x) => sha256Canonical(x));
    const tree = buildMerkleTree(leaves);
    const proof = generateInclusionProof(tree, 0);
    const wrongLeaf = sha256Canonical('NOT-A');
    assert.equal(verifyInclusion(wrongLeaf, proof, tree.root), false);
  });

  it('rejects inclusion against a wrong root', () => {
    const leaves = ['X', 'Y'].map((x) => sha256Canonical(x));
    const tree = buildMerkleTree(leaves);
    const proof = generateInclusionProof(tree, 1);
    assert.equal(
      verifyInclusion(leaves[1], proof, sha256Canonical('fake-root')),
      false
    );
  });
});

describe('Mission BZ — Merkle Ledger Notarization Port (SPEC-0083)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new MerkleLedgerNotarizationPort();
  });

  it('notarizes ordered leaves and emits root + sealed BZ receipt', () => {
    const res = port.notarize([
      { payload: { event: 'commit', id: 1 } },
      { payload: { event: 'commit', id: 2 } },
      { payload: { event: 'commit', id: 3 } },
      { payload: { event: 'commit', id: 4 } }
    ]);

    assert.equal(res.ok, true);
    assert.equal(res.code, BZ_CODES.NOTARIZE_OK);
    assert.ok(res.notarizationId.startsWith('BZ-NOTARY-'));
    assert.ok(res.root.length === 64);
    assert.equal(res.leafCount, 4);
    assert.ok(res.receipt.receiptId.startsWith('BZ-RCPT-'));
    assert.equal(res.receipt.rootHash, res.root);
    assert.equal(res.receipt.productionReady, 'NO');
  });

  it('stores and retrieves notarizations by id', () => {
    const res = port.notarize([
      sha256Canonical('r1'),
      sha256Canonical('r2')
    ]);
    const stored = port.getNotarization(res.notarizationId);
    assert.ok(stored);
    assert.equal(stored.root, res.root);
    assert.equal(stored.leafCount, 2);
    assert.equal(stored.strategy, BZ_ODD_NODE_STRATEGY);
    assert.equal(port.getNotarization('missing'), null);
  });

  it('proveInclusion + verifyInclusion round-trip through the port', () => {
    const digests = [1, 2, 3, 4, 5].map((n) => sha256Canonical(`evt-${n}`));
    const res = port.notarize(digests.map((d) => ({ digest: d })));
    assert.equal(res.ok, true);

    const proofRes = port.proveInclusion(res.notarizationId, 3);
    assert.equal(proofRes.ok, true);
    assert.equal(
      port.verifyInclusion(digests[3], proofRes.proof, res.root),
      true
    );
    assert.equal(
      port.verifyInclusion(digests[0], proofRes.proof, res.root),
      false
    );
  });

  it('verifies cryptographic custody trail of all emitted receipts', () => {
    port.notarize([{ payload: { n: 1 } }, { payload: { n: 2 } }]);
    port.notarize([{ payload: { n: 3 } }, { payload: { n: 4 } }]);

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.valid, true);
    assert.equal(trailRes.code, BZ_CODES.TRAIL_OK);
    assert.equal(trailRes.receiptCount, 2);
    assert.ok(trailRes.headHash.length === 64);
  });

  it('detects tampered receipt in audit trail (verifyTrail TRAIL_BREAK)', () => {
    port.notarize([{ payload: { n: 1 } }]);
    port.receipts[0] = { ...port.receipts[0], notarizationId: 'tampered' };

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.valid, false);
    assert.equal(trailRes.code, BZ_CODES.TRAIL_BREAK);
  });

  it('denies notarization for Fundacion target and empty batch with sealed DENIED receipts', () => {
    const empty = port.notarize([]);
    assert.equal(empty.ok, false);
    assert.equal(empty.code, BZ_CODES.EMPTY_BATCH_DENY);
    assert.equal(empty.receipt.status, 'DENIED');

    const fund = port.notarize([{ digest: sha256Canonical('x') }], {
      targetPath: 'Documents/Fundacion/out.bin'
    });
    assert.equal(fund.ok, false);
    assert.equal(fund.code, BZ_CODES.FUNDACION_ALWAYS_DENY);

    const trail = port.verifyTrail();
    assert.equal(trail.valid, true);
    assert.equal(trail.receiptCount, 2);
  });

  it('asserts port kind and NON-CLAIM Merkle ≠ blockchain/cryptocurrency', () => {
    assert.equal(BZ_PORT_KIND, 'eos-merkle-ledger-notarization-port');
    const receipt = buildMerkleLedgerReceipt({ status: 'OK', leafCount: 1 });
    assert.equal(receipt.nonClaims.publicBlockchain, false);
    assert.equal(receipt.nonClaims.cryptocurrency, false);
    assert.equal(receipt.nonClaims.productionReady, false);
  });
});
