/**
 * EOS Conventional Commit Parser (Pure Domain Model)
 * Clean Hexagonal Architecture · Layer 0 Pure Domain Model
 * Zero External Dependencies (Node stdlib / pure TypeScript only)
 * Adheres strictly to the Conventional Commits 1.0.0 Specification.
 */

import type { VersionBumpType } from './SemanticVersion.js';

export interface ConventionalCommit {
  readonly raw: string;
  readonly type: string;
  readonly scope: string | undefined;
  readonly isBreaking: boolean;
  readonly subject: string;
  readonly body: string | undefined;
  readonly breakingRationale: string | undefined;
  readonly footers: readonly string[];
}

export class ConventionalCommitParser {
  private static readonly HEADER_REGEX =
    /^([a-zA-Z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

  private static readonly BREAKING_FOOTER_REGEX =
    /^(?:BREAKING CHANGE|BREAKING-CHANGE):\s*(.+)$/m;

  /**
   * Parses a single git commit message (which may contain multiple lines: subject, body, footers).
   */
  public static parseCommit(message: string): ConventionalCommit | null {
    if (!message || typeof message !== 'string') {
      return null;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return null;
    }

    const lines = trimmed.split(/\r?\n/);
    const headerLine = lines[0] ?? '';
    const match = headerLine.match(this.HEADER_REGEX);

    if (!match) {
      // Non-conventional commit
      return null;
    }

    const type = match[1]!.toLowerCase();
    const scope = match[2] ? match[2].trim() : undefined;
    const hasBang = Boolean(match[3]);
    const subject = match[4]!.trim();

    const restOfMessage = lines.slice(1).join('\n').trim();
    const body = restOfMessage.length > 0 ? restOfMessage : undefined;

    // Check for breaking change indication in header (!) or in footers
    const breakingFooterMatch = restOfMessage.match(this.BREAKING_FOOTER_REGEX);
    const isBreaking = hasBang || Boolean(breakingFooterMatch);
    const breakingRationale = breakingFooterMatch ? breakingFooterMatch[1]!.trim() : (hasBang ? subject : undefined);

    // Extract footers (lines starting with token: or token #)
    const footers: string[] = [];
    if (restOfMessage) {
      for (const line of lines.slice(1)) {
        const lineTrim = line.trim();
        if (/^[a-zA-Z-]+(?:(?::\s+)|(?:\s+#))/.test(lineTrim)) {
          footers.push(lineTrim);
        }
      }
    }

    return {
      raw: trimmed,
      type,
      scope,
      isBreaking,
      subject,
      body,
      breakingRationale,
      footers
    };
  }

  /**
   * Parses multiple git commit messages into structured commits.
   */
  public static parseCommits(messages: readonly string[]): readonly ConventionalCommit[] {
    const results: ConventionalCommit[] = [];
    for (const msg of messages) {
      const parsed = this.parseCommit(msg);
      if (parsed) {
        results.push(parsed);
      }
    }
    return results;
  }

  /**
   * Recommends the semantic release increment based on a series of commits:
   * - 'major' if any commit introduces a breaking change
   * - 'minor' if any commit introduces a new feature ('feat')
   * - 'patch' if only fixes/chores/docs or non-feature changes exist
   */
  public static recommendReleaseType(commits: readonly ConventionalCommit[]): VersionBumpType {
    if (commits.length === 0) {
      return 'patch';
    }

    for (const c of commits) {
      if (c.isBreaking) {
        return 'major';
      }
    }

    for (const c of commits) {
      if (c.type === 'feat') {
        return 'minor';
      }
    }

    return 'patch';
  }

  /**
   * Groups parsed commits by type for changelog generation.
   */
  public static groupCommitsByType(
    commits: readonly ConventionalCommit[]
  ): Record<string, ConventionalCommit[]> {
    const grouped: Record<string, ConventionalCommit[]> = {};

    for (const c of commits) {
      if (!grouped[c.type]) {
        grouped[c.type] = [];
      }
      grouped[c.type]!.push(c);
    }

    return grouped;
  }
}
