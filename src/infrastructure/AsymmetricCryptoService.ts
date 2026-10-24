import * as crypto from 'node:crypto';

export interface IAsymmetricCryptoService {
  verifyEd25519(
    payload: Buffer | string,
    signatureHex: string,
    publicKeyPem: string
  ): boolean;
  signEd25519(payload: Buffer | string, privateKeyPem: string): string;
  generateEd25519KeyPair(): { publicKeyPem: string; privateKeyPem: string };
  hashSha256(content: Buffer | string): string;
}

/**
 * AsymmetricCryptoService (Infrastructure Layer)
 * Implements asymmetric Ed25519 signature signing, verification,
 * and SHA-256 digests following NIST and SLSA standards.
 */
export class AsymmetricCryptoService implements IAsymmetricCryptoService {
  verifyEd25519(
    payload: Buffer | string,
    signatureHex: string,
    publicKeyPem: string
  ): boolean {
    try {
      const bufferPayload = Buffer.isBuffer(payload)
        ? payload
        : Buffer.from(payload, 'utf-8');
      const signatureBuffer = Buffer.from(signatureHex, 'hex');

      return crypto.verify(
        null, // Ed25519 uses internal one-shot hash
        bufferPayload,
        publicKeyPem,
        signatureBuffer
      );
    } catch {
      return false;
    }
  }

  signEd25519(payload: Buffer | string, privateKeyPem: string): string {
    const bufferPayload = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(payload, 'utf-8');

    const signature = crypto.sign(null, bufferPayload, privateKeyPem);
    return signature.toString('hex');
  }

  generateEd25519KeyPair(): { publicKeyPem: string; privateKeyPem: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    return { publicKeyPem: publicKey, privateKeyPem: privateKey };
  }

  hashSha256(content: Buffer | string): string {
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, 'utf-8');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
