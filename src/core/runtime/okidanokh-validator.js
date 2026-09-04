import { createHash } from 'node:crypto';

/**
 * Validador del Sello del Okidanokh - Rigor Matemático y Justicia en L0
 * Proclama el equilibrio síncrono de las tres fuerzas divinas de EOS.
 */
export class OkidanokhValidator {
  /**
   * Genera el sello canónico de cohesión triádica
   * @private
   */
  static _generateSeal(affirmation, negation, conciliation) {
    const rawPayload = `${affirmation.signature}:${negation.workspaceId}:${conciliation.ahimsaVerdict}`;
    return createHash('sha256').update(rawPayload).digest('hex');
  }

  /**
   * Valida la procedencia de tres factores según las Leyes Divinas de EOS
   * @param {Object} envelope El contenedor del mensaje inter-proceso
   * @returns {boolean} True si las tres fuerzas están perfectamente equilibradas
   */
  static validate(envelope) {
    if (!envelope || !envelope.triad) return false;

    const { affirmation, negation, conciliation } = envelope.triad;

    // 1. Inspección de Presencia de Fuerzas
    if (!affirmation?.signature || !negation?.workspaceId || !conciliation?.ahimsaVerdict) {
      return false;
    }

    // 2. Verificación del Sello Hermético
    const targetSeal = this._generateSeal(affirmation, negation, conciliation);
    return targetSeal === envelope.seal;
  }
}
