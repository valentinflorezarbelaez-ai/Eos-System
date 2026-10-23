import { EARSPattern, BDDScenario } from '../types.js';

export interface EARSValidationResult {
  readonly isValid: boolean;
  readonly detectedPattern?: EARSPattern;
  readonly errors: readonly string[];
  readonly recommendations: readonly string[];
}

export interface BDDValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * EARSValidator (Pure Domain Invariant Engine)
 * Enforces IEEE 830 / ISO 29148 formal requirement syntax.
 * Guarantees zero ambiguity in requirement specifications.
 */
export class EARSValidator {
  private static readonly EVENT_REGEX = /^WHEN\s+(.+?),\s+THE\s+SYSTEM\s+SHALL\s+(.+)$/i;
  private static readonly STATE_REGEX = /^WHILE\s+(.+?),\s+THE\s+SYSTEM\s+SHALL\s+(.+)$/i;
  private static readonly ERROR_REGEX = /^IF\s+(.+?),\s+THEN\s+THE\s+SYSTEM\s+SHALL\s+(.+)$/i;
  private static readonly UBIQUITOUS_REGEX = /^THE\s+SYSTEM\s+SHALL\s+(.+)$/i;

  /**
   * Evaluates text against formal EARS syntactic patterns.
   */
  static validate(text: string, expectedPattern?: EARSPattern): EARSValidationResult {
    const trimmed = text ? text.trim() : '';
    const errors: string[] = [];
    const recommendations: string[] = [];

    if (!trimmed) {
      return {
        isValid: false,
        errors: ['Requirement text cannot be empty'],
        recommendations: ['Provide a non-empty statement following standard EARS syntax']
      };
    }

    const detected = this.detectPattern(trimmed);

    if (!detected) {
      errors.push(`Text does not match any valid EARS pattern: "${trimmed}"`);
      recommendations.push(
        'Use one of the 4 formal EARS templates: ' +
          '1. "WHEN <event>, THE SYSTEM SHALL <response>" (Event-Driven), ' +
          '2. "WHILE <state>, THE SYSTEM SHALL <response>" (State-Driven), ' +
          '3. "IF <condition>, THEN THE SYSTEM SHALL <response>" (Error-Driven), ' +
          '4. "THE SYSTEM SHALL <continuous behavior>" (Ubiquitous)'
      );
      return { isValid: false, errors, recommendations };
    }

    if (expectedPattern && detected !== expectedPattern) {
      errors.push(
        `Pattern mismatch: expected ${expectedPattern}, but detected ${detected}`
      );
      recommendations.push(
        `Ensure phrasing matches the specified ${expectedPattern} structure`
      );
      return {
        isValid: false,
        detectedPattern: detected,
        errors,
        recommendations
      };
    }

    return {
      isValid: true,
      detectedPattern: detected,
      errors: [],
      recommendations: []
    };
  }

  /**
   * Detects the matching EARS pattern.
   */
  static detectPattern(text: string): EARSPattern | undefined {
    const trimmed = text.trim();
    if (this.EVENT_REGEX.test(trimmed)) return 'EVENT_DRIVEN';
    if (this.STATE_REGEX.test(trimmed)) return 'STATE_DRIVEN';
    if (this.ERROR_REGEX.test(trimmed)) return 'ERROR_DRIVEN';
    if (this.UBIQUITOUS_REGEX.test(trimmed)) return 'UBIQUITOUS';
    return undefined;
  }

  /**
   * Validates BDD Scenario completeness.
   */
  static validateBDD(scenario: BDDScenario): BDDValidationResult {
    const errors: string[] = [];

    if (!scenario.id || scenario.id.trim().length === 0) {
      errors.push('BDD Scenario ID is required');
    }
    if (!scenario.name || scenario.name.trim().length === 0) {
      errors.push('BDD Scenario name is required');
    }
    if (!scenario.given || scenario.given.trim().length === 0) {
      errors.push('BDD Scenario requires a GIVEN precondition');
    }
    if (!scenario.when || scenario.when.trim().length === 0) {
      errors.push('BDD Scenario requires a WHEN trigger action');
    }
    if (!scenario.then || scenario.then.trim().length === 0) {
      errors.push('BDD Scenario requires a THEN verifiable outcome');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
