/**
 * Unit Tests for PluginManifest Domain Model
 * SPEC-018: Plugin & Extension System
 */

import { describe, it, expect } from 'vitest';
import { PluginManifest, PluginHookTypes } from '../../../src/core/domain/models/PluginManifest.js';

describe('PluginManifest Domain Model', () => {
  it('instantiates valid plugin manifests with frozen immutability', () => {
    const manifest = PluginManifest.create({
      name: 'eos-slack-notifier',
      version: '1.2.3',
      description: 'Dispatches notifications to Slack channels',
      author: 'EOS Team',
      entrypoint: './dist/index.js',
      capabilities: ['notification', 'telemetry'],
      dependencies: { '@slack/webhook': '^7.0.0' },
      hooks: ['onInit', 'postStep'],
    });

    expect(manifest.name).toBe('eos-slack-notifier');
    expect(manifest.version.toString()).toBe('1.2.3');
    expect(manifest.description).toBe('Dispatches notifications to Slack channels');
    expect(manifest.author).toBe('EOS Team');
    expect(manifest.entrypoint).toBe('./dist/index.js');
    expect(manifest.capabilities).toEqual(['notification', 'telemetry']);
    expect(manifest.dependencies['@slack/webhook']).toBe('^7.0.0');
    expect(manifest.hooks).toEqual(['onInit', 'postStep']);

    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.capabilities)).toBe(true);
    expect(Object.isFrozen(manifest.dependencies)).toBe(true);
    expect(Object.isFrozen(manifest.hooks)).toBe(true);
  });

  it('supports scoped plugin names like @org/plugin-name', () => {
    const manifest = PluginManifest.create({
      name: '@eos/security-scanner',
      version: '2.0.0',
      description: 'Automated vulnerability scanner',
      author: 'Security Lead',
    });

    expect(manifest.name).toBe('@eos/security-scanner');
    expect(PluginManifest.isValidName('@eos/security-scanner')).toBe(true);
  });

  it('throws error on missing or invalid required fields', () => {
    expect(() =>
      PluginManifest.create({
        name: '',
        version: '1.0.0',
        description: 'Desc',
        author: 'Author',
      })
    ).toThrow('PluginManifest name must be a non-empty string.');

    expect(() =>
      PluginManifest.create({
        name: 'Invalid Name With Spaces!',
        version: '1.0.0',
        description: 'Desc',
        author: 'Author',
      })
    ).toThrow(/Invalid plugin name/);

    expect(() =>
      PluginManifest.create({
        name: 'valid-plugin',
        version: 'not-a-semver',
        description: 'Desc',
        author: 'Author',
      })
    ).toThrow(/Invalid plugin version/);

    expect(() =>
      PluginManifest.create({
        name: 'valid-plugin',
        version: '1.0.0',
        description: '',
        author: 'Author',
      })
    ).toThrow('PluginManifest description must be a non-empty string.');

    expect(() =>
      PluginManifest.create({
        name: 'valid-plugin',
        version: '1.0.0',
        description: 'Desc',
        author: '',
      })
    ).toThrow('PluginManifest author must be a non-empty string.');

    expect(() =>
      PluginManifest.create({
        name: 'valid-plugin',
        version: '1.0.0',
        description: 'Desc',
        author: 'Author',
        hooks: ['invalidHook' as any],
      })
    ).toThrow(/Invalid lifecycle hook/);
  });

  it('checks declared hooks correctly', () => {
    const manifest = PluginManifest.create({
      name: 'hook-checker',
      version: '1.0.0',
      description: 'Checks hooks',
      author: 'Author',
      hooks: ['preStep', 'onDestroy'],
    });

    expect(manifest.declaresHook('preStep')).toBe(true);
    expect(manifest.declaresHook('onDestroy')).toBe(true);
    expect(manifest.declaresHook('postStep')).toBe(false);
  });

  it('serializes to JSON cleanly', () => {
    const manifest = PluginManifest.create({
      name: 'json-plugin',
      version: '0.1.0-beta.1',
      description: 'JSON test',
      author: 'Tester',
      hooks: ['onInit'],
    });

    const json = manifest.toJSON();
    expect(json.name).toBe('json-plugin');
    expect(json.version).toBe('0.1.0-beta.1');
    expect(json.author).toBe('Tester');
    expect(json.hooks).toEqual(['onInit']);
  });

  it('exposes all valid lifecycle hook types', () => {
    expect(PluginHookTypes).toEqual(['onInit', 'preStep', 'postStep', 'onDestroy']);
  });
});
