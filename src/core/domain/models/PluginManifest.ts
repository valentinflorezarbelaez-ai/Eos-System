/**
 * PluginManifest Domain Model (Layer 0 — Pure Domain)
 * SPEC-018: Plugin & Extension System
 *
 * Defines the immutable manifest contract for sovereign EOS extensions and plugins.
 * Validates metadata, Semantic Versioning (SemVer 2.0.0), capability requirements,
 * and declared lifecycle hooks.
 *
 * ZERO external dependencies — strictly pure TypeScript.
 */

import { SemanticVersion } from './SemanticVersion.js';

export const PluginHookTypes = ['onInit', 'preStep', 'postStep', 'onDestroy'] as const;
export type PluginHookType = (typeof PluginHookTypes)[number];

export interface PluginManifestParams {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly entrypoint?: string | undefined;
  readonly capabilities?: readonly string[] | undefined;
  readonly dependencies?: Record<string, string> | undefined;
  readonly hooks?: readonly PluginHookType[] | undefined;
}

export class PluginManifest {
  readonly name: string;
  readonly version: SemanticVersion;
  readonly description: string;
  readonly author: string;
  readonly entrypoint?: string | undefined;
  readonly capabilities: readonly string[];
  readonly dependencies: Readonly<Record<string, string>>;
  readonly hooks: readonly PluginHookType[];

  constructor(params: PluginManifestParams) {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('PluginManifest name must be a non-empty string.');
    }
    if (!PluginManifest.isValidName(params.name)) {
      throw new Error(
        `Invalid plugin name "${params.name}". Must contain lowercase alphanumeric characters, hyphens, or a valid @scope prefix.`
      );
    }

    if (!params.description || params.description.trim().length === 0) {
      throw new Error('PluginManifest description must be a non-empty string.');
    }

    if (!params.author || params.author.trim().length === 0) {
      throw new Error('PluginManifest author must be a non-empty string.');
    }

    // Validate Semantic Version
    let parsedVersion: SemanticVersion;
    try {
      parsedVersion = SemanticVersion.parse(params.version);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid plugin version "${params.version}": ${msg}`);
    }

    // Validate declared hooks
    const declaredHooks = params.hooks ?? [];
    for (const h of declaredHooks) {
      if (!PluginHookTypes.includes(h)) {
        throw new Error(`Invalid lifecycle hook "${h}". Valid hooks: ${PluginHookTypes.join(', ')}`);
      }
    }

    this.name = params.name.trim();
    this.version = parsedVersion;
    this.description = params.description.trim();
    this.author = params.author.trim();
    this.entrypoint = params.entrypoint?.trim();
    this.capabilities = Object.freeze([...(params.capabilities ?? [])]);
    this.dependencies = Object.freeze({ ...(params.dependencies ?? {}) });
    this.hooks = Object.freeze([...declaredHooks]);

    Object.freeze(this);
  }

  static create(params: PluginManifestParams): PluginManifest {
    return new PluginManifest(params);
  }

  static isValidName(name: string): boolean {
    const trimmed = name.trim();
    // Allows e.g. "eos-slack-alerts", "my-plugin", "@eos/sentinel-hook"
    return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(trimmed);
  }

  declaresHook(hook: PluginHookType): boolean {
    return this.hooks.includes(hook);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      version: this.version.toString(),
      description: this.description,
      author: this.author,
      entrypoint: this.entrypoint,
      capabilities: this.capabilities,
      dependencies: this.dependencies,
      hooks: this.hooks,
    };
  }
}
