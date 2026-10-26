/**
 * Unit Tests for PluginManager Application Service
 * SPEC-018: Plugin & Extension System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from '../../../src/core/application/PluginManager.js';
import { PluginManifest } from '../../../src/core/domain/models/PluginManifest.js';
import { TelemetryPipeline } from '../../../src/core/application/TelemetryPipeline.js';

describe('PluginManager Application Service', () => {
  let pipeline: TelemetryPipeline;
  let manager: PluginManager;

  beforeEach(() => {
    pipeline = new TelemetryPipeline({ minSeverity: 'DEBUG' });
    manager = new PluginManager({ telemetry: pipeline });
  });

  it('registers and lists plugins', () => {
    const manifest = PluginManifest.create({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'Tester',
      hooks: ['onInit', 'preStep'],
    });

    const instance = manager.registerPlugin(manifest);
    expect(instance.status).toBe('ACTIVE');
    expect(instance.manifest.name).toBe('test-plugin');

    const plugins = manager.listPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].manifest.name).toBe('test-plugin');
  });

  it('rejects registering duplicate plugin names', () => {
    const manifest = PluginManifest.create({
      name: 'duplicate-plugin',
      version: '1.0.0',
      description: 'First',
      author: 'Author',
    });

    manager.registerPlugin(manifest);
    expect(() => manager.registerPlugin(manifest)).toThrow('is already registered');
  });

  it('unregisters plugins cleanly', () => {
    const manifest = PluginManifest.create({
      name: 'transient-plugin',
      version: '1.0.0',
      description: 'Transient',
      author: 'Author',
    });

    manager.registerPlugin(manifest);
    expect(manager.getPlugin('transient-plugin')).toBeDefined();

    const removed = manager.unregisterPlugin('transient-plugin');
    expect(removed).toBe(true);
    expect(manager.getPlugin('transient-plugin')).toBeUndefined();

    // Removing non-existent returns false
    expect(manager.unregisterPlugin('transient-plugin')).toBe(false);
  });

  it('enables and disables plugins', () => {
    const manifest = PluginManifest.create({
      name: 'toggle-plugin',
      version: '1.0.0',
      description: 'Toggleable',
      author: 'Author',
    });

    manager.registerPlugin(manifest);
    expect(manager.getPlugin('toggle-plugin')?.status).toBe('ACTIVE');

    manager.disablePlugin('toggle-plugin');
    expect(manager.getPlugin('toggle-plugin')?.status).toBe('DISABLED');

    manager.enablePlugin('toggle-plugin');
    expect(manager.getPlugin('toggle-plugin')?.status).toBe('ACTIVE');

    expect(manager.disablePlugin('unknown')).toBe(false);
    expect(manager.enablePlugin('unknown')).toBe(false);
  });

  it('dispatches hooks to active plugin handlers', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const manifest1 = PluginManifest.create({
      name: 'plugin-one',
      version: '1.0.0',
      description: 'First',
      author: 'Author',
      hooks: ['preStep'],
    });

    const manifest2 = PluginManifest.create({
      name: 'plugin-two',
      version: '1.0.0',
      description: 'Second',
      author: 'Author',
      hooks: ['preStep'],
    });

    manager.registerPlugin(manifest1, { preStep: handler1 });
    manager.registerPlugin(manifest2, { preStep: handler2 });

    const result = await manager.dispatchHook('preStep', { stepName: 'Step 1' });
    expect(result.totalExecuted).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(handler1).toHaveBeenCalledWith({ stepName: 'Step 1' });
    expect(handler2).toHaveBeenCalledWith({ stepName: 'Step 1' });
  });

  it('sandboxes errors in hooks and marks failing plugin with ERROR status', async () => {
    const goodHandler = vi.fn();
    const badHandler = vi.fn().mockImplementation(() => {
      throw new Error('Explosion inside plugin hook');
    });

    const goodManifest = PluginManifest.create({
      name: 'good-plugin',
      version: '1.0.0',
      description: 'Good',
      author: 'Author',
      hooks: ['postStep'],
    });

    const badManifest = PluginManifest.create({
      name: 'bad-plugin',
      version: '1.0.0',
      description: 'Bad',
      author: 'Author',
      hooks: ['postStep'],
    });

    manager.registerPlugin(goodManifest, { postStep: goodHandler });
    manager.registerPlugin(badManifest, { postStep: badHandler });

    const result = await manager.dispatchHook('postStep', { result: 'OK' });
    expect(result.totalExecuted).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].pluginName).toBe('bad-plugin');
    expect(result.errors[0].error).toContain('Explosion inside plugin hook');

    // Good handler was still called!
    expect(goodHandler).toHaveBeenCalled();

    // Bad plugin is marked with status ERROR
    expect(manager.getPlugin('bad-plugin')?.status).toBe('ERROR');
  });

  it('skips disabled plugins during hook dispatch', async () => {
    const handler = vi.fn();

    const manifest = PluginManifest.create({
      name: 'disabled-plugin',
      version: '1.0.0',
      description: 'Disabled',
      author: 'Author',
      hooks: ['onInit'],
    });

    manager.registerPlugin(manifest, { onInit: handler });
    manager.disablePlugin('disabled-plugin');

    const result = await manager.dispatchHook('onInit');
    expect(result.totalExecuted).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('scaffolds plugin templates correctly', () => {
    const scaffold = PluginManager.scaffoldTemplate('eos-discord-bot', {
      description: 'Discord bot plugin',
      author: 'Discord Dev',
    });

    expect(scaffold.manifest).toBeDefined();
    expect((scaffold.manifest as any).name).toBe('eos-discord-bot');
    expect((scaffold.manifest as any).author).toBe('Discord Dev');
    expect(scaffold.sampleCode).toContain('export default');
  });
});
