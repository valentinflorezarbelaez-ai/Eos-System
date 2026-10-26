/**
 * EOS Configuration Loader (Infrastructure Adapter)
 * Clean Hexagonal Architecture · Layer 2 Infrastructure Port
 * Loads .eos/config profile hierarchies, merges overrides, and resolves environment bindings.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EnvironmentConfig,
  type EnvironmentProfile
} from '../core/domain/models/EnvironmentConfig.js';

export interface ConfigLoaderOptions {
  readonly profile?: EnvironmentProfile | undefined;
  readonly configDir?: string | undefined;
  readonly env?: Record<string, string | undefined> | undefined;
}

export class ConfigLoader {
  /**
   * Loads configuration from disk, merges default and profile files, and returns a verified EnvironmentConfig.
   */
  public static loadConfig(options?: ConfigLoaderOptions): EnvironmentConfig {
    const rawEnv = options?.env ?? process.env;
    const profile = options?.profile ?? this.resolveProfile(rawEnv);
    const configDir = options?.configDir ?? this.resolveDefaultConfigDir();

    let combinedData: Record<string, unknown> = {};

    // 1. Load default.json if available
    const defaultPath = path.join(configDir, 'default.json');
    if (fs.existsSync(defaultPath)) {
      try {
        const raw = fs.readFileSync(defaultPath, 'utf-8');
        combinedData = JSON.parse(raw);
      } catch (err) {
        throw new Error(`Failed to parse base config at ${defaultPath}: ${(err as Error).message}`);
      }
    }

    // 2. Load profile-specific overrides (e.g. development.json or production.json)
    const profilePath = path.join(configDir, `${profile}.json`);
    if (fs.existsSync(profilePath)) {
      try {
        const raw = fs.readFileSync(profilePath, 'utf-8');
        const profileData = JSON.parse(raw);
        combinedData = this.deepMerge(combinedData, profileData);
      } catch (err) {
        throw new Error(`Failed to parse profile config at ${profilePath}: ${(err as Error).message}`);
      }
    }

    // 3. Resolve environment variable placeholders
    const resolvedData = EnvironmentConfig.resolveEnvPlaceholders(
      combinedData,
      rawEnv
    ) as Record<string, unknown>;

    return new EnvironmentConfig(profile, resolvedData);
  }

  /**
   * Resolves the current environment profile from environment variables.
   */
  public static resolveProfile(env: Record<string, string | undefined>): EnvironmentProfile {
    const candidate = (env['EOS_ENV'] || env['NODE_ENV'] || 'development').toLowerCase();

    if (candidate === 'prod' || candidate === 'production') {
      return 'production';
    }
    if (candidate === 'staging' || candidate === 'stage') {
      return 'staging';
    }
    if (candidate === 'test' || candidate === 'testing') {
      return 'test';
    }

    return 'development';
  }

  /**
   * Deep merges two objects immutably.
   */
  public static deepMerge(
    target: Record<string, any>,
    source: Record<string, any>
  ): Record<string, any> {
    const output = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        key in output &&
        typeof output[key] === 'object' &&
        !Array.isArray(output[key])
      ) {
        output[key] = this.deepMerge(output[key], value);
      } else {
        output[key] = value;
      }
    }

    return output;
  }

  private static resolveDefaultConfigDir(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const root = path.resolve(__dirname, '..', '..');
    return path.join(root, '.eos', 'config');
  }
}
