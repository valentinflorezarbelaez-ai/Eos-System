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
    const res = await cli.run(['simplify', '--project', 'PRJ-APP-FUERZA', '--json']);
    assert.equal(res.success, true);
    const parsed = JSON.parse(res.output);
    assert.ok(parsed.filesAnalyzed > 0);
  });
});
