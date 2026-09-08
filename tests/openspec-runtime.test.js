import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

const EXAMPLE = 'openspec/changes/dry-run-sdd-routing-example';
const LIDAR_COMMANDS = [
  'enrich-us.md',
  'propose.md',
  'ff.md',
  'apply.md',
  'verify.md',
  'adversarial-review.md',
  'archive.md',
  'commit.md'
];

test('OpenSpec layout exists: config, specs, and one example change', () => {
  for (const rel of [
    'openspec/config.yaml',
    'openspec/specs/engineering-discipline/spec.md',
    `${EXAMPLE}/proposal.md`,
    `${EXAMPLE}/design.md`,
    `${EXAMPLE}/tasks.md`,
    `${EXAMPLE}/specs/engineering-discipline/spec.md`,
    `${EXAMPLE}/.openspec.yaml`
  ]) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), `${rel} must exist`);
  }
});

test('openspec/config.yaml context references base-standards, backend-standards, and ai-specs', () => {
  const config = read('openspec/config.yaml');
  assert.match(config, /schema:\s*spec-driven/);
  assert.match(config, /docs\/base-standards\.md/);
  assert.match(config, /docs\/backend-standards\.md/);
  assert.match(config, /ai-specs\//);
});

test('example change is a dry-run scaffold, not a core-engine feature', () => {
  const proposal = read(`${EXAMPLE}/proposal.md`);
  assert.match(proposal, /dry-run|scaffold/i);
  assert.match(proposal, /NON-goals/i);
  const beforeNonGoals = proposal.split('## NON-goals')[0];
  assert.doesNotMatch(beforeNonGoals, /implement a new (orchestrator|engine)/i);
  const meta = read(`${EXAMPLE}/.openspec.yaml`);
  assert.match(meta, /schema:\s*spec-driven/);
});

test('ai-specs/ points at existing EOS agents and skills (no Gentle-AI installer)', () => {
  assert.ok(fs.existsSync(path.join(rootDir, 'ai-specs/README.md')));
  assert.ok(fs.existsSync(path.join(rootDir, 'ai-specs/agents/README.md')));
  assert.ok(fs.existsSync(path.join(rootDir, 'ai-specs/skills/README.md')));
  const index = read('ai-specs/README.md');
  assert.match(index, /docs\/agents/);
  assert.match(index, /\.agents\/skills/);
  assert.doesNotMatch(index, /Go installer/);
});

test('LIDR slash-command docs exist and do not replace Mission CLI', () => {
  for (const file of LIDAR_COMMANDS) {
    const rel = path.join('.cursor/commands', file);
    assert.ok(fs.existsSync(path.join(rootDir, rel)), `${rel} must exist`);
    const body = read(rel);
    assert.match(body, /eos:mission|bin\/eos\.js/);
    assert.match(body, /ADR-0010/);
  }
});

test('OpenSpec CLI helper stays outside L0 and does not add npm dependencies', () => {
  const helper = read('scripts/openspec-cli.js');
  assert.doesNotMatch(helper, /from ['"]@fission-ai\/openspec['"]/);
  assert.doesNotMatch(helper, /require\(['"]@fission-ai\/openspec['"]\)/);
  assert.match(helper, /spawn/);
  const pkg = JSON.parse(read('package.json'));
  assert.equal(Object.hasOwn(pkg, 'dependencies'), false);
  assert.equal(Object.hasOwn(pkg, 'devDependencies'), false);
  assert.match(pkg.scripts['openspec:cli'], /scripts\/openspec-cli\.js/);
  assert.ok(fs.existsSync(path.join(rootDir, 'docs/backend-standards.md')));
  assert.ok(fs.existsSync(path.join(rootDir, 'docs/manuals/OPENSPEC_RUNTIME.md')));
});

test('openspec:cli reports a docs-only install path when the CLI binary is absent', () => {
  const result = spawnSync(process.execPath, ['scripts/openspec-cli.js', '--version'], {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, PATH: '/usr/bin:/bin' }
  });
  if (result.status === 0) {
    assert.match(String(result.stdout), /openspec|^\d+\.\d+/i);
    return;
  }
  assert.equal(result.status, 2);
  assert.match(String(result.stderr), /docs\/manuals\/OPENSPEC_RUNTIME\.md/);
  assert.match(String(result.stderr), /not on PATH|not installed/i);
});

test('OpenSpec config prefers GWT and forbids treating EARS as a LIDR import', () => {
  const config = read('openspec/config.yaml');
  assert.match(config, /Given\/When\/Then/);
  assert.match(config, /\bEARS\b/);
  assert.match(config, /not a LIDR|not LIDR/i);
});

test('apply and archive docs require OpenSpec artifact update before archive', () => {
  const apply = read('.cursor/commands/apply.md');
  const archive = read('.cursor/commands/archive.md');
  const runtime = read('docs/manuals/OPENSPEC_RUNTIME.md');
  assert.match(apply, /opsx:apply|\/opsx-apply/);
  assert.match(archive, /opsx:archive|\/opsx-archive/);
  assert.match(apply, /OpenSpec artifacts/i);
  assert.match(archive, /update OpenSpec artifacts first|artifacts first/i);
  assert.match(runtime, /openspec-ff-change/);
  assert.match(runtime, /openspec-continue-change/);
  assert.match(runtime, /opsx:propose|\/opsx-propose/);
});

test('ai-specs tracks integrated LIDR Specboot skills as SSOT', () => {
  const skills = read('ai-specs/skills/README.md');
  assert.match(skills, /Active LIDR Specboot Skills \(Integrated\)/i);
  assert.match(skills, /incorporated and calibrated/i);
  for (const skill of [
    'enrich-us',
    'adversarial-review',
    'using-git-worktrees',
    'writing-skills',
    'code-auditing',
    'openspec-sync-specs',
    'sync-agent-symlinks'
  ]) {
    assert.match(skills, new RegExp(skill));
    assert.equal(
      fs.existsSync(path.join(rootDir, 'ai-specs/skills', skill, 'SKILL.md')),
      true,
      `must track ${skill} under ai-specs/skills`
    );
  }
  assert.match(skills, /Scope Rule/);
  assert.match(skills, /NON-core/i);
});

test('verify-eos REQUIRED_PATHS include OpenSpec runtime artifacts', () => {
  const verifier = read('scripts/verify-eos.js');
  for (const rel of [
    'openspec/config.yaml',
    'docs/backend-standards.md',
    'docs/manuals/OPENSPEC_RUNTIME.md',
    'ai-specs/README.md',
    'scripts/openspec-cli.js'
  ]) {
    assert.ok(verifier.includes(`'${rel}'`), `verify-eos REQUIRED_PATHS must include ${rel}`);
  }
});
