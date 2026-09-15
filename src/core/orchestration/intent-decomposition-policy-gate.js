/**
 * @module intent-decomposition-policy-gate
 * SPEC-0075 / Mission BR — Fail-closed Policy Gate for Sovereign Intent Parser
 * & Atomic Task DAG Decomposer Port.
 *
 * Enforces strict fail-closed governance:
 * - AMBIGUOUS_INTENT_DENY: blank, malformed, or unbounded intent input
 * - CYCLICAL_DEPENDENCY_DENY: cycle detected in task graph topology (Kahn's algorithm)
 * - MISSING_PREREQUISITE_DENY: task node references unresolvable dependency
 * - DUPLICATE_NODE_ID_DENY: duplicate node ID in DAG definition
 * - FUNDACION_ALWAYS_DENY: targets Documents/Fundacion without Level 2 authorization
 * - MALFORMED_PAYLOAD: malformed input structure
 *
 * NON-CLAIM:
 *   policy gate ≠ general AGI planner /
 *   ≠ unconstrained autonomous reasoning /
 *   ≠ PRODUCTION_READY=YES workflow engine.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BR_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BR_POLICY_GATE_KIND = 'eos-intent-decomposition-policy-gate';

export const BR_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  DECOMPOSED_OK: 'DECOMPOSED_OK',
  VALIDATED_OK: 'VALIDATED_OK',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  AMBIGUOUS_INTENT_DENY: 'AMBIGUOUS_INTENT_DENY',
  CYCLICAL_DEPENDENCY_DENY: 'CYCLICAL_DEPENDENCY_DENY',
  MISSING_PREREQUISITE_DENY: 'MISSING_PREREQUISITE_DENY',
  DUPLICATE_NODE_ID_DENY: 'DUPLICATE_NODE_ID_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  SCOPE_LIMIT_EXCEEDED: 'SCOPE_LIMIT_EXCEEDED',
  POLICY_DENY: 'POLICY_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string, fundacionDelta: 0 }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BR_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyMalformed(reason = 'malformed intent decomposition payload', extra = {}) {
  return deny(BR_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BR_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyAmbiguous(reason = 'ambiguous or empty intent input', extra = {}) {
  return deny(BR_POLICY_CODES.AMBIGUOUS_INTENT_DENY, reason, extra);
}

export function denyCyclical(cycleDetails = 'circular dependency detected in task DAG', extra = {}) {
  return deny(BR_POLICY_CODES.CYCLICAL_DEPENDENCY_DENY, cycleDetails, extra);
}

export function denyMissingPrerequisite(missingId, extra = {}) {
  return deny(
    BR_POLICY_CODES.MISSING_PREREQUISITE_DENY,
    `missing prerequisite dependency: ${missingId}`,
    { missingPrerequisite: missingId, ...extra }
  );
}

export function denyDuplicateNode(duplicateId, extra = {}) {
  return deny(
    BR_POLICY_CODES.DUPLICATE_NODE_ID_DENY,
    `duplicate task node ID detected: ${duplicateId}`,
    { duplicateNodeId: duplicateId, ...extra }
  );
}

/**
 * Check if target path references forbidden external target (Fundacion).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * Validate raw intent input string or payload.
 * @param {unknown} rawIntent
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanIntent?: string }}
 */
export function validateIntentPayload(rawIntent) {
  if (rawIntent == null) {
    return denyAmbiguous('intent cannot be null or undefined');
  }

  let text = '';
  let declaredTargets = [];

  if (typeof rawIntent === 'string') {
    text = rawIntent.trim();
  } else if (typeof rawIntent === 'object') {
    if (typeof rawIntent.goal === 'string') {
      text = rawIntent.goal.trim();
    } else if (typeof rawIntent.intent === 'string') {
      text = rawIntent.intent.trim();
    } else if (typeof rawIntent.text === 'string') {
      text = rawIntent.text.trim();
    }
    if (Array.isArray(rawIntent.targets)) {
      declaredTargets = rawIntent.targets;
    }
    if (rawIntent.targetPath) {
      declaredTargets.push(rawIntent.targetPath);
    }
  }

  if (text.length === 0) {
    return denyAmbiguous('intent must contain a non-empty goal description');
  }

  if (text.length > 4000) {
    return deny(
      BR_POLICY_CODES.SCOPE_LIMIT_EXCEEDED,
      'intent length exceeds maximum allowed bound of 4000 characters'
    );
  }

  // Check for forbidden Fundacion target in text or declared targets
  if (isFundacionTarget(text)) {
    return denyFundacion('intent goal references forbidden Fundacion directory');
  }
  for (const t of declaredTargets) {
    if (isFundacionTarget(t)) {
      return denyFundacion(`target path '${t}' violates Fundacion write barrier`);
    }
  }

  return { ok: true, cleanIntent: text };
}

