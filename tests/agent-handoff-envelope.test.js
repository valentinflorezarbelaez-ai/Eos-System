import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentHandoffEnvelope,
  LEGAL_PHASES,
  LEGAL_TRANSITIONS
} from '../src/core/orchestration/agent-handoff-envelope.js';

test('V3: creates valid AgentHandoffEnvelope with required fields', () => {
  const envelope = AgentHandoffEnvelope.create({
    sender_phase: 'architect',
    receiver_phase: 'spec_engineer',
    transition: 'INTAKE_TO_SPEC',
    sender_agent_id: 'agent-architect-01',
    receiver_agent_id: 'agent-spec-02',
    payload: {
      change_id: 'chg-sample-01',
      artifacts: ['docs/specs/spec.md'],
      status: 'READY'
    }
  });

  assert.equal(envelope.sender_phase, 'architect');
  assert.equal(envelope.receiver_phase, 'spec_engineer');
  assert.equal(envelope.transition, 'INTAKE_TO_SPEC');
  assert.equal(envelope.payload.change_id, 'chg-sample-01');
  assert.ok(typeof envelope.timestamp === 'string');
});

test('V3: fails closed when required envelope fields are missing', () => {
  assert.throws(
    () => AgentHandoffEnvelope.create({ sender_phase: 'architect' }),
    /MISSING_REQUIRED_FIELD/
  );

  assert.throws(
    () => AgentHandoffEnvelope.create({
      sender_phase: 'architect',
      receiver_phase: 'builder',
      transition: 'INVALID_TRANSITION',
      sender_agent_id: 'a1',
      receiver_agent_id: 'a2',
      payload: { change_id: 'c1' }
    }),
    /ILLEGAL_TRANSITION/
  );
});

test('V3: enforces BUILDER != VERIFIER at runtime when transitioning to VERIFY', () => {
  // Same agent id for builder and verifier must be rejected
  assert.throws(
    () => AgentHandoffEnvelope.create({
      sender_phase: 'builder',
      receiver_phase: 'verifier',
      transition: 'APPLY_TO_VERIFY',
      sender_agent_id: 'agent-same-identity',
      receiver_agent_id: 'agent-same-identity',
      payload: {
        change_id: 'chg-auth-01',
        artifacts: ['src/auth.js'],
        status: 'READY'
      }
    }),
    /BUILDER_EQUALS_VERIFIER_VIOLATION/
  );

  // Different agent id must pass cleanly
  const validHandoff = AgentHandoffEnvelope.create({
    sender_phase: 'builder',
    receiver_phase: 'verifier',
    transition: 'APPLY_TO_VERIFY',
    sender_agent_id: 'agent-builder-alpha',
    receiver_agent_id: 'agent-verifier-beta',
    payload: {
      change_id: 'chg-auth-01',
      artifacts: ['src/auth.js'],
      status: 'READY'
    }
  });
  assert.equal(validHandoff.transition, 'APPLY_TO_VERIFY');
});

test('V3: serializes to immutable JSON and exports legal phase taxonomy', () => {
  assert.ok(LEGAL_PHASES.includes('architect'));
  assert.ok(LEGAL_PHASES.includes('builder'));
  assert.ok(LEGAL_PHASES.includes('verifier'));
  assert.ok(LEGAL_TRANSITIONS.includes('APPLY_TO_VERIFY'));

  const envelope = AgentHandoffEnvelope.create({
    sender_phase: 'verifier',
    receiver_phase: 'operator',
    transition: 'VERIFY_TO_ARCHIVE',
    sender_agent_id: 'agent-verifier-01',
    receiver_agent_id: 'human-operator-01',
    payload: {
      change_id: 'chg-final-01',
      artifacts: ['docs/evidence/EVD-0099.json'],
      status: 'VERIFIED'
    }
  });

  const json = envelope.toJSON();
  assert.equal(json.status, 'VERIFIED');
  assert.ok(Object.isFrozen(envelope));
});
