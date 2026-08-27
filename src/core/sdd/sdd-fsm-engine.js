/**
 * @module SddFsmEngine
 * @description EOS SDD Orchestration Finite State Machine & Transition Enforcer.
 * Pure deterministic, fail-closed evaluation of state transitions, authority gates,
 * evidence standards, protected surfaces, and budget accounting.
 */

import { createHash } from 'node:crypto';

export const SDD_STATES = Object.freeze({
  VISION_INTAKE: 'VISION_INTAKE',
  MISSION_FORMULATION: 'MISSION_FORMULATION',
  HUMAN_DIRECTION_GATE: 'HUMAN_DIRECTION_GATE',
  DISCOVER: 'DISCOVER',
  DEFINE: 'DEFINE',
  PLAN: 'PLAN',
  DELEGATE: 'DELEGATE',
  SUPERVISE: 'SUPERVISE',
  VERIFY: 'VERIFY',
  REVIEW: 'REVIEW',
  HUMAN_RELEASE_GATE: 'HUMAN_RELEASE_GATE',
  OPERATE_AND_LEARN: 'OPERATE_AND_LEARN',
  PAUSED: 'PAUSED',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
});

export const AUTHORITY_RANKS = Object.freeze({
  LEVEL_0: 0,
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4
});

export const CANONICAL_TRANSITIONS = [
  {
    from: SDD_STATES.VISION_INTAKE,
    event: 'mission.formulate',
    to: SDD_STATES.MISSION_FORMULATION,
    minAuthority: 'LEVEL_0',
    requiredArtifacts: ['vision']
  },
  {
    from: SDD_STATES.MISSION_FORMULATION,
    event: 'mission.propose_direction',
    to: SDD_STATES.HUMAN_DIRECTION_GATE,
    minAuthority: 'LEVEL_0',
    requiredArtifacts: ['mission_package', 'contract']
  },
  {
    from: SDD_STATES.HUMAN_DIRECTION_GATE,
    event: 'human.approve_direction',
    to: SDD_STATES.DISCOVER,
    minAuthority: 'LEVEL_0',
    requiresHitlReceipt: true,
    requiredGate: 'HUMAN_DIRECTION_GATE'
  },
  {
    from: SDD_STATES.DISCOVER,
    event: 'discovery.complete',
    to: SDD_STATES.DEFINE,
    minAuthority: 'LEVEL_0',
    requiredArtifacts: ['repository_inventory']
  },
  {
    from: SDD_STATES.DEFINE,
    event: 'definition.complete',
    to: SDD_STATES.PLAN,
    minAuthority: 'LEVEL_0',
    requiredArtifacts: ['technical_spec', 'acceptance_criteria']
  },
  {
    from: SDD_STATES.PLAN,
    event: 'plan.approve',
    to: SDD_STATES.DELEGATE,
    minAuthority: 'LEVEL_0',
    requiredArtifacts: ['implementation_plan', 'task_graph']
  },
  {
    from: SDD_STATES.DELEGATE,
    event: 'task.assign',
    to: SDD_STATES.SUPERVISE,
    minAuthority: 'LEVEL_0',
    requiresTaskContract: true
  },
  {
    from: SDD_STATES.SUPERVISE,
    event: 'task.complete',
    to: SDD_STATES.VERIFY,
    minAuthority: 'LEVEL_1',
    requiresOutputs: true
  },
  {
    from: SDD_STATES.SUPERVISE,
    event: 'task.blocked',
    to: SDD_STATES.BLOCKED,
    minAuthority: 'LEVEL_0'
  },
  {
    from: SDD_STATES.VERIFY,
    event: 'verification.complete',
    to: SDD_STATES.REVIEW,
    minAuthority: 'LEVEL_0',
    requiresVerifiedEvidence: true
  },
  {
    from: SDD_STATES.REVIEW,
    event: 'review.accept',
    to: SDD_STATES.HUMAN_RELEASE_GATE,
    minAuthority: 'LEVEL_0',
    requiresIndependentReview: true
  },
  {
    from: SDD_STATES.REVIEW,
    event: 'review.reject',
    to: SDD_STATES.PLAN,
    minAuthority: 'LEVEL_0',
    requiresRemediation: true
  },
  {
    from: SDD_STATES.HUMAN_RELEASE_GATE,
    event: 'human.approve_release',
    to: SDD_STATES.OPERATE_AND_LEARN,
    minAuthority: 'LEVEL_0',
    requiresHitlReceipt: true,
    requiredGate: 'HUMAN_RELEASE_GATE'
  },
  {
    from: SDD_STATES.HUMAN_RELEASE_GATE,
    event: 'human.reject_release',
    to: SDD_STATES.PAUSED,
    minAuthority: 'LEVEL_0'
  },
  {
    from: SDD_STATES.OPERATE_AND_LEARN,
    event: 'mission.close',
    to: SDD_STATES.COMPLETED,
    minAuthority: 'LEVEL_0'
  },
  /**
   * DEPRECATED bridge (compat only): historical VISION_INTAKE → PLAN collapse.
   * MissionRuntime.planMission MUST use the gated lifecycle above.
   * Retained so older tests/tools fail closed through the same sole writer.
   */
  {
    from: SDD_STATES.VISION_INTAKE,
    event: 'runtime.plan_mission',
    to: SDD_STATES.PLAN,
    minAuthority: 'LEVEL_0',
    requiredArtifacts: ['direction', 'project_profile'],
    deprecated: true
  }
];

