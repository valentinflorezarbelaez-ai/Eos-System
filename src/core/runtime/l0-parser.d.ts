export interface CanonicalAST {
  type: "CanonicalAST";
  lawsCount: number;
  nodes: {
    monad: string;
    compiledAt: number;
    hashSignature: string;
  };
  isPristine: boolean;
}

export class L0Parser {
  /**
   * Analiza sintácticamente el código fuente L0 y genera el AST inmutable.
   * Lanza L0SintacticDissonanceException ante cualquier desviación o código impuro.
   */
  public static parse(source: string): CanonicalAST;
}
