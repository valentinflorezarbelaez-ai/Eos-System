/**
 * @file mutation-testing-harness.js
 * @description Injects mutants (intentional logical faults) into source code to mathematically
 * validate the resilience of test suites written under Spec Driven Development (SDD).
 * If a mutant survives (tests pass despite the injected flaw), the code/test pair is rejected.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0
 *   Law VII: standard professional English
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

/** @type {'NO'} */
export const MUTATION_HARNESS_PRODUCTION_READY = 'NO';
export const MUTATION_HARNESS_KIND = 'eos-mutation-testing-harness';

export class MutationTestingHarness {
  constructor(options = {}) {
    this.worktreePath = options.worktreePath || process.cwd();
    this.mutantsConfig = [
      { id: 'InvertBoolean', find: /true/g, replace: 'false' },
      { id: 'InvertBoolean', find: /false/g, replace: 'true' },
      { id: 'InvertEquality', find: /===/g, replace: '!==' },
      { id: 'InvertEquality', find: /!==/g, replace: '===' },
      { id: 'MathAddition', find: /\+/g, replace: '-' },
      { id: 'MathSubtraction', find: /-/g, replace: '+' },
      { id: 'LogicalAnd', find: /&&/g, replace: '||' },
      { id: 'LogicalOr', find: /\|\|/g, replace: '&&' }
    ];
  }

  /**
   * Executes mutation testing analysis on a target source file.
   * @param {string} targetFile Relative path to source file to mutate
   * @param {string} [testCommand] Test command covering the file
   * @returns {object} Resilience report
   */
  evaluateResilience(targetFile, testCommand) {
    const fullTargetPath = path.resolve(this.worktreePath, targetFile);

    if (!fs.existsSync(fullTargetPath)) {
      throw new Error(`MUTATION_FAULT: Target file not found at ${fullTargetPath}`);
    }

    // Resolve test command if not explicitly supplied (use forward slashes for node --test glob compatibility on Windows)
    let resolvedCommand = testCommand;
    if (!resolvedCommand) {
      const dir = path.dirname(targetFile).replace(/\\/g, '/');
      const ext = path.extname(targetFile);
      const base = path.basename(targetFile, ext);
      const candidateAdjacent = `${dir === '.' ? '' : dir + '/'}${base}.test${ext}`;
      const candidateTests = `tests/${base}.test${ext}`;
      if (fs.existsSync(path.resolve(this.worktreePath, candidateAdjacent))) {
        resolvedCommand = `node --test "${candidateAdjacent}"`;
      } else if (fs.existsSync(path.resolve(this.worktreePath, candidateTests))) {
        resolvedCommand = `node --test "${candidateTests}"`;
      } else {
        resolvedCommand = 'node --test';
      }
    }

    const originalContent = fs.readFileSync(fullTargetPath, 'utf8');
    const results = {
      targetFile,
      totalMutants: 0,
      killedMutants: 0,
      survivedMutants: 0,
      mutationScore: 0,
      survivors: []
    };

    try {
      for (const mutator of this.mutantsConfig) {
        const matches = [...originalContent.matchAll(mutator.find)];
        if (matches.length === 0) continue;

        for (let i = 0; i < matches.length; i++) {
          results.totalMutants++;
          let currentMatchIndex = 0;

          const mutatedContent = originalContent.replace(mutator.find, (match) => {
            if (currentMatchIndex === i) {
              currentMatchIndex++;
              return mutator.replace;
            }
            currentMatchIndex++;
            return match;
          });

          // Write mutated content to target file
          fs.writeFileSync(fullTargetPath, mutatedContent, 'utf8');

          let mutantKilled = false;
          try {
            const childEnv = { ...process.env };
            delete childEnv.NODE_TEST_CONTEXT;
            delete childEnv.NODE_TEST_WORKER_ID;
            execSync(resolvedCommand, {
              cwd: this.worktreePath,
              encoding: 'utf8',
              stdio: 'pipe',
              env: childEnv
            });
            // If execSync exits 0, tests passed despite mutation -> mutant survived (unfavorable)
          } catch {
            // If execSync exits non-zero, tests failed on mutation -> mutant killed (favorable)
            mutantKilled = true;
          }

          if (mutantKilled) {
            results.killedMutants++;
          } else {
            results.survivedMutants++;
            results.survivors.push({
              mutatorId: mutator.id,
              occurrenceIndex: i,
              details: `Mutant survived: Replacing '${matches[0][0]}' with '${mutator.replace}' did not fail tests.`
            });
          }
        }
      }
    } finally {
      // Restore original file content
      fs.writeFileSync(fullTargetPath, originalContent, 'utf8');
    }

    if (results.totalMutants > 0) {
      results.mutationScore = Math.round((results.killedMutants / results.totalMutants) * 100);
    } else {
      results.mutationScore = 100; // No mutations applicable, default to pass
    }

    return results;
  }
}
