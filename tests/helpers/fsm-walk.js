/**
 * Test helper: drives the canonical FSM through AuthorityTruthSource.commitTransition.
 *
 * Tests previously reached mid-lifecycle states by hand-writing authority-snapshot.json.
 * That is now rejected as tampering, and it also meant the tests never exercised the gates
 * they were skipping past. These helpers reach states the same way production does.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { SDD_STATES } from '../../src/core/sdd/sdd-fsm-engine.js';
import { HitlGatekeeper } from '../../src/core/sdd/hitl-gatekeeper.js';

export const IMPLEMENTER_IDENTITY = 'AGENT-TEST-IMPLEMENTER';
export const REVIEWER_IDENTITY = 'AGENT-TEST-REVIEWER';

export function seedMissionDir(missionsRoot, missionId, overrides = {}) {
  const dir = path.join(missionsRoot, missionId);
  fs.mkdirSync(path.join(dir, 'ledger'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'mission-package.json'),
    JSON.stringify(
      { schema_version: '1.0.0', mission_id: missionId, status: 'active', phase: null, orchestration: { tasks: [] }, ...overrides },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(dir, 'direction.json'), JSON.stringify({ mission_id: missionId, goal: 'test' }));
  fs.writeFileSync(path.join(dir, 'project-profile.json'), JSON.stringify({ project_id: 'PRJ-TEST' }));
  return dir;
}

export function artifact(kind) {
  return {
    id: kind,
    kind,
    sha256: createHash('sha256').update(kind).digest('hex'),
    uri: `artifacts/${kind}.json`
  };
}

function taskContractFixture() {
  return {
    task_id: 'TASK-TEST-01',
    assigned_role: 'CORE_ENGINEER',
    allowed_tools: ['read_file', 'grep_search'],
    protected_surfaces: ['docs/governance/**']
  };
}

function verifiedEvidence() {
  return [
    {
      id: 'EVD-TEST-01',
      status: 'VERIFIED',
      category: 'UNIT_TEST',
      sha256: createHash('sha256').update('EVD-TEST-01').digest('hex')
    }
  ];
}

/**
 * The single legal step out of each state, with the inputs that state's gate requires.
 */
export function stepFrom(state, missionId, options = {}) {
  const hitl = options.hitl || new HitlGatekeeper();

  switch (state) {
    case SDD_STATES.VISION_INTAKE:
      return { event_type: 'mission.formulate', to_state: SDD_STATES.MISSION_FORMULATION, artifacts: [artifact('vision')] };

    case SDD_STATES.MISSION_FORMULATION:
      return {
        event_type: 'mission.propose_direction',
        to_state: SDD_STATES.HUMAN_DIRECTION_GATE,
        artifacts: [artifact('mission_package'), artifact('contract')]
      };

    case SDD_STATES.HUMAN_DIRECTION_GATE:
      return {
        event_type: 'human.approve_direction',
        to_state: SDD_STATES.DISCOVER,
        hitlReceipt: hitl.issueLocalBoundedReceipt({ missionId, gateId: 'HUMAN_DIRECTION_GATE' })
      };

    case SDD_STATES.DISCOVER:
      return { event_type: 'discovery.complete', to_state: SDD_STATES.DEFINE, artifacts: [artifact('repository_inventory')] };

    case SDD_STATES.DEFINE:
      return {
        event_type: 'definition.complete',
        to_state: SDD_STATES.PLAN,
        artifacts: [artifact('technical_spec'), artifact('acceptance_criteria')]
      };

    case SDD_STATES.PLAN:
      return {
        event_type: 'plan.approve',
        to_state: SDD_STATES.DELEGATE,
        artifacts: [artifact('implementation_plan'), artifact('task_graph')]
      };

    case SDD_STATES.DELEGATE:
      return {
        event_type: 'task.assign',
        to_state: SDD_STATES.SUPERVISE,
        context: { taskContract: taskContractFixture(), implementer: { identity: IMPLEMENTER_IDENTITY } }
      };

    case SDD_STATES.SUPERVISE:
      return {
        event_type: 'task.complete',
        to_state: SDD_STATES.VERIFY,
        authority_level: 'LEVEL_1',
        context: {
          implementer: { identity: IMPLEMENTER_IDENTITY },
          outputs: [{ task_id: 'TASK-TEST-01', path: 'src/example.js', action: 'MODIFY' }]
        }
      };

    case SDD_STATES.VERIFY:
      return {
        event_type: 'verification.complete',
        to_state: SDD_STATES.REVIEW,
        evidence_refs: verifiedEvidence(),
        context: { implementer: { identity: IMPLEMENTER_IDENTITY } }
      };

    case SDD_STATES.REVIEW:
      return {
        event_type: 'review.accept',
        to_state: SDD_STATES.HUMAN_RELEASE_GATE,
        actor: { identity: REVIEWER_IDENTITY, role: 'INDEPENDENT_REVIEWER', identity_type: 'eos_reviewer' },
        context: { implementer: { identity: IMPLEMENTER_IDENTITY }, reviewer: { identity: REVIEWER_IDENTITY } }
      };

    case SDD_STATES.HUMAN_RELEASE_GATE:
      return {
        event_type: 'human.approve_release',
        to_state: SDD_STATES.OPERATE_AND_LEARN,
        hitlReceipt: hitl.issueLocalBoundedReceipt({ missionId, gateId: 'HUMAN_RELEASE_GATE' })
      };

    case SDD_STATES.OPERATE_AND_LEARN:
      return {
        event_type: 'mission.close',
        to_state: SDD_STATES.COMPLETED,
        actor: { identity: 'operator', role: 'HUMAN_DIRECTOR', identity_type: 'human_owner' }
      };

    default:
      throw new Error(`NO_CANONICAL_STEP_FROM: ${state}`);
  }
}

/**
 * Commits real transitions until the mission reaches targetState.
 * @returns {Array<{event_type: string, to_state: string}>} the committed steps
 */
export function walkToState(ats, missionId, targetState, options = {}) {
  const hitl = options.hitl || new HitlGatekeeper();
  const committed = [];

  for (let guard = 0; guard < 20; guard++) {
    const current = ats.getSnapshot(missionId).state;
    if (current === targetState) return committed;

    const step = stepFrom(current, missionId, { hitl });
    ats.commitTransition({ missionId, authority_level: 'LEVEL_0', ...step });
    committed.push({ event_type: step.event_type, to_state: step.to_state });
  }

  throw new Error(`WALK_DID_NOT_REACH: ${targetState}`);
}
