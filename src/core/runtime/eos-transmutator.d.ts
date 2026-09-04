export interface PleromaInvariant {
  name: string;
  hasAmbiguitiy?: boolean;
  entropyDecay?: number;
}

export interface PleromaAST {
  invariants: PleromaInvariant[];
  nodes?: Record<string, any>;
}

export interface RuntimeEnvironment {
  isDebuggerAttached?: boolean;
  isSideChannelAttackDetected?: boolean;
  transientBuffer?: { fill(value: number): any };
}

export interface SealedRuntimeInterface {
  bytecode: string;
  zkProof: string;
  securityLevel: string;
  execute: (environment?: RuntimeEnvironment) => string;
}

export class ImpureCodeRejectedException extends Error {
  public diagnostics: Record<string, any>;
  public timestamp: number;
  constructor(message: string, diagnostics?: Record<string, any>);
}

export class EosTransmutator {
  public securityLevel: string;
  public isEnclaveActive: boolean;

  constructor(securityLevel?: string);

  /**
   * Ejecuta el pipeline hermético sobre un AST ontológico de EOS
   */
  public transmute(pleromaAst: PleromaAST): SealedRuntimeInterface;
}
