import { describe, it, expect } from 'vitest';
import { ConfigLoader } from '../../../src/infrastructure/ConfigLoader.js';

describe('ConfigLoader', () => {
  describe('resolveProfile', () => {
    it('resolves production profile aliases', () => {
      expect(ConfigLoader.resolveProfile({ EOS_ENV: 'production' })).toBe('production');
      expect(ConfigLoader.resolveProfile({ NODE_ENV: 'prod' })).toBe('production');
    });

    it('resolves staging and test aliases', () => {
      expect(ConfigLoader.resolveProfile({ EOS_ENV: 'staging' })).toBe('staging');
      expect(ConfigLoader.resolveProfile({ NODE_ENV: 'stage' })).toBe('staging');
      expect(ConfigLoader.resolveProfile({ EOS_ENV: 'test' })).toBe('test');
      expect(ConfigLoader.resolveProfile({ NODE_ENV: 'testing' })).toBe('test');
    });

    it('defaults to development profile when unspecified or unrecognized', () => {
      expect(ConfigLoader.resolveProfile({})).toBe('development');
      expect(ConfigLoader.resolveProfile({ EOS_ENV: 'custom_unknown' })).toBe('development');
    });
  });

  describe('deepMerge', () => {
    it('merges shallow and nested properties cleanly', () => {
      const target = {
        app: 'EOS',
        server: {
          port: 3000,
          host: '127.0.0.1'
        },
        items: [1, 2]
      };

      const source = {
        server: {
          port: 8080,
          ssl: true
        },
        items: [3, 4]
      };

      const merged = ConfigLoader.deepMerge(target, source);
      expect(merged.app).toBe('EOS');
      expect(merged.server.port).toBe(8080);
      expect(merged.server.host).toBe('127.0.0.1');
      expect(merged.server.ssl).toBe(true);
      expect(merged.items).toEqual([3, 4]); // arrays are replaced
    });
  });
});
