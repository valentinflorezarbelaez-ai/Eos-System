/**
 * @module dynamic-agent-capability-dispatcher-port
 * SPEC-0076 / Mission BS — Dynamic Agent Capability Matcher & Governed Dispatcher Port.
 *
 * Facade: createAgentCapabilityDispatcherPort({ now, hash, policyGate, attestationPort, consensusGate })
 *   .registerAgentProfile(profile)
 *   .getAgentProfile(agentId)
 *   .listRegisteredAgents()
 *   .matchAgentForTask(taskNode, opts)
 *   .dispatchTask(taskNode, agentIdOrAuto, opts)
 *   .batchDispatchDag(dagOrNodes, opts)
 *   .verifyDispatchTrail(receipts)
 *
 * Pure Layer-0 hermetic capability matching & governed task dispatch.
 * Emits cryptographically sealed BS-RCPT-* receipts via node:crypto.
 *
 * Fail-closed:
 *   Fundacion ALWAYS_DENY; uncertified capabilities → UNCERTIFIED_CAPABILITY_DENY;
 *   unattested agents → UNATTESTED_AGENT_DENY; insufficient clearance → INSUFFICIENT_CLEARANCE_DENY;
 *   unmet multi-key consensus → CONSENSUS_REQUIRED_DENY.
 *
 * NON-CLAIM:
 *   capability matcher & dispatcher port ≠ Kubernetes scheduler /
 *   ≠ distributed task queue (Celery/RabbitMQ) /
 *   ≠ PRODUCTION_READY=YES orchestrator.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR done; BS in progress; BT–BV pending);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BS_CEILING
 */

import {
  BS_PRODUCTION_READY as BS_RECEIPT_PR,
  BS_RECEIPT_KIND,
  BS_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalCapabilityMatcherSealBody,
  hashCapabilityMatcherReceipt,
  verifyCapabilityMatcherReceipt,
  buildCapabilityMatcherReceipt,
  _resetReceiptSeqForTests
} from './agent-capability-matcher-receipt.js';

import {
  BS_POLICY_GATE_KIND,
  BS_POLICY_GATE_PRODUCTION_READY,
  BS_POLICY_CODES,
  deny,
  denyFundacion,
  denyUncertifiedCapability,
  denyUnattestedAgent,
  denyInsufficientClearance,
  denyMalformedTask,
  denyMalformedAgent,
  isFundacionTarget,
  parseClearanceLevel,
  validateAgentProfile,
  validateTaskNode,
  checkCapabilityMatch,
  gateAgentCapabilityMatch,
  createAgentCapabilityMatcherPolicyGate
} from './agent-capability-matcher-policy-gate.js';

import { validateGraphTopology } from './intent-decomposition-policy-gate.js';

/** @type {'NO'} */
export const BS_PRODUCTION_READY = 'NO';

export const BS_KIND = 'eos-dynamic-agent-capability-dispatcher-port';

