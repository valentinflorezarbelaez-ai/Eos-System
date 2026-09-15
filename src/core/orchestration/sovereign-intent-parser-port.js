/**
 * @module sovereign-intent-parser-port
 * SPEC-0075 / Mission BR — Sovereign Intent Parser & Atomic Task DAG Decomposer Port.
 *
 * Facade: createSovereignIntentParserPort({ now, hash, policyGate })
 *   .parseIntent(rawIntent)
 *   .decomposeTaskDag(intent, opts)
 *   .validateDagTopology(nodes)
 *   .verifyDecompositionTrail(receipts)
 *
 * Pure Layer-0 hermetic intent parsing & task DAG decomposition.
 * Emits cryptographically sealed BR-RCPT-* receipts via node:crypto.
 *
 * Fail-closed:
 *   Fundacion ALWAYS_DENY; cyclical dependencies → CYCLICAL_DEPENDENCY_DENY;
 *   missing prerequisites → MISSING_PREREQUISITE_DENY; ambiguous input → AMBIGUOUS_INTENT_DENY.
 *
 * NON-CLAIM:
 *   intent parser & DAG decomposer port ≠ general AGI planner /
 *   ≠ unconstrained autonomous reasoning /
 *   ≠ PRODUCTION_READY=YES workflow engine.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR in progress; BS–BV pending);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BR_CEILING
 */

import {
  BR_PRODUCTION_READY as BR_RECEIPT_PR,
  BR_RECEIPT_KIND,
  BR_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalIntentDecompositionSealBody,
  hashIntentDecompositionReceipt,
  verifyIntentDecompositionReceipt,
  buildIntentDecompositionReceipt,
  _resetReceiptSeqForTests
} from './intent-decomposition-receipt.js';

import {
  BR_POLICY_GATE_KIND,
  BR_POLICY_GATE_PRODUCTION_READY,
  BR_POLICY_CODES,
  deny,
  denyMalformed,
  denyFundacion,
  denyAmbiguous,
  denyCyclical,
  denyMissingPrerequisite,
  denyDuplicateNode,
  isFundacionTarget,
  validateIntentPayload,
  validateGraphTopology,
  gateIntentDecomposition,
  createIntentDecompositionPolicyGate
} from './intent-decomposition-policy-gate.js';

/** @type {'NO'} */
export const BR_PRODUCTION_READY = 'NO';

export const BR_KIND = 'eos-sovereign-intent-parser-port';

