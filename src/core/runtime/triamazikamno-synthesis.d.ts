export interface AdversarialOptions {
  forceContradiction?: boolean;
  fuzzDepth?: number;
}

export interface SynthesisOptions {
  maxIterations?: number;
  transientBuffer?: { fill(value: number): any };
}

export interface SynthesisResult {
  status: 'SYNTHESIZED_PRISTINE';
  synthesizedAST: Readonly<Record<string, any>>;
  iterations: number;
  synthesisProof: string;
  message: string;
}

export class TriamazikamnoSynthesisException extends Error {
  public diagnostics: Record<string, any>;
  public timestamp: number;
  constructor(message: string, diagnostics?: Record<string, any>);
}

export class TriamazikamnoSynthesisEngine {
  /**
   * Coordinates the dialectical synthesis loop (+, -, 0).
   */
  public static synthesize(
    proposal: Record<string, any>,
    adversarialOptions?: AdversarialOptions,
    options?: SynthesisOptions
  ): SynthesisResult;
}
