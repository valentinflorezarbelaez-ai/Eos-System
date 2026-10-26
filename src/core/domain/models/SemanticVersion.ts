/**
 * EOS Semantic Versioning 2.0.0 (Pure Domain Entity)
 * Clean Hexagonal Architecture · Layer 0 Pure Domain Model
 * Zero External Dependencies (Node stdlib / pure TypeScript only)
 */

export type VersionBumpType = 'major' | 'minor' | 'patch';

export class SemanticVersion {
  // Formal SemVer 2.0.0 Regular Expression (allowing optional leading 'v')
  private static readonly SEMVER_REGEX =
    /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  public readonly major: number;
  public readonly minor: number;
  public readonly patch: number;
  public readonly prerelease: string | undefined;
  public readonly build: string | undefined;

  constructor(
    major: number,
    minor: number,
    patch: number,
    prerelease?: string | undefined,
    build?: string | undefined
  ) {
    if (!Number.isInteger(major) || major < 0) {
      throw new Error(`Invalid major version: ${major}. Must be a non-negative integer.`);
    }
    if (!Number.isInteger(minor) || minor < 0) {
      throw new Error(`Invalid minor version: ${minor}. Must be a non-negative integer.`);
    }
    if (!Number.isInteger(patch) || patch < 0) {
      throw new Error(`Invalid patch version: ${patch}. Must be a non-negative integer.`);
    }

    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.prerelease = prerelease ? prerelease.trim() : undefined;
    this.build = build ? build.trim() : undefined;
  }

  /**
   * Parses a version string into a SemanticVersion instance.
   */
  public static parse(versionString: string): SemanticVersion {
    if (!versionString || typeof versionString !== 'string') {
      throw new Error('Version string must be a non-empty string');
    }

    const trimmed = versionString.trim();
    const match = trimmed.match(this.SEMVER_REGEX);
    if (!match) {
      throw new Error(`Invalid SemVer format: "${versionString}". Must adhere to SemVer 2.0.0 (e.g. 1.2.3, v2.0.0-rc.1)`);
    }

    const major = parseInt(match[1]!, 10);
    const minor = parseInt(match[2]!, 10);
    const patch = parseInt(match[3]!, 10);
    const prerelease = match[4];
    const build = match[5];

    return new SemanticVersion(major, minor, patch, prerelease, build);
  }

  /**
   * Bumps the major version, resetting minor and patch to 0.
   */
  public bumpMajor(prerelease?: string): SemanticVersion {
    return new SemanticVersion(this.major + 1, 0, 0, prerelease);
  }

  /**
   * Bumps the minor version, resetting patch to 0.
   */
  public bumpMinor(prerelease?: string): SemanticVersion {
    return new SemanticVersion(this.major, this.minor + 1, 0, prerelease);
  }

  /**
   * Bumps the patch version.
   */
  public bumpPatch(prerelease?: string): SemanticVersion {
    return new SemanticVersion(this.major, this.minor, this.patch + 1, prerelease);
  }

  /**
   * Generic bump method by type.
   */
  public bump(type: VersionBumpType, prerelease?: string): SemanticVersion {
    switch (type) {
      case 'major':
        return this.bumpMajor(prerelease);
      case 'minor':
        return this.bumpMinor(prerelease);
      case 'patch':
        return this.bumpPatch(prerelease);
      default:
        throw new Error(`Unknown bump type: ${String(type)}`);
    }
  }

  /**
   * Formats the version string adhering to SemVer 2.0.0.
   */
  public toString(): string {
    let result = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease) {
      result += `-${this.prerelease}`;
    }
    if (this.build) {
      result += `+${this.build}`;
    }
    return result;
  }

  /**
   * Compares precedence against another SemanticVersion adhering to SemVer 2.0.0 section 11.
   * Returns:
   *  1 if this > other
   *  0 if this === other
   * -1 if this < other
   */
  public compare(other: SemanticVersion): number {
    if (this.major !== other.major) {
      return this.major > other.major ? 1 : -1;
    }
    if (this.minor !== other.minor) {
      return this.minor > other.minor ? 1 : -1;
    }
    if (this.patch !== other.patch) {
      return this.patch > other.patch ? 1 : -1;
    }

    // When major, minor, patch are equal, a pre-release version has lower precedence than normal version.
    if (!this.prerelease && other.prerelease) {
      return 1;
    }
    if (this.prerelease && !other.prerelease) {
      return -1;
    }
    if (this.prerelease && other.prerelease) {
      return this.compareIdentifiers(this.prerelease, other.prerelease);
    }

    // Build metadata is ignored for precedence
    return 0;
  }

  public isGreaterThan(other: SemanticVersion): boolean {
    return this.compare(other) > 0;
  }

  public isLessThan(other: SemanticVersion): boolean {
    return this.compare(other) < 0;
  }

  public isEqual(other: SemanticVersion): boolean {
    return this.compare(other) === 0;
  }

  public toJSON(): Record<string, unknown> {
    return {
      version: this.toString(),
      major: this.major,
      minor: this.minor,
      patch: this.patch,
      prerelease: this.prerelease,
      build: this.build
    };
  }

  private compareIdentifiers(a: string, b: string): number {
    const aParts = a.split('.');
    const bParts = b.split('.');
    const len = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < len; i++) {
      const aVal = aParts[i];
      const bVal = bParts[i];

      if (aVal === undefined) return -1;
      if (bVal === undefined) return 1;
      if (aVal === bVal) continue;

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      const aIsNum = !Number.isNaN(aNum) && String(aNum) === aVal;
      const bIsNum = !Number.isNaN(bNum) && String(bNum) === bVal;

      if (aIsNum && bIsNum) {
        return aNum > bNum ? 1 : -1;
      }
      if (aIsNum && !bIsNum) {
        return -1; // Numeric identifiers always have lower precedence than non-numeric
      }
      if (!aIsNum && bIsNum) {
        return 1;
      }

      return aVal.localeCompare(bVal);
    }

    return 0;
  }
}
