import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditSpecbootCycleLock,
  SPECBOOT_CYCLE_INDEX,
  ANTIGRAVITY_FIRST_INDEX,
  SPECBOOT_CYCLE_REQUIRED_PATHS,
  SPECBOOT_CYCLE_REQUIRED_SECTIONS,
  ANTIGRAVITY_FIRST_REQUIRED_SECTIONS,
  SPECBOOT_AGY_SKILL_STEPS
} from '../scripts/lib/specboot-cycle-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const EVIDENCE = 'docs/releases/EOS_SPECBOOT_ANTIGRAVITY_FIRST_2026-09-09.md';

test('SpecBoot-AGY: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-specboot-antigravity-first');
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/specboot-antigravity-first/spec.md'
  ]) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('SpecBoot-AGY: auditSpecbootCycleLock green on real docs', () => {
  const audit = auditSpecbootCycleLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 3);
});

test('SpecBoot-AGY: fail-closed when cycle doc missing', () => {
  const audit = auditSpecbootCycleLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('SpecBoot-AGY: fail-closed when required sections stripped', () => {
  const realCycle = fs.readFileSync(path.join(rootDir, SPECBOOT_CYCLE_INDEX), 'utf8');
  const realAgy = fs.readFileSync(path.join(rootDir, ANTIGRAVITY_FIRST_INDEX), 'utf8');
  let strippedCycle = realCycle;
  for (const needle of SPECBOOT_CYCLE_REQUIRED_SECTIONS) {
    strippedCycle = strippedCycle.split(needle).join('## REMOVED');
  }
  strippedCycle = strippedCycle
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES');

  let strippedAgy = realAgy;
  for (const needle of ANTIGRAVITY_FIRST_REQUIRED_SECTIONS) {
    strippedAgy = strippedAgy.split(needle).join('## REMOVED');
  }
  strippedAgy = strippedAgy
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/local Cursor IDE/gi, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES');

  const audit = auditSpecbootCycleLock(rootDir, {
    cycleText: strippedCycle,
    agyText: strippedAgy,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped docs must fail closed');
  assert.ok(
    audit.failures.some((f) =>
      /section|needle|PRODUCTION_READY|NON-CLAIM|Cursor IDE/i.test(f.message)
    ),
    JSON.stringify(audit.failures)
  );
});

test('SpecBoot-AGY: fail-closed on empty temp fixture doc', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-specboot-'));
  try {
    fs.mkdirSync(path.join(tmp, path.dirname(SPECBOOT_CYCLE_INDEX)), { recursive: true });
    fs.writeFileSync(path.join(tmp, SPECBOOT_CYCLE_INDEX), '# empty\n', 'utf8');
    const audit = auditSpecbootCycleLock(tmp, {
      agyText: '# empty\n',
      skipPathChecks: true
    });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('SpecBoot-AGY: required paths exist', () => {
  for (const rel of SPECBOOT_CYCLE_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('SpecBoot-AGY: package.json has test:specboot-agy', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:specboot-agy'],
    'node --test tests/eos-specboot-antigravity-first.test.js'
  );
});

test('SpecBoot-AGY: verify-eos imports specboot-cycle-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('specboot-cycle-lock'));
  assert.ok(src.includes('auditSpecbootCycleLock'));
  assert.ok(src.includes('SPECBOOT_CYCLE_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-specboot-antigravity-first.test.js'));
});

test('SpecBoot-AGY: index SSOT paths', () => {
  assert.equal(SPECBOOT_CYCLE_INDEX, 'docs/harness/SPECBOOT_CYCLE.md');
  assert.equal(ANTIGRAVITY_FIRST_INDEX, 'docs/harness/ANTIGRAVITY_FIRST.md');
  assert.ok(fs.existsSync(path.join(rootDir, SPECBOOT_CYCLE_INDEX)));
  assert.ok(fs.existsSync(path.join(rootDir, ANTIGRAVITY_FIRST_INDEX)));
});

test('SpecBoot-AGY: AGY skill mirrors point at cursor commands without huge fork', () => {
  for (const step of SPECBOOT_AGY_SKILL_STEPS) {
    const skillRel = '.agents/skills/' + step + '/SKILL.md';
    const cmdRel = '.cursor/commands/' + step + '.md';
    const skillText = fs.readFileSync(path.join(rootDir, skillRel), 'utf8');
    const cmdText = fs.readFileSync(path.join(rootDir, cmdRel), 'utf8');
    assert.ok(skillText.includes(cmdRel), skillRel + ' must cite ' + cmdRel);
    assert.ok(skillText.includes('thin pointer') || skillText.includes('Antigravity mirror'));
    // thin = substantially smaller than forking a large body; commands themselves are small,
    // so assert skill stays under 2.5k and mentions no-fork discipline
    assert.ok(skillText.length < 2500, skillRel + ' too large (possible body fork)');
    assert.ok(cmdText.length > 100, cmdRel + ' procedure SSOT too short');
  }
});

test('SpecBoot-AGY: ANTIGRAVITY_FIRST demotes CloudAgent and allows Cursor IDE', () => {
  const text = fs.readFileSync(path.join(rootDir, ANTIGRAVITY_FIRST_INDEX), 'utf8');
  assert.ok(/CloudAgent/i.test(text));
  assert.ok(/out of the default/i.test(text));
  assert.ok(/NON-CLAIM/i.test(text));
  assert.ok(/local Cursor IDE/i.test(text));
  assert.ok(/PRODUCTION_READY:\*\* NO|\*\*PRODUCTION_READY:\*\* NO|PRODUCTION_READY: NO/.test(text));
});

test('SpecBoot-AGY: Spanish evidence exists with honesty language', () => {
  const text = fs.readFileSync(path.join(rootDir, EVIDENCE), 'utf8');
  assert.ok(/PRODUCTION_READY/i.test(text));
  assert.ok(/Fundacion/i.test(text));
  assert.ok(/Delta\s*=\s*0|Delta=0/i.test(text));
  assert.ok(/Antigravity|CloudAgent/i.test(text));
  assert.ok(/NON-CLAIM/i.test(text));
});

test('SpecBoot-AGY: entrypoint pointers mention SpecBoot / Antigravity-first', () => {
  for (const rel of ['GEMINI.md', 'AGENTS.md', 'CLAUDE.md', 'docs/harness/CONTEXT_PACK_TPC.md']) {
    const text = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    assert.ok(
      /SPECBOOT_CYCLE|ANTIGRAVITY_FIRST|Antigravity-first/i.test(text),
      rel + ' missing SpecBoot/AGY pointer'
    );
  }
});
