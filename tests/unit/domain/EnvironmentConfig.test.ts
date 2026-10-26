import { describe, it, expect } from 'vitest';
import { EnvironmentConfig } from '../../../src/core/domain/models/EnvironmentConfig.js';
import type { EnvironmentProfile } from '../../../src/core/domain/models/EnvironmentConfig.js';

describe('EnvironmentConfig', () => {
  describe('Construction & Profile Validation', () => {
    it('creates a valid configuration for supported profiles', () => {
      const devConfig = new EnvironmentConfig('development', { appName: 'EOS' });
      expect(devConfig.profile).toBe('development');
      expect(devConfig.isDevelopment()).toBe(true);
      expect(devConfig.isProduction()).toBe(false);

      const prodConfig = new EnvironmentConfig('production', { appName: 'EOS' });
      expect(prodConfig.isProduction()).toBe(true);
      expect(prodConfig.isDevelopment()).toBe(false);

      const stagingConfig = new EnvironmentConfig('staging', {});
      expect(stagingConfig.profile).toBe('staging');

      const testConfig = new EnvironmentConfig('test', {});
      expect(testConfig.profile).toBe('test');
    });

    it('throws on invalid profile name', () => {
      expect(() => new EnvironmentConfig('invalid_profile' as EnvironmentProfile, {}))
        .toThrow('Invalid environment profile');
    });
  });

  describe('Property Access (get, has)', () => {
    const config = new EnvironmentConfig('development', {
      server: {
        port: 3300,
        host: '0.0.0.0',
        ssl: {
          enabled: false
        }
      },
      tags: ['ai', 'agentic', 'hexagonal']
    });

    it('retrieves top-level and nested properties via dot-notation', () => {
      expect(config.get('server.port')).toBe(3300);
      expect(config.get('server.host')).toBe('0.0.0.0');
      expect(config.get('server.ssl.enabled')).toBe(false);
      expect(config.get('tags')).toEqual(['ai', 'agentic', 'hexagonal']);
    });

    it('returns default value when key does not exist', () => {
      expect(config.get('server.timeout', 5000)).toBe(5000);
      expect(config.get('database.url', 'sqlite://memory')).toBe('sqlite://memory');
    });

    it('checks existence correctly with has()', () => {
      expect(config.has('server.port')).toBe(true);
      expect(config.has('server.nonexistent')).toBe(false);
      expect(config.has('unknown.path')).toBe(false);
    });
  });

  describe('Placeholder Resolution', () => {
    it('resolves ${VAR} and $ENV{VAR} placeholders', () => {
      const template = {
        host: '${HOST}',
        port: '$ENV{PORT}',
        nested: {
          dbUrl: 'postgres://${DB_USER}:${DB_PASS}@localhost:5432/eos'
        },
        list: ['${ITEM_1}', 'static', '$ENV{ITEM_2}']
      };

      const mockEnv = {
        HOST: 'api.eos.local',
        PORT: '8080',
        DB_USER: 'eos_admin',
        DB_PASS: 'secret_pass',
        ITEM_1: 'val1',
        ITEM_2: 'val2'
      };

      const resolved = EnvironmentConfig.resolveEnvPlaceholders(template, mockEnv) as any;
      expect(resolved.host).toBe('api.eos.local');
      expect(resolved.port).toBe('8080');
      expect(resolved.nested.dbUrl).toBe('postgres://eos_admin:secret_pass@localhost:5432/eos');
      expect(resolved.list).toEqual(['val1', 'static', 'val2']);
    });

    it('replaces unassigned variables with empty string', () => {
      const template = 'key=${UNSET_KEY}';
      const resolved = EnvironmentConfig.resolveEnvPlaceholders(template, {});
      expect(resolved).toBe('key=');
    });

    it('passes through primitives untouched', () => {
      expect(EnvironmentConfig.resolveEnvPlaceholders(12345, {})).toBe(12345);
      expect(EnvironmentConfig.resolveEnvPlaceholders(true, {})).toBe(true);
      expect(EnvironmentConfig.resolveEnvPlaceholders(null, {})).toBeNull();
    });
  });

  describe('Secret Scanning (Commandment VI)', () => {
    it('detects hardcoded Google API keys', () => {
      const sample = {
        aiProvider: {
          googleApiKey: 'AIzaSyD-fakeKey1234567890abcdefghijklm'
        }
      };

      const findings = EnvironmentConfig.scanForSecrets(sample);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.path).toBe('aiProvider.googleApiKey');
      expect(findings[0]?.patternType).toBe('GOOGLE_API_KEY');
    });

    it('detects embedded private key blocks', () => {
      const sample = {
        crypto: {
          key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----'
        }
      };

      const findings = EnvironmentConfig.scanForSecrets(sample);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.patternType).toBe('PRIVATE_KEY_BLOCK');
    });

    it('detects plaintext GitHub and AWS tokens in arrays', () => {
      const sample = [
        'ghp_123456789012345678901234567890123456',
        'clean_value',
        'AKIAIOSFODNN7EXAMPLE'
      ];

      const findings = EnvironmentConfig.scanForSecrets(sample);
      expect(findings).toHaveLength(2);
      expect(findings[0]?.patternType).toBe('GITHUB_TOKEN');
      expect(findings[1]?.patternType).toBe('AWS_ACCESS_KEY');
    });

    it('returns empty findings for clean configurations', () => {
      const sample = {
        server: { port: 3000 },
        database: { host: 'localhost' },
        apiKey: '${ENV_API_KEY}' // safe placeholder
      };

      const findings = EnvironmentConfig.scanForSecrets(sample);
      expect(findings).toHaveLength(0);
    });
  });

  describe('Validation & Safe Export', () => {
    it('validates required configuration paths', () => {
      const config = new EnvironmentConfig('production', {
        database: { url: 'postgres://localhost/db' }
      });

      const check1 = config.validateRequired(['database.url']);
      expect(check1.valid).toBe(true);
      expect(check1.missing).toHaveLength(0);

      const check2 = config.validateRequired(['database.url', 'auth.jwtSecret', 'redis.host']);
      expect(check2.valid).toBe(false);
      expect(check2.missing).toEqual(['auth.jwtSecret', 'redis.host']);
    });

    it('masks sensitive keys in toSafeJSON()', () => {
      const config = new EnvironmentConfig('production', {
        publicName: 'EOS Sovereign Core',
        apiKey: 'real_sensitive_key_value',
        database: {
          password: 'super_secret_db_password',
          host: '127.0.0.1'
        },
        tokens: ['token1', 'token2']
      });

      const safe = config.toSafeJSON() as any;
      expect(safe.publicName).toBe('EOS Sovereign Core');
      expect(safe.apiKey).toBe('***MASKED***');
      expect(safe.database.password).toBe('***MASKED***');
      expect(safe.database.host).toBe('127.0.0.1');
    });
  });
});
