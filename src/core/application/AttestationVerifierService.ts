import { FileChecksum, EpistemicState } from '../domain/types.js';
import { IAsymmetricCryptoService } from '../../infrastructure/AsymmetricCryptoService.js';

export interface SignedBaselineManifest {
  readonly manifestVersion: string;
  readonly keyId: string;
  readonly signedCommit: string;
  readonly timestamp: string;
  readonly files: readonly FileChecksum[];
  readonly signatureHex: string;
}

export interface VerificationEvaluation {
  readonly isAuthentic: boolean;
  readonly epistemicState: EpistemicState;
  readonly signatureValid: boolean;
  readonly mutatedFiles: readonly string[];
  readonly missingFiles: readonly string[];
  readonly untrackedFiles: readonly string[];
  readonly details: string;
}

/**
 * AttestationVerifierService (Application Layer)
 * Enforces the independent, read-only verification barrier.
 * Verifies that the workspace conforms to an externally signed baseline
 * WITHOUT possessing any capability or permission to overwrite the baseline.
 */
export class AttestationVerifierService {
  constructor(private readonly cryptoService: IAsymmetricCryptoService) {}

  verifyBaseline(
    manifest: SignedBaselineManifest,
    publicKeyPem: string,
    currentFiles: readonly FileChecksum[]
  ): VerificationEvaluation {
    // 1. Verify asymmetric signature of the manifest payload
    const canonicalPayload = JSON.stringify({
      manifestVersion: manifest.manifestVersion,
      keyId: manifest.keyId,
      signedCommit: manifest.signedCommit,
      timestamp: manifest.timestamp,
      files: manifest.files
    });

    const signatureValid = this.cryptoService.verifyEd25519(
      canonicalPayload,
      manifest.signatureHex,
      publicKeyPem
    );

    if (!signatureValid) {
      return {
        isAuthentic: false,
        epistemicState: 'REMEDIATION_REQUIRED',
        signatureValid: false,
        mutatedFiles: [],
        missingFiles: [],
        untrackedFiles: [],
        details: 'Baseline manifest signature is invalid or tampered with'
      };
    }

    // 2. Build index of expected baseline files
    const baselineMap = new Map<string, string>();
    for (const f of manifest.files) {
      baselineMap.set(f.relativePath.replace(/\\/g, '/'), f.sha256.toUpperCase());
    }

    // 3. Build index of current workspace files
    const currentMap = new Map<string, string>();
    for (const f of currentFiles) {
      currentMap.set(f.relativePath.replace(/\\/g, '/'), f.sha256.toUpperCase());
    }

    const mutatedFiles: string[] = [];
    const missingFiles: string[] = [];
    const untrackedFiles: string[] = [];

    // Detect mutations and missing files
    for (const [relPath, expectedHash] of baselineMap.entries()) {
      const currentHash = currentMap.get(relPath);
      if (!currentHash) {
        missingFiles.push(relPath);
      } else if (currentHash !== expectedHash) {
        mutatedFiles.push(relPath);
      }
    }

    // Detect unexpected extra files in tracked scope
    for (const relPath of currentMap.keys()) {
      if (!baselineMap.has(relPath)) {
        untrackedFiles.push(relPath);
      }
    }

    const hasDivergence =
      mutatedFiles.length > 0 || missingFiles.length > 0;

    const isAuthentic = !hasDivergence;
    const epistemicState: EpistemicState = isAuthentic
      ? 'VERIFIED'
      : 'FINDINGS_IDENTIFIED';

    const details = isAuthentic
      ? 'Workspace conforms 100% to externally signed baseline manifest'
      : `Divergence detected: ${mutatedFiles.length} mutated, ${missingFiles.length} missing`;

    return {
      isAuthentic,
      epistemicState,
      signatureValid: true,
      mutatedFiles: Object.freeze(mutatedFiles),
      missingFiles: Object.freeze(missingFiles),
      untrackedFiles: Object.freeze(untrackedFiles),
      details
    };
  }
}
