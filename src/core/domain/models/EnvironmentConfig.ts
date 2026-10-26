/**
 * EOS Environment Configuration & Profile Management (Pure Domain Entity)
 * Clean Hexagonal Architecture · Layer 0 Pure Domain Model
 * Zero External Dependencies (Node stdlib / pure TypeScript only)
 * Enforces Commandment VI: Absolute Security & Zero Plain Secrets
 */

export type EnvironmentProfile = 'development' | 'staging' | 'production' | 'test';

export interface SecretScanFinding {
  readonly path: string;
  readonly patternType: string;
  readonly description: string;
}

export class EnvironmentConfig {
  private static readonly PLACEHOLDER_REGEX = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$ENV\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

  // Signatures for known secret patterns (Commandment VI)
  private static readonly SECRET_SIGNATURES: readonly { type: string; regex: RegExp; desc: string }[] = [
    {
      type: 'GOOGLE_API_KEY',
      regex: /AIza[0-9A-Za-z\-_]{30,}/,
      desc: 'Potential hardcoded Google API Key'
    },
    {
      type: 'PRIVATE_KEY_BLOCK',
      regex: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
      desc: 'Embedded private cryptographic key block'
    },
    {
      type: 'GITHUB_TOKEN',
      regex: /gh[pousr]_[A-Za-z0-9_]{36,}/,
      desc: 'Hardcoded GitHub Personal Access or OAuth Token'
    },
    {
      type: 'AWS_ACCESS_KEY',
      regex: /AKIA[0-9A-Z]{16}/,
      desc: 'Hardcoded AWS Access Key ID'
    },
    {
      type: 'HIGH_ENTROPY_BEARER',
      regex: /Bearer\s+[A-Za-z0-9\-_=]{40,}/i,
      desc: 'Plaintext Bearer authentication token'
    }
  ];

  public readonly profile: EnvironmentProfile;
  private readonly data: Readonly<Record<string, unknown>>;

  constructor(profile: EnvironmentProfile, data: Record<string, unknown>) {
    if (!profile || !['development', 'staging', 'production', 'test'].includes(profile)) {
      throw new Error(`Invalid environment profile: "${String(profile)}". Must be development, staging, production, or test.`);
    }

    this.profile = profile;
    this.data = Object.freeze(JSON.parse(JSON.stringify(data)));
  }

  /**
   * Retrieves a nested property using dot-notation (e.g. "server.port" or "auth.jwt.secret").
   */
  public get<T = unknown>(keyPath: string, defaultValue?: T): T {
    const parts = keyPath.split('.');
    let current: any = this.data;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue as T;
      }
      current = current[part];
    }

    return (current !== undefined ? current : defaultValue) as T;
  }

  /**
   * Checks if a key path exists and is defined.
   */
  public has(keyPath: string): boolean {
    return this.get(keyPath) !== undefined;
  }

  public isProduction(): boolean {
    return this.profile === 'production';
  }

  public isDevelopment(): boolean {
    return this.profile === 'development';
  }

  /**
   * Recursively replaces ${VAR} and $ENV{VAR} placeholders with environment values.
   */
  public static resolveEnvPlaceholders(
    value: unknown,
    env: Record<string, string | undefined>
  ): unknown {
    if (typeof value === 'string') {
      return value.replace(this.PLACEHOLDER_REGEX, (_, g1, g2) => {
        const varName = g1 || g2;
        const resolved = env[varName];
        return resolved !== undefined ? resolved : '';
      });
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveEnvPlaceholders(item, env));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.resolveEnvPlaceholders(v, env);
      }
      return result;
    }

    return value;
  }

  /**
   * Scans a configuration object for plaintext secrets or unexpanded required placeholders.
   */
  public static scanForSecrets(obj: unknown, currentPath: string = ''): SecretScanFinding[] {
    const findings: SecretScanFinding[] = [];

    if (typeof obj === 'string') {
      for (const sig of this.SECRET_SIGNATURES) {
        if (sig.regex.test(obj)) {
          findings.push({
            path: currentPath || 'root',
            patternType: sig.type,
            description: sig.desc
          });
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const nextPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
        findings.push(...this.scanForSecrets(item, nextPath));
      });
    } else if (obj !== null && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        const nextPath = currentPath ? `${currentPath}.${k}` : k;
        findings.push(...this.scanForSecrets(v, nextPath));
      }
    }

    return findings;
  }

  /**
   * Validates that required paths are defined and non-empty.
   */
  public validateRequired(requiredPaths: readonly string[]): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const p of requiredPaths) {
      const val = this.get(p);
      if (val === undefined || val === null || val === '') {
        missing.push(p);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Exports sanitized JSON with sensitive keys masked.
   */
  public toSafeJSON(): Record<string, unknown> {
    const sanitize = (val: unknown, keyName: string = ''): unknown => {
      const isSensitiveKey = /secret|password|token|key|credential|private/i.test(keyName);

      if (isSensitiveKey && typeof val === 'string' && val.length > 0) {
        return '***MASKED***';
      }

      if (Array.isArray(val)) {
        return val.map((item, i) => sanitize(item, `${keyName}[${i}]`));
      }

      if (val !== null && typeof val === 'object') {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val)) {
          result[k] = sanitize(v, k);
        }
        return result;
      }

      return val;
    };

    return sanitize(this.data) as Record<string, unknown>;
  }
}
