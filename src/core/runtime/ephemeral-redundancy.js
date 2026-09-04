import { createHash } from 'node:crypto';

/**
 * Plano Ephemeral de Redundancia - Control Transitorio L0 Puro
 * Asegura la simetría exacta de la memoria y la purga sin residuos.
 */
export class EphemeralRedundancy {
  constructor(size = 1024) {
    this.size = size;
    this.activeBuffer = Buffer.alloc(size);
    this.mirrorBuffer = Buffer.alloc(size);
    this.isActive = true;
  }

  /**
   * Calcula el Hash de control de un búfer específico
   * @private
   */
  _calculateHash(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Escribe datos en caliente en el búfer activo y su espejo simétrico
   * @param {Buffer|string} data Datos a escribir
   */
  write(data) {
    if (!this.isActive) throw new Error('Buffer is inactive');

    const source = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (source.length > this.size) throw new Error('Data exceeds buffer size');

    // Inicializar vacíos con seguridad antes de reescribir
    this.activeBuffer.fill(0);
    this.mirrorBuffer.fill(0);

    // Escritura en caliente paralela y exacta
    source.copy(this.activeBuffer);
    source.copy(this.mirrorBuffer);
  }

  /**
   * Lee y valida la consistencia exacta de bits entre ambos buffers
   * @returns {Buffer} El buffer de datos validado
   */
  read() {
    if (!this.isActive) throw new Error('Buffer is inactive');

    const activeHash = this._calculateHash(this.activeBuffer);
    const mirrorHash = this._calculateHash(this.mirrorBuffer);

    // Detección de Disonancia
    if (activeHash !== mirrorHash) {
      this.purge();
      throw new Error('EphemeralDissonanceException: Bit discrepancy detected between active and mirror buffers.');
    }

    return this.activeBuffer;
  }

  /**
   * Purga Zero-Waste: Sobreescritura total con 0x00 para eliminar residuos
   */
  purge() {
    this.activeBuffer.fill(0x00);
    this.mirrorBuffer.fill(0x00);
    this.isActive = false;
  }
}
