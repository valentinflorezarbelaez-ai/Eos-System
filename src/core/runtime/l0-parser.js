import { createHash } from 'node:crypto';

/**
 * Parser Ontológico L0 - El Verbo Geometrizador (Kriyashakti)
 * Parsea y valida los bloques de la Ley del Tres y la Ley del Siete.
 */
export class L0Parser {
  /**
   * Analiza sintácticamente el código fuente L0 y genera el AST inmutable
   * @param {string} source Código fuente en la Lengua de Oro
   * @returns {Object} AST Canónico Pleromático
   */
  static parse(source) {
    if (!source || typeof source !== 'string') {
      throw new Error('L0SintacticDissonanceException: El código fuente está vacío o corrupto.');
    }

    // Limpieza lacónica: remoción de espacios y comentarios triviales externos
    const cleanSource = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();

    // 1. Validación de la Declaración de la Mónada Raíz
    if (!cleanSource.includes('monad') && !cleanSource.includes('pleroma')) {
      throw new Error('L0SintacticDissonanceException: Ausencia de declaración monad o estructura pleromática fundamental.');
    }

    // 2. Extracción de Metadatos de Autoridad
    const monadMatch = cleanSource.match(/monad\s+(\w+)\s*\{([\s\S]*?)\}/);
    if (!monadMatch) {
      throw new Error('L0SintacticDissonanceException: Malformación en el bloque de la Mónada Directriz.');
    }

    const monadName = monadMatch[1];
    
    // 3. Validación Estricta de las Tres Fuerzas de la Triamazikamno
    const hasTriad = cleanSource.includes('affirm') && cleanSource.includes('deny') && cleanSource.includes('reconcile');
    if (cleanSource.includes('triamazikamno') && !hasTriad) {
      throw new Error('L0SintacticDissonanceException: Contrato Triamazikamno incompleto. Falta una de las tres fuerzas primarias.');
    }

    // 4. Validación de la Progresión por Octavas (Heptaparaparshinokh)
    const hasOctave = cleanSource.includes('octave') && cleanSource.includes('SHOCK_MI_FA') && cleanSource.includes('SHOCK_LA_SI');
    if (cleanSource.includes('octave') && !hasOctave) {
      throw new Error('L0SintacticDissonanceException: Máquina de estados rota. Faltan los choques formales en los intervalos críticos.');
    }

    // 5. Acuñación del AST Cero-Entropía
    const astNodes = {
      monad: monadName,
      compiledAt: Date.now(),
      hashSignature: createHash('sha256').update(cleanSource).digest('hex')
    };

    return {
      type: 'CanonicalAST',
      lawsCount: cleanSource.includes('triamazikamno') ? 3 : 1,
      nodes: astNodes,
      isPristine: true
    };
  }
}
