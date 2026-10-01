import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExecutiveDossierEngine } from '../src/core/reporting/executive-dossier-engine.js';

describe('EOS ExecutiveDossierEngine', () => {
  const engine = new ExecutiveDossierEngine({ controlPlaneRoot: process.cwd() });

  test('resolveProject resolves existing projects and returns null for unknown', () => {
    const fuerza = engine.resolveProject('PRJ-APP-FUERZA');
    assert.ok(fuerza);
    assert.equal(fuerza.project_id, 'PRJ-APP-FUERZA');

    const fundacion = engine.resolveProject('PRJ-FUNDACION');
    assert.ok(fundacion);
    assert.equal(fundacion.project_id, 'PRJ-FUNDACION');

    const unknown = engine.resolveProject('PRJ-NONEXISTENT-XYZ');
    assert.equal(unknown, null);
  });

  test('compileProjectDossier succeeds for PRJ-APP-FUERZA with 100% readiness', () => {
    const res = engine.compileProjectDossier('PRJ-APP-FUERZA', { save: false });
    assert.ok(res.dossier);
    assert.equal(res.dossier.projectId, 'PRJ-APP-FUERZA');
    assert.equal(res.dossier.technicalStatus, 'VERIFIED');
    assert.equal(res.dossier.readiness.score, 100);
    assert.ok(res.dossier.evidenceSeals.length > 0);
    assert.ok(res.dossier.architecturalDefenses.length >= 3);
    assert.ok(res.terminalOutput.includes('EOS EXECUTIVE DOSSIER: [PRJ-APP-FUERZA]'));
    assert.ok(res.markdownOutput.includes('# Executive Dossier:'));
  });

  test('compileProjectDossier succeeds for PRJ-FUNDACION with verified status', () => {
    const res = engine.compileProjectDossier('PRJ-FUNDACION', { save: false });
    assert.ok(res.dossier);
    assert.equal(res.dossier.projectId, 'PRJ-FUNDACION');
    assert.equal(res.dossier.technicalStatus, 'VERIFIED');
    assert.ok(res.dossier.readiness.score >= 80);
    assert.ok(res.dossier.evidenceSeals.length > 0);
    assert.ok(res.terminalOutput.includes('FUNDACIÓN'));
  });

  test('compileProjectDossier throws for unregistered project', () => {
    assert.throws(() => {
      engine.compileProjectDossier('PRJ-DOES-NOT-EXIST');
    }, /PROJECT_NOT_FOUND/);
  });

  test('compileFleetDossier aggregates all registered projects', () => {
    const res = engine.compileFleetDossier({ save: false });
    assert.ok(res.fleetData);
    assert.ok(res.fleetData.totalProjects >= 8);
    assert.ok(res.fleetData.verifiedProjects >= 4);
    assert.ok(res.fleetData.avgReadiness > 50);
    assert.ok(res.terminalOutput.includes('EOS FLEET EXECUTIVE SITUATION REPORT'));
    assert.ok(res.markdownOutput.includes('# EOS Fleet Executive Situation Report'));
  });

  test('compileProjectDossier with save=true generates markdown file on disk', (t) => {
    const tmpReports = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-dossier-'));
    t.after(() => fs.rmSync(tmpReports, { recursive: true, force: true }));
    const isolated = new ExecutiveDossierEngine({ controlPlaneRoot: process.cwd() });
    isolated.reportsDir = tmpReports;

    const res = isolated.compileProjectDossier('PRJ-APP-FUERZA', { save: true });
    assert.ok(res.savedPath);
    assert.equal(path.dirname(res.savedPath), tmpReports);
    assert.ok(fs.existsSync(res.savedPath));
    const content = fs.readFileSync(res.savedPath, 'utf8');
    assert.ok(content.includes('PRJ-APP-FUERZA'));
    assert.ok(content.includes('Storage Layer: LocalStorage vs IndexedDB'));
  });
});
