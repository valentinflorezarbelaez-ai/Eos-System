import { FileChecksum } from '../core/domain/types.js';

export interface IntegrityAuditResult {
  readonly timestamp: string;
  readonly healthy: boolean;
  readonly totalFilesMonitored: number;
  readonly mutatedFiles: readonly string[];
  readonly missingFiles: readonly string[];
}

/**
 * EOSSentinelDaemon (Monitoring Layer)
 * Maintains continuous 24/7 pulse evaluating SHA-256 cryptographic signatures
 * to prevent illegal, unapproved mutations across the control plane.
 */
export class EOSSentinelDaemon {
  private readonly baselineSignatures: Map<string, string>;

  constructor(baseline: readonly FileChecksum[] = []) {
    this.baselineSignatures = new Map(
      baseline.map((item) => [item.relativePath, item.sha256])
    );
  }

  auditIntegrity(currentFiles: readonly FileChecksum[]): IntegrityAuditResult {
    const currentMap = new Map(
      currentFiles.map((item) => [item.relativePath, item.sha256])
    );

    const mutatedFiles: string[] = [];
    const missingFiles: string[] = [];

    for (const [path, expectedHash] of this.baselineSignatures.entries()) {
      const currentHash = currentMap.get(path);
      if (!currentHash) {
        missingFiles.push(path);
      } else if (currentHash !== expectedHash) {
        mutatedFiles.push(path);
      }
    }

    const healthy = mutatedFiles.length === 0 && missingFiles.length === 0;

    return {
      timestamp: new Date().toISOString(),
      healthy,
      totalFilesMonitored: this.baselineSignatures.size,
      mutatedFiles: Object.freeze(mutatedFiles),
      missingFiles: Object.freeze(missingFiles)
    };
  }
}
