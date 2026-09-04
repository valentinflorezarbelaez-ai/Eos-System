#!/usr/bin/env node
/**
 * Operator sealer for the canonical E2E loop. Uses existing Control Plane
 * modules only — not a new engine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTddPhaseReceipt, auditTddReceipts, TDD_PHASES } from '../../../src/core/sdd/tdd-evidence-receipt.js';
import { OpenSpecLifecycleAdapter } from '../../../scripts/engine/spec-driven-product-loop.js';
import { stampRddReview, assertRddDoesNotGrantDelivery } from '../../../src/core/governance/rdd-review-stance.js';
import { MissionRuntime } from '../../../src/core/runtime/mission-runtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const evdDir = __dirname;
const missionId = process.env.E2E_MISSION_ID || 'MIS-1788500673741-214B45';
const changeId = 'flowdesk-lead-pipeline-snapshot';
const taskId = 'TASK-01';

function readTap(name) {
  return fs.readFileSync(path.join(evdDir, name), 'utf8');
}

const redOut = readTap('tdd-red.tap.txt');
const greenOut = readTap('tdd-green.tap.txt');
const triOut = readTap('tdd-triangulate.tap.txt');

const receipts = [
  createTddPhaseReceipt({
    phase: TDD_PHASES.RED,
    mission_id: missionId,
    task_id: taskId,
    receipt_id: 'RCPT-E2E-RED-001',
    evidence_id: 'EVD-E2E-TDD-RED',
    command: 'npx tsx --test tests/unit/leadService.test.ts',
    exit_code: 1,
    output: redOut,
    assertions: ['countLeadsByStatus is not a function']
  }),
  createTddPhaseReceipt({
    phase: TDD_PHASES.GREEN,
    mission_id: missionId,
    task_id: taskId,
    receipt_id: 'RCPT-E2E-GREEN-001',
    evidence_id: 'EVD-E2E-TDD-GREEN',
    command: 'npx tsx --test tests/unit/leadService.test.ts',
    exit_code: 0,
    output: greenOut,
    assertions: ['mixed pipeline snapshot matches expected counts']
  }),
  createTddPhaseReceipt({
    phase: TDD_PHASES.TRIANGULATE,
    mission_id: missionId,
    task_id: taskId,
    receipt_id: 'RCPT-E2E-TRI-001',
    evidence_id: 'EVD-E2E-TDD-TRI',
    command: 'npx tsx --test tests/unit/leadService.test.ts',
    exit_code: 0,
    output: triOut,
    assertions: ['empty pipeline zeros', 'tenant isolation']
  })
];

const missingAudit = auditTddReceipts({
  receipts: [],
  strictTdd: true,
  testsExist: true
});
const completeAudit = auditTddReceipts({
  receipts,
  strictTdd: true,
  testsExist: true
});
const selfCertifyDenied = auditTddReceipts({
  receipts,
  strictTdd: true,
  testsExist: true,
  claimVerified: true
});

const adapter = new OpenSpecLifecycleAdapter();
const enriched = adapter.executeEnrichUs({
  goal: 'Tenant-scoped lead pipeline snapshot (count by status)',
  persona: 'FlowDesk operator'
});
const ff = adapter.executeNewAndFastForward(changeId, enriched, {
  explicitSddRequest: true,
  routing: { newFeature: true, publicContractChange: true }
});
const applied = adapter.executeApply(changeId, 'TASK-01', {
  tddReceipts: receipts,
  strictTdd: true,
  testsExist: true
});
const verified = adapter.executeVerify(changeId, { strictTdd: true, testsExist: true });
const review = adapter.executeAdversarialReview(changeId, {
  review: {
    changeId,
    redTeamPassed: true,
    securityVulnerabilities: 0,
    accessibilityRegressions: 0,
    findings: [
      'No Fundacion writes observed',
      'No root npm dependency added',
      'Builder receipts remain NOT VERIFIED'
    ]
  }
});
const archived = adapter.executeArchive(changeId);
const committed = adapter.executeCommit(changeId);

let rddDenied = null;
try {
  assertRddDoesNotGrantDelivery({ authorizes_delivery: true, changeId });
} catch (err) {
  rddDenied = { code: err.code, message: err.message };
}

const stamped = stampRddReview({
  changeId,
  verdict: 'INFORMATIONAL_CLEAN',
  authorizes_merge: false
});

const tddDir = path.join(root, '.missions', missionId, 'evidence', 'tdd');
fs.mkdirSync(tddDir, { recursive: true });
for (const receipt of receipts) {
  const dest = path.join(tddDir, `${receipt.tdd_phase.toLowerCase()}.json`);
  fs.writeFileSync(dest, JSON.stringify(receipt, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(evdDir, `receipt-${receipt.tdd_phase.toLowerCase()}.json`),
    JSON.stringify(receipt, null, 2),
    'utf8'
  );
}

const runtime = new MissionRuntime({ baseDir: root });
const missionVerify = runtime.verifyMission(missionId, { strictTdd: true, testsExist: true });

const report = {
  mission_id: missionId,
  change_id: changeId,
  missing_receipts_audit: missingAudit,
  complete_receipts_audit: completeAudit,
  self_certify_denied: selfCertifyDenied,
  adapter: {
    enrich: enriched.status,
    ff: ff.state,
    apply: applied.verdict,
    apply_epistemic: applied.tdd_evidence.epistemic_status,
    apply_can_claim_verified: applied.tdd_evidence.can_claim_verified,
    verify: verified,
    review: review,
    archive: archived.state,
    commit_adapter: committed.verdict
  },
  rdd_delivery_denied: rddDenied,
  rdd_stamp: stamped,
  mission_verify: {
    valid: missionVerify.valid,
    tdd_audit: missionVerify.tdd_audit,
    discrepancies: missionVerify.discrepancies
  }
};

const outPath = path.join(evdDir, 'loop-adapter-result.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({
  missing_code: missingAudit.code,
  missing_pass: missingAudit.pass,
  complete_code: completeAudit.code,
  complete_pass: completeAudit.pass,
  self_certify_code: selfCertifyDenied.code,
  apply: applied.verdict,
  verify_pass: verified.tdd_audit.pass,
  review_stance: review.stance,
  review_authorizes_delivery: review.authorizes_delivery,
  rdd_denied_code: rddDenied?.code,
  mission_verify_valid: missionVerify.valid,
  mission_tdd_code: missionVerify.tdd_audit?.code
}, null, 2));