/**
 * Topological Sort & Cycle Detection (Kahn's Algorithm).
 * Validates that nodes form a strictly acyclic directed graph.
 * @param {Array<{ id: string, dependsOn?: string[] }>} nodes
 * @returns {{ valid: boolean, sortedOrder?: string[], code?: string, reason?: string, cycleNodes?: string[] }}
 */
export function validateGraphTopology(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return {
      valid: false,
      code: BR_POLICY_CODES.MALFORMED_PAYLOAD,
      reason: 'task graph must contain at least one node'
    };
  }

  /** @type {Map<string, Set<string>>} node -> set of nodes that depend on it (outgoing edges) */
  const adj = new Map();
  /** @type {Map<string, number>} node -> in-degree (count of dependencies it waits on) */
  const inDegree = new Map();
  /** @type {Set<string>} all declared node IDs */
  const declaredIds = new Set();

  // Phase 1: verify uniqueness and register nodes
  for (const node of nodes) {
    if (node == null || typeof node !== 'object' || typeof node.id !== 'string') {
      return {
        valid: false,
        code: BR_POLICY_CODES.MALFORMED_PAYLOAD,
        reason: 'every task node must be an object with a string id'
      };
    }
    const id = node.id.trim();
    if (id === '') {
      return {
        valid: false,
        code: BR_POLICY_CODES.MALFORMED_PAYLOAD,
        reason: 'task node id cannot be empty'
      };
    }
    if (declaredIds.has(id)) {
      return {
        valid: false,
        code: BR_POLICY_CODES.DUPLICATE_NODE_ID_DENY,
        reason: `duplicate task node ID detected: ${id}`
      };
    }
    declaredIds.add(id);
    adj.set(id, new Set());
    inDegree.set(id, 0);
  }

  // Phase 2: build dependency graph & verify all prerequisites exist
  for (const node of nodes) {
    const id = node.id.trim();
    const deps = Array.isArray(node.dependsOn) ? node.dependsOn : [];

    for (const dep of deps) {
      if (typeof dep !== 'string') continue;
      const depId = dep.trim();
      if (!declaredIds.has(depId)) {
        return {
          valid: false,
          code: BR_POLICY_CODES.MISSING_PREREQUISITE_DENY,
          reason: `node '${id}' references non-existent prerequisite '${depId}'`
        };
      }
      // Self-dependency is an immediate cycle
      if (depId === id) {
        return {
          valid: false,
          code: BR_POLICY_CODES.CYCLICAL_DEPENDENCY_DENY,
          reason: `self-dependency detected on node '${id}'`
        };
      }
      // Edge from depId -> id (depId must finish before id can execute)
      adj.get(depId).add(id);
      inDegree.set(id, inDegree.get(id) + 1);
    }
  }

  // Phase 3: Kahn's algorithm
  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const sortedOrder = [];
  while (queue.length > 0) {
    const curr = queue.shift();
    sortedOrder.push(curr);

    for (const neighbor of adj.get(curr)) {
      const newDeg = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sortedOrder.length !== nodes.length) {
    const cycleNodes = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg > 0) cycleNodes.push(id);
    }
    return {
      valid: false,
      code: BR_POLICY_CODES.CYCLICAL_DEPENDENCY_DENY,
      reason: `circular dependency detected involving nodes: ${cycleNodes.join(', ')}`,
      cycleNodes
    };
  }

  return {
    valid: true,
    sortedOrder
  };
}

/**
 * Gate intent decomposition request.
 * @param {unknown} rawIntent
 * @param {object} [opts]
 * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, cleanIntent?: string }}
 */
export function gateIntentDecomposition(rawIntent, opts = {}) {
  const check = validateIntentPayload(rawIntent);
  if (!check.ok) {
    return {
      ok: false,
      allow: false,
      code: check.code || BR_POLICY_CODES.DENY,
      reason: check.reason,
      fundacionDelta: 0
    };
  }

  return {
    ok: true,
    allow: true,
    code: BR_POLICY_CODES.OK,
    cleanIntent: check.cleanIntent,
    fundacionDelta: 0
  };
}

/**
 * Factory for policy gate instance.
 * @param {object} [opts]
 * @returns {object}
 */
export function createIntentDecompositionPolicyGate(opts = {}) {
  return Object.freeze({
    kind: BR_POLICY_GATE_KIND,
    productionReady: BR_POLICY_GATE_PRODUCTION_READY,
    gateIntentDecomposition: (rawIntent) => gateIntentDecomposition(rawIntent, opts),
    validateIntentPayload,
    validateGraphTopology,
    isFundacionTarget
  });
}
