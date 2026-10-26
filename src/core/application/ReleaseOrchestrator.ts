/**
 * EOS Release Orchestrator & Automated Changelog Engine (Application Service)
 * Clean Hexagonal Architecture · Layer 1 Application Service
 * Orchestrates Semantic Version increments, Conventional Commit grouping,
 * and Keep-a-Changelog generation.
 */

import { SemanticVersion, type VersionBumpType } from '../domain/models/SemanticVersion.js';
import {
  ConventionalCommitParser,
  type ConventionalCommit
} from '../domain/models/ConventionalCommitParser.js';

export interface ReleaseOptions {
  readonly currentPackageJsonContent: string;
  readonly existingChangelogContent?: string | undefined;
  readonly commitMessages: readonly string[];
  readonly forcedIncrement?: VersionBumpType | undefined;
  readonly releaseDateIso?: string | undefined;
}

export interface ReleasePlan {
  readonly currentVersion: string;
  readonly nextVersion: string;
  readonly bumpType: VersionBumpType;
  readonly commitsCount: number;
  readonly breakingCount: number;
  readonly changelogEntry: string;
  readonly updatedPackageJson: string;
  readonly fullChangelog: string;
}

export class ReleaseOrchestrator {
  /**
   * Computes the release plan including next version, changelog diff, and updated package.json.
   */
  public static planRelease(options: ReleaseOptions): ReleasePlan {
    const pkg = JSON.parse(options.currentPackageJsonContent);
    const currentVersionStr: string = pkg.version || '0.0.0';
    const currentSemVer = SemanticVersion.parse(currentVersionStr);

    const commits = ConventionalCommitParser.parseCommits(options.commitMessages);
    const breakingCommits = commits.filter(c => c.isBreaking);

    const bumpType = options.forcedIncrement ?? ConventionalCommitParser.recommendReleaseType(commits);
    const nextSemVer = currentSemVer.bump(bumpType);
    const nextVersionStr = nextSemVer.toString();

    const dateStr = (options.releaseDateIso || new Date().toISOString()).split('T')[0]!;
    const changelogEntry = this.formatChangelogEntry(nextSemVer, dateStr, commits);

    const updatedPkg = { ...pkg, version: nextVersionStr };
    const updatedPackageJson = JSON.stringify(updatedPkg, null, 2) + '\n';

    const fullChangelog = this.mergeChangelog(options.existingChangelogContent || '', changelogEntry);

    return {
      currentVersion: currentVersionStr,
      nextVersion: nextVersionStr,
      bumpType,
      commitsCount: commits.length,
      breakingCount: breakingCommits.length,
      changelogEntry,
      updatedPackageJson,
      fullChangelog
    };
  }

  /**
   * Formats a Keep-a-Changelog Markdown section for a specific version.
   */
  public static formatChangelogEntry(
    version: SemanticVersion,
    dateString: string,
    commits: readonly ConventionalCommit[]
  ): string {
    const lines: string[] = [];
    lines.push(`## [${version.toString()}] - ${dateString}\n`);

    const breaking = commits.filter(c => c.isBreaking);
    if (breaking.length > 0) {
      lines.push('### ⚠ BREAKING CHANGES\n');
      for (const b of breaking) {
        const scopePrefix = b.scope ? `**${b.scope}:** ` : '';
        const rationale = b.breakingRationale ? ` — ${b.breakingRationale}` : '';
        lines.push(`- ${scopePrefix}${b.subject}${rationale}`);
      }
      lines.push('');
    }

    const grouped = ConventionalCommitParser.groupCommitsByType(commits);

    const typeSections: { type: string; title: string }[] = [
      { type: 'feat', title: '### Features' },
      { type: 'fix', title: '### Bug Fixes' },
      { type: 'perf', title: '### Performance Improvements' },
      { type: 'refactor', title: '### Code Refactoring' },
      { type: 'docs', title: '### Documentation' },
      { type: 'test', title: '### Tests' },
      { type: 'build', title: '### Build System' },
      { type: 'ci', title: '### Continuous Integration' },
      { type: 'chore', title: '### Chores & Maintenance' }
    ];

    for (const section of typeSections) {
      const entries = grouped[section.type];
      if (entries && entries.length > 0) {
        lines.push(`${section.title}\n`);
        for (const e of entries) {
          const scopePrefix = e.scope ? `**${e.scope}:** ` : '';
          lines.push(`- ${scopePrefix}${e.subject}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Merges a new release section into the existing CHANGELOG.md content.
   */
  public static mergeChangelog(existingContent: string, newEntry: string): string {
    const trimmed = existingContent.trim();
    if (!trimmed) {
      return (
        `# Changelog\n\nAll notable changes to this project will be documented in this file.\nSee [Conventional Commits](https://conventionalcommits.org) for commit guidelines.\n\n${newEntry}\n`
      );
    }

    const headerMatch = trimmed.match(/^#\s+Changelog[\s\S]*?(?=\n##\s+\[)/i);
    if (headerMatch) {
      const header = headerMatch[0].trim();
      const rest = trimmed.slice(header.length).trim();
      return `${header}\n\n${newEntry}\n\n${rest}\n`;
    }

    return `# Changelog\n\n${newEntry}\n\n${trimmed}\n`;
  }
}
