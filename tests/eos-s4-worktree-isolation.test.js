import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  auditWorktreePolicyLock,
  WORKTREE_POLICY_INDEX,
  WORKTREE_POLICY_REQUIRED_PATHS,
  WORKTREE_POLICY_REQUIRED_SECTIONS
} from '../scripts/lib/worktree-policy-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const EVIDENCE = 'docs/releases/EOS_S4_WORKTREE_ISOLATION_2026-09-09.md';
const SKILL_AGENTS = '.agents/skills/using-git-worktrees/SKILL.md';
const SKILL_AI = 'ai-specs/skills/using-git-worktrees/SKILL.md';
const CLI = 'bin/eos-worktree.js';

test('S4: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-s4-worktree-isolation');
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/worktree-isolation/spec.md'
  ]) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('S4: auditWorktreePolicyLock green on real WORKTREE_ISOLATION_POLICY', () => {
  const audit = auditWorktreePolicyLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 3);
});

test('S4: fail-closed when policy doc missing', () => {
  const audit = auditWorktreePolicyLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('S4: fail-closed when required sections stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, WORKTREE_POLICY_INDEX), 'utf8');
  let stripped = real;
  for (const needle of WORKTREE_POLICY_REQUIRED_SECTIONS) {
    stripped = stripped.split(needle).join('## REMOVED');
  }
  stripped = stripped
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES')
    .replace(/no swarm/gi, 'REMOVED')
    .replace(/policy\s*[!=≠]+\s*swarm/gi, 'REMOVED')
    .replace(/≠\s*swarm/gi, 'REMOVED');

  const audit = auditWorktreePolicyLock(rootDir, {
    docText: stripped,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped doc must fail closed');
  assert.ok(
    audit.failures.some((f) =>
      /section|needle|PRODUCTION_READY|NON-CLAIM|swarm/i.test(f.message)
    ),
    JSON.stringify(audit.failures)
  );
});

test('S4: fail-closed on empty temp fixture doc', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-s4-wt-'));
  try {
    const docsRel = path.dirname(WORKTREE_POLICY_INDEX);
    fs.mkdirSync(path.join(tmp, docsRel), { recursive: true });
    fs.writeFileSync(path.join(tmp, WORKTREE_POLICY_INDEX), '# empty\n', 'utf8');
    const audit = auditWorktreePolicyLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('S4: required paths exist (policy + skills + CLI + lock)', () => {
  for (const rel of WORKTREE_POLICY_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
  assert.ok(fs.existsSync(path.join(rootDir, SKILL_AGENTS)));
  assert.ok(fs.existsSync(path.join(rootDir, SKILL_AI)));
  assert.ok(fs.existsSync(path.join(rootDir, CLI)));
});

test('S4: package.json has test:s4', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:s4'],
    'node --test tests/eos-s4-worktree-isolation.test.js'
  );
});

test('S4: verify-eos imports worktree-policy-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('worktree-policy-lock'));
  assert.ok(src.includes('auditWorktreePolicyLock'));
  assert.ok(src.includes('WORKTREE_POLICY_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-s4-worktree-isolation.test.js'));
});

test('S4: index SSOT path is docs/harness/WORKTREE_ISOLATION_POLICY.md', () => {
  assert.equal(WORKTREE_POLICY_INDEX, 'docs/harness/WORKTREE_ISOLATION_POLICY.md');
  assert.ok(fs.existsSync(path.join(rootDir, WORKTREE_POLICY_INDEX)));
});

test('S4: policy maps Spec-Boot using-git-worktrees without fork claim', () => {
  const doc = fs.readFileSync(path.join(rootDir, WORKTREE_POLICY_INDEX), 'utf8');
  assert.ok(doc.includes('using-git-worktrees'));
  assert.ok(doc.includes(SKILL_AGENTS) || doc.includes('.agents/skills/using-git-worktrees'));
  assert.ok(doc.includes(SKILL_AI) || doc.includes('ai-specs/skills/using-git-worktrees'));
  assert.ok(/no fork|without fork|cite|map|pointer/i.test(doc));
  assert.ok(doc.includes('bin/eos-worktree.js') || doc.includes('eos-worktree'));
  assert.ok(/one agent|session|shared dirty/i.test(doc));
  assert.ok(doc.includes('.env') || /secrets/i.test(doc));
  assert.ok(doc.includes('node_modules'));
  assert.ok(/DB|database/i.test(doc));
  assert.ok(/ports?/i.test(doc));
});

test('S4: NON-CLAIM no swarm + PRODUCTION_READY=NO remain explicit', () => {
  const doc = fs.readFileSync(path.join(rootDir, WORKTREE_POLICY_INDEX), 'utf8');
  assert.ok(doc.includes('NON-CLAIM'));
  assert.ok(
    /no swarm/i.test(doc) ||
      /policy\s*[!=≠]+\s*swarm/i.test(doc) ||
      /≠\s*swarm/i.test(doc)
  );
  assert.ok(
    doc.includes('PRODUCTION_READY:** NO') ||
      doc.includes('PRODUCTION_READY: NO') ||
      doc.includes('**PRODUCTION_READY:** NO')
  );

  const evidence = fs.readFileSync(path.join(rootDir, EVIDENCE), 'utf8');
  assert.ok(evidence.includes('NON-CLAIM'));
  assert.ok(/no swarm|swarm/i.test(evidence));
  assert.ok(/PRODUCTION_READY/i.test(evidence));
  assert.ok(/Fundacion/i.test(evidence));
  assert.ok(/CI-safe|CI safe|sin churn|no.*worktree add/i.test(evidence));
});

test('S4: CI-safe smoke — CLI --help without creating worktrees', () => {
  const res = spawnSync(process.execPath, [path.join(rootDir, CLI), '--help'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.ok(/WORKTREE|Usage|create|list|cleanup|prune/i.test(res.stdout));
});

test('S4: CI-safe smoke — invalid taskId rejects without worktree churn', async () => {
  const { EosWorktreeManager } = await import('../bin/eos-worktree.js');
  const manager = new EosWorktreeManager({ repoRoot: rootDir });
  assert.throws(() => manager.create(''), /Invalid taskId/);
  assert.throws(() => manager.create('task with spaces'), /Invalid taskId/);
  assert.throws(() => manager.create('../evil/path'), /Invalid taskId/);
});

test('S4: named smoke source does not churn real git worktrees', () => {
  const src = fs.readFileSync(
    path.join(rootDir, 'tests/eos-s4-worktree-isolation.test.js'),
    'utf8'
  );
  // Detect executable churn via constructed needles (avoid self-hit on assert prose).
  const addNeedle = ['git', 'worktree', 'add'].join(' ');
  const removeNeedle = ['git', 'worktree', 'remove'].join(' ');
  const detachedNeedle = ['detached', ':', ' true'].join('');
  assert.equal(src.includes(addNeedle), false, 'S4 smoke must not invoke ' + addNeedle);
  assert.equal(src.includes(removeNeedle), false, 'S4 smoke must not invoke ' + removeNeedle);
  assert.equal(src.includes(detachedNeedle), false, 'S4 smoke must not create detached worktrees');
  assert.equal(/\.create\(\s*[`'"]test-worktree/.test(src), false);
  assert.equal(/manager\.cleanup\s*\(/.test(src), false);
  assert.equal(/execSync\([^)]*worktree/.test(src), false);
});

test('S4: CONTEXT_PACK / LOOP docs point at worktree policy when present', () => {
  const cp = fs.readFileSync(path.join(rootDir, 'docs/harness/CONTEXT_PACK_TPC.md'), 'utf8');
  const loop = fs.readFileSync(path.join(rootDir, 'docs/harness/LOOP_ENGINEERING_4Q.md'), 'utf8');
  const hit =
    /WORKTREE_ISOLATION_POLICY|worktree isolation|S4/i.test(cp) ||
    /WORKTREE_ISOLATION_POLICY|worktree isolation|S4/i.test(loop);
  assert.ok(hit, 'expected minimal pointer from CONTEXT_PACK or LOOP docs');
});
