import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  classifyOrganicRoute,
  evaluateSddCeremonySpawn,
  assertSddCeremonyAuthorized,
  ORGANIC_ROUTES
} from '../src/core/sdd/organic-routing-gate.js';
import {
  createTddPhaseReceipt,
  evaluateApplyClaim,
  auditTddReceipts,
  assertApplyEvidenceComplete,
  TDD_PHASES
} from '../src/core/sdd/tdd-evidence-receipt.js';
import { stampRddReview, assertRddDoesNotGrantDelivery } from '../src/core/governance/rdd-review-stance.js';
import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';
import { IndependentVerificationHarness } from '../scripts/engine/independent-verification-harness.js';
import { OpenSpecLifecycleAdapter } from '../scripts/engine/spec-driven-product-loop.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function fixtureReceipts(taskId = 'TASK-01') {
  return [
    createTddPhaseReceipt({
      phase: TDD_PHASES.RED,
      task_id: taskId,
      command: `node --test tests/${taskId}.test.js`,
      exit_code: 1,
      output: 'not ok 1 — expected fail'
    }),
    createTddPhaseReceipt({
      phase: TDD_PHASES.GREEN,
      task_id: taskId,
      command: `node --test tests/${taskId}.test.js`,
      exit_code: 0,
      output: 'ok 1 — first example'
    }),
    createTddPhaseReceipt({
      phase: TDD_PHASES.TRIANGULATE,
      task_id: taskId,
      command: `node --test tests/${taskId}.test.js`,
      exit_code: 0,
      output: 'ok 2 — second / negative case'
    })
  ];
}

test('organic gate: size alone does not force SDD', () => {
  const classified = classifyOrganicRoute({
    byteSize: 9_999_999,
    loc: 4000,
    fileCount: 120,
    localAlreadyScopedFix: true
  });
  assert.equal(classified.route, ORGANIC_ROUTES.DIRECT);
  assert.equal(classified.size_ignored, true);
});

test('organic gate: delegated actor on DIRECT-eligible work is DELEGATED_DIRECT', () => {
  const classified = classifyOrganicRoute({
    delegatedActor: true,
    localAlreadyScopedFix: true,
    byteSize: 80000
  });
  assert.equal(classified.route, ORGANIC_ROUTES.DELEGATED_DIRECT);
});

test('organic gate: explicit SDD request or accepted proposal classifies SDD', () => {
  assert.equal(classifyOrganicRoute({ explicitSddRequest: true }).route, ORGANIC_ROUTES.SDD);
  assert.equal(classifyOrganicRoute({ acceptedProposal: true }).route, ORGANIC_ROUTES.SDD);
  assert.equal(classifyOrganicRoute({ newSubsystem: true }).route, ORGANIC_ROUTES.SDD);
  assert.equal(classifyOrganicRoute({ externalWrite: true }).route, ORGANIC_ROUTES.SDD);
});

