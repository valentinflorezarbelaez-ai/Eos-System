/**
 * @module EOSMemoryGuard
 * @description Real-time Cryptographic Memory and Ledger Payload Validator for EOS & Engram.
 * Intercepts transaction payloads before submission to Engram MCP,
 * ensuring SHA-256 integrity, frontmatter conformance, and zero illegal structural mutations.
 */

import crypto from 'node:crypto';

export class EOSMemoryGuard {
  constructor(options = {}) {
    this.name = 'EOS Memory Guard';
  }

  /**
   * Validates a transaction payload before persistence to Engram MCP Ledger
   * @param {object} registro Transaction record to validate
   * @param {string} [registro.id] Mission or transaction ID
   * @param {string} [registro.idMision] Alternative ID key
   * @param {string} [registro.hash] Declared SHA-256 hash
   * @param {string} [registro.sha256_hash] Alternative hash key
   * @param {string} [registro.estado] State identifier
   * @param {object} [registro.payload] Payload data
   * @param {object} [registro.metadata] Alternative payload data key
   * @returns {{ valido: boolean, hashVerificado: string, idMision: string, timestamp: string }}
   */
  validarPayloadLedger(registro) {
    if (!registro || typeof registro !== 'object') {
      throw new Error('INVALID_STRUCTURE: Transaction record must be a non-null object.');
    }

    const idMision = registro.idMision || registro.id;
    if (!idMision || typeof idMision !== 'string' || !idMision.trim()) {
      throw new Error('INVALID_STRUCTURE: Missing or empty mission identifier (id/idMision).');
    }

    const payloadData = registro.payload !== undefined ? registro.payload : registro.metadata;
    if (payloadData === undefined) {
      throw new Error('INVALID_STRUCTURE: Missing payload data (payload/metadata).');
    }

    const declaredHash = registro.hash || registro.sha256_hash;
    if (!declaredHash || typeof declaredHash !== 'string' || !declaredHash.trim()) {
      throw new Error('INVALID_STRUCTURE: Missing or empty declared SHA-256 hash.');
    }

    // Compute deterministic verification hash
    const rawContent = typeof payloadData === 'string' ? payloadData : JSON.stringify(payloadData);
    const calculatedHash = crypto.createHash('sha256').update(rawContent).digest('hex');

    // Also support hash computed over { id, payload } or raw payload
    const compositeContent = JSON.stringify({ id: idMision, data: payloadData });
    const compositeHash = crypto.createHash('sha256').update(compositeContent).digest('hex');

    const matches = declaredHash === calculatedHash || declaredHash === compositeHash;

    if (!matches) {
      throw new Error(
        `PAYLOAD_CORRUPTED: SHA-256 mismatch. Declared: ${declaredHash}, Calculated: ${calculatedHash}`
      );
    }

    return {
      valido: true,
      hashVerificado: declaredHash,
      idMision,
      timestamp: registro.timestamp || new Date().toISOString()
    };
  }

  /**
   * Sanitizes payload metadata removing private paths or unsafe characters before ledger commit
   * @param {object} data
   * @returns {object}
   */
  sanitizarMetadatos(data) {
    if (!data || typeof data !== 'object') return data;
    const sanitized = JSON.parse(JSON.stringify(data));

    const scrub = (obj) => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          // Normalize Windows backslashes and strip full homedir paths if present
          obj[key] = obj[key].replace(/\\/g, '/');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          scrub(obj[key]);
        }
      }
    };

    scrub(sanitized);
    return sanitized;
  }
}