export class TransitionEnforcer {
  constructor(options = {}) {
    this.processedEvents = new Set(options.processedEvents || []);
    this.ledger = options.ledger || [];
  }

  calculateHash(data) {
    return createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
  }

  createError(code, field, expected, observed, nextAction, missionId) {
    const err = {
      schema_version: '1.0.0',
      error_id: `ERR-${this.calculateHash(Date.now() + code + field).substring(0, 12).toUpperCase()}`,
      code,
      field,
      expected: String(expected),
      observed: String(observed),
      next_action: nextAction,
      mission_id: missionId || 'UNKNOWN',
      timestamp: new Date().toISOString()
    };
    const error = new Error(`TRANSITION_DENIED [${code}]: ${field} expected ${expected} but observed ${observed}`);
    error.diagnostic = err;
    return error;
  }

  evaluateTransition(snapshot, event, context = {}) {
    // 1. Validate Event Envelope
    if (!event || typeof event !== 'object') {
      throw this.createError('SCHEMA_VALIDATION_FAILED', 'event', 'object', typeof event, 'Provide valid event envelope', snapshot?.mission_id);
    }
    if (!event.event_id || !event.mission_id || !event.from_state || !event.to_state || !event.event_type) {
      throw this.createError('SCHEMA_VALIDATION_FAILED', 'event.required_fields', 'event_id, mission_id, from_state, to_state, event_type', 'Missing fields', 'Provide all required fields in event envelope', event.mission_id || snapshot?.mission_id);
    }

    // 2. Idempotency & Replay Protection (Checked early to prevent duplicate processing)
    if (this.processedEvents.has(event.event_id) || (event.idempotency_key && this.processedEvents.has(event.idempotency_key))) {
      throw this.createError('REPLAY_DETECTED', 'event.event_id', 'Unique unprocessed event', 'Already processed', 'Do not replay non-idempotent transition events', event.mission_id);
    }

    // 3. Load Snapshot & State Match
    if (!snapshot || !snapshot.state) {
      throw this.createError('INVALID_STATE_TRANSITION', 'snapshot.state', 'Non-null active state', 'null or undefined', 'Initialize mission snapshot', event.mission_id);
    }
    if (snapshot.state !== event.from_state) {
      throw this.createError('INVALID_STATE_TRANSITION', 'event.from_state', snapshot.state, event.from_state, `Transition must start from active state ${snapshot.state}`, event.mission_id);
    }

    // Handle universal control events (pause, cancel, resume)
    if (event.event_type === 'mission.cancel') {
      return this._applyControlTransition(snapshot, event, SDD_STATES.CANCELLED, 'Mission cancelled via kill switch');
    }
    if (event.event_type === 'mission.pause') {
      return this._applyControlTransition(snapshot, event, SDD_STATES.PAUSED, 'Mission paused and checkpointed');
    }
    if (event.event_type === 'mission.resume') {
      if (snapshot.state !== SDD_STATES.PAUSED) {
        throw this.createError('INVALID_STATE_TRANSITION', 'snapshot.state', SDD_STATES.PAUSED, snapshot.state, 'Resume event is only valid when mission is in PAUSED state', event.mission_id);
      }
      const targetState = snapshot.previous_state || SDD_STATES.VISION_INTAKE;
      return this._applyControlTransition(snapshot, event, targetState, 'Mission resumed from checkpoint');
    }
    if (event.event_type === 'mission.complete') {
      // COMPLETED is an evidence-bearing claim, so it is reachable only from the canonical
      // post-verification state. Abandoning earlier must use mission.cancel (-> CANCELLED),
      // which does not assert that the work was verified.
      if (snapshot.state !== SDD_STATES.OPERATE_AND_LEARN) {
        throw this.createError(
          'PREMATURE_COMPLETION',
          'snapshot.state',
          SDD_STATES.OPERATE_AND_LEARN,
          snapshot.state,
          'Traverse VERIFY/REVIEW/HUMAN_RELEASE_GATE before completing, or use mission.cancel to abandon',
          event.mission_id
        );
      }
      return this._applyControlTransition(snapshot, event, SDD_STATES.COMPLETED, 'Mission closed via commitTransition');
    }

    // 4. Resolve Canonical Transition Entry
    const rule = CANONICAL_TRANSITIONS.find(t => t.from === event.from_state && t.event === event.event_type && t.to === event.to_state);
    if (!rule) {
      throw this.createError('INVALID_STATE_TRANSITION', 'transition_table', `Valid transition from ${event.from_state} via ${event.event_type} to ${event.to_state}`, 'No matching transition rule', 'Check canonical transition table and adhere to lifecycle order', event.mission_id);
    }

    // 5. Authority & Monotonicity Check
    const requiredRank = AUTHORITY_RANKS[rule.minAuthority] ?? 0;
    const actorRank = AUTHORITY_RANKS[event.authority_level] ?? 0;
    if (actorRank < requiredRank) {
      throw this.createError('INSUFFICIENT_AUTHORITY', 'event.authority_level', rule.minAuthority, event.authority_level, `Grant required authority ${rule.minAuthority} to perform transition`, event.mission_id);
    }

    // 6. HITL Receipt & Expiration Validation
    if (rule.requiresHitlReceipt) {
      const receipt = context.hitlReceipt || event.receipt;
      if (!receipt) {
        throw this.createError('GATE_SKIPPED', 'receipt', 'Valid HITL receipt', 'Missing receipt', 'Obtain explicit Human Director approval receipt', event.mission_id);
      }
      if (receipt.decision !== 'approve' && receipt.decision !== 'approve_with_conditions') {
        throw this.createError('GATE_SKIPPED', 'receipt.decision', 'approve or approve_with_conditions', receipt.decision, 'Human Director must approve the gate', event.mission_id);
      }
      if (receipt.gate_id && rule.requiredGate && !receipt.gate_id.includes(rule.requiredGate.replace(/_/g, '-')) && receipt.gate_id !== rule.requiredGate) {
        throw this.createError('GATE_SKIPPED', 'receipt.gate_id', rule.requiredGate, receipt.gate_id, 'Receipt must match the target gate', event.mission_id);
      }
      if (receipt.expires_at) {
        const expiry = new Date(receipt.expires_at).getTime();
        const now = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
        if (expiry <= now) {
          throw this.createError('EXPIRED_HITL_RECEIPT', 'receipt.expires_at', `> ${new Date(now).toISOString()}`, receipt.expires_at, 'Request renewed HITL receipt from Human Director', event.mission_id);
        }
      }
    }

    // 7. Required Artifacts Validation
    if (rule.requiredArtifacts) {
      const artifacts = context.artifacts || event.artifacts || [];
      for (const req of rule.requiredArtifacts) {
        const found = artifacts.find(a => a.kind === req || a.id?.includes(req) || a.uri?.includes(req));
        if (!found) {
          throw this.createError('MISSING_REQUIRED_ARTIFACT', 'artifacts', `Artifact of kind '${req}'`, 'Artifact not found', `Generate required artifact '${req}' before transitioning`, event.mission_id);
        }
        if (found.sha256 && !/^[a-f0-9]{64}$/.test(found.sha256)) {
          throw this.createError('SCHEMA_VALIDATION_FAILED', `artifact.${found.id}.sha256`, 'Valid 64-character hex SHA-256', found.sha256, 'Provide valid content hash for artifact', event.mission_id);
        }
      }
    }

    // 7b. Task Contract Declaration (delegation must carry an executable contract)
    if (rule.requiresTaskContract) {
      const tc = context.taskContract || event.task_contract || null;
      if (!tc || !tc.task_id) {
        throw this.createError('MISSING_TASK_CONTRACT', 'taskContract', 'Task contract with task_id', tc ? 'Contract without task_id' : 'No contract supplied', 'Attach the task contract being delegated before assigning work', event.mission_id);
      }
      if (!Array.isArray(tc.allowed_tools) || tc.allowed_tools.length === 0) {
        throw this.createError('MISSING_TASK_CONTRACT', 'taskContract.allowed_tools', 'Explicit non-empty allowed_tools', String(tc.allowed_tools), 'Declare the tools the agent may use; empty means deny-all', event.mission_id);
      }
    }

    // 7c. Produced Outputs (task completion must present the artifacts it claims)
    if (rule.requiresOutputs) {
      const outputs = context.outputs || event.outputs || [];
      if (!Array.isArray(outputs) || outputs.length === 0) {
        throw this.createError('MISSING_REQUIRED_OUTPUTS', 'outputs', 'At least 1 produced output', 'No outputs presented', 'Submit the produced artifacts before marking the task complete', event.mission_id);
      }
    }

    // 7d. Remediation Record (rejecting a review must say what must change)
    if (rule.requiresRemediation) {
      const remediation = context.remediation || event.remediation || null;
      if (!remediation || !(remediation.reason || remediation.findings)) {
        throw this.createError('MISSING_REMEDIATION_RECORD', 'remediation', 'Remediation reason or findings', 'Not provided', 'State what must be remediated before sending the mission back to PLAN', event.mission_id);
      }
    }

    // 8. Epistemic Evidence Validation
    if (rule.requiresVerifiedEvidence) {
      const evidenceList = event.evidence_refs || context.evidence_refs || [];
      if (evidenceList.length === 0) {
        throw this.createError('INVALID_EVIDENCE_STATUS', 'evidence_refs', 'At least 1 verified evidence record', 'Empty evidence list', 'Execute test suite and provide evidence receipts', event.mission_id);
      }
      for (const ev of evidenceList) {
        if (ev.status === 'SIMULATION_ONLY') {
          throw this.createError('INVALID_EVIDENCE_STATUS', `evidence.${ev.id}.status`, 'VERIFIED', 'SIMULATION_ONLY', 'Simulation-only outputs cannot satisfy real verification gates', event.mission_id);
        }
        if (ev.status !== 'VERIFIED') {
          throw this.createError('INVALID_EVIDENCE_STATUS', `evidence.${ev.id}.status`, 'VERIFIED', ev.status, 'Ensure all required verification checks pass cleanly', event.mission_id);
        }
      }
    }

    // 9. Independent Review & Self-Approval Prevention
    if (rule.requiresIndependentReview) {
      const reviewer = event.actor?.identity || context.reviewer?.identity;
      const implementer = snapshot.active_implementer || context.implementer?.identity;
      if (reviewer && implementer && reviewer === implementer) {
        throw this.createError('SELF_APPROVAL_VIOLATION', 'actor.identity', `Independent reviewer (not ${implementer})`, reviewer, 'Assign independent reviewer role to inspect changes', event.mission_id);
      }
    }

    // 10. Protected Surfaces & Tool Declarations
    if (context.taskContract) {
      const tc = context.taskContract;
      if (tc.allowed_write_roots && tc.protected_surfaces) {
        for (const root of tc.allowed_write_roots) {
          if (tc.protected_surfaces.some(ps => root.startsWith(ps) || ps.startsWith(root))) {
            throw this.createError('PROTECTED_SURFACE_VIOLATION', 'taskContract.allowed_write_roots', `Non-protected surface`, root, 'Remove protected surface paths from task write roots', event.mission_id);
          }
        }
      }
      if (context.toolCall && tc.allowed_tools && !tc.allowed_tools.includes(context.toolCall)) {
        throw this.createError('UNDECLARED_TOOL_ACCESS', 'toolCall', `One of [${tc.allowed_tools.join(', ')}]`, context.toolCall, 'Request tool access in task contract before invoking', event.mission_id);
      }
    }

    // 11. Budget Accounting
    if (event.budget_snapshot && snapshot.budget_limits) {
      const maxTokens = (snapshot.budget_limits.max_input_tokens || 0) + (snapshot.budget_limits.max_output_tokens || 0);
      if (maxTokens > 0 && event.budget_snapshot.tokens_consumed > maxTokens) {
        throw this.createError('BUDGET_EXHAUSTED', 'budget_snapshot.tokens_consumed', `<= ${maxTokens}`, event.budget_snapshot.tokens_consumed, 'Pause mission and request budget increase from Human Director', event.mission_id);
      }
      if (snapshot.budget_limits.max_duration_seconds > 0 && event.budget_snapshot.duration_seconds > snapshot.budget_limits.max_duration_seconds) {
        throw this.createError('BUDGET_EXHAUSTED', 'budget_snapshot.duration_seconds', `<= ${snapshot.budget_limits.max_duration_seconds}`, event.budget_snapshot.duration_seconds, 'Pause mission and request duration extension', event.mission_id);
      }
    }

    // Apply Atomic Transition
    return this._applyTransition(snapshot, event, event.to_state);
  }

