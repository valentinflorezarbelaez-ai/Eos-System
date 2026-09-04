export interface VotingOutput {
  stateHash?: string;
  payload?: Record<string, any>;
  velocity?: number;
  staticBuffer?: { fill(value: number): any; length: number; [index: number]: number };
  purgedByVoter?: boolean;
}

export class TmrOntologyEngine {
  private maxSafeCapacity: number;
  private staticAclRegistry: Map<string, any>;

  constructor();

  /**
   * Ejecuta la votación trinitaria TMR sobre tres salidas de cómputo asumiendo fallos bizantinos.
   */
  public adjudicateVoter(outA: VotingOutput, outB: VotingOutput, outC: VotingOutput): VotingOutput;

  /**
   * Enlaza y valida una acción ontológica tipada bajo ACLs estrictas a nivel de celda.
   */
  public bindOntologicalAction(objectId: string, actionType: string, authority: string): boolean;
}
