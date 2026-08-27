import test from 'node:test';
import assert from 'node:assert/strict';
import { EosCursorHarnessCli } from '../scripts/cli/eos.js';

test('CLI Harness: eos status returns accurate Mission Control state', () => {
  const cli = new EosCursorHarnessCli();
  const status = cli.getStatus();

  assert.equal(status.commandCenter, 'CURSOR_IDE_AGENT_WORKSPACE');
  assert.equal(status.coreStatus, 'FROZEN');
  assert.equal(status.targetFundacion, 'FROZEN (Delta = 0)');
  assert.equal(status.gap002Status, 'UNKNOWN');
  assert.equal(status.gate13Status, 'CANARY_RESTRICTED');
  assert.equal(status.activeMission, 'EOS-MISSION-OS-LOCAL-COMPLETE');
});

test('CLI Harness: eos harness dispatches specialized role under anti-majority contract', () => {
  const cli = new EosCursorHarnessCli();
  const dispatch = cli.dispatchMultiModelHarness('Execute A11y WCAG 2.1 AA audit', 'AUDITOR');

  assert.equal(dispatch.assignedRole, 'AUDITOR');
  assert.equal(dispatch.antiMajorityRuleActive, true);
  assert.equal(dispatch.writeBarrierEnforced, true);
  assert.ok(dispatch.harnessId.startsWith('HARNESS-'));
});

test('CLI Harness: eos audit produces deterministic SHA-256 cryptographic snapshot', () => {
  const cli = new EosCursorHarnessCli();
  const audit = cli.generateAuditSnapshot('CANARY-REAL-001');

  assert.equal(audit.verdict, 'OPERATIONAL_AUDIT_VERIFIED');
  assert.equal(audit.cryptographicSignature.length, 64);
});

test('CLI Harness: eos activate / hola emits full activation contract and prompt', () => {
  const cli = new EosCursorHarnessCli();
  const res = cli.activate();

  assert.ok(res.greeting.includes('EOS Master Orchestrator'));
  assert.equal(res.governanceContract, 'REQUEST -> CLASSIFY -> AUTHORIZE -> EXECUTE');
  assert.equal(res.activeInvariants.coreKernel, 'FROZEN');
  assert.equal(res.activeInvariants.targetFundacion, 'FROZEN (Delta = 0)');
  assert.ok(res.readyPrompt.includes('21 pasos'));
});

test('CLI Harness: eos improve triggers Kaizen continuous improvement cycle', () => {
  const cli = new EosCursorHarnessCli();
  const res = cli.run(['improve']);

  assert.ok(res.cycleId.startsWith('KAIZEN-'));
  assert.equal(res.governanceValidation.selfImprovementAchieved, true);
  assert.equal(res.governanceValidation.privilegeEscalationAttempted, false);
});

test('CLI Harness: eos polyglot returns toolchain contracts for Rust and Python', () => {
  const cli = new EosCursorHarnessCli();
  const rustContract = cli.run(['polyglot', 'RUST']);
  const pythonContract = cli.run(['polyglot', 'PYTHON']);

  assert.equal(rustContract.toolchain, 'cargo');
  assert.ok(rustContract.testCommand.includes('cargo test'));
  assert.ok(pythonContract.testCommand.includes('pytest'));
});