export const BR_CODES = Object.freeze({
  ...BR_POLICY_CODES,
  PARSE_OK: 'PARSE_OK',
  DECOMPOSED_OK: 'DECOMPOSED_OK',
  VALIDATED_OK: 'VALIDATED_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

export {
  BR_POLICY_CODES,
  BR_POLICY_GATE_KIND,
  BR_POLICY_GATE_PRODUCTION_READY,
  BR_RECEIPT_KIND,
  BR_RECEIPT_PRODUCTION_READY,
  BR_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalIntentDecompositionSealBody,
  hashIntentDecompositionReceipt,
  verifyIntentDecompositionReceipt,
  buildIntentDecompositionReceipt,
  _resetReceiptSeqForTests,
  validateIntentPayload,
  validateGraphTopology,
  isFundacionTarget
};

/**
 * Standard default decomposition heuristic when custom nodes are not provided.
 * @param {string} goal
 * @param {string} intentId
 * @returns {Array<{ id: string, name: string, capability: string, dependsOn: string[], estimatedTimeoutMs: number }>}
 */
function defaultDecomposeHeuristic(goal, intentId) {
  const sanitizeId = (suffix) => `${intentId}-${suffix}`;

  return [
    {
      id: sanitizeId('task-01-intake'),
      name: `Analyze and validate intent scope: ${goal.slice(0, 80)}`,
      capability: 'reasoning.analysis',
      dependsOn: [],
      estimatedTimeoutMs: 5000
    },
    {
      id: sanitizeId('task-02-domain-execution'),
      name: `Execute domain logic and state transitions for: ${goal.slice(0, 80)}`,
      capability: 'execution.core',
      dependsOn: [sanitizeId('task-01-intake')],
      estimatedTimeoutMs: 30000
    },
    {
      id: sanitizeId('task-03-verification-audit'),
      name: `Verify invariants and execute regression checks for: ${goal.slice(0, 80)}`,
      capability: 'verification.sensor',
      dependsOn: [sanitizeId('task-02-domain-execution')],
      estimatedTimeoutMs: 15000
    },
    {
      id: sanitizeId('task-04-evidence-custody'),
      name: `Seal cryptographic provenance receipt for: ${goal.slice(0, 80)}`,
      capability: 'custody.notary',
      dependsOn: [sanitizeId('task-03-verification-audit')],
      estimatedTimeoutMs: 5000
    }
  ];
}

/**
 * Factory for Sovereign Intent Parser & Atomic Task DAG Decomposer Port.
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.policyGate]
 * @returns {object}
 */
export function createSovereignIntentParserPort(opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const gate =
    opts.policyGate || createIntentDecompositionPolicyGate(opts);

  let _intentCounter = 0;

  /**
   * Parse and normalize raw operational intent.
   * @param {unknown} rawIntent
   * @param {object} [parseOpts]
   * @returns {{ ok: boolean, allow?: boolean, intentId?: string, rawIntent?: string, rawIntentHash?: string, parsedGoal?: string, timestamp?: string, tags?: string[], code?: string, reason?: string }}
   */
  function parseIntent(rawIntent, parseOpts = {}) {
    const gateResult = gate.gateIntentDecomposition(rawIntent);
    if (!gateResult.ok) {
      return {
        ok: false,
        allow: false,
        code: gateResult.code,
        reason: gateResult.reason,
        fundacionDelta: 0
      };
    }

    _intentCounter += 1;
    const cleanGoal = gateResult.cleanIntent;
    const intentId =
      parseOpts.intentId != null && String(parseOpts.intentId).trim() !== ''
        ? String(parseOpts.intentId).trim()
        : `INTENT-${String(_intentCounter).padStart(4, '0')}`;

    const rawIntentHash = hashFn(cleanGoal);
    const timestamp = String(nowFn());

    // Extract basic semantic tags
    const tags = [];
    const lower = cleanGoal.toLowerCase();
    if (lower.includes('test') || lower.includes('verify')) tags.push('verification');
    if (lower.includes('build') || lower.includes('implement')) tags.push('implementation');
    if (lower.includes('refactor') || lower.includes('optimize')) tags.push('optimization');
    if (lower.includes('audit') || lower.includes('check')) tags.push('audit');

    return {
      ok: true,
      allow: true,
      code: BR_CODES.PARSE_OK,
      intentId,
      rawIntent: cleanGoal,
      rawIntentHash,
      parsedGoal: cleanGoal,
      timestamp,
      tags: Object.freeze(tags),
      fundacionDelta: 0
    };
  }

  /**
   * Decompose an intent into a strictly acyclic directed task graph (DAG).
   * @param {unknown} intentOrRaw
   * @param {object} [decompOpts]
   * @param {Array<{ id: string, name?: string, capability?: string, dependsOn?: string[] }>} [decompOpts.customNodes]
   * @param {string} [decompOpts.prevReceiptHash]
   * @returns {{ ok: boolean, receipt: object, dag?: object, code?: string, reason?: string }}
   */
  function decomposeTaskDag(intentOrRaw, decompOpts = {}) {
    let parsed;
    if (
      intentOrRaw != null &&
      typeof intentOrRaw === 'object' &&
      intentOrRaw.parsedGoal &&
      intentOrRaw.rawIntentHash
    ) {
      parsed = intentOrRaw;
    } else {
      const pResult = parseIntent(intentOrRaw, decompOpts);
      if (!pResult.ok) {
        // Emit failure receipt for audit
        const failReceipt = buildIntentDecompositionReceipt(
          {
            intentId: pResult.intentId || 'INTENT-FAILED',
            rawIntentHash: hashFn(String(intentOrRaw || '')),
            parsedGoal: String(intentOrRaw || '').slice(0, 100),
            nodeCount: 0,
            edgeCount: 0,
            status: pResult.code || BR_CODES.DENY,
            prevReceiptHash: decompOpts.prevReceiptHash
          },
          { now: nowFn, hash: hashFn }
        );
        return {
          ok: false,
          code: pResult.code,
          reason: pResult.reason,
          receipt: failReceipt,
          fundacionDelta: 0
        };
      }
      parsed = pResult;
    }

    // Determine nodes: either explicit custom nodes or default heuristic
    const rawNodes = Array.isArray(decompOpts.customNodes) && decompOpts.customNodes.length > 0
      ? decompOpts.customNodes
      : defaultDecomposeHeuristic(parsed.parsedGoal, parsed.intentId);

    // Validate graph topology (Kahn's cycle detection + sorting)
    const topoResult = gate.validateGraphTopology(rawNodes);
    if (!topoResult.valid) {
      const failReceipt = buildIntentDecompositionReceipt(
        {
          intentId: parsed.intentId,
          rawIntentHash: parsed.rawIntentHash,
          parsedGoal: parsed.parsedGoal,
          nodeCount: rawNodes.length,
          edgeCount: 0,
          status: topoResult.code || BR_CODES.CYCLICAL_DEPENDENCY_DENY,
          prevReceiptHash: decompOpts.prevReceiptHash
        },
        { now: nowFn, hash: hashFn }
      );
      return {
        ok: false,
        code: topoResult.code,
        reason: topoResult.reason,
        receipt: failReceipt,
        cycleNodes: topoResult.cycleNodes,
        fundacionDelta: 0
      };
    }

    // Count edges
    let edgeCount = 0;
    const normalizedNodes = [];
    for (const n of rawNodes) {
      const deps = Array.isArray(n.dependsOn) ? n.dependsOn : [];
      edgeCount += deps.length;
      normalizedNodes.push({
        id: String(n.id).trim(),
        name: String(n.name || n.id).trim(),
        capability: String(n.capability || 'general.task').trim(),
        dependsOn: Object.freeze([...deps]),
        estimatedTimeoutMs: typeof n.estimatedTimeoutMs === 'number' ? n.estimatedTimeoutMs : 10000
      });
    }

    // Build sealed receipt
    const receipt = buildIntentDecompositionReceipt(
      {
        intentId: parsed.intentId,
        rawIntentHash: parsed.rawIntentHash,
        parsedGoal: parsed.parsedGoal,
        nodeCount: normalizedNodes.length,
        edgeCount,
        status: BR_CODES.DECOMPOSED_OK,
        prevReceiptHash: decompOpts.prevReceiptHash
      },
      { now: nowFn, hash: hashFn }
    );

    return {
      ok: true,
      code: BR_CODES.DECOMPOSED_OK,
      receipt,
      dag: Object.freeze({
        intentId: parsed.intentId,
        rawIntentHash: parsed.rawIntentHash,
        parsedGoal: parsed.parsedGoal,
        nodes: Object.freeze(normalizedNodes),
        sortedOrder: Object.freeze(topoResult.sortedOrder),
        nodeCount: normalizedNodes.length,
        edgeCount
      }),
      fundacionDelta: 0
    };
  }

  /**
   * Verify an array of decomposition receipts for hash integrity and chronological linkage.
   * @param {object[]} receipts
   * @returns {{ ok: boolean, code: string, verifiedCount: number, reason?: string, brokenAtReceiptId?: string }}
   */
  function verifyDecompositionTrail(receipts) {
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return {
        ok: false,
        code: BR_CODES.MALFORMED_PAYLOAD,
        verifiedCount: 0,
        reason: 'receipts trail must be a non-empty array'
      };
    }

    let prevHash = null;
    let count = 0;

    for (const rcpt of receipts) {
      const check = verifyIntentDecompositionReceipt(rcpt, hashFn);
      if (!check.ok) {
        return {
          ok: false,
          code: BR_CODES.TRAIL_BREAK,
          verifiedCount: count,
          brokenAtReceiptId: rcpt?.receiptId,
          reason: `receipt validation failed: ${check.reason}`
        };
      }

      if (count > 0 && rcpt.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          code: BR_CODES.TRAIL_BREAK,
          verifiedCount: count,
          brokenAtReceiptId: rcpt.receiptId,
          reason: `hash chain broken: expected prevReceiptHash ${prevHash}, got ${rcpt.prevReceiptHash}`
        };
      }

      prevHash = rcpt.receiptHash;
      count += 1;
    }

    return {
      ok: true,
      code: BR_CODES.TRAIL_OK,
      verifiedCount: count
    };
  }

  return Object.freeze({
    kind: BR_KIND,
    productionReady: BR_PRODUCTION_READY,
    parseIntent,
    decomposeTaskDag,
    validateDagTopology: gate.validateGraphTopology,
    verifyDecompositionTrail
  });
}
