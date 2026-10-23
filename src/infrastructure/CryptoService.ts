import * as crypto from 'node:crypto';
import { FileChecksum } from '../core/domain/types.js';

export interface ICryptoService {
  hashBuffer(buffer: Buffer): string;
  hashString(content: string): string;
  verifyChecksum(computed: string, expected: string): boolean;
}

/**
 * CryptoService (Infrastructure Layer)
 * Provides SHA-256 cryptographic signing and integrity verification.
 * Cleanly separated from pure domain logic.
 */
export class CryptoService implements ICryptoService {
  hashBuffer(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  hashString(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  verifyChecksum(computed: string, expected: string): boolean {
    if (!computed || !expected) return false;
    return computed.toLowerCase() === expected.toLowerCase();
  }

  createFileChecksum(relativePath: string, content: Buffer): FileChecksum {
    return {
      relativePath: relativePath.replace(/\\/g, '/'),
      sha256: this.hashBuffer(content),
      sizeBytes: content.byteLength
    };
  }
}
