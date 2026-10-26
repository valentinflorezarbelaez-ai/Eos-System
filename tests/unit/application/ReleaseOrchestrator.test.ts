import { describe, it, expect } from 'vitest';
import { ReleaseOrchestrator } from '../../../src/core/application/ReleaseOrchestrator.js';

describe('ReleaseOrchestrator', () => {
  const initialPackageJson = JSON.stringify(
    {
      name: 'eos-system',
      version: '2.0.0',
      description: 'EOS Core System'
    },
    null,
    2
  );

  it('computes minor bump and formats changelog for feature commits', () => {
    const plan = ReleaseOrchestrator.planRelease({
      currentPackageJsonContent: initialPackageJson,
      commitMessages: [
        'feat(mcp): add sovereign MCP server',
        'fix(ci): fix exit code checking in powershell',
        'docs: update constitution'
      ],
      releaseDateIso: '2026-10-25T12:00:00Z'
    });

    expect(plan.currentVersion).toBe('2.0.0');
    expect(plan.nextVersion).toBe('2.1.0');
    expect(plan.bumpType).toBe('minor');
    expect(plan.commitsCount).toBe(3);
    expect(plan.breakingCount).toBe(0);

    expect(plan.changelogEntry).toContain('## [2.1.0] - 2026-10-25');
    expect(plan.changelogEntry).toContain('### Features');
    expect(plan.changelogEntry).toContain('- **mcp:** add sovereign MCP server');
    expect(plan.changelogEntry).toContain('### Bug Fixes');
    expect(plan.changelogEntry).toContain('- **ci:** fix exit code checking in powershell');

    const updatedPkg = JSON.parse(plan.updatedPackageJson);
    expect(updatedPkg.version).toBe('2.1.0');
  });

  it('computes major bump when breaking change is present', () => {
    const plan = ReleaseOrchestrator.planRelease({
      currentPackageJsonContent: initialPackageJson,
      commitMessages: [
        'feat(core)!: restructure pure domain models',
        'fix: resolve typo'
      ],
      releaseDateIso: '2026-10-25T12:00:00Z'
    });

    expect(plan.currentVersion).toBe('2.0.0');
    expect(plan.nextVersion).toBe('3.0.0');
    expect(plan.bumpType).toBe('major');
    expect(plan.breakingCount).toBe(1);

    expect(plan.changelogEntry).toContain('### ⚠ BREAKING CHANGES');
    expect(plan.changelogEntry).toContain('restructure pure domain models');
  });

  it('respects forced increment parameter over auto-detection', () => {
    const plan = ReleaseOrchestrator.planRelease({
      currentPackageJsonContent: initialPackageJson,
      commitMessages: ['fix: bug fix only'],
      forcedIncrement: 'major'
    });

    expect(plan.nextVersion).toBe('3.0.0');
    expect(plan.bumpType).toBe('major');
  });

  it('merges new entry on top of existing CHANGELOG.md with title header', () => {
    const existing = `# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-10-20

### Features
- initial release`;

    const merged = ReleaseOrchestrator.mergeChangelog(existing, '## [2.1.0] - 2026-10-25\n\n- new stuff');

    expect(merged).toContain('# Changelog');
    expect(merged.indexOf('[2.1.0]')).toBeLessThan(merged.indexOf('[2.0.0]'));
  });

  it('creates new changelog structure when existing content is empty', () => {
    const merged = ReleaseOrchestrator.mergeChangelog('', '## [1.0.0] - 2026-10-25\n\n- initial');
    expect(merged).toContain('# Changelog');
    expect(merged).toContain('## [1.0.0] - 2026-10-25');
  });
});
