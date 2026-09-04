import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MissionCLI } from '../src/cli/mission-cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const testWorkspaceDir = path.join(rootDir, '.eos/test_simplify_cli_workspace');

describe('EOS CLI Simplify Command Tests', () => {
  let cli;

  beforeEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testWorkspaceDir, { recursive: true });
    cli = new MissionCLI({ baseDir: testWorkspaceDir });
  });

  afterEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  });

  test('SIMPLIFY-CLI-01: CLI Help documents eos simplify command', async () => {
    const res = await cli.run(['--help']);
    assert.equal(res.success, true);
    assert.ok(res.output.includes('eos simplify [path|--project <id>]'));
    assert.ok(res.output.includes('First-principles code bloat analyzer'));
  });

  test('SIMPLIFY-CLI-02: Analyzes single clean file and returns clean report', async () => {
    const targetFile = path.join(rootDir, 'src', 'core', 'optimization', 'first-principles-simplifier-engine.js');
    const res = await cli.run(['simplify', targetFile]);

    assert.equal(res.success, true);
    assert.ok(res.output.includes('EOS FIRST-PRINCIPLES CODE SIMPLIFIER'));
    assert.ok(res.output.includes('Files Analyzed:        1'));
    assert.equal(res.data.fileResults.length, 1);
  });

  test('SIMPLIFY-CLI-03: Returns structured JSON output when --json flag is passed', async () => {
    const targetFile = path.join(rootDir, 'src', 'core', 'optimization', 'first-principles-simplifier-engine.js');
    const res = await cli.run(['simplify', targetFile, '--json']);

    assert.equal(res.success, true);
    const parsed = JSON.parse(res.output);
    assert.equal(parsed.filesAnalyzed, 1);
    assert.ok(typeof parsed.averageBloatIndex === 'number');
    assert.ok(Array.isArray(parsed.results));
  });

  test('SIMPLIFY-CLI-04: Flags bloated file and fails under --strict mode', async () => {
    const bloatedFile = path.join(testWorkspaceDir, 'bloated.js');
    // Code with pass-through wrappers and empty stubs
    const bloatedContent = `
class EmptyServiceStub {}
class RedundantWrapperStub {}

export class OverEngineeredFacade {
  constructor(underlying) {
    this.underlying = underlying;
  }
  async findOne(id) {
    return await this.underlying.findOne(id);
  }
  async findAll() {
    return await this.underlying.findAll();
  }
  async remove(id) {
    return await this.underlying.remove(id);
  }
}
`;
    fs.writeFileSync(bloatedFile, bloatedContent, 'utf8');

    const res = await cli.run(['simplify', bloatedFile, '--strict']);
    assert.equal(res.success, false);
    assert.ok(res.output.includes('HIGH BLOAT DETECTED'));
    assert.ok(res.data.overEngineeredCount >= 1);
  });

  test('SIMPLIFY-CLI-05: Resolves registered project via --project flag', async () => {
    const fixtureDir = path.join(testWorkspaceDir, 'fixture-project');
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, 'tiny.js'), 'export const ok = 1;\n', 'utf8');

    const regDir = path.join(testWorkspaceDir, 'docs', 'projects', 'registrations');
    fs.mkdirSync(regDir, { recursive: true });
    fs.writeFileSync(
      path.join(regDir, 'simplify-fixture.json'),
      JSON.stringify({
        project_id: 'PRJ-SIMPLIFY-FIXTURE',
        path: fixtureDir
      }),
      'utf8'
    );

    const res = await cli.run(['simplify', '--project', 'PRJ-SIMPLIFY-FIXTURE', '--json']);
    assert.equal(res.success, true);
    const parsed = JSON.parse(res.output);
    assert.ok(parsed.filesAnalyzed > 0);
    assert.ok(typeof parsed.averageBloatIndex === 'number');
    assert.ok(Array.isArray(parsed.results));
    assert.equal(typeof parsed.overEngineeredFilesCount, 'number');
    assert.ok(Array.isArray(res.data.fileResults));
    assert.ok(res.data.fileResults.length > 0);
  });

  test('SIMPLIFY-CLI-06: --json project-not-found returns JSON error object', async () => {
    const res = await cli.run(['simplify', '--project', 'PRJ-DOES-NOT-EXIST', '--json']);
    assert.equal(res.success, false);
    const parsed = JSON.parse(res.output);
    assert.ok(typeof parsed.error === 'string');
    assert.match(parsed.error, /PRJ-DOES-NOT-EXIST/);
  });

  test('SIMPLIFY-CLI-07: --json empty scan returns filesAnalyzed 0', async () => {
    const emptyDir = path.join(testWorkspaceDir, 'empty-project');
    fs.mkdirSync(emptyDir, { recursive: true });
    const regDir = path.join(testWorkspaceDir, 'docs', 'projects', 'registrations');
    fs.mkdirSync(regDir, { recursive: true });
    fs.writeFileSync(
      path.join(regDir, 'empty-fixture.json'),
      JSON.stringify({
        project_id: 'PRJ-SIMPLIFY-EMPTY',
        path: emptyDir
      }),
      'utf8'
    );

    const res = await cli.run(['simplify', '--project', 'PRJ-SIMPLIFY-EMPTY', '--json']);
    assert.equal(res.success, true);
    const parsed = JSON.parse(res.output);
    assert.equal(parsed.filesAnalyzed, 0);
    assert.equal(parsed.averageBloatIndex, 0);
    assert.equal(parsed.overEngineeredFilesCount, 0);
    assert.deepEqual(parsed.results, []);
  });
});
