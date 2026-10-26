import { describe, it, expect } from 'vitest';
import { ConventionalCommitParser } from '../../../src/core/domain/models/ConventionalCommitParser.js';

describe('ConventionalCommitParser', () => {
  describe('parseCommit', () => {
    it('parses a simple feat commit without scope', () => {
      const commit = ConventionalCommitParser.parseCommit('feat: add vitest unit test suite');
      expect(commit).not.toBeNull();
      expect(commit?.type).toBe('feat');
      expect(commit?.scope).toBeUndefined();
      expect(commit?.isBreaking).toBe(false);
      expect(commit?.subject).toBe('add vitest unit test suite');
      expect(commit?.body).toBeUndefined();
      expect(commit?.footers).toEqual([]);
    });

    it('parses a commit with scope', () => {
      const commit = ConventionalCommitParser.parseCommit('fix(auth): resolve token refresh loop');
      expect(commit).not.toBeNull();
      expect(commit?.type).toBe('fix');
      expect(commit?.scope).toBe('auth');
      expect(commit?.isBreaking).toBe(false);
      expect(commit?.subject).toBe('resolve token refresh loop');
    });

    it('parses a breaking commit with bang (!)', () => {
      const commit = ConventionalCommitParser.parseCommit('feat(api)!: migrate to REST v3');
      expect(commit).not.toBeNull();
      expect(commit?.type).toBe('feat');
      expect(commit?.scope).toBe('api');
      expect(commit?.isBreaking).toBe(true);
      expect(commit?.breakingRationale).toBe('migrate to REST v3');
    });

    it('parses a multi-line commit with body and BREAKING CHANGE footer', () => {
      const message = `refactor(core): decouple domain layer

This commit extracts infrastructure dependencies from all domain models.

BREAKING CHANGE: Core models no longer accept FileSystemAdapter in constructor.
Signed-off-by: Valentin <valentin@eos.local>
Fixes #123`;

      const commit = ConventionalCommitParser.parseCommit(message);
      expect(commit).not.toBeNull();
      expect(commit?.type).toBe('refactor');
      expect(commit?.scope).toBe('core');
      expect(commit?.isBreaking).toBe(true);
      expect(commit?.breakingRationale).toContain('Core models no longer accept FileSystemAdapter');
      expect(commit?.body).toContain('This commit extracts infrastructure');
      expect(commit?.footers).toContain('Signed-off-by: Valentin <valentin@eos.local>');
      expect(commit?.footers).toContain('Fixes #123');
    });

    it('returns null for non-conventional or empty commit messages', () => {
      expect(ConventionalCommitParser.parseCommit('')).toBeNull();
      expect(ConventionalCommitParser.parseCommit('   ')).toBeNull();
      expect(ConventionalCommitParser.parseCommit(null as any)).toBeNull();
      expect(ConventionalCommitParser.parseCommit('updated some files and fixed bug')).toBeNull();
      expect(ConventionalCommitParser.parseCommit('Merge pull request #4 from branch')).toBeNull();
    });
  });

  describe('parseCommits & Filtering', () => {
    it('parses multiple messages and filters non-conventional ones', () => {
      const messages = [
        'feat(core): initial setup',
        'fixed a typo here', // ignored
        'fix(ci): fix github action permissions',
        'chore: bump dependencies'
      ];

      const parsed = ConventionalCommitParser.parseCommits(messages);
      expect(parsed).toHaveLength(3);
      expect(parsed.map(p => p.type)).toEqual(['feat', 'fix', 'chore']);
    });
  });

  describe('recommendReleaseType', () => {
    it('returns patch for empty commit list', () => {
      expect(ConventionalCommitParser.recommendReleaseType([])).toBe('patch');
    });

    it('recommends major when any breaking change is present', () => {
      const commits = ConventionalCommitParser.parseCommits([
        'fix: bug fix',
        'feat(api)!: breaking change',
        'chore: update deps'
      ]);
      expect(ConventionalCommitParser.recommendReleaseType(commits)).toBe('major');
    });

    it('recommends minor when a feat is present without breaking change', () => {
      const commits = ConventionalCommitParser.parseCommits([
        'fix: bug fix',
        'feat(dashboard): add live latency HUD',
        'docs: update guide'
      ]);
      expect(ConventionalCommitParser.recommendReleaseType(commits)).toBe('minor');
    });

    it('recommends patch when only fixes or chores are present', () => {
      const commits = ConventionalCommitParser.parseCommits([
        'fix: minor typo in log',
        'chore: clean up dist files'
      ]);
      expect(ConventionalCommitParser.recommendReleaseType(commits)).toBe('patch');
    });
  });

  describe('groupCommitsByType', () => {
    it('groups commits by their type tag', () => {
      const commits = ConventionalCommitParser.parseCommits([
        'feat(a): first feature',
        'fix(b): first fix',
        'feat(c): second feature',
        'docs: documentation update'
      ]);

      const grouped = ConventionalCommitParser.groupCommitsByType(commits);
      expect(grouped['feat']).toHaveLength(2);
      expect(grouped['fix']).toHaveLength(1);
      expect(grouped['docs']).toHaveLength(1);
    });
  });
});