export const BS_CODES = Object.freeze({
  ...BS_POLICY_CODES,
  REGISTER_OK: 'REGISTER_OK',
  MATCH_OK: 'MATCH_OK',
  DISPATCH_OK: 'DISPATCH_OK',
  BATCH_DISPATCH_OK: 'BATCH_DISPATCH_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

export {
  BS_POLICY_CODES,
  BS_POLICY_GATE_KIND,
  BS_POLICY_GATE_PRODUCTION_READY,
  BS_RECEIPT_KIND,
  BS_RECEIPT_PRODUCTION_READY,
  BS_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalCapabilityMatcherSealBody,
  hashCapabilityMatcherReceipt,
  verifyCapabilityMatcherReceipt,
  buildCapabilityMatcherReceipt,
  _resetReceiptSeqForTests,
  validateAgentProfile,
  validateTaskNode,
  checkCapabilityMatch,
  gateAgentCapabilityMatch,
  isFundacionTarget,
  parseClearanceLevel
};

/**
 * Factory for Dynamic Agent Capability Matcher & Governed Dispatcher Port.
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.policyGate]
 * @param {object} [opts.attestationPort]
 * @param {object} [opts.consensusGate]
 * @param {boolean} [opts.requireAttestation]
 * @returns {object}
 */
export function createAgentCapabilityDispatcherPort(opts = {}) {
  const nowFn = typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const hashFn = typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const policyGate = opts.policyGate || createAgentCapabilityMatcherPolicyGate();
  const attestationPort = opts.attestationPort || null;
  const consensusGate = opts.consensusGate || null;
  const defaultRequireAttestation = opts.requireAttestation !== false;

  /** @type {Map<string, object>} agentId -> cleanProfile */
  const agents = new Map();
  /** @type {Array<object>} receipts issued by this port */
  const receipts = [];
  /** @type {string|null} */
  let lastReceiptHash = null;

  /**
   * Register a certified agent profile.
   * @param {object} rawProfile
   * @returns {{ ok: boolean, code: string, reason?: string, agent?: object, fundacionDelta: 0 }}
   */
  function registerAgentProfile(rawProfile) {
    const check = policyGate.validateAgentProfile(rawProfile);
    if (!check.ok) {
      return {
        ok: false,
        allow: false,
        code: check.code || BS_CODES.MALFORMED_AGENT_DENY,
        reason: check.reason || 'invalid agent profile',
        fundacionDelta: 0
      };
    }

    const clean = check.cleanProfile;
    agents.set(clean.agentId, clean);

    return {
      ok: true,
      allow: true,
      code: BS_CODES.REGISTER_OK,
      agent: clean,
      fundacionDelta: 0
    };
  }

  /**
   * Get an agent profile by agentId.
   * @param {string} agentId
   * @returns {object|null}
   */
  function getAgentProfile(agentId) {
    if (typeof agentId !== 'string') return null;
    return agents.get(agentId.trim()) || null;
  }

  /**
   * List all registered agent profiles.
   * @returns {Array<object>}
   */
  function listRegisteredAgents() {
    return Object.freeze(Array.from(agents.values()));
  }

  /**
   * Find the best matching registered agent for a task node.
   * Deterministically prioritizes highest clearance level, then lexicographical agentId.
   * @param {object} rawTask
   * @param {object} [matchOpts]
   * @returns {{ ok: boolean, code: string, reason?: string, agent?: object, candidates?: Array<object>, cleanTask?: object, fundacionDelta: 0 }}
   */
  function matchAgentForTask(rawTask, matchOpts = {}) {
    const taskCheck = policyGate.validateTaskNode(rawTask);
    if (!taskCheck.ok) {
      return {
        ok: false,
        allow: false,
        code: taskCheck.code || BS_CODES.MALFORMED_TASK_DENY,
        reason: taskCheck.reason || 'invalid task node',
        fundacionDelta: 0
      };
    }

    const cleanTask = taskCheck.cleanTask;
    const requireAttestation = matchOpts.requireAttestation ?? defaultRequireAttestation;

    const candidates = [];
    for (const agent of agents.values()) {
      if (!agent.capabilities.includes(cleanTask.requiredCapability)) {
        continue;
      }
      if (agent.clearanceLevel < cleanTask.requiredClearance) {
        continue;
      }
      if (requireAttestation && !agent.attested) {
        continue;
      }
      candidates.push(agent);
    }

    if (candidates.length === 0) {
      return {
        ok: false,
        allow: false,
        code: BS_CODES.UNCERTIFIED_CAPABILITY_DENY,
        reason: `no eligible agent registered with capability '${cleanTask.requiredCapability}' at clearance level >= ${cleanTask.requiredClearance}`,
        cleanTask,
        fundacionDelta: 0
      };
    }

    // Sort: highest clearance descending, then agentId ascending
    candidates.sort((a, b) => {
      if (b.clearanceLevel !== a.clearanceLevel) {
        return b.clearanceLevel - a.clearanceLevel;
      }
      return a.agentId.localeCompare(b.agentId);
    });

    return {
      ok: true,
      allow: true,
      code: BS_CODES.MATCH_OK,
      agent: candidates[0],
      candidates: Object.freeze(candidates),
      cleanTask,
      fundacionDelta: 0
    };
  }

  /**
   * Dispatch a task node to an agent.
   * If agentIdOrAuto is omitted or 'auto', automatically matches the best candidate.
   * Always emits a sealed BS-RCPT-* receipt.
   * @param {object} rawTask
   * @param {string|null} [agentIdOrAuto]
   * @param {object} [dispatchOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, agent?: object, task?: object, receipt: object, fundacionDelta: 0 }}
   */
  function dispatchTask(rawTask, agentIdOrAuto = 'auto', dispatchOpts = {}) {
    const timestamp = String(nowFn());
    const requireAttestation = dispatchOpts.requireAttestation ?? defaultRequireAttestation;
    const consensusSig = dispatchOpts.consensusSignature || null;

    // Validate task node first
    const taskCheck = policyGate.validateTaskNode(rawTask);
    if (!taskCheck.ok) {
      const taskId = rawTask && typeof rawTask === 'object' && rawTask.id ? String(rawTask.id) : 'TASK-UNKNOWN';
      const receipt = buildCapabilityMatcherReceipt(
        {
          taskId,
          agentId: null,
          requiredCapability: 'unknown',
          matchedCapability: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );
      receipts.push(receipt);
      lastReceiptHash = receipt.receiptHash;

      return {
        ok: false,
        allow: false,
        code: taskCheck.code || BS_CODES.MALFORMED_TASK_DENY,
        reason: taskCheck.reason || 'malformed task node',
        receipt,
        fundacionDelta: 0
      };
    }

    const cleanTask = taskCheck.cleanTask;

    // Determine target agent
    let targetAgent = null;
    const isAuto = agentIdOrAuto == null || agentIdOrAuto === 'auto';

    if (isAuto) {
      const matchRes = matchAgentForTask(cleanTask, { requireAttestation });
      if (!matchRes.ok) {
        const receipt = buildCapabilityMatcherReceipt(
          {
            taskId: cleanTask.id,
            agentId: null,
            requiredCapability: cleanTask.requiredCapability,
            matchedCapability: null,
            status: 'DENIED',
            timestamp,
            consensusSignature: consensusSig,
            prevReceiptHash: lastReceiptHash
          },
          { hash: hashFn, now: nowFn }
        );
        receipts.push(receipt);
        lastReceiptHash = receipt.receiptHash;

        return {
          ok: false,
          allow: false,
          code: matchRes.code || BS_CODES.UNCERTIFIED_CAPABILITY_DENY,
          reason: matchRes.reason,
          task: cleanTask,
          receipt,
          fundacionDelta: 0
        };
      }
      targetAgent = matchRes.agent;
    } else {
      const found = getAgentProfile(agentIdOrAuto);
      if (!found) {
        const receipt = buildCapabilityMatcherReceipt(
          {
            taskId: cleanTask.id,
            agentId: String(agentIdOrAuto),
            requiredCapability: cleanTask.requiredCapability,
            matchedCapability: null,
            status: 'DENIED',
            timestamp,
            consensusSignature: consensusSig,
            prevReceiptHash: lastReceiptHash
          },
          { hash: hashFn, now: nowFn }
        );
        receipts.push(receipt);
        lastReceiptHash = receipt.receiptHash;

        return {
          ok: false,
          allow: false,
          code: BS_CODES.UNKNOWN_AGENT_DENY,
          reason: `agent '${agentIdOrAuto}' is not registered in capability matcher`,
          task: cleanTask,
          receipt,
          fundacionDelta: 0
        };
      }
      targetAgent = found;
    }

    // Gate evaluation against the matched/selected agent
    const gateCheck = policyGate.gateAgentCapabilityMatch(cleanTask, targetAgent, {
      requireAttestation,
      consensusSignature: consensusSig
    });

    if (!gateCheck.ok) {
      const receipt = buildCapabilityMatcherReceipt(
        {
          taskId: cleanTask.id,
          agentId: targetAgent.agentId,
          requiredCapability: cleanTask.requiredCapability,
          matchedCapability: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: consensusSig,
          prevReceiptHash: lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );
      receipts.push(receipt);
      lastReceiptHash = receipt.receiptHash;

      return {
        ok: false,
        allow: false,
        code: gateCheck.code || BS_CODES.DENY,
        reason: gateCheck.reason || 'dispatch policy gate denied task assignment',
        agent: targetAgent,
        task: cleanTask,
        receipt,
        fundacionDelta: 0
      };
    }

    // Success: seal DISPATCHED receipt
    const receipt = buildCapabilityMatcherReceipt(
      {
        taskId: cleanTask.id,
        agentId: targetAgent.agentId,
        requiredCapability: cleanTask.requiredCapability,
        matchedCapability: cleanTask.requiredCapability,
        status: 'DISPATCHED',
        timestamp,
        consensusSignature: consensusSig,
        prevReceiptHash: lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );
    receipts.push(receipt);
    lastReceiptHash = receipt.receiptHash;

    return {
      ok: true,
      allow: true,
      code: BS_CODES.DISPATCH_OK,
      agent: targetAgent,
      task: cleanTask,
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Batch dispatch an entire DAG in strict topological order.
   * Accepts an array of nodes or an object with .nodes.
   * @param {Array<object>|{ nodes: Array<object> }} dagInput
   * @param {object} [batchOpts]
   * @returns {{ ok: boolean, code: string, reason?: string, count: number, receipts: Array<object>, topologicalOrder?: Array<string>, fundacionDelta: 0 }}
   */
  function batchDispatchDag(dagInput, batchOpts = {}) {
    const nodes = Array.isArray(dagInput)
      ? dagInput
      : dagInput && Array.isArray(dagInput.nodes)
        ? dagInput.nodes
        : null;

    if (!nodes || nodes.length === 0) {
      return {
        ok: false,
        code: BS_CODES.MALFORMED_TASK_DENY,
        reason: 'batch DAG dispatch requires a non-empty array of task nodes',
        count: 0,
        receipts: [],
        fundacionDelta: 0
      };
    }

    // 1. Validate graph topology & obtain Kahn's sorted topological order
    const topoCheck = validateGraphTopology(nodes);
    if (!topoCheck.valid) {
      return {
        ok: false,
        code: topoCheck.code || BS_CODES.CYCLICAL_DEPENDENCY_DENY,
        reason: topoCheck.reason,
        count: 0,
        receipts: [],
        fundacionDelta: 0
      };
    }

    const nodeMap = new Map();
    for (const node of nodes) {
      nodeMap.set(node.id.trim(), node);
    }

    const batchReceipts = [];
    const sortedOrder = topoCheck.sortedOrder;

    // 2. Dispatch each node in topological order
    for (const nodeId of sortedOrder) {
      const node = nodeMap.get(nodeId);
      const assignedAgent = node.assignedAgent || batchOpts.assignedAgent || 'auto';
      const dispatchRes = dispatchTask(node, assignedAgent, batchOpts);

      batchReceipts.push(dispatchRes.receipt);

      if (!dispatchRes.ok) {
        return {
          ok: false,
          code: dispatchRes.code,
          reason: `batch DAG dispatch halted at node '${nodeId}': ${dispatchRes.reason}`,
          failedAt: nodeId,
          count: batchReceipts.length,
          receipts: batchReceipts,
          topologicalOrder: sortedOrder,
          fundacionDelta: 0
        };
      }
    }

    return {
      ok: true,
      code: BS_CODES.BATCH_DISPATCH_OK,
      count: batchReceipts.length,
      receipts: batchReceipts,
      topologicalOrder: sortedOrder,
      fundacionDelta: 0
    };
  }

  /**
   * Verify an execution dispatch trail of receipts for cryptographic integrity.
   * @param {Array<object>} receiptsToVerify
   * @param {(payload: unknown) => string} [customHash]
   * @returns {{ ok: boolean, code: string, verifiedCount: number, error?: string }}
   */
  function verifyDispatchTrail(receiptsToVerify, customHash = hashFn) {
    if (!Array.isArray(receiptsToVerify) || receiptsToVerify.length === 0) {
      return {
        ok: false,
        code: BS_CODES.TRAIL_BREAK,
        verifiedCount: 0,
        error: 'receipts list is empty or not an array'
      };
    }

    let prevHash = null;
    let verifiedCount = 0;

    for (let i = 0; i < receiptsToVerify.length; i++) {
      const r = receiptsToVerify[i];
      const check = verifyCapabilityMatcherReceipt(r, customHash);
      if (!check.ok) {
        return {
          ok: false,
          code: BS_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `receipt at index ${i} failed hash check: ${check.reason}`
        };
      }

      if (i > 0 && r.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          code: BS_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `chain break at index ${i}: prevReceiptHash '${r.prevReceiptHash}' does not match previous receiptHash '${prevHash}'`
        };
      }

      prevHash = r.receiptHash;
      verifiedCount++;
    }

    return {
      ok: true,
      code: BS_CODES.TRAIL_OK,
      verifiedCount
    };
  }

  /**
   * Reset internal state (for testing).
   */
  function _resetForTests() {
    agents.clear();
    receipts.length = 0;
    lastReceiptHash = null;
    _resetReceiptSeqForTests();
  }

  return Object.freeze({
    kind: BS_KIND,
    productionReady: BS_PRODUCTION_READY,
    registerAgentProfile,
    getAgentProfile,
    listRegisteredAgents,
    matchAgentForTask,
    dispatchTask,
    batchDispatchDag,
    verifyDispatchTrail,
    _resetForTests
  });
}
