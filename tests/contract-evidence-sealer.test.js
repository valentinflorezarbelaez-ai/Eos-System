import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { ContractEvidenceSealer, EARS_PATTERNS } from '../src/core/formal/contract-evidence-sealer.js';
import { RelationalTraceabilityMatrix, TRACE_LAYERS, RELATION_TYPES } from '../src/core/ontology/relational-traceability-matrix.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('ContractEvidenceSealer (Formal Closed-Loop Cryptographic Provenance)', () => {
  let tempDir;
  let tempSpecsDir;
  let tempEvidenceDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-sealer-test-'));
    tempSpecsDir = path.join(tempDir, 'docs', 'specs');
    tempEvidenceDir = path.join(tempDir, 'docs', 'evidence');
    fs.mkdirSync(tempSpecsDir, { recursive: true });
    fs.mkdirSync(tempEvidenceDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Contract Discovery & EARS Syntax Validation', () => {
    it('should discover specifications in the control plane docs/specs directory', () => {
      const sealer = new ContractEvidenceSealer({ controlPlaneRoot: rootDir });
      const spec = sealer.findSpec('EOS-TRACEABILITY-AND-BLAST-RADIUS-SPEC');
      assert.ok(spec, 'Must discover existing spec by filename/ID');
      assert.match(spec.relativePath, /docs\/specs\/EOS-TRACEABILITY-AND-BLAST-RADIUS-SPEC\.md/);
      assert.ok(spec.content.length > 100);
    });

    it('should validate formal EARS patterns in English and Spanish', () => {
      const sealer = new ContractEvidenceSealer({ controlPlaneRoot: tempDir });

      const englishEars = `
# SPEC-001
WHEN an event occurs, SHALL the system respond deterministically.
WHERE state is active, the system SHALL log metrics.
`;
      const spanishEars = `
# SPEC-002
CUANDO el usuario envíe una solicitud, EL SISTEMA procesará el lote.
MIENTRAS el nodo esté activo, EL SISTEMA mantendrá el pulso.
`;
      const invalidSpec = `
# Random Notes
Just some random thoughts without any formal requirements or EARS structure.
`;

      const checkEn = sealer.validateEarsContract(englishEars);
      assert.equal(checkEn.valid, true);
      assert.ok(checkEn.matchedPatterns.length >= 2);

      const checkEs = sealer.validateEarsContract(spanishEars);
      assert.equal(checkEs.valid, true);
      assert.ok(checkEs.matchedPatterns.length >= 2);

      const checkInvalid = sealer.validateEarsContract(invalidSpec);
      assert.equal(checkInvalid.valid, false);
      assert.equal(checkInvalid.matchedPatterns.length, 0);
    });

    it('should reject sealing if specification does not exist', () => {
      const sealer = new ContractEvidenceSealer({ controlPlaneRoot: tempDir });
      assert.throws(() => {
        sealer.sealContractEvidence({
          specId: 'SPEC-NON-EXISTENT-404'
        });
      }, /CONTRACT_SPEC_NOT_FOUND/);
    });

    it('should reject sealing if specification lacks formal EARS contract', () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-INFORMAL.md');
      fs.writeFileSync(specFile, '# Unstructured Spec\nNo keywords here.', 'utf8');

      const sealer = new ContractEvidenceSealer({
        controlPlaneRoot: tempDir,
        specsDir: tempSpecsDir,
        evidenceDir: tempEvidenceDir
      });

      assert.throws(() => {
        sealer.sealContractEvidence({
          specId: 'SPEC-INFORMAL'
        });
      }, /CONTRACT_SPEC_INVALID/);
    });
  });

  describe('Epistemic Law III Enforcement & Merkle Provenance', () => {
    it('should certify VERIFIED with HIGH confidence when exitCode is 0', () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-VALID.md');
      fs.writeFileSync(
        specFile,
        '# SPEC-VALID\nWHEN an input arrives, THE SYSTEM SHALL execute tests.',
        'utf8'
      );

      const sealer = new ContractEvidenceSealer({
        controlPlaneRoot: tempDir,
        specsDir: tempSpecsDir,
        evidenceDir: tempEvidenceDir
      });

      const result = sealer.sealContractEvidence({
        specId: 'SPEC-VALID',
        taskId: 'TASK-VALID-01',
        projectId: 'PRJ-TEST',
        command: 'node --test tests/sample.test.js',
        exitCode: 0,
        stdout: 'Tests passed: 5/5',
        stderr: '',
        claim: 'Deterministic execution proof'
      });

      assert.equal(result.success, true);
      assert.equal(result.record.status, 'VERIFIED');
      assert.equal(result.record.result, 'PASS');
      assert.equal(result.record.confidence, 'HIGH');
      assert.match(result.evidence_id, /^EVD-\d{4}$/);
      assert.match(result.seal_hash, /^sha256-[0-9a-f]{64}$/);
      assert.equal(fs.existsSync(result.path), true);

      // Verify file contents on disk
      const saved = JSON.parse(fs.readFileSync(result.path, 'utf8'));
      assert.equal(saved.id, result.evidence_id);
      assert.equal(saved.status, 'VERIFIED');
      assert.equal(saved.related_spec, 'docs/specs/SPEC-VALID.md');
      assert.equal(saved.related_task, 'TASK-VALID-01');
      assert.equal(saved.related_project, 'PRJ-TEST');
    });

    it('should deny VERIFIED status and assign NOT VERIFIED when exitCode is non-zero', () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-FAILING.md');
      fs.writeFileSync(
        specFile,
        '# SPEC-FAILING\nCUANDO el test falle, EL SISTEMA denegará la verificación.',
        'utf8'
      );

      const sealer = new ContractEvidenceSealer({
        controlPlaneRoot: tempDir,
        specsDir: tempSpecsDir,
        evidenceDir: tempEvidenceDir
      });

      const result = sealer.sealContractEvidence({
        specId: 'SPEC-FAILING',
        command: 'node --test failing.test.js',
        exitCode: 1,
        stdout: '',
        stderr: 'AssertionError: expected true but got false',
        claim: 'Failed test case'
      });

      assert.equal(result.success, false);
      assert.equal(result.record.status, 'NOT VERIFIED');
      assert.equal(result.record.result, 'FAIL');
      assert.equal(result.record.confidence, 'LOW');
    });

    it('should auto-increment sequential evidence IDs (EVD-0001, EVD-0002)', () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-SEQ.md');
      fs.writeFileSync(specFile, 'WHEN triggered, SHALL advance sequence.', 'utf8');

      const sealer = new ContractEvidenceSealer({
        controlPlaneRoot: tempDir,
        specsDir: tempSpecsDir,
        evidenceDir: tempEvidenceDir
      });

      const res1 = sealer.sealContractEvidence({ specId: 'SPEC-SEQ' });
      assert.equal(res1.evidence_id, 'EVD-0001');

      const res2 = sealer.sealContractEvidence({ specId: 'SPEC-SEQ' });
      assert.equal(res2.evidence_id, 'EVD-0002');
    });

    it('should support dryRun without writing to disk', () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-DRY.md');
      fs.writeFileSync(specFile, 'WHEN dry run is set, SHALL NOT write to disk.', 'utf8');

      const sealer = new ContractEvidenceSealer({
        controlPlaneRoot: tempDir,
        specsDir: tempSpecsDir,
        evidenceDir: tempEvidenceDir
      });

      const result = sealer.sealContractEvidence({
        specId: 'SPEC-DRY',
        dryRun: true
      });

      assert.equal(result.evidence_id, 'EVD-0001');
      assert.equal(fs.existsSync(result.path), false);
    });
  });

  describe('Relational Traceability Matrix L1-L3-L6 Bidirectional Linkage', () => {
    it('should link L6 Evidence to L1 Spec and L3 Task via SEALED_BY / CERTIFIES', () => {
      const rtm = new RelationalTraceabilityMatrix({ controlPlaneRoot: tempDir });

      // Create an L1 spec node
      rtm.addNode({
        id: 'SPEC-TRACE-01',
        layer: TRACE_LAYERS.L1_SPEC,
        type: 'EARS_SPEC',
        title: 'Spec: Traceability Test',
        path: 'docs/specs/SPEC-TRACE-01.md'
      });

      // Create an L3 task node
      rtm.addNode({
        id: 'TASK-TRACE-01',
        layer: TRACE_LAYERS.L3_TASK,
        type: 'TASK_DAG',
        title: 'Task: Traceability Test',
        path: 'docs/tasks/TASK-TRACE-01.md'
      });

      // Create an L6 evidence node with contract provenance
      rtm.addNode({
        id: 'EVD-0099',
        layer: TRACE_LAYERS.L6_EVIDENCE,
        type: 'EVIDENCE_RECEIPT',
        title: 'Evidence [EVD-0099]: Sealed contract proof',
        path: 'docs/evidence/EVD-0099.json'
      });

      // Connect spec and task to evidence
      rtm.addEdge('SPEC-TRACE-01', 'EVD-0099', RELATION_TYPES.SEALED_BY, RELATION_TYPES.CERTIFIES);
      rtm.addEdge('TASK-TRACE-01', 'EVD-0099', RELATION_TYPES.SEALED_BY, RELATION_TYPES.CERTIFIES);

      // Verify forward connections
      const specEdges = rtm.forwardEdges.get('SPEC-TRACE-01') || [];
      assert.ok(specEdges.some(e => e.target === 'EVD-0099' && e.relation === RELATION_TYPES.SEALED_BY));

      const taskEdges = rtm.forwardEdges.get('TASK-TRACE-01') || [];
      assert.ok(taskEdges.some(e => e.target === 'EVD-0099' && e.relation === RELATION_TYPES.SEALED_BY));

      // Verify reverse certifications
      const evdReverse = rtm.reverseEdges.get('EVD-0099') || [];
      assert.ok(evdReverse.some(e => e.source === 'SPEC-TRACE-01' && e.relation === RELATION_TYPES.CERTIFIES));
      assert.ok(evdReverse.some(e => e.source === 'TASK-TRACE-01' && e.relation === RELATION_TYPES.CERTIFIES));
    });
  });

  describe('MissionCLI (eos seal command integration)', () => {
    it('should return error when --spec is missing', async () => {
      const cli = new MissionCLI({ controlPlaneRoot: tempDir });
      const res = await cli.run(['seal']);
      assert.equal(res.success, false);
      assert.match(res.output, /--spec <specId\|path> is required/);
    });

    it('should seal formal evidence from CLI with --json output', async () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-CLI.md');
      fs.writeFileSync(specFile, 'WHEN CLI is called, THE SYSTEM SHALL seal evidence.', 'utf8');

      const cli = new MissionCLI({ controlPlaneRoot: tempDir });
      const res = await cli.run([
        'seal',
        '--spec', 'SPEC-CLI',
        '--task', 'TASK-CLI-01',
        '--project', 'PRJ-CLI-TEST',
        '--json'
      ]);

      assert.equal(res.success, true);
      assert.ok(res.data);
      assert.equal(res.data.record.related_spec, 'docs/specs/SPEC-CLI.md');
      assert.equal(res.data.record.related_task, 'TASK-CLI-01');
      assert.equal(res.data.record.status, 'VERIFIED');
    });

    it('should render structured text receipt on normal CLI invocation', async () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-CLI-TEXT.md');
      fs.writeFileSync(specFile, 'CUANDO se invoque sin json, EL SISTEMA emitirá un recibo en texto.', 'utf8');

      const cli = new MissionCLI({ controlPlaneRoot: tempDir });
      const res = await cli.run([
        'seal',
        '--spec', 'SPEC-CLI-TEXT'
      ]);

      assert.equal(res.success, true);
      assert.match(res.output, /EOS CONTRACT-BASED EVIDENCE SEALING RECEIPT/);
      assert.match(res.output, /Evidence ID:\s+EVD-\d{4}/);
      assert.match(res.output, /Cryptographic Seal:\s+sha256-[0-9a-f]{64}/);
    });
  });
});
