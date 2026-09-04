/// <reference types="node" />

export class EphemeralRedundancy {
  public size: number;
  public activeBuffer: Buffer;
  public mirrorBuffer: Buffer;
  public isActive: boolean;

  constructor(size?: number);

  /**
   * Calcula el Hash SHA256 de control de un búfer específico.
   */
  private _calculateHash(buffer: Buffer): string;

  /**
   * Escribe datos en caliente de forma idéntica y paralela en el búfer activo y su espejo.
   */
  public write(data: Buffer | string): void;

  /**
   * Lee y valida la consistencia exacta bit-a-bit entre ambos búferes.
   * Lanza EphemeralDissonanceException si detecta una discrepancia de bits.
   */
  public read(): Buffer;

  /**
   * Purga Zero-Waste: rellena físicamente la memoria con 0x00 y desactiva el gestor.
   */
  public purge(): void;
}
