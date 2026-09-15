/**
 * @module agent-capability-matcher-policy-gate
 * SPEC-0076 / Mission BS — Fail-closed Policy Gate for Dynamic Agent
 * Capability Matcher & Governed Dispatcher Port.
 *
 * Enforces strict fail-closed governance:
 * - UNCERTIFIED_CAPABILITY_DENY: agent does not possess required capability profile
 * - UNATTESTED_AGENT_DENY: agent identity has not been attested via Mission BM
 * - INSUFFICIENT_CLEARANCE_DENY: agent clearance level is lower than task requirement
 * - FUNDACION_ALWAYS_DENY: task targets forbidden external directory
 * - MALFORMED_TASK_DENY: task node missing required identifier or capability
 * - MALFORMED_AGENT_DENY: agent profile missing identifier or capability array
 * - CONSENSUS_REQUIRED_DENY: task requires multi-key escalation but consensus signature missing
 *
 * NON-CLAIM:
 *   policy gate ≠ Kubernetes scheduler /
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
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BS_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BS_POLICY_GATE_KIND = 'eos-agent-capability-matcher-policy-gate';

export const BS_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  MATCHED_OK: 'MATCHED_OK',
  DISPATCHED_OK: 'DISPATCHED_OK',
  UNCERTIFIED_CAPABILITY_DENY: 'UNCERTIFIED_CAPABILITY_DENY',
  UNATTESTED_AGENT_DENY: 'UNATTESTED_AGENT_DENY',
  INSUFFICIENT_CLEARANCE_DENY: 'INSUFFICIENT_CLEARANCE_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  MALFORMED_TASK_DENY: 'MALFORMED_TASK_DENY',
  MALFORMED_AGENT_DENY: 'MALFORMED_AGENT_DENY',
  UNKNOWN_AGENT_DENY: 'UNKNOWN_AGENT_DENY',
  CONSENSUS_REQUIRED_DENY: 'CONSENSUS_REQUIRED_DENY',
  CYCLICAL_DEPENDENCY_DENY: 'CYCLICAL_DEPENDENCY_DENY',
  MISSING_PREREQUISITE_DENY: 'MISSING_PREREQUISITE_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

/**
 * Construct a standardized deny decision.
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
    code: code || BS_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BS_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyUncertifiedCapability(requiredCapability, extra = {}) {
  return deny(
    BS_POLICY_CODES.UNCERTIFIED_CAPABILITY_DENY,
    `no eligible agent possesses required capability: ${requiredCapability}`,
    { requiredCapability, ...extra }
  );
}

export function denyUnattestedAgent(agentId, extra = {}) {
  return deny(
    BS_POLICY_CODES.UNATTESTED_AGENT_DENY,
    `agent '${agentId}' is not attested under Mission BM custody`,
    { agentId, ...extra }
  );
}

export function denyInsufficientClearance(agentId, requiredLevel, agentLevel, extra = {}) {
  return deny(
    BS_POLICY_CODES.INSUFFICIENT_CLEARANCE_DENY,
    `agent '${agentId}' clearance level ${agentLevel} is lower than required level ${requiredLevel}`,
    { agentId, requiredLevel, agentLevel, ...extra }
  );
}

export function denyMalformedTask(reason = 'malformed task node payload', extra = {}) {
  return deny(BS_POLICY_CODES.MALFORMED_TASK_DENY, reason, extra);
}

export function denyMalformedAgent(reason = 'malformed agent profile payload', extra = {}) {
  return deny(BS_POLICY_CODES.MALFORMED_AGENT_DENY, reason, extra);
}

/**
 * Check if target path or description references forbidden external target (Fundacion).
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
 * Normalize clearance level to an integer >= 1.
 * Supports numbers, or strings like 'LEVEL_2', 'L3', etc.
 * @param {unknown} val
 * @returns {number}
 */
export function parseClearanceLevel(val) {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.max(1, Math.floor(val));
  }
  if (typeof val === 'string') {
    const match = val.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (Number.isFinite(parsed)) return Math.max(1, parsed);
    }
  }
  return 1;
}

/**
 * Validate an agent profile.
 * @param {unknown} profile
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanProfile?: object }}
 */
export function validateAgentProfile(profile) {
  if (profile == null || typeof profile !== 'object') {
    return denyMalformedAgent('agent profile must be a non-null object');
  }

  const agentId = typeof profile.agentId === 'string' ? profile.agentId.trim() : '';
  if (!agentId) {
    return denyMalformedAgent('agentId must be a non-empty string');
  }

  if (!Array.isArray(profile.capabilities) || profile.capabilities.length === 0) {
    return denyMalformedAgent(`agent '${agentId}' must declare at least one capability in capabilities array`);
  }

  const cleanCaps = [];
  for (const cap of profile.capabilities) {
    if (typeof cap !== 'string' || cap.trim() === '') {
      return denyMalformedAgent(`agent '${agentId}' contains invalid non-string or empty capability`);
    }
    cleanCaps.push(cap.trim().toLowerCase());
  }

  const clearanceLevel = parseClearanceLevel(profile.clearanceLevel);
  const role = typeof profile.role === 'string' && profile.role.trim() !== ''
    ? profile.role.trim()
    : 'worker';

  return {
    ok: true,
    cleanProfile: {
      agentId,
      capabilities: Object.freeze(cleanCaps),
      clearanceLevel,
      role,
      attested: profile.attested === true
    }
  };
}

