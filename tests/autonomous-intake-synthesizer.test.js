import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AutonomousIntakeSynthesizer, EARS_PATTERNS } from '../src/core/sdd/autonomous-intake-synthesizer.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

describe('Autonomous Intake & EARS Specification Synthesizer (SPEC-EOS-006)', () => {
  let tmpDir;
  let synthesizer;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-intake-test-'));
    synthesizer = new AutonomousIntakeSynthesizer({ controlPlaneRoot: process.cwd() });
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('T1: Ambiguity Scanner identifies vague terms and offers metrics', () => {
    const vagueText = `
      El sistema debe ser muy rápido y óptimo en todo momento.
      La interfaz tiene que ser súper fácil y amigable, etc.
      También debe ser escalable y robusto sin caerse.
    `;

    const result = synthesizer.scanAmbiguities(vagueText);
    assert.equal(result.has_ambiguities, true);
    assert.ok(result.ambiguous_count >= 5, `Expected at least 5 ambiguous findings, got ${result.ambiguous_count}`);

    const terms = result.findings.map(f => f.term);
    assert.ok(terms.some(t => t.includes('rápido')));
    assert.ok(terms.some(t => t.includes('óptimo')));
    assert.ok(terms.some(t => t.includes('fácil')));
    assert.ok(terms.some(t => t.includes('amigable')));
    assert.ok(terms.some(t => t.includes('etc')));

    // Clean text has 0 ambiguities
    const cleanText = 'El sistema validará firmas HMAC-SHA256 con latencia menor a 50 milisegundos.';
    const cleanResult = synthesizer.scanAmbiguities(cleanText);
    assert.equal(cleanResult.has_ambiguities, false);
    assert.equal(cleanResult.ambiguous_count, 0);
  });

  test('T2: EARS Classifier formalizes all 4 canonical patterns', () => {
    const rawRequirements = `
      - Cuando el usuario presione el botón de pánico, el sistema alertará a la brigada de rescate.
      - Mientras el motor esté en modo calibración, el sistema deshabilitará la inyección de combustible.
      - Si ocurre un error de disco al escribir el registro, entonces el sistema conmutará a la partición de respaldo.
      - El sistema mantendrá cifrado en reposo para todos los archivos de configuración.
    `;

    const reqs = synthesizer.synthesizeEarsRequirements(rawRequirements);
    assert.equal(reqs.length, 4);

    // 1. EVENT_DRIVEN
    assert.equal(reqs[0].id, 'FR-01');
    assert.equal(reqs[0].type, EARS_PATTERNS.EVENT_DRIVEN);
    assert.ok(reqs[0].statement.startsWith('CUANDO'));

    // 2. STATE_DRIVEN
    assert.equal(reqs[1].id, 'FR-02');
    assert.equal(reqs[1].type, EARS_PATTERNS.STATE_DRIVEN);
    assert.ok(reqs[1].statement.startsWith('MIENTRAS'));

    // 3. ERROR_DRIVEN
    assert.equal(reqs[2].id, 'FR-03');
    assert.equal(reqs[2].type, EARS_PATTERNS.ERROR_DRIVEN);
    assert.ok(reqs[2].statement.startsWith('SI'));

    // 4. UBIQUITOUS
    assert.equal(reqs[3].id, 'FR-04');
    assert.equal(reqs[3].type, EARS_PATTERNS.UBIQUITOUS);
    assert.ok(reqs[3].statement.startsWith('EL SISTEMA'));
  });

  test('T3: BDD Scenario Derivation generates executable Gherkin contracts', () => {
    const reqs = [
      {
        id: 'FR-01',
        type: EARS_PATTERNS.EVENT_DRIVEN,
        trigger_or_state: 'el usuario pulsa guardar',
        response: 'el sistema escribe en disco'
      },
      {
        id: 'FR-02',
        type: EARS_PATTERNS.ERROR_DRIVEN,
        trigger_or_state: 'el token JWT expira',
        response: 'el sistema retornará HTTP 401'
      }
    ];

    const scenarios = synthesizer.generateBddScenarios(reqs, true);
    assert.equal(scenarios.length, 2);

    assert.equal(scenarios[0].id, 'SCN-01');
    assert.equal(scenarios[0].requirement_id, 'FR-01');
    assert.ok(scenarios[0].gherkin.includes('DADO'));
    assert.ok(scenarios[0].gherkin.includes('CUANDO'));
    assert.ok(scenarios[0].gherkin.includes('ENTONCES'));

    assert.equal(scenarios[1].id, 'SCN-02');
    assert.equal(scenarios[1].requirement_id, 'FR-02');
    assert.ok(scenarios[1].gherkin.includes('anomalía'));
  });

  test('T4: Complete Specification Package compiles with 10-D SDLC & Task DAG', () => {
    const rawInput = `
      - Cuando se reciba un paquete UDP, el sistema calculará su CRC32.
      - Si el CRC32 es inválido por error de paridad, el sistema descartará el paquete silenciosamente.
      - El sistema registrará métricas de paquetes descartados en memoria.
    `;

    const outDir = path.join(tmpDir, 'specs', 'test-proj');

    const pkg = synthesizer.compileFullSpecificationPackage({
      projectId: 'PRJ-NETWORK-GATEWAY',
      title: 'High Reliability UDP Ingestion Gateway',
      rawText: rawInput,
      outputDir: outDir,
      persistFiles: true
    });

    assert.equal(pkg.project_id, 'PRJ-NETWORK-GATEWAY');
    assert.equal(pkg.spec_id, 'SPEC-PRJ-NETWORK-GATEWAY');
    assert.ok(pkg.sha256 && pkg.sha256.length === 64);
    assert.equal(pkg.ears_requirements.length, 3);
    assert.equal(pkg.bdd_scenarios.length, 3);
    assert.ok(pkg.sdlc_envelope);
    assert.ok(pkg.task_dag);
    assert.equal(pkg.task_dag.total_tasks, 3);

    // Verify written files on disk
    assert.ok(fs.existsSync(path.join(outDir, 'spec.md')));
    assert.ok(fs.existsSync(path.join(outDir, 'plan.md')));
    assert.ok(fs.existsSync(path.join(outDir, 'tasks.md')));

    const specContent = fs.readFileSync(path.join(outDir, 'spec.md'), 'utf-8');
    assert.ok(specContent.includes('SPEC-PRJ-NETWORK-GATEWAY'));
    assert.ok(specContent.includes('FR-01 (EVENT_DRIVEN)'));
    assert.ok(specContent.includes('ESCENARIO SCN-01'));
  });

  test('T5: CLI Integration via eos intake --synthesize --json', async () => {
    const cli = new MissionCLI({ controlPlaneRoot: process.cwd() });

    const rawPrompt = "Cuando el webhook reciba ping, el sistema responderá pong en menos de 10ms.";
    const res = await cli.run(['intake', '--synthesize', '--input', rawPrompt, '--json']);

    assert.equal(res.success, true);
    assert.ok(res.data);
    assert.equal(res.data.ears_requirements.length, 1);
    assert.equal(res.data.ears_requirements[0].type, EARS_PATTERNS.EVENT_DRIVEN);

    // CLI human readable output
    const textRes = await cli.run(['intake', '--synthesize', '--input', rawPrompt]);
    assert.equal(textRes.success, true);
    assert.ok(textRes.output.includes('EOS AUTONOMOUS INTAKE & EARS SPECIFICATION SYNTHESIZER'));
    assert.ok(textRes.output.includes('STATUS: INTAKE SYNTHESIZED & LOCKED DETERMINISTICALLY'));
  });

  test('T6: CLI Integration with registered project intake docs (PRJ-APP-FUERZA)', async () => {
    const cli = new MissionCLI({ controlPlaneRoot: process.cwd() });
    const res = await cli.run(['intake', '--synthesize', '--project', 'PRJ-APP-FUERZA', '--json']);

    assert.equal(res.success, true);
    assert.ok(res.data);
    assert.equal(res.data.project_id, 'PRJ-APP-FUERZA');
    assert.ok(res.data.ears_requirements.length > 0);
  });
});
