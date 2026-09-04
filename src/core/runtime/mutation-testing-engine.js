import crypto from 'node:crypto';

/**
 * EOS Mutation & Chaos Testing Engine
 * Evaluates test suite quality by injecting synthetic AST mutants and measuring kill rates.
 */
export class MutationTestingEngine {
  /**
   * Generates synthetic code mutants from source code.
   * @param {string} sourceCode
   * @returns {Array<object>}
   */
  generateMutants(sourceCode = '') {
    const mutants = [];
    const lines = sourceCode.split('\n');
    let mutantIdCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

      // 1. Boolean Swap
      if (line.includes('true') || line.includes('false')) {
        const mutatedLine = line.includes('true')
          ? line.replace(/\btrue\b/, 'false')
          : line.replace(/\bfalse\b/, 'true');
        
        const mutatedLines = [...lines];
        mutatedLines[i] = mutatedLine;

        mutants.push({
          id: `MUT-${String(mutantIdCounter++).padStart(3, '0')}`,
          type: 'BOOLEAN_SWAP',
          lineNumber: i + 1,
          originalLine: line,
          mutatedLine,
          mutatedCode: mutatedLines.join('\n')
        });
      }

      // 2. Equality Operator Swap
      if (line.includes('===') || line.includes('!==') || line.includes('>=') || line.includes('<=')) {
        let mutatedLine = line;
        if (line.includes('===')) mutatedLine = line.replace(/===/, '!==');
        else if (line.includes('!==')) mutatedLine = line.replace(/!==/, '===');
        else if (line.includes('>=')) mutatedLine = line.replace(/>=/, '<');
        else if (line.includes('<=')) mutatedLine = line.replace(/<=/, '>');

        const mutatedLines = [...lines];
        mutatedLines[i] = mutatedLine;

        mutants.push({
          id: `MUT-${String(mutantIdCounter++).padStart(3, '0')}`,
          type: 'EQUALITY_OPERATOR',
          lineNumber: i + 1,
          originalLine: line,
          mutatedLine,
          mutatedCode: mutatedLines.join('\n')
        });
      }

      // 3. Return Void / Return Null Tampering
      if (/return\s+[^;]+;/.test(line) && !line.includes('return false') && !line.includes('return true')) {
        const mutatedLine = line.replace(/return\s+[^;]+;/, 'return null;');
        const mutatedLines = [...lines];
        mutatedLines[i] = mutatedLine;

        mutants.push({
          id: `MUT-${String(mutantIdCounter++).padStart(3, '0')}`,
          type: 'RETURN_TAMPER',
          lineNumber: i + 1,
          originalLine: line,
          mutatedLine,
          mutatedCode: mutatedLines.join('\n')
        });
      }
    }

    return mutants;
  }

  /**
   * Executes test runner against each mutant and calculates the Mutation Score.
   * @param {Function} testRunnerFn Async function (mutatedCode) => { exitCode: number }
   * @param {Array<object>} mutants
   * @returns {Promise<object>}
   */
  async evaluateMutationScore(testRunnerFn, mutants = []) {
    if (typeof testRunnerFn !== 'function') {
      throw new Error('GOVERNANCE_FAULT: testRunnerFn is required.');
    }

    let killedCount = 0;
    let survivedCount = 0;
    const evaluatedMutants = [];

    for (const mutant of mutants) {
      try {
        const result = await testRunnerFn(mutant.mutatedCode);
        // If tests fail (exitCode !== 0), mutant was KILLED (Good!)
        if (result.exitCode !== 0 || result.failed) {
          killedCount++;
          evaluatedMutants.push({ ...mutant, status: 'KILLED' });
        } else {
          survivedCount++;
          evaluatedMutants.push({ ...mutant, status: 'SURVIVED' });
        }
      } catch {
        killedCount++;
        evaluatedMutants.push({ ...mutant, status: 'KILLED' });
      }
    }

    const totalCount = mutants.length;
    const mutationScore = totalCount > 0 ? parseFloat(((killedCount / totalCount) * 100).toFixed(2)) : 100;

    const payload = JSON.stringify({ totalCount, killedCount, survivedCount, mutationScore });
    const sha256 = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      totalCount,
      killedCount,
      survivedCount,
      mutationScore,
      sha256: `sha256-${sha256}`,
      mutants: evaluatedMutants,
      evaluatedAt: new Date().toISOString()
    };
  }
}
