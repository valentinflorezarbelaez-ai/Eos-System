/**
 * Ladder 26 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 26 Sovereign Spec↔Code↔Evidence
 * Traceability & Release Integrity Fabric:
 * - Mission CL (SPEC-0095): Spec↔Code Traceability Graph Port (CL-RCPT-*)
 * - Mission CM (SPEC-0096): Evidence Binding & Claim Custody Port (CM-RCPT-*)
 * - Mission CN (SPEC-0097): Governed Artifact / SBOM Attestation Port (CN-RCPT-*)
 * - Mission CO (SPEC-0098): Release Integrity & Progressive Honesty Governor (CO-RCPT-*)
 * - Mission CP (SPEC-0099): Ladder 26 CI Seam-Pack Consolidation & Closeout
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0
 * - Law VI
 * - Pure Node.js built-ins only (L0 purity)
 * - NON-CLAIM: Seam-pack ≠ GitHub Enterprise enforcement
 * - L17–L25 CLOSED never reopen; after CP, L26 CLOSED_FOR_LOCAL_GOVERNED_USE never reopen
 * - CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  SpecCodeTraceabilityPort,
  CL_PORT_PRODUCTION_READY,
  CL_PORT_KIND
} from '../src/core/traceability/spec-code-traceability-port.js';
import { sha256Canonical as clSha } from '../src/core/traceability/spec-code-traceability-receipt.js';
import { CL_CODES } from '../src/core/traceability/spec-code-traceability-policy-gate.js';

import {
  EvidenceBindingPort,
  CM_PORT_PRODUCTION_READY,
  CM_PORT_KIND
} from '../src/core/evidence/evidence-binding-port.js';
import { sha256Canonical as cmSha } from '../src/core/evidence/evidence-binding-receipt.js';
import { CM_CODES } from '../src/core/evidence/evidence-binding-policy-gate.js';

import {
  ArtifactAttestationPort,
  CN_PORT_PRODUCTION_READY,
  CN_PORT_KIND
} from '../src/core/artifacts/artifact-attestation-port.js';
import { sha256Canonical as cnSha } from '../src/core/artifacts/artifact-attestation-receipt.js';
import { CN_CODES } from '../src/core/artifacts/artifact-attestation-policy-gate.js';

import {
  ReleaseIntegrityPort,
  CO_PORT_PRODUCTION_READY,
  CO_PORT_KIND
} from '../src/core/release/release-integrity-port.js';
import { sha256Canonical as coSha } from '../src/core/release/release-integrity-receipt.js';
import { CO_CODES } from '../src/core/release/release-integrity-policy-gate.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER26_SATELLITE_MODULES = [
  'src/core/traceability/spec-code-traceability-port.js',
  'src/core/traceability/spec-code-traceability-receipt.js',
  'src/core/traceability/spec-code-traceability-policy-gate.js',
  'src/core/evidence/evidence-binding-port.js',
  'src/core/evidence/evidence-binding-receipt.js',
  'src/core/evidence/evidence-binding-policy-gate.js',
  'src/core/artifacts/artifact-attestation-port.js',
  'src/core/artifacts/artifact-attestation-receipt.js',
  'src/core/artifacts/artifact-attestation-policy-gate.js',
  'src/core/release/release-integrity-port.js',
  'src/core/release/release-integrity-receipt.js',
  'src/core/release/release-integrity-policy-gate.js'
];

const LADDER26_SATELLITE_SCRIPTS = [
  'test:mission-cl',
  'test:mission-cm',
  'test:mission-cn',
  'test:mission-co'
];

const LADDER26_SLIM_EXCLUDES = [
  'eos-cl-spec-code-traceability-port.test.js',
  'eos-cm-evidence-binding-port.test.js',
  'eos-cn-artifact-attestation-port.test.js',
  'eos-co-release-integrity-governor-port.test.js',
  'eos-ladder26-seam-pack.test.js'
];

test('L26-SEAM-0: Fail-closed if any Ladder 26 satellite module missing', () => {
  for (const rel of LADDER26_SATELLITE_MODULES) {
    assert.ok(exists(rel), `Fail-closed: missing satellite module ${rel}`);
  }
});

test('L26-SEAM-1: package.json registers Ladder 26 satellite + seam/pack scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER26_SATELLITE_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }

  assert.equal(
    pkg.scripts['test:ladder26-seam'],
    'node --test tests/eos-ladder26-seam-pack.test.js'
  );

  const pack = pkg.scripts['test:ladder26-pack'];
  assert.equal(typeof pack, 'string', 'Missing test:ladder26-pack');
  for (const s of LADDER26_SATELLITE_SCRIPTS) {
    assert.ok(pack.includes(s), `ladder26-pack missing ${s}`);
  }
  assert.ok(pack.includes('test:ladder26-seam'), 'ladder26-pack must chain seam');
});

test('L26-SEAM-2: SLIM_SUITE_EXCLUDES holds CL/CM/CN/CO + ladder26 seam', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js must exist');
  const runner = read('scripts/test-runner.js');
  assert.ok(runner.includes('SLIM_SUITE_EXCLUDES'), 'SLIM_SUITE_EXCLUDES missing');
  for (const name of LADDER26_SLIM_EXCLUDES) {
    assert.ok(runner.includes(name), `SLIM exclude missing: ${name}`);
  }
});

test('L26-SEAM-3: PRODUCTION_READY=NO across CL/CM/CN/CO ports', () => {
  assert.equal(CL_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CM_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CN_PORT_PRODUCTION_READY, 'NO');
  assert.equal(CO_PORT_PRODUCTION_READY, 'NO');
  assert.equal(typeof CL_PORT_KIND, 'string');
  assert.equal(typeof CM_PORT_KIND, 'string');
  assert.equal(typeof CN_PORT_KIND, 'string');
  assert.equal(typeof CO_PORT_KIND, 'string');
});

test('L26-SEAM-4: Cross-satellite smoke CL → CM → CN → CO (receipt prefixes)', () => {
  const linkDigest = clSha({ label: 'cp-seam-link', mission: 'CL' });
  const clPort = new SpecCodeTraceabilityPort();
  const linked = clPort.link({
    planId: 'cp-seam-link-001',
    nodes: [
      {
        specId: 'SPEC-0095',
        codePath: 'src/core/traceability/spec-code-traceability-port.js',
        evidenceDigest: linkDigest
      }
    ],
    reasons: ['hermetic Spec↔Code seam link'],
    label: 'L26 seam link'
  });
  assert.equal(linked.ok, true);
  assert.ok(linked.receipt.receiptId.startsWith('CL-RCPT-'));
  assert.equal(linked.receipt.fundacionDelta, 0);
  const clReceiptDigest = linked.receipt.receiptHash;

  const bindEvidence = cmSha({ label: 'cp-seam-bind', mission: 'CM' });
  const cmPort = new EvidenceBindingPort();
  const bound = cmPort.bind({
    planId: 'cp-seam-bind-001',
    claims: [
      {
        claimId: 'claim.measured.cp-seam-001',
        evidenceDigest: bindEvidence,
        linkDigest: clReceiptDigest,
        specId: 'SPEC-0096',
        codePath: 'src/core/evidence/evidence-binding-port.js'
      }
    ],
    reasons: ['hermetic claim↔evidence seam bind'],
    label: 'L26 seam bind'
  });
  assert.equal(bound.ok, true);
  assert.ok(bound.receipt.receiptId.startsWith('CM-RCPT-'));
  assert.equal(bound.receipt.fundacionDelta, 0);
  const cmReceiptDigest = bound.receipt.receiptHash;

  const sbomDigest = cnSha({ label: 'cp-seam-sbom', mission: 'CN' });
  const cnPort = new ArtifactAttestationPort();
  const attested = cnPort.attest({
    planId: 'cp-seam-attest-001',
    artifacts: [
      {
        artifactId: 'artifact.rc.cp-seam-001',
        sbomDigest,
        packagePath: 'dist/eos-rc-cp-seam.tgz',
        bindDigest: cmReceiptDigest,
        linkDigest: clReceiptDigest,
        components: [
          { name: 'eos-core', version: '0.0.0-local', digest: cnSha('comp-cp-1') }
        ]
      }
    ],
    reasons: ['hermetic artifact/SBOM seam attest'],
    label: 'L26 seam attest'
  });
  assert.equal(attested.ok, true);
  assert.ok(attested.receipt.receiptId.startsWith('CN-RCPT-'));
  assert.equal(attested.receipt.fundacionDelta, 0);
  const cnReceiptDigest = attested.receipt.receiptHash;

  const integrityDigest = coSha({ label: 'cp-seam-integrity', mission: 'CO' });
  const coPort = new ReleaseIntegrityPort();
  const governed = coPort.govern({
    planId: 'cp-seam-govern-001',
    releaseId: 'release.rc.cp-seam-001',
    integrityDigest,
    attestDigest: cnReceiptDigest,
    bindDigest: cmReceiptDigest,
    linkDigest: clReceiptDigest,
    honestyMode: 'PROMOTE',
    claims: [
      {
        claimId: 'claim.integrity.cp-seam',
        claimType: 'release-integrity',
        digest: coSha('claim-cp-1')
      }
    ],
    reasons: ['hermetic release-integrity seam govern'],
    label: 'L26 seam govern'
  });
  assert.equal(governed.ok, true);
  assert.ok(governed.receipt.receiptId.startsWith('CO-RCPT-'));
  assert.equal(governed.receipt.fundacionDelta, 0);
});

test('L26-SEAM-5: Fundacion deny surfaces exist across CL/CM/CN/CO', () => {
  const clPort = new SpecCodeTraceabilityPort();
  const clDeny = clPort.link({
    planId: 'fundacion-plan',
    nodes: [
      {
        specId: 'SPEC-0095',
        codePath: 'src/core/traceability/spec-code-traceability-port.js',
        evidenceDigest: clSha({ x: 1 })
      }
    ],
    reasons: ['x']
  });
  assert.equal(clDeny.ok, false);
  assert.equal(clDeny.code, CL_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(clDeny.receipt.receiptId.startsWith('CL-RCPT-'));

  const cmPort = new EvidenceBindingPort();
  const cmDeny = cmPort.bind({
    planId: 'fundacion-plan',
    claims: [
      {
        claimId: 'claim.deny.1',
        evidenceDigest: cmSha({ x: 1 }),
        linkDigest: clSha({ x: 2 })
      }
    ],
    reasons: ['x']
  });
  assert.equal(cmDeny.ok, false);
  assert.equal(cmDeny.code, CM_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cmDeny.receipt.receiptId.startsWith('CM-RCPT-'));

  const cnPort = new ArtifactAttestationPort();
  const cnDeny = cnPort.attest({
    planId: 'fundacion-plan',
    artifacts: [
      {
        artifactId: 'artifact.deny.1',
        sbomDigest: cnSha({ x: 1 }),
        bindDigest: cmSha({ x: 2 }),
        linkDigest: clSha({ x: 3 })
      }
    ],
    reasons: ['x']
  });
  assert.equal(cnDeny.ok, false);
  assert.equal(cnDeny.code, CN_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(cnDeny.receipt.receiptId.startsWith('CN-RCPT-'));

  const coPort = new ReleaseIntegrityPort();
  const coDeny = coPort.govern({
    planId: 'fundacion-plan',
    releaseId: 'release.deny.1',
    integrityDigest: coSha({ x: 1 }),
    honestyMode: 'HOLD',
    reasons: ['x']
  });
  assert.equal(coDeny.ok, false);
  assert.equal(coDeny.code, CO_CODES.FUNDACION_ALWAYS_DENY);
  assert.ok(coDeny.receipt.receiptId.startsWith('CO-RCPT-'));
});

test('L26-SEAM-6: Closeout doc seals L26 CLOSED_FOR_LOCAL_GOVERNED_USE + NON-CLAIM + L17–L25 never reopen', () => {
  const closeoutRel = 'docs/releases/EOS_LADDER_26_CLOSEOUT_2026-09-19.md';
  assert.ok(exists(closeoutRel), `${closeoutRel} must exist`);
  const doc = read(closeoutRel);

  assert.ok(doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(/\*\*NO\*\*|PRODUCTION_READY[=:].*NO/.test(doc));
  assert.ok(doc.includes('Fundacion') && doc.includes('Δ=0'));
  assert.ok(doc.includes('Law VI'));
  assert.ok(doc.includes('Spec↔Code') || doc.includes('Traceability'));
  assert.ok(doc.includes('Evidence') || doc.includes('Claim Custody'));
  assert.ok(doc.includes('Artifact') || doc.includes('SBOM') || doc.includes('Attestation'));
  assert.ok(doc.includes('Release Integrity') || doc.includes('Honesty'));
  assert.ok(doc.includes('SPEC-0095') || doc.includes('Mission CL'));
  assert.ok(doc.includes('SPEC-0096') || doc.includes('Mission CM'));
  assert.ok(doc.includes('SPEC-0097') || doc.includes('Mission CN'));
  assert.ok(doc.includes('SPEC-0098') || doc.includes('Mission CO'));
  assert.ok(doc.includes('SPEC-0099') || doc.includes('Mission CP') || /Seam/i.test(doc));
  assert.ok(
    doc.includes('GitHub Enterprise') || doc.includes('≠ GitHub'),
    'NON-CLAIM Seam-pack ≠ GitHub Enterprise enforcement'
  );
  assert.ok(
    doc.includes('CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY') ||
      doc.includes('≠ PRODUCTION_READY=YES') ||
      /CLOSED_FOR_LOCAL_GOVERNED_USE.*PRODUCTION_READY/.test(doc),
    'NON-CLAIM: L26 CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
  );
  assert.ok(doc.includes('never reopen') || doc.includes('NEVER reopen'));
  assert.ok(/L17|Ladder 17/.test(doc));
  assert.ok(/L25|Ladder 25/.test(doc));
});

test('L26-SEAM-7: Law VI + Fundacion write barrier posture', () => {
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/
  ];

  const filesToCheck = [
    'src/core/traceability/spec-code-traceability-port.js',
    'src/core/evidence/evidence-binding-port.js',
    'src/core/artifacts/artifact-attestation-port.js',
    'src/core/release/release-integrity-port.js',
    'tests/eos-ladder26-seam-pack.test.js'
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
