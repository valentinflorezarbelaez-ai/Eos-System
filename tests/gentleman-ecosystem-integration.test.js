/**
 * Gentleman Programming + LIDR Academy ecosystem integration suite (ADR-0019).
 *
 * Opt-in suite: registered in SLIM_SUITE_EXCLUDES because the slim corpus sits at the
 * TR-01 discovery ceiling. Reachable through `npm run test:full` and the CI full-suite
 * job, which the CI suite reachability lock enforces.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  GENTLEMAN_ECOSYSTEM_REGISTRY,
  GENTLEMAN_ECOSYSTEM_REQUIRED_PATHS,
  VALID_STANCES,
  VALID_UPSTREAM_STATUSES,
  DEAD_UPSTREAM_STATUSES,
  LIVE_STANCES,
  GOVERNED_SCAN_ROOTS,
  auditGentlemanEcosystemLock,
  collectGovernedFiles,
  findVocabularyViolations,
  markerPresentIn,
  readGentlemanEcosystemRegistry
} from '../scripts/lib/gentleman-ecosystem-lock.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('GEN-001 registry shape', () => {
  test('registry parses and declares the full contract per component', () => {
    const registry = readGentlemanEcosystemRegistry(rootDir);
    assert.equal(registry.id, 'GENTLEMAN_ECOSYSTEM_REGISTRY');
    assert.ok(registry.components.length >= 8, 'expected the full ecosystem surface');

    for (const component of registry.components) {
      assert.ok(component.id, 'component id');
      assert.ok(component.upstream.startsWith('https://github.com/'), `${component.id} upstream URL`);
      assert.ok(VALID_STANCES.includes(component.eosStance), `${component.id} stance`);
      assert.ok(VALID_UPSTREAM_STATUSES.includes(component.upstreamStatus), `${component.id} status`);
      assert.equal(typeof component.vendored, 'boolean', `${component.id} vendored`);
      assert.equal(typeof component.installedByEos, 'boolean', `${component.id} installedByEos`);
      assert.ok(component.rationale.length > 40, `${component.id} rationale must be substantive`);
    }
  });

  test('both named upstream organisations are represented', () => {
    const owners = new Set(readGentlemanEcosystemRegistry(rootDir).components.map((c) => c.owner));
    assert.ok(owners.has('Gentleman-Programming'));
    assert.ok(owners.has('LIDR-academy'));
  });

  test('nothing is vendored and nothing is installed by EOS', () => {
    for (const component of readGentlemanEcosystemRegistry(rootDir).components) {
      assert.equal(component.vendored, false, `${component.id} must not vendor upstream bodies`);
      assert.equal(component.installedByEos, false, `${component.id} must not be installed by EOS`);
    }
  });
});

describe('GEN-002 live gate', () => {
  test('the workspace passes the ecosystem lock with zero failures', () => {
    const result = auditGentlemanEcosystemLock(rootDir);
    assert.deepEqual(result.failures, [], 'ecosystem lock failures');
    assert.ok(result.checks.length >= 10, 'expected a meaningful number of checks');
    assert.ok(result.componentCount >= 8);
  });

  test('every required path exists', () => {
    for (const rel of GENTLEMAN_ECOSYSTEM_REQUIRED_PATHS) {
      assert.ok(fs.existsSync(path.join(rootDir, rel)), `missing ${rel}`);
    }
  });

  test('the lock is wired into verify-eos', () => {
    const verifier = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
    assert.match(verifier, /auditGentlemanEcosystemLock/);
    assert.match(verifier, /gentleman-ecosystem-lock\.js/);
  });
});

describe('GEN-003 dead upstream cannot be cited as live', () => {
  test('archived or deprecated upstream never carries ADOPT or ADAPT', () => {
    for (const component of readGentlemanEcosystemRegistry(rootDir).components) {
      if (DEAD_UPSTREAM_STATUSES.includes(component.upstreamStatus)) {
        assert.ok(
          !LIVE_STANCES.includes(component.eosStance),
          `${component.id} is ${component.upstreamStatus} but stance is ${component.eosStance}`
        );
      }
    }
  });

  test('the lock rejects an ADOPT stance on an archived upstream', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-gentleman-'));
    try {
      for (const rel of GENTLEMAN_ECOSYSTEM_REQUIRED_PATHS) {
        const dest = path.join(tmp, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(path.join(rootDir, rel), dest);
      }
      const registryPath = path.join(tmp, GENTLEMAN_ECOSYSTEM_REGISTRY);
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const archived = registry.components.find((c) => c.upstreamStatus === 'ARCHIVED');
      assert.ok(archived, 'fixture requires an archived component');
      archived.eosStance = 'ADOPT';
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

      const result = auditGentlemanEcosystemLock(tmp);
      assert.ok(
        result.failures.some((f) => f.message.includes('must not be cited as a live source')),
        'expected a dead-upstream failure'
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('GEN-004 vocabulary integrity', () => {
  test('RDD canonical expansion is attested where it is taught', () => {
    const registry = readGentlemanEcosystemRegistry(rootDir);
    const rdd = registry.vocabulary.find((v) => v.acronym === 'RDD');
    assert.equal(rdd.expansion, 'Receipt-Driven Development');
    for (const attested of rdd.attestedIn) {
      assert.ok(markerPresentIn(rootDir, [attested], rdd.expansion), `${attested} must teach the canonical expansion`);
    }
  });

  test('superseded expansions appear only in declared exempt paths', () => {
    const registry = readGentlemanEcosystemRegistry(rootDir);
    for (const entry of registry.vocabulary) {
      const exempt = (entry.exemptPaths || []).map((e) => e.path);
      for (const phrase of entry.forbiddenExpansions || []) {
        assert.deepEqual(
          findVocabularyViolations(rootDir, phrase, exempt),
          [],
          `superseded ${entry.acronym} expansion leaked into the governed tree`
        );
      }
    }
  });

  test('every exemption points at the amending decision record', () => {
    const registry = readGentlemanEcosystemRegistry(rootDir);
    for (const entry of registry.vocabulary) {
      for (const exempt of entry.exemptPaths || []) {
        const content = fs.readFileSync(path.join(rootDir, exempt.path), 'utf8');
        assert.ok(exempt.reason.length > 10, `${exempt.path} needs a reason`);
        assert.ok(content.includes(exempt.requiresMarker), `${exempt.path} must reference ${exempt.requiresMarker}`);
      }
    }
  });

  test('4R lenses are recorded with the upstream lens names', () => {
    const registry = readGentlemanEcosystemRegistry(rootDir);
    const fourR = registry.vocabulary.find((v) => v.acronym === '4R');
    for (const lens of ['Risk', 'Resilience', 'Readability', 'Reliability']) {
      assert.ok(fourR.expansion.includes(lens), `4R must name ${lens}`);
    }
  });

  test('the lock detects a superseded expansion injected into a governed root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-gentleman-vocab-'));
    try {
      for (const rel of GENTLEMAN_ECOSYSTEM_REQUIRED_PATHS) {
        const dest = path.join(tmp, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(path.join(rootDir, rel), dest);
      }
      const registry = JSON.parse(fs.readFileSync(path.join(tmp, GENTLEMAN_ECOSYSTEM_REGISTRY), 'utf8'));
      const phrase = registry.vocabulary.find((v) => v.acronym === 'RDD').forbiddenExpansions[0];

      const clean = auditGentlemanEcosystemLock(tmp);
      assert.ok(
        !clean.failures.some((f) => f.message.includes(phrase)),
        'fixture should start free of vocabulary failures'
      );

      const injected = path.join(tmp, 'docs/notes/drifted.md');
      fs.mkdirSync(path.dirname(injected), { recursive: true });
      fs.writeFileSync(injected, `RDD stands for ${phrase}.\n`);

      const dirty = auditGentlemanEcosystemLock(tmp);
      assert.ok(
        dirty.failures.some((f) => f.message.includes(phrase)),
        'expected the injected drift to fail the lock'
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('GEN-005 surfaces carry real content', () => {
  test('declared surfaces exist and required markers resolve', () => {
    for (const component of readGentlemanEcosystemRegistry(rootDir).components) {
      for (const surface of component.eosSurfaces) {
        assert.ok(fs.existsSync(path.join(rootDir, surface)), `${component.id} surface ${surface}`);
      }
      for (const marker of component.requiredMarkers || []) {
        assert.ok(
          markerPresentIn(rootDir, component.eosSurfaces, marker),
          `${component.id} marker ${marker} missing from its surfaces`
        );
      }
    }
  });

  test('the Engram rule documents the memory protocol, not just three tools', () => {
    const rule = fs.readFileSync(path.join(rootDir, '.cursor/rules/engram.mdc'), 'utf8');
    for (const tool of [
      'mem_current_project',
      'mem_context',
      'mem_search',
      'mem_timeline',
      'mem_get_observation',
      'mem_save',
      'mem_update',
      'mem_suggest_topic_key',
      'mem_save_prompt',
      'mem_session_summary',
      'mem_doctor'
    ]) {
      assert.ok(rule.includes(tool), `engram.mdc must document ${tool}`);
    }
    assert.match(rule, /topic_key/, 'stable topic keys');
    assert.match(rule, /not evidence/i, 'memory is not evidence');
  });

  test('the bridge rule states non-endorsement and the trademark constraint', () => {
    const rule = fs.readFileSync(path.join(rootDir, '.cursor/rules/gentleman-ecosystem-bridge.mdc'), 'utf8');
    assert.match(rule, /no endorsement/i);
    assert.match(rule, /trademark/i);
    assert.match(rule, /Organic Driven Development/);
    assert.match(rule, /Receipt-Driven Development/);
  });

  test('the adversarial-review skill carries the RDD depth ladder', () => {
    const skill = fs.readFileSync(path.join(rootDir, '.agents/skills/adversarial-review/SKILL.md'), 'utf8');
    assert.match(skill, /Receipt-Driven Development/);
    assert.match(skill, /Risk, Resilience, Readability, Reliability/);
    assert.match(skill, /one bounded correction/);
    assert.match(skill, /INFORMATIONAL/);
  });
});

describe('GEN-006 attribution and non-claims', () => {
  test('notices cover non-endorsement, trademarks and vendoring', () => {
    const { notices } = readGentlemanEcosystemRegistry(rootDir);
    assert.match(notices.nonEndorsement, /endorsement/);
    assert.ok(notices.trademarks.length >= 1);
    assert.match(notices.vendoring, /vendored: false/);
  });

  test('non-claims refuse the obvious overreach', () => {
    const text = readGentlemanEcosystemRegistry(rootDir).nonClaims.join(' ');
    assert.match(text, /Registry != runtime integration/);
    assert.match(text, /Memory != evidence/);
    assert.match(text, /Review != delivery authority/);
  });

  test('the governed scan scope is explicit and excludes immutable trees', () => {
    assert.ok(GOVERNED_SCAN_ROOTS.includes('docs'));
    assert.ok(GOVERNED_SCAN_ROOTS.includes('.cursor'));
    assert.ok(!GOVERNED_SCAN_ROOTS.includes('tests'), 'negative fixtures must not be scanned');
    const governed = collectGovernedFiles(rootDir);
    assert.ok(governed.length > 100, 'scan must actually cover the tree');
    assert.ok(!governed.some((f) => f.startsWith('docs/evidence/')), 'sealed receipts stay out of scope');
  });
});