test('organic gate: accidental SDD spawn fail-closes; override allowed', () => {
  const blocked = evaluateSddCeremonySpawn({
    spawnSddCeremony: true,
    byteSize: 500000,
    loc: 2000
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.code, 'ACCIDENTAL_SDD_SPAWN');
  assert.throws(
    () => assertSddCeremonyAuthorized({ spawnSddCeremony: true, fileCount: 99 }),
    (err) => err.code === 'ACCIDENTAL_SDD_SPAWN'
  );

  const explicit = evaluateSddCeremonySpawn({
    spawnSddCeremony: true,
    explicitSddRequest: true
  });
  assert.equal(explicit.allowed, true);
  assert.equal(explicit.code, 'SDD_JUSTIFIED');

  const override = evaluateSddCeremonySpawn({
    spawnSddCeremony: true,
    forceSddOverride: true
  });
  assert.equal(override.allowed, true);
  assert.equal(override.code, 'SDD_OVERRIDE');
});

test('TDD receipts: RED must fail, GREEN must pass, command required', () => {
  assert.throws(
    () => createTddPhaseReceipt({ phase: 'RED', command: 'node --test t.js', exit_code: 0 }),
    (err) => err.code === 'TDD_RED_MUST_FAIL'
  );
  assert.throws(
    () => createTddPhaseReceipt({ phase: 'GREEN', command: 'node --test t.js', exit_code: 1 }),
    (err) => err.code === 'TDD_PHASE_MUST_PASS'
  );
  assert.throws(
    () => createTddPhaseReceipt({ phase: 'GREEN', exit_code: 0 }),
    (err) => err.code === 'TDD_COMMAND_REQUIRED'
  );
  const red = createTddPhaseReceipt({
    phase: 'RED',
    command: 'node --test t.js',
    exit_code: 1,
    output: 'fail'
  });
  assert.equal(red.tdd_phase, 'RED');
  assert.equal(red.status, 'NOT_VERIFIED');
});

test('TDD apply claim: missing receipts cannot complete or claim VERIFIED', () => {
  const missing = evaluateApplyClaim({
    claimComplete: true,
    strictTdd: true,
    testsExist: true,
    receipts: []
  });
  assert.equal(missing.allowed, false);
  assert.equal(missing.can_claim_verified, false);
  assert.equal(missing.code, 'TDD_EVIDENCE_MISSING');
  assert.ok(missing.missing.includes('RED'));
  assert.ok(missing.missing.includes('GREEN'));
  assert.ok(missing.missing.includes('TRIANGULATE'));

  assert.throws(
    () => assertApplyEvidenceComplete({ receipts: [], strictTdd: true, testsExist: true }),
    (err) => err.code === 'TDD_EVIDENCE_MISSING'
  );

  const complete = evaluateApplyClaim({
    claimComplete: true,
    strictTdd: true,
    testsExist: true,
    receipts: fixtureReceipts()
  });
  assert.equal(complete.allowed, true);
  assert.equal(complete.can_claim_verified, false);
  assert.equal(complete.code, 'TDD_APPLY_RECORDED');
});

test('TDD verify audit: missing receipts fail; present receipts do not stamp VERIFIED', () => {
  const fail = auditTddReceipts({ receipts: [], strictTdd: true, testsExist: true });
  assert.equal(fail.pass, false);
  assert.equal(fail.can_claim_verified, false);

  const ok = auditTddReceipts({
    receipts: fixtureReceipts(),
    strictTdd: true,
    testsExist: true
  });
  assert.equal(ok.pass, true);
  assert.equal(ok.can_claim_verified, false);
  assert.equal(ok.code, 'TDD_RECEIPTS_AUDITED');

  const selfCert = auditTddReceipts({
    receipts: fixtureReceipts(),
    strictTdd: true,
    testsExist: true,
    claimVerified: true
  });
  assert.equal(selfCert.pass, false);
  assert.equal(selfCert.code, 'TDD_VERIFIED_CLAIM_DENIED');
});

test('RDD stance: review is INFORMATIONAL and cannot grant delivery', () => {
  const stamped = stampRddReview({ verdict: 'ADVERSARIAL_REVIEW_PASSED', authorizes_delivery: true });
  assert.equal(stamped.stance, 'INFORMATIONAL');
  assert.equal(stamped.authorizes_delivery, false);
  assert.equal(stamped.authorizes_write, false);
  assert.equal(stamped.authorizes_fundacion_write, false);

  assert.throws(
    () => assertRddDoesNotGrantDelivery({ authorizes_delivery: true }),
    (err) => err.code === 'RDD_DELIVERY_DENIED'
  );
  assert.throws(
    () => assertRddDoesNotGrantDelivery({ decision: 'AUTHORIZE_DELIVERY' }),
    (err) => err.code === 'RDD_DELIVERY_DENIED'
  );
  const clean = assertRddDoesNotGrantDelivery({ verdict: 'CLEAN' });
  assert.equal(clean.authorizes_merge, false);
});

test('MissionRuntime: default create is DELEGATED_DIRECT; accidental --spawn-sdd blocked', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-organic-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"t","type":"module"}');
  fs.mkdirSync(path.join(root, 'src'));
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'local fixture cycle', projectPath: '.' });
  assert.equal(created.organic_routing.route, ORGANIC_ROUTES.DELEGATED_DIRECT);

  const planned = rt.planMission(created.mission_id);
  assert.equal(planned.plan.organic_routing.size_ignored, true);
  assert.ok(planned.plan.governance_gates.includes('ORGANIC_ROUTING_GATE'));

  assert.throws(
    () => rt.planMission(created.mission_id, { spawnSddCeremony: true, routing: { byteSize: 99999 } }),
    (err) => err.code === 'ACCIDENTAL_SDD_SPAWN'
  );
});

