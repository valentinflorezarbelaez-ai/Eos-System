export type OctaveNote =
  | 'DO_GENESIS'
  | 'RE_TRANSIT'
  | 'MI_STORAGE'
  | 'FA_TRANSMUTATION'
  | 'SOL_CONSOLIDATION'
  | 'LA_IMMUNIZATION'
  | 'SI_CONSUMMATION';

export interface OctaveState {
  id: string;
  currentNote: OctaveNote;
  isSealed: boolean;
  history: OctaveNote[];
  data: Record<string, any>;
}

export class EOSHeptaparaparshinokhLedger {
  public octaves: Map<string, OctaveState>;

  constructor();

  /**
   * Inicializa una nueva octava de persistencia operacional en la nota DO_GENESIS.
   */
  public startOctave(id: string, initialData?: Record<string, any>): OctaveState;

  /**
   * Promueve el estado a la nota inmediatamente superior de la octava.
   * Exige la validación síncrona del Sello del Okidanokh en el Shock Point MI -> FA.
   */
  public advanceNote(id: string, targetNote: OctaveNote, shockProof?: any): OctaveState;

  /**
   * Sella de forma definitiva una octava completada en el intervalo de trascendencia SI -> DO.
   */
  public sealOctave(id: string): OctaveState;

  /**
   * Obtiene el estado actual de una octava en memoria.
   */
  public getOctave(id: string): OctaveState | undefined;
}
