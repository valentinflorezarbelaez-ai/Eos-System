import { describe, it, expect } from 'vitest';
import { SemanticVersion } from '../../../src/core/domain/models/SemanticVersion.js';

describe('SemanticVersion', () => {
  describe('Parsing & Construction', () => {
    it('constructs a valid SemanticVersion directly', () => {
      const v = new SemanticVersion(1, 2, 3, 'alpha.1', 'build.42');
      expect(v.major).toBe(1);
      expect(v.minor).toBe(2);
      expect(v.patch).toBe(3);
      expect(v.prerelease).toBe('alpha.1');
      expect(v.build).toBe('build.42');
      expect(v.toString()).toBe('1.2.3-alpha.1+build.42');
    });

    it('throws error when major is negative or non-integer', () => {
      expect(() => new SemanticVersion(-1, 0, 0)).toThrow('Invalid major version');
      expect(() => new SemanticVersion(1.5, 0, 0)).toThrow('Invalid major version');
    });

    it('throws error when minor is negative or non-integer', () => {
      expect(() => new SemanticVersion(1, -2, 0)).toThrow('Invalid minor version');
      expect(() => new SemanticVersion(1, 2.5, 0)).toThrow('Invalid minor version');
    });

    it('throws error when patch is negative or non-integer', () => {
      expect(() => new SemanticVersion(1, 0, -3)).toThrow('Invalid patch version');
      expect(() => new SemanticVersion(1, 0, 3.5)).toThrow('Invalid patch version');
    });

    it('parses basic version strings', () => {
      const v = SemanticVersion.parse('2.1.0');
      expect(v.major).toBe(2);
      expect(v.minor).toBe(1);
      expect(v.patch).toBe(0);
      expect(v.prerelease).toBeUndefined();
      expect(v.build).toBeUndefined();
      expect(v.toString()).toBe('2.1.0');
    });

    it('parses version with leading v and whitespace', () => {
      const v = SemanticVersion.parse('  v3.0.4  ');
      expect(v.major).toBe(3);
      expect(v.minor).toBe(0);
      expect(v.patch).toBe(4);
      expect(v.toString()).toBe('3.0.4');
    });

    it('parses version with prerelease and build metadata', () => {
      const v = SemanticVersion.parse('1.0.0-rc.2+sha.abcdef');
      expect(v.major).toBe(1);
      expect(v.minor).toBe(0);
      expect(v.patch).toBe(0);
      expect(v.prerelease).toBe('rc.2');
      expect(v.build).toBe('sha.abcdef');
      expect(v.toString()).toBe('1.0.0-rc.2+sha.abcdef');
    });

    it('throws when string is empty or invalid', () => {
      expect(() => SemanticVersion.parse('')).toThrow('Version string must be a non-empty string');
      expect(() => SemanticVersion.parse(null as any)).toThrow('Version string must be a non-empty string');
      expect(() => SemanticVersion.parse('not.a.version')).toThrow('Invalid SemVer format');
      expect(() => SemanticVersion.parse('1.2')).toThrow('Invalid SemVer format');
    });
  });

  describe('Bumping Operations', () => {
    it('bumps patch correctly', () => {
      const v = SemanticVersion.parse('1.2.3');
      const next = v.bumpPatch();
      expect(next.toString()).toBe('1.2.4');
    });

    it('bumps minor and resets patch', () => {
      const v = SemanticVersion.parse('1.2.9');
      const next = v.bumpMinor();
      expect(next.toString()).toBe('1.3.0');
    });

    it('bumps major and resets minor and patch', () => {
      const v = SemanticVersion.parse('1.8.12');
      const next = v.bumpMajor();
      expect(next.toString()).toBe('2.0.0');
    });

    it('bumps with prerelease tags', () => {
      const v = SemanticVersion.parse('2.0.0');
      const next = v.bumpMinor('beta.1');
      expect(next.toString()).toBe('2.1.0-beta.1');
    });

    it('bumps generic bump method', () => {
      const v = SemanticVersion.parse('1.0.0');
      expect(v.bump('major').toString()).toBe('2.0.0');
      expect(v.bump('minor').toString()).toBe('1.1.0');
      expect(v.bump('patch').toString()).toBe('1.0.1');
      expect(() => v.bump('invalid' as any)).toThrow('Unknown bump type');
    });
  });

  describe('Comparison & Precedence', () => {
    it('compares major versions', () => {
      const v1 = SemanticVersion.parse('1.0.0');
      const v2 = SemanticVersion.parse('2.0.0');
      expect(v1.compare(v2)).toBe(-1);
      expect(v2.compare(v1)).toBe(1);
      expect(v2.isGreaterThan(v1)).toBe(true);
      expect(v1.isLessThan(v2)).toBe(true);
    });

    it('compares minor versions', () => {
      const v1 = SemanticVersion.parse('1.1.0');
      const v2 = SemanticVersion.parse('1.2.0');
      expect(v1.compare(v2)).toBe(-1);
      expect(v2.compare(v1)).toBe(1);
    });

    it('compares patch versions', () => {
      const v1 = SemanticVersion.parse('1.1.1');
      const v2 = SemanticVersion.parse('1.1.2');
      expect(v1.compare(v2)).toBe(-1);
      expect(v2.compare(v1)).toBe(1);
    });

    it('normal version has higher precedence than pre-release version', () => {
      const normal = SemanticVersion.parse('1.0.0');
      const prerelease = SemanticVersion.parse('1.0.0-rc.1');
      expect(normal.isGreaterThan(prerelease)).toBe(true);
      expect(prerelease.isLessThan(normal)).toBe(true);
    });

    it('compares pre-release identifiers with numeric vs string precedence', () => {
      const alpha1 = SemanticVersion.parse('1.0.0-alpha.1');
      const alpha2 = SemanticVersion.parse('1.0.0-alpha.2');
      const beta = SemanticVersion.parse('1.0.0-beta');
      const alphaStr = SemanticVersion.parse('1.0.0-alpha.beta');

      expect(alpha1.isLessThan(alpha2)).toBe(true);
      expect(alpha2.isLessThan(beta)).toBe(true);
      expect(alpha1.isLessThan(alphaStr)).toBe(true); // numeric has lower precedence than non-numeric
      expect(alphaStr.isGreaterThan(alpha1)).toBe(true); // non-numeric has higher precedence than numeric

      const samePrerelease1 = SemanticVersion.parse('1.0.0-rc.1');
      const samePrerelease2 = SemanticVersion.parse('1.0.0-rc.1');
      expect(samePrerelease1.compare(samePrerelease2)).toBe(0);
    });

    it('compares identical versions and recognizes equality', () => {
      const v1 = SemanticVersion.parse('2.0.0');
      const v2 = SemanticVersion.parse('2.0.0');
      expect(v1.compare(v2)).toBe(0);
      expect(v1.isEqual(v2)).toBe(true);
    });

    it('ignores build metadata during comparison', () => {
      const v1 = SemanticVersion.parse('1.0.0+build.1');
      const v2 = SemanticVersion.parse('1.0.0+build.2');
      expect(v1.compare(v2)).toBe(0);
      expect(v1.isEqual(v2)).toBe(true);
    });

    it('serializes to JSON correctly', () => {
      const v = SemanticVersion.parse('3.1.2-beta.1+exp.sha');
      const json = v.toJSON();
      expect(json.version).toBe('3.1.2-beta.1+exp.sha');
      expect(json.major).toBe(3);
      expect(json.minor).toBe(1);
      expect(json.patch).toBe(2);
      expect(json.prerelease).toBe('beta.1');
      expect(json.build).toBe('exp.sha');
    });
  });
});
