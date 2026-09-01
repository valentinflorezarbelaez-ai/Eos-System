/**
     * EOS Exhaustive Red Team & Adversarial Bypass Verification Suite
     * Validates fail-closed enforcement across the 7 critical attack vectors:
     * 1. Manual Phase Tampering (Disk modification & snapshot hash divergence)
     * 2. Skip HITL Gate (Transition requiring HITL receipt without receipt)
     * 3. Unauthorized MCP Tool Execution (Insufficent autonomy / read-only write attempt)
     * 4. External Target Boundary Breach (Fundacion mutation barrier Δ=0)
     * 5. Secret Leakage Injection in Return Package (Bearer tokens, API keys, private keys)
     * 6. Nonce Replay Attack in Return Package
     * 7. Epistemic Contradiction / Forced Close without Evidence
     */
    import test from 'node:test';
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import os from 'node:os';

    import { AuthorityTruthSource } from '../src/core/authority/authority-truth-source.js';
    import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';
    import { SDD_STATES } from '../src/core/sdd/sdd-fsm-engine.js';
    import { EosMcpServer } from '../src/mcp-server.js';
    import { CursorReturnIngestionEngine } from '../src/core/adapters/cursor-return-ingestion-engine.js';
    import { McpMissionBridge } from '../src/core/mcp/mcp-mission-bridge.js';
    import { IntegrationGatekeeper } from '../src/core/governance/integration-gatekeeper.js';

    function createSandbox() {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-bypass-'));
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'eos-bypass-sandbox', type: 'module' }));
      fs.mkdirSync(path.join(root, 'src'));
      return root;
    }

    test('BYPASS-01 [MANUAL PHASE TAMPERING]: Direct mutation of mission-package.json is detected and rejected', () => {
      const root = createSandbox();
      const rt = new MissionRuntime({ baseDir: root });
      const created = rt.createMission({ goal: 'Adversarial phase tampering attempt', projectPath: '.' });
      const missionId = created.mission_id;

      const missionDir = path.join(root, '.missions', missionId);
      const pkgPath = path.join(missionDir, 'mission-package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      // Attack: Attacker edits phase directly on disk to OPERATE_AND_LEARN
      pkg.phase = SDD_STATES.OPERATE_AND_LEARN;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

      // Verification: Authority snapshot remains the source of truth (VISION_INTAKE)
      const snap = rt.ats.getSnapshot(missionId);
      assert.equal(snap.state, SDD_STATES.VISION_INTAKE, 'AuthorityTruthSource must not recognize unauthorized disk phase mutation');

      // Cryptographic verification must flag discrepancies / tampered files
      const verification = rt.verifyMission(missionId);
      assert.equal(verification.valid, false, 'verifyMission must fail when mission-package.json hash differs from manifest');
      assert.ok(verification.discrepancies.some(d => d.includes('mission-package.json')));
    });

    test('BYPASS-02 [SKIP HITL GATE]: Advancing through HUMAN_DIRECTION_GATE without valid receipt is denied', () => {
      const root = createSandbox();
      const rt = new MissionRuntime({ baseDir: root });
      const created = rt.createMission({ goal: 'Adversarial HITL skip attempt', projectPath: '.' });
      const missionId = created.mission_id;

      // Plan mission with requireExternalHitl=true and no receipt provided
      assert.throws(() => {
        rt.planMission(missionId, { requireExternalHitl: true, hitlReceipt: null });
      }, /HITL_RECEIPT_REQUIRED|TRANSITION_DENIED/);

      // Verify state was NOT advanced
      const snap = rt.ats.getSnapshot(missionId);
      assert.notEqual(snap.state, SDD_STATES.PLAN);
    });

    test('BYPASS-03 [UNAUTHORIZED TOOL EXECUTION]: MCP Server blocks ledger mutation under read-only mode and insufficient autonomy', async () => {
      const root = createSandbox();
      const bridge = new McpMissionBridge({ baseDir: root });
      const server = new EosMcpServer(null, { bridge, baseDir: root });

      // Scenario A: Read-only mode blocks mutating tools
      const readOnlyEnv = { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_2', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
      const res1 = await server.handleToolCall('eos.mission.start', { goal: 'Unauthorized start', projectPath: root }, readOnlyEnv);
      assert.equal(res1.status, 'DENIED');
      assert.equal(res1.reason, 'READ_ONLY_MODE_BLOCKS_LEDGER_WRITE');

      // Scenario B: LEVEL_0 blocks A1/A2 tools
      const lowAuthEnv = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_0', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
      const res2 = await server.handleToolCall('eos.evidence.record', { missionId: 'MIS-FAKE', evidence: {} }, lowAuthEnv);
      assert.equal(res2.status, 'DENIED');
      assert.ok(res2.reason.includes('INSUFFICIENT_AUTONOMY_LEVEL'));
    });

    test('BYPASS-04 [FUNDACION BOUNDARY BREACH]: Write attempts targeting Fundacion or protected governance are blocked', () => {
      const root = createSandbox();
      const bridge = new McpMissionBridge({ baseDir: root });

      const fundacionTarget = path.join(root, 'Fundacion', 'compromised.js');
      const barrierCheck = bridge.barrierCheck({ path: fundacionTarget });
      assert.equal(barrierCheck.allowed, false);
      assert.equal(barrierCheck.reason, 'PROTECTED_SURFACE');

      const govTarget = path.join(root, 'docs', 'governance', 'CONSTITUTION.md');
      const govCheck = bridge.barrierCheck({ path: govTarget });
      assert.equal(govCheck.allowed, false);
      assert.equal(govCheck.reason, 'PROTECTED_SURFACE');
    });

    test('BYPASS-05 [SECRET LEAKAGE INJECTION]: Return package containing tokens/keys is rejected', () => {
      const ingestion = new CursorReturnIngestionEngine();
      const taskContract = {
        mission_id: 'MIS-TEST-001',
        task_id: 'TASK-001',
        protected_surfaces: ['src/core/**']
      };

      const maliciousReturnPkg = {
        schema_version: '1.0.0',
        mission_id: 'MIS-TEST-001',
        task_id: 'TASK-001',
        status: 'COMPLETED',
        summary: 'Completed with leaked bearer token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake',
        affected_files: [{ path: 'src/app.js', action: 'MODIFY' }],
        diff: 'const token = "sk-12345678901234567890123456789012";',
        commands_executed: [],
        test_results: { total_tests: 1, passed_tests: 1, failed_tests: 0, pass_rate: 1.0 },
        evidence: [],
        unknowns: [],
        risks: []
      };

      const evalResult = ingestion.ingestAndEvaluate(maliciousReturnPkg, taskContract);
      assert.equal(evalResult.verdict, 'REJECT');
      assert.ok(evalResult.deviations.some(d => d.includes('SECRET_LEAKAGE_DETECTED')));
      assert.equal(evalResult.apply_diff_authorized, false);
    });

    test('BYPASS-06 [NONCE REPLAY ATTACK]: Replayed return package nonce is flagged and rejected', () => {
      const ingestion = new CursorReturnIngestionEngine();
      const taskContract = {
        mission_id: 'MIS-TEST-002',
        task_id: 'TASK-002',
        protected_surfaces: ['src/core/**']
      };

      const validPkg = {
        schema_version: '1.0.0',
        mission_id: 'MIS-TEST-002',
        task_id: 'TASK-002',
        nonce: 'NONCE-12345-ABCDE',
        status: 'COMPLETED',
        summary: 'Legitimate execution',
        affected_files: [{ path: 'src/app.js', action: 'MODIFY' }],
        diff: 'const x = 1;',
        commands_executed: ['npm test'],
        test_results: { total_tests: 5, passed_tests: 5, failed_tests: 0, pass_rate: 1.0 },
        evidence: [],
        unknowns: [],
        risks: []
      };

      // First ingestion: ACCEPT
      const firstResult = ingestion.ingestAndEvaluate(validPkg, taskContract);
      assert.equal(firstResult.verdict, 'ACCEPT');

      // Replay attempt with same nonce: REJECT
      const replayResult = ingestion.ingestAndEvaluate(validPkg, taskContract);
      assert.equal(replayResult.verdict, 'REJECT');
      assert.ok(replayResult.deviations.some(d => d.includes('REPLAY_ATTEMPT_DETECTED')));
    });

    test('BYPASS-07 [EPISTEMIC CONTRADICTION & FORCED CLOSE]: Unverified claims or tripped FDIR block completion', () => {
      const root = createSandbox();
      const gate = new IntegrationGatekeeper();
      const rt = new MissionRuntime({ baseDir: root, integrationGate: gate });
      const created = rt.createMission({ goal: 'Epistemic contradiction test', projectPath: '.' });
      rt.planMission(created.mission_id);

      // Scenario A: Attempt to close when FDIR safe mode is active
      gate.tripFdirKillSwitch('ADVERSARIAL_ANOMALY_DETECTED');
      assert.throws(() => {
        rt.closeMission(created.mission_id);
      }, /FDIR_SAFE_MODE|INTEGRATION_BLOCKED/);

      // Scenario B: Return package claims COMPLETED but has 2 failed tests
      const ingestion = new CursorReturnIngestionEngine();
      const contradictionPkg = {
        schema_version: '1.0.0',
        mission_id: created.mission_id,
        task_id: 'TASK-001',
        status: 'COMPLETED',
        summary: 'Claiming completed despite failing tests',
        affected_files: [{ path: 'src/app.js', action: 'MODIFY' }],
        diff: '+ fix',
        commands_executed: ['npm test'],
        test_results: { total_tests: 10, passed_tests: 8, failed_tests: 2, pass_rate: 0.8 },
        evidence: [],
        unknowns: [],
        risks: []
      };

      const taskContract = {
        mission_id: created.mission_id,
        task_id: 'TASK-001',
        protected_surfaces: ['src/core/**']
      };

      const evalRes = ingestion.ingestAndEvaluate(contradictionPkg, taskContract);
      assert.notEqual(evalRes.verdict, 'ACCEPT');
      assert.ok(evalRes.deviations.some(d => d.includes('EPISTEMIC_CONTRADICTION')));
    });