  _applyTransition(snapshot, event, toState) {
    this.processedEvents.add(event.event_id);
    if (event.idempotency_key) {
      this.processedEvents.add(event.idempotency_key);
    }

    const newSnapshot = {
      ...snapshot,
      previous_state: snapshot.state,
      state: toState,
      updated_at: event.timestamp || new Date().toISOString(),
      last_event_id: event.event_id,
      sequence: (snapshot.sequence || 0) + 1
    };

    const receipt = {
      receipt_id: `REC-${this.calculateHash(event.event_id + toState + newSnapshot.sequence).substring(0, 16).toUpperCase()}`,
      mission_id: snapshot.mission_id,
      event_id: event.event_id,
      from_state: snapshot.state,
      to_state: toState,
      timestamp: newSnapshot.updated_at,
      snapshot_hash: this.calculateHash(newSnapshot)
    };

    this.ledger.push(receipt);

    return {
      success: true,
      snapshot: newSnapshot,
      receipt
    };
  }

  _applyControlTransition(snapshot, event, toState, reason) {
    this.processedEvents.add(event.event_id);
    if (event.idempotency_key) {
      this.processedEvents.add(event.idempotency_key);
    }
    const newSnapshot = {
      ...snapshot,
      previous_state: snapshot.state,
      state: toState,
      control_reason: reason,
      updated_at: event.timestamp || new Date().toISOString(),
      last_event_id: event.event_id,
      sequence: (snapshot.sequence || 0) + 1
    };

    const receipt = {
      receipt_id: `CTRL-${this.calculateHash(event.event_id + toState).substring(0, 16).toUpperCase()}`,
      mission_id: snapshot.mission_id,
      event_id: event.event_id,
      from_state: snapshot.state,
      to_state: toState,
      reason,
      timestamp: newSnapshot.updated_at,
      snapshot_hash: this.calculateHash(newSnapshot)
    };

    this.ledger.push(receipt);

    return {
      success: true,
      snapshot: newSnapshot,
      receipt
    };
  }

  createCheckpoint(snapshot) {
    return {
      mission_id: snapshot.mission_id,
      state: snapshot.state,
      previous_state: snapshot.previous_state,
      sequence: snapshot.sequence,
      checkpoint_hash: this.calculateHash(snapshot),
      created_at: new Date().toISOString()
    };
  }

  restoreCheckpoint(checkpoint) {
    return {
      mission_id: checkpoint.mission_id,
      state: checkpoint.state,
      previous_state: checkpoint.previous_state,
      sequence: checkpoint.sequence,
      restored_at: new Date().toISOString()
    };
  }
}
