import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JointOperationsCommandCenter } from '../src/core/runtime/joint-operations-command-center.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

describe('Joint Operations Tactical Command Center (SPEC-EOS-007)', () => {
  let commandCenter;
  let cli;

  before(() => {
    commandCenter = new JointOperationsCommandCenter({ controlPlaneRoot: process.cwd() });
    cli = new MissionCLI({ controlPlaneRoot: process.cwd() });
  });

  test('T1: Fleet Tactical Status aggregates registered assets, evidence, and council', () => {
    const status = commandCenter.getFleetTacticalStatus();

    assert.equal(status.command_center, 'EOS_JOINT_OPERATIONS_WAR_ROOM_v3');
    assert.ok(status.projects.length >= 2, `Expected at least 2 projects, got ${status.projects.length}`);

    const projectIds = status.projects.map(p => p.id);
    assert.ok(projectIds.some(id => id.includes('FUERZA') || id.includes('APP')));
    assert.ok(projectIds.some(id => id.includes('FUNDACION')));

    assert.ok(status.sealed_evidence_count > 0);
    assert.ok(status.agent_council.total_desks >= 16);
    assert.ok(status.sha256 && status.sha256.length === 64);
  });

  test('T2: Surgical Mission Dispatch executes trace, loop, and intake with OPR receipt', () => {
    // 1. Dispatch trace
    const traceReceipt = commandCenter.dispatchSurgicalOperation({
      projectId: 'PRJ-APP-FUERZA',
      action: 'trace'
    });

    assert.ok(traceReceipt.receipt_id.startsWith('OPR-'));
    assert.equal(traceReceipt.action, 'trace');
    assert.equal(traceReceipt.project_id, 'PRJ-APP-FUERZA');
    assert.equal(traceReceipt.result, 'SUCCESS');
    assert.ok(traceReceipt.data.matrix);
    assert.ok(traceReceipt.sha256 && traceReceipt.sha256.length === 64);

    // 2. Dispatch intake
    const intakeReceipt = commandCenter.dispatchSurgicalOperation({
      projectId: 'PRJ-TACTICAL-TEST',
      action: 'intake',
      params: { input: 'Cuando el centinela detecte anomalía, el sistema aislará el nodo.' }
    });

    assert.equal(intakeReceipt.action, 'intake');
    assert.equal(intakeReceipt.result, 'SUCCESS');
    assert.ok(intakeReceipt.data.ears_requirements.length > 0);

    // 3. Dispatch invalid action fails safely
    const failReceipt = commandCenter.dispatchSurgicalOperation({
      projectId: 'PRJ-APP-FUERZA',
      action: 'unsupported_quantum_teleport'
    });
    assert.equal(failReceipt.result, 'FAILED');
    assert.ok(failReceipt.error);
  });

  test('T3: Intelligence Dossier compiles profile, risks, and operational posture', () => {
    const dossier = commandCenter.compileIntelligenceDossier('PRJ-APP-FUERZA');

    assert.equal(dossier.dossier_id, 'INTEL-PRJ-APP-FUERZA');
    assert.equal(dossier.project_id, 'PRJ-APP-FUERZA');
    assert.ok(dossier.classification.includes('TOP_SECRET'));
    assert.ok(dossier.threat_vectors.length >= 4);
    assert.ok(dossier.sha256 && dossier.sha256.length === 64);
  });

  test('T4: War Room Dashboard renders 4 high-density tactical panels', () => {
    const tacticalData = commandCenter.getFleetTacticalStatus();
    const rendered = commandCenter.formatWarRoomDashboard(tacticalData);

    assert.ok(rendered.includes('SITUATION ROOM'));
    assert.ok(rendered.includes('FLEET ASSETS RADAR'));
    assert.ok(rendered.includes('MULTI-AGENT SPECIALIST COUNCIL'));
    assert.ok(rendered.includes('CRYPTOGRAPHIC INTEGRITY & SENSOR POSTURE'));
    assert.ok(rendered.includes('GLOBAL OPERATIONAL VERDICT'));
  });

  test('T5: CLI Integration via eos ops status, war-room, and dispatch', async () => {
    // 1. eos ops status --json
    const resStatus = await cli.run(['ops', 'status', '--json']);
    assert.equal(resStatus.success, true);
    assert.ok(resStatus.data.projects);

    // 2. eos war-room
    const resWarRoom = await cli.run(['war-room']);
    assert.equal(resWarRoom.success, true);
    assert.ok(resWarRoom.output.includes('SITUATION ROOM'));

    // 3. eos ops dispatch --project PRJ-SYNTH --action trace --json
    const resDispatch = await cli.run(['ops', 'dispatch', '--project', 'PRJ-SYNTH', '--action', 'trace', '--json']);
    assert.equal(resDispatch.success, true);
    assert.equal(resDispatch.data.action, 'trace');

    // 4. eos ops intel --project PRJ-APP-FUERZA --json
    const resIntel = await cli.run(['ops', 'intel', '--project', 'PRJ-APP-FUERZA', '--json']);
    assert.equal(resIntel.success, true);
    assert.equal(resIntel.data.dossier_id, 'INTEL-PRJ-APP-FUERZA');
  });
});