/**
 * Validate a task node.
 * @param {unknown} task
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanTask?: object }}
 */
export function validateTaskNode(task) {
  if (task == null || typeof task !== 'object') {
    return denyMalformedTask('task node must be a non-null object');
  }

  const id = typeof task.id === 'string' ? task.id.trim() : '';
  if (!id) {
    return denyMalformedTask('task node must possess a non-empty id');
  }

  const rawCap = typeof task.requiredCapability === 'string'
    ? task.requiredCapability
    : typeof task.capability === 'string'
      ? task.capability
      : '';
  const requiredCapability = rawCap.trim().toLowerCase();

  if (!requiredCapability) {
    return denyMalformedTask(`task '${id}' must specify requiredCapability or capability`);
  }

  // Check Fundacion target in id, target, targetPath, or description
  if (isFundacionTarget(id)) {
    return denyFundacion(`task id '${id}' references forbidden Fundacion path`);
  }
  if (isFundacionTarget(task.target)) {
    return denyFundacion(`task target '${task.target}' references forbidden Fundacion path`);
  }
  if (isFundacionTarget(task.targetPath)) {
    return denyFundacion(`task targetPath '${task.targetPath}' references forbidden Fundacion path`);
  }
  if (isFundacionTarget(task.description)) {
    return denyFundacion(`task description references forbidden Fundacion directory`);
  }

  const requiredClearance = parseClearanceLevel(
    task.requiredClearance ?? task.clearanceLevel ?? task.clearance
  );
  const requiresConsensus = task.requiresConsensus === true;

  return {
    ok: true,
    cleanTask: {
      id,
      requiredCapability,
      requiredClearance,
      requiresConsensus,
      dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : [],
      description: typeof task.description === 'string' ? task.description.trim() : ''
    }
  };
}

/**
 * Check whether an agent profile satisfies a task node's capability and clearance requirements.
 * @param {object} cleanTask
 * @param {object} cleanAgent
 * @param {object} [opts]
 * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string }}
 */
export function checkCapabilityMatch(cleanTask, cleanAgent, opts = {}) {
  const hasCap = cleanAgent.capabilities.includes(cleanTask.requiredCapability);
  if (!hasCap) {
    return denyUncertifiedCapability(cleanTask.requiredCapability, {
      agentId: cleanAgent.agentId
    });
  }

  if (cleanAgent.clearanceLevel < cleanTask.requiredClearance) {
    return denyInsufficientClearance(
      cleanAgent.agentId,
      cleanTask.requiredClearance,
      cleanAgent.clearanceLevel
    );
  }

  // If strict attestation required by opts or default
  const requireAttestation = opts.requireAttestation !== false;
  if (requireAttestation && !cleanAgent.attested) {
    return denyUnattestedAgent(cleanAgent.agentId);
  }

  if (cleanTask.requiresConsensus && !opts.consensusSignature) {
    return deny(
      BS_POLICY_CODES.CONSENSUS_REQUIRED_DENY,
      `task '${cleanTask.id}' requires multi-key consensus escalation signature`
    );
  }

  return {
    ok: true,
    allow: true,
    code: BS_POLICY_CODES.MATCHED_OK,
    fundacionDelta: 0
  };
}

/**
 * Gate capability match evaluation.
 * @param {unknown} taskNode
 * @param {unknown} agentProfile
 * @param {object} [opts]
 * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, cleanTask?: object, cleanProfile?: object }}
 */
export function gateAgentCapabilityMatch(taskNode, agentProfile, opts = {}) {
  const taskCheck = validateTaskNode(taskNode);
  if (!taskCheck.ok) {
    return taskCheck;
  }

  const agentCheck = validateAgentProfile(agentProfile);
  if (!agentCheck.ok) {
    return agentCheck;
  }

  const matchCheck = checkCapabilityMatch(taskCheck.cleanTask, agentCheck.cleanProfile, opts);
  if (!matchCheck.ok) {
    return {
      ...matchCheck,
      cleanTask: taskCheck.cleanTask,
      cleanProfile: agentCheck.cleanProfile
    };
  }

  return {
    ok: true,
    allow: true,
    code: BS_POLICY_CODES.MATCHED_OK,
    cleanTask: taskCheck.cleanTask,
    cleanProfile: agentCheck.cleanProfile,
    fundacionDelta: 0
  };
}

/**
 * Factory for policy gate instance.
 * @param {object} [opts]
 * @returns {object}
 */
export function createAgentCapabilityMatcherPolicyGate(opts = {}) {
  return Object.freeze({
    kind: BS_POLICY_GATE_KIND,
    productionReady: BS_POLICY_GATE_PRODUCTION_READY,
    gateAgentCapabilityMatch: (taskNode, agentProfile, overrideOpts) =>
      gateAgentCapabilityMatch(taskNode, agentProfile, { ...opts, ...overrideOpts }),
    validateAgentProfile,
    validateTaskNode,
    checkCapabilityMatch,
    isFundacionTarget,
    parseClearanceLevel
  });
}