test('MissionRuntime: SDD spawn with explicit request records strict_tdd; verify needs receipts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-tdd-gate-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"t","type":"module"}');
  fs.mkdirSync(path.join(root, 'src'));
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({
    goal: 'new public contract',
    projectPath: '.',
    routing: { explicitSddRequest: true }
  });
  assert.equal(created.organic_routing.route, ORGANIC_ROUTES.SDD);

  const planned = rt.planMission(created.mission_id, {
    spawnSddCeremony: true,
    explicitSddRequest: true
  });
  assert.equal(planned.plan.organic_routing.route, ORGANIC_ROUTES.SDD);

  const before = rt.verifyMission(created.mission_id);
  assert.equal(before.valid, false);
  assert.equal(before.tdd_audit.pass, false);
  assert.equal(before.tdd_audit.code, 'TDD_EVIDENCE_MISSING');

  const after = rt.verifyMission(created.mission_id, { tddReceipts: fixtureReceipts() });
  assert.equal(after.tdd_audit.pass, true);
  assert.equal(after.valid, true);
  assert.equal(after.tdd_audit.can_claim_verified, false);
});

test('MissionRuntime: default local mission verify stays valid without TDD folder', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-tdd-default-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"t","type":"module"}');
  fs.mkdirSync(path.join(root, 'src'));
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'prove local cycle', projectPath: '.' });
  rt.planMission(created.mission_id);
  const verification = rt.verifyMission(created.mission_id);
  assert.equal(verification.valid, true);
  assert.equal(verification.tdd_audit.code, 'TDD_NOT_IN_SCOPE');
});

test('OpenSpec /ff without explicit SDD or override is fail-closed when caller strips the request', () => {
  const adapter = new OpenSpecLifecycleAdapter();
  const enriched = adapter.executeEnrichUs({ goal: 'docs typo', persona: 'ops' });
  assert.throws(
    () =>
      adapter.executeNewAndFastForward('CHG-ACCIDENTAL', enriched, {
        explicitSddRequest: false,
        routing: { byteSize: 120000 }
      }),
    (err) => err.code === 'ACCIDENTAL_SDD_SPAWN'
  );
});

test('independent harness delegates organic / TDD / RDD checks', () => {
  const harness = new IndependentVerificationHarness();
  const spawn = harness.evaluateOrganicSpawn({ spawnSddCeremony: true, byteSize: 10 });
  assert.equal(spawn.code, 'ACCIDENTAL_SDD_SPAWN');
  const audit = harness.auditStrictTddReceipts(fixtureReceipts());
  assert.equal(audit.pass, true);
  const rdd = harness.evaluateRddStance({ verdict: 'ok' });
  assert.equal(rdd.stance, 'INFORMATIONAL');
});

test('docs and verify-eos list enforcement surfaces; L0 still has no npm deps', () => {
  const runtime = fs.readFileSync(path.join(rootDir, 'docs/manuals/OPENSPEC_RUNTIME.md'), 'utf8');
  assert.match(runtime, /organic-routing-gate/);
  assert.match(runtime, /tdd-evidence-receipt/);
  assert.match(runtime, /rdd-review-stance/);
  assert.match(runtime, /How to supply TDD evidence/);

  const verifier = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  for (const rel of [
    'src/core/sdd/organic-routing-gate.js',
    'src/core/sdd/tdd-evidence-receipt.js',
    'src/core/governance/rdd-review-stance.js'
  ]) {
    assert.ok(verifier.includes(`'${rel}'`), `verify-eos must list ${rel}`);
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(Object.hasOwn(pkg, 'dependencies'), false);
  assert.equal(Object.hasOwn(pkg, 'devDependencies'), false);
});
