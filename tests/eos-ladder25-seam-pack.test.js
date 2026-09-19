/**
 * Ladder 25 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 25 Sovereign External Tool Federation,
 * Long-Horizon Mission Archive & Adversarial Verification Fabric:
 * - Mission CG (SPEC-0090): External Tool / MCP Federation Port (CG-RCPT-*)
 * - Mission CH (SPEC-0091): Mission Archive & Replay Port (CH-RCPT-*)
 * - Mission CI (SPEC-0092): HITL Escalation Federation Port (CI-RCPT-*)
 * - Mission CJ (SPEC-0093): Continuous Adversarial Verification Port (CJ-RCPT-*)
 * - Mission CK (SPEC-0094): Ladder 25 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0
 * - Law VI
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement
 * - L17–L24 CLOSED never reopen; after CK, L25 CLOSED_FOR_LOCAL_GOVERNED_USE never reopen
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ExternalToolFederationPort,
  CG_PORT_PRODUCTION_READY,
  CG_PORT_KIND
} from '../src/core/federation/external-tool-federation-port.js';
import { CG_CODES } from '../src/core/federation/external-tool-federation-policy-gate.js';

import {
  MissionArchiveReplayPort,
  CH_PORT_PRODUCTION_READY,
  CH_PORT_KIND
} from '../src/core/archive/mission-archive-replay-port.js';
import { sha256Canonical as chSha } from '../src/core/archive/mission-archive-replay-receipt.js';
import { CH_CODES } from '../src/core/archive/mission-archive-replay-policy-gate.js';

import {
  HitlEscalationFederationPort,
  CI_PORT_PRODUCTION_READY,
  CI_PORT_KIND
} from '../src/core/authority/hitl-escalation-federation-port.js';
import { CI_CODES } from '../src/core/authority/hitl-escalation-federation-policy-gate.js';

import {
  AdversarialVerificationPort,
  CJ_PORT_PRODUCTION_READY,
  CJ_PORT_KIND
} from '../src/core/verification/adversarial-verification-port.js';
import { sha256Canonical as cjSha } from '../src/core/verification/adversarial-verification-receipt.js';
import { CJ_CODES } from '../src/core/verification/adversarial-verification-policy-gate.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER25_SATELLITE_MODULES = [
  'src/core/federation/external-tool-federation-port.js',
  'src/core/federation/external-tool-federation-receipt.js',
  'src/core/federation/external-tool-federation-policy-gate.js',
  'src/core/archive/mission-archive-replay-port.js',
  'src/core/archive/mission-archive-replay-receipt.js',
  'src/core/archive/mission-archive-replay-policy-gate.js',
  'src/core/authority/hitl-escalation-federation-port.js',
  'src/core/authority/hitl-escalation-federation-receipt.js',
  'src/core/authority/hitl-escalation-federation-policy-gate.js',
  'src/core/verification/adversarial-verification-port.js',
  'src/core/verification/adversarial-verification-receipt.js',
  'src/core/verification/adversarial-verification-policy-gate.js'
];

const LADDER25_SATELLITE_SCRIPTS = [
  'test:mission-cg',
  'test:mission-ch',
  'test:mission-ci',
  'test:mission-cj'
];

const LADDER25_SLIM_EXCLUDES = [
  'eos-cg-external-tool-federation-port.test.js',
  'eos-ch-mission-archive-replay-port.test.js',
  'eos-ci-hitl-escalation-federation-port.test.js',
  'eos-cj-adversarial-verification-port.test.js',
  'eos-ladder25-seam-pack.test.js'
];

test('L25-SEAM-0: Fail-closed if any Ladder 25 satellite module missing', () => {
  for (const rel of LADDER25_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L25-SEAM-1: package.json registers Ladder 25 satellite + seam/pack scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER25_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder25-seam'],
    'node --test tests/eos-ladder25-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder25-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder25-pack');
  for (const s of LADDER25_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder25-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder25-seam'), 'ladder25-pack must chain seam');
});

test('L25-SEAM-2: SLIM_SUITE_EXCLUDES holds CG/CH/CI/CJ + ladder25 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER25_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L25-SEAM-3: PRODUCTION_READY=NO across CG/CH/CI/CJ ports', () => {
  assert.equal(CG_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CH_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CI_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CJ_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof CG_PORT_KIND, 'string');
  assert.equal(typeof CH_PORT_KIND, 'string');
  assert.equal(typeof CI_PORT_KIND, 'string');
  assert.equal(typeof CJ_PORT_KIND, 'string');
});

test('L25-SEAM-4: Cross-satellite smoke CG → CH → CI → CJ (receipt prefixes)', () => {
  const fed = new ExternalToolFederationPort();
  const federated = fed.federate({
    federationId: 'ck-seam-federation',
    label: 'L25 seam federate',
    toolIds: ['mcp.figma/get_screenshot', 'mcp.notion/search'],
    allowlist: ['mcp.figma/get_screenshot', 'mcp.notion/search', 'gmail_search_threads']
  });
  assert.equal(federated.ok, true);
  assert.ok(federated.receipt.receiptId.startsWith('CG-RCPT-'));
  assert.equal(federated.receipt.fundacionDelta, 0);

  const archivePort = new MissionArchiveReplayPort();
  const entries = [
    { missionId: 'CG', receiptId: 'CG-RCPT-20260918-0001', digest: chSha({ label: 'cg-1', mission: 'CH' }) },
    { missionId: 'CJ', receiptId: 'CJ-RCPT-20260918-0002', digest: chSha({ label: 'cj-1', mission: 'CH' }) },
    { missionId: 'CI', receiptId: 'CI-RCPT-20260918-0003', digest: chSha({ label: 'ci-1', mission: 'CH' }) }
  ];
  const archived = archivePort.archive({
    archiveId: 'ck-seam-archive',
    label: 'L25 seam archive',
    trailEntries: entries
  });
  assert.equal(archived.ok, true);
  assert.ok(archived.receipt.receiptId.startsWith('CH-RCPT-'));
  assert.equal(archived.receipt.fundacionDelta, 0);

  const hitl = new HitlEscalationFederationPort();
  const escalated = hitl.escalate({
    escalationId: 'ck-seam-esc-001',
    projectId: 'eos-project-demo',
    missionId: 'CI',
    operatorDecision: 'APPROVE',
    irreversibilityClass: 'REVERSIBLE',
    reasons: ['operator approved reversible gate'],
    label: 'L25 seam escalate'
  });
  assert.equal(escalated.ok, true);
  assert.ok(escalated.receipt.receiptId.startsWith('CI-RCPT-'));
  assert.equal(escalated.receipt.fundacionDelta, 0);

  const digest = cjSha('ck-seam-measured-ok');
  const adv = new AdversarialVerificationPort();
  const probed = adv.probe({
    probeId: 'ck-seam-probe-001',
    targets: [
      {
        claimId: 'claim-cg-measured',
        claimedStatus: 'MEASURED',
        evidenceDigest: digest,
        expectedDigest: digest
      }
    ],
    reasons: ['hermetic MEASURED probe'],
    label: 'L25 seam probe'
  });
  assert.equal(probed.ok, true);
  assert.ok(probed.receipt.receiptId.startsWith('CJ-RCPT-'));
  assert.equal(probed.receipt.fundacionDelta, 0);
});

test('L25-SEAM-5: Fundacion deny surfaces exist across CG/CH/CI/CJ', () => {
  const fed = new ExternalToolFederationPort();
  const cgDeny = fed.federate({
    federationId: 'fundacion-plan',
    toolIds: ['mcp.figma/get_screenshot'],
    allowlist: ['mcp.figma/get_screenshot']
  });
  assert.equal(cgDeny.ok, false);
  assert.equal(cgDeny.code, CG_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cgDeny.receipt.receiptId.startsWith('CG-RCPT-'));

  const archivePort = new MissionArchiveReplayPort();
  const chDeny = archivePort.archive({
    archiveId: 'fundacion-plan',
    trailEntries: [
      { missionId: 'CG', receiptId: 'CG-RCPT-1', digest: chSha({ x: 1 }) }
    ]
  });
  assert.equal(chDeny.ok, false);
  assert.equal(chDeny.code, CH_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(chDeny.receipt.receiptId.startsWith('CH-RCPT-'));

  const hitl = new HitlEscalationFederationPort();
  const ciDeny = hitl.escalate({
    escalationId: 'fundacion-plan',
    projectId: 'eos-project-demo',
    missionId: 'CI',
    operatorDecision: 'APPROVE',
    irreversibilityClass: 'REVERSIBLE',
    reasons: ['x']
  });
  assert.equal(ciDeny.ok, false);
  assert.equal(ciDeny.code, CI_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(ciDeny.receipt.receiptId.startsWith('CI-RCPT-'));

  const adv = new AdversarialVerificationPort();
  const digest = cjSha('deny');
  const cjDeny = adv.probe({
    probeId: 'fundacion-plan',
    targets: [
      {
        claimId: 'c1',
        claimedStatus: 'MEASURED',
        evidenceDigest: digest,
        expectedDigest: digest
      }
    ],
    reasons: ['x']
  });
  assert.equal(cjDeny.ok, false);
  assert.equal(cjDeny.code, CJ_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cjDeny.receipt.receiptId.startsWith('CJ-RCPT-'));
});

test('L25-SEAM-6: Closeout doc seals L25 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L24 never reopen', () => {
  const closeoutRel = 'docs/releases/EOS_LADDER_25_CLOSEOUT_2026-09-18.md';
  assert.ok(exists(closeoutRel), `${closeoutRel} must exist`);
  const doc = read(closeoutRel);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI'));
  assert.ok(doc.includes('External Tool Federation'));
  assert.ok(doc.includes('Mission Archive'));
  assert.ok(doc.includes('Adversarial Verification'));
  assert.ok(doc.includes('SPEC-0090') || doc.includes('Mission CG'));
  assert.ok(doc.includes('SPEC-0091') || doc.includes('Mission CH'));
  assert.ok(doc.includes('SPEC-0092') || doc.includes('Mission CI'));
  assert.ok(doc.includes('SPEC-0093') || doc.includes('Mission CJ'));
  assert.ok(doc.includes('SPEC-0094') || doc.includes('Mission CK') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('GitHub Enterprise') || doc.includes('≠ GitHub'),
    'NON-CLAIM Seam-pack ≠ GitHub Enterprise enforcement'
  );
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L25 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L24|Ladder 24/.test(doc));
});

test('L25-SEAM-7: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/
  ];

  const filesToCheck = [
    'src/core/federation/external-tool-federation-port.js',
    'src/core/archive/mission-archive-replay-port.js',
    'src/core/authority/hitl-escalation-federation-port.js',
    'src/core/verification/adversarial-verification-port.js',
    'tests/eos-ladder25-seam-pack.test.js'
  ];

  for (const rel of filesToCheck) {
    assert.ok(exists(rel), `missing ${rel}`);
    const content = read(rel);
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(content), false, `Forbidden secret pattern in ${rel}`);
    }
  }

  assert.ok(exists('src/core/write-barrier/authorize.js'));
  const wb = read('src/core/write-barrier/authorize.js');
  assert.ok(wb.includes('FUNDACION_ALWAYS_DENY'));
});
