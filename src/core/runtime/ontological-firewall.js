import { createHash } from 'node:crypto';

/**
 * Patrones de subversión semántica y vectores de ataque ontológico
 */
const FORBIDDEN_INTENT_PATTERNS = [
  /disable\s+default[-_]deny/i,
  /desactivar\s+default[-_]deny/i,
  /bypass\s+ahimsa/i,
  /saltar\s+ahimsa/i,
  /skip\s+verification/i,
  /ignorar\s+especificaci[oó]n/i,
  /vibe\s*coding/i,
  /override\s+authority/i,
  /anular\s+constituci[oó]n/i,
  /fake\s+evidence/i,
  /evasi[oó]n\s+perimetral/i
];

/**
 * Cortafuegos Ontológico de Intención — Blindaje Semántico L0/L1
 */
export class OntologicalFirewall {
  /**
   * Inspecciona una carga de intenciones o prompt en busca de acechanzas conceptuales
   * @param {Object|string} payload Carga de instrucción o intención del agente
   * @param {Object} [options]
   * @param {string} [options.nodeId] Identificador del nodo emisor
   * @param {Buffer} [options.transientBuffer] Buffer transitorio asociado para purga
   * @returns {Object} Veredicto de admisión
   */
  static inspectIntent(payload, options = {}) {
    const rawContent = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload || {});

    for (const pattern of FORBIDDEN_INTENT_PATTERNS) {
      if (pattern.test(rawContent)) {
        this._purgeTransient(options.transientBuffer);
        const violationHash = createHash('sha256')
          .update(`INTRUSION:${options.nodeId || 'ANONYMOUS'}:${pattern.source}:${Date.now()}`)
          .digest('hex');

        const err = new Error(`OntologicalIntrusionException: Intento de subversión conceptual detectado [${pattern.source}].`);
        err.name = 'OntologicalIntrusionException';
        err.violationHash = `sha256-${violationHash}`;
        err.nodeId = options.nodeId || 'UNKNOWN';
        throw err;
      }
    }

    const intentHash = createHash('sha256').update(rawContent).digest('hex');

    return {
      status: 'ADMITTED_PRISTINE',
      intentHash: `sha256-${intentHash}`,
      nodeId: options.nodeId || 'LOCAL_PRIME',
      inspectedLength: rawContent.length
    };
  }

  /**
   * Poda física Zero-Waste de memoria intermedia
   * @private
   */
  static _purgeTransient(buffer) {
    if (buffer && typeof buffer.fill === 'function') {
      buffer.fill(0x00);
    }
  }
}
