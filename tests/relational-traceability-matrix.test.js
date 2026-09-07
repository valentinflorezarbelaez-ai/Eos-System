import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  RelationalTraceabilityMatrix,
  TRACE_LAYERS,
  RELATION_TYPES,
  RISK_TIERS
} from '../src/core/ontology/relational-traceability-matrix.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

test('RelationalTraceabilityMatrix - Unit & Integration Test Suite', async (t) => {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-rtm-test-'));
  const controlPlaneRoot = path.join(tmpBase, 'control-plane');

  // Create standard directories
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'projects', 'registrations'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'intake', 'synthetic-app'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'specs', 'synthetic-app'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'src', 'synthetic'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'tests', 'synthetic'), { recursive: true });

  // 1. Setup synthetic project files
  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'projects', 'registrations', 'synthetic-app.json'),
    JSON.stringify({
      project_id: 'PRJ-SYNTHETIC-APP',
      name: 'Synthetic App',
      path: controlPlaneRoot,
      documentation: ['docs/intake/synthetic-app/PROJECT_CONTEXT.md']
    }),
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'intake', 'synthetic-app', 'PROJECT_CONTEXT.md'),
    '# Context for Synthetic App\nBusiness goals and requirements.',
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'specs', 'synthetic-app', 'SPEC-SYNTH-001.md'),
    '# [SPEC-SYNTH-001]: Core Capability\nCUANDO el usuario envia mensaje, EL SISTEMA responde.',
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'plans', 'PLAN-SYNTH-001.md'),
    '# [PLAN-SYNTH-001]: Architecture Plan\nReferences SPEC-SYNTH-001.',
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'tasks', 'TASKS-SYNTH-001.md'),
    '# [TASK-SYNTH-001]: Implementation DAG\nReferences PLAN-SYNTH-001.',
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'src', 'synthetic', 'engine.js'),
    'export class SynthEngine { run() { return true; } }',
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'tests', 'synthetic', 'engine.test.js'),
    "import { SynthEngine } from '../../src/synthetic/engine.js';\n// test",
    'utf8'
  );

  fs.writeFileSync(
    path.join(controlPlaneRoot, 'docs', 'evidence', 'EVD-SYNTH-001.json'),
    JSON.stringify({
      id: 'EVD-SYNTH-001',
      claim: 'Synthetic test pass',
      status: 'VERIFIED',
      command: 'node --test tests/synthetic/engine.test.js',
      data: {
        projectId: 'PRJ-SYNTHETIC-APP',
        proxyResults: [{ path: 'src/synthetic/engine.js' }]
      },
      sha256: 'sha256-mock-hash-value'
    }),
    'utf8'
  );

  const rtm = new RelationalTraceabilityMatrix({ controlPlaneRoot });

  await t.test('instantiates with empty state and validates node contracts', () => {
    assert.throws(() => rtm.addNode({}), /INVALID_TRACE_NODE/);
    assert.throws(() => rtm.addNode({ id: 'N1', layer: 'INVALID_LAYER' }), /INVALID_TRACE_LAYER/);

    const node = rtm.addNode({
      id: 'TEST-NODE',
      layer: TRACE_LAYERS.L4_CODE,
      type: 'SOURCE_CODE',
      title: 'Test Node',
      path: 'src/test.js'
    });

    assert.equal(node.id, 'TEST-NODE');
    assert.equal(node.layer, TRACE_LAYERS.L4_CODE);
    assert.ok(rtm.nodes.has('TEST-NODE'));
  });

  await t.test('creates bidirectional edges between nodes', () => {
    rtm.clear();
    rtm.addNode({ id: 'A', layer: TRACE_LAYERS.L0_INTAKE });
    rtm.addNode({ id: 'B', layer: TRACE_LAYERS.L1_SPEC });

    rtm.addEdge('A', 'B', RELATION_TYPES.INFORMS, RELATION_TYPES.DERIVED_FROM);

    const forward = rtm.forwardEdges.get('A');
    assert.equal(forward.length, 1);
    assert.equal(forward[0].target, 'B');
    assert.equal(forward[0].relation, RELATION_TYPES.INFORMS);

    const reverse = rtm.reverseEdges.get('B');
    assert.equal(reverse.length, 1);
    assert.equal(reverse[0].source, 'A');
    assert.equal(reverse[0].relation, RELATION_TYPES.DERIVED_FROM);
  });

  await t.test('builds full 7-layer matrix on synthetic project fixture', () => {
    const summary = rtm.buildProjectMatrix('PRJ-SYNTHETIC-APP');
    assert.equal(summary.project_id, 'PRJ-SYNTHETIC-APP');
    assert.ok(summary.total_nodes >= 6, `Expected >= 6 nodes, got ${summary.total_nodes}`);

    // Verify all 7 layers have nodes
    assert.ok(summary.nodes_by_layer[TRACE_LAYERS.L0_INTAKE] >= 1);
    assert.ok(summary.nodes_by_layer[TRACE_LAYERS.L1_SPEC] >= 1);
    assert.ok(summary.nodes_by_layer[TRACE_LAYERS.L2_PLAN] >= 1);
    assert.ok(summary.nodes_by_layer[TRACE_LAYERS.L3_TASK] >= 1);
    assert.ok(summary.nodes_by_layer[TRACE_LAYERS.L4_CODE] >= 1);
    assert.ok(summary.nodes_by_layer[TRACE_LAYERS.L5_TEST] >= 1);
    assert.ok(summary.nodes_by_layer[TRACE_LAYERS.L6_EVIDENCE] >= 1);

    // Verify tree formatter output
    const tree = rtm.formatTraceTree(summary);
    assert.ok(tree.includes('EOS RELATIONAL TRACEABILITY MATRIX'));
    assert.ok(tree.includes('L0: BUSINESS INTAKE'));
    assert.ok(tree.includes('L6: CRYPTOGRAPHIC EVIDENCE'));
  });

  await t.test('calculates blast radius on source file mutation', () => {
    rtm.buildProjectMatrix('PRJ-SYNTHETIC-APP');
    const blast = rtm.calculateEntityBlastRadius('src/synthetic/engine.js');

    assert.equal(blast.target_entity, 'FILE:src/synthetic/engine.js');
    assert.equal(blast.target_layer, TRACE_LAYERS.L4_CODE);
    assert.ok(blast.tests_to_revalidate.length >= 1);
    assert.ok(blast.tests_to_revalidate.some(t => t.includes('engine.test.js')));
    assert.ok(blast.invalidated_evidence.length >= 1);
    assert.ok(blast.invalidated_evidence.some(e => e.id === 'EVD-SYNTH-001'));
    assert.ok(blast.sha256);

    const formatted = rtm.formatBlastRadius(blast);
    assert.ok(formatted.includes('CAUSAL BLAST RADIUS & IMPACT ANALYSIS'));
    assert.ok(formatted.includes('TESTS TO REVALIDATE'));
    assert.ok(formatted.includes('INVALIDATED EVIDENCE RECEIPTS'));
  });

  await t.test('escalates risk tier to CRITICAL for constitutional/governance mutations', () => {
    const blast = rtm.calculateEntityBlastRadius('CONSTITUTION.md');
    assert.equal(blast.risk_tier, RISK_TIERS.CRITICAL);
    assert.equal(blast.recommended_action, 'REQUIRE_HITL_GATE_AND_FULL_REGRESSION');
  });

  await t.test('CLI integration: runs eos trace commands', async () => {
    const cli = new MissionCLI({
      baseDir: process.cwd(),
      controlPlaneRoot: process.cwd()
    });

    // 1. eos trace --project PRJ-APP-FUERZA
    const traceProjectRes = await cli.run(['trace', '--project', 'PRJ-APP-FUERZA']);
    assert.equal(traceProjectRes.success, true);
    assert.ok(traceProjectRes.output.includes('EOS RELATIONAL TRACEABILITY MATRIX: [PRJ-APP-FUERZA]'));
    assert.ok(traceProjectRes.output.includes('EVD-0060'));

    // 2. eos trace --project PRJ-APP-FUERZA --json
    const traceJsonRes = await cli.run(['trace', '--project', 'PRJ-APP-FUERZA', '--json']);
    assert.equal(traceJsonRes.success, true);
    const parsed = JSON.parse(traceJsonRes.output);
    assert.equal(parsed.summary.project_id, 'PRJ-APP-FUERZA');
    assert.ok(parsed.nodes.length > 0);
    assert.ok(parsed.edges.length > 0);

    // 3. eos trace --file src/core/runtime/project-pipeline-runner.js
    const traceFileRes = await cli.run(['trace', '--file', 'src/core/runtime/project-pipeline-runner.js']);
    assert.equal(traceFileRes.success, true);
    assert.ok(traceFileRes.output.includes('EOS CAUSAL BLAST RADIUS'));
    assert.ok(traceFileRes.output.includes('TESTS TO REVALIDATE'));

    // 4. eos trace --project PRJ-APP-FUERZA --audit
    const traceAuditRes = await cli.run(['trace', '--project', 'PRJ-APP-FUERZA', '--audit']);
    assert.equal(traceAuditRes.success, true);
    assert.ok(traceAuditRes.output.includes('EOS RELATIONAL INTEGRITY AUDIT'));
    assert.ok(traceAuditRes.output.includes('Health Score'));
  });

  await t.test('surgical granular linking: isolates multi-branch specifications and tasks', () => {
    // Add Branch 2 into synthetic project
    fs.writeFileSync(
      path.join(controlPlaneRoot, 'docs', 'specs', 'synthetic-app', 'SPEC-SYNTH-002.md'),
      '# [SPEC-SYNTH-002]: Auth Subsystem\nCUANDO usuario inicia sesion, EL SISTEMA autentica.',
      'utf8'
    );
    fs.writeFileSync(
      path.join(controlPlaneRoot, 'docs', 'plans', 'PLAN-SYNTH-002.md'),
      '# [PLAN-SYNTH-002]: Auth Architecture\nExplicitly architects SPEC-SYNTH-002 only.',
      'utf8'
    );
    fs.writeFileSync(
      path.join(controlPlaneRoot, 'docs', 'tasks', 'TASKS-SYNTH-002.md'),
      '# [TASK-SYNTH-002]: Auth Implementation\nDecomposed from PLAN-SYNTH-002.\nTouches src/synthetic/auth.js.',
      'utf8'
    );
    fs.writeFileSync(
      path.join(controlPlaneRoot, 'src', 'synthetic', 'auth.js'),
      'export class SynthAuth { authenticate() { return true; } }',
      'utf8'
    );
    fs.writeFileSync(
      path.join(controlPlaneRoot, 'tests', 'synthetic', 'auth.test.js'),
      "import { SynthAuth } from '../../src/synthetic/auth.js';\n// auth test",
      'utf8'
    );

    rtm.buildProjectMatrix('PRJ-SYNTHETIC-APP');

    // 1. Verify surgical plan isolation: PLAN-SYNTH-001 connects to SPEC-SYNTH-001, not SPEC-SYNTH-002
    const plan1Incoming = (rtm.reverseEdges.get('PLAN-SYNTH-001') || []).map(e => e.source);
    assert.ok(plan1Incoming.includes('SPEC-SYNTH-001'), 'PLAN-001 should connect to SPEC-001');
    assert.ok(!plan1Incoming.includes('SPEC-SYNTH-002'), 'PLAN-001 MUST NOT connect to SPEC-002');

    // 2. Verify surgical plan isolation: PLAN-SYNTH-002 connects to SPEC-SYNTH-002, not SPEC-SYNTH-001
    const plan2Incoming = (rtm.reverseEdges.get('PLAN-SYNTH-002') || []).map(e => e.source);
    assert.ok(plan2Incoming.includes('SPEC-SYNTH-002'), 'PLAN-002 should connect to SPEC-002');
    assert.ok(!plan2Incoming.includes('SPEC-SYNTH-001'), 'PLAN-002 MUST NOT connect to SPEC-001');

    // 3. Verify surgical task isolation
    const task1Incoming = (rtm.reverseEdges.get('TASK-SYNTH-001') || []).map(e => e.source);
    assert.ok(task1Incoming.includes('PLAN-SYNTH-001'));
    assert.ok(!task1Incoming.includes('PLAN-SYNTH-002'));

    const task2Incoming = (rtm.reverseEdges.get('TASK-SYNTH-002') || []).map(e => e.source);
    assert.ok(task2Incoming.includes('PLAN-SYNTH-002'));
    assert.ok(!task2Incoming.includes('PLAN-SYNTH-001'));

    // 4. Verify surgical task -> code isolation
    const task2Out = (rtm.forwardEdges.get('TASK-SYNTH-002') || []).map(e => e.target);
    assert.ok(task2Out.includes('FILE:src/synthetic/auth.js'), 'TASK-002 touches auth.js');
    assert.ok(!task2Out.includes('FILE:src/synthetic/engine.js'), 'TASK-002 MUST NOT touch engine.js');

    // 5. Verify blast radius on auth.js does NOT invalidate engine test or evidence
    const authBlast = rtm.calculateEntityBlastRadius('src/synthetic/auth.js');
    assert.ok(!authBlast.tests_to_revalidate.some(t => t.includes('engine.test.js')));
    assert.ok(!authBlast.invalidated_evidence.some(e => e.id === 'EVD-SYNTH-001'));
  });

  await t.test('audits relational integrity and detects structural gaps', () => {
    const audit = rtm.auditRelationalIntegrity('PRJ-SYNTHETIC-APP');
    assert.equal(audit.project_id, 'PRJ-SYNTHETIC-APP');
    assert.ok(audit.health_score >= 50);
    assert.ok(audit.status);
    assert.ok(Array.isArray(audit.recommendations));

    // Verify formatRelationalAudit output
    const formatted = rtm.formatRelationalAudit(audit);
    assert.ok(formatted.includes('EOS RELATIONAL INTEGRITY AUDIT'));
    assert.ok(formatted.includes('Health Score'));
    assert.ok(formatted.includes('GAPS BREAKDOWN'));
    assert.ok(formatted.includes('ACTIONABLE RECOMMENDATIONS'));

    // Inject an orphan spec without plan/tasks
    fs.writeFileSync(
      path.join(controlPlaneRoot, 'docs', 'specs', 'synthetic-app', 'SPEC-SYNTH-ORPHAN.md'),
      '# [SPEC-SYNTH-ORPHAN]: Orphan Capability\nNo architecture plan decomposes this.',
      'utf8'
    );

    const auditWithOrphan = rtm.auditRelationalIntegrity('PRJ-SYNTHETIC-APP');
    assert.ok(auditWithOrphan.gaps.orphan_specs.some(s => s.id === 'SPEC-SYNTH-ORPHAN'));
  });
});
